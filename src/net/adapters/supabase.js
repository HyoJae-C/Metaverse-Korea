// Supabase Realtime adapter: Presence tracks who is in the room, Broadcast
// carries movement and emotes. No database tables are used.
//
// Chat goes over a second, private channel per room ('chat:<room>'). The
// server checks who may use it (supabase/004_chat.sql): everyone can read,
// only players signed in with Google (and not banned) can send. Until that
// SQL has been run the private channel is refused, and chat falls back to
// the public room channel as before.
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
  let chatChannel = null; // the private chat channel we asked to join
  let chat = null; // ...once the server let us in
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
      const chatTopic = 'chat:' + room;
      for (const old of client.getChannels()) {
        if ([topic, chatTopic].some((t) => old.topic === 'realtime:' + t || old.topic === t)) client.removeChannel(old);
      }
      openChat(chatTopic);
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
          // Old way (public room channel): only while the private one is not open.
          if (!chat && known.has(payload.id)) onChat?.(payload.id, payload.t);
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
      // The server drops it on the private channel unless we may chat.
      (chat || channel)?.send({ type: 'broadcast', event: 'c', payload: { id: self.id, t } });
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
      if (chatChannel) client.removeChannel(chatChannel);
      channel = chat = chatChannel = null;
    },
  };

  // Joins the private chat channel. If the server refuses (its SQL isn't set
  // up yet) we chat on the public room channel instead, and try the private
  // one again a few times later rather than letting it retry every second.
  function openChat(topic, tries = 0) {
    const ch = (chatChannel = client.channel(topic, { config: { private: true, broadcast: { self: false } } }));
    ch.on('broadcast', { event: 'c' }, ({ payload }) => {
      if (known.has(payload.id)) onChat?.(payload.id, payload.t);
    });
    ch.subscribe((status) => {
      if (ch !== chatChannel) return;
      if (status === 'SUBSCRIBED') chat = ch;
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        chat = chatChannel = null;
        client.removeChannel(ch);
        if (tries < 2) setTimeout(() => { if (channel && !chatChannel) openChat(topic, tries + 1); }, 30000);
      }
    });
  }
}
