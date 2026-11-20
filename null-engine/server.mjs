import http from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import pathModule from 'node:path';
const PORT=Number(process.env.PORT||3000);
const sources=[
 {name:'arXiv / AI',url:'https://rss.arxiv.org/rss/cs.AI',kind:'research'},
 {name:'arXiv / Cybersecurity',url:'https://rss.arxiv.org/rss/cs.CR',kind:'research'},
 {name:'MIT News / AI',url:'https://news.mit.edu/rss/topic/artificial-intelligence2',kind:'research'},
 {name:'Google AI',url:'https://blog.google/technology/ai/rss/',kind:'official'},
 {name:'TechCrunch / AI',url:'https://techcrunch.com/category/artificial-intelligence/feed/',kind:'media'}
];
const story={
 title:'NULL / ПРОТОКОЛ ОТСУТСТВИЯ',edition:'EPISODE 001',chapter:'НУЛЕВАЯ ЗАПИСЬ',
 world:'Сэйко, 2029. В этом городе право действовать от чужого имени переживает своего владельца.',
 characters:[
 {name:'Курода Рэй',role:'Следователь архивной службы',appearance:'короткие тёмные волосы, строгий воротник, глубокий взгляд',belief:'архивный факт требует происхождения'},
 {name:'Мидзуно Аки',role:'Инженер происхождения данных',appearance:'асимметричное каре, серебряное кольцо в ухе',belief:'согласие должно быть отзывным'},
 {name:'Савада Ицуки',role:'Бывший архитектор городской системы',appearance:'седые виски, тонкая оправа',belief:'давние инженерные решения имеют наследников'}
 ],
 episodes:[
 {id:1,title:'Нулевая запись',date:'2029-03-14',status:'SCRIPT_READY',beats:[
 ['ПОРТ / 04:18','Сэйко. Огни порта погасли на 47 секунд.','Порт, дождь, затухающие башни контейнерных кранов'],
 ['АРХИВ','Диспетчер: «Выглядит как ошибка импорта».\nКурода: «Почему тогда заверено?»','Рука на бумажной ленте с записью о смерти'],
 ['ЖИЛОЙ БЛОК 17','Система: «Ваша гражданская непрерывность прекращена».\nАки: «Я здесь».','Аки у окна смотрит на цифровой отказ'],
 ['ПОСТ НАБЛЮДЕНИЯ','Диспетчер: «Подпись её. Камера никого не видит».\nКурода: «Тогда кто вошёл?»','Курода перед монитором пустого коридора'],
 ['АРХИВ 1923','Курода: «Этот маршрут закрыли сто лет назад».','Старинная карта землетрясения Канто и код 9-1-1'],
 ['ПОДПОРТОВЫЙ УЗЕЛ','Терминал: «Делегирование принято».','Человеческая фигура за сеткой и отражение в воде'],
 ['ПОЕЗД','Неизвестный: «Не ищите того, кто вошёл. Найдите того, кто дал разрешение».','Курода в ночном поезде, сообщение на терминале'],
 ['ПОСЛЕДНИЙ КАДР','СОГЛАСИЕ НЕ ТРЕБУЕТ ПРИСУТСТВИЯ','Портовые экраны включаются одновременно']
 ]}]
};
const manualSignals=[
 {id:'historical-1923',date:'1923-09-01',title:'Великое землетрясение Канто',url:'https://www.britannica.com/event/Tokyo-Yokohama-earthquake-of-1923',tier:'historical',impact:4,usedIn:'001',status:'editorial-anchor'},
 {id:'agent-trust',date:'2026-11-20',title:'Контроль делегирования действий автономным агентам',url:'https://www.nist.gov/itl/ai-risk-management-framework',tier:'framework',impact:5,usedIn:'001',status:'thematic-anchor'}
];
let snapshot={time:null,items:[],errors:[]};
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
function strip(s){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function extract(s,tag){const m=s.match(new RegExp('<(?:[\\w-]+:)?'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+tag+'>','i'));return m?strip(m[1]):''}
async function fetchFeed(source){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch(source.url,{signal:controller.signal,headers:{'User-Agent':'NULL-Observer/0.1 (editorial prototype)'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const xml=await response.text();
  const nodes=[...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)].slice(0,18);
  return nodes.map(m=>{
   const node=m[2],title=extract(node,'title');let url=extract(node,'link');
   if(!url){const link=node.match(/<link[^>]+href=["']([^"']+)/i);url=link?.[1]||''}
   const date=extract(node,'pubDate')||extract(node,'published')||extract(node,'updated');
   const score=(title.match(/agent|identity|authentic|security|compute|robot|neural|deepfake|governance|copyright|autonom|privacy|consent|bio|model|AI|интеллект/gi)||[]).length;
   return {title,url,date,source:source.name,tier:source.kind,score};
  }).filter(v=>v.title&&/^https?:/.test(v.url));
 }finally{clearTimeout(timeout)}
}
async function refresh(){
 const all=await Promise.allSettled(sources.map(fetchFeed));
 const errors=[],items=[];
 all.forEach((r,i)=>{if(r.status==='fulfilled')items.push(...r.value);else errors.push(sources[i].name+': '+String(r.reason).slice(0,100))});
 const unique=new Map();for(const x of items){const k=x.title.toLowerCase();if(!unique.has(k))unique.set(k,x)}
 snapshot={time:new Date().toISOString(),items:[...unique.values()].sort((a,b)=>b.score-a.score).slice(0,45),errors};
 return snapshot;
}
const css=`*{box-sizing:border-box}body{margin:0;background:#e8e8e3;color:#161919;font:16px/1.5 Inter,Arial,sans-serif}a{color:inherit}header{background:#121617;color:#eff2ec;padding:18px 4vw;display:flex;justify-content:space-between;align-items:center;gap:16px}header strong{font-size:20px;letter-spacing:.16em}header span{font:11px monospace;color:#a8bbb5}.wrap{max-width:1280px;margin:auto;padding:34px 24px 90px}.eyebrow{font:12px monospace;letter-spacing:.2em;text-transform:uppercase;color:#55766d}h1{font-size:clamp(65px,12vw,160px);line-height:.9;letter-spacing:-.09em;margin:18px 0}h2{font-size:clamp(26px,3vw,42px);letter-spacing:-.055em;margin:0 0 15px}.lead{font-size:clamp(18px,2vw,26px);max-width:800px}.meta{display:flex;gap:10px;flex-wrap:wrap;margin:25px 0 45px}.tag{font:12px monospace;border:1px solid #9fa8a2;padding:6px 10px}.grid{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:38px}.comic{border:6px solid #151b1b;background:#f1f3ee;display:grid;grid-template-columns:repeat(2,1fr);gap:7px;padding:7px}.panel{background:#d6e0d9;min-height:270px;display:flex;flex-direction:column;position:relative;overflow:hidden;border:2px solid #121b1b;padding:13px}.panel:nth-child(3n){grid-column:span 2}.panel:before{content:'';position:absolute;inset:0;opacity:.55;background:repeating-linear-gradient(120deg,transparent 0 17px,#8da5a0 18px 19px)}.panel .scene{position:relative;margin:auto 0;min-height:105px;display:grid;place-items:center;text-align:center;font-size:26px;font-weight:800;letter-spacing:-.05em;opacity:.56;padding:20px}.panel .plate{position:relative;align-self:flex-start;background:#131919;color:white;font:11px monospace;padding:5px 7px;z-index:1}.balloon{position:relative;background:#fff;border:2px solid #121b1b;border-radius:30px;padding:12px 16px;max-width:95%;font-size:14px;white-space:pre-line;z-index:1;margin:0 0 5px auto;box-shadow:3px 4px 0 #5d756d}.panel:last-child{background:#161c1e;color:white}.panel:last-child .balloon{background:#e4f5ed;color:#152322}.side{position:sticky;top:25px;height:fit-content}.card{background:white;border-top:4px solid #172321;padding:20px;margin-bottom:18px}.card h3{margin:0 0 8px;font-size:16px}.card p{margin:0 0 10px;font-size:13px}.signal{border-bottom:1px solid #cbd0cb;padding:13px 0}.signal a{font-weight:700;text-decoration:underline;text-underline-offset:3px}.muted{color:#65746e;font:11px monospace}.status{display:inline-block;font:11px monospace;border:1px solid #b36d32;color:#945522;padding:4px 7px}.btn{cursor:pointer;background:#162420;color:white;border:0;padding:12px 17px;font-weight:bold}.note{border-left:3px solid #8d7353;padding:13px 20px;background:#fff9e9;margin:20px 0}.section{margin:65px 0 20px;border-top:2px solid #152221;padding-top:20px}.chars{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.chars .card{margin:0}.signals{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.footer{margin-top:50px;color:#566863;font:12px monospace}@media(max-width:850px){.grid{grid-template-columns:1fr}.side{position:static}.chars,.signals{grid-template-columns:1fr}}@media(max-width:560px){.wrap{padding:25px 12px}.comic{grid-template-columns:1fr}.panel,.panel:nth-child(3n){grid-column:span 1}.panel{min-height:230px}h1{font-size:78px}}`;
function page(){
 const e=story.episodes[0];const panels=e.beats.map(([label,text,visual],i)=>`<article class="panel"><span class="plate">${String(i+1).padStart(2,'0')} / ${esc(label)}</span><div class="scene">${esc(visual)}</div><div class="balloon">${esc(text)}</div></article>`).join('');
 const signals=snapshot.items.slice(0,18).map(v=>`<div class="signal"><div class="muted">${esc(v.source)} · ${esc(v.date||'DATE UNKNOWN')} · relevance ${v.score}</div><a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">${esc(v.title)}</a><div class="muted">UNVERIFIED FOR STORY · editorial screening required</div></div>`).join('');
 return `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>NULL Engine / Pilot Studio</title><style>${css}</style></head><body><header><strong>NULL<span> / ENGINE</span></strong><span>LEIMAN LAB · R&amp;D · PREVIEW 0.1</span></header><main class="wrap"><div class="eyebrow">Independent graphic fiction · 2026 / laboratory preview</div><h1>NULL.</h1><p class="lead">Графический сериал, который помнит своих героев и наблюдает за настоящим. Пилот: <b>Нулевая запись.</b></p><p><a href="/episode/1" class="btn" style="display:inline-block;text-decoration:none">Читать иллюстрированный эпизод →</a></p><div class="meta"><span class="tag">SEIKO BAY / 2029</span><span class="tag">8 PANELS</span><span class="tag">NOT PUBLISHED</span><span class="tag">SOURCE-DRIVEN FICTION</span></div><div class="note"><b>Технический прототип.</b> Визуальный выпуск опубликован отдельно по ссылке выше; ниже хранится сценарно-макетная структура, которая может отличаться от иллюстраций. Новостная лента не влияет на опубликованный канон без проверки источника.</div><div class="grid"><section><h2>EP. 001 / Нулевая запись</h2><div class="comic">${panels}</div><div class="section"><h2>Мир и память</h2><p>${esc(story.world)}</p><div class="chars">${story.characters.map(c=>`<div class="card"><h3>${esc(c.name)}</h3><p>${esc(c.role)}</p><p><b>Внешность:</b> ${esc(c.appearance)}</p><p><b>Убеждение:</b> ${esc(c.belief)}</p></div>`).join('')}</div></div></section><aside class="side"><div class="card"><h3>PRODUCTION / STATUS</h3><p><span class="status">SCRIPT READY</span></p><p>Нарратив и панельный макет готовы. Генератор изображений и автоматическая публикация намеренно отключены до теста качества.</p><p><a href="/api/world">JSON: память мира</a></p><p><a href="/api/news">JSON: сигналы новостей</a></p></div><div class="card"><h3>NEWS OBSERVER</h3><p>Последняя попытка обновления: ${esc(snapshot.time||'ещё не запускалась')}.</p><p>Сигналов: ${snapshot.items.length}; ошибок источников: ${snapshot.errors.length}.</p><form action="/refresh" method="POST"><button class="btn">Обновить источники</button></form><p class="muted">Research / AI / Cybersecurity. Сигналы не считаются проверенными новостями.</p></div></aside></div><div class="section"><h2>Входящие сигналы / редакционный радар</h2><p>Сортировка по тематическим маркерам. Это очередь на верификацию, а не доказательства для сценария.</p><div class="signals">${signals||'<p>Сигналы пока не поступили. Проверьте работу RSS.</p>'}</div></div><div class="footer">NULL ENGINE 0.1 · AUTOMATION PIPELINE PROTOTYPE · NO AUTOPUBLISH</div></main></body></html>`;}
const json=(res,obj)=>{res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(obj,null,2))};

const HERE=pathModule.dirname(fileURLToPath(import.meta.url));

const VOTE_PATH='/data/null-votes-001.json';
const DEFAULT_VERSION='alternative';
const VOTE_OPTIONS={alternative:'Версия B · Манга',original:'Версия A · Кинематографический комикс'};
let voteStore={voters:{},total:0,counts:{alternative:0,original:0},updated:null};
try{
 if(existsSync(VOTE_PATH)){const loaded=JSON.parse(readFileSync(VOTE_PATH,'utf8'));if(loaded&&typeof loaded.voters==='object'){voteStore=loaded;}}
}catch(error){console.error('NULL vote load',error.message)}
function voteCounts(){const c={alternative:0,original:0};for(const v of Object.values(voteStore.voters||{})){if(v in c)c[v]++}return c}
function voteState(token){
 const counts=voteCounts(),total=counts.alternative+counts.original;
 const winner=counts.alternative>=counts.original?'alternative':'original';
 const voterKey=token?createHash('sha256').update(token).digest('hex'):null;
 return {poll:'episode-001-version',options:VOTE_OPTIONS,counts,total,winner,
  tie:counts.alternative===counts.original,defaultOnTie:DEFAULT_VERSION,
  myVote:voterKey?(voteStore.voters[voterKey]||null):null,updated:voteStore.updated||null};
}
function saveVotes(){mkdirSync('/data',{recursive:true});const temp=VOTE_PATH+'.tmp';writeFileSync(temp,JSON.stringify(voteStore),'utf8');renameSync(temp,VOTE_PATH)}
function readCookie(req){const m=(req.headers.cookie||'').match(/(?:^|;\s*)null_voter=([a-f0-9]{48})(?:;|$)/);return m?m[1]:null}
const rateLimit=new Map();
async function acceptVote(req,res){
 let input='';for await(const part of req){input+=part;if(input.length>2048){res.writeHead(413);return res.end('too large')}}
 let value;try{value=JSON.parse(input).version}catch{res.writeHead(400);return res.end('invalid JSON')}
 if(!(value in VOTE_OPTIONS)){res.writeHead(400);return res.end('invalid version')}
 const host=req.headers.host||'',origin=req.headers.origin||'';
 if(origin&&new URL(origin).host!==host){res.writeHead(403);return res.end('cross origin blocked')}
 const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();
 const key=createHash('sha256').update(ip).digest('hex');
 const now=Date.now();const recent=rateLimit.get(key)||[];
 const fresh=recent.filter(t=>now-t<60000);
 if(fresh.length>=12){res.writeHead(429,{'Retry-After':'60'});return res.end('rate limited')}
 fresh.push(now);rateLimit.set(key,fresh);
 if(rateLimit.size>10000)rateLimit.clear();
 let token=readCookie(req);const newToken=!token;if(!token)token=randomBytes(24).toString('hex');
 const voterKey=createHash('sha256').update(token).digest('hex');
 voteStore.voters[voterKey]=value;voteStore.updated=new Date().toISOString();
 try{saveVotes()}catch(e){console.error('NULL vote save',e.message);res.writeHead(503);return res.end('vote storage unavailable')}
 res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
  ...(newToken?{'Set-Cookie':'null_voter='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000'}:{})});
 res.end(JSON.stringify(voteState(token)));
}
function episodePage(token){
 const poll=voteState(token);
 const cards=(first,count)=>Array.from({length:count},(_,i)=>{const n=String(i+first).padStart(2,'0');return '<figure class="frame"><img src="/panels/NULL_'+n+'.jpg" loading="'+(i<2?'eager':'lazy')+'" alt="NULL, эпизод 001, кадр '+n+'"></figure>'}).join('');
 const main=poll.winner==='alternative'?cards(13,6):cards(1,12);
 const other=poll.winner==='alternative'?cards(1,12):cards(13,6);
 const lead=poll.winner==='alternative'?'Версия B · Манга (6 кадров)':'Версия A · Кинематографический комикс (12 кадров)';
 const alt=poll.winner==='alternative'?'Версия A · Кинематографический комикс':'Версия B · Манга';
 const percentage=v=>poll.total?Math.round(poll.counts[v]/poll.total*100):0;
 const votes=(Object.keys(VOTE_OPTIONS)).map(v=>'<button class="vote-button'+(poll.myVote===v?' chosen':'')+'" data-vote="'+v+'"><span>'+VOTE_OPTIONS[v]+'</span><strong>'+percentage(v)+'% · '+poll.counts[v]+'</strong><i style="width:'+percentage(v)+'%"></i></button>').join('');
 return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080b0d"><title>NULL / 001 — Нулевая запись · Голосование</title>
 <style>*{box-sizing:border-box}html{scroll-behavior:smooth}body{background:#090c0e;color:#ecf0ed;margin:0;font:16px/1.5 Arial,sans-serif}a{color:inherit;text-decoration:none}nav{min-height:60px;border-bottom:1px solid #273338;display:flex;justify-content:space-between;align-items:center;padding:10px max(18px,calc((100% - 1100px)/2));gap:10px}nav strong{letter-spacing:.22em}nav span{font:11px monospace;color:#a6bcb5}.wrap{max-width:1040px;margin:auto;padding:0 12px}.intro{padding:45px 6px 28px}.eyebrow{color:#9bbdb8;letter-spacing:.23em;font:12px monospace}.intro h1{font-size:clamp(74px,17vw,180px);letter-spacing:-.105em;line-height:.9;margin:20px 0}.lead{font-size:clamp(18px,2.6vw,25px);max-width:690px}.note{font-size:13px;color:#90a7a2;max-width:800px;padding-bottom:20px}.frame{display:flex;justify-content:center;margin:0 0 12px;overflow:hidden}.frame img{display:block;max-width:100%;width:auto;height:auto;object-fit:contain}.strip{max-width:1040px;margin:0 auto}.divider{margin:75px auto 30px;max-width:850px;border-top:1px solid #4f6262;padding:24px 18px}.divider h2{font-size:clamp(28px,5vw,52px);letter-spacing:-.04em;margin:0 0 9px}.divider p{color:#91a7a2}.footer{margin:80px auto;padding:30px 20px 80px;text-align:center;font:12px monospace;color:#829c9c}.toplink{display:inline-block;border:1px solid #5a7875;padding:10px 15px}.badge{display:inline-block;border:1px solid #526764;padding:4px 8px;font:11px monospace;margin-right:9px;color:#b0c4c0}.poll{max-width:850px;margin:0 auto 35px;padding:25px;background:#131a1c;border:1px solid #3c5352}.poll h2{font-size:clamp(23px,3.7vw,36px);margin:0 0 6px}.poll .sub{color:#acbebb;font-size:14px}.vote-button{position:relative;overflow:hidden;width:100%;text-align:left;margin:10px 0;padding:17px 18px;background:#1b2929;border:1px solid #58706e;color:#edf3ee;display:flex;justify-content:space-between;gap:12px;cursor:pointer;font-size:15px}.vote-button span,.vote-button strong{position:relative;z-index:2}.vote-button i{position:absolute;left:0;top:0;bottom:0;background:#23584d;opacity:.75;transition:width .25s}.vote-button.chosen{border:2px solid #c4f7e1}.vote-button:focus-visible{outline:3px solid #dcf}.poll-status{font:13px monospace;color:#96afa9}.display-state{font:13px monospace;color:#b3e0c9}.smallprint{font-size:12px;color:#899f9a}@media(max-width:650px){.frame{margin-bottom:7px}.intro{padding-top:29px}nav{padding:0 14px}.vote-button{flex-direction:column}}</style>
 </head><body><nav><a href="/"><strong>NULL / ENGINE</strong></a><span>LEIMAN LAB · READER-DRIVEN FICTION</span></nav><main class="wrap"><header class="intro"><div class="eyebrow">SEASON 01 / PILOT / 2029</div><h1>NULL.</h1><p class="lead">Эпизод 001. Нулевая запись.</p><p class="note"><span class="badge">ЧИТАТЕЛЬСКИЙ МОНТАЖ</span>Читатели выбирают визуальную версию главы. Победившая версия автоматически становится основной для всех посетителей.</p></header>
 <section class="poll" id="poll"><h2>Какую версию оставить каноном?</h2><p class="sub">Голос определяет порядок отображения первой главы. Изменить голос можно в любой момент, до закрытия голосования. При равенстве выбирается версия B.</p><div id="vote-options">${votes}</div><p class="poll-status" id="poll-status">Всего голосов: ${poll.total}. ${poll.myVote?'Ваш выбор учтён.':'Вы ещё не голосовали.'}</p><p class="display-state">СЕЙЧАС ПОКАЗЫВАЕТСЯ: ${lead}</p><p class="smallprint">Учёт голосов привязан к браузеру. Это экспериментальное голосование без авторизации: защита от накрутки ограниченная. Два монтажа являются альтернативами одной истории.</p></section>
 <div class="divider" style="margin-top:22px" id="main"><h2>Основной монтаж</h2><p>${lead}. Определяется текущим результатом голосования.</p></div><section class="strip">${main}</section>
 <div class="divider" id="alternative"><h2>Другой монтаж</h2><p>${alt}. Сохраняется доступным для сравнения; это не сюжетное продолжение.</p></div><section class="strip">${other}</section><footer class="footer"><a class="toplink" href="#poll">↑ ГОЛОСОВАТЬ</a><p>NULL · EPISODE 001 · 18 PANELS · LEIMAN LAB</p></footer></main>
 <script>document.querySelectorAll('[data-vote]').forEach(button=>button.addEventListener('click',async()=>{const status=document.getElementById('poll-status');status.textContent='Сохраняю ваш выбор…';document.querySelectorAll('[data-vote]').forEach(b=>b.disabled=true);try{const response=await fetch('/api/vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:button.dataset.vote})});if(!response.ok)throw Error('HTTP '+response.status);const result=await response.json();status.textContent='Голос учтён. Обновляю основной монтаж…';location.reload()}catch(e){status.textContent='Не удалось сохранить голос: '+e.message;document.querySelectorAll('[data-vote]').forEach(b=>b.disabled=false)}}));</script>
 </body></html>`;
}

http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/episode/1'||path==='/episode/001'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store'});return res.end(episodePage(readCookie(req)))}
 if(path==='/api/vote'&&req.method==='GET')return json(res,voteState(readCookie(req)));
 if(path==='/api/vote'&&req.method==='POST')return acceptVote(req,res);
 if(/^\/panels\/NULL_\d{2}\.jpg$/.test(path)){try{const body=readFileSync(pathModule.join(HERE,'public',path));res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'public,max-age=86400','Content-Length':body.length});return res.end(body)}catch(e){res.writeHead(404);return res.end('Missing panel')}}
 if(path==='/health')return json(res,{ok:true,version:'0.1',feedUpdated:snapshot.time});
 if(path==='/api/world')return json(res,story);
 if(path==='/api/news')return json(res,snapshot);
 if(path==='/refresh'&&req.method==='POST'){await refresh();res.writeHead(303,{Location:'/'});return res.end()}
 if(path==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(page())}
 res.writeHead(404);res.end('not found');
}).listen(PORT,'0.0.0.0',()=>{console.log('NULL Engine listening at '+PORT);refresh().catch(console.error)});
setInterval(()=>refresh().catch(console.error),60*60*1000).unref();
