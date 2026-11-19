/**
 * Income Intelligence — evidence-first opportunity engine.
 * Public remote jobs: Himalayas API, used per https://himalayas.app/docs/remote-jobs-api
 * No CV data, contact details or user identities are transmitted to Himalayas.
 * Search data are cached. These are external listings, not verified contracts.
 */
import { createHash } from 'node:crypto';

const PROVIDER = 'https://himalayas.app';
const CACHE_TTL = 45 * 60 * 1000;
const MAX_CACHE = 70;
const cache = new Map();
const clientRate = new Map();
const CAPABILITIES = [
  {id:'research',label:'Research & Analysis',keywords:['research','survey','interview','study','data','analysis','market','ux'],human:'Research specialist',agent:'Research assistant'},
  {id:'strategy',label:'Strategy & Scope',keywords:['strategy','product','growth','campaign','requirements','planning','market'],human:'Strategist / producer',agent:'Planning assistant'},
  {id:'design',label:'Creative & Design',keywords:['design','creative','video','film','animation','brand','visual','content'],human:'Creative director / designer',agent:'Visual production assistant'},
  {id:'technical',label:'Engineering & Automation',keywords:['software','development','code','app','api','integration','website','automation','technical'],human:'Software engineer',agent:'Coding assistant'},
  {id:'operations',label:'Delivery & Operations',keywords:['delivery','deployment','management','operations','coordination','production','execution'],human:'Delivery lead',agent:'Workflow assistant'},
  {id:'quality',label:'Review & Compliance',keywords:['quality','security','audit','compliance','legal','review','testing','verification'],human:'QA / legal reviewer',agent:'Automated QA assistant'}
];

export const normaliseQuery = value => String(value || '').trim().replace(/[<>]/g,'').slice(0,90);
const tokens = value => String(value || '').toLowerCase().match(/[a-zа-яё0-9+#]{3,}/gi)?.slice(0,24) || [];
const safeString = (v,n=300) => String(v ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const validUrl = value => {
  try {const u=new URL(String(value));return u.protocol==='https:' && (u.hostname==='himalayas.app'||u.hostname.endsWith('.himalayas.app'))?u.toString():null}
  catch{return null}
};
export function opportunityFit(job,{q='',skills='',country=''}={}) {
  const terms = [...new Set([...tokens(q),...tokens(skills)])].slice(0,14);
  const haystack = [job.title,job.company,job.excerpt,...(job.categories||[])].join(' ').toLowerCase();
  const matched = terms.filter(term=>haystack.includes(term));
  const coverage = terms.length ? matched.length/terms.length : 0;
  const explicitTitle = tokens(q).some(term=>job.title.toLowerCase().includes(term));
  const eligible = !country || job.worldwide || job.locationUnclear ||
    job.locationRestrictions.some(x=>x.toLowerCase()===country.toLowerCase());
  // This is a fit estimate only: 0–100, not a hiring probability.
  const skillScore = terms.length ? Math.round(coverage*45) : 20;
  const recencyHours = Math.max(0,(Date.now()-new Date(job.publishedAt).getTime())/3600000);
  const freshness = Math.max(0,Math.round(15-Math.min(15,recencyHours/72)));
  const payTransparency = job.salary.min != null ? 10 : 0;
  const eligibility = !eligible ? 0 : job.locationUnclear ? 5 : !country ? 12 : 25;
  const titleBonus = explicitTitle ? 5 : 0;
  const score = Math.min(100,skillScore+freshness+payTransparency+eligibility+titleBonus);
  return {score,eligible,matchedSkills:matched,explanation:{
    skills:skillScore, eligibility, freshness, salaryTransparency:payTransparency, titleMatch:titleBonus
  },limitations:[
    ...(eligible?[]:['Location restrictions appear incompatible with the selected country.']),
    ...(job.locationUnclear?['Location eligibility is unknown. Check the employer’s exact restrictions.']:[]),
    ...(job.salary.min==null?['Compensation is not disclosed.']:[]),
    'This is a rules-based relevance score, not a probability of hiring.',
    'Apply and confirm current eligibility on the original source.'
  ]};
}
export function normaliseJob(j){
  if(!j||typeof j!=='object')return null;
  const apply=validUrl(j.applicationLink),link=validUrl(j.guid);
  if(!apply||!link||!j.title)return null;
  const descriptiveText=String(j.excerpt||'')+' '+String(j.description||'').slice(0,1000);
  if(/(?:we (?:do not|don't)(?: currently)? have any open (?:roles|positions)|no (?:current|open) (?:roles|positions)|general (?:interest|application)|join our talent pool)/i.test(descriptiveText))return null;
  const rawLocations=Array.isArray(j.locationRestrictions)?j.locationRestrictions:null;
  const locations=(rawLocations||[]).map(x=>safeString(x?.alpha2||x?.name||'',60)).filter(Boolean);
  const worldwide=Array.isArray(rawLocations)&&rawLocations.length===0;
  const locationUnclear=!Array.isArray(rawLocations)||(rawLocations.length>0&&locations.length===0);
  const expires=Number(j.expiryDate);
  if(Number.isFinite(expires)&&expires>0&&expires*1000<Date.now())return null;
  const id=createHash('sha256').update(String(j.guid)).digest('hex').slice(0,20);
  const salary={min:Number.isFinite(j.minSalary)?j.minSalary:null,max:Number.isFinite(j.maxSalary)?j.maxSalary:null,
    currency:safeString(j.currency||'USD',5),period:safeString(j.salaryPeriod||'annual',20)};
  return {id,type:'employment',title:safeString(j.title,180),company:safeString(j.companyName,100),
    excerpt:safeString(j.excerpt,550),employmentType:safeString(j.employmentType,35),seniority:Array.isArray(j.seniority)?j.seniority.map(x=>safeString(x,32)):[],
    categories:Array.isArray(j.categories)?j.categories.map(x=>safeString(x,50)).slice(0,10):[],
    locationRestrictions:locations,
    worldwide,locationUnclear,
    salary,source:'Himalayas',sourceUrl:link,applicationLink:apply,
    publishedAt:Number.isFinite(j.pubDate)?new Date(j.pubDate*1000).toISOString():null,
    expiresAt:expires>0?new Date(expires*1000).toISOString():null,
    checkedAt:new Date().toISOString(),verification:'provider_feed'};
}
function permit(client){
  const now=Date.now();
  if(clientRate.size>800)for(const [k,v] of clientRate)if(now-v.time>3600000)clientRate.delete(k);
  const item=clientRate.get(client)||{time:now,count:0};
  if(now-item.time>3600000){item.time=now;item.count=0}
  item.count++;clientRate.set(client,item);
  return item.count<=50;
}
export function createIncomeEngine({fetcher=globalThis.fetch}={}){
  async function findJobs(input={},client='anonymous'){
    if(!permit(client))return {status:429,body:{error:'Too many searches. Please retry later.'}};
    const q=normaliseQuery(input.q||'');
    const skills=normaliseQuery(input.skills||'');
    const country=String(input.country||'').trim().toUpperCase().slice(0,2);
    const page=Math.min(5,Math.max(1,parseInt(input.page,10)||1));
    const search=q||skills.split(',')[0]||'';
    const params=new URLSearchParams({sort:search?'relevant':'recent',page:String(page)});
    if(search)params.set('q',search);
    if(country&&/^[A-Z]{2}$/.test(country))params.set('country',country);
    const cacheKey=params.toString();
    let item=cache.get(cacheKey),sourceStatus='fresh',data;
    const now=Date.now();
    if(item&&now-item.time<CACHE_TTL){data=item.data;sourceStatus='cached'}
    else {
      try{
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),9000);
        let response;
        try{
          response=await fetcher(PROVIDER+'/jobs/api/search?'+cacheKey,{
            signal:controller.signal,headers:{Accept:'application/json','User-Agent':'LeimanLab-IncomeIntelligence/1.0'}
          });
        }finally{clearTimeout(timeout)}
        if(!response.ok)throw Error('Provider response '+response.status);
        const result=await response.json();
        if(!Array.isArray(result.jobs))throw Error('Invalid provider payload');
        data=result;
        cache.set(cacheKey,{data,time:now});
        if(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
      }catch(error){
        if(item&&now-item.time<24*3600000){data=item.data;sourceStatus='stale';}
        else return {status:503,body:{error:'Live provider unavailable. No listings have been fabricated.',provider:'Himalayas',results:[],retryAfterSeconds:90}};
      }
    }
    const ranked=(data.jobs||[]).map(normaliseJob).filter(Boolean).map(j=>({...j,fit:opportunityFit(j,{q,skills,country})}))
      .filter(j=>j.fit.eligible).sort((a,b)=>b.fit.score-a.fit.score);
    // A provider may list near-identical copies of one job under different source IDs.
    // Keep distinct roles and locations, but suppress duplicate company/title/contract pairs.
    const unique=new Set(),results=[];
    for(const job of ranked){
      const key=[job.company,job.title,job.employmentType,
        job.locationRestrictions.join(',')].join('|').toLowerCase().replace(/\s+/g,' ').trim();
      if(unique.has(key))continue;
      unique.add(key);results.push(job);
      if(results.length>=24)break;
    }
    return {status:200,body:{results,query:{q,skills,country,page},provider:'Himalayas',sourceUrl:'https://himalayas.app',
      sourceStatus,providerUpdatedAt:Number.isFinite(data.updatedAt)?new Date(data.updatedAt*1000).toISOString():null,
      retrievedAt:new Date().toISOString(),totalFromProvider:data.totalCount??null,
      disclaimer:'External employment listings, not secured contracts or bounties. Apply through Himalayas. Verify restrictions and availability. Scores are not hiring probabilities.'}};
  }
  function plan(input={}){
    const title=safeString(input.title||'',160);
    const brief=safeString(input.brief||'',3000);
    const rawBudget=Number(input.budget);
    const budget=Number.isFinite(rawBudget)?Math.round(rawBudget):NaN;
    const currency=/^(USD|EUR|GBP|IDR|RUB)$/.test(input.currency)?input.currency:'USD';
    if(title.length<4||brief.length<25||!Number.isFinite(budget)||budget<100||budget>10000000)
      return {status:400,body:{error:'A title, 25-character brief and a budget between 100 and 10,000,000 are required.'}};
    const query=tokens(title+' '+brief),matching=CAPABILITIES.map(c=>{
      const hits=c.keywords.filter(k=>query.some(t=>t.includes(k)||k.includes(t)));
      return {...c,hits: hits.length};
    });
    const priorities=matching.filter(c=>c.hits>0).sort((a,b)=>b.hits-a.hits);
    const selected=[...priorities.slice(0,3)];
    if(!selected.some(x=>x.id==='operations'))selected.push(matching.find(x=>x.id==='operations'));
    if(!selected.some(x=>x.id==='quality'))selected.push(matching.find(x=>x.id==='quality'));
    const distinct=[...new Map(selected.map(x=>[x.id,x])).values()].slice(0,5);
    const allocations=distinct.map((c,i)=>({
      id:c.id,name:c.label,humanRole:c.human,aiAssistant:c.agent,
      percentage:Math.floor(76/distinct.length)+(i<76%distinct.length?1:0),
      reason:c.hits?('Keyword signals: '+c.keywords.filter(k=>query.includes(k)).join(', ')):'Baseline delivery safeguard',
      approvalsRequired:true
    }));
    const allocated=allocations.reduce((n,a)=>n+a.percentage,0);
    // A hypothetical cost allocation, not a quote, price prediction or estimated profit.
    const qa=10, reserve=14, available=76;
    return {status:200,body:{title,brief, currency,budget,scenarioOnly:true,stage:'draft',permissions:'human_approval_required',
      allocations:allocations.map(a=>({...a,percentage:Math.round(a.percentage*available/allocated*100)/100,amount:Math.round(budget*a.percentage*available/allocated/100)})),
      qualityAssurance:{percentage:qa,amount:Math.round(budget*qa/100)},
      coordinationAndContingency:{percentage:reserve,amount:Math.round(budget*reserve/100)},
      directExecution:{percentage:available,amount:Math.round(budget*available/100)},
      grossMargin:'unknown',assessment:'Requires contract scope, market rates, actual bids, tax and legal checks before any profitability estimate.',
      milestones:['Verify buyer and funding','Confirm brief and acceptance criteria','Receive explicit authority to proceed','Assign reviewed human/AI capabilities','Deliver and obtain client approval','Invoice and reconcile actual costs'],
      safeguards:['No reservation without issuer permission','No automatic outreach, contracting or payment','No implied equity or ownership rights',
        'No sensitive information is sent to an LLM','Budget split is only a modelling assumption'],
      method:'Transparent keyword-to-capability mapping and fixed illustrative percentages. No LLM or financial prediction.'}};
  }
  return {findJobs,plan};
}
