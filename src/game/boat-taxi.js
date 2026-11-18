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
// The ride: on a pier's deck, tap ⛴, pick a pier and buy a ticket. The
// boats run to a timetable (core/boat-taxi.js: one every 4 minutes each way,
// stopping at every pier), the same on every screen; wait on the deck and
// you get on when the boat going your way ties up, and off at your pier.
// Everyone who bought a ticket rides the same boat. "bt" in your state (the
// boat + 1) puts you on that boat on others' screens, at your spot on the
// back deck (from your id).
import * as THREE from 'three';
import { matCache, addBox, canvasTex } from '../core/three-kit.js';
import { bakeColors } from '../core/merge-static.js';
import { BOAT_TAXI, clock, lineLengths, timetable, boatAt, boatPose, nextBoat, rideTime, pierAt } from '../core/boat-taxi.js';
import { getLanguage, localName, t } from '../core/i18n.js';

const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
export const BOAT = { l: 12, w: 4 }; // (scripts/build-boat-taxi.mjs berths it by this size)
export const DECK_Y = 0.85; // the boat's back deck, where your feet are
// Spots on the back deck (x across, z along: + is the bow), three rows of
// four, filled in order (the first rider gets the front middle).
const SEATS = [];
for (const z of [-3.0, -4.2, -5.3]) for (const x of [-0.45, 0.45, -1.35, 1.35]) SEATS.push([x, z]);
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
  return canvasTex(1024, 320, (g, w, h) => {
    g.fillStyle = '#123a6b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#19a7a0'; g.fillRect(0, h - 28, w, 28);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '800 92px sans-serif'; g.fillText('⛴ 한강보트택시', w / 2, 80);
    g.font = '700 52px sans-serif'; g.fillText('Han River Boat Taxi', w / 2, 164);
    g.font = '800 60px sans-serif'; g.fillStyle = '#ffd34d';
    g.fillText(`${p.name.ko} 선착장 · ${p.name.en}`, w / 2, 244, w - 40);
  });
}
// The sign on the canopy (Yozi 2026-11-18: bigger, and the right way round
// from both sides): a board with the same face on its front and its back.
const SIGN = { w: 5.2, h: 1.62 };

// One pier: the floating deck, its gangway, a canopy and railings, in world metres.
const WAKE = { w: 15, l: 40 }; // m: the V behind a boat
// A flat plane on the water (length along the boat, centred z0 ahead of the
// boat's middle), additive white: an instance's colour is how bright.
function foamMesh(tex, w, l, z0, n, name) {
  const geo = new THREE.PlaneGeometry(w, l);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, z0);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }), n);
  for (let i = 0; i < n; i++) m.setColorAt(i, new THREE.Color(0, 0, 0));
  m.name = name;
  m.frustumCulled = false;
  m.renderOrder = 1;
  m.userData.noShadow = true;
  return m;
}
// The wake: two foam lines opening out from the stern and churned water
// between them, fading away behind (the canvas's top lies far behind: a
// plane's +y edge is behind once it is laid flat).
function wakeTexture() {
  const W = 64, H = 256, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 0; y < H; y++) {
    const back = 1 - y / H; // 0 at the stern, 1 far behind
    const fade = (1 - back) ** 1.4;
    const half = 3 + back * (W / 2 - 4); // the V opens out
    for (const side of [-1, 1]) {
      const x = W / 2 + side * half;
      g.fillStyle = `rgba(255,255,255,${0.85 * fade})`;
      g.fillRect(x - 1.5, y, 3, 1);
    }
    // The churn behind the propeller: narrower, gone sooner.
    const churn = Math.max(0, 1 - back * 2.2);
    for (let i = 0; i < 3; i++) {
      const x = W / 2 + (rnd() - 0.5) * (6 + back * 18);
      g.fillStyle = `rgba(255,255,255,${churn * (0.4 + rnd() * 0.5)})`;
      g.fillRect(x, y, 2 + rnd() * 3, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapT = THREE.RepeatWrapping; // (only the churn slides: the V lines are straight along it)
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
// The bow wave: white water curling off both sides of the bow.
function bowTexture() {
  const W = 64, H = 64, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineCap = 'round';
  for (const [lw, a] of [[7, 0.35], [3.5, 0.9]]) {
    g.globalAlpha = a;
    g.lineWidth = lw;
    g.beginPath(); // (canvas bottom: the bow, ahead; the top lies on the water behind it)
    g.moveTo(W / 2 - 22, 2); g.quadraticCurveTo(W / 2 - 14, H * 0.75, W / 2, H - 8);
    g.quadraticCurveTo(W / 2 + 14, H * 0.75, W / 2 + 22, 2);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

// game: { scene, cam ({ yaw, pitch, dist }), me, myId, mode, riding, wallet, shop, others, hud, missionEvent(k), resend(), clearAction() }
// data: map.boatTaxi (piers, route)
export function createBoatTaxi(game, data) {
  const piers = data.piers, route = data.route, lens = lineLengths(route);
  const group = new THREE.Group();
  group.name = 'boat-taxi';
  for (const p of piers) buildPier(p, group);
  bakeColors(group);
  game.scene.add(group);
  // The signs, up on each canopy, facing the bank and the river.
  const signs = piers.map((p) => {
    const face = new THREE.MeshBasicMaterial({ map: signTexture(p) });
    const m = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(SIGN.w + 0.16, SIGN.h + 0.16, 0.1), new THREE.MeshBasicMaterial({ color: '#0d2b52' }));
    m.add(board);
    for (const side of [0, Math.PI]) { // (a plane is mirrored from behind: one each way)
      const f = new THREE.Mesh(new THREE.PlaneGeometry(SIGN.w, SIGN.h), face);
      f.rotation.y = side;
      f.position.z = side ? -0.06 : 0.06;
      m.add(f);
    }
    m.position.set(p.at[0], DOCK_Y + 2.73 + SIGN.h / 2 + 0.12, p.at[1]); // (on the canopy's roof)
    m.rotation.y = p.ry + Math.PI / 2; // (its front faces the bank)
    m.traverse((o) => { o.userData.noShadow = true; });
    game.scene.add(m);
    return m;
  });

  // The boats: all of them on the timetable, one InstancedMesh.
  const tt = timetable(piers);
  const { geo, mat: boatMat } = buildBoat();
  const boats = new THREE.InstancedMesh(geo, boatMat, tt.boats);
  boats.name = 'boat-taxi-boats';
  boats.castShadow = true;
  boats.frustumCulled = false; // (they spread over 5 km: the sphere would always hold the camera anyway)
  game.scene.add(boats);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  // The water they cut (Yozi 2026-11-18): a white V spreading out behind and
  // foam round the bow, brighter the faster the boat goes (additive, so a
  // stopped boat leaves nothing). One InstancedMesh each, over all the boats.
  const wakes = foamMesh(wakeTexture(), WAKE.w, WAKE.l, -BOAT.l / 2 + 1 - WAKE.l / 2, tt.boats, 'boat-taxi-wakes');
  const bows = foamMesh(bowTexture(), 5.6, 5, BOAT.l / 2 - 1.6, tt.boats, 'boat-taxi-bows');
  game.scene.add(wakes, bows);
  const speeds = new Float32Array(tt.boats), prevAt = [];
  const tint = new THREE.Color();
  const last = piers.length - 1;

  // Boat b now: where it is on the water ({ x, z, ry }) and what it is doing (boatAt).
  // Its heading follows the line over ±6 m (no snap at the line's corners);
  // at an end pier it turns round in its first TURN seconds there.
  const TURN = 15;
  const poseAt = (s, dir) => {
    const a = boatPose(route, lens, piers, s - 6, dir, BOAT.w), b = boatPose(route, lens, piers, s + 6, dir, BOAT.w), c = boatPose(route, lens, piers, s, dir, BOAT.w);
    return { x: c.x, z: c.z, ry: Math.atan2((b.x - a.x) * dir, (b.z - a.z) * dir) };
  };
  function boatNow(b, now) {
    const st = boatAt(tt, piers, b, now);
    let ps = poseAt(st.s, st.dir);
    if ((st.at === 0 || st.at === last) && st.into < TURN) {
      const from = poseAt(st.s, -st.dir), k = st.into / TURN, f = k * k * (3 - 2 * k);
      let d = ps.ry - from.ry;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      ps = { x: from.x + (ps.x - from.x) * f, z: from.z + (ps.z - from.z) * f, ry: from.ry + d * f };
    }
    return { ...st, ...ps };
  }

  let ticket = null; // { from, to, dir }: bought, waiting on the pier
  let aboard = null; // { boat, at: [x, z] (where I was put last frame) }
  let panel = null;
  const pierName = (p) => t('boat.pier', { pier: localName(p.name, getLanguage()) });
  const mmss = (sec) => { const n = Math.max(0, Math.ceil(sec)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
  // Where riders stand: free to walk round the back deck (Yozi 2026-11-18),
  // in the boat's own frame (x across, z along, ry: facing, from the bow),
  // so they go where the boat goes. Getting on, you take the first spot no
  // one stands on. Others send theirs ("bx", "bz", "bo"), so every screen
  // has everyone in the same place.
  const DECK = { x: BOAT.w / 2 - 0.45, z0: -BOAT.l / 2 + 0.45, z1: -1.75 }; // (the cabin starts at -1.4)
  const local = (o) => (o.target?.bx != null ? [o.target.bx / 100, o.target.bz / 100] : null);
  function freeSpot(b) {
    const taken = [];
    for (const [, o] of game.others.players) if ((o.target?.bt | 0) - 1 === b && local(o)) taken.push(local(o));
    return SEATS.find(([x, z]) => taken.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > 0.7)) || SEATS[taken.length % SEATS.length];
  }
  const hashSpot = (id) => { let h = 7; for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return SEATS[h % SEATS.length]; };
  const onDeck = (bx, bz, ry, lx, lz) => { const c = Math.cos(ry), s = Math.sin(ry); return [bx + lx * c + lz * s, bz - lx * s + lz * c]; };
  // The wind aboard (Yozi 2026-11-18): the coaster's overlay, gently (a few
  // speed lines, spray flying past, the wind's sound) and your hair blowing.
  let windOn = false;
  function wind(on) {
    if (on === windOn) return;
    windOn = on;
    if (on) game.fx?.start(game.scene, '#eaf7ff');
    else { game.fx?.stop(); game.me.setWind?.(0); }
  }
  const windK = (b) => Math.min(1, (speeds[b] || 0) / BOAT_TAXI.speed);

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
    panel.querySelector('p').textContent = t('boat.pick', { fare: BOAT_TAXI.fare.toLocaleString(), n: Math.round(BOAT_TAXI.every / 60) });
    const now = clock();
    const list = panel.querySelector('.visit-list');
    list.replaceChildren(...piers.map((p, j) => {
      if (j === i) return null;
      const b = document.createElement('button');
      const n = document.createElement('span');
      n.textContent = (j < i ? '⬅️ ' : '➡️ ') + pierName(p);
      const m = document.createElement('small');
      const nb = nextBoat(tt, i, j > i ? 1 : -1, now);
      m.textContent = t('boat.next', { t: mmss(nb?.wait || 0), n: Math.max(1, Math.round(rideTime(tt, i, j) / 60)) });
      b.append(n, m);
      b.onclick = () => buy(i, j);
      return b;
    }).filter(Boolean));
  }

  function buy(i, j) {
    closePanel();
    if (aboard || game.mode !== 'street') return;
    if (!game.wallet.spend(BOAT_TAXI.fare, { k: 'ledger.boatTaxi' })) { game.shop.toast(t('ride.noCoins', { n: BOAT_TAXI.fare.toLocaleString() })); return; }
    ticket = { from: i, to: j, dir: j > i ? 1 : -1 };
    game.missionEvent('ride');
    const nb = nextBoat(tt, i, ticket.dir, clock());
    game.shop.toast(t('boat.ticket', { pier: pierName(piers[j]), t: mmss(nb?.wait || 0) }));
    game.clearAction();
  }

  function board(b, ry) {
    const [lx, lz] = freeSpot(b);
    aboard = { boat: b, at: null, lx, lz, lry: 0, from: ticket.from };
    wind(true);
    // The camera behind the boat, a little above, to see the river ahead.
    const cam = game.cam;
    if (cam) { cam.yaw = ry + Math.PI; cam.pitch = 0.3; cam.dist = Math.max(cam.dist, 11); }
    game.shop.toast(t('boat.aboard', { pier: pierName(piers[ticket.to]) }));
    game.resend();
    game.clearAction();
  }

  // Off at pier i (mine, or any the boat stops at on the way).
  function getOff(i = ticket.to) {
    const p = piers[i];
    const u = THREE.MathUtils.clamp(aboard.lx, -1.4, 1.4) * 1.2; // (riders step off side by side, as they stood)
    aboard = null;
    ticket = null;
    wind(false);
    const me = game.me, c = Math.cos(p.ry), s = Math.sin(p.ry);
    me.root.position.set(p.board[0] + s * u, 0, p.board[1] + c * u);
    me.root.rotation.y = Math.atan2(-c, s); // facing the bank
    game.shop.toast(t('boat.arrived', { pier: pierName(p) }));
    game.resend();
    game.clearAction();
  }

  // Seconds until my boat is at my pier.
  function arrivesIn(st) {
    if (st.at === ticket.to) return 0;
    if (st.at >= 0) return st.left + rideTime(tt, st.at, ticket.to);
    return st.left + (st.next === ticket.to ? 0 : BOAT_TAXI.dwell + rideTime(tt, st.next, ticket.to));
  }

  let onPier = false;
  const poses = [];
  return {
    get busy() { return !!aboard; },
    get openView() { return !!aboard || onPier; },
    get ticket() { return ticket && { ...ticket }; }, // (for tests)
    // The button: on a pier's deck, or on the boat.
    act(p) {
      if (aboard) {
        const st = poses[aboard.boat];
        if (st && st.at >= 0 && st.at !== ticket.to && st.at !== aboard.from && st.left > 1) { // (at a pier on the way: off here if you like)
          const i = st.at;
          return { key: 'boat-off:' + i, label: '⛴ ' + t('boat.getOff', { pier: pierName(piers[i]) }), run: () => { if (aboard && poses[aboard.boat]?.at === i) getOff(i); } };
        }
        const n = st ? mmss(arrivesIn(st)) : '';
        return { key: 'boat-ride:' + n, label: '⛴ ' + t('boat.toward', { pier: pierName(piers[ticket.to]), t: n }), run: () => {} };
      }
      if (game.mode !== 'street' || game.riding) return null;
      const i = pierAt(piers, p.x, p.z);
      if (i < 0) { if (panel && !panel.hidden) closePanel(); return null; }
      if (ticket && ticket.from === i) {
        const nb = nextBoat(tt, i, ticket.dir, clock()), n = mmss(nb?.wait || 0);
        return { key: 'boat-wait:' + n, label: '⛴ ' + t('boat.wait', { pier: pierName(piers[ticket.to]), t: n }), run: () => {} };
      }
      return { key: 'boat-taxi:' + i, label: '⛴ ' + t('boat.name'), run: () => openPanel(i) };
    },
    // Every frame (after walking): the boats on the timetable; carries me on mine.
    update(dt, p) {
      const now = clock();
      for (let b = 0; b < tt.boats; b++) {
        const st = (poses[b] = boatNow(b, now));
        e.set(0, st.ry, Math.sin(now * 1.1 + b) * 0.012, 'YXZ');
        boats.setMatrixAt(b, m4.compose(pos.set(st.x, Math.sin(now * 1.6 + b * 2) * 0.04, st.z), q.setFromEuler(e), one));
        // How fast it goes now (from how far it went), for the foam.
        const pr = prevAt[b], v = pr && dt > 0 ? Math.min(BOAT_TAXI.speed * 1.6, Math.hypot(st.x - pr[0], st.z - pr[1]) / dt) : 0;
        prevAt[b] = [st.x, st.z];
        speeds[b] += (v - speeds[b]) * Math.min(1, dt * 2);
        const k = Math.min(1, speeds[b] / BOAT_TAXI.speed);
        e.set(0, st.ry, 0);
        m4.compose(pos.set(st.x, 0.05, st.z), q.setFromEuler(e), one);
        wakes.setMatrixAt(b, m4); bows.setMatrixAt(b, m4);
        wakes.setColorAt(b, tint.setScalar(0.75 * k));
        bows.setColorAt(b, tint.setScalar(Math.min(1, 0.15 + k) * (k > 0.03 ? 0.9 : 0)));
      }
      boats.instanceMatrix.needsUpdate = true;
      for (const f of [wakes, bows]) { f.instanceMatrix.needsUpdate = true; f.instanceColor.needsUpdate = true; }
      wakes.material.map.offset.y = (wakes.material.map.offset.y - dt * 0.35) % 1; // (the churned foam slides away behind)
      const me = game.me.root;
      if (aboard) {
        if (game.mode !== 'street' || (aboard.at && Math.hypot(me.position.x - aboard.at[0], me.position.z - aboard.at[1]) > 20)) { aboard = null; ticket = null; wind(false); } // (into a shop, or taken off by the map, a taxi, a warp)
        else {
          const st = poses[aboard.boat];
          if (st.at === ticket.to) getOff();
          else {
            const [x, z] = onDeck(st.x, st.z, st.ry, aboard.lx, aboard.lz);
            if (game.cam && aboard.ry != null) { let d = st.ry - aboard.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); game.cam.yaw += d; } // (the view turns with the boat)
            aboard.ry = st.ry;
            me.position.set(x, DECK_Y + Math.sin(now * 1.6 + aboard.boat * 2) * 0.04, z);
            me.rotation.y = st.ry + aboard.lry;
            aboard.at = [x, z];
            const k = windK(aboard.boat);
            game.me.setWind?.(0.45 * k);
            if (game.camera) game.fx?.update(dt, { fx: { lines: 0.3 * k, vignette: 0, shake: 0 }, k: 0.45 * k, v: speeds[aboard.boat] * 0.35, phase: k < 0.05 ? 'board' : 'run', camera: game.camera, tunnel: false });
          }
        }
      } else if (ticket && game.mode === 'street' && pierAt(piers, p.x, p.z) === ticket.from) {
        // On the deck with a ticket: the boat going my way is here.
        const b = poses.findIndex((st) => st.at === ticket.from && st.dir === ticket.dir && st.left > 1);
        if (b >= 0) board(b, poses[b].ry);
      }
      onPier = !aboard && game.mode === 'street' && pierAt(piers, p.x, p.z, 0.3) >= 0;
      for (const [i, s] of signs.entries()) s.visible = Math.hypot(piers[i].at[0] - p.x, piers[i].at[1] - p.z) < SIGN_NEAR;
    },
    // Someone else on a boat ("bt": the boat + 1): on my screen they stand
    // on the same boat, at their spot (players.js calls this after moving them).
    peer(o) {
      const b = (o.target?.bt | 0) - 1;
      if (b < 0 || b >= tt.boats || !poses[b]) return;
      const st = poses[b], r = o.ch.root;
      const [lx, lz] = local(o) || hashSpot(o.id);
      const [x, z] = onDeck(st.x, st.z, st.ry, lx, lz);
      r.position.set(x, DECK_Y, z);
      r.rotation.y = st.ry + (o.target.bo || 0) / 100;
      o.ch.setWind?.(0.45 * windK(b));
    },
    // Walking on the deck (main.js gives this frame's step, dx dz, in the world).
    walk(dx, dz) {
      const st = aboard && poses[aboard.boat];
      if (!st) return;
      const c = Math.cos(st.ry), s = Math.sin(st.ry);
      aboard.lx = THREE.MathUtils.clamp(aboard.lx + dx * c - dz * s, -DECK.x, DECK.x);
      aboard.lz = THREE.MathUtils.clamp(aboard.lz + dx * s + dz * c, DECK.z0, DECK.z1);
      let d = Math.atan2(dx, dz) - st.ry - aboard.lry;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      aboard.lry += d * 0.25; // (turns to face the way you walk)
      const [x, z] = onDeck(st.x, st.z, st.ry, aboard.lx, aboard.lz), me = game.me.root;
      me.position.x = x; me.position.z = z; me.rotation.y = st.ry + aboard.lry;
      aboard.at = [x, z];
    },
    state(st) {
      if (!aboard) return;
      st.bt = aboard.boat + 1;
      st.bx = Math.round(aboard.lx * 100); st.bz = Math.round(aboard.lz * 100); st.bo = Math.round(aboard.lry * 100);
    },
    stop() { aboard = null; wind(false); closePanel(); }, // (a teleport, the map, a taxi: the ticket stays, unless I was aboard)
  };
}
