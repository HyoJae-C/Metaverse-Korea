// A stand-in for Supabase Realtime, so the browser e2e tests don't use the
// live project's realtime messages. Supabase counts every message a test
// sends and receives against the monthly quota (about 2-3K per CI run, more
// than the Free plan's whole month on busy days in 2026-11), and once that
// quota is spent the live server throttles and the tests fail for nothing.
//
// It speaks the Phoenix protocol supabase-js uses (vsn 2.0.0: JSON frames,
// binary broadcast pushes), served through Playwright's routeWebSocket, so
// the game's own realtime code runs unchanged: joins and their replies,
// presence (state, diffs, track/untrack, leaving on close), broadcasts to
// everyone else in a topic (self: false), and a duplicate join closing the
// old one, as Phoenix does. Every browser context in one test script shares
// the same server, so two players meet here exactly as on the real one.
//
// Chat lines go through the server function room_chat_send, which on the
// real server broadcasts on 'chat:<room>' from the database. That request is
// answered here too and broadcast the same way ({ id, t, n }, n = the name
// the sender tracks in presence), so chat stays on the fake server. Other
// database calls still go to the real project: they are plain HTTP requests,
// not realtime messages.
//
// E2E_REAL_REALTIME=1 skips all of this and uses the real server (to check a
// change against Supabase itself; it costs realtime messages).
const topics = new Map(); // topic -> Map(sock -> { joinRef, key, presence, tracked, ref })
const t0 = Date.now();
export const log = []; // joins and leaves, for a failing test to print
const say = (...a) => {
  const line = `${((Date.now() - t0) / 1000).toFixed(2)}s ${a.join(' ')}`;
  log.push(line);
  if (log.length > 400) log.shift();
  if (process.env.FAKE_RT_VERBOSE) console.log('[fake-rt]', line);
};
export const stats = { sockets: 0, joins: 0, broadcasts: 0, chats: 0 };

function members(topic) {
  let m = topics.get(topic);
  if (!m) topics.set(topic, (m = new Map()));
  return m;
}
const send = (sock, msg) => { try { sock.ws.send(JSON.stringify(msg)); } catch { /* closed */ } };
const meta = (mem) => ({ metas: [{ ...mem.tracked, phx_ref: mem.ref }] });

function presenceDiff(topic, joins, leaves) {
  for (const [s, mem] of members(topic)) if (mem.presence) send(s, [mem.joinRef, null, topic, 'presence_diff', { joins, leaves }]);
}

function broadcast(topic, event, payload, from = null) {
  stats.broadcasts++;
  for (const [s, mem] of members(topic)) if (s !== from) send(s, [mem.joinRef, null, topic, 'broadcast', { type: 'broadcast', event, payload }]);
}

// supabase-js sends broadcasts as binary frames (kind 3 = user push).
function decodeBinaryPush(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let o = 0;
  if (v.getUint8(o++) !== 3) return null;
  const jl = v.getUint8(o++), rl = v.getUint8(o++), tl = v.getUint8(o++), el = v.getUint8(o++), ml = v.getUint8(o++), enc = v.getUint8(o++);
  const dec = new TextDecoder();
  const take = (n) => { const s = dec.decode(buf.subarray(o, o + n)); o += n; return s; };
  const joinRef = take(jl), ref = take(rl), topic = take(tl), event = take(el); take(ml);
  const payload = enc === 1 ? JSON.parse(dec.decode(buf.subarray(o))) : null;
  return { joinRef, ref, topic, event, payload };
}

function serve(name, joinDelay) {
  return (ws) => {
    stats.sockets++;
    const sock = { ws, name, joined: new Map() }; // topic -> joinRef
    const leave = (topic) => {
      const m = members(topic);
      const mem = m.get(sock);
      if (!mem) return;
      m.delete(sock);
      sock.joined.delete(topic);
      if (mem.tracked) presenceDiff(topic, {}, { [mem.key]: meta(mem) });
    };
    ws.onMessage((raw) => {
      if (typeof raw !== 'string') {
        const p = decodeBinaryPush(Buffer.from(raw));
        if (!p) return;
        const mem = members(p.topic).get(sock);
        if (!mem || mem.joinRef !== p.joinRef) { say(name, 'dropped broadcast (not joined)', p.topic, p.event); return; }
        broadcast(p.topic, p.event, p.payload, sock);
        return;
      }
      const [joinRef, ref, topic, event, payload] = JSON.parse(raw);
      const reply = (response = {}, status = 'ok') => send(sock, [joinRef, ref, topic, 'phx_reply', { status, response }]);
      if (topic === 'phoenix') return reply(); // heartbeat
      const mem = members(topic).get(sock);
      if (event === 'phx_join') {
        stats.joins++;
        say(name, 'join', topic.replace('realtime:', ''));
        // Answer a moment later, as a real server does (code that assumes an
        // instant join would pass here and fail live).
        setTimeout(() => {
          if (sock.joined.has(topic)) { // duplicate join: Phoenix closes the old one
            send(sock, [members(topic).get(sock).joinRef, null, topic, 'phx_close', {}]);
            leave(topic);
          }
          const cfg = payload?.config || {};
          members(topic).set(sock, { joinRef, key: cfg.presence?.key || '', presence: !!cfg.presence?.enabled });
          sock.joined.set(topic, joinRef);
          reply({ postgres_changes: [] });
          if (cfg.presence?.enabled) {
            const state = {};
            for (const [, m] of members(topic)) if (m.tracked) state[m.key] = meta(m);
            send(sock, [joinRef, null, topic, 'presence_state', state]);
          }
        }, joinDelay);
        return;
      }
      if (event === 'phx_leave') {
        say(name, 'leave', topic.replace('realtime:', ''));
        reply();
        if (mem && mem.joinRef === joinRef) leave(topic);
        return;
      }
      if (event === 'presence') {
        reply();
        if (!mem || mem.joinRef !== joinRef) return;
        if (payload.event === 'track') {
          const was = mem.tracked ? meta(mem) : null;
          mem.tracked = payload.payload;
          mem.ref = Math.random().toString(36).slice(2);
          presenceDiff(topic, { [mem.key]: meta(mem) }, was ? { [mem.key]: was } : {});
        } else if (payload.event === 'untrack' && mem.tracked) {
          const was = meta(mem);
          mem.tracked = null;
          presenceDiff(topic, {}, { [mem.key]: was });
        }
        return;
      }
      if (event === 'broadcast') { // a JSON broadcast (older clients)
        if (mem && mem.joinRef === joinRef) broadcast(topic, payload.event, payload.payload, sock);
        return reply();
      }
      reply(); // access_token and anything else
    });
    ws.onClose(() => { for (const topic of [...sock.joined.keys()]) leave(topic); });
  };
}

// The name a player tracks in presence (the real function reads it from
// player_names; the game tracks the same name).
function nameOf(netId) {
  for (const m of topics.values()) for (const mem of m.values()) if (mem.key === netId && mem.tracked?.name) return mem.tracked.name;
  return null;
}

export const realRealtime = () => !!process.env.E2E_REAL_REALTIME;

// Route one browser context's realtime traffic to the fake server. name is
// only for the log. Call before the page loads.
export async function useFakeRealtime(ctx, name = 'player', { joinDelay = 120 } = {}) {
  if (realRealtime()) return;
  await ctx.routeWebSocket(/supabase\.co\/realtime\//, serve(name, joinDelay));
  await ctx.route(/supabase\.co\/rest\/v1\/rpc\/room_chat_send/, async (route) => {
    let body = {};
    try { body = route.request().postDataJSON() || {}; } catch { /* empty */ }
    const t = String(body.msg || '').trim().slice(0, 200);
    if (!body.room || !body.net_id || !t) return route.fulfill({ status: 200, contentType: 'application/json', body: '"empty"' });
    stats.chats++;
    broadcast('realtime:chat:' + body.room, 'c', { id: body.net_id, t, n: nameOf(body.net_id) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '"ok"' });
  });
}

export const summary = () => (realRealtime()
  ? 'realtime: live Supabase server (E2E_REAL_REALTIME)'
  : `realtime: fake server (${stats.sockets} sockets, ${stats.joins} joins, ${stats.broadcasts} broadcasts, ${stats.chats} chat lines; 0 sent to Supabase)`);
