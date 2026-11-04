// Daily check-in and three daily missions, so there is a reason to come back
// each day (a stamp tour would end once it is complete).
//
// Missions are picked from today's date, so everyone gets the same three on
// the same day. Progress lives in this browser for now (like the wallet);
// before rewards are worth anything, move it to the server.

const KEY = 'mk.daily';
export const REWARD = { checkIn: 10, week: 30, mission: 10, allDone: 20 };

// Local calendar date, YYYY-MM-DD.
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function prevDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

// Small deterministic RNG from a string (same day -> same missions).
function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// pool: { npcs: [name], stores: [{ id, pets }] }
// Mission: { id, type, target?, need, n }
export function missionsFor(day, pool) {
  const r = rng('mk-' + day);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const list = [];
  if (pool.npcs.length) list.push({ type: 'talk', target: pick(pool.npcs), need: 1 });
  if (pool.stores.length) list.push({ type: 'visit', target: pick(pool.stores).id, need: 1 });
  const extra = ['sit', 'bike', 'emote', 'square', 'square']; // square: finish a square mission
  if (pool.stores.some((s) => s.pets)) extra.push('pet', 'pet'); // the pet cafés are popular
  list.push({ type: pick(extra), need: 1 });
  for (const m of list) {
    if (m.type === 'emote') m.need = 3;
    m.id = m.type + ':' + (m.target || '');
    m.n = 0;
  }
  return list;
}

function read() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); return s && typeof s === 'object' && !Array.isArray(s) ? s : {}; } catch { return {}; }
}
function write(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
}

export class Daily {
  // wallet: { add(n) }; pool: see missionsFor
  constructor(wallet, pool, now = () => new Date()) {
    this.wallet = wallet;
    this.pool = pool;
    this.now = now;
    this.s = read();
    this.listeners = [];
    this._roll();
  }

  // Start a new day's missions when the date changes.
  _roll() {
    const today = dayKey(this.now());
    if (this.s.day !== today || !Array.isArray(this.s.missions)) {
      this.s.day = today;
      this.s.missions = missionsFor(today, this.pool);
      this.s.bonus = false;
      write(this.s);
    }
    return today;
  }

  get missions() { this._roll(); return this.s.missions; }
  get streak() { return this.s.streak || 0; }
  checkedInToday() { return this.s.last === this._roll(); }
  // Day in the 7-day row that today's check-in is (or would be): 1..7.
  weekDay() {
    const today = this._roll();
    const cont = this.s.last === today || this.s.last === prevDay(today);
    const streak = cont ? this.streak : 0;
    const n = this.s.last === today ? streak : streak + 1;
    return ((n - 1) % 7) + 1;
  }
  allDone() { return this.missions.every((m) => m.n >= m.need); }
  // Something to see: no check-in yet today.
  hasNews() { return !this.checkedInToday(); }

  // Returns the coins earned (0 if already checked in today).
  checkIn() {
    const today = this._roll();
    if (this.s.last === today) return 0;
    this.s.streak = this.s.last === prevDay(today) ? (this.s.streak || 0) + 1 : 1;
    this.s.last = today;
    this.s.total = (this.s.total || 0) + 1;
    write(this.s);
    const coins = this.s.streak % 7 === 0 ? REWARD.week : REWARD.checkIn;
    this.wallet.add(coins, { k: 'ledger.checkIn' });
    this._emit();
    return coins;
  }

  // Report something the player did; returns { mission, coins, bonus } when
  // that finished a mission, else null. type: talk|visit|pet|sit|bike|emote
  record(type, target = '') {
    this._roll();
    const m = this.s.missions.find((x) => x.type === type && x.n < x.need && (!x.target || x.target === target));
    if (!m) return null;
    m.n += 1;
    if (m.n < m.need) { write(this.s); this._emit(); return null; }
    let coins = REWARD.mission, bonus = false;
    if (!this.s.bonus && this.allDone()) { this.s.bonus = bonus = true; coins += REWARD.allDone; }
    write(this.s);
    this.wallet.add(coins, { k: 'ledger.mission' });
    this._emit();
    return { mission: m, coins, bonus };
  }

  onChange(f) { this.listeners.push(f); }
  _emit() { this.listeners.forEach((f) => f()); }
}
