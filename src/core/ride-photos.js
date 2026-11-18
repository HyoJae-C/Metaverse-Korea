// Ride photos (Yozi 2026-11-18): the Jelly Flume takes a free film-camera
// photo of you on the big drop, as real log flumes do. It goes in your bag
// and can hang in your home as a framed print. No DOM, so it can be
// unit-tested.
//
// The pictures themselves are small JPEGs (data: URLs, a few KB) kept in
// mk.photos, which rides along in the cloud save; a bag entry only points at
// one ({ kind: 'photo', ph: '<id>' }), and so does a frame in the home
// ('ph:<id>' in the layout). Throwing the bag entry away deletes the picture
// (and its frame). At most MAX_PHOTOS, so the save stays light.
//
// Every photo gets its receipt on the server (supabase/055_ride_photos.sql:
// photo_receipt, with the ride's payment op when it was paid in won), like
// every other item (Yozi 2026-11-11). Until the server has it (offline, or
// the SQL not run yet) `sent` stays false and it is sent again later.

export const PHOTOS_KEY = 'mk.photos';
export const MAX_PHOTOS = 10;
export const PHOTO_W = 360, PHOTO_H = 270; // 4:3, like a film print
const MAX_SRC = 60000; // characters of data: URL (a 360×270 JPEG is ~12-20k)
export const PHOTO_RIDES = ['flume'];

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isPhotoId = (id) => typeof id === 'string' && ID_RE.test(id);
export const okSrc = (s) => typeof s === 'string' && s.length < MAX_SRC && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s);

// The home-layout id of a photo's frame, and back.
export const frameId = (id) => 'ph:' + id;
export const photoOfFrame = (fid) => (typeof fid === 'string' && fid.startsWith('ph:') && isPhotoId(fid.slice(3)) ? fid.slice(3) : null);

// A bag entry for photo id, or null.
export function photoEntry(e) {
  return e && isPhotoId(e.ph) ? { kind: 'photo', ph: e.ph } : null;
}

function cleanPhoto(p) {
  if (!p || !isPhotoId(p.id) || !okSrc(p.src)) return null;
  return {
    id: p.id, src: p.src,
    ride: PHOTO_RIDES.includes(p.ride) ? p.ride : 'flume',
    at: Number.isFinite(p.at) ? Math.floor(p.at) : 0,
    op: isPhotoId(p.op) ? p.op : null, // the ride's payment on the coin ledger
    sent: !!p.sent, // the server has its receipt
  };
}

export class PhotoStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = [];
    try { raw = JSON.parse(storage?.getItem(PHOTOS_KEY) || '[]'); } catch { /* broken save */ }
    this.list = (Array.isArray(raw) ? raw : []).map(cleanPhoto).filter(Boolean)
      .filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i).slice(0, MAX_PHOTOS);
  }
  get full() { return this.list.length >= MAX_PHOTOS; }
  get(id) { return this.list.find((p) => p.id === id) || null; }
  all() { return this.list.slice(); }
  // Keep a new photo. False when there's no room or it isn't a photo.
  add(p) {
    const c = cleanPhoto(p);
    if (!c || this.full || this.get(c.id)) return false;
    this.list.push(c);
    this._save();
    return true;
  }
  remove(id) {
    const n = this.list.length;
    this.list = this.list.filter((p) => p.id !== id);
    if (this.list.length !== n) this._save();
    return this.list.length !== n;
  }
  markSent(id) {
    const p = this.get(id);
    if (p && !p.sent) { p.sent = true; this._save(); }
  }
  unsent() { return this.list.filter((p) => !p.sent); }
  // Photos no bag entry points at any more (e.g. the bag was cleaned up on
  // another device): gone. keep: the ids still in the bag (or in hand).
  prune(keep) {
    const k = new Set(keep);
    const n = this.list.length;
    this.list = this.list.filter((p) => k.has(p.id));
    if (this.list.length !== n) this._save();
    return n - this.list.length;
  }
  // Keep only the photos a bag points at, now and whenever the bag changes
  // (a photo thrown away is gone).
  follow(bag) {
    const keep = () => this.prune(bag.list().filter((e) => e.kind === 'photo').map((e) => e.ph));
    keep();
    bag.onChange(keep);
  }
  _save() { try { this.storage?.setItem(PHOTOS_KEY, JSON.stringify(this.list)); } catch { /* storage full or blocked */ } }
}

// The orange date a film camera prints in the corner: '26 11 18.
export function filmDate(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `'${p(d.getFullYear() % 100)} ${p(d.getMonth() + 1)} ${p(d.getDate())}`;
}

// The film look, on RGBA pixels (in place): faded blacks, warm highlights,
// a little less saturation and a dark edge, like a cheap film camera's
// print. w, h: the size; data: Uint8ClampedArray (or plain array).
export function filmLook(data, w, h) {
  const cx = w / 2, cy = h / 2, r2 = cx * cx + cy * cy;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      r = l + (r - l) * 0.85; g = l + (g - l) * 0.85; b = l + (b - l) * 0.85; // a little less colour
      r = 0.06 + r * 0.92 + 0.05 * l; g = 0.05 + g * 0.9 + 0.02 * l; b = 0.07 + b * 0.8; // faded blacks, warm light
      const dx = x - cx, dy = y - cy, v = 1 - 0.38 * Math.pow((dx * dx + dy * dy) / r2, 1.3); // the dark edge
      data[i] = Math.max(0, Math.min(255, r * v * 255));
      data[i + 1] = Math.max(0, Math.min(255, g * v * 255));
      data[i + 2] = Math.max(0, Math.min(255, b * v * 255));
      data[i + 3] = 255;
    }
  }
  return data;
}

// The moment to take it: my seat partway down the big drop (the channel's
// drop runs south from z -28.6 at the top to -20.6 at the foot,
// park-rides.js FLUME_TRACK), once a ride.
export const SNAP_Z = -23.6;
export const atSnap = (s) => !!s && s.pitch > 0.4 && s.z > SNAP_Z && s.z < SNAP_Z + 2.5;
// The photo camera: on a pole by the splash pool, looking back up the drop
// at the riders' faces, as on real rides (the park's own metres).
export const PHOTO_CAM = { x: 61.9, y: 1.6, z: -18.1, fov: 30 };
