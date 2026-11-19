import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createIncomeEngine,normaliseJob,opportunityFit} from '../income-engine.mjs';
import {createBriefIntake} from '../brief-intake.mjs';

const sampleJob = {
  title:'Senior Product Designer',excerpt:'UX design Figma and product research',
  companyName:'Test Employer',companySlug:'test-employer',
  employmentType:'Full Time',minSalary:90000,maxSalary:130000,currency:'USD',salaryPeriod:'annual',
  locationRestrictions:[{alpha2:'US',name:'United States'}],
  categories:['Design','Product'],seniority:['Senior'],
  applicationLink:'https://himalayas.app/companies/test-employer/jobs/product-designer',
  guid:'https://himalayas.app/companies/test-employer/jobs/product-designer',
  pubDate:Math.floor(Date.now()/1000)-3600,expiryDate:Math.floor(Date.now()/1000)+86400
};
export async function testIncomeEngine(){
 const job=normaliseJob(sampleJob);
 assert.equal(job.company,'Test Employer');
 assert.equal(job.salary.max,130000);
 assert.equal(job.source,'Himalayas');
 assert.equal(job.locationRestrictions[0],'US');
 assert.equal(normaliseJob({...sampleJob,applicationLink:'https://malicious.example/steal'}),null,'outbound URL must be trusted');
 assert.equal(normaliseJob({...sampleJob,expiryDate:Math.floor(Date.now()/1000)-60}),null,'expired jobs must be omitted');
 const good=opportunityFit(job,{q:'designer',skills:'Figma UX',country:'US'});
 const bad=opportunityFit(job,{q:'designer',country:'DE'});
 assert.equal(good.eligible,true);
 assert.equal(bad.eligible,false);
 assert.ok(good.score>bad.score);
 let requests=0;
 const engine=createIncomeEngine({fetcher:async(url)=>{
   requests++;
   assert.ok(String(url).startsWith('https://himalayas.app/jobs/api/search?'));
   return {ok:true,json:async()=>({jobs:[sampleJob],totalCount:1,updatedAt:Math.floor(Date.now()/1000)})};
 }});
 const first=await engine.findJobs({q:'designer',skills:'Figma',country:'US'},'test-a');
 assert.equal(first.status,200);
 assert.equal(first.body.results.length,1);
 assert.equal(first.body.results[0].sourceUrl,sampleJob.guid);
 assert.equal(first.body.results[0].applicationLink,sampleJob.applicationLink);
 const second=await engine.findJobs({q:'designer',skills:'Figma',country:'US'},'test-a');
 assert.equal(second.body.sourceStatus,'cached');
 assert.equal(requests,1,'provider requests must be cached');
 const out=await engine.findJobs({q:'designer',country:'DE'},'test-b');
 assert.equal(out.body.results.length,0,'ineligible country jobs must not appear');
 const noProvider=createIncomeEngine({fetcher:async()=>{throw Error('network unavailable')}});
 const failed=await noProvider.findJobs({q:'a not cached query'},'test-c');
 assert.equal(failed.status,503);
 assert.equal(failed.body.results.length,0,'must never invent listings');
 const plan=engine.plan({title:'Interactive exhibition',brief:'We need scientific research, interactive development, visual design and quality review.',budget:20000,currency:'USD'});
 assert.equal(plan.status,200);
 assert.equal(plan.body.scenarioOnly,true);
 assert.equal(plan.body.qualityAssurance.amount,2000);
 assert.equal(plan.body.coordinationAndContingency.amount,2800);
 assert.equal(plan.body.directExecution.amount,15200);
 assert.equal(plan.body.grossMargin,'unknown');
 assert.ok(plan.body.allocations.length>=2);
 assert.equal(engine.plan({title:'x',brief:'tiny',budget:40}).status,400);
 const root=mkdtempSync(path.join(tmpdir(),'income-brief-test-'));
 try{
  const brief=createBriefIntake(root);
  const base={name:'Test Company',email:'company@example.test',title:'Research pilot project',
    description:'A detailed proposal covering a research pilot, design and user interviews with a final report.',
    budget:5000,currency:'USD',consent:true};
  assert.equal(brief.submit({...base,consent:false},'user').status,400);
  const saved=brief.submit(base,'user');
  assert.equal(saved.status,201);
  assert.match(saved.body.deletionToken,/^[0-9a-f]{48}$/);
  assert.equal(brief.list().length,1);
  assert.equal(brief.list()[0].email,base.email);
  assert.equal(brief.remove(saved.body.id,'f'.repeat(48)),false);
  assert.equal(brief.remove(saved.body.id,saved.body.deletionToken),true);
  assert.equal(brief.list().length,0);
  assert.equal(readdirSync(path.join(root,'opportunities','briefs')).length,0);
 }finally{rmSync(root,{recursive:true,force:true})}
 console.log('✓ Income Intelligence provider normalization, eligibility, caching, outage behavior, curator plan and encrypted brief intake');
}
