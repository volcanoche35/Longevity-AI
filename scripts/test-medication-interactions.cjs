/**
 * medication-interactions testleri: ilaç ↔ takviye eşleşmesi.
 * Saf modül (ağ/AI yok); transpile edilip yüklenir.
 */
const fs = require('node:fs')
const ts = require('typescript')
const assert = require('node:assert/strict')
const output = ts.transpileModule(fs.readFileSync('src/lib/medication-interactions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const mod = { exports: {} }
new Function('module', 'exports', output)(mod, mod.exports)
const { reviewMedications } = mod.exports

const results = []
const test = (name, fn) => {
  try { fn(); results.push(`✅ ${name}`) }
  catch (err) { results.push(`❌ ${name}\n   ${err.message}`); process.exitCode = 1 }
}

test('boş ilaç metni → boş dizi', () => {
  assert.deepEqual(reviewMedications('', ['Vitamin K2 (MK-7)']), [])
})

test('boş takviye listesi → boş dizi', () => {
  assert.deepEqual(reviewMedications('warfarin', []), [])
})

test('warfarin + K vitamini → çakışma yakalanır', () => {
  const r = reviewMedications('warfarin kullanıyorum', ['Vitamin K2 (MK-7)'])
  assert.equal(r.length, 1)
  assert.equal(r[0].ruleId, 'warfarin')
  assert.equal(r[0].supplement, 'Vitamin K2 (MK-7)')
})

test('levotiroksin + magnezyum → çakışma', () => {
  const r = reviewMedications('euthyrox', ['Magnezyum Sitrat'])
  assert.equal(r.length, 1)
  assert.equal(r[0].ruleId, 'levothyroxine')
})

test('metformin + B12 → çakışma', () => {
  const r = reviewMedications('metformin', ['B12 (Metilkobalamin)'])
  assert.equal(r.length, 1)
  assert.equal(r[0].ruleId, 'metformin')
})

test('SSRI + 5-HTP → çakışma (serotonin)', () => {
  const r = reviewMedications('sertralin', ['5-HTP'])
  assert.equal(r.length, 1)
  assert.equal(r[0].ruleId, 'ssri')
})

test('tansiyon ilacı + potasyum → çakışma', () => {
  const r = reviewMedications('lisinopril', ['Potasyum'])
  assert.equal(r.length, 1)
  assert.equal(r[0].ruleId, 'ace-arb')
})

test('alakasız ilaç → eşleşme yok', () => {
  const r = reviewMedications('parasetamol', ['Vitamin C'])
  assert.equal(r.length, 0)
})

test('Türkçe karakter toleransı (İnsülin/insülin)', () => {
  const r = reviewMedications('insulin', ['Berberin'])
  assert.equal(r.length, 1)
  assert.equal(r[0].ruleId, 'antidiabetic')
})

test('bir ilaç birden çok takviyeyle eşleşirse hepsi listelenir', () => {
  const r = reviewMedications('warfarin', ['Vitamin K2 (MK-7)', 'Koenzim Q10 (Ubikinon)'])
  assert.equal(r.length, 2)
})

test('aynı çift tekrarlanmaz (dedup)', () => {
  const r = reviewMedications('warfarin', ['Vitamin K2 (MK-7)', 'Vitamin K2 (MK-7)'])
  assert.equal(r.length, 1)
})

console.log(results.join('\n'))
console.log(`\n${results.filter(x => x.startsWith('✅')).length}/${results.length} test geçti`)
