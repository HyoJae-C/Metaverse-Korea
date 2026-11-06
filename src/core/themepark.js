// Another Land (어나더랜드), the candy-house theme park: an outdoor "room"
// entered through its gate east of Seongsu (the outside is anotherland.js),
// with a carousel, a Ferris wheel, a swinging pirate ship and a drop tower. Each ride has a
// boarding spot; on a ride the player is carried by seatAt(). Same shape as
// buildInterior's result, plus tick(dt) to animate the rides.
import * as THREE from 'three';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));

export const RIDE_COST = 2;
export const RIDE_SECONDS = { carousel: 24, wheel: 32, viking: 22, drop: 16 };

// Pure ride motion (unit-tested): where seat i is at time t (seconds).
export const RIDES = {
  carousel: { x: -9, z: -2, seats: 6, r: 3, speed: 0.55 },
  wheel: { x: 9.5, z: -7, seats: 8, r: 7, hub: 9.4, drop: 1.9, speed: (Math.PI * 2) / RIDE_SECONDS.wheel },
  viking: { x: -1, z: -9.5, seats: 4, pivot: 6.2, arm: 5, max: 1.05 },
  // Drop tower: seats round a pole; one shared cycle of load, climb, hold, drop.
  drop: { x: 14, z: -1, seats: 6, r: 1.55, low: 0.55, top: 16, cycle: 16 },
};
// Height of the drop tower's seat ring at time t (seconds).
export function dropY(t, low = RIDES.drop.low, top = RIDES.drop.top, cycle = RIDES.drop.cycle) {
  const p = ((t % cycle) + cycle) % cycle;
  if (p < 3) return low; // loading
  if (p < 11) return low + ((p - 3) / 8) * (top - low); // slow climb
  if (p < 13) return top; // hold at the top…
  if (p < 14) { const k = p - 13; return top - k * k * (top - low - 2); } // …then drop
  return low + 2 * (1 - (p - 14) / 2); // brakes, settle
}
// When a ride that starts now ends. The drop tower runs on its own cycle:
// board while it loads and you ride this cycle, otherwise the next one.
export function rideUntil(kind, now) {
  if (kind !== 'drop') return now + RIDE_SECONDS[kind];
  const { cycle } = RIDES.drop, start = Math.floor(now / cycle) * cycle;
  return now - start < 3 ? start + cycle : start + cycle * 2;
}
export function seatAt(kind, i, t, started = 0) {
  const R = RIDES[kind];
  if (kind === 'carousel') {
    const a = (i / R.seats) * Math.PI * 2 + t * R.speed;
    return { x: R.x + Math.sin(a) * R.r, y: 0.55 + 0.25 * Math.sin(t * 2.4 + i * 1.7), z: R.z + Math.cos(a) * R.r, ry: a + Math.PI / 2 };
  }
  if (kind === 'wheel') {
    const a = (i / R.seats) * Math.PI * 2 + t * R.speed;
    // Cabins hang below the rim; the seat is the cabin floor.
    return { x: R.x + Math.sin(a) * R.r, y: R.hub - Math.cos(a) * R.r - R.drop, z: R.z + 0.2, ry: 0 };
  }
  if (kind === 'drop') {
    const a = (i / R.seats) * Math.PI * 2;
    return { x: R.x + Math.sin(a) * R.r, y: dropY(t), z: R.z + Math.cos(a) * R.r, ry: a };
  }
  // viking: swings higher for the first seconds of the ride.
  const ramp = Math.min(1, Math.max(0.15, (t - started) / 8));
  const ang = R.max * ramp * Math.sin(t * 1.25);
  const off = (i - (R.seats - 1) / 2) * 1.1; // along the ship
  const along = off * Math.cos(ang) + Math.sin(ang) * R.arm;
  return { x: R.x + along, y: R.pivot - Math.cos(ang) * R.arm + off * Math.sin(ang) + 0.4, z: R.z, ry: -Math.PI / 2 };
}

export function buildThemePark(store, ROOM, EXIT) {
  const { w, d } = ROOM;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffe3f0');
  scene.fog = new THREE.Fog('#ffe3f0', 45, 140);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fcf8a, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.2);
  sun.position.set(10, 20, 8);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const add = (geo, color, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (sx, sy, sz, x, y, z, color, parent) => add(new THREE.BoxGeometry(sx, sy, sz), color, x, y, z, parent);

  // Ground: grass with paved paths, a far ring of trees.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(w * 3, d * 3).rotateX(-Math.PI / 2), mat('#a6d98a'));
  scene.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4, d).rotateX(-Math.PI / 2), mat('#efe2c4'));
  path.position.set(0, 0.01, 0);
  scene.add(path);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(w - 4, 6).rotateX(-Math.PI / 2), mat('#efe2c4'));
  plaza.position.set(0, 0.01, 3);
  scene.add(plaza);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, rx = Math.sin(a) * (w * 0.75), rz = Math.cos(a) * (d * 0.8);
    // Candy scenery: lollipops and gumdrops instead of plain trees.
    if (i % 2) {
      add(new THREE.CylinderGeometry(0.1, 0.1, 3, 6), '#fffaf3', rx, 1.5, rz);
      const pop = add(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 18), ['#ff8fb8', '#c9a8ff', '#8fe3c7'][i % 3], rx, 3.8, rz);
      pop.rotation.x = Math.PI / 2;
      pop.lookAt(0, 3.8, 0);
      pop.rotateX(Math.PI / 2);
    } else {
      const drop = add(new THREE.SphereGeometry(1.6, 12, 8), ['#ffe27a', '#ff5a5f', '#8fd0ff', '#ffad6b'][(i / 2) % 4], rx, 0.6, rz);
      drop.scale.y = 0.8;
    }
  }
  // The edges of the park.
  for (const [x, z, sx, sz] of [[0, -d / 2, w, 0.4], [-w / 2, 0, 0.4, d], [w / 2, 0, 0.4, d]]) {
    box(sx, 1, sz, x, 0.5, z, '#f2a7a0');
    block(x, z, sx, sz);
  }

  // Entrance arch.
  for (const sx of [-3, 3]) {
    for (let i = 0; i < 4; i++) box(0.6, 1, 0.6, sx, 0.5 + i, d / 2 - 2.2, i % 2 ? '#fffaf3' : '#ff5a5f'); // candy canes
    add(new THREE.SphereGeometry(0.55, 10, 8), '#8fe3c7', sx, 4.4, d / 2 - 2.2);
  }
  box(7, 1.1, 0.6, 0, 4.4, d / 2 - 2.2, '#ff8fb8');
  box(7.2, 0.3, 0.7, 0, 5.05, d / 2 - 2.2, '#fffaf3'); // frosting

  // Carousel: a turning platform, poles and horses, a striped canopy.
  const C = RIDES.carousel;
  const carousel = new THREE.Group();
  carousel.position.set(C.x, 0, C.z);
  scene.add(carousel);
  add(new THREE.CylinderGeometry(C.r + 0.8, C.r + 0.8, 0.3, 24), '#fff3d6', 0, 0.15, 0, carousel);
  add(new THREE.CylinderGeometry(0.3, 0.3, 3.6, 10), '#d4a73a', 0, 1.8, 0, carousel);
  const canopy = add(new THREE.ConeGeometry(C.r + 1.2, 1.6, 12), '#ff7a8a', 0, 4.2, 0, carousel);
  canopy.material = mat('#ff7a8a');
  const horses = [];
  for (let i = 0; i < C.seats; i++) {
    const a = (i / C.seats) * Math.PI * 2;
    const h = new THREE.Group();
    h.position.set(Math.sin(a) * C.r, 0.6, Math.cos(a) * C.r);
    h.rotation.y = a + Math.PI / 2;
    add(new THREE.CylinderGeometry(0.04, 0.04, 3.4, 6), '#d4a73a', 0, 1.1, 0, h);
    box(0.9, 0.35, 0.3, 0, 0.2, 0, ['#ffffff', '#ffd36e', '#86b8f0'][i % 3], h); // body
    box(0.25, 0.45, 0.25, 0.42, 0.5, 0, ['#ffffff', '#ffd36e', '#86b8f0'][i % 3], h); // neck/head
    carousel.add(h);
    horses.push(h);
  }
  block(C.x, C.z, (C.r + 0.9) * 2, (C.r + 0.9) * 2);

  // Ferris wheel: two A-frames, a rim with spokes, cabins that stay level.
  const W = RIDES.wheel;
  for (const sz of [-0.9, 1.3]) for (const sx of [-1, 1]) {
    const leg = box(0.3, W.hub + 0.6, 0.3, W.x + sx * 2.2, W.hub / 2, W.z + sz, '#9ca9af');
    leg.rotation.z = sx * 0.26;
  }
  const wheel = new THREE.Group();
  wheel.position.set(W.x, W.hub, W.z + 0.2);
  scene.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(W.r, 0.12, 6, 40), mat('#ffffff'));
  wheel.add(rim);
  for (let i = 0; i < W.seats; i++) {
    const s = box(0.08, W.r * 2, 0.08, 0, 0, 0, '#d9dde2', wheel);
    s.rotation.z = (i / W.seats) * Math.PI;
  }
  const cabins = [];
  const cabinColors = ['#ff7a8a', '#ffd36e', '#8fd3c7', '#86b8f0', '#b9a6f0', '#ffb36b', '#a6d97a', '#ff9bb3'];
  for (let i = 0; i < W.seats; i++) {
    // An open gondola: roof at the rim, floor W.drop below, four posts.
    const c = new THREE.Group();
    box(1.6, 0.14, 1.4, 0, 0, 0, '#ffffff', c);
    box(1.5, 0.5, 1.3, 0, -W.drop + 0.2, 0, cabinColors[i], c);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.6, 0.6]) box(0.07, W.drop, 0.07, sx, -W.drop / 2, sz, '#d9dde2', c);
    scene.add(c);
    cabins.push(c);
  }
  block(W.x, W.z + 0.2, 6, 3);

  // Pirate ship (바이킹): an A-frame with a swinging boat.
  const V = RIDES.viking;
  for (const sz of [-1.6, 1.6]) for (const sx of [-1, 1]) {
    const leg = box(0.3, V.pivot + 0.5, 0.3, V.x + sx * 1.6, V.pivot / 2, V.z + sz, '#7a4a2e');
    leg.rotation.z = sx * 0.28;
  }
  box(0.25, 0.25, 3.4, V.x, V.pivot, V.z, '#7a4a2e');
  const swing = new THREE.Group();
  swing.position.set(V.x, V.pivot, V.z);
  scene.add(swing);
  for (const sz of [-1.2, 1.2]) box(0.12, V.arm, 0.12, 0, -V.arm / 2, sz, '#5a3a28', swing);
  const hull = box(5.6, 1, 1.9, 0, -V.arm, 0, '#8a5a3a', swing);
  box(5.8, 0.25, 2, 0, -V.arm + 0.55, 0, '#d4a73a', swing);
  for (const sx of [-1, 1]) { const tip = box(0.9, 1.3, 1.6, sx * 3.1, -V.arm + 0.5, 0, '#8a5a3a', swing); tip.rotation.z = -sx * 0.5; }
  hull.name = 'hull';
  block(V.x, V.z, 9, 4);

  // Drop tower (자이로드롭): a candy-striped pole and a ring of seats.
  const D = RIDES.drop;
  for (let i = 0; i < 9; i++) add(new THREE.CylinderGeometry(0.55, 0.55, 2, 12), i % 2 ? '#ff5a5f' : '#fffaf3', D.x, 1 + i * 2, D.z);
  add(new THREE.CylinderGeometry(1.4, 1.4, 0.6, 16), '#ffe27a', D.x, 18.3, D.z);
  add(new THREE.ConeGeometry(1.5, 2, 16), '#ff8fb8', D.x, 19.6, D.z);
  const dropRing = new THREE.Group();
  dropRing.position.set(D.x, D.low, D.z);
  scene.add(dropRing);
  add(new THREE.CylinderGeometry(D.r + 0.5, D.r + 0.5, 0.25, 18), '#8fe3c7', 0, -0.15, 0, dropRing);
  for (let i = 0; i < D.seats; i++) {
    const a = (i / D.seats) * Math.PI * 2;
    const st = box(0.6, 0.9, 0.12, Math.sin(a) * (D.r - 0.25), 0.35, Math.cos(a) * (D.r - 0.25), ['#ff8fb8', '#ffe27a', '#c9a8ff'][i % 3], dropRing);
    st.rotation.y = a;
  }
  add(new THREE.CylinderGeometry(D.r + 1, D.r + 1.2, 0.3, 18), '#b8743f', D.x, 0.15, D.z);
  block(D.x, D.z, 1.4, 1.4);

  // Ticket booth and a churro cart by the entrance.
  box(2, 2.2, 1.4, -6, 1.1, d / 2 - 4.5, '#ffd36e');
  box(2.4, 0.3, 1.8, -6, 2.35, d / 2 - 4.5, '#ff7a8a');
  block(-6, d / 2 - 4.5, 2.1, 1.5);
  box(1.6, 1, 0.9, 6, 0.5, d / 2 - 4.5, '#f6c9a0');
  box(1.8, 0.1, 1.1, 6, 1.9, d / 2 - 4.5, '#ff9bb3');
  block(6, d / 2 - 4.5, 1.7, 1);

  // Balloon shooting gallery (풍선 사격): a striped booth with rows of
  // balloons, toy cork guns on the counter (the game is ui/gallery-ui.js).
  const G = { x: -14.5, z: -10.5 };
  box(4.4, 2.8, 0.2, G.x, 1.4, G.z - 1, '#fff3d6'); // back wall
  for (const sx of [-2.1, 2.1]) box(0.2, 2.8, 2, G.x + sx, 1.4, G.z, '#ff7a8a'); // sides
  for (let i = 0; i < 6; i++) box(0.75, 0.3, 2.3, G.x - 1.9 + i * 0.76, 2.95, G.z + 0.1, i % 2 ? '#fffaf3' : '#ff5a5f'); // awning
  box(4.2, 1, 0.5, G.x, 0.5, G.z + 0.9, '#ffd36e'); // counter
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
    add(new THREE.SphereGeometry(0.17, 10, 8), ['#ff5a5f', '#ffd36e', '#8fd0ff', '#c9a8ff', '#8fe3c7'][(i + r * 2) % 5], G.x - 1.5 + i * 0.6, 1.2 + r * 0.55, G.z - 0.82);
  }
  for (const sx of [-0.8, 0.8]) box(0.6, 0.08, 0.1, G.x + sx, 1.05, G.z + 0.9, '#7a4a2e'); // toy guns
  block(G.x, G.z, 4.4, 2.4);
  const stations = { gallery: [{ x: G.x, z: G.z + 2.2, ry: Math.PI }] }; // facing the targets

  // Benches.
  const seats = [];
  for (const bx of [-12, 12]) {
    const bz = 6;
    box(1.6, 0.08, 0.5, bx, 0.38, bz, '#c98b4f');
    box(1.6, 0.4, 0.08, bx, 0.6, bz - 0.25, '#c98b4f');
    block(bx, bz, 1.7, 0.6);
    for (const o of [-0.4, 0.4]) seats.push({ x: bx + o, z: bz + 0.05, ry: 0, stand: [bx + o, bz + 0.9] });
  }

  // Where you board each ride (in front of it).
  const rides = [
    { kind: 'carousel', x: C.x + C.r + 2, z: C.z + 1.5 },
    { kind: 'wheel', x: W.x - 1.5, z: W.z + 3.3 },
    { kind: 'viking', x: V.x + 5.2, z: V.z + 2.6 },
    { kind: 'drop', x: D.x - D.r - 2, z: D.z + 2.2 },
  ];

  let time = 0;
  const tick = (dt) => {
    time += dt;
    carousel.rotation.y = time * C.speed;
    horses.forEach((h, i) => { h.position.y = 0.6 + 0.25 * Math.sin(time * 2.4 + i * 1.7); });
    wheel.rotation.z = -time * W.speed;
    cabins.forEach((c, i) => { const s = seatAt('wheel', i, time); c.position.set(s.x, s.y + W.drop, W.z + 0.2); });
    swing.rotation.z = V.max * Math.sin(time * 1.25);
    dropRing.position.y = dropY(time);
  };
  tick(0);

  return {
    scene, products: [], colliders, seats, clerk: { x: -6, z: d / 2 - 3.6, ry: 0 }, turntable: null, room: ROOM, exit: EXIT,
    rides, stations, tick, time: () => time, park: true,
  };
}
