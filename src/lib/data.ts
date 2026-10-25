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
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { DosePlan } from './dosage'
import { loadProfile } from './profile'
import { healthProfileFrom } from './health-profile'
import { readRaw, writeRaw, removeRaw, onStorageKey, storageState, type StorageMode } from './local-store'

export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function isRealUrl(u: string | undefined): boolean {
  return Boolean(u && /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u) && !u.includes('your-project'))
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Supabase yalnızca gerçek yapılandırılmışsa oluşturulur; demo modda null döner */
export const supabase: SupabaseClient | null = isRealUrl(url) && anon
  ? createClient(url as string, anon, { auth: { persistSession: true } })
  : null

export interface ClientSupplement {
  id: string
  name: string
  dosage: string
  frequency: string
  time_of_day: string
  notes: string
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

export async function listSupplements(): Promise<ClientSupplement[]> {
  if (IS_DEMO || !supabase) return readDemoRows().map(row => ({ ...row }))
  const { data, error } = await supabase.from('supplements')
    .select('*').order('created_at', { ascending: false })
  if (error) {
    // Eskiden [] dönüyordu: gerçek hata "boş envanter" gibi görünüyordu.
    console.warn('[data] supabase list:', error.message)
    throw new Error(`Takviyeler yüklenemedi: ${error.message}`)
  }
  return (data ?? []) as ClientSupplement[]
}

export async function addSupplement(input: Omit<ClientSupplement, 'id'>): Promise<boolean> {
  if (IS_DEMO || !supabase) {
    if (typeof window === 'undefined') return false
    const row: ClientSupplement = { ...input, id: nextId() }
    return commitDemo([row, ...readDemoRows()])
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { dose_plan, ...row } = input
  void dose_plan // Structured plan retained in demo; live schema requires a migration.
  const { error } = await supabase.from('supplements').insert({ ...row, user_id: user?.id ?? null })
  if (error) {
    console.warn('[data] supabase add:', error.message)
    return false
  }
  return true
}

export async function removeSupplement(id: string): Promise<boolean> {
  if (IS_DEMO || !supabase) {
    if (typeof window === 'undefined') return false
    const current = readDemoRows()
    const next = current.filter(s => s.id !== id)
    if (next.length === current.length) return true
    return commitDemo(next)
  }
  const { error } = await supabase.from('supplements').delete().eq('id', id)
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
  const profile = healthProfileFrom(loadProfile())
  const observations = profile ? await (await import('./wellness')).getWellnessContext() : undefined
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, supplements, profile, observations }),
  })
  const data = (await res.json().catch(() => null)) as
    { ok?: boolean; content?: string; model?: string; note?: string; error?: string } | null
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'AI yanıtı alınamadı')
  }
  return { content: data.content as string, model: data.model, note: data.note }
}
