import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {publishedCashAwards,renderCashAwards} from '../cash-awards.mjs';
import {grantWithPublishedMoney,createFundedGrantRadar} from '../funded-grants.mjs';
import {createOpportunityIndex} from '../opportunity-index.mjs';

export async function testCashPrizeDiscovery(){
 const original=JSON.parse(readFileSync('content/cash-awards.json','utf8'));
 const now=new Date('2026-11-19T10:00:00Z');
 const awards=publishedCashAwards(original,{now});
 assert.equal(awards.length,5,'five fully cash-specified prizes from official sites');
 assert.ok(awards.every(x=>x.cashAward>0&&x.cashEvidence.startsWith('official_')));
 assert.ok(awards.every(x=>!x.paymentGuaranteed&&x.nonCashExcluded));
 assert.ok(awards.some(x=>x.id==='heygen-video-contest-2026'&&x.cashAward===3500));
 assert.ok(awards.some(x=>x.id==='higgsfield-talent-2026'&&x.cashAward===200000));
 assert.ok(!awards.some(x=>/akool|crypto|web3|github/i.test(x.title+x.issuer)));
 assert.equal(publishedCashAwards(original,{now:new Date('2027-06-01T00:00:00Z')}).length,0,'expired awards vanish');
 assert.equal(publishedCashAwards({records:[{...original.records[0],cashAward:null}]},{now}).length,0,'no unpriced entries');
 assert.equal(publishedCashAwards({records:[{...original.records[0],title:'Crypto token giveaway'}]},{now}).length,0);
 assert.equal(publishedCashAwards({records:[{...original.records[0],cashEvidence:'unverified_text'}]},{now}).length,0);
 assert.equal(publishedCashAwards({records:[{...original.records[0],cashAward:1000,cashCurrency:'CREDITS'}]},{now}).length,0);
 const html=renderCashAwards(awards,'en'),ru=renderCashAwards(awards,'ru');
 assert.ok(html.includes('1ST CASH PRIZE')&&html.includes('OFFICIAL RULES'));
 assert.ok(ru.includes('ДЕНЕЖНЫЙ ПРИЗ')&&ru.includes('ПРАВИЛА ОРГАНИЗАТОРА'));
 assert.equal((html.match(/<details class="id-award-row">/g)||[]).length,5,'one compact native disclosure row per cash award');
 assert.equal((html.match(/<summary class="id-award-summary">/g)||[]).length,5,'title, cash prize and deadline are visible before expansion');
 assert.ok(!html.includes('<details class="id-award-row" open'),'initial cards are all collapsed');
 assert.ok(html.includes('id-award-money')&&html.includes('id-award-date'),'critical comparison data visible at a glance');
 assert.ok(html.includes('id-award-expanded'),'requirements and official links remain accessible');
 assert.ok(html.includes('HeyGen')&&!html.includes('AKOOL'));
 const opportunity={id:'us-grant-801',title:'Arts Innovation Programme',issuer:'Federal Arts Agency',
   source:'Grants.gov',sourceUrl:'https://www.grants.gov/search-results-detail/801',
   deadline:'2027-04-21',status:'posted',postedAt:'2026-11-10'};
 const filled={errorcode:0,data:{id:801,synopsis:{
   awardCeiling:'75,000',awardFloor:'10,000',applicantTypes:[{description:'Nonprofit organisations'}],
   synopsisDesc:'Project funding for arts organisations'
 }}};
 const parsed=grantWithPublishedMoney(opportunity,filled);
 assert.equal(parsed.cashAmount,75000);
 assert.equal(parsed.fundingFloor,10000);
 assert.equal(parsed.amountBasis,'published_award_ceiling');
 assert.equal(parsed.paymentGuaranteed,false);
 assert.equal(grantWithPublishedMoney(opportunity,{data:{id:801,synopsis:{awardCeiling:'0',awardFloor:''}}}),null);
 assert.equal(grantWithPublishedMoney(opportunity,{data:{id:801,synopsis:{awardCeiling:'100',synopsisDesc:'Crypto blockchain financing'}}}),null);
 assert.equal(grantWithPublishedMoney({...opportunity,title:'Arts and Artifacts International Indemnity Program'},filled),null,
  'an insurance indemnity face value is not cash funding');
 assert.equal(grantWithPublishedMoney(opportunity,{data:{id:801,synopsis:{awardCeiling:'250000',synopsisDesc:'Loan guarantee for the arts'}}}),null,
  'loan guarantees do not represent available cash grants');
 let calls=0,searches=0;
 const radar=createFundedGrantRadar({
  grantSearch:{search:async()=>{searches++;return {status:200,body:{
    sourceStatus:'fresh',results:[opportunity,{...opportunity,id:'us-grant-802',title:'No amounts announced',sourceUrl:'https://www.grants.gov/search-results-detail/802'}]
  }};}},
  fetcher:async(url,opts)=>{
   calls++;assert.equal(url,'https://api.grants.gov/v1/api/fetchOpportunity');
   const id=JSON.parse(opts.body).opportunityId;
   return {ok:true,json:async()=>id===801?filled:{errorcode:0,data:{id:802,synopsis:{awardCeiling:null,awardFloor:null}}}};
  }
 });
 const first=await radar.search({q:'arts'},'test');
 assert.equal(first.status,200);
 assert.equal(first.body.results.length,1,'only monetary grants survive');
 assert.equal(first.body.results[0].cashEvidence,'official_grant_synopsis');
 assert.equal(first.body.skippedNoMoney,1);
 assert.equal(calls,2);
 const second=await radar.search({q:'arts'},'test');
 assert.equal(second.body.sourceStatus,'cached');
 assert.equal(calls,2);assert.equal(searches,1);
 const offline=await createFundedGrantRadar({grantSearch:{search:async()=>({status:503})}}).search({q:'arts'},'offline');
 assert.equal(offline.status,503);assert.deepEqual(offline.body.results,[]);
 const tmp=mkdtempSync(path.join(tmpdir(),'cash-prize-index-test-'));
 try{
  const index=createOpportunityIndex(tmp);
  assert.equal(index.ingest([{source:'GitHub Bounty Candidates',type:'bounty',
   id:'example',sourceUrl:'https://github.com/foo/bar/issues/3',title:'Crypto task'}],'GitHub Bounty Candidates').inserted,0);
  assert.equal(index.stats().total,0,'old unverified bounty source cannot reenter the index');
 }finally{rmSync(tmp,{recursive:true,force:true})}
 console.log('✓ official cash award whitelist, expiry, no crypto or credits, bilingual SSR, monetary grant details and retired issue bounties');
}
