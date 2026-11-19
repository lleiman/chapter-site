/**
 * Official US grants discovery.
 * Public Grants.gov Search2 API (no API key): https://www.grants.gov/api/api-guide
 * A grant is not an employment contract; eligibility depends on the exact notice.
 */
import {createHash} from 'node:crypto';
const endpoint='https://api.grants.gov/v1/api/search2';
const TIMEOUT_MS=11000, CACHE_MS=45*60*1000, MAX_ENTRIES=35;
const cache=new Map(),rate=new Map();
function text(v,n=300){return String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n)}
function date(v){
 const s=String(v||'').trim();
 if(!s)return null;
 const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(!m)return null;
 const y=Number(m[3]),mo=Number(m[1]),d=Number(m[2]);
 if(mo<1||mo>12||d<1||d>31)return null;
 const u=new Date(Date.UTC(y,mo-1,d));
 return u.getUTCFullYear()===y&&u.getUTCMonth()+1===mo&&u.getUTCDate()===d?u.toISOString().slice(0,10):null;
}
export function normalizeGrant(op){
 if(!op||typeof op!=='object'||!Number.isInteger(Number(op.id))||!op.title)return null;
 const id=Number(op.id),status=String(op.oppStatus||'').toLowerCase();
 if(status!=='posted')return null;
 const deadline=date(op.closeDate);
 if(deadline&&deadline<new Date().toISOString().slice(0,10))return null;
 const link='https://www.grants.gov/search-results-detail/'+id;
 return {id:'us-grant-'+id,type:'grant',source:'Grants.gov',country:'US',title:text(op.title,210),
   reference:text(op.number,90),issuer:text(op.agencyName,130),agencyCode:text(op.agencyCode,40),
   deadline,postedAt:date(op.openDate),status:'posted',sourceUrl:link,applicationLink:link,
   eligibility:'UNVERIFIED — review applicant types, institution rules, foreign eligibility, registration, and full NOFO.',
   provenance:'Official public search API; agency notice determines the authoritative requirements.',
   checkedAt:new Date().toISOString(),verification:'official_search_listing'};
}
export function createGrantSearch({fetcher=globalThis.fetch}={}){
 async function search({q='',page=1,rows=20}={},client='anonymous'){
  const k=createHash('sha256').update(String(client)).digest('hex'),now=Date.now();
  const record=rate.get(k)||{time:now,n:0};
  if(now-record.time>3600000){record.time=now;record.n=0}
  if(record.n>=35)return {status:429,body:{error:'Search limit reached. Try again later.',results:[]}};
  record.n++;rate.set(k,record);
  if(rate.size>700)for(const [key,v] of rate)if(now-v.time>3600000)rate.delete(key);
  const keyword=text(q,100);
  const currentPage=Math.max(1,Math.min(5,parseInt(page,10)||1));
  const count=Math.max(1,Math.min(25,parseInt(rows,10)||20));
  const cacheKey=[keyword.toLowerCase(),currentPage,count].join('|');
  const prev=cache.get(cacheKey);
  let body,sourceStatus='fresh';
  if(prev&&now-prev.at<CACHE_MS){body=prev.value;sourceStatus='cached'}
  else{
   const controller=new AbortController(),abort=setTimeout(()=>controller.abort(),TIMEOUT_MS);
   try{
    const r=await fetcher(endpoint,{method:'POST',signal:controller.signal,
     headers:{'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify({keyword,oppStatuses:'posted',rows:count,startRecordNum:(currentPage-1)*count})});
    if(!r.ok)throw Error('Provider returned HTTP '+r.status);
    const raw=await r.json();
    if(raw.errorcode!==0||!Array.isArray(raw.data?.oppHits))throw Error('Invalid Grants.gov response');
    body=raw.data;
    cache.set(cacheKey,{at:now,value:body});
    if(cache.size>MAX_ENTRIES)cache.delete(cache.keys().next().value);
   }catch(err){
    if(prev&&now-prev.at<24*3600000){body=prev.value;sourceStatus='stale'}
    else return {status:503,body:{provider:'Grants.gov',results:[],
      error:'Official grants feed is unavailable. No listings have been fabricated.',retryAfterSeconds:120}};
   }finally{clearTimeout(abort)}
  }
  const ids=new Set(),results=[];
  for(const raw of body.oppHits){
   const grant=normalizeGrant(raw);
   if(!grant||ids.has(grant.id))continue;
   ids.add(grant.id);results.push(grant);
  }
  return {status:200,body:{provider:'Grants.gov',sourceUrl:'https://www.grants.gov/search-grants',sourceStatus,
    query:{q:keyword,page:currentPage},retrievedAt:new Date().toISOString(),results,
    totalFromProvider:Number.isFinite(body.hitCount)?body.hitCount:null,
    disclaimer:'U.S. federal grant search records only. Programmes can exclude foreigners, individuals or for-profit entities. No eligibility has been determined; follow the original notice.'}};
 }
 return {search};
}
