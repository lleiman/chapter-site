/**
 * LEIMAN LAB — views, likes and comments, stored in DATA_DIR/engagement.json.
 * No accounts: a visitor is a random id from the browser (localStorage); the server keeps
 * only salted hashes of it and of IP+User-Agent (for de-duplication and rate limits).
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';

export const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|skypeuri|curl|wget|python|node-fetch|go-http|java\/|headless/i;
const COMMENT_MAX = 2000, NAME_MAX = 60, QUOTE_MAX = 500, DELETED_KEEP = 500;
const RATE = { windowMs: 10 * 60 * 1000, perWindow: 5, perDay: 30 };
const UTM_FIELDS = ['source', 'medium', 'campaign', 'content'], UTM_KEYS_MAX = 200;
export const NO_UTM = '(без метки)', OTHER_UTM = '(прочие метки)';

/** «telegram / messenger / warhound / post-12» from {source, medium, campaign, content}; untagged visits get NO_UTM. */
export function utmKey(utm) {
  const parts = UTM_FIELDS.map(f => String(utm?.[f] ?? '').normalize('NFC').replace(/[^\p{L}\p{N}_.\-]+/gu, '').slice(0, 60)).filter(Boolean);
  return parts.length ? parts.join(' / ') : NO_UTM;
}

export class EngagementError extends Error { constructor(message, code = 400) { super(message); this.code = code; } }

export function createEngagement(dataDir) {
  const file = path.join(dataDir, 'engagement.json');
  let state;
  try { state = JSON.parse(readFileSync(file, 'utf8')); } catch { state = {}; }
  state.salt ||= randomBytes(16).toString('hex');
  state.articles ||= {};
  state.deleted ||= [];

  let timer = null;
  const flush = () => {
    clearTimeout(timer); timer = null;
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(file + '.tmp', JSON.stringify(state));
    renameSync(file + '.tmp', file);
  };
  const save = () => { timer ??= setTimeout(flush, 1500); };

  const hash = (...parts) => createHash('sha256').update(state.salt + '|' + parts.join('|')).digest('hex').slice(0, 24);
  const entry = slug => {
    const e = (state.articles[slug] ||= { views: 0, likes: [], comments: [] });
    e.reads ||= 0; e.utm ||= {};
    return e;
  };
  /** Per-tag counter row; the number of distinct tags is capped so a crawler cannot bloat the file. */
  const utmRow = (e, utm) => {
    let key = utmKey(utm);
    if (!e.utm[key] && Object.keys(e.utm).length >= UTM_KEYS_MAX) key = OTHER_UTM;
    return (e.utm[key] ||= { views: 0, reads: 0 });
  };

  // View and read de-duplication: one per person per article per UTC day, kept in memory only.
  let viewDay = '', seenViews = new Set();
  const firstToday = (kind, slug, client, ua) => {
    const day = new Date().toISOString().slice(0, 10);
    if (day !== viewDay) { viewDay = day; seenViews = new Set(); }
    const key = hash(kind, day, slug, client, ua);
    if (seenViews.has(key)) return false;
    seenViews.add(key); return true;
  };
  // Comment rate limits per person, in memory only.
  const recent = new Map();

  const ownerOf = (visitor, client) => hash('visitor', visitor || client);
  const publicComment = (c, owner) => ({ id: c.id, at: c.at, name: c.name, text: c.text, anchor: c.anchor, parent: c.parent, mine: c.owner === owner });

  return {
    flush,
    counts(slug) {
      const e = state.articles[slug];
      return { views: e?.views || 0, likes: e?.likes.length || 0, comments: e?.comments.length || 0 };
    },
    view(slug, client, ua, utm) {
      if (!BOT_UA.test(ua || '') && firstToday('view', slug, client, ua)) {
        const e = entry(slug); e.views++; utmRow(e, utm).views++; save();
      }
      return this.counts(slug);
    },
    /** «Дочитал»: the page script reports 30 s of visible text or a scroll past 75 % of it. */
    markRead(slug, client, ua, utm) {
      if (!BOT_UA.test(ua || '') && firstToday('read', slug, client, ua)) {
        const e = entry(slug); e.reads++; utmRow(e, utm).reads++; save();
      }
      return { reads: state.articles[slug]?.reads || 0 };
    },
    stats(slug) {
      const e = state.articles[slug];
      const utm = Object.entries(e?.utm || {}).map(([tag, row]) => ({ tag, ...row })).sort((a, b) => b.views - a.views || b.reads - a.reads);
      return { ...this.counts(slug), reads: e?.reads || 0, utm };
    },
    toggleLike(slug, visitor, client) {
      const e = entry(slug), who = ownerOf(visitor, client);
      const i = e.likes.indexOf(who);
      if (i >= 0) e.likes.splice(i, 1); else e.likes.push(who);
      save();
      return { likes: e.likes.length, liked: i < 0 };
    },
    read(slug, visitor, client) {
      const e = state.articles[slug], who = ownerOf(visitor, client);
      return {
        ...this.counts(slug),
        liked: !!e?.likes.includes(who),
        list: (e?.comments || []).map(c => publicComment(c, who)),
      };
    },
    addComment(slug, { visitor, name, text, anchor, parent, website }, client, blockCount) {
      if (website) throw new EngagementError('Комментарий не принят');            // honeypot field
      text = String(text ?? '').replace(/\r\n?/g, '\n').trim();
      name = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || 'Аноним';
      if (!text) throw new EngagementError('Напишите комментарий');
      if (text.length > COMMENT_MAX) throw new EngagementError(`Слишком длинно: максимум ${COMMENT_MAX} знаков`);
      const e = entry(slug);
      if (parent != null && !e.comments.some(c => c.id === parent && c.parent == null)) throw new EngagementError('Нет комментария, на который вы отвечаете');
      let cleanAnchor = null;
      if (anchor && parent == null) {
        const block = Number(anchor.block), start = Number(anchor.start), end = Number(anchor.end);
        const quote = String(anchor.quote ?? '');   // kept as is: it must match text.slice(start, end)
        if (!Number.isInteger(block) || block < 0 || block >= blockCount || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || !quote.trim() || quote.length > QUOTE_MAX)
          throw new EngagementError('Не получилось привязать комментарий к фрагменту');
        cleanAnchor = { block, start, end, quote };
      }
      const now = Date.now(), who = ownerOf(visitor, client), limiter = hash('rate', client);
      const times = (recent.get(limiter) || []).filter(t => now - t < 24 * 3600 * 1000);
      if (times.filter(t => now - t < RATE.windowMs).length >= RATE.perWindow || times.length >= RATE.perDay)
        throw new EngagementError('Слишком много комментариев подряд. Попробуйте позже.', 429);
      times.push(now); recent.set(limiter, times);
      const comment = { id: randomBytes(6).toString('hex'), at: new Date(now).toISOString(), name, text, anchor: cleanAnchor, parent: parent ?? null, owner: who };
      e.comments.push(comment); save();
      return publicComment(comment, who);
    },
    deleteComment(slug, id, visitor, client, isEditor) {
      const e = state.articles[slug];
      const c = e?.comments.find(x => x.id === id);
      if (!c) throw new EngagementError('Комментарий не найден', 404);
      if (!isEditor && c.owner !== ownerOf(visitor, client)) throw new EngagementError('Удалить можно только свой комментарий', 403);
      const removed = e.comments.filter(x => x.id === id || x.parent === id);
      e.comments = e.comments.filter(x => !removed.includes(x));
      state.deleted.push(...removed.map(x => ({ ...x, slug, deletedAt: new Date().toISOString() })));
      state.deleted = state.deleted.slice(-DELETED_KEEP);
      save();
      return { comments: e.comments.length };
    },
  };
}
