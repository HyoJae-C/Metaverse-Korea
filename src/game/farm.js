// The weekend farm (core/farm.js has the rules, core/farm-till.js the
// keeper): the glasshouse at Yongsan Family Park's eco allotments with
// everyone's twelve beds, and the stall outside that buys what you picked.
// You see your own crops in the beds; someone else standing there sees
// theirs. Loaded by game/farm-near.js when you come near.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStatic } from '../core/merge-static.js';
import { lazyPanel } from '../core/lazy-panel.js';
import { t } from '../core/i18n.js';
import { won } from '../core/money.js';
import { CROPS, barnCount, barnWorth, bedAct, bedState, cropById, cropDays, timeLeft } from '../core/farm.js';
import { BED, BED_SPOTS, FARM_HOUSE, STALL, STALL_STAND, bedNear, farmToLocal, farmToWorld } from '../core/farm-site.js';
import { LocalFarm, SupabaseFarm, newRequestId } from '../core/farm-till.js';
import { DEFAULT_LOOK } from '../data/appearance.js';

const STALL_NEAR = 3; // m from the stall's counter: its button
const SHOW = 140; // m: the glasshouse is drawn
const ASK_EVERY = 120e3; // ms: ask the keeper again while you stay (another device may have farmed)
const FARMER_LOOK = { ...DEFAULT_LOOK, model: 'basic', shirt: 'leaf', pants: 'olive', hair: 'espresso', skin: 'warm', head: 'bucket-grey' };
const FARMER_LINES = [
  ['물은 하루에 한 번, 매일 줘야 싱싱해요!', 'mureun harue han beon, maeil jwoya singsinghaeyo!', 'farm.hi1'],
  ['오늘 딴 채소가 제일 맛있죠!', 'oneul ttan chaesoga jeil masitjyo!', 'farm.hi2'],
];
const SOIL_TOP = 0.34;
const PLANTS = [[-0.36, -0.42], [0.36, -0.42], [-0.36, 0.42], [0.36, 0.42]]; // four in a bed
// How each crop looks: its leaves (a squashed ball: half sizes when grown,
// colour) and its fruit (when it shows, where, sizes, colour unripe → ripe).
const LOOKS = {
  lettuce: { leaf: [0.27, 0.15, 0.27], color: '#93d05c' },
  spinach: { leaf: [0.22, 0.2, 0.22], color: '#2f7d3a' },
  cucumber: { leaf: [0.24, 0.42, 0.24], color: '#4c9a4a', fruit: { at: [0.16, 0.3, 0.1], s: [0.055, 0.17, 0.055], from: '#7fbf5a', to: '#2f8a3c' } },
  carrot: { leaf: [0.16, 0.3, 0.16], color: '#58a84a', fruit: { at: [0, 0.0, 0], s: [0.09, 0.07, 0.09], from: '#f2a14a', to: '#ee7b22', ripeOnly: true } },
  corn: { leaf: [0.15, 0.62, 0.15], color: '#5aa13f', fruit: { at: [0.13, 0.5, 0.06], s: [0.07, 0.17, 0.07], from: '#cfe07a', to: '#f5d13a' } },
  tomato: { leaf: [0.2, 0.5, 0.2], color: '#3f8f3f', fruit: { at: [0.14, 0.52, 0.1], s: [0.1, 0.1, 0.1], from: '#9fc24a', to: '#e2412f' } },
  strawberry: { leaf: [0.27, 0.16, 0.27], color: '#3f9a48', fruit: { at: [0.17, 0.12, 0.13], s: [0.085, 0.1, 0.085], from: '#e9efc0', to: '#e8283c' } },
  ginseng: { leaf: [0.2, 0.3, 0.2], color: '#2f8f4f', fruit: { at: [0, 0.36, 0], s: [0.07, 0.07, 0.07], from: '#5fa83f', to: '#d8262c' } },
  chili: { leaf: [0.2, 0.36, 0.2], color: '#3c8a4a', fruit: { at: [0.13, 0.36, 0.08], s: [0.05, 0.15, 0.05], from: '#5fa83f', to: '#d92b2b' } },
  cabbage: { leaf: [0.31, 0.25, 0.31], color: '#bfe0a0', fruit: { at: [0, 0.2, 0], s: [0.2, 0.2, 0.2], from: '#d8ecb4', to: '#eef6d2' } },
};

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
function emojiTexture(emoji) {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const x = c.getContext('2d');
  x.font = '72px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(emoji, 48, 54);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The glasshouse and the stall, in the house's own metres (door at +z).
function makeHouse() {
  const g = new THREE.Group();
  const { hw, hl, wall, ridge, door } = FARM_HOUSE;
  const mats = {};
  const m = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
  const box = (sx, sy, sz, x, y, z, c) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m(c)); b.position.set(x, y, z); g.add(b); return b; };
  const WHITE = '#f3f5f1', KNEE = '#b9b3a6', WOOD = '#9a6f48';
  box(hw * 2, 0.04, hl * 2, 0, 0.02, 0, '#d6cfbf'); // the floor
  box(1.3, 0.02, hl * 2 - 0.6, 0, 0.05, 0, '#c2b9a6'); // the aisle's paving
  // The low wall round it (not across the door).
  for (const sx of [-hw, hw]) box(0.16, 0.4, hl * 2, sx, 0.2, 0, KNEE);
  box(hw * 2, 0.4, 0.16, 0, 0.2, -hl, KNEE);
  const side = hw - door / 2;
  for (const s of [-1, 1]) box(side, 0.4, 0.16, s * (door / 2 + side / 2), 0.2, hl, KNEE);
  // The frame: posts, eaves, the ridge and a rafter pair at every post.
  const N = 6, rl = Math.hypot(hw, ridge - wall), ra = Math.atan2(ridge - wall, hw);
  for (let i = 0; i <= N; i++) {
    const z = -hl + (i * hl * 2) / N;
    for (const s of [-1, 1]) {
      box(0.09, wall, 0.09, s * hw, wall / 2, z, WHITE);
      const r = box(rl, 0.08, 0.08, (s * hw) / 2, (wall + ridge) / 2, z, WHITE);
      r.rotation.z = -s * ra;
    }
  }
  for (const s of [-1, 1]) box(0.09, 0.09, hl * 2, s * hw, wall, 0, WHITE);
  box(0.09, 0.09, hl * 2, 0, ridge, 0, WHITE);
  for (const s of [-1, 1]) box(0.09, 2.1, 0.09, (s * door) / 2, 1.05, hl, WHITE); // the door's posts
  box(door + 0.1, 0.09, 0.09, 0, 2.1, hl, WHITE);
  box(hw * 2, 0.09, 0.09, 0, wall, -hl, WHITE);
  box(hw * 2, 0.09, 0.09, 0, wall, hl, WHITE);
  // The beds' wooden edges (the soil and the plants are drawn apart: they change).
  for (const [bx, bz] of BED_SPOTS) box(BED.w + 0.14, 0.3, BED.l + 0.14, bx, 0.15, bz, WOOD);
  // The glass: the walls, the gable ends and the roof, one see-through mesh.
  const panes = [];
  const pane = (w, h, x, y, z, ry = 0, rx = 0, rz = 0) => {
    const p = new THREE.PlaneGeometry(w, h);
    p.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)));
    panes.push(p);
  };
  for (const s of [-1, 1]) {
    pane(hl * 2, wall - 0.4, s * hw, (wall + 0.4) / 2, 0, Math.PI / 2);
    pane(hl * 2, rl, (s * hw) / 2, (wall + ridge) / 2, 0, Math.PI / 2, -Math.PI / 2 + s * ra);
    pane(side, wall - 0.4, s * (door / 2 + side / 2), (wall + 0.4) / 2, hl);
  }
  pane(hw * 2, wall - 0.4, 0, (wall + 0.4) / 2, -hl);
  pane(door, wall - 2.1, 0, (wall + 2.1) / 2, hl);
  for (const z of [-hl, hl]) { // the gables' triangles
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-hw, wall, z, hw, wall, z, 0, ridge, z], 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    panes.push(tri);
  }
  const glass = new THREE.Mesh(mergeGeometries(panes.map((p) => (p.index ? p.toNonIndexed() : p))), new THREE.MeshBasicMaterial({ color: '#d5eef5', transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  glass.renderOrder = 2;
  g.add(glass);
  // The sign over the door.
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.78), new THREE.MeshBasicMaterial({ map: signTexture('🥬 친환경 텃밭', 'Eco Farm', '#3d8a52') }));
  sign.position.set(0, 2.62, hl + 0.08);
  g.add(sign);
  // The stall: a counter under a striped awning, crates of vegetables.
  const sx = STALL.x, sz = STALL.z;
  box(2.4, 0.9, 0.8, sx, 0.45, sz, WOOD);
  box(2.5, 0.08, 0.95, sx, 0.94, sz, '#c79a6b');
  for (const px of [-1.15, 1.15]) for (const pz of [-0.4, 0.5]) box(0.07, 2.3, 0.07, sx + px, 1.15, sz + pz, WHITE);
  for (let i = 0; i < 6; i++) { const a = box(0.42, 0.06, 1.3, sx - 1.05 + i * 0.42, 2.34, sz + 0.05, i % 2 ? '#f3f5f1' : '#4c9a5f'); a.rotation.x = 0.12; }
  [['#93d05c', -0.75], ['#e2412f', 0], ['#bfe0a0', 0.75]].forEach(([c, dx]) => {
    box(0.6, 0.22, 0.5, sx + dx, 1.09, sz, '#b98a58');
    for (const [ox, oz] of [[-0.14, -0.1], [0.14, -0.08], [0, 0.1]]) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), m(c)); v.position.set(sx + dx + ox, 1.26, sz + oz); g.add(v); }
  });
  const stallSign = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.72), new THREE.MeshBasicMaterial({ map: signTexture('🧺 채소 직판장', 'Farm Stand', '#b0692f') }));
  stallSign.position.set(sx, 2.75, sz + 0.62);
  g.add(stallSign);
  for (const px of [-1.1, 1.1]) box(0.06, 0.5, 0.06, sx + px, 2.6, sz + 0.6, WHITE);
  mergeStatic(g, [glass, sign, stallSign]);
  return g;
}

// game: { scene, collision, spot: { x, z, ry } (the map's 'farm' landmark),
// root (the panel's element), cloud, wallet, refreshWallet(), toast(m), sfx,
// me, mode(), makeNpc(name, look), say(npc, phrase), journal (core/
// farm-journal.js), onJournal() }.
export function createFarm(game) {
  const spot = game.spot;
  const { hw, hl, door } = FARM_HOUSE;
  const group = makeHouse();
  group.position.set(spot.x, 0, spot.z);
  group.rotation.y = spot.ry || 0;
  group.updateMatrixWorld(true); // (main.js's FarCull measures its parts where they stand)
  game.scene.add(group);
  const W = (lx, lz) => farmToWorld(spot, lx, lz);
  const rect = (x0, z0, x1, z1) => ({ p: [W(x0, z0), W(x1, z0), W(x1, z1), W(x0, z1)], low: true }); // (low: the camera looks through the glass)
  game.collision.add([
    rect(-hw - 0.12, -hl, -hw + 0.12, hl), rect(hw - 0.12, -hl, hw + 0.12, hl), rect(-hw, -hl - 0.12, hw, -hl + 0.12),
    rect(-hw, hl - 0.12, -door / 2, hl + 0.12), rect(door / 2, hl - 0.12, hw, hl + 0.12),
    rect(-1.5 - BED.w / 2, BED_SPOTS.at(-1)[1] - BED.l / 2, -1.5 + BED.w / 2, BED_SPOTS[0][1] + BED.l / 2),
    rect(1.5 - BED.w / 2, BED_SPOTS.at(-1)[1] - BED.l / 2, 1.5 + BED.w / 2, BED_SPOTS[0][1] + BED.l / 2),
    rect(STALL.x - 1.25, STALL.z - 0.45, STALL.x + 1.25, STALL.z + 0.5),
  ]);
  const stand = W(...STALL_STAND);

  // The farmer behind the counter.
  const farmer = game.makeNpc('🧑‍🌾 ' + t('farm.farmer'), FARMER_LOOK);
  { const [x, z] = W(STALL.x, STALL.z - 0.75); farmer.ch.root.position.set(x, 0, z); farmer.ch.root.rotation.y = spot.ry || 0; farmer.tag.style.display = 'none'; game.scene.add(farmer.ch.root); }

  // What changes: the soil, the plants and their fruit, the signs over a bed.
  const n = BED_SPOTS.length, ball = new THREE.SphereGeometry(1, 8, 6);
  const soil = new THREE.InstancedMesh(new THREE.BoxGeometry(BED.w, 0.04, BED.l), new THREE.MeshLambertMaterial({ color: '#ffffff' }), n);
  const leaves = new THREE.InstancedMesh(ball, new THREE.MeshLambertMaterial({ color: '#ffffff' }), n * PLANTS.length);
  const fruits = new THREE.InstancedMesh(ball, new THREE.MeshLambertMaterial({ color: '#ffffff' }), n * PLANTS.length);
  for (const im of [soil, leaves, fruits]) { im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; group.add(im); }
  const TEX = { water: emojiTexture('💧'), pick: emojiTexture('🧺') };
  const marks = BED_SPOTS.map(([bx, bz]) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.water, depthTest: false }));
    s.scale.setScalar(0.55); s.position.set(bx, 1.45, bz); s.visible = false; s.renderOrder = 3;
    group.add(s);
    return s;
  });
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), col2 = new THREE.Color();
  const put = (im, i, x, y, z, sx, sy, sz, c) => { im.setMatrixAt(i, m4.compose(v3.set(x, y, z), q0, sc.set(sx, sy, sz))); im.setColorAt(i, c); };

  // My farm as the keeper last said, and how far its clock is from mine.
  let beds = Array.from({ length: n }, () => null), barn = {}, crops = null, skew = 0, known = false, problem = null;
  let busy = false, askedAt = -Infinity, drawn = '';
  const now = () => Date.now() + skew;
  const crop = (id) => { const c = cropById(id); return c && crops?.[id] ? { ...c, ...crops[id] } : c; };
  const name = (c) => t('farm.' + c.id);
  const time = (ms) => { const { d, h, m } = timeLeft(ms); return d ? t(h ? 'farm.dh' : 'farm.d', { d, h }) : h ? t(m ? 'farm.hm' : 'farm.h', { h, m }) : t('farm.m', { m: Math.max(1, m) }); };

  let till = null;
  const store = () => {
    const live = game.cloud.status === 'cloud' && game.cloud.client && game.cloud.user;
    if (live && !(till instanceof SupabaseFarm)) till = new SupabaseFarm(game.cloud, game.wallet);
    if (!live && !till) till = new LocalFarm(game.wallet);
    return till;
  };
  async function ask() {
    askedAt = performance.now();
    const r = await store().info();
    if (r.error) { problem = r.error; return; }
    problem = null; known = true;
    skew = r.now - Date.now();
    beds = Array.from({ length: n }, (_, i) => r.beds[i] || null);
    barn = r.barn; crops = r.crops;
    drawn = '';
    if (ui.open) ui.refresh();
  }
  const whyNot = (e, v = {}) => t({ coins: 'farm.poor', price: 'farm.price', busy: 'farm.busy', missing: 'farm.missing', late: 'farm.late', wet: 'farm.wetAlready', unripe: 'farm.unripe', none: 'farm.barnEmpty' }[e] || 'farm.network', v);

  // Draw the beds as they stand now (only when something changed).
  function draw() {
    const t0 = now();
    const states = beds.map((b) => bedState(b, t0));
    const key = states.map((s, i) => (s.crop ? `${beds[i].crop}${s.stage[0]}${s.n}${Math.round(s.t * 40)}` : '-')).join('|');
    if (key === drawn) return;
    drawn = key;
    states.forEach((s, i) => {
      const [bx, bz] = BED_SPOTS[i];
      put(soil, i, bx, SOIL_TOP - 0.02, bz, 1, 1, 1, col.set(s.crop && s.stage === 'growing' ? '#4a3222' : '#6e4d35')); // (dark: watered today)
      const look = s.crop && LOOKS[s.crop.id];
      PLANTS.forEach(([px, pz], k) => {
        const j = i * PLANTS.length + k;
        if (!look) { put(leaves, j, bx, -5, bz, 0, 0, 0, col.set('#000')); put(fruits, j, bx, -5, bz, 0, 0, 0, col); return; }
        const gr = 0.18 + 0.82 * s.t, [lx, ly, lz] = look.leaf;
        put(leaves, j, bx + px, SOIL_TOP + ly * gr * 0.85, bz + pz, lx * gr, ly * gr, lz * gr, col.set(look.color));
        const f = look.fruit, fg = !f ? 0 : f.ripeOnly ? (s.stage === 'ripe' ? 1 : 0) : Math.max(0, (s.t - 0.55) / 0.45);
        if (!fg) { put(fruits, j, bx, -5, bz, 0, 0, 0, col); return; }
        col.set(f.from).lerp(col2.set(f.to), s.stage === 'ripe' ? 1 : fg * 0.6);
        put(fruits, j, bx + px + f.at[0], SOIL_TOP + Math.max(0.06, f.at[1] * gr), bz + pz + f.at[2], f.s[0] * fg, f.s[1] * fg, f.s[2] * fg, col);
      });
      const act = s.stage === 'thirsty' ? 'water' : s.stage === 'ripe' ? 'pick' : null;
      marks[i].visible = !!act;
      if (act) marks[i].material.map = TEX[act];
    });
    for (const im of [soil, leaves, fruits]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
  }
  draw();

  // ---------- What you do ----------
  const empties = () => beds.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0);
  // Plant `c` in these beds: one question for the lot, then bed by bed.
  function plant(list, c) {
    if (busy || !list.length) return;
    const total = c.seed * list.length;
    if (game.wallet.coins < total) { game.toast(t('farm.poor', { n: won(total) })); return; }
    game.wallet.confirm(total, { k: 'ledger.farmSeed' }, async () => {
      busy = true; ui.refresh();
      let done = 0, err = null;
      for (const bed of list) {
        const r = await store().plant({ requestId: newRequestId(), bed, crop: c.id, price: c.seed }, { k: 'ledger.farmSeed' });
        if (r.error) { err = r; if (r.error !== 'busy') break; continue; }
        if (r.bed) { beds[bed] = r.bed; done++; }
      }
      busy = false; drawn = '';
      game.refreshWallet();
      if (done) { game.sfx?.pop?.(); game.me?.play?.('clap'); game.toast(t(done > 1 ? 'farm.plantedN' : 'farm.planted', { name: name(c), n: done, time: time(c.grow * 60e3) })); }
      if (err) { game.toast(whyNot(err.error, { n: won(err.price ?? total) })); await ask(); }
      if (done) ui.close(); else ui.refresh();
    });
  }
  async function water(i) {
    if (busy) return;
    busy = true;
    const r = await store().water(i);
    busy = false;
    if (r.error) { game.toast(whyNot(r.error)); ask(); return; }
    beds[i] = { ...beds[i], wet: r.wet, n: r.n }; drawn = '';
    game.sfx?.pop?.();
    const need = bedState(beds[i], now()).need;
    game.toast(t(r.n >= need ? 'farm.wateredAll' : 'farm.watered', { n: r.n, all: need }));
  }
  async function pick(i) {
    if (busy) return;
    busy = true;
    const r = await store().pick(i);
    busy = false;
    if (r.error) { game.toast(whyNot(r.error)); ask(); return; }
    beds[i] = null; barn = r.barn; drawn = '';
    game.sfx?.pop?.(); game.me?.play?.('clap');
    const c = crop(r.crop);
    game.toast(t(r.fresh ? 'farm.pickedFresh' : 'farm.picked', { name: c ? name(c) : '', n: barnCount(barn) }));
    // The farmer's journal: a stamp for every kind you harvested yourself.
    if (c && game.journal?.add(c.id, r.fresh)) setTimeout(() => game.toast(t('farm.logNew', { name: name(c), k: game.journal.kinds, all: CROPS.length })), 2600);
    game.onJournal?.();
  }
  let sellId = null;
  async function sell() {
    if (busy || !barnCount(barn)) return;
    busy = true; ui.refresh();
    sellId ||= newRequestId();
    const r = await store().sell({ requestId: sellId }, { k: 'ledger.farmSell' });
    busy = false;
    if (r.error) { game.toast(whyNot(r.error)); if (r.error === 'none') { sellId = null; barn = {}; } ui.refresh(); return; }
    sellId = null; barn = {};
    game.refreshWallet();
    game.sfx?.pop?.();
    if (r.sold) game.toast(t('farm.sold', { n: r.sold, price: won(r.paid) }));
    ui.refresh();
  }

  // The panel: the seeds for a bed, or the stall.
  const view = {
    get busy() { return busy; }, get known() { return known; }, get problem() { return problem; }, get local() { return !store().shared; },
    get barn() { return barn; }, get coins() { return game.wallet.coins; }, get empty() { return empties().length; },
    crops: () => CROPS.map((c) => crop(c.id)), name, time, days: cropDays,
    worth: () => Object.entries(barn).reduce((s, [k, v]) => { const f = k.endsWith('+'), c = crop(f ? k.slice(0, -1) : k); return s + (c && v > 0 ? (f ? c.fresh : c.sell) * v : 0); }, 0) || barnWorth(barn),
    plantOne: (bed, c) => plant([bed], c), plantAll: (c) => plant(empties(), c), sell,
  };
  const ui = lazyPanel(() => import('../ui/farm-ui.js').then(({ FarmUI }) => new FarmUI({ root: game.root, view })), { refresh: () => {} });

  let seen = false, tick = 0;
  return {
    group, ui,
    update(p, dt) {
      const d = Math.hypot(p.x - spot.x, p.z - spot.z), street = game.mode() === 'street';
      group.visible = street && d < SHOW;
      const close = street && d < 30;
      farmer.ch.root.visible = close;
      if (close) farmer.ch.animate(dt, 0); else farmer.tag.style.display = 'none';
      if (!close) { seen = false; return; }
      if (!seen || performance.now() - askedAt > ASK_EVERY) { seen = true; if (!busy) ask(); }
      if ((tick -= dt) <= 0) { tick = 1; draw(); }
      const bob = 1.45 + Math.sin(performance.now() / 300) * 0.06;
      for (const s of marks) if (s.visible) s.position.y = bob;
    },
    staffNear: () => (farmer.ch.root.visible ? [farmer] : []),
    // The button: at a bed inside, or at the stall.
    act(p) {
      if (game.mode() !== 'street') return null;
      if (Math.hypot(p.x - stand[0], p.z - stand[1]) < STALL_NEAR) {
        return { key: 'farm-stall', label: '🧺 ' + t('farm.stall'), run: () => { farmer.ch.wave?.(); const [ko, rom, k] = FARMER_LINES[Math.floor(Math.random() * FARMER_LINES.length)]; game.say?.(farmer, [ko, rom, t(k)]); ui.showStall(); } };
      }
      const [lx, lz] = farmToLocal(spot, p.x, p.z);
      if (Math.abs(lx) > hw || Math.abs(lz) > hl) return null;
      const i = bedNear(lx, lz);
      if (i < 0) return null;
      if (problem === 'missing') return { key: 'farm-soon', label: '🌱 ' + t('farm.plant'), run: () => game.toast(t('farm.missing')) };
      if (!known) return null;
      const s = bedState(beds[i], now()), a = bedAct(beds[i], now());
      if (a === 'plant') return { key: 'farm-plant:' + i, label: '🌱 ' + t('farm.plant'), run: () => ui.showSeeds(i) };
      if (a === 'water') return { key: 'farm-water:' + i, label: `💧 ${t('farm.water')} ${s.n + 1}/${s.need}`, run: () => water(i) };
      if (a === 'pick') return { key: 'farm-pick:' + i, label: '🧺 ' + t('farm.pick', { name: name(s.crop) }), run: () => pick(i) };
      return { key: 'farm-wait:' + i, label: `${s.crop.emoji} ${time(s.left)}`, run: () => game.toast(t(s.fresh ? 'farm.growingWet' : 'farm.growing', { name: name(s.crop), time: time(s.left), n: s.n, all: s.need })) };
    },
  };
}
