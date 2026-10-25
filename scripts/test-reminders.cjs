/**
 * Hatırlatma modülü testleri — gerçek Node + sahte localStorage.
 *
 * Kapsam: varsayılan hatırlatma üretmemek, bozuk depo, alan doğrulama, saat
 * sınırları, deterministik "zamanı geldi" hesabı, gün anahtarlı "aldım" ve
 * ertesi gün sıfırlanma, 10 dk erteleme bitişi, silme ve SSR güvenliği.
 */
const assert = require('node:assert/strict')
const { installBrowser, makeStorage, quotaError, freshRequire, libPath } = require('./ts-harness.cjs')

const results = []
const test = (name, fn) => {
  try { fn(); results.push(`✅ ${name}`) }
  catch (err) {
    results.push(`❌ ${name}\n   ${err.message}`)
    process.exitCode = 1
  }
}

let browser = installBrowser()
let reminders = require(libPath('reminders.ts'))
const { REMINDERS_KEY } = reminders

const at = (day, hour, minute) => new Date(2026, 9, day, hour, minute, 0, 0)

test('ilk açılışta hatırlatma yok ve depoya varsayılan kayıt yazılmıyor', () => {
  assert.deepEqual(reminders.listReminders(), [])
  assert.deepEqual(reminders.dueReminders(at(25, 23, 59)), [])
  assert.deepEqual(reminders.todaysPlan(at(25, 9, 0)), [])
  assert.equal(browser.storage.getItem(REMINDERS_KEY), null)
})

test('bozuk JSON çökme yapmaz, boş plan döner', () => {
  browser.storage.setItem(REMINDERS_KEY, '{bad json')
  assert.deepEqual(reminders.listReminders(), [])
  assert.deepEqual(reminders.dueReminders(at(25, 12, 0)), [])
  assert.deepEqual(reminders.getAcknowledgedIds(at(25, 12, 0)), [])
})

test('bozuk kayıtlar atılır, geçerli kayıt ve bugünün işareti korunur', () => {
  browser.storage.setItem(REMINDERS_KEY, JSON.stringify({
    version: 1,
    items: [
      { id: 'ok1', title: 'Geçerli', time: '09:00', kind: 'general', note: '', createdAt: at(25, 8, 0).toISOString(), snoozeUntil: null },
      { id: 'badtime', title: 'Kötü saat', time: '25:90', kind: 'general', note: '', createdAt: at(25, 8, 0).toISOString() },
      { id: 'badkind', title: 'Kötü tür', time: '09:00', kind: 'ilaç', note: '', createdAt: at(25, 8, 0).toISOString() },
      { id: 'longnote', title: 'Uzun not', time: '09:00', kind: 'general', note: 'x'.repeat(301), createdAt: at(25, 8, 0).toISOString() },
      { id: 'ok1', title: 'Tekrar', time: '10:00', kind: 'general', note: '', createdAt: at(25, 8, 0).toISOString() },
      'bozuk satır',
    ],
    acks: {
      '2026-10-25': ['ok1', 'badtime', 42, 'ok1'],
      '2026-13-99': ['ok1'],
      bozuk: ['ok1'],
    },
  }))
  const items = reminders.listReminders()
  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'ok1')
  assert.deepEqual(reminders.getAcknowledgedIds(at(25, 12, 0)), ['ok1'])
  assert.deepEqual(reminders.dueReminders(at(25, 12, 0)), [])
})

test('başlık, saat, tür ve not doğrulanıyor', () => {
  browser.storage.clear()
  const base = { title: 'Test', time: '09:00', kind: 'general', note: '' }
  for (const bad of ['', '   ', 'x'.repeat(101)]) {
    assert.throws(() => reminders.addReminder({ ...base, title: bad }, at(25, 8, 0)), /Başlık/)
  }
  for (const bad of ['9:00', '24:00', '23:60', '', '0900']) {
    assert.throws(() => reminders.addReminder({ ...base, time: bad }, at(25, 8, 0)), /Saat/)
  }
  assert.throws(() => reminders.addReminder({ ...base, kind: 'medication' }, at(25, 8, 0)), /Tür/)
  assert.throws(() => reminders.addReminder({ ...base, note: 'n'.repeat(301) }, at(25, 8, 0)), /Not/)
  assert.equal(browser.storage.getItem(REMINDERS_KEY), null)
})

test('ekleme saat sırasına göre, kullanıcının girdiği alanlarla kalıcı', () => {
  browser.storage.clear()
  const walk = reminders.addReminder({ title: '  Kısa yürüyüş  ', time: '18:30', kind: 'walk', note: ' 10 dakika  ' }, at(25, 8, 0))
  const vitamin = reminders.addReminder({ title: 'D vitamini', time: '09:00', kind: 'supplement', note: '' }, at(25, 8, 1))
  assert.equal(walk.title, 'Kısa yürüyüş')
  assert.equal(walk.note, '10 dakika')
  assert.equal(walk.snoozeUntil, null)
  assert.ok(vitamin.id !== walk.id)

  reminders = freshRequire(libPath('reminders.ts')) // sayfa yenilendi
  const reloaded = reminders.listReminders()
  assert.deepEqual(reloaded.map(item => item.time), ['09:00', '18:30'])
  assert.deepEqual(reloaded.map(item => item.title), ['D vitamini', 'Kısa yürüyüş'])
  assert.equal(reloaded[1].note, '10 dakika')
})

test('zamanı gelme yerel saate göre deterministik; geçmiş saat hemen due olur', () => {
  const plan = reminders.listReminders()
  assert.deepEqual(reminders.dueReminders(at(25, 8, 59)).map(item => item.title), [])
  assert.deepEqual(reminders.todaysPlan(at(25, 8, 59)).map(item => item.status), ['upcoming', 'upcoming'])

  const due = reminders.dueReminders(at(25, 9, 1))
  assert.deepEqual(due.map(item => item.title), ['D vitamini'])
  assert.equal(reminders.reminderStatus(plan[0], at(25, 9, 1), []), 'due')
  assert.equal(reminders.reminderStatus(plan[1], at(25, 9, 1), []), 'upcoming')
  assert.deepEqual(reminders.todaysPlan(at(25, 9, 1)).map(item => item.status), ['due', 'upcoming'])

  // Aynı gün gece yarısına doğru sıralama değişmez.
  assert.deepEqual(reminders.dueReminders(at(25, 23, 59)).map(item => item.title), ['D vitamini', 'Kısa yürüyüş'])
})

test('“Aldım” bugün için kalıcı; yenilenince korunur ve kart tamamlandı görünür', () => {
  const vitamin = reminders.listReminders().find(item => item.title === 'D vitamini')
  assert.equal(reminders.acknowledgeReminder(vitamin.id, at(25, 9, 5)), true)
  assert.deepEqual(reminders.dueReminders(at(25, 9, 5)), [])
  assert.deepEqual(reminders.getAcknowledgedIds(at(25, 9, 5)), [vitamin.id])
  const saved = JSON.parse(browser.storage.getItem(REMINDERS_KEY))
  assert.deepEqual(saved.acks['2026-10-25'], [vitamin.id])

  reminders = freshRequire(libPath('reminders.ts'))
  assert.deepEqual(reminders.dueReminders(at(25, 10, 0)), [])
  const entry = reminders.todaysPlan(at(25, 10, 0)).find(item => item.id === vitamin.id)
  assert.equal(entry.status, 'done')
})

test('ertesi gün “aldım” sıfırlanır, hatırlatma yeniden due olur', () => {
  const tomorrow = at(26, 9, 1)
  assert.deepEqual(reminders.getAcknowledgedIds(tomorrow), [])
  assert.deepEqual(reminders.dueReminders(tomorrow).map(item => item.title), ['D vitamini'])
  const entry = reminders.todaysPlan(tomorrow).find(item => item.title === 'D vitamini')
  assert.equal(entry.status, 'due')
  // Dünün işareti depoda duruyor ama bugünü etkilemiyor.
  const saved = JSON.parse(browser.storage.getItem(REMINDERS_KEY))
  assert.equal(saved.acks['2026-10-25'].length, 1)
})

test('10 dk erteleme bitişi ISO ve gün olarak döner; süre dolunca tekrar due', () => {
  const vitamin = reminders.listReminders().find(item => item.title === 'D vitamini')
  const result = reminders.snoozeReminder(vitamin.id, 10, at(26, 9, 1))
  assert.equal(result.minutes, 10)
  assert.equal(result.until, at(26, 9, 11).toISOString())
  assert.equal(result.day, '2026-10-26')
  assert.equal(reminders.reminderStatus(reminders.listReminders()[0], at(26, 9, 5), []), 'snoozed')
  assert.deepEqual(reminders.dueReminders(at(26, 9, 5)), [])
  assert.deepEqual(reminders.dueReminders(at(26, 9, 11)).map(item => item.title), ['D vitamini'])
  assert.throws(() => reminders.snoozeReminder(vitamin.id, 0, at(26, 9, 1)), /Erteleme/)
})

test('silme kaydı ve işaretleri kaldırır; olmayan kimlik false', () => {
  const walk = reminders.listReminders().find(item => item.title === 'Kısa yürüyüş')
  reminders.acknowledgeReminder(walk.id, at(26, 18, 40))
  assert.equal(reminders.deleteReminder(walk.id), true)
  assert.equal(reminders.listReminders().some(item => item.id === walk.id), false)
  assert.equal(reminders.getAcknowledgedIds(at(26, 18, 40)).includes(walk.id), false)
  assert.equal(reminders.deleteReminder('yok'), false)
  const saved = JSON.parse(browser.storage.getItem(REMINDERS_KEY))
  assert.equal(JSON.stringify(saved.acks).includes(walk.id), false)
})

test('SSR’de okuma boş, yazma açıkça reddedilir (sahte kayıt yok)', () => {
  browser.uninstall()
  reminders = freshRequire(libPath('reminders.ts'))
  assert.deepEqual(reminders.listReminders(), [])
  assert.deepEqual(reminders.dueReminders(at(26, 9, 1)), [])
  assert.deepEqual(reminders.todaysPlan(at(26, 9, 1)), [])
  assert.equal(reminders.acknowledgeReminder('x'), false)
  assert.equal(reminders.deleteReminder('x'), false)
  assert.equal(reminders.snoozeReminder('x'), null)
  assert.throws(
    () => reminders.addReminder({ title: 'SSR', time: '09:00', kind: 'general' }, at(26, 8, 0)),
    /tarayıcıda/,
  )
  browser = installBrowser({ storage: makeStorage({ initial: { [REMINDERS_KEY]: '{"items":[]}' } }) })
})

test('depolama yazma hatası sessizce yutulmaz', () => {
  browser = installBrowser({ storage: makeStorage({ failWrite: quotaError() }) })
  reminders = freshRequire(libPath('reminders.ts'))
  assert.throws(
    () => reminders.addReminder({ title: 'Kota', time: '09:00', kind: 'general' }, at(26, 8, 0)),
    /depolama alanı dolu/,
  )
  assert.deepEqual(reminders.listReminders(), [])
})

test('depolama erişimi engelliyse okuma güvenli, listeler boş', () => {
  browser = installBrowser({ storage: 'throws' })
  reminders = freshRequire(libPath('reminders.ts'))
  assert.deepEqual(reminders.listReminders(), [])
  assert.deepEqual(reminders.dueReminders(at(26, 9, 0)), [])
  assert.deepEqual(reminders.todaysPlan(at(26, 9, 0)), [])
  browser.uninstall()
})

console.log(results.join('\n'))
if (process.exitCode) {
  console.error(`\n${results.filter(line => line.startsWith('❌')).length} test başarısız.`)
} else {
  console.log('\nTüm hatırlatma testleri geçti.')
}
