// Supabase Realtime adapter: Presence tracks who is in the room, Broadcast
// carries movement and emotes. No database tables are used.
//
// Chat goes over one private channel per region ('chat:<room>', see
// openChat below). The server checks who may use it (supabase/004_chat.sql):
// everyone can read, only allowed players can send. Until that SQL has been
// run the private channel is refused, and chat stays on the public room
// channels as before. With supabase/019_chat_names.sql a message is sent
// through the server function room_chat_send, which checks the player id
// belongs to the sender's account and adds their real name, so nobody can
// chat in someone else's name.
import { createClient } from '@supabase/supabase-js';

// One client (one websocket) shared by every room we are in. cfg.accessToken
// (optional) returns the player's sign-in token, so private channels and the
// chat function know who we are; without one the client uses the public key.
// The first caller may not have a token getter (the online counter starts
// before any room), so the getter is kept per client and filled in by
// whoever brings one: otherwise every later room would reuse a client that
// speaks as nobody, and room_chat_send (signed-in players only) would refuse
// every line.
const clients = new Map();
export function sharedClient(url, key, accessToken) {
  const k = url + '|' + key;
  let entry = clients.get(k);
  if (!entry) {
    entry = { token: null, client: null };
    entry.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
      accessToken: async () => (entry.token ? (await entry.token().catch(() => null)) : null) || key,
    });
    clients.set(k, entry);
  }
  if (accessToken && entry.token !== accessToken) {
    entry.token = accessToken;
    entry.client.realtime.setAuth().catch(() => {}); // the socket picks the token up now
  }
  return entry.client;
}

// PostgREST's answer when an rpc function doesn't exist (SQL not run yet).
export const isMissingFunction = (error) => error?.code === 'PGRST202' || error?.code === '42883' || /could not find the function/i.test(error?.message || '');

// How long a room join may take (the client's own join timeout is the same).
// A cell that gives up is tried again by net/area.js.
const CONNECT_TIMEOUT = 10000;

export function createSupabaseAdapter({ onJoin, onLeave, onState, onEmote, onLook, onChat }, cfg) {
  if (!cfg.url || !cfg.key) throw new Error('Supabase URL and publishable key are required');
  const client = sharedClient(cfg.url, cfg.key, cfg.accessToken);
  let channel = null;
  let self = null;
  let listening = false; // listen-only: receive, but don't appear in presence
  const known = new Set();
  // Movement that arrived before its sender's presence did (presence diffs
  // can lag behind broadcasts): kept, and played as soon as they appear, so
  // a newcomer isn't left standing at the map's origin until they move again.
  const early = new Map(); // id -> latest state
  const EARLY_MAX = 64;
  let gone = false; // disconnect() was called

  return {
    async connect({ room, self: me, listenOnly = false }) {
      self = me;
      listening = listenOnly;
      // A room we just left may still be closing on the shared client. Wait
      // until it is gone: until the server confirms the leave,
      // client.channel() hands the closing channel back, and subscribing to
      // that does nothing, so the join "timed out" without being sent.
      const topic = 'room:' + room;
      const closing = client.getChannels().filter((old) => old.topic === 'realtime:' + topic || old.topic === topic);
      if (closing.length) await Promise.all(closing.map((old) => client.removeChannel(old).catch(() => {})));
      if (gone) throw new Error('Realtime disconnected');
      const ch = (channel = client.channel(topic, {
        config: { broadcast: { self: false }, presence: { key: me.id } },
      }));
      ch
        .on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState();
          const ids = new Set(Object.keys(state));
          for (const id of ids) {
            if (id === self.id || known.has(id)) continue;
            const meta = state[id][0] || {};
            known.add(id);
            onJoin({ id, name: meta.name, look: meta.look });
            if (early.has(id)) {
              const st = early.get(id);
              early.delete(id);
              onState(id, st);
            }
          }
          for (const id of [...known]) {
            if (!ids.has(id)) {
              known.delete(id);
              onLeave(id);
            }
          }
        })
        .on('broadcast', { event: 's' }, ({ payload }) => {
          if (known.has(payload.id)) onState(payload.id, payload.st);
          else if (payload?.id && payload.id !== self.id) {
            early.delete(payload.id); // (re-inserted last: the oldest go first)
            early.set(payload.id, payload.st);
            if (early.size > EARLY_MAX) early.delete(early.keys().next().value);
          }
        })
        .on('broadcast', { event: 'e' }, ({ payload }) => {
          if (known.has(payload.id)) onEmote(payload.id, payload.e);
        })
        .on('broadcast', { event: 'l' }, ({ payload }) => {
          if (known.has(payload.id)) onLook?.(payload.id, payload.look);
        })
        .on('broadcast', { event: 'c' }, ({ payload }) => {
          if (known.has(payload.id)) onChat?.(payload.id, payload.t);
        });

      return new Promise((resolve, reject) => {
        let settled = false;
        const fail = (why) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          // Leave for good. Otherwise the client keeps retrying the join in
          // the background, and when it gets in later we would be in the
          // room's presence (others see us, standing still at the origin)
          // while the game, told we failed, sends our movement nowhere.
          if (channel === ch) channel = null;
          client.removeChannel(ch).catch(() => {});
          reject(new Error('Realtime ' + why));
        };
        const timeout = setTimeout(() => fail('connect timeout'), CONNECT_TIMEOUT);
        ch.subscribe(async (status) => {
          if (channel !== ch) return gone && fail('disconnected');
          if (status === 'SUBSCRIBED') {
            // Also after the client rejoined by itself (a network blip): the
            // server forgot our presence then, so announce ourselves again.
            if (!listening) await ch.track({ name: self.name, look: self.look });
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              resolve();
            }
          } else if (!settled && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
            fail(status);
          }
        });
      });
    },
    sendState(st) {
      channel?.send({ type: 'broadcast', event: 's', payload: { id: self.id, st } });
    },
    sendEmote(e) {
      channel?.send({ type: 'broadcast', event: 'e', payload: { id: self.id, e } });
    },
    sendChat(t) {
      channel?.send({ type: 'broadcast', event: 'c', payload: { id: self.id, t } });
    },
    sendLook(look) {
      self = { ...self, look };
      channel?.send({ type: 'broadcast', event: 'l', payload: { id: self.id, look } });
      if (!listening) channel?.track({ name: self.name, look }); // so newcomers see it too
    },
    setListenOnly(on) {
      if (on === listening) return;
      listening = on;
      if (on) channel?.untrack();
      else channel?.track({ name: self.name, look: self.look });
    },
    updateSelf(me) {
      self = me;
    },
    disconnect() {
      gone = true;
      if (channel) client.removeChannel(channel);
      channel = null;
      early.clear();
    },
    // The private chat channel for a whole region: { ready, send(id, t), close() }.
    // ready turns true once the server lets us in; if it refuses, we try again
    // twice, a minute apart (a join can't be retried every second: joins on
    // one connection wait for each other).
    openChat(room, onMessage) {
      const topic = 'chat:' + room;
      const link = { ready: false, closed: false, ch: null };
      let direct = false; // the server function isn't set up: send on the channel
      const join = (tries) => {
        if (link.closed) return;
        const ch = (link.ch = client.channel(topic, { config: { private: true, broadcast: { self: false } } }));
        ch.on('broadcast', { event: 'c' }, ({ payload }) => onMessage(payload.id, payload.t, payload.n));
        ch.subscribe((status, err) => {
          if (ch !== link.ch) return;
          if (status === 'SUBSCRIBED') link.ready = true;
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (!link.ready) console.info('[chat] private channel not available, using room chat:', err?.message || status);
            link.ready = false;
            link.ch = null;
            setTimeout(() => client.removeChannel(ch), 0);
            if (tries < 2) setTimeout(() => join(tries + 1), 60000);
          }
        });
      };
      join(0);
      return {
        get ready() { return link.ready; },
        // Through the server (019_chat_names.sql), which stamps who sent it.
        // Before that SQL is run the function doesn't exist: send on the
        // channel directly, where the server drops it unless we may chat.
        // claim() re-claims our id when the server doesn't know it yet.
        async send(id, t, claim) {
          if (!direct) {
            const say = () => client.rpc('room_chat_send', { room, net_id: id, msg: t });
            let { data, error } = await say();
            if (!error && data === 'id' && claim && (await claim()) === 'ok') ({ data, error } = await say());
            if (!error) {
              if (data !== 'ok') console.warn('[chat] server refused the line:', data);
              return data;
            }
            if (!isMissingFunction(error)) { console.warn('[chat] could not send:', error.message || error); return 'error'; }
            direct = true;
          }
          link.ch?.send({ type: 'broadcast', event: 'c', payload: { id, t } });
          return 'ok';
        },
        close() {
          link.closed = true;
          link.ready = false;
          if (link.ch) client.removeChannel(link.ch);
          link.ch = null;
        },
      };
    },
  };
}
