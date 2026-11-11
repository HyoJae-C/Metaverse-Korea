// Jongmyo's people (data/jongmyo.js): the ritual dance (일무) on Jeongjeon's
// terrace with the orchestra seated behind it, the guide inside Oedaemun,
// and the grandpas playing janggi on Jongmyo Square. All in world metres:
// pass the district's offset.
//
//   const show = new JongmyoShow(scene, offset, layer);
//   show.update(dt, me, camera, w, h, placeLabels);  // each frame on the street
//   show.nearGuide(x, z) / show.nearElder(x, z)       // who you can talk to
//   show.watching(x, z)                               // close enough to watch the rite
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';
import { makeNpc, say } from './npcs.js';
import { JONGMYO, inBox } from '../data/jongmyo.js';

const NEAR = 90; // metres: closer than this, the rite is on
const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

// The dancers' and musicians' red robes (홍주의) and black hats.
function redRobe() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.5, 14), mat('#b8322c'));
  robe.position.y = 0.36;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.25, 0.05, 14), mat('#2b2f5a'));
  belt.position.y = 0.48;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.2, 14), mat('#b8322c'));
  top.position.y = 0.6;
  g.add(robe, belt, top);
  return g;
}
function blackHat() {
  const g = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.24, 14), mat('#1d1b22'));
  crown.position.y = 0.4;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.2), mat('#1d1b22'));
  top.position.y = 0.55;
  g.add(crown, top);
  return g;
}
function gatHat() {
  const g = new THREE.Group();
  const black = mat('#1d1b22');
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.025, 20), black);
  brim.position.y = 0.3;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.3, 14), black);
  crown.position.y = 0.46;
  g.add(brim, crown);
  return g;
}
const ROBED = { model: 'basic', tee: null, hair: 'black', dye: 'black', pants: 'navy' };

// What the guide and the grandpas say: [Korean, romanization, English].
const GUIDE_LINES = [
  ['종묘에 오신 걸 환영합니다. 가운데 높은 길은 혼령의 길이에요.', 'jongmyoe osin geol hwanyeonghamnida.', 'Welcome to Jongmyo. The raised middle path is for the spirits.'],
  ['정전 앞 월대에서 일무를 추고 있어요. 조용히 구경하세요.', 'jeongjeon ap woldaeeseo ilmureul chugo isseoyo.', 'The ilmu is being danced on Jeongjeon\'s terrace. Watch quietly.'],
  ['정전은 우리나라에서 가장 긴 목조 건물 가운데 하나예요.', 'jeongjeoneun urinaraeseo gajang gin mokjo geonmul gaunde hanaeyo.', 'Jeongjeon is one of the longest wooden buildings in Korea.'],
];
const ELDER_LINES = [
  ['장군!', 'janggun!', 'Check! (janggun)'],
  ['멍군! 아직 안 끝났어.', 'meonggun! ajik an kkeunnasseo.', 'Blocked! It\'s not over yet.'],
  ['훈수 두지 마시오, 허허.', 'hunsu duji masio, heoheo.', 'No back-seat advice, ha ha.'],
  ['장기 한 판 둘 줄 아시오?', 'janggi han pan dul jul asio?', 'Do you know how to play janggi?'],
  ['마(馬)는 날 일(日) 자로 가는 거요.', 'maneun nal il jaro ganeun geoyo.', 'The horse moves in the shape of the character 日.'],
];

export class JongmyoShow {
  constructor(scene, [ox, oz], layer) {
    Object.assign(this, { scene, ox, oz, layer });
    const [rx, rz] = JONGMYO.rite.at;
    this.rite = { x: rx + ox, z: rz + oz, dancers: null, band: null };
    const g = JONGMYO.guide;
    this.guide = makeNpc(layer, 'ℹ️ 해설사', { ...randomLook(), model: 'basic', hair: 'black', dye: 'black', pants: 'navy', tee: null, shirt: 'sky' });
    this.guide.ch.root.position.set(g.at[0] + ox, 0, g.at[1] + oz);
    this.guide.ch.root.rotation.y = g.ry;
    this.guide.home = { x: g.at[0] + ox, z: g.at[1] + oz, ry: g.ry };
    scene.add(this.guide.ch.root);
    // Two grandpas at each janggi table, one in a gat.
    this.elders = [];
    JONGMYO.janggi.forEach(({ at: [x, z] }, k) => {
      for (const s of [-1, 1]) {
        const o = makeNpc(layer, s < 0 ? '👴 할아버지' : '👴 어르신', { ...randomLook(), hair: 'ash', dye: 'silver', model: 'basic', tee: null, pants: 'charcoal', shirt: 'cream' });
        if (s > 0 && k === 0) o.ch.addProp('head', gatHat());
        o.ch.root.position.set(x + ox + s * 0.95, 0.04, z + oz); // (the stools are 0.42 m, chairs 0.38)
        o.ch.root.rotation.y = -s * Math.PI / 2; // facing the board
        o.home = { x: x + ox + s * 0.95, z: z + oz, ry: -s * Math.PI / 2 };
        scene.add(o.ch.root);
        this.elders.push(o);
      }
    });
    this.t = 0;
  }
  // The troupe and the orchestra are only made the first time you come
  // near (the dancers and musicians cost a lot to build at start).
  _build() {
    const { rows, cols, gap, groups, band } = JONGMYO.rite;
    this.rite.dancers = [];
    for (const { dance, dx } of groups) for (let i = 0; i < rows; i++) for (let k = 0; k < cols; k++) {
      const ch = createCharacter({ ...randomLook(), ...ROBED });
      ch.addProp('body', redRobe());
      ch.addProp('head', blackHat());
      // The military dancers: wooden swords in the front row (south), spears behind.
      ch.activity(dance === 'mumu' ? (i === rows - 1 ? 'mumu' : 'mumuspear') : dance);
      ch.root.position.set(this.rite.x + dx + (k - (cols - 1) / 2) * gap, 0.12, this.rite.z + (i - (rows - 1) / 2) * gap);
      ch.root.rotation.y = Math.PI; // facing the hall (north)
      this.scene.add(ch.root);
      this.rite.dancers.push(ch);
    }
    this.rite.band = [];
    const n = band.n;
    for (let i = 0; i < n; i++) {
      const x = band.x0 + 4 + (i * (band.x1 - band.x0 - 8)) / (n - 1);
      const ch = createCharacter({ ...randomLook(), ...ROBED });
      ch.addProp('body', redRobe());
      ch.addProp('head', blackHat());
      ch.activity('matsit');
      ch.root.position.set(x + this.ox, 0.14, band.z + 1.6 + this.oz);
      ch.root.rotation.y = 0; // facing the yard (south)
      this.scene.add(ch.root);
      this.rite.band.push(ch);
    }
  }
  nearGuide(x, z) { return Math.hypot(x - this.guide.home.x, z - this.guide.home.z) < 2.8 ? this.guide : null; }
  nearElder(x, z) { return this.elders.find((o) => Math.hypot(x - o.home.x, z - o.home.z) < 2.2) || null; }
  // Close enough to watch the dance (on the terrace or just below it).
  watching(x, z) { return Math.hypot(x - this.rite.x, z - this.rite.z) < 16; }
  greet(o, x, z, lines) {
    o.ch.root.rotation.y = Math.atan2(x - o.home.x, z - o.home.z);
    o.talkT = 5;
    o.ch.play('bow');
    say(o, this.layer, lines[Math.floor(Math.random() * lines.length)]);
  }
  greetGuide(x, z) { this.greet(this.guide, x, z, GUIDE_LINES); }
  greetElder(o, x, z) { this.greet(o, x, z, ELDER_LINES); }
  spots() { return { rite: [this.rite.x, this.rite.z], guide: [this.guide.home.x, this.guide.home.z] }; }
  update(dt, me, camera, w, h, placeLabels) {
    this.t += dt;
    // The halls are drawn only inside the wall (core/enclosure.js), so the
    // people in there are too.
    const inside = inBox(me.x - this.ox, me.z - this.oz, JONGMYO.wall);
    for (const o of [this.guide, ...this.elders]) {
      const on = Math.hypot(me.x - o.home.x, me.z - o.home.z) < 60 && (o !== this.guide || inside);
      o.ch.root.visible = on;
      if (!on) { o.tag.style.display = 'none'; if (o.bubble) o.bubble.style.display = 'none'; continue; }
      if (o.talkT > 0 && (o.talkT -= dt) <= 0) o.ch.root.rotation.y = o.home.ry;
      o.ch.animate(dt, 0, o !== this.guide);
      placeLabels?.(o, camera, w, h);
    }
    const on = inside && Math.hypot(me.x - this.rite.x, me.z - this.rite.z) < NEAR;
    if (on && !this.rite.dancers) this._build();
    if (!this.rite.dancers) return;
    for (const ch of this.rite.dancers) { ch.root.visible = on; if (on) ch.animate(dt, 0); }
    for (const ch of this.rite.band) { ch.root.visible = on; if (on) ch.animate(dt, 0, true); }
  }
  hideLabels() {
    for (const o of [this.guide, ...this.elders]) for (const el of [o.tag, o.bubble]) if (el) el.style.display = 'none';
  }
}
