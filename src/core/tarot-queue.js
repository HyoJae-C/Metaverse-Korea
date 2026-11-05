// Tarot café turns and readings together.
//
// The queue: while a reading table is taken, the next people take a number and
// wait (there are chairs for it). Everyone's number travels in their state
// ('tq', the time they took it), so every screen sorts the same line. When a
// table frees up, the first in line has TURN_MS to sit down; after that their
// number is dropped and the next person is called. With nobody in line anyone
// can sit at a free table.
//
// Reading together: two friends at one table. Messages ride on the emote
// channel as 'tarot:<verb>:<to id>[:<a>[:<b>]]'.

export const TURN_MS = 10000;

const VERBS = ['invite', 'join', 'deal', 'pick', 'bye', 'no'];
export function parseTarot(e) {
  const m = /^tarot:(invite|join|deal|pick|bye|no):([\w-]{1,64})(?::([\w-]{1,32}))?(?::(\d{1,10}))?$/.exec(String(e));
  return m && VERBS.includes(m[1]) ? { verb: m[1], to: m[2], a: m[3] ?? null, b: m[4] != null ? Number(m[4]) : null } : null;
}
export const tarotMsg = (verb, to, a, b) => `tarot:${verb}:${to}${a != null ? ':' + a : ''}${b != null ? ':' + b : ''}`;

export class TarotQueue {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.called = new Map(); // id → when their turn came (they reached the front with a table free)
    this.dropped = new Map(); // id → the ticket that ran out (ignored until they take a new one)
  }

  // line: [{ id, tq }] of everyone holding a number (me too), freeTables: how
  // many tables nobody sits at. Returns { order, callable, expired }: the line
  // in order, who may sit now, and whose time just ran out.
  update(line, freeTables) {
    const now = this.now();
    const order = line
      .filter((p) => p.tq && this.dropped.get(p.id) !== p.tq)
      .sort((a, b) => a.tq - b.tq || (a.id < b.id ? -1 : 1));
    const expired = [];
    const callable = [];
    for (const p of order) {
      if (callable.length >= freeTables) break;
      const since = this.called.get(p.id);
      if (since == null) this.called.set(p.id, now);
      else if (now - since > TURN_MS) { this.dropped.set(p.id, p.tq); this.called.delete(p.id); expired.push(p.id); continue; }
      callable.push(p.id);
    }
    // Anyone not at the front (any more) starts the clock again when called.
    for (const id of [...this.called.keys()]) if (!callable.includes(id)) this.called.delete(id);
    return { order: order.filter((p) => !expired.includes(p.id)).map((p) => p.id), callable, expired };
  }

  // May `id` sit at a free table? Yes when nobody waits, or when it's their turn.
  maySit(id, result) {
    return result.order.length === 0 || result.callable.includes(id);
  }

  // Seconds left for someone who has been called.
  secondsLeft(id) {
    const since = this.called.get(id);
    return since == null ? null : Math.max(0, Math.ceil((TURN_MS - (this.now() - since)) / 1000));
  }
}
