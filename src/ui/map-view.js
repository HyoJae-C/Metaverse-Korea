// Full-screen map: streets, meeting zones, stores, you and other players.
// Tap a zone or store (on the map or in the list) to get walking guidance.
import { t, localName, getLanguage } from '../core/i18n.js';

import { CATEGORY_ICON, storeIcon } from '../core/store-icons.js';

export { CATEGORY_ICON };

// Does a store match the search text? Looks at its names in every language,
// tagline, category and product names, ignoring case and spaces.
const norm = (v) => String(v ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\-_'·.]+/g, '');
export function storeMatches(store, query, category, catLabel = '') {
  if (category && store.category !== category) return false;
  const q = norm(query);
  if (!q) return true;
  const texts = [catLabel, store.category];
  for (const o of [store.name, store.tagline]) if (o) texts.push(...Object.values(o));
  for (const pr of store.products || []) if (pr.name) texts.push(...Object.values(pr.name));
  return texts.some((x) => norm(x).includes(q));
}

// Subway stations from the map's exit marks ({ station, name, go, … }):
// one entry per station with all its exits, so every station in every
// district (and any added later in region.json) can be searched and picked.
export function stationList(marks) {
  const by = new Map();
  for (const m of marks || []) {
    if (m.station == null) continue;
    let st = by.get(m.station);
    if (!st) by.set(m.station, (st = { key: m.station, name: m.name || {}, exits: [] }));
    st.exits.push(m);
  }
  return [...by.values()];
}
// Does a station match the search text? Its name in any language, or a
// word for "subway" / "station" (extra: e.g. the heading in the UI language).
const STATION_WORDS = ['subway', 'metro', 'station', 'train', '지하철', '전철', '역', '地下鉄', '駅', '地铁', '站'];
export function stationMatches(st, query, extra = '') {
  const q = norm(query);
  if (!q) return true;
  return [...Object.values(st.name || {}), ...STATION_WORDS, extra].some((x) => norm(x).includes(q));
}
// The exit of a station nearest to (x, z): where guidance goes.
export function nearestExit(exits, x, z) {
  let best = null, bd = Infinity;
  for (const e of exits) {
    const p = e.go || e, d = Math.hypot(p.x - x, p.z - z);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// Districts of a joined city (see core/districts.js), with names for the
// "more over here" badges at the map's edge.
export const DISTRICT_NAME = {
  seongsu: { en: 'Seongsu', ko: '성수', ja: '聖水', zh: '圣水', es: 'Seongsu', id: 'Seongsu', ar: 'سونغسو', vi: 'Seongsu', hi: 'सोंगसू' },
  gyeongbokgung: { en: 'Gyeongbokgung', ko: '경복궁', ja: '景福宮', zh: '景福宫', es: 'Gyeongbokgung', id: 'Gyeongbokgung', ar: 'قصر غيونغبوكغونغ', vi: 'Gyeongbokgung', hi: 'ग्योंगबोकगुंग' },
  itaewon: { en: 'Itaewon', ko: '이태원', ja: '梨泰院', zh: '梨泰院', es: 'Itaewon', id: 'Itaewon', ar: 'إيتايوون', vi: 'Itaewon', hi: 'इतेवॉन' },
  songpa: { en: 'Songpa', ko: '송파', ja: '松坡', zh: '松坡', es: 'Songpa', id: 'Songpa', ar: 'سونغبا', vi: 'Songpa', hi: 'सोंगपा' },
  'olympic-park': { en: 'Olympic Park', ko: '올림픽공원', ja: 'オリンピック公園', zh: '奥林匹克公园', es: 'Parque Olímpico', id: 'Taman Olimpiade', ar: 'الحديقة الأولمبية', vi: 'Công viên Olympic', hi: 'ओलंपिक पार्क' },
  seodaemun: { en: 'Seodaemun (Sinchon)', ko: '서대문 (신촌)', ja: '西大門（新村）', zh: '西大门（新村）', es: 'Seodaemun (Sinchon)', id: 'Seodaemun (Sinchon)', ar: 'سوديمون (سينتشون)', vi: 'Seodaemun (Sinchon)', hi: 'सोदेमुन (सिनचोन)' },
  hongdae: { en: 'Hongdae', ko: '홍대', ja: '弘大', zh: '弘大', es: 'Hongdae', id: 'Hongdae', ar: 'هونغداي', vi: 'Hongdae', hi: 'होंगदे' },
  yeonnam: { en: 'Yeonnam-dong', ko: '연남동', ja: '延南洞', zh: '延南洞', es: 'Yeonnam-dong', id: 'Yeonnam-dong', ar: 'يونّام دونغ', vi: 'Yeonnam-dong', hi: 'योननाम-दोंग' },
  mangwon: { en: 'Mangwon-dong', ko: '망원동', ja: '望遠洞', zh: '望远洞', es: 'Mangwon-dong', id: 'Mangwon-dong', ar: 'مانغوون دونغ', vi: 'Mangwon-dong', hi: 'मांगवॉन-दोंग' },
};
// The middle of each district's buildings.
export function districtCentres(map) {
  const out = [];
  for (const { id } of map?.meta?.districts || []) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const b of map.buildings || []) {
      if (b.d !== id) continue;
      for (const [x, z] of b.p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    }
    if (x0 < x1) out.push({ id, x: (x0 + x1) / 2, z: (z0 + z1) / 2, name: DISTRICT_NAME[id] || { en: id.charAt(0).toUpperCase() + id.slice(1) } });
  }
  return out;
}

// Below this zoom (px per metre, before the screen's pixel ratio) the map
// shows the Seoul overview instead of shops and zones.
export const SEOUL_ZOOM = 0.12;
function inPoly(x, z, p) {
  let r = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}

// Readability helpers. Markers closer than `r` screen pixels are merged into
// one cluster (drawn at its first member), so pins never pile up on top of
// each other; zooming in splits them again.
// `seeds` ({ sx, sy }) are fixed markers (meeting zones) that soak up the pins
// around them; they come back first, with `seed` set.
export function clusterPoints(pts, r, seeds = []) {
  const out = [];
  const cell = new Map(); // grid of r-sized cells, for a quick neighbour look-up
  const key = (i, j) => i * 100003 + j;
  const add = (c) => {
    out.push(c);
    const k = key(Math.floor(c.sx / r), Math.floor(c.sy / r));
    if (!cell.has(k)) cell.set(k, []);
    cell.get(k).push(c);
  };
  for (const sd of seeds) add({ sx: sd.sx, sy: sd.sy, items: [], seed: sd });
  for (const p of pts) {
    const i = Math.floor(p.sx / r), j = Math.floor(p.sy / r);
    let best = null, bd = r;
    for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) {
      for (const c of cell.get(key(a, b)) || []) {
        const d = Math.hypot(c.sx - p.sx, c.sy - p.sy);
        if (d < bd) { bd = d; best = c; }
      }
    }
    if (best) best.items.push(p.item);
    else add({ sx: p.sx, sy: p.sy, items: [p.item] });
  }
  return out;
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Labels that would cover another label or a marker are left out; each label
// tries below its marker first, then right, above and left. `taken` holds the
// boxes already in use ({ x, y, w, h }) and grows as labels are placed.
const PARK_ICON = { flowergarden: '🌷', hill: '🍦', greenhouse: '🦋', rosegarden: '🌹', skatepark: '🛹' };
export function placeLabel(taken, { sx, sy, w, h, gap }, bounds) {
  const spots = [
    [sx - w / 2, sy + gap], // below
    [sx + gap, sy - h / 2], // right
    [sx - w / 2, sy - gap - h], // above
    [sx - gap - w, sy - h / 2], // left
  ];
  for (const [x, y] of spots) {
    const box = { x, y, w, h };
    if (bounds && (x < bounds.x || y < bounds.y || x + w > bounds.x + bounds.w || y + h > bounds.y + bounds.h)) continue;
    if (taken.some((t) => overlaps(t, box))) continue;
    taken.push(box);
    return box;
  }
  return null;
}

export class MapView {
  // onTaxi({ x, z, label, guide }): ride a taxi there (optional).
  // seoul: the gu overview (seoul.json), drawn under the streets; zoom out
  // to see all of Seoul, open gu in colour, the rest "coming soon".
  constructor({ root, map, seoul = null, zones, stores, marks = [], getPlayers, onGuide, onTaxi }) {
    Object.assign(this, { root, map, seoul, zones, stores, marks, getPlayers, onGuide, onTaxi });
    this.taxi = false; // taxi mode: picking a place calls a taxi instead of guiding
    const taxiBtn = root.querySelector('.map-taxi');
    if (taxiBtn) {
      taxiBtn.hidden = !onTaxi;
      taxiBtn.onclick = () => this.setTaxi(!this.taxi);
    }
    this.canvas = root.querySelector('canvas');
    this.list = root.querySelector('.map-list');
    this.view = { cx: 0, cz: 80, scale: 1 }; // metres at centre, px per metre
    this.base = null;
    this.open = false;
    this.query = '';
    this.category = null;
    this.districts = districtCentres(map);
    this.badges = []; // edge badges for districts off screen: { x, y, r, d }
    this._bindInput();
    root.querySelector('.map-close').onclick = () => this.hide();
    root.addEventListener('click', (e) => { if (e.target === root) this.hide(); });
  }

  show(px, pz) {
    this.open = true;
    this.root.hidden = false;
    this.view.cx = px;
    this.view.cz = pz;
    this._resize();
    this.view.scale = this._homeScale();
    this._renderList();
    this.draw();
  }

  hide() {
    this.open = false;
    this._setSearching(false);
    this.root.hidden = true;
    this.setTaxi(false);
  }

  setTaxi(on) {
    this.taxi = !!on && !!this.onTaxi;
    this.root.querySelector('.map-taxi')?.classList.toggle('on', this.taxi);
    const hint = this.root.querySelector('.map-taxi-hint');
    if (hint) hint.hidden = !this.taxi;
    this.root.classList.toggle('taxi-mode', this.taxi);
  }

  // A place was picked (map tap or list row): guide there, or take a taxi.
  _pick(g) {
    if (this.taxi) this.onTaxi({ ...g, guide: g });
    else this.onGuide(g);
    this.hide();
  }

  // Guide to a subway exit: just outside its stairs.
  _pickStation(ex, label) {
    const p = ex.go || ex;
    this._pick({ kind: 'station', id: ex.station, x: p.x, z: p.z, label: label || localName(ex.name, getLanguage()) });
  }

  // Opening zoom: the whole card's worth of streets, but never so far out on
  // a small phone screen that the shop pins all merge into bubbles.
  _homeScale() {
    return Math.max(Math.min(this.canvas.width, this.canvas.height) / 520, 0.8 * this.dpr);
  }

  _resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.max(200, r.width * dpr);
    this.canvas.height = Math.max(200, r.height * dpr);
    this.dpr = dpr;
  }

  toScreen(x, z) {
    const { cx, cz, scale } = this.view;
    return [(x - cx) * scale + this.canvas.width / 2, (z - cz) * scale + this.canvas.height / 2];
  }

  toWorld(sx, sy) {
    const { cx, cz, scale } = this.view;
    return [(sx - this.canvas.width / 2) / scale + cx, (sy - this.canvas.height / 2) / scale + cz];
  }

  draw() {
    this._draw();
    this._drawCredit();
  }

  // The gu outlines come from OpenStreetMap, whose licence asks for this
  // credit wherever they are shown: small, in the bottom-right corner.
  _drawCredit() {
    const credit = this.seoul?.credit;
    if (!credit || !this.open) return;
    const g = this.canvas.getContext('2d'), dpr = this.dpr, W = this.canvas.width, H = this.canvas.height;
    g.save();
    g.font = `600 ${10 * dpr}px system-ui, sans-serif`;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    const w = g.measureText(credit).width + 10 * dpr, h = 16 * dpr;
    g.fillStyle = 'rgba(255,250,240,0.8)';
    g.fillRect(W - w - 4 * dpr, H - h - 4 * dpr, w, h);
    g.fillStyle = 'rgba(74,63,53,0.85)';
    g.fillText(credit, W - 9 * dpr, H - 4 * dpr - h / 2 + 1);
    g.restore();
  }

  _draw() {
    if (!this.open) return;
    const g = this.canvas.getContext('2d');
    g.fillStyle = '#f3ecdc';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const poly = (p) => {
      g.beginPath();
      p.forEach(([x, z], i) => {
        const [sx, sy] = this.toScreen(x, z);
        if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy);
      });
    };
    const lang = getLanguage();
    const dpr = this.dpr;
    const far = this.view.scale < SEOUL_ZOOM * dpr; // zoomed out: Seoul overview
    if (this.seoul) this._drawSeoul(g, poly, far, lang);
    this.root.querySelector('.map-seoul')?.classList.toggle('on', far);
    const AREA = { plaza: '#e3dccd', sand: '#efe2c2', water: '#a9d8f0' }; // the rest: green
    const order = { plaza: 0, sand: 0, water: 2 };
    for (const a of [...this.map.areas].sort((x, y) => (order[x.k] ?? 1) - (order[y.k] ?? 1))) {
      g.fillStyle = AREA[a.k] || '#bfe3a8';
      poly(a.p); g.fill();
    }
    g.lineCap = g.lineJoin = 'round';
    for (const r of this.map.roads) {
      poly(r.p);
      g.strokeStyle = r.k === 'walk' ? '#e6dcc8' : '#ffffff';
      g.lineWidth = Math.max(1, r.w * this.view.scale);
      g.stroke();
    }
    g.fillStyle = '#e2d6c2';
    g.strokeStyle = '#d2c3aa';
    g.lineWidth = 1;
    for (const b of this.map.buildings) { poly(b.p); g.closePath(); g.fill(); g.stroke(); }
    g.strokeStyle = '#b8bcc4';
    g.lineWidth = Math.max(2, 7 * this.view.scale);
    for (const r of this.map.rail) { poly(r.p); g.stroke(); }
    if (far) { this._drawSeoulLabels(g, lang); this._drawMe(g); return; }

    // Markers first, then names in the gaps between them (see placeLabel),
    // so nothing is drawn on top of anything else.
    const W = this.canvas.width, H = this.canvas.height;
    const taken = []; // screen boxes in use
    const labels = []; // { text, sx, sy, gap, weight, color }, most important first
    const mark = (sx, sy, r) => taken.push({ x: sx - r, y: sy - r, w: r * 2, h: r * 2 });
    const onScreen = (sx, sy, m = 40 * dpr) => sx > -m && sy > -m && sx < W + m && sy < H + m;
    this.hits = [];
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    // Zones: a tinted area under everything; the lettered disc comes later.
    for (const z of this.zones) {
      const [sx, sy] = this.toScreen(z.x, z.z);
      g.fillStyle = z.zone.color + '2b';
      g.beginPath();
      g.arc(sx, sy, z.zone.radius * this.view.scale, 0, Math.PI * 2);
      g.fill();
    }

    // Stores: pins that would overlap become one numbered bubble; tap it to
    // zoom in on them.
    const shown = this.stores.filter((s) => this._match(s)).map((s) => { const [sx, sy] = this.toScreen(s.door.x, s.door.z); return { sx, sy, item: s }; });
    // Nearest the middle of the screen first, so those keep their own pin and name.
    shown.sort((a, b) => Math.hypot(a.sx - W / 2, a.sy - H / 2) - Math.hypot(b.sx - W / 2, b.sy - H / 2));
    const filtered = !!(this.category || norm(this.query));
    // Meeting zones' discs take in the pins right around them (see below).
    const zoneSeeds = this.zones.map((z) => { const [sx, sy] = this.toScreen(z.x, z.z); return { sx, sy, z }; });
    const zoneShops = new Map();
    for (const c of clusterPoints(shown, 34 * dpr, zoneSeeds)) {
      if (c.seed) { zoneShops.set(c.seed.z, c.items.length); continue; }
      if (!onScreen(c.sx, c.sy)) continue;
      if (c.items.length > 1) {
        const n = c.items.length, r = (n > 9 ? 16 : 14) * dpr;
        g.fillStyle = filtered ? '#ff6f5b' : '#4a3f35';
        g.strokeStyle = '#fffaf0';
        g.lineWidth = 3 * dpr;
        g.beginPath();
        g.arc(c.sx, c.sy, r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = '#fffaf0';
        g.font = `900 ${(n > 99 ? 11 : 13) * dpr}px system-ui, sans-serif`;
        g.fillText(String(n), c.sx, c.sy + 1);
        mark(c.sx, c.sy, r + 2 * dpr);
        this.hits.push({ sx: c.sx, sy: c.sy, r: r + 6 * dpr, kind: 'cluster', item: c });
        continue;
      }
      const s = c.items[0];
      g.fillStyle = '#fffaf0';
      g.beginPath();
      g.arc(c.sx, c.sy, 14 * dpr, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = s.store.colors.sign;
      g.lineWidth = 3 * dpr;
      g.stroke();
      g.font = `${17 * dpr}px system-ui, sans-serif`;
      g.fillStyle = '#4a3f35';
      g.fillText(storeIcon(s.store), c.sx, c.sy + 1);
      mark(c.sx, c.sy, 16 * dpr);
      this.hits.push({ sx: c.sx, sy: c.sy, r: 20 * dpr, kind: 'store', item: s });
      if (this.view.scale > 0.5 * dpr) labels.push({ text: localName(s.store.name, lang), sx: c.sx, sy: c.sy, gap: 17 * dpr, weight: 700, size: 12, color: '#4a3f35', pri: 3 });
    }

    // Zone discs with a letter and the zone's name, on top of shop pins.
    for (const z of this.zones) {
      const [sx, sy] = this.toScreen(z.x, z.z);
      if (!onScreen(sx, sy)) continue;
      g.fillStyle = z.zone.color;
      g.strokeStyle = '#fffaf0';
      g.lineWidth = 2.5 * dpr;
      g.beginPath();
      g.arc(sx, sy, 15 * dpr, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#fffaf0';
      g.font = `900 ${16 * dpr}px system-ui, sans-serif`;
      g.fillText(z.zone.id, sx, sy + 1);
      mark(sx, sy, 16 * dpr);
      // Shops hidden under the disc: a small count; zoom in to see them.
      const n = zoneShops.get(z) || 0;
      if (n) {
        const bx = sx + 13 * dpr, by = sy - 13 * dpr;
        g.fillStyle = filtered ? '#ff6f5b' : '#4a3f35';
        g.beginPath();
        g.arc(bx, by, 9 * dpr, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#fffaf0';
        g.lineWidth = 2 * dpr;
        g.stroke();
        g.fillStyle = '#fffaf0';
        g.font = `900 ${10 * dpr}px system-ui, sans-serif`;
        g.fillText(String(n), bx, by + 1);
        mark(bx, by, 10 * dpr);
      }
      this.hits.push({ sx, sy, r: 20 * dpr, kind: 'zone', item: z });
      if (z.zone.name) labels.push({ text: localName(z.zone.name, lang), sx, sy, gap: 17 * dpr, weight: 800, size: 13, color: '#3b322a', pri: 0 });
    }

    // Subway exits ({ x, z, icon, color, label, group }): exits of one
    // station that sit close together become one sign with the station's name.
    const exits = clusterPoints(this.marks.map((m) => { const [sx, sy] = this.toScreen(m.x, m.z); return { sx, sy, item: m }; }), 30 * dpr);
    for (const c of exits) {
      if (!onScreen(c.sx, c.sy)) continue;
      const m = c.items[0];
      g.fillStyle = m.color || '#5d6470';
      g.strokeStyle = '#fffaf0';
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.roundRect(c.sx - 12 * dpr, c.sy - 12 * dpr, 24 * dpr, 24 * dpr, 6 * dpr);
      g.fill();
      g.stroke();
      g.font = `${15 * dpr}px system-ui, sans-serif`;
      g.fillText(m.icon || '🚇', c.sx, c.sy + 1);
      mark(c.sx, c.sy, 13 * dpr);
      if (m.station != null) this.hits.push({ sx: c.sx, sy: c.sy, r: 16 * dpr, kind: 'station', item: c.items });
      const text = c.items.length > 1 ? m.group?.() : m.label?.();
      if (text && this.view.scale > 0.5 * dpr) labels.push({ text, sx: c.sx, sy: c.sy, gap: 14 * dpr, weight: 700, size: 12, color: '#3b322a', pri: 2 });
    }

    // Named park spots (map landmarks with a label: Seoul Forest's gardens, hill…), when zoomed in.
    if (this.view.scale > 0.9 * dpr) {
      for (const l of this.map.landmarks || []) {
        if (!l.label) continue;
        const [sx, sy] = this.toScreen(l.x, l.z);
        if (onScreen(sx, sy)) labels.push({ text: `${PARK_ICON[l.type] || '📍'} ${localName(l.label, lang)}`, sx, sy, gap: 0, weight: 700, size: 11, color: '#2f6b3f', pri: 4 });
      }
    }
    // Players
    const { me, others } = this.getPlayers();
    for (const o of others) {
      const [sx, sy] = this.toScreen(o.x, o.z);
      if (!onScreen(sx, sy)) continue;
      g.fillStyle = '#5b6cf0';
      g.strokeStyle = '#fffaf0';
      g.lineWidth = 2 * dpr;
      g.beginPath();
      g.arc(sx, sy, 6 * dpr, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      mark(sx, sy, 7 * dpr);
      labels.push({ text: o.name, sx, sy, gap: 8 * dpr, weight: 700, size: 11, color: '#3d4bc4', pri: 1 });
    }
    this._drawMe(g, me);
    { const [mx, my] = this.toScreen(me.x, me.z); mark(mx, my, 14 * dpr); }
    // Edge badges for other districts, before the names so names keep clear of them.
    this._drawBadges(g, me);
    taken.push(...this.badges);

    // Names, each with a soft outline so it reads over streets and parks.
    // Shop names go after zones, stations and people, so those win a tight spot.
    labels.sort((a, b) => a.pri - b.pri);
    g.lineJoin = 'round';
    for (const l of labels) {
      g.font = `${l.weight} ${l.size * dpr}px system-ui, sans-serif`;
      const w = g.measureText(l.text).width, h = (l.size + 3) * dpr;
      const box = placeLabel(taken, { sx: l.sx, sy: l.sy, w: w + 4 * dpr, h, gap: l.gap }, { x: 0, y: 0, w: W, h: H });
      if (!box) continue;
      const tx = box.x + box.w / 2, ty = box.y + box.h / 2 + 1;
      g.strokeStyle = 'rgba(255,250,240,0.95)';
      g.lineWidth = 4 * dpr;
      g.strokeText(l.text, tx, ty);
      g.fillStyle = l.color;
      g.fillText(l.text, tx, ty);
    }
  }

  _drawMe(g, me = this.getPlayers().me) {
    const dpr = this.dpr;
    const [mx, my] = this.toScreen(me.x, me.z);
    g.save();
    g.translate(mx, my);
    g.rotate(-me.ry + Math.PI);
    g.fillStyle = '#ff6f5b';
    g.strokeStyle = '#fffaf0';
    g.lineWidth = 3 * dpr;
    g.beginPath();
    g.moveTo(0, -13 * dpr);
    g.lineTo(9 * dpr, 9 * dpr);
    g.lineTo(0, 4 * dpr);
    g.lineTo(-9 * dpr, 9 * dpr);
    g.closePath();
    g.stroke();
    g.fill();
    g.restore();
  }

  // Seoul's gu as tiles under everything, and the Han River. Open gu are
  // light; the others grey ("coming soon").
  _drawSeoul(g, poly, far) {
    const { gu, river } = this.seoul;
    g.lineJoin = 'round';
    for (const d of gu) {
      poly(d.p); g.closePath();
      g.fillStyle = d.open ? (far ? '#ffe9b8' : '#f3ecdc') : '#d9d4ca';
      g.fill();
      g.strokeStyle = far ? '#ffffff' : 'rgba(255,255,255,0.7)';
      g.lineWidth = (far ? 2 : 4) * this.dpr;
      g.stroke();
    }
    poly(river);
    g.strokeStyle = '#a9d8f0';
    g.lineCap = 'round';
    g.lineWidth = Math.max(5 * this.dpr, 220 * this.view.scale);
    g.stroke();
  }

  // Gu names: the open ones first and bold, then the "coming soon" ones,
  // lighter, wherever they fit without touching another name. A legend in the
  // corner says what the grey means, instead of "Coming soon" under every gu.
  _drawSeoulLabels(g, lang) {
    const dpr = this.dpr, H = this.canvas.height;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    const { me } = this.getPlayers();
    const [mx, my] = this.toScreen(me.x, me.z);
    const taken = [{ x: mx - 14 * dpr, y: my - 14 * dpr, w: 28 * dpr, h: 28 * dpr }]; // keep clear of your arrow
    // Open gu first, and the one you're in before the rest, so its name sits next to you.
    const here = this._guAt(me.x, me.z);
    const rank = (d) => (d === here ? 2 : d.open ? 1 : 0);
    const gu = [...this.seoul.gu].sort((a, b) => rank(b) - rank(a));
    for (const d of gu) {
      const [sx, sy] = this.toScreen(d.label[0], d.label[1]);
      const size = (d.open ? 14 : 11) * dpr;
      g.font = `${d.open ? 900 : 700} ${size}px system-ui, sans-serif`;
      const text = localName(d.name, lang);
      const w = g.measureText(text).width + 6 * dpr, h = size + 4 * dpr;
      const box = { x: sx - w / 2, y: sy - h / 2, w, h };
      const hits = () => taken.some((b) => box.x < b.x + b.w && b.x < box.x + box.w && box.y < b.y + b.h && b.y < box.y + box.h);
      // An open gu's name nudges up or down to find room rather than vanish.
      const tries = d.open ? [[0, 0], [0, -1], [0, 1], [0.6, 0], [-0.6, 0], [-0.6, 1], [0.6, 1], [-0.6, -1], [0.6, -1], [0, -2], [0, 2]] : [[0, 0]];
      const spots = tries.map(([kx, ky]) => [sx - w / 2 + kx * w, sy - h / 2 + ky * (h + dpr)]);
      if (d === here) spots.unshift([mx - w / 2, my + 15 * dpr], [mx - w / 2, my - 15 * dpr - h]); // just under (or over) your arrow
      if (!spots.some(([x, y]) => { box.x = x; box.y = y; return !hits(); })) continue;
      taken.push(box);
      const ty = box.y + h / 2;
      g.strokeStyle = d.open ? '#fffaf0' : 'rgba(255,255,255,0.75)';
      g.lineWidth = (d.open ? 4 : 3) * dpr;
      const tx = box.x + w / 2;
      g.strokeText(text, tx, ty + 1);
      g.fillStyle = d.open ? '#3b322a' : 'rgba(74,63,53,0.6)';
      g.fillText(text, tx, ty + 1);
    }
    // Legend
    g.font = `700 ${12 * dpr}px system-ui, sans-serif`;
    const items = [['#ffe9b8', t('map.open')], ['#d9d4ca', t('map.soon')]];
    let x = 10 * dpr;
    const y = H - 30 * dpr;
    const lw = items.reduce((a, [, s]) => a + g.measureText(s).width + 30 * dpr, 6 * dpr);
    g.fillStyle = 'rgba(255,250,240,0.92)';
    g.beginPath();
    g.roundRect(x, y - 2 * dpr, lw, 24 * dpr, 12 * dpr);
    g.fill();
    x += 10 * dpr;
    g.textAlign = 'left';
    for (const [c, s] of items) {
      g.fillStyle = c;
      g.strokeStyle = '#b9ad98';
      g.lineWidth = 1 * dpr;
      g.beginPath();
      g.roundRect(x, y + 4 * dpr, 12 * dpr, 12 * dpr, 3 * dpr);
      g.fill();
      g.stroke();
      g.fillStyle = '#4a3f35';
      g.fillText(s, x + 17 * dpr, y + 10 * dpr + 1);
      x += g.measureText(s).width + 30 * dpr;
    }
    g.textAlign = 'center';
  }

  // The gu at a map point (zoomed out), or null.
  _guAt(x, z) {
    for (const d of this.seoul?.gu || []) if (inPoly(x, z, d.p)) return d;
    return null;
  }

  // Districts off screen get a badge at the edge pointing towards them, so
  // you know there is more to the map. Tap one to go there.
  _drawBadges(g, me) {
    const W = this.canvas.width, H = this.canvas.height, dpr = this.dpr;
    const pad = 34 * dpr;
    const top = 50 * dpr; // under the "All of Seoul" button
    const narrow = W / dpr < 520;
    this.badges = [];
    const lang = getLanguage();
    for (const d of this.districts) {
      const [sx, sy] = this.toScreen(d.x, d.z);
      if (sx > pad && sx < W - pad && sy > pad && sy < H - pad) continue;
      // Where the line from the centre to the district leaves the screen.
      const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
      const k = Math.min((W / 2 - pad) / Math.abs(dx || 1e-6), (H / 2 - pad) / Math.abs(dy || 1e-6));
      const x = cx + dx * k, y = cy + dy * k;
      const km = Math.hypot(d.x - me.x, d.z - me.z) / 1000;
      const away = km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km';
      // Narrow maps (phones): smaller badges, so they cover less of the streets.
      const label = narrow ? `${localName(d.name, lang)} ${away}` : `${localName(d.name, lang)} · ${away}`;
      g.font = `800 ${(narrow ? 11 : 13) * dpr}px system-ui, sans-serif`;
      const w = g.measureText(label).width + (narrow ? 28 : 34) * dpr, h = (narrow ? 22 : 28) * dpr;
      let bx = Math.max(6 * dpr, Math.min(W - w - 6 * dpr, x - w / 2)), by = Math.max(top, Math.min(H - h - 6 * dpr, y - h / 2));
      // Badges on the same edge would stack on top of each other: slide this
      // one along the edge (down, or up near the bottom) until it is clear.
      const side = Math.abs(dx) * (H / 2 - pad) > Math.abs(dy) * (W / 2 - pad); // left or right edge
      for (let tries = 0; tries < this.districts.length; tries++) {
        const hit = this.badges.find((b) => bx < b.x + b.w && b.x < bx + w && by < b.y + b.h && b.y < by + h);
        if (!hit) break;
        if (side) by = hit.y + hit.h + 5 * dpr > H - h - 6 * dpr ? hit.y - h - 5 * dpr : hit.y + hit.h + 5 * dpr;
        else bx = hit.x + hit.w + 5 * dpr > W - w - 6 * dpr ? hit.x - w - 5 * dpr : hit.x + hit.w + 5 * dpr;
      }
      g.fillStyle = 'rgba(74,63,53,0.88)';
      g.beginPath();
      g.roundRect(bx, by, w, h, h / 2);
      g.fill();
      // Arrow towards the district.
      const a = Math.atan2(dy, dx), ax = bx + (narrow ? 12 : 15) * dpr, ay = by + h / 2;
      g.save();
      g.translate(ax, ay);
      g.rotate(a);
      g.fillStyle = '#ffd36e';
      g.beginPath();
      g.moveTo(7 * dpr, 0); g.lineTo(-5 * dpr, -6 * dpr); g.lineTo(-5 * dpr, 6 * dpr);
      g.closePath();
      g.fill();
      g.restore();
      g.fillStyle = '#fffaf0';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillText(label, bx + (narrow ? 22 : 27) * dpr, by + h / 2 + 1);
      g.textAlign = 'center';
      this.badges.push({ x: bx, y: by, w, h, d });
    }
  }

  // Slide the map to a district.
  goTo(x, z) {
    const from = { cx: this.view.cx, cz: this.view.cz }, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 450), e = 1 - (1 - k) ** 3;
      this.view.cx = from.cx + (x - from.cx) * e;
      this.view.cz = from.cz + (z - from.cz) * e;
      this.draw();
      if (k < 1 && this.open) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  _match(s) {
    return storeMatches(s.store, this.query, this.category, t('cat.' + s.store.category));
  }

  // Search box and category chips stay put; only the results are redrawn,
  // so typing keeps the keyboard open.
  _renderControls() {
    if (!this.controls) {
      this.controls = document.createElement('div');
      this.controls.className = 'map-controls';
      this.search = document.createElement('input');
      this.search.type = 'search';
      this.search.className = 'map-search';
      this.search.autocomplete = 'off';
      this.search.enterKeyHint = 'search';
      // Phones: no auto capitals or autocorrect (they turn "itaewon" into "Itaewon" or another word).
      this.search.setAttribute('autocapitalize', 'off');
      this.search.setAttribute('autocorrect', 'off');
      this.search.spellcheck = false;
      const onType = () => { if (this.query === this.search.value) return; this.query = this.search.value; this._renderResults(); this.draw(); };
      // iOS Korean keyboard: some versions only report the finished syllable
      // on compositionend/keyup, so listen to those as well.
      for (const ev of ['input', 'compositionend', 'keyup', 'change']) this.search.addEventListener(ev, onType);
      this.search.addEventListener('keydown', (e) => e.stopPropagation()); // don't walk while typing
      // Phones: while typing, the on-screen keyboard covers the bottom of the
      // screen, where the results list sits. Hide the map and show the results
      // right under the search box instead, sized to the space above the keyboard.
      this.search.addEventListener('focus', () => this._setSearching(true));
      this.search.addEventListener('blur', () => {
        // Wait a moment so a tap on a result lands before the layout changes back.
        clearTimeout(this._blurTimer);
        this._blurTimer = setTimeout(() => { if (document.activeElement !== this.search) this._setSearching(false); }, 200);
      });
      this.chips = document.createElement('div');
      this.chips.className = 'map-cats';
      this.controls.append(this.search, this.chips);
      this.results = document.createElement('div');
      this.results.className = 'map-results';
      this.list.replaceChildren(this.controls, this.results);
    }
    // Phones: the search box goes above the map, away from the credits at
    // the bottom of the screen; wider screens keep it atop the side list.
    const narrow = globalThis.matchMedia?.('(max-width: 700px)').matches;
    const body = this.list.closest('.map-body');
    if (narrow && body && this.controls.nextElementSibling !== body) body.before(this.controls);
    else if (!narrow && this.controls.parentElement !== this.list) this.list.prepend(this.controls);
    this.search.placeholder = t('map.search');
    this.search.value = this.query;
    // Categories wrap onto rows (sideways scrolling was hard with a mouse and
    // easy to miss on a phone). Folded, only the biggest few show, plus the
    // chosen one and a "+n" chip that unfolds the rest.
    const n = new Map();
    for (const s of this.stores) n.set(s.store.category, (n.get(s.store.category) || 0) + 1);
    const cats = [...n.keys()].sort((a, b) => n.get(b) - n.get(a));
    const FOLDED = narrow ? 3 : 5; // phones: fewer rows of chips, more room for the map
    const shown = this.catsOpen || cats.length <= FOLDED + 1 ? cats : cats.filter((c, i) => i < FOLDED || c === this.category);
    const chip = (text, on, run, cls = '') => {
      const b = document.createElement('button');
      b.className = 'map-cat' + (on ? ' on' : '') + cls;
      b.textContent = text;
      b.onclick = run;
      return b;
    };
    const pick = (c) => () => { this.category = c; this._renderList(); this.draw(); };
    const toggle = (open) => () => { this.catsOpen = open; this._renderList(); };
    this.chips.replaceChildren(
      ...[null, ...shown].map((c) => chip(c ? `${CATEGORY_ICON[c] || '🛍️'} ${t('cat.' + c)}` : t('map.all'), c === this.category, pick(c))),
      ...(shown.length < cats.length ? [chip(`+${cats.length - shown.length} ▾`, false, toggle(true), ' more')] : this.catsOpen ? [chip('▴', false, toggle(false), ' more')] : []),
    );
  }

  // Phone search mode: the results fill the card under the search box, and
  // the panel shrinks to the visible area above the keyboard (visualViewport).
  _setSearching(on) {
    const narrow = globalThis.matchMedia?.('(max-width: 700px)').matches;
    on = !!on && !!narrow && this.open;
    this.root.classList.toggle('map-searching', on);
    const vv = globalThis.visualViewport;
    if (on && vv && !this._fitViewport) {
      // Android: the back button hides the keyboard but leaves the search box
      // focused (no blur), so watch the height: once the keyboard has come up
      // and then gone away again, leave search mode and show the map.
      let full = vv.height, keyboard = false;
      this._fitViewport = () => {
        full = Math.max(full, vv.height);
        if (vv.height < full * 0.75) keyboard = true;
        else if (keyboard && vv.height > full * 0.9) { this.search.blur(); return; }
        this.root.style.top = `${vv.offsetTop}px`;
        this.root.style.height = `${vv.height}px`;
        this.root.style.bottom = 'auto';
      };
      vv.addEventListener('resize', this._fitViewport);
      vv.addEventListener('scroll', this._fitViewport);
      this._fitViewport();
    } else if (!on && this._fitViewport) {
      vv?.removeEventListener('resize', this._fitViewport);
      vv?.removeEventListener('scroll', this._fitViewport);
      this._fitViewport = null;
      this.root.style.top = this.root.style.height = this.root.style.bottom = '';
    }
    if (!on && this.open) { this._resize(); this.draw(); }
  }

  _renderList() {
    this._renderControls();
    this._renderResults();
  }

  _renderResults() {
    const lang = getLanguage();
    const out = this.results;
    out.innerHTML = '';
    const head = (key) => {
      const h = document.createElement('div');
      h.className = 'map-list-head';
      h.textContent = t(key);
      out.appendChild(h);
    };
    const row = (icon, color, title, sub, onClick) => {
      const b = document.createElement('button');
      b.className = 'map-row';
      const i = document.createElement('span');
      i.className = 'map-row-icon';
      i.textContent = icon;
      i.style.background = color;
      const tx = document.createElement('span');
      tx.className = 'map-row-text';
      const t1 = document.createElement('strong');
      t1.textContent = title;
      const t2 = document.createElement('small');
      t2.textContent = sub;
      tx.append(t1, t2);
      b.append(i, tx);
      b.onclick = onClick;
      out.appendChild(b);
    };
    const { me } = this.getPlayers();
    const dist = (x, z) => `${Math.round(Math.hypot(x - me.x, z - me.z))} m`;
    const filtering = !!(this.category || norm(this.query));
    const zones = this.category ? [] : this.zones.filter((z) => !filtering || [z.zone.id, ...Object.values(z.zone.name || {})].some((x) => norm(x).includes(norm(this.query))));
    // Districts by name (Seongsu, Gyeongbokgung, Itaewon): jump the map there.
    const dists = norm(this.query) && !this.category ? this.districts.filter((d) => [d.id, ...Object.values(d.name)].some((x) => norm(x).includes(norm(this.query)))) : [];
    for (const d of dists) {
      row('🗺️', '#fffaf0', localName(d.name, lang), dist(d.x, d.z), () => this.goTo(d.x, d.z));
    }
    if (zones.length) head('map.zones');
    for (const z of zones) {
      row(z.zone.id, z.zone.color, localName(z.zone.name, lang), dist(z.x, z.z), () => {
        this._pick({ kind: 'zone', id: z.zone.id, x: z.x, z: z.z, label: `${z.zone.id} · ${localName(z.zone.name, lang)}` });
      });
    }
    // Subway stations in every district: guide to the nearest exit.
    const stations = this.category ? [] : stationList(this.marks)
      .filter((st) => !filtering || stationMatches(st, this.query, t('map.stations')))
      .map((st) => ({ st, ex: nearestExit(st.exits, me.x, me.z) }))
      .sort((a, b) => Math.hypot(a.ex.x - me.x, a.ex.z - me.z) - Math.hypot(b.ex.x - me.x, b.ex.z - me.z));
    if (stations.length) head('map.stations');
    for (const { st, ex } of stations) {
      // One look for every station, no line names: no transfers to think about for now.
      row('🚇', '#5d6470', localName(st.name, lang), dist(ex.x, ex.z), () => this._pickStation(ex, localName(st.name, lang)));
    }
    const shops = this.stores.filter((s) => this._match(s));
    if (shops.length) head('map.shops');
    if (!shops.length && !zones.length && !dists.length && !stations.length) {
      const e = document.createElement('p');
      e.className = 'map-empty';
      e.textContent = t('map.noResults');
      out.appendChild(e);
    }
    const byDist = [...shops].sort((a, b) => Math.hypot(a.door.x - me.x, a.door.z - me.z) - Math.hypot(b.door.x - me.x, b.door.z - me.z));
    for (const s of byDist) {
      row(storeIcon(s.store), '#fffaf0', localName(s.store.name, lang),
        `${t('cat.' + s.store.category)} · ${dist(s.door.x, s.door.z)}`, () => {
          this._pick({ kind: 'store', id: s.store.id, x: s.door.x, z: s.door.z, label: localName(s.store.name, lang) });
        });
    }
  }

  _hit(sx, sy) {
    if (this.seoul && this.view.scale < SEOUL_ZOOM * this.dpr) {
      const d = this._guAt(...this.toWorld(sx, sy));
      return d ? { kind: 'gu', item: d } : null;
    }
    for (const b of this.badges) if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return { kind: 'district', item: b.d };
    // What was drawn last is on top: shops and bubbles before zones.
    let best = null, bd = Infinity;
    for (const h of this.hits || []) {
      const d = Math.hypot(h.sx - sx, h.sy - sy);
      if (d < h.r && (d < bd || (best?.kind === 'zone' && h.kind !== 'zone'))) { best = h; bd = d; }
    }
    return best && { kind: best.kind, item: best.item };
  }

  _bindInput() {
    const c = this.canvas;
    const pts = new Map();
    let moved = 0, pinch = 0;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    c.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pts.size === 1) {
        moved += Math.abs(dx) + Math.abs(dy);
        this.view.cx -= (dx * this.dpr) / this.view.scale;
        this.view.cz -= (dy * this.dpr) / this.view.scale;
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this._zoom(d / (pinch || d));
        pinch = d;
        moved = 99;
      }
      this.draw();
    });
    const up = (e) => {
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId);
      if (!p || moved > 8) return;
      const r = c.getBoundingClientRect();
      const sx = (e.clientX - r.left) * this.dpr, sy = (e.clientY - r.top) * this.dpr;
      const hit = this._hit(sx, sy);
      const lang = getLanguage();
      if (!hit) {
        // In taxi mode any spot on the map is a destination.
        if (this.taxi) {
          const [x, z] = this.toWorld(sx, sy);
          this.onTaxi({ x, z, label: t('taxi.here'), guide: null });
          this.hide();
        }
        return;
      }
      if (hit.kind === 'district') { this.goTo(hit.item.x, hit.item.z); return; }
      if (hit.kind === 'cluster') { // a bubble of shops: zoom in on it
        const [x, z] = this.toWorld(hit.item.sx, hit.item.sy);
        this._zoom(2.5);
        this.goTo(x, z);
        return;
      }
      if (hit.kind === 'gu') { // an open gu: zoom in on its district; the rest are coming soon
        const d = this.districts.find((q) => q.id === hit.item.district);
        if (d) { this.view.scale = 0.35 * this.dpr; this.goTo(d.x, d.z); } else this._soon(hit.item, lang);
        return;
      }
      if (hit.kind === 'station') { // an exit (or a station's exits drawn as one sign)
        const first = hit.item[0], { me } = this.getPlayers();
        const ex = hit.item.length > 1 ? nearestExit(hit.item.filter((m) => m.station === first.station), me.x, me.z) : first;
        this._pickStation(ex, hit.item.length > 1 ? ex.group?.() : ex.label?.());
      } else if (hit.kind === 'store') {
        const s = hit.item;
        this._pick({ kind: 'store', id: s.store.id, x: s.door.x, z: s.door.z, label: localName(s.store.name, lang) });
      } else {
        const z = hit.item;
        this._pick({ kind: 'zone', id: z.zone.id, x: z.x, z: z.z, label: `${z.zone.id} · ${localName(z.zone.name, lang)}` });
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', (e) => pts.delete(e.pointerId));
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15);
      this.draw();
    }, { passive: false });
    this.root.querySelector('.map-zoom-in').onclick = () => { this._zoom(1.3); this.draw(); };
    this.root.querySelector('.map-zoom-out').onclick = () => { this._zoom(1 / 1.3); this.draw(); };
    // Seoul overview: zoom right out (or back in to where you are).
    const seoulBtn = this.root.querySelector('.map-seoul');
    if (seoulBtn) {
      seoulBtn.hidden = !this.seoul;
      seoulBtn.onclick = () => {
        if (this.view.scale < SEOUL_ZOOM * this.dpr) { const { me } = this.getPlayers(); this.view.scale = this._homeScale(); this.view.cx = me.x; this.view.cz = me.z; }
        else { this.view.scale = 0.045 * this.dpr; this.view.cx = -1900; this.view.cz = -300; }
        this.draw();
      };
    }
    addEventListener('resize', () => { if (this.open) { this._resize(); this.draw(); } });
  }

  _zoom(f) {
    const min = (this.seoul ? 0.035 : 0.25) * this.dpr;
    this.view.scale = Math.max(min, Math.min(6 * this.dpr, this.view.scale * f));
  }

  // A closed gu was tapped: say so for a moment.
  _soon(d, lang) {
    const el = this.root.querySelector('.map-soon');
    if (!el) return;
    el.textContent = `🚧 ${localName(d.name, lang)} · ${t('map.soon')}`;
    el.hidden = false;
    clearTimeout(this._soonT);
    this._soonT = setTimeout(() => { el.hidden = true; }, 1800);
  }
}
