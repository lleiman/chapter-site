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
.ll-panel label{display:grid;gap:6px}
.ll-panel input,.ll-panel textarea{width:100%;background:var(--ink);color:var(--paper);border:1px solid var(--line);padding:9px 11px;font:15px/1.5 var(--sans);resize:vertical}
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

const field = (key, label, multiline) => `<label><span class="micro muted">${label}</span>${
  multiline ? `<textarea rows="3" data-field="${key}"></textarea>` : `<input data-field="${key}">`}</label>`;

function buildPanel() {
  panel = document.createElement('div');
  panel.className = 'll-panel';
  const a = meta?.article;
  const fields = [];
  if (a) {
    if (a.headline !== undefined) fields.push(['title', 'Заголовок для карточки на главной и превью Telegram', a.title]);
    if (a.deck !== undefined) fields.push(['summary', 'Текст карточки на главной', a.summary, true]);
    fields.push(['description', 'Описание в превью Telegram (пусто — как текст карточки)', a.description ?? '', true]);
  }
  panel.innerHTML = `${fields.length ? `<div class="ll-fields">${fields.map(f => field(f[0], f[1], f[3])).join('')}</div>` : ''}
  <div class="ll-row">
    <div class="ll-status micro"></div>
    <div class="ll-actions">
      ${fields.length ? '<button class="button button-line" data-act="fields" type="button">ПРЕВЬЮ И КАРТОЧКА</button>' : ''}
      <button class="button button-line" data-act="revert" type="button">ОТМЕНИТЬ</button>
      ${meta?.edited || (pageType === 'home') ? '<button class="button button-line" data-act="reset" type="button">СБРОСИТЬ К GIT</button>' : ''}
      <button class="button button-line" data-act="exit" type="button">ВЫЙТИ</button>
      <button class="button button-primary" data-act="save" type="button">СОХРАНИТЬ</button>
    </div>
  </div>`;
  for (const [key, , value] of fields) {
    const el = panel.querySelector(`[data-field="${key}"]`);
    el.value = value; el.dataset.original = value;
    el.addEventListener('input', () => { el.value !== el.dataset.original ? dirty.add('field:' + key) : dirty.delete('field:' + key); update(); });
  }
  statusEl = panel.querySelector('.ll-status');
  panel.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'save') save();
    if (act === 'revert') revert();
    if (act === 'exit') toggle();
    if (act === 'fields') panel.classList.toggle('ll-open');
    if (act === 'reset') reset();
  });
  document.body.append(panel);
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
  if (!['article', 'home'].includes(pageType)) { alert('Редактор работает на главной и на страницах статей.'); return; }
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
    if (pageType === 'article') await api('POST', `/api/admin/article/${slug}`, { version: meta.version, edits });
    else await api('POST', '/api/admin/site', { edits });
    dirty.clear();
    store.set('ll-admin-flash', 'СОХРАНЕНО ✓ · ПРАВКИ УЖЕ НА САЙТЕ');
    location.reload();
  } catch (error) {
    if (error.status === 401) store.set('ll-admin-pw', null);
    update(`<b>НЕ СОХРАНЕНО:</b> ${error.message.replace(/[<>&]/g, '')}`);
  }
}

async function reset() {
  const what = pageType === 'article' ? 'эту статью к версии из GitHub' : 'тексты главной к исходным';
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
