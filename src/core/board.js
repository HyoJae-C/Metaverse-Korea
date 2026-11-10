// Notice boards on the square: a free board (자유게시판) everyone can read,
// and an inquiry board (문의게시판) only the writer (and the operator, in the
// Supabase dashboard) can read.
//
// Rules: up to 3 posts per board per day (Korean time), 20 lines and 1000
// characters each. The server enforces them too (supabase/002_board.sql);
// the checks here are for friendly messages.
//
// Posts are stored in Supabase when the game is signed in to it; otherwise
// (local play, tests, or before the table exists) in this browser only.

export const BOARDS = ['free', 'ask'];
export const DAILY_POSTS = 3;
export const MAX_LINES = 20;
export const MAX_CHARS = 1000;
const TABLE = 'board_posts';
const LOCAL_KEY = 'mkboard.local'; // not "mk.": stays out of the cloud save

// The body as it will be saved, or an error code: 'empty', 'lines', 'chars'.
export function cleanBody(text) {
  const body = String(text || '').replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/^\n+|\n+$/g, '');
  if (!body.trim()) return { error: 'empty' };
  if (body.split('\n').length > MAX_LINES) return { error: 'lines' };
  if (body.length > MAX_CHARS) return { error: 'chars' };
  return { body };
}

// Midnight in Korea (UTC+9, no daylight saving) at or before `now`, in ms.
export function kstDayStart(now = Date.now()) {
  const KST = 9 * 3600e3;
  return Math.floor((now + KST) / 86400e3) * 86400e3 - KST;
}

export function postsLeft(myPosts, board, now = Date.now()) {
  const start = kstDayStart(now);
  const n = myPosts.filter((p) => p.board === board && Date.parse(p.created_at) >= start).length;
  return Math.max(0, DAILY_POSTS - n);
}

// In this browser only.
export class LocalBoard {
  constructor(storage = globalThis.localStorage, uid = 'me') {
    this.storage = storage;
    this.uid = uid;
    this.shared = false; // others can't see these posts
  }
  _all() {
    try { const a = JSON.parse(this.storage.getItem(LOCAL_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  _save(a) { try { this.storage.setItem(LOCAL_KEY, JSON.stringify(a.slice(-200))); } catch { /* storage blocked */ } }
  async list(board) {
    return this._all().filter((p) => p.board === board && !p.deleted).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 50);
  }
  async left(board, now = Date.now()) { return postsLeft(this._all(), board, now); }
  async post(board, name, text, now = Date.now()) {
    const c = cleanBody(text);
    if (c.error) return { error: c.error };
    if (!BOARDS.includes(board)) return { error: 'board' };
    const all = this._all();
    if (postsLeft(all, board, now) <= 0) return { error: 'limit' };
    const p = { id: `l${now}${Math.random().toString(36).slice(2, 6)}`, board, user_id: this.uid, name: String(name).slice(0, 16), body: c.body, created_at: new Date(now).toISOString() };
    all.push(p);
    this._save(all);
    return { post: p };
  }
  async remove(id) {
    // Marked, not removed: a deleted post still counts for the day.
    this._save(this._all().map((p) => (p.id === id && p.user_id === this.uid ? { ...p, deleted: true } : p)));
    return {};
  }
  mine(p) { return p.user_id === this.uid; }
}

// In Supabase (shared with everyone). client: a signed-in supabase-js client.
export class SupabaseBoard {
  constructor(client, uid) {
    this.client = client;
    this.uid = uid;
    this.shared = true;
    this.missing = false; // the table isn't set up yet
  }
  _err(error) {
    if (!error) return null;
    if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || '')) { this.missing = true; return 'missing'; }
    if (error.code === '42501' || /row-level security/i.test(error.message || '')) return 'limit';
    return 'network';
  }
  async list(board) {
    const q = (cols) => this.client.from(TABLE).select(cols).eq('board', board).order('created_at', { ascending: false }).limit(50);
    const base = 'id, board, user_id, name, body, created_at';
    // Inquiries carry the operator's reply (supabase/009_admin.sql); before
    // that SQL is run the columns aren't there, so ask again without them.
    let { data, error } = await q(board === 'ask' && !this.noReply ? base + ', reply, replied_at' : base);
    if (error && board === 'ask' && !this.noReply && (error.code === '42703' || /column/i.test(error.message || ''))) {
      this.noReply = true;
      ({ data, error } = await q(base));
    }
    const e = this._err(error);
    return e ? { error: e } : data;
  }
  async left(board, now = Date.now()) {
    const { data, error } = await this.client.from(TABLE).select('board, created_at')
      .eq('user_id', this.uid).eq('board', board).gte('created_at', new Date(kstDayStart(now)).toISOString());
    if (error) return DAILY_POSTS;
    return postsLeft(data, board, now);
  }
  async post(board, name, text) {
    const c = cleanBody(text);
    if (c.error) return { error: c.error };
    const { data, error } = await this.client.from(TABLE).insert({ board, name: String(name).slice(0, 16), body: c.body }).select().single();
    const e = this._err(error);
    return e ? { error: e } : { post: data };
  }
  async remove(id) {
    const { error } = await this.client.rpc('board_delete_post', { post_id: id });
    const e = this._err(error);
    return e ? { error: e } : {};
  }
  mine(p) { return p.user_id === this.uid; }
}
