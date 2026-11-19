/**
 * Operator-entered non-personal economic observations.
 * Deliberately no user IDs, names, contacts, free text, IPs, or linkage to CV/brief.
 * Never silently derived from 30-day private submissions.
 */
import path from 'node:path';
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const types=new Set(['creative','software','research','procurement','other']);
const outcomes=new Set(['paid','delivered_unpaid','cancelled','disputed']);
const currencies=new Set(['USD','EUR','GBP','IDR','RUB']);
const now=()=>new Date().toISOString();
const money=value=>Number.isFinite(Number(value))?Number(value):NaN;
export function createEconomicMemory(dataDir){
 const dir=path.join(dataDir,'income-intelligence');mkdirSync(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,'economic-observations-v1.json');
 let observations=[];
 if(existsSync(file))try{
  const parsed=JSON.parse(readFileSync(file,'utf8'));
  if(parsed.version!==1||!Array.isArray(parsed.observations))throw Error('Invalid schema');
  observations=parsed.observations.slice(0,5000);
 }catch{throw Error('Economic observations file corrupt, refusing to overwrite')}
 const save=()=>{const temp=file+'.tmp';writeFileSync(temp,JSON.stringify({version:1,observations}),{mode:0o600});renameSync(temp,file)};
 const create=input=>{
  if(!input || input.nonPersonalConfirmation!==true)
   return {status:400,body:{error:'Confirm that the record contains no personal data, identifiable customer details or confidential project identifiers.'}};
  const category=String(input.category||''),outcome=String(input.outcome||''),currency=String(input.currency||'');
  const received=money(input.amountReceived),directCosts=money(input.directCosts),hours=money(input.hours);
  const period=String(input.period||'');
  if(!types.has(category)||!outcomes.has(outcome)||!currencies.has(currency)||
   !Number.isFinite(received)||!Number.isFinite(directCosts)||!Number.isFinite(hours)||
   received<0||directCosts<0||hours<0||hours>20000||received>10000000||directCosts>10000000||
   !/^\d{4}-\d{2}$/.test(period))
    return {status:400,body:{error:'Invalid structured economic observation'}};
  if(outcome!=='paid'&&received!==0)
    return {status:400,body:{error:'Received payments are only permitted when outcome is paid'}};
  const age=Date.parse(period+'-01T00:00:00Z');
  if(!Number.isFinite(age)||age>Date.now()+32*86400000||age<Date.now()-24*31*86400000)
    return {status:400,body:{error:'Observation period outside supported 24-month window'}};
  const row={id:randomUUID(),category,outcome,currency,amountReceived:received,directCosts,
   hours,period,createdAt:now(),source:'manual_operator_entry_unverified'};
  observations.unshift(row);
  observations=observations.slice(0,5000);
  save();
  return {status:201,body:{ok:true,id:row.id,classification:'not_independently_verified'}};
 };
 const remove=id=>{
  const initial=observations.length;
  observations=observations.filter(x=>x.id!==id);
  if(observations.length===initial)return false;
  save();return true;
 };
 const summary=()=>{
  const byCurrency={};
  for(const row of observations){
   if(!byCurrency[row.currency])byCurrency[row.currency]={count:0,received:0,directCosts:0,netBeforeOverhead:0,hours:0};
   const item=byCurrency[row.currency];item.count++;item.received+=row.amountReceived;item.directCosts+=row.directCosts;
   item.netBeforeOverhead+=row.amountReceived-row.directCosts;item.hours+=row.hours;
  }
  return {total:observations.length,byCurrency,byOutcome:Object.fromEntries([...outcomes].map(x=>[x,observations.filter(r=>r.outcome===x).length])),
   methodology:'Unverified structured operator observations, without names or project IDs; net excludes overhead, taxes, financing and acquisition expenses.',
   notPublicEvidence:true};
 };
 return {create,remove,list:()=>observations.slice(0,300),summary};
}
