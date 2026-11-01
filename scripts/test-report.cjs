/**
 * build-svg testleri: boş veri, uzun liste (sayfalama), XML enjeksiyonu,
 * Türkçe karakter, sabit uyarı + KVKK, formatDateTr/xmlEscape.
 *
 * build-svg.ts hiçbir modül içermez (saf); test-dosage.cjs ile aynı yolla
 * transpile edilip yüklenir.
 */
const fs = require('node:fs')
const ts = require('typescript')
const assert = require('node:assert/strict')
const output = ts.transpileModule(fs.readFileSync('src/lib/report/build-svg.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
const mod = { exports: {} }
new Function('module', 'exports', output)(mod, mod.exports)
const { buildSvg, buildSvgPages, formatDateTr, xmlEscape } = mod.exports

const results = []
const test = (name, fn) => {
  try { fn(); results.push(`✅ ${name}`) }
  catch (err) { results.push(`❌ ${name}\n   ${err.message}`); process.exitCode = 1 }
}

function base(overrides = {}) {
  return {
    generatedAt: '1 Kasım 2026',
    userName: 'Test Kullanıcı',
    profile: { age: '35', sex: 'female', heightCm: '170', weightKg: '65', goals: ['Enerji', 'Uyku'] },
    supplements: [],
    adherence: { windowDays: 7, days: [] },
    interactions: [],
    ...overrides,
  }
}

function daysFor(n) {
  const out = []
  for (let i = 0; i < n; i++) {
    const d = 1 + i
    out.push({ day: `2026-10-${String(d).padStart(2, '0')}`, label: `${String(d).padStart(2, '0')}.10`, taken: i % 3, planned: 4 })
  }
  return out
}

const sup = (name, extra = {}) => ({ name, dosage: 'Günde 1 kapsül', timeOfDay: 'Sabah', schedule: ['08:00'], ...extra })

test('boş veri: başlık, boş profil ve boş envanter notları + uyarı', () => {
  const svg = buildSvg(base({ userName: '', profile: { age: '', sex: null, heightCm: '', weightKg: '', goals: [] } }))
  assert.ok(svg.includes('SAĞLIK ÖZETİ'), 'başlık olmalı')
  assert.ok(svg.includes('Profil bilgisi girilmemiş.'), 'boş profil notu')
  assert.ok(svg.includes('Kayıtlı takviye yok.'), 'boş envanter notu')
  assert.ok(svg.includes('Takviye kaydı olmadığından uyum hesaplanamadı.'), 'uyum yok notu')
  assert.ok(svg.startsWith('<svg '), 'geçerli svg kökü')
})

test('sabit uyarı ve KVKK notu her raporda var', () => {
  const svg = buildSvg(base({ supplements: [sup('Magnezyum')], adherence: { windowDays: 7, days: daysFor(7) } }))
  assert.ok(svg.includes('Bu rapor tıbbi tanı değildir; sağlık profesyoneline danışın.'))
  assert.ok(svg.includes('6698 sayılı KVKK'))
  assert.ok(svg.includes('Aydınlatma Metni'))
})

test('XML enjeksiyonu: özel karakterler escape ediliyor', () => {
  const evil = '<script>alert("x")</script>'
  const svg = buildSvg(base({
    userName: `Ad & <b>İsim</b>`,
    supplements: [sup(evil, { dosage: '5 mg & <2 gün', timeOfDay: "Sabah'ı", schedule: ['08:00'] })],
    adherence: { windowDays: 7, days: daysFor(7) },
  }))
  assert.ok(!svg.includes('<script>'), 'ham script etiketi sızmamalı')
  assert.ok(!svg.includes('<b>'), 'ham html etiketi sızmamalı')
  assert.ok(svg.includes('&lt;script&gt;'), 'escape edilmiş script')
  assert.ok(svg.includes('&amp;'), '&amp; olmalı')
  assert.ok(svg.includes('&quot;'), '&quot; olmalı')
  assert.ok(svg.includes('&#39;'), "apostrof &#39; olmalı")
})

test('Türkçe karakterler olduğu gibi korunuyor', () => {
  const svg = buildSvg(base({
    userName: 'Şükrü Ğı İ Ö Ç',
    supplements: [sup('Çinko & Şeker', { timeOfDay: 'Öğle' })],
    adherence: { windowDays: 7, days: daysFor(7) },
  }))
  for (const ch of ['ş', 'ğ', 'ı', 'İ', 'ö', 'ü', 'ç', 'Ş', 'Ö', 'Ç', 'Öğle']) {
    assert.ok(svg.includes(ch), `Türkçe karakter korunmalı: ${ch}`)
  }
})

test('uzun liste: 2+ sayfaya bölünüyor, taşan satır 2. sayfada', () => {
  const supplements = Array.from({ length: 40 }, (_, i) => sup(`Takviye ${i + 1}`))
  const pages = buildSvgPages(base({ supplements, adherence: { windowDays: 7, days: daysFor(7) } }))
  assert.ok(pages.length >= 2, `beklenen >=2 sayfa, alınan ${pages.length}`)
  assert.ok(pages[1].includes('Takviye 40'), 'son satır 2. sayfada olmalı')
  assert.ok(!pages[0].includes('Takviye 40'), 'son satır 1. sayfada olmamalı')
  assert.ok(pages[0].includes('Takviye 1'), 'ilk satır 1. sayfada olmalı')
  for (const p of pages) assert.ok(p.startsWith('<svg '), 'her sayfa tam svg olmalı')
})

test('tek sayfalık rapor tek sayfa döner', () => {
  const pages = buildSvgPages(base({ supplements: [sup('Magnezyum'), sup('D3')], adherence: { windowDays: 7, days: daysFor(7) } }))
  assert.equal(pages.length, 1)
})

test('buildSvg birleşik çok sayfalı dize döner', () => {
  const supplements = Array.from({ length: 40 }, (_, i) => sup(`Takviye ${i + 1}`))
  const svg = buildSvg(base({ supplements, adherence: { windowDays: 7, days: daysFor(7) } }))
  assert.ok(svg.includes('Takviye 1') && svg.includes('Takviye 40'))
  assert.ok(svg.includes('translate(0,842)'), 'ikinci sayfa çevirisi olmalı')
})

test('formatDateTr ve xmlEscape', () => {
  assert.equal(formatDateTr('2026-11-01'), '1 Kasım 2026')
  assert.equal(formatDateTr('2026-01-05'), '5 Ocak 2026')
  assert.equal(formatDateTr('geçersiz'), 'geçersiz')
  assert.equal(xmlEscape(`a&b<c>"d"'e'`), 'a&amp;b&lt;c&gt;&quot;d&quot;&#39;e&#39;')
  assert.equal(xmlEscape(null), '')
  assert.equal(xmlEscape(42), '42')
})

test('30 günlük uyum grafiği pencere uzunluğunu taşıyor', () => {
  const svg = buildSvg(base({ supplements: [sup('Magnezyum')], adherence: { windowDays: 30, days: daysFor(30) } }))
  assert.ok(svg.includes('son 30 gün'), '30 gün başlığı')
  assert.ok(svg.includes('30 gün: 30/120'), 'oran satırı: 30 işaret / 120 plan (30×4)')
})

console.log('\nRapor SVG testleri')
console.log(results.join('\n'))
console.log(`\n${results.filter(r => r.startsWith('✅')).length}/${results.length} test geçti`)
