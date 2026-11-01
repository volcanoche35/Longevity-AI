/**
 * Günlük etki günlüğü — kullanıcının KENDİ özbildirimleri (enerji, uyku, sindirim, not).
 *
 * Kurallar:
 *  - Özbildirim sağlık sonucu, tanı veya nedensellik kanıtı DEĞİLDİR; yalnız "hissedilen" durum.
 *  - Veri cihazda (localStorage) tutulur. Sunucuda okuma boş döner, sahte kayıt üretilmez.
 *  - Her kayıt en az bir alan içerir; 1..5 dışı puan, gelecek tarih ve 500+ karakter not reddedilir.
 *  - Aynı gün ikinci kayıt o günü GÜNCELLER (kopya satır oluşmaz).
 *  - Grafik serileri yalnız gerçek kayıtlardan üretilir; ardışık olmayan günler arasında
 *    çizgi çizilmez (boşluk trend gibi görünmesin).
 */
import { onStorageKey, readRaw, writeRaw, removeRaw } from './local-store'
import { DAY_MARKS_KEY, localDayKey, readMarks } from './daymarks'
import { listSupplements } from './data'
import { supabase, isRemoteMode, currentUserId } from './supabase'

/** Günlük özbildirim kayıtlarının cihazdaki anahtarı. */
export const WELLNESS_KEY = 'biotrack.wellness.v1'

export const NOTE_MAX = 500
export const SCORE_MIN = 1
export const SCORE_MAX = 5
/** Özet için gereken en az kayıt günü (7 ve 14 günlük pencerelerde de geçerli). */
export const MIN_SUMMARY_DAYS = 7

export const METRICS = ['energy', 'sleep', 'digestion'] as const
export type WellnessMetric = (typeof METRICS)[number]

export interface WellnessEntry {
  /** YYYY-MM-DD (yerel takvim günü) */
  day: string
  energy?: number
  sleep?: number
  digestion?: number
  note?: string
}

export type SaveWellnessResult =
  | { ok: true; entry: WellnessEntry; created: boolean }
  | { ok: false; errors: string[] }

export type MutationResult = { ok: true } | { ok: false; error: string }

export interface WellnessSummary {
  windowDays: number
  /** Pencerede kayıtlı gün sayısı */
  entryCount: number
  minDays: number
  /** entryCount >= minDays */
  sufficient: boolean
  /** Yalnız BİLDİRİLEN günlerden ortalama (1 ondalık) */
  averages: Partial<Record<WellnessMetric, number>>
  /** Ortalamaya giren gün sayısı (metrik başına) */
  counts: Partial<Record<WellnessMetric, number>>
  /** Pencerede kullanım işareti olan gün sayısı */
  usageDays: number
}

export interface ChartPoint {
  day: string
  value: number
  /** Pencerenin ilk gününden itibaren takvim indeksi */
  index: number
}

export interface ChartModel {
  start: string
  windowDays: number
  metric: WellnessMetric
  points: ChartPoint[]
  /** Ardışık gün grupları; tek günler tek elemanlı dizi olur (nokta olarak çizilir) */
  segments: ChartPoint[][]
  /** Kullanım işareti olan günlerin takvim indeksleri */
  usage: number[]
  labels: { index: number; text: string }[]
}

export interface WellnessContext {
  /** Dönen kayıt günü sayısı (pencere uzunluğu değil) */
  days: number
  observations: {
    day: string
    energy?: number
    sleep?: number
    digestion?: number
    note?: string
    supplementNames: string[]
  }[]
}

/* ── takvim yardımcıları ─────────────────────────────────────────── */

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (n: number) => String(n).padStart(2, '0')

/** Gerçek bir takvim günü mü (2026-02-30 geçersiz)? */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = DAY_RE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const probe = new Date(year, month - 1, day)
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day
}

/** Yerel takvimde bugün — daymarks ile aynı gün sınırı. */
export function todayKey(now = new Date()): string {
  return localDayKey(now)
}

/** Gün anahtarına gün ekler (UTC aritmetiği; yaz saati kayması yok). */
export function addDays(day: string, delta: number): string {
  const stamp = toUtcStamp(day) + delta * 86_400_000
  const next = new Date(stamp)
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

function toUtcStamp(day: string): number {
  const [year, month, date] = day.split('-').map(Number)
  return Date.UTC(year, month - 1, date)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcStamp(to) - toUtcStamp(from)) / 86_400_000)
}

/* ── doğrulama (deterministik; now dışarıdan verilir) ────────────── */

export interface ScoreParse {
  value?: number
  error?: string
}

/** 1..5 tam sayı; boş değer "bildirilmedi" sayılır. */
export function parseScore(raw: unknown): ScoreParse {
  if (raw === undefined || raw === null || raw === '') return { value: undefined }
  const numeric = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim().replace(',', '.')) : Number.NaN
  if (!Number.isFinite(numeric)) return { error: 'Puan 1 ile 5 arasında bir sayı olmalı.' }
  if (!Number.isInteger(numeric) || numeric < SCORE_MIN || numeric > SCORE_MAX) {
    return { error: 'Puan 1 ile 5 arasında tam sayı olmalı.' }
  }
  return { value: numeric }
}

function parseNote(raw: unknown): { value?: string; error?: string } {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'string') return { error: 'Not metin olmalı.' }
  const trimmed = raw.trim()
  if (trimmed.length > NOTE_MAX) return { error: `Not en fazla ${NOTE_MAX} karakter olabilir.` }
  return trimmed ? { value: trimmed } : {}
}

export interface ValidationResult {
  ok: boolean
  entry?: WellnessEntry
  errors: string[]
}

/**
 * Kayıt girdisini doğrular. Saf fonksiyon: `now` verilmezse sistem saati kullanılır,
 * testlerde sabit tarih geçilir.
 */
export function validateWellnessEntry(input: unknown, now = new Date()): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['Kayıt bir nesne olmalı.'] }
  }
  const row = input as Record<string, unknown>
  const errors: string[] = []

  const day = row.day
  if (!isDayKey(day)) {
    errors.push('Tarih GG biçiminde geçerli bir gün olmalı (YYYY-AA-GG).')
  } else if (day > todayKey(now)) {
    errors.push('Gelecek bir güne kayıt eklenemez.')
  }

  const scores: Partial<Record<WellnessMetric, number>> = {}
  for (const metric of METRICS) {
    const parsed = parseScore(row[metric])
    if (parsed.error) errors.push(`${metricLabel(metric)}: ${parsed.error}`)
    else if (parsed.value !== undefined) scores[metric] = parsed.value
  }

  const note = parseNote(row.note)
  if (note.error) errors.push(note.error)

  const hasAny = METRICS.some(metric => scores[metric] !== undefined) || note.value !== undefined
  if (!hasAny) errors.push('En az bir alan gir: enerji, uyku, sindirim veya not.')

  if (errors.length > 0 || !isDayKey(day)) return { ok: false, errors }

  const entry: WellnessEntry = { day }
  for (const metric of METRICS) {
    const value = scores[metric]
    if (value !== undefined) entry[metric] = value
  }
  if (note.value !== undefined) entry.note = note.value
  return { ok: true, entry, errors: [] }
}

function metricLabel(metric: WellnessMetric): string {
  if (metric === 'energy') return 'Enerji'
  if (metric === 'sleep') return 'Uyku'
  return 'Sindirim'
}

/* ── depo ────────────────────────────────────────────────────────── */

interface StoredFile {
  v: 1
  entries: Record<string, Omit<WellnessEntry, 'day'>>
}

const EMPTY_ENTRIES: WellnessEntry[] = []

function parseStored(raw: string | null): WellnessEntry[] {
  if (!raw) return EMPTY_ENTRIES
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return EMPTY_ENTRIES
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY_ENTRIES
  const box = parsed as Record<string, unknown>
  // v1 dosyası {v, entries}; eski/düz gün haritası da okunur.
  const candidate =
    box.entries && typeof box.entries === 'object' && !Array.isArray(box.entries)
      ? (box.entries as Record<string, unknown>)
      : box

  const entries: WellnessEntry[] = []
  for (const [day, value] of Object.entries(candidate)) {
    if (!isDayKey(day) || !value || typeof value !== 'object' || Array.isArray(value)) continue
    const row = value as Record<string, unknown>
    const entry: WellnessEntry = { day }
    for (const metric of METRICS) {
      const parsedScore = parseScore(row[metric])
      if (!parsedScore.error && parsedScore.value !== undefined) entry[metric] = parsedScore.value
    }
    const note = parseNote(row.note)
    if (!note.error && note.value !== undefined) entry.note = note.value
    if (METRICS.some(metric => entry[metric] !== undefined) || entry.note !== undefined) entries.push(entry)
  }
  entries.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
  return entries.length === 0 ? EMPTY_ENTRIES : entries
}

function readStored(): { entries: WellnessEntry[]; map: Record<string, Omit<WellnessEntry, 'day'>> } {
  const { raw } = readRaw(WELLNESS_KEY)
  const entries = parseStored(raw)
  const map: Record<string, Omit<WellnessEntry, 'day'>> = {}
  for (const entry of entries) {
    const { day, ...rest } = entry
    map[day] = rest
  }
  return { entries, map }
}

/** Cihazdaki kayıtlar, tarihe göre artan sırada. Bozuk JSON çökme yapmaz. */
export function readWellnessEntries(): WellnessEntry[] {
  return readStored().entries
}

function writeStored(map: Record<string, Omit<WellnessEntry, 'day'>>): MutationResult {
  const file: StoredFile = { v: 1, entries: map }
  try {
    writeRaw(WELLNESS_KEY, JSON.stringify(file))
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Cihaz depolamasına yazılamadı.' }
  }
}

/* ── abonelik (useSyncExternalStore için) ────────────────────────── */

let cache: WellnessEntry[] | null = null
const listeners = new Set<() => void>()

function invalidate(): void {
  cache = null
  listeners.forEach(listener => listener())
}

export function subscribeWellness(callback: () => void): () => void {
  listeners.add(callback)
  const off = onStorageKey(WELLNESS_KEY, () => {
    cache = null
    callback()
  })
  return () => {
    listeners.delete(callback)
    off()
  }
}

/** Kararlı referans döner: veri değişmedikçe aynı dizi. */
export function getWellnessSnapshot(): WellnessEntry[] {
  if (cache === null) cache = readStored().entries
  return cache
}

/** Sunucuda boş — hidrasyon uyuşmazlığı ve sahte veri yok. */
export function getWellnessServerSnapshot(): WellnessEntry[] {
  return EMPTY_ENTRIES
}

/* ── yazma / silme ───────────────────────────────────────────────── */

/** Aynı gün kaydı günceller; doğrulama hatasında yazmaz. */
export function saveWellness(input: unknown, now = new Date()): SaveWellnessResult {
  const validation = validateWellnessEntry(input, now)
  if (!validation.ok || !validation.entry) return { ok: false, errors: validation.errors }
  const entry = validation.entry
  const { map } = readStored()
  const created = !(entry.day in map)
  const { day, ...rest } = entry
  map[day] = rest
  const written = writeStored(map)
  if (!written.ok) return { ok: false, errors: [written.error] }
  invalidate()
  return { ok: true, entry, created }
}

/** Tek günü siler; diğer günlere dokunmaz. Kullanıcı onayı arayüzde alınır. */
export function deleteWellnessDay(day: string): MutationResult {
  if (!isDayKey(day)) return { ok: false, error: 'Geçersiz gün.' }
  const { map } = readStored()
  if (!(day in map)) return { ok: true }
  delete map[day]
  const written = writeStored(map)
  if (!written.ok) return written
  invalidate()
  return { ok: true }
}

/** Tüm günlüğü siler. Yalnız kullanıcı açıkça onaylayınca çağrılmalı. */
export function clearWellness(): MutationResult {
  try {
    removeRaw(WELLNESS_KEY)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Günlük silinemedi.' }
  }
  invalidate()
  return { ok: true }
}

/* ── özet ve grafik ──────────────────────────────────────────────── */

const round1 = (value: number) => Math.round(value * 10) / 10

export function summarizeWellness(
  entries: WellnessEntry[],
  marks: Record<string, string[]>,
  windowDays: number,
  today: string,
): WellnessSummary {
  const empty: WellnessSummary = {
    windowDays,
    entryCount: 0,
    minDays: MIN_SUMMARY_DAYS,
    sufficient: false,
    averages: {},
    counts: {},
    usageDays: 0,
  }
  if (!isDayKey(today) || !Number.isFinite(windowDays) || windowDays < 1) return empty
  const start = addDays(today, -(windowDays - 1))
  const inWindow = entries.filter(entry => entry.day >= start && entry.day <= today)

  const sums: Partial<Record<WellnessMetric, number>> = {}
  const counts: Partial<Record<WellnessMetric, number>> = {}
  for (const metric of METRICS) {
    for (const entry of inWindow) {
      const value = entry[metric]
      if (value === undefined) continue
      sums[metric] = (sums[metric] ?? 0) + value
      counts[metric] = (counts[metric] ?? 0) + 1
    }
  }
  const averages: Partial<Record<WellnessMetric, number>> = {}
  for (const metric of METRICS) {
    const count = counts[metric] ?? 0
    if (count > 0) averages[metric] = round1((sums[metric] ?? 0) / count)
  }

  let usageDays = 0
  for (let offset = 0; offset < windowDays; offset += 1) {
    const day = addDays(start, offset)
    if ((marks[day] ?? []).length > 0) usageDays += 1
  }

  return {
    windowDays,
    entryCount: inWindow.length,
    minDays: MIN_SUMMARY_DAYS,
    sufficient: inWindow.length >= MIN_SUMMARY_DAYS,
    averages,
    counts,
    usageDays,
  }
}

const shortDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`

/** Bir metrik için takvim ölçekli grafik modeli; boşluklar segmentleri ayırır. */
export function buildChart(
  entries: WellnessEntry[],
  metric: WellnessMetric,
  windowDays: number,
  today: string,
  marks: Record<string, string[]> = readMarks(),
): ChartModel {
  const safeDays = Number.isFinite(windowDays) && windowDays > 1 ? Math.floor(windowDays) : 7
  const valid = isDayKey(today)
  const start = valid ? addDays(today, -(safeDays - 1)) : today
  const points: ChartPoint[] = valid
    ? entries
        .filter(entry => entry.day >= start && entry.day <= today && entry[metric] !== undefined)
        .map(entry => ({
          day: entry.day,
          value: entry[metric] as number,
          index: daysBetween(start, entry.day),
        }))
        .sort((a, b) => a.index - b.index)
    : []

  const segments: ChartPoint[][] = []
  for (const point of points) {
    const last = segments[segments.length - 1]
    const prev = last?.[last.length - 1]
    if (last && prev && point.index - prev.index === 1) last.push(point)
    else segments.push([point])
  }

  const usage: number[] = []
  if (valid) {
    for (let index = 0; index < safeDays; index += 1) {
      const day = addDays(start, index)
      if ((marks[day] ?? []).length > 0) usage.push(index)
    }
  }

  const lastIndex = safeDays - 1
  const labels = valid
    ? [
        { index: 0, text: shortDay(start) },
        { index: Math.floor(lastIndex / 2), text: shortDay(addDays(start, Math.floor(lastIndex / 2))) },
        { index: lastIndex, text: shortDay(today) },
      ].filter((label, i, all) => all.findIndex(item => item.index === label.index) === i)
    : []

  return { start, windowDays: safeDays, metric, points, segments, usage, labels }
}

/* ── üst ajan (AI) için dışa aktarım ─────────────────────────────── */

/**
 * Son 14 KAYITLI günü, o günlerin kullanım işaretlerinin envanter adlarıyla döndürür.
 * Ham kimlik, e-posta, profil veya takviye id'si içermez. Paylaşım izni çağıran taraftadır.
 */
export async function getWellnessContext(): Promise<WellnessContext> {
  const recent = readWellnessEntries().slice(-14)
  let names = new Map<string, string>()
  try {
    const rows = await listSupplements()
    names = new Map(rows.map(row => [row.id, row.name]))
  } catch {
    names = new Map()
  }
  const marks = readMarks()
  const observations = recent.map(entry => {
    const supplementNames: string[] = []
    for (const id of marks[entry.day] ?? []) {
      const name = names.get(id)
      if (name && !supplementNames.includes(name)) supplementNames.push(name)
    }
    const observation: WellnessContext['observations'][number] = { day: entry.day, supplementNames }
    if (entry.energy !== undefined) observation.energy = entry.energy
    if (entry.sleep !== undefined) observation.sleep = entry.sleep
    if (entry.digestion !== undefined) observation.digestion = entry.digestion
    if (entry.note !== undefined) observation.note = entry.note
    return observation
  })
  return { days: observations.length, observations }
}

/** Panelin işaret günlerini okuması için (salt okuma). */
export function readUsageMarks(): Record<string, string[]> {
  return readMarks()
}

export { DAY_MARKS_KEY }

/* ── Supabase dalı (async) ───────────────────────────────────────────
 * isRemoteMode() false iken (demo) bu fonksiyonlar yerel senkron API'ye düşer.
 * Tablo: wellness_entries (user_id, day UNIQUE) — bkz. supabase-schema-v2.sql
 */

export async function loadWellnessAsync(): Promise<WellnessEntry[]> {
  if (!isRemoteMode() || !supabase) return readWellnessEntries()
  const { data, error } = await supabase.from('wellness_entries')
    .select('day, energy, sleep, digestion, note').order('day', { ascending: true })
  if (error) throw new Error(`Günlük yüklenemedi: ${error.message}`)
  const out: WellnessEntry[] = []
  for (const row of data ?? []) {
    const entry: WellnessEntry = { day: row.day as string }
    for (const metric of METRICS) if (typeof row[metric] === 'number') entry[metric] = row[metric] as number
    if (typeof row.note === 'string' && row.note) entry.note = row.note
    out.push(entry)
  }
  return out
}

export async function saveWellnessAsync(input: unknown, now = new Date()): Promise<SaveWellnessResult> {
  if (!isRemoteMode() || !supabase) return saveWellness(input, now)
  const validation = validateWellnessEntry(input, now)
  if (!validation.ok || !validation.entry) return { ok: false, errors: validation.errors }
  const userId = await currentUserId()
  if (!userId) return { ok: false, errors: ['Kaydetmek için giriş yapmalısın.'] }
  const entry = validation.entry
  const existing = await supabase.from('wellness_entries').select('id').eq('user_id', userId).eq('day', entry.day).maybeSingle()
  const { error } = await supabase.from('wellness_entries').upsert({
    user_id: userId, day: entry.day,
    energy: entry.energy ?? null, sleep: entry.sleep ?? null,
    digestion: entry.digestion ?? null, note: entry.note ?? null,
  }, { onConflict: 'user_id,day' })
  if (error) return { ok: false, errors: [error.message] }
  return { ok: true, entry, created: !existing.data }
}

export async function deleteWellnessDayAsync(day: string): Promise<MutationResult> {
  if (!isRemoteMode() || !supabase) return deleteWellnessDay(day)
  if (!isDayKey(day)) return { ok: false, error: 'Geçersiz gün.' }
  const { error } = await supabase.from('wellness_entries').delete().eq('day', day)
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function clearWellnessAsync(): Promise<MutationResult> {
  if (!isRemoteMode() || !supabase) return clearWellness()
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'Giriş yapmalısın.' }
  const { error } = await supabase.from('wellness_entries').delete().eq('user_id', userId)
  return error ? { ok: false, error: error.message } : { ok: true }
}
