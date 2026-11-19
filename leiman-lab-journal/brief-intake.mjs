import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {mkdirSync,existsSync,readFileSync,writeFileSync,readdirSync,unlinkSync,statSync,renameSync,utimesSync} from 'node:fs';
import path from 'node:path';

/** Private project briefs, never published or submitted to external AI. 30 day TTL. */
export function createBriefIntake(dataDir){
  const base=path.join(dataDir,'opportunities');
  const dir=path.join(base,'briefs');
  mkdirSync(dir,{recursive:true,mode:0o700});
  const keyfile=path.join(base,'.brief-key');
  if(!existsSync(keyfile))writeFileSync(keyfile,randomBytes(32),{mode:0o600,flag:'wx'});
  const key=readFileSync(keyfile);
  if(key.length!==32)throw Error('Brief encryption key must be 32 bytes');
  const maxAge=30*86400000,rate=new Map();
  function clean(){
    for(const f of readdirSync(dir).filter(n=>/^[a-f0-9]{32}\.json$/.test(n))){
      const full=path.join(dir,f);
      try{if(Date.now()-statSync(full).mtimeMs>maxAge)unlinkSync(full)}catch{}
    }
    for(const [k,r] of rate)if(Date.now()-r.started>3600000)rate.delete(k);
  }
  const recordPath=id=>path.join(dir,id+'.json');
  function seal(row){
    const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);
    const value=Buffer.concat([c.update(JSON.stringify(row),'utf8'),c.final()]);
    return JSON.stringify({iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:value.toString('base64')});
  }
  function unseal(string){
    const rec=JSON.parse(string),d=createDecipheriv('aes-256-gcm',key,Buffer.from(rec.iv,'base64'));
    d.setAuthTag(Buffer.from(rec.tag,'base64'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(rec.data,'base64')),d.final()]).toString('utf8'));
  }
  function submit(input,client){
    clean();
    const k=createHash('sha256').update(client).digest('hex'),now=Date.now();
    let r=rate.get(k)||{started:now,count:0};
    if(now-r.started>3600000)r={started:now,count:0};
    if(r.count>=3)return {status:429,body:{error:'Submission rate limit reached'}};
    const name=String(input.name||'').trim().slice(0,100),email=String(input.email||'').trim().toLowerCase().slice(0,180);
    const title=String(input.title||'').trim().slice(0,160),description=String(input.description||'').trim().slice(0,4000);
    const budget=Number(input.budget),currency=/^(USD|EUR|GBP|RUB|IDR)$/.test(input.currency)?input.currency:'USD';
    if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||title.length<5||description.length<40||!input.consent)
      return {status:400,body:{error:'Name, email, title, description (40+ characters) and explicit consent required'}};
    if(!Number.isFinite(budget)||budget<100||budget>10000000)
      return {status:400,body:{error:'Budget must be between 100 and 10,000,000'}};
    const id=randomBytes(16).toString('hex'),token=randomBytes(24).toString('hex');
    const row={id,name,email,title,description,budget,currency,locale:input.locale==='ru'?'ru':'en',
      createdAt:new Date(now).toISOString(),expiresAt:new Date(now+maxAge).toISOString(),status:'unreviewed',
      deletionHash:createHash('sha256').update(token).digest('hex'),
      purpose:'Income Intelligence pilot: private review by Leiman Lab only; not a contract or reservation.'};
    writeFileSync(recordPath(id),seal(row),{flag:'wx',mode:0o600});
    rate.set(k,{started:r.started,count:r.count+1});
    return {status:201,body:{ok:true,id,deletionToken:token,expiresAt:row.expiresAt,
      note:'Brief submitted for private review. No service agreement, exclusivity, payment or response time is promised.'}};
  }
  function update(id,changes={}){
    if(!/^[a-f0-9]{32}$/.test(id)||!existsSync(recordPath(id)))return {status:404,body:{error:'Brief not found'}};
    const allowed=['unreviewed','qualified','contacted','proposal','contracted','delivered','paid','declined'];
    const status=String(changes.status||'');
    const note=String(changes.note||'').trim().slice(0,600);
    if(!allowed.includes(status))return {status:400,body:{error:'Invalid status'}};
    const value=Number(changes.amountReceived||0);
    const directCosts=Number(changes.directCosts||0);
    if(!Number.isFinite(value)||!Number.isFinite(directCosts)||value<0||directCosts<0||value>10000000||directCosts>10000000)
      return {status:400,body:{error:'Invalid financial values'}};
    if(status!=='paid'&&(value!==0||directCosts!==0))
      return {status:400,body:{error:'Financial outcome can only be entered for paid projects'}};
    try{
      const file=recordPath(id),row=unseal(readFileSync(file,'utf8'));
      row.status=status;row.note=note;
      row.amountReceived=status==='paid'?value:0;
      row.directCosts=status==='paid'?directCosts:0;
      row.updatedAt=new Date().toISOString();
      row.outcomeEvidence='operator_reported_not_independently_audited';
      // Write new ciphertext atomically without extending the original 30-day retention.
      const temp=file+'.tmp';
      writeFileSync(temp,seal(row),{mode:0o600});
      renameSync(temp,file);
      const original=new Date(row.createdAt);
      utimesSync(file,original,original);
      return {status:200,body:{ok:true,id,status,updatedAt:row.updatedAt}};
    }catch{return {status:500,body:{error:'Unable to save brief update'}}}
  }
  function remove(id,token){
    if(!/^[a-f0-9]{32}$/.test(id)||!/^[a-f0-9]{48}$/.test(token))return false;
    if(!existsSync(recordPath(id)))return false;
    try{
      const row=unseal(readFileSync(recordPath(id),'utf8'));
      const expected=Buffer.from(row.deletionHash,'hex'),supplied=createHash('sha256').update(token).digest();
      if(!timingSafeEqual(expected,supplied))return false;
      unlinkSync(recordPath(id));return true;
    }catch{return false}
  }
  function list(){
    clean();
    return readdirSync(dir).filter(f=>/^[a-f0-9]{32}\.json$/.test(f)).map(f=>{
      try{const row=unseal(readFileSync(path.join(dir,f),'utf8'));delete row.deletionHash;return row}catch{return null}
    }).filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  clean();
  const timer=setInterval(clean,3600000);timer.unref?.();
  return {submit,remove,list,update};
}
