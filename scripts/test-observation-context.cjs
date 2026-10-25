const assert=require('node:assert/strict')
const {libPath}=require('./ts-harness.cjs')
const {parseObservations,buildObservationContext}=require(libPath('observation-context.ts'))
assert.equal(parseObservations(null),null)
const input={days:999,observations:[{day:'2026-10-25',energy:4,sleep:3,digestion:4,supplementNames:['Test ürünü'],note:'Test özbildirimi',displayName:'GİZLİ'}]}
const out=parseObservations(input)
assert.equal(out.days,1)
assert.ok(!JSON.stringify(out).includes('GİZLİ'))
assert.ok(buildObservationContext(out).includes('neden-sonuç çıkarma'))
for(const change of [{energy:6},{sleep:1.2},{day:'2026-02-30'},{supplementNames:'x'},{note:'x'.repeat(501)}]) {
 assert.throws(()=>parseObservations({observations:[{...input.observations[0],...change}]}))
}
assert.throws(()=>parseObservations({observations:Array(15).fill(input.observations[0])}))
assert.throws(()=>parseObservations({observations:[input.observations[0],input.observations[0]]}))
console.log('PASS: AI günlük payload whitelist, sayı sınırı, gerçek tarih, tekrar, puan1–5 ve not sınırı.')
