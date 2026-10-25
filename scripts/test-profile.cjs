/**
 * Yerel profil testleri: sözleşme, doğrulama, kalıcılık, storage olayı,
 * bozuk kayıt, kota ve erişim engeli.
 */
const assert = require('node:assert/strict')
const { installBrowser, quotaError, freshRequire, libPath } = require('./ts-harness.cjs')

const results = []
const test = async (name, fn) => {
  try { await fn(); results.push(`✅ ${name}`) }
  catch (err) { results.push(`❌ ${name}\n   ${err.message}`); process.exitCode = 1 }
}

async function main() {
  let browser = installBrowser()
  let profile = require(libPath('profile.ts'))
  const KEY = profile.PROFILE_STORAGE_KEY

  await test('varsayılan profil boş ve uydurma kimlik yok', () => {
    assert.deepEqual(profile.loadProfile(), {
      displayName: '', anatomyVariant: null, heightCm: '', weightKg: '', onboardingComplete: false,
      age: '', sex: null, goal: '', medications: '', conditions: '', allergies: '', aiProfileConsent: false,
    })
    assert.equal(browser.storage.getItem(KEY), null, 'okuma diske yazmamalı')
  })

  await test('isim kaydedilip yenilemeden sonra korunuyor (boşluklar temizlenir)', () => {
    profile.saveProfile({ displayName: '  Volkan   Yılmaz  ' })
    assert.equal(profile.loadProfile().displayName, 'Volkan Yılmaz')
    profile = freshRequire(libPath('profile.ts'))
    const loaded = profile.loadProfile()
    assert.equal(loaded.displayName, 'Volkan Yılmaz')
    assert.equal(loaded.onboardingComplete, false)
  })

  await test('görünüm tercihi ve ölçüler kaydediliyor, virgüllü ondalık normalize ediliyor', () => {
    profile.saveProfile({ anatomyVariant: 'female', heightCm: '175,5', weightKg: '76' })
    const loaded = profile.loadProfile()
    assert.equal(loaded.anatomyVariant, 'female')
    assert.equal(loaded.heightCm, '175.5')
    assert.equal(loaded.weightKg, '76')
    assert.equal(loaded.displayName, 'Volkan Yılmaz', 'kısmi kayıt diğer alanları silmemeli')
  })

  await test('boy/kilo boş bırakılabiliyor', () => {
    profile.saveProfile({ heightCm: '', weightKg: '' })
    const loaded = profile.loadProfile()
    assert.equal(loaded.heightCm, '')
    assert.equal(loaded.weightKg, '')
  })

  await test('geçersiz görünüm tercihi reddediliyor, depo değişmiyor', () => {
    const before = browser.storage.getItem(KEY)
    assert.throws(() => profile.saveProfile({ anatomyVariant: 'other' }), /Görünüm tercihi/)
    assert.equal(browser.storage.getItem(KEY), before)
  })

  await test('geçersiz boy/kilo/isim reddediliyor', () => {
    assert.throws(() => profile.saveProfile({ heightCm: 'abc' }), /Boy/)
    assert.throws(() => profile.saveProfile({ heightCm: '999' }), /aralığında/)
    assert.throws(() => profile.saveProfile({ weightKg: '5' }), /Kilo/)
    assert.throws(() => profile.saveProfile({ weightKg: '-70' }), /Kilo/)
    assert.throws(() => profile.saveProfile({ displayName: 'x'.repeat(61) }), /60 karakter/)
    assert.throws(() => profile.saveProfile({ displayName: 42 }), /metin/)
  })

  await test('onboardingComplete boolean olarak saklanıyor', () => {
    profile.saveProfile({ onboardingComplete: true })
    assert.equal(profile.loadProfile().onboardingComplete, true)
    assert.throws(() => profile.saveProfile({ onboardingComplete: 'evet' }), /doğru\/yanlış/)
  })

  await test('onProfileChange aynı sekmedeki kayıtta tetikleniyor, iptal sonrası susuyor', () => {
    let notified = 0
    const off = profile.onProfileChange(() => { notified += 1 })
    profile.saveProfile({ displayName: 'Volkan' })
    assert.equal(notified, 1)
    off()
    profile.saveProfile({ displayName: 'Volkan Yılmaz' })
    assert.equal(notified, 1)
  })

  await test('başka sekmenin yazdığı profil storage olayıyla okunuyor', () => {
    let notified = 0
    const off = profile.onProfileChange(() => { notified += 1 })
    const other = JSON.stringify({
      displayName: 'Başka Sekme', anatomyVariant: 'male', heightCm: '180',
      weightKg: '', onboardingComplete: true,
    })
    browser.storage.setItem(KEY, other)
    browser.fire('storage', { key: KEY, newValue: other })
    assert.equal(notified, 1)
    const loaded = profile.loadProfile()
    assert.equal(loaded.displayName, 'Başka Sekme')
    assert.equal(loaded.anatomyVariant, 'male')
    off()
  })

  await test('farklı anahtarlı storage olayı dinleyiciyi tetiklemiyor', () => {
    let notified = 0
    const off = profile.onProfileChange(() => { notified += 1 })
    browser.fire('storage', { key: 'baska.anahtar', newValue: 'x' })
    assert.equal(notified, 0)
    off()
  })

  await test('bozuk JSON yüklemeyi çökertmiyor, varsayılana düşüyor', () => {
    browser.storage.setItem(KEY, '{bozuk')
    profile = freshRequire(libPath('profile.ts'))
    assert.deepEqual(profile.loadProfile(), {
      displayName: '', anatomyVariant: null, heightCm: '', weightKg: '', onboardingComplete: false,
      age: '', sex: null, goal: '', medications: '', conditions: '', allergies: '', aiProfileConsent: false,
    })
    profile.saveProfile({ displayName: 'Onarıldı' })
    assert.equal(JSON.parse(browser.storage.getItem(KEY)).displayName, 'Onarıldı')
  })

  await test('bozuk alan tipleri alan bazında varsayılana düşüyor', () => {
    browser.storage.setItem(KEY, JSON.stringify({
      displayName: 42, anatomyVariant: 'x', heightCm: 'abc', weightKg: '75', onboardingComplete: 'evet',
    }))
    const loaded = profile.loadProfile()
    assert.equal(loaded.displayName, '')
    assert.equal(loaded.anatomyVariant, null)
    assert.equal(loaded.heightCm, '')
    assert.equal(loaded.weightKg, '75')
    assert.equal(loaded.onboardingComplete, false)
  })

  await test('kota hatasında saveProfile fırlatıyor, eski kayıt bozulmuyor, bildirim gitmiyor', () => {
    profile.saveProfile({ displayName: 'Kalıcı Ad' })
    const before = browser.storage.getItem(KEY)
    let notified = 0
    const off = profile.onProfileChange(() => { notified += 1 })
    browser.storage.failWrite = quotaError()
    assert.throws(() => profile.saveProfile({ displayName: 'Kaybolacak' }), /dolu/)
    browser.storage.failWrite = null
    assert.equal(browser.storage.getItem(KEY), before)
    assert.equal(profile.loadProfile().displayName, 'Kalıcı Ad')
    assert.equal(notified, 0)
    off()
  })

  await test('depolama erişimi engelliyse yükleme boş dönüyor, kayıt açık hata veriyor', () => {
    browser.uninstall()
    browser = installBrowser({ storage: 'throws' })
    profile = freshRequire(libPath('profile.ts'))
    assert.equal(profile.loadProfile().displayName, '')
    assert.throws(() => profile.saveProfile({ displayName: 'X' }), /erişilemiyor/)
    assert.equal(profile.profileStorageInfo().mode, 'memory')
  })

  await test('SSR (window yok): boş profil, kayıt denemesi hata veriyor', () => {
    browser.uninstall()
    profile = freshRequire(libPath('profile.ts'))
    assert.equal(profile.loadProfile().displayName, '')
    assert.throws(() => profile.saveProfile({ displayName: 'X' }), /Tarayıcı yok/)
  })

  await test('clearProfile kaydı siliyor ve dinleyicileri bilgilendiriyor', () => {
    browser = installBrowser()
    profile = freshRequire(libPath('profile.ts'))
    profile.saveProfile({ displayName: 'Silinecek' })
    let notified = 0
    const off = profile.onProfileChange(() => { notified += 1 })
    profile.clearProfile()
    assert.equal(browser.storage.getItem(KEY), null)
    assert.equal(profile.loadProfile().displayName, '')
    assert.equal(notified, 1)
    off()
  })

  /* ---------- sağlık profili + cinsiyet alanları (genişletme) ---------- */

  await test('yeni sağlık profil alanları kaydediliyor ve kalıcı', () => {
    browser = installBrowser()
    profile = freshRequire(libPath('profile.ts'))
    profile.saveProfile({
      age: ' 34 ', sex: 'female', heightCm: '168', weightKg: '62,5',
      goal: '  Daha iyi uyku  ', medications: 'Demir 1x', conditions: 'Hipotiroidi',
      allergies: 'Polen', aiProfileConsent: true,
    })
    profile = freshRequire(libPath('profile.ts'))
    const loaded = profile.loadProfile()
    assert.equal(loaded.age, '34')
    assert.equal(loaded.sex, 'female')
    assert.equal(loaded.anatomyVariant, 'female', 'sex verilince anatomyVariant türetilmeli')
    assert.equal(loaded.weightKg, '62.5')
    assert.equal(loaded.goal, 'Daha iyi uyku')
    assert.equal(loaded.medications, 'Demir 1x')
    assert.equal(loaded.conditions, 'Hipotiroidi')
    assert.equal(loaded.allergies, 'Polen')
    assert.equal(loaded.aiProfileConsent, true)
  })

  await test('yaş yalnız tam sayı 1–120; boş bırakılabilir', () => {
    assert.throws(() => profile.saveProfile({ age: '34.5' }), /tam sayı/)
    assert.throws(() => profile.saveProfile({ age: 'abc' }), /tam sayı/)
    assert.throws(() => profile.saveProfile({ age: '0' }), /1–120/)
    assert.throws(() => profile.saveProfile({ age: '121' }), /1–120/)
    assert.throws(() => profile.saveProfile({ age: 34 }), /metin/)
    profile.saveProfile({ age: '' })
    assert.equal(profile.loadProfile().age, '')
    profile.saveProfile({ age: '120' })
    assert.equal(profile.loadProfile().age, '120')
  })

  await test('cinsiyet kadın/erkek/boş; anatomyVariant aynı değerden türetiliyor', () => {
    profile.saveProfile({ sex: 'male' })
    assert.equal(profile.loadProfile().sex, 'male')
    assert.equal(profile.loadProfile().anatomyVariant, 'male')
    profile.saveProfile({ sex: null })
    assert.equal(profile.loadProfile().sex, null)
    assert.equal(profile.loadProfile().anatomyVariant, null)
    assert.throws(() => profile.saveProfile({ sex: 'other' }), /Cinsiyet/)
  })

  await test('legacy anatomyVariant kaydı çalışıyor ama tıbbi cinsiyet türetmiyor', () => {
    profile.saveProfile({ anatomyVariant: 'female' })
    const loaded = profile.loadProfile()
    assert.equal(loaded.anatomyVariant, 'female')
    assert.equal(loaded.sex, null, 'görünüm tercihi tıbbi cinsiyet sayılmamalı')
    assert.throws(() => profile.saveProfile({ anatomyVariant: 'x' }), /Görünüm tercihi/)
  })

  await test('eski kayıtta sex yoksa anatomyVariant\'tan göç ediyor, eksik alan uydurmuyor', () => {
    browser.storage.setItem(KEY, JSON.stringify({
      displayName: 'Eski Kullanıcı', anatomyVariant: 'male', heightCm: '180', weightKg: '', onboardingComplete: true,
    }))
    profile = freshRequire(libPath('profile.ts'))
    const loaded = profile.loadProfile()
    assert.equal(loaded.sex, 'male')
    assert.equal(loaded.anatomyVariant, 'male')
    assert.equal(loaded.age, '', 'eksik yaş uydurulmamalı')
    assert.equal(loaded.goal, '')
    assert.equal(loaded.medications, '')
    assert.equal(loaded.aiProfileConsent, false)
    assert.equal(loaded.displayName, 'Eski Kullanıcı')
  })

  await test('sex alanı açıkça null ise anatomyVariant\'tan cinsiyet türetilmiyor', () => {
    browser.storage.setItem(KEY, JSON.stringify({
      displayName: 'Yeni', anatomyVariant: 'female', sex: null, heightCm: '', weightKg: '', onboardingComplete: true,
    }))
    const loaded = profile.loadProfile()
    assert.equal(loaded.sex, null)
    assert.equal(loaded.anatomyVariant, 'female')
  })

  await test('sex doluysa anatomyVariant sex önceliğine göre türetiliyor', () => {
    browser.storage.setItem(KEY, JSON.stringify({
      displayName: 'Çelişki', anatomyVariant: 'male', sex: 'female', heightCm: '', weightKg: '', onboardingComplete: false,
    }))
    const loaded = profile.loadProfile()
    assert.equal(loaded.anatomyVariant, 'female')
  })

  await test('hedef ve not alanlarının üst sınırı var, onay bayrağı katı boolean', () => {
    assert.equal(profile.loadProfile().goal.length <= 160, true)
    assert.throws(() => profile.saveProfile({ goal: 'x'.repeat(161) }), /Hedef/)
    assert.throws(() => profile.saveProfile({ medications: 'x'.repeat(501) }), /İlaçlar/)
    assert.throws(() => profile.saveProfile({ conditions: 'x'.repeat(501) }), /Sağlık durumları/)
    assert.throws(() => profile.saveProfile({ allergies: 'x'.repeat(501) }), /Alerjiler/)
    assert.throws(() => profile.saveProfile({ aiProfileConsent: 'evet' }), /doğru\/yanlış/)
    assert.throws(() => profile.saveProfile({ aiProfileConsent: 1 }), /doğru\/yanlış/)
  })

  await test('bozuk yeni alanlar yüklemede alan bazında varsayılana düşüyor', () => {
    browser.storage.setItem(KEY, JSON.stringify({
      displayName: 'Bozuk', anatomyVariant: 'female', sex: 'kadin', heightCm: 'abc', weightKg: '70',
      onboardingComplete: true, age: '34.5', goal: 5, medications: null, conditions: [], allergies: 'x'.repeat(600),
      aiProfileConsent: 'true',
    }))
    const loaded = profile.loadProfile()
    assert.equal(loaded.sex, null)
    assert.equal(loaded.anatomyVariant, 'female', 'sex geçersizse kayıtlı görünüm korunur')
    assert.equal(loaded.age, '')
    assert.equal(loaded.goal, '')
    assert.equal(loaded.medications, '')
    assert.equal(loaded.conditions, '')
    assert.equal(loaded.allergies, '')
    assert.equal(loaded.aiProfileConsent, false)
    assert.equal(loaded.weightKg, '70')
  })

  await test('geçersiz yeni alanlarda depo değişmiyor', () => {
    const before = browser.storage.getItem(KEY)
    assert.throws(() => profile.saveProfile({ age: '999' }), /1–120/)
    assert.throws(() => profile.saveProfile({ sex: 'x' }), /Cinsiyet/)
    assert.throws(() => profile.saveProfile({ goal: 'x'.repeat(200) }), /Hedef/)
    assert.equal(browser.storage.getItem(KEY), before)
  })

  console.log('\nProfil testleri')
  console.log(results.join('\n'))
  console.log(`\n${results.filter(r => r.startsWith('✅')).length}/${results.length} test geçti`)
  browser.uninstall()
}

main().catch(err => { console.error(err); process.exitCode = 1 })
