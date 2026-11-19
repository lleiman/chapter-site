/**
 * GitHub issue bounty candidate finder.
 * Uses GitHub's public REST issue search; NEVER treats issue labels or body
 * as proof that a reward is funded or payable. No user content is submitted.
 * https://docs.github.com/en/rest/search/search#search-issues-and-pull-requests
 */
import {createHash} from 'node:crypto';
const endpoint='https://api.github.com/search/issues';
const cache=new Map(),clientCounts=new Map();
const TTL=50*60*1000;
const str=(v,n=300)=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const validIssueUrl=x=>{try{const u=new URL(x);return u.protocol==='https:'&&u.hostname==='github.com'&&/^\/[^/]+\/[^/]+\/issues\/\d+$/.test(u.pathname)?u.toString():null}catch{return null}};
const moneyPattern=/(?:\b(?:bounty|reward|payout|prize|compensation|payment)\b[^\n]{0,45}?\b(?:USD|US\$|\$|EUR|€|GBP|£)\s?([\d,]+(?:\.\d{1,2})?)|(?:USD|US\$|\$|EUR|€|GBP|£)\s?([\d,]+(?:\.\d{1,2})?)[^\n]{0,45}?\b(?:bounty|reward|payout|prize)\b)/i;
export function normalizeBountyIssue(issue){
 if(!issue||issue.pull_request||issue.state!=='open')return null;
 const sourceUrl=validIssueUrl(issue.html_url);
 if(!sourceUrl||!issue.title)return null;
 const tags=Array.isArray(issue.labels)?issue.labels.map(x=>str(typeof x==='string'?x:x.name,45)): [];
 const hasBountyTag=tags.some(s=>/\bbount(y|ies)\b|paid[- ]?issue|rewarded/i.test(s));
 const context=String(issue.title||'')+'\n'+String(issue.body||'').slice(0,2500);
 if(!hasBountyTag&&!/\b(?:bounty|paid issue|cash reward)\b/i.test(context))return null;
 const match=context.match(moneyPattern);
 const amount=match?Number((match[1]||match[2]).replace(/,/g,'')):null;
 const symbol=match?.[0]||'';
 const currency=/€|\bEUR\b/i.test(symbol)?'EUR':/£|\bGBP\b/i.test(symbol)?'GBP':'USD';
 const repo=issue.repository_url?.split('/').slice(-2).join('/')||new URL(sourceUrl).pathname.split('/').slice(1,3).join('/');
 const changed=String(issue.updated_at||'');
 return {
  id:'github-bounty-'+String(issue.id),type:'bounty',source:'GitHub Bounty Candidates',
  title:str(issue.title,180),issuer:str(repo,120),excerpt:str(issue.body,600),
  sourceUrl,country:'GLOBAL',status:'unverified_candidate',
  postedAt:issue.created_at,updatedAt:changed,deadline:null,
  rewardAmount:Number.isFinite(amount)&&amount>0&&amount<=10000000?amount:null,
  rewardCurrency:amount!=null?currency:null,rewardEvidence:amount!=null?'text_mention_unverified':'not_disclosed',
  rewardFunded:false,paymentGuarantee:'none',claimCount:issue.comments||0,
  openIssue:true,githubLabels:tags.slice(0,10),
  eligibility:'NEEDS REVIEW — check issue state, maintainer authority, payout policy, competing claims, and exact acceptance criteria.',
  verification:'github_issue_open_only',
  caveat:'The issue is open on GitHub. Reward amount, payer, funding, eligibility, and payout are not independently verified.'
 };
}
export function createBountySearch({fetcher=globalThis.fetch}={}){
 async function search({q='',page=1}={},client='anonymous'){
  const now=Date.now(),hashed=createHash('sha256').update(String(client)).digest('hex');
  const prevRate=clientCounts.get(hashed)||{at:now,n:0};
  if(now-prevRate.at>3600000){prevRate.at=now;prevRate.n=0}
  if(++prevRate.n>15)return {status:429,body:{error:'Bounty search rate limit; try later.',results:[]}};
  clientCounts.set(hashed,prevRate);
  if(clientCounts.size>800)for(const [id,r] of clientCounts)if(now-r.at>3600000)clientCounts.delete(id);
  const keyword=str(q,60).replace(/[():"'\\]/g,'').trim();
  const currentPage=Math.max(1,Math.min(3,parseInt(page,10)||1));
  const query='is:issue is:open label:bounty'+(keyword?' '+keyword:'');
  const qs=new URLSearchParams({q:query,sort:'updated',order:'desc',per_page:'30',page:String(currentPage)});
  const key=qs.toString();
  const cached=cache.get(key);
  let payload,sourceStatus='fresh';
  if(cached&&now-cached.at<TTL){payload=cached.payload;sourceStatus='cached'}
  else{
   const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),9000);
   try{
    const res=await fetcher(endpoint+'?'+key,{signal:ctrl.signal,headers:{
      Accept:'application/vnd.github+json','User-Agent':'LeimanLab-IncomeIntelligence/0.3',
      'X-GitHub-Api-Version':'2022-11-28'}});
    if(!res.ok)throw Error('GitHub search '+res.status);
    const raw=await res.json();
    if(!Array.isArray(raw.items))throw Error('Malformed GitHub issue search results');
    payload=raw;cache.set(key,{payload,at:now});
    if(cache.size>45)cache.delete(cache.keys().next().value);
   }catch(err){
    if(cached&&now-cached.at<12*3600000){payload=cached.payload;sourceStatus='stale'}
    else return {status:503,body:{provider:'GitHub Bounty Candidates',results:[],
      error:'GitHub public issue search is currently unavailable. No opportunities invented.',retryAfterSeconds:180}};
   }finally{clearTimeout(timeout)}
  }
  const results=payload.items.map(normalizeBountyIssue).filter(Boolean);
  return {status:200,body:{provider:'GitHub Bounty Candidates',sourceUrl:'https://github.com/issues',
   sourceStatus,query:{q:keyword,page:currentPage},results,returned:results.length,
   totalCandidates:Number(payload.total_count||0),retrievedAt:new Date().toISOString(),
   disclaimer:'These are open, bounty-labelled GitHub issues. They are leads only. Financial reward, claim availability, publisher identity and payment are not verified. Never begin work or supply credentials without reviewing the original issue and its rules.'}};
 }
 return {search};
}
