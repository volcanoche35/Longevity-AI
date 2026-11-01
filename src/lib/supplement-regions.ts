/**
 * Takviye ↔ anatomi bölgesi ilişkileri — DETERMİNİSTİK, KAYNAKLI, KÜÇÜK KÜME.
 *
 * Neden ayrı modül: dashboard'daki organ kartı yalnız "bu bölgeyle ilişkili
 * kayıt var mı" sorusunu yanıtlar. Kişisel fayda, tedavi, "organ iyileştirme"
 * veya doz önerisi ÜRETMEZ. Kural yoksa ilişki de yoktur (uydurma yok).
 *
 * Eşleştirme sözleşmesi:
 *  1. Ürün adı, katalogla aynı normalizasyondan geçer (Türkçe katlama, noktalama
 *     → boşluk, küçük harf). `normalizeProductName`, `catalog.normalize` ile
 *     birebir aynı davranır; eşitlik `scripts/test-supplement-regions.cjs` içinde
 *     gerçek katalog fonksiyonuna karşı test edilir (uygulama bundle'ına 51 KB
 *     katalog JSON'u sokmamak için kod kopyası + test kanıtı).
 *  2. Yalnız TAM ad veya TAM token penceresi eşleşir. `startsWith` / prefix
 *     eşleşmesi YOK: "m" ile "Magnezyum" gibi gevşek eşleşmeler ilişki üretmez.
 *  3. Sondaki doz/form token'ları ("1000 mcg", "60 kapsül") atılır; marka öneki
 *     olan ürünlerde katalog adı tam token penceresi olarak bulunur.
 *  4. Katalogda olmayan ürün (ör. Milk Thistle, Kurkumin) için pozitif ilişki
 *     AÇILMAZ — kanıtsız "karaciğere iyi gelir" eşleştirmesi yapılmaz.
 *
 * Kaynaklar: NIH Office of Dietary Supplements (ODS) fact sheet'leri,
 * `checked: 2026-10-25` tarihinde web_extract ile okunarak doğrulandı.
 * Bunlar normal fizyolojik rol veya güvenlik uyarısıdır; kişisel endikasyon değil.
 */

import type { RegionId } from './anatomy-regions'

/** Görselde bölgesi olan organlar + görselde olmayan "Sinir" konusu. */
export type AnatomyKey = RegionId | 'nervous'

export type RelationKind = 'role' | 'caution'

export interface RelationSource {
  org: string
  title: string
  url: string
  /** doğrulama tarihi (ISO) */
  checked: string
}

export interface RegionRelationRule {
  id: string
  anatomy: AnatomyKey
  kind: RelationKind
  /** kısa etiket — kartta rozet olarak görünür */
  label: string
  /** tek cümlelik, kaynağa bağlı açıklama */
  detail: string
  /** güvenilir katalogdaki tam ürün adları */
  catalogNames: string[]
  /** katalog alias'ları (tam eşleşme; prefix değil) */
  aliases: string[]
  source: RelationSource
}

const ODS_B12: RelationSource = {
  org: 'NIH ODS',
  title: 'Vitamin B12 — Fact Sheet for Health Professionals',
  url: 'https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/',
  checked: '2026-10-25',
}

const ODS_MAGNESIUM: RelationSource = {
  org: 'NIH ODS',
  title: 'Magnesium — Fact Sheet for Health Professionals',
  url: 'https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/',
  checked: '2026-10-25',
}

const ODS_VITAMIN_A: RelationSource = {
  org: 'NIH ODS',
  title: 'Vitamin A and Carotenoids — Health Professional Fact Sheet',
  url: 'https://ods.od.nih.gov/factsheets/VitaminA-HealthProfessional/',
  checked: '2026-10-25',
}

/**
 * Kural kümesi. Bilinçli olarak dar:
 *  - D vitamini için sinir/bilişsel "fayda" kuralı YOK. ODS, D vitaminini
 *    kalsiyum dengesi, kemik ve nöromüsküler işlevle ilişkilendirir; bu modülde
 *    bilişsel fayda veya "beyin desteği" ataması yapılmaz (kanıt/rol farkı belirsiz).
 *  - Milk Thistle / Kurkumin / Enginar gibi "karaciğere iyi gelir" iddiaları YOK.
 *  - Vitamin A yalnız CAUTION olarak bağlanır (aşırı alım), normal rol olarak değil.
 */
export const RELATION_RULES: readonly RegionRelationRule[] = [
  {
    id: 'b12-nervous-role',
    anatomy: 'nervous',
    kind: 'role',
    label: 'Normal sinir işlevi',
    detail:
      'ODS: B12, merkezî sinir sisteminin gelişimi, miyelinasyonu ve işlevi için gereklidir.',
    catalogNames: ['B12 (Metilkobalamin)'],
    aliases: ['b12', 'kobalamin', 'metilkobalamin'],
    source: ODS_B12,
  },
  {
    id: 'magnesium-nervous-role',
    anatomy: 'nervous',
    kind: 'role',
    label: 'Normal kas-sinir işlevi',
    detail:
      'ODS: magnezyum 300’den fazla enzim sisteminde kofaktördür; kas ve sinir işlevi bu süreçler arasında sayılır.',
    catalogNames: [
      'Magnezyum Glisinat',
      'Magnezyum Sitrat',
      'Magnezyum Oksit',
      'Magnezyum L-Treonat',
      'Magnezyum Malat',
      'Magnezyum + B6 Kompleks',
    ],
    aliases: ['magnezyum', 'mg glisinat', 'mg sitrat', 'mg oksit', 'magtreon'],
    source: ODS_MAGNESIUM,
  },
  {
    id: 'vitamin-a-liver-caution',
    anatomy: 'liver',
    kind: 'caution',
    label: 'Aşırı alım uyarısı',
    detail:
      'ODS: düzenli yüksek doz preformed vitamin A (retinol) alımı karaciğer testlerinde anormallikle ilişkilendirilir. Bu bir doz önerisi değildir; ürün etiketini ve hekiminizi esas alın.',
    catalogNames: ['Vitamin A (Retinol)'],
    aliases: ['retinol', 'a vitamini'],
    source: ODS_VITAMIN_A,
  },
]

/* ── normalizasyon (katalog ile aynı sözleşme) ───────────────────── */

/** `catalog.normalize` ile birebir aynı; eşitliği test dosyası doğrular. */
export function normalizeProductName(input: string): string {
  return input
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokensOf(normalized: string): string[] {
  return normalized.length === 0 ? [] : normalized.split(' ')
}

/** Sondaki doz/form token'ları: "1000 mcg", "60 kapsül", "2 tablet" … */
const DOSE_TOKEN = /^(?:\d+(?:[.,]\d+)?|mg|mcg|µg|ug|g|ml|iu|iü|damla|kapsul|kapsül|tablet|tableti|hap|hapı|ölçek|olcek|sase|saşe|adet)$/

function stripDoseSuffix(tokens: string[]): string[] {
  const out = [...tokens]
  while (out.length > 1 && DOSE_TOKEN.test(out[out.length - 1])) out.pop()
  return out
}

/** Tam token penceresi eşleşmesi — prefix DEĞİL. */
function containsWindow(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0) return false
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let hit = true
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) { hit = false; break }
    }
    if (hit) return true
  }
  return false
}

interface Candidate {
  rule: RegionRelationRule
  matchedAs: 'catalog-name' | 'alias'
  weight: number
}

/** Ürün adı → kural (yoksa null). Deterministik: en uzun eşleşme, sonra katalog adı, sonra kural id. */
export function matchRule(productName: string): { rule: RegionRelationRule; matchedAs: 'catalog-name' | 'alias' } | null {
  const tokens = stripDoseSuffix(tokensOf(normalizeProductName(productName)))
  if (tokens.length === 0) return null

  const candidates: Candidate[] = []
  for (const rule of RELATION_RULES) {
    for (const name of rule.catalogNames) {
      const needle = tokensOf(normalizeProductName(name))
      if (containsWindow(tokens, needle)) candidates.push({ rule, matchedAs: 'catalog-name', weight: needle.length })
    }
    for (const alias of rule.aliases) {
      const needle = tokensOf(normalizeProductName(alias))
      if (containsWindow(tokens, needle)) candidates.push({ rule, matchedAs: 'alias', weight: needle.length })
    }
  }
  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight
    if (a.matchedAs !== b.matchedAs) return a.matchedAs === 'catalog-name' ? -1 : 1
    return a.rule.id < b.rule.id ? -1 : a.rule.id > b.rule.id ? 1 : 0
  })
  return { rule: candidates[0].rule, matchedAs: candidates[0].matchedAs }
}

/* ── envanter → bölge ilişkileri ─────────────────────────────────── */

export interface ProductLike {
  id?: string
  name: string
}

export interface ProductRelation {
  productId: string
  productName: string
  anatomy: AnatomyKey
  relationId: string
  kind: RelationKind
  label: string
  detail: string
  source: RelationSource
  matchedAs: 'catalog-name' | 'alias'
}

const ANATOMY_KEYS: readonly AnatomyKey[] = ['nervous', 'heart', 'lungs', 'liver', 'stomach', 'intestine']

function toRelation(product: ProductLike, match: NonNullable<ReturnType<typeof matchRule>>): ProductRelation {
  return {
    productId: product.id ?? normalizeProductName(product.name),
    productName: product.name,
    anatomy: match.rule.anatomy,
    relationId: match.rule.id,
    kind: match.rule.kind,
    label: match.rule.label,
    detail: match.rule.detail,
    source: match.rule.source,
    matchedAs: match.matchedAs,
  }
}

/** Tek bölge için ilişkili kayıtlar: önce güvenlik uyarıları, sonra ürün adı (tr). */
export function relationsFor(anatomy: AnatomyKey, products: readonly ProductLike[]): ProductRelation[] {
  const out: ProductRelation[] = []
  for (const product of products) {
    if (!product || typeof product.name !== 'string') continue
    const match = matchRule(product.name)
    if (!match || match.rule.anatomy !== anatomy) continue
    out.push(toRelation(product, match))
  }
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'caution' ? -1 : 1
    const byName = a.productName.localeCompare(b.productName, 'tr')
    if (byName !== 0) return byName
    return a.relationId < b.relationId ? -1 : a.relationId > b.relationId ? 1 : 0
  })
}

/** Tüm bölgeler için tek geçişli indeks (boş bölgeler boş dizi döner). */
export function relationIndex(products: readonly ProductLike[]): Record<AnatomyKey, ProductRelation[]> {
  const index = {} as Record<AnatomyKey, ProductRelation[]>
  for (const key of ANATOMY_KEYS) index[key] = []
  for (const product of products) {
    if (!product || typeof product.name !== 'string') continue
    const match = matchRule(product.name)
    if (!match) continue
    index[match.rule.anatomy].push(toRelation(product, match))
  }
  for (const key of ANATOMY_KEYS) {
    index[key].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'caution' ? -1 : 1
      return a.productName.localeCompare(b.productName, 'tr')
    })
  }
  return index
}

/** Envanterde en az bir kaynaklı ilişki var mı? (boş durum metni için) */
export function hasAnyRelation(products: readonly ProductLike[]): boolean {
  return products.some(product => product && typeof product.name === 'string' && matchRule(product.name) !== null)
}

/** Kullanıcıya gösterilecek zorunlu dürüstlük satırı. */
export const RELATION_DISCLAIMER =
  'Kayıtlı ilişki, kişisel fayda veya tedavi anlamına gelmez; yalnız kaynaklı normal işlev ya da güvenlik notudur.'
