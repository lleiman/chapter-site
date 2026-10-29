"""Visual research draft for ADEPTS Editorial; source reviewed 2026-10-29."""
from html import escape as E

ARTICLE_TITLE="После «Чёрного октября»: безопасность интернета в 2026"
ARTICLE_BODY="""После «Чёрного октября»: безопасность интернета в 2026

29 октября 2026. Новый исследовательский материал Leiman Lab.

В октябре раскрыли несколько проблем с инфраструктурой вокруг ИИ, а модели продемонстрировали новые способности в исследовании уязвимостей. Это разные явления. Единого автономного «роя», ответственного за все инциденты, не доказано.

20–22 октября. Railway сообщила о несанкционированном доступе к части внутренних систем; компания связывала предполагаемые цели атакующих с получением ключей AI-провайдеров. Расследование продолжалось. Факт взлома инфраструктуры не равен доказательству, что атаку выполнял автономный ИИ.

27 октября. Anthropic рассказала о пяти цепочках эксплуатации критических уязвимостей, обнаруженных с помощью внутренней исследовательской модели. Это работа исследователей с координированным раскрытием, а не свидетельство массовой эксплуатации преступниками.

25 сентября. OpenAI описала самораспространяющиеся prompt injection в симуляции. Вреда вне тестовой среды не наблюдали.

Prompt injection особенно важен тогда, когда агент не только читает внешний текст, но и может обращаться к API, файлам и другим ресурсам. Внешняя инструкция не должна превращаться в привилегированную команду.

Финансовый фон: FBI IC3 зарегистрировал потери на $12,5 млрд в 2023, $16,6 млрд в 2024 и $20,877 млрд в 2025. Эти данные относятся ко всем интернет-преступлениям в поступивших жалобах, а не к AI-взломам. В 2025 отдельно выделялись 22 364 жалобы с пометкой AI Related и около $893 млн связанных потерь, что тоже не означает автономного исполнения атак.

Вывод: безопасность сегодня — это архитектура разрешений. Минимальные права агентов, подтверждение опасных действий человеком, изоляция секретов, лимиты API-ключей, журналы действий и срочное устранение известных эксплуатируемых уязвимостей.

Визуальная версия исследования с графиками доступна в редакции на странице /research/security-2026.

Основные источники:
https://blog.railway.com/p/preliminary-report-october-security-incident
https://www.anthropic.com/research/discovering-vulnerabilities-with-claude
https://openai.com/index/designing-agents-to-resist-prompt-injection/
https://alignment.openai.com/misalignment-reports/self-replicating-prompt-injections-exist
https://www.fbi.gov/file-repository/2025_ic3report.pdf
https://content.govdelivery.com/accounts/USDHSCISA/bulletins/42f2e7f
"""
SOURCES=[
 ("Railway · предварительный отчёт, 22 октября","https://blog.railway.com/p/preliminary-report-october-security-incident"),
 ("Anthropic · исследование уязвимостей, 27 октября","https://www.anthropic.com/research/discovering-vulnerabilities-with-claude"),
 ("OpenAI · проектирование защищённых агентов","https://openai.com/index/designing-agents-to-resist-prompt-injection/"),
 ("OpenAI Alignment · самораспространяющиеся инъекции, тестовая среда","https://alignment.openai.com/misalignment-reports/self-replicating-prompt-injections-exist"),
 ("FBI · 2025 IC3 Annual Report","https://www.fbi.gov/file-repository/2025_ic3report.pdf"),
 ("CISA · известные эксплуатируемые уязвимости, 14 октября","https://content.govdelivery.com/accounts/USDHSCISA/bulletins/42f2e7f")
]
def svg(inner,desc,height=336):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 {height}" width="900" role="img" aria-label="{E(desc)}" style="max-width:100%;height:auto;display:block"><rect width="900" height="{height}" rx="14" fill="#17171d"/>{inner}</svg>'
def trend():
 pts=[(150,230,12.5,"2023"),(450,170,16.6,"2024"),(752,98,20.877,"2025")]
 inner='<text x="30" y="41" fill="#eeeeef" font-family="sans-serif" font-size="22" font-weight="700">Рост финансовых потерь</text><text x="30" y="66" fill="#a6a6b1" font-family="sans-serif" font-size="13">По обращениям FBI IC3 · млрд USD · не только AI</text>'
 for y in (115,172,229):
  inner+=f'<line x1="84" x2="837" y1="{y}" y2="{y}" stroke="#383840" stroke-dasharray="4 7"/>'
 inner+='<polyline points="150,230 450,170 752,98" fill="none" stroke="#ff8790" stroke-width="5" stroke-linejoin="round"/>'
 for x,y,v,year in pts:
  inner+=f'<circle cx="{x}" cy="{y}" r="8" fill="#ff8790"/>'
  inner+=f'<text x="{x}" y="{y-18}" fill="#fff" font-family="sans-serif" font-size="18" font-weight="700" text-anchor="middle">{v:.1f}</text>'
  inner+=f'<text x="{x}" y="276" fill="#c0c0c8" font-family="sans-serif" font-size="15" text-anchor="middle">{year}</text>'
 inner+='<text x="30" y="320" fill="#90909b" font-family="sans-serif" font-size="12">2023 и 2024 округлены. 2025: 20,877 млрд USD.</text>'
 return svg(inner,"График убытков FBI IC3, 2023 12.5, 2024 16.6, 2025 20.877")
def categories():
 data=[("Инвестиционные схемы",8.649),("Подмена деловой переписки",3.047),("Фальшивая техподдержка",2.135),("Утечки персональных данных",1.315)]
 inner='<text x="30" y="40" fill="#eeeeef" font-family="sans-serif" font-size="21" font-weight="700">Крупнейшие категории потерь</text><text x="30" y="64" fill="#a6a6b1" font-family="sans-serif" font-size="13">FBI IC3 · 2025 · млрд USD</text>'
 for i,(name,value) in enumerate(data):
  y=111+i*59
  inner+=f'<text x="30" y="{y}" fill="#dedee4" font-family="sans-serif" font-size="14">{E(name)}</text>'
  inner+=f'<rect x="355" y="{y-17}" width="430" height="22" rx="4" fill="#34343d"/>'
  inner+=f'<rect x="355" y="{y-17}" width="{value/9*430:.0f}" height="22" rx="4" fill="#dd7984"/>'
  inner+=f'<text x="804" y="{y}" fill="#f2f2f4" font-family="sans-serif" font-size="15">{value:.2f}</text>'
 inner+='<text x="30" y="325" fill="#8d8d96" font-family="sans-serif" font-size="11">Категории финансовых преступлений, а не виды AI-атак.</text>'
 return svg(inner,"Четыре категории финансовых потерь FBI IC3 в 2025")
def boundary():
 items=[(27,"01 / ИСТОЧНИК","Сайт · письмо · документ"),(332,"02 / АГЕНТ","Читает и интерпретирует"),(637,"03 / ДЕЙСТВИЕ","API · файлы · платежи")]
 inner='<text x="30" y="40" fill="#eeeeef" font-family="sans-serif" font-size="21" font-weight="700">Как возникает риск prompt injection</text>'
 inner+='<text x="30" y="64" fill="#a6a6b1" font-family="sans-serif" font-size="13">Схема механизма; не описание конкретного инцидента</text>'
 for x,label,description in items:
  inner+=f'<rect x="{x}" y="118" width="238" height="115" rx="12" stroke="#565661" fill="#23232a"/>'
  inner+=f'<text x="{x+16}" y="157" fill="#ff9ea5" font-family="sans-serif" font-size="16" font-weight="700">{E(label)}</text>'
  inner+=f'<text x="{x+16}" y="184" fill="#dddde4" font-family="sans-serif" font-size="13">{E(description)}</text>'
 inner+='<path d="M271 174 L320 174 L310 164 M320 174 L310 184 M575 174 L624 174 L614 164 M624 174 L614 184" fill="none" stroke="#ff8c96" stroke-width="3"/>'
 inner+='<text x="450" y="293" fill="#cfcfd5" text-anchor="middle" font-family="sans-serif" font-size="14">Риск: внешний текст воспринимается как команда с правами пользователя</text>'
 return svg(inner,"Граница доверия между недоверенным текстом, агентом и действиями",318)
def article_html(pid):
 links="".join(f'<a href="{E(url)}" target="_blank" rel="noopener noreferrer">{E(label)} ↗</a>' for label,url in SOURCES)
 return """<style>.res{font-family:system-ui,-apple-system,sans-serif;color:#ededf1}.res .hero{padding:42px 38px;background:radial-gradient(ellipse at 90% 20%,#482d36,#1b1a21 48%,#131317);border:1px solid #44323a;border-radius:17px}.res .ey{font-size:11px;letter-spacing:.2em;color:#f2929e;font-weight:800;text-transform:uppercase}.res h1{font-size:clamp(30px,5vw,58px);letter-spacing:-.055em;line-height:1.09;max-width:800px}.res h2{font-size:clamp(24px,3vw,34px);letter-spacing:-.04em;line-height:1.15}.res p{font-size:16px;line-height:1.8;color:#ceced6}.res .lead{font-size:clamp(18px,2.3vw,22px);line-height:1.48;color:#e6e6ea}.res .section{margin:52px 0}.res .duo{display:grid;grid-template-columns:1fr 1fr;gap:16px}.res .stat,.res .finding{padding:23px;border:1px solid #3a3a44;background:#1b1b21;border-radius:13px}.res .stat strong{display:block;color:#ff929d;font-size:35px;letter-spacing:-.05em}.res .stat small{color:#b4b4bf;font-size:13px}.res .finding{margin:14px 0}.res .finding b{color:#f59aa4}.res .note{border-left:3px solid #f493a0;background:#26212a;padding:18px 21px;border-radius:6px}.res figure{margin:20px 0}.res figcaption{font-size:12px;color:#9999a5;margin-top:8px}.res .sources a{display:block;padding:12px 0;border-bottom:1px solid #33333c;color:#e3e3e7;overflow-wrap:anywhere}.res .tagline{color:#a4a4b2;font-size:12px;letter-spacing:.09em}@media(max-width:700px){.res .duo{grid-template-columns:1fr}.res .hero{padding:23px}}</style>""" + f"""<article class="res"><div class="ey">AI ADEPTS · Research note 02 · 29 October 2026</div>
 <div class="hero"><div class="ey">Cybersecurity / AI Agents / Infrastructure</div>
 <h1>После «Чёрного октября»: что теперь происходит с безопасностью интернета</h1>
 <p class="lead">Взломы AI-платформ, модели, находящие реальные уязвимости, и агенты с доступом к инструментам. Это разные процессы. В новой реальности опаснее всего не смешать их в один красивый, но неподтверждённый сюжет.</p>
 <span class="tag">Исследование</span> <span class="tag">Графики и схема</span> <span class="tag">Черновик · не опубликовано</span></div>
 <section class="section"><div class="duo">
 <div class="stat"><div class="ey">FBI IC3 · 2025</div><strong>$20,877 млрд</strong><small>Все зарегистрированные финансовые потери по жалобам о киберпреступлениях в США</small></div>
 <div class="stat"><div class="ey">FBI IC3 · AI Related</div><strong>22 364</strong><small>Жалобы с пометкой AI Related, но не доказанные атаки автономных агентов</small></div></div></section>
 <section class="section"><div class="ey">01 / Что подтверждено</div><h2>Не один «рой», а несколько разных угроз</h2>
 <p>К октябрю 2026 года инфраструктура для ИИ стала самостоятельной целью атак. При этом модели всё успешнее помогают исследователям находить критические уязвимости. А подключённые к инструментам агенты открывают новый путь для манипуляции через внешний текст. У этих трёх явлений разная доказательная база.</p>
 <div class="finding"><b>Railway · 20–22 октября</b><p>Компания сообщила о несанкционированном доступе к части внутренних систем и о предполагаемом интересе злоумышленников к ключам AI-провайдеров. Расследование продолжалось. Факт компрометации инфраструктуры не устанавливает, что нападение выполнял автономный ИИ.</p></div>
 <div class="finding"><b>Anthropic · 27 октября</b><p>Исследовательская команда описала пять цепочек серьёзных уязвимостей, найденных с помощью внутренней модели. Работа сопровождалась координированным раскрытием. Это демонстрация возможностей исследования, а не доказательство массовых атак этой моделью.</p></div>
 <div class="finding"><b>OpenAI Alignment · 25 сентября</b><p>В симулированных вызовах инструментов показана возможность самораспространяющегося prompt injection. Авторы прямо отмечают отсутствие зафиксированного воздействия за пределами экспериментальной среды.</p></div></section>
 <section class="section"><div class="ey">02 / Контекст в цифрах</div><h2>Экономический масштаб цифровых преступлений растёт</h2><p>На фоне технологических открытий легко потерять главный масштаб: по официальным жалобам в FBI IC3 ущерб интернет-преступлений уже измеряется десятками миллиардов долларов. Эти цифры нельзя использовать как оценку потерь именно от AI-агентов.</p>
 <figure>{trend()}<figcaption>Источник: FBI IC3, отчёты 2023–2025. Суммы 2023 и 2024 округлены.</figcaption></figure>
 <figure>{categories()}<figcaption>Источник: FBI IC3 2025, «By Complaint Loss». Разделение по категориям жалоб, не по технологиям атакующих.</figcaption></figure>
 <p class="note">Отдельный дескриптор AI Related: 22 364 жалобы и $893,3 млн связанных заявленных потерь в 2025 году. Он может пересекаться с категориями преступлений и не доказывает, что атаку самостоятельно проводил ИИ.</p></section>
 <section class="section"><div class="ey">03 / Новая граница</div><h2>Чужой текст может стать инструкцией для реального действия</h2>
 <p>Обычная веб-страница не имеет права отправлять деньги или читать закрытые документы. Но агент, которому дали такие полномочия, может столкнуться с внешним текстом, притворяющимся командой пользователя. Риск prompt injection возникает именно на переходе от чтения контента к вызову инструментов.</p>
 <figure>{boundary()}<figcaption>Авторская визуализация границы доверия. Не модель конкретного взлома.</figcaption></figure>
 <p>Поэтому безопасности агентов недостаточно одного «умного фильтра». Нужны ограничения прав, отдельные согласования опасных действий и изоляция секретов.</p></section>
 <section class="section"><div class="ey">04 / Практические меры</div><h2>Что защищать прямо сейчас</h2>
 <div class="duo"><div class="finding"><b>Права агента</b><p>Минимальный доступ по задачам. Чтение документа не должно автоматически разрешать запись в базы, публикацию или платёж.</p></div>
 <div class="finding"><b>Ключи и лимиты</b><p>Секреты держать вне контента, ограничивать права, срок действия и расходы ключей. После инцидента поставщика проверять их использование и обновлять.</p></div>
 <div class="finding"><b>Уязвимости</b><p>Следить за CISA KEV и бюллетенями поставщиков. В первую очередь исправлять уязвимости, для которых доказана активная эксплуатация.</p></div>
 <div class="finding"><b>Подтверждения</b><p>Видимое одобрение для удаления файлов, движения денег, доступа к приватным данным и публичных публикаций.</p></div></div></section>
 <section class="section"><div class="ey">Вывод</div><h2>Безопасность — это архитектура разрешений</h2>
 <p>Вопрос 2026 года не в том, «захватил ли ИИ интернет». Реальная перемена в том, что старые системные уязвимости сосуществуют с новым классом программ, способных интерпретировать недоверенный текст и действовать от имени человека. Значит, защищать нужно не только содержимое, но и границу между информацией и полномочием.</p></section>
 <section class="section sources"><div class="ey">Проверить источники</div><h2>Оригинальные публикации</h2>{links}
 <a href="https://journal-production-3e67.up.railway.app/articles/black-october" target="_blank" rel="noopener noreferrer">«Чёрный октябрь»: исходная статья ↗</a></section>
 <div class="panel"><p class="muted">Материал находится в редакционной системе как черновик. Ничего не опубликовано в Telegram.</p><a class="btn" href="/post/{pid}">Открыть карточку черновика</a><a class="btn secondary" href="/">Список материалов</a></div></article>"""
