import os, html, hmac, hashlib, secrets, sqlite3, asyncio, json, time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
import httpx
from research_security_2026 import ARTICLE_TITLE, ARTICLE_BODY
from research_magazine_2026 import article_html

DB_PATH=os.getenv("EDITORIAL_DB_PATH","/data/editorial.sqlite3")
TZ=ZoneInfo("Asia/Makassar")
CHANNEL=os.getenv("TELEGRAM_CHANNEL","@aiadepts")
PW=os.getenv("ADMIN_PASSWORD","")
BOT=os.getenv("TELEGRAM_BOT_TOKEN","")
COOKIE="adepts_editor_session"
lock=asyncio.Lock()
login_attempts={}
worker=None

def now(): return datetime.now(timezone.utc)
def ts(): return now().isoformat(timespec="seconds")
def conn():
 c=sqlite3.connect(DB_PATH,timeout=20)
 c.row_factory=sqlite3.Row
 c.execute("PRAGMA busy_timeout=20000")
 return c
def setting(key,default=""):
 c=conn()
 try:
  v=c.execute("SELECT value FROM settings WHERE key=?",(key,)).fetchone()
  return v["value"] if v else default
 finally:c.close()
def put_setting(key,value):
 c=conn()
 try:
  c.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(key,str(value)))
  c.commit()
 finally:c.close()
def initialize():
 os.makedirs(os.path.dirname(DB_PATH),exist_ok=True)
 c=conn()
 try:
  c.execute("PRAGMA journal_mode=WAL")
  c.executescript("""
  CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, approved_at TEXT,
  scheduled_at TEXT, published_at TEXT, published_message_id INTEGER,
  preview_message_id INTEGER, last_error TEXT
  );
  CREATE INDEX IF NOT EXISTS ix_posts_due ON posts(status,scheduled_at);
  """)
  if not c.execute("SELECT 1 FROM posts LIMIT 1").fetchone():
   c.execute("INSERT INTO posts(title,body,status,created_at,updated_at) VALUES(?,?,?,?,?)",(
    "SYSTEM TEST 01",
    "AI ADEPTS / SYSTEM TEST 01\n\nПроверяем новую систему подготовки и публикации материалов.\n\nИдея → редактура → согласование → отложенная публикация.\n\nЦель теста — проверить форматирование и работу редакционного процесса до выхода материала в канал.\n\nЭто технический черновик. Не является анонсом.",
    "draft",ts(),ts()))
  if not c.execute("SELECT id FROM posts WHERE title=?",(ARTICLE_TITLE,)).fetchone():
   c.execute("INSERT INTO posts(title,body,status,created_at,updated_at) VALUES(?,?,?,?,?)",
             (ARTICLE_TITLE,ARTICLE_BODY,"draft",ts(),ts()))
  c.commit()
 finally:c.close()

def session_value():
 return hmac.new(PW.encode(),b"adepts-session-v1",hashlib.sha256).hexdigest()
def csrf_value():
 return hmac.new(PW.encode(),b"adepts-csrf-v1",hashlib.sha256).hexdigest()
def authorized(req):
 if len(PW)<20:return False
 val=req.cookies.get(COOKIE,"")
 return hmac.compare_digest(val,session_value())
def require(req):
 if not authorized(req):raise HTTPException(status_code=401,detail="Login required")
def verify(req,csrf):
 require(req)
 if not hmac.compare_digest(csrf,csrf_value()):raise HTTPException(403,"Invalid CSRF")
def E(value):return html.escape(str(value or ""),quote=True)
def redirect(path="/"):return RedirectResponse(path,status_code=303)
def field(name,value=""):return '<input type="hidden" name="'+name+'" value="'+E(value)+'">'
def head(req,title):
 active=authorized(req)
 nav=('<nav><a href="/">Обзор</a><a href="/new">Новый пост</a><a href="/calendar">Расписание</a><a href="/research/security-2026">Исследование</a><a href="/settings">Настройки</a><a href="/logout">Выход</a></nav>') if active else ''
 return """<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
 <title>"""+E(title)+""" · ADEPTS Editorial</title>
 <style>
 :root{color-scheme:dark;--bg:#0e0e10;--card:#19191c;--line:#303034;--muted:#9999a2;--accent:#ff6d78;--fg:#efeff0}
 *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,-apple-system,sans-serif}
 .wrap{max-width:1060px;margin:auto;padding:30px 24px 90px}
 header{border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px max(24px,calc((100vw - 1012px)/2))}
 .brand{font-weight:800;font-size:15px;letter-spacing:.15em}.brand span{color:var(--accent)}
 nav{display:flex;flex-wrap:wrap;gap:16px}a{color:inherit;text-decoration:none}a:hover{color:var(--accent)}nav a{color:#bcbcc1;font-size:13px}
 h1{font-size:33px;letter-spacing:-.045em;margin:14px 0 10px}h2{font-size:20px;margin:5px 0 18px}p{margin:8px 0 16px}.muted,small{color:var(--muted)}.muted{font-size:13px}
 .eyebrow{color:var(--accent);font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}
 .panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px;margin:18px 0}
 .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.cards .panel{margin:0}
 .num{font-size:29px;font-weight:650;letter-spacing:-.05em}.line{border-top:1px solid var(--line);padding:18px 0}
 .postrow{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
 .tag{display:inline-block;padding:3px 9px;border:1px solid #44444b;border-radius:30px;font-size:11px;color:#dadadf}
 .tag.draft{color:#e3c8a0}.tag.approved{color:#9cbcf1}.tag.scheduled{color:#a9dfb0}.tag.published{color:#b6dcba}
 input,textarea{display:block;background:#121215;border:1px solid #414148;border-radius:8px;color:white;padding:12px 13px;font:inherit;width:100%;margin-top:7px}
 textarea{min-height:240px;resize:vertical}label{display:block;margin:18px 0;color:#c3c3c8;font-size:13px}
 button,.btn{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--accent);border-radius:9px;background:var(--accent);color:#171518;padding:10px 15px;font-weight:700;font:inherit;cursor:pointer;margin:7px 9px 7px 0}
 .btn.secondary,button.secondary{color:#e5e5e8;background:transparent;border-color:#5b5b64}
 .btn.danger,button.danger{background:transparent;color:#ff8d90;border-color:#7e3b42}
 .actions{display:flex;flex-wrap:wrap;gap:3px;align-items:center}.hint{background:#222126;border-left:2px solid var(--accent);padding:11px 14px;font-size:13px;color:#c5c5cd;border-radius:5px}
 .preview{white-space:pre-wrap;font-size:15px;line-height:1.65;background:#111114;padding:20px;border-radius:10px;overflow-wrap:anywhere}
 .grid{display:grid;grid-template-columns:1.3fr 1fr;gap:18px}time{color:#9b9ba7;font-size:12px}hr{border:0;border-top:1px solid var(--line);margin:26px 0}
 @media(max-width:650px){.cards,.grid{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}.wrap{padding:22px 16px}h1{font-size:28px}}
 </style></head><body><header><div class="brand">AI <span>ADEPTS</span> / EDITORIAL</div>"""+nav+"""</header><main class="wrap">"""
def page(req,title,body):
 return HTMLResponse(head(req,title)+body+"</main></body></html>",headers={"Cache-Control":"no-store","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'self';style-src 'unsafe-inline';form-action 'self';frame-ancestors 'none';base-uri 'none'"})
def csrf():return field("csrf",csrf_value())
def statusname(v):
 return {"draft":"Черновик","approved":"Одобрен","scheduled":"В расписании","sending":"Отправка","published":"Опубликован","missed":"Пропущено","uncertain":"Требует проверки","error":"Ошибка"}.get(v,v)
def stamp(v):
 if not v:return "Не назначено"
 try:return datetime.fromisoformat(v).astimezone(TZ).strftime("%d.%m.%Y %H:%M")+" · Бали"
 except:return E(v)
async def tg(method,data):
 if not BOT:raise RuntimeError("Telegram bot token not configured")
 async with httpx.AsyncClient(timeout=18) as h:
  response=await h.post("https://api.telegram.org/bot"+BOT+"/"+method,data=data)
  result=response.json()
 if not result.get("ok"):raise RuntimeError(str(result.get("description","Telegram API error"))[:160])
 return result["result"]
async def connect_chat(code):
 if not BOT:raise RuntimeError("Bot token unavailable")
 async with httpx.AsyncClient(timeout=15) as h:
  res=(await h.get("https://api.telegram.org/bot"+BOT+"/getUpdates",params={"limit":100,"timeout":0,"allowed_updates":json.dumps(["message","channel_post"])})).json()
 if not res.get("ok"):raise RuntimeError(str(res.get("description","Updates unavailable"))[:160])
 for update in reversed(res.get("result",[])):
  msg=update.get("message") or update.get("channel_post") or {}
  if (msg.get("text") or "").strip()=="/connect "+code:
   chat=msg.get("chat") or {}
   if chat.get("type") not in ("private","supergroup","channel"):continue
   return str(chat["id"]),str(chat.get("title") or chat.get("first_name") or "Telegram preview")[:120]
 raise RuntimeError("Команда /connect ещё не найдена. Проверь отправку и повтори.")

async def publish_post(post):
 pid=post["id"]
 if setting("armed","0")!="1" or os.getenv("ENABLE_PUBLISHING")!="true":return
 # No unexpected posting when a previously scheduled time has already passed.
 moment=datetime.fromisoformat(post["scheduled_at"])
 if now()-moment>timedelta(minutes=10):
  c=conn()
  try:c.execute("UPDATE posts SET status='missed',updated_at=?,last_error=? WHERE id=? AND status='scheduled'",(ts(),"Истёк 10-минутный интервал публикации",pid));c.commit()
  finally:c.close()
  return
 c=conn()
 try:
  cursor=c.execute("UPDATE posts SET status='sending',updated_at=? WHERE id=? AND status='scheduled'",(ts(),pid))
  c.commit()
  if cursor.rowcount!=1:return
 finally:c.close()
 try:
  message=await tg("sendMessage",{"chat_id":CHANNEL,"text":post["body"],"disable_notification":"true"})
 except Exception as exc:
  # API timeout can be ambiguous. Never retry automatically.
  c=conn()
  try:c.execute("UPDATE posts SET status='uncertain',last_error=?,updated_at=? WHERE id=?",(str(exc)[:250],ts(),pid));c.commit()
  finally:c.close()
  return
 c=conn()
 try:c.execute("UPDATE posts SET status='published',published_at=?,published_message_id=?,updated_at=?,last_error=NULL WHERE id=?",(ts(),message["message_id"],ts(),pid));c.commit()
 finally:c.close()
async def scheduler():
 while True:
  try:
   if setting("armed","0")=="1" and os.getenv("ENABLE_PUBLISHING")=="true":
    c=conn()
    try:posts=c.execute("SELECT * FROM posts WHERE status='scheduled' AND scheduled_at<=? ORDER BY scheduled_at ASC LIMIT 5",(ts(),)).fetchall()
    finally:c.close()
    async with lock:
     for post in posts:await publish_post(post)
  except Exception as ex:print("EDITORIAL_SCHEDULER_ERROR "+type(ex).__name__,flush=True)
  await asyncio.sleep(15)

@asynccontextmanager
async def lifespan(app):
 global worker
 initialize()
 worker=asyncio.create_task(scheduler())
 yield
 worker.cancel()
 try:await worker
 except asyncio.CancelledError:pass

app=FastAPI(lifespan=lifespan,docs_url=None,redoc_url=None,openapi_url=None)

@app.get("/health")
def health():
 research_render=article_html(1)
 return {"ok":True,"service":"adepts-editorial","database":"mounted","magazine_render_ok":'class="mag-hero"' in research_render and 'class="mag-geo"' in research_render}
@app.get("/login")
def login(req:Request):
 return page(req,"Вход","<div class='eyebrow'>PRIVATE EDITORIAL</div><h1>Вход в редакцию</h1><div class='panel'><form method='post' action='/login'><label>Пароль<input type='password' name='password' required autocomplete='current-password'></label><button>Войти</button></form></div>")
@app.post("/login")
def login_post(req:Request,password:str=Form()):
 if len(PW)<20:raise HTTPException(503,"ADMIN_PASSWORD is not configured")
 ip=req.client.host if req.client else "unknown"
 t=time.monotonic();attempts=[x for x in login_attempts.get(ip,[]) if t-x<300]
 if len(attempts)>=12:raise HTTPException(429,"Попробуйте позже")
 if not hmac.compare_digest(password,PW):
  attempts.append(t);login_attempts[ip]=attempts
  return page(req,"Ошибка входа","<h1>Неверный пароль</h1><a class='btn secondary' href='/login'>Повторить</a>")
 login_attempts.pop(ip,None)
 r=redirect("/")
 r.set_cookie(COOKIE,session_value(),max_age=60*60*24*7,httponly=True,secure=True,samesite="strict",path="/")
 return r
@app.get("/logout")
def logout():
 r=redirect("/login");r.delete_cookie(COOKIE,path="/");return r
@app.get("/")
def dashboard(req:Request):
 if not authorized(req):return redirect("/login")
 c=conn()
 try:
  counts={x["status"]:x["n"] for x in c.execute("SELECT status,COUNT(*) n FROM posts GROUP BY status")}
  posts=c.execute("SELECT * FROM posts ORDER BY id DESC LIMIT 30").fetchall()
 finally:c.close()
 body="<div class='eyebrow'>CONTENT OPERATIONS / BALI UTC+8</div><h1>Публикации</h1><p class='muted'>Черновики → согласование → расписание → Telegram. Никаких публикаций без одобрения.</p>"
 body+="<div class='cards'><div class='panel'><div class='muted'>Черновики</div><div class='num'>"+str(counts.get("draft",0))+"</div></div><div class='panel'><div class='muted'>Запланировано</div><div class='num'>"+str(counts.get("scheduled",0))+"</div></div><div class='panel'><div class='muted'>Опубликовано</div><div class='num'>"+str(counts.get("published",0))+"</div></div></div>"
 armed=setting("armed","0")=="1"
 body+=("<p class='hint'>Автоматическая публикация активирована. Отправляются только утверждённые и запланированные посты.</p>" if armed else "<p class='hint'>Автопубликация выключена. Черновики и отложенные записи безопасны.</p>")
 body+="<div class='panel'><div class='eyebrow'>НОВОЕ ИССЛЕДОВАНИЕ · 29 ОКТЯБРЯ</div><h2>После «Чёрного октября»: безопасность интернета в 2026</h2><p class='muted'>Полноформатный материал с диаграммами, верифицированными источниками и выводами. Статус: черновик.</p><a href='/research/security-2026' class='btn'>Смотреть исследование и графики</a></div>"
 body+="<div class='actions'><a href='/new' class='btn'>Создать пост</a><a href='/settings' class='btn secondary'>Подключить Telegram-превью</a></div><div class='panel'><h2>Материалы</h2>"
 if not posts:body+="<p class='muted'>Материалов пока нет</p>"
 for v in posts:
  body+="<div class='line postrow'><div><div class='tag "+E(v["status"])+"'>"+E(statusname(v["status"]))+"</div><h3><a href='/post/"+str(v["id"])+"'>"+E(v["title"])+"</a></h3><time>"+E(stamp(v["scheduled_at"]) if v["scheduled_at"] else "Черновик · "+v["created_at"][:10])+"</time></div><a class='btn secondary' href='/post/"+str(v["id"])+"'>Открыть</a></div>"
 return page(req,"Редакция",body+"</div>")
@app.get("/new")
def new(req:Request):
 require(req)
 return page(req,"Новый пост","<div class='eyebrow'>NEW MATERIAL</div><h1>Новый пост</h1><div class='panel'><form method='post' action='/new'>"+csrf()+"<label>Внутреннее название<input name='title' maxlength='160' required placeholder='Заголовок'></label><label>Текст публикации<textarea name='body' maxlength='4096' required placeholder='Текст для Telegram'></textarea></label><button>Сохранить черновик</button></form></div>")
@app.post("/new")
def new_post(req:Request,csrf_token:str=Form(alias="csrf"),title:str=Form(),body:str=Form()):
 verify(req,csrf_token)
 if not title.strip() or not body.strip() or len(body)>4096:raise HTTPException(400,"Invalid content")
 c=conn()
 try:
  cur=c.execute("INSERT INTO posts(title,body,status,created_at,updated_at) VALUES(?,?,?,?,?)",(title.strip()[:160],body.strip(),"draft",ts(),ts()));c.commit();pid=cur.lastrowid
 finally:c.close()
 return redirect("/post/"+str(pid))
@app.get("/post/{pid}")
def detail(req:Request,pid:int):
 require(req)
 c=conn()
 try:v=c.execute("SELECT * FROM posts WHERE id=?",(pid,)).fetchone()
 finally:c.close()
 if not v:raise HTTPException(404)
 status=v["status"]
 body="<div class='eyebrow'>MATERIAL #"+str(pid)+"</div><h1>"+E(v["title"])+"</h1><div class='tag "+E(status)+"'>"+E(statusname(status))+"</div>"
 body+="<div class='grid'><section class='panel'><h2>Предпросмотр</h2><p class='muted'>Текст без Markdown-разметки, как он будет отправлен через Bot API.</p><div class='preview'>"+E(v["body"])+"</div></section><section class='panel'><h2>Управление</h2>"
 if v["last_error"]:body+="<p class='hint'>"+E(v["last_error"])+"</p>"
 if v["scheduled_at"]:body+="<p>Дата: <strong>"+E(stamp(v["scheduled_at"]))+"</strong></p>"
 if v["published_message_id"]:body+="<p><a target='_blank' rel='noopener' href='https://t.me/"+E(CHANNEL.lstrip("@"))+"/"+str(v["published_message_id"])+"'>Открыть опубликованный пост</a></p>"
 if status=="draft":
  body+="<form action='/post/"+str(pid)+"/edit' method='post'>"+csrf()+"<label>Внутреннее название<input name='title' maxlength='160' value='"+E(v["title"])+"' required></label><label>Текст<textarea maxlength='4096' name='body' required>"+E(v["body"])+"</textarea></label><button>Сохранить изменения</button></form>"
  body+="<form action='/post/"+str(pid)+"/approve' method='post'>"+csrf()+"<button class='secondary'>Одобрить материал</button></form>"
 if status in ("draft","approved","scheduled"):
  body+="<form action='/post/"+str(pid)+"/preview' method='post'>"+csrf()+"<button class='secondary'>Отправить предпросмотр в приватный Telegram</button></form>"
 if status in ("approved","scheduled"):
  local=(now()+timedelta(days=1)).astimezone(TZ).strftime("%Y-%m-%dT12:00")
  body+="<hr><form method='post' action='/post/"+str(pid)+"/schedule'>"+csrf()+"<label>Дата и время (Бали, UTC+8)<input type='datetime-local' name='when' value='"+local+"' required></label><button>Поставить в расписание</button></form>"
 if status in ("scheduled","approved","missed","uncertain"):
  body+="<form method='post' action='/post/"+str(pid)+"/unschedule'>"+csrf()+"<button class='danger'>Снять с расписания / вернуть на согласование</button></form>"
 if v["title"]==ARTICLE_TITLE:
  body+="<p><a href='/research/security-2026' class='btn'>Открыть статью с графиками</a></p>"
 body+="</section></div><a class='btn secondary' href='/'>Все материалы</a>"
 return page(req,v["title"],body)
@app.post("/post/{pid}/edit")
def edit(req:Request,pid:int,csrf_token:str=Form(alias="csrf"),title:str=Form(),body:str=Form()):
 verify(req,csrf_token)
 if not title.strip() or not body.strip() or len(body)>4096:raise HTTPException(400)
 c=conn()
 try:c.execute("UPDATE posts SET title=?,body=?,updated_at=? WHERE id=? AND status='draft'",(title.strip()[:160],body.strip(),ts(),pid));c.commit()
 finally:c.close()
 return redirect("/post/"+str(pid))
@app.post("/post/{pid}/approve")
def approve(req:Request,pid:int,csrf_token:str=Form(alias="csrf")):
 verify(req,csrf_token)
 c=conn()
 try:c.execute("UPDATE posts SET status='approved',approved_at=?,updated_at=? WHERE id=? AND status='draft'",(ts(),ts(),pid));c.commit()
 finally:c.close()
 return redirect("/post/"+str(pid))
@app.post("/post/{pid}/schedule")
def schedule(req:Request,pid:int,csrf_token:str=Form(alias="csrf"),when:str=Form()):
 verify(req,csrf_token)
 try:moment=datetime.fromisoformat(when).replace(tzinfo=TZ).astimezone(timezone.utc)
 except ValueError:raise HTTPException(400,"Дата некорректна")
 if moment<now()+timedelta(minutes=5):raise HTTPException(400,"Укажи дату минимум на 5 минут в будущем")
 c=conn()
 try:c.execute("UPDATE posts SET status='scheduled',scheduled_at=?,updated_at=?,last_error=NULL WHERE id=? AND status IN ('approved','scheduled')",(moment.isoformat(timespec="seconds"),ts(),pid));c.commit()
 finally:c.close()
 return redirect("/post/"+str(pid))
@app.post("/post/{pid}/unschedule")
def unschedule(req:Request,pid:int,csrf_token:str=Form(alias="csrf")):
 verify(req,csrf_token)
 c=conn()
 try:c.execute("UPDATE posts SET status='approved',scheduled_at=NULL,last_error=NULL,updated_at=? WHERE id=? AND status IN ('scheduled','approved','missed','uncertain')",(ts(),pid));c.commit()
 finally:c.close()
 return redirect("/post/"+str(pid))
@app.post("/post/{pid}/preview")
async def preview(req:Request,pid:int,csrf_token:str=Form(alias="csrf")):
 verify(req,csrf_token)
 chat=setting("preview_chat","")
 if not chat:return redirect("/settings?notice=not_connected")
 c=conn()
 try:v=c.execute("SELECT * FROM posts WHERE id=?",(pid,)).fetchone()
 finally:c.close()
 if not v:raise HTTPException(404)
 try:
  result=await tg("sendMessage",{"chat_id":chat,"text":"ПРЕДПРОСМОТР · #"+str(pid)+"\n\n"+v["body"]+"\n\n──────────\nНе опубликовано в @aiadepts.","disable_notification":"true"})
 except Exception as ex:raise HTTPException(502,"Не удалось отправить предпросмотр: "+str(ex)[:150])
 c=conn()
 try:c.execute("UPDATE posts SET preview_message_id=?,updated_at=? WHERE id=?",(result["message_id"],ts(),pid));c.commit()
 finally:c.close()
 return redirect("/post/"+str(pid))
@app.get("/calendar")
def calendar(req:Request):
 require(req)
 c=conn()
 try:posts=c.execute("SELECT * FROM posts WHERE status IN ('approved','scheduled','published','missed') ORDER BY scheduled_at ASC").fetchall()
 finally:c.close()
 body="<div class='eyebrow'>PLANNING</div><h1>Календарь публикаций</h1><p class='muted'>Время указано по Бали (UTC+8). Посты в расписании не отправятся, пока очередь не активирована.</p><div class='panel'>"
 for v in posts:body+="<div class='line postrow'><div><span class='tag "+E(v["status"])+"'>"+E(statusname(v["status"]))+"</span><h3><a href='/post/"+str(v["id"])+"'>"+E(v["title"])+"</a></h3><time>"+E(stamp(v["scheduled_at"]))+"</time></div><a class='btn secondary' href='/post/"+str(v["id"])+"'>Открыть</a></div>"
 return page(req,"Календарь",body+("</div>" if posts else "<p class='muted'>Нет запланированных записей.</p></div>"))
@app.get("/settings")
def settings(req:Request):
 require(req)
 code=setting("connect_code","")
 if not code:
  code=secrets.token_hex(3).upper()
  put_setting("connect_code",code)
 chat=setting("preview_chat","")
 armed=setting("armed","0")=="1"
 body="<div class='eyebrow'>CONFIGURATION</div><h1>Настройки</h1><div class='grid'><section class='panel'><h2>Telegram-предпросмотр</h2>"
 if chat:body+="<p class='hint'>Подключено: "+E(setting("preview_name","Приватный чат"))+" (ID "+E(chat)+").</p>"
 else:body+="<p>Открой <a href='https://t.me/leimanlab_content_os_bot' target='_blank' rel='noopener'>@leimanlab_content_os_bot</a>, нажми Start и отправь ему команду:</p><div class='preview'>/connect "+E(code)+"</div><p class='muted'>Или добавь бота в отдельный закрытый канал/группу администратором и отправь эту команду туда. Публичный @aiadepts здесь не используем.</p>"
 body+="<form method='post' action='/settings/connect'>"+csrf()+"<button class='secondary'>Проверить подключение</button></form>"
 if chat:body+="<form method='post' action='/settings/disconnect'>"+csrf()+"<button class='danger'>Отключить чат предпросмотра</button></form>"
 body+="</section><section class='panel'><h2>Автопубликация</h2><p>Целевой канал: <strong>"+E(CHANNEL)+"</strong></p><p>Статус: <strong>"+("Активирована" if armed else "Выключена")+"</strong></p>"
 if os.getenv("ENABLE_PUBLISHING")!="true":body+="<p class='hint'>Защитный переключатель Railway ENABLE_PUBLISHING отключён. Автоматическая публикация невозможна.</p>"
 elif armed:body+="<form method='post' action='/settings/arm'>"+csrf()+field("mode","off")+"<button class='danger'>Остановить очередь</button></form>"
 else:body+="<p class='muted'>Включение разрешает отправку только одобренных материалов в назначенное время. Пропущенные более чем на 10 минут публикации не отправляются автоматически.</p><form method='post' action='/settings/arm'>"+csrf()+field("mode","on")+"<label>Для активации введи ВКЛЮЧИТЬ<input name='confirmation' required></label><button>Активировать очередь</button></form>"
 body+="</section></div>"
 return page(req,"Настройки",body)
@app.post("/settings/connect")
async def connect(req:Request,csrf_token:str=Form(alias="csrf")):
 verify(req,csrf_token)
 code=setting("connect_code")
 try:chat,name=await connect_chat(code)
 except Exception as exc:raise HTTPException(400,str(exc)[:160])
 if chat==CHANNEL or name.lower().strip()=="ai adepts":raise HTTPException(400,"Основной канал нельзя использовать как предпросмотр")
 put_setting("preview_chat",chat);put_setting("preview_name",name);put_setting("connect_code",secrets.token_hex(3).upper())
 return redirect("/settings")
@app.post("/settings/disconnect")
def disconnect(req:Request,csrf_token:str=Form(alias="csrf")):
 verify(req,csrf_token)
 put_setting("preview_chat","");put_setting("preview_name","")
 return redirect("/settings")
@app.post("/settings/arm")
def arm(req:Request,csrf_token:str=Form(alias="csrf"),mode:str=Form(),confirmation:str=Form("")):
 verify(req,csrf_token)
 if mode=="on":
  if os.getenv("ENABLE_PUBLISHING")!="true" or confirmation!="ВКЛЮЧИТЬ":raise HTTPException(403)
  put_setting("armed","1")
 else:put_setting("armed","0")
 return redirect("/settings")

@app.get("/research/security-2026")
def security_research(req:Request):
 require(req)
 c=conn()
 try:
  v=c.execute("SELECT id FROM posts WHERE title=? ORDER BY id DESC LIMIT 1",(ARTICLE_TITLE,)).fetchone()
 finally:c.close()
 if not v:raise HTTPException(404,"Article not found")
 return page(req,ARTICLE_TITLE,article_html(v["id"]))
