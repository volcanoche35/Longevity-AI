const fs = require('node:fs')
const ts = require('typescript')
const assert = require('node:assert/strict')
const output = ts.transpileModule(fs.readFileSync('src/lib/dosage.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const mod = {exports:{}}
new Function('module','exports',output)(mod,mod.exports)
const {doseTotals,doseSummary,validateDose,positiveAmount,unitsForForm,dailyIntakeSummary,labelContentLines,normalizeDosePlan}=mod.exports
const part=(label,amount,unit='mg')=>({label,amount,unit})
const plan=(p)=>({parts:p.parts||[],form:p.form||'Hap',dailyCount:p.dailyCount||'',...(p.dailyAmount?{dailyAmount:p.dailyAmount,dailyUnit:p.dailyUnit}:{})})

// ── Eski arayüz: aynı davranış ──
assert.equal(doseTotals([part('Sitrat','200'),part('Klorür','200')]),'400 mg/gün')
assert.equal(doseTotals([part('D3','12','damla')]),'12 damla/gün')
assert.equal(doseTotals([part('D3','2','µg')]),'2 µg/gün')
assert.equal(doseTotals([part('A','0,2','g'),part('B','200')]),'400 mg/gün')
assert.equal(doseTotals([part('A','12','damla'),part('B','200')]),'12 damla/gün · 200 mg/gün')
assert.equal(doseSummary({parts:[part('D3','2','µg')],form:'Hap',dailyCount:'1'}),'D3: 2 µg/gün · 1 Hap/gün')
for(const amount of ['0','-2','NaN','Infinity','1.2.3','']) assert.equal(positiveAmount(amount),null)
assert.equal(positiveAmount('0,5'),0.5)
assert.equal(validateDose({parts:[part('Sitrat','200'),part('Klorür','200')],form:'Kapsül',dailyCount:'2'}),null)
assert.ok(validateDose({parts:[part('','200'),part('','200')],form:'Hap',dailyCount:''}))

// ── Yeni akış: kullanım şekli -> günde ne kadar ──
assert.deepEqual(unitsForForm('Toz'),['mg','g'])
assert.ok(!unitsForForm('Toz').includes('adet'))
assert.deepEqual(unitsForForm('Hap'),['adet'])
assert.deepEqual(unitsForForm('Damla'),['damla'])
assert.deepEqual(unitsForForm('Sıvı'),['damla','ml'])

assert.equal(dailyIntakeSummary(plan({form:'Toz',dailyAmount:'5',dailyUnit:'g'})),'Günde 5 g toz')
assert.equal(dailyIntakeSummary(plan({form:'Toz',dailyAmount:'200',dailyUnit:'mg'})),'Günde 200 mg toz')
assert.equal(dailyIntakeSummary(plan({form:'Hap',dailyAmount:'1',dailyUnit:'adet'})),'Günde 1 hap')
assert.equal(dailyIntakeSummary(plan({form:'Kapsül',dailyAmount:'1',dailyUnit:'adet'})),'Günde 1 kapsül')
assert.equal(dailyIntakeSummary(plan({form:'Damla',dailyAmount:'12',dailyUnit:'damla'})),'Günde 12 damla')
assert.equal(dailyIntakeSummary(plan({form:'Sıvı',dailyAmount:'10',dailyUnit:'ml'})),'Günde 10 ml sıvı')
assert.equal(dailyIntakeSummary(plan({form:'Toz',dailyAmount:'5,5',dailyUnit:'g'})),'Günde 5,5 g toz')

// ── Etiket içeriği günlük miktara eklenmez (çift toplam yok) ──
const tozWithLabel=plan({form:'Toz',dailyAmount:'200',dailyUnit:'mg',parts:[part('Magnezyum','200','mg')]})
assert.equal(dailyIntakeSummary(tozWithLabel),'Günde 200 mg toz · etiketi 200 mg Magnezyum')
assert.ok(!dailyIntakeSummary(tozWithLabel).includes('400'))

// ── Hap/kapsül: günlük adet + etiket içeriği ayrı ──
const hap=plan({form:'Kapsül',dailyAmount:'1',dailyUnit:'adet',parts:[part('D3','2','µg')]})
assert.equal(dailyIntakeSummary(hap),'Günde 1 kapsül · etiketi 2 µg D3')

// ── Farklı içerikler tek toplam gibi sunulmaz ──
assert.deepEqual(labelContentLines([part('D3','2','µg'),part('K2','45','µg')]),['2 µg D3','45 µg K2'])
assert.ok(!labelContentLines([part('D3','2','µg'),part('K2','45','µg')]).some(l=>l.startsWith('47')))
// Aynı mineralin iki tuzu aynı madde sayılır ve doğru etiketlenir
const salts=labelContentLines([part('Magnezyum sitrat','200','mg'),part('Magnezyum klorür','200','mg')])
assert.equal(salts.length,1)
assert.ok(salts[0].startsWith('400 mg'))
assert.ok(salts[0].includes('sitrat')&&salts[0].includes('klorür'))
// Farklı içerik farklı birimde birleşmez
assert.equal(labelContentLines([part('D3','12','damla'),part('K2','200','mg')]).length,2)

// ── Eski kayıtlar bozulmadan okunur ──
assert.equal(dailyIntakeSummary({parts:[part('D3','2','µg')],form:'Kapsül',dailyCount:'1'}),'Günde 1 kapsül · etiketi 2 µg D3')
assert.equal(dailyIntakeSummary({parts:[part('D3','12','damla')],form:'Damla',dailyCount:''}),'Günde 12 damla')
assert.equal(dailyIntakeSummary({parts:[part('A','0,2','g'),part('B','200','mg')],form:'Toz',dailyCount:''}),'A: 0,2 g/gün + B: 200 mg/gün · Toz')
const legacyToz=normalizeDosePlan({parts:[part('Magnezyum','5','g')],form:'Toz',dailyCount:''})
assert.deepEqual(legacyToz.parts,[])
assert.equal(legacyToz.dailyAmount,'5')
// Bozuk/eski JSON çökmez
for(const raw of [null,undefined,{},'x',{parts:'x'},{parts:[null,{amount:200,unit:'mg'}]}]) normalizeDosePlan(raw)

// ── Doğrulama ──
assert.equal(validateDose(plan({form:'Toz',dailyAmount:'5',dailyUnit:'g'})),null)
assert.equal(validateDose(plan({form:'Kapsül',dailyAmount:'1',dailyUnit:'adet',parts:[part('D3','2','µg')]})),null)
assert.ok(validateDose(plan({form:'Toz',dailyAmount:'1',dailyUnit:'adet'})))
assert.ok(validateDose(plan({form:'Toz',dailyAmount:'0',dailyUnit:'g'})))
assert.ok(validateDose(plan({form:'Hap',dailyAmount:'1',dailyUnit:'adet',parts:[part('D3','','µg')]})))
assert.ok(validateDose({parts:[],form:'Toz',dailyCount:''}))

console.log('Doz testleri geçti (24 doğrulama): eski sözleşme, toz mg/g, günlük miktar, damla/hap, etiket detayı, çift toplam yok, D3+K2 ayrı, eski kayıt normalizasyonu, doğrulama.')
