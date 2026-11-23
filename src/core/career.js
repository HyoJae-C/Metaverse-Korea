// Jobs (직업, Yozi 2026-11-21): rules and keepers. No DOM, unit-tested.
//
// Effort is not capped: part-time shifts have no daily limit. Pick one job
// at an Information Center (change it once a week); shifts of your job pay a
// bonus that grows with its skill level and give skill points, other shifts
// pay the base rate. Pay follows the time a shift takes, so an hour earns
// about the same in every job: base ₩25k an hour, your job Lv1 ₩30k, Lv3
// ₩40k, Lv5 ₩50k, Lv10 ₩60k. The first five shifts a day pay ₩5,000 each.
//
// On the server (supabase/065_jobs.sql, the same numbers) the server times
// each shift and pays it with a receipt. Without the server (local play,
// tests, or before the SQL is run) LocalCareer keeps it in this browser.
//
// Every keeper answers the same:
//   info()                 → { job, next, skills: { job: { xp, shifts } }, today } or { error }
//   choose(job)            → { job, next } or { error: 'same' | 'wait' | ..., next? }
//   start(job, store)      → { run } or { error: 'busy' | ... }
//   finish(run, score, note) → { paid, xp, lv, up } or { error: 'fast' | ... }

export const CAREER_JOBS = ['delivery', 'mart', 'serving'];
export const JOB_ICON = { delivery: '🛵', mart: '🏪', serving: '🍽️' };
export const LEVELS = [ // { lv, xp needed, pay x base for your own job }
  { lv: 1, xp: 0, mult: 1.2 }, { lv: 2, xp: 20, mult: 1.4 }, { lv: 3, xp: 60, mult: 1.6 },
  { lv: 4, xp: 200, mult: 1.8 }, { lv: 5, xp: 450, mult: 2.0 }, { lv: 6, xp: 750, mult: 2.1 },
  { lv: 7, xp: 1100, mult: 2.2 }, { lv: 8, xp: 1500, mult: 2.3 }, { lv: 9, xp: 1950, mult: 2.35 },
  { lv: 10, xp: 2500, mult: 2.4 },
];
export const PER_MIN = 420; // won a minute at the base rate (₩25k an hour)
export const STD_SEC = { delivery: 80, mart: 90, serving: 90 }; // seconds a shift is paid for, at most
export const FIRST_N = 5, FIRST_PAY = 5000; // the day's first shifts, as before jobs
export const MIN_SEC = { delivery: 15, mart: 25, serving: 25 }; // faster than this pays nothing (not a person)
export const CHANGE_DAYS = 7;
const DAY = 864e5;

export const levelOf = (xp, levels = LEVELS) => {
  let lv = levels[0];
  for (const l of levels) if ((xp || 0) >= l.xp) lv = l;
  return lv;
};
// { lv, mult, xp, into (points into this level), need (points for the next; 0 at the top) }
export function skillOf(xp = 0, levels = LEVELS) {
  const l = levelOf(xp, levels), next = levels.find((x) => x.lv === l.lv + 1);
  return { lv: l.lv, mult: l.mult, xp, into: xp - l.xp, need: next ? next.xp - l.xp : 0 };
}
export const bonusPct = (mult) => Math.round((mult - 1) * 100);
// Won an hour: your job at a level, or the base rate (lv null).
export const hourly = (lv, levels = LEVELS) => Math.round(PER_MIN * 60 * (lv ? levels.find((l) => l.lv === lv)?.mult || 1 : 1) / 1000) * 1000;
// Skill points for a shift of your own job: 1..3 by how well it went.
export const xpFor = (score) => 1 + Math.round(2 * Math.max(0, Math.min(score, 1)));

// Pay for one shift. todayN: shifts already paid today; sec: how long it took.
export function shiftPayFor({ job, sec, score, mine, xp = 0, todayN = 0 }) {
  if (sec < (MIN_SEC[job] ?? 40)) return 0;
  if (todayN < FIRST_N) return FIRST_PAY;
  const mult = mine ? levelOf(xp).mult : 1;
  const s = Math.max(0, Math.min(score, 1));
  return Math.round((PER_MIN * Math.min(sec, STD_SEC[job] || 90) / 60 * mult * (0.6 + 0.4 * s)) / 10) * 10;
}
// When the job may be changed again (ms; 0 = now).
export const nextChange = (chosen, now = Date.now()) => (chosen && chosen + CHANGE_DAYS * DAY > now ? chosen + CHANGE_DAYS * DAY : 0);

const newId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
const kstDay = (ms) => new Date(ms + 9 * 36e5).toISOString().slice(0, 10);
const LOCAL_KEY = 'mk.career'; // goes with the cloud save like other mk. keys

// In this browser only. wallet: { add(n, note, opt) }.
export class LocalCareer {
  constructor(wallet, storage = globalThis.localStorage, clock = () => Date.now()) {
    Object.assign(this, { wallet, storage, clock });
    this.runs = new Map();
  }
  _load() {
    let s = null;
    try { s = JSON.parse(this.storage.getItem(LOCAL_KEY) || 'null'); } catch { /* broken */ }
    return { job: s?.job || null, chosen: s?.chosen || 0, skills: s?.skills || {}, day: s?.day || '', today: s?.today || 0 };
  }
  _save(s) { try { this.storage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch { /* storage blocked */ } }
  async info() {
    const s = this._load(), now = this.clock();
    return { job: s.job, next: nextChange(s.chosen, now), skills: s.skills, today: s.day === kstDay(now) ? s.today : 0 };
  }
  async choose(job) {
    if (!CAREER_JOBS.includes(job)) return { error: 'job' };
    const s = this._load(), now = this.clock();
    if (s.job === job) return { error: 'same' };
    const wait = s.job ? nextChange(s.chosen, now) : 0;
    if (wait) return { error: 'wait', next: wait };
    s.job = job; s.chosen = now;
    this._save(s);
    return { job, next: now + CHANGE_DAYS * DAY };
  }
  async start(job) {
    if (!CAREER_JOBS.includes(job)) return { error: 'job' };
    const run = newId();
    this.runs.set(run, { job, at: this.clock(), mine: this._load().job === job });
    return { run };
  }
  async finish(run, score, note) {
    const r = this.runs.get(run);
    if (!r) return { error: 'run' };
    this.runs.delete(run);
    const s = this._load(), now = this.clock(), day = kstDay(now);
    if (s.day !== day) { s.day = day; s.today = 0; }
    const sk = s.skills[r.job] || { xp: 0, shifts: 0 };
    const lv0 = levelOf(sk.xp).lv;
    const sec = (now - r.at) / 1000;
    const paid = shiftPayFor({ job: r.job, sec, score, mine: r.mine, xp: sk.xp, todayN: s.today });
    if (sec < (MIN_SEC[r.job] ?? 40)) return { error: 'fast' };
    const xp = r.mine ? xpFor(score) : 0;
    s.skills[r.job] = { xp: sk.xp + xp, shifts: sk.shifts + 1 };
    s.today += 1;
    this._save(s);
    if (paid) this.wallet.add(paid, note, { r: r.job === 'delivery' ? 'delivery' : 'job' });
    const lv = levelOf(sk.xp + xp).lv;
    return { paid, xp, lv, up: lv > lv0 };
  }
}

// In Supabase. cloud: the game's CloudSave (signed in).
export class SupabaseCareer {
  constructor(cloud, wallet) {
    Object.assign(this, { cloud, wallet });
    this.missing = false; // 065_jobs.sql isn't set up yet
    this.applied = new Set();
  }
  get client() { return this.cloud.client; }
  _sf() { return (this.wallet.server && this.wallet._sf?.()) || 1; } // won per server unit
  async _call(fn, args) {
    try {
      const { data, error } = await this.client.rpc(fn, args);
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202' || /does not exist|schema cache|could not find/i.test(error.message || '')) { this.missing = true; return { error: 'missing' }; }
        return { error: 'network' };
      }
      if (!data || data.status !== 'ok') return { ...(data || {}), error: data?.status || 'network' };
      return data;
    } catch { return { error: 'network' }; }
  }
  async info() {
    const d = await this._call('job_info');
    if (d.error) return d;
    return { job: d.job || null, next: Number(d.next) || 0, skills: d.skills || {}, today: Number(d.today) || 0 };
  }
  async choose(job) {
    const d = await this._call('job_choose', { p_job: job });
    return d.error ? { error: d.error, next: Number(d.next) || 0 } : { job: d.job, next: Number(d.next) || 0 };
  }
  async start(job, store) {
    const d = await this._call('job_start', { p_job: job, p_store: store || null });
    return d.error ? { error: d.error } : { run: d.run };
  }
  async finish(run, score, note) {
    if (this.wallet.server) await this.wallet.flush(); // (what I earned or spent just now reaches the server first)
    const d = await this._call('job_finish', { p_run: run, p_score: Math.max(0, Math.min(score, 1)) });
    if (d.error) return { error: d.error };
    const paid = Number(d.paid) * this._sf() || 0;
    if (!this.applied.has(run)) {
      this.applied.add(run);
      if (this.wallet.server && d.ver != null) this.wallet.credited(paid, d, note);
    }
    return { paid, xp: Number(d.xp) || 0, lv: Number(d.lv) || 1, up: !!d.up };
  }
}
