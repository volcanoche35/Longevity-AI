/**
 * BioTrack bilgi çekirdeği (demo/fider katmanı).
 * Kanıt derecesi: A = güçlü insan kanıtı · B = olası fayda · C = zayıt/karmaşık
 * Amaç: AI'a gerçek bağlam vermek + arayüzde "kanıt rozeti" göstermek.
 */

export type EvidenceGrade = 'A' | 'B' | 'C'

export interface KnowledgeEntry {
  name: string
  icon: string
  grade: EvidenceGrade
  gradeLabel: string
  typicalDose: string
  timing: string
  withFood: boolean
  benefits: string[]
  avoidWith: string[]
  note: string
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    name: 'Vitamin D3 + K2', icon: '☀️', grade: 'A', gradeLabel: 'Güçlü kanıt',
    typicalDose: '1000–4000 IU/gün', timing: 'Sabah', withFood: true,
    benefits: ['Kan düzeyi düşükse eksikliği giderir', 'Kemik metabolizması', 'K2 → kalsiyumun damara değil kemiğe yönlendirilmesi'],
    avoidWith: [],
    note: 'Doz, 25-OH-D kan değerine göre ayarlanmalı. Değer bilmeden yüksek doz risklidir.',
  },
  {
    name: 'Magnezyum Glisinat', icon: '⚡', grade: 'B', gradeLabel: 'Olası fayda',
    typicalDose: '200–400 mg elementel', timing: 'Akşam/Gece', withFood: false,
    benefits: ['Uyku kalitesi (küçük ama tutarlı etki)', 'Kas/kramip', 'Yorgunluk'],
    avoidWith: ['Demir (aynı saatte alınmasın, emilim yarışır)', 'Kalsiyum (yüksek dozda yarış)'],
    note: 'Oksit formunun emilimi düşük; glisinat/sitrat tercih edilir. Böbrek hastalığında doktora sor.',
  },
  {
    name: 'Kreatin Monohidrat', icon: '💪', grade: 'A', gradeLabel: 'Güçlü kanıt',
    typicalDose: '3–5 g/gün', timing: 'Her saat', withFood: false,
    benefits: ['Güç ve kas kütlesi', 'Muhtemel bilişsel fayda (uyku yoksunluğunda)'],
    avoidWith: [],
    note: 'Yüklenmeye gerek yok. Su içmeyi artır. Böbrek hastalığında doktora danış.',
  },
  {
    name: 'Omega-3 (EPA/DHA)', icon: '🐟', grade: 'B', gradeLabel: 'Olası fayda',
    typicalDose: '1–2 g EPA+DHA', timing: 'Sabah', withFood: true,
    benefits: ['Trigliserid düşüşü (A seviye)', 'İltihap belirteçleri'],
    avoidWith: ['Kan sulandırıcı ilaçlar (doktora sor)'],
    note: 'Kalp krizi "önler" iddiası kanıtla tam desteklenmiyor; trigliserid etkisi net.',
  },
  {
    name: 'Çinko', icon: '🛡️', grade: 'B', gradeLabel: 'Olası fayda',
    typicalDose: '15–30 mg/gün', timing: 'Akşam', withFood: false,
    benefits: ['Eksiklikte bağışıklık', 'Cilt/yara'],
    avoidWith: ['Demir', 'Kalsiyum', 'Uzun süre yüksek doz → bakır eksikliği'],
    note: 'Aç karnına bulantı yapabilir. 40 mg üstü uzun vadeli önerilmez.',
  },
  {
    name: 'Vitamin B12', icon: '🧠', grade: 'A', gradeLabel: 'Güçlü kanıt',
    typicalDose: '250–1000 µg (vegan: mutlaka)', timing: 'Sabah', withFood: false,
    benefits: ['Vejetaryen/vegan ve metformin kullananında eksiklik önleme'],
    avoidWith: [],
    note: 'Düzeyi yüksekse eklemenin anlamı yok. Kan değeriyle bak.',
  },
  {
    name: 'Ashwagandha', icon: '🌿', grade: 'C', gradeLabel: 'Zayıf/karmaşık',
    typicalDose: '300–600 mg ekstre', timing: 'Akşam', withFood: false,
    benefits: ['Kısa vadeli stres/skor azalması'],
    avoidWith: ['Tiroid ilaçları (düzeyi etkileyebilir)', 'Sedatifler', 'Hamilelik'],
    note: 'Çoğu çalışma üretici destekli ve kısa süreli. Karaciğer hasarı bildirimleri var. Uzun vadeli güvenlik bilinmiyor.',
  },
  {
    name: 'Kolajen', icon: '✨', grade: 'C', gradeLabel: 'Zayıf/karmaşık',
    typicalDose: '5–10 g/gün', timing: 'Her saat', withFood: false,
    benefits: ['Cilt elastikiyeti ve eklem için sınırlı olumlu sinyaller'],
    avoidWith: [],
    note: 'Ağızdan alınan kolajen amino asitlere parçalanır; "doğrudan deriye gider" iddiası zayıf. Çalışmalar genelde üretici destekli.',
  },
  {
    name: 'Melatonin', icon: '🌙', grade: 'B', gradeLabel: 'Olası fayda',
    typicalDose: '0,3–1 mg (düşük başla)', timing: 'Yatmadan 1-2 saat önce', withFood: false,
    benefits: ['Uykuya dalış süresi', 'Jet-lag / vardiya kayması'],
    avoidWith: ['Alkol', 'Sedatifler'],
    note: 'Türkiye\'de 3 mg üzeri satış rejimi farklı; düşük doz çoğu kişi için yeterli. Uyku hijyeni yerine geçmez.',
  },
  {
    name: 'CoQ10', icon: '❤️', grade: 'B', gradeLabel: 'Olası fayda',
    typicalDose: '100–200 mg', timing: 'Sabah', withFood: true,
    benefits: ['Statin kaynaklı kas ağrısında olası fayda', 'Yaşla düşen düzeyi yerine koyma'],
    avoidWith: ['Warfarin (INR\'ı etkileyebilir)'],
    note: 'Ubiquinol formu daha iyi emilir. Kalp krizi önleme iddiası kurulmaz.',
  },
]

export const NAME_LOOKUP: Record<string, KnowledgeEntry> = Object.fromEntries(
  KNOWLEDGE.map(k => [k.name.toLowerCase(), k]),
)

/** İsim benzerliğinden eşleştirme (kullanıcı "Magnezyum" yazınca "Magnezyum Glisinat" bulunur) */
export function findKnowledge(query: string): KnowledgeEntry | undefined {
  const q = query.toLowerCase().trim()
  if (!q) return undefined
  if (NAME_LOOKUP[q]) return NAME_LOOKUP[q]
  return KNOWLEDGE.find(k => k.name.toLowerCase().includes(q) || q.includes(k.name.toLowerCase().split(' ')[0]))
}

/** AI sistem talimatına gömülen, takviyelere özel etkileşim/kanıt özeti */
export function buildKnowledgeContext(supplements: string[]): string {
  if (!supplements.length) return ''
  const lines: string[] = []
  for (const s of supplements) {
    const k = findKnowledge(s)
    if (!k) continue
    lines.push(
      `- ${k.name} [kanıt ${k.grade}: ${k.gradeLabel}] — tipik doz ${k.typicalDose}, ${k.timing}` +
        (k.withFood ? ', tok karnına' : '') +
        (k.avoidWith.length ? `, birlikte alınmaması gerekenler: ${k.avoidWith.join(', ')}` : '') +
        `. Not: ${k.note}`,
    )
  }
  return lines.length ? `\n\nBilgi tabanımız (kaynak olarak kullan, uymuyorsa uydurma):\n${lines.join('\n')}` : ''
}
