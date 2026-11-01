/**
 * src/lib/interaction-review.ts sözleşme testleri.
 * Çalıştırma: node scripts/test-interaction-review.cjs
 * Ağ/AI çağrısı yok; yalnız saf fonksiyon davranışı doğrulanır.
 */
const fs = require('node:fs')
const ts = require('typescript')
const assert = require('node:assert/strict')

const source = fs.readFileSync('src/lib/interaction-review.ts', 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const mod = { exports: {} }
new Function('module', 'exports', output)(mod, mod.exports)
const {
  reviewSupplements, recognizeFamily, recognizeFamilies, SOURCES, RULES,
  NO_MATCH_MESSAGE, INSUFFICIENT_MESSAGE, SCOPE_NOTICE, DRUG_NOTICE,
  MAX_PAIRS, PAIR_LABEL,
} = mod.exports

const s = (name, dosage) => (dosage === undefined ? { name } : { name, dosage })
let checks = 0
const ok = cond => { assert.ok(cond); checks++ }

// ── 1. Kaynak kimlikleri gerçek ve https ────────────────────────────────
for (const id of Object.keys(SOURCES)) {
  const src = SOURCES[id]
  ok(src.id === id)
  ok(/^https:\/\/ods\.od\.nih\.gov\/factsheets\//.test(src.url))
}
for (const rule of RULES) {
  ok(rule.sourceIds.length >= 1)
  for (const id of rule.sourceIds) ok(Boolean(SOURCES[id]))
}
ok(RULES.length >= 2)
ok(PAIR_LABEL === 'Kaynaklı olası etkileşim')

// ── 2. Kalsiyum + demir: koşul var, uydurulmuş saat aralığı yok ─────────
const ci = reviewSupplements([s('Demir Bisglisinat', '25 mg'), s('Kalsiyum Sitrat', '500 mg')])
ok(ci.pairs.length === 1)
const ciPair = ci.pairs[0]
ok(ciPair.ruleId === 'calcium-iron')
ok(ciPair.label === 'Kaynaklı olası etkileşim')
ok(/emilim/i.test(ciPair.condition))
ok(/farklı saatlerde/i.test(ciPair.condition))
ok(!/\d+\s*saat|iki saat|2 saat/i.test(ciPair.condition)) // kaynak saat aralığı vermiyor → uydurma yok
ok(/kesin olarak kanıtlanmadığını/i.test(ciPair.condition))  // kaynağın sınırlaması
ok(!/%|yüzde/i.test(ciPair.condition))
ok(ciPair.sources.length === 1 && ciPair.sources[0].id === 'ods-iron')
ok(ciPair.dosages[0] === '25 mg' && ciPair.dosages[1] === '500 mg')

// ── 3. Çinko + bakır: koşullu bağlam, kişisel risk hükmü yok ────────────
const zc = reviewSupplements([s('Çinko Pikolinat', '50 mg'), s('Bakır', '2 mg')])
ok(zc.pairs.length === 1)
const zcPair = zc.pairs[0]
ok(zcPair.ruleId === 'zinc-copper')
ok(/Koşullu/i.test(zcPair.condition))
ok(/yüksek dozda ve uzun süreli/i.test(zcPair.condition))
ok(/60 mg\/gün/.test(zcPair.condition))
ok(/anlamına gelmez/i.test(zcPair.condition))
ok(!/sizde|sizin için riskli|eksikliğiniz var|risk altındasınız/i.test(zcPair.condition))
ok(zcPair.sources[0].id === 'ods-copper')

// ── 4. Demir + C vitamini: bilgi, "güvenli kombinasyon" onayı değil ─────
for (const cName of ['C Vitamini', 'Askorbik Asit', 'Vitamin C']) {
  const r = reviewSupplements([s('Demir Fumarat'), s(cName)])
  ok(r.pairs.length === 1)
  ok(r.pairs[0].ruleId === 'iron-vitamin-c')
  ok(/değildir/i.test(r.pairs[0].condition))
  ok(/güvenli kombinasyon" veya "birlikte alın" onayı değildir/i.test(r.pairs[0].condition))
  ok(!/güvenli kombinasyon onayıdır|birlikte alınmalıdır|güvenle birlikte/i.test(r.pairs[0].condition))
  ok(r.pairs[0].label !== 'Güvenli')
}

// ── 5. Alias'lar tek çift üretir (AB/BA tekrarı yok) ────────────────────
const alias = reviewSupplements([s('Demir'), s('Demir Bisglisinat'), s('Kalsiyum Sitrat')])
ok(alias.pairs.length === 2)
const keys = new Set(alias.pairs.map(p => `${p.ruleId}:${[...p.products].sort().join('|')}`))
ok(keys.size === alias.pairs.length)
ok(alias.pairs.every(p => p.ruleId === 'calcium-iron'))

// Sıra bağımsız: [kalsiyum, demir] de aynı kuralı verir, tekrar üretmez
const rev = reviewSupplements([s('Kalsiyum Sitrat'), s('Demir')])
ok(rev.pairs.length === 1 && rev.pairs[0].ruleId === 'calcium-iron')

// ── 6. D3+K2 + demir: warfarin / yanlış pozitif yok ─────────────────────
const dk = reviewSupplements([s('D3+K2', '2 damla'), s('Demir', '25 mg'), s('Omega-3', '2 g')])
ok(dk.pairs.length === 0)
ok(dk.notice === NO_MATCH_MESSAGE)
ok(!/warfarin|kan sulandırıcı/i.test(JSON.stringify(dk)))

// ── 7. Bilinmeyen ad güvenli sayılmaz, "incelenemeyen" olarak listelenir ─
const unk = reviewSupplements([s('Mucize Karışım X', '1 ölçek'), s('Demir', '25 mg')])
ok(unk.pairs.length === 0)
ok(unk.unreviewed.includes('Mucize Karışım X'))
ok(unk.unreviewedCount === 1)
ok(!unk.recognizedNames.includes('Mucize Karışım X'))
ok(unk.notice === NO_MATCH_MESSAGE)

// ── 8. Alt-dize tuzağı: token düzeyi eşleşme ────────────────────────────
ok(recognizeFamily('D Vitamini 1000 IU') === null)
ok(recognizeFamily('K2 + D3') === null)
ok(recognizeFamily('Demirhindi') === null)         // "demir" alt-dize değil
ok(recognizeFamily('Bakır Çayı') === 'bakir')
ok(recognizeFamilies('Çinko + Bakır').length === 2)

// ── 9. <2 kayıt: boş durum, hiçbir çift "kontrol edildi" değil ─────────
for (const input of [[], [s('Demir', '25 mg')]]) {
  const r = reviewSupplements(input)
  ok(r.status === 'insufficient')
  ok(r.pairs.length === 0)
  ok(r.notice === INSUFFICIENT_MESSAGE || r.notice === NO_MATCH_MESSAGE)
  ok(!JSON.stringify(r.pairs).includes(PAIR_LABEL))
}
ok(INSUFFICIENT_MESSAGE.includes('en az iki'))

// ── 10. Üst sınır şeffaf: kesilen çift sayısı bildirilir ────────────────
const many = reviewSupplements(
  [s('Demir A'), s('Demir B'), s('Kalsiyum A'), s('Kalsiyum B')],
  { maxPairs: 1 },
)
ok(many.pairs.length === 1)
ok(many.truncated === true)
ok(many.hiddenPairCount === 3)
ok(/gösterilmiyor/i.test(many.notice))
ok(MAX_PAIRS >= 2)
const dflt = reviewSupplements([s('Demir A'), s('Demir B'), s('Kalsiyum A'), s('Kalsiyum B')])
ok(dflt.pairs.length === Math.min(4, MAX_PAIRS))
ok(dflt.truncated === (4 > MAX_PAIRS))

// ── 11. Dozaj yalnız etiket: ayrıştırma/çıkarım yok ─────────────────────
const withDose = reviewSupplements([s('Demir', '2 x 500 mg'), s('Kalsiyum', '1000 mg')])
const noDose = reviewSupplements([s('Demir'), s('Kalsiyum')])
ok(withDose.pairs[0].condition === noDose.pairs[0].condition)
ok(!withDose.pairs[0].condition.includes('500'))
ok(withDose.pairs[0].dosages[0] === '2 x 500 mg')

// ── 12. Zorunlu uyarı metinleri ─────────────────────────────────────────
ok(/İlaç listesi incelenmiyor/.test(DRUG_NOTICE))
ok(/hekim veya eczacıya/.test(DRUG_NOTICE))
ok(/güvenlik onayı değildir/.test(SCOPE_NOTICE))
ok(/Bu sınırlı kurallarda eşleşme bulunmadı; birlikte kullanım için güvenlik onayı değildir\./.test(NO_MATCH_MESSAGE))

// ── 13. Saf fonksiyon: aynı girdi → aynı çıktı ─────────────────────────
ok(JSON.stringify(reviewSupplements([s('Demir'), s('Kalsiyum')])) === JSON.stringify(reviewSupplements([s('Demir'), s('Kalsiyum')])))

console.log(`interaction-review: ${checks} assertion geçti`)
