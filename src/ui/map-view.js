// Full-screen map: streets, meeting zones, stores, you and other players.
// Tap a zone or store (on the map or in the list) to get walking guidance.
import { t, localName, getLanguage } from '../core/i18n.js';

export const CATEGORY_ICON = { cafe: '☕', beauty: '💄', fashion: '👕', popup: '🎪', lifestyle: '🕯️', restaurant: '🍢', workshop: '🧢', home: '🏠', library: '📚' };

// Does a store match the search text? Looks at its names in every language,
// tagline, category and product names, ignoring case and spaces.
const norm = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, '');
export function storeMatches(store, query, category, catLabel = '') {
  if (category && store.category !== category) return false;
  const q = norm(query);
  if (!q) return true;
  const texts = [catLabel, store.category];
  for (const o of [store.name, store.tagline]) if (o) texts.push(...Object.values(o));
  for (const pr of store.products || []) if (pr.name) texts.push(...Object.values(pr.name));
  return texts.some((x) => norm(x).includes(q));
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
    g.fillStyle = '#bfe3a8';
    for (const a of this.map.areas) { poly(a.p); g.fill(); }
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
      g.fillText(CATEGORY_ICON[s.store.category] || '🛍️', sx, sy + 1);
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
    void css;
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
      this.search.addEventListener('input', () => { this.query = this.search.value; this._renderResults(); this.draw(); });
      this.search.addEventListener('keydown', (e) => e.stopPropagation()); // don't walk while typing
      this.chips = document.createElement('div');
      this.chips.className = 'map-cats';
      this.controls.append(this.search, this.chips);
      this.results = document.createElement('div');
      this.results.className = 'map-results';
      this.list.replaceChildren(this.controls, this.results);
    }
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
    if (zones.length) head('map.zones');
    for (const z of zones) {
      row(z.zone.id, z.zone.color, localName(z.zone.name, lang), dist(z.x, z.z), () => {
        this._pick({ kind: 'zone', id: z.zone.id, x: z.x, z: z.z, label: `${z.zone.id} · ${localName(z.zone.name, lang)}` });
      });
    }
    const shops = this.stores.filter((s) => this._match(s));
    if (shops.length) head('map.shops');
    if (!shops.length && !zones.length) {
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
