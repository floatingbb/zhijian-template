import { createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
const same=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
export function createAuth(config,secret) {
  const sign=text=>createHmac('sha256',secret+config.password).update(text).digest('base64url');
  const expected=config.password?scryptSync(config.password,secret,32).toString('hex'):null;
  return {
    account:createHmac('sha256',secret).update('owner').digest('hex'),
    validPassword(value){return typeof value==='string'&&value.length<=1024&&expected!==null&&same(scryptSync(value,secret,32).toString('hex'),expected);},
    loggedIn(request){if(!config.password)return true;const token=(request.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('zhijian_session='))?.slice(16);if(!token)return false;const [expires,signature,...rest]=token.split('.');return rest.length===0&&Number(expires)>Date.now()&&same(sign(expires),signature||'');},
    cookie(clear=false){const expires=String(Date.now()+30*86400000);return `zhijian_session=${clear?'':expires+'.'+sign(expires)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:30*86400}${config.publicOrigin?.startsWith('https:')?'; Secure':''}`;}
  };
}
