import { readRaw, writeRaw } from './local-store'
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
