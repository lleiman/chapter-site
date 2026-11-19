/**
 * Official money-only grant search. Featured competitions are rendered
 * server-side from organiser-owned prize schedules on first paint.
 * No crypto/Web3, GitHub bounty issues, credit-only or unpriced listings.
 */
const financeRoot=document.querySelector('#income-desk');
if(financeRoot){
 const en=financeRoot.dataset.lang==='en';
 const $=id=>financeRoot.querySelector('#'+id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels=en?{
  loading:'Checking published award amounts in official Grants.gov notices…',
  found:'Grants with documented funding amounts',
  none:'No grants with published cash award amounts were found in this limited search. Try a different project topic. Unpriced programmes are intentionally hidden.',
  error:'Official funding detail service unavailable; no made-up awards will be displayed.',
  ceiling:'PUBLISHED AWARD CEILING',floor:'PUBLISHED AWARD FLOOR',
  eligibility:'ELIGIBILITY: MUST VERIFY',open:'OPEN OFFICIAL FUNDING NOTICE ↗',
  notPrize:'Grant funding is restricted to eligible projects and institutions. This is not a guaranteed prize or personal income.',
  lookedAt:'official notices examined',status:'MONETARY NOTICE / GRANTS.GOV',
  partial:'Some funding details could not be retrieved. Results may be incomplete.',
  noAmount:'No published amount',
  applicant:'ELIGIBLE APPLICANT TYPES ACCORDING TO NOTICE'
 }:{
  loading:'Проверяем опубликованные суммы по официальным объявлениям Grants.gov…',
  found:'Гранты с опубликованными денежными суммами',
  none:'По этой теме в ограниченной выборке нет грантов с суммами. Попробуйте другой запрос. Объявления без сумм намеренно скрываются.',
  error:'Официальный сервис сумм недоступен. Вымышленные гранты не подставляются.',
  ceiling:'ОПУБЛИКОВАННЫЙ ПОТОЛОК ГРАНТА',floor:'ОПУБЛИКОВАННЫЙ МИНИМУМ ГРАНТА',
  eligibility:'ДОПУСК: НУЖНА ПРОВЕРКА',open:'ОТКРЫТЬ ГРАНТ НА ОФИЦИАЛЬНОМ САЙТЕ ↗',
  notPrize:'Грант выделяется под допустимый проект или организацию. Это не гарантированный денежный приз или личный доход.',
  lookedAt:'официальных записей изучено',status:'ДЕНЕЖНЫЙ ГРАНТ / GRANTS.GOV',
  partial:'Часть документов не загрузилась. Список может быть неполным.',
  noAmount:'Сумма не опубликована',
  applicant:'ТИПЫ ЗАЯВИТЕЛЕЙ ПО ОФИЦИАЛЬНОМУ ДОКУМЕНТУ'
 };
 const form=$('id-funded-grant-form'),status=$('id-funded-grant-status'),results=$('id-funded-grant-results');
 const amount=v=>v==null?labels.noAmount:new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
 const render=x=>`<article class="id-grant-card id-funded-card">
  <div class="id-job-meta"><span>${labels.status}</span><span>${esc(x.deadline||'')}</span></div>
  <h4>${esc(x.title)}</h4>
  <p class="id-funded-agency">${esc(x.issuer)}</p>
  <div class="id-grant-detail">
   <div><small>${labels.ceiling}</small><strong>${esc(amount(x.fundingCeiling))}</strong></div>
   <div><small>${labels.floor}</small><strong>${esc(amount(x.fundingFloor))}</strong></div>
  </div>
  <p class="id-funded-applicants">${labels.applicant}: ${esc(x.applicantTypes?.join(', ')||labels.eligibility)}</p>
  <p class="id-grant-warning">${labels.notPrize}</p>
  <a target="_blank" rel="noopener noreferrer" href="${esc(x.sourceUrl)}">${labels.open}</a>
 </article>`;
 let loading=false;
 async function load(){
  if(loading)return;
  loading=true;status.textContent=labels.loading;results.replaceChildren();
  const button=form.querySelector('button[type=submit]');button.disabled=true;
  try{
   const q=String(new FormData(form).get('q')||'').trim();
   if(q.length<2)throw Error(en?'Enter at least two characters.':'Введите минимум два символа.');
   const r=await fetch('/api/income/prizes/funded-grants?'+new URLSearchParams({q}),{headers:{Accept:'application/json'}});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||labels.error);
   const verified=(data.results||[]).filter(v=>v.cashAmount>0&&v.cashCurrency==='USD'&&v.cashEvidence==='official_grant_synopsis');
   status.textContent=verified.length+' '+labels.found+' · '+data.searchedListings+' '+labels.lookedAt+(data.detailsPartiallyUnavailable?' · '+labels.partial:'');
   results.innerHTML=verified.length?verified.map(render).join(''):'<p class="id-legal">'+labels.none+'</p>';
  }catch(error){status.textContent=error.message||labels.error}
  finally{loading=false;button.disabled=false}
 }
 if(form){
  form.addEventListener('submit',event=>{event.preventDefault();load()});
  load();
 }
}
