import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';

export class Store {
  constructor(directory) { this.directory=resolve(directory);this.queue=Promise.resolve(); }
  async init() {
    await mkdir(this.directory,{recursive:true,mode:0o700});
    try { this.state=JSON.parse(await readFile(join(this.directory,'state.json'),'utf8')); }
    catch(error) { if(error.code!=='ENOENT')throw new Error('数据文件无法读取，请从备份恢复，不会覆盖原文件');this.state={version:1,entries:[],drafts:[],records:{},sourceHistory:[],lastRunDate:null,lastUpdate:null,lastRun:null,sessionSecret:randomBytes(32).toString('hex')};await this.save(this.state); }
    if(this.state.version!==1||!Array.isArray(this.state.entries)||!Array.isArray(this.state.drafts)||!this.state.records||!this.state.sessionSecret)throw new Error('数据格式不受支持');
  }
  async save(next) { const temporary=join(this.directory,'state.tmp');await writeFile(temporary,JSON.stringify(next,null,2),{mode:0o600});await rename(temporary,join(this.directory,'state.json')); }
  async read() { await this.queue;return structuredClone(this.state); }
  mutate(fn) {
    const job=this.queue.then(async()=>{const next=structuredClone(this.state);const result=await fn(next);await this.save(next);this.state=next;return result;});
    this.queue=job.catch(()=>{});return job;
  }
}
