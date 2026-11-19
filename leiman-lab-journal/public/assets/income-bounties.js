const bountiesRoot=document.querySelector('#income-desk');
if(bountiesRoot){
 const en=bountiesRoot.dataset.lang==='en';
 const $=id=>bountiesRoot.querySelector('#'+id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels=en?{
  loading:'Searching open GitHub bounty-labelled issues…',none:'No matching bounty-labelled issues. Try a broader term, or visit Opire and Algora directly.',
  outage:'GitHub issue search unavailable. No fictional bounties substituted.',
  unverified:'UNVERIFIED REWARD',unknown:'AMOUNT NOT VERIFIED',see:'REVIEW ORIGINAL ISSUE ↗',
  candidate:'OPEN ISSUE / BOUNTY CANDIDATE',date:'UPDATED',notPrize:'NOT A GUARANTEED PAYMENT',
  listing:'GitHub issue labels alone cannot prove funding or payouts.',
  sources:'Official directories',direct:'GO TO PLATFORM ↗',review:'PAYOUT / TERMS UNVERIFIED'
 }:{
  loading:'Ищем открытые GitHub-задачи с меткой bounty…',none:'Нет совпадений. Попробуйте другой запрос или зайдите в Opire и Algora.',
  outage:'Поиск GitHub временно недоступен. Вымышленные награды не подставляются.',
  unverified:'НЕПОДТВЕРЖДЁННАЯ НАГРАДА',unknown:'СУММА НЕ ПОДТВЕРЖДЕНА',see:'ОТКРЫТЬ ОРИГИНАЛ ↗',
  candidate:'ОТКРЫТАЯ ЗАДАЧА / КАНДИДАТ',date:'ОБНОВЛЕНО',notPrize:'ВЫПЛАТА НЕ ГАРАНТИРОВАНА',
  listing:'Метка GitHub не подтверждает наличие средств и выплату.',
  sources:'Официальные каталоги',direct:'ПЕРЕЙТИ ↗',review:'ВЫПЛАТА И УСЛОВИЯ НЕ ПРОВЕРЕНЫ'
 };
 const featuredBox=$('id-top-bounty-results'),featuredMeta=$('id-top-bounty-meta');
 const editorialReasons=en?{
  stated_reward:'Reward amount mentioned',reward_not_disclosed:'Payout not disclosed',
  documentation_scope:'Documentation scope',visual_scope:'UI / visual work',
  narrow_scope_hint:'Possible limited scope',concrete_test_scope:'Testable deliverable',
  automation_scope:'Automation task',criteria_mentioned:'Acceptance criteria mentioned',
  possible_claim_conflict:'Possible existing claim',specialist_or_complex_scope:'Likely specialist work',
  promotional_claim_warning:'Unreliable marketing language',many_issue_comments:'Heavily discussed issue',
  older_update:'Old update'
 }:{
  stated_reward:'Сумма награды упомянута',reward_not_disclosed:'Сумма не указана',
  documentation_scope:'Документация',visual_scope:'UI / визуальные задачи',
  narrow_scope_hint:'Возможно ограниченный объём',concrete_test_scope:'Проверяемый результат',
  automation_scope:'Автоматизация',criteria_mentioned:'Упомянуты критерии приёмки',
  possible_claim_conflict:'Возможно, задачу уже взяли',specialist_or_complex_scope:'Вероятно, сложная работа',
  promotional_claim_warning:'Сомнительное рекламное обещание',many_issue_comments:'Много комментариев',
  older_update:'Давно не обновлялась'
 };
 function renderFeatured(item,index){
  const reasons=(item.editorial?.reasons||[]).slice(0,4).map(reason=>editorialReasons[reason]||reason);
  const pay=item.rewardAmount!=null&&item.rewardCurrency?money(item):
    (en?'Reward not disclosed':'Награда не указана');
  const label=en?'REVIEW PRIORITY':'ПРИОРИТЕТ ПРОВЕРКИ';
  return `<article class="id-top-bounty">
   <div class="id-top-bounty-rank">${String(index+1).padStart(2,'0')}</div>
   <div class="id-top-bounty-main"><div class="id-job-meta"><span>${esc(item.issuer)}</span><span>${esc(date(item.updatedAt))}</span></div>
    <h4>${esc(item.title)}</h4>
    <p>${esc(item.excerpt||'')}</p>
    <div class="id-top-bounty-reasons">${reasons.map(x=>'<span>'+esc(x)+'</span>').join('')}</div>
    <p class="id-top-bounty-warning">${en?'Payout, actual effort, and claim availability are NOT verified.':'Выплата, реальная сложность и возможность взять задачу НЕ подтверждены.'}</p>
    <a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${labels.see}</a></div>
   <div class="id-top-bounty-outcome"><small>${label}</small><strong>${Number(item.editorial?.score||0)} / 100</strong>
    <span>${esc(pay)}</span><small>${en?'Stated, not verified':'Указано, не проверено'}</small></div>
   </article>`;
 }
 async function loadFeatured(){
  if(!featuredBox)return;
  featuredMeta.textContent=en?'Checking unfiltered source candidates…':'Проверяем задачи без пользовательских фильтров…';
  try{
   const response=await fetch('/api/income/bounties/top',{headers:{Accept:'application/json'}});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||(en?'Featured source unavailable':'Источник подборки недоступен'));
   const featured=Array.isArray(data.results)?data.results:[];
   featuredMeta.textContent=featured.length+' / '+data.candidatePool+' '+(en?'candidates reviewed':'кандидатов просмотрено')+
    ' · '+String(data.sourceStatus||'').toUpperCase();
   featuredBox.innerHTML=featured.length?
    featured.map(renderFeatured).join(''):
    '<p class="id-legal">'+(en?'No candidates available from the current source sample.':'В текущей выборке нет подходящих задач.')+'</p>';
  }catch(error){
   featuredMeta.textContent=en?'UNAVAILABLE · SOURCE CHECK FAILED':'НЕДОСТУПНО · ОШИБКА ИСТОЧНИКА';
   featuredBox.innerHTML='<p class="id-legal">'+esc(error.message)+'</p>';
  }
 }
 const form=$('id-bounty-form'),status=$('id-bounty-status'),count=$('id-bounty-count');
 const list=$('id-bounty-results'),threshold=$('id-bounty-reward'),order=$('id-bounty-order');
 const assumedHours=$('id-bounty-hours');
 let results=[];
 const date=x=>typeof x==='string'?x.slice(0,10):'—';
 const money=x=>x.rewardAmount!=null&&x.rewardCurrency?
  new Intl.NumberFormat(en?'en-US':'ru-RU',{style:'currency',currency:x.rewardCurrency,maximumFractionDigits:0}).format(x.rewardAmount):
  labels.unknown;
 function renderCard(x){
  return `<article class="id-bounty-card">
   <div class="id-job-meta"><span>${labels.candidate}</span><span>${labels.date}: ${esc(date(x.updatedAt))}</span></div>
   <h4>${esc(x.title)}</h4><p>${esc(x.issuer)} · ${esc(x.excerpt||'')}</p>
   <div class="id-bounty-amount"><small>${labels.unverified}</small><strong>${esc(money(x))}</strong></div>
   <p class="id-bounty-rate">${x.rewardAmount!=null&&x.rewardCurrency==='USD'?(en?'HYPOTHETICAL REWARD / YOUR HOUR ESTIMATE: ':'УСЛОВНАЯ НАГРАДА / ВАША ОЦЕНКА: ')+esc(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(x.rewardAmount/Number(assumedHours.value)))+'/h':(en?'No reliable hourly estimate available.':'Нельзя вычислить условную почасовую ставку.')}</p>
   <p class="id-grant-warning">${labels.notPrize}. ${labels.listing}</p>
   <a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">${labels.see}</a></article>`;
 }
 function draw(){
  let filtered=results.filter(x=>threshold.value==='all'||x.rewardAmount!=null&&x.rewardCurrency==='USD'&&x.rewardAmount>=Number(threshold.value));
  if(order.value==='reward'||order.value==='hourly')filtered=filtered.slice().sort((a,b)=>(b.rewardAmount||0)-(a.rewardAmount||0));
  count.textContent=filtered.length+' / '+results.length;
  list.innerHTML=filtered.length?filtered.map(renderCard).join(''):'<p class="id-legal">'+labels.none+'</p>';
 }
 threshold.addEventListener('change',draw);order.addEventListener('change',draw);assumedHours.addEventListener('change',draw);
 form.addEventListener('submit',async event=>{
  event.preventDefault();const q=String(new FormData(form).get('q')||'').trim();
  status.textContent=labels.loading;count.textContent='';list.replaceChildren();
  const button=form.querySelector('button');button.disabled=true;
  try{
   const res=await fetch('/api/income/bounties?'+new URLSearchParams({q}),{headers:{Accept:'application/json'}});
   const data=await res.json();if(!res.ok)throw Error(data.error||labels.outage);
   results=Array.isArray(data.results)?data.results:[];
   status.textContent=data.provider+' · '+data.sourceStatus.toUpperCase()+' · '+labels.review;
   draw();
  }catch(err){results=[];status.textContent=err.message||labels.outage;count.textContent=''}
  finally{button.disabled=false}
 });
 const directory=$('id-bounty-directories');
 fetch('/api/income/sources',{headers:{Accept:'application/json'}}).then(async response=>{
  if(!response.ok)throw Error('Sources unavailable');
  const json=await response.json();
  const categories=new Set(['bounties','competitions','security_bounties']);
  directory.innerHTML=json.sources.filter(x=>categories.has(x.kind)).map(x=>
   '<article><span>'+esc(x.kind.toUpperCase())+' · '+esc(x.readiness.toUpperCase())+'</span>'+
   '<h4>'+esc(x.name)+'</h4><p>'+esc(x[en?'en':'ru'])+'</p>'+
   '<a target="_blank" rel="noopener noreferrer" href="'+esc(x.search)+'">'+labels.direct+'</a></article>'
  ).join('');
 }).catch(()=>{directory.textContent=en?'Official directories unavailable.':'Каталоги временно недоступны.'});
 loadFeatured();
 form.requestSubmit();
}
