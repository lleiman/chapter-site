# Railway: безопасный путь к GitHub-автодеплою

## Исходные данные

- Railway: https://railway.com/project/ba46017b-40d4-483f-8a07-153cdb453078
- Production environment `e4f0fac0-3daa-48ca-afb4-be4426a2732e`
- Старый работающий Function `journal`, service `033f7f05-4bd3-47c4-9de5-77e941fb9edd`
- Старый URL: https://journal-production-3e67.up.railway.app/
- GitHub: `lleiman/chapter-site`, ветка `leiman-lab-journal`, вложенная папка `leiman-lab-journal`

## Стратегия без простоя

1. Открыть Railway-проект, проверить список сервисов. Если новый GitHub-service **уже есть**, не дублировать.
2. Добавить GitHub source к существующему новому service (или создать один отдельный, например `journal-web`). **Не отключать** Function `journal`.
3. Source: `lleiman/chapter-site`, branch `leiman-lab-journal` (НЕ `main`). Root directory: `/leiman-lab-journal`.
4. Start command: `npm start`; builder: Railpack; Healthcheck: `/health`; `PORT` Railway передаёт автоматически. Репозиторий содержит `package.json` в указанной папке, зависимостей npm нет.
5. В Railway Settings → Networking сгенерировать **новый** домен для `journal-web`, прежде чем переносить старый.
6. Проверить 10 проверок: `/`, `/health`, `/articles/warhound`, `/articles/black-october`, обе картинки, CSS, favicon, sitemap, RSS. HTTP 200, OG на двух страницах; в `warhound` есть блок об этике и ссылка на первоисточники.
7. Только после проверки безопасно настроить основной домен. Старые ссылки в Telegram должны продолжать открываться. Проверить архивные посты и пересылки.
8. Сделать безопасный test commit (`docs/DEPLOY_CHECK.md` или README правка), дождаться автоматического Railway deployment и повторить HTTP-проверку.

## Проверки CLI

```bash
node --version
npm test
npm start
# в другом терминале
curl -i http://localhost:3000/health
curl -fsS http://localhost:3000/articles/warhound | grep -o 'property="og:image"[^>]*'
curl -fsS http://localhost:3000/assets/warhound-1200x630.png -o /tmp/warhound.png
file /tmp/warhound.png
```

Для публичного домена заменить `http://localhost:3000` на фактический Railway URL.

## Известные ошибки и проверки

- `404 /articles/warhound`: скорее всего работает старый Function, а не новая GitHub-ветка.
- `502 Application failed to respond`: проверить Railway Deployment Logs, `$PORT`, healthcheck и корневую папку.
- `No package.json found`: ошибочно выбрана корневая папка монорепозитория — укажи `/leiman-lab-journal`.
- `Repository not accessible`: подключить GitHub access внутри Railway, а не искать новый ChatGPT OAuth.
- `link_id must identify an eligible linked account`: ошибка инструмента ChatGPT, **не означает**, что Railway-сайт не работает. Использовать Railway UI/CLI.
- Telegram не показывает превью: проверить абсолютный `og:image` URL, HTTP 200, Content-Type `image/png`, размеры 1200×630 и кэш Telegram. Instant View — другая функция.

## Rollback

До подтверждения нового домена не изменять старый Function. Если новый сервис падает, оставить старый на месте, вернуть последний рабочий коммит или выполнить rollback Railway deployment. Все публикации лежат в `content/*.json`.
