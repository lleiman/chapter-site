const globalRoot=document.querySelector('#income-desk');
if(globalRoot){
 const en=globalRoot.dataset.lang==='en',el=id=>globalRoot.querySelector('#'+id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const t=en?{live:'LIVE IMPORT',directory:'OFFICIAL DIRECTORY',locked:'ACCESS REQUIRED',licensed:'LICENCE REQUIRED',
  open:'OPEN ORIGINAL ↗',rules:'REVIEW REQUIREMENTS ↗',sources:'official sources',none:'No matching sources.',
  loading:'Checking official UK contracts with stated monetary values…',
  empty:'No active contracts with published values in the recent provider sample. Broaden the term or consult the original portal.',
  unavailable:'UK public procurement API unavailable. No synthetic contracts have been added.',
  value:'PUBLISHED CONTRACT VALUE',buyer:'BUYER',deadline:'DEADLINE',action:'READ OFFICIAL TENDER ↗',
  status:'Officially published contract value is not a guaranteed payment or confirmed bidder eligibility.'
 }:{live:'ЖИВОЙ ИМПОРТ',directory:'ОФИЦИАЛЬНЫЙ КАТАЛОГ',locked:'НУЖЕН ДОСТУП',licensed:'НУЖНА ЛИЦЕНЗИЯ',
  open:'ОТКРЫТЬ ИСТОЧНИК ↗',rules:'ПРОВЕРИТЬ ПРАВИЛА ↗',sources:'официальных источников',none:'Нет совпадений.',
  loading:'Проверяем официальные британские тендеры с заявленными суммами…',
  empty:'В выборке нет действующих тендеров с опубликованной стоимостью. Расширьте запрос или откройте первоисточник.',
  unavailable:'API британских закупок недоступен. Вымышленные контракты не добавляются.',
  value:'ОПУБЛИКОВАННАЯ СТОИМОСТЬ',buyer:'ЗАКАЗЧИК',deadline:'СРОК',action:'ОТКРЫТЬ ТЕНДЕР ↗',
  status:'Опубликованная стоимость контракта не означает гарантированную выплату или право участвовать.'
 };
 const status=el('id-source-status'),list=el('id-source-results'),region=el('id-source-region'),kind=el('id-source-kind');
 let sources=[];
 const sourcesView=()=>{
  const visible=sources.filter(x=>(region.value==='all'||x.region===region.value)&&(kind.value==='all'||x.kind===kind.value));
  status.textContent=visible.length+' / '+sources.length+' '+t.sources;
  list.innerHTML=visible.length?visible.map(x=>{
   const access={live:t.live,official_api:t.directory,official_directory:t.directory,api_key:t.locked,licensed:t.licensed};
   return '<article class="id-source-card"><div class="id-source-top"><span>'+esc(x.region.toUpperCase())+' / '+esc(x.kind.toUpperCase())+
    '</span><strong class="id-source-access">'+esc(access[x.access]||t.directory)+'</strong></div><h3>'+esc(x.name)+
    '</h3><p>'+esc(x[en?'en':'ru'])+'</p><div class="id-source-bottom"><a target="_blank" rel="noopener noreferrer" href="'+esc(x.search)+'">'+t.open+
    '</a><a target="_blank" rel="noopener noreferrer" href="'+esc(x.policy)+'">'+t.rules+'</a></div></article>';
  }).join(''):'<p class="id-legal">'+t.none+'</p>';
 };
 region.addEventListener('change',sourcesView);kind.addEventListener('change',sourcesView);
 fetch('/api/income/sources',{headers:{Accept:'application/json'}}).then(async r=>{
  if(!r.ok)throw Error();const data=await r.json();sources=Array.isArray(data.sources)?data.sources:[];sourcesView();
 }).catch(()=>{status.textContent=en?'Official directory unavailable.':'Каталог временно недоступен.'});
 const form=el('id-uk-search'),statusEl=el('id-uk-status'),items=el('id-uk-results');
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const query=String(new FormData(form).get('q')||'').trim(),button=form.querySelector('button');
  statusEl.textContent=t.loading;items.replaceChildren();button.disabled=true;
  try{
   const r=await fetch('/api/income/uk-tenders?'+new URLSearchParams({q:query}),{headers:{Accept:'application/json'}});
   const data=await r.json();if(!r.ok)throw Error(data.error||t.unavailable);
   const matching=(data.results||[]).filter(v=>v.status==='active'&&Number.isFinite(v.value)&&v.value>0&&v.currency==='GBP');
   statusEl.textContent=matching.length+' / '+Number(data.inspectedNotices||0)+' '+(en?'recent notices':'недавних объявлений');
   items.innerHTML=matching.length?matching.map(v=>
    '<article class="id-grant-card"><div class="id-job-meta"><span>UK / PUBLIC CONTRACT</span><span>'+esc(v.deadline||'')+'</span></div>'+
    '<h4>'+esc(v.title)+'</h4><div class="id-grant-detail"><div><small>'+t.buyer+'</small><strong>'+esc(v.issuer)+'</strong></div>'+
    '<div><small>'+t.value+'</small><strong>£'+Number(v.value).toLocaleString(en?'en-GB':'ru-RU')+'</strong></div></div>'+
    '<p class="id-grant-warning">'+t.status+'</p><a href="'+esc(v.sourceUrl)+'" target="_blank" rel="noopener noreferrer">'+t.action+'</a></article>'
   ).join(''):'<p class="id-legal">'+t.empty+'</p>';
  }catch(err){statusEl.textContent=err.message||t.unavailable}finally{button.disabled=false}
 });
}
