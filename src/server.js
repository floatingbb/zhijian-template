import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { Store } from './store.js';
import { createAuth } from './auth.js';
import { configFromEnv } from './config.js';
import { Updater, normalize } from './updater.js';

const publicRoot=fileURLToPath(new URL('../public/',import.meta.url));
const seed=JSON.parse(await readFile(resolve(publicRoot,'seed.json'),'utf8'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2'};
const opValid=o=>o&&typeof o.entryId==='string'&&/^(\d+|entry-[a-f0-9]{64})$/.test(o.entryId)&&['read','saved'].includes(o.field)&&typeof o.value==='boolean'&&typeof o.id==='string'&&/^[\w-]{8,100}$/.test(o.id)&&Number.isSafeInteger(o.at)&&o.at>=0&&o.at<=Date.now()+300000;
async function body(req,max=160000){let value='',size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw Object.assign(new Error('请求过大'),{status:413});value+=chunk;}try{return JSON.parse(value||'{}');}catch{throw Object.assign(new Error('JSON格式无效'),{status:400});}}
function send(res,status,value,headers={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'same-origin',...headers});res.end(JSON.stringify(value));}
export async function createApp(config,options={}){
  const store=options.store||new Store(config.dataDir);await store.init();const initial=await store.read();const auth=createAuth(config,initial.sessionSecret);
  const updater=options.updater||new Updater(store,config,{seed,fetcher:options.fetcher||fetch});
  const attempts=new Map();let generationJob=null;let generationError=null;
  const app=http.createServer(async(req,res)=>{try{
    if(!req.url||req.url.length>3000)return send(res,400,{error:'无效地址'});
    const url=new URL(req.url,'http://localhost');const path=url.pathname;
    let hostName;try{hostName=new URL('http://'+req.headers.host).hostname;}catch{return send(res,400,{error:'无效主机地址'});}
    if(config.publicOrigin&&req.headers.host!==new URL(config.publicOrigin).host)return send(res,403,{error:'请使用配置的PUBLIC_URL访问'});
    if(!config.publicOrigin&&!['127.0.0.1','localhost','[::1]'].includes(hostName))return send(res,403,{error:'对外访问请先配置PUBLIC_URL'});
    const origin=config.publicOrigin||'http://'+req.headers.host;
    if(!['GET','HEAD'].includes(req.method)&&((req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site'))return send(res,403,{error:'请求来源不被允许'});
    if(path==='/api/health')return send(res,200,{ok:true});
    const loggedIn=auth.loggedIn(req);
    if(path==='/api/config'&&req.method==='GET')return send(res,200,{passwordRequired:Boolean(config.password),authenticated:loggedIn,aiConfigured:loggedIn&&updater.configured(),autoEnabled:loggedIn&&config.autoEnabled,autoPublish:loggedIn&&config.autoPublish,dailyCount:config.dailyCount,updateHour:config.hour,timezone:config.timezone});
    if(path==='/api/login'&&req.method==='POST'){
      const address=req.socket.remoteAddress||'local';const now=Date.now();for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);if(attempts.size>10000)return send(res,429,{error:'请求过多，请稍后再试'});
      const attempt=attempts.get(address);if(attempt&&attempt.count>=8&&attempt.until>now)return send(res,429,{error:'尝试次数较多，请15分钟后再试'});
      const input=await body(req,4096);if(!config.password)return send(res,200,{ok:true});
      if(!auth.validPassword(input.password)){attempts.set(address,{count:(attempt?.count||0)+1,until:attempt?.until>now?attempt.until:now+900000});return send(res,401,{error:'访问密码不正确'});}
      attempts.delete(address);return send(res,200,{ok:true},{'set-cookie':auth.cookie()});
    }
    if(path==='/api/logout'&&req.method==='POST')return send(res,200,{ok:true},{'set-cookie':auth.cookie(true)});
    if(path.startsWith('/api/')&&!loggedIn)return send(res,401,{error:'请先输入此实例的访问密码'});
    if(path==='/api/content'&&req.method==='GET'){const state=await store.read();return send(res,200,{account:auth.account,entries:[...seed,...state.entries],updatedAt:state.lastUpdate});}
    if(path==='/api/profile'&&req.method==='GET'){const state=await store.read();return send(res,200,{account:auth.account,records:state.records,updatedAt:state.profileUpdatedAt||null});}
    if(path==='/api/profile'&&req.method==='POST'){
      const input=await body(req);if(!Array.isArray(input.ops)||input.ops.length>500||!input.ops.every(opValid))return send(res,400,{error:'阅读记录格式无效'});
      return send(res,200,await store.mutate(state=>{for(const op of input.ops){const r=state.records[op.entryId]||{},old=r[op.field];if(!old||op.at>old.at||(op.at===old.at&&op.id>old.id))r[op.field]={value:op.value,at:op.at,id:op.id};state.records[op.entryId]=r;}state.profileUpdatedAt=new Date().toISOString();return {account:auth.account,records:state.records,updatedAt:state.profileUpdatedAt};}));
    }
    if(path==='/api/drafts'&&req.method==='GET'){const state=await store.read();return send(res,200,{drafts:state.drafts,running:Boolean(generationJob||updater.running),lastRun:state.lastRun,error:generationError});}
    if(path==='/api/generate'&&req.method==='POST'){
      if(generationJob||updater.running)return send(res,409,{error:'已有生成任务正在运行'});if(!updater.configured())return send(res,400,{error:'请在服务器私密配置中填写自己的AI_BASE_URL、AI_MODEL和AI_API_KEY'});
      const input=await body(req,4096);const count=input.count??config.dailyCount;if(!Number.isInteger(count)||count<1||count>8)return send(res,400,{error:'每次生成1至8则'});
      generationError=null;generationJob=updater.run(count).catch(()=>{generationError='本次生成未完成，请检查供应商配置、余额或原典来源。';}).finally(()=>{generationJob=null;});return send(res,202,{started:true,message:'正在抓取原典并生成，请稍后检查草稿'});
    }
    if(['/api/drafts/publish','/api/drafts/discard'].includes(path)&&req.method==='POST'){
      const input=await body(req);if(!Array.isArray(input.ids)||input.ids.length>100||input.ids.some(id=>typeof id!=='string'))return send(res,400,{error:'请选择草稿'});
      return send(res,200,await store.mutate(state=>{const ids=new Set(input.ids),chosen=state.drafts.filter(e=>ids.has(e.id));if(path.endsWith('/publish')){const existing=new Set([...seed,...state.entries].map(e=>normalize(e.quote)));state.entries.push(...chosen.filter(e=>!existing.has(normalize(e.quote))));state.lastUpdate=new Date().toISOString();}else state.discarded=[...(state.discarded||[]),...chosen];state.drafts=state.drafts.filter(e=>!ids.has(e.id));return {changed:chosen.length};}));
    }
    if(path==='/api/export'&&req.method==='GET'){const state=await store.read();const {sessionSecret,...exported}=state;return send(res,200,exported,{'content-disposition':'attachment; filename="zhijian-backup.json"'});}
    if(path.startsWith('/api/'))return send(res,404,{error:'接口不存在'});
    if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'请求方法不支持'});
    const aliases={'/':'index.html','/favicon.ico':'favicon-32-v2.png','/apple-touch-icon.png':'apple-touch-icon-v2.png','/apple-touch-icon-precomposed.png':'apple-touch-icon-v2.png','/apple-touch-icon-180x180.png':'apple-touch-icon-v2.png','/apple-touch-icon-180x180-precomposed.png':'apple-touch-icon-v2.png'};
    const name=aliases[path]||path.slice(1);if(!/^[a-zA-Z0-9._-]+$/.test(name))return send(res,404,{error:'页面不存在'});
    const allow=new Set(['index.html','app.js','style.css','template.js','template.css','seed.json','manifest.webmanifest','icon-512-v2.png','icon-192-v2.png','apple-touch-icon-v2.png','favicon-32-v2.png','reader-song-v1.woff2','reader-wen-v1.woff2']);if(!allow.has(name))return send(res,404,{error:'页面不存在'});
    let file;try{file=await readFile(resolve(publicRoot,name));}catch{return send(res,404,{error:'页面不存在'});}
    res.writeHead(200,{'content-type':types[extname(name)]||'application/octet-stream','x-content-type-options':'nosniff','referrer-policy':'same-origin','cache-control':extname(name)==='.woff2'?'public, max-age=31536000, immutable':'no-cache','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:file);
  }catch(error){send(res,error.status||500,{error:error.status?error.message:'服务暂不可用，请稍后重试'});}});
  app.requestTimeout=120000;app.headersTimeout=15000;
  return {app,store,updater,async close(){await new Promise((resolve,reject)=>app.close(error=>error?reject(error):resolve()));}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const config=configFromEnv();const instance=await createApp(config);instance.app.listen(config.port,config.host,()=>{console.log(`纸间已启动：http://${config.host}:${instance.app.address().port}`);console.log(config.password?'使用你设置的独立访问密码登录。':'当前仅供本机演示；部署前必须设置访问密码。');});const timer=setInterval(()=>instance.updater.tick().catch(()=>{}),60000);timer.unref();const stop=()=>{clearInterval(timer);instance.app.close(()=>process.exit(0));};process.on('SIGTERM',stop);process.on('SIGINT',stop);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
