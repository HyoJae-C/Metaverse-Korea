// Playing fetch with your pet (core/frisbee.js), only on the picnic lawns:
// the same grass where picnic mats go (game/picnic.js). The frisbee is
// bought next to the mats and stays in the bag; standing on the grass with
// your pet, the button throws it the way you face.
//
// A dog (or a monkey) races after it: in time, it leaps and catches it in
// the air (a run of catches is counted), otherwise it picks it up off the
// grass. Either way it trots back and drops it at your feet: a dog carries
// it flat in its mouth, a monkey in one hand. A cat or a hamster just watches
// it fly and sits down: walk over and pick it up yourself.
//
// Local only: others see your pet follow you as usual, not the game.
import { throwTarget, clearGrass, flightTime, discAt, chaseSpeed, canCatch, catchChance, fetches, makeDisc, frisbeeColor, DISC_R } from '../core/frisbee.js';
import { L } from '../ui/pocha-ui.js';

export const FRISBEE_TEXT = {
  throw: { en: 'Throw the frisbee for {name}', ko: '{name}에게 원반 던지기', ja: '{name}にフリスビーを投げる', zh: '给{name}扔飞盘', es: 'Lanzar el frisbi a {name}', id: 'Lempar frisbee untuk {name}', vi: 'Ném đĩa bay cho {name}', hi: '{name} के लिए फ्रिस्बी फेंकें', fr: 'Lancer le frisbee à {name}', th: 'โยนจานร่อนให้ {name}', ar: 'ارمِ الفريسبي لـ{name}' },
  room: { en: 'Face the open grass to throw it.', ko: '탁 트인 잔디 쪽을 보고 던져 주세요.', ja: '開けた芝生の方を向いて投げてね。', zh: '请面向空旷的草地扔。', es: 'Mira hacia el césped abierto para lanzarlo.', fr: 'Tourne-toi vers la pelouse dégagée pour le lancer.' },
  caught: { en: '{name} leapt and caught it in the air! 🥏', ko: '{name}, 점프해서 공중에서 잡았어요! 🥏', ja: '{name}がジャンプして空中でキャッチ！🥏', zh: '{name}跳起来在空中接住了！🥏', es: '¡{name} saltó y lo atrapó en el aire! 🥏', fr: '{name} a sauté et l\'a attrapé en plein vol ! 🥏' },
  caughtHands: { en: '{name} jumped up and snatched it with one hand! 🥏', ko: '{name}, 펄쩍 뛰어서 한 손으로 낚아챘어요! 🥏', ja: '{name}がぴょんと跳んで片手でキャッチ！🥏', zh: '{name}跳起来单手接住了！🥏', es: '¡{name} saltó y lo atrapó con una mano! 🥏', fr: '{name} a bondi et l\'a attrapé d\'une main ! 🥏' },
  streak: { en: '{n} catches in a row!', ko: '{n}번 연속 캐치!', ja: '{n}回連続キャッチ！', zh: '连续接住{n}次！', es: '¡{n} atrapadas seguidas!', fr: '{n} attrapés d\'affilée !' },
  fetched: { en: '{name} brought the frisbee back. Throw again!', ko: '{name}이(가) 원반을 물어 왔어요. 한 번 더!', ja: '{name}がフリスビーをくわえて戻ってきた。もう一回！', zh: '{name}把飞盘叼回来了。再扔一次！', es: '{name} trajo el frisbi. ¡Otra vez!', fr: '{name} a rapporté le frisbee. Encore !' },
  watched: { en: '{name} watched it fly… and sat down. Go and pick it up!', ko: '{name}은(는) 날아가는 원반을 구경만 하고 앉았어요. 직접 주우러 가요!', ja: '{name}は飛んでいくのを眺めて座っちゃった。拾いに行こう！', zh: '{name}看着飞盘飞走……然后坐下了。自己去捡吧！', es: '{name} lo vio volar… y se sentó. ¡Ve a recogerlo!', fr: '{name} l\'a regardé voler… et s\'est assis. Va le ramasser !' },
  picked: { en: 'Frisbee back in your bag.', ko: '원반을 주워서 가방에 넣었어요.', ja: 'フリスビーを拾ってバッグに入れました。', zh: '捡起飞盘放回包里了。', es: 'El frisbi vuelve a tu bolsa.', fr: 'Le frisbee est de retour dans ton sac.' },
  have: { en: 'You already have a frisbee in your bag.', ko: '가방에 이미 원반이 있어요.', ja: 'もうバッグにフリスビーがあります。', zh: '包里已经有飞盘了。', es: 'Ya tienes un frisbi en la bolsa.', fr: 'Tu as déjà un frisbee dans ton sac.' },
};

// In the bag, or taken out and held in the hand (holding it takes it out of
// the bag).
const isFrisbee = (e) => e?.kind === 'gift' && e.g === 'frisbee';
export const hasFrisbee = (bag, held = null) => isFrisbee(held) || bag.list().some(isFrisbee);
const fmt = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

/**
 * game: { me, pet, petName(id), room (the picnic lawn or null), mode,
 * seated, riding, bag, held (what's in the hand), shop } as getters, plus clearAction() and sfx.
 */
export function createFrisbee(game) {
  // phase: idle | fly (in the air) | fetch (on the grass, the dog going for
  // it) | back (in the dog's mouth) | lie (on the grass, for you to pick up)
  let phase = 'idle', disc = null, t = 0, flight = null, room = null, catchHop = 0, streak = 0, lost = 0, waited = 0;

  function end() {
    if (disc) game.handEmpty?.(false);
    disc?.removeFromParent();
    disc = null;
    if (game.pet) { game.pet.playing = false; game.pet.body.position.y = 0; }
    phase = 'idle';
    flight = null;
  }

  function action(p) {
    const pet = game.pet, here = game.room;
    if (phase !== 'idle' || !here || !pet || !pet.root.visible || game.seated || game.riding) return null;
    if (!hasFrisbee(game.bag, game.held) || !clearGrass(here, p.x, p.z, 0.2)) return null;
    return { key: 'frisbee', label: '🥏 ' + fmt(L(FRISBEE_TEXT.throw), { name: game.petName(pet.id) }), run: () => throwIt() };
  }

  function throwIt() {
    const me = game.me.root, pet = game.pet;
    const at = throwTarget(game.room, me.position.x, me.position.z, me.rotation.y, 0.6 + Math.random() * 0.4);
    if (!at || !pet) { game.shop.toast(L(FRISBEE_TEXT.room)); return; }
    room = game.room;
    const ground = me.position.y;
    flight = { from: { x: me.position.x, z: me.position.z }, to: at, T: flightTime(at.d), ground, react: 0.1 + Math.random() * 0.2, lucky: Math.random() < catchChance(pet.def.scale || 1, pet.def.kind) };
    disc = makeDisc(frisbeeColor(isFrisbee(game.held) ? game.held : game.bag.list().find(isFrisbee))); // the one you have
    room.scene.add(disc);
    if (game.held?.g === 'frisbee') game.handEmpty?.(true); // it left the hand
    pet.playing = true;
    phase = 'fly';
    t = 0;
    catchHop = 0;
    waited = 0;
    game.me.play?.('cast');
    game.sfx?.pop?.();
    game.clearAction();
  }

  function tick(dt) {
    if (phase === 'idle') return;
    const pet = game.pet;
    // Off the lawn (into a shop, onto a bike, sat down) or no pet: stop.
    if (!pet || game.room !== room || game.riding || !hasFrisbee(game.bag, game.held)) { end(); game.clearAction(); return; }
    t += dt;
    const me = game.me.root.position, kind = pet.def.kind, fetcher = fetches(kind), scale = pet.def.scale || 1;
    const pr = pet.root.position;
    if (game.seated && phase !== 'lie') { end(); return; }
    if (phase === 'fly') {
      const s = Math.min(1, t / flight.T);
      const at = discAt(flight.from, flight.to, s, flight.ground);
      disc.position.set(at.x, at.y, at.z);
      disc.rotation.y += dt * 18; // spinning
      disc.rotation.z = Math.sin(t * 3) * 0.08;
      if (fetcher) {
        if (t > flight.react) {
          const left = pet.run(dt, flight.to.x, flight.to.z, chaseSpeed(kind, scale), catchHop);
          if (left < 0.1) pet.watch(dt, at.x, at.z, 18);
        } else pet.watch(dt, at.x, at.z, 18);
        // Close under it: leap for it.
        const dx = at.x - pr.x, dz = at.z - pr.z;
        if (Math.hypot(dx, dz) < 1.6 && s > 0.5 && s < 1) catchHop = kind === 'monkey' ? 0.4 : 0.25 + 0.1 * scale;
        if (s < 1 && flight.lucky && canCatch(dx, dz, at.y - flight.ground, scale, kind)) {
          streak++;
          grab(pet);
          const line = fmt(L(kind === 'monkey' ? FRISBEE_TEXT.caughtHands : FRISBEE_TEXT.caught), { name: game.petName(pet.id) });
          game.shop.toast(streak > 1 ? line + ' ' + fmt(L(FRISBEE_TEXT.streak), { n: streak }) : line);
          game.sfx?.pop?.();
          phase = 'back';
          return;
        }
      } else pet.watch(dt, at.x, at.z, 3);
      if (s >= 1) {
        disc.position.y = flight.ground + 0.03;
        disc.rotation.z = 0;
        if (fetcher) { streak = 0; phase = 'fetch'; } else {
          phase = 'lie';
          pet.playing = false; // back to following you
          game.shop.toast(fmt(L(FRISBEE_TEXT.watched), { name: game.petName(pet.id) }));
        }
      }
      return;
    }
    if (phase === 'fetch') {
      const left = pet.run(dt, disc.position.x, disc.position.z, chaseSpeed(kind, scale));
      if (left < 0.35) { grab(pet); phase = 'back'; }
      return;
    }
    if (phase === 'back') {
      // Trot back to just in front of you and drop it at your feet.
      const ry = game.me.root.rotation.y;
      const left = pet.run(dt, me.x + Math.sin(ry) * 0.9, me.z + Math.cos(ry) * 0.9, chaseSpeed(kind, scale) * 0.8);
      lost += dt;
      if (left < 0.15 || lost > 15) {
        pet.watch(dt, me.x, me.z);
        if ((waited += dt) > 0.3) {
          if (streak < 1) game.shop.toast(fmt(L(FRISBEE_TEXT.fetched), { name: game.petName(pet.id) }));
          end();
          game.clearAction();
        }
      }
      return;
    }
    if (phase === 'lie' && Math.hypot(me.x - disc.position.x, me.z - disc.position.z) < 1.1) {
      game.me.play?.('bow'); // bend down for it
      game.shop.toast(L(FRISBEE_TEXT.picked));
      end();
      game.clearAction();
    }
  }

  // Into the dog's mouth, or a monkey's hands in front of its tummy (they
  // are scaled with the body).
  function grab(pet) {
    const s = pet.def.scale || 1;
    disc.scale.setScalar(1 / s);
    if (pet.def.kind === 'monkey') {
      // In one hand, at the end of its right arm, held upright by the rim.
      pet.body.add(disc);
      disc.position.set(-0.24, 0.17, 0.06 + DISC_R / s);
      disc.rotation.set(Math.PI / 2, 0, 0);
    } else {
      // Lying flat, gripped by its edge: the disc sticks out in front of the
      // muzzle and the face stays in view.
      pet.head.add(disc);
      disc.position.set(0, -0.09, 0.19 + DISC_R / s);
      disc.rotation.set(0, 0, 0);
    }
    catchHop = 0;
    lost = 0;
    waited = 0;
  }

  return {
    action, tick,
    get phase() { return phase; },
    get streak() { return streak; },
    // Where it lies on the grass (for a cat's owner to pick up), or null.
    get lying() { return phase === 'lie' ? [disc.position.x, disc.position.z] : null; },
  };
}
