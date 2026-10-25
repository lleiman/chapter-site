import asyncio,getpass,os
from telethon import TelegramClient
from telethon.sessions import StringSession
async def run():
 api_id=int(os.getenv('TELEGRAM_API_ID') or input('api_id from my.telegram.org: '))
 api_hash=os.getenv('TELEGRAM_API_HASH') or getpass.getpass('api_hash: ')
 phone=input('Phone number (international): ')
 async with TelegramClient(StringSession(),api_id,api_hash) as c:
  await c.start(phone=phone,code_callback=lambda:input('Telegram login code: '),password=lambda:getpass.getpass('Telegram 2FA password: '))
  print('TELEGRAM_SESSION_STRING (SECRET):')
  print(c.session.save())
  print('Save ONLY as Railway Variable; never paste in chat or GitHub.')
if __name__=='__main__':asyncio.run(run())
