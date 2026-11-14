// The operator page's Chat tab: public chat, live as it is sent, plus the
// last 90 days from the server's log (supabase/024_chat_log.sql) so a
// report can be checked later. The "Show" menu switches to the other text
// players write to each other, from supabase/043_ops_all_chat.sql: friend
// chat (90 days), love-lock notes, board posts, or all of it at once (to
// see everything one player wrote). The confession room is never here: it
// sends and saves nothing.
//
// Live lines come from the same private realtime channels the games use
// ('chat:<room>', 004_chat.sql and 019_chat_names.sql). The street is one
// room; each shop or café is its own room ('<region>-<store id>'). There are
// too many shops to listen to all at once, so the page listens to the street
// always, and to a shop's room while someone is in it (from ops_where).
// Lines missed that way are still in the log.
//
// Each line has a button to stop that account chatting (ops_set_ban).

export const MAX_ROOMS = 60; // channels open at once (the street plus shops)
export const MAX_LINES = 1000; // lines kept on the page
const PLACES_MS = 10000; // how often to look where people are
const KEEP_MS = 5 * 60000; // keep listening to an emptied shop this long
const PAGE = 200; // log lines per load
const SETUP = 'Run <code>supabase/024_chat_log.sql</code> once to keep chat for 90 days (only live chat shows until then).';
const ALL_SETUP = 'Run <code>supabase/043_ops_all_chat.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>) to see friend chat, love-lock notes and board posts here.';
// The "Show" menu: which text the tab lists. 'room' is public chat (live
// and the log); the rest come from ops_all_chat.
const EMPTY_ROOM = 'No chat yet. Public chat shows up here the moment it is sent. Use "Show" for friend chat, love-lock notes and board posts.';
export const KINDS = { room: 'Public chat', friend: 'Friend chat', lock: 'Love-lock notes', board: 'Board posts', all: 'Everything' };

// The rooms to listen to: the street, then shops with people in them
// (places from ops_where), most recently needed first, at most MAX_ROOMS.
export function chatRooms(region, places, kept = []) {
  const rooms = [region];
  const add = (place) => {
    if (!place || place === 'street') return;
    const r = `${region}-${place}`;
    if (!rooms.includes(r) && rooms.length < MAX_ROOMS) rooms.push(r);
  };
  for (const p of places || []) add(p);
  for (const p of kept) add(p);
  return rooms;
}

// The place a room stands for: 'street' or the store id.
export function roomPlace(region, room) {
  return room === region ? 'street' : room.startsWith(region + '-') ? room.slice(region.length + 1) : room;
}

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

// A message off the channel, cleaned for showing: { name, text } or null.
export function chatLine(payload) {
  const text = clean(payload?.t, 200);
  if (!text) return null;
  return { name: clean(payload?.n, 32) || '?', text };
}

// A country code ('JP') as its flag and code ('🇯🇵 JP'); '' for none or
// unknown ('XX'). The code is the game's guess from the time zone
// (supabase/010_countries.sql, 044_chat_90_days_country.sql).
export function countryTag(cc) {
  const c = String(cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c) || c === 'XX') return '';
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) + ' ' + c;
}

// A row of ops_chat_log as a line.
export function logLine(region, r) {
  return {
    country: countryTag(r.country),
    logId: r.id, at: Date.parse(r.at), place: roomPlace(region, r.room), id: r.net_id, uid: r.uid,
    name: clean(r.name, 32) || '?', text: clean(r.msg, 200), guest: !!r.guest, banned: !!r.banned,
  };
}

// A row of ops_all_chat (any kind) as a line. atRaw
// keeps the server's exact time for "load older".
export function allLine(region, r) {
  const kind = r.kind in KINDS ? r.kind : 'room';
  return {
    kind, ref: r.ref, at: Date.parse(r.at), atRaw: r.at, uid: r.uid, id: '', country: countryTag(r.country),
    place: kind === 'room' ? roomPlace(region, r.place || '') : String(r.place || ''),
    name: clean(r.name, 32) || '?', text: clean(r.msg, 1000), guest: !!r.guest, banned: !!r.banned,
    toUid: r.to_uid || null, toName: r.to_name == null ? null : clean(r.to_name, 32) || '?', state: r.state || '',
  };
}

// Where a line was written, for the second column.
export function placeLabel(l, describePlace = (p) => p) {
  if (l.kind === 'friend') return '👥 → ' + (l.toUid ? l.toName || '?' : 'All friends');
  if (l.kind === 'lock') return '🔒 Love lock';
  if (l.kind === 'board') return l.place === 'ask' ? '📮 Inquiry board' : '📋 Free board';
  return l.place === 'street' ? '🚶 Street' : '🏠 ' + describePlace(l.place).replace(/^In /, '');
}

// Is a live line one the log already has (same player id and words, sent
// within a few seconds)?
export function sameLine(a, b) {
  return a.id === b.id && a.text === b.text && Math.abs(a.at - b.at) < 15000;
}

// The log's size line: { text, level } with level 'ok', 'warn' (tell Yozi
// early: the 90 days would fill more than expected) or 'alert' (the
// database is close to the free plan's 500 MB). s: ops_chat_log_size().
export const FREE_DB = 500 * 1024 * 1024;
export function sizeReport(s, now = Date.now()) {
  const mb = (b) => (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
  const rows = +s?.rows || 0, bytes = +s?.bytes || 0, db = +s?.db_bytes || 0;
  const days = s?.oldest ? Math.min(7, Math.max(1, (now - Date.parse(s.oldest)) / 86400000)) : 7;
  const perDay = (+s?.week || 0) / days;
  const perRow = rows ? bytes / rows : 300;
  const full = perDay * 90 * perRow; // the log once it holds 90 days at this pace
  const level = db > FREE_DB * 0.85 ? 'alert' : full > FREE_DB * 0.3 || db > FREE_DB * 0.7 ? 'warn' : 'ok';
  const text = `Chat log: ${rows.toLocaleString()} lines, ${mb(bytes)} · about ${Math.round(perDay).toLocaleString()} lines a day → about ${mb(full)} at 90 days · whole database ${mb(db)} of 500 MB (free plan)`;
  return { text, level };
}

export function createChatPanel({ client, region, $, describePlace, badge, setStatus }) {
  const listEl = $('chatList'), filterEl = $('chatQ'), pauseEl = $('chatPause'), noteEl = $('chatNote'), kindEl = $('chatKind');
  const channels = new Map(); // room → channel
  const lastSeen = new Map(); // place → ms it last had someone in it
  let lines = []; // oldest first: { at, place, name, text, id, uid?, logId?, banned? }
  let found = null; // search results (oldest first) while a search is shown
  let hasLog = false, logDone = false, open = false, unread = 0, placesTimer = 0;
  let kind = 'room'; // the "Show" menu (KINDS)

  const shownLines = () => found || lines;
  const describe = (place) => describePlace(place);
  const matches = (l) => {
    if (found) return true; // the server already searched
    const q = filterEl.value.trim().toLowerCase();
    return !q || l.text.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || placeLabel(l, describe).toLowerCase().includes(q);
  };
  const when = (ms) => {
    const d = new Date(ms), today = new Date().toDateString() === d.toDateString();
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return today ? t : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + t;
  };

  async function ban(l, btn) {
    const why = prompt(`Stop ${l.name} chatting?\n\n"${l.text}"\n\nReason (optional):`, l.text.slice(0, 120));
    if (why === null) return;
    btn.disabled = true;
    let uid = l.uid;
    if (!uid) {
      const { data, error } = await client.rpc('ops_chat_owner', { net_id: l.id });
      if (error) { setStatus('Could not find the account: ' + error.message + (hasLog ? '' : ' (run supabase/024_chat_log.sql)')); btn.disabled = false; return; }
      uid = data;
    }
    if (!uid) { setStatus('This player id has no account any more.'); btn.disabled = false; return; }
    const { error } = await client.rpc('ops_set_ban', { target: uid, on_off: true, why: why || null });
    if (error) { setStatus('Could not ban: ' + error.message); btn.disabled = false; return; }
    for (const x of [...lines, ...(found || [])]) if (x.uid === uid || (l.id && x.id === l.id)) { x.uid = uid; x.banned = true; }
    setStatus(`${l.name} can't chat any more (Players tab → Unban to undo).`);
    render();
  }

  async function hideLock(l, btn) {
    btn.disabled = true;
    const on = l.state !== 'hidden';
    const { error } = await client.rpc('ops_set_lock_hidden', { lock_id: l.ref, on_off: on });
    if (error) { setStatus('Could not change the note: ' + error.message); btn.disabled = false; return; }
    l.state = on ? 'hidden' : '';
    setStatus(on ? 'Love-lock note hidden from the wall.' : 'Love-lock note shown again.');
    render();
  }

  function row(l) {
    const tr = document.createElement('tr');
    const cell = (text, cls) => { const td = document.createElement('td'); if (cls) td.className = cls; td.textContent = text; tr.append(td); return td; };
    cell(when(l.at), 'muted');
    cell(placeLabel(l, describe));
    const who = cell(l.name, 'who');
    if (l.country) who.append(' ', Object.assign(document.createElement('span'), { className: 'muted', textContent: l.country, title: 'Country the player last played from (guessed from the time zone)' }));
    if (l.guest) who.append(' ', Object.assign(document.createElement('span'), { className: 'tag', textContent: 'guest' }));
    const said = cell(l.text);
    if (l.state) said.prepend(Object.assign(document.createElement('span'), { className: 'tag', textContent: l.state }), ' ');
    const act = cell('', 'act');
    if (l.kind === 'lock') {
      const h = Object.assign(document.createElement('button'), { type: 'button', textContent: l.state === 'hidden' ? 'Show' : 'Hide', title: 'Hide this note from the wall' });
      h.onclick = () => hideLock(l, h);
      act.append(h, ' ');
    }
    if (l.banned) act.append(Object.assign(document.createElement('span'), { className: 'tag red', textContent: 'banned' }));
    else {
      const b = Object.assign(document.createElement('button'), { className: 'danger', type: 'button', textContent: 'Ban chat', title: 'Stop this account chatting' });
      b.onclick = () => ban(l, b);
      act.append(b);
    }
    return tr;
  }
  function count() {
    const n = shownLines().length;
    $('chatCount').textContent = kind !== 'room'
      ? `${n} ${KINDS[kind].toLowerCase()} line${n === 1 ? '' : 's'}${filterEl.value.trim() ? ' found' : ''}`
      : found
      ? `${n} line${n === 1 ? '' : 's'} found`
      : `${n} line${n === 1 ? '' : 's'}${hasLog ? '' : ' since this page opened'} · listening to ${channels.size} room${channels.size === 1 ? '' : 's'}`;
  }
  function render() {
    const shown = shownLines().filter(matches);
    listEl.replaceChildren(...shown.map(row));
    $('chatEmpty').hidden = shown.length > 0;
    $('chatEmpty').textContent = kind === 'room' ? EMPTY_ROOM : `No ${KINDS[kind].toLowerCase()} found.`;
    $('chatOlder').hidden = (kind === 'room' && !hasLog) || logDone;
    $('chatBack').hidden = !found || kind !== 'room';
    $('chatSearch').textContent = kind === 'room' ? 'Search 90 days' : 'Search';
    count();
    stick();
  }
  const box = () => listEl.closest('.chatbox');
  function stick() { if (!pauseEl.checked && !found) box().scrollTop = box().scrollHeight; }

  function heard(room, payload) {
    const l = chatLine(payload);
    if (!l) return;
    const line = { at: Date.now(), place: roomPlace(region, room), id: String(payload?.id ?? ''), ...l };
    if (lines.some((x) => sameLine(x, line))) return;
    lines.push(line);
    if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
    if (open && kind !== 'room') return; // looking at other text: kept for later
    if (open && !found) {
      if (matches(line)) { listEl.append(row(line)); $('chatEmpty').hidden = true; stick(); }
      count();
    } else if (!open) badge('chatBadge', ++unread);
  }

  // Loads log lines older than the oldest shown (or the newest, first time).
  // q: a server search instead of everything.
  async function loadLog({ older = false, q = '' } = {}) {
    if (kind !== 'room') return loadAll({ older, q });
    const list = q ? found || [] : lines;
    const before = older ? list.find((l) => l.logId)?.logId ?? null : null;
    const { data, error } = await client.rpc('ops_chat_log', { q, before_id: before, lim: PAGE });
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') { hasLog = false; noteEl.innerHTML = SETUP; noteEl.hidden = false; }
      else setStatus('Chat log: ' + error.message);
      return false;
    }
    hasLog = true;
    noteEl.hidden = true;
    const got = (data || []).map((r) => logLine(region, r)).reverse();
    logDone = got.length < PAGE;
    if (!older && !q) size();
    if (q) found = older ? [...got, ...(found || [])] : got;
    else if (older) lines = [...got, ...lines];
    else lines = [...got, ...lines.filter((l) => !got.some((g) => sameLine(g, l)))];
    return true;
  }

  // The other kinds (ops_all_chat): always a list of their own (found).
  async function loadAll({ older = false, q = '' } = {}) {
    const asked = kind;
    const before = older ? (found || [])[0]?.atRaw ?? null : null;
    const { data, error } = await client.rpc('ops_all_chat', { which: asked, q, before_at: before, lim: PAGE });
    if (asked !== kind) return false; // the menu changed meanwhile
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') { noteEl.innerHTML = ALL_SETUP; noteEl.hidden = false; found = []; logDone = true; return true; }
      setStatus('Chat: ' + error.message);
      return false;
    }
    noteEl.hidden = true;
    const got = (data || []).map((r) => allLine(region, r)).reverse();
    logDone = got.length < PAGE;
    found = older ? [...got, ...(found || [])] : got;
    return true;
  }

  async function size() {
    const { data, error } = await client.rpc('ops_chat_log_size');
    const el = $('chatSize');
    el.hidden = !!error || !data;
    if (error || !data) return;
    const r = sizeReport(data);
    el.textContent = (r.level === 'ok' ? '' : '⚠️ ') + r.text + (r.level === 'alert' ? ' — almost full: shorten the 90 days or move to a paid plan' : r.level === 'warn' ? ' — filling faster than planned' : '');
    el.className = 'chatsize ' + r.level;
  }

  function listen(room) {
    const ch = client.channel('chat:' + room, { config: { private: true } });
    ch.on('broadcast', { event: 'c' }, ({ payload }) => heard(room, payload));
    ch.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' && room === region) setStatus('Chat: could not listen (' + (err?.message || status) + ')');
    });
    channels.set(room, ch);
  }

  async function follow() {
    clearTimeout(placesTimer);
    placesTimer = setTimeout(follow, PLACES_MS);
    if (document.hidden) return;
    const { data } = await client.rpc('ops_where', { within_seconds: 120 });
    const now = Date.now();
    const places = [...new Set((data || []).map((p) => p.place))];
    for (const p of places) lastSeen.set(p, now);
    const kept = [...lastSeen].filter(([p, t]) => now - t < KEEP_MS && !places.includes(p)).sort((a, b) => b[1] - a[1]).map(([p]) => p);
    for (const [p, t] of lastSeen) if (now - t >= KEEP_MS) lastSeen.delete(p);
    const want = new Set(chatRooms(region, places, kept));
    for (const [room, ch] of channels) if (!want.has(room)) { client.removeChannel(ch); channels.delete(room); }
    for (const room of want) if (!channels.has(room)) listen(room);
    if (open) count();
  }

  filterEl.oninput = () => { if (!found) render(); };
  filterEl.onkeydown = (e) => { if (e.key === 'Enter') $('chatSearch').click(); };
  pauseEl.onchange = stick;
  kindEl.onchange = async () => {
    kind = kindEl.value in KINDS ? kindEl.value : 'room';
    $('chatSize').hidden = kind !== 'room' || !$('chatSize').textContent;
    found = kind === 'room' ? null : [];
    logDone = false;
    noteEl.hidden = true;
    if (kind === 'room') { filterEl.value = ''; render(); return; }
    render();
    if (await loadAll({ q: filterEl.value.trim() })) render();
  };
  $('chatSearch').onclick = async () => {
    const q = filterEl.value.trim();
    if (kind !== 'room') { if (await loadAll({ q })) render(); return; }
    if (!q) { found = null; render(); return; }
    if (!hasLog) { render(); return; } // no log yet: the filter is all there is
    found = [];
    if (await loadLog({ q })) render();
  };
  $('chatBack').onclick = () => { found = null; filterEl.value = ''; logDone = false; render(); };
  $('chatOlder').onclick = async () => {
    const top = box().scrollHeight;
    if (await loadLog({ older: true, q: found || kind !== 'room' ? filterEl.value.trim() : '' })) {
      const keep = pauseEl.checked;
      pauseEl.checked = true; // stay where we were
      render();
      pauseEl.checked = keep;
      box().scrollTop = box().scrollHeight - top;
    }
  };
  follow();
  loadLog().then(() => { if (open) render(); });

  return {
    show(on) {
      open = on;
      if (on) { unread = 0; badge('chatBadge', 0); render(); }
    },
  };
}
