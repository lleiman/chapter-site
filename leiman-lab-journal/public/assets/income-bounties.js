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
 form.requestSubmit();
}
