/**
 * LongevityAI anatomi verisi — katmanlı sistem.
 *
 * Neden katmanlı: her AI katmanı kendi koordinat sisteminde üretiliyor ve
 * gövdeye ölçeklenmiyor. Katmanlar `screen` blend ile bindirildiği için siyah
 * zemin kaybolur, parlaklık toplanır. Sindirim katmanı transform ile karın
 * bölgesine sabitlenir (organ merkezleri bu transform'a göre hesaplandı).
 */

export type LayerId = 'body' | 'cardio' | 'digestive'

export interface AnatomyLayer {
  id: LayerId
  label: string
  src: string
  color: string
  /** katmanın görsel alanı içindeki konumu (%). varsayılan: tam kare */
  box: { left: number; top: number; width: number; height: number }
}

export const LAYERS: AnatomyLayer[] = [
  {
    id: 'body', label: 'Gövde', src: '/anatomy/body.webp', color: '#8fb0d0',
    box: { left: 0, top: 0, width: 100, height: 100 },
  },
  {
    id: 'cardio', label: 'Kardiyovasküler', src: '/anatomy/cardio.webp', color: '#eb5324',
    box: { left: 0, top: 0, width: 100, height: 100 },
  },
  {
    id: 'digestive', label: 'Sindirim', src: '/anatomy/digestive.webp', color: '#f3a257',
    // karın boşluğuna sabitlendi: üstü diyafram altı, altı kasık üstü
    box: { left: 27, top: 43, width: 46, height: 40 },
  },
]

export interface Organ {
  id: string
  name: string
  icon: string
  layer: Exclude<LayerId, 'body'> | 'body'
  /** katmanın KENDİ görsel alanı içindeki yüzde (0-100) */
  x: number
  y: number
  blurb: string
  /** kanıt derecesi A/B/C — knowledge.ts ile tutarlı */
  grade: 'A' | 'B' | 'C'
  supplements: { name: string; grade: 'A' | 'B' | 'C' }[]
  avoid?: string[]
}

export const ORGANS: Organ[] = [
  {
    id: 'brain', name: 'Beyin', icon: '🧠', layer: 'cardio', x: 50, y: 3,
    blurb: 'Bilişsel performans ve nöroproteksiyon.', grade: 'B',
    supplements: [
      { name: 'Omega-3 (EPA/DHA)', grade: 'B' },
      { name: 'Vitamin B12', grade: 'A' },
      { name: 'Kreatin Monohidrat', grade: 'B' },
    ],
    avoid: ['Alkol ile birlikte uyku baskılanması'],
  },
  {
    id: 'heart', name: 'Kalp', icon: '❤️', layer: 'cardio', x: 50, y: 40,
    blurb: 'Kardiyovasküler sistem — damar ağı ve kalp.', grade: 'A',
    supplements: [
      { name: 'Omega-3 (EPA/DHA)', grade: 'B' },
      { name: 'CoQ10', grade: 'B' },
      { name: 'Magnezyum Glisinat', grade: 'B' },
      { name: 'Vitamin D3 + K2', grade: 'A' },
    ],
    avoid: ['Warfarin + CoQ10 (INR etkileşimi)'],
  },
  {
    id: 'lungs', name: 'Akciğerler', icon: '🫁', layer: 'cardio', x: 50, y: 27,
    blurb: 'Oksijen taşınması ve iltihap dengesi.', grade: 'C',
    supplements: [{ name: 'Omega-3 (EPA/DHA)', grade: 'C' }],
  },
  {
    id: 'muscle', name: 'Kas & Performans', icon: '💪', layer: 'body', x: 22, y: 52,
    blurb: 'Kas kütlesi, güç ve toparlanma.', grade: 'A',
    supplements: [
      { name: 'Kreatin Monohidrat', grade: 'A' },
      { name: 'Magnezyum Glisinat', grade: 'B' },
      { name: 'Kolajen', grade: 'C' },
    ],
  },
  {
    id: 'bones', name: 'Kemik & Eklem', icon: '🦴', layer: 'body', x: 50, y: 33,
    blurb: 'Kemik mineral yoğunluğu ve eklem sağlığı.', grade: 'A',
    supplements: [
      { name: 'Vitamin D3 + K2', grade: 'A' },
      { name: 'Magnezyum Glisinat', grade: 'B' },
      { name: 'Kolajen', grade: 'C' },
    ],
    avoid: ['Kalsiyum + Magnezyum aynı saatte (emilim yarışı)'],
  },
  {
    id: 'liver', name: 'Karaciğer', icon: '🫘', layer: 'digestive', x: 30, y: 16,
    blurb: 'Detoksifikasyon değil — metabolizma merkezi.', grade: 'B',
    supplements: [{ name: 'Omega-3 (EPA/DHA)', grade: 'B' }],
    avoid: ['Ashwagandha: karaciğer hasarı bildirimleri var'],
  },
  {
    id: 'stomach', name: 'Mide', icon: '🫗', layer: 'digestive', x: 64, y: 20,
    blurb: 'Sindirim ve emilim ortamı.', grade: 'B',
    supplements: [{ name: 'Çinko', grade: 'B' }],
    avoid: ['Çinko aç karnına bulantı yapabilir'],
  },
  {
    id: 'intestine', name: 'İnce Bağırsak', icon: '🌀', layer: 'digestive', x: 50, y: 50,
    blurb: 'Mikrobiyota ve besin emilimi.', grade: 'B',
    supplements: [
      { name: 'Vitamin D3 + K2', grade: 'A' },
      { name: 'Magnezyum Glisinat', grade: 'B' },
    ],
  },
  {
    id: 'colon', name: 'Kalın Bağırsak', icon: '', layer: 'digestive', x: 50, y: 72,
    blurb: 'Lif fermentasyonu ve bariyer bütünlüğü.', grade: 'B',
    supplements: [{ name: 'Omega-3 (EPA/DHA)', grade: 'C' }],
  },
  {
    id: 'kidneys', name: 'Böbrekler', icon: '🫘', layer: 'digestive', x: 50, y: 34,
    blurb: 'Filtrasyon ve elektrolit dengesi.', grade: 'B',
    supplements: [
      { name: 'Magnezyum Glisinat', grade: 'B' },
      { name: 'Kreatin Monohidrat', grade: 'A' },
    ],
    avoid: ['Böbrek hastalığında magnezyum ve kreatin hekim onayı ister'],
  },
  {
    id: 'thyroid', name: 'Tiroit', icon: '🦋', layer: 'body', x: 50, y: 15,
    blurb: 'Metabolizma hızı ve hormon dengesi.', grade: 'B',
    supplements: [
      { name: 'Çinko', grade: 'B' },
      { name: 'Vitamin B12', grade: 'A' },
    ],
    avoid: ['Ashwagandha tiroid düzeylerini etkileyebilir'],
  },
  {
    id: 'sleep', name: 'Uyku & Sinir', icon: '🌙', layer: 'body', x: 50, y: 6,
    blurb: 'Uyku latensi ve sinir sistemi sakinliği.', grade: 'B',
    supplements: [
      { name: 'Melatonin', grade: 'B' },
      { name: 'Magnezyum Glisinat', grade: 'B' },
      { name: 'Ashwagandha', grade: 'C' },
    ],
    avoid: ['Melatonin + alkol/sedatif'],
  },
]

/** organ merkezini ekran yüzdesine çevir (katman box'ı içinde) */
export function toStagePercent(organ: Organ): { left: number; top: number } {
  const layer = LAYERS.find(l => l.id === organ.layer) ?? LAYERS[0]
  return {
    left: layer.box.left + (organ.x / 100) * layer.box.width,
    top: layer.box.top + (organ.y / 100) * layer.box.height,
  }
}

export const GRADE_LABEL: Record<'A' | 'B' | 'C', string> = {
  A: 'Güçlü kanıt', B: 'Olası fayda', C: 'Zayıf/karmaşık',
}
