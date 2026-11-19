const desk=document.querySelector('#income-desk');
if(desk){
 const en=desk.dataset.lang==='en';
 const $=id=>desk.querySelector('#'+id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const tr=en?{
  loading:'Searching the external feed…',found:'Listings returned',none:'No listings matched. Try another term.',unavailable:'Provider unavailable; no synthetic results substituted.',
  source:'SOURCE',apply:'VIEW & APPLY',global:'WORLDWIDE',restrictions:'ELIGIBLE COUNTRIES',score:'FIT',notPay:'SALARY NOT DISCLOSED',job:'EXTERNAL JOB',
  needsCheck:'Provider listing, verify before applying',plan:'MODELLED CAPABILITY PLAN',human:'HUMAN',agent:'AI ASSISTANT',
  safeguards:'REQUIRED APPROVALS',milestones:'EXECUTION GATES',review:'QUALITY REVIEW',coordination:'COORDINATION + CONTINGENCY',execution:'DIRECT EXECUTION',
  margin:'Actual margin cannot be estimated until bids and terms are verified.',disclaimer:'Illustrative budget allocation; not a binding quote or profitability forecast.',
  failed:'Request failed. Check the input or retry.',sent:'Private brief accepted. Save the deletion code shown below.',deleted:'Brief deleted.',deleteFailed:'Unable to delete the brief.',
  scenario:'MODEL / HUMAN REVIEW REQUIRED'
 }:{
  loading:'Получаем данные из внешнего источника…',found:'Объявлений найдено',none:'По запросу ничего не найдено. Попробуйте другой термин.',unavailable:'Источник недоступен. Вымышленные результаты не подставляются.',
  source:'ИСТОЧНИК',apply:'ОТКРЫТЬ И ОТКЛИКНУТЬСЯ',global:'ВЕСЬ МИР',restrictions:'СТРАНЫ ДОПУСКА',score:'СООТВЕТСТВИЕ',notPay:'ЗАРПЛАТА НЕ УКАЗАНА',job:'ВНЕШНЯЯ ВАКАНСИЯ',
  needsCheck:'Объявление источника, требуется проверка',plan:'УСЛОВНЫЙ ПЛАН КОМПЕТЕНЦИЙ',human:'ЧЕЛОВЕК',agent:'ИИ-ПОМОЩНИК',
  safeguards:'УСЛОВИЯ СОГЛАСОВАНИЯ',milestones:'ЭТАПЫ ИСПОЛНЕНИЯ',review:'ПРОВЕРКА КАЧЕСТВА',coordination:'КООРДИНАЦИЯ И РЕЗЕРВ',execution:'ПРЯМОЕ ИСПОЛНЕНИЕ',
  margin:'Реальную маржу нельзя рассчитать без ставок исполнителей и условий договора.',disclaimer:'Условные доли бюджета; не оферта и не прогноз прибыльности.',
  failed:'Ошибка запроса. Проверьте данные или повторите попытку.',sent:'Заявка сохранена закрыто. Сохраните код удаления.',deleted:'Заявка удалена.',deleteFailed:'Не удалось удалить заявку.',
  scenario:'МОДЕЛЬ / ТРЕБУЕТ СОГЛАСОВАНИЯ'
 };
 const money=(n,c)=>Number(n).toLocaleString(en?'en-US':'ru-RU',{style:'currency',currency:/^(USD|EUR|GBP|RUB|IDR)$/.test(c)?c:'USD',maximumFractionDigits:0});
 const status=$('id-job-status'),count=$('id-job-count'),list=$('id-job-results'),search=$('id-job-search');
 function renderJob(item){
  const loc=item.worldwide?tr.global:item.locationRestrictions.join(', ');
  const salary=item.salary?.min!=null?
    money(item.salary.min,item.salary.currency)+(item.salary.max?' – '+money(item.salary.max,item.salary.currency):'')+' / '+esc(item.salary.period):
    tr.notPay;
  const skillMatch=item.fit.matchedSkills.length?item.fit.matchedSkills.join(', '):'—';
  const restrictions=item.worldwide?'':`<div class="id-job-restriction">${tr.restrictions}: ${esc(loc)}</div>`;
  return `<article class="id-job-card">
   <div class="id-job-meta"><span>${tr.job} · ${esc(item.employmentType||'REMOTE')}</span><span>${esc(item.company)}</span></div>
   <h3>${esc(item.title)}</h3><p>${esc(item.excerpt||'')}</p>
   <div class="id-job-data"><div><small>${tr.score}</small><strong>${Number(item.fit.score)}/100</strong></div><div><small>PAY</small><strong>${salary}</strong></div><div><small>LOCATION</small><strong>${esc(loc)}</strong></div></div>
   ${restrictions}<div class="id-job-meta id-job-bottom">
   <span>${esc(item.publishedAt?.slice(0,10)||'')} · ${esc(item.source)} · ${tr.needsCheck}</span>
   <a href="${esc(item.applicationLink)}" target="_blank" rel="noopener noreferrer">${tr.apply} ↗</a></div>
   <details><summary>${en?'WHY THIS FIT SCORE?':'ПОЧЕМУ ТАКОЙ РЕЙТИНГ?'}</summary><p>${en?'Keyword matches':'Совпадение навыков'}: ${esc(skillMatch)}</p>
   <p>${Object.entries(item.fit.explanation).map(([k,v])=>esc(k)+': '+Number(v)).join(' · ')}</p>
   <p>${item.fit.limitations.map(esc).join(' ')}</p>
   <p><a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${tr.source}: Himalayas ↗</a></p></details></article>`;
 }
 const runJobs=async()=>{
  const fd=new FormData(search),q=String(fd.get('q')||'').trim();
  if(q.length<2){status.textContent=en?'Enter at least two letters.':'Введите хотя бы два символа.';return}
  const params=new URLSearchParams({q,skills:String(fd.get('skills')||''),country:String(fd.get('country')||'').toUpperCase()});
  status.textContent=tr.loading;count.textContent='';list.replaceChildren();
  const btn=search.querySelector('button[type=submit]');btn.disabled=true;
  try{
   const res=await fetch('/api/income/jobs?'+params.toString(),{headers:{Accept:'application/json'}});
   const d=await res.json();
   if(!res.ok)throw Error(d.error||tr.unavailable);
   status.textContent=d.results.length?tr.found:tr.none;
   count.textContent=d.results.length?' / '+d.results.length:'';
   $('id-job-age').textContent=(d.sourceStatus||'').toUpperCase()+' · '+(d.providerUpdatedAt?.slice(0,10)||'');
   list.innerHTML=d.results.map(renderJob).join('');
  }catch(error){status.textContent=error.message||tr.unavailable;list.replaceChildren()}
  finally{btn.disabled=false}
 };
 search.addEventListener('submit',e=>{e.preventDefault();runJobs()});
 const form=$('id-plan-form'),out=$('id-plan-output');
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(!form.reportValidity())return;
  const params=Object.fromEntries(new FormData(form).entries());
  const submit=form.querySelector('button[type=submit]');submit.disabled=true;out.textContent='…';
  try{
   const response=await fetch('/api/income/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});
   const d=await response.json();if(!response.ok)throw Error(d.error||tr.failed);
   const capabilities=d.allocations.map(item=>`<article class="id-plan-role"><div class="id-role-heading"><strong>${esc(item.name)}</strong><b>${item.percentage.toFixed(1)}%</b></div>
   <div class="id-role-bar"><span style="width:${Math.min(100,Math.max(0,item.percentage))}%"></span></div>
   <small>${tr.human}: ${esc(item.humanRole)}<br>${tr.agent}: ${esc(item.aiAssistant)}</small></article>`).join('');
   out.innerHTML=`<div class="id-plan-kicker">${tr.plan}</div><h3>${esc(d.title)}</h3>
    <div class="id-plan-total">${money(d.budget,d.currency)}<small>${tr.scenario}</small></div>
    <div class="id-plan-roles">${capabilities}</div>
    <div class="id-budget-detail"><span>${tr.execution}</span><b>${money(d.directExecution.amount,d.currency)} / 76%</b>
    <span>${tr.review}</span><b>${money(d.qualityAssurance.amount,d.currency)} / 10%</b>
    <span>${tr.coordination}</span><b>${money(d.coordinationAndContingency.amount,d.currency)} / 14%</b></div>
    <p class="id-plan-warning">${tr.margin}</p>
    <h4>${tr.milestones}</h4><ol>${d.milestones.map(s=>'<li>'+esc(s)+'</li>').join('')}</ol>
    <h4>${tr.safeguards}</h4><ul>${d.safeguards.map(s=>'<li>'+esc(s)+'</li>').join('')}</ul>
    <p class="id-legal">${tr.disclaimer}</p>`;
  }catch(err){out.textContent=err.message||tr.failed}finally{submit.disabled=false}
 });
 const brief=$('id-brief-form'),box=$('id-delete-panel'),token=$('id-delete-token'),submitStatus=$('id-submit-status');
 const storageKey='leiman-lab-income-brief';
 const readLocal=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null')}catch{return null}};
 const display=record=>{box.hidden=false;token.textContent=record.id+' : '+record.deletionToken};
 if(readLocal())display(readLocal());
 brief.addEventListener('submit',async e=>{
  e.preventDefault();if(!brief.reportValidity())return;
  const payload=Object.fromEntries(new FormData(brief).entries());
  payload.consent=!!brief.elements.consent.checked;payload.locale=desk.dataset.lang;
  const btn=brief.querySelector('button[type=submit]');btn.disabled=true;submitStatus.textContent='…';
  try{
   const res=await fetch('/api/income/briefs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const d=await res.json();if(!res.ok)throw Error(d.error||tr.failed);
   const record={id:d.id,deletionToken:d.deletionToken};
   try{localStorage.setItem(storageKey,JSON.stringify(record))}catch{}
   display(record);submitStatus.textContent=tr.sent;brief.reset();
  }catch(error){submitStatus.textContent=error.message||tr.failed}finally{btn.disabled=false}
 });
 $('id-delete-brief').addEventListener('click',async()=>{
  const record=readLocal();if(!record)return;
  try{
   const response=await fetch('/api/income/briefs/'+record.id,{method:'DELETE',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({deletionToken:record.deletionToken})});
   if(!response.ok)throw Error(tr.deleteFailed);
   try{localStorage.removeItem(storageKey)}catch{}
   box.hidden=true;submitStatus.textContent=tr.deleted;
  }catch(error){submitStatus.textContent=error.message||tr.deleteFailed}
 });
}
