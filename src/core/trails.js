// Stamp trails: how far along each course you are, and which ones you have
// finished (saved under mk.trails, so the reward is paid only once).
const KEY = 'mk.trails';

// The course's stamps that exist on this map, and how many you have.
export function trailProgress(trail, stamps, book) {
  const ids = new Set(stamps.map((s) => s.id));
  const stops = trail.stamps.filter((id) => ids.has(id));
  const got = stops.filter((id) => book.has(id)).length;
  return { stops, got, all: stops.length, done: stops.length > 0 && got === stops.length };
}

// Courses that contain this stamp.
export function trailsWith(trails, stampId) {
  return trails.filter((t) => t.stamps.includes(stampId));
}

export class TrailLog {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = [];
    try { raw = JSON.parse(storage?.getItem(KEY) || '[]'); } catch { /* broken save */ }
    this.done = new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []);
  }
  has(id) { return this.done.has(id); }
  // Mark a course finished; true the first time (that's when it pays).
  finish(id) {
    if (!id || this.done.has(id)) return false;
    this.done.add(id);
    try { this.storage?.setItem(KEY, JSON.stringify([...this.done])); } catch { /* storage blocked */ }
    return true;
  }
}
