const node=document.querySelector('#income-desk');
if(node){
 const en=node.dataset.lang==='en';
 const $=id=>node.querySelector('#'+id);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels=en?{unknown:'NEEDS SOURCE REVIEW',excluded:'GEOGRAPHIC RESTRICTION',search:'Search indexed records…',
  empty:'No matching indexed records yet. Try a provider search above to populate this index.',
  source:'ORIGINAL SOURCE ↗',assess:'ASSESS →',checking:'Checking explicit eligibility rules…',
  matched:'MATCHED TERMS',missing:'MISSING EVIDENCE',requirements:'REQUIREMENTS',notProvided:'NOT GIVEN',
  limited:'Provider-reported data, not independently verified.',total:'INDEXED RECORDS',select:'Select an opportunity to assess',
  error:'Index temporarily unavailable',assessError:'Eligibility service unavailable.'
 }:{unknown:'ТРЕБУЕТ ПРОВЕРКИ',excluded:'ГЕОГРАФИЧЕСКОЕ ОГРАНИЧЕНИЕ',search:'Читаем индекс…',
  empty:'В индексе пока нет совпадений. Поищите в лентах выше, чтобы пополнить данные.',
  source:'ПЕРВОИСТОЧНИК ↗',assess:'ПРОВЕРИТЬ →',checking:'Проверяем формальные ограничения…',
  matched:'СОВПАВШИЕ ТЕРМИНЫ',missing:'НЕДОСТАЁТ ДАННЫХ',requirements:'ТРЕБОВАНИЯ',notProvided:'НЕ УКАЗАНО',
  limited:'Сообщение источника, независимая проверка не проводилась.',total:'ЗАПИСЕЙ В ИНДЕКСЕ',select:'Выберите возможность для проверки',
  error:'Индекс временно недоступен',assessError:'Проверка допуска временно недоступна.'
 };
 const indexForm=$('id-v2-form'),assessForm=$('id-v2-assess'),container=$('id-v2-results');
 let rows=[];
 const rowsText=items=>items.map(x=>`<article class="id-v2-card">
 <div class="id-v2-card-top"><span>${escape(x.type.toUpperCase())} · ${escape(x.source)}</span><span>${escape(x.deadline||labels.notProvided)}</span></div>
 <h3>${escape(x.title)}</h3><p>${escape(x.issuer)} · ${escape(x.excerpt)}</p>
 <div class="id-v2-card-footer"><a href="${escape(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">${labels.source}</a>
 <button type="button" data-assess-id="${escape(x.id)}">${labels.assess}</button></div></article>`).join('');
 async function load(){
  const query=new URLSearchParams(new FormData(indexForm));
  $('id-v2-count').textContent=labels.search;container.replaceChildren();
  try{
   const res=await fetch('/api/income/index?'+query.toString(),{headers:{Accept:'application/json'}});
   const data=await res.json();if(!res.ok)throw Error(data.error||labels.error);
   rows=data.records||[];
   $('id-v2-count').textContent=data.count+' / '+data.stats.total+' '+labels.total;
   $('id-v2-summary').textContent=`${data.stats.total} ${labels.total} · ${Object.entries(data.stats.byType).filter(([,v])=>v).map(([k,v])=>k+': '+v).join(' · ')}`;
   container.innerHTML=rows.length?rowsText(rows):'<p class="id-legal">'+labels.empty+'</p>';
  }catch(err){$('id-v2-count').textContent=err.message||labels.error}
 }
 indexForm.addEventListener('submit',e=>{e.preventDefault();load()});
 container.addEventListener('click',e=>{
  const button=e.target.closest('[data-assess-id]');if(!button)return;
  assessForm.elements.id.value=button.dataset.assessId;
  const item=rows.find(x=>x.id===button.dataset.assessId);
  $('id-v2-assess-result').textContent=(item?.title||'')+' · '+labels.select;
  $('id-v2-assess-result').scrollIntoView({block:'nearest',behavior:'smooth'});
 });
 assessForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const profile=Object.fromEntries(new FormData(assessForm).entries());
  const id=profile.id;delete profile.id;
  if(!id){$('id-v2-assess-result').textContent=labels.select;return}
  $('id-v2-assess-result').textContent=labels.checking;
  try{
   const r=await fetch('/api/income/assess',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id,profile})});
   const data=await r.json();if(!r.ok)throw Error(data.error||labels.assessError);
   const eligibility=data.eligibility;
   const key=eligibility.status==='ineligible'?labels.excluded:labels.unknown;
   const safeList=(arr)=>arr.length?'<ul>'+arr.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul>':'<p>—</p>';
   $('id-v2-assess-result').innerHTML=`<div class="id-v2-verdict">${escape(key)}</div>
    <h4>${escape(data.opportunity.title)}</h4>
    <h5>${labels.requirements}</h5>${safeList(eligibility.requirements)}
    <h5>${labels.missing}</h5>${safeList([...eligibility.reasons,...eligibility.missingEvidence])}
    <h5>${labels.matched}</h5><p>${escape(data.capabilityFit.matched.join(', ')||'—')}</p>
    <p class="id-legal">${escape(data.warning)}</p>`;
  }catch(err){$('id-v2-assess-result').textContent=err.message||labels.assessError}
 });
 load();
}
