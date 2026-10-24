/**
 * LEIMAN LAB — on-site text editor.
 * Loaded on ⌘⇧E / Ctrl+Shift+E or ?edit. Edits [data-edit] text in place and saves it
 * to the server (Railway volume). A password is asked only when the server has ADMIN_PASSWORD;
 * it is then kept in sessionStorage for this tab only.
 */
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} },
};
const body = document.body;
const pageType = body.dataset.page;
const slug = body.dataset.slug;
const editables = () => [...document.querySelectorAll('[data-edit]')];
const original = new Map();
const dirty = new Set();
let meta = null;      // { article, version, edited } for article pages
let active = false;
let panel, statusEl;

const css = `
.ll-editing{padding-bottom:140px}
.ll-editing [data-edit]{white-space:pre-wrap;text-transform:none;outline:1px dashed var(--line);outline-offset:3px;cursor:text;transition:outline-color .15s}
.ll-editing [data-edit]:hover{outline-color:var(--quiet)}
.ll-editing [data-edit]:focus{outline:1px solid var(--red)}
.ll-editing [data-edit].ll-dirty{outline:1px solid var(--red);outline-offset:3px;box-shadow:-9px 0 0 -6px var(--red)}
.ll-panel{position:fixed;left:0;right:0;bottom:0;z-index:50;background:var(--panel);border-top:1px solid var(--line);color:var(--paper)}
.ll-panel .ll-row{width:min(var(--container),calc(100% - 32px));margin-inline:auto;display:flex;flex-wrap:wrap;align-items:center;gap:12px 18px;padding:14px 0}
.ll-panel .ll-status{flex:1 1 240px;min-width:0}
.ll-panel .ll-status b{color:var(--red);font-weight:inherit}
.ll-panel .ll-actions{display:flex;flex-wrap:wrap;gap:8px}
.ll-panel .button{min-height:40px;padding:10px 14px;gap:12px}
.ll-panel .button[disabled]{opacity:.4;cursor:default}
.ll-panel .ll-fields{width:min(var(--container),calc(100% - 32px));margin-inline:auto;display:none;gap:14px;padding:4px 0 16px;border-bottom:1px solid var(--line)}
.ll-panel.ll-open .ll-fields{display:grid}
.ll-panel .ll-stats{width:min(var(--container),calc(100% - 32px));margin-inline:auto;display:none;padding:14px 0 16px;border-bottom:1px solid var(--line);max-height:46vh;overflow:auto}
.ll-panel.ll-stats-open .ll-stats{display:block}
.ll-panel .ll-announce{width:min(var(--container),calc(100% - 32px));margin-inline:auto;display:none;padding:14px 0 16px;border-bottom:1px solid var(--line);max-height:58vh;overflow:auto}
.ll-panel.ll-announce-open .ll-announce{display:block}
.ll-ann-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,360px);gap:22px}.ll-ann-grid label{display:grid;gap:6px;margin-bottom:10px}
.ll-ann-bubble{background:#1c1c20;border:1px solid var(--line);border-radius:12px;padding:12px 14px;font:15px/1.45 var(--sans);color:var(--paper);white-space:pre-wrap;word-break:break-word}
.ll-ann-bubble a{color:#6ab3f3;text-decoration:none}.ll-ann-card{margin-top:10px;border-left:3px solid #6ab3f3;padding-left:10px;white-space:normal}
.ll-ann-card b{display:block;color:#6ab3f3;font-size:13px}.ll-ann-card strong{display:block;margin-top:2px}.ll-ann-card span{display:block;color:var(--soft);font-size:14px}
.ll-ann-card img{display:block;width:100%;border-radius:8px;margin-top:8px;aspect-ratio:1200/630;object-fit:cover}
.ll-ann-count.ll-over{color:var(--red)}.ll-ann-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
@media (max-width:700px){.ll-ann-grid{grid-template-columns:1fr}}
.ll-stats-sum{display:flex;flex-wrap:wrap;gap:8px 28px;margin-bottom:14px}.ll-stats-sum b{display:block;font:700 26px/1.1 var(--sans);letter-spacing:-.03em;color:var(--paper)}
.ll-stats table{width:100%;border-collapse:collapse;font:13px/1.45 var(--mono)}.ll-stats th{text-align:left;color:var(--quiet);font-weight:600;font-size:10px;letter-spacing:.09em;text-transform:uppercase;padding:6px 10px 6px 0;border-bottom:1px solid var(--line)}
.ll-stats td{padding:7px 10px 7px 0;border-bottom:1px solid #222226;color:var(--soft);word-break:break-word}.ll-stats td.num,.ll-stats th.num{text-align:right;white-space:nowrap}
.ll-stats .ll-utm-link{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px}.ll-stats .ll-utm-link code{flex:1 1 280px;background:var(--ink);border:1px solid var(--line);padding:8px 10px;font:12px/1.4 var(--mono);color:var(--soft);word-break:break-all}
.ll-panel label{display:grid;gap:6px}
.ll-panel input,.ll-panel textarea,.ll-panel select{width:100%;background:var(--ink);color:var(--paper);border:1px solid var(--line);padding:9px 11px;font:15px/1.5 var(--sans);resize:vertical}
.ll-panel input:focus,.ll-panel textarea:focus{outline:1px solid var(--red);border-color:var(--red)}
.ll-login{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(11,11,13,.86);padding:16px}
.ll-login form{width:min(420px,100%);background:var(--panel);border:1px solid var(--line);padding:26px;display:grid;gap:16px}
.ll-login input{background:var(--ink);color:var(--paper);border:1px solid var(--line);padding:12px;font:16px var(--sans)}
.ll-login input:focus{outline:1px solid var(--red);border-color:var(--red)}
.ll-login .ll-err{color:var(--red);min-height:1.5em}
@media (max-width:700px){.ll-panel .ll-actions{width:100%}.ll-panel .button{flex:1 1 auto;justify-content:center}}
`;

async function api(method, url, data) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Password': store.get('ll-admin-pw') || '' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `Ошибка ${res.status}`), { status: res.status });
  return json;
}

function askPassword() {
  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'll-login';
    box.innerHTML = `<form><div class="eyebrow"><span class="red-square"></span>РЕДАКТОР / LEIMAN LAB</div>
      <input type="password" autocomplete="current-password" placeholder="Пароль" aria-label="Пароль редактора" required>
      <div class="micro ll-err" role="alert"></div>
      <div class="ll-actions" style="display:flex;gap:8px"><button class="button button-primary" type="submit">ВОЙТИ</button><button class="button button-line" type="button">ОТМЕНА</button></div></form>`;
    const form = box.querySelector('form'), input = box.querySelector('input'), err = box.querySelector('.ll-err');
    box.querySelector('button[type=button]').onclick = () => { box.remove(); resolve(false); };
    form.onsubmit = async e => {
      e.preventDefault();
      store.set('ll-admin-pw', input.value);
      try { await api('POST', '/api/admin/login'); box.remove(); resolve(true); }
      catch (error) { store.set('ll-admin-pw', null); err.textContent = error.message; input.select(); }
    };
    document.body.append(box);
    input.focus();
  });
}

const field = (key, label, multiline, options) => `<label><span class="micro muted">${label}</span>${
  options ? `<select data-field="${key}">${options.map(o => `<option value="${o.slug}">${o.title.replace(/[<>&"]/g, '')}</option>`).join('')}</select>`
  : multiline ? `<textarea rows="3" data-field="${key}"></textarea>` : `<input data-field="${key}">`}</label>`;

function buildPanel() {
  panel = document.createElement('div');
  panel.className = 'll-panel';
  const a = meta?.article;
  const fields = [];
  if (a) {
    if (meta.rubrics?.length) fields.push(['rubric', 'Рубрика', a.rubric ?? '', false, meta.rubrics]);
    if (a.headline !== undefined) fields.push(['title', 'Заголовок для карточки на главной и превью Telegram', a.title]);
    if (a.deck !== undefined) fields.push(['summary', 'Текст карточки на главной', a.summary, true]);
    fields.push(['description', 'Описание в превью Telegram (пусто — как текст карточки)', a.description ?? '', true]);
    fields.push(['tags', 'Теги через запятую', (a.tags || []).join(', ')]);
    fields.push(['story', 'Сюжет: одинаковое название у нескольких статей собирает их в общий блок', a.story ?? '']);
    fields.push(['changeNote', 'Что исправлено — попадёт в «Историю правок» под статьёй (необязательно; опечатки можно не записывать)', '', true]);
  }
  panel.innerHTML = `${pageType !== 'about' ? '<div class="ll-stats" aria-live="polite"></div>' : ''}${pageType === 'article' ? '<div class="ll-announce"></div>' : ''}${fields.length ? `<div class="ll-fields">${fields.map(f => field(f[0], f[1], f[3], f[4])).join('')}</div>` : ''}
  <div class="ll-row">
    <div class="ll-status micro"></div>
    <div class="ll-actions">
      ${a?.draft ? '<button class="button button-primary" data-act="publish" type="button">ОПУБЛИКОВАТЬ</button>' : ''}
      ${pageType !== 'about' ? '<button class="button button-line" data-act="stats" type="button">СТАТИСТИКА</button>' : ''}
      ${pageType === 'article' ? '<button class="button button-line" data-act="announce" type="button">АНОНС</button>' : ''}
      ${fields.length ? '<button class="button button-line" data-act="fields" type="button">ПРЕВЬЮ И КАРТОЧКА</button>' : ''}
      <button class="button button-line" data-act="revert" type="button">ОТМЕНИТЬ</button>
      ${meta?.edited || pageType !== 'article' ? '<button class="button button-line" data-act="reset" type="button">СБРОСИТЬ К GIT</button>' : ''}
      <button class="button button-line" data-act="exit" type="button">ВЫЙТИ</button>
      <button class="button button-primary" data-act="save" type="button">СОХРАНИТЬ</button>
    </div>
  </div>`;
  for (const [key, , value] of fields) {
    const el = panel.querySelector(`[data-field="${key}"]`);
    el.value = value; el.dataset.original = value;
    const track = () => { el.value !== el.dataset.original ? dirty.add('field:' + key) : dirty.delete('field:' + key); update(); };
    el.addEventListener('input', track); el.addEventListener('change', track);
  }
  statusEl = panel.querySelector('.ll-status');
  panel.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'save') save();
    if (act === 'revert') revert();
    if (act === 'exit') toggle();
    if (act === 'fields') panel.classList.toggle('ll-open');
    if (act === 'stats') { panel.classList.toggle('ll-stats-open'); if (panel.classList.contains('ll-stats-open')) (pageType === 'home' ? loadAllStats() : loadStats()); }
    if (act === 'announce') { panel.classList.toggle('ll-announce-open'); if (panel.classList.contains('ll-announce-open')) buildAnnounce(); }
    if (act === 'publish') publish();
    if (act === 'reset') reset();
  });
  document.body.append(panel);
}

// ---------- Article statistics (views, «дочитали», UTM tags) ----------
const pct = (part, whole) => whole ? `${Math.round(part / whole * 100)}%` : '—';
const n = v => Number(v).toLocaleString('ru-RU');
function cell(tag, text, cls) { const c = document.createElement(tag); c.textContent = text; if (cls) c.className = cls; return c; }

async function loadAllStats() {
  const box = panel.querySelector('.ll-stats');
  box.textContent = 'ЗАГРУЖАЮ…';
  try {
    const { articles } = await api('GET', '/api/admin/stats');
    const table = document.createElement('table');
    const head = document.createElement('tr');
    for (const [t, c] of [['Статья'], ['Просмотры', 'num'], ['Дочитали', 'num'], ['Доля', 'num'], ['Из Telegram', 'num'], ['♥', 'num'], ['Комм.', 'num']]) head.append(cell('th', t, c));
    table.append(head);
    for (const a of articles) {
      const tr = document.createElement('tr');
      const name = cell('td', ''); const link = cell('a', a.title + (a.draft ? ' · черновик' : '')); link.href = `/articles/${a.slug}`; name.append(link);
      tr.append(name, cell('td', n(a.views), 'num'), cell('td', n(a.reads), 'num'), cell('td', pct(a.reads, a.views), 'num'), cell('td', `${n(a.telegramViews)} / ${n(a.telegramReads)}`, 'num'), cell('td', n(a.likes), 'num'), cell('td', n(a.comments), 'num'));
      table.append(tr);
    }
    const sum = k => articles.reduce((t, a) => t + a[k], 0);
    const total = document.createElement('tr');
    total.append(cell('td', 'ВСЕГО'), cell('td', n(sum('views')), 'num'), cell('td', n(sum('reads')), 'num'), cell('td', pct(sum('reads'), sum('views')), 'num'), cell('td', `${n(sum('telegramViews'))} / ${n(sum('telegramReads'))}`, 'num'), cell('td', n(sum('likes')), 'num'), cell('td', n(sum('comments')), 'num'));
    table.append(total);
    box.replaceChildren(table, cell('p', '«Из Telegram» — просмотры / дочитывания по ссылкам с меткой utm_source=telegram (учёт меток с 24.10.2026). Подробности по меткам — в статистике каждой статьи.', 'micro muted'));
  } catch (error) { box.textContent = `НЕ ЗАГРУЗИЛОСЬ: ${error.message}`; }
}

// ---------- Telegram announcement: text, character count, preview, link with UTM ----------
function buildAnnounce() {
  const box = panel.querySelector('.ll-announce');
  if (box.dataset.ready) return;
  box.dataset.ready = '1';
  const a = meta.article;
  const key = `ll-ann-${slug}`;
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
  const og = name => document.querySelector(`meta[property="og:${name}"]`)?.content || '';
  box.innerHTML = `<div class="ll-ann-grid"><div>
      <label><span class="micro muted">ТЕКСТ ПОСТА · ПЕРВАЯ СТРОКА — ФАКТ ИЗ ЛИДА · ЖИРНЫЙ В TELEGRAM: **ТАК**</span><textarea rows="7" data-ann="text"></textarea><span class="micro muted ll-ann-count"></span></label>
      <label><span class="micro muted">НОМЕР ИЛИ МЕТКА ПОСТА (utm_content)</span><input data-ann="post" placeholder="post"></label>
      <div class="ll-ann-actions"><button type="button" class="button button-primary" data-ann="copy-post">КОПИРОВАТЬ ПОСТ</button><button type="button" class="button button-line" data-ann="copy-link">КОПИРОВАТЬ ССЫЛКУ</button></div>
    </div><div><div class="micro muted" style="margin-bottom:6px">ТАК ПРИМЕРНО ВЫГЛЯДИТ В КАНАЛЕ</div><div class="ll-ann-bubble"></div></div></div>`;
  const text = box.querySelector('[data-ann=text]'), post = box.querySelector('[data-ann=post]'), count = box.querySelector('.ll-ann-count'), bubble = box.querySelector('.ll-ann-bubble');
  text.value = saved.text ?? `**${a.title}**\n\n${a.summary}`;
  post.value = saved.post ?? '';
  const link = () => `${location.origin}/articles/${slug}?utm_source=telegram&utm_medium=messenger&utm_campaign=${slug}&utm_content=${encodeURIComponent(post.value.trim() || 'post')}`;
  function render() {
    try { localStorage.setItem(key, JSON.stringify({ text: text.value, post: post.value })); } catch {}
    const plain = text.value.replace(/\*\*/g, '');
    count.textContent = `${plain.length} ЗНАКОВ БЕЗ ССЫЛКИ · РЕКОМЕНДАЦИЯ ИССЛЕДОВАНИЯ — ДО 400`;
    count.classList.toggle('ll-over', plain.length > 400);
    bubble.replaceChildren();
    plain.split('\n').forEach((line, i, all) => {
      const node = i === 0 ? cell('strong', line) : document.createTextNode(line);
      bubble.append(node); if (i < all.length - 1) bubble.append('\n');
    });
    const url = link();
    const linkEl = cell('a', url); linkEl.href = url; linkEl.target = '_blank';
    bubble.append('\n\n', linkEl);
    const cardEl = cell('div', '', 'll-ann-card');
    const img = document.createElement('img'); img.src = og('image'); img.alt = '';
    cardEl.append(cell('b', 'LEIMAN LAB'), cell('strong', og('title')), cell('span', og('description')), img);
    bubble.append(cardEl);
  }
  text.addEventListener('input', render); post.addEventListener('input', render);
  const copy = async (button, value) => { try { await navigator.clipboard.writeText(value); button.textContent = 'СКОПИРОВАНО ✓'; } catch { button.textContent = 'НЕ ВЫШЛО'; } };
  box.querySelector('[data-ann=copy-post]').addEventListener('click', e => copy(e.currentTarget, `${text.value.trim()}\n\n${link()}`));
  box.querySelector('[data-ann=copy-link]').addEventListener('click', e => copy(e.currentTarget, link()));
  render();
}

async function publish() {
  if (dirty.size) { alert('Сначала сохраните или отмените правки.'); return; }
  if (!confirm('Опубликовать статью? Она появится на главной, в рубрике, поиске, RSS и карте сайта.')) return;
  try {
    await api('POST', `/api/admin/article/${slug}`, { version: meta.version, edits: { draft: '0' } });
    store.set('ll-admin-flash', 'ОПУБЛИКОВАНО ✓ · СТАТЬЯ НА ГЛАВНОЙ');
    location.reload();
  } catch (error) { update(`<b>НЕ ОПУБЛИКОВАНО:</b> ${error.message.replace(/[<>&]/g, '')}`); }
}

async function loadStats() {
  const box = panel.querySelector('.ll-stats');
  box.textContent = 'ЗАГРУЖАЮ…';
  try {
    const s = await api('GET', `/api/admin/stats/${slug}`);
    box.replaceChildren();
    const sum = document.createElement('div'); sum.className = 'll-stats-sum';
    for (const [label, value] of [['ПРОСМОТРЫ', n(s.views)], ['ДОЧИТАЛИ', `${n(s.reads)} · ${pct(s.reads, s.views)}`], ['ЛАЙКИ', n(s.likes)], ['КОММЕНТАРИИ', n(s.comments)]]) {
      const item = cell('div', '', 'micro muted'); item.append(cell('b', value), label); sum.append(item);
    }
    box.append(sum);
    const table = document.createElement('table');
    const head = document.createElement('tr');
    head.append(cell('th', 'Метка: источник / канал / кампания / пост'), cell('th', 'Просмотры', 'num'), cell('th', 'Дочитали', 'num'), cell('th', 'Доля', 'num'));
    table.append(head);
    for (const row of s.utm) {
      const tr = document.createElement('tr');
      tr.append(cell('td', row.tag), cell('td', n(row.views), 'num'), cell('td', n(row.reads), 'num'), cell('td', pct(row.reads, row.views), 'num'));
      table.append(tr);
    }
    if (!s.utm.length) { const tr = document.createElement('tr'); const td = cell('td', 'Пока нет данных по меткам. Учёт меток начался 24.10.2026, более ранние просмотры в таблицу не попали.'); td.colSpan = 4; tr.append(td); table.append(tr); }
    box.append(table);
    const link = `${location.origin}/articles/${slug}?utm_source=telegram&utm_medium=messenger&utm_campaign=${slug}&utm_content=post`;
    const linkRow = document.createElement('div'); linkRow.className = 'll-utm-link';
    const copy = cell('button', 'КОПИРОВАТЬ', 'button button-line'); copy.type = 'button';
    copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); copy.textContent = 'СКОПИРОВАНО ✓'; } catch { copy.textContent = 'НЕ ВЫШЛО'; } });
    linkRow.append(cell('span', 'ССЫЛКА ДЛЯ АНОНСА В TELEGRAM:', 'micro muted'), cell('code', link), copy);
    box.append(linkRow, cell('p', 'Просмотр — один на человека на статью в сутки, без ботов. «Дочитали» — 30 секунд текста на экране или прокрутка до 75% текста. Номер поста можно вписать вместо «post».', 'micro muted'));
  } catch (error) { box.textContent = `НЕ ЗАГРУЗИЛОСЬ: ${error.message}`; }
}

function update(message) {
  if (!statusEl) return;
  const n = dirty.size;
  statusEl.innerHTML = message || (n
    ? `РЕДАКТОР · ИЗМЕНЕНО: <b>${n}</b> · ⌘S — СОХРАНИТЬ`
    : `РЕДАКТОР · ${pageType === 'article' ? 'ENTER В АБЗАЦЕ — НОВЫЙ АБЗАЦ, ПУСТОЙ АБЗАЦ УДАЛЯЕТСЯ' : 'ЩЁЛКНИТЕ ПО ТЕКСТУ, ЧТОБЫ ИСПРАВИТЬ'}`);
  panel.querySelector('[data-act=save]').disabled = n === 0;
  panel.querySelector('[data-act=revert]').disabled = n === 0;
}

// textContent, not innerText: innerText applies CSS text-transform (uppercase labels) to the saved text.
function textOf(el) {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  copy.querySelectorAll('div,p').forEach(block => block.prepend('\n'));
  return copy.textContent.replace(/\n$/, '');
}

function onInput(e) {
  const el = e.currentTarget, key = el.dataset.edit;
  el.classList.toggle('ll-dirty', textOf(el) !== original.get(key));
  el.classList.contains('ll-dirty') ? dirty.add(key) : dirty.delete(key);
  update();
}
function onKey(e) {
  if (e.key === 'Enter' && e.currentTarget.dataset.multiline !== '1') e.preventDefault();
}
function onPaste(e) {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, text);
}
// Inside the editor links must not navigate: clicks place the caret instead.
function blockLinks(e) {
  if (active && e.target.closest('a') && (e.target.closest('[data-edit]') || e.target.closest('a').querySelector('[data-edit]'))) e.preventDefault();
}
function onShortcut(e) {
  if (active && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
}
function beforeUnload(e) { if (active && dirty.size) { e.preventDefault(); e.returnValue = ''; } }

function setEditable(on) {
  const mode = (() => { const t = document.createElement('div'); t.contentEditable = 'plaintext-only'; return t.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true'; })();
  for (const el of editables()) {
    if (on) {
      original.set(el.dataset.edit, textOf(el));
      el.contentEditable = mode; el.spellcheck = true;
      el.addEventListener('input', onInput); el.addEventListener('keydown', onKey); el.addEventListener('paste', onPaste);
    } else {
      el.removeAttribute('contenteditable');
      el.removeEventListener('input', onInput); el.removeEventListener('keydown', onKey); el.removeEventListener('paste', onPaste);
    }
  }
}

async function enable() {
  if (!['article', 'home', 'about'].includes(pageType)) { alert('Редактор работает на главной, на странице «Об авторе» и на страницах статей.'); return; }
  // The password dialog appears only if the server asks for one (ADMIN_PASSWORD set).
  try {
    if (pageType === 'article') meta = await api('GET', `/api/admin/article/${slug}`);
    else await api('POST', '/api/admin/login');
  } catch (error) {
    if (error.status !== 401) { alert(error.message); return; }
    store.set('ll-admin-pw', null);
    if (await askPassword()) return enable();
    store.set('ll-admin-on', null); return;
  }
  active = true;
  store.set('ll-admin-on', '1');
  body.classList.add('ll-editing');
  setEditable(true);
  buildPanel();
  update(store.get('ll-admin-flash') || undefined);
  store.set('ll-admin-flash', null);
  document.addEventListener('click', blockLinks, true);
  document.addEventListener('keydown', onShortcut);
  addEventListener('beforeunload', beforeUnload);
}

function disable() {
  if (dirty.size && !confirm('Есть несохранённые правки. Выйти без сохранения?')) return;
  revert();
  active = false;
  store.set('ll-admin-on', null);
  body.classList.remove('ll-editing');
  setEditable(false);
  panel?.remove(); panel = null;
  document.removeEventListener('click', blockLinks, true);
  document.removeEventListener('keydown', onShortcut);
  removeEventListener('beforeunload', beforeUnload);
}

function revert() {
  for (const el of editables()) {
    const key = el.dataset.edit;
    if (original.has(key) && textOf(el) !== original.get(key)) el.textContent = original.get(key);
    el.classList.remove('ll-dirty');
  }
  panel?.querySelectorAll('[data-field]').forEach(el => { el.value = el.dataset.original; });
  dirty.clear();
  if (panel) update();
}

async function save() {
  if (!dirty.size) return;
  const edits = {};
  for (const el of editables()) if (dirty.has(el.dataset.edit)) edits[el.dataset.edit] = textOf(el);
  panel.querySelectorAll('[data-field]').forEach(el => { if (dirty.has('field:' + el.dataset.field)) edits[el.dataset.field] = el.value; });
  update('СОХРАНЯЮ…');
  try {
    // Texts shared by all pages (home.*, about.*, follow.*) go to the site store, the rest to the article.
    const isSite = key => /^(home|about|follow)\./.test(key);
    const siteEdits = Object.fromEntries(Object.entries(edits).filter(([k]) => isSite(k)));
    const articleEdits = Object.fromEntries(Object.entries(edits).filter(([k]) => !isSite(k)));
    if (Object.keys(siteEdits).length) await api('POST', '/api/admin/site', { edits: siteEdits });
    if (Object.keys(articleEdits).length) await api('POST', `/api/admin/article/${slug}`, { version: meta.version, edits: articleEdits });
    dirty.clear();
    store.set('ll-admin-flash', 'СОХРАНЕНО ✓ · ПРАВКИ УЖЕ НА САЙТЕ');
    location.reload();
  } catch (error) {
    if (error.status === 401) store.set('ll-admin-pw', null);
    update(`<b>НЕ СОХРАНЕНО:</b> ${error.message.replace(/[<>&]/g, '')}`);
  }
}

async function reset() {
  const what = pageType === 'article' ? 'эту статью к версии из GitHub' : 'тексты главной, «Об авторе» и блока «Читать в Telegram» к исходным';
  if (!confirm(`Вернуть ${what}? Правки из редактора пропадут (копия останется в истории на сервере).`)) return;
  try {
    await api('DELETE', pageType === 'article' ? `/api/admin/article/${slug}` : '/api/admin/site');
    dirty.clear();
    store.set('ll-admin-flash', 'СБРОШЕНО К ИСХОДНОЙ ВЕРСИИ ✓');
    location.reload();
  } catch (error) { update(`<b>НЕ СБРОШЕНО:</b> ${error.message.replace(/[<>&]/g, '')}`); }
}

function toggle() { active ? disable() : enable(); }
const style = document.createElement('style');
style.textContent = css;
document.head.append(style);
window.llAdmin = { toggle };
enable();
