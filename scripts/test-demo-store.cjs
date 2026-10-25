/**
 * Demo envanteri depolama testleri (gerçek Node + sahte localStorage).
 * Kapsam: ilk açılışta boş depo, kalıcılık, doz planı korunması, bozuk JSON,
 * kota hatası, erişim engeli, SSR, sekme storage olayı, abonelik iptali.
 */
const assert = require('node:assert/strict')
const { installBrowser, makeStorage, quotaError, freshRequire, stubSupabase, libPath } = require('./ts-harness.cjs')

process.env.NEXT_PUBLIC_DEMO_MODE = 'true'
delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
stubSupabase()

const results = []
const test = async (name, fn) => {
  try { await fn(); results.push(`✅ ${name}`) }
  catch (err) { results.push(`❌ ${name}\n   ${err.message}`); process.exitCode = 1 }
}

const row = (over = {}) => ({
  name: 'Magnezyum Glisinat', dosage: '300 mg', frequency: 'Günde 1',
  time_of_day: 'Gece', notes: '', ...over,
})

async function main() {
  let browser = installBrowser()
  let data = require(libPath('data.ts'))
  const KEY = data.DEMO_STORAGE_KEY

  await test('ilk açılışta envanter boş, depoya sahte ürün yazılmıyor', async () => {
    assert.deepEqual(await data.listSupplements(), [])
    assert.equal(browser.storage.getItem(KEY), null)
  })

  const plan = {
    parts: [{ label: 'D3', amount: '2000', unit: 'IU' }, { label: 'K2', amount: '100', unit: 'µg' }],
    form: 'Hap',
    dailyCount: '1',
  }
  let addedId = null

  await test('ekleme depoya yazılıyor ve true dönüyor (dose_plan dahil)', async () => {
    assert.equal(await data.addSupplement(row({ name: 'Vitamin D3 + K2', dosage: '2000 IU', dose_plan: plan })), true)
    const rows = await data.listSupplements()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].name, 'Vitamin D3 + K2')
    assert.deepEqual(rows[0].dose_plan, plan)
    addedId = rows[0].id
    assert.match(browser.storage.getItem(KEY), /Vitamin D3 \+ K2/)
  })

  await test('sayfa yenilenince kayıt ve yapısal doz planı korunuyor', async () => {
    data = freshRequire(libPath('data.ts'))
    const rows = await data.listSupplements()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].id, addedId)
    assert.equal(rows[0].dosage, '2000 IU')
    assert.deepEqual(rows[0].dose_plan, plan)
  })

  await test('bozuk JSON çökme yapmıyor: boş envanter + açık hata durumu', async () => {
    browser.storage.setItem(KEY, '{bu bozuk json')
    data = freshRequire(libPath('data.ts'))
    assert.deepEqual(await data.listSupplements(), [])
    assert.match(data.getDemoStorageInfo().error ?? '', /okunamadı/)
  })

  await test('bozuk kayıttan sonra ekleme çalışıyor ve depoyu onarıyor', async () => {
    assert.equal(await data.addSupplement(row()), true)
    const rows = await data.listSupplements()
    assert.equal(rows.length, 1)
    assert.doesNotThrow(() => JSON.parse(browser.storage.getItem(KEY)))
  })

  await test('kota hatasında ekleme false dönüyor; depo ve bellek değişmiyor', async () => {
    const before = browser.storage.getItem(KEY)
    const beforeRows = await data.listSupplements()
    browser.storage.failWrite = quotaError()
    const ok = await data.addSupplement(row({ name: 'Kreatin' }))
    assert.equal(ok, false)
    assert.equal(browser.storage.getItem(KEY), before)
    assert.equal((await data.listSupplements()).length, beforeRows.length)
    assert.match(data.getDemoStorageInfo().error ?? '', /dolu/)
    browser.storage.failWrite = null
  })

  await test('kota hatasında silme false dönüyor; kayıt yerinde kalıyor', async () => {
    const rows = await data.listSupplements()
    browser.storage.failWrite = quotaError()
    assert.equal(await data.removeSupplement(rows[0].id), false)
    browser.storage.failWrite = null
    assert.equal((await data.listSupplements()).length, rows.length)
  })

  await test('silme başarılıysa kayıt depodan da gidiyor', async () => {
    const rows = await data.listSupplements()
    assert.equal(await data.removeSupplement(rows[0].id), true)
    assert.equal((await data.listSupplements()).length, 0)
    assert.equal(await data.removeSupplement('olmayan-id'), true)
  })

  await test('başka sekmedeki değişiklik storage olayıyla yansıyor', async () => {
    let notified = 0
    const off = data.onDemoChange(() => { notified += 1 })
    const external = JSON.stringify([{
      id: 'x1', name: 'Omega-3', dosage: '1000 mg', frequency: 'Günde 1', time_of_day: 'Sabah', notes: '',
    }])
    browser.storage.setItem(KEY, external)
    browser.fire('storage', { key: KEY, newValue: external })
    const rows = await data.listSupplements()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].name, 'Omega-3')
    assert.ok(notified >= 1, 'onDemoChange dinleyicisi tetiklenmedi')
    off()
  })

  await test('abonelik iptalinden sonra dinleyici tetiklenmiyor', async () => {
    let notified = 0
    const off = data.onDemoChange(() => { notified += 1 })
    off()
    await data.addSupplement(row({ name: 'Çinko' }))
    assert.equal(notified, 0)
  })

  await test('bozuk satırlar atılıyor, geçerli satırlar korunuyor', async () => {
    browser.storage.setItem(KEY, JSON.stringify([
      { id: 'ok1', name: 'B12', dosage: '500 µg' },
      { id: '', name: 'İsimsiz' },
      'metin',
      null,
    ]))
    data = freshRequire(libPath('data.ts'))
    const rows = await data.listSupplements()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].id, 'ok1')
    assert.equal(rows[0].notes, '')
  })

  await test('depolama erişimi engelliyse okuma boş, yazma false (çökme yok)', async () => {
    browser.uninstall()
    browser = installBrowser({ storage: 'throws' })
    data = freshRequire(libPath('data.ts'))
    assert.deepEqual(await data.listSupplements(), [])
    assert.equal(await data.addSupplement(row()), false)
    assert.match(data.getDemoStorageInfo().error ?? '', /erişilemiyor/)
  })

  await test('SSR (window yok): boş liste ve başarısız yazma, sahte kayıt yok', async () => {
    browser.uninstall()
    data = freshRequire(libPath('data.ts'))
    assert.deepEqual(await data.listSupplements(), [])
    assert.equal(await data.addSupplement(row()), false)
  })

  await test('clearLocalDemoData depodaki envanteri siliyor', async () => {
    browser = installBrowser()
    data = freshRequire(libPath('data.ts'))
    await data.addSupplement(row())
    assert.equal(data.clearLocalDemoData(), true)
    assert.equal(browser.storage.getItem(KEY), null)
    assert.deepEqual(await data.listSupplements(), [])
  })

  await test('clearLocalDemoData depolama reddederse false dönüyor', async () => {
    await data.addSupplement(row())
    browser.storage.failWrite = quotaError()
    assert.equal(data.clearLocalDemoData(), false)
    browser.storage.failWrite = null
    assert.equal((await data.listSupplements()).length, 1, 'silinmemiş kayıt korunmalı')
  })

  console.log('\nDemo depolama testleri')
  console.log(results.join('\n'))
  console.log(`\n${results.filter(r => r.startsWith('✅')).length}/${results.length} test geçti`)
  browser.uninstall()
}

main().catch(err => { console.error(err); process.exitCode = 1 })
