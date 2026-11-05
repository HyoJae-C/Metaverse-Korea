// Friends and friend chat. Unlike public chat, friend messages are kept (on
// the server, see supabase/006_friends.sql), so a talk with a friend reads
// like a phone messenger: open it later and the conversation is still there.
//
// Two backends with the same interface:
//   SupabaseFriends — the real one, for a signed-in account.
//   LocalFriends    — tabs of this browser only (local play and tests).
//
// Interface (all async unless noted):
//   list()               → { friends, incoming, outgoing } (each [{ uid, name }]) or { error }
//   add(name)            → 'friends' | 'requested' | 'notfound' | 'self' | 'full' | 'signin' | 'missing' | 'network'
//   accept(uid)          → 'friends' | 'none' | 'missing' | 'network'
//   remove(uid)          → 'ok' | 'missing' | 'network'
//   history(key)         → [message] oldest first, or { error }    key = a friend's uid, or ALL
//   send(key, body)      → { message } or { error: 'chat' | 'notfriend' | 'nofriends' | 'empty' | 'rate' | 'missing' | 'network' }
//   watch(onMessage, onChange) → stop()   (sync) live messages and friend-list changes
// A message is { id, from, to, name, body, at }; to = null means "All friends".

export const ALL = 'all'; // the "All friends" conversation
export const MAX_BODY = 200;

// Which conversation a message belongs to, seen from me.
export function convKey(m, me) {
  if (!m.to) return ALL;
  return m.from === me ? m.to : m.from;
}

export function cleanBody(s) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_BODY);
}

// Conversations held in memory: merges history and live messages without
// doubles, and counts what I haven't read. readMarks: { key: last read id }
// (kept by the caller so it survives a reload).
export class Inbox {
  constructor(me, readMarks = {}) {
    this.me = me;
    this.read = { ...readMarks };
    this.convs = new Map(); // key → [message] oldest first
  }
  _conv(key) {
    if (!this.convs.has(key)) this.convs.set(key, []);
    return this.convs.get(key);
  }
  // Adds messages; returns the ones that were new.
  add(msgs) {
    const fresh = [];
    for (const m of [].concat(msgs)) {
      if (!m || m.id == null) continue;
      const c = this._conv(convKey(m, this.me));
      if (c.some((x) => String(x.id) === String(m.id))) continue;
      c.push(m);
      fresh.push(m);
    }
    for (const c of this.convs.values()) c.sort((a, b) => cmpId(a.id, b.id) || Date.parse(a.at) - Date.parse(b.at));
    return fresh;
  }
  messages(key) { return this.convs.get(key) || []; }
  last(key) { const c = this.messages(key); return c[c.length - 1] || null; }
  unread(key) {
    const mark = this.read[key];
    return this.messages(key).filter((m) => m.from !== this.me && (mark == null || cmpId(m.id, mark) > 0)).length;
  }
  totalUnread() {
    let n = 0;
    for (const k of this.convs.keys()) n += this.unread(k);
    return n;
  }
  markRead(key) {
    const l = this.last(key);
    if (l) this.read[key] = l.id;
    return this.read;
  }
}

// Server ids are numbers; local ones are "l<n>". Compare either.
function cmpId(a, b) {
  const na = Number(String(a).replace(/^l/, '')), nb = Number(String(b).replace(/^l/, ''));
  return na - nb;
}

// ---------- Supabase ----------

function errCode(error) {
  if (!error) return null;
  if (error.code === '42883' || error.code === 'PGRST202' || /does not exist|schema cache|Could not find the function/i.test(error.message || '')) return 'missing';
  return 'network';
}

export class SupabaseFriends {
  constructor(client, uid) {
    this.client = client;
    this.uid = uid;
    this.shared = true;
    this.missing = false;
  }
  async _rpc(fn, args) {
    try {
      const { data, error } = await this.client.rpc(fn, args);
      const e = errCode(error);
      if (e === 'missing') this.missing = true;
      return e ? { error: e } : { data };
    } catch { return { error: 'network' }; }
  }
  async list() {
    const r = await this._rpc('friend_list');
    if (r.error) return { error: r.error };
    const out = { friends: [], incoming: [], outgoing: [] };
    for (const row of r.data || []) {
      const k = row.state === 'friend' ? 'friends' : row.state;
      out[k]?.push({ uid: row.user_id, name: row.name });
    }
    return out;
  }
  async add(name) {
    const r = await this._rpc('friend_add', { player_name: String(name).slice(0, 16) });
    return r.error || r.data || 'network';
  }
  async accept(uid) {
    const r = await this._rpc('friend_accept', { other: uid });
    return r.error || r.data || 'network';
  }
  async remove(uid) {
    const r = await this._rpc('friend_remove', { other: uid });
    return r.error || r.data || 'network';
  }
  async history(key) {
    const r = await this._rpc('friend_history', { other: key === ALL ? null : key, before_id: null });
    if (r.error) return { error: r.error };
    return (r.data || []).map((m) => ({ id: m.id, from: m.sender, to: m.recipient, name: m.name, body: m.body, at: m.created_at })).reverse();
  }
  async send(key, body) {
    const b = cleanBody(body);
    if (!b) return { error: 'empty' };
    const to = key === ALL ? null : key;
    const r = await this._rpc('friend_send', { to_user: to, msg: b });
    if (r.error) return { error: r.error };
    if (!r.data?.ok) return { error: r.data?.error || 'network' };
    return { message: { id: r.data.id, from: this.uid, to, name: '', body: b, at: r.data.at } };
  }
  // My private channel: the server pushes new messages ('m') and friend-list
  // changes ('f'). If it can't be joined, we look for news once a minute.
  watch(onMessage, onChange) {
    let stopped = false, ch = null, poll = null;
    const startPoll = () => {
      if (poll || stopped) return;
      poll = setInterval(() => onChange({ poll: true }), 60000);
    };
    try {
      ch = this.client.channel('friend:' + this.uid, { config: { private: true } });
      ch.on('broadcast', { event: 'm' }, ({ payload: p }) => p && onMessage({ id: p.id, from: p.from, to: p.to, name: p.name, body: p.body, at: p.at }))
        .on('broadcast', { event: 'f' }, () => onChange({}))
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') startPoll();
        });
    } catch { startPoll(); }
    return () => {
      stopped = true;
      clearInterval(poll);
      if (ch) this.client.removeChannel(ch);
    };
  }
}

// ---------- This browser only ----------
// Everyone is a tab of this browser, known by the id and name it plays with.

const LOCAL_KEY = 'mkfriends.local'; // not "mk.": stays out of the cloud save

export class LocalFriends {
  constructor(uid, name, storage = globalThis.localStorage) {
    this.uid = uid;
    this.storage = storage;
    this.shared = false;
    this.missing = false;
    this.bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('mk-friends') : null;
    this.setName(name);
  }
  _read() {
    try {
      const s = JSON.parse(this.storage.getItem(LOCAL_KEY) || '{}');
      return { names: s.names || {}, edges: Array.isArray(s.edges) ? s.edges : [], msgs: Array.isArray(s.msgs) ? s.msgs : [], seq: s.seq || 0 };
    } catch { return { names: {}, edges: [], msgs: [], seq: 0 }; }
  }
  _write(s) {
    s.msgs = s.msgs.slice(-500);
    try { this.storage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
  }
  _ping(msg) { this.bc?.postMessage(msg); }
  setName(name) {
    const s = this._read();
    s.names[this.uid] = String(name || '?');
    this._write(s);
  }
  _has(s, a, b) { return s.edges.some(([x, y]) => x === a && y === b); }
  _friends(s, a, b) { return this._has(s, a, b) && this._has(s, b, a); }
  async list() {
    const s = this._read();
    const out = { friends: [], incoming: [], outgoing: [] };
    const others = new Set(s.edges.flatMap(([a, b]) => (a === this.uid ? [b] : b === this.uid ? [a] : [])));
    for (const o of others) {
      const mine = this._has(s, this.uid, o), theirs = this._has(s, o, this.uid);
      const k = mine && theirs ? 'friends' : mine ? 'outgoing' : 'incoming';
      out[k].push({ uid: o, name: s.names[o] || '?' });
    }
    return out;
  }
  async add(name) {
    const s = this._read();
    const key = (n) => String(n).toLowerCase().replace(/\s+/g, '');
    // The newest tab with that name.
    const them = Object.keys(s.names).reverse().find((u) => key(s.names[u]) === key(name));
    if (!them) return 'notfound';
    if (them === this.uid) return 'self';
    if (!this._has(s, this.uid, them)) s.edges.push([this.uid, them]);
    this._write(s);
    this._ping({ type: 'f', to: them });
    return this._friends(s, this.uid, them) ? 'friends' : 'requested';
  }
  async accept(uid) {
    const s = this._read();
    if (!this._has(s, uid, this.uid)) return 'none';
    if (!this._has(s, this.uid, uid)) s.edges.push([this.uid, uid]);
    this._write(s);
    this._ping({ type: 'f', to: uid });
    return 'friends';
  }
  async remove(uid) {
    const s = this._read();
    s.edges = s.edges.filter(([a, b]) => !((a === this.uid && b === uid) || (a === uid && b === this.uid)));
    this._write(s);
    this._ping({ type: 'f', to: uid });
    return 'ok';
  }
  async history(key) {
    const s = this._read();
    return s.msgs.filter((m) => (key === ALL
      ? !m.to && (m.from === this.uid || this._friends(s, m.from, this.uid))
      : this._friends(s, this.uid, key) && ((m.from === this.uid && m.to === key) || (m.from === key && m.to === this.uid)))).slice(-50);
  }
  async send(key, body) {
    const b = cleanBody(body);
    if (!b) return { error: 'empty' };
    const s = this._read();
    const to = key === ALL ? null : key;
    const friends = Object.keys(s.names).filter((u) => this._friends(s, this.uid, u));
    if (to && !friends.includes(to)) return { error: 'notfriend' };
    if (!to && !friends.length) return { error: 'nofriends' };
    s.seq += 1;
    const message = { id: 'l' + s.seq, from: this.uid, to, name: s.names[this.uid] || '?', body: b, at: new Date().toISOString() };
    s.msgs.push(message);
    this._write(s);
    this._ping({ type: 'm', message, targets: to ? [to] : friends });
    return { message };
  }
  close() { this.bc?.close(); this.bc = null; }
  watch(onMessage, onChange) {
    if (!this.bc) return () => {};
    const h = ({ data: d }) => {
      if (d?.type === 'm' && d.targets?.includes(this.uid)) onMessage(d.message);
      if (d?.type === 'f' && d.to === this.uid) onChange({});
    };
    this.bc.addEventListener('message', h);
    return () => this.bc.removeEventListener('message', h);
  }
}
