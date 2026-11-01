/**
 * Günlük hatırlatmalar — kullanıcının kendi seçtiği saatlerle, yalnızca bu cihazda.
 *
 * Tasarım kuralları:
 *  - Modül hiçbir hatırlatmayı kendiliğinden oluşturmaz; ilk açılışta depo boştur.
 *  - Saat, başlık ve tür kullanıcı tarafından onaylanır. Doz veya tıbbi zaman
 *    önerisi üretilmez; "D vitamini / magnezyum için en iyi saat" iddiası yoktur.
 *  - Hatırlatma durumu yerel güne göre hesaplanır. "Aldım" işaretleri gün
 *    anahtarıyla saklanır; ertesi gün aynı hatırlatma yeniden zamanı gelmiş olur.
 *  - Bozuk depo çökme yapmaz: okuma boş/geçerli alt küme döner, yazma hataları
 *    çağırana fırlatılır (başarılıymış gibi davranılmaz).
 *  - Uygulama kapalıyken push/bildirim iddiası yoktur; due hesapları sadece
 *    sayfa açıkken çalışan arayüz tarafından kullanılır.
 */
import { readRaw, writeRaw } from './local-store'
import { supabase, isRemoteMode, currentUserId } from './supabase'

export const REMINDERS_KEY = 'biotrack.reminders.v1'
export const REMINDERS_VERSION = 1
export const REMINDER_TITLE_MAX = 100
export const REMINDER_NOTE_MAX = 300
export const SNOOZE_MINUTES = 10
export const MAX_REMINDERS = 100
const ACK_DAYS_KEPT = 14

export const REMINDER_KINDS = ['supplement', 'walk', 'general'] as const
export type ReminderKind = (typeof REMINDER_KINDS)[number]

export const KIND_LABELS: Record<ReminderKind, string> = {
  supplement: 'Takviye',
  walk: 'Yürüyüş',
  general: 'Genel',
}

export type ReminderStatus = 'due' | 'snoozed' | 'done' | 'upcoming'

export interface Reminder {
  id: string
  title: string
  /** Yerel saat, SS:DD */
  time: string
  kind: ReminderKind
  /** Kullanıcı notu; tıbbi doz alanı değildir. */
  note: string
  createdAt: string
  /** ISO; yalnızca kullanıcı ertelediğinde dolar. */
  snoozeUntil: string | null
}

export interface ReminderInput {
  title: string
  time: string
  kind: ReminderKind
  note?: string
}

export interface ReminderSnooze {
  /** Ertelenen hatırlatmanın yeniden görüneceği an (ISO). */
  until: string
  /** Ertelenen anın yerel gün anahtarı. */
  day: string
  minutes: number
}

export interface ReminderPlanEntry {
  id: string
  title: string
  time: string
  kind: ReminderKind
  status: ReminderStatus
}

interface ReminderState {
  items: Reminder[]
  acks: Record<string, string[]>
}

/** Yerel takvim günü: 2026-10-25. Sunucu saat dilimine göre kaydırma yapılmaz. */
export function reminderDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function isReminderKind(value: unknown): value is ReminderKind {
  return typeof value === 'string' && (REMINDER_KINDS as readonly string[]).includes(value)
}

/** Verilen günün yerel saatine karşılık gelen Date; geçersiz saatte null. */
export function scheduledAt(day: Date, time: string): Date | null {
  if (!isValidTime(time)) return null
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0)
}

export function validateReminderInput(input: ReminderInput): string | null {
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) return 'Başlık gerekli.'
  if (title.length > REMINDER_TITLE_MAX) return `Başlık en fazla ${REMINDER_TITLE_MAX} karakter olabilir.`
  if (!isValidTime(input.time)) return 'Saat SS:DD biçiminde olmalı (00:00–23:59).'
  if (!isReminderKind(input.kind)) return 'Tür takviye, yürüyüş veya genel olmalı.'
  const note = typeof input.note === 'string' ? input.note : ''
  if (note.length > REMINDER_NOTE_MAX) return `Not en fazla ${REMINDER_NOTE_MAX} karakter olabilir.`
  return null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

/** Depodaki tek kaydı doğrular; uydurma alan eklemez, bozuk kaydı atar. */
function normalizeReminder(value: unknown): Reminder | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const id = text(row.id).trim()
  if (!id || id.length > 80) return null
  const title = text(row.title).trim()
  if (!title || title.length > REMINDER_TITLE_MAX) return null
  if (!isValidTime(row.time)) return null
  if (!isReminderKind(row.kind)) return null
  const note = text(row.note)
  if (note.length > REMINDER_NOTE_MAX) return null
  if (!isIsoDate(row.createdAt)) return null
  const snooze = row.snoozeUntil
  return {
    id,
    title,
    time: row.time,
    kind: row.kind,
    note,
    createdAt: row.createdAt,
    snoozeUntil: isIsoDate(snooze) ? snooze : null,
  }
}

function normalizeAcks(value: unknown, ids: Set<string>): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, string[]> = {}
  for (const [day, list] of Object.entries(value)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(list)) continue
    const clean = [...new Set(list.filter((item): item is string => typeof item === 'string' && ids.has(item)))]
    if (clean.length) result[day] = clean
  }
  return pruneAcks(result)
}

function pruneAcks(acks: Record<string, string[]>): Record<string, string[]> {
  const days = Object.keys(acks).sort().slice(-ACK_DAYS_KEPT)
  return Object.fromEntries(days.map(day => [day, acks[day]]))
}

/** Okuma asla fırlatmaz: bozuk JSON, yanlış şekil ve bozuk satırlar atlanır. */
function readState(): ReminderState {
  const { raw } = readRaw(REMINDERS_KEY)
  if (!raw) return { items: [], acks: {} }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { items: [], acks: {} }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { items: [], acks: {} }
  const root = parsed as Record<string, unknown>
  if (root.items !== undefined && !Array.isArray(root.items)) return { items: [], acks: {} }
  const seen = new Set<string>()
  const items: Reminder[] = []
  for (const value of Array.isArray(root.items) ? root.items : []) {
    const reminder = normalizeReminder(value)
    if (!reminder || seen.has(reminder.id)) continue
    seen.add(reminder.id)
    items.push(reminder)
  }
  items.sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt))
  return { items, acks: normalizeAcks(root.acks, seen) }
}

/** Yazma başarısızsa fırlatır; çağıran hata göstermekle yükümlüdür. */
function writeState(state: ReminderState): void {
  const ids = new Set(state.items.map(item => item.id))
  const payload = JSON.stringify({
    version: REMINDERS_VERSION,
    items: state.items,
    acks: normalizeAcks(state.acks, ids),
  })
  writeRaw(REMINDERS_KEY, payload)
}

function copy(reminder: Reminder): Reminder {
  return { ...reminder }
}

function nextId(existing: Set<string>): string {
  let id = ''
  do {
    id = `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  } while (existing.has(id))
  return id
}

/** Tüm hatırlatmalar; saat sırasına göre. Depo bozuksa boş liste döner. */
export function listReminders(): Reminder[] {
  return readState().items.map(copy)
}

/** Bugünün "aldım" işaretleri (yalnızca bugünün anahtarı). */
export function getAcknowledgedIds(now = new Date()): string[] {
  return [...(readState().acks[reminderDayKey(now)] ?? [])]
}

/** Durum hesabı saf ve deterministiktir: aynı an + aynı işaretler = aynı sonuç. */
export function reminderStatus(reminder: Reminder, now: Date, acknowledgedIds: readonly string[]): ReminderStatus {
  if (acknowledgedIds.includes(reminder.id)) return 'done'
  if (reminder.snoozeUntil) {
    const until = Date.parse(reminder.snoozeUntil)
    if (Number.isFinite(until) && until > now.getTime()) return 'snoozed'
  }
  const at = scheduledAt(now, reminder.time)
  if (at && now.getTime() >= at.getTime()) return 'due'
  return 'upcoming'
}

/** Zamanı gelmiş hatırlatmalar: bugünün saati geçmiş, "aldım" denmemiş, ertelenmemiş. */
export function dueReminders(now = new Date()): Reminder[] {
  const state = readState()
  const acknowledged = state.acks[reminderDayKey(now)] ?? []
  return state.items.filter(item => reminderStatus(item, now, acknowledged) === 'due').map(copy)
}

/** Bugünün planı; arayüz ve isteğe bağlı panel alanları için sade liste. */
export function todaysPlan(now = new Date()): ReminderPlanEntry[] {
  const state = readState()
  const acknowledged = state.acks[reminderDayKey(now)] ?? []
  return state.items
    .map(item => ({
      id: item.id,
      title: item.title,
      time: item.time,
      kind: item.kind,
      status: reminderStatus(item, now, acknowledged),
    }))
    .sort((a, b) => a.time.localeCompare(b.time))
}

export function addReminder(input: ReminderInput, now = new Date()): Reminder {
  if (typeof window === 'undefined') throw new Error('Hatırlatmalar yalnızca tarayıcıda kaydedilebilir.')
  const error = validateReminderInput(input)
  if (error) throw new Error(error)
  const state = readState()
  if (state.items.length >= MAX_REMINDERS) {
    throw new Error(`En fazla ${MAX_REMINDERS} hatırlatma saklanabilir.`)
  }
  const reminder: Reminder = {
    id: nextId(new Set(state.items.map(item => item.id))),
    title: input.title.trim(),
    time: input.time,
    kind: input.kind,
    note: (input.note ?? '').trim().slice(0, REMINDER_NOTE_MAX),
    createdAt: now.toISOString(),
    snoozeUntil: null,
  }
  state.items.push(reminder)
  state.items.sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt))
  writeState(state)
  return copy(reminder)
}

export function updateReminder(
  id: string,
  patch: Partial<ReminderInput>,
  now = new Date(),
): Reminder {
  if (typeof window === 'undefined') throw new Error('Hatırlatmalar yalnızca tarayıcıda düzenlenebilir.')
  const state = readState()
  const index = state.items.findIndex(item => item.id === id)
  if (index < 0) throw new Error('Hatırlatma bulunamadı.')
  const current = state.items[index]
  const next: Reminder = {
    ...current,
    title: patch.title !== undefined ? patch.title.trim() : current.title,
    time: patch.time !== undefined ? patch.time : current.time,
    kind: patch.kind !== undefined ? patch.kind : current.kind,
    note: patch.note !== undefined ? patch.note.trim().slice(0, REMINDER_NOTE_MAX) : current.note,
    snoozeUntil: null,
  }
  const error = validateReminderInput(next)
  if (error) throw new Error(error)
  void now
  state.items[index] = next
  state.items.sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt))
  writeState(state)
  return copy(next)
}

export function deleteReminder(id: string): boolean {
  if (typeof window === 'undefined') return false
  const state = readState()
  const next = state.items.filter(item => item.id !== id)
  if (next.length === state.items.length) return false
  state.items = next
  const acks: Record<string, string[]> = {}
  for (const [day, list] of Object.entries(state.acks)) {
    const filtered = list.filter(item => item !== id)
    if (filtered.length) acks[day] = filtered
  }
  state.acks = acks
  writeState(state)
  return true
}

/** "Aldım" — yalnızca bugün için geçerli; ertesi gün otomatik sıfırlanır. */
export function acknowledgeReminder(id: string, now = new Date()): boolean {
  if (typeof window === 'undefined') return false
  const state = readState()
  const reminder = state.items.find(item => item.id === id)
  if (!reminder) return false
  const day = reminderDayKey(now)
  const current = state.acks[day] ?? []
  if (!current.includes(id)) state.acks[day] = [...current, id]
  reminder.snoozeUntil = null
  writeState(state)
  return true
}

/**
 * Kullanıcı isteğiyle erteleme. Varsayılan 10 dakika; bitiş ISO olarak döner ve
 * kayıtta da tutulur. Ertesi günün "aldım" durumunu etkilemez.
 */
export function snoozeReminder(
  id: string,
  minutes = SNOOZE_MINUTES,
  now = new Date(),
): ReminderSnooze | null {
  if (typeof window === 'undefined') return null
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
    throw new Error('Erteleme süresi 1–720 dakika arasında olmalı.')
  }
  const state = readState()
  const reminder = state.items.find(item => item.id === id)
  if (!reminder) return null
  const until = new Date(now.getTime() + minutes * 60_000)
  reminder.snoozeUntil = until.toISOString()
  writeState(state)
  return {
    until: reminder.snoozeUntil,
    day: reminderDayKey(until),
    minutes,
  }
}

/* ── Supabase dalı (async): reminders + reminder_acks ── */

interface ReminderRow {
  id: string; title: string; time: string; kind: string
  note: string | null; snooze_until: string | null; created_at: string
}

export async function listRemindersAsync(): Promise<Reminder[]> {
  if (!isRemoteMode() || !supabase) return listReminders()
  const { data, error } = await supabase.from('reminders').select('*').order('time', { ascending: true })
  if (error) throw new Error(`Hatırlatmalar yüklenemedi: ${error.message}`)
  const out: Reminder[] = []
  for (const row of (data ?? []) as ReminderRow[]) {
    if (!isValidTime(row.time) || !isReminderKind(row.kind)) continue
    out.push({
      id: row.id, title: row.title, time: row.time, kind: row.kind,
      note: row.note ?? '', createdAt: row.created_at, snoozeUntil: row.snooze_until,
    })
  }
  return out
}

export async function addReminderAsync(input: ReminderInput, now = new Date()): Promise<Reminder> {
  if (!isRemoteMode() || !supabase) return addReminder(input, now)
  const error = validateReminderInput(input)
  if (error) throw new Error(error)
  const userId = await currentUserId()
  if (!userId) throw new Error('Hatırlatma eklemek için giriş yapmalısın.')
  const { data, error: dbError } = await supabase.from('reminders').insert({
    user_id: userId, title: input.title.trim(), time: input.time, kind: input.kind,
    note: (input.note ?? '').trim().slice(0, REMINDER_NOTE_MAX),
  }).select('*').single()
  if (dbError || !data) throw new Error(dbError?.message ?? 'Hatırlatma kaydedilemedi.')
  const row = data as ReminderRow
  return {
    id: row.id, title: row.title, time: row.time, kind: input.kind,
    note: row.note ?? '', createdAt: row.created_at, snoozeUntil: null,
  }
}

export async function deleteReminderAsync(id: string): Promise<boolean> {
  if (!isRemoteMode() || !supabase) return deleteReminder(id)
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  return !error
}

export async function acknowledgeReminderAsync(id: string, now = new Date()): Promise<boolean> {
  if (!isRemoteMode() || !supabase) return acknowledgeReminder(id, now)
  const userId = await currentUserId()
  if (!userId) return false
  const { error } = await supabase.from('reminder_acks').upsert(
    { user_id: userId, reminder_id: id, day: reminderDayKey(now) },
    { onConflict: 'user_id,reminder_id,day' })
  if (error) return false
  await supabase.from('reminders').update({ snooze_until: null }).eq('id', id)
  return true
}

export async function snoozeReminderAsync(id: string, minutes = SNOOZE_MINUTES, now = new Date()): Promise<ReminderSnooze | null> {
  if (!isRemoteMode() || !supabase) return snoozeReminder(id, minutes, now)
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
    throw new Error('Erteleme süresi 1–720 dakika arasında olmalı.')
  }
  const until = new Date(now.getTime() + minutes * 60_000)
  const { error } = await supabase.from('reminders').update({ snooze_until: until.toISOString() }).eq('id', id)
  return error ? null : { until: until.toISOString(), day: reminderDayKey(until), minutes }
}

export async function getAcknowledgedIdsAsync(now = new Date()): Promise<string[]> {
  if (!isRemoteMode() || !supabase) return getAcknowledgedIds(now)
  const { data, error } = await supabase.from('reminder_acks').select('reminder_id').eq('day', reminderDayKey(now))
  if (error) throw new Error(`Hatırlatma işaretleri yüklenemedi: ${error.message}`)
  return (data ?? []).map(r => String(r.reminder_id))
}

export async function dueRemindersAsync(now = new Date()): Promise<Reminder[]> {
  if (!isRemoteMode() || !supabase) return dueReminders(now)
  const [items, acked] = await Promise.all([listRemindersAsync(), getAcknowledgedIdsAsync(now)])
  return items.filter(item => reminderStatus(item, now, acked) === 'due')
}

export async function updateReminderAsync(id: string, patch: Partial<ReminderInput>, now = new Date()): Promise<Reminder> {
  if (!isRemoteMode() || !supabase) return updateReminder(id, patch, now)
  const current = (await listRemindersAsync()).find(item => item.id === id)
  if (!current) throw new Error('Hatırlatma bulunamadı.')
  const next: Reminder = {
    ...current,
    title: patch.title !== undefined ? patch.title.trim() : current.title,
    time: patch.time !== undefined ? patch.time : current.time,
    kind: patch.kind !== undefined ? patch.kind : current.kind,
    note: patch.note !== undefined ? patch.note.trim().slice(0, REMINDER_NOTE_MAX) : current.note,
    snoozeUntil: null,
  }
  const error = validateReminderInput(next)
  if (error) throw new Error(error)
  const { error: dbError } = await supabase.from('reminders')
    .update({ title: next.title, time: next.time, kind: next.kind, note: next.note, snooze_until: null }).eq('id', id)
  if (dbError) throw new Error(dbError.message)
  return next
}
