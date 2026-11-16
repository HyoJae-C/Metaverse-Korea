// Where seasoning (정성 양념) and upgrade tries are kept (rules in
// core/dish-upgrade.js). Loaded with the upgrade panel.
//
// On the server (supabase/051_dish_upgrade.sql) the seasoning balance, every
// grant (the 10 to start, missions, cooking classes) and every try leave a
// receipt; upgrade_dish rolls the dice and keeps each upgraded dish's real
// level, so a changed save can't make a +20. A request id per try makes a
// double tap (or a retry after a dropped connection) count once.
// Without the server (local play, tests) it all stays in this browser.
import { CHANCE, CLASS_SEASONING, DAILY_TRIES, LEVEL_OPEN, MISSION_SEASONING, START_SEASONING, costFor, rollUpgrade } from './dish-upgrade.js';
import { kstDay } from './bait.js';

export const newRequestId = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
const LOCAL_KEY = 'mkupgrade.local'; // not "mk.": stays out of the cloud save

// Every store:
//   info() → { n, tries, daily, open, chance: [..], claimed: { mission, cls: [dish] }, dishes: { id: { lv, gauge } } } or { error }
//   claim(kind, dish) → { granted, n } or { error }       kind: 'mission' | 'class'
//   upgrade({ requestId, id, dish, lv, gauge, start, maker }) → { ok, id, lv, gauge, chance, cost, n, tries } or { error }
//   error: 'seasoning' | 'limit' | 'max' | 'dish' | 'signin' | 'missing' | 'network'

// In this browser only.
export class LocalUpgradeStore {
  constructor(storage = globalThis.localStorage, rand = Math.random) {
    Object.assign(this, { storage, rand });
    this.shared = false;
  }
  _load(now) {
    let s = null;
    try { s = JSON.parse(this.storage.getItem(LOCAL_KEY) || 'null'); } catch { /* broken */ }
    s = s && typeof s === 'object' ? s : {};
    if (!s.started) { s.started = true; s.n = (s.n | 0) + START_SEASONING; }
    if (s.day !== kstDay(now)) Object.assign(s, { day: kstDay(now), tries: 0, mission: false, cls: [] });
    s.ids ||= [];
    return s;
  }
  _save(s) { try { this.storage.setItem(LOCAL_KEY, JSON.stringify(s)); } catch { /* storage blocked */ } }
  async info(now = Date.now()) {
    const s = this._load(now);
    this._save(s);
    return { n: s.n | 0, tries: s.tries | 0, daily: DAILY_TRIES, open: LEVEL_OPEN, chance: CHANCE.slice(), claimed: { mission: !!s.mission, cls: [...s.cls] }, dishes: {} };
  }
  async claim(kind, dish, now = Date.now()) {
    const s = this._load(now);
    let granted = 0;
    if (kind === 'mission' && !s.mission) { s.mission = true; granted = MISSION_SEASONING; }
    if (kind === 'class' && typeof dish === 'string' && !s.cls.includes(dish)) { s.cls.push(dish); granted = CLASS_SEASONING; }
    s.n = (s.n | 0) + granted;
    this._save(s);
    return { granted, n: s.n };
  }
  async upgrade({ requestId, id, lv = 0, gauge = 0, start = 0 }, now = Date.now()) {
    const s = this._load(now);
    if (s.ids.includes(requestId)) return { error: 'network' }; // (the same try twice: already shown)
    lv = Math.max(lv | 0, start | 0);
    if (lv >= LEVEL_OPEN) return { error: 'max' };
    if ((s.tries | 0) >= DAILY_TRIES) return { error: 'limit' };
    const cost = costFor(lv + 1);
    if ((s.n | 0) < cost) return { error: 'seasoning', n: s.n | 0 };
    const r = rollUpgrade(lv, gauge, this.rand);
    s.n -= cost;
    s.tries = (s.tries | 0) + 1;
    s.ids = [...s.ids, requestId].slice(-20);
    this._save(s);
    return { ...r, id: id || null, n: s.n, tries: s.tries };
  }
}

// In Supabase. cloud: the game's CloudSave (signed in).
export class SupabaseUpgradeStore {
  constructor(cloud) {
    this.cloud = cloud;
    this.shared = true;
    this.missing = false; // the SQL isn't set up yet
  }
  get client() { return this.cloud.client; }
  _err(error) {
    if (!error) return null;
    if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202' || /does not exist|schema cache|could not find/i.test(error.message || '')) { this.missing = true; return 'missing'; }
    return 'network';
  }
  async info() {
    const { data, error } = await this.client.rpc('seasoning_info');
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status === 'signin') return { error: 'signin' };
    const chance = CHANCE.slice();
    for (const o of data.odds || []) if (o.lv >= 1 && o.lv <= chance.length && Number.isFinite(o.chance)) chance[o.lv - 1] = o.chance;
    const dishes = {};
    for (const d of data.dishes || []) dishes[d.id] = { lv: d.lv | 0, gauge: d.gauge | 0 };
    return { n: data.n | 0, tries: data.tries | 0, daily: Number(data.daily) || DAILY_TRIES, open: Number(data.open) || LEVEL_OPEN, chance, claimed: { mission: !!data.claimed?.mission, cls: [...(data.claimed?.cls || [])] }, dishes };
  }
  async claim(kind, dish) {
    const { data, error } = await this.client.rpc('seasoning_claim', { p_request_id: newRequestId(), p_kind: kind, p_dish: dish || null });
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status !== 'ok') return { error: data?.status || 'network' };
    return { granted: data.granted | 0, n: data.n | 0 };
  }
  async upgrade({ requestId, id, dish, start = 0, maker = '' }) {
    const { data, error } = await this.client.rpc('upgrade_dish', { p_request_id: requestId, p_dish_id: id || null, p_dish: dish, p_start: start | 0, p_maker: String(maker).slice(0, 24) });
    const e = this._err(error);
    if (e) return { error: e };
    if (!data || data.status !== 'ok') return { error: data?.status || 'network', n: data?.n };
    return { ok: !!data.ok, id: data.id, lv: data.lv | 0, gauge: data.gauge | 0, chance: data.chance | 0, cost: data.cost | 0, n: data.n | 0, tries: data.tries | 0 };
  }
}

// (for game/dish-upgrade.js, which loads this file first)
export { dishKindOf as dishKind } from './dish-upgrade.js';
