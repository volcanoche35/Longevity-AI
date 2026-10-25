'use client'

/**
 * Günlük panel — referans düzeni: solda sinematik anatomi, sağda veri kartları.
 *
 * Veri dürüstlüğü kuralları:
 *  - Uydurma laboratuvar sonucu, sağlık skoru, "kanıt derecesi" YOK.
 *  - Kartlardaki sayılar gerçek envanterden türetilir: kayıt sayısı, bugün
 *    işaretlenen kullanım, farklı zaman dilimi sayısı, profil doluluğu.
 *  - "Alındı" işaretleri kullanıcının kendi tıklamasıdır, sağlık önerisi değil;
 *    yalnız bu cihazda ve yerel gün bazında saklanır. Senkronizasyon iddiası yok.
 *  - Cinsiyet çıkarımı yapılmaz: yalnız profildeki anatomyVariant kullanılır.
 *
 * Yerel veri, React'in kendi abonelik API'siyle (useSyncExternalStore) okunur:
 * sunucu render'ı boş profil döner, istemci cihazdaki gerçek kaydı gösterir.
 */

import Link from 'next/link'
import ProfileEditor from '@/components/profile-editor'
import { lockBodyScroll } from '@/lib/modal'
import { DAY_MARKS_KEY as MARKS_KEY, localDayKey, readMarks, toggleDayMark } from '@/lib/daymarks'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import AnatomyHero, { type AnatomySelection } from '@/components/anatomy-hero'
import '@/components/dashboard-v3.css'
import { SYSTEM_BY_ID, getRegion, getRegions } from '@/lib/anatomy-regions'
import { listSupplements, onDemoChange, type ClientSupplement } from '@/lib/data'
import { onStorageKey, readRaw } from '@/lib/local-store'
import {
  EMPTY_PROFILE,
  PROFILE_STORAGE_KEY,
  loadProfile,
  onProfileChange,
  type LocalProfile,
} from '@/lib/profile'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

/** Kullanıcının kendi "aldım" işaretleri — cihazda, gün bazında. */

const TIME_TONE: Record<string, string> = {
  Sabah: '#FFB020',
  Öğle: '#22E1FF',
  Akşam: '#FF4D5E',
  Gece: '#FF3DA6',
}

const TIME_ORDER: Record<string, number> = { Sabah: 0, Öğle: 1, Akşam: 2, Gece: 3 }

const EMPTY_IDS: string[] = []

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

const mobileQuery = '(max-width: 767px)'
const subscribeMobile = (cb: () => void) => {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener('change', cb)
  return () => query.removeEventListener('change', cb)
}

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
  const profile = useSyncExternalStore(onProfileChange, profileSnapshot, () => EMPTY_PROFILE)
  const taken = useSyncExternalStore(subscribeMarks, marksSnapshot, () => EMPTY_IDS)
  const todayKey = useSyncExternalStore(subscribeDay, localDayKey, () => '')

  const [rows, setRows] = useState<ClientSupplement[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listReady, setListReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [selection, setSelection] = useState<AnatomySelection | null>(null)
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(mobileQuery).matches, () => false)
  const detailRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const selectSystem = useCallback((next: AnatomySelection | null) => {
    if (next && document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement
    setSelection(next)
  }, [])
  useEffect(() => {
    if (!selection || !mobile) return
    const unlock = lockBodyScroll()
    const background = [...document.querySelectorAll<HTMLElement>('.dv-head,.dv-anatomy,.dv-metrics,.dv-today,.dv-foot,nav.tabbar')]
    const previousInert = background.map(node => node.inert)
    background.forEach(node => { node.inert = true })
    detailRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelection(null); return }
      if (e.key !== 'Tab') return
      const elements = [...(detailRef.current?.querySelectorAll<HTMLElement>('button,a[href]') ?? [])]
      const first = elements[0], last = elements[elements.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', trap)
    return () => {
      unlock()
      background.forEach((node, i) => { node.inert = previousInert[i] })
      window.removeEventListener('keydown', trap)
      returnFocus.current?.focus()
    }
  }, [selection, mobile])

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
  }, [])

  const toggleTaken = useCallback(
    (id: string) => {
      try {
        toggleDayMark(id)
        setStorageError(null)
        notifyMarks()
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'İşaret cihaza kaydedilemedi.')
      }
    },
    [],
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

  const selectedSystem = selection ? SYSTEM_BY_ID[selection.system] : null
  const selectedRegion = selection ? getRegion(profile.anatomyVariant, selection.region) : null
  const systemRegions = useMemo(
    () => (selectedSystem ? getRegions(profile.anatomyVariant).filter(region => region.system === selectedSystem.id) : []),
    [selectedSystem, profile.anatomyVariant],
  )

  const takenPercent = sortedRows.length > 0 ? Math.round((takenCount / sortedRows.length) * 100) : 0
  const emptyInventory = listReady && sortedRows.length === 0
  const today = todayKey ? formatToday(new Date(`${todayKey}T12:00:00`)) : ''

  if (!mounted) return <div className="p-4" aria-busy="true">Panel yükleniyor…</div>
  if (!profile.onboardingComplete) return <ProfileEditor welcome />

  return (
    <div className="dv-shell">
      <header className="dv-head">
        <p className="dv-eyebrow">BİYOTRACK · GÜNLÜK PANEL</p>
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
            <span className="dv-model-dot" data-variant={profile.anatomyVariant ?? 'demo'} aria-hidden="true" />
            {profile.sex === 'female' ? 'Kadın' : profile.sex === 'male' ? 'Erkek' : 'Cinsiyet belirtilmedi'}
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

      <section className="dv-anatomy" aria-label="İnteraktif anatomi">
        <AnatomyHero variant={profile.anatomyVariant} selection={selection} onSelect={selectSystem} />
      </section>

      <section className="dv-side" aria-label="Günlük veriler">
        {selectedSystem && (
          <>
          {mobile && <button type="button" className="dv-detail-scrim" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} aria-label="Sistem detayını kapat" onClick={() => setSelection(null)} />}
          <div ref={detailRef} className="dv-card dv-detail" role={mobile ? 'dialog' : undefined} aria-modal={mobile || undefined} aria-label={selectedSystem.name + ' sistemi'} aria-live="polite">
            <div className="dv-detail-head">
              <div>
                <p className="dv-detail-kicker" style={{ color: selectedSystem.tone.solid }}>
                  {selectedSystem.name} sistemi
                </p>
                <h2 className="dv-detail-title">{selectedRegion?.name ?? selectedSystem.name}</h2>
              </div>
              <button type="button" className="dv-icon-btn" onClick={() => setSelection(null)} aria-label="Seçimi kapat">
                ✕
              </button>
            </div>

            <p className="dv-detail-text">{selectedRegion?.description ?? selectedSystem.description}</p>

            {systemRegions.length > 0 && (
              <div className="dv-region-chips" role="group" aria-label="Bölgeler">
                {systemRegions.map(region => (
                  <button
                    key={region.id}
                    type="button"
                    className="dv-region-chip"
                    aria-pressed={selection?.region === region.id}
                    onClick={() => setSelection({ system: selectedSystem.id, region: region.id })}
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            )}

            {selectedSystem.note && <p className="dv-detail-note">{selectedSystem.note}</p>}

            <div className="dv-detail-foot">
              <Link href={`/chat?system=${encodeURIComponent(selectedSystem.name)}`} className="dv-ai">
                Bu sistem için AI&apos;a sor <span aria-hidden="true">→</span>
              </Link>
              <span className="dv-detail-tag">Açıklayıcı bilgi</span>
            </div>
          </div>
          </>
        )}

        <div className="dv-metrics">
          <div className="dv-card dv-metric">
            <p className="dv-metric-label">Envanter</p>
            <p className="dv-metric-value">{listReady ? rows.length : '—'}</p>
            <p className="dv-metric-caption">kayıtlı takviye</p>
          </div>
          <div className="dv-card dv-metric">
            <p className="dv-metric-label">Bugün işaretlenen</p>
            <p className="dv-metric-value">
              {mounted ? takenCount : '—'}
              <span className="dv-metric-of">/{rows.length}</span>
            </p>
            <div className="dv-bar" aria-hidden="true">
              <span style={{ width: `${takenPercent}%` }} />
            </div>
            <p className="dv-metric-caption">senin işaretin</p>
          </div>
          <div className="dv-card dv-metric">
            <p className="dv-metric-label">Farklı saat</p>
            <p className="dv-metric-value">{listReady ? differentTimes : '—'}</p>
            <p className="dv-metric-caption">zaman dilimi</p>
          </div>
          <div className="dv-card dv-metric">
            <p className="dv-metric-label">Profil</p>
            <p className="dv-metric-value">
              {profileFilled}
              <span className="dv-metric-of">/4</span>
            </p>
            <p className="dv-metric-caption">dolu alan</p>
          </div>
        </div>

        <section className="dv-card dv-today" aria-labelledby="dv-today-title">
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

          <ul className="dv-list">
            {sortedRows.map(row => {
              const isTaken = taken.includes(row.id)
              const tone = TIME_TONE[row.time_of_day] ?? '#8B97AA'
              return (
                <li key={row.id}>
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
                </li>
              )
            })}
          </ul>

          {storageError && (
            <p className="dv-alert" role="alert">
              {storageError}
            </p>
          )}
        </section>

        <footer className="dv-foot">
          <div className="flex gap-4 text-sm py-2"><Link href="/reminders" className="text-[var(--primary)]">Hatırlatmalarım →</Link><Link href="/tracking" className="text-[var(--primary)]">Etki günlüğüm →</Link></div>
          <Link href="/chat" className="dv-ai dv-ai--wide">
            AI&apos;a sor <span aria-hidden="true">→</span>
          </Link>
          <p className="dv-privacy">
            Profil ve günlük işaretler bu tarayıcıda tutulur; depolama hataları ayrıca gösterilir. AI’a analiz gönderirsen yalnız izin verdiğin profil alanları da iletilir.
          </p>
          <p className="dv-privacy dv-privacy--dim">
            BioTrack bilgi amaçlıdır; teşhis veya tedavi önerisi değildir.
          </p>
        </footer>
      </section>
    </div>
  )
}
