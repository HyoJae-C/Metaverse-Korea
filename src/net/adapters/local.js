// Test adapter: players in other tabs of the same browser see each other,
// via BroadcastChannel. No server needed.

export function createLocalAdapter({ onJoin, onLeave, onState, onEmote, onLook }) {
  let ch = null;
  let self = null;
  const peers = new Map(); // id → last seen ms
  let timer = null;
  let listening = false; // listen-only: receive, but stay invisible

  const send = (msg) => ch && ch.postMessage({ ...msg, from: self.id });
  const post = (msg) => !listening && send(msg);

  return {
    async connect({ room, self: me, listenOnly = false }) {
      self = me;
      listening = listenOnly;
      if (typeof BroadcastChannel === 'undefined') return;
      ch = new BroadcastChannel('mk-room-' + room);
      ch.onmessage = ({ data: m }) => {
        if (!m || m.from === self.id) return;
        if (m.type === 'probe') {
          if (!listening) send({ type: 'hello', peer: self, reply: true });
          return;
        }
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
      if (listening) send({ type: 'probe' }); // ask who is here without joining
      timer = setInterval(() => {
        const now = Date.now();
        for (const [id, t] of peers) {
          if (now - t > 12000) { // idle players send a heartbeat every 5 s
            peers.delete(id);
            onLeave(id);
          }
        }
      }, 2000);
      addEventListener('pagehide', () => post({ type: 'leave' }));
      // Keep idle players alive for listeners that missed their hello.
      this._beat = setInterval(() => post({ type: 'hello', peer: self, reply: true }), 8000);
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
    setListenOnly(on) {
      if (on === listening) return;
      if (on) post({ type: 'leave' });
      listening = on;
      if (!on) post({ type: 'hello', peer: self });
    },
    updateSelf(me) {
      self = me;
    },
    disconnect() {
      post({ type: 'leave' });
      clearInterval(timer);
      clearInterval(this._beat);
      ch?.close();
      ch = null;
    },
  };
}
