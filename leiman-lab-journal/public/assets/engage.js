/**
 * LEIMAN LAB — views, likes and comments on article pages.
 * Comments can be attached to any fragment of the text: select it, press «Комментировать».
 * Fragments are stored as {block, start, end, quote}; if the text changes, the quote is searched again.
 */
const slug = document.body.dataset.slug;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const visitor = store.get('ll-visitor') || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
store.set('ll-visitor', visitor);

const state = { comments: [], liked: false };
const fmt = n => Number(n).toLocaleString('ru-RU');
const editing = () => document.body.classList.contains('ll-editing');
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) if (c != null) node.append(c);
  return node;
};

async function api(method, url, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (editing()) {
    headers['X-Editor'] = '1';
    try { headers['X-Admin-Password'] = sessionStorage.getItem('ll-admin-pw') || ''; } catch {}
  }
  const res = await fetch(url, { method, headers, body: data ? JSON.stringify({ visitor, ...data }) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Ошибка ${res.status}`);
  return json;
}
const WORDS = { views: ['ПРОСМОТР', 'ПРОСМОТРА', 'ПРОСМОТРОВ'] };
const plural = (n, [one, few, many]) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many; };
function setStat(name, value) {
  if (typeof value !== 'number') return;
  document.querySelectorAll(`[data-stat="${name}"]`).forEach(node => { node.textContent = fmt(value); });
  if (WORDS[name]) document.querySelectorAll(`[data-plural="${name}"]`).forEach(node => { node.textContent = plural(value, WORDS[name]); });
}
function setCounts(c) { setStat('views', c.views); setStat('likes', c.likes); setStat('comments', c.comments); }

// ---------- Likes ----------
const likeButton = document.querySelector('.ll-like');
function renderLike() {
  likeButton?.setAttribute('aria-pressed', String(state.liked));
  const heart = likeButton?.querySelector('.ll-heart');
  if (heart) heart.textContent = state.liked ? '♥' : '♡';
}
likeButton?.addEventListener('click', async () => {
  likeButton.disabled = true;
  try { const r = await api('POST', `/api/likes/${slug}`, {}); state.liked = r.liked; setStat('likes', r.likes); renderLike(); }
  catch (e) { alert(e.message); }
  finally { likeButton.disabled = false; }
});

// ---------- Text fragments ----------
const blocks = () => [...document.querySelectorAll('.article-prose span[data-edit], .paper-prose [data-comment-block]')].filter(s => s.dataset.commentBlock != null || /^b\.\d+$/.test(s.dataset.edit));
const blockIndex = node => node.dataset.commentBlock != null ? Number(node.dataset.commentBlock) : Number(node.dataset.edit.slice(2));
const blockOf = node => {
  const host = (node.nodeType === 1 ? node : node.parentElement)?.closest('.article-prose span[data-edit], .paper-prose [data-comment-block]');
  return host && (host.dataset.commentBlock != null || /^b\.\d+$/.test(host.dataset.edit)) ? host : null;
};

/** Finds where a fragment comment sits now: stored offsets first, then the quote in its block, then anywhere. */
function locate(anchor) {
  const all = blocks();
  const own = all.find(b => blockIndex(b) === anchor.block);
  if (own && own.textContent.slice(anchor.start, anchor.end) === anchor.quote) return { block: own, start: anchor.start, end: anchor.end };
  for (const b of own ? [own, ...all] : all) {
    const i = b.textContent.indexOf(anchor.quote);
    if (i >= 0) return { block: b, start: i, end: i + anchor.quote.length };
  }
  return null;
}

function unwrapMarks() {
  document.querySelectorAll('mark.ll-note').forEach(m => {
    const parent = m.parentNode; m.replaceWith(document.createTextNode(m.textContent)); parent.normalize();
  });
}

// For the new paper edition, mark text-node ranges without deleting links,
// strong emphasis, footnotes or other inline markup on a highlighted paragraph.
function markPaperText(block,ranges) {
  const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT);
  const originalNodes=[];
  let node;
  while((node=walker.nextNode()))originalNodes.push(node);
  let offset=0;
  for(const original of originalNodes) {
    const plain=original.nodeValue||'';
    const from=offset,to=from+plain.length;
    offset=to;
    if(!plain.length)continue;
    const relevant=ranges.filter(r=>r.end>from && r.start<to);
    if(!relevant.length)continue;
    const cuts=[...new Set([0,plain.length,...relevant.flatMap(r=>[
      Math.max(0,Math.min(plain.length,r.start-from)),
      Math.max(0,Math.min(plain.length,r.end-from))
    ])])].sort((a,b)=>a-b);
    const fragment=document.createDocumentFragment();
    for(let i=0;i<cuts.length-1;i++) {
      const left=cuts[i],right=cuts[i+1];
      if(right<=left)continue;
      const active=relevant.filter(r=>r.start<=from+left && r.end>=from+right);
      const value=plain.slice(left,right);
      if(!active.length){fragment.append(value);continue;}
      const mark=el('mark',{className:'ll-note',tabIndex:0,textContent:value});
      mark.dataset.ids=active.map(r=>r.id).join(',');
      const ending=active.filter(r=>r.end===from+right).length;
      if(ending)mark.dataset.end=ending;
      fragment.append(mark);
    }
    original.replaceWith(fragment);
  }
}

function renderMarks() {
  unwrapMarks();
  if (editing()) return;
  const byBlock = new Map();
  for (const c of state.comments) {
    if (c.parent || !c.anchor) continue;
    const spot = locate(c.anchor);
    c.orphan = !spot;
    if (!spot) continue;
    if (!byBlock.has(spot.block)) byBlock.set(spot.block, []);
    byBlock.get(spot.block).push({ ...spot, id: c.id });
  }
  for (const [block, ranges] of byBlock) {
    if (block.dataset.commentBlock != null) { markPaperText(block,ranges); continue; }
    const text = block.textContent;
    const cuts = [...new Set([0, text.length, ...ranges.flatMap(r => [r.start, r.end])])].sort((a, b) => a - b);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < cuts.length - 1; i++) {
      const [from, to] = [cuts[i], cuts[i + 1]];
      const piece = text.slice(from, to);
      const covering = ranges.filter(r => r.start <= from && r.end >= to);
      if (!covering.length) { frag.append(piece); continue; }
      const mark = el('mark', { className: 'll-note', tabIndex: 0, textContent: piece });
      mark.dataset.ids = covering.map(r => r.id).join(',');
      const ending = ranges.filter(r => r.end === to).length;
      if (ending) mark.dataset.end = ending;
      frag.append(mark);
    }
    block.replaceChildren(frag);
  }
}

// ---------- Floating «Комментировать» button for a selection ----------
const selectButton = el('button', { type: 'button', className: 'll-select-btn', textContent: '✎ КОММЕНТИРОВАТЬ', hidden: true });
document.body.append(selectButton);
let pendingAnchor = null;

function readSelection() {
  const sel = getSelection();
  if (editing() || !sel || sel.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const block = blockOf(range.startContainer);
  if (!block) return null;
  const offset = (node, off) => { const r = document.createRange(); r.selectNodeContents(block); r.setEnd(node, off); return r.toString().length; };
  const text = block.textContent;
  let start = offset(range.startContainer, range.startOffset);
  let end = blockOf(range.endContainer) === block ? offset(range.endContainer, range.endOffset) : text.length;
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (end - start < 2) return null;
  end = Math.min(end, start + 500);
  return { anchor: { block: blockIndex(block), start, end, quote: text.slice(start, end) }, rect: range.getBoundingClientRect() };
}
let selTimer;
function onSelection() {
  clearTimeout(selTimer);
  selTimer = setTimeout(() => {
    const found = readSelection();
    if (!found) { selectButton.hidden = true; return; }
    pendingAnchor = found.anchor;
    selectButton.hidden = false;
    const left = Math.min(Math.max(found.rect.left + found.rect.width / 2, 90), innerWidth - 90);
    selectButton.style.left = `${left + scrollX}px`;
    selectButton.style.top = `${found.rect.bottom + scrollY + 10}px`;
  }, 120);
}
document.addEventListener('selectionchange', onSelection);
selectButton.addEventListener('mousedown', e => e.preventDefault());
selectButton.addEventListener('click', () => {
  if (!pendingAnchor) return;
  const anchor = pendingAnchor;
  selectButton.hidden = true;
  const target = blocks().find(b => blockIndex(b) === anchor.block);
  openPopover(target, popContent => {
    popContent.append(el('div', { className: 'micro muted', textContent: 'КОММЕНТАРИЙ К ФРАГМЕНТУ' }), quoteBox(anchor.quote), commentForm({ anchor }));
  });
  getSelection()?.removeAllRanges();
});

// ---------- Popover (bottom sheet on phones) ----------
const pop = el('div', { className: 'll-pop', hidden: true, role: 'dialog' });
pop.setAttribute('aria-label', 'Комментарии к фрагменту');
document.body.append(pop);
let popTarget = null;
function openPopover(target, fill) {
  pop.replaceChildren();
  const close = el('button', { type: 'button', className: 'll-pop-close', textContent: '×', title: 'Закрыть' });
  close.addEventListener('click', closePopover);
  const content = el('div');
  pop.append(close, content);
  fill(content);
  pop.hidden = false;
  popTarget = target;
  if (target) {
    const r = target.getBoundingClientRect();
    pop.style.top = `${r.bottom + scrollY + 10}px`;
    pop.style.left = `${Math.max(16, Math.min(r.left + scrollX, scrollX + innerWidth - pop.offsetWidth - 16))}px`;
  }
  pop.querySelector('textarea')?.focus({ preventScroll: true });
}
function closePopover() { pop.hidden = true; popTarget = null; document.querySelectorAll('mark.ll-active').forEach(m => m.classList.remove('ll-active')); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) closePopover(); });
document.addEventListener('mousedown', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('mark.ll-note') && e.target !== selectButton) closePopover(); });

function showThreads(mark) {
  const ids = mark.dataset.ids.split(',');
  document.querySelectorAll('mark.ll-note').forEach(m => m.classList.toggle('ll-active', m.dataset.ids.split(',').some(id => ids.includes(id))));
  openPopover(mark, content => {
    for (const id of ids) {
      const root = state.comments.find(c => c.id === id);
      if (root) content.append(threadView(root, { inPopover: true }));
    }
  });
}
document.addEventListener('click', e => {
  const mark = e.target.closest('mark.ll-note');
  if (mark && !editing() && getSelection()?.isCollapsed !== false) showThreads(mark);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('mark.ll-note')) { e.preventDefault(); showThreads(e.target); }
});

// ---------- Comment views ----------
const quoteBox = text => el('div', { className: 'll-quote', textContent: `«${text}»` });
const dateText = at => new Date(at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function commentView(c) {
  const actions = el('div', { className: 'll-actions' });
  if (!c.parent) {
    const reply = el('button', { type: 'button', className: 'll-link-btn ll-reply-btn', textContent: 'ОТВЕТИТЬ' });
    reply.addEventListener('click', () => {
      const thread = reply.closest('.ll-thread');
      if (thread.querySelector(':scope > .ll-form')) return;
      thread.append(commentForm({ parent: c.id }));
      thread.querySelector(':scope > .ll-form textarea').focus();
    });
    actions.append(reply);
  }
  if (c.mine || editing()) {
    const del = el('button', { type: 'button', className: 'll-link-btn', textContent: 'УДАЛИТЬ' });
    del.addEventListener('click', async () => {
      if (!confirm('Удалить комментарий' + (c.parent ? '?' : ' вместе с ответами?'))) return;
      try {
        const r = await api('DELETE', `/api/comments/${slug}/${c.id}`, {});
        state.comments = state.comments.filter(x => x.id !== c.id && x.parent !== c.id);
        setStat('comments', r.comments); refresh(); closePopover();
      } catch (e) { alert(e.message); }
    });
    actions.append(del);
  }
  return el('div', { className: 'll-comment' },
    el('div', { className: 'll-meta', textContent: `${c.name} · ${dateText(c.at)}` }),
    el('p', { className: 'll-text', textContent: c.text }),
    actions);
}

function threadView(root, { inPopover = false } = {}) {
  const thread = el('div', { className: 'll-thread' });
  thread.dataset.id = root.id;
  if (root.anchor && !inPopover) {
    const q = quoteBox(root.anchor.quote);
    if (root.orphan) q.append(el('span', { className: 'micro muted', textContent: ' · ФРАГМЕНТ В ТЕКСТЕ ИЗМЕНИЛСЯ' }));
    else {
      q.classList.add('ll-quote-link'); q.tabIndex = 0; q.title = 'Показать в тексте';
      q.addEventListener('click', () => {
        const mark = [...document.querySelectorAll('mark.ll-note')].find(m => m.dataset.ids.split(',').includes(root.id));
        if (!mark) return;
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        mark.classList.add('ll-flash'); setTimeout(() => mark.classList.remove('ll-flash'), 1600);
      });
    }
    thread.append(q);
  } else if (root.anchor && inPopover) thread.append(quoteBox(root.anchor.quote));
  thread.append(commentView(root));
  const replies = state.comments.filter(c => c.parent === root.id);
  if (replies.length) thread.append(el('div', { className: 'll-replies' }, ...replies.map(commentView)));
  if (inPopover) thread.append(commentForm({ parent: root.id, compact: true }));
  return thread;
}

function commentForm({ anchor = null, parent = null, compact = false } = {}) {
  const form = el('form', { className: 'll-form' });
  const name = el('input', { name: 'name', placeholder: 'Имя (необязательно)', maxLength: 60, value: store.get('ll-name') || '', autocomplete: 'nickname' });
  const text = el('textarea', { name: 'text', placeholder: parent ? 'Ваш ответ' : anchor ? 'Что вы думаете об этом фрагменте?' : 'Ваш комментарий', maxLength: 2000, required: true });
  const trap = el('input', { name: 'website', tabIndex: -1, autocomplete: 'off', className: 'll-hp' });
  trap.setAttribute('aria-hidden', 'true');
  const error = el('div', { className: 'micro accent', role: 'alert' });
  const submit = el('button', { type: 'submit', className: 'button button-primary', textContent: parent ? 'ОТВЕТИТЬ' : 'ОТПРАВИТЬ' });
  if (compact) text.rows = 2;
  form.append(name, text, trap, error, submit);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    submit.disabled = true; error.textContent = '';
    store.set('ll-name', name.value.trim());
    try {
      const r = await api('POST', `/api/comments/${slug}`, { name: name.value, text: text.value, anchor, parent, website: trap.value });
      state.comments.push(r.comment);
      setCounts(r);
      const reopen = pop.hidden ? null : (anchor || parent);
      refresh();
      if (reopen) {
        const rootId = parent || r.comment.id;
        const mark = [...document.querySelectorAll('mark.ll-note')].find(m => m.dataset.ids.split(',').includes(rootId));
        if (mark) showThreads(mark); else closePopover();
      } else text.value = '';
    } catch (err) { error.textContent = err.message; }
    finally { submit.disabled = false; }
  });
  return form;
}

const list = document.querySelector('.ll-comment-list');
function renderList() {
  if (!list) return;
  const roots = state.comments.filter(c => !c.parent);
  list.replaceChildren(
    ...(roots.length ? roots.map(r => threadView(r)) : [el('p', { className: 'micro muted ll-empty', textContent: 'Пока никто не написал. Можно прокомментировать статью целиком или выделить фрагмент текста.' })]),
    commentForm(),
  );
}
function refresh() { renderMarks(); renderList(); }

// Editor mode (⌘⇧E) rewrites text in place: remove highlights while it is on, show delete buttons.
new MutationObserver(() => { selectButton.hidden = true; closePopover(); refresh(); })
  .observe(document.body, { attributes: true, attributeFilter: ['class'] });

// ---------- UTM tags ----------
// Read utm_* from the address, keep them for this tab (the read event comes later), then remove them
// from the address bar so a reader who shares the link does not credit their visitors to the post.
const utm = (() => {
  const params = new URLSearchParams(location.search);
  const found = Object.fromEntries(['source', 'medium', 'campaign', 'content'].map(f => [f, params.get(`utm_${f}`) || '']).filter(([, v]) => v));
  const key = `ll-utm-${slug}`;
  if (Object.keys(found).length) {
    try { sessionStorage.setItem(key, JSON.stringify(found)); } catch {}
    for (const name of [...params.keys()]) if (name.startsWith('utm_')) params.delete(name);
    const clean = location.pathname + (params.toString() ? `?${params}` : '') + location.hash;
    history.replaceState(history.state, '', clean);
    return found;
  }
  try { return JSON.parse(sessionStorage.getItem(key) || 'null') || {}; } catch { return {}; }
})();

// ---------- «Дочитал»: 30 s of visible article text or a scroll past 75 % of it ----------
// The text is measured from the start of .article-prose to the sources block, so comments do not count.
(() => {
  const prose = document.querySelector('.article-prose, .paper-prose');
  const end = prose?.querySelector('.sources');
  if (!prose || !end) return;
  const READ_MS = 30000, READ_SHARE = 0.75;
  let visibleMs = 0, last = performance.now(), active = false, scrolled = false, done = false;
  const geometry = () => { const top = prose.getBoundingClientRect().top, bottom = end.getBoundingClientRect().top; return { top, bottom, height: bottom - top }; };
  function check() {
    if (done) return;
    const now = performance.now(), g = geometry();
    // Time since the previous check counts only if the text was on screen in a visible tab back then.
    if (active) visibleMs += now - last;
    last = now;
    active = document.visibilityState === 'visible' && g.top < innerHeight && g.bottom > 0;
    const share = g.height > 0 ? (innerHeight - g.top) / g.height : 0;
    if (visibleMs >= READ_MS || (scrolled && share >= READ_SHARE)) {
      done = true;
      clearInterval(timer);
      api('POST', `/api/reads/${slug}`, { utm }).catch(() => {});
    }
  }
  const timer = setInterval(check, 1000);
  addEventListener('scroll', () => { scrolled = true; check(); }, { passive: true });
  document.addEventListener('visibilitychange', check);
  check();
})();

// ---------- Start ----------
api('POST', `/api/views/${slug}`, { utm }).then(r => setStat('views', r.views)).catch(() => {});
fetch(`/api/engagement/${slug}?visitor=${encodeURIComponent(visitor)}`)
  .then(r => r.json())
  .then(data => { state.comments = data.list || []; state.liked = !!data.liked; setCounts(data); renderLike(); refresh(); })
  .catch(() => renderList());
