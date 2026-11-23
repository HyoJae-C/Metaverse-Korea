// Pot plants at home grow when you water them (Yozi 2026-11-21): the plants
// bought in Seoul Botanic Park (core/house-plants.js, ids "plant-…"). No
// three.js and no DOM, so it can be unit-tested.
//
//   - Walk up to a plant and water it: once a day for each plant, one plant
//     at a time (there is no "water them all": it should take some care).
//   - A plant never wilts. A day without water is only a day without growing.
//   - What you water today shows tomorrow: the plant is 1% bigger for every
//     watered day before today, up to twice its size after 100 days. The
//     small ones that stand on a table stop at one and a half times (they'd
//     outgrow the table), and nothing grows through the ceiling.
//   - The days stay with the plant (mk.plants, which rides in the account
//     save), also while it is put away, so a plant keeps its size.
import { dayKey } from './daily.js';

export const GROW_DAYS = 100; // watered days to full size
export const GROW_MAX = 2, GROW_MAX_SMALL = 1.5;
const KEY = 'mk.plants';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isPlant = (id) => typeof id === 'string' && id.startsWith('plant-');
// How big a plant is drawn after `grown` watered days. small: it can stand on
// a table; height: the plant's own height in metres and room: the space
// above its pot (both optional).
export function growScale(grown, { small = false, height = 0, room = Infinity } = {}) {
  const max = small ? GROW_MAX_SMALL : GROW_MAX;
  const s = Math.min(max, 1 + Math.max(0, Math.min(GROW_DAYS, grown | 0)) / GROW_DAYS);
  return height > 0 ? Math.max(1, Math.min(s, room / height)) : s;
}

export class PlantCare {
  constructor(storage = globalThis.localStorage, today = () => dayKey()) {
    Object.assign(this, { storage, today });
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* broken save */ }
    this.s = {};
    for (const [id, v] of Object.entries(raw)) if (isPlant(id) && v && v.n > 0 && DAY.test(v.d)) this.s[id] = { n: Math.min(36500, v.n | 0), d: v.d };
  }
  // Days this plant has been watered, today included.
  days(id) { return this.s[id]?.n || 0; }
  wateredToday(id) { return this.s[id]?.d === this.today(); }
  // Watered days that show: today's watering shows tomorrow.
  grown(id) { return this.days(id) - (this.wateredToday(id) ? 1 : 0); }
  // Water it. False when it isn't a plant or has had its water today.
  water(id) {
    if (!isPlant(id) || this.wateredToday(id)) return false;
    this.s[id] = { n: this.days(id) + 1, d: this.today() };
    try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ }
    return true;
  }
}
