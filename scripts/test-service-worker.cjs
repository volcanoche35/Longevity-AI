const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict')
const handlers={},writes=[],deleted=[]
let networkCalls=0
const context={URL,Response,Promise,
 self:{location:{origin:'https://example.test'},addEventListener:(name,cb)=>{handlers[name]=cb},skipWaiting:()=>Promise.resolve(),clients:{claim:()=>Promise.resolve()}},
 caches:{match:async()=>new Response('old-cache'),open:async()=>({put:async(req,copy)=>writes.push(await copy.text()),addAll:async()=>{}}),keys:async()=>['biotrack-v1','biotrack-assistant-v3','another-app'],delete:async key=>deleted.push(key)},
 fetch:async()=>{networkCalls++;return new Response('new-network')}
}
vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),context)
async function main(){
 const waits=[];let result
 const req={url:'https://example.test/profile',method:'GET',mode:'navigate',headers:new Headers()}
 handlers.fetch({request:req,respondWith:p=>{result=p},waitUntil:p=>waits.push(p)})
 assert.equal(await(await result).text(),'new-network');await Promise.all(waits)
 assert.equal(networkCalls,1);assert.ok(writes.includes('new-network'))
 console.log('PASS: Sayfa isteği eski cache yerine ağdaki yeni sürümü döndürüyor ve kaydediyor.')
 for(const special of [{...req,url:'https://example.test/api/ai'},{...req,headers:new Headers({RSC:'1'})},{...req,url:'https://outside.test/image.jpg'}]){
  result=undefined;handlers.fetch({request:special,respondWith:p=>{result=p},waitUntil:()=>{}});assert.equal(result,undefined)
 }
 console.log('PASS: API, RSC ve dış kaynak istekleri önbelleğe alınmıyor.')
 const activation=[];handlers.activate({waitUntil:p=>activation.push(p)});await Promise.all(activation)
 assert.deepEqual(deleted,['biotrack-v1'])
 console.log('PASS: Eski BioTrack cache temizleniyor, diğer uygulamanın cache’i korunuyor.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
