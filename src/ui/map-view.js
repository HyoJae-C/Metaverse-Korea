// Full-screen map: streets, meeting zones, stores, you and other players.
// Tap a zone or store (on the map or in the list) to get walking guidance.
import { t, localName, getLanguage } from '../core/i18n.js';

export const CATEGORY_ICON = { club: '🎧', bar: '🍸', cafe: '☕', beauty: '💄', fashion: '👕', popup: '🎪', lifestyle: '🕯️', restaurant: '🍢', workshop: '🧢', home: '🏠', library: '📚', school: '🏫', petshop: '🐶', park: '🌳', market: '🐟', play: '🎮', info: 'ℹ️' };

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

// Districts of a joined city (see core/districts.js), with names for the
// "more over here" badges at the map's edge.
export const DISTRICT_NAME = {
  seongsu: { en: 'Seongsu', ko: '성수', ja: '聖水', zh: '圣水', es: 'Seongsu', id: 'Seongsu', ar: 'سونغسو' },
  gyeongbokgung: { en: 'Gyeongbokgung', ko: '경복궁', ja: '景福宮', zh: '景福宫', es: 'Gyeongbokgung', id: 'Gyeongbokgung', ar: 'قصر غيونغبوكغونغ' },
  itaewon: { en: 'Itaewon', ko: '이태원', ja: '梨泰院', zh: '梨泰院', es: 'Itaewon', id: 'Itaewon', ar: 'إيتايوون' },
  hongdae: { en: 'Hongdae', ko: '홍대', ja: '弘大', zh: '弘大', es: 'Hongdae', id: 'Hongdae', ar: 'هونغداي' },
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
    if (x0 < x1) out.push({ id, x: (x0 + x1) / 2, z: (z0 + z1) / 2, name: DISTRICT_NAME[id] || { en: id } });
  }
  return out;
}

export class MapView {
  // onTaxi({ x, z, label, guide }): ride a taxi there (optional).
  constructor({ root, map, zones, stores, getPlayers, onGuide, onTaxi }) {
    Object.assign(this, { root, map, zones, stores, getPlayers, onGuide, onTaxi });
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
    this.view.scale = Math.min(this.canvas.width, this.canvas.height) / 520;
    this._renderList();
    this.draw();
  }

  hide() {
    this.open = false;
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
    if (!this.open) return;
    const g = this.canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    g.fillStyle = '#f3ecdc';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const poly = (p) => {
      g.beginPath();
      p.forEach(([x, z], i) => {
        const [sx, sy] = this.toScreen(x, z);
        if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy);
      });
    };
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

    const lang = getLanguage();
    const dpr = this.dpr;
    // Zones
    for (const z of this.zones) {
      const [sx, sy] = this.toScreen(z.x, z.z);
      g.fillStyle = z.zone.color + '33';
      g.beginPath();
      g.arc(sx, sy, z.zone.radius * this.view.scale, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = z.zone.color;
      g.beginPath();
      g.arc(sx, sy, 15 * dpr, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fffaf0';
      g.font = `900 ${16 * dpr}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(z.zone.id, sx, sy + 1);
    }
    // Stores
    g.font = `${18 * dpr}px system-ui, sans-serif`;
    for (const s of this.stores) {
      if (!this._match(s)) continue;
      const [sx, sy] = this.toScreen(s.door.x, s.door.z);
      g.fillStyle = '#fffaf0';
      g.beginPath();
      g.arc(sx, sy, 14 * dpr, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = s.store.colors.sign;
      g.lineWidth = 3 * dpr;
      g.stroke();
      g.fillText(s.store.icon || CATEGORY_ICON[s.store.category] || '🛍️', sx, sy + 1);
      if (this.view.scale > 0.9 * dpr) {
        g.fillStyle = '#4a3f35';
        g.font = `700 ${11 * dpr}px system-ui, sans-serif`;
        g.fillText(localName(s.store.name, lang), sx, sy + 24 * dpr);
        g.font = `${18 * dpr}px system-ui, sans-serif`;
      }
    }
    // Players
    const { me, others } = this.getPlayers();
    for (const o of others) {
      const [sx, sy] = this.toScreen(o.x, o.z);
      g.fillStyle = '#5b6cf0';
      g.beginPath();
      g.arc(sx, sy, 6 * dpr, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#4a3f35';
      g.font = `700 ${11 * dpr}px system-ui, sans-serif`;
      g.fillText(o.name, sx, sy - 13 * dpr);
    }
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
    this._drawBadges(g, me);
    void css;
  }

  // Districts off screen get a badge at the edge pointing towards them, so
  // you know there is more to the map. Tap one to go there.
  _drawBadges(g, me) {
    const W = this.canvas.width, H = this.canvas.height, dpr = this.dpr;
    const pad = 34 * dpr;
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
      const label = `${localName(d.name, lang)} · ${km < 1 ? Math.round(km * 1000) + ' m' : km.toFixed(1) + ' km'}`;
      g.font = `800 ${13 * dpr}px system-ui, sans-serif`;
      const w = g.measureText(label).width + 34 * dpr, h = 28 * dpr;
      const bx = Math.max(6 * dpr, Math.min(W - w - 6 * dpr, x - w / 2)), by = Math.max(6 * dpr, Math.min(H - h - 6 * dpr, y - h / 2));
      g.fillStyle = 'rgba(74,63,53,0.88)';
      g.beginPath();
      g.roundRect(bx, by, w, h, h / 2);
      g.fill();
      // Arrow towards the district.
      const a = Math.atan2(dy, dx), ax = bx + 15 * dpr, ay = by + h / 2;
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
      g.fillText(label, bx + 27 * dpr, by + h / 2 + 1);
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
    const cats = [...new Set(this.stores.map((s) => s.store.category))];
    this.chips.replaceChildren(...[null, ...cats].map((c) => {
      const b = document.createElement('button');
      b.className = 'map-cat' + (c === this.category ? ' on' : '');
      b.textContent = c ? `${CATEGORY_ICON[c] || '🛍️'} ${t('cat.' + c)}` : t('map.all');
      b.onclick = () => { this.category = c; this._renderList(); this.draw(); };
      return b;
    }));
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
    const shops = this.stores.filter((s) => this._match(s));
    if (shops.length) head('map.shops');
    if (!shops.length && !zones.length && !dists.length) {
      const e = document.createElement('p');
      e.className = 'map-empty';
      e.textContent = t('map.noResults');
      out.appendChild(e);
    }
    const byDist = [...shops].sort((a, b) => Math.hypot(a.door.x - me.x, a.door.z - me.z) - Math.hypot(b.door.x - me.x, b.door.z - me.z));
    for (const s of byDist) {
      row(CATEGORY_ICON[s.store.category] || '🛍️', '#fffaf0', localName(s.store.name, lang),
        `${t('cat.' + s.store.category)} · ${dist(s.door.x, s.door.z)}`, () => {
          this._pick({ kind: 'store', id: s.store.id, x: s.door.x, z: s.door.z, label: localName(s.store.name, lang) });
        });
    }
  }

  _hit(sx, sy) {
    for (const b of this.badges) if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return { kind: 'district', item: b.d };
    const r = 20 * this.dpr;
    for (const s of this.stores) {
      if (!this._match(s)) continue;
      const [x, y] = this.toScreen(s.door.x, s.door.z);
      if (Math.hypot(x - sx, y - sy) < r) return { kind: 'store', item: s };
    }
    for (const z of this.zones) {
      const [x, y] = this.toScreen(z.x, z.z);
      if (Math.hypot(x - sx, y - sy) < r) return { kind: 'zone', item: z };
    }
    return null;
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
      if (hit.kind === 'store') {
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
    addEventListener('resize', () => { if (this.open) { this._resize(); this.draw(); } });
  }

  _zoom(f) {
    this.view.scale = Math.max(0.25 * this.dpr, Math.min(6 * this.dpr, this.view.scale * f));
  }
}
