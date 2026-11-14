// Seoul Forest's tandem bike rental (core/tandem-rental.js has the rules):
// the booth with its bikes, renting, the meter on its chip, the park's edge
// while you ride, and the once-ever bonus for riding it with someone.
// Loaded by game/tandem-rental-near.js when you come near Seoul Forest.
import * as THREE from 'three';
import { makeTandem } from '../core/bikes.js';
import { mergeStatic } from '../core/merge-static.js';
import { won } from '../core/money.js';
import { t } from '../core/i18n.js';
import { BASE, BASE_MIN, PER_MIN, SEEN_EVERY, TOGETHER, forestAreas, inForest, owed, rentCost, saveRent } from '../core/tandem-rental.js';

const NEAR = 4; // m from the booth's counter: the rent button
const EDGE_TOAST_EVERY = 5000; // ms
const BONUS_KEY = 'mk.tandemTogether'; // '1' once the bonus was paid (the wallet's op id makes it once on the server too)
const COLORS = ['#e0604d', '#3f8fd2', '#f2b632', '#4caf6e'];

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = '#2f7d4f'; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.strokeRect(8, 8, 496, 144);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 60px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  x.fillText('🚲 2인 자전거 대여', 256, 64);
  x.font = '600 28px system-ui, sans-serif';
  x.fillText('Tandem Bike Rental', 256, 124);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The booth: a small green kiosk with a counter at its front (+z) and the
// bikes parked in a row beside it. In its own metres, front towards +z.
function makeBooth() {
  const g = new THREE.Group();
  const mats = {};
  const m = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
  const box = (sx, sy, sz, x, y, z, c) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m(c)); b.position.set(x, y, z); g.add(b); return b; };
  box(2.4, 2.1, 1.8, 0, 1.05, 0, '#f4f1e8'); // walls
  box(2.8, 0.18, 2.3, 0, 2.2, 0.1, '#2f7d4f'); // roof
  box(2.4, 0.12, 0.45, 0, 0.95, 1.1, '#8a6446'); // counter
  box(1.8, 0.8, 0.04, 0, 1.55, 0.91, '#bfe3ff'); // window
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshBasicMaterial({ map: signTexture() }));
  sign.position.set(0, 2.75, 0.95);
  g.add(sign);
  for (const px of [-1.15, 1.15]) box(0.08, 0.5, 0.08, px, 2.5, 0.93, '#2f7d4f'); // the sign's posts
  COLORS.forEach((c, i) => {
    const b = makeTandem(c);
    b.position.set(2.2 + i * 0.9, 0, 0.2);
    g.add(b);
  });
  mergeStatic(g, [sign]);
  return g;
}

// game: { scene, collision, spot: { x, z, ry }, areas (map.areas), wallet,
// refreshWallet(), toast(m), sfx, chip (the meter's button), riding(),
// setRiding(kind), mode(), passengers() (how many ride with me), driverKind()
// (the vehicle I sit in: 2 a tandem) }.
export function createTandemRental(game) {
  const areas = forestAreas(game.areas);
  const { x, z, ry } = game.spot;
  const booth = makeBooth();
  booth.position.set(x, 0, z);
  booth.rotation.y = ry;
  game.scene.add(booth);
  // The kiosk and the parked bikes are in the way (the camera sees over the bikes).
  const s = Math.sin(ry), c = Math.cos(ry);
  const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const rect = (x0, z0, x1, z1) => [W(x0, z0), W(x1, z0), W(x1, z1), W(x0, z1)];
  game.collision.add([{ p: rect(-1.2, -0.9, 1.2, 0.9) }, { p: rect(1.8, -1.2, 5.3, 1.4), low: true }]);
  const counter = W(0, 2.2); // where you stand to rent

  let rent = null; // { start, seen } while I ride one
  let edgeAt = -Infinity;
  const now = () => Date.now();
  let paidBonus = false;
  try { paidBonus = localStorage.getItem(BONUS_KEY) === '1'; } catch { /* storage blocked */ }

  function start() {
    if (game.riding()) return;
    if (!game.wallet.spend(BASE, { k: 'ledger.tandem' })) { game.toast(t('tandemRent.poor', { n: won(BASE) })); return; }
    const paid = game.wallet.lastOp;
    game.setRiding(2);
    if (game.riding() !== 2) { game.wallet.refund(BASE, paid, { k: 'ledger.tandem' }); game.refreshWallet(); return; } // (couldn't get on: money back)
    game.refreshWallet();
    game.sfx?.pop?.();
    rent = { start: now(), seen: now() };
    saveRent(rent);
    game.toast(t('tandemRent.rented', { min: BASE_MIN, n: won(PER_MIN) }));
  }
  // Back to the booth (wherever you are: it rides itself home): pay the rest.
  function finish(why) {
    if (!rent) return;
    const ms = now() - rent.start;
    const due = owed(ms);
    const k = Math.min(due, game.wallet.coins);
    if (k > 0) game.wallet.add(-k, { k: 'ledger.tandem' }, { kind: 'take', once: 'tandem:' + rent.start });
    rent = null;
    saveRent(null);
    if (game.riding() === 2) game.setRiding(0);
    game.refreshWallet();
    refreshChip();
    const total = rentCost(ms);
    const min = Math.max(1, Math.ceil(ms / 60000));
    game.toast(t(why === 'broke' ? 'tandemRent.broke' : why === 'out' ? 'tandemRent.out' : 'tandemRent.returned', { min, n: won(total) }));
  }
  function refreshChip() {
    const chip = game.chip;
    if (!chip) return;
    chip.hidden = !rent;
    if (!rent) return;
    const ms = now() - rent.start, sec = Math.floor(ms / 1000);
    chip.textContent = `🚲🚲 ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')} · ${won(rentCost(ms))}`;
  }
  if (game.chip) game.chip.onclick = () => rent && game.toast(t('tandemRent.chip', { min: BASE_MIN, base: won(BASE), n: won(PER_MIN) }));

  function bonus() {
    if (paidBonus) return;
    paidBonus = true;
    try { localStorage.setItem(BONUS_KEY, '1'); } catch { /* storage blocked */ }
    game.wallet.add(TOGETHER, { k: 'ledger.together' }, { r: 'together', once: 'tandem:together' });
    game.refreshWallet();
    game.toast(t('tandemRent.together', { n: won(TOGETHER) }));
  }

  let chipT = 0;
  return {
    // Every frame, indoors too (leaving the street gives the bike back).
    update(p, dt) {
      if (rent) {
        if (game.riding() !== 2 || game.mode() !== 'street') finish('off'); // got off: given back
        else if (!inForest(p.x, p.z, areas, 40)) finish('out'); // (a warp took me far out of the park)
        else if (owed(now() - rent.start) > game.wallet.coins) finish('broke'); // the meter reached what I have
        else if (now() - rent.seen >= SEEN_EVERY) { rent.seen = now(); saveRent(rent); }
        if (rent && game.passengers() > 0) bonus();
      } else if (!paidBonus && game.riding() === 3 && game.driverKind() === 2 && inForest(p.x, p.z, areas)) bonus(); // on the back seat
      if ((chipT -= dt) <= 0 || !rent !== game.chip?.hidden) { chipT = 0.5; refreshChip(); }
    },
    // After I moved this frame: the rented bike stays in the park. Slide
    // along its edge when one way out is still in.
    fence(p, px0, pz0) {
      if (!rent || inForest(p.x, p.z, areas)) return;
      if (inForest(p.x, pz0, areas)) p.z = pz0;
      else if (inForest(px0, p.z, areas)) p.x = px0;
      else { p.x = px0; p.z = pz0; }
      if (performance.now() - edgeAt > EDGE_TOAST_EVERY) { edgeAt = performance.now(); game.toast(t('tandemRent.edge')); }
    },
    // The button at the counter.
    act(p) {
      if (rent || game.riding() || Math.hypot(p.x - counter[0], p.z - counter[1]) > NEAR) return null;
      return { key: 'tandem-rent', label: '🚲🚲 ' + t('tandemRent.rent', { n: won(BASE) }), run: start };
    },
    get renting() { return !!rent; },
  };
}
