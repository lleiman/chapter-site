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
