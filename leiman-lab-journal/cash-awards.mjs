import {readFileSync} from 'node:fs';
import path from 'node:path';

const ORGANISER_DOMAINS=new Set(['aif.runway.com','higgsfield.ai','www.akool.com','akool.com','redditgameofday2026.devpost.com','cognizant-agenticweb.devpost.com','www.heygen.com','dynamic.heygen.ai']);
const BLOCKED=/(?:\bcrypto(?:currency|currencies)?\b|\bweb3\b|\bblockchain\b|\btoken sale\b|\bNFTs?\b|\bDeFi\b|\bdigital assets?\b|\bsecurity bounty\b|\bbug bounty\b)/i;
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
  'No currently verified cash awards meet the rules. Unpriced or expired entries stay hidden.':
  'Сейчас нет подходящих денежных наград. Конкурсы без сумм и закрытые заявки скрыты.')+'</p>';
 const monthFmt=new Intl.DateTimeFormat(en?'en-GB':'ru-RU',{month:'short',timeZone:'UTC'});
 return records.map((v,i)=>{
  const summary=en?v.summaryEn:v.summaryRu,requirements=en?v.requirementsEn:v.requirementsRu;
  const amount=new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v.cashAward);
  const deadline=new Date(v.deadlineDate+'T12:00:00Z');
  const shortDate=deadline.getUTCDate()+' '+monthFmt.format(deadline).toUpperCase()+' '+deadline.getUTCFullYear();
  return `<details class="id-award-row">
    <summary class="id-award-summary">
     <span class="id-award-index">${String(i+1).padStart(2,'0')}</span>
     <span class="id-award-identity"><strong>${esc(v.title)}</strong><small>${esc(v.field)} · ${esc(v.issuer)}</small></span>
     <span class="id-award-date"><small>${en?'DEADLINE':'ДЕДЛАЙН'}</small><strong>${esc(shortDate)}</strong></span>
     <span class="id-award-money"><small>${en?'1ST CASH PRIZE':'1-Й ДЕНЕЖНЫЙ ПРИЗ'}</small><strong>${esc(amount)}</strong></span>
     <span class="id-award-chevron" aria-hidden="true"></span>
    </summary>
    <div class="id-award-expanded">
     <p>${esc(summary)}</p>
     <p class="id-award-requirements"><strong>${en?'REQUIREMENTS':'УСЛОВИЯ'}:</strong> ${esc(requirements)}</p>
     <div class="id-award-actions">
      <a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${en?'OPEN COMPETITION':'ОТКРЫТЬ КОНКУРС'} ↗</a>
      <a class="id-award-secondary" href="${esc(v.rulesUrl)}" target="_blank" rel="noopener noreferrer">${en?'OFFICIAL RULES':'ПРАВИЛА ОРГАНИЗАТОРА'} ↗</a>
     </div>
     <small class="id-award-disclaimer">${en?'Published cash award, payable only to eligible winners under organiser rules.':
      'Опубликованный денежный приз, выплата только победителям при соблюдении правил.'}</small>
    </div>
   </details>`;
 }).join('');
}
