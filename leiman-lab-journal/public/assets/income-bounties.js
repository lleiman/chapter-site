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

 // Featured UX: two visible records, independent Prizes / Grants tabs.
 const featured=$('editors-picks');
 const prizeTab=$('id-feature-prizes'),grantTab=$('id-feature-grants');
 const prizePanel=$('id-feature-prizes-panel'),grantPanel=$('id-feature-grants-panel');
 const grantFeatured=$('id-feature-grants-results'),grantFeaturedStatus=$('id-feature-grants-status');
 const more=$('id-feature-see-more'),featuredMeta=$('id-top-bounty-meta');
 const featuredDescription=$('id-featured-description'),featuredHeading=$('id-top-bounty-heading');
 const featuredFootnote=$('id-featured-footnote');
 const currency=value=>new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
 const prizeCount=$('id-top-bounty-results').querySelectorAll('.id-award-row').length;
 let featuredView='prizes',showAll=false,featuredGrantRows=[],featuredGrantsLoaded=false,featuredGrantsLoading=false;
 function grantsHTML(x,i){
  const value=x.fundingCeiling??x.fundingFloor;
  const title=esc(x.title),issuer=esc(x.issuer||'Grants.gov');
  const deadline=esc(x.deadline|| (en?'See official notice':'Уточнить в объявлении'));
  const count=new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  const label=x.fundingCeiling!=null?(en?'AWARD CEILING':'МАКСИМУМ ГРАНТА'):(en?'AWARD FLOOR':'МИНИМУМ ГРАНТА');
  return '<details class="id-award-row"><summary class="id-award-summary">'+
   '<span class="id-award-index">'+String(i+1).padStart(2,'0')+'</span>'+
   '<span class="id-award-identity"><strong>'+title+'</strong><small>US FEDERAL GRANT · '+issuer+'</small></span>'+
   '<span class="id-award-date"><small>'+(en?'DEADLINE':'ДЕДЛАЙН')+'</small><strong>'+deadline+'</strong></span>'+
   '<span class="id-award-money"><small>'+label+'</small><strong>'+esc(count)+'</strong></span>'+
   '<span class="id-award-chevron" aria-hidden="true"></span></summary>'+
   '<div class="id-award-expanded"><p>'+esc(x.summary||x.issuer||'')+'</p>'+
   '<p class="id-award-requirements"><strong>'+(en?'APPLICANT TYPES':'ТИПЫ ЗАЯВИТЕЛЕЙ')+':</strong> '+
    esc((x.applicantTypes||[]).join(', ')||(en?'Check official notice':'Проверить официальное объявление'))+'</p>'+
   '<p class="id-award-requirements">'+(en?
    'Grant funding is restricted to eligible project expenses; the published amount is not guaranteed personal income.':
    'Грант выделяется на допустимые расходы проекта; заявленная сумма не является гарантированным личным доходом.')+'</p>'+
   '<div class="id-award-actions"><a target="_blank" rel="noopener noreferrer" href="'+esc(x.sourceUrl)+'">'+
    (en?'OFFICIAL GRANT NOTICE ↗':'ОФИЦИАЛЬНЫЙ ГРАНТ ↗')+'</a></div></div></details>';
 }
 function refreshFeatured(){
  const grants=featuredView==='grants';
  prizePanel.hidden=grants;grantPanel.hidden=!grants;
  prizeTab.classList.toggle('is-active',!grants);grantTab.classList.toggle('is-active',grants);
  prizeTab.setAttribute('aria-selected',String(!grants));grantTab.setAttribute('aria-selected',String(grants));
  prizeTab.tabIndex=grants?-1:0;grantTab.tabIndex=grants?0:-1;
  featured.classList.toggle('id-feature-grants-active',grants);
  featured.classList.toggle('id-show-all',showAll);
  featuredHeading.textContent=grants?(en?'Funded grants':'Денежные гранты'):(en?"Editor's picks":'Выбор редакции');
  featuredDescription.textContent=grants?
   (en?'US grants with published funding amounts. Check eligibility before applying.':'Гранты США с опубликованными суммами. Проверяйте допуск перед заявкой.'):
   (en?'Cash-prize competitions, selected from official organiser rules.':'Конкурсы с денежными призами по официальным правилам организаторов.');
  featuredFootnote.textContent=grants?
   (en?'Grant ceilings are project funding, not guaranteed payments.':'Размер гранта означает целевое финансирование, не гарантированный доход.'):
   (en?'Prizes are paid only to eligible winners under organiser rules.':'Денежные призы выплачиваются только победителям при соблюдении правил.');
  const count=grants?featuredGrantRows.length:prizeCount;
  const visible=showAll?count:Math.min(2,count);
  const available=!grants||featuredGrantsLoaded;
  const pending=grants&&featuredGrantsLoading;
  featuredMeta.textContent=pending?(en?'LOADING GRANTS…':'ЗАГРУЖАЕМ ГРАНТЫ…'):
   available?(en?visible+' OF '+count+' · '+(grants?'GRANTS':'PRIZES'):
    visible+' ИЗ '+count+' · '+(grants?'ГРАНТОВ':'ПРИЗОВ')):
    (en?'GRANT AMOUNTS · OFFICIAL SOURCE':'СУММЫ ГРАНТОВ · ОФИЦИАЛЬНО');
  more.hidden=pending||!available||count<=2;
  more.setAttribute('aria-expanded',String(showAll));
  more.setAttribute('aria-controls',grants?'id-feature-grants-results':'id-top-bounty-results');
  more.textContent=showAll?(en?'Show less ↑':'Свернуть ↑'):(en?'See more ('+(count-2)+') ↓':'Показать ещё ('+(count-2)+') ↓');
 }
 async function loadFeaturedGrants(){
  if(featuredGrantsLoaded||featuredGrantsLoading)return;
  featuredGrantsLoading=true;refreshFeatured();
  grantFeaturedStatus.textContent=en?'Retrieving official funding notices…':'Загружаем официальные гранты…';
  try{
   const response=await fetch('/api/income/prizes/funded-grants?'+new URLSearchParams({q:'arts'}),{headers:{Accept:'application/json'}});
   const data=await response.json();
   if(!response.ok)throw Error(data.error|| (en?'Official grant feed unavailable':'Источник грантов недоступен'));
   featuredGrantRows=(data.results||[]).filter(x=>x.cashAmount>0&&x.cashCurrency==='USD'&&x.cashEvidence==='official_grant_synopsis').slice(0,12);
   grantFeatured.innerHTML=featuredGrantRows.map(grantsHTML).join('');
   grantFeaturedStatus.textContent=featuredGrantRows.length?
    (en?'Selected from official Grants.gov notices. Amounts are funding ceilings, not prizes.':
    'Выбраны из официальных объявлений Grants.gov. Суммы означают финансирование, а не призы.'):
    (en?'No grants with published amounts in this topic. Search other topics below.':
    'Нет грантов с опубликованными суммами по этой теме. Измените запрос ниже.');
   featuredGrantsLoaded=true;
  }catch(err){
   grantFeaturedStatus.textContent=err.message|| (en?'Official grant source unavailable':'Источник грантов недоступен');
   grantFeatured.replaceChildren();
   featuredGrantsLoaded=false;
  }finally{featuredGrantsLoading=false;refreshFeatured()}
 }
 function selectFeatured(view,focus=false){
  if(view===featuredView)return;
  featuredView=view;showAll=false;refreshFeatured();
  if(focus)(view==='prizes'?prizeTab:grantTab).focus();
  if(view==='grants')loadFeaturedGrants();
 }
 prizeTab.addEventListener('click',()=>selectFeatured('prizes'));
 grantTab.addEventListener('click',()=>selectFeatured('grants'));
 const tablist=featured.querySelector('[role="tablist"]');
 tablist.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const next=event.key==='Home'?'prizes':event.key==='End'?'grants':
   featuredView==='prizes'?'grants':'prizes';
  selectFeatured(next,true);
 });
 more.addEventListener('click',()=>{
  showAll=!showAll;
  refreshFeatured();
 });
 refreshFeatured();

 const form=$('id-funded-grant-form'),status=$('id-funded-grant-status'),results=$('id-funded-grant-results');
 const amount=v=>v==null?labels.noAmount:new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
 const render=x=>`<article class="id-grant-card id-funded-card">
  <div class="id-job-meta"><span>${labels.status}</span><span>${esc(x.deadline||'')}</span></div>
  <h4>${esc(x.title)}</h4>
  <p class="id-funded-agency">${esc(x.issuer)}</p>
  ${x.summary?'<p class="id-funded-applicants">'+esc(x.summary.slice(0,330))+'</p>':''}
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
