import assert from 'node:assert/strict';
import {createBountySearch,normalizeBountyIssue,scoreBountyCandidate} from '../bounty-search.mjs';
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
 const tougher={...issue,id:789012,number:45,
  html_url:'https://github.com/example/project/issues/45',
  title:'Bounty: critical cryptography kernel overhaul',
  body:'$1800 bounty. Audit entire framework and rewrite complex kernel cryptography.'};
 const docScore=scoreBountyCandidate(normalized,{now:Date.parse('2026-11-19T12:00:00Z')});
 const hardScore=scoreBountyCandidate(normalizeBountyIssue(tougher),{now:Date.parse('2026-11-19T12:00:00Z')});
 assert.ok(docScore.score>hardScore.score,'manageable scope should outrank high but complex reward');
 assert.equal(docScore.paymentVerified,false);
 assert.equal(docScore.effortVerified,false);
 let topRequests=0;
 const topSearch=createBountySearch({fetcher:async(url)=>{
  topRequests++;
  const page=Number(new URL(url).searchParams.get('page'));
  assert.ok(new URL(url).searchParams.get('q').includes('label:bounty'));
  return {ok:true,json:async()=>({
   total_count:3,items:page===1?[issue,tougher]:page===2?[issue]:[]
  })};
 }});
 const featured=await topSearch.top('unfiltered-picks');
 assert.equal(featured.status,200);
 assert.equal(featured.body.independentOfUserFilters,true);
 assert.equal(featured.body.results.length,2,'deduplicate across recent pages');
 assert.equal(featured.body.results[0].id,normalized.id,'candidate review score, not largest reward alone');
 assert.equal(featured.body.results[0].editorial.paymentVerified,false);
 assert.equal(featured.body.candidatePool,2);
 assert.equal(topRequests,3,'three independent pages, not user-filtered search');
 const emptyTop=await createBountySearch({fetcher:async()=>{throw Error('down')}}).top('offline');
 assert.equal(emptyTop.status,503);
 assert.deepEqual(emptyTop.body.results,[],'never fabricate featured issues');

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
