// Landmark models placed on hand-made districts (map "landmarks"): palace
// gates and halls with tiled roofs, a pavilion on a pond, statues, walls,
// street arches and Namsan with its tower.
// Low-poly and stylised, not to scale. Collision comes from the map's
// "blockers", so these are only visual.
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { haneulStore, haneulTower } from './haneul.js';
import { buildLakeshore } from './lakeshore.js';
import { cableCarLandmark } from './cablecar.js';
import { banpoBridge } from './banpo-bridge.js';
import { namsanPoint, namsanGround } from './namsan-shape.js';
import { PARK_BUILD, avenue } from './park-art.js';
import { sign } from './park-signs.js';
import { farFree } from './far-textures.js';
import { BANK, GROUND_TEXT, MIC, CASE } from './busking-layout.js';
import { buildSkatepark } from './skatepark-model.js';
import { peaceGate, loneTree, poolHall } from './olympic-park.js';
import { domeOutside } from './dome-outside.js';
import { cgpGate, zooEntrance, zooFence } from './grand-park.js';
import { konext, aquariumPavilion, samseongBridge } from './konext.js';
import { warMemorial, outdoorExhibits } from './war-memorial-site.js';
import { BUKCHON_BUILD } from './bukchon-models.js';
import { EULJIRO_BUILD } from './euljiro-models.js';
import { JONGMYO_BUILD } from './jongmyo-models.js';
import { DONGMYO_MODELS } from './dongmyo-models.js';
import { BOSINGAK_BUILD } from './bosingak-model.js';
import { YEOUIDO_BUILD } from './yeouido-models.js';
import { PALACE_BUILD } from './palace-model.js';
import { seasonAt } from './weather-roll.js';

const mat = matCache({ flatShading: true });
const C = {
  stone: '#cfc4ae', stoneDark: '#b3a78f', wood: '#a23a2c', green: '#2f8f6b', roof: '#3d4450',
  roofEdge: '#2b3038', white: '#f3eee4', gold: '#d4a73a', bronze: '#55574f', door: '#3a2a22', plinth: '#8f8a80',
};

const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);

// A hipped tile roof (팔작지붕 feel): long slopes front and back up to a
// ridge along x, short triangles at the ends, eaves that lift a little at
// the four corners, and a ridge beam on top.
const roofGeo = new Map();
export function hipRoofGeometry(w, d, h) {
  const key = [w, d, h].join();
  if (roofGeo.has(key)) return roofGeo.get(key);
  const hw = w / 2, hd = d / 2, r = Math.max(0, hw - hd * 0.9), lift = h * 0.18;
  // eave corners (lifted), eave mid points, ridge ends
  const P = {
    a: [-hw, lift, hd], b: [hw, lift, hd], c: [hw, lift, -hd], dd: [-hw, lift, -hd],
    m1: [0, 0, hd], m2: [0, 0, -hd], m3: [hw * 0.98, 0, 0], m4: [-hw * 0.98, 0, 0],
    r1: [-r, h, 0], r2: [r, h, 0],
  };
  const tris = [
    // front slope: a - m1 - b up to the ridge (a little sag in the middle of the eave)
    ['a', 'm1', 'r1'], ['m1', 'r2', 'r1'], ['m1', 'b', 'r2'],
    // back slope
    ['c', 'm2', 'r2'], ['m2', 'r1', 'r2'], ['m2', 'dd', 'r1'],
    // ends
    ['b', 'm3', 'r2'], ['m3', 'c', 'r2'], ['dd', 'm4', 'r1'], ['m4', 'a', 'r1'],
    // underside
    ['a', 'b', 'm1'], ['b', 'c', 'm3'], ['c', 'dd', 'm2'], ['dd', 'a', 'm4'], ['a', 'c', 'b'], ['a', 'dd', 'c'],
  ];
  const pos = [];
  for (const t of tris) for (const k of t) pos.push(...P[k]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  roofGeo.set(key, geo);
  return geo;
}
function roof(g, w, d, h, y, z = 0) {
  const r = new THREE.Mesh(hipRoofGeometry(w, d, h), new THREE.MeshLambertMaterial({ color: C.roof, flatShading: true, side: THREE.DoubleSide }));
  r.position.set(0, y, z);
  g.add(r);
  const ridgeLen = Math.max(1, w - d * 0.9);
  box(g, ridgeLen + 0.6, h * 0.14, h * 0.14, 0, y + h + h * 0.03, z, C.roofEdge); // ridge beam
  for (const sx of [-1, 1]) box(g, h * 0.18, h * 0.3, h * 0.14, sx * (ridgeLen / 2 + 0.2), y + h + h * 0.1, z, C.roofEdge); // ridge ends
  box(g, w * 0.92, h * 0.06, d * 0.04, 0, y + h * 0.02, z + d / 2 - d * 0.02, C.roofEdge); // eave edge, front
  box(g, w * 0.92, h * 0.06, d * 0.04, 0, y + h * 0.02, z - d / 2 + d * 0.02, C.roofEdge); // and back
}

// A wooden hall: red columns, a green painted band (단청), a roof.
function hall(g, w, d, h, y, z = 0, cols = 7) {
  box(g, w, h, d, 0, y + h / 2, z, C.white); // walls (paper doors)
  for (let i = 0; i < cols; i++) {
    const x = -w / 2 + (i * w) / (cols - 1);
    for (const sz of [-1, 1]) box(g, 0.6, h, 0.6, x, y + h / 2, z + sz * (d / 2 + 0.2), C.wood);
  }
  box(g, w + 1, h * 0.18, d + 1, 0, y + h * 0.95, z, C.green);
  roof(g, w * 1.35, d * 1.6, h * 0.9, y + h);
}

const OWN_BUILD = {
  haneulstore: (g, l) => haneulStore(g, l), // HANEUL department store and mall on Seokchon Lake's north shore
  haneultower: (g) => haneulTower(g),
  lakeshore: (g, l) => buildLakeshore(g, l), // Seokchon Lake's sunken water, banks and lakeside walk
  skatepark: (g) => buildSkatepark(g), // the skate park on Olympic Park's Peace Plaza (layout: skatepark.js)
  peacegate: (g) => peaceGate(g), // Olympic Park (core/olympic-park.js)
  cgpgate: (g) => cgpGate(g), // Children's Grand Park's main gate (core/grand-park.js)
  zooentrance: (g, l) => zooEntrance(g, l), // the zoo's entrance building: its door leads into the zoo (core/zoo-park.js)
  konext: (g, l) => konext(g, l), // KONEXT, the mall by Samseong Station (core/konext.js)
  aquarium: (g, l) => aquariumPavilion(g, l), // KONEXT Aquarium's pavilion on the plaza (animated fish)
  samseongbridge: (g, l) => samseongBridge(g, l), // Teheran-ro over Tancheon
  lonetree: (g) => loneTree(g),
  poolhall: (g, l) => poolHall(g, l), // Olympic Park Pool's outside (the hall inside: core/pool-hall.js)
  dome: (g, l) => domeOutside(g, l), // Modu Ballpark's outside (the stadium inside: core/dome.js)
  pavilion(g, l) {
    // Stone pillars standing in the pond, a raised floor, a big roof (Gyeonghoeru). l.s: scale.
    if (l.s) { const h = new THREE.Group(); h.scale.setScalar(l.s); g.add(h); g = h; }
    box(g, 34, 1.2, 26, 0, 0.3, 0, C.stone); // island
    for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) box(g, 0.9, 5, 0.9, -13 + i * 5.2, 3.5, -9 + k * 6, C.stoneDark);
    box(g, 30, 0.8, 22, 0, 6.4, 0, C.wood);
    hall(g, 26, 18, 5, 6.8, 0, 6);
    for (const sx of [-1, 1]) box(g, 2, 0.6, 16, sx * 5, 0.3, 20, C.stone); // little bridges to the shore
  },
  statue(g, l) {
    // Gwanghwamun Square's King Sejong and Admiral Yi Sun-sin, in their own
    // file loaded when the city is built (core/gwanghwamun-statues.js). The
    // bottom step goes in now, so the far culling knows where they stand.
    const king = l.kind === 'king';
    box(g, king ? 9.2 : 7.4, king ? 0.35 : 0.4, king ? 11.2 : 7.4, 0, king ? 0.175 : 0.2, 0, C.plinth);
    import('./gwanghwamun-statues.js').then(({ buildStatue }) => buildStatue(g, l));
  },
  cathedral(g) {
    // Myeongdong Cathedral, in its own file loaded when the city is built
    // (core/cathedral-model.js). Its stone base goes in now, so the far
    // culling knows where it stands.
    box(g, 15.5, 0.5, 33, 0, 0.25, -0.5, C.plinth);
    import('./cathedral-model.js').then(({ buildCathedral }) => buildCathedral(g));
  },
  bongeunsa(g, l) {
    // Bongeunsa's halls, Beopwangru, its lanterns, pagoda, Haesu Gwaneum,
    // bell pavilion and Iljumun (core/bongeunsa-model.js, loaded when the
    // city is built). The pagoda's step goes in now, so the far culling
    // knows where it stands.
    if (l.pagoda) box(g, 1.0, 0.22, 1.0, l.pagoda[0], 0.11, l.pagoda[1], C.stone);
    import('./bongeunsa-model.js').then(({ buildTemple }) => buildTemple(g, l));
  },
  maitreya(g, l) {
    // Bongeunsa's Maitreya Buddha on its plaza (core/bongeunsa-model.js).
    box(g, 4.2, 0.15, 4.2, 0, 0.075, 0, C.stone);
    import('./bongeunsa-model.js').then(({ buildMaitreya }) => buildMaitreya(g, l));
  },
  // Seoul Station (core/seoul-station-models.js, loaded when the city is
  // built): the old station at 37.5%, the glass hall, the fence round the
  // tracks. A low base goes in now, so the far culling knows where they stand.
  oldstation(g, l) {
    const fp = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]; };
    const [x0, x1, z0, z1] = fp(l.outline);
    box(g, x1 - x0, 0.05, z1 - z0, (x0 + x1) / 2, 0.025, (z0 + z1) / 2, C.plinth);
    import('./seoul-station-models.js').then(({ buildOldStation }) => buildOldStation(g, l));
  },
  stationhall(g, l) {
    const xs = l.outline.map((q) => q[0]), zs = l.outline.map((q) => q[1]);
    box(g, Math.max(...xs) - Math.min(...xs), 0.05, Math.max(...zs) - Math.min(...zs), (Math.max(...xs) + Math.min(...xs)) / 2, 0.025, (Math.max(...zs) + Math.min(...zs)) / 2, C.plinth);
    import('./seoul-station-models.js').then(({ buildStationHall }) => buildStationHall(g, l));
  },
  yardfence(g, l) {
    import('./seoul-station-models.js').then(({ buildYardFence }) => buildYardFence(g, l));
  },
  jogyesa(g) {
    // Jogyesa's halls, gate, trees and lantern canopy (core/jogyesa-model.js,
    // loaded when the city is built). A slab under Daeungjeon goes in now, so the
    // far culling knows where it stands.
    box(g, 18, 0.04, 11.6, 0, 0.02, 0, C.stoneDark);
    import('./jogyesa-model.js').then(({ buildJogyesa }) => buildJogyesa(g));
  },
  cathedralyard(g, l) {
    // Myeongdong Cathedral's hill: the yard's terrace, its walls and the
    // stairs up from Myeongdong-gil (core/cathedral-yard.js, loaded when the
    // city is built; the heights you walk on: core/cathedral-yard-ground.js).
    import('./cathedral-yard.js').then(({ buildYard }) => buildYard(g, l));
  },
  guard(g) {
    // A gate guard (수문장) in a red robe with a black hat and a flag.
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 1.4, 10), mat('#c8463c'));
    robe.position.y = 0.7;
    g.add(robe);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat('#f2c9a5'));
    head.position.y = 1.65;
    g.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 14), mat('#1d1b22'));
    hat.position.y = 1.85;
    g.add(hat);
    box(g, 0.06, 2.6, 0.06, 0.55, 1.3, 0, C.door);
    box(g, 0.6, 0.5, 0.04, 0.85, 2.3, 0, '#ffd166');
  },
  arch(g, l) {
    // A street gate: two pillars and a lit sign across the street
    // (e.g. Itaewon's world food street). l.w: width, l.title / l.sub.
    const w = l.w || 12, H = 6.5, c = l.color || '#c0392b';
    for (const sx of [-1, 1]) {
      box(g, 0.7, H, 0.7, sx * w / 2, H / 2, 0, c);
      box(g, 1.1, 0.4, 1.1, sx * w / 2, 0.2, 0, C.plinth);
    }
    box(g, w + 1.4, 1.9, 0.5, 0, H + 0.6, 0, '#1d1b22');
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 192;
    const x = cv.getContext('2d');
    x.fillStyle = '#1d1b22'; x.fillRect(0, 0, 1024, 192);
    x.fillStyle = '#ffd36e'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '900 78px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    x.fillText(l.title || '', 512, 70);
    x.fillStyle = '#ffffff';
    x.font = '700 46px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
    x.fillText(l.sub || '', 512, 146);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    farFree(tex);
    for (const side of [1, -1]) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.2, (w + 1.2) * 0.1875), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(0, H + 0.6, side * 0.26);
      if (side < 0) sign.rotation.y = Math.PI;
      g.add(sign);
    }
    // Strings of little lights from the beam down to the pillars.
    for (let i = 0; i <= 10; i++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: ['#ffd36e', '#ff6b6b', '#6bd3ff'][i % 3] }));
      bulb.position.set(-w / 2 + (w * i) / 10, H - 0.45 - Math.sin((Math.PI * i) / 10) * 0.6, 0.3);
      g.add(bulb);
    }
  },
  arcade(g, l) {
    // A traditional market's roof (아케이드): a see-through barrel roof
    // along z over the alley, on thin posts in the gaps between the stalls,
    // with strings of round lamps under it. l.len: length, l.w: width,
    // l.h: height of the eaves, l.gap: post spacing.
    const len = l.len || 60, w = l.w || 12, h = l.h || 6, gap = l.gap || 12;
    for (let z = -len / 2; z <= len / 2 + 0.01; z += gap) {
      for (const sx of [-1, 1]) box(g, 0.18, h, 0.18, sx * (w / 2 - 0.9), h / 2, z, '#4a5560');
      box(g, w - 1.4, 0.16, 0.18, 0, h, z, '#4a5560'); // cross beam
    }
    for (const sx of [-1, 1]) box(g, 0.16, 0.16, len, sx * (w / 2 - 0.9), h, 0, '#4a5560'); // side rails
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(w / 2, w / 2, len, 20, 1, true, -Math.PI / 2, Math.PI),
      new THREE.MeshLambertMaterial({ color: '#cfe6dc', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
    );
    roof.rotation.x = Math.PI / 2;
    roof.scale.set(1, 1, 0.35); // a low curve
    roof.position.y = h;
    roof.userData.noShadow = true;
    g.add(roof);
    box(g, 0.2, 0.2, len, 0, h + w / 2 * 0.35, 0, '#4a5560'); // ridge
    const lamp = new THREE.SphereGeometry(0.22, 8, 6);
    const lampMat = new THREE.MeshBasicMaterial({ color: '#ffe3a3' });
    for (let z = -len / 2 + gap / 2; z < len / 2; z += gap / 2) {
      const b = new THREE.Mesh(lamp, lampMat);
      b.position.set(0, h - 0.5, z);
      g.add(b);
    }
  },
  tracks(g, l) {
    // A stretch of old railway left in a park's grass (Gyeongui Line Forest
    // Park): two rails on wooden sleepers along z, flush with the ground so
    // you can walk over them. l.len: length. Sleepers are one InstancedMesh.
    const len = l.len || 100, gap = 0.9, n = Math.floor(len / gap);
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.08, 0.24), mat('#7a5a3a'), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) sleepers.setMatrixAt(i, m4.makeTranslation(0, 0.04, -len / 2 + gap / 2 + i * gap));
    g.add(sleepers);
    for (const sx of [-0.72, 0.72]) box(g, 0.08, 0.1, len, sx, 0.11, 0, '#8a8f99');
  },
  jamsu(g, l) {
    // Jamsu Bridge under Banpo Bridge (Banpo-Jamwon): the low deck you walk
    // across at water level, with kerbs, railings and lamps along both sides.
    // Along z;
    // l.len: length, l.w: width of the walking deck (the road under it).
    const len = l.len || 120, w = l.w || 14, half = w / 2;
    for (const sx of [-1, 1]) {
      box(g, 0.6, 0.35, len, sx * (half + 0.3), 0.175, 0, '#c9cdd2'); // kerb
      box(g, 0.08, 0.08, len, sx * (half + 0.3), 1.2, 0, '#5a6470'); // hand rail
      const posts = Math.floor(len / 3);
      for (let i = 0; i <= posts; i++) box(g, 0.08, 0.85, 0.08, sx * (half + 0.3), 0.77, -len / 2 + (i * len) / posts, '#5a6470');
      for (let z = -len / 2 + 10; z < len / 2; z += 24) { // lamps
        box(g, 0.14, 4.2, 0.14, sx * (half + 0.3), 2.45, z, '#5a6470');
        box(g, 0.9, 0.18, 0.36, sx * (half - 0.1), 4.5, z, '#f4f1e6');
      }
    }
    // Banpo Bridge high overhead is its own landmark (core/banpo-bridge.js).
  },
  banpobridge: (g, l) => banpoBridge(g, l),
  busking: (g) => buskingStage(g),
  cablecar: (g, l) => cableCarLandmark(g, l), // Namsan Sky Cable, seen from Itaewon
  warmemorial: (g) => warMemorial(g), // the War History Museum (modelled on the War Memorial of Korea), west along Itaewon-ro (core/war-memorial-site.js)
  outdoorexhibits: (g) => outdoorExhibits(g), // its outdoor exhibition
  sign, // wooden information boards (core/park-signs.js)
  mountain(g, l) {
    // Bugaksan behind the palace (or Namsan behind Itaewon, l.scale).
    const m = new THREE.Mesh(new THREE.ConeGeometry(230, 110, 9, 2), mat('#7fae6b'));
    m.scale.set(1.4, 1, 0.7);
    if (l?.scale) m.scale.multiplyScalar(l.scale);
    m.position.y = 50 * (l?.scale || 1);
    g.add(m);
  },
  namsan(g, l) {
    // Namsan: a wooded hill on an ellipse (l.rx, l.rz, l.h), or on its real
    // outline round the top (l.rad), that leans so its
    // top, with the look-out tower, is at (l.px, l.pz) from the foot's centre
    // (core/namsan-shape.js). Scenery: the map's blockers keep you off it,
    // except on its trail (l.trail, game/namsan-walk.js), drawn on the slope.
    const sh = { rx: l.rx || 170, rz: l.rz || 110, h: l.h || 70, px: l.px || 0, pz: l.pz || 0, e: l.e, rad: l.rad, flat: l.flat, spur: l.spur };
    const trail = l.trail || [];
    // (finer where there is a trail, so the slope under it is close to the
    // true height it is walked at)
    const geo = trail.length ? new THREE.SphereGeometry(1, l.spur ? 128 : 48, l.spur ? 40 : 24, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const [hx, hy, hz] = namsanPoint(sh, x, z);
      // A little unevenness, not a smooth bowl; only ever lower than the
      // true slope where there is a trail, so the path is never buried.
      const n = Math.sin(i * 12.9898) * Math.sin(i * 4.1414);
      const bump = hy > 0.5 && hy < sh.h - 1 ? (trail.length ? -Math.abs(n) * 0.04 - 0.01 : n * 0.08) * hy : 0;
      pos.setXYZ(i, hx, hy + bump, hz);
    }
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mat('#86b56f')));
    // (the trails, and the city wall's stretches: scripts/build-namsan-wall.mjs, game/namsan-wall.js)
    const lines = [trail, ...(l.wtrail || []), ...(l.wall?.runs || [])];
    const near = (x, z, m) => {
      for (const p of lines) for (let i = 1; i < p.length; i++) {
        const [ax, az] = p[i - 1], [bx, bz] = p[i], dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        if (Math.hypot(x - ax - dx * t, z - az - dz * t) < m) return true;
      }
      return false;
    };
    if (trail.length > 1) g.add(namsanTrailMesh(sh, trail, l.trailW || 3));
    for (const run of l.wtrail || []) g.add(namsanTrailMesh(sh, run, l.wtrailW || 3));
    // Trees on the slopes (one instanced mesh), none on the summit or the trail.
    const tree = new THREE.ConeGeometry(4, 11, 6);
    tree.translate(0, 5, 0);
    const N = l.trees || 160;
    const trees = new THREE.InstancedMesh(tree, mat('#4f8a4a'), N);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    let n = 0, seed = 7, tries = 0;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    while (n < N && tries++ < N * 20) {
      const a = rnd() * Math.PI * 2, r = 0.2 + Math.sqrt(rnd()) * 0.75;
      const [x, y, z] = namsanPoint(sh, Math.cos(a) * r, Math.sin(a) * r);
      const s = 0.7 + rnd() * 0.7;
      if (lines.some((p) => p.length) && near(x, z, 4 * s + (l.trailW || 3) / 2 + 1)) continue;
      if (sh.flat && Math.hypot(x - sh.px, z - sh.pz) < sh.flat + 16) continue; // the summit plaza and the way to the cable car's upper station
      trees.setMatrixAt(n++, m4.compose(new THREE.Vector3(x, y - 1.5, z), q, sc.set(s, s, s)));
    }
    trees.count = n;
    g.add(trees);
    const tower = new THREE.Group();
    namsanTower(tower);
    tower.position.set(sh.px, sh.h - 1, sh.pz);
    tower.scale.setScalar(l.tower || 0.75);
    g.add(tower);
  },
};

// Namsan's trail: a packed-earth ribbon on the slope, a little above it,
// with low wooden edging either side ([x, z] from the hill's foot centre).
function namsanTrailMesh(sh, trail, w) {
  const STEP = 2, pos = [], edge = [];
  for (let i = 1; i < trail.length; i++) {
    const [x1, z1] = trail[i - 1], [x2, z2] = trail[i], len = Math.hypot(x2 - x1, z2 - z1);
    if (len < 0.01) continue;
    const nx = -(z2 - z1) / len, nz = (x2 - x1) / len;
    const n = Math.max(1, Math.ceil(len / STEP));
    const e = Math.min(w / 2, 2) / len; // (a little past each end: no gaps at the bends)
    const at = (t, s, up) => { const x = x1 + (x2 - x1) * t + nx * s, z = z1 + (z2 - z1) * t + nz * s; return [x, namsanGround(sh, x, z) + up, z]; };
    for (let k = 0; k < n; k++) {
      const t0 = k / n - (k === 0 ? e : 0), t1 = (k + 1) / n + (k === n - 1 ? e : 0);
      const a = at(t0, w / 2, 0.12), b = at(t0, -w / 2, 0.12), c = at(t1, -w / 2, 0.12), d = at(t1, w / 2, 0.12);
      pos.push(...a, ...d, ...b, ...b, ...d, ...c);
      for (const s of [w / 2 + 0.1, -w / 2 - 0.1]) { // the edging: a thin low strip on each side
        const p0 = at(k / n, s, 0.1), p1 = at((k + 1) / n, s, 0.1), q0 = at(k / n, s, 0.32), q1 = at((k + 1) / n, s, 0.32);
        edge.push(...p0, ...p1, ...q0, ...q0, ...p1, ...q1);
      }
    }
  }
  const g = new THREE.Group();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const path = new THREE.Mesh(geo, mat('#d8c39a'));
  path.name = 'namsan-trail';
  g.add(path);
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
  eg.computeVertexNormals();
  g.add(new THREE.Mesh(eg, new THREE.MeshLambertMaterial({ color: '#8a5a36', side: THREE.DoubleSide })));
  return g;
}

// The look-out tower on Namsan: a white shaft, a round deck with windows,
// a red and white mast, and a ring of lights.
export function namsanTower(g, y0 = 0) {
  const cyl = (rt, rb, ht, y, c) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, ht, 16), mat(c));
    m.position.y = y + ht / 2;
    g.add(m);
    return m;
  };
  cyl(12, 13, 2, y0, C.stone); // terrace on the summit
  cyl(7, 8, 7, y0 + 2, C.white); // base building
  cyl(2.2, 3.4, 42, y0 + 9, '#e9e6df'); // shaft
  cyl(7.5, 6, 3, y0 + 49, C.white);
  cyl(7.2, 7.2, 5, y0 + 52, '#3f5470'); // windows
  cyl(6, 7.5, 2.5, y0 + 57, C.white);
  for (let i = 0; i < 6; i++) cyl(0.9 - i * 0.08, 1 - i * 0.08, 3.5, y0 + 59.5 + i * 3.5, i % 2 ? '#f3eee4' : '#d0463b'); // mast
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffe08a' }));
    bulb.position.set(Math.cos(a) * 7.6, y0 + 55.5, Math.sin(a) * 7.6);
    g.add(bulb);
  }
}

// The busking zone on Hongdae Walking Street (layout in core/busking-layout.js):
// long low stone steps for the audience on the west side, the words BUSKING
// ZONE painted faintly on the street, and on the east side just a mic stand
// and an open guitar case. No stage or backdrop: the performers are the show.
function buskingStage(g) {
  // The steps: one slab per step, each smaller than the one below, so they
  // match stepAt (what you walk on). Pale stone, every other step a shade
  // darker so the edges read from afar.
  const B = BANK;
  for (let k = 0; k < B.n; k++) {
    const x0 = B.back + k * B.backTread, x1 = B.front - k * B.tread;
    const z0 = B.z0 + k * B.endTread, z1 = B.z1 - k * B.endTread;
    box(g, x1 - x0, B.rise, z1 - z0, (x0 + x1) / 2, (k + 0.5) * B.rise, (z0 + z1) / 2, k % 2 ? '#a9a296' : '#bdb6aa');
  }
  // The words on the ground, faint, reading from the audience's side.
  const T = GROUND_TEXT;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.strokeStyle = '#5b4a6e'; x.lineWidth = 8; x.setLineDash([26, 18]);
  x.strokeRect(8, 8, 1008, 240);
  x.fillStyle = '#5b4a6e'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '900 104px system-ui, sans-serif'; x.fillText('BUSKING ZONE', 512, 104, 960);
  x.font = '800 64px "Noto Sans KR", system-ui, sans-serif'; x.fillText('버스킹존', 512, 196, 960);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const words = new THREE.Mesh(new THREE.PlaneGeometry(T.w, T.d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.3, depthWrite: false }));
  words.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); // flat, the tops of the letters to the east
  words.position.set(T.x, 0.1, T.z); // (above the plaza paving)
  words.userData.noShadow = true;
  g.add(words);
  // The singer's mic stand and open guitar case (tips land in it).
  box(g, 0.05, 1.5, 0.05, MIC[0], 0.75, MIC[1], '#8a8f99');
  box(g, 0.12, 0.2, 0.12, MIC[0], 1.55, MIC[1], '#2b2230');
  const caseG = new THREE.Group();
  box(caseG, 0.42, 0.1, 1.05, 0, 0.05, 0, '#1d1b22');
  box(caseG, 0.34, 0.03, 0.95, 0, 0.1, 0, '#b23a5a'); // the velvet lining
  const lid = box(caseG, 0.42, 0.06, 1.05, -0.24, 0.3, 0, '#1d1b22');
  lid.rotation.z = 1.25;
  caseG.position.set(CASE[0], 0, CASE[1]);
  g.add(caseG);
}

// A wall along a polyline: stone with a dark tiled cap.
function wall(g, l) {
  const h = l.h || 4;
  for (let i = 1; i < l.p.length; i++) {
    const [x0, z0] = l.p[i - 1], [x1, z1] = l.p[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const seg = new THREE.Group();
    box(seg, len, h, 1.4, 0, h / 2, 0, '#d9c9b0');
    box(seg, len + 0.6, 0.5, 2.2, 0, h + 0.2, 0, C.roof);
    seg.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    seg.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    g.add(seg);
  }
}

// Cherry trees in blossom along a polyline (l.p, e.g. round Seokchon Lake):
// one instanced mesh for the trunks and one for the pink crowns. With
// l.seasonal (Yeouido's Yunjung-ro) they are only pink in spring (March to
// May, Seoul time): green in summer, red and orange in autumn, and thin bare
// crowns in winter.
export const BLOSSOM_COLORS = {
  spring: ['#ffc4dc', '#ffd6e6', '#ffb3d1', '#fff0f5'],
  summer: ['#7cc46e', '#8fcf7a', '#6fb85f', '#95c97d'],
  autumn: ['#e8892b', '#d9531f', '#f0a23a', '#c9401a'],
  winter: ['#9a8478', '#8a7468', '#a8968a', '#7f6c62'],
};
export const blossomSeason = (l, ms = Date.now()) => (l.seasonal ? seasonAt(ms) : 'spring');
function blossoms(g, l) {
  const season = blossomSeason(l);
  const spots = [];
  for (let i = 1; i < l.p.length; i++) {
    const [x0, z0] = l.p[i - 1], [x1, z1] = l.p[i];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / (l.gap || 9)));
    for (let k = 0; k < n; k++) spots.push([x0 + ((x1 - x0) * k) / n, z0 + ((z1 - z0) * k) / n]);
  }
  const trunk = new THREE.CylinderGeometry(0.25, 0.35, 2.6, 6).translate(0, 1.3, 0);
  const crown = new THREE.IcosahedronGeometry(2.3, 0).translate(0, 3.8, 0);
  const trunks = new THREE.InstancedMesh(trunk, mat('#7a5240'), spots.length);
  const crowns = new THREE.InstancedMesh(crown, mat('#ffc4dc'), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const pinks = BLOSSOM_COLORS[season].map((c) => new THREE.Color(c));
  const thin = season === 'winter' ? 0.55 : 1; // (bare branches: a small crown)
  spots.forEach(([x, z], i) => {
    const s = 0.85 + ((i * 37) % 10) / 30;
    m4.compose(v.set(x, 0, z), q.setFromAxisAngle(v.clone().set(0, 1, 0), i * 1.3), sc.set(s, s, s));
    trunks.setMatrixAt(i, m4);
    if (thin < 1) m4.compose(v.set(x, 1.8 * s, z), q, sc.set(s * thin, s * thin, s * thin));
    crowns.setMatrixAt(i, m4);
    crowns.setColorAt(i, pinks[i % pinks.length]);
  });
  crowns.material = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true });
  g.add(trunks, crowns);
}

// Every builder by landmark type. Put together on first use, not when this
// file loads: bukchon-models.js and palace-model.js import this file back,
// so when the bundle runs one of them first, their *_BUILD tables are not
// filled in yet at load time. Spread then, they added nothing and every
// palace and Bukchon landmark (Gwanghwamun, the gates, Geunjeongjeon, the
// Open House...) silently went missing (2026-11-12, after Jogyesa and
// Bongeunsa started importing palace-model.js).
let BUILD = null;
export function landmarkBuilders() {
  return (BUILD ||= {
    ...OWN_BUILD,
    ...EULJIRO_BUILD, // Euljiro & Dongdaemun: DDP, the city wall, Namsangol's gate (core/euljiro-models.js)
    ...DONGMYO_MODELS, // Dongmyo flea market's stalls (core/dongmyo-models.js)
    ...JONGMYO_BUILD, // Jongmyo & Seosunra-gil: shrine gates and halls, the stone path, the woods (core/jongmyo-models.js)
    ...PALACE_BUILD, // Gyeongbokgung: Gwanghwamun, the gates, Yeongjegyo, the corridors, Geunjeongjeon, the rank stones (core/palace-model.js)
    ...BOSINGAK_BUILD, // Bosingak, the bell pavilion on Jongno (core/bosingak-model.js)
    ...YEOUIDO_BUILD, // Yeouido: Seogang Bridge, the 63 tower, Mul-bit Square's fountain (core/yeouido-models.js)
    ...BUKCHON_BUILD, // Bukchon: the Open House, rooftop terrace (core/bukchon-models.js)
    ...PARK_BUILD, // Seoul Forest: rose garden, benches, plaza, ice cream sculptures (core/park-art.js)
  });
}
export function buildLandmarks(list = [], scene) {
  const BUILD = landmarkBuilders();
  const root = new THREE.Group();
  root.name = 'landmarks';
  const ticks = [];
  for (const l of list) {
    const g = new THREE.Group();
    if (l.type === 'wall') wall(g, l);
    else if (l.type === 'blossoms') blossoms(g, l);
    else if (l.type === 'avenue') avenue(g, l);
    else if (l.type === 'zoofence') zooFence(g, l); // (the zoo's railing round its wood: core/grand-park.js)
    else if (BUILD[l.type]) {
      const tick = BUILD[l.type](g, l);
      if (typeof tick === 'function') ticks.push(tick);
      g.position.set(l.x, l.y || 0, l.z); // (l.y: standing up on something, e.g. a hill's deck)
      g.rotation.y = l.ry || 0;
      if (l.sc) g.scale.set(l.sc[0], l.sc[1] ?? l.sc[0], l.sc[0]); // (sc: [across, up], e.g. the palace's footprints at 30% and heights at 50%)
    } else continue;
    root.add(g);
  }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = !o.userData.noShadow; o.receiveShadow = true; } });
  scene.add(root);
  // Moving parts (Ferris wheel, coaster…): call with the time in seconds.
  root.userData.tick = (t) => { for (const f of ticks) f(t); };
  return root;
}
