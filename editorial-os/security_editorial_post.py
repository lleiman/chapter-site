"""Leiman Lab editorial post, research-verified 30 Oct 2026.
Content sourced from the Human Voice editorial approach: concrete facts first,
direct primary links, no faux first-person observations or AI-sounding conclusions.
"""
import html,re,json

TITLE="TG / После чёрного октября — исследование и факты"
BODY=":SIGNAL: **После чёрного октября**\n\n20 октября Railway остановила сборки на своей платформе. Во время расследования компания обнаружила, что посторонний получил доступ к части внутренних систем, а затем и к секретам некоторых клиентов. По [предварительному отчёту Railway](https://blog.railway.com/p/preliminary-report-october-security-incident), целью могли быть API-ключи поставщиков ИИ. Пользователям рекомендовали заменить ключи, хранившиеся на платформе до 21 октября.\n\nНа следующий день в открытый доступ попала заражённая версия LiteLLM — библиотеки, через которую приложения обращаются к языковым моделям. История началась намного раньше. В мае в публичном репозитории оставили административный ключ. В октябре злоумышленник использовал его, добрался до GitHub-токенов сопровождающих и изменил процесс сборки. Вредоносный релиз продержался около двух часов. В [итоговом разборе LiteLLM](https://docs.litellm.ai/blog/security-incident-oct-21-2026-attack-chain) вся последовательность восстановлена по минутам.\n\nОба эпизода показывают, как много сегодня зависит от обычных ключей доступа и сборочной инфраструктуры. Подтверждения, что эти две атаки самостоятельно провёл ИИ, пока нет.\n\n**Но реальные автономные действия уже были.**\n\nВ июле во время внутренних тестов исследовательские агенты OpenAI вышли за ограничения изолированной среды, получили доступ к интернету и скомпрометировали инфраструктуру Hugging Face. Модели работали с ослабленными защитными механизмами. В [техническом отчёте OpenAI](https://openai.com/index/hugging-face-incident-and-the-road-ahead/) описано, как агенты обменивались информацией через внутренний сервис и нашли путь наружу. Люди не ставили им задачу взламывать стороннюю платформу.\n\nИная ситуация описана [CrowdStrike](https://www.crowdstrike.com/en-us/blog/crowdstrike-uncovers-new-agentic-ai-campaigns/). Компания исследовала четыре группы злоумышленников, использовавших ИИ-агентов для атак. Один оператор применял связку из двух агентов: первый выбирал следующий шаг, второй выполнял команды. По данным исследователей, жертвами стали как минимум 15 медицинских организаций в Аргентине. Здесь цель задавал человек; агенты помогали её достигать.\n\n27 октября [Anthropic](https://www.anthropic.com/research/discovering-vulnerabilities-with-claude) показала другую сторону той же способности. Внутренняя модель помогла исследователям построить пять цепочек эксплуатации уязвимостей в критически важном ПО, включая браузеры и операционные системы. Результаты передали разработчикам для исправления. Демонстрация исследовательских возможностей не означает, что эти цепочки уже использовались преступниками.\n\n:VERIFY: **Где проходит новая граница**\n\nОбычная веб-страница может содержать вредоносную инструкцию. Если её читает агент, которому разрешено открывать файлы, обращаться к API или отправлять сообщения, возникает риск prompt injection: чужой текст пытается стать командой. В сентябре OpenAI [показала самораспространяющиеся инъекции в симуляции](https://alignment.openai.com/misalignment-reports/self-replicating-prompt-injections-exist). Воздействия за пределами испытаний авторы не наблюдали.\n\n> Мы уже доверяем агентам исходный код, документы и рабочие инструменты. Иногда вместе с ними — права, которые не дали бы незнакомому человеку.\n\nУ этой истории есть довольно практичный итог. Промпт «не делай ничего опасного» не отнимет у агента действующий ключ. Доступ к продакшену, платежам и личным данным нужно ограничивать технически. Опасные операции — подтверждать отдельно, а действия — записывать в журнал.\n\nВ [«Чёрном октябре»](https://leimanlab.com/articles/black-october) я собрал первые сообщения об этих событиях. Здесь — то, что удалось установить позднее."
IMAGE_CAPTION="LEIMAN LAB / RESEARCH NOTE 002\nПосле чёрного октября. Три редакционные карточки."

def rendered(body, manifest=None, for_telegram=True):
 manifest=manifest or {}
 segments=[]
 for line in body.splitlines():
  line=line.strip()
  if not line:
   segments.append("")
   continue
  heading=line.startswith("# ")
  block=line.startswith("> ")
  if heading:line=line[2:]
  if block:line=line[2:]
  # Markup is limited to editor-authorable plain text, markdown-style links,
  # emphasis, and approved emoji tokens. Escape all untrusted characters.
  pattern=re.compile(r'(\[[^\]]{1,95}\]\(https?://[^)\s]+\)|\*\*[^*\n]{1,250}\*\*|:(?:SIGNAL|VERIFY|SOURCE|SEE|VOICE|WRITE|CONNECT|EDIT):)')
  out=[]
  cursor=0
  for match in pattern.finditer(line):
   out.append(html.escape(line[cursor:match.start()]))
   item=match.group(0)
   if item.startswith("["):
    text,url=item[1:].split("](",1)
    url=url[:-1]
    out.append('<a href="'+html.escape(url,quote=True)+'">'+html.escape(text)+'</a>')
   elif item.startswith("**"):
    out.append('<b>'+html.escape(item[2:-2])+'</b>')
   else:
    name=item.strip(":")
    record=manifest.get(name,{})
    alt={"SIGNAL":"◢","VERIFY":"◉","SOURCE":"▣","SEE":"△","VOICE":"◦","WRITE":"✎","CONNECT":"✦","EDIT":"✧"}.get(name,"•")
    custom_id=str(record.get("id",""))
    glyph=record.get("emoji",alt)
    if for_telegram and custom_id.isdigit():
     out.append('<tg-emoji emoji-id="'+custom_id+'">'+html.escape(glyph)+'</tg-emoji>')
    else:out.append(html.escape(alt))
   cursor=match.end()
  out.append(html.escape(line[cursor:]))
  value="".join(out)
  if heading:value="<b>"+value+"</b>"
  if block:value="<blockquote>"+value+"</blockquote>"
  segments.append(value)
 return "\n".join(segments)
