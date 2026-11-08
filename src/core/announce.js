// Announcements (공지): an operator's notice in every player's chat.
// The server decides who may send (supabase/012_announcements.sql: only
// accounts in "operators"); the game only listens and shows them.
//
// Operators send (and delete) from the operator page (admin.html → Announce),
// or send with the chat command  /공지 message  (also /notice, /announce).

export const MAX_NOTICE = 300;
export const NOTICE_LABEL = { en: 'Notice', ko: '공지', ja: 'お知らせ', zh: '公告' };

// A notice's text: no control characters, trimmed, at most MAX_NOTICE.
export const cleanNotice = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_NOTICE);

// "/공지 hello" → "hello"; anything else → null. "/공지" alone → "".
export function parseNoticeCommand(raw) {
  const m = /^\/(공지|notice|announce)(?:\s+([\s\S]*))?$/i.exec(String(raw ?? '').trim());
  return m ? cleanNotice(m[2] || '') : null;
}

// Shows each notice once, even when it arrives both live and in the
// "recent" list.
// A deleted notice is taken back out (onRemove) and never shown again.
export class NoticeFeed {
  constructor(onNotice, onRemove = () => {}) {
    this.onNotice = onNotice;
    this.onRemove = onRemove;
    this.seen = new Set();
  }
  remove(n) {
    const id = Number(n?.id);
    if (!Number.isFinite(id)) return false;
    this.seen.add(id); // a late "recent" copy must not bring it back
    this.onRemove(id);
    return true;
  }
  add(n) {
    const id = Number(n?.id);
    const body = cleanNotice(n?.body);
    if (!Number.isFinite(id) || !body || this.seen.has(id)) return false;
    this.seen.add(id);
    this.onNotice({ id, body, at: n.at, pinned: n.pinned === true });
    return true;
  }
}

// The pinned notices on screen (supabase/030_pinned_notices.sql): each stays
// until an operator deletes it. Newest first, at most MAX_PINNED shown.
export const MAX_PINNED = 3;
export class PinnedNotices {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.byId = new Map();
  }
  add(n) {
    if (!n?.pinned || this.byId.has(n.id)) return false;
    this.byId.set(n.id, { id: n.id, body: n.body, at: n.at });
    this.onChange(this.list());
    return true;
  }
  remove(id) {
    if (!this.byId.delete(id)) return false;
    this.onChange(this.list());
    return true;
  }
  list() {
    return [...this.byId.values()].sort((a, b) => b.id - a.id).slice(0, MAX_PINNED);
  }
}

// Listens for notices on Supabase: the private 'announce' channel for live
// ones, plus on start the notices still pinned (030_pinned_notices.sql), or
// before that file is run, the last 10 minutes' worth. Returns stop().
export function watchNotices(client, feed) {
  let ch = null, stopped = false;
  try {
    ch = client.channel('announce', { config: { private: true } });
    ch.on('broadcast', { event: 'n' }, ({ payload }) => feed.add(payload))
      .on('broadcast', { event: 'd' }, ({ payload }) => feed.remove(payload))
      .subscribe();
  } catch (e) { console.info('[announce] not listening:', e?.message); }
  const show = (data) => {
    if (stopped || !Array.isArray(data)) return; // not set up yet: no notices
    for (const n of [...data].sort((a, b) => a.id - b.id)) feed.add(n);
  };
  const recent = () => client.rpc('recent_announcements', { within_seconds: 600 }).then(({ data }) => show(data), () => {});
  client.rpc('pinned_announcements').then(({ data, error }) => {
    if (error) return recent(); // 030 not run yet
    show(data);
  }, recent);
  return () => {
    stopped = true;
    if (ch) client.removeChannel(ch);
  };
}

// Sends a notice (operators only). → { ok: true } or { error: 'operator' | 'setup' | 'busy' | 'empty' | message }
export async function sendNotice(client, text) {
  const msg = cleanNotice(text);
  if (!msg) return { error: 'empty' };
  if (!client) return { error: 'setup' };
  const { data, error } = await client.rpc('ops_announce', { msg });
  if (!error) return { ok: true, notice: data };
  if (error.code === '42501') return { error: 'operator' };
  if (error.code === 'PGRST202' || error.code === '42883') return { error: 'setup' };
  if (error.code === '54000') return { error: 'busy' };
  return { error: error.message || 'network' };
}

// Deletes a notice (operators only): gone from the list and from everyone's chat.
export async function deleteNotice(client, id) {
  if (!client) return { error: 'setup' };
  const { error } = await client.rpc('ops_delete_announcement', { notice_id: id });
  if (!error) return { ok: true };
  if (error.code === '42501') return { error: 'operator' };
  if (error.code === 'PGRST202' || error.code === '42883') return { error: 'setup' };
  return { error: error.message || 'network' };
}
