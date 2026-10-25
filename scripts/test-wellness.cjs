/**
 * Günlük etki günlüğü testleri (Node + ts-harness; ağ/tarayıcı yok).
 * Doğrulama, güncelleme, silme, boşluklu grafik ve dışa aktarım sözleşmesini ölçer.
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { installBrowser, libPath, freshRequire } = require('./ts-harness.cjs')

const NOW = new Date(2026, 9, 25, 12, 0, 0)
const future = new Date(2026, 9, 26, 9, 0, 0)

async function main() {
  const browser = installBrowser()
  const w = require(libPath('wellness.ts'))
  const TODAY = w.todayKey(NOW)
  assert.equal(TODAY, '2026-10-25')

  /* 1) boş başlangıç — uydurma veri yok */
  assert.equal(w.WELLNESS_KEY, 'biotrack.wellness.v1')
  assert.deepEqual(w.readWellnessEntries(), [])
  assert.deepEqual(w.getWellnessSnapshot(), [])
  const emptyCtx = await w.getWellnessContext()
  assert.deepEqual(emptyCtx, { days: 0, observations: [] })
  console.log('PASS: Boş günlük boş döner; dışa aktarımda uydurma gözlem yok.')

  /* 2) doğrulama */
  const reject = input => {
    const result = w.validateWellnessEntry(input, NOW)
    assert.equal(result.ok, false, `reddetmeliydi: ${JSON.stringify(input)}`)
    return result.errors
  }
  assert.ok(reject({ day: TODAY }).length > 0)
  reject({ day: TODAY, energy: 0 })
  reject({ day: TODAY, energy: 6 })
  reject({ day: TODAY, energy: '2.5' })
  reject({ day: TODAY, energy: 'abc' })
  reject({ day: '2026-02-30', energy: 3 })
  reject({ day: '25.10.2026', energy: 3 })
  reject({ day: TODAY, note: 'x'.repeat(w.NOTE_MAX + 1) })
  assert.ok(reject({ day: future && w.todayKey(future), energy: 3 }).length > 0)

  const noteOnly = w.validateWellnessEntry({ day: TODAY, note: '  baş ağrısı yok  ' }, NOW)
  assert.equal(noteOnly.ok, true)
  assert.deepEqual(noteOnly.entry, { day: TODAY, note: 'baş ağrısı yok' })

  const full = w.validateWellnessEntry({ day: TODAY, energy: 4, sleep: '3', digestion: 2, note: 'iyi' }, NOW)
  assert.equal(full.ok, true)
  assert.deepEqual(full.entry, { day: TODAY, energy: 4, sleep: 3, digestion: 2, note: 'iyi' })
  console.log('PASS: Puan 1..5, gelecek/geçersiz tarih, 500+ not ve boş kayıt reddediliyor; not-only kabul.')

  /* 3) aynı gün güncelleme (kopya yok) */
  const first = w.saveWellness({ day: TODAY, energy: 2 }, NOW)
  assert.equal(first.ok, true)
  assert.equal(first.created, true)
  const second = w.saveWellness({ day: TODAY, energy: 5, sleep: 4 }, NOW)
  assert.equal(second.ok, true)
  assert.equal(second.created, false)
  assert.equal(w.readWellnessEntries().length, 1)
  assert.deepEqual(w.readWellnessEntries()[0], { day: TODAY, energy: 5, sleep: 4 })

  const failed = w.saveWellness({ day: TODAY, energy: 9 }, NOW)
  assert.equal(failed.ok, false)
  assert.deepEqual(w.readWellnessEntries()[0], { day: TODAY, energy: 5, sleep: 4 })
  console.log('PASS: Aynı gün ikinci kayıt günceller; geçersiz kayıt depoyu bozmaz.')

  /* 4) yenileme sonrası kalıcılık */
  const reloaded = freshRequire(libPath('wellness.ts'))
  assert.deepEqual(reloaded.readWellnessEntries(), [{ day: TODAY, energy: 5, sleep: 4 }])
  console.log('PASS: Kayıt sayfa yenilemesinde korunuyor.')

  /* 5) kullanım işaretleri + envanter adları (dışa aktarım) */
  const data = require(libPath('data.ts'))
  const daymarks = require(libPath('daymarks.ts'))
  await data.addSupplement({ name: 'Magnezyum', dosage: '', frequency: '', time_of_day: 'Akşam', notes: '' })
  await data.addSupplement({ name: 'D3', dosage: '', frequency: '', time_of_day: 'Sabah', notes: '' })
  const inventory = await data.listSupplements()
  const mag = inventory.find(row => row.name === 'Magnezyum')
  const d3 = inventory.find(row => row.name === 'D3')
  assert.ok(mag && d3)

  const d23 = new Date(2026, 9, 23, 10, 0, 0)
  const d24 = new Date(2026, 9, 24, 10, 0, 0)
  daymarks.toggleDayMark(mag.id, d23)
  daymarks.toggleDayMark(mag.id, d24)
  daymarks.toggleDayMark(d3.id, d24)
  w.saveWellness({ day: '2026-10-23', energy: 3 }, NOW)
  w.saveWellness({ day: '2026-10-24', energy: 4, digestion: 2 }, NOW)

  const ctx = await w.getWellnessContext()
  assert.equal(ctx.days, 3)
  assert.deepEqual(ctx.observations.map(o => o.day), ['2026-10-23', '2026-10-24', '2026-10-25'])
  assert.deepEqual(ctx.observations[0].supplementNames, ['Magnezyum'])
  assert.deepEqual(ctx.observations[1].supplementNames, ['Magnezyum', 'D3'])
  assert.deepEqual(ctx.observations[2].supplementNames, [])
  assert.deepEqual(ctx.observations[2], { day: '2026-10-25', energy: 5, sleep: 4, supplementNames: [] })
  const serialized = JSON.stringify(ctx)
  assert.equal(serialized.includes(mag.id), false)
  assert.equal('id' in ctx.observations[0], false)
  assert.equal(Object.keys(ctx).sort().join(','), 'days,observations')
  console.log('PASS: Dışa aktarım son 14 kayıt gününü envanter adlarıyla verir; ham id/kimlik sızdırmaz.')

  /* 6) grafik: takvim ölçeği, boşlukta çizgi yok */
  const entries = [
    { day: '2026-10-20', energy: 2 },
    { day: '2026-10-21', energy: 3 },
    { day: '2026-10-24', energy: 5 },
    { day: '2026-10-25', energy: 4 },
  ]
  const chart = w.buildChart(entries, 'energy', 7, TODAY)
  assert.equal(chart.start, '2026-10-19')
  assert.deepEqual(chart.points.map(p => p.index), [1, 2, 5, 6])
  assert.equal(chart.segments.length, 2)
  assert.deepEqual(chart.segments.map(s => s.length), [2, 2])
  assert.deepEqual(chart.usage, [4, 5])
  assert.deepEqual(chart.labels, [
    { index: 0, text: '19.10' },
    { index: 3, text: '22.10' },
    { index: 6, text: '25.10' },
  ])
  const gapChart = w.buildChart([{ day: '2026-10-22', energy: 3 }], 'sleep', 7, TODAY)
  assert.equal(gapChart.points.length, 0)
  assert.equal(gapChart.segments.length, 0)
  console.log('PASS: Grafik günleri takvim indeksine yerleştirir; boşlukta ayrı segment, tek gün nokta.')

  /* 7) özet: 7 günden az veri yetersiz */
  const sparse = w.summarizeWellness(
    [
      { day: '2026-10-23', energy: 3 },
      { day: '2026-10-24', energy: 5 },
      { day: '2026-10-25', energy: 3 },
    ],
    daymarks.readMarks(),
    7,
    TODAY,
  )
  assert.equal(sparse.entryCount, 3)
  assert.equal(sparse.sufficient, false)
  assert.equal(sparse.averages.energy, 3.7)
  assert.equal(sparse.counts.energy, 3)
  assert.equal(sparse.usageDays, 2)

  const dense = []
  for (let offset = 0; offset < 8; offset += 1) {
    dense.push({ day: w.addDays(TODAY, -offset), energy: offset < 4 ? 5 : 1, sleep: 3 })
  }
  const fullSummary = w.summarizeWellness(dense, {}, 7, TODAY)
  assert.equal(fullSummary.entryCount, 7)
  assert.equal(fullSummary.sufficient, true)
  assert.equal(fullSummary.averages.energy, 3.3)
  assert.equal(fullSummary.usageDays, 0)
  assert.equal(w.summarizeWellness(dense, {}, 14, TODAY).entryCount, 8)
  console.log('PASS: Son 7/14 gün özeti gün sayısını sayar; 7’nin altında "veri yetersiz".')

  /* 8) silme: tek gün diğerlerini korur, tümü onaylı butondan */
  assert.equal(w.deleteWellnessDay('2026-10-23').ok, true)
  assert.deepEqual(w.readWellnessEntries().map(e => e.day), ['2026-10-24', '2026-10-25'])
  assert.equal(w.clearWellness().ok, true)
  assert.deepEqual(w.readWellnessEntries(), [])
  assert.deepEqual(daymarks.readMarks()['2026-10-24'].length, 2, 'kullanım işaretleri günlükten bağımsız')
  console.log('PASS: Gün silme diğer günleri ve kullanım işaretlerini korur; tümü silme temizler.')

  /* 9) bozuk JSON çökmez */
  browser.storage.setItem(w.WELLNESS_KEY, '{bozuk')
  const corrupted = freshRequire(libPath('wellness.ts'))
  assert.deepEqual(corrupted.readWellnessEntries(), [])
  browser.storage.setItem(w.WELLNESS_KEY, JSON.stringify({ entries: { '2026-10-25': { energy: 42, note: 'x' }, kötü: { energy: 3 } } }))
  assert.deepEqual(corrupted.readWellnessEntries(), [{ day: '2026-10-25', note: 'x' }])
  console.log('PASS: Bozuk JSON ve geçersiz puanlar çökme yapmaz, sessizce atılır.')

  /* 10) SSR güvenliği */
  browser.uninstall()
  assert.deepEqual(w.readWellnessEntries(), [])
  assert.deepEqual(w.getWellnessSnapshot(), [])
  const serverSave = w.saveWellness({ day: TODAY, energy: 3 }, NOW)
  assert.equal(serverSave.ok, false)
  const serverCtx = await w.getWellnessContext()
  assert.equal(serverCtx.days, 0)
  console.log('PASS: Sunucuda okuma boş, yazma başarısız; sahte kayıt üretilmiyor.')

  /* 11) modül sınırı: lib istemci değil */
  const root = path.join(__dirname, '..')
  const libSource = fs.readFileSync(path.join(root, 'src/lib/wellness.ts'), 'utf8')
  const panelSource = fs.readFileSync(path.join(root, 'src/components/wellness-panel.tsx'), 'utf8')
  assert.equal(libSource.includes("'use client'"), false)
  assert.equal(panelSource.startsWith("'use client'"), true)
  assert.equal(panelSource.includes('FF4D5E'), false, 'panel sert mercan kullanmamalı; var(--primary)')
  console.log('PASS: "use client" yalnız bileşende; lib SSR uyumlu, renk var(--primary).')
}

main().then(
  () => console.log('ALL PASS: wellness'),
  error => {
    console.error('FAIL:', error)
    process.exitCode = 1
  },
)
