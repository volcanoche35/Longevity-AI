/**
 * Anatomi bölge katmanı — gövde görseliyle AYNI koordinat uzayı.
 *
 * Neden ayrı dosya: gövde görselleri 896 × 1200 px (ön görünüm, kafa üstü kırpık,
 * kalça hizasında bitiyor). Bölge yolları doğrudan bu piksel uzayında yazılır;
 * sahne `aspect-ratio: 896 / 1200` + `object-fit: contain` kullandığı için SVG
 * viewBox'ı her ekran genişliğinde görselle birebir hizalanır. Yüzde tabanlı
 * "hotspot" noktaları yok — sınır çizen organ/sistem path'leri var.
 *
 * Dürüstlük notları:
 *  - Bu görseller eğitim/stil amaçlı üretilmiş vücut görselleridir; tıbbi atlas
 *    doğruluğu iddiası yoktur. Bölgeler görsel üzerinde yaklaşık işaretler.
 *  - Başın üst kısmı kadraj dışında: beyin GÖRÜNMEZ, bu yüzden 'nervous' sisteminin
 *    bölgesi yoktur; yalnızca açıklama açar (hayali bölge çizilmez).
 *  - Burada kanıt derecesi, sağlık skoru, "fayda/uyarı" iddiası YOKTUR; yalnızca
 *    açıklayıcı anatomi bilgisi bulunur.
 */

export const STAGE_WIDTH = 896
export const STAGE_HEIGHT = 1200

export type AnatomyVariant = 'female' | 'male'
export type SystemId = 'nervous' | 'respiratory' | 'cardiovascular' | 'digestive'
export type RegionId = 'heart' | 'lungs' | 'liver' | 'stomach' | 'intestine'

export interface SystemTone {
  /** buton/başlık için doygun renk */
  solid: string
  /** path dolgusu (hover) */
  fill: string
  /** path dolgusu (sabitlenmiş) */
  fillStrong: string
  /** path çizgisi */
  line: string
}

export interface SystemInfo {
  id: SystemId
  /** buton etiketi — adlandırılmış sistem kontrolü */
  name: string
  /** kısa açıklama satırı */
  summary: string
  /** bölge seçilemediğinde gösterilecek dürüst not */
  note?: string
  tone: SystemTone
  regions: RegionId[]
  /** sistem seviyesinde açıklayıcı bilgi */
  description: string
}

export interface Region {
  id: RegionId
  system: SystemId
  name: string
  description: string
  /** SVG path verileri (896 × 1200 koordinat uzayı) */
  paths: string[]
  /** hover etiketinin sahne içindeki konumu (px) */
  label: { x: number; y: number }
  /** varyant ince ayarı (yoksa boş) */
  transform?: string
}

const TONES: Record<SystemId, SystemTone> = {
  nervous: {
    solid: '#E6EDF8',
    fill: 'rgba(230, 237, 248, 0.10)',
    fillStrong: 'rgba(230, 237, 248, 0.16)',
    line: 'rgba(230, 237, 248, 0.72)',
  },
  respiratory: {
    solid: '#22E1FF',
    fill: 'rgba(34, 225, 255, 0.10)',
    fillStrong: 'rgba(34, 225, 255, 0.16)',
    line: 'rgba(120, 240, 255, 0.78)',
  },
  cardiovascular: {
    solid: '#FF4D5E',
    fill: 'rgba(255, 77, 94, 0.12)',
    fillStrong: 'rgba(255, 77, 94, 0.18)',
    line: 'rgba(255, 140, 148, 0.82)',
  },
  digestive: {
    solid: '#FFB020',
    fill: 'rgba(255, 176, 32, 0.11)',
    fillStrong: 'rgba(255, 176, 32, 0.17)',
    line: 'rgba(255, 200, 120, 0.78)',
  },
}

export const SYSTEMS: readonly SystemInfo[] = [
  {
    id: 'nervous',
    name: 'Sinir',
    summary: 'Beyin, omurilik ve çevresel sinirler',
    tone: TONES.nervous,
    regions: [],
    description:
      'Merkezî sinir sistemi beyin ve omurilikten oluşur; çevresel sinirler duyu ve hareket sinyallerini taşır.',
    note:
      'Bu görselde başın üst kısmı kadraj dışında. Beyin bölgesi görünmediği için sahnede işaretlenemiyor; bu kart yalnızca açıklama amaçlı.',
  },
  {
    id: 'respiratory',
    name: 'Solunum',
    summary: 'Solunum yolları ve akciğerler',
    tone: TONES.respiratory,
    regions: ['lungs'],
    description:
      'Solunum sistemi; üst solunum yolları, trakea, bronşlar ve akciğerlerden oluşur. Gaz alışverişi alveollerde gerçekleşir.',
  },
  {
    id: 'cardiovascular',
    name: 'Dolaşım',
    summary: 'Kalp ve damar ağı',
    tone: TONES.cardiovascular,
    regions: ['heart'],
    description:
      'Kalp, atardamarlar, toplardamarlar ve kılcal damarlar kanı dokulara taşır. Kalp bu dolaşımın pompasıdır.',
  },
  {
    id: 'digestive',
    name: 'Sindirim',
    summary: 'Karaciğer, mide ve bağırsaklar',
    tone: TONES.digestive,
    regions: ['liver', 'stomach', 'intestine'],
    description:
      'Sindirim kanalı ağızdan başlar; mide ile ince ve kalın bağırsaklar besinlerin parçalanması ve emiliminde görev alır. Karaciğer bu sisteme safra verir.',
  },
]

export const SYSTEM_BY_ID: Record<SystemId, SystemInfo> = SYSTEMS.reduce(
  (acc, system) => ({ ...acc, [system.id]: system }),
  {} as Record<SystemId, SystemInfo>,
)

/** Bölge geometrisi — gövde görselleriyle aynı 896 × 1200 çerçeve. */
const GEOMETRY: Record<RegionId, { paths: string[]; label: { x: number; y: number } }> = {
  heart: {
    // kalp merkezi ≈ x %52, y %41 (görseldeki parlak kalp ile hizalı)
    paths: [
      'M 452 400 C 430 414 414 442 412 472 C 410 508 422 546 446 570 C 457 582 473 582 484 570 C 508 546 522 508 522 472 C 522 442 506 414 488 400 C 477 391 462 393 452 400 Z',
    ],
    label: { x: 466, y: 378 },
  },
  lungs: {
    // iki lob: kalbe yer açan mediastinum boşluğu ortada
    paths: [
      'M 400 296 C 380 292 362 310 352 334 C 338 370 332 416 336 460 C 340 502 354 548 376 576 C 388 592 404 588 406 568 C 409 532 410 492 409 450 C 408 400 408 350 406 324 C 404 306 402 298 400 296 Z',
      'M 532 296 C 552 292 570 310 580 334 C 594 370 600 416 596 460 C 592 502 578 548 556 576 C 544 592 528 588 526 568 C 523 532 522 492 523 450 C 524 400 524 350 526 324 C 528 306 530 298 532 296 Z',
    ],
    label: { x: 466, y: 262 },
  },
  liver: {
    paths: [
      'M 328 642 C 336 612 366 598 402 602 C 442 606 470 622 474 646 C 478 670 460 688 430 696 C 396 706 358 700 340 682 C 326 668 322 654 328 642 Z',
    ],
    label: { x: 384, y: 584 },
  },
  stomach: {
    paths: [
      'M 522 602 C 558 598 586 614 590 640 C 594 666 578 688 554 692 C 530 696 510 682 506 660 C 502 638 508 610 522 602 Z',
    ],
    label: { x: 556, y: 584 },
  },
  intestine: {
    paths: [
      'M 356 712 C 420 700 520 700 570 718 C 590 726 590 748 574 756 C 590 766 590 792 570 802 C 588 812 586 840 566 848 C 584 860 578 884 552 890 C 500 902 420 902 372 888 C 346 880 340 856 356 846 C 338 836 338 810 356 802 C 338 792 340 766 356 758 C 338 748 340 722 356 712 Z',
    ],
    label: { x: 462, y: 690 },
  },
}

const REGION_META: Record<RegionId, { name: string; description: string; system: SystemId }> = {
  heart: {
    name: 'Kalp',
    system: 'cardiovascular',
    description:
      'Kalp göğüs boşluğunun ortasında, hafif sola yerleşmiş kas bir pompadır. Sağ tarafı kanı akciğerlere, sol tarafı vücuda pompalar.',
  },
  lungs: {
    name: 'Akciğerler',
    system: 'respiratory',
    description:
      'Sağ akciğer üç, sol akciğer iki lobdan oluşur. Sol akciğer kalbe yer açmak için biraz daha küçüktür.',
  },
  liver: {
    name: 'Karaciğer',
    system: 'digestive',
    description:
      'Karaciğer karnın sağ üst bölümünde, diyaframın hemen altında yer alır. Safra üretimi ve pek çok metabolik işlem burada gerçekleşir.',
  },
  stomach: {
    name: 'Mide',
    system: 'digestive',
    description:
      'Mide, yemek borusu ile onikiparmak bağırsağı arasındaki kas torbasıdır. Asit salgılar ve içeriği mekanik olarak karıştırır.',
  },
  intestine: {
    name: 'Bağırsaklar',
    system: 'digestive',
    description:
      'İnce bağırsak karın boşluğunun merkezinde kıvrımlı biçimde uzanır; kalın bağırsak onu çerçeve gibi sarar. Besin emiliminin büyük bölümü ince bağırsakta olur.',
  },
}

/**
 * Varyant ince ayarı. Eşit tuval boyutu tek başına hizalama kanıtı değildir.
 * Bu asset setinde merkez kalp kırmızısı (x390..550,y390..580 crop, kırmızı ağırlıklı
 * piksel merkezi) erkek (472.1,490.1), kadın (472.1,489.7) ölçüldü. Bu yüzden
 * kalp için ayrıca varyant kaydırması uygulanmadı. Diğer bölgeler açıklayıcı
 * şematik seçim konturlarıdır; klinik segmentasyon veya organ sınırı ölçümü değildir.
 * Yeni asset setleri ayrı görsel kontrol ve yeniden kalibrasyon gerektirir.
 */
const VARIANT_TUNING: Record<AnatomyVariant, Partial<Record<RegionId, { dx: number; dy: number }>>> = {
  female: {},
  male: {},
}

const REGION_IDS: RegionId[] = ['heart', 'lungs', 'liver', 'stomach', 'intestine']

export function getRegions(variant: AnatomyVariant | null): Region[] {
  const tuning = variant ? VARIANT_TUNING[variant] : undefined
  return REGION_IDS.map(id => {
    const meta = REGION_META[id]
    const geometry = GEOMETRY[id]
    const shift = tuning?.[id]
    const transform = shift && (shift.dx || shift.dy)
      ? `translate(${shift.dx} ${shift.dy})`
      : undefined
    return {
      id,
      system: meta.system,
      name: meta.name,
      description: meta.description,
      paths: geometry.paths,
      label: geometry.label,
      transform,
    }
  })
}

export function getRegion(variant: AnatomyVariant | null, id: RegionId | null): Region | null {
  if (!id) return null
  return getRegions(variant).find(region => region.id === id) ?? null
}

/** Görsel yolları: varyant yoksa genel (demo) model. */
export function anatomyAssets(variant: AnatomyVariant | null): { body: string; cardio: string } {
  return variant
    ? { body: `/anatomy/${variant}/body.jpg`, cardio: `/anatomy/${variant}/cardio.jpg` }
    : { body: '/anatomy/body.jpg', cardio: '/anatomy/cardio.jpg' }
}

export function modelLabel(variant: AnatomyVariant | null): string {
  if (variant === 'female') return 'Kadın model'
  if (variant === 'male') return 'Erkek model'
  return 'Demo model'
}

/** Sahne yüzdesi → stil yardımcıları (etiket ve odak halkası için). */
export function toStagePercent(point: { x: number; y: number }): { left: number; top: number } {
  return {
    left: (point.x / STAGE_WIDTH) * 100,
    top: (point.y / STAGE_HEIGHT) * 100,
  }
}
