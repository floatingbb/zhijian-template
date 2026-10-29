import { readFile, mkdir, writeFile, copyFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
const file=process.argv[2];if(!file)throw new Error('先停止服务，再传入自己的备份JSON文件路径');
const backup=JSON.parse(await readFile(resolve(file),'utf8'));if(backup.version!==1||!Array.isArray(backup.entries)||!Array.isArray(backup.drafts)||!backup.records)throw new Error('备份格式无效');
const directory=resolve(process.env.DATA_DIR||'data');await mkdir(directory,{recursive:true,mode:0o700});const current=join(directory,'state.json');
try{await copyFile(current,join(directory,'before-restore-'+Date.now()+'.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
const next={...backup,sessionSecret:randomBytes(32).toString('hex')};const temporary=join(directory,'restore.tmp');await writeFile(temporary,JSON.stringify(next,null,2),{mode:0o600});await rename(temporary,current);console.log('已恢复；旧会话已失效，请启动服务并重新登录。');
