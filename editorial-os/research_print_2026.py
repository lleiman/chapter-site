"""LEIMAN LAB | editorial print-like research reader.
Private, password-protected page; no publication side effects.
"""
from html import escape as E

CSS="""
:root{--paper:#f4f2ee;--ink:#1d1c1b;--red:#c72b34;--line:#cfccc5;--muted:#706d68;--black:#0f0f10}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:Georgia,"Times New Roman",serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:3px}a:focus-visible{outline:2px solid var(--red);outline-offset:4px}
.layout{display:grid;grid-template-columns:225px minmax(0,1fr);min-height:100vh}
.side{background:var(--black);color:#eee;position:sticky;top:0;height:100vh;padding:24px 19px;display:flex;flex-direction:column;gap:16px}
.logo{font:500 17px Arial,sans-serif;letter-spacing:.16em}.logo:before{content:"";display:inline-block;border-left:4px solid var(--red);border-bottom:4px solid var(--red);width:13px;height:15px;margin-right:12px}
.side .tiny{font:500 9px/1.7 monospace;letter-spacing:.13em;color:#b2b1af}
.side nav{display:flex;flex-direction:column;border-top:1px solid #37373a;padding-top:17px}
.side nav a{font:600 10px/1.4 Arial,sans-serif;text-transform:uppercase;letter-spacing:.07em;color:#b8b6b6;padding:9px 5px}
.side nav a.current{color:white;border-left:2px solid var(--red);padding-left:11px}
.side-issue{margin-top:auto;border-top:1px solid #363638;padding-top:16px}
.plate{height:222px;margin:15px 0;background:#1f1e20;position:relative;overflow:hidden;border:1px solid #444}
.plate:before{content:"";position:absolute;inset:-60px;background:repeating-linear-gradient(-29deg,#0d0d0e 0 15px,#555456 17px,#aaa7a1 20px,#151517 24px,#111 31px);opacity:.6}
.plate:after{content:"";position:absolute;width:64px;height:64px;top:38%;left:40%;background:var(--red);mix-blend-mode:multiply}
.side-issue p{font:italic 13px/1.35 Georgia,serif;color:#cac9c7}
.main{min-width:0;max-width:1670px;width:100%;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;padding:17px 30px;border-bottom:1px solid var(--line);font:600 10px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;gap:15px}
.top span:first-child{color:var(--red)}.top a{margin-left:13px}
.spread{display:grid;grid-template-columns:1fr 1.04fr}
.page{padding:27px 31px 37px;min-width:0}.page:first-child{border-right:1px solid var(--line)}
.kicker{font:700 10px/1.6 Arial,sans-serif;text-transform:uppercase;letter-spacing:.095em;color:var(--red)}
h1{font:400 clamp(56px,5.35vw,98px)/.96 Georgia,serif;letter-spacing:-.066em;margin:11px 0 16px}
h1 span{display:block}
.deck{font:400 clamp(20px,2vw,28px)/1.24 Georgia,serif;color:#77736e;max-width:600px;margin:12px 0 21px}
.meta{font:400 12px/1.5 Georgia,serif;color:#6c6863;margin-bottom:29px}
.copy{font:400 16px/1.54 Georgia,serif;color:#43413d}
.copy p{margin:0 0 17px}
.section{border-top:1px solid #b7b3aa;margin-top:32px;padding-top:13px}
.sec-head{display:grid;grid-template-columns:56px 1fr;gap:18px;margin-bottom:15px}
.num{font:400 35px/1 Georgia,serif;color:var(--red);border-top:2px solid var(--red);padding-top:7px}
h2{font:400 clamp(26px,2.65vw,41px)/1.08 Georgia,serif;letter-spacing:-.035em;margin:0}
.subtitle{font:400 12px/1.5 Georgia,serif;color:var(--muted);margin:8px 0 0}
.trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-bottom:1px solid var(--line);margin:18px 0}
.trio div{border-right:1px solid var(--line);padding:0 11px 16px}.trio div:first-child{padding-left:0}.trio div:last-child{border:0}
.trio strong{font:700 13px/1.3 Georgia,serif}.trio em{color:var(--red);font-style:normal}
.trio p{font:400 11px/1.5 Georgia,serif;color:#65615e;margin:8px 0 0}
.fig{border-top:1px solid var(--line);padding-top:14px;margin-top:24px}
.fig-label{font:700 10px/1.4 Arial,sans-serif;letter-spacing:.08em;color:var(--red)}
.diagram{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px;position:relative}
.node{border:1px solid #88847f;min-height:73px;padding:10px 4px;text-align:center;display:flex;flex-direction:column;justify-content:center}
.node b{font:700 10px/1.3 Georgia,serif}.node span{font:400 9px/1.35 Georgia,serif;color:#77726d;margin-top:4px}
.arrow{position:absolute;top:18px;color:var(--red);font:700 18px Arial,sans-serif;background:var(--paper)}.ar1{left:24%}.ar2{left:49%}.ar3{left:74%}
.note{font:400 10px/1.6 Georgia,serif;color:#807b76;margin:11px 0}
.rsection{padding:0 0 27px;margin-bottom:26px;border-bottom:1px solid #c1bcb5}
.rsection:last-child{border:0}
.rhead{display:grid;grid-template-columns:45px 1fr;gap:17px;margin-bottom:17px}.rhead .num{font-size:31px;padding-top:4px}
.timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding-top:26px;position:relative}
.timeline:before{content:"";position:absolute;left:3px;right:3px;top:15px;border-top:1px solid #827e78}
.event{position:relative}.event:before{content:"";position:absolute;top:-15px;left:1px;width:7px;height:7px;border-radius:50%;background:var(--red)}
.event time{display:block;font:700 11px Arial,sans-serif;color:var(--red);margin-bottom:8px}
.event strong{display:block;font:600 11px/1.3 Georgia,serif;margin-bottom:5px}
.event p{font:400 10px/1.4 Georgia,serif;color:#514d48;margin:0}
.bigchart{border:1px solid var(--line);padding:14px 13px 8px;min-width:0}
.chart-title{font:700 13px/1.4 Georgia,serif;margin:0}.chart-desc{font:400 10px Georgia,serif;color:var(--muted);margin:4px 0}
.bigchart svg{width:100%;height:auto}
.metricgroup{display:grid;grid-template-columns:1.75fr 1fr;gap:8px;margin-bottom:8px}
.metric{border:1px solid var(--line);padding:15px 12px;display:flex;flex-direction:column;justify-content:space-between}
.metric b{font:400 clamp(28px,3.3vw,48px)/1 Georgia,serif;color:var(--red)}
.metric p{font:400 11px/1.5 Georgia,serif;color:#6e6964;margin:8px 0 0}
.lowercharts{display:grid;grid-template-columns:1.55fr 1fr;gap:8px}
.facttable{width:100%;border-collapse:collapse;font:400 11px/1.4 Georgia,serif}
.facttable th{text-align:left;font:600 10px Arial,sans-serif;color:#817c76}
.facttable td,.facttable th{border-bottom:1px solid var(--line);padding:10px 5px;vertical-align:top}
.facttable td:nth-child(2){white-space:nowrap}
.dot{display:inline-block;width:7px;height:7px;background:#96918c;border-radius:50%;margin-right:5px}
.dot.red{background:var(--red)}.dot.gold{background:#b48d5d}
.bottom{padding:34px 31px 58px;border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr;gap:36px}
.bottom h2{font-size:29px}.bottom p{font:400 14px/1.67 Georgia,serif;color:#58534f}
.sources{display:grid;grid-template-columns:1fr 1fr;gap:9px 20px;margin-top:16px}
.sources a{padding:8px 0;border-top:1px solid var(--line);font:400 11px/1.45 Arial,sans-serif;color:#57534f}
.cta{display:inline-block;font:600 10px Arial,sans-serif;text-transform:uppercase;border:1px solid #55504b;padding:13px;margin-top:10px}
@media(max-width:1230px){.layout{grid-template-columns:185px minmax(0,1fr)}.side{padding:22px 13px}.page{padding:22px 20px}.timeline{grid-template-columns:1fr 1fr;gap:17px}.timeline:before{display:none}.event{border-top:1px solid #b2ada7;padding-top:9px}.event:before{top:-5px}}
@media(max-width:970px){.layout{display:block}.side{position:static;height:auto;display:flex;flex-direction:row;align-items:center;justify-content:space-between}.side-issue,.side .tiny{display:none}.side nav{flex-direction:row;flex-wrap:wrap;border:0;padding:0}.side nav a{font-size:9px;padding:7px}.spread{grid-template-columns:1fr}.page:first-child{border-right:0;border-bottom:1px solid var(--line)}.page{padding:28px 34px}.timeline{grid-template-columns:repeat(4,1fr)}.timeline:before{display:block}.event{padding:0;border:0}.event:before{top:-15px}h1{font-size:clamp(65px,9vw,95px)}}
@media(max-width:600px){.side{display:block}.side nav{margin-top:10px}.top{padding:14px;flex-wrap:wrap}.page{padding:22px 16px}h1{font-size:clamp(52px,11vw,76px)}.sec-head{grid-template-columns:42px 1fr;gap:10px}.trio{grid-template-columns:1fr}.trio div{border-right:0;border-bottom:1px solid var(--line);padding:9px 0}.timeline{grid-template-columns:1fr 1fr;gap:15px}.timeline:before{display:none}.event{border-top:1px solid #b2ada7;padding-top:10px}.event:before{top:-5px}.metricgroup,.lowercharts,.bottom{grid-template-columns:1fr}.bottom{padding:25px 16px}.sources{grid-template-columns:1fr}.facttable td:nth-child(2){white-space:normal}}

/* READING EDITION 002: one continuous scroll, not a side-by-side spread.
   Body measure and hierarchy follow long-form editorial reading conventions. */
.reading{display:block;width:100%}
.reading .page{width:min(100%,960px);max-width:960px;margin:0 auto;padding:48px 44px 0}
.reading .page:first-child{border-right:0;border-bottom:0}
.reading .data-page{padding-top:0;padding-bottom:54px}
.reading .kicker{font-size:12px;letter-spacing:.12em}
.reading h1{font:400 clamp(59px,6.3vw,98px)/.98 Georgia,"Times New Roman",serif;letter-spacing:-.063em;max-width:880px;margin:20px 0 26px}
.reading .deck{font:400 clamp(23px,2.8vw,32px)/1.3 Georgia,serif;max-width:760px;color:#67635f;margin:10px 0 24px}
.reading .meta{font-size:14px;margin-bottom:45px}
.reading .copy{font:400 19px/1.77 Georgia,"Times New Roman",serif;letter-spacing:-.008em;color:#383632;max-width:770px}
.reading .copy p{margin-bottom:26px}
.reading .section{padding-top:28px;margin-top:57px}
.reading .sec-head{grid-template-columns:66px minmax(0,1fr);gap:25px;margin-bottom:27px}
.reading .num{font-size:43px}
.reading h2{font:400 clamp(35px,4vw,52px)/1.1 Georgia,"Times New Roman",serif;letter-spacing:-.035em;max-width:780px}
.reading .subtitle{font-size:16px;line-height:1.62;max-width:725px;margin-top:16px}
.reading .trio{gap:0;margin:25px 0 38px}
.reading .trio div{padding:0 21px 24px}
.reading .trio div:first-child{padding-left:0}
.reading .trio strong{font-size:17px;line-height:1.3}
.reading .trio p{font-size:14px;line-height:1.64;margin-top:12px}
.reading .fig{padding-top:19px;margin:33px 0 31px}
.reading .fig-label{font-size:11px}
.reading .diagram{gap:12px;margin-top:15px}
.reading .node{padding:17px 7px;min-height:94px}
.reading .node b{font-size:14px}
.reading .node span{font-size:12px}
.reading .diagram .arrow{top:32px;font-size:22px}
.reading .note{font-size:12px;line-height:1.6}
.reading .rsection{padding:44px 0 45px;margin:0;border-bottom:1px solid var(--line)}
.reading .rsection:first-child{border-top:1px solid #b7b3aa;margin-top:56px}
.reading .rhead{grid-template-columns:66px minmax(0,1fr);gap:25px;margin-bottom:27px}
.reading .rhead .num{font-size:43px}
.reading .timeline{gap:23px;padding-top:36px}
.reading .timeline:before{top:23px}
.reading .event:before{top:-16px;width:9px;height:9px}
.reading .event time{font-size:13px;margin-bottom:13px}
.reading .event strong{font-size:15px;line-height:1.36}
.reading .event p{font-size:13px;line-height:1.58;margin-top:6px}
.reading .metricgroup{grid-template-columns:minmax(0,1.9fr) minmax(205px,.8fr);gap:14px;margin-top:26px;margin-bottom:14px}
.reading .lowercharts{grid-template-columns:minmax(0,1.55fr) minmax(220px,.9fr);gap:14px}
.reading .bigchart{padding:21px 18px 15px}
.reading .chart-title{font-size:18px}
.reading .chart-desc{font-size:13px;margin-top:8px}
.reading .metric{padding:22px}
.reading .metric b{font-size:clamp(38px,4.1vw,58px)}
.reading .metric p{font-size:14px}
.reading .facttable{font-size:15px;line-height:1.55}
.reading .facttable th{font-size:12px}
.reading .facttable td,.reading .facttable th{padding:16px 14px 16px 0}
.bottom{max-width:960px;margin:0 auto;padding:48px 44px 80px;display:grid;grid-template-columns:1fr;gap:36px}
.bottom h2{font-size:40px;max-width:740px}
.bottom p{font-size:17px;line-height:1.75;max-width:740px}
.sources a{font-size:13px}
@media(max-width:970px){
  .reading .page{padding:36px 34px 0}
  .reading h1{font-size:clamp(61px,8.6vw,91px)}
  .reading .copy{font-size:18px}
  .reading .timeline{grid-template-columns:repeat(2,1fr);gap:26px}
  .reading .timeline:before{display:none}
  .reading .event{border-top:1px solid #b2ada7;padding-top:14px}
  .reading .event:before{top:-6px}
  .bottom{padding:40px 34px 70px}
}
@media(max-width:600px){
  .reading .page{padding:26px 20px 0}
  .reading h1{font-size:clamp(48px,10.2vw,72px);line-height:1.04;overflow-wrap:break-word}
  .reading .deck{font-size:24px;line-height:1.38}
  .reading .meta{font-size:13px;margin-bottom:30px}
  .reading .copy{font-size:18px;line-height:1.73}
  .reading .section{margin-top:45px}
  .reading .sec-head,.reading .rhead{grid-template-columns:43px minmax(0,1fr);gap:14px}
  .reading .num,.reading .rhead .num{font-size:34px}
  .reading h2{font-size:clamp(30px,7vw,42px)}
  .reading .subtitle{font-size:15px}
  .reading .trio{grid-template-columns:1fr}
  .reading .trio div{border-right:0;border-bottom:1px solid var(--line);padding:16px 0}
  .reading .diagram{grid-template-columns:repeat(2,1fr)}
  .reading .diagram .arrow{display:none}
  .reading .node{min-height:88px}
  .reading .timeline{grid-template-columns:repeat(2,1fr)}
  .reading .rsection{padding:35px 0}
  .reading .metricgroup,.reading .lowercharts{grid-template-columns:1fr}
  .reading .metric{min-height:140px}
  .reading .facttable{font-size:13px}
  .reading .facttable th{font-size:10px}
  .reading .facttable td,.reading .facttable th{padding:12px 7px 12px 0;overflow-wrap:anywhere}
  .bottom{padding:36px 20px 60px}
  .bottom h2{font-size:32px}
  .bottom p{font-size:16px}
}

"""

def _trend():
    points=[(48,130,"2023","12,5"),(240,100,"2024","16,6"),(437,54,"2025","20,9")]
    s=['<svg viewBox="0 0 490 174" role="img" aria-label="Потери по жалобам IC3 в миллиардах долларов: 12,5 в 2023, 16,6 в 2024, 20,9 в 2025">']
    for x,y,year,val in points:
        s.append(f'<circle cx="{x}" cy="{y}" r="4" fill="#c72b34"/>')
        s.append(f'<text x="{x}" y="{y-12}" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700">USD {val}</text>')
        s.append(f'<text x="{x}" y="159" text-anchor="middle" font-family="Arial" font-size="10" fill="#706d68">{year}</text>')
    s.insert(1,'<path d="M48 130 L240 100 L437 54" stroke="#c72b34" stroke-width="2.5" fill="none"/><line x1="18" y1="142" x2="472" y2="142" stroke="#bebbb6" stroke-width=".8"/>')
    return ''.join(s)+'</svg>'

def _bars():
    vals=[("Инвестиции",8.65),("BEC",3.05),("Поддержка",2.13),("Перс. данные",1.31)]
    s=['<svg viewBox="0 0 355 151" role="img" aria-label="Потери FBI IC3 по категориям 2025: инвестиции 8,65 млрд, BEC 3,05, поддержка 2,13, персональные данные 1,31">']
    for i,(name,v) in enumerate(vals):
        x=25+i*83;h=v/9*93
        s.append(f'<rect x="{x}" y="{114-h:.2f}" width="48" height="{h:.2f}" fill="{("#c72b34" if i==0 else "#a4a19c")}"/>')
        s.append(f'<text x="{x+24}" y="{108-h:.2f}" text-anchor="middle" font-family="Arial" font-size="11">{v:.1f}</text>')
        s.append(f'<text x="{x+24}" y="131" text-anchor="middle" font-family="Arial" font-size="9" fill="#67635d">{E(name)}</text>')
    return ''.join(s)+'</svg>'

def render_page(pid):
    timeline=[
        ("25 СЕН","Саморепликация инъекций","OpenAI: эксперимент в симулированных вызовах инструментов."),
        ("14 ОКТ","Эксплуатируемые уязвимости","CISA обновляет KEV, перечень реально эксплуатируемых ошибок."),
        ("20–22 ОКТ","Инцидент Railway","Доступ к части внутренних систем. Выводы предварительные."),
        ("27 ОКТ","Исследование Anthropic","Пять цепочек серьёзных уязвимостей найдены с помощью модели.")
    ]
    events=''.join(f'<div class="event"><time>{a}</time><strong>{b}</strong><p>{c}</p></div>' for a,b,c in timeline)
    findings=[
        ("Railway сообщила о компрометации внутренних систем","red","Подтверждено","Официальный отчёт"),
        ("Атакующих интересовали ключи AI-провайдеров","gold","Предварительно","Версия компании"),
        ("Атаку Railway выполнил автономный ИИ","","Не доказано","Недостаточно сведений"),
        ("В симуляции возможна саморепликация инъекций","red","Показано в тесте","Исследование OpenAI"),
        ("Это вызвало реального автономного червя","","Не доказано","За пределами теста не наблюдалось")
    ]
    evidence=''.join(f'<tr><td>{a}</td><td><span class="dot {b}"></span>{c}</td><td>{d}</td></tr>' for a,b,c,d in findings)
    sources=[
        ("Railway · предварительный отчёт","https://blog.railway.com/p/preliminary-report-october-security-incident"),
        ("OpenAI · самореплицирующиеся инъекции","https://alignment.openai.com/misalignment-reports/self-replicating-prompt-injections-exist"),
        ("Anthropic · исследования уязвимостей","https://www.anthropic.com/research/discovering-vulnerabilities-with-claude"),
        ("FBI IC3 · годовой отчёт 2025","https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf"),
        ("CISA · каталог KEV, октябрь","https://content.govdelivery.com/accounts/USDHSCISA/bulletins/42f2e7f"),
        ("Leiman Lab · «Чёрный октябрь»","https://leimanlab.com/articles/black-october")
    ]
    srclinks=''.join(f'<a target="_blank" rel="noopener noreferrer" href="{E(u)}">{E(t)} ↗</a>' for t,u in sources)
    return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow"><title>После чёрного октября — Leiman Lab / редакционный предпросмотр</title><style>{CSS}</style></head><body>
    <div class="layout"><aside class="side">
     <div><div class="logo">LEIMAN LAB</div><div class="tiny" style="margin:14px 0 25px">RESEARCH / ESSAYS / JOURNAL</div>
     <nav><a href="/">Все публикации</a><a href="/research/security-2026" class="current">Исследования</a>
     <a href="https://leimanlab.com/articles/black-october">Предыдущая статья</a>
     <a href="/post/{pid}">Карточка черновика</a><a href="/calendar">Расписание</a></nav></div>
     <div class="side-issue"><div class="tiny">FIELD REPORT<br>NO 002<br>ОКТЯБРЬ 2026</div>
      <div class="plate" role="img" aria-label="Абстрактный геометрический рисунок для номера"></div>
      <p>Мы наблюдаем изменение границ доверия между человеком и машиной.</p></div>
    </aside>
    <main class="main"><header class="top"><span>LEIMAN LAB / RESEARCH NOTE 002</span><div><a href="#chronology">Хронология</a><a href="#figures">Данные</a><a href="#evidence">Факты</a></div></header>
    <div class="reading" id="article">
      <article class="page article-page"><div class="kicker">Технологии и общество</div>
        <h1><span>После</span><span>чёрного октября</span></h1>
        <p class="deck">Что теперь происходит с безопасностью интернета в эпоху ИИ-агентов</p>
        <div class="meta">Лев Лейман　·　29 октября 2026　·　Исследовательский черновик</div>
        <div class="copy"><p>В течение нескольких недель исследователи и технологические компании сообщили о серии событий, которые на первый взгляд выглядят частями одной истории. Уязвимости в инфраструктуре, атаки на платформы, эксперименты с самораспространяющимися инъекциями и рост масштабов интернет-мошенничества.</p>
        <p>Но интернет по-прежнему не «захвачен ИИ». Вместо этого мы наблюдаем изменение архитектуры риска: границы между человеком, агентом, платформой и внешним миром становятся всё более проницаемыми, а стоимость ошибок выше.</p></div>
        <section class="section"><div class="sec-head"><div class="num">01</div><div><h2>Три слоя новой угрозы</h2><p class="subtitle">Современная цифровая безопасность складывается из трёх взаимосвязанных механизмов.</p></div></div>
        <div class="trio"><div><strong><em>1.</em> Инфраструктура</strong><p>Секреты, доступы, цепочки поставок и системные ошибки, известные задолго до агентной эпохи.</p></div>
        <div><strong><em>2.</em> ИИ-агенты</strong><p>Инъекции и инструменты, расширяющие возможности системы за пределы обычного ответа.</p></div>
        <div><strong><em>3.</em> Экономика ущерба</strong><p>Мошенничество, подмена личности и финансовые потери, далеко не всегда связанные с ИИ.</p></div></div>
        <figure class="fig"><div class="fig-label">FIGURE 01 / ГРАНИЦА ДОВЕРИЯ</div>
        <div class="diagram" role="img" aria-label="Схема перехода: внешний контент, агент, инструмент, действие">
          <div class="node"><b>Внешние данные</b><span>письмо, сайт, документ</span></div><div class="node"><b>Агент</b><span>читает и планирует</span></div>
          <div class="node"><b>Инструменты</b><span>браузер, код, API</span></div><div class="node"><b>Действие</b><span>во внешнем мире</span></div>
          <span class="arrow ar1">→</span><span class="arrow ar2">→</span><span class="arrow ar3">→</span></div>
        <figcaption class="note">Внешний текст может повлиять на действие агента. Схема демонстрирует механизм риска, а не подтверждённый инцидент.</figcaption></figure>
        <div class="copy"><p>Когда модель просто читает страницу, ошибка может остаться в ответе. Когда агент получает доступ к файлам, банковским операциям или аккаунтам, последствия определяются полномочиями и механизмами подтверждения.</p>
        <p>Новая задача защиты: недоверенный текст не должен становиться привилегированной командой только потому, что оказался внутри контекста модели.</p></div></section>
      </article>
      <div class="page data-page">
        <section class="rsection" id="chronology"><div class="rhead"><div class="num">02</div><div><h2>Хронология ключевых событий</h2><p class="subtitle">Публикации осени 2026 года говорят о разных классах угроз.</p></div></div><div class="timeline">{events}</div></section>
        <section class="rsection" id="figures"><div class="rhead"><div class="num">03</div><div><h2>Масштаб интернет-преступлений</h2><p class="subtitle">Зарегистрированные потери растут. Но эти цифры не измеряют AI-атаки.</p></div></div>
         <div class="metricgroup"><div class="bigchart"><h3 class="chart-title">Потери по обращениям FBI IC3</h3><p class="chart-desc">США, 2023–2025 · млрд USD</p>{_trend()}
          <div class="note"><a href="https://www.ic3.gov/annualreport/reports" target="_blank" rel="noopener noreferrer">Источник: FBI IC3</a>. Суммы округлены.</div></div>
          <div class="metric"><div><div class="kicker">Рост потерь</div><b>+67%</b></div><p>Увеличение заявленных потерь с 2023 по 2025 год.</p></div></div>
         <div class="lowercharts"><div class="bigchart"><h3 class="chart-title">Где теряют больше всего</h3><p class="chart-desc">Категории жалоб FBI IC3, 2025 · млрд USD</p>{_bars()}<div class="note">Источник: годовой отчёт IC3 за 2025.</div></div>
          <div class="metric"><div><div class="kicker">Обращений за год</div><b>1,01 млн</b></div><p>2025: 1 008 597. В 2024 году: 859 532.</p></div></div>
        </section>
        <section class="rsection" id="evidence"><div class="rhead"><div class="num">04</div><div><h2>Что подтверждено, а что остаётся под вопросом</h2><p class="subtitle">Предварительная версия и доказанный факт не одно и то же.</p></div></div>
        <table class="facttable"><thead><tr><th>Тезис</th><th>Статус</th><th>Основание</th></tr></thead><tbody>{evidence}</tbody></table></section>
      </div>
    </div>
    <footer class="bottom"><div><div class="kicker">Вывод / FIELD REPORT 002</div><h2>Информация и полномочия не должны быть одним и тем же.</h2>
       <p>Управление разрешениями важнее эффектных историй о взломах. Минимальные права, независимое подтверждение критических действий и изоляция ключей становятся базовыми инструментами безопасности.</p>
       <a class="cta" href="/post/{pid}">Открыть карточку черновика ↗</a>
       <p class="note">Редакционный предпросмотр. В Telegram и на публичном сайте этот текст не опубликован.</p></div>
      <div><div class="kicker">Источники и предыдущее исследование</div><div class="sources">{srclinks}</div></div></footer>
    </main></div></body></html>'''
