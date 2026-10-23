# Leiman Lab Journal

Редакционный сайт исследовательской лаборатории Льва Леймана. Мобильная вёрстка, статьи, первоисточники, собственные Open Graph PNG-карточки для Telegram.

## Структура

- server.mjs — сервер Node.js, генерация страниц и PNG превью;
- style.css — дизайн-система;
- content/001-black-october.json — материал о кибербезопасности;
- content/002-warhound.json — материал о Warhound.

Для новых публикаций достаточно добавить JSON в папку content с полями slug, number, date, dateLabel, category, title, description, summary, blocks, sources. Сайт автоматически отсортирует статьи по датам и создаст для каждой Open Graph карточку.

## Локальный запуск

    npm install
    npm start

Открыть http://localhost:3000 и http://localhost:3000/health. Нужен Node.js 20+.

## Однократное подключение к Railway

В проекте Railway leiman-lab-journal (ID: ba46017b-40d4-483f-8a07-153cdb453078):

1. Добавить новый service ("New" → "GitHub Repo"). Действующий Railway Function journal не удалять.
2. Repository: lleiman/chapter-site.
3. Branch: leiman-lab-journal.
4. Root Directory: /leiman-lab-journal.
5. Start command: npm start (или autodetection из package.json).
6. Healthcheck path: /health.
7. Сгенерировать домен и проверить /articles/warhound и /og/warhound.png.

После однократной настройки Railway будет автоматически деплоить новые коммиты этой ветки. Сохранять прежний Railway Function, пока новый веб-сервис не заработает.

Если требуется сохранить старый адрес journal-production-3e67.up.railway.app, отдельно проверьте возможность переноса/перепривязки домена. Не удаляйте существующий адрес, пока новый сервис не проверен.

## Публикации

Сайту не нужен доступ к твоим API-ключам или секретам. Не переносите переменные окружения из исследовательских проектов.

### Telegram

Ссылка на страницу статьи показывает Open Graph изображение 1200×630, заголовок и аннотацию. В обычном Telegram Browser статья открывается как веб-страница. Telegram Instant View не включён: это отдельная настройка, а не автоматическая функция Open Graph.

## Источники

Исходные материалы содержат ссылки на первичные сообщения компаний и независимые публикации. Даты фиксируют состояние информации на момент публикации.
