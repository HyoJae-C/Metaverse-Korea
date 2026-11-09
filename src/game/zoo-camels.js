// Riding a camel at the zoo (낙타 타기): at the stand by the camels' pen,
// pay and climb onto the saddle of the camel kneeling there; it gets up and
// walks its loop round the herbivores (core/zoo-camel-ride.js, on the shared
// clock), carrying you, and kneels again back at the stand, where you get
// off. You can get off on the way too. A keeper stands by the stand.
//   game: { built() (the zoo's room, or null), here(), shop, wallet, me,
//   seated, sitDown(seat), standUp(), seatTaken(x, z), makeNpc, sounds,
//   missionEvent, t }.
export const CAMEL_PRICE = 3000;
export const REACH = 3; // m from the kneeling camel to get on
const SIT = 0.28; // m from a sitting person's feet line (their root) up to the seat

export function createZooCamels(game) {
  let keeper = null;
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
    keeper?.ch.wave?.();
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
    // The zoo's room is built: the camel keeper at the stand.
    adopt(b) {
      const r = b.camels;
      if (!r) return;
      keeper = game.makeNpc('');
      keeper.tag.style.visibility = 'hidden';
      keeper.ch.root.position.set(r.keeper[0], 0, r.keeper[1]);
      keeper.ch.root.rotation.y = 0; // facing the path, the camel at the step
      b.scene.add(keeper.ch.root);
      b.zooPeople?.push(keeper);
    },
    get keeper() { return keeper; },
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
    tick() {
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
