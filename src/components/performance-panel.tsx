'use client'

/**
 * Performans grafiği — son 14 gündeki özbildirim puanlarını (enerji, uyku, sindirim)
 * takvim ekseninde çizgiler; kullanım işaretli günleri vurgular.
 * Kayıtlar yalnız cihazda; yalnız gerçek bildirimler çizilir (sahte veri üretilmez).
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  buildChart,
  getWellnessServerSnapshot,
  getWellnessSnapshot,
  subscribeWellness,
  todayKey,
  METRICS,
  SCORE_MIN,
  SCORE_MAX,
  type WellnessMetric,
} from '@/lib/wellness'
import { DAY_MARKS_KEY, readMarks, readMarksAsync, localDayKey } from '@/lib/daymarks'
import { listSupplements, type ClientSupplement } from '@/lib/data'
import { isRemoteMode } from '@/lib/supabase'
import { onStorageKey, readRaw } from '@/lib/local-store'

const METRIC_LABEL: Record<WellnessMetric, string> = { energy: 'Enerji', sleep: 'Uyku', digestion: 'Sindirim' }
const RANGE = 14

const noopSubscribe = () => () => {}
const useMounted = () => useSyncExternalStore(noopSubscribe, () => true, () => false)

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
const subscribeMarks = (callback: () => void) => onStorageKey(DAY_MARKS_KEY, callback)

function TrendChart({ metric, entries, marks, today }: {
  metric: WellnessMetric
  entries: ReturnType<typeof getWellnessSnapshot>
  marks: Record<string, string[]>
  today: string
}) {
  const model = useMemo(() => buildChart(entries, metric, RANGE, today, marks), [entries, metric, marks, today])

  const width = 320
  const height = 160
  const left = 26
  const right = 10
  const top = 12
  const plotBottom = 130
  const plotWidth = width - left - right
  const plotHeight = plotBottom - top
  const x = (index: number) => (model.windowDays <= 1 ? left : left + (index / (model.windowDays - 1)) * plotWidth)
  const y = (value: number) => plotBottom - ((value - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * plotHeight

  const line = 'var(--primary)'
  const grid = 'var(--line)'
  const muted = 'var(--text-3)'

  return (
    <svg
      className="pf-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${METRIC_LABEL[metric]} özbildirimi, son ${RANGE} gün`}
    >
      {[1, 2, 3, 4, 5].map(score => (
        <g key={score} aria-hidden="true">
          <line x1={left} x2={width - right} y1={y(score)} y2={y(score)} stroke={grid} strokeWidth={score === 1 ? 1 : 0.5} />
          <text x={left - 6} y={y(score) + 3.5} textAnchor="end" fontSize={9} fill={muted}>{score}</text>
        </g>
      ))}

      {model.usage.map(index => (
        <g key={`usage-${index}`} aria-hidden="true">
          <line x1={x(index)} x2={x(index)} y1={top} y2={plotBottom} stroke={grid} strokeWidth={1} strokeDasharray="2 3" opacity={0.6} />
          <rect x={x(index) - 2} y={plotBottom + 5} width={4} height={5} rx={1.5} fill={line} />
        </g>
      ))}

      {model.segments.map(segment =>
        segment.length > 1 ? (
          <polyline
            key={`seg-${segment[0].day}-${segment[segment.length - 1].day}`}
            points={segment.map(p => `${x(p.index).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={line}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null,
      )}
      {model.points.map(point => (
        <circle key={point.day} cx={x(point.index)} cy={y(point.value)} r={3.4} fill={line}>
          <title>{`${point.day} · ${point.value}/5`}</title>
        </circle>
      ))}

      {model.labels.map(entry => (
        <text key={`x-${entry.index}`} x={x(entry.index)} y={plotBottom + 24} textAnchor="middle" fontSize={9} fill={muted} aria-hidden="true">
          {entry.text}
        </text>
      ))}
    </svg>
  )
}

/** Uyum haritası: her takviye için son 14 gün alındı/alınmadı. Remote'ta Supabase, demoda localStorage. */
function AdherenceGrid() {
  const [state, setState] = useState<{ supps: ClientSupplement[]; marks: Record<string, string[]> } | null>(null)
  const [error, setError] = useState('')
  const remote = isRemoteMode()
  useEffect(() => {
    let alive = true
    const load = () => Promise.all([listSupplements(), readMarksAsync()])
      .then(([supps, marks]) => { if (alive) { setState({ supps, marks }); setError('') } })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Uyum verisi yüklenemedi.') })
    load()
    const off = remote ? () => {} : onStorageKey(DAY_MARKS_KEY, () => { load() })
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; off(); document.removeEventListener('visibilitychange', onVis) }
  }, [remote])

  const days = useMemo(() => {
    const out: { key: string; label: string }[] = []
    const base = new Date()
    for (let i = RANGE - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i)
      out.push({ key: localDayKey(d), label: `${d.getDate()}.${d.getMonth() + 1}` })
    }
    return out
  }, [])

  if (error) return <p className="pf-empty" role="alert">{error}</p>
  if (!state) return null
  if (state.supps.length === 0) return <p className="pf-empty">Takviye eklediğinde uyum çizelgesi burada görünür.</p>
  return (
    <div className="mt-4" aria-label={`Takviye uyumu, son ${RANGE} gün`}>
      <p className="text-xs text-[var(--text-2)] mb-2">Takviye uyumu · son {RANGE} gün</p>
      <div className="space-y-2">
        {state.supps.map(s => {
          const taken = days.filter(d => (state.marks[d.key] ?? []).includes(s.id)).length
          return (
            <div key={s.id}>
              <div className="flex justify-between text-[11px] text-[var(--text-2)] mb-1">
                <span className="truncate pr-2">{s.name}</span><span className="shrink-0">{taken}/{RANGE}</span>
              </div>
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${RANGE}, minmax(0, 1fr))` }}>
                {days.map(d => {
                  const on = (state.marks[d.key] ?? []).includes(s.id)
                  return <span key={d.key} title={`${d.label} · ${on ? 'alındı' : 'alınmadı'}`}
                    className="h-4 rounded-[3px]"
                    style={{ background: on ? 'var(--primary)' : 'var(--line)', opacity: on ? 1 : 0.5 }} />
                })}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-[var(--text-3)] mt-2">Dolu kutu = o gün alındı olarak işaretlendi; boş = işaret yok.</p>
    </div>
  )
}

export default function PerformancePanel() {
  const mounted = useMounted()
  const entries = useSyncExternalStore(subscribeWellness, getWellnessSnapshot, getWellnessServerSnapshot)
  const marks = useSyncExternalStore(subscribeMarks, marksSnapshot, () => ({}))
  const today = todayKey()
  const [metric, setMetric] = useState<WellnessMetric>('energy')

  const hasData = useMemo(() => entries.some(e => e[metric] !== undefined), [entries, metric])

  return (
    <section className="dv-card pf-card" aria-labelledby="pf-title">
      <div className="pf-head">
        <h2 id="pf-title" className="pf-title">Performans grafiği</h2>
        <span className="pf-range">son {RANGE} gün</span>
      </div>

      <div className="pf-switch" role="group" aria-label="Metrik seçimi">
        {METRICS.map(key => (
          <button
            key={key}
            type="button"
            className={`pf-seg${metric === key ? ' is-on' : ''}`}
            aria-pressed={metric === key}
            onClick={() => setMetric(key)}
          >
            {METRIC_LABEL[key]}
          </button>
        ))}
      </div>

      {!mounted ? null : !hasData ? (
        <p className="pf-empty">
          Henüz {METRIC_LABEL[metric].toLocaleLowerCase('tr')} bildirimi yok. Etki günlüğünden puan ekledikçe burada grafik oluşur.
        </p>
      ) : (
        <TrendChart metric={metric} entries={entries} marks={marks} today={today} />
      )}

      {mounted && <AdherenceGrid />}

      <p className="pf-note">
        Yalnız bildirdiğin günler çizilir; dikey çizgiler takviye kullandığın günleri gösterir (nedensellik değil).
      </p>
    </section>
  )
}
