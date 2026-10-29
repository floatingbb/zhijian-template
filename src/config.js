import { resolve } from 'node:path';
export function configFromEnv(env=process.env) {
  const integer=(key,fallback,min,max)=>{const n=Number(env[key]||fallback);if(!Number.isInteger(n)||n<min||n>max)throw new Error(`${key}设置不正确`);return n;};
  const host=env.HOST||'127.0.0.1',password=env.APP_PASSWORD||'';
  if(password&&password.length<12)throw new Error('APP_PASSWORD至少需要12个字符');
  if(!['127.0.0.1','localhost','::1'].includes(host)&&!password)throw new Error('对外运行前必须设置APP_PASSWORD，防止别人使用你的AI密钥');
  const base=(env.AI_BASE_URL||'').replace(/\/+$/,'');
  if(base){const u=new URL(base);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw new Error('AI_BASE_URL必须是没有账号、查询参数的HTTPS地址');}
  const timezone=env.UPDATE_TIMEZONE||'Asia/Shanghai';new Intl.DateTimeFormat('en',{timeZone:timezone});
  const publicUrl=env.PUBLIC_URL?new URL(env.PUBLIC_URL):null;if(publicUrl&&publicUrl.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(publicUrl.hostname))throw new Error('PUBLIC_URL对外访问必须使用HTTPS');
  return {host,port:integer('PORT',3000,0,65535),password,dataDir:resolve(env.DATA_DIR||'data'),publicOrigin:publicUrl?.origin||null,aiBase:base,aiModel:env.AI_MODEL||'',aiKey:env.AI_API_KEY||'',aiMaxTokens:integer('AI_MAX_TOKENS',2200,300,8000),autoEnabled:env.AUTO_UPDATE_ENABLED==='true',autoPublish:env.AUTO_PUBLISH==='true',dailyCount:integer('DAILY_COUNT',4,1,8),hour:integer('UPDATE_HOUR',8,0,23),timezone};
}
