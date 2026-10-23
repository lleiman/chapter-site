/** Run: npm test. Zero dependencies. */
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 37839;
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
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
  console.log('\nALL TESTS PASSED');
}
try { await main(); } catch (err) { console.error(err); process.exitCode = 1; } finally { child.kill('SIGTERM'); }
