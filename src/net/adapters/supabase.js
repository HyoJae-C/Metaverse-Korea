// Supabase Realtime adapter: Presence tracks who is in the room, Broadcast
// carries movement and emotes. No database tables are used.
import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdapter({ onJoin, onLeave, onState, onEmote }, cfg) {
  if (!cfg.url || !cfg.key) throw new Error('Supabase URL and publishable key are required');
  const client = createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  let channel = null;
  let self = null;
  const known = new Set();

  return {
    connect({ room, self: me }) {
      self = me;
      channel = client.channel('room:' + room, {
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
            onJoin({ id, name: meta.name, outfit: meta.outfit });
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
        });

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Realtime connect timeout')), 10000);
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            await channel.track({ name: me.name, outfit: me.outfit });
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
    disconnect() {
      if (channel) client.removeChannel(channel);
      channel = null;
    },
  };
}
