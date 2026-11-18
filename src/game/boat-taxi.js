// The Han River Boat Taxi (한강보트택시): its piers, its boats and the ride.
// Loaded the first time you come near a pier, or someone near you is on a
// boat (game/boat-taxi-near.js); the trip itself is core/boat-taxi.js and
// the piers and the line are public/regions/another-seoul/boat-taxi.json.
//
//   the piers  a floating deck on the real Han River Bus terminal's spot (its
//              size at 1/4), a gangway to the bank, a canopy with the sign,
//              railings, and a boat waiting alongside
//   the boats  one InstancedMesh for all of them (one draw call): white
//              hulls with a navy waterline and a teal band, a glass cabin
//              in front and an open deck at the back where you stand
//
// The ride: on a pier's deck, tap ⛴, pick a pier and pay; the waiting boat
// leaves with you at once and goes straight there along the real route.
// ⏩ makes it faster. Others see you sail: "bt" in your state (your spot on
// the deck, 1 or 2) puts a boat under you on their screens.
import * as THREE from 'three';
import { matCache, addBox, canvasTex } from '../core/three-kit.js';
import { bakeColors } from '../core/merge-static.js';
import { BOAT_TAXI, lineLengths, pointAt, planTrip, tripAt, tripMinutes, pierAt } from '../core/boat-taxi.js';
import { getLanguage, localName, t } from '../core/i18n.js';

const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
export const BOAT = { l: 12, w: 4 }; // (scripts/build-boat-taxi.mjs berths it by this size)
export const DECK_Y = 0.85; // the boat's back deck, where your feet are
const SEATS = [[-0.75, -3.6], [0.75, -3.6]]; // spots on the back deck (x across, z along: + is the bow)
const PEERS = 8; // boats for others riding near me
const DOCK_Y = 0.09; // the pier's deck (you walk on it at the street's height)
const SIGN_NEAR = 140; // m: the pier signs are drawn from this close

function buildBoat() {
  const g = new THREE.Group();
  const W = BOAT.w, L = BOAT.l;
  box(g, W, 0.7, L - 1.6, 0, 0.45, -0.8, '#f4f6f8'); // the hull
  box(g, W - 0.9, 0.7, 1.6, 0, 0.45, L / 2 - 0.8, '#f4f6f8'); // its bow, narrower
  box(g, W + 0.04, 0.22, L - 1.6, 0, 0.16, -0.8, '#1d3b6e'); // the waterline
  box(g, W - 0.86, 0.22, 1.62, 0, 0.16, L / 2 - 0.8, '#1d3b6e');
  box(g, W + 0.05, 0.12, L - 1.6, 0, 0.66, -0.8, '#19a7a0'); // the teal band
  box(g, W - 0.2, 0.06, L - 1.8, 0, DECK_Y - 0.03, -0.8, '#c9b48d'); // the deck boards
  // The cabin: glass all round under a white roof, from mid-ship to the bow.
  box(g, W - 0.5, 0.45, 6, 0, DECK_Y + 0.22, 1.6, '#f4f6f8');
  box(g, W - 0.45, 0.95, 6.02, 0, DECK_Y + 0.92, 1.6, '#6f9bb8');
  box(g, W - 0.5, 0.2, 6, 0, DECK_Y + 1.5, 1.6, '#f4f6f8');
  box(g, W - 0.1, 0.12, 6.6, 0, DECK_Y + 1.66, 1.5, '#ffffff'); // the roof
  box(g, 1.2, 0.5, 1.6, 0, DECK_Y + 1.95, 2.4, '#ffffff'); // the wheelhouse on top
  box(g, 1.22, 0.3, 1.62, 0, DECK_Y + 2.0, 2.4, '#6f9bb8');
  // The back deck's railing (open at the back for the gangway).
  for (const sx of [-1, 1]) {
    box(g, 0.05, 0.05, 3.9, sx * (W / 2 - 0.12), DECK_Y + 0.85, -3.25, '#9aa4ae');
    for (let k = 0; k < 4; k++) box(g, 0.05, 0.85, 0.05, sx * (W / 2 - 0.12), DECK_Y + 0.42, -5.1 + k * 1.25, '#9aa4ae');
  }
  bakeColors(g);
  const one = g.children[0];
  return { geo: one.geometry, mat: one.material };
}

// The sign over a pier: 한강보트택시 / Han River Boat Taxi and the pier's name.
function signTexture(p) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#123a6b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#19a7a0'; g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 46px sans-serif'; g.fillText('⛴ 한강보트택시', w / 2, 40);
    g.font = '700 26px sans-serif'; g.fillText('Han River Boat Taxi', w / 2, 82);
    g.font = '800 30px sans-serif'; g.fillStyle = '#ffd34d';
    g.fillText(`${p.name.ko} 선착장 · ${p.name.en}`, w / 2, 122);
  });
}

// One pier: the floating deck, its gangway, a canopy and railings, in world metres.
function buildPier(p, g) {
  const deck = new THREE.Group();
  deck.position.set(p.at[0], 0, p.at[1]);
  deck.rotation.y = p.ry; // local z along the river, local x out to the water
  box(deck, p.w, 0.5, p.l, 0, DOCK_Y - 0.25, 0, '#e9ecef'); // the float
  box(deck, p.w + 0.06, 0.16, p.l + 0.06, 0, -0.1, 0, '#1d3b6e');
  box(deck, p.w - 0.3, 0.02, p.l - 0.3, 0, DOCK_Y + 0.005, 0, '#b89a6e'); // the boards
  // Railings: the river side has a gap where the boat ties up; the shore side a gap for the gangway.
  const rail = (x, z0, z1) => {
    const len = z1 - z0;
    if (len < 0.3) return;
    box(deck, 0.06, 0.06, len, x, DOCK_Y + 1, (z0 + z1) / 2, '#8d99a6');
    for (let z = z0; z <= z1 + 0.01; z += Math.max(1, len / Math.ceil(len / 1.6))) box(deck, 0.06, 1, 0.06, x, DOCK_Y + 0.5, z, '#8d99a6');
  };
  const hx = p.w / 2 - 0.08, hz = p.l / 2 - 0.08;
  rail(hx, -hz, -4.4); rail(hx, 4.4, hz); // river side: open along the boat
  rail(-hx, -hz, -1.3); rail(-hx, 1.3, hz); // shore side, open for the gangway
  for (const z of [-hz, hz]) box(deck, p.w - 0.16, 0.06, 0.06, 0, DOCK_Y + 1, z, '#8d99a6');
  // A canopy over the middle on four posts.
  const cl = Math.min(6, p.l - 2);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(deck, 0.12, 2.6, 0.12, x * (p.w / 2 - 0.5), DOCK_Y + 1.3, z * (cl / 2 - 0.3), '#5d6b78');
  box(deck, p.w - 0.4, 0.14, cl + 0.4, 0, DOCK_Y + 2.66, 0, '#ffffff');
  box(deck, p.w - 0.38, 0.1, cl + 0.42, 0, DOCK_Y + 2.56, 0, '#19a7a0');
  g.add(deck);
  // The gangway to the bank, with handrails.
  const [a, b, c, d] = p.gang; // (deck side a-b, bank side c-d)
  const mx = (a[0] + b[0] + c[0] + d[0]) / 4, mz = (a[1] + b[1] + c[1] + d[1]) / 4;
  const len = Math.hypot((a[0] + b[0]) / 2 - (c[0] + d[0]) / 2, (a[1] + b[1]) / 2 - (c[1] + d[1]) / 2);
  const wid = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const gw = new THREE.Group();
  gw.position.set(mx, 0, mz);
  gw.rotation.y = Math.atan2((a[0] + b[0]) / 2 - (c[0] + d[0]) / 2, (a[1] + b[1]) / 2 - (c[1] + d[1]) / 2);
  box(gw, wid, 0.12, len, 0, DOCK_Y - 0.05, 0, '#a7b0b8');
  for (const sx of [-1, 1]) {
    box(gw, 0.05, 0.05, len, sx * (wid / 2 - 0.05), DOCK_Y + 0.95, 0, '#5d6b78');
    for (let k = 0; k <= Math.ceil(len / 2); k++) box(gw, 0.05, 0.95, 0.05, sx * (wid / 2 - 0.05), DOCK_Y + 0.47, -len / 2 + (k * len) / Math.ceil(len / 2), '#5d6b78');
  }
  g.add(gw);
}

// game: { scene, cam ({ yaw, pitch, dist }), me, mode, riding, wallet, shop, others, hud, missionEvent(k), resend(), clearAction() }
// data: map.boatTaxi (piers, route)
export function createBoatTaxi(game, data) {
  const piers = data.piers, route = data.route, lens = lineLengths(route);
  const group = new THREE.Group();
  group.name = 'boat-taxi';
  for (const p of piers) buildPier(p, group);
  bakeColors(group);
  game.scene.add(group);
  // The signs, each on a post at the gangway's foot and on the canopy.
  const signs = piers.map((p) => {
    const tex = signTexture(p);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.81), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    m.position.set(p.at[0], DOCK_Y + 3.15, p.at[1]);
    m.rotation.y = p.ry + Math.PI / 2; // facing the bank
    m.userData.noShadow = true;
    game.scene.add(m);
    return m;
  });

  // The boats: one waiting at each pier, mine, and others'.
  const { geo, mat: boatMat } = buildBoat();
  const N = piers.length + 1 + PEERS;
  const boats = new THREE.InstancedMesh(geo, boatMat, N);
  boats.name = 'boat-taxi-boats';
  boats.castShadow = true;
  boats.frustumCulled = false; // (they spread over 5 km: the sphere would always hold the camera anyway)
  game.scene.add(boats);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), none = new THREE.Vector3(0, 0, 0);
  const put = (i, x, z, ry, bob = 0, roll = 0) => {
    e.set(0, ry, roll, 'YXZ');
    boats.setMatrixAt(i, m4.compose(pos.set(x, bob, z), q.setFromEuler(e), one));
  };
  const hide = (i) => boats.setMatrixAt(i, m4.compose(pos.set(0, -50, 0), q.identity(), none));
  // Each pier's boat lies alongside its deck, bow east (bry, scripts/build-boat-taxi.mjs).
  const berthRy = piers.map((p) => p.bry);

  let ride = null; // { trip, t, seat, fast, ry, paid }
  let panel = null;
  const pierName = (p) => t('boat.pier', { pier: localName(p.name, getLanguage()) });
  const clock = () => performance.now() / 1000;

  function closePanel() { if (panel) panel.hidden = true; }
  function openPanel(i) {
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'sheet boat-taxi-panel';
      panel.innerHTML = '<button class="sheet-x" aria-label="Close">✕</button><strong></strong><p class="fine"></p><div class="visit-list"></div>';
      panel.querySelector('.sheet-x').onclick = closePanel;
      game.hud.append(panel);
    }
    panel.hidden = false;
    panel.querySelector('strong').textContent = '⛴ ' + t('boat.name') + ' · ' + pierName(piers[i]);
    panel.querySelector('p').textContent = t('boat.pick', { fare: BOAT_TAXI.fare.toLocaleString() });
    const list = panel.querySelector('.visit-list');
    list.replaceChildren(...piers.map((p, j) => {
      if (j === i) return null;
      const b = document.createElement('button');
      const n = document.createElement('span');
      n.textContent = (j < i ? '⬅️ ' : '➡️ ') + pierName(p);
      const m = document.createElement('small');
      m.textContent = t('boat.min', { n: tripMinutes(planTrip(piers, i, j)) });
      b.append(n, m);
      b.onclick = () => board(i, j);
      return b;
    }).filter(Boolean));
  }

  function board(i, j) {
    closePanel();
    if (ride || game.mode !== 'street') return;
    if (!game.wallet.spend(BOAT_TAXI.fare, { k: 'ledger.boatTaxi' })) { game.shop.toast(t('ride.noCoins', { n: BOAT_TAXI.fare.toLocaleString() })); return; }
    const trip = planTrip(piers, i, j);
    ride = { trip, t: 0, seat: Math.random() < 0.5 ? 0 : 1, fast: false, ry: trip.dir > 0 ? berthRy[i] : berthRy[i] + Math.PI, paid: game.wallet.lastOp };
    // The camera behind the boat, a little above, to see the river ahead.
    const cam = game.cam;
    if (cam) { cam.yaw = ride.ry + Math.PI; cam.pitch = 0.3; cam.dist = Math.max(cam.dist, 11); }
    game.missionEvent('ride');
    game.shop.toast(t('boat.leaving', { pier: pierName(piers[j]) }));
    game.resend();
    game.clearAction();
  }

  function arrive() {
    const p = piers[ride.trip.to];
    ride = null;
    const me = game.me, c = Math.cos(p.ry), s = Math.sin(p.ry);
    const [bx, bz] = p.board;
    me.root.position.set(bx, 0, bz);
    me.root.rotation.y = Math.atan2(-c, s); // facing the bank
    game.shop.toast(t('boat.arrived', { pier: pierName(p) }));
    game.resend();
    game.clearAction();
  }

  // Where a boat stands for a rider at (x, z) facing ry in seat k: the boat's middle.
  const boatFor = (x, z, ry, k) => {
    const [sx, sz] = SEATS[k] || SEATS[0], c = Math.cos(ry), s = Math.sin(ry);
    return [x - (sx * c + sz * s), z - (-sx * s + sz * c)];
  };
  const seatAt = (bx, bz, ry, k) => {
    const [sx, sz] = SEATS[k] || SEATS[0], c = Math.cos(ry), s = Math.sin(ry);
    return [bx + sx * c + sz * s, bz - sx * s + sz * c];
  };

  let shown = 0, onPier = false;
  function draw(p, now) {
    const busyBerth = new Set();
    // Mine.
    const me = piers.length;
    if (ride) {
      const r = game.me.root.position;
      const [bx, bz] = boatFor(r.x, r.z, ride.ry, ride.seat);
      put(me, bx, bz, ride.ry, Math.sin(now * 1.7) * 0.04, Math.sin(now * 1.1) * 0.012);
      piers.forEach((q, i) => { if (Math.hypot(bx - q.berth[0], bz - q.berth[1]) < 14) busyBerth.add(i); });
    } else hide(me);
    // Others on a boat, nearest first.
    const riders = [];
    for (const [, o] of game.others.players) {
      const k = o.target?.bt | 0;
      if (k < 1 || k > 2 || o.hidden) continue;
      const r = o.ch.root.position;
      riders.push({ r, ry: o.ch.root.rotation.y, k: k - 1, d: Math.hypot(r.x - p.x, r.z - p.z) });
    }
    riders.sort((a, b) => a.d - b.d);
    for (let i = 0; i < PEERS; i++) {
      const o = riders[i];
      if (!o || o.d > 600) { hide(me + 1 + i); continue; }
      const [bx, bz] = boatFor(o.r.x, o.r.z, o.ry, o.k);
      put(me + 1 + i, bx, bz, o.ry, Math.sin(now * 1.7 + i) * 0.04);
      piers.forEach((q, j) => { if (Math.hypot(bx - q.berth[0], bz - q.berth[1]) < 14) busyBerth.add(j); });
    }
    // The waiting boats (not while one is pulling out of or into that berth).
    piers.forEach((q, i) => {
      if (busyBerth.has(i)) hide(i);
      else put(i, q.berth[0], q.berth[1], berthRy[i], Math.sin(now * 1.3 + i * 2) * 0.03);
    });
    boats.instanceMatrix.needsUpdate = true;
    shown = riders.length;
    for (const [i, s] of signs.entries()) s.visible = Math.hypot(piers[i].at[0] - p.x, piers[i].at[1] - p.z) < SIGN_NEAR;
  }

  const mmss = (sec) => { const n = Math.max(0, Math.ceil(sec)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
  return {
    get busy() { return !!ride; },
    get riders() { return shown; },
    get openView() { return !!ride || onPier; },
    // The button: on a pier's deck, or on the boat.
    act(p) {
      if (ride) {
        const left = (ride.trip.time - ride.t) / (ride.fast ? BOAT_TAXI.fast : 1);
        const n = mmss(left);
        return ride.fast
          ? { key: 'boat-slow:' + n, label: '🐢 ' + t('boat.normal', { t: n }), run: () => { if (ride) ride.fast = false; } }
          : { key: 'boat-fast:' + n, label: '⏩ ' + t('boat.faster', { t: n }), run: () => { if (ride) ride.fast = true; } };
      }
      if (game.mode !== 'street' || game.riding) return null;
      const i = pierAt(piers, p.x, p.z);
      if (i < 0) { if (panel && !panel.hidden) closePanel(); return null; }
      return { key: 'boat-taxi:' + i, label: '⛴ ' + t('boat.name'), run: () => openPanel(i) };
    },
    // Every frame (after walking): carries me along on the boat, places the boats.
    update(dt, p) {
      const now = clock();
      if (ride) {
        const me = game.me.root;
        if (game.mode !== 'street' || (ride.at && Math.hypot(me.position.x - ride.at[0], me.position.z - ride.at[1]) > 20)) ride = null; // (into a shop, or taken off by the map, a taxi, a warp)
        else {
          ride.t += dt * (ride.fast ? BOAT_TAXI.fast : 1);
          const at = tripAt(ride.trip, ride.t);
          if (at.done) arrive();
          else {
            const s = ride.trip.s0 + ride.trip.dir * at.d;
            const w = pointAt(route, lens, s);
            const want = Math.atan2(w.dx * ride.trip.dir, w.dz * ride.trip.dir);
            let d = want - ride.ry;
            d = Math.atan2(Math.sin(d), Math.cos(d));
            const turn = d * Math.min(1, dt * 2.5 * (ride.fast ? 2 : 1)); // the bow swings round smoothly
            ride.ry += turn;
            if (game.cam) game.cam.yaw += turn; // (the view turns with the boat)
            const [x, z] = seatAt(w.x, w.z, ride.ry, ride.seat);
            me.position.set(x, DECK_Y + Math.sin(now * 1.7) * 0.04, z);
            me.rotation.y = ride.ry;
            ride.at = [x, z];
          }
        }
      }
      onPier = !ride && game.mode === 'street' && pierAt(piers, p.x, p.z, 0.3) >= 0;
      draw(game.me.root.position, now);
    },
    state(st) { if (ride) st.bt = ride.seat + 1; },
    stop() { ride = null; closePanel(); }, // (a teleport, the map, a taxi)
  };
}
