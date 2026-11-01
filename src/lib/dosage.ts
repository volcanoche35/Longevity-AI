export const DOSE_UNITS = ['mg', 'µg', 'g', 'IU', 'damla', 'adet', 'ml'] as const
export type DoseUnit = typeof DOSE_UNITS[number]
export interface DosePart { label: string; amount: string; unit: DoseUnit }
/**
 * Sade akış: kullanım şekli + günde ne kadar (tek miktar/birim).
 * `parts` yalnızca etiketteki içerik detayıdır; günlük miktara eklenmez.
 * dailyAmount/dailyUnit yeni kayıtlarda dolar; eski kayıtlarda yoktur (normalize edilir).
 */
export interface DosePlan {
  parts: DosePart[]
  form: string
  dailyCount: string
  dailyAmount?: string
  dailyUnit?: DoseUnit
}

export const emptyPart = (): DosePart => ({ label: '', amount: '', unit: 'mg' })

/** Kullanım şekline göre sorulan günlük birimler. Tozda mg/g — adet sorulmaz. */
export const FORM_DAILY_UNITS: Record<string, DoseUnit[]> = {
  Toz: ['mg', 'g'],
  Hap: ['adet'],
  Kapsül: ['adet'],
  Damla: ['damla'],
  Sıvı: ['damla', 'ml'],
  Diğer: ['mg', 'g', 'ml', 'damla'],
}
export function unitsForForm(form: string): DoseUnit[] {
  return FORM_DAILY_UNITS[form] ?? ['mg', 'g', 'ml', 'damla']
}
const FORM_WORD: Record<string, string> = { Toz: 'toz', Hap: 'hap', Kapsül: 'kapsül', Damla: 'damla', Sıvı: 'sıvı', Diğer: 'doz' }
export function formWord(form: string): string {
  return FORM_WORD[form] ?? (form ? form.toLocaleLowerCase('tr') : 'doz')
}

export function positiveAmount(value: string): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null
  const n = Number(value.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 && n <= 1e9 ? n : null
}
const fmt = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 }).format(n)
const showAmount = (value: string) => value.trim().replace('.', ',')

/** Eski kayıt biçimi — dış arayüz korunur. */
export function doseSummary(plan: DosePlan): string {
  return plan.parts.map(p => `${p.label.trim() ? p.label.trim() + ': ' : ''}${p.amount.replace('.', ',')} ${p.unit}/gün`).join(' + ')
    + (plan.dailyCount ? ` · ${plan.dailyCount} ${plan.form}/gün` : ` · ${plan.form}`)
}
/** Eski arayüz — etiket satırlarının birim bazlı toplamı. */
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

const MASS_UNITS: DoseUnit[] = ['g', 'mg', 'µg']
const toMg = (n: number, unit: DoseUnit) => unit === 'g' ? n * 1000 : unit === 'µg' ? n / 1000 : n
const FORM_SUFFIXES = new Set(['sitrat', 'klorür', 'klorur', 'glisinat', 'bisglisinat', 'oksit', 'malat', 'taurat', 'treonat', 'askorbat', 'sülfat', 'sulfat', 'karbonat', 'fumarat', 'pikolinat', 'aspartat', 'laktat', 'glukonat', 'hidroklorür'])

/** Aynı mineralin farklı tuzları aynı madde sayılır; farklı içerikler (D3, K2) asla birleşmez. */
function substanceKey(label: string): string {
  const norm = label.trim().toLocaleLowerCase('tr')
  if (!norm) return ''
  const base = norm.split(/\s+/).filter(w => !FORM_SUFFIXES.has(w)).join(' ')
  return base || norm
}

/**
 * Etiket içeriğini madde bazında okunur satırlara çevirir.
 * Farklı içerikler tek bir toplam gibi sunulmaz.
 */
export function labelContentLines(parts: DosePart[]): string[] {
  const rows = parts.filter(p => positiveAmount(p.amount) !== null)
  if (rows.length <= 1) {
    return rows.map(p => `${showAmount(p.amount)} ${p.unit}${p.label.trim() ? ' ' + p.label.trim() : ''}`)
  }
  type Group = { key: string; unit: DoseUnit; amount: number; labels: string[] }
  const groups: Group[] = []
  for (const p of rows) {
    const key = substanceKey(p.label)
    const amount = positiveAmount(p.amount)!
    const group = groups.find(g => g.key === key)
    if (!group) { groups.push({ key, unit: p.unit, amount, labels: [p.label.trim()] }); continue }
    const sameFamily = group.unit === p.unit || (MASS_UNITS.includes(group.unit) && MASS_UNITS.includes(p.unit))
    if (!sameFamily) { groups.push({ key: `${key}|${p.unit}`, unit: p.unit, amount, labels: [p.label.trim()] }); continue }
    if (group.unit === p.unit) group.amount += amount
    else { group.amount = toMg(group.amount, group.unit) + toMg(amount, p.unit); group.unit = 'mg' }
    if (p.label.trim() && !group.labels.includes(p.label.trim())) group.labels.push(p.label.trim())
  }
  return groups.map(g => {
    const base = g.key.split('|')[0]
    const name = g.labels.length > 1 ? g.labels.join(' + ') : g.labels[0] || base
    return `${fmt(g.amount)} ${g.unit}${name ? ' ' + name : ''}`
  })
}

export interface ResolvedDosePlan { parts: DosePart[]; form: string; dailyCount: string; dailyAmount: string; dailyUnit: DoseUnit }

function readPart(raw: unknown): DosePart {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const amount = typeof o.amount === 'string' ? o.amount : typeof o.amount === 'number' ? String(o.amount) : ''
  const unit = typeof o.unit === 'string' && (DOSE_UNITS as readonly string[]).includes(o.unit) ? o.unit as DoseUnit : 'mg'
  return { label: typeof o.label === 'string' ? o.label : '', amount, unit }
}

/** Eski ve yeni dose_plan kayıtlarını güvenli biçimde okur; kayıp alan uydurmaz. */
export function normalizeDosePlan(raw: unknown): ResolvedDosePlan {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<DosePlan>
  const parts: DosePart[] = Array.isArray(src.parts) ? src.parts.map(readPart) : []
  const form = typeof src.form === 'string' && src.form.trim() ? src.form : 'Hap'
  const dailyCount = typeof src.dailyCount === 'string' ? src.dailyCount : ''
  const unitOk = (u: unknown): u is DoseUnit => (DOSE_UNITS as readonly string[]).includes(u as string)
  let dailyAmount = typeof src.dailyAmount === 'string' ? src.dailyAmount : ''
  let dailyUnit = unitOk(src.dailyUnit) ? src.dailyUnit : unitsForForm(form)[0]

  if (!dailyAmount) {
    if (positiveAmount(dailyCount) !== null && (form === 'Hap' || form === 'Kapsül' || form === 'Damla')) {
      // Eski kayıt: adet alanı günlük miktardır, parts etiket içeriği olarak kalır.
      dailyAmount = dailyCount
      dailyUnit = form === 'Damla' ? 'damla' : 'adet'
    } else if (parts.length === 1 && positiveAmount(parts[0].amount) !== null) {
      // Eski toz/sıvı kaydı: tek satır günlük miktarın kendisidir — ikinci kez toplanmaz.
      dailyAmount = parts[0].amount
      dailyUnit = unitsForForm(form).includes(parts[0].unit) ? parts[0].unit : unitsForForm(form)[0]
      return { parts: [], form, dailyCount: '', dailyAmount, dailyUnit }
    }
  }
  if (!unitsForForm(form).includes(dailyUnit) && !src.dailyUnit) dailyUnit = unitsForForm(form)[0]
  return { parts, form, dailyCount, dailyAmount, dailyUnit }
}

const FORM_WORD_UNITS: DoseUnit[] = ['mg', 'g', 'ml']

/** İnsan okunur günlük özet: "Günde 5 g toz", "Günde 12 damla", "Günde 1 kapsül · etiketi 2 µg D3". */
export function dailyIntakeSummary(plan: DosePlan): string {
  const p = normalizeDosePlan(plan)
  if (!p.dailyAmount) return doseSummary(p)
  const head = p.dailyUnit === 'adet' ? formWord(p.form) : p.dailyUnit
  const suffix = p.dailyUnit === 'adet' || !FORM_WORD_UNITS.includes(p.dailyUnit) ? '' : ` ${formWord(p.form)}`
  const main = `Günde ${showAmount(p.dailyAmount)} ${head}${suffix}`
  const labels = labelContentLines(p.parts)
  return labels.length ? `${main} · etiketi ${labels.join(' · ')}` : main
}

export function validateDose(plan: DosePlan): string | null {
  const p = normalizeDosePlan(plan)
  const hasDaily = p.dailyAmount.trim() !== ''
  if (!hasDaily && !p.parts.length) return 'Her satıra sıfırdan büyük bir miktar girin.'
  if (hasDaily && positiveAmount(p.dailyAmount) === null) return 'Günlük miktar sıfırdan büyük bir sayı olmalı.'
  if (hasDaily && !unitsForForm(p.form).includes(p.dailyUnit)) return 'Bu kullanım şekli için geçerli bir birim seçin.'
  if (p.parts.some(p => positiveAmount(p.amount) === null)) return 'Her satıra sıfırdan büyük bir miktar girin.'
  if (p.parts.some(p => !DOSE_UNITS.includes(p.unit))) return 'Geçerli bir birim seçin.'
  if (p.parts.length > 1 && p.parts.some(p => !p.label.trim())) return 'Birden fazla içerik için her satıra form/ad yazın (ör. sitrat, klorür).'
  if (p.dailyCount && positiveAmount(p.dailyCount) === null) return 'Günlük kullanım adedi sıfırdan büyük olmalı.'
  return null
}
