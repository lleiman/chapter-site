import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createOpportunityIndex,evaluateEligibility,normalizeOpportunity} from '../opportunity-index.mjs';
import {createEconomicMemory} from '../economic-memory.mjs';

export function testOpportunityV2(){
 const temp=mkdtempSync(path.join(tmpdir(),'income-v2-'));
 try {
  const job={source:'Himalayas',id:'test-job-27',sourceUrl:'https://himalayas.app/companies/example/jobs/designer',
   type:'employment',title:'Senior UI Designer',company:'Example Studio',excerpt:'Remote brand and design system work',
   publishedAt:'2026-11-15T00:00:00.000Z',locationRestrictions:['US'],worldwide:false,locationUnclear:false,
   salary:{min:90000,max:120000,currency:'USD'}};
  const grant={source:'Grants.gov',id:'us-grant-101',sourceUrl:'https://www.grants.gov/search-results-detail/101',
   type:'grant',title:'Science Innovation Grant',issuer:'Science Funding',status:'posted',country:'US',
   deadline:'2027-10-01',fundingCeiling:75000,fundingFloor:5000,cashEvidence:'official_grant_synopsis'};
  const tender={source:'UK Find a Tender',id:'uk-tender-123456-2026',sourceUrl:'https://www.find-tender.service.gov.uk/Notice/123456-2026',
   type:'tender',title:'Museum Film Production',issuer:'Museum Board',status:'active',country:'GB',
   value:100000,currency:'GBP',deadline:'2027-04-20'};
  const index=createOpportunityIndex(temp);
  assert.equal(index.stats().total,0);
  assert.equal(index.ingest([job,grant,tender],'Himalayas').inserted,1,'provider identity isolation');
  assert.equal(index.ingest([grant],'Grants.gov').inserted,1);
  assert.equal(index.ingest([tender],'UK Find a Tender').inserted,1);
  assert.equal(index.stats().total,3);
  const rawUnpricedGrant={...grant,id:'us-grant-no-money',sourceUrl:'https://www.grants.gov/search-results-detail/993',
   fundingCeiling:null,fundingFloor:null,cashEvidence:null};
  assert.equal(index.ingest([rawUnpricedGrant],'Grants.gov').inserted,1);
  assert.equal(index.search({type:'grant'}).count,1,'unpriced grant not published in the opportunity index');
  assert.equal(index.stats().storedRecords,4);
  assert.equal(index.stats().total,3,'unpriced grants omitted from visible opportunity totals');
  assert.equal(index.ingest([job],'Himalayas').updated,1,'updates do not duplicate');
  assert.equal(index.stats().total,3);
  const reopened=createOpportunityIndex(temp);
  assert.equal(reopened.stats().total,3,'index survives a restart');
  const all=reopened.search({limit:100});
  assert.equal(all.count,3);
  const jobs=reopened.search({type:'employment',q:'designer'}).records;
  assert.equal(jobs.length,1);
  assert.equal(jobs[0].eligibility.status,'needs_review','no unearned eligible claim');
  assert.equal(evaluateEligibility(jobs[0],{residenceCountry:'DE'}).status,'ineligible','explicit location exclusion');
  assert.equal(evaluateEligibility(jobs[0],{residenceCountry:'US'}).status,'needs_review','location match is not legal eligibility');
  assert.equal(reopened.search({country:'GB'}).count,1);
  assert.equal(reopened.search({country:'DE',type:'employment'}).count,0,
   'explicitly US-restricted remote employment must not appear for German country filters');
  assert.equal(reopened.search({country:'US',type:'employment'}).count,1,
   'US-restricted employment can appear for US search');
  assert.ok(reopened.search({type:'employment'}).records[0].sourceFreshnessHours>=0,
   'indexed record freshness must be available for source audits');
  const analysis=reopened.assess(jobs[0].id,{residenceCountry:'DE',skills:'design,python'});
  assert.equal(analysis.eligibility.status,'ineligible');
  assert.equal(analysis.capabilityFit.matched.includes('design'),true);
  assert.equal(reopened.assess('fake',{}),null);
  assert.equal(normalizeOpportunity({...grant,sourceUrl:'https://evil.example/redirect'}),null,'provider attribution domain must be trusted');
  const store=createEconomicMemory(temp);
  assert.equal(store.create({category:'creative',outcome:'paid',period:'2026-11',currency:'USD',
   amountReceived:1500,directCosts:800,hours:25}).status,400,'explicit non-personal confirmation mandatory');
  const data={category:'creative',outcome:'paid',period:'2026-11',currency:'USD',
   amountReceived:1500,directCosts:800,hours:25,nonPersonalConfirmation:true};
  const good=store.create(data);
  assert.equal(good.status,201);
  assert.equal(store.create({...data,outcome:'disputed'}).status,400,'unpaid outcomes cannot record receipts');
  const euro=store.create({...data,currency:'EUR',amountReceived:1200,directCosts:700});
  assert.equal(euro.status,201);
  const recovered=createEconomicMemory(temp);
  assert.equal(recovered.list().length,2,'economic memory survives restart');
  assert.equal(recovered.summary().byCurrency.USD.netBeforeOverhead,700);
  assert.equal(recovered.summary().byCurrency.EUR.netBeforeOverhead,500,'do not add currencies');
  assert.ok(!JSON.stringify(recovered.list()).includes('Example Studio'),'no customer information derived from opportunity index');
  assert.equal(recovered.remove(good.body.id),true);
  assert.equal(recovered.summary().total,1);
  assert.equal(recovered.remove('00000000-0000-0000-0000-000000000000'),false);
  console.log('✓ v0.2 persistent cross-source index, explicit eligibility, provenance, non-personal economic memory and separated FX');
 }finally{rmSync(temp,{recursive:true,force:true})}
}
