"""Leiman Lab magazine treatment for the existing internal research draft.
All content remains private, no external posts. SVG diagrams are illustrative,
financial data derived from the 2025 FBI IC3 annual report, p.29.
"""
from research_security_2026 import article_html as original_article

MAGAZINE_CSS = """
<style>
:root{--ml-bg:#0B0B0D;--ml-ink:#F5F3EF;--ml-red:#EE2936;--ml-line:#343438;--ml-mute:#A6A4A1}
body{background:var(--ml-bg)!important}
.wrap{max-width:1190px!important;padding-top:20px!important}
.research{color:var(--ml-ink)!important;font-family:Inter,"Arial Narrow",Arial,sans-serif!important}
.research .ey,.research .eyebrow,.mag-micro{font:700 11px/1.55 "SFMono-Regular",Consolas,monospace!important;letter-spacing:.12em;text-transform:uppercase;color:var(--ml-red)!important}
.mag-header{display:flex;gap:22px;align-items:center;justify-content:space-between;padding:19px 0 25px;border-bottom:1px solid var(--ml-line)}
.mag-logo{font:850 18px/1 Arial,sans-serif;letter-spacing:.12em;white-space:nowrap}
.mag-logo b{color:var(--ml-red)}.mag-logo:before{content:"";display:inline-block;width:17px;height:17px;border-bottom:5px solid var(--ml-red);border-left:5px solid var(--ml-red);margin-right:12px}
.mag-head-meta{color:#b1adb1;font:600 10px monospace;letter-spacing:.15em}
.mag-hero{display:grid;grid-template-columns:52% 48%;min-height:545px;border-bottom:1px solid var(--ml-line)}
.mag-hero-copy{display:flex;flex-direction:column;justify-content:center;padding:54px 30px 55px 0}
.mag-hero h1{font:700 clamp(57px,7.1vw,104px)/.91 Georgia,"Times New Roman",serif!important;letter-spacing:-.065em;margin:25px 0 35px;max-width:650px}
.mag-hero h1 em{font-style:normal;color:var(--ml-red)}
.mag-deck{font:400 clamp(20px,2.6vw,31px)/1.25 Georgia,serif;color:#e6e2de;letter-spacing:-.028em;max-width:500px}
.mag-subdeck{font:400 15px/1.8 Arial,sans-serif;color:#b2afb0;max-width:520px;margin-top:27px}
.mag-hero-art{position:relative;min-height:450px;overflow:hidden;background:radial-gradient(ellipse at 77% 18%,#242329,#111114 66%);border-left:1px solid var(--ml-line)}
.mag-scene{position:absolute;inset:-15%;transform:perspective(500px) rotateY(-13deg) scale(1.16);
  background:repeating-linear-gradient(90deg,transparent 0 28px,#2b2b2f 29px,transparent 31px),
  repeating-linear-gradient(0deg,transparent 0 47px,#29292e 48px,transparent 50px)}
.mag-scene:before{content:"";position:absolute;inset:0 28% 0 12%;opacity:.9;clip-path:polygon(0 0,76% 0,100% 100%,0 100%);background:repeating-linear-gradient(90deg,#0a0a0d 0 19px,#38383c 20px 23px,#09090b 26px 34px)}
.mag-accent-square{position:absolute;right:15%;top:29%;width:105px;height:105px;background:rgba(238,41,54,.82);mix-blend-mode:screen}
.mag-scene-rule{position:absolute;inset:30px;border:1px solid #444448;opacity:.7}
.mag-art-quote{position:absolute;bottom:65px;left:30px;right:30px;padding:18px;background:#0b0b0de6;border-left:3px solid var(--ml-red);font:italic 20px/1.3 Georgia,serif}
.mag-art-cap{position:absolute;top:27px;left:29px;color:#d2ced0;font:600 10px monospace;letter-spacing:.12em}
.mag-art-foot{position:absolute;bottom:22px;left:30px;right:30px;display:flex;justify-content:space-between;font:600 10px monospace;color:#a2a0a3}
.mag-band{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid var(--ml-line);flex-wrap:wrap}
.mag-band strong{font:750 16px Arial,sans-serif}.mag-band span{font:600 10px monospace;letter-spacing:.08em;color:var(--ml-mute)}
.mag-timeline{display:grid;grid-template-columns:repeat(4,1fr);padding:33px 0 50px;border-bottom:1px solid var(--ml-line);position:relative}
.mag-timeline:before{content:"";position:absolute;left:5px;right:5px;top:44px;border-top:1px solid #66646a}
.mag-event{position:relative;margin-right:18px;padding:30px 11px 0 0}
.mag-event:before{content:"";position:absolute;left:0;top:7px;width:10px;height:10px;border-radius:50%;background:var(--ml-red);box-shadow:0 0 0 2px var(--ml-bg);border:1px solid var(--ml-ink)}
.mag-event time{display:block;color:var(--ml-red);font:800 13px Arial,sans-serif}
.mag-event h3{font:700 18px/1.2 Arial,sans-serif;margin:10px 0}
.mag-event p{font:400 13px/1.65 Arial,sans-serif;color:#bcb9bd}
.mag-event small{font:600 10px/1.5 monospace;text-transform:uppercase;color:#aaa8aa}
.research .section{margin:0!important;padding:65px 0!important;border-bottom:1px solid var(--ml-line)}
.research .section h2{font:700 clamp(34px,4.8vw,62px)/1.04 Georgia,serif;letter-spacing:-.045em;max-width:910px}
.research .section p{color:#c9c6c8;font-size:16px;line-height:1.8}
.research .section>.ey{margin-bottom:15px}
.research .finding{border-radius:0!important;background:#141416!important;border-color:#343438!important}
.research .finding b{color:var(--ml-red)!important}
.research .duo .stat{border-radius:0!important;background:#141416!important;border:1px solid var(--ml-line)}
.research .stat strong{color:var(--ml-red)!important;font-family:Georgia,serif;font-size:clamp(32px,4.5vw,55px)}
.research figure svg{width:100%;height:auto;max-height:unset}
.research .note{border-radius:0!important;background:#151416!important;border-left-color:var(--ml-red)!important}
.research .sources a{font:500 14px/1.6 Arial,sans-serif}
.mag-geo{display:grid;grid-template-columns:1.4fr .6fr;border:1px solid var(--ml-line);margin-top:24px}
.mag-geo-left{border-right:1px solid var(--ml-line);padding:25px;min-width:0}
.mag-geo-right{padding:27px}.mag-geo-right h3{font:700 19px Arial,sans-serif;margin:0 0 14px}
.mag-georow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:15px 0;border-bottom:1px solid var(--ml-line);font:500 12px Arial,sans-serif}
.mag-georow strong{font:700 14px Arial,sans-serif}
.mag-caption{font:500 11px/1.65 monospace;color:var(--ml-mute);margin:14px 0}
.mag-evidence{border-collapse:collapse;width:100%;font:400 13px/1.65 Arial,sans-serif;margin-top:28px}
.mag-evidence td,.mag-evidence th{text-align:left;padding:14px 9px 14px 0;border-bottom:1px solid var(--ml-line);vertical-align:top}
.mag-evidence th{color:var(--ml-mute);font:600 11px monospace;text-transform:uppercase}
.mag-evidence .confirmed{color:#f5f3ef;font-weight:700}.mag-evidence .preliminary{color:#d8bba4;font-weight:700}.mag-evidence .unknown{color:#99969b;font-weight:700}
.mag-conclusion{padding:65px 0;border-bottom:1px solid var(--ml-line);font:400 clamp(32px,5.5vw,68px)/1.12 Georgia,serif;letter-spacing:-.05em}
.mag-conclusion b{color:var(--ml-red);font-weight:400}
.research>.panel{border-radius:0!important;background:#141416!important}
@media(max-width:860px){.mag-hero{grid-template-columns:1fr}.mag-hero-copy{padding:42px 0}.mag-hero-art{min-height:310px;border:1px solid var(--ml-line)}.mag-timeline{grid-template-columns:repeat(2,1fr);gap:20px}.mag-timeline:before{display:none}.mag-event{border-top:1px solid #555258;padding-top:20px}.mag-event:before{top:-6px}.mag-geo{grid-template-columns:1fr}.mag-geo-left{border-right:0;border-bottom:1px solid var(--ml-line)}}
@media(max-width:550px){.mag-head-meta{display:none}.mag-hero h1{font-size:clamp(53px,12vw,80px)}.mag-event h3{font-size:15px}.mag-georow strong{font-size:12px}.mag-geo-left,.mag-geo-right{padding:14px}.research .section{padding:45px 0!important}}
</style>
"""

def _hero():
 return '''<div class="mag-header"><div class="mag-logo">LEIMAN <b>LAB.</b></div><div class="mag-head-meta">INDEPENDENT RESEARCH / FIELD REPORTS</div><div class="mag-micro">№ 002 — 29 OCT 2026</div></div>
 <section class="mag-hero">
  <div class="mag-hero-copy"><div class="mag-micro">SECURITY / AI AGENTS / INFRASTRUCTURE</div>
   <h1>После<br>чёрного<br><em>октября.</em></h1>
   <div class="mag-deck">Кто контролирует безопасность интернета в эпоху ИИ-агентов?</div>
   <div class="mag-subdeck">Большие платформы подвергаются атакам. Модели обнаруживают критические уязвимости. Агенты получают доступ к инструментам. Разбираем, что подтверждено, а что пока лишь гипотеза.</div>
   <div class="mag-band"><strong style="font-size:12px">ОКТЯБРЬ / 2026</strong><span>РЕДАКЦИОННЫЙ ЧЕРНОВИК · НЕ ОПУБЛИКОВАН</span></div>
  </div>
  <div class="mag-hero-art" aria-label="Абстрактное архитектурное изображение инфраструктуры">
   <div class="mag-scene"></div><div class="mag-accent-square"></div><div class="mag-scene-rule"></div>
   <div class="mag-art-cap">LEIMAN LAB / RESEARCH FIG. 002</div>
   <div class="mag-art-quote">Новый риск рождается на границе между информацией и правом действовать.</div>
   <div class="mag-art-foot"><span>SCHEMATIC ILLUSTRATION</span><span>MMXXVI</span></div>
  </div>
 </section>
 <div class="mag-band"><strong>Хронология последних событий</strong><span>ИСТОЧНИКИ: OPENAI · RAILWAY · ANTHROPIC</span></div>
 <div class="mag-timeline">
  <div class="mag-event"><time>25 СЕН</time><h3>Самораспространяющиеся prompt injection</h3><p>OpenAI показывает возможность репликации инъекций в симулированных вызовах инструментов.</p><small>Эксперимент, не инцидент</small></div>
  <div class="mag-event"><time>20–21 ОКТ</time><h3>Атака на инфраструктуру Railway</h3><p>Компания фиксирует попытки повышения привилегий и несанкционированный доступ к системам.</p><small>Подтверждено оператором</small></div>
  <div class="mag-event"><time>22 ОКТ</time><h3>Предварительный отчёт Railway</h3><p>Появляются сведения о затронутых секретах и предполагаемом интересе к ключам AI-провайдеров.</p><small>Предварительные данные</small></div>
  <div class="mag-event"><time>27 ОКТ</time><h3>Пять цепочек эксплуатации</h3><p>Anthropic публикует исследование критических уязвимостей, найденных с помощью внутренней модели.</p><small>Лабораторное исследование</small></div>
 </div>'''

def _geo():
 # Symbolic US silhouette, factually sourced loss totals by US state. No attack origins.
 outline="M55 110 L105 122 L143 133 L180 142 L224 150 L261 147 L304 147 L339 138 L378 133 L413 129 L448 120 L485 110 L521 102 L541 90 L556 95 L581 94 L594 109 L618 109 L630 125 L618 145 L623 163 L608 184 L602 208 L584 227 L564 224 L553 204 L535 189 L517 204 L507 227 L496 249 L474 249 L464 228 L446 228 L423 236 L407 253 L383 256 L354 255 L333 270 L316 259 L299 286 L268 272 L251 265 L235 299 L211 292 L191 272 L172 259 L161 235 L139 217 L124 198 L114 180 L103 160 L92 144 L80 135 Z"
 dots=[("CA",103,193),("TX",286,271),("FL",495,244),("NY",597,135),("NJ",573,156)]
 svg=['<svg viewBox="0 0 690 344" role="img" aria-label="Схематичная карта США с отмеченными пятью штатами с наибольшими зарегистрированными потерями по жалобам IC3 за 2025" style="width:100%;height:auto">',
      '<defs><pattern id="ml-map-lines" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7L7 0" stroke="#48464a" stroke-width=".6"/></pattern></defs>',
      '<path d="'+outline+'" fill="url(#ml-map-lines)" stroke="#7d7b80" stroke-width="1.4"/>']
 for label,x,y in dots:
  svg.append(f'<circle cx="{x}" cy="{y}" r="7" fill="#EE2936" stroke="#F5F3EF" stroke-width="1.1"/>')
  svg.append(f'<text x="{x}" y="{y-14 if label not in ("NY","NJ") else y+28}" text-anchor="middle" fill="#F5F3EF" font="700 15px Arial">{label}</text>')
 svg.append('<text x="17" y="326" fill="#AAA8AB" font-size="11">Условная схема, расположение ориентировочное · не география атак</text></svg>')
 states=[("Калифорния","3,675"),("Техас","1,826"),("Флорида","1,596"),("Нью-Йорк","1,226"),("Нью-Джерси","0,660")]
 rows=''.join(f'<div class="mag-georow"><span>{name}</span><strong>{n} млрд USD</strong></div>' for name,n in states)
 return '<section class="section"><div class="ey">03 / География заявленных финансовых потерь</div><h2>Где пострадавшие сообщали об ущербе</h2><p>Эта карта показывает пять штатов с наибольшими заявленными потерями в 2025 году. Она не показывает местонахождение злоумышленников и не является картой AI-атак.</p><div class="mag-geo"><div class="mag-geo-left"><div class="mag-micro">FIG. 03 / UNITED STATES / FBI IC3 2025</div>'+''.join(svg)+'</div><div class="mag-geo-right"><h3>Пятёрка штатов</h3>'+rows+'<p class="mag-caption">Источник: FBI IC3, Annual Report 2025, стр. 29, таблица States by Complaint Loss.</p></div></div></section>'

def _evidence():
 rows=[
 ("Системы Railway были скомпрометированы","Railway, 22 октября","Подтверждено","confirmed"),
 ("Целью атакующих могли быть ключи AI-провайдеров","Railway, предварительная версия","Предварительно","preliminary"),
 ("Атаку Railway выполнил автономный ИИ","Независимые доказательства отсутствуют","Не установлено","unknown"),
 ("В тесте возможно самораспространение prompt injection","OpenAI, 25 сентября","Подтверждено в тесте","confirmed"),
 ("Модели способны находить сложные цепочки уязвимостей","Anthropic, 27 октября","Подтверждено в исследовании","confirmed"),
 ]
 tr=''.join(f'<tr><td>{a}</td><td>{b}</td><td class="{d}">{c}</td></tr>' for a,b,c,d in rows)
 return '<section class="section"><div class="ey">05 / Эпистемическая карта</div><h2>Что мы знаем, а что нет</h2><p>В исследованиях кибербезопасности принципиально важно не выдавать гипотезы за установленные факты.</p><table class="mag-evidence"><thead><tr><th>Тезис</th><th>Основание</th><th>Статус</th></tr></thead><tbody>'+tr+'</tbody></table></section>'

def article_html(pid):
 old=original_article(pid)
 start=old.index('<article class="research">')
 first=old.index(' <section class="section">',start)
 old=old[:start]+'<article class="research">'+_hero()+old[first:]
 old=old.replace('<section class="section"><div class="ey">03 / Новая граница',_geo()+'<section class="section"><div class="ey">04 / Новая граница',1)
 old=old.replace('<section class="section sources">',_evidence()+'<div class="mag-conclusion">Безопасность перестаёт быть только защитой от вредоносного кода. <b>Она становится архитектурой доверия.</b></div><section class="section sources">',1)
 # Match the actual black-red brand without introducing decorative neon.
 for src,dst in {"#ff8790":"#EE2936","#dd7984":"#EE2936","#ff9ea5":"#EE2936","#ff8c96":"#EE2936","#17171d":"#0B0B0D","#f2929e":"#EE2936","#F5F3EF":"#F5F3EF"}.items():
  old=old.replace(src,dst)
 return MAGAZINE_CSS+old
