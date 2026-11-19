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
/**
 * Editorial shortlisting of source-reported leads. This is NOT verified
 * profitability, funded escrow, difficulty, or expected payment.
 * Lower-scope signals in issue text cannot substitute for reading the issue.
 */
export function scoreBountyCandidate(item,{now=Date.now()}={}){
 const title=str(item.title,180).toLowerCase();
 const excerpt=str(item.excerpt,600).toLowerCase();
 const description=title+' '+excerpt;
 const amount=Number(item.rewardAmount);
 const priced=Number.isFinite(amount)&&amount>0;
 let score=0;
 const reasons=[];
 if(priced){
  score+=amount>=100&&amount<=2000?21:amount<100?10:amount<=5000?14:7;
  reasons.push('stated_reward');
 }else reasons.push('reward_not_disclosed');
 const focus=[
  {test:/\b(?:documentation|readme|docs|typo|copywriting|spelling|examples?)\b/i,key:'documentation_scope',points:22},
  {test:/\b(?:ui|frontend|css|styling|layout|visual|landing page|website|responsive)\b/i,key:'visual_scope',points:17},
  {test:/\b(?:small|simple|minor|single|one[- ]page|one[- ]file|quick fix)\b/i,key:'narrow_scope_hint',points:9},
  {test:/\b(?:test|tests|unit test|lint|build|fix a bug|bugfix)\b/i,key:'concrete_test_scope',points:8},
  {test:/\b(?:agent|automation|workflow|integration)\b/i,key:'automation_scope',points:8}
 ];
 let matched=0;
 for(const f of focus)if(f.test.test(description)){
  score+=f.points;reasons.push(f.key);matched++;
 }
 if(!matched)score+=2;
 if(/\b(?:acceptance criteria|deliverables|requirements|steps to reproduce|definition of done|expected behavior)\b/i.test(description)){
  score+=9;reasons.push('criteria_mentioned');
 }
 if(/\b(?:in progress|already claimed|assigned|claimed by|closed for submissions|do not apply)\b/i.test(description)){
  score-=25;reasons.push('possible_claim_conflict');
 }
 if(/\b(?:exploit|critical vulnerability|audit entire|complete rewrite|entire framework|production infrastructure|kernel|cryptography|zk[- ]?proof|zero knowledge)\b/i.test(description)){
  score-=20;reasons.push('specialist_or_complex_scope');
 }
 if(/\b(?:guaranteed|instant money|no work|easy profit|free cash)\b/i.test(description)){
  score-=18;reasons.push('promotional_claim_warning');
 }
 if((item.claimCount||0)>=20){score-=7;reasons.push('many_issue_comments')}
 const updated=Date.parse(item.updatedAt||'');
 if(Number.isFinite(updated)){
  const ageDays=Math.max(0,(now-updated)/86400000);
  if(ageDays<=7)score+=13;
  else if(ageDays<=30)score+=7;
  else if(ageDays>120){score-=15;reasons.push('older_update')}
 }
 // Risk deduction: every issue lacks independently verified payer/funds.
 score-=15;
 // Bounded and reproducible, not a success chance or skill assessment.
 return {score:Math.max(0,Math.min(100,Math.round(score))),
  reasons,method:'editorial_heuristic_v1',paymentVerified:false,
  effortVerified:false,
  notice:'Priority for manual inspection only. Payout, difficulty, eligibility and claim availability remain unverified.'};
}

export function createBountySearch({fetcher=globalThis.fetch}={}){
 let featuredCache=null;
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
 async function top(client='anonymous'){
  if(featuredCache && Date.now()-featuredCache.at<20*60*1000)
    return {status:200,body:{...featuredCache.body,sourceStatus:'cached'}};
  // Independent of user filters. Collect several recent pages rather than
  // selecting five from whatever keyword the visitor happened to type.
  const pages=await Promise.allSettled([1,2,3].map(page=>
    search({q:'',page},client+'|curated-top')
  ));
  const leads=[],seen=new Set(),statuses=[];
  for(const page of pages){
   if(page.status!=='fulfilled')continue;
   const result=page.value;
   if(result.status!==200)continue;
   statuses.push(result.body.sourceStatus);
   for(const item of result.body.results){
    if(seen.has(item.sourceUrl))continue;
    seen.add(item.sourceUrl);
    leads.push({...item,editorial:scoreBountyCandidate(item)});
   }
  }
  if(!statuses.length)return {status:503,body:{
   results:[],candidatePool:0,provider:'GitHub Bounty Candidates',
   error:'No recent bounty candidates could be retrieved. No featured items have been invented.'
  }};
  leads.sort((a,b)=>b.editorial.score-a.editorial.score||
    Number(Boolean(b.rewardAmount))-Number(Boolean(a.rewardAmount))||
    String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const output={status:200,body:{results:leads.slice(0,5),
   candidatePool:leads.length,provider:'GitHub Bounty Candidates',
   sourceStatus:statuses.includes('stale')?'partially_stale':statuses.every(x=>x==='cached')?'cached':'fresh',
   independentOfUserFilters:true,editorialMethod:'editorial_heuristic_v1',
   disclaimer:'Automatically shortlisted for manual review across up to 90 recent GitHub issue candidates. This is NOT a verified recommendation, guaranteed payment, predicted difficulty or a probability of winning. Original project and reward terms must be checked.'}};
  featuredCache={at:Date.now(),body:output.body};
  return output;
 }
 return {search,top};
}
