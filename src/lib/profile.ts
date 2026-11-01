/**
 * Yerel profil — demo/cihaz modu.
 *
 * API sözleşmesi (başka ajanlar bunu bekliyor):
 *   LocalProfile, loadProfile(), saveProfile(partial), onProfileChange(cb)
 *
 * Kurallar:
 *  - Profil cihazda (localStorage) tutulur; bulut/hesap senkronizasyonu YOK.
 *  - Varsayılan profil boştur; kimlik veya ölçüm uydurulmaz.
 *  - saveProfile doğrulama veya depolama hatasında FIRLATIR (başarı sessizce yutulmaz).
 *  - anatomyVariant yalnızca GERİYE UYUMLULUK için tutulan iç alandır; arayüz
 *    artık bu alanı sormaz. Tıbbi cinsiyet `sex` alanıdır ve yalnızca kullanıcı
 *    açıkça beyan ettiğinde dolar (anatomyVariant'tan otomatik çıkarım yapılmaz).
 */
import { readRaw, writeRaw, removeRaw, onStorageKey, storageState, type StorageMode } from './local-store'
import { parseGoals } from './health-profile'
import { supabase, isRemoteMode, currentUserId } from './supabase'

export type Sex = 'female' | 'male'

export interface LocalProfile {
  displayName: string
  /** @deprecated İç uyumluluk alanı; arayüz kullanmaz. Kaynak doğru: `sex`. */
  anatomyVariant: Sex | null
  heightCm: string
  weightKg: string
  onboardingComplete: boolean
  age: string
  /** Kullanıcının açıkça beyan ettiği tıbbi profildeki cinsiyet. */
  sex: Sex | null
  /** Çoklu hedef; eski kayıtlardaki tek metin diziye çevrilir. */
  goal: string[]
  medications: string
  conditions: string
  allergies: string
  aiProfileConsent: boolean
}

export const PROFILE_STORAGE_KEY = 'biotrack.profile.v1'

export const EMPTY_PROFILE: LocalProfile = {
  displayName: '',
  anatomyVariant: null,
  heightCm: '',
  weightKg: '',
  onboardingComplete: false,
  age: '',
  sex: null,
  goal: [],
  medications: '',
  conditions: '',
  allergies: '',
  aiProfileConsent: false,
}

const NAME_MAX = 60
const NOTE_MAX = 500

function normalizeName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('İsim metin olmalı.')
  const cleaned = value.trim().replace(/\s+/g, ' ')
  if (cleaned.length > NAME_MAX) throw new Error(`İsim en fazla ${NAME_MAX} karakter olabilir.`)
  return cleaned
}

/** Boy/kilo: boş bırakılabilir. Girilirse sayı ve makul aralıkta olmalı. */
function normalizeMeasure(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== 'string') throw new Error(`${label} metin olmalı.`)
  const raw = value.trim().replace(',', '.')
  if (raw === '') return ''
  if (!/^\d+(?:\.\d+)?$/.test(raw)) throw new Error(`${label} için sayı girin (örn. 175).`)
  const n = Number(raw)
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${label} ${min}–${max} aralığında olmalı.`)
  }
  return raw
}

/** Yaş: boş bırakılabilir; girilirse tam sayı ve 1–120 aralığında. */
function normalizeAge(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Yaş metin olmalı.')
  const raw = value.trim()
  if (raw === '') return ''
  if (!/^\d+$/.test(raw)) throw new Error('Yaş tam sayı olmalı (örn. 34).')
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 120) throw new Error('Yaş 1–120 aralığında olmalı.')
  return String(n)
}

/** Serbest metin alanı: boş bırakılabilir, üst sınır var. */
function normalizeText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new Error(`${label} metin olmalı.`)
  const cleaned = value.trim()
  if (cleaned.length > max) throw new Error(`${label} en fazla ${max} karakter olabilir.`)
  return cleaned
}

function normalizeSex(value: unknown): Sex | null {
  if (value === null || value === 'female' || value === 'male') return value
  throw new Error('Cinsiyet kadın, erkek veya boş olmalı.')
}

/** @deprecated Eski çağrılar için: yalnız görünüm alanı doğrulaması. */
function normalizeVariant(value: unknown): Sex | null {
  if (value === null || value === 'female' || value === 'male') return value
  throw new Error('Görünüm tercihi kadın, erkek veya boş olmalı.')
}

function normalizeBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} doğru/yanlış olmalı.`)
  return value
}

/** Kayıtlı değer bozuksa alanı varsayılana düşür — yükleme asla çökmez. */
function lenient(profile: LocalProfile, key: keyof LocalProfile, value: unknown): void {
  try {
    switch (key) {
      case 'displayName': profile.displayName = normalizeName(value); break
      case 'anatomyVariant': profile.anatomyVariant = normalizeVariant(value); break
      case 'heightCm': profile.heightCm = normalizeMeasure(value, 'Boy', 50, 260); break
      case 'weightKg': profile.weightKg = normalizeMeasure(value, 'Kilo', 10, 400); break
      case 'onboardingComplete': profile.onboardingComplete = normalizeBoolean(value, 'Profil tamamlandı'); break
      case 'age': profile.age = normalizeAge(value); break
      case 'sex': profile.sex = normalizeSex(value); break
      case 'goal': profile.goal = parseGoals(value); break
      case 'medications': profile.medications = normalizeText(value, 'İlaçlar', NOTE_MAX); break
      case 'conditions': profile.conditions = normalizeText(value, 'Sağlık durumları', NOTE_MAX); break
      case 'allergies': profile.allergies = normalizeText(value, 'Alerjiler', NOTE_MAX); break
      case 'aiProfileConsent': profile.aiProfileConsent = normalizeBoolean(value, 'AI profili izni'); break
    }
  } catch {
    /* alanı varsayılan bırak */
  }
}

export function loadProfile(): LocalProfile {
  if (typeof window === 'undefined') return { ...EMPTY_PROFILE }
  const { raw } = readRaw(PROFILE_STORAGE_KEY)
  if (raw === null) return { ...EMPTY_PROFILE }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ...EMPTY_PROFILE }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...EMPTY_PROFILE }
  const profile: LocalProfile = { ...EMPTY_PROFILE }
  const record = parsed as Record<string, unknown>
  for (const key of Object.keys(EMPTY_PROFILE) as (keyof LocalProfile)[]) {
    if (key in record) lenient(profile, key, record[key])
  }
  // Eski kayıtta `sex` alanı hiç yoksa görünüm tercihinden taşı (tek yönlü göç).
  // Eksik yaş/kilo/boy gibi alanlar UYDURULMAZ; boş kalır.
  if (!('sex' in record)) profile.sex = profile.anatomyVariant
  // Kaynak doğru `sex`: doluysa görünüm alanı ondan türetilir.
  if (profile.sex !== null) profile.anatomyVariant = profile.sex
  return profile
}

const profileListeners = new Set<() => void>()
const notify = () => profileListeners.forEach(l => l())

/** Yalnız değişen alanlar doğrulanır; diğer alanlar mevcut profilden korunur. */
function mergeProfile(base: LocalProfile, partial: Partial<LocalProfile>): LocalProfile {
  const merged: LocalProfile = { ...base }
  if (partial.displayName !== undefined) merged.displayName = normalizeName(partial.displayName)
  if (partial.sex !== undefined) {
    const sex = normalizeSex(partial.sex)
    merged.sex = sex
    merged.anatomyVariant = sex
  } else if (partial.anatomyVariant !== undefined) {
    // Eski çağrı biçimi: yalnız görünüm alanı güncellenir, tıbbi cinsiyet türetilmez.
    merged.anatomyVariant = normalizeVariant(partial.anatomyVariant)
  }
  if (partial.heightCm !== undefined) merged.heightCm = normalizeMeasure(partial.heightCm, 'Boy', 50, 260)
  if (partial.weightKg !== undefined) merged.weightKg = normalizeMeasure(partial.weightKg, 'Kilo', 10, 400)
  if (partial.onboardingComplete !== undefined) {
    merged.onboardingComplete = normalizeBoolean(partial.onboardingComplete, 'Profil tamamlandı')
  }
  if (partial.age !== undefined) merged.age = normalizeAge(partial.age)
  if (partial.goal !== undefined) merged.goal = parseGoals(partial.goal)
  if (partial.medications !== undefined) {
    merged.medications = normalizeText(partial.medications, 'İlaçlar', NOTE_MAX)
  }
  if (partial.conditions !== undefined) {
    merged.conditions = normalizeText(partial.conditions, 'Sağlık durumları', NOTE_MAX)
  }
  if (partial.allergies !== undefined) {
    merged.allergies = normalizeText(partial.allergies, 'Alerjiler', NOTE_MAX)
  }
  if (partial.aiProfileConsent !== undefined) {
    merged.aiProfileConsent = normalizeBoolean(partial.aiProfileConsent, 'AI profili izni')
  }
  return merged
}

/**
 * Profili cihaza yazar. Doğrulama veya depolama hatasında fırlatır;
 * yazma başarısızsa hiçbir dinleyici "kaydedildi" sinyali almaz.
 */
export function saveProfile(partial: Partial<LocalProfile>): void {
  const merged = mergeProfile(loadProfile(), partial)
  try {
    writeRaw(PROFILE_STORAGE_KEY, JSON.stringify(merged))
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Profil cihaza kaydedilemedi.')
  }
  notify()
}

/** Cihazdaki profil kaydını siler (kullanıcı onayı arayüzde alınır). */
export function clearProfile(): void {
  try {
    removeRaw(PROFILE_STORAGE_KEY)
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Profil silinemedi.')
  }
  notify()
}

let stopStorage: (() => void) | null = null

/**
 * Profil değişince haber verir: aynı sekmedeki yazmalar + diğer sekmelerdeki
 * storage olayları. Dönen fonksiyon aboneliği kaldırır.
 */
export function onProfileChange(cb: () => void): () => void {
  profileListeners.add(cb)
  if (!stopStorage) {
    stopStorage = onStorageKey(PROFILE_STORAGE_KEY, () => notify())
  }
  return () => {
    profileListeners.delete(cb)
    if (profileListeners.size === 0 && stopStorage) {
      stopStorage()
      stopStorage = null
    }
  }
}

/** Arayüzde "cihazda mı, sadece bellekte mi" göstergesi için. */
export function profileStorageInfo(): { mode: StorageMode; error: string | null } {
  return storageState()
}

/* ── Supabase dalı (async): profiles (id = auth.uid()) ── */

export async function loadProfileAsync(): Promise<LocalProfile> {
  if (!isRemoteMode() || !supabase) return loadProfile()
  const userId = await currentUserId()
  if (!userId) return { ...EMPTY_PROFILE }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw new Error(`Profil yüklenemedi: ${error.message}`)
  const profile: LocalProfile = { ...EMPTY_PROFILE }
  if (!data) return profile
  const r = data as Record<string, unknown>
  lenient(profile, 'displayName', r.display_name ?? '')
  lenient(profile, 'age', r.age == null ? '' : String(r.age))
  lenient(profile, 'heightCm', r.height_cm == null ? '' : String(r.height_cm))
  lenient(profile, 'weightKg', r.weight_kg == null ? '' : String(r.weight_kg))
  lenient(profile, 'sex', r.sex ?? null)
  lenient(profile, 'goal', r.goal ?? [])
  lenient(profile, 'medications', r.medications ?? '')
  lenient(profile, 'conditions', r.conditions ?? '')
  lenient(profile, 'allergies', r.allergies ?? '')
  lenient(profile, 'onboardingComplete', r.onboarding_complete === true)
  lenient(profile, 'aiProfileConsent', r.ai_profile_consent === true)
  profile.anatomyVariant = profile.sex
  return profile
}

/** Doğrular, sonra Supabase'e upsert eder; hata fırlatır (yerel yolla aynı sözleşme). */
export async function saveProfileAsync(partial: Partial<LocalProfile>): Promise<void> {
  if (!isRemoteMode() || !supabase) return saveProfile(partial)
  const merged = mergeProfile(await loadProfileAsync(), partial)
  const userId = await currentUserId()
  if (!userId) throw new Error('Profili kaydetmek için giriş yapmalısın.')
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: merged.displayName,
    age: merged.age === '' ? null : Number(merged.age),
    height_cm: merged.heightCm === '' ? null : Number(merged.heightCm),
    weight_kg: merged.weightKg === '' ? null : Number(merged.weightKg),
    sex: merged.sex,
    goal: JSON.stringify(merged.goal), // TEXT sütunu: JSON dizisi
    medications: merged.medications,
    conditions: merged.conditions,
    allergies: merged.allergies,
    onboarding_complete: merged.onboardingComplete,
    ai_profile_consent: merged.aiProfileConsent,
  })
  if (error) throw new Error(error.message)
  notify()
}

/**
 * Oturum açmış kullanıcının profiles satırı yoksa oluşturur (idempotent).
 * Hata fırlatmaz: console.warn ile yutar; başarıda true döner.
 */
export async function ensureProfile(fallbackName?: string): Promise<boolean> {
  if (!isRemoteMode() || !supabase) return false
  try {
    const userId = await currentUserId()
    if (!userId) return false
    const found = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
    if (found.error) { console.warn('[profile] ensureProfile select:', found.error.message); return false }
    if (found.data) return true
    let name = fallbackName
    if (!name) {
      const { data } = await supabase.auth.getUser()
      name = (data.user?.email ?? '').split('@')[0]
    }
    const { error } = await supabase.from('profiles').insert({
      id: userId, display_name: (name ?? '').slice(0, NAME_MAX), onboarding_complete: false,
    })
    if (error) { console.warn('[profile] ensureProfile insert:', error.message); return false }
    return true
  } catch (err) {
    console.warn('[profile] ensureProfile:', err)
    return false
  }
}
