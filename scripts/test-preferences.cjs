/**
 * Kişiselleştirme tercihleri testleri (gerçek Node + sahte localStorage).
 *
 * Kapsam: varsayılanlar, bozuk JSON, eski/bilinmeyen alanlar, boolean ve enum
 * doğrulaması, kota hatasında eski kaydın korunması, aynı sekme + diğer sekme
 * (storage olayı) yayını, kullanıcı onaylı sıfırlama, SSR davranışı ve hook
 * anlık görüntüsünün kararlı kimliği.
 *
 * React hook'u render etmeden sınanır: `react` modülü, useSyncExternalStore
 * sözleşmesini (subscribe/getSnapshot/getServerSnapshot) yakalayan bir köprüyle
 * değiştirilir. Böylece DOM gerekmeden gerçek abonelik ve önbellek davranışı
 * ölçülür.
 */
const assert = require('node:assert/strict')
const Module = require('node:module')
const { installBrowser, quotaError, freshRequire, libPath } = require('./ts-harness.cjs')

const KEY = 'biotrack.preferences.v1'
const DEFAULTS = {
  dashboard: { showPerformance: true },
  supplements: { defaultForm: 'Hap', defaultTime: 'Sabah' },
  tracking: { aiAnalysis: true },
}

/* --- react köprüsü: hook'u çalıştırmadan store sözleşmesini yakala ------ */
const bridge = { current: null }
const fakeReact = {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
    bridge.current = { subscribe, getSnapshot, getServerSnapshot }
    return getSnapshot()
  },
}
const originalLoad = Module._load
Module._load = function patched(request, parent, isMain) {
  if (request === 'react') return fakeReact
  return originalLoad.call(this, request, parent, isMain)
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))
const results = []
async function test(name, fn) {
  try {
    await fn()
    results.push(`✅ ${name}`)
  } catch (err) {
    results.push(`❌ ${name}\n   ${err.message}`)
    process.exitCode = 1
  }
}
const load = () => freshRequire(libPath('preferences.ts'))

async function main() {
  await test('depo boşken varsayılanlar döner, okuma depoya yazmaz', async () => {
    const browser = installBrowser()
    const prefs = load()
    assert.deepEqual(prefs.getPreferences(), DEFAULTS)
    assert.equal(browser.storage.getItem(KEY), null, 'okuma kayıt üretmemeli')
    assert.equal(prefs.PREFERENCES_KEY, KEY)
    browser.uninstall()
  })

  await test('bozuk JSON ve nesne olmayan kayıt çökmeden varsayılana düşer', async () => {
    const browser = installBrowser()
    const prefs = load()
    browser.storage.setItem(KEY, '{bu bozuk json')
    assert.deepEqual(prefs.getPreferences(), DEFAULTS)
    browser.storage.setItem(KEY, '[1,2,3]')
    assert.deepEqual(prefs.getPreferences(), DEFAULTS)
    browser.storage.setItem(KEY, '"sadece metin"')
    assert.deepEqual(prefs.getPreferences(), DEFAULTS)
    browser.uninstall()
  })

  await test('eski/bilinmeyen alanlar yok sayılır, bilinen alanlar korunur ve yazım temizlenir', async () => {
    const browser = installBrowser()
    const prefs = load()
    browser.storage.setItem(KEY, JSON.stringify({
      version: 0,
      theme: 'neon',
      dashboard: { showPerformance: false, showAnatomy: false, legacyWidget: 'x' },
      supplements: { defaultForm: 'Kapsül', defaultTime: 'Gece', defaultDose: '500 mg' },
    }))
    const read = prefs.getPreferences()
    assert.equal(read.dashboard.showPerformance, false)
    assert.equal(read.supplements.defaultForm, 'Kapsül')
    assert.equal(read.supplements.defaultTime, 'Gece')
    assert.deepEqual(Object.keys(read).sort(), ['dashboard', 'supplements', 'tracking'])

    const saved = prefs.savePreferences({ supplements: { defaultTime: 'Akşam' } })
    assert.equal(saved.ok, true)
    assert.equal(saved.preferences.dashboard.showPerformance, false, 'dokunulmayan alan korunur')
    const raw = JSON.parse(browser.storage.getItem(KEY))
    assert.equal('theme' in raw, false, 'bilinmeyen alan geri yazılmaz')
    assert.equal('legacyWidget' in raw.dashboard, false)
    assert.equal('defaultDose' in raw.supplements, false)
    browser.uninstall()
  })

  await test('boolean doğrulaması: okuma varsayılana düşer, yazma açık hata verir', async () => {
    const browser = installBrowser()
    const prefs = load()
    browser.storage.setItem(KEY, JSON.stringify({
      dashboard: { showPerformance: 'evet' },
      supplements: { defaultForm: 'Hap', defaultTime: 'Sabah' },
    }))
    const read = prefs.getPreferences()
    assert.equal(read.dashboard.showPerformance, true, 'metin boolean yerine geçmez')

    const before = browser.storage.getItem(KEY)
    const result = prefs.savePreferences({ dashboard: { showPerformance: 'evet' } })
    assert.equal(result.ok, false)
    assert.match(result.error, /açık veya kapalı/)
    assert.equal(browser.storage.getItem(KEY), before, 'geçersiz yama depoyu değiştirmemeli')
    browser.uninstall()
  })

  await test('enum doğrulaması: bilinmeyen form/saat varsayılana düşer, yazma reddedilir', async () => {
    const browser = installBrowser()
    const prefs = load()
    browser.storage.setItem(KEY, JSON.stringify({
      dashboard: { showPerformance: true },
      supplements: { defaultForm: 'Fitil', defaultTime: 'Öğleden sonra' },
    }))
    const read = prefs.getPreferences()
    assert.equal(read.supplements.defaultForm, 'Hap')
    assert.equal(read.supplements.defaultTime, 'Sabah')

    const before = browser.storage.getItem(KEY)
    const badForm = prefs.savePreferences({ supplements: { defaultForm: 'Fitil' } })
    assert.equal(badForm.ok, false)
    assert.match(badForm.error, /Hap, Kapsül, Damla, Toz, Sıvı, Diğer/)
    const badTime = prefs.savePreferences({ supplements: { defaultTime: 'Kuşluk' } })
    assert.equal(badTime.ok, false)
    assert.match(badTime.error, /Sabah, Öğle, Akşam, Gece/)
    assert.equal(browser.storage.getItem(KEY), before)
    browser.uninstall()
  })

  await test('kota hatasında kayıt yazılmaz, eski değerler korunur ve hata açık döner', async () => {
    const browser = installBrowser()
    const prefs = load()
    const first = prefs.savePreferences({ supplements: { defaultForm: 'Toz', defaultTime: 'Akşam' } })
    assert.equal(first.ok, true)
    const before = browser.storage.getItem(KEY)

    browser.storage.failWrite = quotaError()
    const failed = prefs.savePreferences({ dashboard: { showPerformance: false } })
    assert.equal(failed.ok, false)
    assert.match(failed.error, /dolu/)
    assert.equal(browser.storage.getItem(KEY), before, 'kota hatasında eski kayıt bozulmamalı')

    browser.storage.failWrite = null
    const after = prefs.getPreferences()
    assert.equal(after.supplements.defaultForm, 'Toz')
    assert.equal(after.supplements.defaultTime, 'Akşam')
    assert.equal(after.dashboard.showPerformance, true, 'başarısız yazma uygulanmış gibi görünmemeli')
    browser.uninstall()
  })

  await test('hook: SSR anlık görüntüsü varsayılan ve kararlı; hidrasyon gerçek değeri getirir', async () => {
    const browser = installBrowser()
    browser.storage.setItem(KEY, JSON.stringify({
      dashboard: { showPerformance: false },
      supplements: { defaultForm: 'Damla', defaultTime: 'Öğle' },
    }))
    const prefs = load()

    const serverSnapshot = bridge.current?.getServerSnapshot
    assert.equal(serverSnapshot, undefined, 'hook henüz çağrılmadı')

    const firstRender = prefs.usePreferences()
    assert.deepEqual(firstRender, DEFAULTS, 'ilk istemci render sunucuyla aynı olmalı')
    const a = bridge.current.getServerSnapshot()
    const b = bridge.current.getServerSnapshot()
    assert.equal(a, b, 'sunucu anlık görüntüsü aynı nesne olmalı')
    assert.equal(bridge.current.getSnapshot(), firstRender, 'hidrasyon öncesi kimlik kararlı')

    let notified = 0
    const off = bridge.current.subscribe(() => { notified++ })
    await tick()
    const hydrated = bridge.current.getSnapshot()
    assert.equal(hydrated.dashboard.showPerformance, false, 'hidrasyon depodaki değeri göstermeli')
    assert.equal(hydrated.supplements.defaultForm, 'Damla')
    assert.equal(bridge.current.getSnapshot(), hydrated, 'değişiklik yokken aynı nesne')
    assert.ok(notified >= 1, 'hidrasyon aboneye bildirilmeli')
    off()
    browser.uninstall()
  })

  await test('aynı sekme kaydı ve diğer sekme storage olayı aboneyi günceller', async () => {
    const browser = installBrowser()
    const prefs = load()
    prefs.usePreferences()
    let notified = 0
    const off = bridge.current.subscribe(() => { notified++ })
    await tick()

    const sameTab = prefs.savePreferences({ supplements: { defaultTime: 'Gece' } })
    assert.equal(sameTab.ok, true)
    assert.equal(bridge.current.getSnapshot().supplements.defaultTime, 'Gece', 'aynı sekmede anında uygulanır')
    assert.ok(notified >= 1, 'aynı sekme kaydı aboneyi uyarır')

    const crossRaw = JSON.stringify({
      dashboard: { showPerformance: false },
      supplements: { defaultForm: 'Sıvı', defaultTime: 'Akşam' },
    })
    browser.storage.setItem(KEY, crossRaw)
    const beforeCross = notified
    browser.fire('storage', { key: KEY, newValue: crossRaw })
    const afterCross = bridge.current.getSnapshot()
    assert.equal(afterCross.supplements.defaultForm, 'Sıvı', 'diğer sekme değişikliği yansımalı')
    assert.equal(afterCross.dashboard.showPerformance, false)
    assert.ok(notified > beforeCross, 'storage olayı aboneyi uyarır')

    off()
    assert.equal(browser.listenerCount('storage'), 0, 'abonelik iptalinde storage dinleyicisi kaldırılır')
    browser.uninstall()
  })

  await test('sıfırlama kullanıcı onayı ister; onay yoksa depo değişmez', async () => {
    const browser = installBrowser({ confirm: () => false })
    const prefs = load()
    assert.equal(prefs.savePreferences({ supplements: { defaultForm: 'Toz' } }).ok, true)

    const denied = prefs.resetPreferences()
    assert.equal(denied.ok, false)
    assert.match(denied.error, /iptal/i)
    assert.equal(prefs.getPreferences().supplements.defaultForm, 'Toz')
    assert.notEqual(browser.storage.getItem(KEY), null, 'onaysız sıfırlama silmemeli')

    browser.window.confirm = () => true
    const approved = prefs.resetPreferences()
    assert.equal(approved.ok, true)
    assert.deepEqual(approved.preferences, DEFAULTS)
    assert.equal(browser.storage.getItem(KEY), null, 'onaylı sıfırlama kaydı siler')
    assert.deepEqual(prefs.getPreferences(), DEFAULTS)

    browser.uninstall()
    const ssr = prefs.resetPreferences()
    assert.equal(ssr.ok, false)
    assert.match(ssr.error, /Tarayıcı yok/)
  })

  console.log(results.join('\n'))
  console.log(process.exitCode ? '\nSONUÇ: başarısız test var.' : `\nSONUÇ: ${results.length}/${results.length} test geçti.`)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
