// Supabase Realtime adapter: Presence tracks who is in the room, Broadcast
// carries movement and emotes. No database tables are used.
//
// Chat goes over one private channel per region ('chat:<room>', see
// openChat below). The server checks who may use it (supabase/004_chat.sql):
// everyone can read, only allowed players can send. Until that SQL has been
// run the private channel is refused, and chat stays on the public room
// channels as before.
import { createClient } from '@supabase/supabase-js';

// One client (one websocket) shared by every room we are in. cfg.accessToken
// (optional) returns the player's sign-in token, so private channels know
// who we are; without one the client connects with the public key.
const clients = new Map();
export function sharedClient(url, key, accessToken) {
  const k = url + '|' + key;
  if (!clients.has(k)) {
    clients.set(k, createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
      ...(accessToken ? { accessToken: async () => (await accessToken().catch(() => null)) || key } : {}),
    }));
  }
  return clients.get(k);
}

export function createSupabaseAdapter({ onJoin, onLeave, onState, onEmote, onLook, onChat }, cfg) {
  if (!cfg.url || !cfg.key) throw new Error('Supabase URL and publishable key are required');
  const client = sharedClient(cfg.url, cfg.key, cfg.accessToken);
  let channel = null;
  let self = null;
  let listening = false; // listen-only: receive, but don't appear in presence
  const known = new Set();

  return {
    connect({ room, self: me, listenOnly = false }) {
      self = me;
      listening = listenOnly;
      // A room we just left may still be closing on the shared client; make
      // sure we get a fresh channel rather than the old one.
      const topic = 'room:' + room;
      for (const old of client.getChannels()) {
        if (old.topic === 'realtime:' + topic || old.topic === topic) client.removeChannel(old);
      }
      channel = client.channel(topic, {
        config: { broadcast: { self: false }, presence: { key: me.id } },
      });
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const ids = new Set(Object.keys(state));
          for (const id of ids) {
            if (id === self.id || known.has(id)) continue;
            const meta = state[id][0] || {};
            known.add(id);
            onJoin({ id, name: meta.name, look: meta.look });
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
        const timeout = setTimeout(() => reject(new Error('Realtime connect timeout')), 10000);
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            if (!listening) await channel.track({ name: self.name, look: self.look });
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            reject(new Error('Realtime ' + status));
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
      if (channel) client.removeChannel(channel);
      channel = null;
    },
    // The private chat channel for a whole region: { ready, send(id, t), close() }.
    // ready turns true once the server lets us in; if it refuses, we try again
    // twice, a minute apart (a join can't be retried every second: joins on
    // one connection wait for each other).
    openChat(room, onMessage) {
      const topic = 'chat:' + room;
      const link = { ready: false, closed: false, ch: null };
      const join = (tries) => {
        if (link.closed) return;
        const ch = (link.ch = client.channel(topic, { config: { private: true, broadcast: { self: false } } }));
        ch.on('broadcast', { event: 'c' }, ({ payload }) => onMessage(payload.id, payload.t));
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
        // The server drops it unless we may chat.
        send(id, t) { link.ch?.send({ type: 'broadcast', event: 'c', payload: { id, t } }); },
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
