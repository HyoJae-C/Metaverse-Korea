// Catch the Thief seen from my own seat (Yozi 2026-11-23): everyone sits
// round a small table as their own character, holding their cards up in a
// fan, backs to the table. The camera is my eyes: it turns to whoever I am
// dealing with (the one I pick from, or the one picking from me), and with
// more players to the two who are at it. My own cards stay on the panel
// under the picture, as cards in my hands (ui/board-games-ui.js).
//
// A small renderer of its own, as the toys have (ui/board-toy-3d.js); loaded
// only when this game is played. Only what the game already sends is used
// (who points at which card, who took one), so nothing new goes over the net.
//
// createThiefView({ n, seat, figures, names, onPick(i) }) → { el, sync({ counts,
//   from, turn, sel, faces, gone, over, canPick }), dispose() }; null with no WebGL.
import * as THREE from 'three';
import { createViewPace } from './board-view-pace.js';

const lam = (color) => new THREE.MeshLambertMaterial({ color });
const R = 1.05; // seats' distance from the middle of the table
export const CARD_W = 0.2, CARD_H = 0.29;
const HAND_Y = 0.79, EYE_Y = 1.08;

// A card back: our own stripes (the same as the flat cards on the panel).
export function backTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 64, 96);
  x.save(); x.beginPath(); x.rect(4, 4, 56, 88); x.clip();
  x.fillStyle = '#3f6fb5'; x.fillRect(0, 0, 64, 96);
  x.strokeStyle = '#5a8ad0'; x.lineWidth = 6;
  for (let i = -96; i < 96; i += 16) { x.beginPath(); x.moveTo(i, 96); x.lineTo(i + 96, 0); x.stroke(); }
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Words or an emoji floating over a head.
export function label(text, { size = 44, bg = 'rgba(255,255,255,.9)', pad = 14 } = {}) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  const font = `700 ${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  x.font = font;
  c.width = Math.ceil(Math.min(420, x.measureText(text).width) + pad * 2); c.height = size + pad * 2;
  x.font = font;
  if (bg) { x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, c.width, c.height, c.height / 2); x.fill(); }
  x.fillStyle = '#2b2230'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, c.width / 2, c.height / 2 + 2, c.width - pad * 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  s.userData.ratio = c.width / c.height;
  s.renderOrder = 5;
  return s;
}

// A card: a thin box drawn in two parts, its back (material 1, the +z face)
// and the rest (material 0). A plain box with six materials took six draws a
// card, the biggest part of the table's draws (Yozi 2026-11-27, hot phones).
export function cardGeometry() {
  const g = new THREE.BoxGeometry(CARD_W, CARD_H, 0.006);
  const idx = g.index.array, back = g.groups[4];
  const front = [], rest = [];
  for (const gr of g.groups) for (let i = gr.start; i < gr.start + gr.count; i++) (gr === back ? front : rest).push(idx[i]);
  g.setIndex([...rest, ...front]);
  g.clearGroups();
  g.addGroup(0, rest.length, 0);
  g.addGroup(rest.length, front.length, 1);
  return g;
}

export function createThiefView({ n, seat, figures = [], names = [], onPick }) {
  let renderer;
  const pace = createViewPace({ idle: true });
  try { renderer = new THREE.WebGLRenderer({ antialias: pace.smooth, alpha: true, powerPreference: 'low-power' }); } catch { return null; }
  const el = renderer.domElement;
  el.className = 'bg-toy3d bg-thief3d';
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c7b0, 1.9));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.5);
  sun.position.set(2, 5, 4);
  scene.add(sun);
  // The table and the floor under it.
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 36), lam('#c98d55'));
  top.position.y = 0.6;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.6, 14), lam('#8a5a32'));
  leg.position.y = 0.3;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 40), lam('#e9d3ac'));
  floor.rotation.x = -Math.PI / 2;
  scene.add(top, leg, floor);

  // Where a seat is, seen from mine: I sit at +z, the others go round.
  const angle = (s) => ((s - seat + n) % n) / n * Math.PI * 2;
  const at = (s, r = R) => { const a = angle(s); return new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r); };
  const BACK = [lam('#fffdf6'), new THREE.MeshLambertMaterial({ map: backTexture() })];
  const cardGeo = cardGeometry();
  const people = [];
  for (let s = 0; s < n; s++) {
    const p = { s, cards: [], hand: new THREE.Group(), who: new THREE.Group(), face: null, faceText: '', count: -1 };
    people.push(p);
    if (s === seat) continue; // (I am the camera)
    const pos = at(s);
    p.who.position.copy(pos);
    p.who.rotation.order = 'YXZ';
    p.who.rotation.y = angle(s) + Math.PI; // facing the table
    if (figures[s]) p.who.add(figures[s]);
    if (names[s]) { p.name = label(names[s], { size: 34 }); p.name.position.set(0, 1.42, 0); p.name.scale.set(0.16 * p.name.userData.ratio, 0.16, 1); p.who.add(p.name); }
    // Their cards, held up between them and the table.
    p.hand.position.set(0, HAND_Y, 0.52);
    p.hand.rotation.x = -0.12;
    p.who.add(p.hand);
    scene.add(p.who);
  }

  const camera = new THREE.PerspectiveCamera(46, 4 / 3, 0.05, 30);
  camera.position.copy(at(seat, R + 0.3)).setY(EYE_Y);
  const look = new THREE.Vector3(0, 0.8, 0), want = new THREE.Vector3(0, 0.8, 0);
  let state = { from: -1, turn: -1, sel: -1, canPick: false, over: false }, hot = -1;
  const flying = []; // cards on their way from one hand to another
  const tmp = new THREE.Vector3();

  const handPoint = (s, out) => (s === seat ? out.copy(camera.position).setY(EYE_Y - 0.45) : people[s].hand.getWorldPosition(out));
  const fan = (p, count) => {
    while (p.cards.length > count) p.hand.remove(p.cards.pop());
    while (p.cards.length < count) { const m = new THREE.Mesh(cardGeo, BACK); m.userData.lift = 0; p.cards.push(m); p.hand.add(m); }
    p.count = count;
  };
  // Each card a little further round the fan (and in front of the last, so they overlap cleanly).
  const place = (p, dt) => {
    const k = p.cards.length, step = Math.min(CARD_W * 0.62, 0.95 / Math.max(1, k - 1)), turn = Math.min(0.11, 0.8 / Math.max(1, k - 1));
    p.cards.forEach((m, i) => {
      const o = i - (k - 1) / 2;
      const picked = state.from === p.s && state.sel === i, hover = state.canPick && state.from === p.s && hot === i;
      m.userData.lift += ((picked ? 0.13 : state.from === p.s && state.tip === i ? 0.08 : hover ? 0.05 : 0) - m.userData.lift) * Math.min(1, dt * 12);
      m.position.set(-o * step, -(Math.abs(o) ** 1.6) * 0.012 + m.userData.lift, i * 0.004);
      m.rotation.z = o * turn;
    });
  };

  const ndc = new THREE.Vector2();
  // The card nearest the tap (a finger is wider than a card's edge in a fan).
  const hit = (e) => {
    const p = people[state.from];
    if (!state.canPick || !p || p.s === seat) return -1;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    let best = -1, bestD = Math.max(54, r.width * 0.14);
    p.cards.forEach((m, i) => {
      m.getWorldPosition(tmp).project(camera);
      const d = Math.hypot((tmp.x - ndc.x) * r.width / 2, (tmp.y - ndc.y) * r.height / 2);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };
  el.addEventListener('pointermove', (e) => { pace.wake(); hot = hit(e); el.style.cursor = hot >= 0 ? 'pointer' : 'default'; });
  el.addEventListener('pointerleave', () => { pace.wake(); hot = -1; });
  el.addEventListener('pointerdown', (e) => { const i = hit(e); if (i >= 0) { e.preventDefault(); onPick(i); } });

  let raf = 0, w = 0, h = 0, gone = false, last = performance.now();
  const frame = () => {
    if (gone) return;
    raf = requestAnimationFrame(frame);
    if (!el.isConnected) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    if (cw && ch && (cw !== w || ch !== h)) pace.wake(); // (a new size: drawn again)
    pace.moving = flying.length > 0 || people.some((p) => p.face);
    if (!pace.ready(performance.now())) return;
    if (cw && ch && (cw !== w || ch !== h)) {
      w = cw; h = ch;
      renderer.setPixelRatio(pace.ratio());
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const p of people) {
      if (p.s === seat) continue;
      place(p, dt);
      // Whoever is picking leans in a little; a face pulled bobs over the head.
      const lean = !state.over && state.turn === p.s ? 0.1 : 0;
      p.who.rotation.x += (lean - p.who.rotation.x) * Math.min(1, dt * 6);
      // The two who are at it turn to each other (the holder offers the fan
      // to the picker); everyone else faces the table.
      const other = state.over ? -1 : state.from === p.s ? state.turn : state.turn === p.s ? state.from : -1;
      let yaw = angle(p.s) + Math.PI;
      if (other >= 0) { const o = other === seat ? camera.position : people[other].who.position; yaw = Math.atan2(o.x - p.who.position.x, o.z - p.who.position.z); }
      const d = Math.atan2(Math.sin(yaw - p.who.rotation.y), Math.cos(yaw - p.who.rotation.y));
      p.who.rotation.y += d * Math.min(1, dt * 5);
      if (p.face) p.face.position.y = 1.72 + Math.sin(now / 160) * 0.03;
    }
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i], t = (now - f.at) / 420;
      if (t >= 1) { scene.remove(f.m); flying.splice(i, 1); continue; }
      const e = t * t * (3 - 2 * t);
      f.m.position.lerpVectors(f.a, f.b, e).y += Math.sin(e * Math.PI) * 0.18;
      f.m.rotation.set(-0.3, f.spin + e * 3, 0);
    }
    look.lerp(want, Math.min(1, dt * 4));
    camera.lookAt(look);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    el,
    // The game as it stands. counts: cards in each hand; from/turn: who is
    // picked from and who picks; sel: the card pointed at; faces: an emoji
    // per seat (or none); gone: who has left the table.
    sync({ counts, from, turn, sel, tip = -1, faces = [], gone: left = [], over = false, canPick = false }) {
      // A card that changed hands flies across (one hand a card shorter, the other got it or laid a pair down).
      if (state.from >= 0 && state.turn >= 0 && people[state.from].count > 0 && counts[state.from] === people[state.from].count - 1) {
        const m = new THREE.Mesh(cardGeo, BACK);
        const f = { m, a: handPoint(state.from, new THREE.Vector3()), b: handPoint(state.turn, new THREE.Vector3()), at: performance.now(), spin: angle(state.from) };
        m.position.copy(f.a);
        scene.add(m);
        flying.push(f);
      }
      for (const p of people) {
        if (p.s === seat) { p.count = counts[p.s]; continue; }
        if (p.count !== counts[p.s]) fan(p, counts[p.s]);
        p.who.visible = !left[p.s];
        const text = faces[p.s] || '';
        if (text !== p.faceText) {
          if (p.face) { p.who.remove(p.face); p.face.material.map.dispose(); p.face.material.dispose(); p.face = null; }
          if (text) { p.face = label(text, { size: 72, bg: 'rgba(255,255,255,.95)', pad: 18 }); p.face.scale.set(0.34 * p.face.userData.ratio, 0.34, 1); p.face.position.set(0, 1.72, 0); p.who.add(p.face); }
          p.faceText = text;
        }
      }
      state = { from, turn, sel, tip, canPick: canPick && !over, over };
      pace.wake();
      if (!state.canPick) hot = -1;
      // Where my eyes go.
      const head = (s, y = HAND_Y) => at(s, R - 0.3).setY(y);
      if (over || from < 0) want.set(0, 0.8, 0);
      else if (turn === seat) want.copy(at(from, R).lerp(camera.position, 0.25)).setY(HAND_Y + 0.12);
      else if (from === seat) want.copy(head(turn, 0.98));
      else want.copy(head(from)).add(head(turn)).multiplyScalar(0.5);
    },
    dispose() {
      gone = true;
      cancelAnimationFrame(raf);
      for (const f of figures) f?.removeFromParent(); // (the game's own shapes are shared: not ours to dispose)
      scene.traverse((o) => { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach((m) => { m.map?.dispose(); m.dispose(); }); else { o.material?.map?.dispose?.(); o.material?.dispose?.(); } });
      renderer.dispose();
      renderer.forceContextLoss?.();
      el.remove();
    },
  };
}
