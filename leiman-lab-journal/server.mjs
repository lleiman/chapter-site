/**
 * LEIMAN LAB / JOURNAL
 * Zero-dependency editorial site. Node.js 20+.
 * Articles are edited in content/*.json. No secrets or database required.
 */
import http from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DIR = path.join(ROOT, 'content');
const PORT = Number(process.env.PORT || 3000);
const articles = readdirSync(DIR)
  .filter(n => /^\d{3}-[a-z0-9-]+\.json$/.test(n))
  .map(n => JSON.parse(readFileSync(path.join(DIR, n), 'utf8')))
  .sort((a, b) => b.date.localeCompare(a.date));
const articleBySlug = new Map(articles.map(a => [a.slug, a]));

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

function page({ content, title, description, canonical, cover, type = 'website', date, schema }) {
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
${date ? `<meta property="article:published_time" content="${escaped(date)}">` : ''}
<link rel="stylesheet" href="/assets/site.css">${structured}
</head><body>
<header class="site-header"><div class="container header-inner">
<a class="identity" href="/" aria-label="Leiman Lab — главная">${logo}<span class="wordmark">LEIMAN <b>LAB</b></span></a>
<nav aria-label="Основная навигация"><a href="/#journal">Журнал</a><a href="/#about">О лаборатории</a><a href="https://t.me/aiadepts" target="_blank" rel="noopener noreferrer">Telegram ↗</a></nav>
</div></header>
${content}
<footer class="site-footer"><div class="container footer-inner">
<div><span class="footer-brand">LEIMAN LAB<span class="red-dot">.</span></span><div class="micro muted">RESEARCH · TECHNOLOGY · CREATIVE PRACTICE</div></div>
<div class="micro muted right">© 2026 ЛЕВ ЛЕЙМАН<br><a href="https://t.me/leimanleo" rel="noopener">COMMERCIAL INQUIRIES ↗</a></div>
</div></footer>
</body></html>`;
}

function card(a, size = '') {
  return `<a class="story-card ${size}" href="/articles/${escaped(a.slug)}">
  <div class="story-image"><img src="${escaped(a.cover)}" alt="Обложка ${escaped(a.cardTitle)}" loading="lazy" width="1200" height="630"><span class="image-index mono">${escaped(a.issue)} ↗</span></div>
  <div class="story-info"><div class="micro story-meta">${escaped(a.section)} <span class="line"></span> ${escaped(a.dateLabel)}</div>
  <h3>${escaped(a.title)}</h3><p>${escaped(a.summary)}</p><div class="story-foot"><span class="micro muted">${escaped(a.readingMinutes)} МИН ЧТЕНИЯ</span><span class="read-link micro">ЧИТАТЬ ↗</span></div></div>
  </a>`;
}

function home(origin) {
  const featured = articles[0];
  const html = `<main>
  <section class="container intro" aria-labelledby="hero-title">
    <div class="intro-text"><div class="eyebrow"><span class="red-square"></span> INDEPENDENT RESEARCH JOURNAL <span class="muted">/ 2026</span></div>
    <h1 id="hero-title" class="hero-title">LEIMAN<br><em>LAB<span class="dot">.</span></em></h1>
    <p class="intro-lead">Исследую то, что меняет человека и его способы действовать. ИИ, технологии, продакшен, бизнес, сознание и искусство.</p>
    <div class="intro-actions"><a class="button button-primary" href="#journal">СМОТРЕТЬ ПУБЛИКАЦИИ <span>↘</span></a><span class="micro muted">НАБЛЮДЕНИЯ · КЕЙСЫ · ЭКСПЕРИМЕНТЫ</span></div>
    </div>
    <div class="intro-visual" aria-hidden="true"><div class="visual-index mono">FIG. 001 / LL MONOGRAM</div><div class="large-mark">${logo}</div><span class="visual-code mono">[ 01 / OPEN SYSTEM ]</span></div>
  </section>
  <section id="journal" class="container journal-section" aria-labelledby="journal-title">
    <div class="section-rule"><h2 id="journal-title">ЖУРНАЛ <span class="accent">/</span> <small>01</small></h2><span class="micro muted">${articles.length} PUBLICATIONS · NEWEST FIRST</span></div>
    <div class="featured-story">${card(featured,'featured')}</div>
    <div class="journal-grid">${articles.slice(1).map(a=>card(a)).join('')}</div>
  </section>
  <section id="about" class="container about-section"><div class="about-heading"><div class="eyebrow">02 / WHO'S BEHIND THE LAB</div><h2>Вопросы.<br>Практика.<br><span class="accent">Результаты.</span></h2></div>
  <div class="about-copy"><p>Leiman Lab — личная исследовательская и проектная лаборатория Льва Леймана.</p>
  <p>Здесь я собираю то, над чем работаю: AI-продукты, продакшен, исследования человеческого поведения, экспериментальные инструменты и искусство. Публикую не только выводы, но и ход работы, ограничения и источники.</p>
  <div class="about-services"><span>AI-ПРОДАКШЕН</span><span>AI-ПРОДУКТЫ</span><span>R&D</span><span>СПЕЦПРОЕКТЫ</span></div>
  <a class="button button-line" href="https://t.me/leimanleo">СВЯЗАТЬСЯ ПО ПРОЕКТУ ↗</a></div></section>
  </main>`;
  return page({content:html,title:'Leiman Lab — журнал исследований, технологий и экспериментов',description:'ИИ, технологии, бизнес, психология, исследования сознания и искусство. Авторский журнал Льва Леймана.',canonical:`${origin}/`,cover:`${origin}${featured.cover}`,schema:{'@context':'https://schema.org','@type':'WebSite',name:'Leiman Lab',url:origin+'/','inLanguage':'ru'}});
}
function renderBlock(block) {
  switch(block.type) {
    case 'lead': return `<p class="body-lead">${escaped(block.text)}</p>`;
    case 'p': return `<p>${escaped(block.text)}</p>`;
    case 'h2': return `<h2>${escaped(block.text)}</h2>`;
    case 'h3': return `<h3>${escaped(block.text)}</h3>`;
    case 'aside': return `<aside class="callout"><span class="micro accent">${escaped(block.label||'НАБЛЮДЕНИЕ')}</span><p>${escaped(block.text)}</p></aside>`;
    case 'quote': return `<blockquote>${escaped(block.text)}</blockquote>`;
    case 'list': return `<ul>${(block.items||[]).map(t=>`<li>${escaped(t)}</li>`).join('')}</ul>`;
    default: return '';
  }
}
function articleView(a, origin) {
  const pageUrl = `${origin}/articles/${a.slug}`;
  const share = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(a.title)}`;
  const related = articles.filter(x=>x.slug!==a.slug).slice(0,2);
  const body = `<main>
  <article itemscope itemtype="https://schema.org/Article">
    <header class="container article-head"><a class="back mono" href="/">← JOURNAL / LEIMAN LAB</a>
      <div class="article-overline"><span class="pill micro">FIELD NOTE ${escaped(a.issue)}</span><span class="micro muted">${escaped(a.section)}</span></div>
      <h1 itemprop="headline">${escaped(a.title)}</h1>
      <p class="article-deck" itemprop="description">${escaped(a.summary)}</p>
      <div class="article-byline micro"><span>ЛЕВ ЛЕЙМАН</span><span class="thin-sep"></span><time datetime="${escaped(a.date)}">${escaped(a.dateLabel)}</time><span class="thin-sep"></span><span>${escaped(a.readingMinutes)} МИН</span></div>
    </header>
    <div class="container feature-image"><img src="${escaped(a.cover)}" width="1200" height="630" alt="Редакционная иллюстрация к статье ${escaped(a.cardTitle)}" fetchpriority="high">
    <div class="image-caption micro">LEIMAN LAB / ${escaped(a.issue)} &nbsp; · &nbsp; EDITORIAL ILLUSTRATION</div></div>
    <div class="content-layout container"><aside class="article-sidebar"><div class="micro muted">RESEARCH NOTE<br>${escaped(a.issue)} / 2026</div><div class="aside-divider"></div><div class="mono small">LEIMAN<br>LAB<span class="accent">.</span></div></aside>
    <div class="article-prose" itemprop="articleBody">${a.paragraphs.map(renderBlock).join('\n')}
      <section class="sources"><div class="sources-head"><span class="eyebrow">ИСТОЧНИКИ / SOURCES</span><span class="micro muted">${a.sources.length} LINKS</span></div>
      <ol>${a.sources.map(s=>`<li><a href="${escaped(s.url)}" rel="noopener noreferrer" target="_blank">${escaped(s.title)} ↗</a><span class="micro muted">${escaped(s.type)}</span></li>`).join('')}</ol>
      <p class="micro muted source-note">Факты относятся к дате публикации. В продолжающихся расследованиях оценки могут измениться. Заявления компаний помечены в тексте как заявления компаний.</p></section>
      <div class="share-row"><a class="button button-primary" href="${escaped(share)}" target="_blank" rel="noopener noreferrer">ПОДЕЛИТЬСЯ В TELEGRAM ↗</a><button id="copy-link" class="button button-line" type="button" data-url="${escaped(pageUrl)}">КОПИРОВАТЬ ССЫЛКУ</button></div>
      <script>document.getElementById('copy-link')?.addEventListener('click',async e=>{try{await navigator.clipboard.writeText(e.currentTarget.dataset.url);e.currentTarget.textContent='ССЫЛКА СКОПИРОВАНА ✓'}catch(e){e.currentTarget.textContent='КОПИРОВАНИЕ НЕДОСТУПНО'}})</script>
    </div></div>
  </article>
  ${related.length?`<section class="container more-stories"><div class="section-rule"><h2>ДАЛЬШЕ <span class="accent">/</span></h2><a class="micro muted" href="/">ВЕСЬ ЖУРНАЛ ↗</a></div><div class="journal-grid">${related.map(x=>card(x)).join('')}</div></section>`:''}
  </main>`;
  return page({content:body,title:`${a.title} — Leiman Lab`,description:a.summary,canonical:pageUrl,cover:`${origin}${a.cover}`,type:'article',date:a.date,schema:{'@context':'https://schema.org','@type':'NewsArticle',headline:a.title,description:a.summary,image:[`${origin}${a.cover}`],datePublished:a.date,inLanguage:'ru',author:{'@type':'Person',name:'Лев Лейман'},publisher:{'@type':'Organization',name:'Leiman Lab'}}});
}

function write(res, code, data, mime='text/html; charset=utf-8', more={}) {
  res.writeHead(code, {'Content-Type':mime,'X-Content-Type-Options':'nosniff',...more});res.end(data);
}
function mimeFor(file){return ({'.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.js':'text/javascript; charset=utf-8'})[path.extname(file)]||'application/octet-stream';}
function xmlSafe(x){return escaped(x);}
const server = http.createServer((req,res)=>{
  if (req.method!=='GET' && req.method!=='HEAD') return write(res,405,'Method Not Allowed','text/plain');
  const origin=canonicalOrigin(req);
  let url;try{url=new URL(req.url||'/',origin);}catch{return write(res,400,'Bad request','text/plain');}
  const pathname=url.pathname;
  if(pathname==='/health')return write(res,200,'OK','text/plain; charset=utf-8',{'Cache-Control':'no-store'});
  if(pathname==='/robots.txt')return write(res,200,`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,'text/plain; charset=utf-8');
  if(pathname==='/sitemap.xml'){
    const paths=['/',...articles.map(a=>'/articles/'+a.slug)];
    return write(res,200,`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${xmlSafe(origin+p)}</loc></url>`).join('')}</urlset>`,'application/xml; charset=utf-8');
  }
  if(pathname==='/rss.xml'){
    const items=articles.map(a=>`<item><title>${xmlSafe(a.title)}</title><link>${origin}/articles/${a.slug}</link><guid>${origin}/articles/${a.slug}</guid><pubDate>${new Date(a.date+'T12:00:00Z').toUTCString()}</pubDate><description>${xmlSafe(a.summary)}</description></item>`).join('');
    return write(res,200,`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Leiman Lab</title><link>${origin}/</link><description>Исследования, технологии и искусство</description><language>ru</language>${items}</channel></rss>`,'application/rss+xml; charset=utf-8');
  }
  if(pathname==='/')return write(res,200,home(origin));
  // Legacy URLs of the first Railway Function version: Telegram previews already point here.
  const legacyOg=pathname.match(/^\/og\/([a-z0-9-]+)\.png$/);
  if(legacyOg && articleBySlug.has(legacyOg[1])){const data=readFileSync(path.join(PUBLIC,articleBySlug.get(legacyOg[1]).cover));return write(res,200,data,'image/png',{'Cache-Control':'public,max-age=600','Content-Length':data.length});}
  if(pathname==='/style.css')return write(res,301,'','text/plain',{Location:'/assets/site.css'});
  if(pathname==='/favicon.ico')return write(res,301,'','text/plain',{Location:'/favicon.svg'});
  const match=pathname.match(/^\/articles\/([a-z0-9-]+)\/?$/);
  if(match && articleBySlug.has(match[1]))return write(res,200,articleView(articleBySlug.get(match[1]),origin));
  if(pathname.startsWith('/assets/') || pathname==='/favicon.svg') {
    const staticFile=path.resolve(PUBLIC,'.'+pathname);
    if(!staticFile.startsWith(PUBLIC+path.sep))return write(res,403,'Forbidden','text/plain');
    try { const s=statSync(staticFile);if(!s.isFile())throw Error('Not file');const data=readFileSync(staticFile);return write(res,200,data,mimeFor(staticFile),{'Cache-Control':'public,max-age=600','Content-Length':data.length}); }
    catch{return write(res,404,'Not found','text/plain');}
  }
  const missing=`<main class="container not-found"><div class="eyebrow">404 / NOT FOUND</div><h1>СТРАНИЦА НЕ НАЙДЕНА.</h1><p>Такого материала в журнале нет.</p><a class="button button-primary" href="/">ВЕРНУТЬСЯ В ЖУРНАЛ ↗</a></main>`;
  return write(res,404,page({content:missing,title:'404 — Leiman Lab',description:'Страница не найдена',canonical:origin+pathname,cover:origin+'/assets/black-october-1200x630.png'}));
});
server.listen(PORT,'0.0.0.0',()=>console.log(`LEIMAN LAB listening on :${PORT} (${articles.length} articles)`));
