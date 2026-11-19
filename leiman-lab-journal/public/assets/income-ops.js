const ops=document.querySelector('#income-ops');
if(ops){
 let secret='';
 const $=id=>ops.querySelector('#'+id);
 const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const statuses=['unreviewed','qualified','contacted','proposal','contracted','delivered','paid','declined'];
 const money=(v,c)=>Number(v||0).toLocaleString('en-US',{style:'currency',currency:/^(USD|EUR|GBP|IDR|RUB)$/.test(c)?c:'USD',maximumFractionDigits:0});
 async function request(url,opts={}){
  const r=await fetch(url,{...opts,headers:{...opts.headers,'x-admin-password':secret,Accept:'application/json'}});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed ('+r.status+')');
  return data;
 }
 function renderBrief(b){
  const select=statuses.map(status=>'<option value="'+status+'"'+(b.status===status?' selected':'')+'>'+status.toUpperCase()+'</option>').join('');
  return `<article class="ops-item"><div class="ops-item-head"><span>${escape(b.id)}</span><span>${escape(b.createdAt?.slice(0,10))} · ${escape(b.status)}</span></div>
   <h3>${escape(b.title)}</h3><p>${escape(b.description)}</p><div class="ops-grid"><div><small>CLIENT</small><strong>${escape(b.name)}</strong><a href="mailto:${encodeURIComponent(b.email)}">${escape(b.email)}</a></div>
   <div><small>PROPOSED BUDGET</small><strong>${money(b.budget,b.currency)}</strong></div></div>
   <form class="ops-status-form" data-id="${escape(b.id)}"><label>STATUS<select name="status">${select}</select></label>
   <label>INTERNAL NOTE<textarea name="note" maxlength="600" rows="2">${escape(b.note||'')}</textarea></label>
   <div class="ops-grid"><label>ACTUAL PAYMENT RECEIVED<input name="amountReceived" type="number" min="0" max="10000000" value="${Number(b.amountReceived||0)}"></label>
   <label>REPORTED DIRECT COSTS<input name="directCosts" type="number" min="0" max="10000000" value="${Number(b.directCosts||0)}"></label></div>
   <button type="submit">SAVE OPERATOR RECORD →</button></form></article>`;
 }
 function renderCV(c){
  return `<article class="ops-item"><div class="ops-item-head"><span>${escape(c.id)}</span><span>${escape(c.createdAt?.slice(0,10))}</span></div>
   <h3>${escape(c.name)} · ${escape(c.profession)}</h3><p>${escape(c.cv?.slice(0,1600)||'')}</p>
   <div class="ops-grid"><div><small>CONTACT</small><a href="mailto:${encodeURIComponent(c.email)}">${escape(c.email)}</a></div>
   <div><small>LOCATION / WORK MODE</small><strong>${escape(c.location)} / ${escape(c.workMode)}</strong></div></div>
   <p><small>OPTIONAL CONTACT PERMISSION: ${c.contactOptIn?'YES':'NO'}. Do not contact unless permitted.</small></p></article>`;
 }
 async function refresh(){
  const [clients,applicants]=await Promise.all([request('/api/admin/income/briefs'),request('/api/admin/opportunities/submissions')]);
  const briefs=clients.briefs||[],cvs=applicants.submissions||[];
  $('ops-content').hidden=false;$('ops-auth').hidden=true;
  $('ops-briefs').innerHTML=briefs.map(renderBrief).join('')||'<p>No briefs currently awaiting review.</p>';
  $('ops-cvs').innerHTML=cvs.map(renderCV).join('')||'<p>No profiles currently submitted.</p>';
  $('ops-brief-count').textContent=String(briefs.length);
  $('ops-cv-count').textContent=String(cvs.length);
  const counts=statuses.map(s=>({status:s,n:briefs.filter(b=>b.status===s).length}));
  const paid=briefs.filter(b=>b.status==='paid');
  const revenue=paid.reduce((n,b)=>n+Number(b.amountReceived||0),0);
  const costs=paid.reduce((n,b)=>n+Number(b.directCosts||0),0);
  $('ops-metrics').innerHTML=`<article><span>BRIEFS</span><strong>${briefs.length}</strong></article><article><span>ACTIVE (NOT DECLINED)</span><strong>${briefs.filter(b=>!['declined','paid'].includes(b.status)).length}</strong></article>
   <article><span>PAID / SELF-REPORTED</span><strong>${paid.length}</strong></article><article><span>REPORTED NET / UNVERIFIED</span><strong>${(revenue-costs).toLocaleString('en-US')}*</strong></article>`+
   '<p class="ops-small">* Monetary figures can use different currencies. The combined total is not FX-adjusted and must not be interpreted as a financial report. Status counts: '+counts.map(x=>x.status+' '+x.n).join(' · ')+'</p>';
 }
 $('ops-login').addEventListener('submit',async e=>{
  e.preventDefault();secret=new FormData(e.target).get('password')||'';
  e.target.reset();$('ops-message').textContent='Checking credentials…';
  try{await refresh();$('ops-message').textContent='';}catch(error){secret='';$('ops-message').textContent=error.message}
 });
 $('ops-refresh').addEventListener('click',async()=>{try{await refresh()}catch(e){alert(e.message)}});
 $('ops-lock').addEventListener('click',()=>{secret='';$('ops-content').hidden=true;$('ops-auth').hidden=false;$('ops-message').textContent='Locked.'});
 $('ops-briefs').addEventListener('submit',async e=>{
  const form=e.target.closest('.ops-status-form');if(!form)return;
  e.preventDefault();const body=Object.fromEntries(new FormData(form));
  body.amountReceived=Number(body.amountReceived)||0;body.directCosts=Number(body.directCosts)||0;
  const button=form.querySelector('button');button.disabled=true;
  try{await request('/api/admin/income/briefs/'+form.dataset.id,{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});await refresh();}
  catch(error){alert(error.message)}finally{button.disabled=false}
 });
}
