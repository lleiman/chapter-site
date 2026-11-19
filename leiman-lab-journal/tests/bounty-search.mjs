import assert from 'node:assert/strict';
import {createBountySearch,normalizeBountyIssue} from '../bounty-search.mjs';
import {createOpportunityIndex} from '../opportunity-index.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

export async function testBountySearch(){
 const issue={
  id:123456,number:42,title:'Bounty: update project documentation',state:'open',
  html_url:'https://github.com/example/project/issues/42',
  repository_url:'https://api.github.com/repos/example/project',
  labels:[{name:'bounty'},{name:'documentation'}],
  body:'Reward: $250 for merging documentation with examples and screenshots.',
  created_at:'2026-11-12T00:00:00Z',updated_at:'2026-11-19T01:00:00Z',comments:1
 };
 const normalized=normalizeBountyIssue(issue);
 assert.equal(normalized.type,'bounty');
 assert.equal(normalized.source,'GitHub Bounty Candidates');
 assert.equal(normalized.rewardAmount,250);
 assert.equal(normalized.rewardCurrency,'USD');
 assert.equal(normalized.rewardFunded,false);
 assert.equal(normalized.paymentGuarantee,'none');
 assert.equal(normalizeBountyIssue({...issue,state:'closed'}),null);
 assert.equal(normalizeBountyIssue({...issue,pull_request:{url:'https://api.github.com/repos/e/r/pulls/42'}}),null);
 assert.equal(normalizeBountyIssue({...issue,html_url:'https://evil.example/test'}),null);
 const unpriced=normalizeBountyIssue({...issue,body:'Fix the docs please, reward discussed privately'});
 assert.equal(unpriced.rewardAmount,null,'no invented cash figure');
 let requests=0;
 const engine=createBountySearch({fetcher:async(url)=>{
  requests++;assert.ok(url.startsWith('https://api.github.com/search/issues?'),'official read-only API');
  return {ok:true,json:async()=>({items:[issue],total_count:1})};
 }});
 const fresh=await engine.search({q:'docs'},'test-client');
 assert.equal(fresh.status,200);
 assert.equal(fresh.body.results.length,1);
 assert.equal(fresh.body.results[0].rewardFunded,false);
 const cached=await engine.search({q:'docs'},'test-client');
 assert.equal(cached.body.sourceStatus,'cached');
 assert.equal(requests,1);
 const unavailable=await createBountySearch({fetcher:async()=>{throw Error('provider down')}}).search({q:'docs'},'different-client');
 assert.equal(unavailable.status,503);
 assert.deepEqual(unavailable.body.results,[]);
 const temp=mkdtempSync(path.join(tmpdir(),'income-bounty-test-'));
 try{
  const db=createOpportunityIndex(temp);
  const result=db.ingest(fresh.body.results,'GitHub Bounty Candidates');
  assert.equal(result.inserted,1);
  const found=db.search({type:'bounty'});
  assert.equal(found.records.length,1);
  assert.equal(found.records[0].bountyRewardAmount,250);
  assert.equal(found.records[0].bountyPaymentVerified,false);
  assert.equal(found.records[0].eligibility.status,'needs_review');
  assert.equal(createOpportunityIndex(temp).stats().byType.bounty,1,'bounty index persists');
 }finally{rmSync(temp,{recursive:true,force:true})}
 console.log('✓ payout-unverified bounty leads, safe reward extraction, provider failure and persistent indexing');
}
