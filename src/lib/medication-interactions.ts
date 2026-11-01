/**
 * İLAÇ ↔ TAKVİYE ETKİLEŞİM DEĞERLENDİRMESİ (SINIRLI / BOUNDED)
 *
 * Kapsam bilinçli olarak dar: yalnızca burada tanımlı, yaygın ve iyi bilinen
 * birkaç ilaç grubu ile takviyeler arasındaki etkileşimler denetlenir.
 * Serbest metin "kapsamlı ilaç taraması" YAPILMAZ; yalnızca aşağıdaki
 * belirli anahtar kelimeler eşleşir. Bu, güvenlik onayı veya kapsamlı
 * eczacı incelemesi DEĞİLDİR; tıbbi tavsiye değildir.
 *
 * Kaynaklar (genel tıbbi mutabakat + NIH ODS fact sheet'leri) her kuralda
 * alıntı olarak belirtilir. Kaynağı doğrulanmayan çift buraya EKLENMEZ.
 *
 * Ağ/AI çağrısı YOKTUR; çıktı tamamen deterministiktir.
 * DOZAJ ayrıştırılmaz, kişisel risk/doz çıkarımı yapılmaz.
 */

export interface MedicationSupplementNote {
  /** Takviye adında aranacak anahtar kelimeler (küçük harf). */
  match: string[]
  note: string
  source: string
}

export interface MedicationRule {
  id: string
  /** İlaç serbest metninde aranacak anahtar kelimeler (küçük harf). */
  match: string[]
  /** Kullanıcıya gösterilecek ilaç grubu etiketi. */
  label: string
  supplements: MedicationSupplementNote[]
}

export interface MedicationConflict {
  ruleId: string
  medicationLabel: string
  /** Kullanıcının yazdığı ilaç metni (yalnızca eşleşen parça, kırpılmış). */
  medicationText: string
  supplement: string
  note: string
  source: string
}

export const MEDICATION_NOTICE =
  'İlaç etkileşim taraması yalnızca sınırlı bir ilaç listesini denetler; kapsamlı güvenlik onayı değildir. Düzenli ilaç kullanıyorsanız hekim veya eczacıya danışın.'

const RULES: MedicationRule[] = [
  {
    id: 'warfarin',
    match: ['warfarin', 'kumadin', 'coumadin', 'varfarin'],
    label: 'Kan sulandırıcı (warfarin)',
    supplements: [
      { match: ['k vitamini', 'vitamin k', 'k2', 'k1', 'fillokinon', 'menaquinon'], note: 'K vitamini warfarinin pıhtılaşmayı önleyici etkisini azaltabilir. Doz değişikliği gerekebilir; hekime danışmadan K vitamini takviyesi almayın.', source: 'NIH ODS — Vitamin K / Warfarin' },
      { match: ['koenzim q10', 'coq10', 'ubikinon', 'ubikinol'], note: 'Koenzim Q10 yapısal olarak K vitaminine benzer; warfarin etkisini etkileyebilir. Birlikte kullanmadan önce hekime danışın.', source: 'NIH ODS — CoQ10' },
      { match: ["st. john's wort", 'st johns wort', 'kantaron'], note: 'Kantaron warfarin düzeyini düşürerek etkisini azaltabilir.', source: 'NIH NCCIH — St. John’s Wort' },
    ],
  },
  {
    id: 'levothyroxine',
    match: ['levotiroksin', 'levothyroxine', 'euthyrox', 'levotiron', 'tiroid ilaci', 'tiroid ilacı'],
    label: 'Tiroid ilacı (levotiroksin)',
    supplements: [
      { match: ['demir', 'iron', 'ferro', 'ferrous'], note: 'Demir, tiroid ilacının emilimini azaltabilir. En az 4 saat arayla alın.', source: 'NIH ODS — Iron' },
      { match: ['kalsiyum', 'calcium'], note: 'Kalsiyum, tiroid ilacının emilimini azaltabilir. En az 4 saat arayla alın.', source: 'NIH ODS — Calcium' },
      { match: ['magnezyum', 'magnesium'], note: 'Magnezyum, tiroid ilacının emilimini azaltabilir. En az 4 saat arayla alın.', source: 'NIH ODS — Magnesium' },
    ],
  },
  {
    id: 'metformin',
    match: ['metformin', 'glukofen', 'glifor', 'glumetza'],
    label: 'Metformin (diyabet)',
    supplements: [
      { match: ['b12', 'metilkobalamin', 'kobalamin'], note: 'Uzun süreli metformin kullanımı B12 düzeyini düşürebilir; düzeyin takip edilmesi önerilir.', source: 'NIH ODS — Vitamin B12' },
    ],
  },
  {
    id: 'ssri',
    match: ['fluoksetin', 'prozac', 'sertralin', 'essitalopram', 'sitalopram', 'paroksetin', 'fluvoksamin'],
    label: 'Antidepresan (SSRI)',
    supplements: [
      { match: ['5-htp', '5 htp', 'triptofan', 'tryptophan'], note: '5-HTP/triptofan ile birlikte serotonin sendromu riski olabilir. Hekime danışmadan birlikte kullanmayın.', source: 'NIH NCCIH — Serotonin' },
      { match: ["st. john's wort", 'st johns wort', 'kantaron'], note: 'Kantaron SSRI ile birlikte serotonin sendromu riskini artırabilir.', source: 'NIH NCCIH — St. John’s Wort' },
    ],
  },
  {
    id: 'ace-arb',
    match: ['lisinopril', 'ramipril', 'enalapril', 'kaptopril', 'valsartan', 'losartan', 'telmisartan'],
    label: 'Tansiyon ilacı (ACE inhibitörü / ARB)',
    supplements: [
      { match: ['potasyum', 'potassium'], note: 'Yüksek doz potasyum takviyesi, tansiyon ilacıyla birlikte kan potasyumunu tehlikeli düzeye çıkarabilir (hiperkalemi). Hekime danışın.', source: 'NIH ODS — Potassium' },
    ],
  },
  {
    id: 'statin',
    match: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin', 'krestor', 'lipitor'],
    label: 'Kolesterol ilacı (statin)',
    supplements: [
      { match: ['koenzim q10', 'coq10', 'ubikinon', 'ubikinol'], note: 'Statinler vücuttaki Koenzim Q10 düzeyini düşürebilir; bazıları takviyeyi değerlendirir. Hekim/eczacıya danışın.', source: 'NIH ODS — CoQ10' },
    ],
  },
  {
    id: 'antidiabetic',
    match: ['insülin', 'insulin', 'gliklazid', 'glipizid', 'glibenklamid', 'glimepirid'],
    label: 'Diyabet ilacı (insülin / sülfonilüre)',
    supplements: [
      { match: ['berberin', 'berberine'], note: 'Berberin kan şekerini düşürebilir; diyabet ilacıyla birlikte hipoglisemi riski olabilir. Hekime danışın.', source: 'NIH NCCIH — Berberine' },
      { match: ['krom', 'chromium'], note: 'Krom kan şekerini etkileyebilir; birlikte kullanımda takip gerekebilir.', source: 'NIH ODS — Chromium' },
    ],
  },
  {
    id: 'diuretic',
    match: ['furosemid', 'hidroklorotiyazid', 'indapamid', 'klortalidon', 'spironolakton'],
    label: 'İdrar söktürücü (diüretik)',
    supplements: [
      { match: ['potasyum', 'potassium'], note: 'Diüretiklerle birlikte potasyum takviyesi kan potasyumunu etkileyebilir; hekim takibi gerekir.', source: 'NIH ODS — Potassium' },
      { match: ['magnezyum', 'magnesium'], note: 'Bazı diüretikler magnezyum kaybını artırabilir; hekim takibi gerekir.', source: 'NIH ODS — Magnesium' },
    ],
  },
]

/** Türkçe karakter + noktalama toleranslı normalize. */
function normalize(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Kullanıcının ilaç metni ile envanterindeki takviyeleri karşılaştırır.
 * Deterministik; ağ/AI yok. Eşleşme yoksa boş dizi döner.
 */
export function reviewMedications(
  medicationsText: string,
  supplementNames: string[],
): MedicationConflict[] {
  const medText = normalize(medicationsText || '')
  if (!medText) return []

  const names = (Array.isArray(supplementNames) ? supplementNames : []).filter(
    (n): n is string => typeof n === 'string' && n.trim().length > 0,
  )
  if (names.length === 0) return []

  const out: MedicationConflict[] = []
  const seen = new Set<string>()

  for (const rule of RULES) {
    const matchedKeyword = rule.match.find(k => medText.includes(k))
    if (!matchedKeyword) continue
    for (const name of names) {
      const n = normalize(name)
      for (const sup of rule.supplements) {
        if (!sup.match.some(k => n.includes(k))) continue
        const key = [rule.id, name].join('|')
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
          ruleId: rule.id,
          medicationLabel: rule.label,
          medicationText: matchedKeyword,
          supplement: name.trim(),
          note: sup.note,
          source: sup.source,
        })
      }
    }
  }

  return out
}
