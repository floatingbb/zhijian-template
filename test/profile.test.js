import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const code=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const prefix=code.includes("'zhijian-template-read'")?'zhijian-template':'zhijian';
const settle=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
function server(){
 const accounts=new Map();
 return {accounts,fetch(account,options){
   const records=accounts.get(account)||{};
   if(options.method==='POST')for(const op of JSON.parse(options.body).ops){const row=records[op.entryId]||{},old=row[op.field];if(!old||op.at>old.at||(op.at===old.at&&op.id>old.id))row[op.field]={value:op.value,at:op.at,id:op.id};records[op.entryId]=row;}
   accounts.set(account,records);return {ok:true,status:200,json:async()=>structuredClone({account,records})};
 }};
}
function device(api,storage=new Map(),offline=false,account='a'){
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{value:'',classList:{toggle(){},add(){},remove(){}},setAttribute(){},addEventListener(){},scrollIntoView(){},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);};
 const control={offline,account,failPost:false};
 const ctx=vm.createContext({document:{getElementById:element,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,console,Intl,fetch:async(path,options={})=>{if(control.offline||control.failPost&&options.method==='POST')throw new Error('offline');if(path==='/api/profile')return api.fetch(control.account,options);return {ok:true,json:async()=>path==='/seed.json'?[]:{entries:[]}};}});
 vm.runInContext(code,ctx);return {storage,control,run:s=>vm.runInContext(s,ctx)};
}
test('offline reload preserves new marks and explicit cancellations across another reload',async()=>{
 const api=server(),first=device(api);await settle();first.run('toggleRead(1);toggleSaved(1)');await first.run('syncProfile()');
 const offline=device(api,first.storage,true);await settle();offline.run('toggleRead(1);toggleSaved(1);toggleRead(2);toggleSaved(3)');await offline.run('syncProfile()');
 assert.equal(offline.run('profilePending.length'),4);
 const reopened=device(api,first.storage,true);await settle();assert.equal(reopened.run('profilePending.length'),4);
 reopened.control.offline=false;await reopened.run('syncProfile()');
 const remote=api.accounts.get('a');assert.equal(remote['1'].read.value,false);assert.equal(remote['1'].saved.value,false);assert.equal(remote['2'].read.value,true);assert.equal(remote['3'].saved.value,true);assert.equal(reopened.run('profilePending.length'),0);
 const other=device(api);await settle();assert.equal(other.run('readIds.has("2")'),true);assert.equal(other.run('saved.has("1")'),false);
});
test('first connection retains pre-login actions including an explicit un-read',async()=>{
 const api=server();api.accounts.set('a',{'1':{read:{value:true,at:1,id:'remote-old'}}});
 const storage=new Map([[prefix+'-read','["1"]']]);const client=device(api,storage,true);await settle();client.run('toggleRead(1);toggleSaved(2)');
 assert.equal(JSON.parse(storage.get(prefix+'-pending-local')).length,2);
 client.control.offline=false;await client.run('syncProfile()');assert.equal(api.accounts.get('a')['1'].read.value,false);assert.equal(api.accounts.get('a')['2'].saved.value,true);assert.deepEqual(JSON.parse(storage.get(prefix+'-pending-local')),[]);
});
test('a rejected upload remains durable and is retried after reopening',async()=>{
 const api=server(),client=device(api);await settle();client.control.failPost=true;client.run('toggleRead(4)');await client.run('syncProfile()');assert.equal(client.run('profilePending.length'),1);
 const reopened=device(api,client.storage);await settle();assert.equal(api.accounts.get('a')['4'].read.value,true);assert.equal(reopened.run('profilePending.length'),0);
});
test('pending changes stay with their original account when login changes',async()=>{
 const api=server(),client=device(api);await settle();client.control.offline=true;client.run('toggleRead(5)');client.control.offline=false;client.control.account='b';await client.run('syncProfile()');assert.equal(api.accounts.get('b')['5'],undefined);
 client.control.account='a';await client.run('syncProfile()');assert.equal(api.accounts.get('a')['5'].read.value,true);
});
test('an old pending operation cannot undo a newer remote cancellation',async()=>{
 const api=server(),client=device(api);await settle();client.control.offline=true;client.run('toggleRead(6)');const at=client.run('profilePending[0].at');api.accounts.set('a',{'6':{read:{value:false,at:at+1,id:'newer_remote'}}});client.control.offline=false;await client.run('syncProfile()');assert.equal(client.run('readIds.has("6")'),false);assert.equal(api.accounts.get('a')['6'].read.value,false);
});
