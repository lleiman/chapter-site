# Leiman Telegram Connector — setup and recovery

## Runtime
- Service: `leiman-telegram-connector / telegram-connector`.
- Health endpoint: `GET /health` must return `{"ok":true}`.
- Railway custom Start Command must invoke a shell for the PORT expansion:
  `sh -c 'exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --no-access-log'`.
  A bare `--port $PORT` fails with `'$PORT' is not a valid integer`.

## Configure in Railway Variables (never commit credentials)
- `ADMIN_PASSWORD`: random strong password, at least 20 characters, required for the private interface.
- `TELEGRAM_BOT_TOKEN`: bot created using BotFather, set as administrator of the target channel with posting permission.
- `TELEGRAM_CHANNEL`: channel username (e.g. `@your_channel`) or numeric chat ID.
- `ENABLE_PUBLISHING`: `true` only once the bot and target channel have been independently verified. Otherwise leave false.
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_SESSION_STRING`: OPTIONAL for personal MTProto dialog access; not required for bot-based channel posting. Treat the session string as a password and avoid enabling dialog access when only channel posting is required.
- `ENABLE_EXPORT`: leave false unless selected export is explicitly needed.

## Verification
1. Verify public `/health`.
2. Verify authenticated `/` while unauthenticated access returns 401 or 503.
3. Prepare a harmless preview at `/publish`; no message should be sent before entering the explicit confirmation word.
4. When a verified bot and channel are configured, test publishing first to a private test channel.
5. Save the sent message ID, timestamp, target, and resulting URL for analytics and duplicate prevention.

## Publishing architecture
GPT drafts and adapts. User reviews the preview. Telegram Bot API delivers approved content. Use a separate official vc.ru Telegram-import bot subject to vc.ru moderation for channel-to-vc.ru syndication. For Facebook Pages / Instagram Professional accounts, use authorized Meta integration or Metricool. Keep platform credentials outside the repo. Maintain per-platform delivery logs and do not retry blindly on ambiguous success.

## Non-publishing permission diagnostic
The service makes read-only `getMe`, `getChat`, and `getChatMember` Bot API requests at startup. Check the Railway deploy log entry `TELEGRAM_BOT_ACCESS` for bot identity, channel accessibility, and `can_post_messages`. It does not send a channel message, log credentials, or require a personal Telegram session.
