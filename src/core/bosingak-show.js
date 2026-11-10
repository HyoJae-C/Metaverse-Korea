// Bosingak's people (data/bosingak.js): a few visitors already on the square
// (a friend taking a photo of another, someone with a coffee, someone looking
// up at the pavilion), and the bell keeper who comes out on the upper floor
// for the New Year's ringings and pulls the striker on every stroke.
// All in world metres: pass the district's offset.
//
//   const show = new BosingakShow(scene, offset, layer);
//   show.update(dt, me, camera, w, h, placeLabels, ringing);  // each frame on the street
//   show.pull();                                              // the keeper's move on a stroke
import * as THREE from 'three';
import { matCache } from './three-kit.js';
import { randomLook } from '../data/appearance.js';
import { makeNpc } from './npcs.js';
import { BOSINGAK, BOSINGAK_TEXT, BELL_HOUSE } from '../data/bosingak.js';
import { L } from '../ui/pocha-ui.js';

const NEAR = 70; // metres: the visitors are drawn closer than this
const KEEPER_NEAR = 500; // the keeper is seen from along Jongno
const mat = matCache();

// A long robe over the body, a belt and a top: the keeper's official robe
// (red-brown, black hat) or a monk's grey robe with a brown sash (가사).
function robe(color, belt) {
  const g = new THREE.Group();
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.33, 0.52, 14), mat(color));
  skirt.position.y = 0.35;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.25, 0.05, 14), mat(belt));
  band.position.y = 0.48;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.2, 14), mat(color));
  top.position.y = 0.6;
  g.add(skirt, band, top);
  return g;
}
function sash() {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.47), mat('#8a5a3a'));
  s.position.set(0, 0.52, 0);
  s.rotation.x = 0.6;
  return s;
}
function officialHat() {
  const g = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.24, 14), mat('#1d1b22'));
  crown.position.y = 0.4;
  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.08), mat('#1d1b22'));
  wings.position.set(0, 0.46, -0.12);
  g.add(crown, wings);
  return g;
}
const KEEPER = {
  official: { look: { model: 'basic', tee: null, hair: 'black', dye: 'black', pants: 'charcoal' }, body: () => robe('#9a3a2c', '#2b2f5a'), head: officialHat },
  monk: { look: { model: 'basic', tee: null, hairStyle: 'buzz', dye: 'ash', pants: 'charcoal' }, body: () => { const g = robe('#8d8f8a', '#6b6d68'); g.add(sash()); return g; }, head: null },
};

export class BosingakShow {
  constructor(scene, [ox, oz], layer) {
    Object.assign(this, { scene, ox, oz, layer });
    const [cx, cz] = BOSINGAK.at;
    this.people = BOSINGAK.people.map(([x, z, what]) => {
      const o = makeNpc(layer, '', randomLook());
      o.tag.style.display = 'none'; // just people on the square: no name tags
      const ry = Math.atan2(cx - x, cz - z); // facing the pavilion
      o.ch.root.position.set(x + ox, 0, z + oz);
      o.ch.root.rotation.y = ry;
      if (what === 'coffee') o.ch.setHeld('coffee');
      // A photo: one faces the friend posing in front of the pavilion, who faces the camera.
      const friend = BOSINGAK.people.find((q) => q[2] === 'pose'), shooter = BOSINGAK.people.find((q) => q[2] === 'photo');
      if (what === 'photo' && friend) o.ch.root.rotation.y = Math.atan2(friend[0] - x, friend[1] - z);
      if (what === 'pose' && shooter) o.ch.root.rotation.y = Math.atan2(shooter[0] - x, shooter[1] - z);
      o.what = what;
      scene.add(o.ch.root);
      return o;
    });
    this.keeper = null;
    this.pulledAt = -1e9;
  }
  _keeper() {
    const k = KEEPER[BOSINGAK.keeper.who] || KEEPER.official;
    const o = makeNpc(this.layer, L(BOSINGAK_TEXT.keeper[BOSINGAK.keeper.who] || BOSINGAK_TEXT.keeper.official), { ...randomLook(), ...k.look });
    o.ch.addProp('body', k.body());
    if (k.head) o.ch.addProp('head', k.head());
    const [kx, kz] = BOSINGAK.keeper.at;
    o.ch.root.position.set(kx + this.ox, BELL_HOUSE.baseH + 0.2, kz + this.oz);
    o.ch.root.rotation.y = BOSINGAK.keeper.ry;
    this.scene.add(o.ch.root);
    return o;
  }
  // A stroke: the keeper leans back on the rope, then bows once it is done.
  pull() {
    if (!this.keeper) return;
    this.keeper.ch.play('bow');
  }
  update(dt, me, camera, w, h, placeLabels, ringing) {
    const d = Math.hypot(me.x - this.ox - BOSINGAK.at[0], me.z - this.oz - BOSINGAK.at[1]);
    const on = d < NEAR;
    this.t = (this.t || 0) + dt;
    for (const o of this.people) {
      o.ch.root.visible = on;
      if (!on) continue;
      o.ch.animate(dt, 0, true);
      if (o.what === 'pose' && (o.cheerT = (o.cheerT ?? 3) - dt) <= 0) { o.cheerT = 6; o.ch.play('cheer'); } // a V for the photo
    }
    // The keeper: out during a New Year's ringing.
    if (ringing && !this.keeper) this.keeper = this._keeper();
    if (!this.keeper) return;
    const k = this.keeper, show = !!ringing && d < KEEPER_NEAR;
    k.ch.root.visible = show;
    if (!show) { k.tag.style.display = 'none'; if (k.bubble) k.bubble.style.display = 'none'; return; }
    k.ch.animate(dt, 0, true);
    placeLabels?.(k, camera, w, h);
  }
  hideLabels() {
    for (const o of [...this.people, this.keeper].filter(Boolean)) for (const el of [o.tag, o.bubble]) if (el) el.style.display = 'none';
  }
}
