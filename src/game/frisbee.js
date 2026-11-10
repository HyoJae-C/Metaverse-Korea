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
// Everyone sees it: the throw goes out in our state as a short note ("fb",
// core/fetch.js) and the same play runs on their screens with their copy of
// our pet. (Whether it's caught is decided by the thrower, so it matches.)
import { throwTarget, clearGrass, catchChance, FRISBEE_COLORS } from '../core/frisbee.js';
import { playFetch, encodeThrow, parseThrow } from '../core/fetch.js';
import { L } from '../ui/pocha-ui.js';

export const FRISBEE_TEXT = {
  throw: { en: 'Throw the frisbee for {name}', ko: '{name}에게 원반 던지기', ja: '{name}にフリスビーを投げる', zh: '给{name}扔飞盘', es: 'Lanzar el frisbi a {name}', id: 'Lempar frisbee untuk {name}', vi: 'Ném đĩa bay cho {name}', hi: '{name} के लिए फ्रिस्बी फेंकें', fr: 'Lancer le frisbee à {name}', th: 'โยนจานร่อนให้ {name}', ar: 'ارمِ الفريسبي لـ{name}' },
  room: { en: 'Face the open grass to throw it.', ko: '탁 트인 잔디 쪽을 보고 던져 주세요.', ja: '開けた芝生の方を向いて投げてね。', zh: '请面向空旷的草地扔。', es: 'Mira hacia el césped abierto para lanzarlo.', fr: 'Tourne-toi vers la pelouse dégagée pour le lancer.' },
  caught: { en: '{name} leapt and caught it in the air! 🥏', ko: '{name}, 점프해서 공중에서 잡았어요! 🥏', ja: '{name}がジャンプして空中でキャッチ！🥏', zh: '{name}跳起来在空中接住了！🥏', es: '¡{name} saltó y lo atrapó en el aire! 🥏', fr: '{name} a sauté et l\'a attrapé en plein vol ! 🥏' },
  caughtHands: { en: '{name} jumped up and snatched it with one hand! 🥏', ko: '{name}, 펄쩍 뛰어서 한 손으로 낚아챘어요! 🥏', ja: '{name}がぴょんと跳んで片手でキャッチ！🥏', zh: '{name}跳起来单手接住了！🥏', es: '¡{name} saltó y lo atrapó con una mano! 🥏', fr: '{name} a bondi et l\'a attrapé d\'une main ! 🥏' },
  missed: { en: '{name} missed it! Off to pick it up…', ko: '{name}, 아깝게 놓쳤어요! 주우러 가요…', ja: '{name}、惜しくも取り逃した！拾いに行くよ…', zh: '{name}没接住！去捡回来…', es: '¡{name} no lo atrapó! Va a recogerlo…', fr: '{name} l\'a raté ! Il va le ramasser…' },
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
 * game: { me, pet, petName(id), room (the picnic lawn or null), seated,
 * riding, bag, held (what's in the hand), shop, others } as getters, plus
 * clearAction(), handEmpty(empty) and sfx.
 */
export function createFrisbee(game) {
  let sim = null, room = null, streak = 0, seq = 0, sync = null;
  const busy = () => sim && sim.phase !== 'done';
  const name = () => game.petName(game.pet.id);

  function action(p) {
    const pet = game.pet, here = game.room;
    if (busy() || !here || !pet || !pet.root.visible || game.seated || game.riding) return null;
    if (!hasFrisbee(game.bag, game.held) || !clearGrass(here, p.x, p.z, 0.2)) return null;
    return { key: 'frisbee', label: '🥏 ' + fmt(L(FRISBEE_TEXT.throw), { name: name() }), run: () => throwIt() };
  }

  function owner() { const r = game.me.root; return { x: r.position.x, y: r.position.y, z: r.position.z, ry: r.rotation.y }; }

  function throwIt() {
    const me = game.me.root, pet = game.pet;
    const at = throwTarget(game.room, me.position.x, me.position.z, me.rotation.y, 0.6 + Math.random() * 0.4);
    if (!at || !pet) { game.shop.toast(L(FRISBEE_TEXT.room)); return; }
    room = game.room;
    const mine = isFrisbee(game.held) ? game.held : game.bag.list().find(isFrisbee); // the one you have: its colour
    const thr = { seq: ++seq, from: { x: me.position.x, z: me.position.z }, to: at, d: at.d, lucky: Math.random() < catchChance(pet.def.scale || 1, pet.def.kind), c: ((mine?.q | 0) % FRISBEE_COLORS.length + FRISBEE_COLORS.length) % FRISBEE_COLORS.length, react: 0.1 + Math.random() * 0.2 };
    sim?.stop();
    sim = playFetch(pet, room.scene, owner, thr, (ev) => {
      if (ev === 'caught') {
        streak++;
        const line = fmt(L(pet.def.kind === 'monkey' ? FRISBEE_TEXT.caughtHands : FRISBEE_TEXT.caught), { name: name() });
        game.shop.toast(streak > 1 ? line + ' ' + fmt(L(FRISBEE_TEXT.streak), { n: streak }) : line);
        game.sfx?.pop?.();
      } else if (ev === 'missed') {
        streak = 0;
        game.shop.toast(fmt(L(FRISBEE_TEXT.missed), { name: name() }));
      } else if (ev === 'landed') {
        game.shop.toast(fmt(L(FRISBEE_TEXT.watched), { name: name() }));
      } else if (ev === 'home') {
        if (streak < 1) game.shop.toast(fmt(L(FRISBEE_TEXT.fetched), { name: name() }));
        finish();
      }
    });
    // (in an open-air park: sent in the street's metres, where everyone else sees our dog)
    const st = (q) => { const [x, z] = game.toStreet ? game.toStreet(q.x, q.z) : [q.x, q.z]; return { x, z }; };
    sync = encodeThrow({ ...thr, from: st(thr.from), to: st(thr.to) });
    if (game.held?.g === 'frisbee') game.handEmpty?.(true); // it left the hand
    game.me.play?.('cast');
    game.sfx?.pop?.();
    game.clearAction();
  }

  function finish() {
    game.handEmpty?.(false);
    sync = null;
    game.clearAction();
  }
  function abort() { sim?.stop(); finish(); }

  function tick(dt) {
    peerTick(dt);
    if (!sim) return;
    if (busy()) {
      // Off the lawn (into a shop, onto a bike, sat down) or no pet: stop.
      if (!game.pet || game.room !== room || game.riding || !hasFrisbee(game.bag, game.held) || (game.seated && sim.phase !== 'lie')) { abort(); return; }
      if (sim.phase === 'lie') { // a cat's owner walks over to pick it up
        const me = game.me.root.position, d = sim.disc.position;
        if (Math.hypot(me.x - d.x, me.z - d.z) < 1.1) {
          game.me.play?.('bow');
          game.shop.toast(L(FRISBEE_TEXT.picked));
          abort();
          return;
        }
      }
    }
    if (!sim.tick(dt)) sim = null; // (over, and its face has faded)
  }

  // Other players' throws, played with their pet as we see it.
  const peers = new Map(); // id -> { seq, sim, pet }
  function peerTick(dt) {
    const others = game.others;
    if (others) {
      for (const [id, p] of others.players) {
        const thr = !p.hidden && p.pet ? parseThrow(p.target?.fb) : null;
        let st = peers.get(id);
        if (st && st.pet !== p.pet) { st.sim.stop(); peers.delete(id); st = null; } // their pet changed or left
        if (thr && thr.seq !== st?.seq) {
          st?.sim.stop();
          const r = p.ch.root;
          st = { seq: thr.seq, pet: p.pet, sim: playFetch(p.pet, p.pet.root.parent || r.parent, () => ({ x: r.position.x, y: r.position.y, z: r.position.z, ry: r.rotation.y }), thr) };
          peers.set(id, st);
        } else if (!thr && st && (st.sim.phase === 'lie' || st.sim.phase === 'fly' || st.sim.phase === 'fetch')) st.sim.stop(); // picked up, or they left the game
      }
    }
    for (const [id, st] of peers) {
      if (!others?.players.has(id)) { st.sim.stop(); peers.delete(id); continue; }
      if (!st.sim.tick(dt) && !parseThrow(others.players.get(id)?.target?.fb)) peers.delete(id);
    }
  }

  return {
    action, tick,
    get sync() { return sync; }, // "fb" in our state while a throw is on
    get phase() { return sim ? (sim.phase === 'done' ? 'idle' : sim.phase === 'lie' ? 'lie' : sim.phase) : 'idle'; },
    get streak() { return streak; },
    get face() { return sim?.face || null; },
    // Where it lies on the grass (for a cat's owner to pick up), or null.
    get lying() { return sim?.phase === 'lie' ? [sim.disc.position.x, sim.disc.position.z] : null; },
    peerPhases: () => [...peers.values()].map((st) => st.sim.phase),
  };
}
