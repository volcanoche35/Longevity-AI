'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  METRICS,
  MIN_SUMMARY_DAYS,
  NOTE_MAX,
  SCORE_MAX,
  SCORE_MIN,
  buildChart,
  clearWellness,
  clearWellnessAsync,
  deleteWellnessDay,
  deleteWellnessDayAsync,
  loadWellnessAsync,
  saveWellnessAsync,
  type WellnessEntry,
  getWellnessServerSnapshot,
  getWellnessSnapshot,
  saveWellness,
  subscribeWellness,
  summarizeWellness,
  todayKey,
  type ChartModel,
  type WellnessMetric,
} from '@/lib/wellness'
import { DAY_MARKS_KEY, readMarks, readMarksAsync } from '@/lib/daymarks'
import { isRemoteMode } from '@/lib/supabase'
import { onStorageKey, readRaw } from '@/lib/local-store'
import { listSupplements, askAssistant, onDemoChange, type ClientSupplement } from '@/lib/data'
import { usePreferences } from '@/lib/preferences'
import './wellness.css'

const SCORES = [1, 2, 3, 4, 5]
const RANGES = [7, 14] as const
const METRIC_META: { key: WellnessMetric; label: string; hint: string }[] = [
  { key: 'energy', label: 'Enerji', hint: 'Gün içinde kendini ne kadar canlı hissettin?' },
  { key: 'sleep', label: 'Uyku', hint: 'Dün geceki uyku kalitesi — kendi değerlendirmen.' },
  { key: 'digestion', label: 'Sindirim', hint: 'Gün içindeki sindirim rahatlığı.' },
]
const METRIC_LABEL: Record<WellnessMetric, string> = { energy: 'Enerji', sleep: 'Uyku', digestion: 'Sindirim' }

interface Draft {
  day: string
  energy?: number
  sleep?: number
  digestion?: number
  note: string
}

/* ── dış depolar (useSyncExternalStore) ──────────────────────────── */

const noopSubscribe = () => () => {}
const useMounted = () => useSyncExternalStore(noopSubscribe, () => true, () => false)

function subscribeClock(callback: () => void): () => void {
  const timer = window.setInterval(callback, 60_000)
  window.addEventListener('focus', callback)
  document.addEventListener('visibilitychange', callback)
  return () => {
    window.clearInterval(timer)
    window.removeEventListener('focus', callback)
    document.removeEventListener('visibilitychange', callback)
  }
}
const useToday = () => useSyncExternalStore(subscribeClock, () => todayKey(), () => '')
const useHour = () => useSyncExternalStore(subscribeClock, () => new Date().getHours(), () => 8)

let marksRawCache: string | null = null
let marksCache: Record<string, string[]> = {}
function marksSnapshot(): Record<string, string[]> {
  const raw = readRaw(DAY_MARKS_KEY).raw ?? ''
  if (raw !== marksRawCache) {
    marksRawCache = raw
    marksCache = readMarks()
  }
  return marksCache
}
const EMPTY_MARKS: Record<string, string[]> = {}
const marksServerSnapshot = () => EMPTY_MARKS
const subscribeMarks = (callback: () => void) => onStorageKey(DAY_MARKS_KEY, callback)

/* ── grafik ─────────────────────────────────────────────────────── */

function WellnessChart({ model, label }: { model: ChartModel; label: string }) {
  const width = 320
  const height = 192
  const left = 26
  const right = 10
  const top = 12
  const plotBottom = 156
  const plotWidth = width - left - right
  const plotHeight = plotBottom - top
  const x = (index: number) =>
    model.windowDays <= 1 ? left : left + (index / (model.windowDays - 1)) * plotWidth
  const y = (value: number) => plotBottom - ((value - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * plotHeight

  return (
    <svg
      className="wl-chart"
      data-metric={model.metric}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${label} özbildirimi, son ${model.windowDays} gün. Yalnız bildirilen günler işaretli; boş günler arasında çizgi yok.`}
    >
      {SCORES.map(score => (
        <g key={score} aria-hidden="true">
          <line
            x1={left}
            x2={width - right}
            y1={y(score)}
            y2={y(score)}
            className={score === SCORE_MIN ? 'wl-axis' : 'wl-grid'}
          />
          <text x={left - 6} y={y(score) + 3.5} textAnchor="end" className="wl-axis-label">
            {score}
          </text>
        </g>
      ))}

      <g aria-hidden="true">
        {model.usage.map(index => (
          <g key={`usage-${index}`}>
            <line x1={x(index)} x2={x(index)} y1={top} y2={plotBottom} className="wl-usage-col" />
            <rect
              x={x(index) - 2}
              y={plotBottom + 5}
              width={4}
              height={5}
              rx={1.5}
              className="wl-usage-tick"
            />
          </g>
        ))}
      </g>

      <g aria-hidden="true">
        {model.segments.map(segment =>
          segment.length > 1 ? (
            <polyline
              key={`seg-${segment[0].day}-${segment[segment.length - 1].day}`}
              points={segment.map(point => `${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')}
              className="wl-line"
              fill="none"
            />
          ) : null,
        )}
        {model.points.map(point => (
          <circle
            key={point.day}
            cx={x(point.index)}
            cy={y(point.value)}
            r={3.6}
            className="wl-point"
          >
            <title>{`${point.day} · ${point.value}/5`}</title>
          </circle>
        ))}
      </g>

      {model.labels.map(entry => (
        <text
          key={`x-${entry.index}`}
          x={x(entry.index)}
          y={plotBottom + 26}
          textAnchor="middle"
          className="wl-axis-label"
          aria-hidden="true"
        >
          {entry.text}
        </text>
      ))}
    </svg>
  )
}

/* ── panel ──────────────────────────────────────────────────────── */

export default function WellnessPanel() {
  const mounted = useMounted()
  const today = useToday()
  const hour = useHour()
  const isEvening = hour >= 16
  const remote = isRemoteMode()
  const localEntries = useSyncExternalStore(subscribeWellness, getWellnessSnapshot, getWellnessServerSnapshot)
  const localMarks = useSyncExternalStore(subscribeMarks, marksSnapshot, marksServerSnapshot)
  const [remoteEntries, setRemoteEntries] = useState<WellnessEntry[]>([])
  const [remoteMarks, setRemoteMarks] = useState<Record<string, string[]>>(EMPTY_MARKS)
  const entries = remote ? remoteEntries : localEntries
  const marks = remote ? remoteMarks : localMarks
  const reloadRemote = async () => {
    try {
      const [e, m] = await Promise.all([loadWellnessAsync(), readMarksAsync()])
      setRemoteEntries(e)
      setRemoteMarks(m)
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Günlük yüklenemedi.'])
    }
  }

  const [inventory, setInventory] = useState<ClientSupplement[]>([])
  const [selectedDay, setSelectedDay] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [metric, setMetric] = useState<WellnessMetric>('energy')
  const [range, setRange] = useState<(typeof RANGES)[number]>(7)
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [askDelete, setAskDelete] = useState(false)
  const [askClear, setAskClear] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState('')
  const preferences = usePreferences()
  const showAiAnalysis = preferences.tracking.aiAnalysis

  const runAnalysis = async () => {
    if (aiLoading) return
    setAiLoading(true); setAiError(''); setAiResult('')
    try {
      const names = inventory.map(s => s.name)
      const reply = await askAssistant([{ role: 'user', content: 'Bugünkü günlük özbildirimime (enerji, uyku, sindirim) ve sağlık profilime dayanarak bana 3-5 kısa, uygulanabilir günlük tavsiye ver (ör. su iç, kısa yürüyüş yap, uyku saatini düzenle). Madde işaretli, her biri tek cümle. Teşhis, doz veya kesin sayı verme; genel ve seçenekli tut.' }], names)
      setAiResult(reply.content)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Analiz alınamadı.')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (remote) void reloadRemote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote])

  useEffect(() => {
    let alive = true
    const load = () => {
      listSupplements()
        .then(rows => {
          if (alive) setInventory(rows)
        })
        .catch(() => {
          if (alive) setInventory([])
        })
    }
    load()
    const off = onDemoChange(load)
    return () => {
      alive = false
      off()
    }
  }, [])

  const day = selectedDay || today
  const existing = useMemo(() => entries.find(entry => entry.day === day), [entries, day])
  const activeDraft: Draft =
    draft && draft.day === day
      ? draft
      : { day, energy: existing?.energy, sleep: existing?.sleep, digestion: existing?.digestion, note: existing?.note ?? '' }

  const edit = (change: Partial<Omit<Draft, 'day'>>) =>
    setDraft({ ...activeDraft, ...change, day })
  const editScore = (key: WellnessMetric, value: number | undefined) => {
    const next: Draft = { ...activeDraft, day }
    if (value === undefined) delete next[key]
    else next[key] = value
    setDraft(next)
  }

  const namesById = useMemo(() => new Map(inventory.map(row => [row.id, row.name])), [inventory])
  const namesFor = (targetDay: string) => {
    const names: string[] = []
    for (const id of marks[targetDay] ?? []) {
      const name = namesById.get(id)
      if (name && !names.includes(name)) names.push(name)
    }
    return names
  }

  const summary = useMemo(
    () => summarizeWellness(entries, marks, range, today),
    [entries, marks, range, today],
  )
  const chart = useMemo(
    () => (today ? buildChart(entries, metric, range, today, marks) : null),
    [entries, marks, metric, range, today],
  )
  const history = useMemo(() => [...entries].reverse().slice(0, 30), [entries])
  const todayNames = today ? namesFor(today) : []
  const todayMarkCount = today ? (marks[today] ?? []).length : 0

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setAskDelete(false)
    setStatus('')
    const payload = {
      day,
      energy: activeDraft.energy,
      sleep: activeDraft.sleep,
      digestion: activeDraft.digestion,
      note: activeDraft.note,
    }
    const result = remote ? await saveWellnessAsync(payload) : saveWellness(payload)
    if (!result.ok) {
      setErrors(result.errors)
      setStatus('')
      return
    }
    setErrors([])
    setDraft(null)
    if (remote) await reloadRemote()
    setStatus(result.created ? 'Kayıt eklendi.' : 'Kayıt güncellendi.')
    setFormOpen(false)
  }

  const handleDelete = async () => {
    const result = remote ? await deleteWellnessDayAsync(day) : deleteWellnessDay(day)
    if (!result.ok) {
      setErrors([result.error])
      return
    }
    setDraft(null)
    setAskDelete(false)
    setErrors([])
    if (remote) await reloadRemote()
    setStatus('Bu günün kaydı silindi.')
  }

  const handleClear = async () => {
    const result = remote ? await clearWellnessAsync() : clearWellness()
    if (!result.ok) {
      setErrors([result.error])
      return
    }
    setDraft(null)
    setAskClear(false)
    setErrors([])
    if (remote) await reloadRemote()
    setStatus('Tüm günlük silindi.')
  }

  return (
    <div className="wl-shell">
      <header className="wl-head">
        <p className="wl-eyebrow">{isEvening ? 'AKŞAM DEĞERLENDİRMESİ' : 'GÜNLÜK ÖZBİLDİRİM'}</p>
        <h1 className="wl-title">{isEvening ? 'Günü kapat' : 'Etki günlüğü'}</h1>
        <p className="wl-lede">
          {isEvening
            ? 'Gün sonunda enerji, uyku ve sindirimini puanla; gününü tek dokunuşla kaydet. Kayıtlar yalnız bu cihazda tutulur.'
            : 'Takviye kullanımını ve kendi hissettiğin etkileri yan yana gör. Kayıtlar yalnız bu cihazda tutulur; sağlık sonucu veya tanı değildir.'}
        </p>
      </header>

      {/* Bugünün kullanım işaretleri */}
      <section className="wl-card" aria-labelledby="wl-marks-title">
        <div className="wl-card-head">
          <h2 id="wl-marks-title" className="wl-card-title">Bugün işaretlenen ürünler</h2>
          <span className="wl-count">{todayMarkCount}</span>
        </div>
        {!mounted || !today ? null : todayNames.length > 0 ? (
          <ul className="wl-tags">
            {todayNames.map(name => (
              <li key={name} className="wl-tag">{name}</li>
            ))}
          </ul>
        ) : todayMarkCount > 0 ? (
          <p className="wl-muted">İşaret var; ürünler envanterde bulunamadı.</p>
        ) : (
          <p className="wl-muted">
            Bugün henüz kullanım işareti yok. Bugün ekranından işaretleyince burada görünür.
          </p>
        )}
        <p className="wl-fine">
          Kullanım işareti yalnız “o gün kullanıldı” demektir; aşağıdaki özbildirimlerin nedeni olduğunu göstermez.
        </p>
      </section>

      {/* Değerlendirme — katlanabilir */}
      {!formOpen ? (
        <section className="wl-card" aria-labelledby="wl-review-title">
          <div className="wl-card-head">
            <h2 id="wl-review-title" className="wl-card-title">
              {isEvening ? 'Akşam değerlendirmen' : 'Bugünü değerlendir'}
            </h2>
            {existing ? <span className="wl-chip">kayıtlı</span> : null}
          </div>
          <div className="wl-review">
            {existing && (existing.energy != null || existing.sleep != null || existing.digestion != null || existing.note) ? (
              <>
                <div className="wl-review-scores">
                  <span>Enerji <b>{existing.energy ?? '—'}</b></span>
                  <span>Uyku <b>{existing.sleep ?? '—'}</b></span>
                  <span>Sindirim <b>{existing.digestion ?? '—'}</b></span>
                </div>
                {existing.note ? <p className="wl-review-note">“{existing.note}”</p> : null}
                <button type="button" className="wl-primary" onClick={() => { setFormOpen(true); setAskDelete(false); setStatus(''); setErrors([]) }}>
                  Düzenle
                </button>
              </>
            ) : (
              <>
                <p className="wl-muted">
                  {isEvening
                    ? 'Günü kapatmak için üç puanı seç ve kaydet — form kendiliğinden kapanır.'
                    : 'Enerji, uyku ve sindirimini puanla; trendini aşağıdaki grafikte gör.'}
                </p>
                <button type="button" className="wl-primary" onClick={() => setFormOpen(true)}>
                  {isEvening ? 'Günü değerlendir' : 'Değerlendir'}
                </button>
              </>
            )}
          </div>
        </section>
      ) : (
      <form className="wl-card wl-form" onSubmit={handleSave}>
        <div className="wl-card-head">
          <h2 className="wl-card-title">{existing ? 'Günü güncelle' : 'Güne kayıt ekle'}</h2>
          {existing ? <span className="wl-chip">kayıt var</span> : null}
        </div>

        <label className="wl-field">
          <span className="wl-label">Gün</span>
          <input
            type="date"
            className="wl-input"
            value={day}
            max={today || undefined}
            disabled={!mounted}
            onChange={event => {
              setSelectedDay(event.target.value)
              setDraft(null)
              setAskDelete(false)
              setStatus('')
              setErrors([])
            }}
          />
        </label>

        {METRIC_META.map(item => {
          const value = activeDraft[item.key]
          return (
            <fieldset key={item.key} className="wl-scores">
              <legend className="wl-legend">
                <span className="wl-label">{item.label}</span>
                <span className="wl-hint">{item.hint}</span>
              </legend>
              <div className="wl-score-row">
                {SCORES.map(score => {
                  const active = value === score
                  return (
                    <button
                      key={score}
                      type="button"
                      className={`wl-score${active ? ' is-on' : ''}`}
                      aria-pressed={active}
                      aria-label={`${item.label} ${score} puan${active ? ' — kaldırmak için tekrar dokun' : ''}`}
                      onClick={() => editScore(item.key, active ? undefined : score)}
                    >
                      {score}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
        <p className="wl-fine">Puanlar senin değerlendirmen. Seçili puana tekrar dokunursan alan boş kalır.</p>

        <label className="wl-field">
          <span className="wl-label">Not (isteğe bağlı)</span>
          <textarea
            className="wl-input wl-textarea"
            value={activeDraft.note}
            maxLength={NOTE_MAX}
            rows={3}
            placeholder="Kendi cümlelerinle, örn. “öğleden sonra baş ağrısı”"
            onChange={event => edit({ note: event.target.value })}
          />
          <span className="wl-counter">{activeDraft.note.length}/{NOTE_MAX}</span>
        </label>

        {errors.length > 0 && (
          <ul className="wl-error" role="alert">
            {errors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        {status && !errors.length ? (
          <p className="wl-status" role="status" aria-live="polite">{status}</p>
        ) : null}

        <div className="wl-actions">
          <button type="submit" className="wl-primary" disabled={!mounted || !today}>
            {existing ? 'Güncelle' : 'Kaydet'}
          </button>
          <button type="button" className="wl-ghost" onClick={() => setFormOpen(false)}>
            Kapat
          </button>
          {existing ? (
            askDelete ? (
              <span className="wl-confirm">
                <span>Silinsin mi?</span>
                <button type="button" className="wl-danger" onClick={handleDelete}>Evet, sil</button>
                <button type="button" className="wl-ghost" onClick={() => setAskDelete(false)}>Vazgeç</button>
              </span>
            ) : (
              <button type="button" className="wl-ghost" onClick={() => setAskDelete(true)}>
                Bu günün kaydını sil
              </button>
            )
          ) : null}
        </div>
      </form>
      )}

      {/* AI Analiz */}
      {showAiAnalysis && (
        <section className="wl-card" aria-labelledby="wl-ai-title">
          <div className="wl-card-head">
            <h2 id="wl-ai-title" className="wl-card-title">Günlük analiz</h2>
            <button type="button" className="wl-ai-btn" onClick={runAnalysis} disabled={aiLoading}>
              {aiLoading ? 'Düşünüyor…' : aiResult ? 'Yenile' : 'Analiz iste'}
            </button>
          </div>
          {aiError ? (
            <p className="wl-muted" role="alert">⚠️ {aiError}</p>
          ) : aiResult ? (
            <div className="wl-ai-result">{aiResult}</div>
          ) : (
            <p className="wl-muted">Takviyelerini ve günlük puanlarını kaydettikçe, profiline göre kısa günlük tavsiyeler alabilirsin. Yapay zekâ analizi tıbbi tavsiye değildir.</p>
          )}
        </section>
      )}

      {/* Grafik */}
      <section className="wl-card" aria-labelledby="wl-chart-title">
        <div className="wl-card-head">
          <h2 id="wl-chart-title" className="wl-card-title">Gerçek özbildirimler</h2>
        </div>

        <div className="wl-switch" role="group" aria-label="Metrik seçimi">
          {METRICS.map(key => (
            <button
              key={key}
              type="button"
              className={`wl-seg${metric === key ? ' is-on' : ''}`}
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
            >
              {METRIC_LABEL[key]}
            </button>
          ))}
        </div>
        <div className="wl-switch" role="group" aria-label="Zaman aralığı">
          {RANGES.map(value => (
            <button
              key={value}
              type="button"
              className={`wl-seg${range === value ? ' is-on' : ''}`}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              {value} gün
            </button>
          ))}
        </div>

        {!chart || chart.points.length === 0 ? (
          <p className="wl-empty">
            Bu aralıkta {METRIC_LABEL[metric].toLocaleLowerCase('tr')} bildirimi yok. Kayıt ekledikçe grafik
            yalnız gerçek günlerden çizilir.
          </p>
        ) : (
          <>
            <WellnessChart model={chart} label={METRIC_LABEL[metric]} />
            <ul className="wl-legend">
              <li><span className="wl-dot" /> {METRIC_LABEL[metric]} (1–5)</li>
              <li><span className="wl-tick" /> kullanım işareti olan gün</li>
            </ul>
          </>
        )}
        <p className="wl-fine">
          Yatay eksen takvim günleri; yalnız bu aralıkta bildirim yaptığın günler işaretli. Ardışık olmayan
          günler arasında çizgi çekilmez, böylece boşluk trend gibi görünmez.
        </p>
      </section>

      {/* Özet */}
      <section className="wl-card" aria-labelledby="wl-summary-title">
        <div className="wl-card-head">
          <h2 id="wl-summary-title" className="wl-card-title">Son {range} gün</h2>
          <span className="wl-count">{summary.entryCount} gün kayıt</span>
        </div>
        {!summary.sufficient ? (
          <p className="wl-empty">
            Veri yetersiz: özet için en az {MIN_SUMMARY_DAYS} gün kayıt gerekli (şu an {summary.entryCount}).
          </p>
        ) : null}
        {summary.entryCount > 0 ? (
          <dl className="wl-stats">
            {METRICS.map(key => (
              <div key={key} className="wl-stat">
                <dt>{METRIC_LABEL[key]}</dt>
                <dd>
                  {summary.averages[key] !== undefined
                    ? `${summary.averages[key]!.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} / 5`
                    : '—'}
                  <span className="wl-stat-n">
                    {summary.counts[key] ? `${summary.counts[key]} gün bildirildi` : 'bildirim yok'}
                  </span>
                </dd>
              </div>
            ))}
            <div className="wl-stat">
              <dt>Kullanım</dt>
              <dd>
                {summary.usageDays} gün
                <span className="wl-stat-n">işaretli gün sayısı</span>
              </dd>
            </div>
          </dl>
        ) : null}
        <p className="wl-fine">
          Ortalamalar yalnız bildirilen günlerden hesaplanır; kullanım günleriyle birlikte gösterilmesi
          nedensellik anlamına gelmez.
        </p>
      </section>

      {/* Geçmiş */}
      <section className="wl-card" aria-labelledby="wl-history-title">
        <div className="wl-card-head">
          <h2 id="wl-history-title" className="wl-card-title">Kayıtlar</h2>
          {entries.length > history.length ? <span className="wl-count">son {history.length}</span> : null}
        </div>
        {entries.length === 0 ? (
          <p className="wl-empty">Henüz kayıt yok. İlk günü yukarıdaki formdan ekle.</p>
        ) : (
          <table className="wl-table">
            <caption className="wl-sr">Günlük özbildirim kayıtları, en yeni önce</caption>
            <thead>
              <tr>
                <th scope="col">Gün</th>
                <th scope="col">Enerji</th>
                <th scope="col">Uyku</th>
                <th scope="col">Sindirim</th>
                <th scope="col">Not</th>
                <th scope="col">İşaretli ürünler</th>
              </tr>
            </thead>
            <tbody>
              {history.map(entry => {
                const names = namesFor(entry.day)
                return (
                  <tr key={entry.day}>
                    <th scope="row" data-label="Gün">{entry.day}</th>
                    <td data-label="Enerji">{entry.energy ?? '—'}</td>
                    <td data-label="Uyku">{entry.sleep ?? '—'}</td>
                    <td data-label="Sindirim">{entry.digestion ?? '—'}</td>
                    <td data-label="Not" className="wl-cell-note">{entry.note ?? '—'}</td>
                    <td data-label="İşaretli ürünler" className="wl-cell-note">
                      {names.length > 0 ? names.join(', ') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <footer className="wl-foot">
        {askClear ? (
          <span className="wl-confirm">
            <span>Tüm günlük silinsin mi?</span>
            <button type="button" className="wl-danger" onClick={handleClear}>Evet, sil</button>
            <button type="button" className="wl-ghost" onClick={() => setAskClear(false)}>Vazgeç</button>
          </span>
        ) : (
          <button type="button" className="wl-ghost" onClick={() => setAskClear(true)}>
            Tüm günlüğü sil
          </button>
        )}
        <p className="wl-fine">
          Girdiğin kayıtlar uygulamaya kaydedilir. Sağlık durumunla ilgili kararlar için hekimine danış; bu ekran
          tıbbi değerlendirme üretmez.
        </p>
      </footer>
    </div>
  )
}
