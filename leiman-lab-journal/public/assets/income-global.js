const root=document.querySelector('#income-desk');
if(root){
 const en=root.dataset.lang==='en';
 const el=id=>root.querySelector('#'+id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const labels=en?{
  live:'LIVE IMPORT',directory:'OFFICIAL DIRECTORY',locked:'ACCESS REQUIRED',licensed:'LICENCE REQUIRED',
  other:'SOURCE',policy:'POLICY / REQUIREMENTS',open:'OPEN ORIGINAL ↗',docs:'REVIEW RULES ↗',
  ready:'official sources',none:'No sources match these filters.',error:'Source registry temporarily unavailable.',
  grantWait:'Querying official Grants.gov search…',grantEmpty:'No posted grant records returned for this topic. Try another keyword.',
  grantError:'Grants.gov search unavailable. No synthetic results have been added.',
  grantOpen:'VIEW OFFICIAL NOTICE ↗',grantDeadline:'DEADLINE',grantNotProvided:'NOT LISTED',grantAgency:'ISSUER',
  grantWarn:'ELIGIBILITY NOT VERIFIED · Check country, organisation status, registration, co-funding and full funding notice.',
  latest:'RETRIEVED',posted:'POSTED · EXTERNAL SOURCE'
 }:{
  live:'ЖИВОЙ ИМПОРТ',directory:'ОФИЦИАЛЬНЫЙ КАТАЛОГ',locked:'НУЖЕН ДОСТУП',licensed:'НУЖНА ЛИЦЕНЗИЯ',
  other:'ИСТОЧНИК',policy:'ПРАВИЛА / ОГРАНИЧЕНИЯ',open:'ОТКРЫТЬ ИСТОЧНИК ↗',docs:'ИЗУЧИТЬ УСЛОВИЯ ↗',
  ready:'официальных источников',none:'Для выбранных фильтров нет источников.',error:'Каталог источников временно недоступен.',
  grantWait:'Запрашиваем официальную базу Grants.gov…',grantEmpty:'По запросу не найдены опубликованные записи. Попробуйте другую тему.',
  grantError:'Источник Grants.gov недоступен. Вымышленные результаты не подставляются.',
  grantOpen:'ОТКРЫТЬ КОНКУРС ↗',grantDeadline:'СРОК',grantNotProvided:'НЕ УКАЗАН',grantAgency:'ОРГАНИЗАТОР',
  grantWarn:'ДОПУСК НЕ ПРОВЕРЕН · Проверяйте страну, статус организации, регистрацию, софинансирование и полные условия.',
  latest:'ЗАГРУЖЕНО',posted:'ОПУБЛИКОВАНО · ВНЕШНИЙ ИСТОЧНИК'
 };
 const access={live:labels.live,official_api:labels.directory,official_directory:labels.directory,
  api_key:labels.locked,licensed:labels.licensed};
 let sources=[];
 function sourceCard(s){
  const code=access[s.access]||labels.other,kind=(s.kind||'').toUpperCase();
  return `<article class="id-source-card">
   <div class="id-source-top"><span>${esc(s.region.toUpperCase())} / ${esc(kind)}</span><strong class="id-source-access${s.readiness==='live'?' is-live':''}">${esc(code)}</strong></div>
   <h3>${esc(s.name)}</h3><p>${esc(s[en?'en':'ru'])}</p>
   <div class="id-source-bottom"><a target="_blank" rel="noopener noreferrer" href="${esc(s.search)}">${labels.open}</a>
   <a target="_blank" rel="noopener noreferrer" href="${esc(s.policy)}">${labels.docs}</a></div></article>`;
 }
 function renderSources(){
  const region=el('id-source-region').value,kind=el('id-source-kind').value;
  const visible=sources.filter(s=>(region==='all'||s.region===region||(region==='global'&&s.region==='global'))&&(kind==='all'||s.kind===kind));
  el('id-source-status').textContent=visible.length+' / '+sources.length+' '+labels.ready;
  el('id-source-results').innerHTML=visible.length?visible.map(sourceCard).join(''):'<p>'+labels.none+'</p>';
 }
 const sourceFilter=e=>renderSources();
 el('id-source-region').addEventListener('change',sourceFilter);
 el('id-source-kind').addEventListener('change',sourceFilter);
 fetch('/api/income/sources',{headers:{Accept:'application/json'}}).then(async r=>{
  if(!r.ok)throw Error();const body=await r.json();
  if(!Array.isArray(body.sources))throw Error();
  sources=body.sources.filter(s=>['global','us','uk','eu','ca','au','sg','id'].includes(s.region));
  renderSources();
 }).catch(()=>{el('id-source-status').textContent=labels.error});
 const grantForm=el('id-grant-search'),grantList=el('id-grant-results'),status=el('id-grant-status');
 function renderGrant(g){
  return `<article class="id-grant-card"><div class="id-job-meta"><span>U.S. / GRANT / ${labels.posted}</span><span>${esc(g.reference)}</span></div>
  <h4>${esc(g.title)}</h4><div class="id-grant-detail"><div><small>${labels.grantAgency}</small><strong>${esc(g.issuer)}</strong></div>
  <div><small>${labels.grantDeadline}</small><strong>${esc(g.deadline||labels.grantNotProvided)}</strong></div></div>
  <p class="id-grant-warning">${labels.grantWarn}</p>
  <a href="${esc(g.sourceUrl)}" target="_blank" rel="noopener noreferrer">${labels.grantOpen}</a></article>`;
 }
 const ukForm=el('id-uk-search'),ukStatus=el('id-uk-status'),ukResults=el('id-uk-results');
 const ukText=en?{
   loading:'Reading the official UK tender feed…',empty:'No matching active tender-stage notices in the limited recent sample. Try a broader term or search the official portal.',
   error:'UK official API is unavailable. No synthetic results have been generated.',
   agency:'BUYER',deadline:'DEADLINE',notProvided:'NOT LISTED',open:'READ NOTICE ↗',
   sample:'RECENT-SAMPLE ONLY',eligibility:'BIDDER ELIGIBILITY UNVERIFIED. Verify nationality, registration, documents and live status.'
 }:{
   loading:'Читаем официальные данные о тендерах Великобритании…',
   empty:'В ограниченной выборке недавних уведомлений совпадений нет. Попробуйте другой термин или официальный портал.',
   error:'Британский API недоступен. Вымышленные тендеры не добавляются.',
   agency:'ЗАКАЗЧИК',deadline:'СРОК',notProvided:'НЕ УКАЗАН',open:'ОТКРЫТЬ УВЕДОМЛЕНИЕ ↗',
   sample:'НЕПОЛНАЯ ВЫБОРКА',eligibility:'ДОПУСК НЕ ПРОВЕРЕН. Уточняйте гражданство или юрисдикцию, регистрацию, документы и текущий статус.'
 };
 function ukCard(t){
  return `<article class="id-grant-card"><div class="id-job-meta"><span>UK / TENDER / ${esc(t.status)}</span><span>${esc(t.id)}</span></div>
   <h4>${esc(t.title)}</h4><p>${esc(t.excerpt||'')}</p>
   <div class="id-grant-detail"><div><small>${ukText.agency}</small><strong>${esc(t.issuer)}</strong></div>
   <div><small>${ukText.deadline}</small><strong>${esc(t.deadline||ukText.notProvided)}</strong></div></div>
   <p class="id-grant-warning">${ukText.eligibility}</p>
   <a href="${esc(t.sourceUrl)}" target="_blank" rel="noopener noreferrer">${ukText.open}</a></article>`;
 }
 ukForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!ukForm.reportValidity())return;
  const q=String(new FormData(ukForm).get('q')||'').trim(),button=ukForm.querySelector('button');
  ukStatus.textContent=ukText.loading;ukResults.replaceChildren();button.disabled=true;
  try{
   const r=await fetch('/api/income/uk-tenders?'+new URLSearchParams({q}),{headers:{Accept:'application/json'}});
   const data=await r.json();if(!r.ok)throw Error(data.error||ukText.error);
   ukStatus.textContent=data.results.length+' / '+data.inspectedNotices+' · '+ukText.sample+' · '+data.sourceStatus.toUpperCase();
   ukResults.innerHTML=data.results.length?data.results.map(ukCard).join(''):'<p>'+ukText.empty+'</p>';
  }catch(err){ukStatus.textContent=err.message||ukText.error}
  finally{button.disabled=false}
 });
 grantForm.addEventListener('submit',async event=>{
  event.preventDefault();if(!grantForm.reportValidity())return;
  const fd=new FormData(grantForm),q=String(fd.get('q')||'').trim();
  if(q.length<2){status.textContent=en?'Enter two or more letters.':'Введите хотя бы два символа.';return}
  const button=grantForm.querySelector('button[type=submit]');
  button.disabled=true;status.textContent=labels.grantWait;grantList.replaceChildren();
  try{
   const response=await fetch('/api/income/grants?'+new URLSearchParams({q}),{headers:{Accept:'application/json'}});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||labels.grantError);
   status.textContent=data.results.length+' '+labels.ready+' · '+data.sourceStatus.toUpperCase()+' · '+labels.latest+': '+data.retrievedAt.slice(0,10);
   grantList.innerHTML=data.results.length?data.results.map(renderGrant).join(''):'<p>'+labels.grantEmpty+'</p>';
  }catch(error){status.textContent=error.message||labels.grantError;grantList.replaceChildren()}
  finally{button.disabled=false}
 });
}
