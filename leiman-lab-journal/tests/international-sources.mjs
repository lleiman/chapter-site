import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGrantSearch,normalizeGrant} from '../grant-search.mjs';

export async function testInternationalSources(){
 const registry=JSON.parse(readFileSync('content/income-sources.json','utf8'));
 assert.ok(registry.sources.length>=15,'country sources must be meaningful');
 assert.ok(new Set(registry.sources.map(s=>s.region)).size>=8,'multiple jurisdictions represented');
 for(const item of registry.sources){
  assert.ok(item.name&&item.region&&item.kind&&item.en&&item.ru&&item.policy&&item.search);
  for(const field of ['url','policy','search'])assert.ok(item[field].startsWith('https://'),'official links must be HTTPS');
  assert.ok(['live','directory','key_required','license_required'].includes(item.readiness));
 }
 const op={id:364050,title:'Research Opportunity',number:'ABC-2026-01',agencyName:'Government',
  agencyCode:'XYZ',oppStatus:'posted',openDate:'11/01/2026',closeDate:'12/31/2026'};
 const g=normalizeGrant(op);
 assert.equal(g.source,'Grants.gov');
 assert.equal(g.deadline,'2026-12-31');
 assert.equal(g.sourceUrl,'https://www.grants.gov/search-results-detail/364050');
 assert.ok(g.eligibility.includes('UNVERIFIED'));
 assert.equal(normalizeGrant({...op,oppStatus:'closed'}),null,'closed grants suppressed');
 assert.equal(normalizeGrant({...op,closeDate:'01/01/2020'}),null,'expired grants suppressed');
 let calls=0;
 const engine=createGrantSearch({fetcher:async(url,opts)=>{
  calls++;
  assert.equal(url,'https://api.grants.gov/v1/api/search2');
  assert.equal(opts.method,'POST');
  assert.deepEqual(JSON.parse(opts.body).oppStatuses,'posted');
  return {ok:true,json:async()=>({errorcode:0,data:{hitCount:2,oppHits:[op,{...op,id:364051,oppStatus:'closed'}]}})};
 }});
 const first=await engine.search({q:'research'},'test-client');
 assert.equal(first.status,200);
 assert.equal(first.body.results.length,1);
 assert.equal(first.body.totalFromProvider,2);
 const second=await engine.search({q:'research'},'test-client');
 assert.equal(second.body.sourceStatus,'cached');
 assert.equal(calls,1,'grant requests should be cached');
 const outage=createGrantSearch({fetcher:async()=>{throw Error('network')}});
 const fail=await outage.search({q:'distinct topic'},'test-fail');
 assert.equal(fail.status,503);
 assert.deepEqual(fail.body.results,[],'no fabricated grants on outage');
 console.log('✓ verified international source policy registry, grant search, eligibility caveats and outage handling');
}
