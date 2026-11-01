import { readRaw, writeRaw } from './local-store'
import { supabase, isRemoteMode, currentUserId } from './supabase'
export const DAY_MARKS_KEY = 'biotrack.daymarks.v1'
export function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export function readMarks(): Record<string,string[]> {
  const { raw } = readRaw(DAY_MARKS_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: Record<string,string[]> = {}
    for (const [day, value] of Object.entries(parsed)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(value)) continue
      result[day] = [...new Set(value.filter((x): x is string => typeof x === 'string' && x.length > 0))]
    }
    return result
  } catch { return {} }
}
export function toggleDayMark(id: string, date = new Date()): void {
  const day = localDayKey(date)
  const marks = readMarks()
  const current = marks[day] ?? []
  marks[day] = current.includes(id) ? current.filter(x => x !== id) : [...current,id]
  const days = Object.keys(marks).sort().slice(-90)
  writeRaw(DAY_MARKS_KEY, JSON.stringify(Object.fromEntries(days.map(d => [d, marks[d]]))))
}

/* ── Supabase dalı (async): daymarks (user_id, day, supplement_id) ── */

export async function readMarksAsync(): Promise<Record<string,string[]>> {
  if (!isRemoteMode() || !supabase) return readMarks()
  const { data, error } = await supabase.from('daymarks').select('day, supplement_id')
  if (error) throw new Error(`İşaretler yüklenemedi: ${error.message}`)
  const result: Record<string,string[]> = {}
  for (const row of data ?? []) (result[row.day as string] ??= []).push(String(row.supplement_id))
  return result
}

export async function toggleDayMarkAsync(id: string, date = new Date()): Promise<boolean> {
  if (!isRemoteMode() || !supabase) { toggleDayMark(id, date); return true }
  const userId = await currentUserId()
  if (!userId) return false
  const supplementId = Number(id)
  if (!Number.isSafeInteger(supplementId)) return false
  const day = localDayKey(date)
  const found = await supabase.from('daymarks').select('id').eq('user_id', userId).eq('day', day).eq('supplement_id', supplementId).maybeSingle()
  if (found.error) return false
  if (found.data) {
    const del = await supabase.from('daymarks').delete().eq('id', found.data.id)
    return !del.error
  }
  // Savunma derinliği: supplement_id gerçekten bu kullanıcıya ait olmalı (RLS + kod).
  const owns = await supabase.from('user_supplements').select('id').eq('id', supplementId).eq('user_id', userId).maybeSingle()
  if (owns.error || !owns.data) return false
  const ins = await supabase.from('daymarks').insert({ user_id: userId, day, supplement_id: supplementId })
  return !ins.error
}
