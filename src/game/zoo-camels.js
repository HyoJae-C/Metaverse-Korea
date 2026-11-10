// Riding a camel at the zoo (낙타 타기): at the stand by the camels' pen,
// pay and climb onto the saddle of the camel kneeling there; it gets up and
// walks its loop round the herbivores (core/zoo-camel-ride.js, on the shared
// clock), carrying you, and kneels again back at the stand, where you get
// off. You can get off on the way too. Each camel has its keeper, who leads
// it by a rope all the way round, walking at its head on its left.
//   game: { built() (the zoo's room, or null), here(), shop, wallet, me,
//   seated, sitDown(seat), standUp(), seatTaken(x, z), makeNpc, randomLook, sounds,
//   missionEvent, t }.
import * as THREE from 'three';

export const CAMEL_PRICE = 3000;
export const REACH = 3; // m from the kneeling camel to get on
const SIT = 0.28; // m from a sitting person's feet line (their root) up to the seat
export const LEAD = { ahead: 1.45, side: 0.85 }; // m: where the keeper walks, from the camel (at its head, on its left)
const KEEPER_LOOK = { shirt: 'leaf', pants: 'olive', head: 'bucket-cream' };
const KEEPER_VIEW = 45; // m: a keeper further off isn't drawn (unless it's leading you)

// Where camel i's keeper is, from the camel's place and heading: { x, z, ry }.
// Leading: walking beside its head, facing the way; at the stand, turned to
// the camel while it kneels.
export function keeperSpot(x, z, ry, loading) {
  const fx = Math.sin(ry), fz = Math.cos(ry), lx = Math.cos(ry), lz = -Math.sin(ry); // ahead, and the camel's left
  const kx = x + fx * LEAD.ahead + lx * LEAD.side, kz = z + fz * LEAD.ahead + lz * LEAD.side;
  return { x: kx, z: kz, ry: loading ? Math.atan2(x + fx * 1.1 - kx, z + fz * 1.1 - kz) : ry };
}

export function createZooCamels(game) {
  let keepers = []; // one a camel: { npc, rope }
  const hand = new THREE.Vector3(), muzzle = new THREE.Vector3();
  const ride = () => game.built()?.camels || null;
  const now = () => Date.now() / 1000;
  const mine = () => (game.seated?.camel != null ? game.seated.camel : -1);
  // The camel kneeling at the stand now (or soon), and how far you are from it.
  function atStand(p) {
    const r = ride();
    if (!r || Math.hypot(p.x - r.stand.x, p.z - r.stand.z) > REACH) return null;
    const T = now(), list = r.camels.map((c) => ({ i: c.i, st: r.at(c.i, T) }));
    const ready = list.find((c) => c.st.board);
    if (ready) return ready;
    return { i: -1, st: list.reduce((a, b) => (a.st.left < b.st.left ? a : b)).st };
  }
  // Where you step down: beside the camel, on its left.
  function standSpot(r, i) {
    const s = r.seat(i), ry = s.ry;
    return [s.x + Math.cos(ry) * 1.3, s.z - Math.sin(ry) * 1.3];
  }
  function getOn(i) {
    const r = ride();
    if (!r || !r.at(i, now()).board) return;
    const s = r.seat(i);
    if (game.seatTaken?.(s.x, s.z)) { game.shop.toast(game.t('zoocamel.taken')); return; }
    if (!game.wallet.spend(CAMEL_PRICE, { name: { en: 'Camel ride', ko: '낙타 타기' }, at: { en: 'Camels', ko: '낙타' } })) {
      game.shop.toast(game.t('zoocamel.poor', { n: CAMEL_PRICE.toLocaleString() }));
      return;
    }
    game.sitDown({ x: s.x, y: s.y - SIT, z: s.z, ry: s.ry, stand: standSpot(r, i), camel: i, walked: false });
    r.mine = i;
    keepers[i]?.npc.ch.wave?.();
    game.sounds?.play('grunt', s.x, s.z);
    game.shop.toast(game.t('zoocamel.on'));
    game.missionEvent?.('ride');
  }
  function getOff(done) {
    const r = ride();
    if (r) r.mine = -1;
    game.standUp();
    if (done) game.shop.toast(game.t('zoocamel.done'));
  }
  return {
    // The zoo's room is built: a keeper for each camel, with its lead rope.
    adopt(b) {
      const r = b.camels;
      if (!r) return;
      keepers = r.camels.map(() => {
        const npc = game.makeNpc('', { ...game.randomLook?.(), ...KEEPER_LOOK });
        npc.tag.style.visibility = 'hidden';
        b.scene.add(npc.ch.root);
        b.zooPeople?.push(npc);
        const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([hand, muzzle]), new THREE.LineBasicMaterial({ color: '#4a3424' }));
        rope.frustumCulled = false;
        b.scene.add(rope);
        return { npc, rope };
      });
      this.lead(0);
    },
    get keepers() { return keepers; },
    // Each keeper beside its camel's head, walking when it walks, the rope
    // from their hand to its halter. (dt: s, for their steps)
    lead(dt, p = null) {
      const r = ride();
      if (!r) return;
      keepers.forEach((k, i) => {
        const c = r.camels[i], st = c.st || r.at(i, now()), root = c.a.root;
        const o = k.npc.ch.root, on = c.a.root.visible && (!p || i === mine() || Math.hypot(p.x - root.position.x, p.z - root.position.z) < KEEPER_VIEW);
        o.visible = on; k.rope.visible = on;
        if (!on) return;
        const s = keeperSpot(root.position.x, root.position.z, root.rotation.y, st.phase === 'load');
        o.position.set(s.x, 0, s.z);
        o.rotation.y = s.ry;
        k.npc.ch.animate?.(dt, st.speed);
        hand.set(s.x - Math.cos(s.ry) * 0.25, 0.85, s.z + Math.sin(s.ry) * 0.25); // (the hand nearer the camel)
        c.a.head.getWorldPosition(muzzle);
        k.rope.geometry.setFromPoints([hand, muzzle]);
      });
    },
    // At the stand, on foot: get on the kneeling camel (or how long to wait).
    act(p) {
      if (game.riding || game.seated) return null;
      const c = atStand(p);
      if (!c) return null;
      if (c.i < 0) {
        const n = Math.max(1, Math.ceil(c.st.left));
        return { key: 'zoocamel-wait:' + n, label: '⏳ ' + game.t('zoocamel.wait', { n }), run: () => game.shop.toast(game.t('zoocamel.wait', { n })) };
      }
      return { key: 'zoocamel', label: game.t('zoocamel.ride', { n: CAMEL_PRICE.toLocaleString() }), run: () => getOn(c.i) };
    },
    // On a camel: get off (here, or back at the stand).
    offAct() { return { key: 'zoocamel-off', label: '🐪 ' + game.t('zoocamel.off'), run: () => getOff(false) }; },
    riding: () => mine() >= 0,
    // Each frame: carry the rider on the saddle; off at the stand after the lap.
    tick(dt = 0, p = null) {
      this.lead(dt, p);
      const i = mine();
      if (i < 0) return;
      const r = ride();
      if (!r || !game.here()) { if (r) r.mine = -1; game.standUp(); return; }
      const st = r.camels[i].st || r.at(i, now()), s = r.seat(i), seat = game.seated;
      game.me.root.position.set(s.x, s.y - SIT, s.z);
      game.me.root.rotation.y = s.ry;
      seat.x = s.x; seat.z = s.z; seat.ry = s.ry;
      seat.stand = standSpot(r, i);
      if (st.phase === 'walk') seat.walked = true;
      else if (seat.walked && st.kneel > 0.95) getOff(true); // back at the stand, kneeling: off you get
    },
    getOn, getOff,
  };
}
