import {readFileSync} from 'node:fs';
import path from 'node:path';

const ORGANISER_DOMAINS=new Set(['aif.runway.com','higgsfield.ai','www.akool.com','akool.com','redditgameofday2026.devpost.com','cognizant-agenticweb.devpost.com','www.heygen.com','dynamic.heygen.ai']);
const BLOCKED=/(?:\bcrypto\b|\bweb3\b|\bblockchain\b|\btoken sale\b|\bNFT\b|\bsecurity bounty\b|\bbug bounty\b)/i;
const esc=value=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const exactUrl=value=>{try{const u=new URL(String(value));return u.protocol==='https:'&&ORGANISER_DOMAINS.has(u.hostname)?u.href:null}catch{return null}};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));

export function publishedCashAwards(dataset,{now=new Date()}={}){
 const today=now.toISOString().slice(0,10);
 const verified=Array.isArray(dataset?.records)?dataset.records:[];
 const output=[],ids=new Set();
 for(const item of verified){
  if(!item||ids.has(item.id)||!validDate(item.deadlineDate)||item.deadlineDate<today)continue;
  if(!validDate(item.sourceChecked)||item.sourceChecked>today)continue;
  // Stale official verification must not remain advertised as currently checked.
  if(now.getTime()-Date.parse(item.sourceChecked+'T00:00:00Z')>32*86400000)continue;
  const url=exactUrl(item.url),rulesUrl=exactUrl(item.rulesUrl);
  if(!url||!rulesUrl)continue;
  if(item.cashCurrency!=='USD'||!Number.isFinite(item.cashAward)||item.cashAward<=0||item.cashAward>10000000)continue;
  if(item.cashEvidence?.startsWith('official_')!==true || item.awardNotGuaranteed!==true)continue;
  if(!['competition','grant'].includes(item.type))continue;
  if(BLOCKED.test([item.title,item.field,item.issuer,item.summaryEn,item.summaryRu].join(' ')))continue;
  if(!item.summaryEn||!item.summaryRu||!item.requirementsEn||!item.requirementsRu)continue;
  ids.add(item.id);
  output.push({...item,url,rulesUrl,
   evidenceLevel:'organiser_published_cash_amount',
   eligibility:'requires_individual_review',paymentGuaranteed:false,nonCashExcluded:true});
 }
 return output.sort((a,b)=>b.priority-a.priority||a.deadlineDate.localeCompare(b.deadlineDate));
}
export function loadCashAwards(dir){
 const dataset=JSON.parse(readFileSync(path.join(dir,'cash-awards.json'),'utf8'));
 return publishedCashAwards(dataset);
}
export function renderCashAwards(records,lang='en'){
 const en=lang==='en';
 if(!records.length)return '<p class="id-legal">'+(en?
  'No currently verified cash awards meet the publishing rules. Unpriced or expired opportunities are not shown.':
  'Нет действующих наград с подтверждённой опубликованной суммой. Безденежные и закрытые конкурсы не показываются.')+'</p>';
 return records.map((v,i)=>{
  const summary=en?v.summaryEn:v.summaryRu,requirements=en?v.requirementsEn:v.requirementsRu;
  const amount=new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v.cashAward);
  const pool=v.totalCashPool?new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v.totalCashPool):null;
  return `<article class="id-top-bounty id-cash-pick">
   <div class="id-top-bounty-rank">${String(i+1).padStart(2,'0')}</div>
   <div class="id-top-bounty-main">
    <div class="id-job-meta"><span>${esc(v.field)} · ${esc(v.issuer)} · ${en?'CASH AWARD':'ДЕНЕЖНЫЙ ПРИЗ'}</span><span>${esc(v.deadlineLabel)}</span></div>
    <h4>${esc(v.title)}</h4><p>${esc(summary)}</p>
    <p class="id-top-bounty-warning">${en?'REQUIREMENTS: ':'УСЛОВИЯ: '}${esc(requirements)}</p>
    <p class="id-top-bounty-warning">${en?'Organiser published an amount; eligibility and eventual payment depend on winning and official rules.':'Организатор опубликовал сумму; допуск и выплата зависят от результатов и правил конкурса.'}</p>
    <a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${en?'OPEN OFFICIAL CONTEST':'ОТКРЫТЬ КОНКУРС'} ↗</a>
    <a class="id-cash-rules" href="${esc(v.rulesUrl)}" target="_blank" rel="noopener noreferrer">${en?'OFFICIAL RULES':'ОФИЦИАЛЬНЫЕ ПРАВИЛА'} ↗</a>
   </div>
   <div class="id-top-bounty-outcome"><small>${en?'PUBLISHED CASH · FIRST PRIZE':'ЗАЯВЛЕНО · ПЕРВОЕ МЕСТО'}</small>
    <strong>${esc(amount)}</strong>
    ${pool?`<span class="id-cash-pool">${en?'TOTAL CASH POOL':'ОБЩИЙ ДЕНЕЖНЫЙ ФОНД'}: ${esc(pool)}</span>`:''}
    <small>${en?'Contest prize, not guaranteed income':'Приз конкурса, не гарантированный доход'}</small>
   </div>
   </article>`;
 }).join('');
}
