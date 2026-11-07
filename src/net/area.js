// Area-of-interest rooms. A big street is split into square cells; each cell
// is its own realtime room. We announce ourselves and send movement only in
// the cell we stand in, and listen to that cell plus the 8 around it, so
// people nearby still see each other across cell borders.
//
// Why: realtime services bill each broadcast once per receiver, so one room
// for the whole region costs N² as it fills up. With cells, a message only
// reaches people within roughly one or two cells.
//
// The returned object has the same interface as an adapter (see ./index.js),
// plus update(x, z) to call as the player moves.
import { createNet } from './index.js';

const LEAVE_DELAY = 1500; // ms; hides the brief gap while a peer changes cell

export function cellKey(room, cellSize, x, z) {
  return `${room}@${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
}

function neighbourKeys(room, cellSize, x, z) {
  const cx = Math.floor(x / cellSize), cz = Math.floor(z / cellSize);
  const keys = [];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) keys.push(`${room}@${cx + dx},${cz + dz}`);
  return keys;
}

export async function createAreaNet(provider, handlers, cfg, { room, self, cellSize, x = 0, z = 0 }) {
  const cells = new Map(); // key → { adapter, ready: Promise }
  const peerCells = new Map(); // peer id → Set of cell keys it was seen in
  const leaveTimers = new Map();
  let ownKey = null;
  let me = { ...self };
  let closed = false;
  let chatLink = null; // the region's private chat channel (Supabase only)

  const seen = (id, key, peer) => {
    let set = peerCells.get(id);
    const isNew = !set;
    if (!set) peerCells.set(id, (set = new Set()));
    set.add(key);
    if (leaveTimers.has(id)) {
      clearTimeout(leaveTimers.get(id));
      leaveTimers.delete(id);
      return; // never told the game it left
    }
    if (isNew) handlers.onJoin(peer);
  };
  const gone = (id, key) => {
    const set = peerCells.get(id);
    if (!set) return;
    set.delete(key);
    if (set.size || leaveTimers.has(id)) return;
    leaveTimers.set(id, setTimeout(() => {
      leaveTimers.delete(id);
      if (peerCells.get(id)?.size) return;
      peerCells.delete(id);
      handlers.onLeave(id);
    }, LEAVE_DELAY));
  };
  const known = (id) => peerCells.has(id);

  async function open(key, listenOnly) {
    const cellHandlers = {
      onJoin: (peer) => seen(peer.id, key, peer),
      onLeave: (id) => gone(id, key),
      onState: (id, st) => known(id) && handlers.onState(id, st),
      onEmote: (id, e) => known(id) && handlers.onEmote(id, e),
      onLook: (id, look) => known(id) && handlers.onLook?.(id, look),
      // Room chat only while the private chat channel isn't open.
      onChat: (id, t) => !chatLink?.ready && known(id) && handlers.onChat?.(id, t),
    };
    const adapter = await createNet(provider, cellHandlers, cfg);
    const entry = { adapter, listenOnly };
    entry.ready = adapter.connect({ room: key, self: me, listenOnly }).catch((err) => {
      console.warn('Realtime cell unavailable:', key, err);
      entry.failed = true;
    });
    cells.set(key, entry);
    return entry;
  }

  function close(key) {
    const entry = cells.get(key);
    if (!entry) return;
    cells.delete(key);
    entry.adapter.disconnect();
    for (const [id, set] of peerCells) if (set.has(key)) gone(id, key);
  }

  async function moveTo(px, pz) {
    const key = cellSize ? cellKey(room, cellSize, px, pz) : room;
    if (key === ownKey) return;
    const wanted = new Set(cellSize ? neighbourKeys(room, cellSize, px, pz) : [room]);
    const prevOwn = ownKey;
    ownKey = key;
    for (const k of [...cells.keys()]) if (!wanted.has(k)) close(k);
    // Stop announcing ourselves in the old cell, start in the new one.
    if (prevOwn && cells.has(prevOwn)) cells.get(prevOwn).adapter.setListenOnly?.(true);
    const pending = [];
    for (const k of wanted) {
      const entry = cells.get(k);
      if (!entry) pending.push(open(k, k !== key).then((e) => e.ready));
      else if (k === key) entry.adapter.setListenOnly?.(false);
    }
    await Promise.all(pending);
  }

  await moveTo(x, z);
  const own = () => cells.get(ownKey)?.adapter;
  if (!own() || cells.get(ownKey).failed) throw new Error('Realtime unavailable');
  // One private chat channel for the whole region, opened a moment after the
  // rooms so its (slower, checked) join never holds up joining them.
  const chatTimer = own().openChat && setTimeout(() => {
    if (!closed) chatLink = own()?.openChat(room, (id, t) => known(id) && handlers.onChat?.(id, t));
  }, 3000);

  return {
    update(px, pz) {
      if (!closed && cellSize) moveTo(px, pz);
    },
    get chatReady() { return !!chatLink?.ready; }, // on the private chat channel (else room chat)
    sendState(st) { own()?.sendState(st); },
    sendEmote(e) { own()?.sendEmote(e); },
    sendChat(t) {
      if (chatLink?.ready) chatLink.send(me.id, t);
      else own()?.sendChat?.(t);
    },
    sendLook(look) {
      me = { ...me, look };
      for (const { adapter } of cells.values()) adapter.updateSelf?.(me);
      own()?.sendLook(look);
    },
    disconnect() {
      closed = true;
      clearTimeout(chatTimer);
      chatLink?.close();
      chatLink = null;
      for (const k of [...cells.keys()]) {
        cells.get(k).adapter.disconnect();
        cells.delete(k);
      }
      for (const t of leaveTimers.values()) clearTimeout(t);
      leaveTimers.clear();
      peerCells.clear();
    },
  };
}
