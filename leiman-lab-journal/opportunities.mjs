/**
 * Leiman Lab / Income Intelligence pilot intake.
 * No CV text is published, indexed, sent to an AI model, or forwarded.
 * Records are AES-256-GCM encrypted on the persistent Railway volume.
 * This is a minimal pilot, not a replacement for a compliance audit.
 */
import { randomBytes, createCipheriv, createDecipheriv, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import path from 'node:path';

const DAYS = 30;
const PERIOD_MS = DAYS * 86400000;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clientRates = new Map();
const acceptedModes = ['remote','hybrid','onsite','flexible'];
const acceptedProfessions = ['research','creative','engineering','design','business','other'];

export function createOpportunityIntake(dataDir) {
  const dir = path.join(dataDir, 'opportunities', 'cv');
  mkdirSync(dir, {recursive:true, mode:0o700});
  const keyPath = path.join(dataDir, 'opportunities', '.cv-key');
  if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), {mode:0o600,flag:'wx'});
  const key = readFileSync(keyPath);
  if (key.length!==32) throw Error('CV encryption key must be 32 bytes');

  function clean() {
    const now = Date.now();
    for(const f of readdirSync(dir).filter(x=>/^[a-f0-9]{32}\.json$/.test(x))) {
      try {
        const full=path.join(dir,f);
        if(now-statSync(full).mtimeMs>PERIOD_MS)unlinkSync(full);
      } catch {}
    }
    for (const [k,v] of clientRates) if(now-v.time>3600000)clientRates.delete(k);
  }
  const recordPath = id => path.join(dir,id+'.json');
  function encrypt(payload){
    const iv=randomBytes(12);
    const cipher=createCipheriv('aes-256-gcm', key, iv);
    const ct=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final()]);
    return {iv:iv.toString('base64'),ct:ct.toString('base64'),tag:cipher.getAuthTag().toString('base64')};
  }
  function decrypt(record){
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(record.iv,'base64'));
    decipher.setAuthTag(Buffer.from(record.tag,'base64'));
    const plaintext=Buffer.concat([decipher.update(Buffer.from(record.ct,'base64')),decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  }
  function read(id) { return decrypt(JSON.parse(readFileSync(recordPath(id),'utf8'))); }
  function submit(input, client){
    clean();
    const idKey=createHash('sha256').update(String(client)).digest('hex');
    const rate=clientRates.get(idKey)||{time:Date.now(),n:0};
    if(rate.n>=3 && Date.now()-rate.time<3600000)return {status:429,body:{error:'Submission limit reached. Try again later.'}};
    const name=String(input.name||'').trim().slice(0,100);
    const email=String(input.email||'').trim().toLowerCase().slice(0,180);
    const cv=String(input.cv||'').trim().slice(0,12000);
    const location=String(input.location||'').trim().slice(0,120);
    const profession=String(input.profession||'other');
    const workMode=String(input.workMode||'flexible');
    const goals=String(input.goals||'').trim().slice(0,900);
    const locale=['en','ru'].includes(input.locale)?input.locale:'en';
    if(!name||!emailRe.test(email)||cv.length<70||cv.length>12000||!input.consent) return {status:400,body:{error:'Name, valid email, CV text (70–12000 characters) and consent are required.'}};
    if(!acceptedProfessions.includes(profession)||!acceptedModes.includes(workMode))return {status:400,body:{error:'Invalid profile settings.'}};
    const id=randomBytes(16).toString('hex');
    const deletionToken=randomBytes(24).toString('hex');
    const now=new Date();
    const payload={id,createdAt:now.toISOString(),expiresAt:new Date(now.getTime()+PERIOD_MS).toISOString(),
      name,email,cv,location,profession,workMode,goals,locale,contactOptIn:input.contactOptIn===true,
      deletionHash:createHash('sha256').update(deletionToken).digest('hex'),
      purpose:'Income Intelligence pilot evaluation; no automated applications'};
    writeFileSync(recordPath(id),JSON.stringify(encrypt(payload)),{mode:0o600,flag:'wx'});
    clientRates.set(idKey, {time:rate.time,n:rate.n+1});
    return {status:201,body:{ok:true,id,deletionToken,expiresAt:payload.expiresAt,note:'Stored privately. No AI processing or external forwarding is enabled.'}};
  }
  function remove(id, token) {
    if(!/^[a-f0-9]{32}$/.test(id)||!/^[a-f0-9]{48}$/.test(token)||!existsSync(recordPath(id)))return false;
    let row;try{row=read(id)}catch{return false}
    const a=Buffer.from(createHash('sha256').update(token).digest('hex'));
    const b=Buffer.from(row.deletionHash||'');
    if(a.length!==b.length||!timingSafeEqual(a,b))return false;
    unlinkSync(recordPath(id));return true;
  }
  function list() {
    clean();
    return readdirSync(dir).filter(f=>/^[a-f0-9]{32}\.json$/.test(f)).map(f=>{
      try {const row=read(f.slice(0,-5));delete row.deletionHash;return row;}catch{return null;}
    }).filter(Boolean).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  // Deletion does not depend on future submissions or an admin opening the dashboard.
  // Reconcile expired records on start and hourly while the server is running.
  clean();
  const cleanupTimer = setInterval(clean, 60 * 60 * 1000);
  cleanupTimer.unref?.();
  return {submit,remove,list};
}