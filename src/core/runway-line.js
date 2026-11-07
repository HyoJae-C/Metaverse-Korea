// Walking the Curve Runway with friends: a line of up to four, one walker at
// a time, the rest waiting backstage or watching from the seats. There is no
// server for it: everyone in the room keeps their own copy, from short
// emotes. Each person in the line says 'rwq:hi:<joined at>:<walking 0|1>'
// every LINE_HI_S seconds, 'rwq:bye' on leaving it, and 'rwq:score:<n>'
// after a walk. The order is by when people joined; it is your turn when
// nobody is walking and you are first. Someone not heard from for a while
// (left the room, closed the game) drops out.
export const MAX_LINE = 4;
export const LINE_HI_S = 1.5;
export const STALE_MS = 6000;
export const RECENT = 4; // walks kept on the board

export const lineMsg = {
  hi: (at, walking) => `rwq:hi:${Math.round(at)}:${walking ? 1 : 0}`,
  bye: () => 'rwq:bye',
  score: (n) => `rwq:score:${Math.max(0, Math.min(100, Math.round(n)))}`,
};
export function parseLineMsg(e) {
  if (typeof e !== 'string' || !e.startsWith('rwq:')) return null;
  const [, k, a, b] = e.split(':');
  if (k === 'bye') return { k };
  if (k === 'hi') {
    const at = Number(a);
    return Number.isFinite(at) ? { k, at, walking: b === '1' } : null;
  }
  if (k === 'score') {
    const n = Number(a);
    return Number.isFinite(n) && n >= 0 && n <= 100 ? { k, n: Math.round(n) } : null;
  }
  return null;
}

export class RunwayLine {
  constructor(myId) {
    this.me = myId;
    this.people = new Map(); // id → { at, walking, seen }
    this.recent = []; // [{ id, n }] newest first
  }
  has(id = this.me) { return this.people.has(id); }
  // Join the line (false when it is full).
  join(now) {
    if (this.has()) return true;
    if (this.order(now).length >= MAX_LINE) return false;
    this.people.set(this.me, { at: now, walking: false, seen: now });
    return true;
  }
  leave() { this.people.delete(this.me); }
  setWalking(on) { const p = this.people.get(this.me); if (p) p.walking = on; }
  get mine() { return this.people.get(this.me) || null; }
  // A message from someone else in the room.
  heard(id, m, now) {
    if (id === this.me || !m) return;
    if (m.k === 'bye') this.people.delete(id);
    else if (m.k === 'hi') {
      // (a walker already counted stays even past four: they got in first)
      if (!this.people.has(id) && !m.walking && this.order(now).length >= MAX_LINE) return;
      this.people.set(id, { at: m.at, walking: m.walking, seen: now });
    } else if (m.k === 'score') this.addScore(id, m.n);
  }
  addScore(id, n) {
    this.recent.unshift({ id, n });
    this.recent.length = Math.min(this.recent.length, RECENT);
  }
  // The board: the latest walks, best first.
  board() { return [...this.recent].sort((a, b) => b.n - a.n); }
  // Everyone in line, walker first, then by when they joined.
  order(now) {
    for (const [id, p] of this.people) if (id !== this.me && now - p.seen > STALE_MS) this.people.delete(id);
    return [...this.people].map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => (b.walking - a.walking) || (a.at - b.at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  // My place in line from 0 (null when not in it).
  place(now) {
    const i = this.order(now).findIndex((p) => p.id === this.me);
    return i < 0 ? null : i;
  }
  // My turn: in line, first, and nobody walking.
  myTurn(now) {
    const o = this.order(now);
    return o.length > 0 && o[0].id === this.me && !o[0].walking;
  }
  clear() { this.people.clear(); this.recent.length = 0; }
}
