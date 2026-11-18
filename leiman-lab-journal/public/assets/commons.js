/* Commons / pilot participation. No third-party analytics, wallets or injected scripts. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statuses = {design:'ПОДГОТОВКА',recruiting:'НАБОР',active:'В РАБОТЕ',completed:'ЗАВЕРШЕНА',open:'ОБСУЖДЕНИЕ',closed:'ЗАКРЫТО',accepted:'ПРИНЯТО',rejected:'ОТКЛОНЕНО',pending:'НА МОДЕРАЦИИ'};
  let data = null, member = null, admin = '', adminData = null;
  let token = '';
  try { token = sessionStorage.getItem('ll-commons-member-token') || ''; } catch {}
  const notice = s => { const el=$('cm-message');el.textContent=s;el.classList.add('cm-visible');setTimeout(()=>el.classList.remove('cm-visible'),7000); };
  async function request(url, method='GET', body, secret='') {
    const headers = {Accept:'application/json'};
    if (method!=='GET') headers['Content-Type']='application/json';
    if (secret) headers[secret===admin?'X-Admin-Password':'Authorization']=secret===admin?secret:'Bearer '+secret;
    const response=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'same-origin'});
    const json=await response.json();
    if(!response.ok)throw Error(json.error || 'Сервер вернул ошибку '+response.status);
    return json;
  }
  function progLabels() {
    return data.programs.map(p=>'<option value="'+escapeHtml(p.id)+'">'+escapeHtml(p.title)+'</option>').join('');
  }
  function render() {
    if(!data)return;
    $('cm-counter-members').textContent=String(data.members.length).padStart(2,'0');
    $('cm-counter-decisions').textContent=String(data.decisions.length).padStart(2,'0');
    $('cm-proposal-program').innerHTML=progLabels();
    $('cm-evidence-program').innerHTML=progLabels();
    const metrics=data.pilotMetrics;
    $('cm-metrics').innerHTML=[['АКТИВНЫЕ УЧАСТНИКИ',metrics.activeMembers],['ПУБЛИЧНЫЕ ИНИЦИАТИВЫ',metrics.publicProposals],['РЕШЕНИЯ',metrics.decisions],['ЗАРЕГИСТРИРОВАННЫЕ РЕЗУЛЬТАТЫ',metrics.documentedOutputs],['НЕЗАВИСИМЫЕ РЕПЛИКАЦИИ',metrics.independentReplications]].map(([label,count])=>'<div><b>'+count+'</b><span>'+label+'</span></div>').join('');
    $('cm-evidence').innerHTML=data.evidence.length?data.evidence.map(x=>'<article><span>'+escapeHtml(x.recorded.slice(0,10))+' / '+escapeHtml(x.kind)+'</span><a href="'+escapeHtml(x.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(x.title)+' ↗</a><small>'+escapeHtml(x.programId)+'</small></article>').join(''):'<p class="cm-empty">Проверяемых публичных результатов пока не зарегистрировано.</p>';
    $('cm-programs').innerHTML=data.programs.map((p,i)=>'<article class="cm-program"><div class="cm-program-top"><span>0'+(i+1)+' / '+escapeHtml(p.id.toUpperCase())+'</span><b>'+escapeHtml(statuses[p.status]||p.status)+'</b></div><h3>'+escapeHtml(p.title)+'</h3><p>'+escapeHtml(p.purpose)+'</p><ol>'+p.milestones.map(m=>'<li>'+escapeHtml(m)+'</li>').join('')+'</ol></article>').join('');
    $('cm-members').innerHTML=data.members.length?data.members.map(m=>'<div class="cm-member"><span>'+escapeHtml(m.name.charAt(0).toUpperCase())+'</span><div><strong>'+escapeHtml(m.name)+'</strong><small>'+escapeHtml(m.role.toUpperCase())+(m.bio?' / '+escapeHtml(m.bio):'')+'</small></div></div>').join(''):'<p class="cm-empty">Подтверждённые участники пока не зарегистрированы. Пилот находится на стадии подготовки.</p>';
    $('cm-proposals').innerHTML=data.proposals.length?data.proposals.map(p=>{
      const votes=p.votes, sum=votes.yes+votes.no+votes.abstain;
      const commentFields=(member && p.status==='open')?'<form class="cm-comment-form" data-proposal="'+escapeHtml(p.id)+'"><label>Комментарий <textarea name="text" rows="2" maxlength="2000" required placeholder="Аргумент, источник или методологическое замечание"></textarea></label><button type="submit">ОТПРАВИТЬ НА МОДЕРАЦИЮ ↗</button></form>':'';
      const voteButtons=(member && p.status==='open')?'<div class="cm-vote-controls"><button data-vote="yes" data-id="'+escapeHtml(p.id)+'">ПОДДЕРЖАТЬ</button><button data-vote="no" data-id="'+escapeHtml(p.id)+'">ПРОТИВ</button><button data-vote="abstain" data-id="'+escapeHtml(p.id)+'">ВОЗДЕРЖАТЬСЯ</button></div>':'';
      return '<article class="cm-proposal"><div class="cm-proposal-meta"><span>'+escapeHtml(p.program)+' / '+escapeHtml(p.created.slice(0,10))+'</span><b>'+escapeHtml(statuses[p.status]||p.status)+'</b></div><h4>'+escapeHtml(p.title)+'</h4><p>'+escapeHtml(p.summary)+'</p><small>Автор: '+escapeHtml(p.author)+'</small><div class="cm-tally"><span>ЗА <b>'+votes.yes+'</b></span><span>ПРОТИВ <b>'+votes.no+'</b></span><span>ВОЗДЕРЖАЛИСЬ <b>'+votes.abstain+'</b></span><span>УЧАСТИЕ <b>'+sum+'</b></span></div>'+voteButtons+(p.comments.length?'<div class="cm-comments">'+p.comments.map(c=>'<p><b>'+escapeHtml(c.author)+'</b> · '+escapeHtml(c.text)+'</p>').join('')+'</div>':'')+commentFields+'</article>';
    }).join(''):'<div class="cm-empty">Открытых предложений пока нет. После подтверждения первых участников здесь появятся обсуждения, голоса и решения.</div>';
    $('cm-decisions').innerHTML=data.decisions.length?data.decisions.slice().reverse().map(d=>'<article class="cm-decision"><small>'+escapeHtml(d.date.slice(0,10))+' / '+escapeHtml(d.governingBody)+'</small><h3>'+escapeHtml(d.title)+'</h3><p>'+escapeHtml(d.rationale)+'</p><p>Итог: '+escapeHtml(statuses[d.decision]||d.decision)+'. Участие: '+(d.advisoryTally.yes+d.advisoryTally.no+d.advisoryTally.abstain)+'. Кворум 3: '+(d.quorumMet?'достигнут':'не достигнут')+'.</p></article>').join(''):'<p class="cm-empty">Решений сообщества пока нет. Здесь будут опубликованы обоснование, дата и результаты обсуждения.</p>';
    $('cm-treasury').textContent=data.treasury.length?'Операции: '+data.treasury.length:'Нет заявленных финансовых операций Commons.';
    $('cm-member-tools').hidden=!member;
    $('cm-logout').hidden=!member;
    $('cm-login').hidden=!!member;
    $('cm-token').hidden=!!member;
    $('cm-identity').textContent=member?'Вход выполнен: '+member.name+' / '+member.role:'Ключ не требуется для просмотра материалов.';
  }
  async function refresh() { data=await request('/api/commons');render(); }
  async function login() {
    const candidate=$('cm-token').value.trim() || token;
    if(!candidate){ notice('Нужен выданный координатором ключ участника');return; }
    try {
      const r=await request('/api/commons/me','GET',undefined,candidate);
      token=candidate; member=r.member;
      try { sessionStorage.setItem('ll-commons-member-token',token); } catch {}
      $('cm-token').value=''; render(); notice('Кабинет открыт');
    }catch(e){member=null;notice(e.message);}
  }
  $('cm-login').addEventListener('click', login);
  $('cm-logout').addEventListener('click',()=>{
    token='';member=null;try{sessionStorage.removeItem('ll-commons-member-token')}catch{}render();
  });
  $('cm-proposal-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    try {const r=await request('/api/commons/proposals','POST',{program:f.get('program'),title:f.get('title'),summary:f.get('summary')},token);notice(r.message);e.target.reset();await refresh();}
    catch(err){notice(err.message);}
  });
  $('cm-proposals').addEventListener('click',async e=>{
    const b=e.target.closest('[data-vote]');if(!b)return;
    try {await request('/api/commons/votes','POST',{proposalId:b.dataset.id,choice:b.dataset.vote},token);await refresh();notice('Голос учтён. До завершения обсуждения его можно изменить.');}
    catch(err){notice(err.message);}
  });
  $('cm-proposals').addEventListener('submit',async e=>{
    const f=e.target.closest('.cm-comment-form');if(!f)return;
    e.preventDefault();
    try {await request('/api/commons/comments','POST',{proposalId:f.dataset.proposal,text:new FormData(f).get('text')},token);f.reset();notice('Комментарий направлен на модерацию');}
    catch(err){notice(err.message);}
  });
  $('cm-admin-load').addEventListener('click',async()=>{
    admin=$('cm-admin-pass').value;
    try {adminData=await request('/api/admin/commons','GET',undefined,admin); $('cm-admin-pass').value='';$('cm-admin-tools').hidden=false;renderAdmin();notice('Администрирование открыто');}
    catch(e){admin='';notice(e.message);}
  });
  function renderAdmin(){
    if(!adminData)return;
    $('cm-pending').innerHTML='<h4>Предложения</h4>'+(adminData.pending.length?adminData.pending.map(p=>'<div class="cm-review"><b>'+escapeHtml(p.title)+'</b><p>'+escapeHtml(p.summary)+'</p><button data-open="'+escapeHtml(p.id)+'">ОПУБЛИКОВАТЬ</button></div>').join(''):'<p>Нет ожидающих предложений.</p>')+
      '<h4>Комментарии</h4>'+(adminData.pendingComments.length?adminData.pendingComments.map(c=>'<div class="cm-review"><p>'+escapeHtml(c.text)+'</p><button data-approve="'+escapeHtml(c.id)+'">ОДОБРИТЬ</button><button data-reject="'+escapeHtml(c.id)+'">СКРЫТЬ</button></div>').join(''):'<p>Нет ожидающих комментариев.</p>')+
      '<h4>Завершение обсуждений</h4>'+data.proposals.filter(p=>p.status==='open').map(p=>'<div class="cm-review"><b>'+escapeHtml(p.title)+'</b><label>Обоснование <textarea data-rationale="'+escapeHtml(p.id)+'" rows="2" maxlength="2500"></textarea></label><button data-close="accepted" data-id="'+escapeHtml(p.id)+'">ПРИНЯТО</button><button data-close="rejected" data-id="'+escapeHtml(p.id)+'">ОТКЛОНИТЬ</button><button data-close="closed" data-id="'+escapeHtml(p.id)+'">ЗАКРЫТЬ БЕЗ РЕШЕНИЯ</button></div>').join('');
  }
  async function refreshAdmin() { adminData=await request('/api/admin/commons','GET',undefined,admin);await refresh();renderAdmin(); }
  $('cm-invite-form').addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.target);
    try {
      const r=await request('/api/admin/commons/members','POST',{name:f.get('name'),role:f.get('role'),displayPublic:f.has('displayPublic')},admin);
      $('cm-issued').textContent='Ключ (показывается один раз): '+r.token+'. Передайте участнику безопасным каналом. Не публикуйте.';
      e.target.reset();await refreshAdmin();notice('Участник добавлен');
    }catch(err){notice(err.message);}
  });
  $('cm-evidence-form').addEventListener('submit',async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    try {
      await request('/api/admin/commons/evidence','POST',{programId:f.get('programId'),kind:f.get('kind'),title:f.get('title'),url:f.get('url')},admin);
      e.target.reset();await refreshAdmin();notice('Результат зарегистрирован с публичной ссылкой');
    }catch(err){notice(err.message);}
  });
  $('cm-pending').addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    try {
      if(b.dataset.open)await request('/api/admin/commons/proposals','POST',{proposalId:b.dataset.open,status:'open'},admin);
      else if(b.dataset.approve || b.dataset.reject)await request('/api/admin/commons/comments','POST',{commentId:b.dataset.approve||b.dataset.reject,status:b.dataset.approve?'approved':'rejected'},admin);
      else if(b.dataset.close) {
        const el=document.querySelector('[data-rationale="'+b.dataset.id+'"]');
        await request('/api/admin/commons/proposals','POST',{proposalId:b.dataset.id,status:b.dataset.close,rationale:el.value},admin);
      }else return;
      await refreshAdmin();notice('Решение сохранено в журнале');
    } catch(err){notice(err.message);}
  });
  refresh().then(()=>{if(token)login();}).catch(e=>notice('Commons API недоступен: '+e.message));
})();