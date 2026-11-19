/**
 * Monetary grants only. Uses documented public Grants.gov search2 +
 * fetchOpportunity APIs; no grant without a published award amount.
 * A grant amount is NOT a personal payment or a probability of winning.
 */
const DETAIL_URL='https://api.grants.gov/v1/api/fetchOpportunity';
const MAX_DETAILS=14,CACHE_MS=45*60*1000;
const BLOCKED=/(?:\bcrypto(?:currency|currencies)?\b|\bweb3\b|\bblockchain\b|\btoken sale\b|\bNFTs?\b|\bDeFi\b|\bdigital assets?\b|\bsecurity bounty\b|\bbug bounty\b)/i;
const cache=new Map(),rate=new Map();
const money=s=>{
 if(typeof s==='number')return Number.isFinite(s)&&s>0?s:null;
 if(typeof s!=='string'||!/^\s*\$?[\d,]+(?:\.\d{1,2})?\s*$/.test(s))return null;
 const n=Number(s.replace(/[,$\s]/g,''));
 return Number.isFinite(n)&&n>0&&n<=10000000000?n:null;
};
export function grantWithPublishedMoney(base,payload){
 const syn=payload?.data?.synopsis;
 if(!syn||!base||base.source!=='Grants.gov'||base.status!=='posted')return null;
 if(String(payload.data?.id)!==String(base.id).replace(/^us-grant-/,''))return null;
 if(BLOCKED.test(base.title+' '+String(syn.synopsisDesc||'').slice(0,1600)))return null;
 const ceiling=money(syn.awardCeiling),floor=money(syn.awardFloor);
 if(!ceiling&&!floor)return null;
 const c=ceiling||floor;
 const applicants=Array.isArray(syn.applicantTypes)?syn.applicantTypes.map(x=>String(x.description||'').slice(0,95)).slice(0,10):[];
 return {id:base.id,type:'grant',title:base.title,issuer:base.issuer,
  source:'Grants.gov',sourceUrl:base.sourceUrl,rulesUrl:base.sourceUrl,
  cashAmount:c,cashCurrency:'USD',cashEvidence:'official_grant_synopsis',
  amountBasis:ceiling?'published_award_ceiling':'published_award_floor',
  fundingFloor:floor,fundingCeiling:ceiling,deadline:base.deadline,
  postedAt:base.postedAt,applicantTypes:applicants,requiresReview:true,
  paymentGuaranteed:false,eligibility:'Unverified. Funding supports the named project/applicant under specific federal rules, not general income.',
  notice:'The funding ceiling is a maximum available award under programme rules, not a prize, personal payment, or expected earnings.'};
}
export function createFundedGrantRadar({grantSearch,fetcher=globalThis.fetch}){
 if(!grantSearch||typeof grantSearch.search!=='function')throw Error('grantSearch dependency required');
 async function search({q='art',page=1}={},client='anonymous'){
  const keyword=String(q||'').replace(/[<>]/g,'').trim().slice(0,75);
  const query=keyword.length>=2?keyword:'art';
  const currentPage=Math.max(1,Math.min(5,Number(page)||1));
  const key=query.toLowerCase()+'|'+currentPage;
  const now=Date.now(),prior=cache.get(key);
  if(prior&&now-prior.at<CACHE_MS)return {status:200,body:{...prior.body,sourceStatus:'cached'}};
  const fingerprint=String(client).slice(0,140),window=rate.get(fingerprint)||{at:now,n:0};
  if(now-window.at>3600000){window.at=now;window.n=0}
  if(++window.n>12)return {status:429,body:{error:'Grant lookup rate limited',results:[]}};
  rate.set(fingerprint,window);
  if(rate.size>500)for(const [k,v] of rate)if(now-v.at>3600000)rate.delete(k);
  const source=await grantSearch.search({q:query,page:currentPage,rows:25},client+'|cash-grants');
  if(source.status!==200)return {status:source.status,body:{provider:'Grants.gov',results:[],
   error:'Official grant search unavailable. No unpriced grants will be substituted.'}};
  const inputs=(source.body.results||[]).slice(0,MAX_DETAILS);
  const results=[],issues=[];
  // Four concurrent official detail lookups, bounded for API courtesy.
  for(let offset=0;offset<inputs.length;offset+=4){
   const slice=inputs.slice(offset,offset+4);
   const settled=await Promise.allSettled(slice.map(async base=>{
    const id=Number(String(base.id).replace('us-grant-',''));
    if(!Number.isInteger(id)||id<=0)return null;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
    try{
     const r=await fetcher(DETAIL_URL,{method:'POST',signal:controller.signal,
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({opportunityId:id})});
     if(!r.ok)throw Error('Grant detail '+r.status);
     const data=await r.json();
     if(Number(data.errorcode)!==0)return null;
     return grantWithPublishedMoney(base,data);
    }finally{clearTimeout(timer)}
   }));
   for(const r of settled){
    if(r.status==='fulfilled'&&r.value)results.push(r.value);
    if(r.status==='rejected')issues.push('details_unavailable');
   }
  }
  const body={provider:'Grants.gov',sourceStatus:source.body.sourceStatus==='stale'?'stale':'fresh',
    queriedAt:new Date().toISOString(),query:{q:query,page:currentPage},
    searchedListings:inputs.length,skippedNoMoney:inputs.length-results.length,
    results:results.sort((a,b)=>(b.fundingCeiling||b.fundingFloor||0)-(a.fundingCeiling||a.fundingFloor||0)),
    detailsPartiallyUnavailable:issues.length>0,
    disclaimer:'Monetary federal grant notices only. Amount represents a published award ceiling/floor, not guaranteed money, salary or a competition prize. Each notice has institution, jurisdiction, registration and programme-specific eligibility.'};
  if(!issues.length){cache.set(key,{body,at:Date.now()});if(cache.size>35)cache.delete(cache.keys().next().value)}
  return {status:200,body};
 }
 return {search};
}
