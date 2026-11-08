// The operator page's Chat tab: public chat as it is sent, live. Nothing is
// stored; the page listens on the same private realtime channels the games
// use ('chat:<room>', supabase/004_chat.sql and 019_chat_names.sql), so it
// only shows lines sent while it is open. Friend messages are not public and
// are not shown.
//
// The street is one room; each shop or café is its own room
// ('<region>-<store id>'). There are too many shops to listen to all of them
// at once, so the page listens to the street always, and to a shop's room
// while someone is in it (from the live player spots, ops_where).

export const MAX_ROOMS = 60; // channels open at once (the street plus shops)
export const MAX_LINES = 500; // lines kept on the page
const PLACES_MS = 10000; // how often to look where people are
const KEEP_MS = 5 * 60000; // keep listening to an emptied shop this long

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

// A message off the channel, cleaned for showing: { name, text } or null.
export function chatLine(payload) {
  const text = String(payload?.t ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
  if (!text) return null;
  const name = String(payload?.n ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 32);
  return { name: name || '?', text };
}

export function createChatPanel({ client, region, $, describePlace, badge, setStatus }) {
  const listEl = $('chatList'), filterEl = $('chatQ'), pauseEl = $('chatPause');
  const channels = new Map(); // room → channel
  const lastSeen = new Map(); // place → ms it last had someone in it
  const lines = []; // { at, place, name, text, id }
  let open = false, unread = 0, placesTimer = 0;

  const matches = (l) => {
    const q = filterEl.value.trim().toLowerCase();
    return !q || l.text.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || describePlace(l.place).toLowerCase().includes(q);
  };
  function row(l) {
    const tr = document.createElement('tr');
    const cell = (text, cls) => { const td = document.createElement('td'); if (cls) td.className = cls; td.textContent = text; tr.append(td); };
    cell(new Date(l.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 'muted');
    cell(l.place === 'street' ? '🚶 Street' : '🏠 ' + describePlace(l.place).replace(/^In /, ''));
    cell(l.name, 'who');
    cell(l.text);
    return tr;
  }
  function render() {
    const shown = lines.filter(matches);
    listEl.replaceChildren(...shown.map(row));
    $('chatEmpty').hidden = shown.length > 0;
    $('chatCount').textContent = `${lines.length} line${lines.length === 1 ? '' : 's'} since this page opened · listening to ${channels.size} room${channels.size === 1 ? '' : 's'}`;
    stick();
  }
  const box = () => listEl.closest('.chatbox');
  function stick() { if (!pauseEl.checked) box().scrollTop = box().scrollHeight; }

  function heard(room, payload) {
    const l = chatLine(payload);
    if (!l) return;
    const line = { at: Date.now(), place: roomPlace(region, room), id: String(payload?.id ?? ''), ...l };
    lines.push(line);
    if (lines.length > MAX_LINES) { lines.splice(0, lines.length - MAX_LINES); if (open) render(); }
    if (open) {
      if (matches(line)) { listEl.append(row(line)); $('chatEmpty').hidden = true; stick(); }
      $('chatCount').textContent = `${lines.length} lines since this page opened · listening to ${channels.size} rooms`;
    } else badge('chatBadge', ++unread);
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
    if (open) $('chatCount').textContent = `${lines.length} lines since this page opened · listening to ${channels.size} rooms`;
  }

  filterEl.oninput = render;
  pauseEl.onchange = stick;
  $('chatClear').onclick = () => { lines.length = 0; render(); };
  follow();

  return {
    show(on) {
      open = on;
      if (on) { unread = 0; badge('chatBadge', 0); render(); }
    },
  };
}
