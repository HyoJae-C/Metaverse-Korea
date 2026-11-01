// Test adapter: players in other tabs of the same browser see each other,
// via BroadcastChannel. No server needed.

export function createLocalAdapter({ onJoin, onLeave, onState, onEmote, onLook }) {
  let ch = null;
  let self = null;
  const peers = new Map(); // id → last seen ms
  let timer = null;

  const post = (msg) => ch && ch.postMessage({ ...msg, from: self.id });

  return {
    async connect({ room, self: me }) {
      self = me;
      if (typeof BroadcastChannel === 'undefined') return;
      ch = new BroadcastChannel('mk-room-' + room);
      ch.onmessage = ({ data: m }) => {
        if (!m || m.from === self.id) return;
        if (!peers.has(m.from) && m.type !== 'leave') {
          peers.set(m.from, Date.now());
          if (m.type !== 'hello') post({ type: 'hello', peer: self });
        }
        peers.set(m.from, Date.now());
        if (m.type === 'hello') {
          onJoin(m.peer);
          if (!m.reply) post({ type: 'hello', peer: self, reply: true });
        } else if (m.type === 'state') onState(m.from, m.state);
        else if (m.type === 'emote') onEmote(m.from, m.emote);
        else if (m.type === 'look') onLook?.(m.from, m.look);
        else if (m.type === 'leave') {
          peers.delete(m.from);
          onLeave(m.from);
        }
      };
      post({ type: 'hello', peer: self });
      timer = setInterval(() => {
        const now = Date.now();
        for (const [id, t] of peers) {
          if (now - t > 5000) {
            peers.delete(id);
            onLeave(id);
          }
        }
      }, 2000);
      addEventListener('pagehide', () => post({ type: 'leave' }));
    },
    sendState(state) {
      post({ type: 'state', state });
    },
    sendEmote(emote) {
      post({ type: 'emote', emote });
    },
    sendLook(look) {
      self = { ...self, look };
      post({ type: 'look', look });
    },
    disconnect() {
      post({ type: 'leave' });
      clearInterval(timer);
      ch?.close();
      ch = null;
    },
  };
}
