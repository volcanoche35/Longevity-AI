/**
 * Takviye "birlikte kullanım / etkileşim" notları — bilgi amaçlı.
 *
 * ÖNEMLİ: Bu tablo tıbbi tavsiye DEĞİLDİR. Yalnızca yaygın, iyi bilinen
 * (düşük tartışmalı) etkileşimleri içerir; kişisel doz reçetesi vermez.
 * Kaynaklar genel tıbbi mutabakat düzeyindedir (NIH ODS, Linus Pauling
 * Institute, ulusal sağlık otoriteleri). Şüpheli durumda hekime danışılmalı.
 *
 * Eşleşme: takviye adında (küçük harf) geçen anahtar kelimeyle yapılır.
 */

export type InteractionKind = 'conflict' | 'timing' | 'food' | 'avoid'

export interface InteractionNote {
  kind: InteractionKind
  text: string
  source: string
}

export interface SupplementInteraction {
  /** Takviye adında aranacak anahtar kelimeler (küçük harf). */
  match: string[]
  notes: InteractionNote[]
}

export const INTERACTIONS: SupplementInteraction[] = [
  {
    match: ['demir', 'iron', 'ferro', 'ferrous'],
    notes: [
      { kind: 'conflict', text: 'Kalsiyum veya çinko ile aynı anda alma; aynı emilim yolunu kullanırlar.', source: 'NIH ODS — Iron' },
      { kind: 'avoid', text: 'Kahve/çaydan 1–2 saat ayrı al; tanenler emilimi belirgin azaltır.', source: 'Linus Pauling Institute' },
      { kind: 'food', text: 'C vitaminiyle birlikte almak emilimi artırır (örn. portakal suyu).', source: 'NIH ODS — Iron' },
    ],
  },
  {
    match: ['kalsiyum', 'calcium'],
    notes: [
      { kind: 'conflict', text: 'Demir veya çinko ile aynı anda alma; emilim rekabeti oluşur.', source: 'NIH ODS — Calcium' },
      { kind: 'conflict', text: 'Yüksek doz magnezyumla aynı anda almaktan kaçın; ayrı zamanlara böl.', source: 'NIH ODS' },
    ],
  },
  {
    match: ['çinko', 'zinc'],
    notes: [
      { kind: 'conflict', text: 'Demir veya yüksek doz kalsiyumla aynı anda alma.', source: 'NIH ODS — Zinc' },
      { kind: 'avoid', text: 'Kahve/çaydan ayrı al; tanenler emilimi azaltır.', source: 'Linus Pauling Institute' },
    ],
  },
  {
    match: ['magnezyum', 'magnesium'],
    notes: [
      { kind: 'conflict', text: 'Yüksek doz kalsiyumla aynı anda almaktan kaçın; öğünlere böl.', source: 'NIH ODS — Magnesium' },
      { kind: 'timing', text: 'Akşam almak gevşemeye ve uykuya yardımcı olabilir.', source: 'Genel mutabakat' },
    ],
  },
  {
    match: ['d vitamini', 'd3', 'vitamin d', 'vitamin d3', 'kolekalsiferol'],
    notes: [
      { kind: 'food', text: 'Yağlı bir öğünle al; yağda çözünür, emilim artar.', source: 'NIH ODS — Vitamin D' },
      { kind: 'timing', text: 'Kalsiyumla birlikte alınması emilime yardımcı olur; ikisi de yağlı öğünle.', source: 'NIH ODS' },
    ],
  },
  {
    match: ['a vitamini', 'e vitamini', 'k vitamini', 'vitamin a', 'vitamin e', 'vitamin k'],
    notes: [
      { kind: 'food', text: 'Yağda çözünür; yağlı bir öğünle al, emilim artar.', source: 'NIH ODS' },
    ],
  },
  {
    match: ['b12', 'b6', 'b kompleks', 'b-kompleks', 'b vitamini'],
    notes: [
      { kind: 'timing', text: 'Sabah/öğlen almak genelde daha iyi; geç saatte bazılarında uykuyu etkileyebilir.', source: 'Genel mutabakat' },
    ],
  },
  {
    match: ['omega-3', 'omega 3', 'balık yağı', 'fish oil', 'epa', 'dha'],
    notes: [
      { kind: 'food', text: 'Yağlı öğünle al; emilim artar, mide rahatsızlığı azalır.', source: 'Genel mutabakat' },
    ],
  },
  {
    match: ['melatonin'],
    notes: [
      { kind: 'timing', text: 'Yalnızca akşam, uykudan 30–60 dk önce al; gündüz alınmaz.', source: 'NIH ODS — Melatonin' },
    ],
  },
  {
    match: ['kafein', 'yeşil çay', 'green tea', 'guarana', 'matcha'],
    notes: [
      { kind: 'timing', text: 'Geç saatte alma; uykuyu kaçırabilir.', source: 'Genel mutabakat' },
    ],
  },
  {
    match: ['probiyotik', 'probiotic'],
    notes: [
      { kind: 'timing', text: 'Etikete göre aç veya tok karnına; tutarlı saatte almak faydalı.', source: 'Genel mutabakat' },
    ],
  },
  {
    match: ['kreatin', 'creatine'],
    notes: [
      { kind: 'food', text: 'Bol su ile al; günün her saati olur, düzenli kullanım önemli.', source: 'ISSN pozisyonu' },
    ],
  },
]

/** Bir ada göre eşleşen etkileşim notlarını döndürür. */
export function interactionsFor(name: string): InteractionNote[] {
  const n = name.toLocaleLowerCase('tr-TR')
  const out: InteractionNote[] = []
  for (const item of INTERACTIONS) {
    if (item.match.some(k => n.includes(k))) out.push(...item.notes)
  }
  return out
}
