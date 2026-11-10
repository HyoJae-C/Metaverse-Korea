// Seoul Dal (서울달), the balloon in Yeouido Park: its model and the ride.
// Loaded only when you come near it (game/seoul-dal-near.js); the schedule
// is core/seoul-dal.js.
//
//   the pad     a round landing pad on the lawn, a low fence with a gate
//               facing the path, a ticket booth and a winch in the middle
//   the balloon a big pale sphere (the "moon"), a band with the game's name, the
//               ring-shaped gondola hanging under it on lines, and the
//               cable down to the winch; it rises and sinks on the clock
//
// The ride: at the gate while it is open, pay and step in. You stand at the
// rail facing out; the camera stays free to look round. At the top the view
// turns down to the river once, and the button switches between looking
// down and looking out. Back on the ground you step out at the gate. Others
// see you go up with it (your height goes out in "y", as on the cable car).
//
// Up to DAL.max people a flight ("dl" in your state: the flight you're on).
// When it is full or already up, take a waiting ticket ("dq": when you took
// it, so every screen sorts the same line, core/tarot-queue.js): when the
// gate opens the first in line are called, from anywhere near the pad, and
// have DAL.turn seconds to get in before the next is called.
import * as THREE from 'three';
import { matCache, addBox, canvasTex } from '../core/three-kit.js';
import { DAL, dalAt, gateOpen, opensIn, dalClock, riderSpot, clock } from '../core/seoul-dal.js';
import { TarotQueue } from '../core/tarot-queue.js';

const mat = matCache();
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const R = 9; // the balloon's radius
const HANG = 4; // from the gondola floor to the bottom of the balloon
const GATE = 8.6; // the gate, from the cable (towards the path)
const DECK_IN = 1.6, DECK_OUT = 4.6;

function buildPad(g) {
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.3, 0.25, 32), mat('#b9c3cc'));
  pad.position.y = 0.125;
  g.add(pad);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 5.3, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#f0b43c' }));
  ring.position.y = 0.26;
  ring.userData.noShadow = true;
  g.add(ring);
  box(g, 1.4, 0.7, 1.4, 0, 0.6, 0, '#59616e'); // the winch
  // A low fence round the pad with a gap for the gate (towards +z).
  const posts = 28;
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat('#5a6470'), posts);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.38) continue; // the gate
    if (k < posts) post.setMatrixAt(k++, m4.makeTranslation(Math.sin(a) * 8, 0.45, Math.cos(a) * 8));
  }
  post.count = k;
  g.add(post);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(8, 0.05, 4, 48, Math.PI * 2 - 0.76), mat('#5a6470'));
  rail.rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.38); // (the gap at +z)
  rail.position.y = 0.9;
  g.add(rail);
  // The ticket booth by the gate, with its board.
  box(g, 2.2, 2.4, 1.6, 3.6, 1.2, GATE + 1.2, '#e9e6df');
  box(g, 2.5, 0.2, 1.9, 3.6, 2.5, GATE + 1.2, '#1f5f8b');
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({
    map: canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = '#1f3f66'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fff4d6'; x.textAlign = 'center';
      x.beginPath(); x.arc(70, 90, 44, 0, Math.PI * 2); x.fill(); // the moon
      x.font = '800 64px "Noto Sans KR", system-ui, sans-serif'; x.fillText('서울달', 300, 92);
      x.font = '800 40px system-ui, sans-serif'; x.fillText('SEOULDAL', 300, 150);
      x.font = '600 30px system-ui, sans-serif'; x.fillText(`BALLOON · ₩${DAL.fare.toLocaleString('en-US')} (GAME)`, w / 2, 220);
    }),
  }));
  sign.position.set(3.6, 3.4, GATE + 1.2);
  g.add(sign);
  const back = sign.clone(); back.rotation.y = Math.PI; back.position.z -= 0.01; g.add(back);
  box(g, 0.1, 1.2, 0.1, 2.5, 3, GATE + 1.2, '#5a6470');
  box(g, 0.1, 1.2, 0.1, 4.7, 3, GATE + 1.2, '#5a6470');
}

// The balloon and its gondola, with the gondola's floor at y = 0.
function buildBalloon() {
  const g = new THREE.Group();
  const moon = new THREE.MeshLambertMaterial({ color: '#fff3d2', emissive: '#4a3d22' }); // a soft glow, like the moon
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), moon);
  ball.position.y = HANG + R;
  g.add(ball);
  // The net over it: a few thin rings.
  const net = mat('#d9cfb8');
  for (const y of [-0.5, 0, 0.5]) {
    const r = Math.sqrt(1 - y * y) * R + 0.04;
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 4, 48), net);
    m.rotation.x = Math.PI / 2; m.position.y = HANG + R + y * R;
    g.add(m);
  }
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R + 0.04, 0.06, 4, 48), net);
    m.rotation.y = (i / 4) * Math.PI; m.position.y = HANG + R;
    g.add(m);
  }
  // The game's name round the middle (Yozi's ask).
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.08, R + 0.08, 2.2, 48, 1, true), new THREE.MeshLambertMaterial({
    transparent: true,
    map: canvasTex(1024, 64, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#1f3f66'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '800 40px "Noto Sans KR", system-ui, sans-serif';
      x.fillText('어나더서울  ANOTHER SEOUL', w / 4, h / 2);
      x.fillText('어나더서울  ANOTHER SEOUL', (w * 3) / 4, h / 2);
    }),
  }));
  band.position.y = HANG + R + 2.6;
  g.add(band);
  // The gondola: a ring-shaped deck round the cable, glass sides and a rail.
  const deck = new THREE.Mesh(new THREE.RingGeometry(DECK_IN, DECK_OUT, 32).rotateX(-Math.PI / 2), mat('#59616e'));
  deck.position.y = 0.02;
  g.add(deck);
  const under = new THREE.Mesh(new THREE.CylinderGeometry(DECK_OUT, DECK_OUT - 0.3, 0.35, 32), mat('#1f3f66'));
  under.position.y = -0.17;
  g.add(under);
  const glass = new THREE.MeshLambertMaterial({ color: '#cfe6f2', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const side = new THREE.Mesh(new THREE.CylinderGeometry(DECK_OUT, DECK_OUT, 1.1, 32, 1, true), glass);
  side.position.y = 0.6;
  side.userData.noShadow = true;
  g.add(side);
  for (const [r, y] of [[DECK_OUT, 1.15], [DECK_IN, 1.15]]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 4, 40), mat('#f0b43c'));
    rail.rotation.x = Math.PI / 2; rail.position.y = y;
    g.add(rail);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(DECK_IN, DECK_IN, 1.1, 24, 1, true), mat('#e9e6df'));
  core.position.y = 0.6;
  g.add(core);
  // Lines from the rail up to the balloon.
  const lineMat = mat('#8a8f99');
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    a.set(Math.sin(t) * DECK_OUT, 1.15, Math.cos(t) * DECK_OUT);
    b.set(Math.sin(t) * R * 0.62, HANG + R * 0.22, Math.cos(t) * R * 0.62);
    const len = a.distanceTo(b);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 4), lineMat);
    line.position.copy(a).add(b).multiplyScalar(0.5);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    line.userData.noShadow = true;
    g.add(line);
  }
  // From the deck's middle up to the balloon (the cable runs through).
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, HANG + 1, 6), lineMat);
  mast.position.y = (HANG + 1) / 2;
  g.add(mast);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  return g;
}

// game: { scene, me, mode, cam, riding, others, myId, wallet, shop, t,
// missionEvent, resend, clearAction } (getters where they change);
// at: { x, z, ry }, the cable's foot (its local +z is the gate).
export function createSeoulDal(game, at) {
  const { x: ox, z: oz, ry } = at;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const world = (x, z) => [ox + x * cos + z * sin, oz - x * sin + z * cos];
  const root = new THREE.Group();
  root.position.set(ox, 0, oz); root.rotation.y = ry;
  buildPad(root);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  const balloon = buildBalloon();
  root.add(balloon);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 5).translate(0, 0.5, 0), mat('#4a4f58'));
  cable.position.y = 0.9;
  root.add(cable);
  game.scene.add(root);
  const gate = world(0, GATE);

  let ride = null; // { slot, n (the flight), paid, flown, topped, down }
  let ticket = 0; // my waiting ticket (when I took it, ms), or 0
  const queue = new TarotQueue(undefined, DAL.turn * 1000);
  let turn = { order: [], callable: [], expired: [] };
  // How many are aboard flight n (me too).
  function aboard(n) {
    let k = ride?.n === n ? 1 : 0;
    for (const o of game.others.players.values()) if (!o.hidden && Number(o.target?.dl) === n + 1) k++;
    return k;
  }
  function line() {
    const out = [];
    for (const [id, o] of game.others.players) if (!o.hidden && o.target?.dq) out.push({ id, tq: Number(o.target.dq) });
    if (ticket) out.push({ id: game.myId, tq: ticket });
    return out;
  }
  // Seats free to call the line into: only while the gate is open.
  const freeNow = (s) => (gateOpen(s) ? Math.max(0, DAL.max - aboard(s.n)) : 0);
  const myPlace = () => turn.order.indexOf(game.myId) + 1;
  let lastGate = null; // (one toast per flight for "lifting off")
  const T = (k, v) => game.t(k, v);
  function spotNow(s) {
    const sp = riderSpot(ride.slot);
    const [x, z] = world(sp.x, sp.z);
    return { x, z, y: s.h + DAL.deck + 0.02, ry: ry + sp.ry };
  }
  function board() {
    const s = dalAt(dalClock());
    if (!gateOpen(s) || ride) return;
    turn = queue.update(line(), freeNow(s));
    if (!mayBoard(s)) { game.shop.toast(T('dal.full', { n: DAL.max })); game.clearAction(); return; }
    if (!game.wallet.spend(DAL.fare, { k: 'ledger.seoulDal' })) { game.shop.toast(T('ride.noCoins', { n: DAL.fare.toLocaleString() })); return; }
    // A free place at the rail: away from the others already standing there.
    const taken = new Set();
    for (const o of game.others.players.values()) {
      const r = o.ch.root.position, dx = r.x - ox, dz = r.z - oz;
      if (Math.hypot(dx, dz) > DECK_OUT) continue;
      const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
      taken.add(Math.round(((Math.atan2(lx, lz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * DAL.slots) % DAL.slots);
    }
    const free = [...Array(DAL.slots).keys()].filter((k) => !taken.has(k));
    const pick = free.length ? free : [...Array(DAL.slots).keys()];
    ticket = 0;
    ride = { slot: pick[Math.floor(Math.random() * pick.length)], n: s.n, paid: game.wallet.lastOp, flown: false, topped: false, down: false };
    const sp = spotNow(s);
    game.me.root.position.set(sp.x, sp.y, sp.z);
    game.me.root.rotation.y = sp.ry;
    Object.assign(game.cam, { yaw: sp.ry + Math.PI, pitch: Math.max(game.cam.pitch, 0.3), dist: Math.max(game.cam.dist, 9) });
    game.shop.toast(T('dal.aboard', { t: clock(s.left - DAL.close) }));
    game.missionEvent('ride');
    game.resend();
    game.clearAction();
  }
  // Off: on the ground at the gate (refund: got off before it left).
  function getOff(refund) {
    if (!ride) return;
    if (refund) game.wallet.refund(DAL.fare, ride.paid, { k: 'ledger.seoulDal' });
    game.me.root.position.set(gate[0], 0, gate[1]);
    game.me.root.rotation.y = ry;
    game.cam.yaw = ry + Math.PI;
    ride = null;
    game.resend();
    game.clearAction();
  }
  // Room for me now: under the cap, and nobody in line ahead (or it's my turn).
  const mayBoard = (s) => gateOpen(s) && aboard(s.n) < DAL.max && queue.maySit(game.myId, turn);
  function takeTicket() {
    ticket = Date.now();
    turn = queue.update(line(), freeNow(dalAt(dalClock())));
    game.shop.toast(T('dal.took', { n: myPlace() }));
    game.resend();
    game.clearAction();
  }
  function leaveLine() {
    ticket = 0;
    game.shop.toast(T('dal.left'));
    game.resend();
    game.clearAction();
  }
  function update() {
    const p = game.me.root.position;
    const far = Math.hypot(p.x - ox, p.z - oz) > DAL.load + 100;
    root.visible = game.mode === 'street' && !far;
    const s = dalAt(dalClock());
    // The line: called when the gate opens; a missed turn drops the ticket.
    const was = turn.callable.includes(game.myId);
    turn = queue.update(line(), freeNow(s));
    if (ticket && (far || game.mode !== 'street')) { ticket = 0; game.resend(); } // (went away)
    if (ticket && turn.expired.includes(game.myId)) { ticket = 0; game.shop.toast(T('dal.missed')); game.resend(); game.clearAction(); }
    if (ticket && !was && turn.callable.includes(game.myId)) { game.shop.toast(T('dal.called', { s: DAL.turn })); game.clearAction(); }
    if (root.visible) {
      balloon.position.y = s.h + DAL.deck;
      balloon.rotation.y = s.h * 0.004; // (a slow turn as it climbs)
      cable.scale.y = Math.max(0.01, s.h + DAL.deck - 0.9);
    }
    if (!ride) return;
    if (game.mode !== 'street') { ride = null; return; } // (a warp, the map: gone)
    const sp = spotNow(s);
    if (Math.hypot(p.x - sp.x, p.z - sp.z) > 4) { ride = null; p.y = 0; return; } // taken somewhere else (a taxi, the map)
    if (s.n !== ride.n && s.phase === 'board') { // landed: step out
      game.shop.toast(T('dal.landed'));
      game.me.play?.('cheer');
      getOff(false);
      return;
    }
    if (s.phase !== 'board') ride.flown = true;
    if (s.phase === 'up' && lastGate !== s.n) { lastGate = s.n; game.shop.toast(T('dal.up')); }
    if (s.phase === 'top' && !ride.topped) { // the view: once, down at the river
      ride.topped = true;
      ride.down = true;
      game.cam.pitch = 0.5; game.cam.dist = Math.max(game.cam.dist, 18); // (far enough out that the balloon is not in the way)
      game.shop.toast(T('dal.top'));
      game.clearAction();
    }
    p.set(sp.x, sp.y, sp.z);
    game.me.root.rotation.y = sp.ry;
  }
  // The button: at the gate, aboard (get off while it waits, the view in
  // the air).
  function act(p) {
    const now = dalClock(), s = dalAt(now);
    if (ride) {
      if (s.n === ride.n && gateOpen(s)) { const t = clock(s.left - DAL.close); return { key: 'dal-off:' + t, label: '🚪 ' + T('dal.leave', { t }), run: () => getOff(true) }; }
      if (s.phase === 'board') { const t = clock(s.left); return { key: 'dal-wait:' + t, label: '🎈 ' + T('dal.lifts', { t }), run: () => {} }; }
      return ride.down
        ? { key: 'dal-out', label: '🔭 ' + T('dal.lookOut'), run: () => { ride.down = false; game.cam.pitch = 0.2; game.clearAction(); } }
        : { key: 'dal-down', label: '👀 ' + T('dal.lookDown'), run: () => { ride.down = true; game.cam.pitch = 0.5; game.cam.dist = Math.max(game.cam.dist, 18); game.clearAction(); } }; // (far enough out that the balloon is not in the way)
    }
    if (game.riding) return null;
    const near = Math.hypot(p.x - ox, p.z - oz);
    if (ticket && turn.callable.includes(game.myId) && near < 60) { // called: board from anywhere round the pad
      const sec = queue.secondsLeft(game.myId) ?? 0;
      return { key: 'dal-turn:' + sec, label: '🔔 ' + T('dal.turn', { s: sec, n: DAL.fare.toLocaleString() }), run: board };
    }
    if (Math.hypot(p.x - gate[0], p.z - gate[1]) > 2.4) return null;
    if (ticket) { const n = myPlace(); return { key: 'dal-line:' + n, label: '🎫 ' + T('dal.line', { n }), run: leaveLine }; }
    if (mayBoard(s)) return { key: 'dal-board:' + aboard(s.n), label: '🎈 ' + T('dal.board', { n: DAL.fare.toLocaleString(), k: aboard(s.n), max: DAL.max }), run: board };
    const t = clock(opensIn(now));
    return { key: 'dal-ticket:' + t, label: '🎫 ' + T('dal.ticket', { t }), run: takeTicket };
  }
  // My bits of the shared state: the flight I'm on, my ticket.
  function state(st) {
    if (ride) st.dl = ride.n + 1;
    if (ticket) st.dq = ticket;
  }
  return {
    update, act, state,
    get busy() { return !!ride; },
  };
}
