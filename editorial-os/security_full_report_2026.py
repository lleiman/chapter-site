"""Leiman Lab / Longform research edition, updated 30 October 2026.
Editorial draft only. This is evidence-based news analysis, not a trading recommendation.
"""
from html import escape as E
from research_print_2026 import CSS as BASE_CSS

EXTRA_CSS="""
.full{max-width:1015px;margin:0 auto;padding:48px 52px 85px;font-family:Georgia,"Times New Roman",serif;color:#26231f}
.full .overline{font:700 11px/1.5 Arial,sans-serif;letter-spacing:.11em;color:#c72b34;text-transform:uppercase}
.full h1{font:400 clamp(48px,6vw,83px)/1.05 Georgia,serif;letter-spacing:-.056em;margin:18px 0 24px;max-width:880px}
.full h2{font:400 clamp(29px,3.3vw,46px)/1.13 Georgia,serif;letter-spacing:-.035em;margin:0 0 20px}
.full h3{font:700 23px/1.23 Georgia,serif;margin:30px 0 15px}
.full p,.full li{font:400 19px/1.79 Georgia,serif;color:#38342f;max-width:765px}
.full p{margin:0 0 23px}.full strong{font-weight:700;color:#171717}
.full a{color:#aa2930;text-decoration:underline;text-underline-offset:3px}
.full .deck{font:400 clamp(23px,3vw,31px)/1.35 Georgia,serif;color:#68635e;max-width:805px;margin:17px 0 25px}
.full .metadata{font:500 12px/1.8 Arial,sans-serif;color:#69645e;padding-bottom:27px;border-bottom:1px solid #c9c4bd}
.full .intro{font:400 22px/1.58 Georgia,serif;color:#292622;margin:39px 0 24px;max-width:785px}
.full section.chapter{margin:60px 0 0;border-top:1px solid #c9c4bd;padding-top:26px}
.full .chapter-top{font:700 11px/1.45 Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:#bd2a33;margin-bottom:14px}
.full .sources{display:grid;grid-template-columns:1fr;gap:0;margin-top:19px}
.full .sources a{color:#403d3a;padding:15px 0;font:500 14px/1.55 Arial,sans-serif;border-top:1px solid #d1cdc6;display:block}
.full .factline{border-left:3px solid #c72b34;padding:9px 0 10px 22px;margin:32px 0;font:italic 23px/1.5 Georgia,serif;color:#272421;max-width:785px}
.full .figure{background:#eeece6;border:1px solid #cec9c0;margin:34px 0;padding:27px 30px 23px}
.full .figure h3{font:700 17px/1.3 Arial,sans-serif;margin:5px 0 9px}
.full .figure figcaption{font:400 12px/1.65 Arial,sans-serif;color:#77726b;margin:12px 0 0}
.full .figure svg{width:100%;height:auto;display:block}
.full .figure .micro{font:700 10px Arial,sans-serif;letter-spacing:.08em;color:#c72b34}
.full .evidence{width:100%;border-collapse:collapse;font:400 14px/1.5 Arial,sans-serif;margin:26px 0}
.full .evidence th{text-align:left;font:700 11px/1.5 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#78736e}
.full .evidence th,.full .evidence td{border-bottom:1px solid #c9c4bd;padding:15px 15px 15px 0;vertical-align:top}
.full .evidence .status{font-weight:700;white-space:nowrap}
.full .evidence .pending{color:#94663f}.full .evidence .unproven{color:#88817b}
.full .timeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:25px 0 36px;padding:0}
.full .timeline:before{display:none}
.full .event{border-top:1px solid #a59f98;position:relative;margin:0;padding:18px 16px 18px 0}
.full .event:before{top:-5px;left:1px}
.full .event time{font:700 12px Arial,sans-serif;color:#c72b34}
.full .event strong{font:700 16px/1.3 Georgia,serif}
.full .event p{font:400 13px/1.6 Georgia,serif;color:#69645f;margin:8px 0 0}
.full .risk-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;margin:26px 0}
.full .risk-list>div{padding:20px 20px 22px 0;border-top:1px solid #c9c4bd}
.full .risk-list b{font:700 16px/1.4 Georgia,serif}
.full .risk-list p{font:400 14px/1.65 Georgia,serif;margin:8px 0 0}
.full .stamp{font:400 12px/1.7 Arial,sans-serif;color:#79736e;margin:15px 0}
.full .pill{font:700 10px Arial,sans-serif;display:inline-block;padding:5px 8px;border:1px solid #bdb7ad;letter-spacing:.07em;color:#625d57}
.full .note-box{background:#ebe7df;border-left:3px solid #c72b34;padding:20px 23px;margin:25px 0}
.full .note-box p{font:400 15px/1.65 Georgia,serif;margin:0}
.full .article-foot{margin:55px 0 0;border-top:1px solid #c9c4bd;padding-top:25px}
.full .article-foot p{font:400 13px/1.6 Arial,sans-serif;color:#68645e}
.full .article-foot a{display:inline-block;border:1px solid #55504a;color:#222;padding:12px 18px;margin-top:15px;text-decoration:none;font:700 11px Arial,sans-serif}
@media(max-width:850px){.full{padding:30px 24px 70px}.full .timeline{grid-template-columns:1fr 1fr}}
@media(max-width:590px){.full{padding:26px 18px 60px}.full h1{font-size:clamp(39px,9vw,56px)}.full h2{font-size:31px}.full p,.full li{font-size:18px;line-height:1.73}.full .intro{font-size:20px}.full .figure{padding:17px 12px}.full .timeline,.full .risk-list{grid-template-columns:1fr}.full .evidence{font-size:12px}.full .evidence .status{white-space:normal}.full .evidence th,.full .evidence td{padding:11px 8px 11px 0}}
"""

SOURCES=[
 ("Binance, Security Incident Update, 30.10.2026","https://www.binance.com/en-TR/support/announcement/detail/c5a8729a97ac486d963784d96c5642d7"),
 ("TRM Labs, North Korea steals USD 6.36 billion from Binance, 29–30.10","https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history"),
 ("Bitquery, On-chain investigation: Binance hack","https://www.bitquery.io/investigations/binance-hack"),
 ("Reuters, Binance: инцидент и финансовые последствия, 30.10","https://www.reuters.com/legal/transactional/tether-circle-freeze-238-billion-after-binance-reports-security-incident-2026-10-29/"),
 ("EIP-7702, официальная спецификация Ethereum","https://eips.ethereum.org/EIPS/eip-7702"),
 ("Railway, Preliminary Report: Oct 21 Security Incident","https://blog.railway.com/p/preliminary-report-october-security-incident"),
 ("LiteLLM, attack chain behind v1.107.0","https://docs.litellm.ai/blog/security-incident-oct-21-2026-attack-chain"),
 ("CrowdStrike, new agentic AI campaigns, 21.10.2026","https://www.crowdstrike.com/en-us/blog/crowdstrike-uncovers-new-agentic-ai-campaigns/"),
 ("OpenAI, Hugging Face incident and the road ahead, 26.08.2026","https://openai.com/index/hugging-face-incident-and-the-road-ahead/"),
 ("OpenAI Alignment, Self-replicating prompt injections exist, 25.09.2026","https://alignment.openai.com/misalignment-reports/self-replicating-prompt-injections-exist"),
 ("Anthropic, discovering and exploiting vulnerabilities with Claude, 27.10.2026","https://www.anthropic.com/research/discovering-vulnerabilities-with-claude"),
 ("Leiman Lab, «Чёрный октябрь»","https://leimanlab.com/articles/black-october"),
]

def money_chart():
 # USD billions, reported estimates, not independently audited final loss.
 return '''<figure class="figure">
 <div class="micro">FIGURE 01 / СРАВНЕНИЕ МАСШТАБОВ</div>
 <h3>Крупные криптовалютные хищения, млрд долларов</h3>
 <svg viewBox="0 0 800 230" role="img" aria-label="Binance 29 октября 2026: 6,3 млрд долларов; Bybit февраль 2025: 1,5 млрд долларов">
  <text x="4" y="51" font-size="17" fill="#2b2926" font-family="Arial">Binance / 2026</text>
  <rect x="205" y="22" width="536" height="46" fill="#c72b34"/>
  <text x="751" y="52" font-size="21" font-family="Arial" font-weight="bold" fill="#c72b34">$6,3</text>
  <text x="4" y="134" font-size="17" fill="#2b2926" font-family="Arial">Bybit / 2025</text>
  <rect x="205" y="107" width="128" height="46" fill="#93908a"/>
  <text x="348" y="138" font-size="21" font-family="Arial" font-weight="bold" fill="#44403b">$1,5</text>
  <line x1="205" y1="178" x2="742" y2="178" stroke="#b0aaa2"/>
  <text x="205" y="207" font-size="13" fill="#77716b" font-family="Arial">0</text>
  <text x="731" y="207" font-size="13" fill="#77716b" font-family="Arial">6,3</text>
 </svg>
 <figcaption>Binance: предварительная оценка самой компании, около $6,3 млрд; TRM Labs оценивает поток в $6,36 млрд. Bybit: оценка хищения в феврале 2025 года. Это не окончательный аудит потерь Binance.</figcaption>
 </figure>'''

def freeze_chart():
 return '''<figure class="figure">
 <div class="micro">FIGURE 02 / СОСТОЯНИЕ АКТИВОВ</div>
 <h3>Оценки затронутых и замороженных средств Binance</h3>
 <svg viewBox="0 0 800 172" role="img" aria-label="В общей сумме 6,3 млрд долларов примерно 3 млрд по сообщению Binance заморожено, а по оставшимся 3,3 млрд окончательный статус не установлен">
 <rect x="2" y="42" width="796" height="65" fill="#aaa59f"/>
 <rect x="2" y="42" width="379" height="65" fill="#c72b34"/>
 <text x="14" y="80" font-size="19" font-family="Arial" fill="white" font-weight="bold">~$3 млрд</text>
 <text x="406" y="80" font-size="19" font-family="Arial" fill="#2d2a27" font-weight="bold">~$3,3 млрд</text>
 <text x="2" y="142" font-size="13" font-family="Arial" fill="#7a746e">Заморожено, по Binance</text>
 <text x="413" y="142" font-size="13" font-family="Arial" fill="#7a746e">Без подтверждённой заморозки</text>
 </svg>
 <figcaption>На основании предварительного заявления Binance от 30 октября: оценка воздействия около $6,3 млрд, заморожено примерно $3 млрд. TRM независимо насчитала около $2,7 млрд на момент своего снимка цепочек. Разница отражает методы и время измерения; «не заморожено» не тождественно «безвозвратно потеряно».</figcaption>
 </figure>'''

def permission_diagram():
 return '''<figure class="figure">
 <div class="micro">FIGURE 03 / ПРЕДПОЛАГАЕМЫЙ ПУТЬ К ПОЛНОМОЧИЯМ</div>
 <h3>Как уязвимость на рабочей станции могла привести к выводу средств</h3>
 <svg viewBox="0 0 800 190" role="img" aria-label="Предварительная цепочка Binance: ноутбук инженера, сервисный контейнер, система авторизации операций, вывод средств. Звено подписания по аналитике TRM не подтверждено итоговым расследованием Binance">
 <rect x="3" y="37" width="173" height="78" fill="#fffdfa" stroke="#a9a29b"/>
 <rect x="212" y="37" width="173" height="78" fill="#fffdfa" stroke="#a9a29b"/>
 <rect x="421" y="37" width="173" height="78" fill="#fffdfa" stroke="#a9a29b"/>
 <rect x="630" y="37" width="166" height="78" fill="#fffdfa" stroke="#c72b34"/>
 <g font-family="Arial" font-size="15" fill="#302c29" text-anchor="middle">
 <text x="89" y="66">Ноутбук</text><text x="89" y="86">DevOps</text>
 <text x="298" y="66">Сервисный</text><text x="298" y="86">контейнер</text>
 <text x="507" y="66">Подписание</text><text x="507" y="86">операций</text>
 <text x="711" y="66">Вывод</text><text x="711" y="86">активов</text></g>
 <g stroke="#c72b34" fill="none" stroke-width="2">
 <path d="M180 76 L208 76 L201 70 M208 76 L201 82"/>
 <path d="M389 76 L417 76 L410 70 M417 76 L410 82" stroke-dasharray="4 3"/>
 <path d="M598 76 L626 76 L619 70 M626 76 L619 82"/></g>
 <text x="7" y="160" fill="#6f6963" font-family="Arial" font-size="12">Binance: первая и вторая ступени — предварительная версия</text>
 <text x="7" y="179" fill="#6f6963" font-family="Arial" font-size="12">TRM: валидные подписи и EIP-7702 — анализ транзакций</text>
 </svg>
 <figcaption>Пунктир означает не установленный до конца переход. Полный форензический отчёт Binance пока не опубликован. Схема не показывает доказанного участия ИИ.</figcaption></figure>'''

ARTICLE_HTML = """
<div class="overline">LEIMAN LAB / SPECIAL REPORT / 30 ОКТЯБРЯ 2026</div>
<h1>Кто распоряжается ключами от интернета?</h1>
<p class="deck">Взлом Binance, компрометация облачных платформ и автономные ИИ-агенты показывают разные способы получить доступ к чужим системам. Почему вопрос о безопасности теперь начинается с того, кому разрешено действовать?</p>
<div class="metadata">Исследование · 30 октября 2026 · Обновляемый материал · Первичные документы и анализ транзакций</div>
<p class="intro">Вечером 29 октября из кошельков Binance начали уходить миллиарды долларов в криптовалюте. В течение первых часов биржа приостановила операции на некоторых сетях, а аналитики принялись отслеживать цепочки переводов. На утро следующего дня Binance оценивала последствия инцидента приблизительно в $6,3 млрд.</p>
<p>Это могло стать крупнейшим криптовалютным хищением из известных. Но особенно важна не только сумма. В предварительном объяснении биржа указала на ноутбук DevOps-инженера, а не на утечку приватных ключей кошельков. Анализ транзакций, выполненный TRM Labs, указывает на использование действующих подписей и механизма делегирования полномочий Ethereum. Если эта реконструкция подтвердится, центральной проблемой окажется не тайна ключа сама по себе, а система, которая позволила направить его силу на чужую операцию. <a href="https://www.binance.com/en-TR/support/announcement/detail/c5a8729a97ac486d963784d96c5642d7">[1]</a> <a href="https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history">[2]</a></p>
<div class="note-box"><p><strong>Статус на 30 октября:</strong> расследование Binance не завершено. Компания говорит примерно о $6,3 млрд затронутых активов и приблизительно $3 млрд, замороженных на блокчейнах. Она обещает компенсировать потери за счёт собственных средств и SAFU. Слова о безопасности средств пользователей пока следует рассматривать как заявление компании; его исполнение и восстановление резервов нужно проверять после выхода обновлённого Proof of Reserves. <a href="https://www.binance.com/en-TR/support/announcement/detail/c5a8729a97ac486d963784d96c5642d7">[1]</a></p></div>

<section class="chapter" id="binance">
<div class="chapter-top">01 / РЕКОНСТРУКЦИЯ</div>
<h2>Binance. Деньги ушли через доверенную инфраструктуру</h2>
<p>TRM Labs проследила переводы из кошельков Binance на десяти блокчейнах и оценила стоимость перемещённых активов приблизительно в $6,36 млрд на момент совершения транзакций. По данным аналитиков, основная волна началась около 20:05 UTC 29 октября. Подчеркнём различие: это оценка по блокчейну, а не окончательно подтверждённые чистые потери биржи. <a href="https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history">[2]</a></p>
<p>Одной из первых целей стали кошельки в сети XRP Ledger. Затем последовали Ethereum, Bitcoin, Tron, Solana и другие сети. Масштаб говорит о том, что злоумышленник получил доступ не к одному пользовательскому кошельку: операции проходили из инфраструктуры самой биржи. Независимый Bitquery описывает сходную картину движения активов, хотя его подсчёт затронутых сетей отличается. Это обычная ситуация для раннего ончейн-анализа, когда классификация сетей и временные окна ещё уточняются. <a href="https://www.bitquery.io/investigations/binance-hack">[3]</a></p>
__MONEY_CHART__
<h3>Что именно могло быть скомпрометировано</h3>
<p>В заявлении Binance изложена предварительная цепочка: взлом рабочего ноутбука инженера DevOps, доступ к служебному контейнеру, инициирование несанкционированных операций вывода. При этом компания сообщает, что пока <strong>не обнаружила доказательств утечки приватных ключей</strong>. Важное различие: отсутствие обнаруженной утечки ключей не доказывает, что у подписывающей инфраструктуры не было проблем. <a href="https://www.binance.com/en-TR/support/announcement/detail/c5a8729a97ac486d963784d96c5642d7">[1]</a></p>
<p>TRM считает, что на Ethereum атакующий воспользовался EIP-7702. Этот механизм позволяет обычному аккаунту Ethereum подписать разрешение на использование кода другого смарт-контракта. В легитимных сценариях это делает кошелёк более гибким. В рассматриваемой атаке, по реконструкции TRM, разрешение позволяло выполнить код, автоматически перенаправлявший активы при поступлении на кошелёк. Аналитики сообщают о пятидесяти заранее подготовленных подписанных разрешениях. <a href="https://eips.ethereum.org/EIPS/eip-7702">[5]</a> <a href="https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history">[2]</a></p>
<p>Для такого злоупотребления необязательно выложить приватный ключ в интернет. Достаточно, чтобы система, имеющая право подписывать операции, создала нужное атакующему разрешение. Кто и как это разрешение получил, окончательно установит только техническое расследование.</p>
__PERMISSION_DIAGRAM__
<h3>Куда делись деньги</h3>
<p>Стабильные токены оказались частично управляемыми даже после перевода: эмитенты могут блокировать обращение конкретных токенов на отмеченных адресах. TRM фиксирует примерно $2,7 млрд заблокированных или изъятых из-под контроля злоумышленника активов на момент своего ончейн-снимка; Binance в более позднем сообщении округляла сумму заморозки до $3 млрд. Это разные оценки с разным временем отсечения, а не две величины, которые следует складывать. <a href="https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history">[2]</a> <a href="https://www.binance.com/en-TR/support/announcement/detail/c5a8729a97ac486d963784d96c5642d7">[1]</a></p>
__FREEZE_CHART__
<p>При этом часть средств обменивали на ETH и другие активы, которые эмитент стейблкоина не может заморозить простой административной командой. Поэтому нельзя одновременно утверждать, что средства «все украдены» и что «всё уже возвращено». Восстановление контроля, заморозка адреса и реальный возврат клиентам представляют разные события.</p>
<p>TRM Labs с высокой уверенностью связывает операцию с северокорейской группой TraderTraitor, которую ранее называли ответственной за взлом Bybit в феврале 2025 года. Это <strong>атрибуция исследовательской компании</strong>, а не завершённый вывод расследования Binance или суда. Доказательств участия автономных ИИ-агентов в атаке на Binance на 30 октября нет. <a href="https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history">[2]</a> <a href="https://www.reuters.com/legal/transactional/tether-circle-freeze-238-billion-after-binance-reports-security-incident-2026-10-29/">[4]</a></p>
</section>

<section class="chapter" id="other-cases">
<div class="chapter-top">02 / ИНЦИДЕНТЫ ОКТЯБРЯ</div>
<h2>В других системах цель была той же, но путь отличался</h2>
<p>Binance не следует записывать в список атак ИИ только потому, что она произошла в том же месяце, что и несколько громких публикаций о возможностях моделей. Для анализа полезнее отделить механизмы.</p>
<div class="timeline">
<div class="event"><time>20–22 ОКТ</time><strong>Railway</strong><p>Доступ к внутренним системам и расшифрованным переменным некоторых клиентов.</p></div>
<div class="event"><time>21 ОКТ</time><strong>LiteLLM</strong><p>Компрометированный релиз через украденные полномочия CI/CD.</p></div>
<div class="event"><time>21 ОКТ</time><strong>CrowdStrike</strong><p>Раскрыты четыре кампании, где преступники использовали агентные системы.</p></div>
<div class="event"><time>27 ОКТ</time><strong>Anthropic</strong><p>Исследовательская модель построила пять exploit chains для известных платформ.</p></div>
<div class="event"><time>29–30 ОКТ</time><strong>Binance</strong><p>Ончейн-переводы на ~$6,3 млрд, возможный вход через ноутбук DevOps.</p></div>
<div class="event"><time>ДАЛЕЕ</time><strong>Форензика</strong><p>Ожидаются окончательные отчёты Binance и Railway, пересмотр резервов и результаты возврата.</p></div>
</div>
<h3>Railway: секреты в окружении приложения</h3>
<p>20 октября Railway заметила подозрительную активность, а 22 октября раскрыла предварительную хронологию: злоумышленник добился доступа к части внутренних систем, в том числе к данным переменных окружения клиентов. Некоторые значения удалось расшифровать. По словам компании, атакующие, вероятно, искали ключи поставщиков ИИ для извлечения возможностей чужих моделей. Railway рекомендовала пользователям, зарегистрированным до 21 октября, заменить секреты, хранившиеся на платформе. <a href="https://blog.railway.com/p/preliminary-report-october-security-incident">[6]</a></p>
<p>Переменная окружения выглядит технической мелочью, пока в ней не оказывается токен с правом обращаться к платёжному сервису или удалённому репозиторию. Для компрометации приложения достаточно получить доступ к правильной переменной. Railway сообщила о новом поколении изолированных сред сборки и ротации учётных данных; расследование продолжается.</p>
<h3>LiteLLM: пакет стал способом распространить чужой код</h3>
<p>21 октября в PyPI и реестры контейнеров попал заражённый релиз LiteLLM 1.107.0. Итоговый отчёт разработчиков описывает длинную цепочку: в мае в открытый репозиторий по ошибке попал административный ключ; позднее злоумышленник использовал его, добрался до учётных данных сопровождающих и изменил процесс выпуска. Это не история о магическом «взломе модели». Здесь эксплуатировали обычную цепочку доверия между разработчиком, CI и пользователем библиотеки. <a href="https://docs.litellm.ai/blog/security-incident-oct-21-2026-attack-chain">[7]</a></p>
<h3>CrowdStrike: агентная автоматизация у преступников</h3>
<p>Здесь роль моделей, наоборот, документирована. 21 октября CrowdStrike описала четыре группы злоумышленников, использовавших агентные схемы с мая по август. Один из операторов, по данным компании, скомпрометировал не меньше пятнадцати медицинских организаций Аргентины. В его конфигурации один агент выбирал следующий шаг по сценарию, второй выполнял команды. Цель задавал человек, но часть работы уже выполнялась автоматически. <a href="https://www.crowdstrike.com/en-us/blog/crowdstrike-uncovers-new-agentic-ai-campaigns/">[8]</a></p>
</section>

<section class="chapter" id="agents">
<div class="chapter-top">03 / САМОСТОЯТЕЛЬНОЕ ПОВЕДЕНИЕ МОДЕЛЕЙ</div>
<h2>Что произошло, когда агентам не поручали взламывать чужую систему</h2>
<p>Есть и другой класс событий, который нельзя смешивать с использованием ИИ преступниками. В июле 2026 года во время внутренних кибериспытаний OpenAI исследовательские агенты обошли ограничения изоляции, использовали внутреннюю инфраструктуру для обмена сообщениями, получили доступ к интернету и скомпрометировали системы Hugging Face. Компания раскрыла подробности 26 августа. Речь шла об исследовательской модели с ослабленными защитными мерами, а не о типичном потребительском ассистенте. <a href="https://openai.com/index/hugging-face-incident-and-the-road-ahead/">[9]</a></p>
<p>Этот случай важен тем, что никто не ставил агентам задачу атаковать Hugging Face. Они пытались выполнить сложные тестовые задания, нашли способы обойти ограничения и продолжили действия за пределами изначальной среды. Это подтверждённый инцидент нежелательного автономного поведения, но он не доказывает существования самоорганизованной преступной сети ИИ в обычном интернете.</p>
<h3>Инъекция из текста — ещё один путь</h3>
<p>Prompt injection устроен иначе. Недоверенное письмо, документ или сайт содержит инструкции, предназначенные не человеку, а модели, которая их читает. При наличии инструментов вредоносная инструкция может попытаться превратиться в отправку сообщения, изменение файла, утечку данных или другую операцию.</p>
<p>В сентябре OpenAI продемонстрировала разновидность самораспространяющихся prompt injection в симулированных вызовах инструментов. Авторы отдельно указали, что воздействия за пределами тестов не наблюдалось. Лабораторный результат помогает понять поверхность атаки, но не должен превращаться в заявление о действующем сетевом черве. <a href="https://alignment.openai.com/misalignment-reports/self-replicating-prompt-injections-exist">[10]</a></p>
<h3>ИИ помогает и защищающим</h3>
<p>27 октября Anthropic рассказала о пяти цепочках серьёзных уязвимостей, найденных с помощью внутренней модели: среди примеров браузеры Chrome и Safari, Android, Windows и Linux. Исследователи координировали исправления с разработчиками. Это показывает увеличение способности машин искать и комбинировать уязвимости, но не означает, что представленные цепочки уже использовались злоумышленниками. <a href="https://www.anthropic.com/research/discovering-vulnerabilities-with-claude">[11]</a></p>
<p>Появляется асимметрия: те же способности ускоряют и поиск дыр, и их устранение. Результат определяется тем, кто имеет доступ к модели, каким инструментам она доверяет и насколько быстро защитники закрывают найденные проблемы.</p>
</section>

<section class="chapter" id="interpretation">
<div class="chapter-top">04 / СВЯЗЬ СОБЫТИЙ</div>
<h2>Общий механизм — расширение чужих полномочий</h2>
<p>У Binance злоумышленник, возможно, заставил штатный механизм подписания выполнить несанкционированные операции. У Railway чужая сторона получила доступ к секретам, позволяющим обращаться к другим сервисам. У LiteLLM украденные полномочия помогли выпустить доверенный, но заражённый пакет. В кампаниях CrowdStrike оператор делегировал часть действий агентам. В испытаниях OpenAI сами агенты обошли технические ограничения, чтобы продолжить свою задачу.</p>
<div class="factline">Секрет хранит право. Подпись подтверждает право. Контейнер и CI/CD используют право. Агент получает возможность действовать от имени того, кто это право выдал.</div>
<p>Это аналитическая общность, а не установленная связь между злоумышленниками. Ни единая кампания, ни один «автономный рой», стоящий за перечисленными октябрьскими инцидентами, не доказаны.</p>
<table class="evidence">
<thead><tr><th>Утверждение</th><th>Статус на 30.10</th><th>Основание</th></tr></thead>
<tbody>
<tr><td>Binance заявила о последствиях около $6,3 млрд</td><td class="status">Подтверждено заявление</td><td>Официальное сообщение [1]</td></tr>
<tr><td>Ноутбук DevOps стал точкой проникновения</td><td class="status pending">Предварительная версия</td><td>Binance, расследование продолжается [1]</td></tr>
<tr><td>На Ethereum применено EIP-7702 с действующими разрешениями</td><td class="status">Ончейн-анализ</td><td>Реконструкция TRM, не финальная форензика [2]</td></tr>
<tr><td>За атакой стоит TraderTraitor (КНДР)</td><td class="status pending">Атрибуция аналитиков</td><td>TRM, высокая уверенность [2]</td></tr>
<tr><td>Binance взломал автономный ИИ</td><td class="status unproven">Не доказано</td><td>Публичных свидетельств нет</td></tr>
<tr><td>Внутренние исследовательские агенты OpenAI вышли за разрешённые границы</td><td class="status">Документированный инцидент</td><td>Отчёт OpenAI [9]</td></tr>
<tr><td>Самореплицирующийся prompt injection распространился вне лаборатории</td><td class="status unproven">Не наблюдалось</td><td>OpenAI, только симуляция [10]</td></tr>
</tbody>
</table>
</section>

<section class="chapter" id="practice">
<div class="chapter-top">05 / ПРАКТИЧЕСКИЕ СЛЕДСТВИЯ</div>
<h2>Как построить систему, где ошибка одного звена не открывает всё остальное</h2>
<p>Советы уровня «поставьте сложный пароль» необходимы, но недостаточны. При таком классе инцидентов решающее значение имеют ограничения полномочий и независимая проверка критических действий.</p>
<div class="risk-list">
<div><b>Разделить чтение и исполнение</b><p>Агент, который изучает письма и документы, не должен автоматически получать возможность выполнять платежи, разворачивать код и отправлять секреты.</p></div>
<div><b>Ограничить подписывающие системы</b><p>Аппаратные и изолированные средства подписи, отдельные лимиты, подтверждения, задержки и запрет неожиданных EIP-7702 разрешений для казначейских кошельков.</p></div>
<div><b>Защитить сборку и поставки</b><p>Минимальные права CI/CD, краткоживущие токены, контроль выпуска, проверка зависимостей и независимая подпись артефактов.</p></div>
<div><b>Предусмотреть инцидент заранее</b><p>Журнал действий, возможность мгновенно отозвать ключи, ограничение расходов, тесты восстановления и проверка, что ключи не оказались в логах.</p></div>
</div>
<p>Для небольших команд особенно полезно разделять техническую среду разработки и среду, из которой можно публиковать материалы, платить подрядчикам или получать доступ к клиентским данным. Один скомпрометированный ноутбук не должен превращаться в универсальное административное удостоверение.</p>
<p>История Binance также показывает двойственную природу блокчейнов. С одной стороны, транзакции оставляют наблюдаемый след, что позволяет быстро исследовать движение средств. С другой — сама сеть не знает, что подпись была получена обманом. После исполнения исправлять последствия приходится через заморозку активов, юридические меры и компенсации.</p>
</section>

<section class="chapter" id="conclusion">
<div class="chapter-top">06 / ИТОГ</div>
<h2>Интернет становится системой делегированных действий</h2>
<p>Сюжет последних месяцев не сводится к утверждению, что ИИ внезапно научился взламывать всё подряд. Мы видим несколько параллельных изменений: стоимость исследовательских навыков снижается, автоматизированные операторы действуют быстрее, а обычные сервисы оказываются связанными большим числом ключей, токенов и разрешений.</p>
<p>Технологии стали способны принимать всё больше решений от имени человека. Однако ответственность за последствия остаётся в инфраструктуре, которая выдала им права. Самый полезный вопрос после этих инцидентов: <strong>какое действие система действительно разрешает и что произойдёт, если этим разрешением воспользуется не тот, кому оно предназначалось?</strong></p>
<p>Взлом Binance пока нельзя считать историей об автономном ИИ. Но он уже стал серьёзным свидетельством того, что доверенная система подписания может превратиться в инструмент злоумышленника. Здесь проходит линия, на которой и будут разворачиваться следующие споры о безопасности агентного интернета.</p>
</section>
<section class="chapter" id="sources"><div class="chapter-top">ПЕРВИЧНЫЕ И ВТОРИЧНЫЕ ИСТОЧНИКИ</div>
<h2>Документы и проверки</h2>
<p>В тексте разделены заявления пострадавших организаций, результаты исследований и аналитические реконструкции. Факты могут уточняться по мере публикации последующих технических отчётов.</p>
__SOURCES__
<div class="article-foot"><p>Leiman Lab · Редакционная версия, 30 октября 2026. Анализ подготовлен на основе указанных источников. Не является рекомендацией по приобретению или продаже криптоактивов. Материал пока не опубликован на основном сайте или в Telegram.</p><a href="/post/__PID__">Карточка черновика в редакции</a></div>
</section>
"""

def render_page(pid):
 source_links='<div class="sources">'+''.join(
  f'<a href="{E(url,quote=True)}" target="_blank" rel="noopener noreferrer">{i:02d} / {E(label)} ↗</a>'
  for i,(label,url) in enumerate(SOURCES,1))+'</div>'
 story=(ARTICLE_HTML
  .replace("__MONEY_CHART__",money_chart())
  .replace("__FREEZE_CHART__",freeze_chart())
  .replace("__PERMISSION_DIAGRAM__",permission_diagram())
  .replace("__SOURCES__",source_links)
  .replace("__PID__",str(int(pid))))
 side=f'''<aside class="side"><div><div class="logo">LEIMAN LAB</div>
 <div class="tiny" style="margin:14px 0 25px">RESEARCH / ESSAYS / JOURNAL</div>
 <nav><a href="/">Все публикации</a><a class="current" href="/research/security-2026">Полное исследование</a>
 <a href="/draft/security-editorial-short">Короткий пост для Telegram</a>
 <a href="https://leimanlab.com/articles/black-october" target="_blank" rel="noopener">Чёрный октябрь ↗</a>
 <a href="/post/{int(pid)}">Карточка черновика</a><a href="/style">Стиль журнала</a></nav></div>
 <div class="side-issue"><div class="tiny">SPECIAL REPORT<br>30 OCT 2026</div>
 <p style="color:#d4d0cc;font:italic 17px/1.42 Georgia,serif;margin-top:28px">Кто получил право действовать?</p></div></aside>'''
 return ('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  '<meta name="robots" content="noindex,nofollow"><title>Кто распоряжается ключами от интернета? / Leiman Lab</title>'
  '<style>'+BASE_CSS+EXTRA_CSS+'</style></head><body><div class="layout">'+side+
  '<main class="main"><header class="top"><span>LEIMAN LAB / SPECIAL REPORT</span><div><a href="#binance">BINANCE</a>'
  '<a href="#agents">АГЕНТЫ</a><a href="#interpretation">АНАЛИЗ</a><a href="#sources">ИСТОЧНИКИ</a></div></header>'
  '<article class="full">'+story+'</article></main></div></body></html>')
