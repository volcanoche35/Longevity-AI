/**
 * TAKVİYE KULLANIM ÖNERİLERİ — bilgi amaçlı.
 *
 * Her takviye için yaygın, düşük tartışmalı kullanım önerileri: en uygun
 * zamanlama, yiyecek eşleşmesi, sinerji (birlikte iyi giden) ve dikkat notu.
 *
 * ÖNEMLİ: Tıbbi tavsiye DEĞİLDİR. Kişisel doz/endikasyon vermez. Kaynaklar
 * genel tıbbi mutabakat + NIH ODS düzeyindedir.
 *
 * Eşleşme: takviye adında (küçük harf, Türkçe karakter toleranslı) anahtar
 * kelime aramasıyla yapılır. Eşleşme yoksa öneri üretilmez.
 */

export interface UsageRecommendation {
  /** Takviye adında aranacak anahtar kelimeler (küçük harf). */
  match: string[]
  /** Takviyenin tanındığı aile/grup etiketi. */
  label: string
  /** En uygun zamanlama. */
  timing: string
  /** Yiyecek eşleşmesi (birlikte/ayrı alma). */
  food: string
  /** Sinerji — birlikte iyi giden diğer takviyeler. */
  synergy: string[]
  /** Dikkat / kaçınılması gereken. */
  caution: string
  source: string
}

function norm(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export const RECOMMENDATIONS: UsageRecommendation[] = [
  {
    match: ['demir', 'iron', 'ferro', 'ferrous', 'ferrik', 'ferric'],
    label: 'Demir',
    timing: 'Aç karnına (veya hafif bir öğünle) almak emilimi artırır; mide rahatsızlığı olursa yemekle alın.',
    food: 'C vitaminiyle birlikte al; kahve/çay ve süt ürünlerinden 1–2 saat ayrı tut.',
    synergy: ['C vitamini'],
    caution: 'Kalsiyum ve çinko ile aynı anda almaktan kaçın.',
    source: 'NIH ODS — Iron',
  },
  {
    match: ['kalsiyum', 'calcium'],
    label: 'Kalsiyum',
    timing: 'Günlük dozu ikiye bölerek almak emilimi artırır (tek seferde ~500 mg üstü verim düşer).',
    food: 'Yemekle birlikte alınabilir.',
    synergy: ['D3', 'K2'],
    caution: 'Demir ve çinko ile aynı anda almaktan kaçın.',
    source: 'NIH ODS — Calcium',
  },
  {
    match: ['d vitamini', 'vitamin d', 'd3', 'kolekalsiferol', 'cholecalciferol'],
    label: 'D3 vitamini',
    timing: 'Sabah veya gün ortası; yağda çözündüğü için en büyük öğünle.',
    food: 'Yağlı bir öğünle al; emilim belirgin artar.',
    synergy: ['K2', 'Magnezyum'],
    caution: 'Çok yüksek dozda uzun süre kullanmaktan kaçının; düzey takibi önerilir.',
    source: 'NIH ODS — Vitamin D',
  },
  {
    match: ['k2', 'menaquinon', 'menakinon', 'k vitamini', 'vitamin k', 'mk-7', 'mk7'],
    label: 'K2 vitamini',
    timing: 'Yağda çözünür; en büyük öğünle alınabilir.',
    food: 'Yağlı öğünle al.',
    synergy: ['D3'],
    caution: 'Kan sulandırıcı (warfarin) kullanıyorsanız hekime danışmadan almayın.',
    source: 'NIH ODS — Vitamin K',
  },
  {
    match: ['magnezyum', 'magnesium'],
    label: 'Magnezyum',
    timing: 'Akşam almak gevşemeye ve uykuya yardımcı olabilir; gün içinde de alınabilir.',
    food: 'Yemekle birlikte alınabilir (mide rahatsızlığını azaltır).',
    synergy: ['D3'],
    caution: 'Çok yüksek dozda kalsiyumla aynı anda almaktan kaçının.',
    source: 'NIH ODS — Magnesium',
  },
  {
    match: ['cinko', 'zinc'],
    label: 'Çinko',
    timing: 'Aç karnına veya hafif öğünle; kahve/çaydan ayrı.',
    food: 'Bakır emilimini etkileyebilir; uzun süreli yüksek dozda bakır takviyesi değerlendirilebilir.',
    synergy: ['Bakır (uzun süreli kullanımda)'],
    caution: 'Demir ve yüksek doz kalsiyumla aynı anda almaktan kaçının.',
    source: 'NIH ODS — Zinc',
  },
  {
    match: ['c vitamini', 'vitamin c', 'askorbik asit', 'ascorbic acid'],
    label: 'C vitamini',
    timing: 'Günün herhangi bir saati; suda çözünür.',
    food: 'Demirle birlikte almak demir emilimini artırır.',
    synergy: ['Demir'],
    caution: 'Yüksek dozda mide hassasiyeti yapabilir; öğünle alınabilir.',
    source: 'NIH ODS — Vitamin C',
  },
  {
    match: ['b12', 'kobalamin', 'cobalamin', 'b kompleks', 'b-kompleks', 'b vitamini', 'b6'],
    label: 'B vitaminleri',
    timing: 'Sabah veya öğlen almak genelde daha iyi; geç saatte bazılarında uykuyu etkileyebilir.',
    food: 'Yemekle birlikte alınabilir.',
    synergy: ['Folat'],
    caution: 'Uzun süreli metformin kullananlarda B12 düzeyi takip edilmeli.',
    source: 'NIH ODS — Vitamin B12',
  },
  {
    match: ['folat', 'folate', 'folik asit', 'folic acid', 'b9', 'metilfolat', 'methylfolate'],
    label: 'Folat (B9)',
    timing: 'Günün herhangi bir saati.',
    food: 'Yemekle birlikte alınabilir.',
    synergy: ['B12'],
    caution: 'Yüksek dozda uzun süre kullanmadan önce B12 düzeyini kontrol ettirin.',
    source: 'NIH ODS — Folate',
  },
  {
    match: ['omega-3', 'omega 3', 'balık yağı', 'balik yagi', 'fish oil', 'epa', 'dha'],
    label: 'Omega-3',
    timing: 'En büyük öğünle; günün herhangi bir saati.',
    food: 'Yağlı öğünle al; emilim artar, balıksı geğirme azalır.',
    synergy: ['E vitamini (antioksidan denge)'],
    caution: 'Kan sulandırıcı kullanıyorsanız hekime danışın.',
    source: 'NIH ODS — Omega-3',
  },
  {
    match: ['koenzim q10', 'coq10', 'ubikinon', 'ubikinol', 'ubiquinone', 'ubiquinol'],
    label: 'Koenzim Q10',
    timing: 'Sabah; yağda çözündüğü için öğünle.',
    food: 'Yağlı öğünle al.',
    synergy: ['Omega-3'],
    caution: 'Statin kullananlarda düzeyi düşebilir; hekim/eczacıya danışın.',
    source: 'NIH ODS — CoQ10',
  },
  {
    match: ['kreatin', 'creatine'],
    label: 'Kreatin',
    timing: 'Günün her saati olur; düzenlilik önemli.',
    food: 'Bol su ile al.',
    synergy: ['Karbonhidrat (alımda hafif destek)'],
    caution: 'Böbrek rahatsızlığında hekime danışın.',
    source: 'ISSN pozisyonu',
  },
  {
    match: ['probiyotik', 'probiotic'],
    label: 'Probiyotik',
    timing: 'Etikete göre aç veya tok; tutarlı saatte almak faydalı.',
    food: 'Etiketteki yönergeye uyun.',
    synergy: ['Prebiyotik lif'],
    caution: 'Bağışıklığı baskılanmış kişilerde hekime danışın.',
    source: 'Genel mutabakat',
  },
  {
    match: ['melatonin'],
    label: 'Melatonin',
    timing: 'Yalnızca akşam, uykudan 30–60 dk önce; gündüz alınmaz.',
    food: 'Yiyecekle alınması gerekmez.',
    synergy: ['Magnezyum'],
    caution: 'Düzenli ilaç kullananlar hekime danışmalı.',
    source: 'NIH ODS — Melatonin',
  },
]

/** Bir ada göre kullanım önerisini döndürür; eşleşme yoksa null. */
export function recommendationFor(name: string): UsageRecommendation | null {
  const n = norm(name)
  if (!n) return null
  for (const rec of RECOMMENDATIONS) {
    if (rec.match.some(k => n.includes(k))) return rec
  }
  return null
}

/** Birden çok ad için önerileri (tanınanları) döndürür, tekrar etmeden. */
export function recommendationsFor(names: string[]): { name: string; rec: UsageRecommendation }[] {
  const out: { name: string; rec: UsageRecommendation }[] = []
  const seenLabel = new Set<string>()
  for (const name of names) {
    const rec = recommendationFor(name)
    if (!rec || seenLabel.has(rec.label)) continue
    seenLabel.add(rec.label)
    out.push({ name: name.trim(), rec })
  }
  return out
}
