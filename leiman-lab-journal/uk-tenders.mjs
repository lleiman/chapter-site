/**
 * UK Find a Tender — bounded public OCDS procurement search.
 * Official source: https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages
 * This only inspects a recent sample, not the entire procurement market.
 */
import {createHash} from 'node:crypto';
const ENDPOINT='https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages';
const cache=new Map(),rate=new Map();
const TTL=45*60*1000;
const str=(v,n=250)=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
export function normalizeTender(release){
 if(!release||typeof release!=='object'||!release.tender)return null;
 const t=release.tender;
 if(!Array.isArray(release.tag)||!release.tag.includes('tender'))return null;
 if(!['active','planned'].includes(t.status))return null;
 const deadline=String(t.tenderPeriod?.endDate||'').slice(0,10);
 if(deadline&&/^\d{4}-\d{2}-\d{2}$/.test(deadline)&&deadline<new Date().toISOString().slice(0,10))return null;
 const notice=String(release.id||'');
 if(!/^\d{4,7}-\d{4}$/.test(notice)||!t.title)return null;
 const buyers=(release.parties||[]).filter(p=>p.roles?.includes('buyer'));
 const buyer=buyers[0]?.name||release.buyer?.name||'Public authority';
 const budget=Number(t.value?.amount);
 return {id:'uk-tender-'+notice,source:'UK Find a Tender',type:'tender',country:'GB',
  title:str(t.title,230),issuer:str(buyer,160),excerpt:str(t.description,500),
  status:t.status,deadline:/^\d{4}-\d{2}-\d{2}$/.test(deadline)?deadline:null,
  value:Number.isFinite(budget)&&budget>0?budget:null,currency:typeof t.value?.currency==='string'?str(t.value.currency,5):null,
  procedure:str(t.procurementMethodDetails||t.procurementMethod,70),
  sectors:Array.isArray(t.items)?t.items.map(i=>str(i.classification?.description||'',75)).filter(Boolean).slice(0,6):[],
  sourceUrl:'https://www.find-tender.service.gov.uk/Notice/'+notice,
  applicationLink:'https://www.find-tender.service.gov.uk/Notice/'+notice,
  publishedAt:String(release.date||'').slice(0,25),
  eligibility:'UNVERIFIED — verify buyer requirements, procurement documents, eligible jurisdictions and tender stage.',
  verification:'official_ocds_notice',
  checkedAt:new Date().toISOString()};
}
export function createUkTenders({fetcher=globalThis.fetch}={}){
 async function search({q='',days=4}={},client='anonymous'){
  const k=createHash('sha256').update(String(client)).digest('hex'),now=Date.now();
  let v=rate.get(k)||{from:now,n:0};
  if(now-v.from>3600000)v={from:now,n:0};
  if(++v.n>20)return {status:429,body:{error:'Request limit reached',results:[]}};
  rate.set(k,v);
  if(rate.size>700)for(const [key,row] of rate)if(now-row.from>3600000)rate.delete(key);
  const keyword=str(q,70).toLowerCase();
  const period=Math.min(7,Math.max(1,Number(days)||4));
  const end=new Date();
  const start=new Date(end.getTime()-period*86400000);
  const moment=d=>d.toISOString().slice(0,19);
  const qs=new URLSearchParams({updatedFrom:moment(start),updatedTo:moment(end),stages:'tender',limit:'100'});
  const key=qs.toString(),prev=cache.get(key);
  let data,sourceStatus='fresh';
  if(prev&&now-prev.at<TTL){data=prev.data;sourceStatus='cached'}
  else {
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9500);
   try{
    const response=await fetcher(ENDPOINT+'?'+key,{signal:ctrl.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('Official service '+response.status);
    const payload=await response.json();
    if(!Array.isArray(payload.releases))throw Error('Invalid OCDS package');
    data=payload;cache.set(key,{at:now,data});
    if(cache.size>30)cache.delete(cache.keys().next().value);
   }catch{
    if(prev&&now-prev.at<24*3600000){data=prev.data;sourceStatus='stale'}
    else return {status:503,body:{provider:'UK Find a Tender',results:[],error:'Official tender feed unavailable; no records have been invented.'}};
   }finally{clearTimeout(timer)}
  }
  const normalized=(data.releases||[]).map(normalizeTender).filter(Boolean);
  const filtered=normalized.filter(r=>!keyword||[r.title,r.issuer,r.excerpt,...r.sectors].join(' ').toLowerCase().includes(keyword));
  const seen=new Set(),results=[];
  for(const entry of filtered){if(seen.has(entry.id))continue;seen.add(entry.id);results.push(entry);if(results.length>=30)break}
  return {status:200,body:{provider:'UK Find a Tender',sourceUrl:'https://www.find-tender.service.gov.uk/Search',sourceStatus,
   retrievedAt:new Date().toISOString(),results,query:{q:keyword,days:period},
   inspectedNotices:(data.releases||[]).length,limitedSample:true,
   hasNextPage:!!data.links?.next,
   disclaimer:'Only recent sampled OCDS tender-stage notices are searched, not the full UK market. Registration, nationality, legal eligibility, live stage and deadline require independent notice review.'}};
 }
 return {search};
}
