// The seed shop (종묘상) by Heunginjimun: sells the weekend farm's seeds
// that the farm itself doesn't (core/farm.js, from: 'shop'). What you buy
// goes into your seed pouch, which the keeper holds (core/farm-till.js: the
// server, or this browser when not connected), and is planted at the farm.
// Loaded by game/seed-shop-near.js when you come near.
import * as THREE from 'three';
import { mergeStatic } from '../core/merge-static.js';
import { t } from '../core/i18n.js';
import { won } from '../core/money.js';
import { CROPS, cropDays } from '../core/farm.js';
import { farmToWorld } from '../core/farm-site.js';
import { SEED_NEAR, SEED_SHOP, SEED_STAND } from '../core/seed-shop-site.js';
import { LocalFarm, SupabaseFarm, newRequestId } from '../core/farm-till.js';
import { DEFAULT_LOOK } from '../data/appearance.js';

const SHOW = 140; // m: the shop is drawn
const PACK = 12; // a bed each
const KEEPER_LOOK = { ...DEFAULT_LOOK, model: 'basic', shirt: 'leaf', pants: 'cocoa', hair: 'espresso', skin: 'warm', head: 'beanie-grey' };
const KEEPER_LINES = [
  ['씨앗은 텃밭에 가서 심으면 돼요!', 'ssiaseun teotbate gaseo simeumyeon dwaeyo!', 'seed.hi1'],
  ['오래 키울수록 값이 좋아요.', 'orae kiulsurok gapsi joayo.', 'seed.hi2'],
];
const el = (tag, cls = '', text = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

function signTexture(top, bottom, bg) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.strokeRect(8, 8, 496, 144);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 56px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  x.fillText(top, 256, 62);
  x.font = '600 28px system-ui, sans-serif';
  x.fillText(bottom, 256, 122);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The shop in its own metres: an open front under a striped awning, seed
// racks on the back wall, trays of seedlings and sacks out front.
function makeShop() {
  const g = new THREE.Group();
  const { hw, back, front, counter, h } = SEED_SHOP;
  const mats = {};
  const m = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
  const box = (sx, sy, sz, x, y, z, c) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m(c)); b.position.set(x, y, z); g.add(b); return b; };
  const WALL = '#efe6d2', WOOD = '#8f6a45', DARK = '#5c4630';
  box(hw * 2 + 0.6, 0.06, front - back + 3.2, 0, 0.03, (front + back) / 2 + 1.5, '#cfc6b4'); // the paving, out to the kerb
  box(hw * 2, h, 0.18, 0, h / 2, back, WALL); // the back wall
  for (const s of [-1, 1]) box(0.18, h, counter - back, s * hw, h / 2, (back + counter) / 2, WALL); // the side walls
  box(hw * 2 + 0.3, 0.14, counter - back + 0.3, 0, h + 0.07, (back + counter) / 2, DARK); // the roof
  // The seed racks: rows of little packets in every colour.
  const PACKS = ['#e2412f', '#f08a1f', '#f4d84a', '#93d05c', '#3f8f4a', '#7fb6e0', '#c58ad6', '#f1ecd2'];
  for (let r = 0; r < 3; r++) {
    box(hw * 2 - 0.5, 0.05, 0.22, 0, 1.0 + r * 0.5, back + 0.2, WOOD);
    for (let i = 0; i < 14; i++) box(0.26, 0.34, 0.05, -hw + 0.55 + i * 0.42, 1.2 + r * 0.5, back + 0.24, PACKS[(i + r * 3) % PACKS.length]);
  }
  // The counter, with a till and seed jars.
  box(hw * 2 - 1.6, 0.9, 0.6, 0, 0.45, counter, WOOD);
  box(hw * 2 - 1.5, 0.07, 0.72, 0, 0.93, counter, '#c79a6b');
  box(0.4, 0.26, 0.34, hw - 1.5, 1.1, counter, '#3b3f46');
  for (let i = 0; i < 4; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.26, 10), m(PACKS[i * 2])); j.position.set(-hw + 1.3 + i * 0.36, 1.1, counter); g.add(j); }
  // The awning: green and white stripes on two posts.
  const N = 10, aw = (hw * 2 + 0.4) / N;
  for (let i = 0; i < N; i++) { const a = box(aw, 0.06, front - counter + 0.9, -hw - 0.2 + aw / 2 + i * aw, h - 0.22, (front + counter) / 2 + 0.1, i % 2 ? '#f3f5f1' : '#3d8a52'); a.rotation.x = 0.16; }
  for (const s of [-1, 1]) box(0.08, h - 0.4, 0.08, s * (hw + 0.1), (h - 0.4) / 2, front + 0.35, '#f3f5f1');
  // Out front: trays of seedlings, sacks of soil, flower pots.
  for (const s of [-1, 1]) {
    box(1.3, 0.34, 0.8, s * (hw - 0.75), 0.23, front - 0.1, WOOD);
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 5), m(k ? '#58a84a' : '#93d05c')); v.position.set(s * (hw - 0.75) - 0.45 + i * 0.3, 0.48, front - 0.3 + k * 0.38); v.scale.y = 1.4; g.add(v); }
  }
  for (let i = 0; i < 3; i++) { const sack = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), m(i === 1 ? '#d9cba6' : '#c8b88f')); sack.scale.set(1, 0.7, 0.8); sack.position.set(-hw - 0.55, 0.24 + (i === 2 ? 0.36 : 0), counter + 0.1 + (i === 1 ? 0.55 : i === 2 ? 0.28 : 0)); g.add(sack); }
  [['#e8283c', 0], ['#f4d84a', 0.5], ['#c58ad6', 1]].forEach(([c, dz]) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.24, 10), m('#b5653f')); pot.position.set(hw + 0.55, 0.18, counter + dz); g.add(pot);
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), m(c)); fl.position.set(hw + 0.55, 0.45, counter + dz); g.add(fl);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.12), new THREE.MeshBasicMaterial({ map: signTexture('🌱 동대문 종묘상', 'Seed Shop', '#2f7d3a') }));
  sign.position.set(0, h + 0.75, counter + 0.05);
  g.add(sign);
  box(3.7, 0.08, 0.08, 0, h + 0.17, counter, DARK);
  mergeStatic(g, [sign]);
  return g;
}

// game: { scene, collision, spot: { x, z, ry } (the map's 'seedshop'
// landmark), root (the panel's element), cloud, wallet, refreshWallet(),
// toast(m), sfx, mode(), makeNpc(name, look), say(npc, phrase) }.
export function createSeedShop(game) {
  const spot = game.spot;
  const { hw, back, counter } = SEED_SHOP;
  const group = makeShop();
  group.position.set(spot.x, 0, spot.z);
  group.rotation.y = spot.ry || 0;
  group.updateMatrixWorld(true); // (main.js's FarCull measures its parts where they stand)
  game.scene.add(group);
  const W = (lx, lz) => farmToWorld(spot, lx, lz);
  const rect = (x0, z0, x1, z1) => ({ p: [W(x0, z0), W(x1, z0), W(x1, z1), W(x0, z1)] });
  game.collision.add([rect(-hw - 0.1, back - 0.1, hw + 0.1, counter + 0.36)]);
  const stand = W(...SEED_STAND);
  const keeper = game.makeNpc('🧑‍🌾 ' + t('seed.keeper'), KEEPER_LOOK);
  { const [x, z] = W(0, counter - 0.8); keeper.ch.root.position.set(x, 0, z); keeper.ch.root.rotation.y = spot.ry || 0; keeper.tag.style.display = 'none'; game.scene.add(keeper.ch.root); }

  let till = null;
  const store = () => {
    const live = game.cloud.status === 'cloud' && game.cloud.client && game.cloud.user;
    if (live && !(till instanceof SupabaseFarm)) till = new SupabaseFarm(game.cloud, game.wallet);
    if (!live && !till) till = new LocalFarm(game.wallet);
    return till;
  };
  let seeds = {}, prices = null, known = false, problem = null, busy = false;
  const price = (c) => prices?.[c.id]?.seed ?? c.seed;
  async function ask() {
    const r = await store().info();
    if (r.error) { problem = r.error; render(); return; }
    problem = null; known = true; seeds = r.seeds || {}; prices = r.crops;
    render();
  }
  function buy(c, n) {
    if (busy || !known) return;
    const total = price(c) * n;
    if (game.wallet.coins < total) { game.toast(t('farm.poor', { n: won(total) })); return; }
    game.wallet.confirm(total, { k: 'ledger.farmSeed' }, async () => {
      busy = true; render();
      const r = await store().buySeeds({ requestId: newRequestId(), crop: c.id, n, price: total }, { k: 'ledger.farmSeed' });
      busy = false;
      game.refreshWallet();
      if (r.error) { game.toast(t({ coins: 'farm.poor', price: 'farm.price', missing: 'farm.missing' }[r.error] || 'farm.network', { n: won(r.price ?? total) })); await ask(); return; }
      seeds = r.seeds;
      game.sfx?.pop?.();
      game.toast(t('seed.bought', { n, name: t('farm.' + c.id) }));
      render();
    });
  }

  // The panel.
  const root = game.root;
  root.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  const ui = {
    get open() { return !root.hidden; },
    close() { if (!busy) root.hidden = true; },
    show() { root.hidden = false; render(); ask(); },
  };
  function render() {
    if (root.hidden) return;
    const x = el('button', 'sheet-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => ui.close();
    const parts = [x, el('strong', 'wallet-title', '🌱 ' + t('seed.shop'))];
    if (problem === 'missing') { root.replaceChildren(...parts, el('p', 'board-empty', t('farm.missing'))); return; }
    parts.push(el('p', 'fine', t('seed.how')));
    if (!store().shared) parts.push(el('p', 'fine board-warn', t('farm.local')));
    if (problem) parts.push(el('p', 'lock-warn', t('farm.network')));
    const list = el('div', 'bait-list');
    for (const c of CROPS.filter((q) => q.from === 'shop')) {
      const row = el('div', 'bait-row farm-row');
      const txt = el('div', 'bait-text');
      const have = seeds[c.id] || 0;
      txt.append(el('b', null, `${c.emoji} ${t('farm.' + c.id)} · ${t('farm.days', { n: cropDays(c) })}`),
        el('small', null, t('farm.row', { sell: won(prices?.[c.id]?.sell ?? c.sell), fresh: won(prices?.[c.id]?.fresh ?? c.fresh) }) + (have ? ' · ' + t('seed.have', { n: have }) : '')));
      const one = el('button', 'primary', won(price(c)));
      one.type = 'button';
      one.disabled = busy || !known;
      one.onclick = () => buy(c, 1);
      const many = el('button', 'chip', t('seed.pack', { n: PACK, price: won(price(c) * PACK) }));
      many.type = 'button';
      many.disabled = busy || !known;
      many.onclick = () => buy(c, PACK);
      row.append(txt, one, many);
      list.append(row);
    }
    parts.push(list, el('small', 'fine', t('temple.have', { n: Number(game.wallet.coins).toLocaleString('en-US') })));
    root.replaceChildren(...parts);
  }

  return {
    group, ui,
    update(p, dt) {
      const d = Math.hypot(p.x - spot.x, p.z - spot.z), street = game.mode() === 'street';
      group.visible = street && d < SHOW;
      const close = street && d < 30;
      keeper.ch.root.visible = close;
      if (close) keeper.ch.animate(dt, 0); else keeper.tag.style.display = 'none';
    },
    staffNear: () => (keeper.ch.root.visible ? [keeper] : []),
    act(p) {
      if (game.mode() !== 'street' || Math.hypot(p.x - stand[0], p.z - stand[1]) > SEED_NEAR) return null;
      return { key: 'seed-shop', label: '🌱 ' + t('seed.shop'), run: () => { keeper.ch.wave?.(); const [ko, rom, k] = KEEPER_LINES[Math.floor(Math.random() * KEEPER_LINES.length)]; game.say?.(keeper, [ko, rom, t(k)]); ui.show(); } };
    },
  };
}
