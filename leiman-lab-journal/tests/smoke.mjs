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
const child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ADMIN_PASSWORD: PASSWORD }, stdio: ['ignore', 'pipe', 'pipe'] });
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
    assert.ok(html.includes('"@type":"NewsArticle"'), 'JSON-LD missing');
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
  assert.ok(page.includes('Warhound'));
  assert.ok(page.includes('Чёрный октябрь'));
  assert.ok(!page.includes('главный вопрос не в том'));
  console.log('✓ homepage includes both articles');
  await editorTests();
  console.log('\nALL TESTS PASSED');
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
}

// Without ADMIN_PASSWORD (production setup) the editor works with no password at all.
async function openEditorTest() {
  const openPort = port + 1, openDir = mkdtempSync(path.join(tmpdir(), 'leiman-lab-open-'));
  const open = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: String(openPort), DATA_DIR: openDir, ADMIN_PASSWORD: '' }, stdio: 'ignore' });
  try {
    const url = `http://127.0.0.1:${openPort}`;
    for (let i = 0; i < 50; i++) { try { if ((await fetch(url + '/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
    assert.equal((await fetch(url + '/api/admin/login', { method: 'POST' })).status, 200);
    const save = await fetch(url + '/api/admin/site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edits: { 'home.lead': 'Без пароля' } }) });
    assert.equal(save.status, 200);
    assert.ok((await (await fetch(url + '/')).text()).includes('Без пароля'));
    console.log('✓ editor: open without ADMIN_PASSWORD');
  } finally { open.kill('SIGTERM'); rmSync(openDir, { recursive: true, force: true }); }
}
try { await main(); } catch (err) { console.error(err); process.exitCode = 1; } finally { child.kill('SIGTERM'); rmSync(dataDir, { recursive: true, force: true }); }
