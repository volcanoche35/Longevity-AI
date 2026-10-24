const fs = require('node:fs')
const ts = require('typescript')
const assert = require('node:assert/strict')
const output = ts.transpileModule(fs.readFileSync('src/lib/dosage.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const mod = {exports:{}}
new Function('module','exports',output)(mod,mod.exports)
const {doseTotals,doseSummary,validateDose,positiveAmount}=mod.exports
const part=(label,amount,unit='mg')=>({label,amount,unit})
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
console.log('Doz testleri geçti: toplam, karma birim, damla, mikrogram/hap, ondalık ve geçersiz girişler.')
