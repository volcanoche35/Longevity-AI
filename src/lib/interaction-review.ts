/**
 * SINIRLI (BOUNDED) ETKİLEŞİM DEĞERLENDİRMESİ
 *
 * Kapsam bilinçli olarak dar: yalnızca burada tanımlı, kaynağı doğrulanmış birkaç
 * kural çalışır. Katalogdaki `avoidWith` alanı veya serbest metin eşleştirmesi
 * KULLANILMAZ — geçmişte "Demir ↔ D3+K2 / warfarin" gibi yanlış pozitif üretti.
 *
 * Kaynaklar (NIH Office of Dietary Supplements fact sheet'leri):
 *   [1] Iron — Health Professional Fact Sheet
 *   [2] Copper — Health Professional Fact Sheet
 * Alıntılar ve kapsam sınırları: docs/interaction-sources.md
 *
 * Ağ çağrısı, AI çağrısı ve arka plan işi YOKTUR; çıktı tamamen deterministiktir.
 *
 * DOZAJ: `dosage` yalnızca ürünü tanımlamak için olduğu gibi gösterilir. Metin
 * ayrıştırılmaz, birim çevrilmez, kişisel doz veya risk çıkarımı yapılmaz.
 */

/** Panelin kabul ettiği tek props sözleşmesi. */
export interface InteractionInput {
  name: string
  dosage?: string
}

export type InteractionFamily =
  | 'demir'
  | 'kalsiyum'
  | 'c-vitamini'
  | 'cinko'
  | 'bakir'
  | 'd3'
  | 'k2'
  | 'magnezyum'
  | 'b12'
  | 'folat'
  | 'omega-3'
  | 'koenzim-q10'

export interface InteractionSource {
  /** Ledger'daki kaynak kimliği — docs/interaction-sources.md ile eşleşir. */
  id: 'ods-iron' | 'ods-copper' | 'ods-zinc' | 'ods-magnesium' | 'ods-vitamin-d' | 'ods-b12'
  label: string
  url: string
}

export const SOURCES: Record<InteractionSource['id'], InteractionSource> = {
  'ods-iron': {
    id: 'ods-iron',
    label: 'NIH ODS — Iron Fact Sheet',
    url: 'https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/',
  },
  'ods-copper': {
    id: 'ods-copper',
    label: 'NIH ODS — Copper Fact Sheet',
    url: 'https://ods.od.nih.gov/factsheets/Copper-HealthProfessional/',
  },
  'ods-zinc': {
    id: 'ods-zinc',
    label: 'NIH ODS — Zinc Fact Sheet',
    url: 'https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/',
  },
  'ods-magnesium': {
    id: 'ods-magnesium',
    label: 'NIH ODS — Magnesium Fact Sheet',
    url: 'https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/',
  },
  'ods-vitamin-d': {
    id: 'ods-vitamin-d',
    label: 'NIH ODS — Vitamin D Fact Sheet',
    url: 'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/',
  },
  'ods-b12': {
    id: 'ods-b12',
    label: 'NIH ODS — Vitamin B12 Fact Sheet',
    url: 'https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/',
  },
}

export interface InteractionPair {
  /** Kural kimliği (stabil; testler buna bakar). */
  ruleId: InteractionRuleId
  /** 'conflict' → ayrı alma uyarısı; 'synergy' → birlikte kullanım önerisi. */
  kind: 'conflict' | 'synergy'
  /** Sabit etiket — "olası" der, tanı/kesinlik iddiası taşımaz. */
  label: string
  families: [InteractionFamily, InteractionFamily]
  /** Envanterdeki ürün adları, kullanıcının yazdığı gibi. */
  products: [string, string]
  /** Etiketteki doz metinleri, olduğu gibi (yoksa boş string). Ayrıştırılmaz. */
  dosages: [string, string]
  /** Kaynağın koşulunu/sınırlamasını taşıyan açıklama. */
  condition: string
  sources: InteractionSource[]
}

export const PAIR_LABEL = 'Kaynaklı olası etkileşim' as const

export const SYNERGY_LABEL = 'Önerilen birlikte kullanım' as const

export const DRUG_NOTICE =
  'İlaç listesi incelenmiyor. Düzenli ilaç (ör. kan sulandırıcı, tansiyon, tiroid) kullanıyorsanız bu panel yeterli değildir; hekim veya eczacıya danışın.'

export const SCOPE_NOTICE =
  'Bu panel sınırlı sayıda kaynaklı kuralı denetler; birlikte kullanım için güvenlik onayı değildir.'

export const NO_MATCH_MESSAGE =
  'Bu sınırlı kurallarda eşleşme bulunmadı; birlikte kullanım için güvenlik onayı değildir.'

export const INSUFFICIENT_MESSAGE =
  'Karşılaştırma için en az iki kayıt gerekiyor. Tek kayıtta çift etkileşimi değerlendirilmez ve hiçbir çift "kontrol edildi" sayılmaz.'

export const DISCLOSURE_LABEL = 'Olası etkileşimleri gör'

/* ── Normalizasyon ───────────────────────────────────────────────────────── */

/** Türkçe karakter + noktalama toleranslı normalize (catalog.normalize ile aynı niyet, bağımsız kopya). */
function normalize(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokensOf(name: string): string[] {
  const n = normalize(name)
  return n ? n.split(' ') : []
}

/**
 * Aile sözlüğü: TAM token dizisi eşleşmesi (alt-dize araması YOK).
 * Tek harfli "c"/"d" aramaları bilinçli olarak yok — "C Vitamini" iki token'lık
 * bir ifade, "D3" tek token; böylece her ürün yakalanmaz.
 */
const FAMILY_PHRASES: Record<InteractionFamily, string[]> = {
  demir: ['demir', 'iron', 'ferrous', 'ferric', 'ferrik', 'ferroz'],
  kalsiyum: ['kalsiyum', 'calcium'],
  'c-vitamini': ['c vitamini', 'vitamin c', 'askorbik asit', 'ascorbic acid', 'askorbat', 'ascorbate'],
  cinko: ['cinko', 'zinc'],
  bakir: ['bakir', 'copper'],
  d3: ['d vitamini', 'vitamin d', 'd3', 'kolekalsiferol', 'cholecalciferol', 'kalsiferol'],
  k2: ['k2', 'menaquinon', 'menakinon', 'k vitamini', 'vitamin k', 'mk-7', 'mk7'],
  magnezyum: ['magnezyum', 'magnesium'],
  b12: ['b12', 'kobalamin', 'cobalamin', 'metilkobalamin', 'methylcobalamin'],
  folat: ['folat', 'folate', 'folik asit', 'folic acid', 'b9', 'metilfolat', 'methylfolate'],
  'omega-3': ['omega-3', 'omega 3', 'balık yağı', 'balik yagi', 'fish oil', 'epa', 'dha'],
  'koenzim-q10': ['koenzim q10', 'coq10', 'ubikinon', 'ubikinol', 'ubiquinone', 'ubiquinol'],
}

/** Bir ifadenin token dizisi, ürün token'ları içinde bitişik olarak geçiyor mu? */
function hasPhrase(tokens: string[], phrase: string): boolean {
  const p = phrase.split(' ')
  if (p.length === 0) return false
  for (let i = 0; i + p.length <= tokens.length; i++) {
    let ok = true
    for (let j = 0; j < p.length; j++) {
      if (tokens[i + j] !== p[j]) { ok = false; break }
    }
    if (ok) return true
  }
  return false
}

/** Ürün adında tanınan aileler (deterministik sıra). Tanınmayan ad → boş dizi. */
export function recognizeFamilies(name: string): InteractionFamily[] {
  const tokens = tokensOf(name)
  if (tokens.length === 0) return []
  const out: InteractionFamily[] = []
  for (const family of Object.keys(FAMILY_PHRASES) as InteractionFamily[]) {
    if (FAMILY_PHRASES[family].some(phrase => hasPhrase(tokens, phrase))) out.push(family)
  }
  return out
}

export function recognizeFamily(name: string): InteractionFamily | null {
  return recognizeFamilies(name)[0] ?? null
}

/* ── Kurallar ────────────────────────────────────────────────────────────── */

export type InteractionRuleId =
  | 'calcium-iron'
  | 'zinc-copper'
  | 'iron-vitamin-c'
  | 'iron-zinc'
  | 'calcium-magnesium'
  | 'd3-magnesium'
  | 'd3-k2'
  | 'b12-folat'

export interface InteractionRule {
  id: InteractionRuleId
  pair: [InteractionFamily, InteractionFamily]
  /** 'conflict' → ayrı alma uyarısı; 'synergy' → birlikte kullanım önerisi. */
  kind: 'conflict' | 'synergy'
  /** İki aile aynı üründe bulunduğunda kendi kendisiyle eşleşmeyi engeller. */
  condition: string
  sourceIds: InteractionSource['id'][]
}

/**
 * Doğrulanmış kurallar. Her cümlenin dayanağı docs/interaction-sources.md'de
 * birebir alıntıyla listelenir; kaynağı olmayan çift buraya EKLENMEZ.
 */
export const RULES: InteractionRule[] = [
  {
    id: 'calcium-iron',
    pair: ['kalsiyum', 'demir'],
    kind: 'conflict',
    condition:
      'Kalsiyum, demir emilimini azaltabileceği için uzmanlar tek başına kalsiyum ve demir takviyelerinin gün içinde farklı saatlerde alınmasını öneriyor. Kaynak, etkinin kesin olarak kanıtlanmadığını ve tipik bir diyette bu tür emilim etkilerinin zayıfladığını da belirtiyor. Kaynak belirli bir saat aralığı veya doz eşiği vermiyor; burada da uydurulmuyor.',
    sourceIds: ['ods-iron'],
  },
  {
    id: 'zinc-copper',
    pair: ['cinko', 'bakir'],
    kind: 'conflict',
    condition:
      'Koşullu bağlam: yüksek dozda ve uzun süreli çinko alımı bakır emilimini etkileyebilir; kaynak, orta-yüksek çinko alımında (~60 mg/gün, 10 haftaya kadar) bakır durumu belirteçlerinde düşüş bildirildiğini ve yetişkin üst sınırının 40 mg/gün olduğunu yazıyor. Bu, sizin mevcut kullanımınızın riskli olduğu veya bakır eksikliğiniz olduğu anlamına gelmez; doz ve süre etiketiyle birlikte hekim/eczacı değerlendirmesi gerekir.',
    sourceIds: ['ods-copper'],
  },
  {
    id: 'iron-vitamin-c',
    pair: ['demir', 'c-vitamini'],
    kind: 'synergy',
    condition:
      'C vitamini (askorbik asit), hem olmayan demirin biyoyararlanımını artırabilir; kaynak demir biyoyararlanımını diyetle birlikte değerlendiriyor. Bu bir "güvenli kombinasyon" veya "birlikte alın" onayı değildir: demir ihtiyacı, dozu ve altta yatan durum ayrı değerlendirilir.',
    sourceIds: ['ods-iron'],
  },
  {
    id: 'iron-zinc',
    pair: ['demir', 'cinko'],
    kind: 'conflict',
    condition:
      'Yüksek dozda demir ve çinko, bağırsakta ortak emilim yolunu paylaşabilir ve birbirinin emilimini azaltabilir. Kaynak bu rekabeti genel bir mutabakat düzeyinde belirtir; belirli bir doz eşiği veya saat aralığı vermez. Kesin bir öneri için hekim/eczacı değerlendirmesi gerekir.',
    sourceIds: ['ods-zinc', 'ods-iron'],
  },
  {
    id: 'calcium-magnesium',
    pair: ['kalsiyum', 'magnezyum'],
    kind: 'conflict',
    condition:
      'Çok yüksek dozda kalsiyum, magnezyum emilimini azaltabilir; kaynak, yüksek dozların birlikte alındığında etkileşebileceğini belirtir ancak belirli bir saat aralığı vermez. Tipik diyet dozlarında bu etki zayıftır.',
    sourceIds: ['ods-magnesium'],
  },
  {
    id: 'd3-magnesium',
    pair: ['d3', 'magnezyum'],
    kind: 'synergy',
    condition:
      'Magnezyum, D vitamininin vücutta aktif forma dönüştürülmesi için gerekli bir kofaktördür. Kaynak, magnezyumun D vitamini metabolizmasındaki rolünü belirtir; bu bir doz önerisi veya birlikte alım reçetesi değildir.',
    sourceIds: ['ods-magnesium'],
  },
  {
    id: 'd3-k2',
    pair: ['d3', 'k2'],
    kind: 'synergy',
    condition:
      'D vitamini kalsiyum emilimini artırır; K vitamini (K2) kalsiyumun kemik ve dişlere yönlenmesine katkı sağlayabilir. İkisi de yağda çözünen vitaminlerdir ve sıklıkla birlikte değerlendirilir. Bu bir doz reçetesi değildir; birlikte kullanım hekim/eczacı değerlendirmesiyle olmalıdır.',
    sourceIds: ['ods-vitamin-d'],
  },
  {
    id: 'b12-folat',
    pair: ['b12', 'folat'],
    kind: 'synergy',
    condition:
      'B12 ve folat, homosistein metabolizmasında birlikte çalışır; birinin eksikliği diğerinin işlevini etkileyebilir. Kaynak, B12 ve folat ilişkisini belirtir. Bu bir birlikte alım reçetesi değildir.',
    sourceIds: ['ods-b12'],
  },
]

export const MAX_PAIRS = 6

export interface InteractionReview {
  totalProducts: number
  /** 'insufficient' → 2'den az kayıt: hiçbir çift değerlendirilmedi. */
  status: 'insufficient' | 'reviewed'
  pairs: InteractionPair[]
  /** Kural sınırı nedeniyle gösterilmeyen çift sayısı (şeffaflık). */
  hiddenPairCount: number
  truncated: boolean
  /** Adı bu sınırlı sözlükte tanınmayan kayıtlar — "incelenemeyen". */
  unreviewed: string[]
  unreviewedCount: number
  /** Tanınan ailelerle eşleşen ürün adları (kaç kayıt gerçekten tarandı). */
  recognizedNames: string[]
  /** Kullanıcıya gösterilecek tek satırlık durum mesajı. */
  notice: string
}

function ruleSources(rule: InteractionRule): InteractionSource[] {
  return rule.sourceIds.map(id => SOURCES[id])
}

function ruleFor(a: InteractionFamily, b: InteractionFamily): InteractionRule | undefined {
  return RULES.find(r => {
    const [x, y] = r.pair
    return (x === a && y === b) || (x === b && y === a)
  })
}

/**
 * Envanteri değerlendirir. Saf fonksiyon: aynı girdi → aynı çıktı,
 * yan etki yok, ağ/AI çağrısı yok.
 */
export function reviewSupplements(
  supplements: InteractionInput[],
  options: { maxPairs?: number } = {},
): InteractionReview {
  const maxPairs = Math.max(1, Math.floor(options.maxPairs ?? MAX_PAIRS))
  const items = Array.isArray(supplements) ? supplements.filter(s => s && typeof s.name === 'string') : []
  const totalProducts = items.length

  const familiesByName = items.map(item => recognizeFamilies(item.name))
  const unreviewed: string[] = []
  const recognizedNames: string[] = []
  items.forEach((item, i) => {
    if (familiesByName[i].length === 0) {
      const name = item.name.trim()
      if (name && !unreviewed.includes(name)) unreviewed.push(name)
    } else {
      recognizedNames.push(item.name.trim())
    }
  })

  if (totalProducts < 2) {
    return {
      totalProducts,
      status: 'insufficient',
      pairs: [],
      hiddenPairCount: 0,
      truncated: false,
      unreviewed,
      unreviewedCount: unreviewed.length,
      recognizedNames,
      notice: totalProducts === 0 ? NO_MATCH_MESSAGE : INSUFFICIENT_MESSAGE,
    }
  }

  const found: InteractionPair[] = []
  const seen = new Set<string>()

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      for (const fa of familiesByName[i]) {
        for (const fb of familiesByName[j]) {
          if (fa === fb) continue
          const rule = ruleFor(fa, fb)
          if (!rule) continue
          // Aynı ürün çifti + aynı kural yalnızca bir kez (AB/BA tekrarı yok).
          const key = [rule.id, normalize(items[i].name), normalize(items[j].name)].sort().join('|')
          if (seen.has(key)) continue
          seen.add(key)
          found.push({
            ruleId: rule.id,
            kind: rule.kind,
            label: rule.kind === 'synergy' ? SYNERGY_LABEL : PAIR_LABEL,
            families: [fa, fb],
            products: [items[i].name, items[j].name],
            dosages: [items[i].dosage ?? '', items[j].dosage ?? ''],
            condition: rule.condition,
            sources: ruleSources(rule),
          })
        }
      }
    }
  }

  const hiddenPairCount = Math.max(0, found.length - maxPairs)
  const pairs = found.slice(0, maxPairs)
  const truncated = hiddenPairCount > 0

  let notice: string
  if (pairs.length === 0) {
    notice = NO_MATCH_MESSAGE
  } else if (truncated) {
    notice = `İlk ${pairs.length} olası eşleşme gösteriliyor; ${hiddenPairCount} kayıt çifti bu sınırlı listede gösterilmiyor. ${SCOPE_NOTICE}`
  } else {
    notice = `Bu sınırlı kural listesinde ${pairs.length} olası eşleşme bulundu. ${SCOPE_NOTICE}`
  }

  return {
    totalProducts,
    status: 'reviewed',
    pairs,
    hiddenPairCount,
    truncated,
    unreviewed,
    unreviewedCount: unreviewed.length,
    recognizedNames,
    notice,
  }
}

/** UI'ın kaynak bağlantısı üretirken kullandığı yardımcı. */
export function sourceHref(source: InteractionSource): string {
  return source.url
}
