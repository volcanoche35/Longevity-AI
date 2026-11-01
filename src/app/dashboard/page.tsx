'use client'

/**
 * Günlük panel — bugün odaklı: mood check-in, metrik şeridi, bugünkü kayıtlar, performans.
 *
 * Veri dürüstlüğü kuralları:
 *  - Uydurma laboratuvar sonucu, sağlık skoru, "kanıt derecesi" YOK.
 *  - Kartlardaki sayılar gerçek envanterden türetilir: kayıt sayısı, bugün
 *    işaretlenen kullanım, farklı zaman dilimi sayısı, profil doluluğu.
 *  - "Alındı" işaretleri kullanıcının kendi tıklamasıdır, sağlık önerisi değil;
 *    yalnız bu cihazda ve yerel gün bazında saklanır. Senkronizasyon iddiası yok.
 *
 * Yerel veri, React'in kendi abonelik API'siyle (useSyncExternalStore) okunur:
 * sunucu render'ı boş profil döner, istemci cihazdaki gerçek kaydı gösterir.
 */

import Link from 'next/link'
import ProfileEditor from '@/components/profile-editor'
import CustomizeButton from '@/components/customize-button'
import { DAY_MARKS_KEY as MARKS_KEY, localDayKey, readMarks, readMarksAsync, toggleDayMark, toggleDayMarkAsync } from '@/lib/daymarks'
import { isRemoteMode } from '@/lib/supabase'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import SupplementSheet from '@/components/supplement-sheet'
import PerformancePanel from '@/components/performance-panel'
import { usePreferences } from '@/lib/preferences'
import MoodGlow from '@/components/mood-glow'
import '@/components/mobile-app.css'
import '@/components/dashboard-v3.css'
import { listSupplements, onDemoChange, type ClientSupplement } from '@/lib/data'
import { onStorageKey, readRaw } from '@/lib/local-store'
import { deleteWellnessDayAsync, loadWellnessAsync, saveWellnessAsync, subscribeWellness, type WellnessEntry } from '@/lib/wellness'
import {
  EMPTY_PROFILE,
  PROFILE_STORAGE_KEY,
  loadProfile,
  loadProfileAsync,
  onProfileChange,
  type LocalProfile,
} from '@/lib/profile'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

/** Kullanıcının kendi "aldım" işaretleri — cihazda, gün bazında. */

const TIME_TONE: Record<string, string> = {
  Sabah: '#A8BFAE',
  Öğle: '#9FB0BE',
  Akşam: '#C5B18E',
  Gece: '#B4A7C0',
}

const TIME_ORDER: Record<string, number> = { Sabah: 0, Öğle: 1, Akşam: 2, Gece: 3 }

const EMPTY_IDS: string[] = []
const SLICES = ['Sabah', 'Öğle', 'Akşam', 'Gece'] as const

/** Yerel saate göre dilim: 05–11 Sabah, 11–16 Öğle, 16–21 Akşam, kalanı Gece. */
function sliceOfHour(hour: number): number {
  if (hour >= 5 && hour < 11) return 0
  if (hour >= 11 && hour < 16) return 1
  if (hour >= 16 && hour < 21) return 2
  return 3
}

function formatToday(date = new Date()): string {
  return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
}

/* ── cihaz durumu: React dışı store'lar için kararlı anlık görüntüler ── */

const noopSubscribe = () => () => {}

let profileRawCache: string | null | undefined
let profileCache: LocalProfile = { ...EMPTY_PROFILE }

function profileSnapshot(): LocalProfile {
  const raw = readRaw(PROFILE_STORAGE_KEY).raw
  if (raw === profileRawCache) return profileCache
  profileRawCache = raw
  profileCache = loadProfile()
  return profileCache
}

const marksListeners = new Set<() => void>()
let marksCacheKey = ''
let marksCache: string[] = EMPTY_IDS

function subscribeMarks(callback: () => void): () => void {
  marksListeners.add(callback)
  const offStorage = onStorageKey(MARKS_KEY, callback)
  return () => {
    marksListeners.delete(callback)
    offStorage()
  }
}

function marksSnapshot(): string[] {
  const raw = readRaw(MARKS_KEY).raw ?? ''
  const key = `${localDayKey()}|${raw}`
  if (key === marksCacheKey) return marksCache
  marksCacheKey = key
  marksCache = readMarks()[localDayKey()] ?? EMPTY_IDS
  return marksCache
}

function notifyMarks(): void {
  marksListeners.forEach(listener => listener())
}

const MOODS = [
  { value: 1, emoji: '😫', label: 'Çok yorgun' },
  { value: 2, emoji: '😔', label: 'Düşük' },
  { value: 3, emoji: '😐', label: 'Orta' },
  { value: 4, emoji: '🙂', label: 'İyi' },
  { value: 5, emoji: '😄', label: 'Harika' },
] as const

const subscribeDay = (callback: () => void) => {
  const timer = window.setInterval(callback, 60_000)
  window.addEventListener('focus', callback)
  document.addEventListener('visibilitychange', callback)
  return () => {
    window.clearInterval(timer)
    window.removeEventListener('focus', callback)
    document.removeEventListener('visibilitychange', callback)
  }
}

export default function DashboardPage() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  const remote = isRemoteMode()
  const localProfile = useSyncExternalStore(onProfileChange, profileSnapshot, () => EMPTY_PROFILE)
  const localTaken = useSyncExternalStore(subscribeMarks, marksSnapshot, () => EMPTY_IDS)
  const [remoteProfile, setRemoteProfile] = useState<LocalProfile | null>(null)
  const [remoteTaken, setRemoteTaken] = useState<string[]>(EMPTY_IDS)
  const profile = remote ? (remoteProfile ?? EMPTY_PROFILE) : localProfile
  const taken = remote ? remoteTaken : localTaken
  const reloadRemoteMarks = useCallback(() => {
    readMarksAsync().then(all => setRemoteTaken(all[localDayKey()] ?? EMPTY_IDS)).catch(() => setRemoteTaken(EMPTY_IDS))
  }, [])
  useEffect(() => {
    if (!remote) return
    let alive = true
    const loadP = () => { loadProfileAsync().then(p => { if (alive) setRemoteProfile(p) }).catch(() => { if (alive) setRemoteProfile({ ...EMPTY_PROFILE }) }) }
    loadP()
    reloadRemoteMarks()
    const off = onProfileChange(loadP)
    return () => { alive = false; off() }
  }, [remote, reloadRemoteMarks])
  const todayKey = useSyncExternalStore(subscribeDay, localDayKey, () => '')
  const hour = useSyncExternalStore(subscribeDay, () => new Date().getHours(), () => 8)
  const dashboardPrefs = usePreferences().dashboard

  const [rows, setRows] = useState<ClientSupplement[]>([])
  const [reloadTick, setReloadTick] = useState(0)
  const [sheetRow, setSheetRow] = useState<ClientSupplement | null>(null)
  /** Kullanıcının elle açıp kapattığı gruplar; yoksa varsayılan = yalnız focusGroup açık. Oturum boyunca state'te kalır. */
  const [openOverride, setOpenOverride] = useState<Record<string, boolean>>({})
  const [listError, setListError] = useState<string | null>(null)
  const [listReady, setListReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [wellness, setWellness] = useState<WellnessEntry[]>([])
  const [moodError, setMoodError] = useState<string | null>(null)
  const [moodBusy, setMoodBusy] = useState(false)
  const reloadWellness = useCallback(() => {
    loadWellnessAsync().then(setWellness).catch(() => setWellness([]))
  }, [])
  useEffect(() => {
    reloadWellness()
    return subscribeWellness(reloadWellness)
  }, [reloadWellness])
  const todayEntry = todayKey ? wellness.find(entry => entry.day === todayKey) : undefined
  const mood = todayEntry?.energy ?? null
  const pickMood = useCallback(async (value: number) => {
    if (!todayKey || moodBusy) return
    setMoodBusy(true)
    setMoodError(null)
    try {
      // Aynı gün kaydı bütün satırı yazar: uyku/sindirim/not korunsun diye mevcut değerlerle birleştir.
      const current = (await loadWellnessAsync()).find(entry => entry.day === todayKey)
      const clearing = current?.energy === value
      const { energy: _energy, ...rest } = current ?? { day: todayKey }
      void _energy
      const hasOthers = rest.sleep !== undefined || rest.digestion !== undefined || rest.note !== undefined
      if (clearing && !hasOthers) {
        const res = await deleteWellnessDayAsync(todayKey)
        if (!res.ok) setMoodError(res.error)
      } else {
        const res = await saveWellnessAsync(clearing ? { ...rest, day: todayKey } : { ...rest, day: todayKey, energy: value })
        if (!res.ok) setMoodError(res.errors[0] ?? 'Kaydedilemedi.')
      }
    } catch (error) {
      setMoodError(error instanceof Error ? error.message : 'Kaydedilemedi.')
    } finally {
      setMoodBusy(false)
      reloadWellness()
    }
  }, [todayKey, moodBusy, reloadWellness])

  /* ── envanter: demo değişimlerini dinle, hata durumunu gizleme ── */
  useEffect(() => {
    let alive = true
    const load = () => {
      listSupplements()
        .then(next => {
          if (!alive) return
          setRows(next)
          setListError(null)
        })
        .catch((error: unknown) => {
          if (!alive) return
          setRows([])
          setListError(error instanceof Error ? error.message : 'Takviyeler yüklenemedi.')
        })
        .finally(() => {
          if (alive) setListReady(true)
        })
    }
    load()
    const off = onDemoChange(load)
    return () => {
      alive = false
      off()
    }
  }, [reloadTick])

  const toggleTaken = useCallback(
    (id: string) => {
      if (isRemoteMode()) {
        toggleDayMarkAsync(id).then(ok => {
          setStorageError(ok ? null : 'İşaret kaydedilemedi.')
          reloadRemoteMarks()
        }).catch(() => setStorageError('İşaret kaydedilemedi.'))
        return
      }
      try {
        toggleDayMark(id)
        setStorageError(null)
        notifyMarks()
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'İşaret cihaza kaydedilemedi.')
      }
    },
    [reloadRemoteMarks],
  )

  /* ── türetilmiş gerçek sayılar ── */
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const left = TIME_ORDER[a.time_of_day] ?? 9
      const right = TIME_ORDER[b.time_of_day] ?? 9
      return left - right
    })
  }, [rows])

  const takenCount = useMemo(
    () => sortedRows.filter(row => taken.includes(row.id)).length,
    [sortedRows, taken],
  )

  const differentTimes = useMemo(
    () => new Set(sortedRows.map(row => row.time_of_day).filter(Boolean)).size,
    [sortedRows],
  )

  const profileFilled = useMemo(
    () => [profile.age, profile.heightCm, profile.weightKg, profile.sex ?? ''].filter(value => value.trim().length > 0).length,
    [profile],
  )

  /* dilim grupları + şimdi/sonraki dilim (tüm dilim işaretlenince vurgu ilerler) */
  const groups = useMemo(() => {
    const list = [...SLICES, 'Diğer'].map(name => ({
      name,
      rows: sortedRows.filter(r => (SLICES as readonly string[]).includes(r.time_of_day) ? r.time_of_day === name : name === 'Diğer'),
    })).filter(g => g.rows.length > 0)
    return list.map(g => ({ ...g, done: g.rows.every(r => taken.includes(r.id)) }))
  }, [sortedRows, taken])
  const focusName = useMemo(() => {
    const start = sliceOfHour(hour)
    const pending = groups.filter(g => !g.done)
    const ahead = pending.find(g => (TIME_ORDER[g.name] ?? 9) >= start)
    return (ahead ?? pending[0])?.name ?? null
  }, [groups, hour])
  const focusGroup = groups.find(g => g.name === focusName) ?? null
  const otherGroups = groups.filter(g => g.name !== focusName)
  const allDone = groups.length > 0 && groups.every(g => g.done)
  const renderRow = (row: ClientSupplement) => {
    const isTaken = taken.includes(row.id)
    const tone = TIME_TONE[row.time_of_day] ?? '#8B97AA'
    return (
      <li key={row.id} className="dv-li">
        <button
          type="button"
          className="dv-row"
          aria-pressed={isTaken}
          onClick={() => toggleTaken(row.id)}
          aria-label={`${row.name}: ${isTaken ? 'işareti kaldır' : 'alındı olarak işaretle'}`}
        >
          <span className="dv-time" style={{ color: tone, borderColor: `${tone}55`, background: `${tone}14` }}>
            {row.time_of_day || '—'}
          </span>
          <span className="dv-row-main">
            <span className="dv-row-name">{row.name}</span>
            <span className="dv-row-sub">
              {[row.dosage, row.frequency].filter(Boolean).join(' · ') || 'Doz belirtilmemiş'}
            </span>
          </span>
          <span className={`dv-check ${isTaken ? 'is-on' : ''}`} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        </button>
        <button
          type="button"
          className="row-more"
          aria-haspopup="menu"
          aria-label={`${row.name} için işlemler`}
          onClick={e => { e.stopPropagation(); setSheetRow(row) }}
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </li>
    )
  }
  const isOpen = (name: string) => openOverride[name] ?? name === focusName
  const toggleGroup = (name: string) => setOpenOverride(prev => ({ ...prev, [name]: !isOpen(name) }))
  const renderGroup = (g: (typeof groups)[number], focus: boolean) => {
    const open = isOpen(g.name)
    const done = g.rows.filter(r => taken.includes(r.id)).length
    const label = g.done ? 'tamam ✓' : `${done}/${g.rows.length}`
    const listId = `grp-${g.name}`
    return (
      <div key={g.name} className={`dv-group ${focus ? 'dv-group--focus' : 'dv-group--compact'} ${g.done ? 'is-done' : ''}`} aria-label={`${g.name} dilimi`}>
        <button type="button" className="grp-head" aria-expanded={open} aria-controls={listId} onClick={() => toggleGroup(g.name)}>
          <span aria-hidden="true">🕒</span>
          <b>{g.name}</b>
          {focus && <em>{g.name === SLICES[sliceOfHour(hour)] ? 'şimdi' : 'sıradaki'}</em>}
          <span className="grp-sum">{label}</span>
          <span className="grp-chev" aria-hidden="true">{open ? '▾' : '▸'}</span>
        </button>
        {open && <ul id={listId} className="dv-list">{g.rows.map(renderRow)}</ul>}
      </div>
    )
  }
  const emptyInventory = listReady && sortedRows.length === 0
  const today = todayKey ? formatToday(new Date(`${todayKey}T12:00:00`)) : ''

  if (!mounted) return <div className="p-4" aria-busy="true">Panel yükleniyor…</div>
  if (remote && remoteProfile === null) return <div className="p-4" aria-busy="true">Panel yükleniyor…</div>
  if (!profile.onboardingComplete) return <ProfileEditor welcome />

  return (
    <div className="dv-shell">
      <header className="dv-head">
        <div className="dv-head-top">
          <p className="dv-eyebrow">LongevityAI · GÜNLÜK PANEL</p>
          <CustomizeButton section="dashboard" />
        </div>
        <h1 className="dv-title">
          {profile.displayName ? (
            <>
              Merhaba, <span className="dv-title-name">{profile.displayName}</span>
            </>
          ) : (
            'Günlük panel'
          )}
        </h1>
        <p className="dv-date">{today || 'Bugün'}</p>

        <div className="dv-meta" aria-label="Profil özeti">
          <span className="dv-measure">Yaş <b>{profile.age || '—'}</b></span>
          <span className="dv-model">
            <span className="dv-model-dot" aria-hidden="true" />
            Vücudum
          </span>
          <span className="dv-measure">
            Boy <b>{profile.heightCm ? `${profile.heightCm} cm` : '—'}</b>
          </span>
          <span className="dv-measure">
            Kilo <b>{profile.weightKg ? `${profile.weightKg} kg` : '—'}</b>
          </span>
          <Link href="/profile" className="dv-link">
            Profili düzenle <span aria-hidden="true">→</span>
          </Link>
        </div>

        {DEMO_MODE && <span className="dv-demo">DEMO · cihaz verisi</span>}
      </header>

      <section className="mood-card" aria-labelledby="mood-title">
        <MoodGlow value={mood} />
        <h2 id="mood-title" className="dv-card-title">Nasıl hissediyorum</h2>
        <p className="dv-card-sub">Bugünkü halini tek dokunuşla kaydet · tekrar dokunursan kalkar</p>
        <div className="mood-chips" role="group" aria-label="Bugünkü his">
          {MOODS.map(m => (
            <button
              key={m.value}
              type="button"
              className={`mood-chip ${mood === m.value ? 'is-on' : ''}`}
              aria-pressed={mood === m.value}
              aria-label={`${m.label} (${m.value}/5)`}
              disabled={moodBusy || !todayKey}
              onClick={() => pickMood(m.value)}
            >
              <span aria-hidden="true">{m.emoji}</span>
            </button>
          ))}
        </div>
        <p className="dv-card-sub" aria-live="polite">
          {mood ? `Bugün: ${MOODS[mood - 1].label}` : 'Bugün için henüz seçmedin.'}
        </p>
        {moodError && <p className="dv-alert" role="alert">{moodError}</p>}
      </section>

      <div className="metric-strip" aria-label="Özet">
        <div className="m-item"><b>{listReady ? rows.length : '—'}</b><span>Envanter</span></div>
        <div className="m-item"><b>{takenCount}/{rows.length}</b><span>Bugün</span></div>
        <div className="m-item"><b>{listReady ? differentTimes : '—'}</b><span>Farklı saat</span></div>
        <div className="m-item"><b>{profileFilled}/4</b><span>Profil</span></div>
      </div>

      <section className="dv-side" aria-label="Günlük veriler">
        <section className="dv-card dv-today dv-today--hero" aria-labelledby="dv-today-title">
          <div className="dv-today-head">
            <div>
              <h2 id="dv-today-title" className="dv-card-title">
                Bugünkü kayıtlarım
              </h2>
              <p className="dv-card-sub">Kendi işaretlerin · sağlık önerisi değildir</p>
            </div>
            <span className="dv-count">
              {takenCount}/{sortedRows.length}
            </span>
          </div>

          {listError && (
            <p className="dv-alert" role="alert">
              {listError}
            </p>
          )}

          {emptyInventory && !listError && (
            <div className="dv-empty">
              <p>Envanter boş. Bugünü işaretlemek için önce bir kayıt ekle.</p>
              <Link href="/supplements" className="dv-link">
                Envanteri aç <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {focusGroup && renderGroup(focusGroup, true)}
          {allDone && <p className="dv-card-sub dv-allDone" role="status">Bugünkü tüm kayıtlar işaretlendi ✓</p>}
          {otherGroups.map(g => renderGroup(g, false))}

          {storageError && (
            <p className="dv-alert" role="alert">
              {storageError}
            </p>
          )}
        </section>

        {sheetRow && (
          <SupplementSheet
            key={sheetRow.id}
            row={sheetRow}
            onClose={() => setSheetRow(null)}
            onChanged={() => { setReloadTick(t => t + 1); reloadRemoteMarks() }}
          />
        )}

        {dashboardPrefs.showPerformance !== false && <PerformancePanel />}

        <footer className="dv-foot">
          <div className="flex gap-4 text-sm py-2"><Link href="/reminders" className="text-[var(--primary)]">Hatırlatmalarım →</Link><Link href="/tracking" className="text-[var(--primary)]">Etki günlüğüm →</Link></div>
          <Link href="/chat" className="dv-ai dv-ai--wide">
            AI&apos;a sor <span aria-hidden="true">→</span>
          </Link>
          <p className="dv-privacy">
            Profil ve günlük işaretler güvenli saklanır; depolama hataları ayrıca gösterilir. AI’a analiz gönderirsen yalnız izin verdiğin profil alanları da iletilir.
          </p>
          <p className="dv-privacy dv-privacy--dim">
            LongevityAI bilgi amaçlıdır; teşhis veya tedavi önerisi değildir.
          </p>
        </footer>
      </section>
    </div>
  )
}
