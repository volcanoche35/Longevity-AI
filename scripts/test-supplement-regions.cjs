/**
 * Takviye ↔ bölge ilişki testleri (deterministik, ağsız).
 * Çalıştırma: node scripts/test-supplement-regions.cjs
 *
 * Kapsam:
 *  - normalizeProductName'in gerçek katalog normalizasyonuyla eşitliği
 *  - kural adlarının güvenilir katalogda gerçekten var olması (uydurma isim yok)
 *  - tam/token eşleşmesi, prefix YOK, marka öneki + doz soneki toleransı
 *  - güvenlik uyarısı ile normal rol ayrımı
 *  - kanıtsız pozitif eşleştirme yok (Milk Thistle / Kurkumin / Enginar / D3)
 *  - boş envanter, determinizm, kaynak URL'leri
 */
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const ts = require('typescript')
const assert = require('node:assert/strict')

function loadTs(rel) {
  const file = path.join(__dirname, '..', rel)
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: file,
  })
  const mod = { exports: {} }
  // göreli import'lar dosyanın kendi dizininden çözülsün (catalog.ts → data/*.json)
  new Function('module', 'exports', 'require', outputText)(mod, mod.exports, createRequire(file))
  return mod.exports
}

const regions = loadTs('src/lib/supplement-regions.ts')
const catalog = loadTs('src/lib/catalog.ts')
const {
  normalizeProductName,
  matchRule,
  relationsFor,
  relationIndex,
  hasAnyRelation,
  RELATION_RULES,
  RELATION_DISCLAIMER,
} = regions

/* 1 ─ normalizasyon katalogla aynı davranır */
const samples = [
  'Vitamin A (Retinol)',
  'B12 (Metilkobalamin)',
  'Magnezyum + B6 Kompleks',
  '  İYOT (Potasyum İyodür)  ',
  'Omega-3 (EPA/DHA)',
  'Çinko/Bakır — 2x',
  '',
  'ŞĞÜÖÇı',
]
for (const sample of samples) {
  assert.equal(normalizeProductName(sample), catalog.normalize(sample), `normalize sapması: ${JSON.stringify(sample)}`)
}

/* 2 ─ kural ürün adları katalogda gerçekten var */
const catalogNames = new Set(catalog.CATALOG.map(entry => entry.name))
for (const rule of RELATION_RULES) {
  assert.ok(rule.catalogNames.length > 0, `${rule.id}: katalog adı yok`)
  for (const name of rule.catalogNames) {
    assert.ok(catalogNames.has(name), `${rule.id}: "${name}" katalogda yok`)
  }
  assert.match(rule.source.url, /^https:\/\/ods\.od\.nih\.gov\//, `${rule.id}: ODS kaynağı değil`)
  assert.equal(rule.source.checked, '2026-10-25')
}

/* 3 ─ katalog adı ve alias eşleşmesi */
assert.equal(matchRule('B12 (Metilkobalamin)').rule.id, 'b12-nervous-role')
assert.equal(matchRule('B12 (Metilkobalamin)').matchedAs, 'catalog-name')
assert.equal(matchRule('metilkobalamin').rule.id, 'b12-nervous-role')
assert.equal(matchRule('Magnezyum Glisinat').rule.id, 'magnesium-nervous-role')
assert.equal(matchRule('MAGNEZYUM SİTRAT 200 MG').rule.id, 'magnesium-nervous-role')
assert.equal(matchRule('Vitamin A (Retinol)').rule.kind, 'caution')
assert.equal(matchRule('Vitamin A (Retinol)').rule.id, 'vitamin-a-liver-caution')

/* 4 ─ marka öneki + doz/form soneki toleransı */
assert.equal(matchRule('Solgar B12 Metilkobalamin 1000 mcg').rule.id, 'b12-nervous-role')
assert.equal(matchRule('Magnezyum Malat 60 kapsül').rule.id, 'magnesium-nervous-role')
assert.equal(matchRule('A vitamini 10.000 IU').rule.id, 'vitamin-a-liver-caution')

/* 5 ─ prefix eşleşmesi YOK */
assert.equal(matchRule('m'), null)
assert.equal(matchRule('magnezyumlu karışım'), null)
assert.equal(matchRule('vitamin'), null)

/* 6 ─ kanıtsız/yanlış pozitifler kapalı */
for (const name of [
  'Milk Thistle (Silmarin)',
  'Kurkumin (C3 Kompleks)',
  'Enginar Ekstresi',
  'Beta-Karoten',
  'Vitamin D3',
  'Omega-3 (EPA/DHA)',
  'Probiyotik (çok suş)',
]) {
  assert.equal(matchRule(name), null, `beklenmeyen ilişki: ${name}`)
}

/* 7 ─ bölge ilişkileri + caution/rol ayrımı */
const b12 = { id: 'p1', name: 'B12 (Metilkobalamin)' }
const mg = { id: 'p2', name: 'Magnezyum Glisinat' }
const vitA = { id: 'p3', name: 'Vitamin A (Retinol)' }
const thistle = { id: 'p4', name: 'Milk Thistle (Silmarin)' }

const nervous = relationsFor('nervous', [mg, thistle, b12])
assert.deepEqual(nervous.map(r => r.relationId), ['b12-nervous-role', 'magnesium-nervous-role'])
assert.ok(nervous.every(r => r.kind === 'role'))

const liver = relationsFor('liver', [thistle, vitA, b12])
assert.deepEqual(liver.map(r => r.relationId), ['vitamin-a-liver-caution'])
assert.equal(liver[0].kind, 'caution')
assert.equal(liver[0].productName, 'Vitamin A (Retinol)')

assert.deepEqual(relationsFor('heart', [b12, mg, vitA]), [])
assert.deepEqual(relationsFor('lungs', [b12]), [])
assert.deepEqual(relationsFor('stomach', [vitA]), [])

/* 8 ─ boş envanter: tüm bölgeler açık, ilişki yok */
const emptyIndex = relationIndex([])
for (const key of ['nervous', 'heart', 'lungs', 'liver', 'stomach', 'intestine']) {
  assert.deepEqual(emptyIndex[key], [], `${key}: boş envanterde ilişki üretildi`)
}
assert.equal(hasAnyRelation([]), false)
assert.equal(hasAnyRelation([{ name: 'Milk Thistle (Silmarin)' }]), false)
assert.equal(hasAnyRelation([mg]), true)

/* 9 ─ determinizm: giriş sırası sonucu değiştirmez */
const forward = relationsFor('nervous', [b12, mg]).map(r => `${r.productName}|${r.relationId}`)
const reverse = relationsFor('nervous', [mg, b12]).map(r => `${r.productName}|${r.relationId}`)
assert.deepEqual(forward, reverse)
assert.deepEqual(forward, [...forward].sort((a, b) => a.localeCompare(b, 'tr')))

/* 10 ─ kartta zorunlu dürüstlük satırı */
assert.match(RELATION_DISCLAIMER, /kişisel fayda/)
assert.match(RELATION_DISCLAIMER, /tedavi/)

console.log(
  `Takviye-bölge testleri geçti: ${RELATION_RULES.length} kural, normalize eşitliği, prefix kapalı, ` +
  'rol/caution ayrımı, boş envanter ve determinizm.'
)
