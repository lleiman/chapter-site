import os,secrets,json,statistics
from html import escape
import httpx
from fastapi import FastAPI,Depends,Form,HTTPException
from fastapi.security import HTTPBasic,HTTPBasicCredentials
from fastapi.responses import HTMLResponse,Response
app=FastAPI(docs_url=None,redoc_url=None,openapi_url=None)
basic=HTTPBasic()
nonce=secrets.token_urlsafe(24)
client=None
def admin(c:HTTPBasicCredentials=Depends(basic)):
 p=os.getenv("ADMIN_PASSWORD","")
 if len(p)<20:raise HTTPException(503,"Configure strong ADMIN_PASSWORD")
 if not(secrets.compare_digest(c.username,"admin") and secrets.compare_digest(c.password,p)):
  raise HTTPException(401,"Unauthorized",headers={"WWW-Authenticate":'Basic realm="Leiman Telegram"'})
def csrf(v):
 if not secrets.compare_digest(nonce,v):raise HTTPException(403,"CSRF")
def page(h,body):
 return HTMLResponse('<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{background:#101013;color:#eee;font:17px/1.5 system-ui;max-width:900px;margin:45px auto;padding:20px}a{color:#ff6670;margin-right:20px}input,textarea{display:block;width:100%;box-sizing:border-box;margin:12px 0;padding:12px;background:#252529;color:white}textarea{min-height:160px}button{padding:12px;background:#df3444;color:white;border:0}pre{white-space:pre-wrap}li{margin:10px}</style></head><body><nav><a href="/">Обзор</a><a href="/chats">Чаты</a><a href="/insights">Анализ</a><a href="/publish">Канал</a></nav><h1>'+escape(h)+'</h1>'+body+'</body></html>',headers={"Cache-Control":"no-store","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none';style-src 'unsafe-inline';form-action 'self';frame-ancestors 'none'"})
async def tg():
 global client
 aid=os.getenv("TELEGRAM_API_ID","")
 ah=os.getenv("TELEGRAM_API_HASH","")
 ss=os.getenv("TELEGRAM_SESSION_STRING","")
 if not(aid.isdigit() and ah and ss):raise HTTPException(503,"Set Telegram credentials in Railway Variables")
 if client is None:
  from telethon import TelegramClient
  from telethon.sessions import StringSession
  client=TelegramClient(StringSession(ss),int(aid),ah,receive_updates=False)
 if not client.is_connected():await client.connect()
 if not await client.is_user_authorized():raise HTTPException(401,"Reauthorize Telegram")
 return client
@app.on_event("startup")
async def check_telegram_bot_access():
 # Read-only Telegram checks. Bot tokens and message content must never enter logs.
 token=os.getenv("TELEGRAM_BOT_TOKEN","")
 channel=os.getenv("TELEGRAM_CHANNEL","")
 status={"token_configured":bool(token),"token_format_valid":bool(__import__("re").fullmatch(r"[0-9]+:[A-Za-z0-9_-]{35,}",token)),"token_length":len(token),"token_has_colon":":" in token,"token_starts_digit":bool(token and token[0].isdigit()),"token_has_outer_whitespace":bool(token!=token.strip()),"token_is_reference_literal":"${{" in token,"channel_configured":bool(channel),"token_valid":False,"channel_access":False,"can_post_messages":False}
 def api_error(payload):
  return str(payload.get("description","unknown"))[:128].replace(token,"[redacted]")
 if token and channel:
  try:
   async with httpx.AsyncClient(timeout=12) as h:
    api="https://api.telegram.org/bot"+token+"/"
    identity=(await h.get(api+"getMe")).json()
    status["token_valid"]=bool(identity.get("ok"))
    if status["token_valid"]:
     bot=identity["result"]
     status["bot_username"]=str(bot.get("username",""))[:80]
     chat=(await h.get(api+"getChat",params={"chat_id":channel})).json()
     status["chat_access"]=bool(chat.get("ok"))
     if not chat.get("ok"):status["chat_error"]=api_error(chat)
     rights=(await h.get(api+"getChatMember",params={"chat_id":channel,"user_id":bot["id"]})).json()
     if rights.get("ok"):
      status["channel_access"]=True
      member=rights.get("result") or {}
      status["role"]=member.get("status","unknown")
      status["can_post_messages"]=bool(member.get("can_post_messages",False))
     else:status["permission_error"]=api_error(rights)
    else:status["identity_error"]=api_error(identity)
  except (httpx.HTTPError, ValueError, KeyError, TypeError):
   status["probe_error"]="telegram_api_unreachable_or_invalid_response"
 print("TELEGRAM_BOT_ACCESS "+json.dumps(status,sort_keys=True),flush=True)

@app.get("/health")
async def health():return {"ok":True}
@app.get("/",dependencies=[Depends(admin)])
async def index():
 return page("Leiman Telegram Connector","<p>Приватное исследование переписок и подтверждаемая публикация через отдельного бота. Автоматическое чтение и отправка выключены.</p><p>Telegram: "+("настроен" if os.getenv("TELEGRAM_SESSION_STRING") else "требуется авторизация")+"; публикация: "+("включена" if os.getenv("ENABLE_PUBLISHING")=="true" else "выключена")+"</p><p>Ключи Telegram загружаются только из Railway Variables. Код входа вводится локально, вне сайта.</p>")
@app.get("/chats",dependencies=[Depends(admin)])
async def chats():
 c=await tg();rows=[]
 async for d in c.iter_dialogs(limit=60):
  rows.append("<li>"+escape(d.name or "Без названия")+" · <a href='/chat/"+str(d.id)+"'>Метрики</a></li>")
 return page("Последние 60 чатов","<ol>"+"".join(rows)+"</ol>")
async def get_dialog(c,chat_id):
 async for d in c.iter_dialogs(limit=None):
  if d.id==chat_id:return d
 raise HTTPException(404,"No such dialog")
@app.get("/chat/{chat_id}",dependencies=[Depends(admin)])
async def chat_stats(chat_id:int):
 c=await tg();d=await get_dialog(c,chat_id);ms=await c.get_messages(d.entity,limit=80)
 return page("Метрики диалога","<p>"+escape(d.name or "")+": "+str(len(ms))+" сообщений, исходящих "+str(sum(bool(m.out) for m in ms))+", входящих "+str(sum(not m.out for m in ms))+".</p>"+("<p><a href='/export/"+str(chat_id)+"'>Выгрузить 80 сообщений</a></p>" if os.getenv("ENABLE_EXPORT")=="true" else "<p>Экспорт текста отключён.</p>"))
@app.get("/export/{chat_id}",dependencies=[Depends(admin)])
async def export(chat_id:int):
 if os.getenv("ENABLE_EXPORT")!="true":raise HTTPException(403,"Export disabled")
 c=await tg();d=await get_dialog(c,chat_id);ms=await c.get_messages(d.entity,limit=80)
 rows=[{"date":m.date.isoformat() if m.date else None,"mine":bool(m.out),"text":m.message or ""} for m in reversed(ms) if not m.action]
 return Response(json.dumps(rows,ensure_ascii=False),media_type="application/json",headers={"Cache-Control":"no-store","Content-Disposition":'attachment; filename="selected-telegram-chat.json"'})
@app.get("/insights",dependencies=[Depends(admin)])
async def insights():
 c=await tg();rows=[]
 async for d in c.iter_dialogs(limit=20):
  if d.is_channel and not d.is_group:continue
  ms=await c.get_messages(d.entity,limit=60)
  rows.append("<li>"+escape(d.name or "")+": "+str(len(ms))+" сообщений, исходящих "+str(sum(bool(m.out) for m in ms))+"</li>")
 return page("Описательная статистика","<p>До 20 недавних чатов и 60 сообщений на каждый. Без расшифровки голосовых и без выводов о мотивах.</p><ol>"+"".join(rows)+"</ol>")
@app.get("/publish",dependencies=[Depends(admin)])
async def publish():
 return page("Подготовить публикацию","<p>Для отправки необходим бот с правом публикации в выбранном канале. Публикация выключена по умолчанию.</p><form method='post' action='/preview'><input type='hidden' name='csrf' value='"+nonce+"'><label>Текст<textarea name='body' required></textarea></label><label>Ссылка на обложку<input name='photo' value='https://journal-production-3e67.up.railway.app/assets/human-voice-1200x630.png'></label><button>Предпросмотр</button></form>")
@app.post("/preview",dependencies=[Depends(admin)])
async def preview(csrf_value:str=Form(alias="csrf"),body:str=Form(),photo:str=Form("")):
 csrf(csrf_value)
 if len(body)> (1024 if photo else 4096) or not body.strip():raise HTTPException(400,"Invalid text length")
 if photo and not photo.startswith("https://journal-production-3e67.up.railway.app/assets/"):raise HTTPException(400,"Invalid image domain")
 return page("Предпросмотр","<pre>"+escape(body)+"</pre><p>Канал: "+escape(os.getenv("TELEGRAM_CHANNEL","Не задан"))+"</p><form action='/send' method='post'><input type='hidden' name='csrf' value='"+nonce+"'><input type='hidden' name='body' value='"+escape(body,quote=True)+"'><input type='hidden' name='photo' value='"+escape(photo,quote=True)+"'><input required name='confirm' placeholder='ОПУБЛИКОВАТЬ'><button>Подтвердить отправку</button></form>")
@app.post("/send",dependencies=[Depends(admin)])
async def send(csrf_value:str=Form(alias="csrf"),body:str=Form(),photo:str=Form(""),confirm:str=Form()):
 csrf(csrf_value)
 if confirm!="ОПУБЛИКОВАТЬ" or os.getenv("ENABLE_PUBLISHING")!="true":raise HTTPException(403,"Publishing disabled")
 token=os.getenv("TELEGRAM_BOT_TOKEN");channel=os.getenv("TELEGRAM_CHANNEL")
 if not token or not channel:raise HTTPException(503,"Bot not configured")
 if photo and not photo.startswith("https://journal-production-3e67.up.railway.app/assets/"):raise HTTPException(400,"Invalid image")
 if len(body)>(1024 if photo else 4096) or not body.strip():raise HTTPException(400,"Invalid text length")
 endpoint="sendPhoto" if photo else "sendMessage"
 payload={"chat_id":channel,"caption":body,"photo":photo} if photo else {"chat_id":channel,"text":body}
 async with httpx.AsyncClient(timeout=25) as h:
  response=await h.post("https://api.telegram.org/bot"+token+"/"+endpoint,data=payload)
  try:res=response.json()
  except Exception:raise HTTPException(502,"Telegram failed")
 if not res.get("ok"):raise HTTPException(502,"Telegram rejected posting; check bot permissions")
 return page("Отправлено","<p>Telegram принял сообщение №"+str(res["result"]["message_id"])+".</p>")
