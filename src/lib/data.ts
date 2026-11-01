/**
 * İstemci veri katmanı — demo modda bu cihazda (localStorage), canlı modda Supabase.
 *
 * Demo kuralları:
 *  - İlk açılışta envanter BOŞTUR. Örnek takviyeler gerçek kullanıcı kaydı gibi
 *    sessizce eklenmez.
 *  - Kayıtlar aynı tarayıcıda yenilemeden sonra korunur (localStorage).
 *  - Depolama yazamıyorsa add/remove `false` döner; başarılı gibi yapılmaz.
 *  - Bozuk JSON çökme yapmaz: boş envanter + açık hata durumu.
 *  - Sağlık verisi cihazda kalır; şifreleme veya bulut yedeği iddiası yoktur.
 */
import { supabase, isDemoMode, isRemoteMode } from './supabase'
import type { DosePlan } from './dosage'
import { loadProfileAsync } from './profile'
import { healthProfileFrom } from './health-profile'
import { normalizeSchedule } from './schedule'
import { readRaw, writeRaw, removeRaw, onStorageKey, storageState, type StorageMode } from './local-store'

export const IS_DEMO = isDemoMode()
export { supabase }

export interface ClientSupplement {
  id: string
  name: string
  dosage: string
  frequency: string
  time_of_day: string
  notes: string
  /** Kullanım saatleri, "HH:MM". Boş = saat planı yok. */
  schedule: string[]
  dose_plan?: DosePlan
}

/** Demo deposunun cihazdaki anahtarı — sürüm çakışmasını önlemek için v1. */
export const DEMO_STORAGE_KEY = 'biotrack.demo.supplements.v1'

/**
 * Demo deposu: örnek ürün YOK. Kullanıcı eklemedikçe envanter boştur.
 * (Eski sürüm burada dört sahte takviye tohumluyordu; kullanıcıya ait sanılıyordu.)
 */
let demoRows: ClientSupplement[] | null = null
let demoError: string | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export function onDemoChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/** Depolamanın gerçekten kalıcı mı yoksa yalnız bellek mi olduğunu bildirir. */
export function getDemoStorageInfo(): { mode: StorageMode; error: string | null } {
  const { mode, error } = storageState()
  return { mode, error: error ?? demoError }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Depodan gelen her satır doğrulanır; uydurma alan eklenmez, bozuk satır atılır. */
function normalizeRow(value: unknown): ClientSupplement | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (!id || !name) return null
  const row2: ClientSupplement = {
    id,
    name,
    dosage: text(row.dosage),
    frequency: text(row.frequency),
    time_of_day: text(row.time_of_day),
    notes: text(row.notes),
    schedule: normalizeSchedule(row.schedule),
  }
  const plan = row.dose_plan
  if (plan && typeof plan === 'object' && Array.isArray((plan as DosePlan).parts)) {
    row2.dose_plan = plan as DosePlan
  }
  return row2
}

/** Yalnız istemcide okunur; SSR'de boş liste döner ve diske yazılmaz. */
function readDemoRows(): ClientSupplement[] {
  if (typeof window === 'undefined') return []
  if (demoRows !== null) return demoRows
  const { raw, error } = readRaw(DEMO_STORAGE_KEY)
  demoError = error
  if (raw === null) {
    demoRows = []
    return demoRows
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('beklenen liste değil')
    demoRows = parsed.map(normalizeRow).filter((r): r is ClientSupplement => r !== null)
    demoError = null
  } catch {
    demoRows = []
    demoError = 'Kayıtlı demo verisi okunamadı; envanter boş başlatıldı.'
  }
  return demoRows
}

/**
 * Yazma önce depoya, sonra belleğe uygulanır. Depo reddederse bellek değişmez,
 * yani arayüz "kaydedildi" gösteremez. false = başarısız.
 */
function commitDemo(next: ClientSupplement[]): boolean {
  try {
    writeRaw(DEMO_STORAGE_KEY, JSON.stringify(next))
  } catch (err) {
    demoError = err instanceof Error ? err.message : 'Cihaz depolamasına yazılamadı'
    emit()
    return false
  }
  demoRows = next
  demoError = null
  emit()
  return true
}

// Diğer sekmelerdeki değişiklikleri yakala (storage olayı yazan sekmede tetiklenmez).
if (typeof window !== 'undefined') {
  onStorageKey(DEMO_STORAGE_KEY, () => {
    demoRows = null
    demoError = null
    emit()
  })
}

function nextId(): string {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/* ── Supabase eşlemesi: user_supplements (eski şema sütunları korunur) ── */

interface SupplementRow {
  id: number | string
  supplement_name: string
  daily_dosage: number | string | null
  time_of_day: string | null
  notes: string | null
  frequency: string | null
  dose_plan: DosePlan | null
  schedule?: unknown
}

function fromRow(row: SupplementRow): ClientSupplement {
  const plan = row.dose_plan && Array.isArray(row.dose_plan.parts) ? row.dose_plan : undefined
  const daily = row.daily_dosage
  const out: ClientSupplement = {
    id: String(row.id),
    name: row.supplement_name,
    dosage: daily !== null && daily !== undefined && daily !== '' ? `${daily} mg` : '',
    frequency: text(row.frequency),
    time_of_day: text(row.time_of_day),
    notes: text(row.notes),
    schedule: normalizeSchedule(row.schedule),
  }
  if (plan) out.dose_plan = plan
  return out
}

/** daily_dosage sayısaldır; yalnız net bir sayı varsa doldurulur (mg varsayımı yok: plan birimi mg ise). */
function dailyDosageOf(input: Omit<ClientSupplement, 'id'>): number | null {
  const plan = input.dose_plan
  if (plan && plan.dailyUnit === 'mg' && plan.dailyAmount) {
    const n = Number(String(plan.dailyAmount).replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*mg\s*$/i.exec(input.dosage)
  return m ? Number(m[1].replace(',', '.')) : null
}

export async function listSupplements(): Promise<ClientSupplement[]> {
  if (!isRemoteMode() || !supabase) return readDemoRows().map(row => ({ ...row }))
  const { data, error } = await supabase.from('user_supplements')
    .select('id, supplement_name, daily_dosage, time_of_day, notes, frequency, dose_plan, schedule, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[data] supabase list:', error.message)
    throw new Error(`Takviyeler yüklenemedi: ${error.message}`)
  }
  return ((data ?? []) as SupplementRow[]).map(fromRow)
}

export async function addSupplement(input: Omit<ClientSupplement, 'id'>): Promise<boolean> {
  if (!isRemoteMode() || !supabase) {
    if (typeof window === 'undefined') return false
    const row: ClientSupplement = { ...input, schedule: normalizeSchedule(input.schedule), id: nextId() }
    return commitDemo([row, ...readDemoRows()])
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase.from('user_supplements').insert({
    user_id: user.id,
    supplement_name: input.name,
    daily_dosage: dailyDosageOf(input),
    time_of_day: input.time_of_day,
    notes: input.notes,
    frequency: input.frequency,
    dose_plan: input.dose_plan ?? null,
    schedule: normalizeSchedule(input.schedule),
    is_active: true,
  })
  if (error) {
    console.warn('[data] supabase add:', error.message)
    return false
  }
  return true
}

/** Kısmi güncelleme — yalnız verilen alanlar değişir. false = başarısız (yazılmış gibi davranılmaz). */
export async function updateSupplement(id: string, patch: Partial<Omit<ClientSupplement, 'id'>>): Promise<boolean> {
  const clean: Partial<Omit<ClientSupplement, 'id'>> = { ...patch }
  if (clean.schedule) clean.schedule = normalizeSchedule(clean.schedule)
  if (!isRemoteMode() || !supabase) {
    if (typeof window === 'undefined') return false
    const current = readDemoRows()
    if (!current.some(s => s.id === id)) return false
    return commitDemo(current.map(s => (s.id === id ? { ...s, ...clean } : s)))
  }
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId)) return false
  const row: Record<string, unknown> = {}
  if (clean.name !== undefined) row.supplement_name = clean.name
  if (clean.time_of_day !== undefined) row.time_of_day = clean.time_of_day
  if (clean.notes !== undefined) row.notes = clean.notes
  if (clean.frequency !== undefined) row.frequency = clean.frequency
  if (clean.schedule !== undefined) row.schedule = clean.schedule
  if (clean.dose_plan !== undefined) row.dose_plan = clean.dose_plan
  if (clean.dose_plan !== undefined || clean.dosage !== undefined) {
    row.daily_dosage = dailyDosageOf({
      name: clean.name ?? '', dosage: clean.dosage ?? '', frequency: clean.frequency ?? '',
      time_of_day: clean.time_of_day ?? '', notes: clean.notes ?? '', schedule: clean.schedule ?? [],
      dose_plan: clean.dose_plan,
    })
  }
  if (Object.keys(row).length === 0) return true
  const { error } = await supabase.from('user_supplements').update(row).eq('id', numericId)
  if (error) {
    console.warn('[data] supabase update:', error.message)
    return false
  }
  return true
}

export async function removeSupplement(id: string): Promise<boolean> {
  if (!isRemoteMode() || !supabase) {
    if (typeof window === 'undefined') return false
    const current = readDemoRows()
    const next = current.filter(s => s.id !== id)
    if (next.length === current.length) return true
    return commitDemo(next)
  }
  const numericId = Number(id)
  if (!Number.isSafeInteger(numericId)) return false
  const { error } = await supabase.from('user_supplements').delete().eq('id', numericId)
  return !error
}

/**
 * "Bu cihazdaki verilerimi sil" — yalnız kullanıcı açıkça onaylayınca çağrılır.
 * Başarısızsa false döner (silinmiş gibi davranmaz).
 */
export function clearLocalDemoData(): boolean {
  try {
    removeRaw(DEMO_STORAGE_KEY)
  } catch (err) {
    demoError = err instanceof Error ? err.message : 'Demo verisi silinemedi'
    emit()
    return false
  }
  demoRows = []
  demoError = null
  emit()
  return true
}

export interface AssistantReply { content: string; model?: string; note?: string }

export async function askAssistant(
  messages: { role: 'user' | 'assistant'; content: string }[],
  supplements: string[],
): Promise<AssistantReply> {
  const profile = healthProfileFrom(await loadProfileAsync())
  const observations = profile ? await (await import('./wellness')).getWellnessContext() : undefined
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    } catch {}
  }
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, supplements, profile, observations }),
  })
  const data = (await res.json().catch(() => null)) as
    { ok?: boolean; content?: string; model?: string; note?: string; error?: string } | null
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'AI yanıtı alınamadı')
  }
  return { content: data.content as string, model: data.model, note: data.note }
}

export interface VerifiedIngredient {
  name: string
  category: string
  grade: 'A' | 'B' | 'C'
  typicalDose: string
  dailyRef: string
}

/** Harici ürünün etken maddesini AI ile doğrular (katalog yapısına normalleştirir). */
export async function verifyIngredient(
  productName: string,
  ingredientText: string,
): Promise<VerifiedIngredient[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    } catch {}
  }
  const res = await fetch('/api/ai/ingredient', {
    method: 'POST',
    headers,
    body: JSON.stringify({ productName, ingredientText }),
  })
  const data = (await res.json().catch(() => null)) as
    { ok?: boolean; items?: VerifiedIngredient[]; error?: string } | null
  if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
    throw new Error(data?.error || 'Etken madde doğrulanamadı')
  }
  return data.items
}
