/**
 * Katalog erişim katmanı — tek kaynak: data/supplements.json
 * Excel/CSV içe-aktarımı bu dosyaya yazar, arayüz buradan okur.
 */
import catalog from '../../data/supplements.json'

export type Grade = 'A' | 'B' | 'C'

export interface CatalogEntry {
  name: string
  category: string
  grade: Grade
  aliases: string[]
  typicalDose: string
  timing: string
  withFood: boolean
  avoidWith: string[]
  note: string
}

export const CATALOG = catalog.entries as CatalogEntry[]

/** Türkçe karakter + noktalama toleranslı normalize */
export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const HAYSTACKS = CATALOG.map(e => ({
  entry: e,
  name: normalize(e.name),
  alt: [...e.aliases, e.category].map(normalize),
}))

/** Öne başlayan (prefix) eşleşmeler — "m" → magnezyum, melatonin, milk thistle… */
export function suggest(query: string, limit = 8): CatalogEntry[] {
  const q = normalize(query)
  if (q.length === 0) return []
  const starts = HAYSTACKS.filter(h => h.name.startsWith(q))
  const aliases = HAYSTACKS.filter(h => !h.name.startsWith(q) && h.alt.some(a => a.startsWith(q)))
  return [...starts, ...aliases].slice(0, limit).map(h => h.entry)
}

/** Birebir/ensez eşleşme — AI bağlamı ve içe-aktarım denetimi için */
export function findEntry(query: string): CatalogEntry | undefined {
  const q = normalize(query)
  if (!q) return undefined
  return HAYSTACKS.find(h => h.name === q)?.entry
    ?? HAYSTACKS.find(h => h.name.includes(q) || q.includes(h.name))?.entry
}

/**
 * ETKİLEŞİM MATRİSİ — tek doğru kaynak.
 * Neden metin-eşleşmesi DEĞİL: avoidWith alanı "bu ilaçLA etkileşir" bilgisi taşır
 * (ör. warfarin), o ilacı kullanan takviyelerin BİRBİRİYLE çakıştığı anlamına gelmez.
 * Heuristik, "Demir ↔ D3+K2 — warfarin" gibi yanlış tıbbi uyarı üretti.
 * Kural: yalnızca burada tanımlı çiftler uyarılır. Anahtarlar normalize tek-token.
 */
const PAIRS: { a: string; b: string; why: string }[] = [
  { a: 'demir', b: 'magnezyum', why: 'emilim yarışı — en az 2 saat arayla alın' },
  { a: 'demir', b: 'kalsiyum', why: 'kalsiyum demir emilimini azaltır' },
  { a: 'demir', b: 'cinko', why: 'emilim yarışı' },
  { a: 'cinko', b: 'demir', why: 'emilim yarışı' },
  { a: 'cinko', b: 'kalsiyum', why: 'emilim yarışı' },
  { a: 'cinko', b: 'folat', why: 'yüksek çinko folat emilimini düşürür' },
  { a: 'cinko', b: 'b12', why: 'uzun süre yüksek çinko B12/tiamin düzeyini düşürebilir' },
  { a: 'magnezyum', b: 'kalsiyum', why: 'yüksek dozda emilim yarışı' },
  { a: 'cinko', b: 'bakir', why: 'çinko bakırı düşürür — dengelemek için ayrı saatte bakır' },
  { a: 'k2', b: 'warfarin', why: 'K vitamini pıhtılaşma ilacını etkiler' },
]

/** normalize edilmiş isimden "anahtar token" seti (Magnezyum Sitrat → magnezyum) */
function tokensOf(name: string): string[] {
  const n = normalize(name)
  const first = n.split(' ')[0]
  const set = new Set<string>([first])
  // bilinen kök eşleşmeleri: "b12 (metilkobalamin)" → b12 + kobalamin
  for (const root of ['demir', 'magnezyum', 'cinko', 'kalsiyum', 'bakir', 'folat', 'k2', 'd3', 'iyot', 'selenyum']) {
    if (n.includes(root)) set.add(root)
  }
  return [...set]
}

/** envanterdeki gerçek çakışan çiftler */
export function findConflicts(names: string[]): { a: string; b: string; reason: string }[] {
  const picked = names.map(findEntry).filter((e): e is CatalogEntry => Boolean(e))
  const out: { a: string; b: string; reason: string }[] = []
  for (let i = 0; i < picked.length; i++) {
    for (let j = i + 1; j < picked.length; j++) {
      const ta = tokensOf(picked[i].name), tb = tokensOf(picked[j].name)
      for (const p of PAIRS) {
        const hit = (ta.includes(p.a) && tb.includes(p.b)) || (ta.includes(p.b) && tb.includes(p.a))
        if (hit) out.push({ a: picked[i].name, b: picked[j].name, reason: p.why })
      }
    }
  }
  // aynı çifti iki kez report etme
  const seen = new Set<string>()
  return out.filter(c => {
    const k = [c.a, c.b].sort().join('|')
    if (seen.has(k)) return false
    seen.add(k); return true
  })
}

export const catalogSize = () => CATALOG.length
