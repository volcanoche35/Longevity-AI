/**
 * Kişiselleştirme tercihleri — TEK depo, tek doğruluk kaynağı.
 *
 * Neden ayrı modül: pano (dashboard), takviye formu, /settings sayfası ve
 * "Bu ekranı özelleştir" dialogu aynı değerleri okumalı. Ayrı bir klinik/AI
 * deposu AÇILMAZ; yaş, cinsiyet, doz ve AI paylaşım izni profil modülünde kalır.
 *
 * Kurallar:
 *  - Okuma asla fırlatmaz: bozuk JSON, eski/unknown alanlar ve yanlış tipler
 *    alan bazında varsayılana düşer (kısmi veri tüm ayarı sıfırlamaz).
 *  - Yazma AÇIK sonuç döner ({ok:false,error}); sessiz yutma yok. Depolama
 *    reddederse (kota/engel) eski kayıt korunur çünkü writeRaw doğrulayarak yazar.
 *  - Hook SSR güvenlidir: sunucu ve ilk istemci render'ı aynı varsayılan nesneyi
 *    görür (hydration uyuşmazlığı yok); gerçek değer ilk abonelikte yüklenir.
 */
import { useSyncExternalStore } from 'react'
import { onStorageKey, readRaw, removeRaw, writeRaw } from './local-store'

export const PREFERENCES_KEY = 'biotrack.preferences.v1'

export const SUPPLEMENT_FORMS = ['Hap', 'Kapsül', 'Damla', 'Toz', 'Sıvı', 'Diğer'] as const
export const SUPPLEMENT_TIMES = ['Sabah', 'Öğle', 'Akşam', 'Gece'] as const

export type SupplementForm = (typeof SUPPLEMENT_FORMS)[number]
export type SupplementTime = (typeof SUPPLEMENT_TIMES)[number]

export interface DashboardPreferences {
  showPerformance: boolean
}

export interface SupplementPreferences {
  defaultForm: SupplementForm
  defaultTime: SupplementTime
}

export interface Preferences {
  dashboard: DashboardPreferences
  supplements: SupplementPreferences
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/** Partial<Preferences> de bu tipe atanabilir (iç içe tam nesne dahil). */
export type PreferencesPatch = DeepPartial<Preferences>

export type PreferencesSaveResult =
  | { ok: true; preferences: Preferences }
  | { ok: false; error: string }

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item)
    Object.freeze(value)
  }
  return value
}

const DEFAULT_PREFERENCES: Preferences = deepFreeze<Preferences>({
  dashboard: { showPerformance: true },
  supplements: { defaultForm: 'Hap', defaultTime: 'Sabah' },
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function freshDefaults(): Preferences {
  return {
    dashboard: { ...DEFAULT_PREFERENCES.dashboard },
    supplements: { ...DEFAULT_PREFERENCES.supplements },
  }
}

function message(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  return fallback
}

/** Depodaki değeri OKURKEN hoşgörülü: bilinmeyen alan yok sayılır, tip yanlışsa varsayılan. */
function normalize(input: unknown): Preferences {
  const root = isRecord(input) ? input : {}
  const dashboard = isRecord(root.dashboard) ? root.dashboard : {}
  const supplements = isRecord(root.supplements) ? root.supplements : {}
  const form = supplements.defaultForm
  const time = supplements.defaultTime
  return {
    dashboard: {
      // Eski kayıtlarda alan yoksa (veya eski anatomi/bilgi alanları varsa) grafik açık kalır.
      showPerformance:
        typeof dashboard.showPerformance === 'boolean'
          ? dashboard.showPerformance
          : DEFAULT_PREFERENCES.dashboard.showPerformance,
    },
    supplements: {
      defaultForm:
        typeof form === 'string' && (SUPPLEMENT_FORMS as readonly string[]).includes(form)
          ? (form as SupplementForm)
          : DEFAULT_PREFERENCES.supplements.defaultForm,
      defaultTime:
        typeof time === 'string' && (SUPPLEMENT_TIMES as readonly string[]).includes(time)
          ? (time as SupplementTime)
          : DEFAULT_PREFERENCES.supplements.defaultTime,
    },
  }
}

function parseStored(raw: string | null): Preferences {
  if (!raw) return freshDefaults()
  try {
    return normalize(JSON.parse(raw))
  } catch {
    return freshDefaults()
  }
}

function samePreferences(a: Preferences, b: Preferences): boolean {
  return (
    a.dashboard.showPerformance === b.dashboard.showPerformance &&
    a.supplements.defaultForm === b.supplements.defaultForm &&
    a.supplements.defaultTime === b.supplements.defaultTime
  )
}

/* ------------------------------------------------------------------ */
/* Abonelik — aynı sekme (yazma) + diğer sekmeler (storage olayı)      */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>()
/** Hook için önbellek: aynı nesne kimliği korunur (getSnapshot stabil olmalı). */
let cached: Preferences | null = null
/** SSR/ilk istemci render'ı varsayılan görsün; gerçek değer ilk abonelikte yüklenir. */
let ready = false
let hydratePlanned = false

function emit(): void {
  for (const listener of [...listeners]) listener()
}

/** Aynı sekmede yapılan kayıt: önbellek + abonelere bildirim. */
function publish(next: Preferences): void {
  cached = next
  ready = true
  emit()
}

function hydrate(raw?: string | null): void {
  hydratePlanned = false
  const next = raw === undefined ? parseStored(readRaw(PREFERENCES_KEY).raw) : parseStored(raw)
  const changed = cached === null || !samePreferences(cached, next)
  cached = next
  ready = true
  if (changed) emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!ready && !hydratePlanned) {
    hydratePlanned = true
    // Render/effect sırasında setState yok: depo microtask'ta hidratlanıp bildirir.
    Promise.resolve().then(() => hydrate())
  }
  // storage olayı YALNIZCA diğer sekmelerde tetiklenir; yazan sekme publish ile güncellenir.
  const off = onStorageKey(PREFERENCES_KEY, event => {
    hydrate(event.newValue)
  })
  return () => {
    listeners.delete(listener)
    off()
  }
}

function getClientSnapshot(): Preferences {
  if (!ready) return DEFAULT_PREFERENCES
  return cached ?? DEFAULT_PREFERENCES
}

function getServerSnapshot(): Preferences {
  return DEFAULT_PREFERENCES
}

/**
 * Bileşenlerde kullanılan canlı tercihler. Dönen nesne kimliği değişiklik
 * olmadıkça sabittir; sunucuda ve ilk istemci render'ında varsayılan döner.
 */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

/* ------------------------------------------------------------------ */
/* Okuma / yazma / sıfırlama                                           */
/* ------------------------------------------------------------------ */

/** Depodan gerçek değerler. SSR'de (tarayıcı yok) varsayılan döner, fırlatmaz. */
export function getPreferences(): Preferences {
  return parseStored(readRaw(PREFERENCES_KEY).raw)
}

/** Kısmi yamayı katı doğrular: yanlış tip/enum yazılmaz, açık hata döner. */
function validatePatch(patch: unknown): PreferencesPatch {
  if (!isRecord(patch)) throw new Error('Ayarlar nesne olarak gönderilmeli.')
  const out: PreferencesPatch = {}

  if (patch.dashboard !== undefined) {
    if (!isRecord(patch.dashboard)) throw new Error('Pano ayarları nesne olmalı.')
    const dashboard: NonNullable<PreferencesPatch['dashboard']> = {}
    const performance = patch.dashboard.showPerformance
    if (performance !== undefined) {
      if (typeof performance !== 'boolean') throw new Error('Performans grafiği ayarı yalnızca açık veya kapalı olabilir.')
      dashboard.showPerformance = performance
    }
    if (Object.keys(dashboard).length) out.dashboard = dashboard
  }

  if (patch.supplements !== undefined) {
    if (!isRecord(patch.supplements)) throw new Error('Takviye ayarları nesne olmalı.')
    const supplements: NonNullable<PreferencesPatch['supplements']> = {}
    const form = patch.supplements.defaultForm
    if (form !== undefined) {
      if (typeof form !== 'string' || !(SUPPLEMENT_FORMS as readonly string[]).includes(form)) {
        throw new Error(`Varsayılan form şunlardan biri olmalı: ${SUPPLEMENT_FORMS.join(', ')}.`)
      }
      supplements.defaultForm = form as SupplementForm
    }
    const time = patch.supplements.defaultTime
    if (time !== undefined) {
      if (typeof time !== 'string' || !(SUPPLEMENT_TIMES as readonly string[]).includes(time)) {
        throw new Error(`Varsayılan saat şunlardan biri olmalı: ${SUPPLEMENT_TIMES.join(', ')}.`)
      }
      supplements.defaultTime = time as SupplementTime
    }
    if (Object.keys(supplements).length) out.supplements = supplements
  }

  return out
}

function mergePreferences(current: Preferences, patch: PreferencesPatch): Preferences {
  return {
    dashboard: {
      showPerformance: patch.dashboard?.showPerformance ?? current.dashboard.showPerformance,
    },
    supplements: {
      defaultForm: patch.supplements?.defaultForm ?? current.supplements.defaultForm,
      defaultTime: patch.supplements?.defaultTime ?? current.supplements.defaultTime,
    },
  }
}

/**
 * Kısmi tercihi kalıcı yazar. Başarı/başarısızlık AÇIK döner; hata durumunda
 * depodaki eski kayıt korunur (kota, engel, doğrulama).
 */
export function savePreferences(patch: PreferencesPatch): PreferencesSaveResult {
  let validated: PreferencesPatch
  try {
    validated = validatePatch(patch)
  } catch (err) {
    return { ok: false, error: message(err, 'Ayarlar doğrulanamadı.') }
  }

  const current = getPreferences()
  const next = mergePreferences(current, validated)
  if (samePreferences(current, next)) {
    publish(next)
    return { ok: true, preferences: next }
  }
  try {
    writeRaw(PREFERENCES_KEY, JSON.stringify(next))
  } catch (err) {
    return { ok: false, error: message(err, 'Ayarlar kaydedilemedi.') }
  }
  publish(next)
  return { ok: true, preferences: next }
}

/**
 * Kullanıcı onayıyla varsayılana döndürür. Onay yoksa hiçbir şey silinmez.
 */
export function resetPreferences(): PreferencesSaveResult {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Tarayıcı yok (sunucu) — ayarlar sıfırlanamadı.' }
  }
  const confirmFn = (window as Window & { confirm?: (text: string) => boolean }).confirm
  const approved =
    typeof confirmFn === 'function'
      ? confirmFn('Tüm kişiselleştirme ayarları varsayılana dönsün mü?')
      : false
  if (!approved) return { ok: false, error: 'Sıfırlama iptal edildi; ayarlar değişmedi.' }

  try {
    removeRaw(PREFERENCES_KEY)
  } catch (err) {
    return { ok: false, error: message(err, 'Ayarlar sıfırlanamadı.') }
  }
  const next = freshDefaults()
  publish(next)
  return { ok: true, preferences: next }
}
