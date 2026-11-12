// The lantern parade (연등행렬), drawn: twelve people (two monks in front,
// then ten in hanbok) with lotus lanterns on poles, the big lantern floats,
// Cheonggyecheon's festival figures lighting up one by one as the column
// passes them, and Jogyesa's canopy lighting up row by row as the first
// marchers come in through Iljumun. When and where: core/lantern-parade.js.
// Loaded by game/lantern-parade-near.js.
//
// game: { scene, stream (Cheonggyecheon, world metres), off (the
// Gyeongbokgung district's offset), darkness() (0 day … 1 night) }.
import * as THREE from 'three';
import { paradeAt, paradeRoutes, paradeState, figureLitAt, ROWS, PER_ROW, LIGHT_SECONDS, SHOW_SECONDS, AFTER_SECONDS, SPEED, FLOATS as FLOAT_KINDS } from '../core/lantern-parade.js';
import { FIGURES, lightUp, festivalFigures, setFigureGlow } from '../core/lanterns.js';
import { createCharacter } from '../core/character.js';
import { randomLook } from '../data/appearance.js';
import { hanbokById } from '../data/hanbok.js';
import { JOGYESA as J } from '../data/jogyesa.js';

const N = ROWS * PER_ROW;
const LANTERNS = ['#ff8fb1', '#ffd84d', '#ff6f91', '#fff4ea', '#ef4f5f', '#ffb3c6'];
const DIM = 0.16; // the canopy before it lights up, at night
const FIG_DIM = 0.25, FIG_FLARE = 2.2; // the festival figures: waiting in the dark, then a flash as the column passes
// Who walks: two monks in grey, then the hanbok sets of the shop by
// Gyeongbokgung (data/hanbok.js), women's and men's in turn.
const MONK = { model: 'hanbok-durumagi-gray', skirt: null, tee: null, hair: 'black', dye: 'black', hairStyle: 'buzz' };
const SETS = ['pink-navy', 'baji-blue', 'yellow-red', 'baji-jade', 'mint-pink', 'durumagi-lilac', 'pink-navy', 'baji-navy', 'yellow-red', 'baji-ivory'];
const HAIR = { f: ['bun', 'long', 'braids', 'bob'], m: ['short', 'comma', 'side', 'crop'] };
const lookOf = (i) => {
  if (i < 2) return MONK;
  const id = SETS[(i - 2) % SETS.length], f = !id.startsWith('baji') && !id.startsWith('durumagi');
  return { ...hanbokById(id).wear, hair: 'black', dye: i % 5 === 3 ? 'brown' : 'black', hairStyle: HAIR[f ? 'f' : 'm'][i % 4] };
};
// A lotus lantern on a pole, held up in front (in the character's body units,
// like palace-show.js's parasol).
function lanternPole(color) {
  const g = new THREE.Group();
  const pole = new THREE.Group();
  pole.position.set(0.22, 0.38, 0.14);
  pole.rotation.x = 0.35;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.9, 6), new THREE.MeshLambertMaterial({ color: '#6a4a2a' }));
  stick.position.y = 0.95;
  pole.add(stick);
  const top = new THREE.Group();
  top.position.y = 1.9;
  top.rotation.x = -0.35;
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4), stick.material);
  hook.position.y = -0.1;
  top.add(hook);
  const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1).scale(1, 0.82, 1), new THREE.MeshBasicMaterial({ color })); // lit from inside
  lamp.position.y = -0.38;
  top.add(lamp);
  const petals = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.16, 8), new THREE.MeshBasicMaterial({ color: '#7fd18b' }));
  petals.rotation.x = Math.PI;
  petals.position.y = -0.62;
  top.add(petals);
  pole.add(top);
  g.add(pole);
  return g;
}

export function createLanternParade(game) {
  const { scene, stream, off } = game;
  const R = paradeRoutes(stream, off);
  const root = new THREE.Group();
  root.name = 'lantern-parade';
  root.visible = false;
  scene.add(root);
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const people = Array.from({ length: N }, (_, i) => {
    const ch = createCharacter({ ...randomLook(), ...lookOf(i) });
    ch.addProp('body', lanternPole(LANTERNS[(i * 5 + 1) % LANTERNS.length]));
    root.add(ch.root);
    return ch;
  });
  // The floats: a low cart with the figure on it, glowing at night.
  const floats = FLOAT_KINDS.map((kind) => {
    const g = new THREE.Group();
    const cart = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 4.2), lam('#7a2c22'));
    cart.position.y = 0.45;
    g.add(cart);
    for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 10), lam('#2b2220'));
      w.rotation.z = Math.PI / 2;
      w.position.set(sx * 1.15, 0.3, sz);
      g.add(w);
    }
    const fig = FIGURES[kind]();
    fig.scale.setScalar(0.85);
    fig.rotation.y = -Math.PI / 2; // (the figures face +x; the cart goes +z)
    fig.position.y = kind === 'moon' ? 0.3 : 0.7;
    lightUp(fig);
    g.add(fig);
    root.add(g);
    return g;
  });

  // Jogyesa's canopy (core/jogyesa-model.js), found once the city has built it.
  let canopy = null, base = null, litTo = -1;
  const findCanopy = () => {
    canopy = scene.getObjectByName('jogyesa-canopy');
    if (!canopy?.instanceColor) { canopy = null; return; }
    base = canopy.instanceColor.array.slice(); // the lanterns' own colours
  };
  const m4 = new THREE.Matrix4();
  // Cheonggyecheon's figures (core/lanterns.js): dark as the column sets off,
  // each flashing up as the first row passes, then glowing as usual. t null: as usual.
  const setFigures = (t) => {
    const dark = game.darkness?.() ?? 1;
    for (const f of festivalFigures()) {
      let k = 1;
      if (t != null && t > -20 && t < SHOW_SECONDS + AFTER_SECONDS) {
        const lit = figureLitAt(f.u), a = t - lit;
        if (a < 0) k = 1 - (1 - FIG_DIM) * Math.min(1, (t + 20) / 5); // dims over 5 s
        else if (a < 0.8) k = FIG_DIM + (FIG_FLARE - FIG_DIM) * (a / 0.8);
        else k = 1 + (FIG_FLARE - 1) * Math.exp(-(a - 0.8) / 4);
      }
      setFigureGlow(f, k, dark);
    }
  };
  // How lit each canopy column is (0 dim … 1 lit) at t, from the gate side west.
  const canopyLight = (t, arrive) => {
    const x0 = J.canopy.x0 + off[0], x1 = J.canopy.x1 + off[0];
    return (x) => (arrive == null ? 0 : Math.min(1, Math.max(0, (t - arrive - ((x1 - x) / (x1 - x0)) * LIGHT_SECONDS) / 3)));
  };
  const setCanopy = (fn) => {
    if (!canopy) findCanopy();
    if (!canopy) return;
    const a = canopy.instanceColor.array, p = new THREE.Vector3();
    for (let i = 0; i < canopy.count; i++) {
      canopy.getMatrixAt(i, m4);
      p.setFromMatrixPosition(m4).applyMatrix4(canopy.matrixWorld);
      const k = DIM + (1 - DIM) * fn(p.x);
      a[i * 3] = base[i * 3] * k; a[i * 3 + 1] = base[i * 3 + 1] * k; a[i * 3 + 2] = base[i * 3 + 2] * k;
    }
    canopy.instanceColor.needsUpdate = true;
  };
  const restore = () => { if (canopy && base) { canopy.instanceColor.array.set(base); canopy.instanceColor.needsUpdate = true; } litTo = -1; };

  let wasOn = false, arrive = null;
  return {
    root,
    update(now = Date.now(), dt = 1 / 60) {
      const P = paradeAt(now);
      if (!P) { if (wasOn) { root.visible = false; restore(); setFigures(null); wasOn = false; arrive = null; } return; }
      wasOn = true;
      root.visible = true;
      const S = paradeState(R, off, P.t);
      S.walkers.forEach((w, i) => {
        const ch = people[i];
        ch.root.position.set(w.x, w.y, w.z);
        ch.root.rotation.y = w.ry + (w.walking ? Math.sin(P.t * 2.1 + i) * 0.04 : 0);
        ch.animate(dt, w.walking ? SPEED / 12 : 0); // the same walk as the street NPCs
      });
      setFigures(P.t);
      S.floats.forEach((f, i) => { if (floats[i]) { floats[i].position.set(f.x, f.y, f.z); floats[i].rotation.y = f.ry; } });
      // The canopy: dim at night until the first row is in, then row by row.
      if (arrive == null && S.lead <= 0) arrive = P.t + S.lead / SPEED; // (when they came in: exact even if we arrive late)
      const dark = game.darkness?.() ?? 1;
      if (dark < 0.5 || P.t > SHOW_SECONDS + AFTER_SECONDS - 1) { if (litTo !== -2) { restore(); litTo = -2; } return; }
      const step = Math.floor(P.t * 4); // (four colour updates a second while it changes)
      const done = arrive != null && P.t > arrive + LIGHT_SECONDS + 4;
      if (step !== litTo && !(done && litTo === -3)) {
        setCanopy(canopyLight(P.t, arrive));
        litTo = done ? -3 : step;
      }
    },
    dispose() { restore(); setFigures(null); scene.remove(root); },
  };
}
