/**
 * Persistent, non-personal opportunity index. Every record links to the
 * primary source; storing a listing never establishes applicant eligibility.
 * Single-process filesystem store on the Railway DATA_DIR volume.
 */
import path from 'node:path';
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';

const TYPES=new Set(['employment','grant','tender','bounty','contract','research']);
const SOURCES=new Set(['Himalayas','Grants.gov','UK Find a Tender','GitHub Bounty Candidates']);
const MAX_RECORDS=5500;
const KEEP_MS=90*86400000;
const clean=(x,n=300)=>String(x??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const date=s=>typeof s==='string' && /^\d{4}-\d\d-\d\d/.test(s)?s.slice(0,10):null;
const safeUrl=value=>{try{const u=new URL(String(value));return u.protocol==='https:'?u.href:null}catch{return null}};
const textTokens=s=>[...new Set(clean(s,150).toLowerCase().match(/[a-zа-яё0-9]{3,}/gi)||[])];
export function normalizeOpportunity(raw){
 if(!raw || !TYPES.has(raw.type) || !SOURCES.has(raw.source))return null;
 const sourceUrl=safeUrl(raw.sourceUrl),title=clean(raw.title,240);
 if(!sourceUrl||!title)return null;
 const domains={'Himalayas':'himalayas.app','Grants.gov':'www.grants.gov','UK Find a Tender':'www.find-tender.service.gov.uk','GitHub Bounty Candidates':'github.com'};
 try{if(new URL(sourceUrl).hostname!==domains[raw.source])return null}catch{return null}
 const identity=raw.source+':'+String(raw.id||sourceUrl);
 const id=createHash('sha256').update(identity).digest('hex').slice(0,24);
 const country=['employment','bounty'].includes(raw.type)?'GLOBAL':raw.country==='US'?'US':raw.country==='GB'?'GB':null;
 const salary=raw.type==='employment'?raw.salary:null;
 const countries=Array.isArray(raw.locationRestrictions)?raw.locationRestrictions.map(x=>clean(x,3).toUpperCase()).filter(Boolean).slice(0,100):[];
 const status=raw.type==='bounty'?'unverified_candidate':raw.status==='planned'?'planned':raw.status==='posted'||raw.status==='active'?'source_reported_open':'source_reported';
 const listedAt=date(raw.publishedAt||raw.postedAt);
 const deadline=date(raw.deadline||raw.expiresAt);
 const excerpt=clean(raw.excerpt,800);
 return {id,sourceId:clean(raw.id,80),source:raw.source,sourceUrl,
  type:raw.type,title,issuer:clean(raw.company||raw.issuer,150),country,
  excerpt,listedAt,deadline,status,
  locationCountries:countries,worldwide:raw.worldwide===true,locationUnclear:raw.locationUnclear===true,
  salaryMin:Number.isFinite(salary?.min)?salary.min:null,
  salaryMax:Number.isFinite(salary?.max)?salary.max:null,
  salaryCurrency:clean(salary?.currency||'',5),
  tenderValue:Number.isFinite(raw.value)?raw.value:null,
  tenderCurrency:clean(raw.currency||'',5),
  bountyRewardAmount:raw.type==='bounty'&&Number.isFinite(raw.rewardAmount)?raw.rewardAmount:null,
  bountyRewardCurrency:raw.type==='bounty'?clean(raw.rewardCurrency||'',5):'',
  bountyRewardEvidence:raw.type==='bounty'?clean(raw.rewardEvidence||'not_disclosed',45):'',
  bountyPaymentVerified:false,
  attribution:raw.source,
  eligibilityStatus:'needs_review',eligibilityEvidence:'No applicant-specific evidence collected',
  updatedAt:new Date().toISOString()};
}

export function evaluateEligibility(item,profile={}){
 const applicantType=String(profile.applicantType||'unknown');
 const residence=clean(profile.residenceCountry,2).toUpperCase();
 const organisation=clean(profile.registrationCountry,2).toUpperCase();
 const reasons=[],requirements=[],gaps=[];
 if(item.type==='employment'){
  if(item.locationCountries?.length){
   requirements.push('Employer geographic restrictions: '+item.locationCountries.join(', '));
   if(residence&&!item.locationCountries.includes(residence)){
    reasons.push('Selected residence country is absent from employer location restrictions.');
    return {status:'ineligible',confidence:'rule_based',reasons,requirements,missingEvidence:[]};
   }
  }else if(item.locationUnclear){gaps.push('Employer location eligibility is missing or ambiguous')}
  else if(item.worldwide)requirements.push('Provider reports worldwide availability; verify local employment and payroll rules.');
  if(!residence)gaps.push('Residence country not provided');
  gaps.push('Employer experience, employment law, compensation and application requirements not independently verified');
  return {status:'needs_review',confidence:'rule_based',reasons,requirements,missingEvidence:gaps};
 }
 if(item.type==='grant'){
  requirements.push('Funding notice determines eligible applicant entities, countries, co-funding and registration');
  if(applicantType==='unknown')gaps.push('Applicant legal type not supplied');
  if(!organisation&&applicantType!=='individual')gaps.push('Applicant institution/organisation registration jurisdiction not supplied');
  gaps.push('Detailed grant notice and foreign applicant conditions not independently checked');
 }else if(item.type==='bounty'){
  requirements.push('Confirm that the issuer is authorised, the reward is funded, the claim is available, and acceptance criteria are explicit');
  gaps.push('Payout has not been independently verified');
  gaps.push('Competing claims, maintainer policy, and geographic restrictions require original-issue review');
 }else if(item.type==='tender'){
  requirements.push('Procurement documents determine bidder establishment, suitability and mandatory certifications');
  if(applicantType==='individual')gaps.push('Tender may require a registered organisation');
  if(!organisation)gaps.push('Supplier registration country not supplied');
  gaps.push('Live procedure, procurement documents and cross-border access not independently verified');
 }else{
  gaps.push('Requirements and legal eligibility are not verified');
 }
 return {status:'needs_review',confidence:'insufficient_evidence',reasons,requirements,missingEvidence:gaps};
}

export function compareCapabilities(item,profile={}){
 const skills=textTokens(profile.skills||'').slice(0,20);
 const haystack=(item.title+' '+item.excerpt).toLowerCase();
 const matched=skills.filter(skill=>haystack.includes(skill));
 const unavailable=skills.filter(skill=>!matched.includes(skill));
 return {matched,notMentioned:unavailable,
  coverage:skills.length?Math.round(100*matched.length/skills.length):null,
  interpretation:'Keyword evidence only; missing terms do not prove lack of qualifications.'};
}

export function createOpportunityIndex(dataDir){
 const dir=path.join(dataDir,'income-intelligence');
 mkdirSync(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,'opportunities-v2.json');
 let entries={};
 if(existsSync(file))try{
  const loaded=JSON.parse(readFileSync(file,'utf8'));
  if(loaded?.version===2&&typeof loaded.records==='object'&&!Array.isArray(loaded.records))
   entries=Object.fromEntries(Object.entries(loaded.records).slice(0,MAX_RECORDS));
 }catch{throw Error('Opportunity index on volume is corrupt; refusing to silently overwrite historical records.')}
 const save=()=>{
  const tmp=file+'.tmp';
  writeFileSync(tmp,JSON.stringify({version:2,updatedAt:new Date().toISOString(),records:entries}),{mode:0o600});
  renameSync(tmp,file);
 };
 function ingest(raw,provider){
  if(!SOURCES.has(provider))return {inserted:0,updated:0,total:Object.keys(entries).length};
  const now=Date.now();let inserted=0,updated=0;
  for(const item of Array.isArray(raw)?raw.slice(0,200):[]){
   if(item.source!==provider)continue;
   const value=normalizeOpportunity(item);
   if(!value)continue;
   const former=entries[value.id];
   entries[value.id]={...value,firstSeen:former?.firstSeen||value.updatedAt,
    sourceLastSeen:value.updatedAt,lastChanged:value.updatedAt};
   if(former)updated++;else inserted++;
  }
  const cutoff=new Date(now-KEEP_MS).toISOString();
  entries=Object.fromEntries(Object.entries(entries).filter(([,v])=>v.sourceLastSeen>=cutoff).sort((a,b)=>
    b[1].sourceLastSeen.localeCompare(a[1].sourceLastSeen)).slice(0,MAX_RECORDS));
  if(inserted||updated)save();
  return {inserted,updated,total:Object.keys(entries).length};
 }
 function search(query={}){
  const q=clean(query.q,100).toLowerCase();
  const type=clean(query.type,30);
  const source=clean(query.source,60);
  const limit=Math.max(1,Math.min(100,Number(query.limit)||30));
  const countries=clean(query.country,2).toUpperCase();
  const includeExpired=query.includeExpired==='true';
  const today=new Date().toISOString().slice(0,10);
  const profile={applicantType:query.applicantType,residenceCountry:query.residenceCountry,
    registrationCountry:query.registrationCountry,skills:query.skills};
  const matches=Object.values(entries).filter(v=>
    (!type||type==='all'||v.type===type)&&
    (!source||source==='all'||v.source===source)&&
    (!countries||(v.type==='employment'
      ? (v.worldwide||v.locationUnclear||!v.locationCountries.length||v.locationCountries.includes(countries))
      : v.country===countries))&&
    (includeExpired||!v.deadline||v.deadline>=today)&&
    (query.includeStale==='true'||Date.now()-Date.parse(v.sourceLastSeen)<14*86400000)&&
    (!q||(v.title+' '+v.issuer+' '+v.excerpt).toLowerCase().includes(q))
  ).sort((a,b)=>{
    const aExpired=a.deadline&&a.deadline<today,bExpired=b.deadline&&b.deadline<today;
    if(Boolean(aExpired)!==Boolean(bExpired))return aExpired?1:-1;
    return b.sourceLastSeen.localeCompare(a.sourceLastSeen)
  });
  return {count:matches.length,records:matches.slice(0,limit).map(v=>({
   ...v,sourceFreshnessHours:Math.max(0,Math.round((Date.now()-Date.parse(v.sourceLastSeen))/3600000)),
   eligibility:evaluateEligibility(v,profile),capabilityFit:compareCapabilities(v,profile)
  })),indexUpdatedAt:existsSync(file)?new Date().toISOString():null,
    disclaimer:'Indexed provider-reported records. Records not re-seen for 14 days are hidden by default; no applicant is considered legally eligible without source review. Not an exhaustive market index.'};
 }
 function stats(){
  const values=Object.values(entries);
  return {total:values.length,byType:Object.fromEntries([...TYPES].map(t=>[t,values.filter(v=>v.type===t).length])),
   bySource:Object.fromEntries([...SOURCES].map(t=>[t,values.filter(v=>v.source===t).length]))};
 }
 function assess(id,profile={}){
  if(!/^[a-f0-9]{24}$/.test(String(id))||!entries[id])return null;
  const item=entries[id];
  return {opportunity:item,eligibility:evaluateEligibility(item,profile),
    capabilityFit:compareCapabilities(item,profile),warning:'Automated triage only; legal and programme-specific conditions require human source review.'};
 }
 return {ingest,search,stats,assess};
}
