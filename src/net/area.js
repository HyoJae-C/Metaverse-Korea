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
const RETRY_MS = 8000; // a cell that couldn't be joined is tried again after this

// Crowds are split into groups. Realtime services count every message once
// per receiver, so a crowd of k people costs about k² messages: with
// Supabase's per-second limit that is reached by a dozen people standing at
// the spawn point. When we see CROWD_CAP or more people around us, we move to
// the next group: the same streets on their own channels ('…~1', '…~2'), so
// we see that group and they see us. A dozen people still makes a busy street.
export const CROWD_CAP = 12;
export const MAX_GROUPS = 6;
const CROWD_CHECK_MS = 1500; // let presence arrive before counting

export const groupKey = (key, group) => (group ? `${key}~${group}` : key);

export function cellKey(room, cellSize, x, z) {
  return `${room}@${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
}

function neighbourKeys(room, cellSize, x, z) {
  const cx = Math.floor(x / cellSize), cz = Math.floor(z / cellSize);
  const keys = [];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) keys.push(`${room}@${cx + dx},${cz + dz}`);
  return keys;
}

export async function createAreaNet(provider, handlers, cfg, { room, self, cellSize, x = 0, z = 0, privateChat = true }) {
  const cells = new Map(); // key → { adapter, ready: Promise }
  const peerCells = new Map(); // peer id → Set of cell keys it was seen in
  const leaveTimers = new Map();
  let ownKey = null;
  let me = { ...self };
  let closed = false;
  let chatLink = null; // the region's private chat channel (Supabase only)
  let group = 0; // which crowd group we are in (see CROWD_CAP)
  let at = { x, z };
  let crowdTimer = null;

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
  const visible = () => { let n = 0; for (const set of peerCells.values()) if (set.size) n++; return n; };

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
      entry.failed = true;
      if (closed || cells.get(key) !== entry) return; // closed while joining: nothing to report
      console.warn('Realtime cell unavailable:', key, err);
      // Try that cell again in a while, if we still want it by then.
      entry.retry = setTimeout(() => {
        if (closed || cells.get(key) !== entry) return;
        close(key);
        open(key, key !== ownKey);
      }, RETRY_MS);
    });
    cells.set(key, entry);
    return entry;
  }

  function close(key) {
    const entry = cells.get(key);
    if (!entry) return;
    cells.delete(key);
    clearTimeout(entry.retry);
    entry.adapter.disconnect();
    for (const [id, set] of peerCells) if (set.has(key)) gone(id, key);
  }

  async function moveTo(px, pz) {
    at = { x: px, z: pz };
    const key = groupKey(cellSize ? cellKey(room, cellSize, px, pz) : room, group);
    if (key === ownKey) return;
    const wanted = new Set((cellSize ? neighbourKeys(room, cellSize, px, pz) : [room]).map((k) => groupKey(k, group)));
    const prevOwn = ownKey;
    ownKey = key;
    for (const k of [...cells.keys()]) if (!wanted.has(k)) close(k);
    // Stop announcing ourselves in the old cell, start in the new one.
    if (prevOwn && cells.has(prevOwn)) cells.get(prevOwn).adapter.setListenOnly?.(true);
    let mine = null;
    // Our own cell first: joins on one connection are answered in order.
    for (const k of [key, ...[...wanted].filter((k) => k !== key)]) {
      const entry = cells.get(k);
      if (!entry) {
        const opening = open(k, k !== key);
        if (k === key) mine = opening.then((e) => e.ready);
      } else if (k === key) entry.adapter.setListenOnly?.(false);
    }
    // Only our own cell is waited for: that's where we are seen and send
    // from. The cells around us join in the background; one that is slow to
    // answer used to hold everything up for its full timeout, and all we
    // sent meanwhile went nowhere.
    await mine;
  }

  // Too many people around us right after we arrived: move on to the next
  // group. Only the newcomer moves (on joining the region, and again if the
  // next group is full too), so a crowd that is already there stays together.
  function checkCrowd() {
    clearTimeout(crowdTimer);
    crowdTimer = setTimeout(() => {
      if (closed || visible() < CROWD_CAP || group >= MAX_GROUPS - 1) return;
      group += 1;
      for (const k of [...cells.keys()]) close(k);
      ownKey = null;
      moveTo(at.x, at.z).then(checkCrowd);
    }, CROWD_CHECK_MS);
  }

  await moveTo(x, z);
  const own = () => cells.get(ownKey)?.adapter;
  if (!own() || cells.get(ownKey).failed) {
    // Leave every cell we opened: one that gets in late would otherwise
    // show us to others, frozen where we joined, while we play solo.
    for (const k of [...cells.keys()]) close(k);
    closed = true;
    for (const [id, t] of leaveTimers) { clearTimeout(t); handlers.onLeave(id); }
    leaveTimers.clear();
    peerCells.clear();
    throw new Error('Realtime unavailable');
  }
  checkCrowd();
  // One private chat channel for the whole region, opened a moment after the
  // rooms so its (slower, checked) join never holds up joining them.
  const chatTimer = privateChat && own().openChat && setTimeout(() => {
    // n: the sender's real name, added by the server (019_chat_names.sql).
    if (!closed) chatLink = own()?.openChat(room, (id, t, n) => known(id) && handlers.onChat?.(id, t, n));
  }, 3000);

  return {
    update(px, pz) {
      if (!closed && cellSize) moveTo(px, pz);
    },
    get chatReady() { return !!chatLink?.ready; }, // on the private chat channel (else room chat)
    get peers() { return visible(); }, // people we can see right now
    get group() { return group; },
    // Nobody around: send nothing. Supabase counts every broadcast once when
    // sent, even into an empty room, and most play time is spent alone, so
    // this was most of the month's realtime messages. Whoever arrives makes
    // the game resend our state at once (main.js: onJoin clears lastSent).
    sendState(st) { if (visible()) own()?.sendState(st); },
    sendEmote(e) { if (visible()) own()?.sendEmote(e); },
    sendChat(t) {
      if (chatLink?.ready) chatLink.send(me.id, t, cfg.claimChatId);
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
      clearTimeout(crowdTimer);
      chatLink?.close();
      chatLink = null;
      for (const k of [...cells.keys()]) {
        clearTimeout(cells.get(k).retry);
        cells.get(k).adapter.disconnect();
        cells.delete(k);
      }
      for (const t of leaveTimers.values()) clearTimeout(t);
      leaveTimers.clear();
      peerCells.clear();
    },
  };
}
