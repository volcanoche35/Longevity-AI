export const DOSE_UNITS = ['mg', 'µg', 'g', 'IU', 'damla', 'adet', 'ml'] as const
export type DoseUnit = typeof DOSE_UNITS[number]
export interface DosePart { label: string; amount: string; unit: DoseUnit }
export interface DosePlan { parts: DosePart[]; form: string; dailyCount: string }
export const emptyPart = (): DosePart => ({ label: '', amount: '', unit: 'mg' })
export function positiveAmount(value: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null
  const n = Number(value.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n <= 1e9 ? n : null
}
const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 }).format(n)
export function doseSummary(plan: DosePlan): string {
  return plan.parts.map(p => `${p.label.trim() ? p.label.trim() + ': ' : ''}${p.amount.replace('.', ',')} ${p.unit}/gün`).join(' + ')
    + (plan.dailyCount ? ` · ${plan.dailyCount} ${plan.form}/gün` : ` · ${plan.form}`)
}
export function doseTotals(parts: DosePart[]): string {
  const totals = new Map<string, number>()
  const massUnits = new Set(parts.filter(p => ['g', 'µg', 'mg'].includes(p.unit)).map(p => p.unit))
  const convertMass = massUnits.size > 1
  for (const p of parts) {
    const n = positiveAmount(p.amount)
    if (n === null) continue
    // Mass units can be converted. Drops, IU, volume and tablets cannot.
    const unit = convertMass && ['g', 'µg', 'mg'].includes(p.unit) ? 'mg' : p.unit
    const amount = !convertMass ? n : p.unit === 'g' ? n * 1000 : p.unit === 'µg' ? n / 1000 : n
    totals.set(unit, (totals.get(unit) || 0) + amount)
  }
  return [...totals].map(([u, n]) => `${fmt(n)} ${u}/gün`).join(' · ')
}
export function validateDose(plan: DosePlan): string | null {
  if (!plan.parts.length || plan.parts.some(p => positiveAmount(p.amount) === null)) return 'Her satıra sıfırdan büyük bir miktar girin.'
  if (plan.parts.some(p => !DOSE_UNITS.includes(p.unit))) return 'Geçerli bir birim seçin.'
  if (plan.parts.length > 1 && plan.parts.some(p => !p.label.trim())) return 'Birden fazla içerik için her satıra form/ad yazın (ör. sitrat, klorür).'
  if (plan.dailyCount && positiveAmount(plan.dailyCount) === null) return 'Günlük kullanım adedi sıfırdan büyük olmalı.'
  return null
}
