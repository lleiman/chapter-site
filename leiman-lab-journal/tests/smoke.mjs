/** Run: npm test. Zero dependencies. */
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const port = 37839;
const origin = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(path.join(tmpdir(), 'leiman-lab-test-'));
const PASSWORD = 'test-password';
const child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_PASSWORD: PASSWORD, GOOGLE_SITE_VERIFICATION: 'gsc-sample-token' }, stdio: ['ignore', 'pipe', 'pipe'] });
let errors = '';
child.stderr.on('data', b => errors += b.toString());
async function get(path) { return fetch(origin + path); }
async function ready() {
  for (let i = 0; i < 50; i++) {
    try { if ((await get('/health')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Server not ready: ${errors}`);
}
async function main() {
  await ready();
  for (const route of ['/', '/articles/warhound', '/articles/black-october', '/assets/site.css', '/assets/warhound-1200x630.png', '/assets/black-october-1200x630.png', '/favicon.svg', '/sitemap.xml', '/rss.xml', '/health']) {
    const response = await get(route);
    assert.equal(response.status, 200, `${route} should return 200`);
    console.log('✓', route);
  }
  for (const slug of ['warhound', 'black-october']) {
    const html = await (await get('/articles/'+slug)).text();
    assert.ok(html.includes('property="og:title"'), 'OG title missing');
    assert.ok(html.includes('property="og:image"'), 'OG image missing');
    assert.ok(html.includes('"@type":"Article"'), 'JSON-LD article missing');
    assert.ok(html.includes('"mainEntityOfPage"'), 'schema canonical entity missing');
    assert.ok(html.includes('<section class="sources">'), 'Primary sources missing');
    assert.ok(html.includes('LEIMAN LAB'), 'Brand missing');
    console.log('✓ article metadata', slug);
  }
  for (const slug of ['warhound', 'black-october']) {
    const legacy = await get(`/og/${slug}.png`);
    assert.equal(legacy.status, 200, `/og/${slug}.png should return 200`);
    assert.equal(legacy.headers.get('content-type'), 'image/png');
    console.log('✓ legacy', `/og/${slug}.png`);
  }
  const p404 = await get('/articles/no-such-article');
  assert.equal(p404.status, 404);
  console.log('✓ 404 handling');
  const page = await (await get('/')).text();
  assert.ok(page.includes('<meta name="google-site-verification" content="gsc-sample-token">'), 'Search Console ownership tag must be in the HTML head');
  assert.ok(page.indexOf('google-site-verification') < page.indexOf('</head>'), 'Google verification tag must appear inside head');
  assert.ok(page.includes('Warhound'));
  assert.ok(page.includes('Чёрный октябрь'));
  assert.ok(!page.includes('главный вопрос не в том'));
  console.log('✓ homepage includes both articles');
  const gsc=await get('/google6203997034e41be1.html');
  assert.equal(gsc.status,200,'Google verification URL');
  assert.equal((await gsc.text()).trim(),'google-site-verification: google6203997034e41be1.html','Google verification file content');
  assert.ok(gsc.headers.get('content-type').startsWith('text/html'),'Google verification content-type');
  await seoTests();
  await passwordlessAnalyticsTests();
  await aiIndexTests();
  await rubricTests();
  await featureTests();
  await editorTests();
  console.log('\nALL TESTS PASSED');
}

const html = async route => (await get(route)).text();
const editArticle = async (slug, edits) => {
  const { json } = await api('GET', `/api/admin/article/${slug}`);
  const r = await api('POST', `/api/admin/article/${slug}`, { version: json.version, edits });
  assert.equal(r.status, 200, JSON.stringify(r.json));
};

async function passwordlessAnalyticsTests() {
  const response = await get('/analytics');
  assert.equal(response.status, 200, 'password-free statistics page');
  assert.equal(response.headers.get('x-robots-tag'),'noindex', 'analytics must not be indexed');
  const page = await response.text();
  assert.ok(page.includes('АНАЛИТИКА') && page.includes('ПРОСМОТРЫ') && page.includes('ДОЧИТЫВАНИЯ'), 'analytics page totals');
  assert.ok(page.includes('analytics.css') && page.includes('name="robots" content="noindex"'), 'dashboard design and privacy metadata');
  assert.ok(page.includes('href="/articles/ai-index-2026"'), 'published article appears');
  assert.ok(!(await html('/sitemap.xml')).includes('/analytics'), 'analytics excluded from search sitemap');
  const apiResponse = await get('/api/public/analytics');
  assert.equal(apiResponse.status, 200, 'read-only stats accessible without password');
  const data = await apiResponse.json();
  assert.equal(data.period, 'all-time');
  assert.ok(data.articles.some(a => a.slug === 'ai-index-2026'));
  assert.ok(data.articles.every(a => ['slug','title','date','views','reads','likes','comments','telegramViews','telegramReads','downloads'].every(k => k in a)), 'safe public aggregate fields');
  assert.ok(!JSON.stringify(data).includes('visitor'), 'no visitor identifiers in public stats');
  assert.ok(!JSON.stringify(data).includes('utm /'), 'no raw campaign data');
  const writeAttempt = await fetch(origin+'/api/public/analytics', {method:'POST'});
  assert.equal(writeAttempt.status,405,'dashboard cannot be used to edit');
  assert.equal((await api('GET','/api/admin/stats',null,'wrong')).status, 401, 'editor/admin analytics remain protected');
  assert.ok((await html('/')).includes('href="/analytics"'), 'direct password-free stats navigation');
  console.log('✓ analytics: no-password readonly dashboard; publishing stays protected');
}

async function seoTests() {
  const homepage=await html('/');
  assert.ok(homepage.includes('rel="canonical" href="'+origin+'/"'), 'local canonical should use testing origin');
  assert.ok(homepage.includes('property="og:image" content="'+origin+'/og/ai-index-2026.png?v='), 'home OG should be raster PNG');
  const article=await html('/articles/ai-index-2026');
  assert.ok(article.includes('"@type":"Article"') && article.includes('"mainEntityOfPage"'), 'article metadata');
  assert.ok(article.includes('/og/ai-index-2026.png?v='), 'AI Index OG PNG');
  const articleAlt=await html('/articles/after-black-october');
  assert.ok(articleAlt.includes('/og/after-black-october.png?v='), 'research OG PNG');
  for (const route of ['/og/ai-index-2026.png','/og/after-black-october.png']) {
    const response=await get(route);
    assert.equal(response.status,200,'raster OG '+route);
    assert.equal(response.headers.get('content-type'),'image/png');
    const bytes=new Uint8Array(await response.arrayBuffer());
    assert.ok(bytes.length>10000 && bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71,'PNG signature '+route);
  }
  const sitemap=await html('/sitemap.xml');
  assert.ok(sitemap.includes('<lastmod>2026-11-04</lastmod>'), 'sitemap modification dates');
  const legacy=await fetch(origin+'/articles/ai-index-2026?utm_source=telegram',{redirect:'manual',headers:{'X-Forwarded-Host':'journal-web-production-bf39.up.railway.app'}});
  assert.equal(legacy.status,308,'legacy Railway host should redirect');
  assert.equal(legacy.headers.get('location'),'https://leimanlab.com/articles/ai-index-2026?utm_source=telegram');
  console.log('✓ SEO: canonical host, page metadata, sitemap and raster social covers');
}

async function aiIndexTests() {
  const route = await get('/ai-index');
  assert.equal(route.status, 200, 'AI Index route');
  const index = await route.text();
  for (const text of ['Какую', 'AI INDEX', 'ai-task', 'ai-model-grid', 'ai-compare-output', 'ai-result-cost', 'id="method"']) {
    assert.ok(index.includes(text), 'missing AI Index component: ' + text);
  }
  assert.ok(index.includes('name="viewport"'), 'AI Index viewport');
  assert.ok(index.includes('Как я буду проверять'), 'AI Index must use the singular author voice');
  assert.ok(!index.includes('Как мы будем проверять'), 'avoid collective editorial voice');
  assert.ok(index.includes('rel="canonical" href="http://127.0.0.1:37839/ai-index"'), 'AI Index canonical');
  for (const asset of ['/assets/ai-index.css', '/assets/ai-index.html', '/assets/ai-index.js', '/assets/ai-index-cover.svg', '/assets/ai-index-article.css']) {
    const result = await get(asset);
    assert.equal(result.status, 200, asset + ' available');
    assert.ok((await result.text()).length > 100);
  }
  const aiArticle = await get('/articles/ai-index-2026');
  assert.equal(aiArticle.status, 200);
  const article = await aiArticle.text();
  assert.ok(article.includes('Калькулятор') || article.includes('калькулятор'), 'AI Index article');
  assert.ok(article.includes('Я собрал AI Index'), 'article should use the first-person author voice');
  assert.ok(!article.includes('Мы собрали AI Index'), 'remove collective author voice');
  assert.ok(article.includes('ai-index-article.css') && article.includes('ai-index-cover.svg'), 'paper styling and cover');
  const home = await html('/');
  assert.ok(home.includes('href="/ai-index"') && home.includes('href="/articles/ai-index-2026"'), 'AI Index navigation and story card');
  const map = await html('/sitemap.xml');
  assert.ok(map.includes('/ai-index') && map.includes('/articles/ai-index-2026'), 'AI Index in sitemap');
  console.log('✓ AI Index: route, interactive components, article, assets and sitemap');
}

async function featureTests() {
  // About page, Telegram follow block
  const about = await get('/about');
  assert.equal(about.status, 200);
  assert.ok((await about.text()).includes('data-edit="about.lead"'));
  assert.equal((await api('POST', '/api/admin/site', { edits: { 'about.1': 'Новый текст об авторе' } })).status, 200);
  assert.ok((await html('/about')).includes('Новый текст об авторе'));
  assert.ok((await html('/articles/warhound')).includes('class="tg-follow"'));
  await api('DELETE', '/api/admin/site');
  console.log('✓ about page and Telegram block');

  // Search and tags
  assert.ok((await html('/search?q=anduril')).includes('href="/articles/warhound"'));
  assert.ok((await html(`/search?q=${encodeURIComponent('черный')}`)).includes('href="/articles/black-october"'), 'ё-insensitive search');
  assert.ok((await html('/search')).includes('name="robots" content="noindex"'));
  const tag = (await (await api('GET', '/api/admin/article/black-october')).json).article.tags[0];
  assert.equal((await get(`/tags/${encodeURIComponent(tag)}`)).status, 200);
  assert.equal((await get('/tags/no-such-tag')).status, 404);
  assert.ok((await html('/articles/black-october')).includes('class="tag-list"'));
  await editArticle('warhound', { tags: 'Тест-тег, #Генетика' });
  assert.ok((await html(`/tags/${encodeURIComponent('Тест-тег')}`)).includes('href="/articles/warhound"'), 'tags edited in editor');
  console.log('✓ search and tags');

  // Change log
  await editArticle('black-october', { changeNote: 'Уточнена цифра по LiteLLM' });
  const changed = await html('/articles/black-october');
  assert.ok(changed.includes('id="changes"') && changed.includes('Уточнена цифра по LiteLLM') && changed.includes('ОБНОВЛЕНО'), 'change log');
  assert.ok(changed.includes('property="article:modified_time"') && changed.includes('"dateModified"'));
  console.log('✓ change log and modified date');

  // Stories: a box appears when two published articles share a story
  await editArticle('black-october', { story: 'Тестовый сюжет' });
  assert.ok(!(await html('/articles/black-october')).includes('class="story-box"'), 'story box with one part');
  await editArticle('warhound', { story: 'Тестовый сюжет' });
  const story = await html('/articles/warhound');
  assert.ok(story.includes('class="story-box"') && story.includes('href="/articles/black-october"'), 'story box');
  console.log('✓ stories');

  // Drafts: hidden from lists, open by link, published from the editor
  await editArticle('warhound', { draft: '1' });
  const draftPage = await get('/articles/warhound');
  assert.equal(draftPage.status, 200);
  const draftHtml = await draftPage.text();
  assert.ok(draftHtml.includes('draft-banner') && draftHtml.includes('content="noindex"'));
  for (const route of ['/', '/rubrics/ai', '/sitemap.xml', '/rss.xml', '/search?q=anduril', '/about']) assert.ok(!(await html(route)).includes('/articles/warhound'), `draft visible in ${route}`);
  for (const route of ['/', '/rubrics/ai', '/rss.xml', '/search?q=zzzz', '/about', '/rubrics/mind']) assert.ok(!(await html(route)).includes('warhound-1200x630'), `draft cover leaks into ${route}`);
  const { json: all } = await api('GET', '/api/admin/stats');
  assert.ok(all.articles.length >= 2); assert.equal(all.articles.find(a => a.slug === 'warhound').draft, true);
  await editArticle('warhound', { draft: '0' });
  assert.ok((await html('/')).includes('/articles/warhound'), 'published again');
  console.log('✓ drafts and publishing, overall stats');

  for (const slug of ['warhound', 'black-october']) assert.equal((await api('DELETE', `/api/admin/article/${slug}`)).status, 200);

  // «Материал» block and counted downloads
  const kitPage = await html('/articles/human-voice');
  assert.ok(kitPage.includes('class="kit"') && kitPage.includes('href="/files/leiman-lab-kit-001-human-voice.zip" download'), 'kit block');
  assert.ok(kitPage.includes('href="/articles/black-october"'), 'links to earlier articles');
  const zip = await get('/files/leiman-lab-kit-001-human-voice.zip');
  assert.equal(zip.status, 200);
  assert.equal(zip.headers.get('content-type'), 'application/zip');
  assert.ok(zip.headers.get('content-disposition').includes('attachment'));
  await get('/files/leiman-lab-kit-001-human-voice.zip');
  await fetch(`${origin}/files/leiman-lab-kit-001-human-voice.zip`, { headers: { 'User-Agent': 'TelegramBot (like TwitterBot)' } });
  const { json: kitStats } = await api('GET', '/api/admin/stats/human-voice');
  assert.deepEqual(kitStats.files.map(f => f.downloads), [1], 'one download per person, bots excluded');
  assert.equal((await get('/files/..%2Fserver.mjs')).status, 404);
  assert.equal((await get('/files/nope.zip')).status, 404);
  console.log('✓ material block and counted downloads');
}

async function rubricTests() {
  const ai = await get('/rubrics/ai');
  assert.equal(ai.status, 200);
  const aiHtml = await ai.text();
  assert.ok(aiHtml.includes('href="/articles/warhound"') && aiHtml.includes('href="/articles/black-october"'), 'rubric lists its articles');
  const mind = await (await get('/rubrics/mind')).text();
  assert.ok(mind.includes('rubric-empty') && !mind.includes('href="/articles/'), 'empty rubric page');
  assert.equal((await get('/rubrics/nope')).status, 404);
  const home = await (await get('/')).text();
  assert.ok(home.includes('class="rubric-nav"') && home.includes('href="/rubrics/ai"'), 'rubric nav on home');
  assert.ok((await (await get('/articles/warhound')).text()).includes('class="micro rubric-link" href="/rubrics/ai"'), 'rubric link in article');
  assert.ok((await (await get('/sitemap.xml')).text()).includes('/rubrics/ai'), 'populated rubrics in sitemap');
  assert.ok(!(await html('/sitemap.xml')).includes('/rubrics/mind'), 'empty rubrics excluded from sitemap');
  assert.ok((await html('/rubrics/mind')).includes('name="robots" content="noindex"'), 'empty rubric must not be indexed');
  const { json: before } = await api('GET', '/api/admin/article/warhound');
  assert.equal(before.rubrics.length, 4);
  assert.equal((await api('POST', '/api/admin/article/warhound', { version: before.version, edits: { rubric: 'nope' } })).status, 400);
  assert.equal((await api('POST', '/api/admin/article/warhound', { version: before.version, edits: { rubric: 'mind' } })).status, 200);
  assert.ok((await (await get('/rubrics/mind')).text()).includes('href="/articles/warhound"'), 'rubric changed in editor');
  assert.equal((await api('DELETE', '/api/admin/article/warhound')).status, 200);
  console.log('✓ rubrics: pages, nav, article link, sitemap, editor');
}

async function api(method, route, data, password = PASSWORD) {
  const response = await fetch(origin + route, { method, headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password }, body: data ? JSON.stringify(data) : undefined });
  return { status: response.status, json: await response.json() };
}
async function editorTests() {
  assert.equal((await get('/assets/admin.js')).status, 200);
  assert.ok((await (await get('/')).text()).includes("import('/assets/admin.js')"), 'editor loader missing');
  assert.equal((await api('POST', '/api/admin/login', null, 'wrong')).status, 401);
  assert.equal((await api('POST', '/api/admin/article/warhound', { edits: {} }, '')).status, 401);
  assert.equal((await api('POST', '/api/admin/login')).status, 200);
  console.log('✓ editor: password required');

  const { json: before } = await api('GET', '/api/admin/article/warhound');
  assert.equal(before.edited, false);
  const firstP = before.article.paragraphs.findIndex(b => b.type === 'p');
  const edit = await api('POST', '/api/admin/article/warhound', { version: before.version, edits: { [`b.${firstP}`]: 'Первый новый абзац.\nВторой новый абзац.', deck: 'Новый подзаголовок' } });
  assert.equal(edit.status, 200, JSON.stringify(edit.json));
  const html = await (await get('/articles/warhound')).text();
  assert.ok(html.includes('Первый новый абзац.</span></p>') && html.includes('Второй новый абзац.'), 'paragraph split missing');
  assert.ok(html.includes('content="Новый подзаголовок"'), 'deck should feed og:description');
  assert.ok(readdirSync(path.join(dataDir, 'history')).length >= 1, 'history snapshot missing');
  console.log('✓ editor: saves text, splits paragraphs, updates OG');

  assert.equal((await api('POST', '/api/admin/article/warhound', { version: before.version, edits: { deck: 'x' } })).status, 409);
  assert.equal((await api('POST', '/api/admin/article/warhound', { version: edit.json.version, edits: { 'b.999': 'x' } })).status, 400);
  assert.equal((await api('POST', '/api/admin/article/warhound', { version: edit.json.version, edits: { headline: '' } })).status, 400);
  console.log('✓ editor: rejects stale version, unknown and empty fields');

  assert.equal((await api('DELETE', '/api/admin/article/warhound')).status, 200);
  const restored = await (await get('/articles/warhound')).text();
  assert.ok(!restored.includes('Первый новый абзац.'), 'reset to Git failed');
  console.log('✓ editor: reset to Git');

  assert.equal((await api('POST', '/api/admin/site', { edits: { 'home.lead': 'Новый текст главной' } })).status, 200);
  assert.ok((await (await get('/')).text()).includes('Новый текст главной'));
  assert.equal((await api('POST', '/api/admin/site', { edits: { 'home.nope': 'x' } })).status, 400);
  assert.equal((await api('DELETE', '/api/admin/site')).status, 200);
  console.log('✓ editor: home texts');
  await openEditorTest();
  await engagementTests();
}

async function call(method, route, data, headers = {}) {
  const response = await fetch(origin + route, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: data ? JSON.stringify(data) : undefined });
  return { status: response.status, json: await response.json() };
}
async function engagementTests() {
  const slug = 'black-october';
  assert.equal((await call('POST', `/api/views/${slug}`, {})).json.views, 1);
  assert.equal((await call('POST', `/api/views/${slug}`, {})).json.views, 1, 'same person counted twice');
  assert.equal((await call('POST', `/api/views/${slug}`, {}, { 'User-Agent': 'TelegramBot (like TwitterBot)' })).json.views, 1, 'bot counted');
  console.log('✓ views: one per person per day, bots ignored');

  const tg = { source: 'telegram', medium: 'messenger', campaign: 'warhound', content: 'post<1>' };
  await call('POST', '/api/views/warhound', { utm: tg });
  await call('POST', '/api/views/warhound', { utm: tg });
  await call('POST', '/api/views/warhound', { utm: tg }, { 'User-Agent': 'Mozilla/5.0 other browser' });
  await call('POST', '/api/views/warhound', {}, { 'User-Agent': 'Mozilla/5.0 third browser' });
  assert.equal((await call('POST', '/api/reads/warhound', { utm: tg })).json.reads, 1);
  assert.equal((await call('POST', '/api/reads/warhound', { utm: tg })).json.reads, 1, 'read counted twice');
  assert.equal((await call('POST', '/api/reads/warhound', { utm: tg }, { 'User-Agent': 'TelegramBot (like TwitterBot)' })).json.reads, 1, 'bot read counted');
  assert.equal((await call('GET', '/api/admin/stats/warhound', null, { 'X-Admin-Password': 'wrong' })).status, 401);
  const { json: st } = await call('GET', '/api/admin/stats/warhound', null, { 'X-Admin-Password': PASSWORD });
  assert.equal(st.views, 3); assert.equal(st.reads, 1);
  assert.deepEqual(st.utm, [
    { tag: 'telegram / messenger / warhound / post1', views: 2, reads: 1 },
    { tag: '(без метки)', views: 1, reads: 0 },
  ]);
  console.log('✓ UTM tags with views, «дочитал» once per person, stats for the editor');

  assert.deepEqual((await call('POST', `/api/likes/${slug}`, { visitor: 'A' })).json, { likes: 1, liked: true });
  assert.deepEqual((await call('POST', `/api/likes/${slug}`, { visitor: 'A' })).json, { likes: 0, liked: false });
  await call('POST', `/api/likes/${slug}`, { visitor: 'A' }); await call('POST', `/api/likes/${slug}`, { visitor: 'B' });
  console.log('✓ likes: toggle per visitor');

  const general = await call('POST', `/api/comments/${slug}`, { visitor: 'A', name: 'Тест', text: 'Общий комментарий' });
  assert.equal(general.status, 201);
  const { json: { article } } = await api('GET', `/api/admin/article/${slug}`);
  const quote = article.paragraphs[0].text.slice(0, 20);
  const fragment = await call('POST', `/api/comments/${slug}`, { visitor: 'B', text: 'К фрагменту', anchor: { block: 0, start: 0, end: 20, quote } });
  assert.equal(fragment.status, 201); assert.equal(fragment.json.comment.anchor.quote, quote);
  const reply = await call('POST', `/api/comments/${slug}`, { visitor: 'A', text: 'Ответ', parent: fragment.json.comment.id });
  assert.equal(reply.status, 201);
  assert.equal((await call('POST', `/api/comments/${slug}`, { visitor: 'A', text: 'x', parent: reply.json.comment.id })).status, 400, 'reply to reply');
  assert.equal((await call('POST', `/api/comments/${slug}`, { visitor: 'A', text: 'x', anchor: { block: 999, start: 0, end: 2, quote: 'x' } })).status, 400);
  assert.equal((await call('POST', `/api/comments/${slug}`, { visitor: 'A', text: 'spam', website: 'http://spam' })).status, 400, 'honeypot');
  assert.equal((await fetch(`${origin}/api/comments/${slug}`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{"text":"x"}' })).status, 415);
  console.log('✓ comments: article, fragment, reply, validation');

  const { json: forA } = await call('GET', `/api/engagement/${slug}?visitor=A`);
  assert.equal(forA.list.length, 3); assert.equal(forA.comments, 3); assert.equal(forA.likes, 2); assert.equal(forA.liked, true);
  assert.deepEqual(forA.list.map(c => c.mine), [true, false, true]);
  assert.equal((await call('DELETE', `/api/comments/${slug}/${general.json.comment.id}`, { visitor: 'B' })).status, 403);
  assert.equal((await call('DELETE', `/api/comments/${slug}/${general.json.comment.id}`, { visitor: 'A' })).status, 200);
  const byEditor = await call('DELETE', `/api/comments/${slug}/${fragment.json.comment.id}`, { visitor: 'C' }, { 'X-Editor': '1', 'X-Admin-Password': PASSWORD });
  assert.deepEqual(byEditor.json, { comments: 0 }, 'thread with reply removed by editor');
  console.log('✓ comments: owner and editor can delete');

  await call('POST', `/api/comments/${slug}`, { visitor: 'A', text: 'Ещё один' });
  const html = await (await get(`/articles/${slug}`)).text();
  assert.ok(html.includes('data-stat="likes">2<') && html.includes('data-stat="views">1<') && html.includes('data-stat="comments">1<'), 'counters in article');
  assert.ok((await (await get('/')).text()).includes('1 ПРОСМ. · ♥ 2 · 1 КОММ.'), 'counters on home card');
  assert.ok(html.includes('/assets/engage.js?v='), 'engage.js missing');
  console.log('✓ counters rendered on article and home');

  let limited = 0;
  for (let i = 0; i < 6; i++) if ((await call('POST', `/api/comments/${slug}`, { visitor: 'A', text: `flood ${i}` })).status === 429) limited++;
  assert.ok(limited >= 1, 'rate limit');
  await new Promise(r => setTimeout(r, 1700));
  assert.ok(readdirSync(dataDir).includes('engagement.json'), 'engagement not saved to disk');
  console.log('✓ comments: rate limit, data saved to disk');
}

// Editor must fail closed when ADMIN_PASSWORD is not configured.
async function openEditorTest() {
  const openPort = port + 1, openDir = mkdtempSync(path.join(tmpdir(), 'leiman-lab-open-'));
  const open = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: String(openPort), DATA_DIR: openDir, ADMIN_PASSWORD: '' }, stdio: 'ignore' });
  try {
    const url = `http://127.0.0.1:${openPort}`;
    for (let i = 0; i < 50; i++) { try { if ((await fetch(url + '/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
    assert.equal((await fetch(url + '/api/admin/login', { method: 'POST' })).status, 401);
    const save = await fetch(url + '/api/admin/site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edits: { 'home.lead': 'Без пароля' } }) });
    assert.equal(save.status, 401);
    assert.ok(!(await (await fetch(url + '/')).text()).includes('Без пароля'));
    console.log('✓ editor: fails closed without ADMIN_PASSWORD');
  } finally {
    const exited = new Promise(resolve => open.once('exit', resolve));
    open.kill('SIGTERM'); await exited;
    rmSync(openDir, { recursive: true, force: true });
  }
}
try { await main(); } catch (err) { console.error(err); process.exitCode = 1; }
finally {
  // The server flushes engagement data on SIGTERM; wait for it before removing the temp dir.
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGTERM'); await exited;
  rmSync(dataDir, { recursive: true, force: true });
}
