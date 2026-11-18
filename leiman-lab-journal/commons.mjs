/**
 * Leiman Lab Commons pilot governance.
 * Single-instance persistent JSON on DATA_DIR; advisory ballots only.
 * No token minting, treasury transfers or domain delegation.
 */
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

export class CommonsError extends Error {
  constructor(message, code = 400) { super(message); this.code = code; }
}
const LIMITS = { name: 70, bio: 500, title: 140, summary: 1500, comment: 2000, rationale: 2500 };
const ISO = () => new Date().toISOString();
const clean = (x, max = 500) => {
  if (typeof x !== 'string') throw new CommonsError('Ожидается текстовое поле');
  const s = x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s || s.length > max) throw new CommonsError('Поле пустое или слишком длинное (лимит ' + max + ')');
  return s;
};
const hash = token => createHash('sha256').update(token).digest('hex');
const safeEqual = (a,b) => {
  const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x,y);
};
const publicMember = m => ({ id:m.id, name:m.displayPublic ? m.name : 'Участник ' + m.id.slice(0,6), role:m.role, bio:m.displayPublic ? m.bio : '', joined:m.joined });
const programDefaults = [
  { id:'prediction-replication', title:'Prediction OS: независимая проверка', status:'design', purpose:'Зафиксировать протокол и провести независимую репликацию гипотез на допустимых данных.', milestones:['Пререгистрация гипотез', 'Проверка доступа и этики данных', 'Слепой анализ', 'Публикация всех исходов'] },
  { id:'ai-index-benchmark', title:'AI Index: воспроизводимые тесты', status:'design', purpose:'Подготовить стандартизированный протокол сравнения моделей и задокументировать реальные затраты.', milestones:['Протокол и сценарии', 'Раскрытие версий и параметров', 'Независимые запуски', 'Открытый отчёт'] }
];
const fresh = () => ({ schema:1, created:ISO(), members:[], proposals:[], comments:[], decisions:[], programs:programDefaults, treasury:[], legalStatus:'not-incorporated', daoStatus:'not-activated' });

export function createCommons(dataDir) {
  const file = path.join(dataDir, 'commons', 'state.json');
  let state = fresh();
  if (existsSync(file)) {
    try {
      const loaded = JSON.parse(readFileSync(file,'utf8'));
      if (loaded.schema !== 1 || !Array.isArray(loaded.members) || !Array.isArray(loaded.proposals)) throw Error('Invalid schema');
      state = loaded;
    } catch (err) {
      throw new Error('Commons state corrupted; refusing to overwrite ' + file + ': ' + err.message);
    }
  }
  const persist = () => {
    mkdirSync(path.dirname(file), { recursive:true });
    if (existsSync(file)) copyFileSync(file, file + '.bak');
    writeFileSync(file + '.tmp', JSON.stringify(state, null, 2) + '\n', { mode:0o600 });
    renameSync(file + '.tmp', file);
  };
  const requireMember = req => {
    const auth = String(req.headers.authorization || '');
    const match = auth.match(/^Bearer ([a-f0-9]{64})$/i);
    if (!match) throw new CommonsError('Требуется персональный ключ участника', 401);
    const digest = hash(match[1]);
    const member = state.members.find(m => safeEqual(m.tokenHash, digest) && m.status === 'active');
    if (!member) throw new CommonsError('Ключ не найден или отозван', 401);
    return member;
  };
  const published = p => ['open','closed','accepted','rejected'].includes(p.status);
  const publicState = () => ({
    schema:1,
    phase:'pilot',
    legalStatus:state.legalStatus,
    daoStatus:state.daoStatus,
    programs:state.programs,
    members:state.members.filter(m=>m.status==='active').map(publicMember),
    proposals:state.proposals.filter(published).map(p => ({
      id:p.id, title:p.title, summary:p.summary, program:p.program, created:p.created,
      updated:p.updated, status:p.status, author:publicMember(state.members.find(m=>m.id===p.authorId) || { id:'unknown', name:'Участник', displayPublic:false, role:'member', bio:'', joined:'' }).name,
      votes:{ yes:Object.values(p.votes).filter(v=>v==='yes').length, no:Object.values(p.votes).filter(v=>v==='no').length, abstain:Object.values(p.votes).filter(v=>v==='abstain').length },
      comments:state.comments.filter(c=>c.proposalId===p.id && c.status==='approved').map(c=>({id:c.id, author:c.author, text:c.text, created:c.created})),
      decisionId:p.decisionId || null
    })),
    decisions:state.decisions,
    treasury:state.treasury
  });
  const adminState = () => ({
    ...publicState(),
    members:state.members.map(m=>({ ...publicMember(m), status:m.status, displayPublic:m.displayPublic })),
    pending:state.proposals.filter(p=>p.status==='pending'),
    pendingComments:state.comments.filter(c=>c.status==='pending'),
    proposalCount:state.proposals.length
  });
  const requireAdmin = authorized => { if (!authorized) throw new CommonsError('Недостаточно прав', 401); };
  const requireObject = body => { if (!body || typeof body !== 'object' || Array.isArray(body)) throw new CommonsError('Нужен объект JSON'); };
  const ensureNoHtml = s => { if (/[<>]/.test(s)) throw new CommonsError('HTML в текстовых полях не принимается'); return s; };
  const textField = (s, max) => ensureNoHtml(clean(s,max));
  const id = () => randomBytes(12).toString('hex');
  const program = p => state.programs.some(x=>x.id===p);
  const proposal = pid => { const p=state.proposals.find(x=>x.id===pid); if(!p)throw new CommonsError('Предложение не найдено',404); return p; };

  /** Returns {code, data}; caller performs same-origin/content-type/body/rate handling. */
  function handle(req, route, body={}, authorized=false) {
    requireObject(body);
    if (route === '/api/commons' && req.method === 'GET') return {code:200,data:publicState()};
    if (route === '/api/commons/me' && req.method === 'GET') {
      const m=requireMember(req);
      return {code:200,data:{member:publicMember(m), status:m.status, proposals:state.proposals.filter(p=>p.authorId===m.id).map(p=>({id:p.id,title:p.title,status:p.status}))}};
    }
    if (route === '/api/commons/profile' && req.method === 'POST') {
      const m=requireMember(req);
      m.name=textField(body.name,LIMITS.name);
      m.bio=typeof body.bio==='string' && body.bio.trim()?textField(body.bio,LIMITS.bio):'';
      m.displayPublic=body.displayPublic===true;
      persist();
      return {code:200,data:{member:publicMember(m)}};
    }
    if (route === '/api/commons/proposals' && req.method === 'POST') {
      const m=requireMember(req);
      const title=textField(body.title,LIMITS.title), summary=textField(body.summary,LIMITS.summary);
      if (!program(body.program)) throw new CommonsError('Неизвестная программа');
      const p={id:id(),title,summary,program:body.program,authorId:m.id,created:ISO(),updated:ISO(),status:'pending',votes:{}};
      state.proposals.push(p); persist();
      return {code:201,data:{id:p.id,status:'pending',message:'Предложение отправлено на редакционную проверку'}};
    }
    if (route === '/api/commons/comments' && req.method === 'POST') {
      const m=requireMember(req), p=proposal(body.proposalId);
      if (p.status!=='open') throw new CommonsError('Обсуждение закрыто',409);
      const c={id:id(),proposalId:p.id,author:publicMember(m).name,text:textField(body.text,LIMITS.comment),created:ISO(),status:'pending'};
      state.comments.push(c);persist();
      return {code:201,data:{id:c.id,status:c.status}};
    }
    if (route === '/api/commons/votes' && req.method === 'POST') {
      const m=requireMember(req),p=proposal(body.proposalId);
      if(p.status!=='open') throw new CommonsError('Голосование закрыто',409);
      if(!['yes','no','abstain'].includes(body.choice)) throw new CommonsError('Некорректный вариант голоса');
      p.votes[m.id]=body.choice; p.updated=ISO();persist();
      return {code:200,data:{ok:true,choice:body.choice}};
    }
    if (route === '/api/admin/commons' && req.method === 'GET') {
      requireAdmin(authorized);return {code:200,data:adminState()};
    }
    if (route === '/api/admin/commons/members' && req.method === 'POST') {
      requireAdmin(authorized);
      if(!['member','researcher','reviewer','steward'].includes(body.role)) throw new CommonsError('Неизвестная роль');
      const name=textField(body.name,LIMITS.name);
      const token=randomBytes(32).toString('hex');
      const m={id:id(),name,role:body.role,bio:'',displayPublic:body.displayPublic===true,joined:ISO().slice(0,10),status:'active',tokenHash:hash(token)};
      state.members.push(m);persist();
      return {code:201,data:{id:m.id,token,warning:'Покажите этот ключ только участнику. В базе хранится только SHA-256. Скопируйте ключ сейчас.'}};
    }
    if (route === '/api/admin/commons/revoke' && req.method === 'POST') {
      requireAdmin(authorized);
      const m=state.members.find(m=>m.id===body.memberId);
      if(!m)throw new CommonsError('Участник не найден',404);
      m.status='revoked';persist();return {code:200,data:{ok:true}};
    }
    if (route === '/api/admin/commons/comments' && req.method === 'POST') {
      requireAdmin(authorized);
      const c=state.comments.find(c=>c.id===body.commentId);
      if(!c)throw new CommonsError('Комментарий не найден',404);
      if(!['approved','rejected'].includes(body.status))throw new CommonsError('Некорректный статус');
      c.status=body.status;persist();return {code:200,data:{ok:true}};
    }
    if (route === '/api/admin/commons/proposals' && req.method === 'POST') {
      requireAdmin(authorized);
      const p=proposal(body.proposalId);
      if (p.status==='accepted'||p.status==='rejected'||p.status==='closed') throw new CommonsError('Итоговое решение уже зафиксировано',409);
      if (body.status==='open') {
        if(p.status!=='pending')throw new CommonsError('Предложение уже опубликовано',409);
        p.status='open';p.updated=ISO();persist();return {code:200,data:{ok:true,status:'open'}};
      }
      if(!['accepted','rejected','closed'].includes(body.status) || p.status!=='open') throw new CommonsError('Недопустимый переход',409);
      const rationale=textField(body.rationale,LIMITS.rationale);
      const votes=Object.values(p.votes);
      const tally={yes:votes.filter(x=>x==='yes').length,no:votes.filter(x=>x==='no').length,abstain:votes.filter(x=>x==='abstain').length};
      const quorum= votes.length>=3;
      // Decisions are recorded as steward decisions, not falsely described as token-enforced DAO outcomes.
      const d={id:id(),proposalId:p.id,title:p.title,decision:body.status,rationale,quorumMet:quorum,advisoryTally:tally,date:ISO(),governingBody:'pilot-steward'};
      p.decisionId=d.id;p.status=body.status;p.updated=ISO();state.decisions.push(d);persist();
      return {code:200,data:{decision:d}};
    }
    if (route === '/api/admin/commons/programs' && req.method === 'POST') {
      requireAdmin(authorized);
      const p=state.programs.find(p=>p.id===body.programId);
      if(!p)throw new CommonsError('Программа не найдена',404);
      if(!['design','recruiting','active','completed'].includes(body.status))throw new CommonsError('Недопустимый статус');
      p.status=body.status;persist();return {code:200,data:{program:p}};
    }
    throw new CommonsError('Неизвестный маршрут или метод',404);
  }
  return { handle, publicState, adminState };
}
