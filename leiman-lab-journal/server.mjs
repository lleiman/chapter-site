/**
 * LEIMAN LAB / JOURNAL
 * Zero-dependency editorial site. Node.js 20+.
 * Articles are edited in content/*.json (Git) or in the on-site editor (⌘⇧E).
 * Editor changes live in DATA_DIR (Railway volume) and take precedence over Git.
 */
import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, renameSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createEngagement, EngagementError } from './engagement.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DIR = path.join(ROOT, 'content');
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const HISTORY_LIMIT = 100;
const engagement = createEngagement(DATA_DIR);
const plural = (n, [one, few, many]) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many; };
const fmt = n => n.toLocaleString('ru-RU');
// Person key for de-duplication and rate limits: first X-Forwarded-For hop (Railway edge) + User-Agent. Only hashes are stored.
const clientKey = req => `${String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()}|${req.headers['user-agent'] || ''}`;

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const writeJson = (file, data) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file + '.tmp', JSON.stringify(data, null, 2) + '\n');
  renameSync(file + '.tmp', file);
};
const overrideFile = slug => path.join(DATA_DIR, 'articles', `${slug}.json`);
const SITE_FILE = path.join(DATA_DIR, 'site.json');

const gitArticles = new Map(readdirSync(DIR)
  .filter(n => /^\d{3}-[a-z0-9-]+\.json$/.test(n))
  .map(n => JSON.parse(readFileSync(path.join(DIR, n), 'utf8')))
  .map(a => [a.slug, a]));
const rubrics = JSON.parse(readFileSync(path.join(DIR, 'rubrics.json'), 'utf8'));
const rubricBySlug = new Map(rubrics.map(r => [r.slug, r]));
const articles = [];
const articleBySlug = new Map();
function loadArticles() {
  articles.length = 0; articleBySlug.clear();
  for (const [slug, base] of gitArticles) {
    const edited = readJson(overrideFile(slug));
    const a = edited ? { ...edited, slug } : base;
    articles.push(a); articleBySlug.set(slug, a);
  }
  articles.sort((a, b) => b.date.localeCompare(a.date));
}
loadArticles();
// Drafts ("draft": true) open only by direct link: no lists, search, sitemap or RSS.
const published = () => articles.filter(a => !a.draft);
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const dateLabel = iso => { const [y, m, d] = String(iso).split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const today = () => new Date().toISOString().slice(0, 10);
const norm = s => String(s ?? '').toLowerCase().replace(/ё/g, 'е');
const tagUrl = tag => `/tags/${encodeURIComponent(tag)}`;
let siteTexts = readJson(SITE_FILE) || {};
// Content-hash query (?v=…) on assets: a replaced cover or stylesheet gets a new URL, so browsers and Telegram drop stale copies.
const assetVersions = new Map();
const asset = file => {
  if (!assetVersions.has(file)) {
    try { assetVersions.set(file, createHash('sha1').update(readFileSync(path.join(PUBLIC, file))).digest('hex').slice(0, 10)); }
    catch { assetVersions.set(file, ''); }
  }
  return assetVersions.get(file) ? `${file}?v=${assetVersions.get(file)}` : file;
};
const versionOf = a => createHash('sha1').update(JSON.stringify(a)).digest('hex').slice(0, 12);

const escaped = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const jsonSafe = data => JSON.stringify(data).replace(/</g, '\\u003c');
const canonicalOrigin = req => {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  let hostname = String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`).split(',')[0].trim();
  if (!/^[a-z0-9.:-]+$/i.test(hostname)) hostname = `localhost:${PORT}`;
  const local = hostname.startsWith('localhost') || hostname.startsWith('127.');
  return `${local ? 'http' : 'https'}://${hostname}`;
};

const logo = `<span class="ll-sign" aria-label="Leiman Lab">
  <span class="tile light"></span><span class="tile empty"></span><span class="tile empty"></span>
  <span class="tile light"></span><span class="tile red"></span><span class="tile empty"></span>
  <span class="tile light"></span><span class="tile red"></span><span class="tile red"></span>
</span>`;

// Loads the editor only on ⌘⇧E / Ctrl+Shift+E or ?edit, so readers never download it.
const editorLoader = `<script>(()=>{const load=()=>import('/assets/admin.js');let on=false;try{on=sessionStorage.getItem('ll-admin-on')==='1'}catch{}
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.code==='KeyE'){e.preventDefault();window.llAdmin?window.llAdmin.toggle():load()}});
if(on||/[?&]edit(=|&|$)/.test(location.search))load()})()</script>`;

function page({ content, title, description, canonical, cover, type = 'website', date, modified, schema, bodyData = '', noindex = false }) {
  const structured = schema ? `<script type="application/ld+json">${jsonSafe(schema)}</script>` : '';
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0B0B0D"><meta name="color-scheme" content="dark">
<meta name="description" content="${escaped(description)}">
<title>${escaped(title)}</title>
<link rel="canonical" href="${escaped(canonical)}"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${escaped(type)}"><meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="LEIMAN LAB">
<meta property="og:title" content="${escaped(title)}">
<meta property="og:description" content="${escaped(description)}">
<meta property="og:url" content="${escaped(canonical)}">
<meta property="og:image" content="${escaped(cover)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png"><meta name="twitter:card" content="summary_large_image">
${date ? `<meta property="article:published_time" content="${escaped(date)}">` : ''}${modified ? `<meta property="article:modified_time" content="${escaped(modified)}">` : ''}${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="stylesheet" href="${asset('/assets/site.css')}">${structured}
</head><body${bodyData}>
<header class="site-header"><div class="container header-inner">
<a class="identity" href="/" aria-label="Leiman Lab — главная">${logo}<span class="wordmark">LEIMAN <b>LAB</b></span></a>
<nav aria-label="Основная навигация"><a href="/#journal">Журнал</a><a href="/about">Об авторе</a><a href="/search">Поиск</a><a href="https://t.me/aiadepts" target="_blank" rel="noopener noreferrer"><span class="nav-long">Telegram</span><span class="nav-short">TG</span> ↗</a></nav>
</div></header>
${content}
<footer class="site-footer"><div class="container footer-inner">
<div><span class="footer-brand">LEIMAN LAB<span class="red-dot">.</span></span><div class="micro muted">RESEARCH · TECHNOLOGY · CREATIVE PRACTICE</div></div>
<div class="micro muted right">© 2026 ЛЕВ ЛЕЙМАН<br><a href="https://t.me/leimanleo" rel="noopener">COMMERCIAL INQUIRIES ↗</a></div>
</div></footer>
${editorLoader}
</body></html>`;
}

function cardStats(slug) {
  const c = engagement.counts(slug);
  return ` · ${fmt(c.views)} ПРОСМ. · ♥ ${fmt(c.likes)} · ${fmt(c.comments)} КОММ.`;
}
function card(a, size = '') {
  return `<a class="story-card ${size}" href="/articles/${escaped(a.slug)}">
  <div class="story-image"><img src="${escaped(asset(a.cover))}" alt="Обложка ${escaped(a.cardTitle)}" loading="lazy" width="1200" height="630"><span class="image-index mono">${escaped(a.issue)} ↗</span></div>
  <div class="story-info"><div class="micro story-meta">${rubricBySlug.has(a.rubric) ? `${escaped(rubricBySlug.get(a.rubric).title.toUpperCase())} <span class="line"></span> ` : ''}${escaped(a.section)} <span class="line"></span> ${escaped(a.dateLabel)}</div>
  <h3>${escaped(a.title)}</h3><p>${escaped(a.summary)}</p><div class="story-foot"><span class="micro muted">${escaped(a.readingMinutes)} МИН ЧТЕНИЯ${cardStats(a.slug)}</span><span class="read-link micro">ЧИТАТЬ ↗</span></div></div>
  </a>`;
}

// Home page texts editable in the on-site editor; defaults live here, edits in DATA_DIR/site.json.
const SITE_DEFAULTS = {
  'home.lead': 'Пишу про ИИ, технологии, продакшен, бизнес, сознание и искусство.',
  'home.about.1': 'Leiman Lab — личная исследовательская и проектная лаборатория Льва Леймана.',
  'home.about.2': 'Здесь я собираю то, над чем работаю: AI-продукты, продакшен, исследования поведения людей, экспериментальные инструменты и искусство. Кроме выводов пишу, как шла работа, где упёрся и на какие источники опирался.',
  'about.lead': 'Предприниматель, практикующий психолог, исследователь сознания и разработчик AI-продуктов.',
  'about.1': 'Leiman Lab — моя личная лаборатория. Сюда попадает то, что я сам делаю и проверяю: AI-продукты и продакшен, исследования поведения людей, эксперименты с инструментами и искусство.',
  'about.2': 'В журнале я пишу разборы. Отдельно отмечаю, что подтверждено, что заявила компания и что думаю я сам. Под каждой статьёй есть первоисточники и история правок.',
  'about.3': 'Короткие заметки и анонсы новых материалов выходят в Telegram-канале. По проектам и сотрудничеству пишите в личные сообщения.',
  'follow.text': 'Короткие заметки и анонсы новых материалов — в Telegram-канале Leiman Lab.',
};
const siteText = key => `<span data-edit="${key}">${escaped(siteTexts[key] ?? SITE_DEFAULTS[key])}</span>`;

function rubricNav(active) {
  const list = published(), count = slug => list.filter(a => a.rubric === slug).length;
  return `<nav class="rubric-nav" aria-label="Рубрики"><a href="/#journal"${active ? '' : ' class="active" aria-current="page"'}>ВСЕ <small>${list.length}</small></a>${rubrics.map(r =>
    `<a href="/rubrics/${escaped(r.slug)}"${active === r.slug ? ' class="active" aria-current="page"' : ''}>${escaped(r.title.toUpperCase())} <small>${count(r.slug)}</small></a>`).join('')}</nav>`;
}

function rubricView(r, origin) {
  const list = published().filter(a => a.rubric === r.slug);
  const body = `<main>
  <header class="container article-head rubric-head"><a class="back mono" href="/#journal">← JOURNAL / LEIMAN LAB</a>
    <div class="article-overline"><span class="pill micro">РУБРИКА</span><span class="micro muted">${list.length} ${plural(list.length, ['МАТЕРИАЛ', 'МАТЕРИАЛА', 'МАТЕРИАЛОВ'])}</span></div>
    <h1>${escaped(r.title)}</h1>
    <p class="article-deck">${escaped(r.description)}</p>
  </header>
  <section class="container journal-section rubric-section">
    ${rubricNav(r.slug)}
    ${list.length ? `<div class="featured-story">${list.map(a => card(a, 'featured')).join('')}</div>`
      : `<div class="rubric-empty"><p>В этой рубрике пока нет материалов. Первые появятся в Telegram-канале раньше, чем здесь.</p><a class="button button-line" href="https://t.me/aiadepts" target="_blank" rel="noopener noreferrer">TELEGRAM ↗</a></div>`}
  </section>
  </main>`;
  const cover = list[0]?.cover || '/assets/black-october-1200x630.png';
  return page({ content: body, title: `${r.title} — Leiman Lab`, description: r.description, canonical: `${origin}/rubrics/${r.slug}`, cover: `${origin}${asset(cover)}`, bodyData: ' data-page="rubric"' });
}

/** Page with a big title and a list of cards: used for tags and search. */
function listPage({ origin, path: pagePath, pill, title, deck, list, empty, extra = '', noindex = false }) {
  const body = `<main>
  <header class="container article-head rubric-head"><a class="back mono" href="/#journal">← JOURNAL / LEIMAN LAB</a>
    <div class="article-overline"><span class="pill micro">${escaped(pill)}</span><span class="micro muted">${list.length} ${plural(list.length, ['МАТЕРИАЛ', 'МАТЕРИАЛА', 'МАТЕРИАЛОВ'])}</span></div>
    <h1>${escaped(title)}</h1>${deck ? `<p class="article-deck">${escaped(deck)}</p>` : ''}${extra}
  </header>
  <section class="container journal-section rubric-section">
    ${list.length ? `<div class="featured-story">${list.map(a => card(a, 'featured')).join('')}</div>` : `<div class="rubric-empty"><p>${escaped(empty)}</p></div>`}
  </section>
  </main>`;
  return page({ content: body, title: `${title} — Leiman Lab`, description: deck || title, canonical: origin + pagePath, cover: `${origin}${asset((list[0] || published()[0] || articles[0]).cover)}`, bodyData: ' data-page="list"', noindex });
}

function search(q) {
  const words = norm(q).split(/\s+/).filter(w => w.length > 1).slice(0, 8);
  if (!words.length) return [];
  return published().map(a => {
    const head = norm([a.title, a.headline, a.deck, a.summary, ...(a.tags || [])].join(' '));
    const body = norm(a.paragraphs.map(b => [b.text, ...(b.items || [])].join(' ')).join(' '));
    if (!words.every(w => head.includes(w) || body.includes(w))) return null;
    return { a, score: words.filter(w => head.includes(w)).length * 10 + words.filter(w => body.includes(w)).length };
  }).filter(Boolean).sort((x, y) => y.score - x.score || y.a.date.localeCompare(x.a.date)).map(x => x.a);
}

function aboutView(origin) {
  const body = `<main>
  <header class="container article-head rubric-head"><a class="back mono" href="/">← JOURNAL / LEIMAN LAB</a>
    <div class="article-overline"><span class="pill micro">ОБ АВТОРЕ</span><span class="micro muted">LEIMAN LAB</span></div>
    <h1>Лев Лейман</h1>
    <p class="article-deck">${siteText('about.lead')}</p>
  </header>
  <section class="container about-page">
    <div class="about-page-text"><p>${siteText('about.1')}</p><p>${siteText('about.2')}</p><p>${siteText('about.3')}</p></div>
    <div class="about-page-links">
      <a class="button button-primary" href="https://t.me/aiadepts" target="_blank" rel="noopener noreferrer">TELEGRAM-КАНАЛ ↗</a>
      <a class="button button-line" href="https://t.me/leimanleo" target="_blank" rel="noopener noreferrer">НАПИСАТЬ ЛИЧНО ↗</a>
      <a class="button button-line" href="/rss.xml">RSS</a>
    </div>
  </section>
  <section class="container journal-section"><div class="section-rule"><h2>ПОСЛЕДНИЕ МАТЕРИАЛЫ <span class="accent">/</span></h2><a class="micro muted" href="/#journal">ВЕСЬ ЖУРНАЛ ↗</a></div>
    <div class="featured-story">${published().slice(0, 2).map(a => card(a, 'featured')).join('')}</div></section>
  </main>`;
  return page({ content: body, title: 'Лев Лейман — Leiman Lab', description: siteTexts['about.lead'] ?? SITE_DEFAULTS['about.lead'], canonical: `${origin}/about`, cover: `${origin}${asset((published()[0] || articles[0]).cover)}`, bodyData: ' data-page="about"' });
}

function home(origin) {
  const list = published(), featured = list[0] || articles[0];
  const html = `<main>
  <section class="container intro" aria-labelledby="hero-title">
    <div class="intro-text"><div class="eyebrow"><span class="red-square"></span> INDEPENDENT RESEARCH JOURNAL <span class="muted">/ 2026</span></div>
    <h1 id="hero-title" class="hero-title">LEIMAN<br><em>LAB<span class="dot">.</span></em></h1>
    <p class="intro-lead">${siteText('home.lead')}</p>
    <div class="intro-actions"><a class="button button-primary" href="#journal">СМОТРЕТЬ ПУБЛИКАЦИИ <span>↘</span></a><span class="micro muted">НАБЛЮДЕНИЯ · КЕЙСЫ · ЭКСПЕРИМЕНТЫ</span></div>
    </div>
    <div class="intro-visual" aria-hidden="true"><div class="visual-index mono">FIG. 001 / LL MONOGRAM</div><div class="large-mark">${logo}</div><span class="visual-code mono">[ 01 / OPEN SYSTEM ]</span></div>
  </section>
  <section id="journal" class="container journal-section" aria-labelledby="journal-title">
    <div class="section-rule"><h2 id="journal-title">ЖУРНАЛ <span class="accent">/</span> <small>01</small></h2><span class="micro muted">${list.length} PUBLICATIONS · NEWEST FIRST</span></div>
    ${rubricNav(null)}
    <div class="featured-story">${list.map(a=>card(a,'featured')).join('')}</div>
  </section>
  <section id="about" class="container about-section"><div class="about-heading"><div class="eyebrow">02 / WHO'S BEHIND THE LAB</div><h2>Вопросы.<br>Практика.<br><span class="accent">Результаты.</span></h2></div>
  <div class="about-copy"><p>${siteText('home.about.1')}</p>
  <p>${siteText('home.about.2')}</p>
  <div class="about-services"><span>AI-ПРОДАКШЕН</span><span>AI-ПРОДУКТЫ</span><span>R&D</span><span>СПЕЦПРОЕКТЫ</span></div>
  <div class="about-links"><a class="button button-line" href="/about">ПОДРОБНЕЕ ОБ АВТОРЕ ↗</a><a class="button button-line" href="https://t.me/leimanleo">СВЯЗАТЬСЯ ПО ПРОЕКТУ ↗</a></div></div></section>
  </main>`;
  return page({content:html,title:'Leiman Lab — журнал исследований, технологий и экспериментов',description:'ИИ, технологии, бизнес, психология, исследования сознания и искусство. Авторский журнал Льва Леймана.',canonical:`${origin}/`,cover:`${origin}${asset(featured.cover)}`,bodyData:' data-page="home"',schema:{'@context':'https://schema.org','@type':'WebSite',name:'Leiman Lab',url:origin+'/','inLanguage':'ru'}});
}
// data-edit keys: b.N — block text, b.N.M — list item, b.N.label / b.N.link.M — callout label / inline link label.
function renderBlock(block, i) {
  const t = `<span data-edit="b.${i}" data-multiline="${block.type==='p'?1:0}">${escaped(block.text)}</span>`;
  switch(block.type) {
    case 'lead': return `<p class="body-lead">${t}</p>`;
    case 'p': return `<p>${t}${block.links?.length ? ' '+block.links.map((l,j)=>`<a href="${escaped(l.url)}" target="_blank" rel="noopener noreferrer"><span data-edit="b.${i}.link.${j}">${escaped(l.label)}</span> ↗</a>`).join(' · ') : ''}</p>`;
    case 'h2': return `<h2>${t}</h2>`;
    case 'h3': return `<h3>${t}</h3>`;
    case 'aside': { const label = block.label ?? 'НАБЛЮДЕНИЕ'; return `<aside class="callout">${label ? `<span class="micro accent" data-edit="b.${i}.label">${escaped(label)}</span>` : ''}<p>${t}</p></aside>`; }
    case 'quote': return `<blockquote>${t}</blockquote>`;
    case 'list': return `<ul>${(block.items||[]).map((x,j)=>`<li><span data-edit="b.${i}.${j}">${escaped(x)}</span></li>`).join('')}</ul>`;
    default: return '';
  }
}
function articleView(a, origin) {
  const pageUrl = `${origin}/articles/${a.slug}`;
  const share = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(a.title)}`;
  const related = published().filter(x=>x.slug!==a.slug).slice(0,2);
  const stats = engagement.counts(a.slug);
  const storyParts = a.story ? published().filter(x => x.story === a.story).sort((x, y) => x.date.localeCompare(y.date)) : [];
  const storyBox = storyParts.length >= 2 && !a.draft ? `<aside class="story-box"><div class="micro muted">СЮЖЕТ</div><div class="story-title">${escaped(a.story)}</div><ol>${storyParts.map(x => x.slug === a.slug
    ? `<li aria-current="page"><span class="micro muted">${escaped(x.dateLabel)}</span> ${escaped(x.title)}</li>`
    : `<li><span class="micro muted">${escaped(x.dateLabel)}</span> <a href="/articles/${escaped(x.slug)}">${escaped(x.title)}</a></li>`).join('')}</ol></aside>` : '';
  const changes = (a.changes || []).slice().reverse();
  const body = `<main>
  <article itemscope itemtype="https://schema.org/Article">
    ${a.draft ? '<div class="draft-banner micro"><div class="container">ЧЕРНОВИК · ВИДЕН ТОЛЬКО ПО ПРЯМОЙ ССЫЛКЕ · ОПУБЛИКОВАТЬ: ⌘⇧E → «ОПУБЛИКОВАТЬ»</div></div>' : ''}
    <header class="container article-head"><a class="back mono" href="/">← JOURNAL / LEIMAN LAB</a>
      <div class="article-overline"><span class="pill micro">FIELD NOTE ${escaped(a.issue)}</span>${rubricBySlug.has(a.rubric) ? `<a class="micro rubric-link" href="/rubrics/${escaped(a.rubric)}">${escaped(rubricBySlug.get(a.rubric).title.toUpperCase())}</a>` : ''}<span class="micro muted">${escaped(a.section)}</span></div>
      <h1 itemprop="headline" data-edit="headline">${escaped(a.headline || a.title)}</h1>
      <p class="article-deck" itemprop="description" data-edit="deck">${escaped(a.deck || a.summary)}</p>
      <div class="article-byline micro"><span>ЛЕВ ЛЕЙМАН</span><span class="thin-sep"></span><time datetime="${escaped(a.date)}">${escaped(a.dateLabel)}</time>${a.updated ? `<span class="thin-sep"></span><a href="#changes">ОБНОВЛЕНО <time datetime="${escaped(a.updated)}">${escaped(dateLabel(a.updated))}</time></a>` : ''}<span class="thin-sep"></span><span>${escaped(a.readingMinutes)} МИН</span><span class="thin-sep"></span><span><b data-stat="views">${fmt(stats.views)}</b> <span data-plural="views">${plural(stats.views, ['ПРОСМОТР', 'ПРОСМОТРА', 'ПРОСМОТРОВ'])}</span></span><span class="thin-sep"></span><a href="#comments">♥ <b data-stat="likes">${fmt(stats.likes)}</b> · <b data-stat="comments">${fmt(stats.comments)}</b> КОММ.</a></div>
    </header>
    <div class="container feature-image"><img src="${escaped(asset(a.cover))}" width="1200" height="630" alt="Редакционная иллюстрация к статье ${escaped(a.cardTitle)}" fetchpriority="high">
    <div class="image-caption micro">LEIMAN LAB / ${escaped(a.issue)} &nbsp; · &nbsp; EDITORIAL ILLUSTRATION</div></div>
    <div class="content-layout container"><aside class="article-sidebar"><div class="micro muted">RESEARCH NOTE<br>${escaped(a.issue)} / 2026</div><div class="aside-divider"></div><div class="mono small">LEIMAN<br>LAB<span class="accent">.</span></div></aside>
    <div class="article-prose" itemprop="articleBody">${storyBox}${a.paragraphs.map(renderBlock).join('\n')}
      <section class="sources"><div class="sources-head"><span class="eyebrow" data-edit="sourcesLabel">${escaped(a.sourcesLabel || 'ИСТОЧНИКИ / SOURCES')}</span><span class="micro muted">${a.sources.length} LINKS</span></div>
      <ol>${a.sources.map((s,i)=>`<li><a href="${escaped(s.url)}" rel="noopener noreferrer" target="_blank"><span data-edit="s.${i}">${escaped(s.title)}</span> ↗</a>${s.type ? `<span class="micro muted">${escaped(s.type)}</span>` : ''}</li>`).join('')}</ol>
      <p class="micro muted source-note" data-edit="sourceNote">${escaped(a.sourceNote || 'Факты относятся к дате публикации. В продолжающихся расследованиях оценки могут измениться. Заявления компаний помечены в тексте как заявления компаний.')}</p></section>
      ${a.tags?.length ? `<nav class="tag-list" aria-label="Теги">${a.tags.map(t => `<a href="${escaped(tagUrl(t))}">#${escaped(t)}</a>`).join('')}</nav>` : ''}
      ${changes.length ? `<section class="changes" id="changes"><div class="sources-head"><span class="eyebrow">ИСТОРИЯ ПРАВОК</span><span class="micro muted">${changes.length}</span></div><ul>${changes.map(c => `<li><time class="micro muted" datetime="${escaped(c.date)}">${escaped(dateLabel(c.date))}</time><span>${escaped(c.text)}</span></li>`).join('')}</ul></section>` : ''}
      <div class="share-row"><button class="button button-line ll-like" type="button" aria-pressed="false"><span class="ll-heart">♡</span> НРАВИТСЯ <b data-stat="likes">${fmt(stats.likes)}</b></button><a class="button button-primary" href="${escaped(share)}" target="_blank" rel="noopener noreferrer">ПОДЕЛИТЬСЯ В TELEGRAM ↗</a><button id="copy-link" class="button button-line" type="button" data-url="${escaped(pageUrl)}">КОПИРОВАТЬ ССЫЛКУ</button></div>
      <script>document.getElementById('copy-link')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(e.currentTarget.dataset.url);e.currentTarget.textContent='ССЫЛКА СКОПИРОВАНА ✓'}catch(e){e.currentTarget.textContent='КОПИРОВАНИЕ НЕДОСТУПНО'}})</script>
      <aside class="tg-follow"><p>${siteText('follow.text')}</p><a class="button button-primary" href="https://t.me/aiadepts" target="_blank" rel="noopener noreferrer">ЧИТАТЬ В TELEGRAM ↗</a></aside>
      <section class="ll-comments" id="comments" aria-labelledby="comments-title"><div class="sources-head"><h2 id="comments-title" class="eyebrow">КОММЕНТАРИИ / <span data-stat="comments">${fmt(stats.comments)}</span></h2><span class="micro muted">ВЫДЕЛИТЕ ТЕКСТ, ЧТОБЫ ОБСУДИТЬ ФРАГМЕНТ</span></div>
      <div class="ll-comment-list"></div><noscript><p class="micro muted">Комментарии работают с включённым JavaScript.</p></noscript></section>
    </div></div>
  <script type="module" src="${asset('/assets/engage.js')}"></script>
  </article>
  ${related.length?`<section class="container more-stories"><div class="section-rule"><h2>ДАЛЬШЕ <span class="accent">/</span></h2><a class="micro muted" href="/">ВЕСЬ ЖУРНАЛ ↗</a></div><div class="featured-story">${related.map(x=>card(x,'featured')).join('')}</div></section>`:''}
  </main>`;
  const description = a.description || a.summary;
  return page({content:body,title:`${a.title} — Leiman Lab`,description,canonical:pageUrl,cover:`${origin}${asset(a.cover)}`,type:'article',date:a.date,modified:a.updated,noindex:!!a.draft,bodyData:` data-page="article" data-slug="${escaped(a.slug)}" data-version="${versionOf(a)}"`,schema:{'@context':'https://schema.org','@type':'NewsArticle',headline:a.title,description,image:[`${origin}${asset(a.cover)}`],datePublished:a.date,...(a.updated?{dateModified:a.updated}:{}),inLanguage:'ru',author:{'@type':'Person',name:'Лев Лейман'},publisher:{'@type':'Organization',name:'Leiman Lab'}}});
}

function write(res, code, data, mime='text/html; charset=utf-8', more={}) {
  res.writeHead(code, {'Content-Type':mime,'X-Content-Type-Options':'nosniff',...more});res.end(data);
}
function mimeFor(file){return ({'.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.js':'text/javascript; charset=utf-8'})[path.extname(file)]||'application/octet-stream';}
function xmlSafe(x){return escaped(x);}

// ---------- On-site editor API ----------
class EditError extends Error { constructor(message, code = 400) { super(message); this.code = code; } }
const OPTIONAL_FIELDS = ['description', 'sourcesLabel', 'sourceNote'];
const cleanText = raw => raw.replace(/\r\n?/g, '\n').replace(/ /g, ' ').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').trim();
const oneLine = s => s.replace(/\s*\n\s*/g, ' ');
const required = (value, key) => { if (!value) throw new EditError(`Поле не может быть пустым: ${key}`); return oneLine(value); };

/** Applies {key: text} edits to a copy of the article. Empty block text removes the block; newlines in a paragraph split it. */
function applyArticleEdits(a, edits) {
  const next = structuredClone(a);
  const blockText = new Map();
  for (const [key, raw] of Object.entries(edits)) {
    if (typeof raw !== 'string' || raw.length > 50000) throw new EditError(`Некорректное значение: ${key}`);
    const value = cleanText(raw);
    const b = key.match(/^b\.(\d+)(?:\.(label|\d+|link\.(\d+)))?$/);
    const block = b && next.paragraphs[Number(b[1])];
    if (key === 'headline') next[next.headline !== undefined ? 'headline' : 'title'] = required(value, key);
    else if (key === 'deck') next[next.deck !== undefined ? 'deck' : 'summary'] = required(value, key);
    else if (key === 'title' || key === 'summary') next[key] = required(value, key);
    else if (key === 'rubric') { if (!rubricBySlug.has(value)) throw new EditError(`Нет такой рубрики: ${value}`); next.rubric = value; }
    else if (key === 'draft') { if (value === '1') next.draft = true; else if (value === '0') delete next.draft; else throw new EditError('draft: 0 или 1'); }
    else if (key === 'changeNote') { if (value) { next.updated = today(); next.changes = [...(next.changes || []), { date: next.updated, text: oneLine(value).slice(0, 500) }]; } }
    else if (key === 'tags') next.tags = [...new Set(value.split(',').map(t => oneLine(t).replace(/^#/, '').trim()).filter(Boolean))].slice(0, 8).map(t => t.slice(0, 40));
    else if (key === 'story') { if (value) next.story = oneLine(value).slice(0, 80); else delete next.story; }
    else if (OPTIONAL_FIELDS.includes(key)) { if (value) next[key] = oneLine(value); else delete next[key]; }
    else if (block && b[2] === undefined && typeof block.text === 'string') blockText.set(Number(b[1]), value);
    else if (block && b[2] === 'label' && block.type === 'aside') block.label = oneLine(value);
    else if (block && b[3] !== undefined && block.links?.[Number(b[3])]) block.links[Number(b[3])].label = required(value, key);
    else if (block && /^\d+$/.test(b[2] ?? '') && typeof block.items?.[Number(b[2])] === 'string') block.items[Number(b[2])] = oneLine(value);
    else if (/^s\.\d+$/.test(key) && next.sources[Number(key.slice(2))]) next.sources[Number(key.slice(2))].title = required(value, key);
    else throw new EditError(`Неизвестное поле: ${key}`);
  }
  next.paragraphs = next.paragraphs.flatMap((block, i) => {
    if (block.type === 'list') { block.items = block.items.filter(Boolean); return block.items.length ? [block] : []; }
    if (!blockText.has(i)) return [block];
    const text = blockText.get(i);
    if (!text) return [];
    if (block.type !== 'p') return [{ ...block, text: oneLine(text) }];
    const parts = text.split(/\n+/);
    return parts.map((part, j) => j === parts.length - 1 ? { ...block, text: part } : { type: 'p', text: part });
  });
  if (!next.paragraphs.length) throw new EditError('В статье должен остаться хотя бы один абзац');
  return next;
}

function snapshot(name, data) {
  const dir = path.join(DATA_DIR, 'history');
  writeJson(path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${name}.json`), data);
  const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  for (const old of files.slice(0, Math.max(0, files.length - HISTORY_LIMIT))) unlinkSync(path.join(dir, old));
}

// Without ADMIN_PASSWORD the editor is open to anyone (author's choice, 23.10.2026); setting it turns the password back on.
function passwordOk(req) {
  if (!ADMIN_PASSWORD) return true;
  const given = Buffer.from(String(req.headers['x-admin-password'] || ''));
  const expected = Buffer.from(ADMIN_PASSWORD);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
function readBody(req, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new EditError('Слишком большой запрос', 413)); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new EditError('Некорректный JSON')); } });
    req.on('error', reject);
  });
}
const sendJson = (res, code, data) => write(res, code, JSON.stringify(data), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store' });

async function adminApi(req, res, pathname) {
  if (!passwordOk(req)) { await new Promise(r => setTimeout(r, 800)); return sendJson(res, 401, { error: 'Неверный пароль' }); }
  if (pathname === '/api/admin/login' && req.method === 'POST') return sendJson(res, 200, { ok: true });

  if (pathname === '/api/admin/site') {
    if (req.method === 'POST') {
      const { edits } = await readBody(req);
      if (!edits || typeof edits !== 'object') throw new EditError('Нет правок');
      const next = { ...siteTexts };
      for (const [key, raw] of Object.entries(edits)) {
        if (!(key in SITE_DEFAULTS) || typeof raw !== 'string') throw new EditError(`Неизвестное поле: ${key}`);
        const value = oneLine(cleanText(raw));
        if (!value || value === SITE_DEFAULTS[key]) delete next[key]; else next[key] = value;
      }
      snapshot('site', siteTexts); writeJson(SITE_FILE, next); siteTexts = next;
      console.log(`editor: saved site texts (${Object.keys(edits).join(', ')})`);
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      if (existsSync(SITE_FILE)) { snapshot('site', siteTexts); unlinkSync(SITE_FILE); }
      siteTexts = {}; return sendJson(res, 200, { ok: true });
    }
  }

  if (pathname === '/api/admin/stats' && req.method === 'GET') return sendJson(res, 200, { articles: articles.map(a => {
    const s = engagement.stats(a.slug);
    const telegram = s.utm.filter(r => r.tag.startsWith('telegram')).reduce((sum, r) => ({ views: sum.views + r.views, reads: sum.reads + r.reads }), { views: 0, reads: 0 });
    return { slug: a.slug, title: a.title, date: a.date, draft: !!a.draft, views: s.views, reads: s.reads, likes: s.likes, comments: s.comments, telegramViews: telegram.views, telegramReads: telegram.reads };
  }) });
  const stats = pathname.match(/^\/api\/admin\/stats\/([a-z0-9-]+)$/);
  if (stats && req.method === 'GET' && articleBySlug.has(stats[1])) return sendJson(res, 200, engagement.stats(stats[1]));

  const m = pathname.match(/^\/api\/admin\/article\/([a-z0-9-]+)$/);
  if (m && articleBySlug.has(m[1])) {
    const slug = m[1], current = articleBySlug.get(slug);
    if (req.method === 'GET') return sendJson(res, 200, { article: current, version: versionOf(current), edited: existsSync(overrideFile(slug)), rubrics });
    if (req.method === 'POST') {
      const { edits, version } = await readBody(req);
      if (version !== versionOf(current)) throw new EditError('Статья уже изменилась. Перезагрузите страницу и повторите правку.', 409);
      if (!edits || typeof edits !== 'object' || !Object.keys(edits).length) throw new EditError('Нет правок');
      const next = applyArticleEdits(current, edits);
      snapshot(slug, current); writeJson(overrideFile(slug), next); loadArticles();
      console.log(`editor: saved ${slug} (${Object.keys(edits).length} fields)`);
      return sendJson(res, 200, { ok: true, version: versionOf(articleBySlug.get(slug)) });
    }
    if (req.method === 'DELETE') {
      if (existsSync(overrideFile(slug))) { snapshot(slug, current); unlinkSync(overrideFile(slug)); }
      loadArticles(); console.log(`editor: reset ${slug} to Git`);
      return sendJson(res, 200, { ok: true });
    }
  }
  return sendJson(res, 404, { error: 'Not found' });
}

// ---------- Views, likes, comments (public API) ----------
async function publicApi(req, res, pathname) {
  const [, kind, slug, id] = pathname.split('/').slice(1);
  if (!articleBySlug.has(slug)) return sendJson(res, 404, { error: 'Нет такой статьи' });
  const client = clientKey(req), ua = req.headers['user-agent'] || '';
  const visitor = String(new URL(req.url, 'http://x').searchParams.get('visitor') || '').slice(0, 64);
  if (req.method === 'GET' && kind === 'engagement') return sendJson(res, 200, engagement.read(slug, visitor, client));
  // JSON-only writes: a cross-site form cannot send application/json without a CORS preflight, which this server never allows.
  if (req.method !== 'GET' && !String(req.headers['content-type'] || '').startsWith('application/json')) return sendJson(res, 415, { error: 'Нужен JSON' });
  const body = req.method === 'GET' ? {} : await readBody(req, 16 * 1024);
  const who = String(body.visitor || visitor || '').slice(0, 64);
  if (req.method === 'POST' && kind === 'views') return sendJson(res, 200, engagement.view(slug, client, ua, body.utm));
  if (req.method === 'POST' && kind === 'reads') return sendJson(res, 200, engagement.markRead(slug, client, ua, body.utm));
  if (req.method === 'POST' && kind === 'likes') return sendJson(res, 200, engagement.toggleLike(slug, who, client));
  if (req.method === 'POST' && kind === 'comments' && !id) {
    const comment = engagement.addComment(slug, body, client, articleBySlug.get(slug).paragraphs.length);
    console.log(`comments: new on ${slug}${comment.anchor ? ' (fragment)' : ''}`);
    return sendJson(res, 201, { comment, ...engagement.counts(slug) });
  }
  if (req.method === 'DELETE' && kind === 'comments' && id) {
    const isEditor = req.headers['x-editor'] === '1' && passwordOk(req);
    return sendJson(res, 200, engagement.deleteComment(slug, id, who, client, isEditor));
  }
  return sendJson(res, 405, { error: 'Method Not Allowed' });
}

const server = http.createServer((req,res)=>{
  const apiPath = (req.url || '').split('?')[0];
  if (/^\/api\/(views|reads|likes|engagement|comments)\//.test(apiPath)) {
    return publicApi(req, res, apiPath).catch(err => {
      if (!(err instanceof EngagementError || err instanceof EditError)) console.error('engagement:', err);
      sendJson(res, err.code && err.code < 500 ? err.code : 500, { error: err.code && err.code < 500 ? err.message : 'Ошибка сервера' });
    });
  }
  if (apiPath.startsWith('/api/admin/')) {
    return adminApi(req, res, apiPath).catch(err => {
      if (!(err instanceof EditError)) console.error('editor:', err);
      sendJson(res, err instanceof EditError ? err.code : 500, { error: err instanceof EditError ? err.message : 'Ошибка сервера' });
    });
  }
  if (req.method!=='GET' && req.method!=='HEAD') return write(res,405,'Method Not Allowed','text/plain');
  const origin=canonicalOrigin(req);
  let url;try{url=new URL(req.url||'/',origin);}catch{return write(res,400,'Bad request','text/plain');}
  const pathname=url.pathname;
  if(pathname==='/health')return write(res,200,'OK','text/plain; charset=utf-8',{'Cache-Control':'no-store'});
  if(pathname==='/robots.txt')return write(res,200,`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,'text/plain; charset=utf-8');
  if(pathname==='/sitemap.xml'){
    const paths=['/','/about',...rubrics.map(r=>'/rubrics/'+r.slug),...published().map(a=>'/articles/'+a.slug)];
    return write(res,200,`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${xmlSafe(origin+p)}</loc></url>`).join('')}</urlset>`,'application/xml; charset=utf-8');
  }
  if(pathname==='/rss.xml'){
    const items=published().map(a=>`<item><title>${xmlSafe(a.title)}</title><link>${origin}/articles/${a.slug}</link><guid>${origin}/articles/${a.slug}</guid><pubDate>${new Date(a.date+'T12:00:00Z').toUTCString()}</pubDate><description>${xmlSafe(a.summary)}</description></item>`).join('');
    return write(res,200,`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Leiman Lab</title><link>${origin}/</link><description>Исследования, технологии и искусство</description><language>ru</language>${items}</channel></rss>`,'application/rss+xml; charset=utf-8');
  }
  if(pathname==='/')return write(res,200,home(origin));
  // Legacy URLs of the first Railway Function version: Telegram previews already point here.
  const legacyOg=pathname.match(/^\/og\/([a-z0-9-]+)\.png$/);
  if(legacyOg && articleBySlug.has(legacyOg[1])){const data=readFileSync(path.join(PUBLIC,articleBySlug.get(legacyOg[1]).cover));return write(res,200,data,'image/png',{'Cache-Control':'public,max-age=600','Content-Length':data.length});}
  if(pathname==='/style.css')return write(res,301,'','text/plain',{Location:'/assets/site.css'});
  if(pathname==='/favicon.ico')return write(res,301,'','text/plain',{Location:'/favicon.svg'});
  if(pathname==='/about'||pathname==='/about/')return write(res,200,aboutView(origin));
  if(pathname==='/search'){
    const q=String(url.searchParams.get('q')||'').slice(0,120).trim();
    const form=`<form class="search-form" action="/search" role="search"><input name="q" value="${escaped(q)}" placeholder="Например: Anduril, LiteLLM, агенты" aria-label="Поиск по журналу" autofocus><button class="button button-primary" type="submit">НАЙТИ</button></form>`;
    return write(res,200,listPage({origin,path:'/search'+(q?`?q=${encodeURIComponent(q)}`:''),pill:'ПОИСК',title:q?`«${q}»`:'Поиск по журналу',list:q?search(q):[],empty:q?'Ничего не нашлось. Попробуйте другое слово или посмотрите рубрики.':'Введите слово: имя, компанию, тему.',extra:form,noindex:true}));
  }
  const tagMatch=pathname.match(/^\/tags\/([^/]+)\/?$/);
  if(tagMatch){
    let tag='';try{tag=decodeURIComponent(tagMatch[1]);}catch{}
    const list=published().filter(a=>(a.tags||[]).some(t=>norm(t)===norm(tag)));
    if(list.length)return write(res,200,listPage({origin,path:tagUrl(tag),pill:'ТЕГ',title:`#${tag}`,list,empty:''}));
  }
  const rubricMatch=pathname.match(/^\/rubrics\/([a-z0-9-]+)\/?$/);
  if(rubricMatch && rubricBySlug.has(rubricMatch[1]))return write(res,200,rubricView(rubricBySlug.get(rubricMatch[1]),origin));
  const match=pathname.match(/^\/articles\/([a-z0-9-]+)\/?$/);
  if(match && articleBySlug.has(match[1]))return write(res,200,articleView(articleBySlug.get(match[1]),origin));
  if(pathname.startsWith('/assets/') || pathname==='/favicon.svg') {
    const staticFile=path.resolve(PUBLIC,'.'+pathname);
    if(!staticFile.startsWith(PUBLIC+path.sep))return write(res,403,'Forbidden','text/plain');
    try { const s=statSync(staticFile);if(!s.isFile())throw Error('Not file');const data=readFileSync(staticFile);return write(res,200,data,mimeFor(staticFile),{'Cache-Control':pathname==='/assets/admin.js'?'no-cache':'public,max-age=600','Content-Length':data.length}); }
    catch{return write(res,404,'Not found','text/plain');}
  }
  const missing=`<main class="container not-found"><div class="eyebrow">404 / NOT FOUND</div><h1>СТРАНИЦА НЕ НАЙДЕНА.</h1><p>Такого материала в журнале нет.</p><a class="button button-primary" href="/">ВЕРНУТЬСЯ В ЖУРНАЛ ↗</a></main>`;
  return write(res,404,page({content:missing,title:'404 — Leiman Lab',description:'Страница не найдена',canonical:origin+pathname,cover:origin+asset('/assets/black-october-1200x630.png')}));
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { engagement.flush(); process.exit(0); });
server.listen(PORT,'0.0.0.0',()=>console.log(`LEIMAN LAB listening on :${PORT} (${articles.length} articles)`));
