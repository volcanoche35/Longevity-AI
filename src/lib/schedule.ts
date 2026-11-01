/** Kullanım saati yardımcıları (saf fonksiyonlar; test edilebilir). */
export const GRACE_MINUTES = 120

export function isValidTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
}

/** Geçersizleri atar, tekrarları kaldırır, sıralar. */
export function normalizeSchedule(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(isValidTime))].sort()
}

export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Zamanı gelen en yakın (en son geçmiş) planlı saat: now >= saat ve now < saat+pencere.
 * Yoksa null. Gün sınırını aşmaz (gece yarısında biter).
 */
export function dueSlot(schedule: string[], now: Date, graceMinutes = GRACE_MINUTES): string | null {
  const cur = now.getHours() * 60 + now.getMinutes()
  let best: string | null = null
  for (const t of normalizeSchedule(schedule)) {
    const start = minutesOf(t)
    if (cur >= start && cur < start + graceMinutes) best = t
  }
  return best
}
