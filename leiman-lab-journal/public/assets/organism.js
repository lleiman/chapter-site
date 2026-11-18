(function initOrganism() {
  'use strict';
  const root = document.getElementById('income-organism');
  if (!root) return;
  const en = root.dataset.lang === 'en';
  const svg = root.querySelector('#organism-map');
  const stageButtons = Array.from(root.querySelectorAll('.org-stage'));
  const scenarioSelect = root.querySelector('#org-scenario');
  const playButton = root.querySelector('#org-play');
  const nextButton = root.querySelector('#org-next');
  const resetButton = root.querySelector('#org-reset');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stageNames = en
    ? ['SENSE', 'VERIFY', 'SECURE', 'PLAN', 'ASSEMBLE', 'EXECUTE', 'SETTLE', 'LEARN']
    : ['ПОИСК', 'ПРОВЕРКА', 'РЕЗЕРВ', 'ПЛАН', 'КОМАНДА', 'РАБОТА', 'РАСЧЁТ', 'ОБУЧЕНИЕ'];
  const scenarios = [
    {amount:12000, type:'FILM / CREATIVE', ruType:'КИНО / КРЕАТИВ', tasks:['DIRECTION','EDITING','LEGAL','QA'], ruTasks:['РЕЖИССУРА','МОНТАЖ','ПРАВО','ОТК'], humans:3, agents:2},
    {amount:8000, type:'RESEARCH / UX', ruType:'ИССЛЕДОВАНИЕ / UX', tasks:['RESEARCH','INTERVIEW','ANALYSIS','QA'], ruTasks:['ПОИСК','ИНТЕРВЬЮ','АНАЛИЗ','ОТК'], humans:2, agents:2},
    {amount:5500, type:'SOFTWARE / CODE', ruType:'ПО / РАЗРАБОТКА', tasks:['CODE','TESTING','SECURITY','REVIEW'], ruTasks:['КОД','ТЕСТЫ','ЗАЩИТА','РЕВЬЮ'], humans:2, agents:3}
  ];
  const descriptions = en ? [
    {title:'Detect market demand',desc:'The sensing network identifies an unfilled request from a relevant opportunity source.',action:'Capture the original link, issuer, deliverable, deadline and apparent budget.',gate:'This is a hypothetical event. A discovered listing is neither owned nor reserved.',trace:'Illustrative market signal detected'},
    {title:'Underwrite the opportunity',desc:'The curator evaluates whether the opportunity is genuine, relevant and commercially viable.',action:'Verify the issuer, eligibility, permitted use of data, funding and delivery economics.',gate:'No contract or proposal without source and eligibility verification.',trace:'Eligibility and source verification simulated'},
    {title:'Secure an authorised hold',desc:'A buyer-approved reservation or agreement can make an opportunity actionable for the network.',action:'Request explicit exclusivity, a paid discovery mandate or escrow-backed work order.',gate:'Public bookmarking does not create a right to freeze a bounty.',trace:'Hypothetical issuer-approved reservation simulated'},
    {title:'Decompose into capabilities',desc:'The curator converts the brief into a transparent graph of deliverables and required specialists.',action:'Break down milestones, acceptance criteria, dependencies and cost ceilings.',gate:'A human must approve binding scope, budget and legal commitments.',trace:'Milestones and capability graph generated'},
    {title:'Assemble the right team',desc:'Human expertise and bounded AI agents are matched to the task requirements.',action:'Compare skill evidence, capacity, availability, price and permissions.',gate:'Never share CVs or credentials with third parties without permission.',trace:'Hypothetical human and AI matches assembled'},
    {title:'Execute with quality gates',desc:'The team delivers against checkpoints. AI tools assist within narrow, reviewable permissions.',action:'Review outputs, preserve audit records and obtain milestone acceptance.',gate:'Sensitive decisions and external actions require responsible human approval.',trace:'Illustrative deliverables passed quality review'},
    {title:'Settle contractual value',desc:'Payments are allocated only after the agreed acceptance conditions are met.',action:'Distribute payments for human labour, tools and the curator’s disclosed gross margin.',gate:'Equity is never automatic. It requires a separately negotiated legal agreement.',trace:'Hypothetical payment allocation calculated; no transfer made'},
    {title:'Learn from the outcome',desc:'Real completed work would improve source reliability, talent matching and cost forecasts.',action:'Compare expected versus actual time, quality, margin, disputes and satisfaction.',gate:'Only verified outcomes should update reputations or predictive claims.',trace:'Simulation completed; feedback returned to the sensing network'}
  ] : [
    {title:'Найти реальный спрос',desc:'Сенсорная сеть обнаруживает запрос, который потенциально соответствует компетенциям участников.',action:'Сохранить первоисточник, заказчика, результат, срок и предполагаемый бюджет.',gate:'Событие условное. Найденное объявление нельзя присвоить или зарезервировать самостоятельно.',trace:'Условный рыночный сигнал обнаружен'},
    {title:'Проверить экономику',desc:'Куратор проверяет достоверность предложения, формальные условия и финансовый смысл.',action:'Проверить заказчика, допуск, правила использования данных, бюджет и себестоимость.',gate:'Без проверки источника и допуска нельзя обещать исполнение.',trace:'Условная проверка источника и допуска выполнена'},
    {title:'Согласовать резервирование',desc:'Только разрешение заказчика даёт право временно закрепить возможность за командой.',action:'Запросить эксклюзивный период, оплачиваемый этап подготовки или обеспеченный договор.',gate:'Простое добавление публичного задания в избранное не даёт эксклюзивных прав.',trace:'Условное согласие заказчика на резервирование показано'},
    {title:'Разобрать задачу',desc:'Куратор разбивает заказ на результат, этапы, требования и необходимые специальности.',action:'Задать этапы, критерии приёмки, зависимости и предел расходов.',gate:'Обязывающие решения о договоре и бюджете утверждает человек.',trace:'Смоделирована декомпозиция на задачи'},
    {title:'Собрать исполнителей',desc:'Система сопоставляет навыки людей и ИИ-агентов с требованиями заказа.',action:'Проверить доказанный опыт, доступность, стоимость и разрешения.',gate:'Нельзя передавать CV и ключи сторонним лицам без согласия.',trace:'Подобрана условная команда из людей и ИИ'},
    {title:'Выполнить работу',desc:'Команда готовит результат с промежуточными проверками и ограниченными полномочиями ИИ.',action:'Проверять материалы, вести журнал решений, согласовывать этапы с заказчиком.',gate:'Чувствительные действия и публикации требуют контроля ответственного человека.',trace:'Условная работа прошла проверку качества'},
    {title:'Распределить оплату',desc:'Вознаграждение распределяется только после выполнения согласованных условий приёмки.',action:'Рассчитать оплату исполнителей, инструментов и валовую маржу куратора.',gate:'Доля в бизнесе возникает только по отдельному договору, автоматически она не начисляется.',trace:'Рассчитано условное распределение, переводы не производились'},
    {title:'Обновить знания',desc:'Проверенный опыт в будущем улучшит оценку источников, компетенций и экономики.',action:'Сопоставить план и фактические сроки, качество, расходы, жалобы и прибыль.',gate:'Рейтинги и прогнозы могут обновляться только подтверждёнными данными.',trace:'Симуляция завершена, опыт возвращён в систему'}
  ];
  const statusStrings = en
    ? ['DETECTED','CHECKING','HOLD / SIMULATED','PLANNING','MATCHING','IN REVIEW','MODELLED','FEEDBACK']
    : ['НАЙДЕНО','ПРОВЕРКА','УСЛОВНЫЙ РЕЗЕРВ','ПЛАН','ПОДБОР','ПРИЁМКА','МОДЕЛЬ','ОБРАТНАЯ СВЯЗЬ'];
  const locale = en ? 'en-US' : 'ru-RU';
  const money = value => '$' + value.toLocaleString(locale, {maximumFractionDigits:0});
  const get = id => root.querySelector('#' + id);
  let active = 0;
  let scenario = 0;
  let playing = false;
  let interval = null;
  let animateId = null;
  let startTime = performance.now();
  const cx = 450, cy = 395, outer = 308;
  const pos = (angle, radius) => ({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  const angleFor = i => (-90 + 45 * i) * Math.PI / 180;
  const round = n => Number(n.toFixed(2));
  const esc = value => String(value).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[m]));
  const xy = p => round(p.x) + ',' + round(p.y);
  const points = Array.from({length:76}, (_,i) => {
    const v = Math.sin(i * 41.37) * 43758.5453;
    const u = Math.sin((i + 98) * 21.135) * 37119.155;
    const frac = x => x - Math.floor(x);
    return {angle:frac(v)*2*Math.PI, radius:166 + Math.sqrt(frac(u))*166, size:1.4+frac(v*1.37)*1.7};
  });
  function arcPath(r,a0,a1) {
    const p0=pos(a0,r),p1=pos(a1,r);
    return 'M ' + xy(p0) + ' A ' + r + ' ' + r + ' 0 0 1 ' + xy(p1);
  }
  function sectorPath(centerAngle,inner,outerRadius) {
    const half=22.5*Math.PI/180;
    const a0=centerAngle-half,a1=centerAngle+half;
    const i0=pos(a0,inner),o0=pos(a0,outerRadius),o1=pos(a1,outerRadius),i1=pos(a1,inner);
    return 'M '+xy(i0)+' L '+xy(o0)+' A '+outerRadius+' '+outerRadius+' 0 0 1 '+xy(o1)+' L '+xy(i1)+' A '+inner+' '+inner+' 0 0 0 '+xy(i0)+' Z';
  }
  function buildMap() {
    const angle = angleFor(active), current = pos(angle,outer), next = pos(angleFor((active+1)%8),outer);
    const c = scenarios[scenario];
    let parts=[];
    parts.push('<defs><marker id="org-map-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="#b83b33"/></marker><linearGradient id="org-map-wash" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b83b33" stop-opacity=".18"/><stop offset="100%" stop-color="#b83b33" stop-opacity="0"/></linearGradient></defs>');
    parts.push('<rect x="0" y="0" width="900" height="790" fill="transparent"/>');
    for(let i=0;i<8;i++){
      const a=angleFor(i)-Math.PI/8;
      const outerp=pos(a,350),innerp=pos(a,107);
      parts.push('<line class="org-spoke" x1="'+round(innerp.x)+'" y1="'+round(innerp.y)+'" x2="'+round(outerp.x)+'" y2="'+round(outerp.y)+'"/>');
    }
    parts.push('<path d="'+sectorPath(angle,107,344)+'" fill="url(#org-map-wash)"/>');
    for(const r of [110,172,240,308,346]){
      parts.push('<circle class="org-rings" cx="'+cx+'" cy="'+cy+'" r="'+r+'"/>');
    }
    parts.push('<circle class="org-dashed" cx="'+cx+'" cy="'+cy+'" r="275"/>');
    for(let i=0;i<points.length;i++){
      const p=pos(points[i].angle,points[i].radius);
      const hot = active===0 && i%11===0;
      parts.push('<circle class="'+(hot?'org-signal':'org-ambient-dot')+'" cx="'+round(p.x)+'" cy="'+round(p.y)+'" r="'+round(points[i].size)+'" opacity="'+(hot?'.85':'.45')+'"/>');
    }
    if(active>=3){
      const taskAngles=[-155,-25,25,155];
      const tasks=en?c.tasks:c.ruTasks;
      for(let i=0;i<4;i++){
        const a=taskAngles[i]*Math.PI/180,p=pos(a,193),anch=p.x>cx?'start':'end';
        const dx=anch==='start'?12:-12;
        parts.push('<circle class="org-capability-dot" cx="'+round(p.x)+'" cy="'+round(p.y)+'" r="5"/>');
        parts.push('<text class="org-cap-label" x="'+round(p.x+dx)+'" y="'+round(p.y-11)+'" text-anchor="'+anch+'">'+esc(tasks[i])+'</text>');
      }
    }
    if(active>=4){
      const humans=[pos(-.34,270),pos(-.13,270),pos(.07,270)];
      const agents=[pos(.44,260),pos(.63,260),pos(.82,260)];
      for(let i=0;i<c.humans;i++){
        const p=humans[i],f=pos(-25*Math.PI/180,193);
        parts.push('<path d="M'+xy(f)+' Q'+xy(pos(-.23,220))+' '+xy(p)+'" class="org-active-track" stroke-width="1" opacity=".65"/>');
        parts.push('<circle class="org-signal" cx="'+round(p.x)+'" cy="'+round(p.y)+'" r="5.5"/>');
      }
      for(let i=0;i<c.agents;i++){
        const p=agents[i],f=pos(25*Math.PI/180,193);
        parts.push('<path d="M'+xy(f)+' Q'+xy(pos(.50,218))+' '+xy(p)+'" class="org-active-track" stroke-width="1" opacity=".65"/>');
        parts.push('<circle class="org-signal" cx="'+round(p.x)+'" cy="'+round(p.y)+'" r="4.5"/>');
      }
      parts.push('<text class="org-micro" x="736" y="265">'+esc(en?'HUMAN EXPERTS':'СПЕЦИАЛИСТЫ')+'</text>');
      parts.push('<text class="org-micro" x="729" y="585">'+esc(en?'AI AGENTS':'ИИ-АГЕНТЫ')+'</text>');
    }
    if(active===2){
      parts.push('<rect x="323" y="496" width="254" height="28" rx="2" fill="#f2ddd7" stroke="#b83b33"/>');
      parts.push('<text x="450" y="514" font-size="11" text-anchor="middle" fill="#8b322c" font-family="Arial">'+esc(en?'HOLD REQUIRES ISSUER CONSENT':'РЕЗЕРВ ТОЛЬКО ПО СОГЛАСИЮ')+'</text>');
    }
    if(active>=5){
      parts.push('<path d="'+arcPath(225,Math.PI*.20,Math.PI*.86)+'" class="org-active-track" opacity=".68" marker-end="url(#org-map-arrow)"/>');
    }
    if(active===6){
      const p=pos(angleFor(6),260);
      parts.push('<rect x="'+round(p.x-43)+'" y="'+round(p.y+38)+'" width="86" height="24" fill="#f3ddd6" stroke="#b83b33" rx="2"/>');
      parts.push('<text x="'+round(p.x)+'" y="'+round(p.y+54)+'" text-anchor="middle" font-family="Arial" font-size="10" fill="#a03931">'+(en?'VALUE':'ОПЛАТА')+'</text>');
    }
    if(active===7){
      parts.push('<path d="'+arcPath(328,3.85,4.65)+'" class="org-active-track" stroke-dasharray="3 6" marker-end="url(#org-map-arrow)"/>');
    }
    parts.push('<circle class="org-center-glow" cx="'+cx+'" cy="'+cy+'" r="114"/>');
    parts.push('<circle class="org-center-outline" cx="'+cx+'" cy="'+cy+'" r="98"/>');
    parts.push('<circle class="org-rings" cx="'+cx+'" cy="'+cy+'" r="81"/>');
    parts.push('<text class="org-center-sub" x="'+cx+'" y="362" text-anchor="middle">'+esc(en?'CENTRAL INTELLIGENCE':'ЦЕНТР УПРАВЛЕНИЯ')+'</text>');
    parts.push('<text class="org-center-heading" x="'+cx+'" y="396" text-anchor="middle">FINANCE</text>');
    parts.push('<text class="org-center-heading" x="'+cx+'" y="423" text-anchor="middle">CURATOR</text>');
    parts.push('<text class="org-center-sub" x="'+cx+'" y="446" text-anchor="middle">INCOME INTELLIGENCE</text>');
    parts.push('<path d="M'+xy(current)+' Q'+xy(pos(angle,155))+' '+cx+','+cy+'" class="org-active-track" stroke-width="2" opacity=".65" marker-end="url(#org-map-arrow)"/>');
    for(let i=0;i<8;i++){
      const a=angleFor(i),p=pos(a,outer),label=pos(a,378),align=Math.cos(a)>.24?'start':Math.cos(a)<-.24?'end':'middle',idx=String(i+1).padStart(2,'0');
      const cls='org-stage-spot'+(i===active?' is-active':i<active?' is-complete':'');
      parts.push('<g class="'+cls+'" data-map-stage="'+i+'" role="button" tabindex="0" aria-label="'+esc(stageNames[i])+'" aria-pressed="'+(i===active?'true':'false')+'"><title>'+idx+' / '+esc(stageNames[i])+'</title>');
      if(i===active)parts.push('<circle class="org-pulse" cx="'+round(p.x)+'" cy="'+round(p.y)+'" r="18" opacity=".5"/>');
      parts.push('<circle class="org-step-ring" cx="'+round(p.x)+'" cy="'+round(p.y)+'" r="10"/>');
      parts.push('<text class="org-label" x="'+round(label.x)+'" y="'+round(label.y+4)+'" text-anchor="'+align+'">'+esc(stageNames[i])+'</text></g>');
    }
    parts.push('<circle class="org-particle" id="org-flying-particle" cx="'+round(current.x)+'" cy="'+round(current.y)+'" r="5.5"/>');
    parts.push('<text class="org-micro" x="19" y="762">'+esc(en?c.type:c.ruType)+'</text>');
    parts.push('<text class="org-micro" x="880" y="762" text-anchor="end">0'+(active+1)+' / 08</text>');
    svg.innerHTML=parts.join('');
    svg.querySelectorAll('[data-map-stage]').forEach(node=>{
      const choose=()=>{stopAuto();setStage(Number(node.dataset.mapStage))};
      node.addEventListener('click',choose);
      node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}});
    });
    startTime=performance.now();
    return {current,next};
  }
  let geometry = null;
  function render(){
    const detail=descriptions[active], sample=scenarios[scenario];
    stageButtons.forEach((button,i)=>{
      const focused=i===active;
      button.classList.toggle('is-active',focused);
      button.classList.toggle('is-complete',i<active);
      button.setAttribute('aria-pressed',String(focused));
    });
    get('org-step-counter').textContent=String(active+1).padStart(2,'0')+' / 08';
    get('org-step-title').textContent=stageNames[active];
    get('org-step-status').textContent=statusStrings[active];
    get('org-step-description').textContent=detail.desc;
    get('org-step-action').textContent=detail.action;
    get('org-step-gate').textContent=detail.gate;
    get('org-contract-value').textContent=money(sample.amount);
    get('org-delivery').textContent=money(sample.amount*.75);
    get('org-review').textContent=money(sample.amount*.10);
    get('org-margin').textContent=money(sample.amount*.15);
    get('org-trace-count').textContent=String(active+1).padStart(2,'0');
    const trace=get('org-trace');
    trace.replaceChildren();
    descriptions.slice(0,active+1).forEach((entry,i)=>{
      const item=document.createElement('li');
      item.textContent=String(i+1).padStart(2,'0')+' / '+entry.trace;
      trace.appendChild(item);
    });
    const liveMsg=String(active+1).padStart(2,'0')+' / 08 · '+detail.title;
    get('org-map-state').textContent=liveMsg;
    get('org-live').textContent=liveMsg;
    geometry=buildMap();
  }
  function setStage(n){
    active=(n+8)%8;
    render();
  }
  function stopAuto(){
    playing=false;
    if(interval!==null){clearInterval(interval);interval=null}
    playButton.textContent=en?'PLAY SIMULATION ▷':'ЗАПУСТИТЬ СИМУЛЯЦИЮ ▷';
    playButton.setAttribute('aria-pressed','false');
  }
  function toggleAuto(){
    if(playing){stopAuto();return}
    playing=true;
    playButton.textContent=en?'PAUSE II':'ПАУЗА II';
    playButton.setAttribute('aria-pressed','true');
    setStage(active===7?0:active);
    interval=setInterval(()=>setStage((active+1)%8),3600);
  }
  playButton.addEventListener('click',toggleAuto);
  nextButton.addEventListener('click',()=>{stopAuto();setStage((active+1)%8)});
  resetButton.addEventListener('click',()=>{stopAuto();scenarioSelect.value='0';scenario=0;setStage(0)});
  scenarioSelect.addEventListener('change',()=>{stopAuto();scenario=Number(scenarioSelect.value)||0;setStage(0)});
  stageButtons.forEach(button=>button.addEventListener('click',()=>{stopAuto();setStage(Number(button.dataset.step))}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAuto()});
  function animate(ts){
    const particle=svg.querySelector('#org-flying-particle');
    const pulse=svg.querySelector('.org-pulse');
    if(particle && geometry){
      const phase=((ts-startTime)%2400)/2400;
      const from=phase<.5?geometry.current:{x:cx,y:cy};
      const to=phase<.5?{x:cx,y:cy}:geometry.next;
      const t=phase<.5?phase*2:(phase-.5)*2;
      const ease=t*t*(3-2*t);
      const x=from.x+(to.x-from.x)*ease,y=from.y+(to.y-from.y)*ease;
      particle.setAttribute('cx',round(x));
      particle.setAttribute('cy',round(y));
      particle.setAttribute('opacity',phase>.95?'.18':'1');
      if(pulse){
        pulse.setAttribute('r',round(15+((ts-startTime)%1800)/1800*30));
        pulse.setAttribute('opacity',round(.55*(1-((ts-startTime)%1800)/1800)));
      }
    }
    animateId=requestAnimationFrame(animate);
  }
  render();
  if(!reduceMotion)animateId=requestAnimationFrame(animate);
  window.addEventListener('pagehide',()=>{stopAuto();if(animateId!==null)cancelAnimationFrame(animateId)},{once:true});
})();
