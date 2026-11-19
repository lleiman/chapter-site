/** Run: npm test. Zero dependencies. */
import { spawn } from 'node:child_process';
import { organismUiTest } from './organism-ui.mjs';
import { testIncomeEngine } from './income-engine.mjs';
import { testInternationalSources } from './international-sources.mjs';
import { testOpportunityV2 } from './opportunity-v2.mjs';
import { testBountySearch } from './bounty-search.mjs';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync } from 'node:fs';
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
  await incomeBilingualTests();
  await organismTests();
  organismUiTest();
  await testIncomeEngine();
  await testInternationalSources();
  testOpportunityV2();
  await testBountySearch();
  await bountyRoutesTest();
  await opportunityV2RoutesTest();
  await internationalRoutesTests();
  await incomeDeskRoutesTest();
  await incomeOpsRoutesTest();
  await allArticleTranslationsTest();
  await passwordlessAnalyticsTests();
  await commonsTests();
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


async function allArticleTranslationsTest() {
  const files=readdirSync('content').filter(f => /^\\d{3}-.*\\.json$/.test(f)).sort();
  assert.ok(files.length>=9,'journal should contain all baseline research articles');
  const slugs=[];
  for (const filename of files) {
    const article=JSON.parse(readFileSync(path.join('content',filename),'utf8'));
    if (article.draft) continue;
    const en=article.translations?.en;
    assert.ok(en,'Published article is missing English edition: '+article.slug);
    for(const field of ['title','summary','description','section','sourceNote']) {
      assert.ok(typeof en[field]==='string'&&en[field].length>15,article.slug+' missing English '+field);
    }
    assert.ok(Array.isArray(en.paragraphs) && en.paragraphs.length===article.paragraphs.length,article.slug+' incomplete paragraph translation');
    const text=en.paragraphs.map(b=>[b.text,...(b.items||[])].filter(Boolean).join(' ')).join(' ');
    assert.ok(text.length>500 && !/[А-Яа-яЁё]/.test(text),'English prose is incomplete or contains Russian-only sections: '+article.slug);
    slugs.push(article.slug);
  }
  const homepage=await html('/en/');
  const sitemap=await html('/sitemap.xml');
  for (const slug of slugs) {
    const route='/en/articles/'+slug;
    const res=await get(route);
    assert.equal(res.status,200,'EN article route: '+slug);
    const page=await res.text();
    assert.ok(page.includes('<html lang="en">'),slug+' language attribute');
    assert.ok(page.includes('<link rel="canonical" href="'+origin+route+'">'),slug+' canonical');
    assert.ok(page.includes('hreflang="ru" href="'+origin+'/articles/'+slug+'"'),slug+' reciprocal hreflang');
    assert.ok(homepage.includes(route),'English homepage must list '+slug);
    assert.ok(sitemap.includes(route),'XML sitemap must list '+slug);
  }
  console.log('✓ all '+slugs.length+' Russian journal articles have indexable, content-complete English editions');
}


async function incomeOpsRoutesTest(){
 const page=await get('/income-ops');
 assert.equal(page.status,200);
 assert.equal(page.headers.get('x-robots-tag'),'noindex, nofollow');
 const html=await page.text();
 assert.ok(html.includes('id="ops-login"')&&html.includes('id="ops-briefs"'),'operator console must exist');
 for(const route of ['/assets/income-ops.js','/assets/income-ops.css'])assert.equal((await get(route)).status,200);
 const created=await fetch(origin+'/api/income/briefs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
  name:'Pilot Company',email:'team@example.test',title:'Operator testing project',
  description:'An example pilot that includes research, production, final delivery and approval milestones.',
  budget:5000,currency:'EUR',consent:true
 })});
 assert.equal(created.status,201);
 const {id,deletionToken}=await created.json();
 const unauthorized=await fetch(origin+'/api/admin/income/briefs/'+id,{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({status:'qualified'})});
 assert.equal(unauthorized.status,401,'operator write must require password');
 const invalid=await fetch(origin+'/api/admin/income/briefs/'+id,{method:'POST',
 headers:{'Content-Type':'application/json','x-admin-password':PASSWORD},
 body:JSON.stringify({status:'unreviewed',amountReceived:1000})});
 assert.equal(invalid.status,400,'payment totals require paid status');
 const qualified=await fetch(origin+'/api/admin/income/briefs/'+id,{method:'POST',
 headers:{'Content-Type':'application/json','x-admin-password':PASSWORD},
 body:JSON.stringify({status:'qualified',note:'Waiting for contract verification.'})});
 assert.equal(qualified.status,200);
 const paid=await fetch(origin+'/api/admin/income/briefs/'+id,{method:'POST',
 headers:{'Content-Type':'application/json','x-admin-password':PASSWORD},
 body:JSON.stringify({status:'paid',amountReceived:5000,directCosts:3700,note:'Reported payment; evidence not independently audited'})});
 assert.equal(paid.status,200);
 const queue=await fetch(origin+'/api/admin/income/briefs',{headers:{'x-admin-password':PASSWORD}});
 const saved=(await queue.json()).briefs.find(row=>row.id===id);
 assert.equal(saved.status,'paid');assert.equal(saved.amountReceived,5000);assert.equal(saved.directCosts,3700);
 assert.equal(saved.outcomeEvidence,'operator_reported_not_independently_audited');
 const removed=await fetch(origin+'/api/income/briefs/'+id,{method:'DELETE',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({deletionToken})});
 assert.equal(removed.status,200,'deletion token remains valid after operator updates');
 console.log('✓ private income operations console and consented brief outcome accounting');
}

async function bountyRoutesTest(){
 for(const locale of ['/en/income-desk','/income-desk']){
  const page=await (await get(locale)).text();
  assert.ok(page.includes('id="id-bounty-form"'),locale+' paid task search');
  assert.ok(page.includes('id="id-top-bounty-results"'),locale+' featured list before filters');
  assert.ok(page.indexOf('id="id-top-bounty-results"')<page.indexOf('id="id-bounty-form"'),
   locale+' featured items must precede user search and controls');
  assert.ok(page.includes('id="id-bounty-directories"'),locale+' verified directory links');
  assert.ok(page.includes('option value="bounty"'),locale+' unified index type filter');
  assert.ok(page.includes('/assets/income-bounties.js'),locale+' interactive bounty client');
 }
 assert.equal((await get('/assets/income-bounties.js')).status,200);
 const providers=await (await get('/api/income/sources')).json();
 assert.ok(providers.sources.some(s=>s.id==='githubbounties'&&s.readiness==='live'));
 assert.ok(providers.sources.some(s=>s.id==='devpost'&&s.readiness==='directory'));
 assert.ok(providers.sources.some(s=>s.id==='opire'));
 assert.ok(providers.sources.some(s=>s.id==='hackerone'));
 const index=await (await get('/api/income/index?type=bounty')).json();
 assert.ok(Array.isArray(index.records));
 const unavailable=await get('/api/income/bounties?q=docs');
 assert.ok([200,503,429].includes(unavailable.status),'external GitHub API errors must be reported, not hidden');
 const reply=await unavailable.json();
 assert.ok(Array.isArray(reply.results));
 if(unavailable.status===200)
  assert.ok(reply.results.every(x=>x.rewardFunded===false&&x.paymentGuarantee==='none'),'no verified payout claims');
 console.log('✓ dedicated bilingual bounty radar, source rules, unverified payouts and live candidate endpoint');
}

async function opportunityV2RoutesTest(){
 const indexResponse=await get('/api/income/index');
 assert.equal(indexResponse.status,200);
 let body=await indexResponse.json();
 assert.ok(Array.isArray(body.records),'index must return typed records');
 assert.ok(body.stats&&typeof body.stats.total==='number');
 assert.ok(body.disclaimer.includes('No applicant'),'must warn about unknown eligibility');
 const assess=await fetch(origin+'/api/income/assess',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({id:'invalid',profile:{residenceCountry:'US'}})});
 assert.equal(assess.status,404,'unknown indexed IDs must fail closed');
 const badAssessment=await fetch(origin+'/api/income/assess',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({id:'invalid',profile:[]})});
 assert.equal(badAssessment.status,400,'array is not a supported applicant profile');
 for(const locale of ['','/en']){
  const html=(await (await get(locale+'/income-desk')).text());
  assert.ok(html.includes('id="id-v2-form"'), 'cross-source search');
  assert.ok(html.includes('id="id-v2-assess"'),'eligibility check');
  assert.ok(html.includes('/assets/income-v2.js'),'interactive v0.2');
 }
 assert.equal((await get('/assets/income-v2.js')).status,200,'v0.2 client code');
 assert.equal((await get('/api/admin/income/memory')).status,401,'financial memory must not be public');
 const post=async(payload,pass=PASSWORD)=>fetch(origin+'/api/admin/income/memory',{
  method:'POST',headers:{'Content-Type':'application/json','x-admin-password':pass},
  body:JSON.stringify(payload)});
 const data={category:'software',outcome:'paid',currency:'USD',amountReceived:5000,
  directCosts:3000,hours:50,period:'2026-11',nonPersonalConfirmation:true};
 assert.equal((await post(data,'wrong')).status,401,'memory write requires admin authentication');
 assert.equal((await post({...data,nonPersonalConfirmation:false})).status,400,'privacy confirmation mandatory');
 const added=await post(data);
 assert.equal(added.status,201,'structured financial observation can be recorded');
 const {id}=await added.json();
 const read=await fetch(origin+'/api/admin/income/memory',{headers:{'x-admin-password':PASSWORD}});
 assert.equal(read.status,200);
 const record=await read.json();
 assert.ok(record.observations.some(x=>x.id===id),'record in authenticated memory');
 assert.equal(record.summary.byCurrency.USD.netBeforeOverhead,2000,'direct cost arithmetic');
 const removed=await fetch(origin+'/api/admin/income/memory/'+id,{
  method:'DELETE',headers:{'x-admin-password':PASSWORD}});
 assert.equal(removed.status,200);
 assert.equal((await (await fetch(origin+'/api/admin/income/memory',{headers:{'x-admin-password':PASSWORD}})).json()).observations.length,0);
 console.log('✓ v0.2 index, private on-demand eligibility, persistent operations memory, authenticated deletion and EN/RU UI');
}

async function internationalRoutesTests() {
 const source=await get('/api/income/sources');
 assert.equal(source.status,200);
 const catalogue=await source.json();
 assert.ok(catalogue.sources.length>=15,'global policy registry present');
 assert.ok(catalogue.sources.some(s=>s.region==='id'),'Indonesia present');
 assert.ok(catalogue.sources.some(s=>s.region==='sg'),'Singapore present');
 assert.ok(catalogue.sources.some(s=>s.region==='eu'),'EU present');
 assert.ok(catalogue.sources.some(s=>s.region==='us'&&s.readiness==='live'),'US grant source present');
 for(const pageUrl of ['/income-desk','/en/income-desk']){
  const page=await html(pageUrl);
  assert.ok(page.includes('id="id-source-region"'),pageUrl+' country filters');
  assert.ok(page.includes('id="id-grant-search"'),pageUrl+' grants search');
  assert.ok(page.includes('id="id-uk-search"'),pageUrl+' UK tender search');
  assert.ok(page.includes('/assets/income-global.js'),pageUrl+' country UI');
 }
 const asset=await get('/assets/income-global.js');
 assert.equal(asset.status,200);
 const map=await html('/sitemap.xml');
 assert.ok(map.includes('/en/income-desk'));
 console.log('✓ international source registry and multilingual grant-search routes');
}

async function incomeDeskRoutesTest() {
 for(const [route,lang,alternate] of [
   ['/income-desk','ru','/en/income-desk'],
   ['/en/income-desk','en','/income-desk']
 ]) {
  const res=await get(route);assert.equal(res.status,200,route);
  const page=await res.text();
  assert.ok(page.includes('<html lang="'+lang+'">'),route+' html lang');
  assert.ok(page.includes('<link rel="canonical" href="'+origin+route+'">'),route+' canonical');
  assert.ok(page.includes('hreflang="'+(lang==='en'?'ru':'en')+'" href="'+origin+alternate+'"'),route+' hreflang');
  assert.ok(page.includes('id="id-job-search"'),route+' real job search form');
  assert.ok(page.includes('id="id-plan-form"'),route+' curator planning form');
  assert.ok(page.includes('id="id-brief-form"'),route+' private client intake');
  assert.ok(page.includes('/assets/income-desk.js'),route+' UI logic');
 }
 for(const url of ['/assets/income-desk.js','/assets/income-desk.css'])assert.equal((await get(url)).status,200,url);
 const r=await fetch(origin+'/api/income/plan',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({title:'Research pilot',brief:'Provide structured research and user interviews on a new digital product.',budget:10000,currency:'USD'})});
 assert.equal(r.status,200,'public planning endpoint should work without accounts');
 const plan=await r.json();assert.equal(plan.scenarioOnly,true);
 assert.equal(plan.qualityAssurance.amount,1000);
 assert.equal(plan.grossMargin,'unknown');
 const invalid=await fetch(origin+'/api/income/briefs',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({name:'Editor',email:'editor@example.test',title:'Testing new work',description:'An example private brief for secure submission and review.',budget:5000,consent:false})});
 assert.equal(invalid.status,400,'business brief requires consent');
 const created=await fetch(origin+'/api/income/briefs',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({name:'Editor',email:'editor@example.test',title:'Testing new work',description:'An example private brief for secure submission and review with financial estimates.',budget:5000,consent:true})});
 assert.equal(created.status,201,'brief consent submission');
 const saved=await created.json();
 const publicAccess=await get('/api/admin/income/briefs');
 assert.equal(publicAccess.status,401,'briefs not accessible publicly');
 const admin=await fetch(origin+'/api/admin/income/briefs',{headers:{'x-admin-password':PASSWORD}});
 assert.equal(admin.status,200);
 assert.ok((await admin.json()).briefs.some(x=>x.id===saved.id),'admin review queue should hold brief');
 const removed=await fetch(origin+'/api/income/briefs/'+saved.id,{method:'DELETE',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({deletionToken:saved.deletionToken})});
 assert.equal(removed.status,200,'self-service deletion');
 const map=await html('/sitemap.xml');
 assert.ok(map.includes(origin+'/income-desk')&&map.includes(origin+'/en/income-desk'),'SEO sitemap includes both locales');
 const intake=await html('/en/opportunities');
 assert.ok(intake.includes('/en/income-desk'),'directory should link to operational workspace');
 console.log('✓ bilingual income desk, curator API, consent-based buyer intake, admin auth, self-delete and SEO');
}

async function organismTests() {
  for (const [url,lang,alternate,marker] of [
    ['/organism','ru','/en/organism','data-lang="ru"'],
    ['/en/organism','en','/organism','data-lang="en"']
  ]) {
    const response=await get(url);
    assert.equal(response.status,200,url+' should be published');
    const html=await response.text();
    assert.ok(html.includes('<html lang="'+lang+'">'),url+' must have localized html language');
    assert.ok(html.includes('<link rel="canonical" href="'+origin+url+'">'),url+' must self-canonicalize');
    assert.ok(html.includes('hreflang="'+(lang==='en'?'ru':'en')+'" href="'+origin+alternate+'"'),url+' must have counterpart hreflang');
    assert.ok(html.includes('id="organism-map"'),url+' must have an accessible SVG');
    assert.ok(html.includes('id="org-scenario"'),url+' must have a scenario selector');
    assert.ok(html.includes('id="org-play"')&&html.includes('id="org-next"')&&html.includes('id="org-reset"'),url+' must have live controls');
    assert.ok(html.includes(marker),url+' language-specific content missing');
    assert.ok(html.includes('/assets/organism.js'),url+' must load simulator code');
    assert.ok(html.includes('/assets/organism.css'),url+' must load responsive stylesheet');
    assert.ok(/fictional|вымышлены/i.test(html),url+' should disclose simulation status');
  }
  for (const [url,expected] of [
    ['/assets/organism.js','text/javascript'],
    ['/assets/organism.css','text/css']
  ]) {
    const response=await get(url);
    assert.equal(response.status,200,url+' must load');
    assert.ok(String(response.headers.get('content-type')).includes(expected),url+' correct content type');
    const body=await response.text();
    assert.ok(body.length>2000,url+' should not be blank');
  }
  const sitemap=await html('/sitemap.xml');
  assert.ok(sitemap.includes(origin+'/organism')&&sitemap.includes(origin+'/en/organism'),'both organism languages belong in sitemap');
  for (const url of ['/opportunities','/en/opportunities']) {
    const html=await (await get(url)).text();
    assert.ok(html.includes(url.startsWith('/en')?'/en/organism':'/organism'),url+' should link to interactive map');
  }
  console.log('✓ bilingual organism map, responsive assets, discoverability and SEO');
}

async function incomeBilingualTests() {
  for(const route of ['/en/','/articles/ai-income-opportunities','/en/articles/ai-income-opportunities','/opportunities','/en/opportunities','/privacy','/en/privacy']) {
    const r=await get(route);
    assert.equal(r.status,200,route+' must be available');
  }
  const ru=await html('/articles/ai-income-opportunities');
  const en=await html('/en/articles/ai-income-opportunities');
  assert.ok(ru.includes('<html lang="ru">'));
  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes('The New Economics of Finding Work'));
  assert.ok(en.includes('<link rel="canonical" href="'+origin+'/en/articles/ai-income-opportunities">'));
  assert.ok(ru.includes('hreflang="en" href="'+origin+'/en/articles/ai-income-opportunities"'));
  assert.ok(en.includes('hreflang="ru" href="'+origin+'/articles/ai-income-opportunities"'));
  assert.ok(en.includes('"inLanguage":"en-US"'));
  assert.ok(!en.includes('Конкурсы ИИ-кино'));
  const index=await html('/en/');
  assert.ok(index.includes('The New Economics of Finding Work'));
  assert.ok(!index.includes('Чёрный октябрь'), 'untranslated articles must not appear in English index');
  const sitemap=await html('/sitemap.xml');
  assert.ok(sitemap.includes('xmlns:xhtml='));
  assert.ok(sitemap.includes('/en/articles/ai-income-opportunities'));
  assert.ok(sitemap.includes('hreflang="en"'));
  assert.ok(!sitemap.includes('/en/articles/warhound'), 'no fake untranslated alternates');
  const png=await get('/og/ai-income-opportunities.png');
  assert.equal(png.status,200);
  assert.equal(png.headers.get('content-type'),'image/png');
  assert.deepEqual([...new Uint8Array(await png.arrayBuffer()).slice(0,8)],[137,80,78,71,13,10,26,10]);
  const cv={name:'Test Editor',email:'editor@example.test',cv:'Research and creative technology specialist with experience in writing, project analysis and production. This is test-only data.',profession:'research',workMode:'remote',location:'Testland',goals:'Improve eligibility analysis',locale:'en',consent:true,contactOptIn:false};
  const incomplete=await fetch(origin+'/api/opportunities/cv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...cv,consent:false})});
  assert.equal(incomplete.status,400,'explicit consent required');
  const created=await fetch(origin+'/api/opportunities/cv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cv)});
  assert.equal(created.status,201,'CV submissions should be accepted with consent');
  const {id,deletionToken}=await created.json();
  assert.match(id,/^[a-f0-9]{32}$/);
  assert.match(deletionToken,/^[a-f0-9]{48}$/);
  const publicCheck=await get('/api/admin/opportunities/submissions');
  assert.equal(publicCheck.status,401,'CV admin must require editor credentials');
  const privateCheck=await fetch(origin+'/api/admin/opportunities/submissions',{headers:{'x-admin-password':PASSWORD}});
  assert.equal(privateCheck.status,200);
  const listing=await privateCheck.json();
  assert.ok(listing.submissions.some(x=>x.id===id&&x.email===cv.email));
  const wrongDelete=await fetch(origin+'/api/opportunities/cv/'+id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({deletionToken:'a'.repeat(48)})});
  assert.equal(wrongDelete.status,403);
  const deleted=await fetch(origin+'/api/opportunities/cv/'+id,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({deletionToken})});
  assert.equal(deleted.status,200);
  console.log('✓ bilingual income research, source atlas, SEO, encrypted CV intake and deletion');
}

async function commonsTests() {
  for (const route of ['/commons','/assets/commons.css','/assets/commons.html','/assets/commons.js','/assets/commons-charter.md']) {
    assert.equal((await get(route)).status,200,route+' must be available');
  }
  const htmlCommons=await html('/commons');
  assert.ok(htmlCommons.includes('id="cm-title"') && htmlCommons.includes('90-дневная') && htmlCommons.includes('конституции'), 'Commons public page sections');
  assert.ok((await html('/')).includes('href="/commons"'), 'Commons in journal navigation');
  assert.ok((await html('/sitemap.xml')).includes('/commons'), 'Commons in sitemap');
  const initial=await (await get('/api/commons')).json();
  assert.equal(initial.legalStatus,'not-incorporated');
  assert.equal(initial.daoStatus,'not-activated');
  assert.equal(initial.members.length,0);
  assert.equal(initial.decisions.length,0);
  assert.equal((await get('/api/admin/commons')).status,401,'private steward API');
  const anon=await fetch(origin+'/api/commons/proposals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({program:'prediction-replication',title:'Hidden',summary:'Unregistered'})});
  assert.equal(anon.status,401,'anonymous proposal rejected');
  assert.equal((await fetch(origin+'/api/commons/proposals',{method:'POST',body:'{}'})).status,415,'only JSON writes');
  const otherOrigin=await fetch(origin+'/api/commons/proposals',{method:'POST',headers:{'Origin':'https://malicious.example','Content-Type':'application/json'},body:'{}'});
  assert.equal(otherOrigin.status,403,'cross origin requests rejected');
  const invite=await fetch(origin+'/api/admin/commons/members',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Password':PASSWORD},body:JSON.stringify({name:'Тестовый участник',role:'researcher',displayPublic:false})});
  assert.equal(invite.status,201,'steward creates a member');
  const issued=await invite.json();
  assert.match(issued.token,/^[a-f0-9]{64}$/);
  const auth={'Authorization':'Bearer '+issued.token,'Content-Type':'application/json'};
  const me=await fetch(origin+'/api/commons/me',{headers:auth});
  assert.equal(me.status,200);
  assert.equal((await me.json()).member.role,'researcher');
  const p=await fetch(origin+'/api/commons/proposals',{method:'POST',headers:auth,body:JSON.stringify({program:'prediction-replication',title:'Независимая репликация',summary:'Слепой анализ с заранее зафиксированным протоколом'})});
  assert.equal(p.status,201,'members propose');
  const proposalId=(await p.json()).id;
  const before=await (await get('/api/commons')).json();
  assert.equal(before.proposals.length,0,'pending proposal not published');
  assert.ok(!JSON.stringify(before).includes(issued.token),'no member tokens in public API');
  const open=await fetch(origin+'/api/admin/commons/proposals',{method:'POST',headers:{...auth,'X-Admin-Password':PASSWORD},body:JSON.stringify({proposalId,status:'open'})});
  assert.equal(open.status,200,'steward publishes after moderation');
  const vote=await fetch(origin+'/api/commons/votes',{method:'POST',headers:auth,body:JSON.stringify({proposalId,choice:'yes'})});
  assert.equal(vote.status,200);
  const voteAgain=await fetch(origin+'/api/commons/votes',{method:'POST',headers:auth,body:JSON.stringify({proposalId,choice:'no'})});
  assert.equal(voteAgain.status,200,'one member may change a vote');
  const comment=await fetch(origin+'/api/commons/comments',{method:'POST',headers:auth,body:JSON.stringify({proposalId,text:'Проверить выборку и чувствительность оценки'})});
  assert.equal(comment.status,201);
  const cmId=(await comment.json()).id;
  assert.equal((await (await get('/api/commons')).json()).proposals[0].comments.length,0,'comment requires moderation');
  const approve=await fetch(origin+'/api/admin/commons/comments',{method:'POST',headers:{...auth,'X-Admin-Password':PASSWORD},body:JSON.stringify({commentId:cmId,status:'approved'})});
  assert.equal(approve.status,200);
  const closing=await fetch(origin+'/api/admin/commons/proposals',{method:'POST',headers:{...auth,'X-Admin-Password':PASSWORD},body:JSON.stringify({proposalId,status:'closed',rationale:'Пилот завершён для проверки механизма'})});
  assert.equal(closing.status,200);
  const record=await (await get('/api/commons')).json();
  assert.equal(record.proposals[0].votes.no,1);
  assert.equal(record.proposals[0].votes.yes,0);
  assert.equal(record.proposals[0].comments.length,1);
  assert.equal(record.decisions.length,1);
  assert.equal(record.decisions[0].quorumMet,false);
  assert.equal(record.legalStatus,'not-incorporated');
  assert.equal(record.daoStatus,'not-activated');

  assert.equal(record.pilotMetrics.activeMembers,1);
  assert.equal(record.pilotMetrics.independentReplications,0);
  const evidence=await fetch(origin+'/api/admin/commons/evidence',{method:'POST',headers:{'X-Admin-Password':PASSWORD,'Content-Type':'application/json'},body:JSON.stringify({programId:'prediction-replication',kind:'replication',title:'Тестовая репликация',url:'https://example.org/protocol'})});
  assert.equal(evidence.status,201,'steward records a linked research output');
  const evidencePublic=await (await get('/api/commons')).json();
  assert.equal(evidencePublic.pilotMetrics.documentedOutputs,1);
  assert.equal(evidencePublic.pilotMetrics.independentReplications,1);
  assert.equal(evidencePublic.evidence[0].url,'https://example.org/protocol');

  assert.ok(!JSON.stringify(record).includes(issued.token));
  const after=await fetch(origin+'/api/commons/votes',{method:'POST',headers:auth,body:JSON.stringify({proposalId,choice:'yes'})});
  assert.equal(after.status,409,'closed ballots are immutable');
  console.log('✓ Commons: page, persistence, member auth, moderation, votes and public decisions');
}

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
  assert.ok(homepage.includes('property="og:image" content="'+origin+'/'), 'home OG should have a canonical local image');
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
  const pred = await get('/predictions');
  assert.equal(pred.status, 200, '/predictions should return 200');
  const predHtml = await pred.text();
  assert.ok(predHtml.includes('data-page="predictions"') && predHtml.includes('/assets/predictions.css') && predHtml.includes('pr-stats'), 'predictions page renders');
  assert.equal((await get('/assets/predictions.css')).status, 200);
  console.log('✓ /predictions');
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
