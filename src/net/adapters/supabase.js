// Supabase Realtime adapter: Presence tracks who is in the room, Broadcast
// carries movement and emotes. No database tables are used.
import { createClient } from '@supabase/supabase-js';

// One client (one websocket) shared by every room we are in.
const clients = new Map();
export function sharedClient(url, key) {
  const k = url + '|' + key;
  if (!clients.has(k)) {
    clients.set(k, createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    }));
  }
  return clients.get(k);
}

export function createSupabaseAdapter({ onJoin, onLeave, onState, onEmote, onLook, onChat }, cfg) {
  if (!cfg.url || !cfg.key) throw new Error('Supabase URL and publishable key are required');
  const client = sharedClient(cfg.url, cfg.key);
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
  };
}
