import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const seed=JSON.parse(await readFile(new URL('../public/seed.json',import.meta.url),'utf8'));
const key=account=>'zhijian-template-content-cache-v1-'+account;
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(data)});
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
const extra={...seed[0],id:'private-new',title:'私有实例内容',quote:'新的本地测试引句',addedAt:'2026-10-30T10:00:00Z'};
function client(fetcher,storage=new Map()){
 const elements=new Map(),calls=[];const el=id=>{if(!elements.has(id))elements.set(id,{value:'',classList:{toggle(){},add(){},remove(){}},setAttribute(){},addEventListener(){},scrollIntoView(){}});return elements.get(id);};
 const ctx=vm.createContext({document:{getElementById:el,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:(p,o)=>{calls.push(p);return fetcher(p,o);},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,Intl,console});vm.runInContext(code,ctx);return {calls,storage,el,run:s=>vm.runInContext(s,ctx)};
}
test('public seed displays immediately while all three startup requests begin together',()=>{
 const storage=new Map([['zhijian-template-seed-cache-v1',JSON.stringify({version:1,entries:seed})]]);const c=client(()=>new Promise(()=>{}),storage);assert.equal(c.el('totalCount').textContent,12);assert.deepEqual(c.calls,['/seed.json','/api/content','/api/profile']);
});
test('private content cache stays hidden until the server confirms its matching account',async()=>{
 let confirm;const storage=new Map([[key('a'),JSON.stringify({version:1,account:'a',entries:[extra],updatedAt:null})]]);
 const c=client(path=>path==='/api/profile'?new Promise(r=>confirm=r):path==='/seed.json'?Promise.resolve(response(seed)):new Promise(()=>{}),storage);await settle();assert.equal(c.run('entries.some(e=>e.id==="private-new")'),false);
 confirm(response({account:'a',records:{}}));await settle();assert.equal(c.run('entries[0].id'),'private-new');
});
test('expired sessions and different accounts do not restore another account cache',async()=>{
 for(const profile of [response({},401),response({account:'b',records:{}})]){const storage=new Map([[key('a'),JSON.stringify({version:1,account:'a',entries:[extra]})]]);const c=client(async path=>path==='/seed.json'?response(seed):path==='/api/profile'?profile:response({},401),storage);await settle();assert.equal(c.run('entries.some(e=>e.id==="private-new")'),false);}
});
test('slow profile and late seed cannot block or overwrite fresh authenticated content',async()=>{
 let finishSeed;const c=client(path=>path==='/seed.json'?new Promise(r=>finishSeed=r):path==='/api/profile'?new Promise(()=>{}):Promise.resolve(response({account:'a',entries:[extra],updatedAt:extra.addedAt})));await settle();assert.equal(c.run('entries[0].id'),'private-new');finishSeed(response(seed));await settle();assert.equal(c.run('entries[0].id'),'private-new');assert.equal(JSON.parse(c.storage.get(key('a'))).entries[0].id,'private-new');
});
test('failed refresh keeps authorized cached content; malformed storage does not stop loading',async()=>{
 const storage=new Map([[key('a'),JSON.stringify({version:1,account:'a',entries:[extra]})]]);const c=client(async path=>{if(path==='/seed.json')return response(seed);if(path==='/api/profile')return response({account:'a',records:{}});throw Error('network down');},storage);await settle();assert.equal(c.run('entries[0].id'),'private-new');
 const d=client(async path=>path==='/seed.json'?response(seed):path==='/api/profile'?response({account:'a',records:{}}):response({account:'a',entries:seed}),new Map([['zhijian-template-seed-cache-v1','not-json']]));await settle();assert.equal(d.run('entries.length'),12);
});
