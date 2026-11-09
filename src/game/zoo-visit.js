// A visit to the zoo (Children's Grand Park): what you can do once you are in
// its room (core/zoo-park.js). The little animal village's keeper and its cup
// of food, petting and feeding the little animals, the hippo's watermelon,
// the feeding-time toasts, the Sea Animals hall's door, the four-seat carts
// (game/zoo-carts.js), the camel ride (game/zoo-camels.js), and visitors strolling the paths so the zoo never
// looks empty.
//   game: { shop, wallet, sfx-free helpers: L, fmt, t, $, me, myLabel,
//   showBubble, makeNpc, randomLook, missionEvent, setRiding, riding, seated,
//   placeLabels, enterSeaHall, sounds (game/zoo-sounds.js), sitDown, standUp,
//   seatTaken }.
import { ZOO_TEXT } from '../i18n/game-text.js';
import { createZooCarts, CART } from './zoo-carts.js';
import { createZooCamels } from './zoo-camels.js';

export const MELON_PRICE = 3000;
export const WALKERS = 8; // visitors strolling the paths
export const PEOPLE_VIEW = 45; // m: visitors further off aren't drawn (each person is thousands of triangles)
const WALK_SPEED = 1.1;

const ZOO_FOOD = {
  buy: { en: 'Buy animal food', ko: '꼬마동물 먹이 사기', ja: '動物のえさを買う', zh: '买动物饲料' },
  item: { en: 'Food for the little animals', ko: '꼬마동물 먹이', ja: '小さな動物のえさ', zh: '小动物饲料' },
  got: { en: '🥕 A cup of food: {n} handfuls. The animals have noticed!', ko: '🥕 먹이 한 컵: {n}번 줄 수 있어요. 동물들이 알아챘어요!', ja: '🥕 えさ1カップ：{n}回あげられます。動物たちが気づいた！', zh: '🥕 一杯饲料：可以喂{n}次。动物们注意到了！' },
  poor: { en: 'Animal food costs 🪙 {n}', ko: '먹이는 🪙 {n}이에요', ja: 'えさは🪙 {n}', zh: '饲料要🪙 {n}' },
  feed: { en: 'Feed the {name} ({n} left)', ko: '{name}에게 먹이 주기 (남은 {n})', ja: '{name}にえさをあげる（残り{n}）', zh: '喂{name}（剩{n}）' },
  empty: { en: 'The cup is empty. More at the barn door.', ko: '컵이 비었어요. 빨간 집 앞에서 더 살 수 있어요.', ja: 'カップが空になりました。赤い小屋の前で買えます。', zh: '杯子空了。可以在红房子门口再买。' },
  keeper: { en: 'Keeper', ko: '사육사', ja: '飼育員', zh: '饲养员' },
  ask: { en: 'Ask the keeper about the animals', ko: '사육사에게 동물 이야기 듣기', ja: '飼育員に動物の話を聞く', zh: '听饲养员讲动物' },
};
const ZOO_IN = {
  hall: { en: 'Go into the Sea Animals hall', ko: '바다동물관 들어가기', ja: '海の動物館に入る', zh: '进入海洋动物馆' },
  soon: { en: '🚧 The zoo is opening soon: the animals are still moving in. Have a look round!', ko: '🚧 동물원은 개장 준비 중이에요. 동물들이 이사 오는 중이니 먼저 둘러보세요!', ja: '🚧 動物園はまもなくオープン。動物たちが引っ越し中です。ひと足先に見てまわろう！', zh: '🚧 动物园即将开放，动物们正在搬进来。先来逛逛吧！' },
};
const KEEPER_TALK = [
  { en: "Welcome to the Little Animal Village! Pat them gently, and buy a cup of food at the red barn's door if you like.", ko: '꼬마동물마을에 온 걸 환영해요! 살살 쓰다듬어 주고, 먹이는 빨간 집 문 앞에서 살 수 있어요.', ja: 'こども動物村へようこそ！やさしくなでてね。えさは赤い小屋の前で買えます。', zh: '欢迎来到小动物村！轻轻摸它们，饲料可以在红房子门口买。' },
  { en: 'Goats climb anything and nibble everything. That little beard? Both boys and girls have one.', ko: '염소는 높은 곳을 좋아하고 뭐든 오물오물 씹어 봐요. 턱수염은 암컷, 수컷 모두 있어요.', ja: 'ヤギは高い所が大好きで、何でもかじってみます。あごひげはオスにもメスにもあります。', zh: '山羊喜欢爬高，什么都想啃一啃。小胡子公母都有。' },
  { en: "Sheep stay together in a flock. Their wool keeps growing, so we give them a haircut every spring.", ko: '양은 늘 무리 지어 다녀요. 털이 계속 자라서 봄마다 털을 깎아 줘요.', ja: 'ヒツジはいつも群れで動きます。毛が伸び続けるので、毎年春に毛刈りをします。', zh: '绵羊总是成群行动。羊毛一直长，所以每年春天给它们剪毛。' },
  { en: 'Rabbits see almost all the way round without turning their heads. A happy rabbit jumps and twists in the air!', ko: '토끼는 고개를 안 돌려도 거의 한 바퀴를 다 볼 수 있어요. 기분이 좋으면 공중에서 몸을 비틀며 뛰어요!', ja: 'ウサギは首を回さなくてもほぼ一周見えます。うれしいと空中でひねりジャンプ！', zh: '兔子不转头几乎能看到一圈。开心时会在空中扭身跳！' },
  { en: "Guinea pigs aren't pigs and aren't from Guinea: they come from the Andes. They squeak 'wheek wheek' when they hear food.", ko: '기니피그는 돼지도 아니고 기니 출신도 아니에요. 남미 안데스에서 왔어요. 먹이 소리가 나면 "뀨뀨" 하고 울어요.', ja: 'モルモットはブタでもギニア出身でもなく、南米アンデスの生まれ。えさの音がすると「キュイキュイ」と鳴きます。', zh: '豚鼠既不是猪也不来自几内亚，它们来自南美安第斯山。听到食物声会"吱吱"叫。' },
];
const ZOO_PET = {
  rabbit: { en: 'rabbit', ko: '토끼', ja: 'ウサギ', zh: '兔子' }, guineapig: { en: 'guinea pig', ko: '기니피그', ja: 'モルモット', zh: '豚鼠' },
  goat: { en: 'goat', ko: '염소', ja: 'ヤギ', zh: '山羊' }, sheep: { en: 'sheep', ko: '양', ja: 'ヒツジ', zh: '绵羊' },
};

// A stroll along the paths: each walker picks a path, walks it to the end
// (round and round, on the ring road), stops now and then to look, turns
// back at an end. Pure numbers, so it can be tested: { path, i, dir, wait }.
export function stepWalker(w, walks, dt, rnd = Math.random) {
  if (w.wait > 0) { w.wait -= dt; return 0; }
  const { p, closed } = walks[w.path];
  let left = WALK_SPEED * dt;
  while (left > 0) {
    const j = w.i + w.dir;
    if (j < 0 || j >= p.length) {
      if (closed) { w.i = w.dir > 0 ? 0 : p.length - 1; continue; }
      w.dir = -w.dir; w.wait = 1 + rnd() * 2; return 0;
    }
    const [tx, tz] = p[j], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
    if (d <= left) { w.x = tx; w.z = tz; w.i = j; left -= d; if (rnd() < 0.03) { w.wait = 3 + rnd() * 4; break; } continue; }
    w.x += (dx / d) * left; w.z += (dz / d) * left; w.ry = Math.atan2(dx, dz); left = 0;
  }
  return w.wait > 0 ? 0 : WALK_SPEED;
}

export function createZooVisit(game) {
  let built = null, zoo = null, keeper = null, keeperLine = 0, walkers = [], watchers = [], welcomed = -Infinity;
  const L = (o) => game.L(o);
  const carts = createZooCarts({
    get station() { return built?.carts || null; },
    get shop() { return game.shop; }, setRiding: (k) => game.setRiding(k),
    get riding() { return game.riding; }, get seated() { return game.seated; },
  });
  const here = () => game.inZoo() && built;
  const camels = createZooCamels({
    built: () => built, here: () => !!here(), get shop() { return game.shop; }, get wallet() { return game.wallet; },
    get me() { return game.me; }, get seated() { return game.seated; }, get riding() { return game.riding; },
    sitDown: (s) => game.sitDown(s), standUp: () => game.standUp(), seatTaken: (x, z) => game.seatTaken?.(x, z),
    makeNpc: (name, look) => game.makeNpc(name, look), sounds: game.sounds, missionEvent: (k) => game.missionEvent(k), t: (k, v) => game.t(k, v),
  });

  // The first time the zoo's room is built: its keeper, its visitors, its sounds.
  function adopt(b) {
    built = b;
    zoo = b.zoo;
    zoo.onNotice = ({ kind, pen }) => { if (here() && b.open) game.shop.toast(game.fmt(L(ZOO_TEXT[kind]), { name: L(pen.name) })); };
    game.sounds.attach(zoo);
    const KP = zoo.pens.find((P) => P.pen.keeper);
    if (KP) {
      keeper = game.makeNpc('🧑‍🌾 ' + L(ZOO_FOOD.keeper), { ...game.randomLook(), shirt: 'leaf', pants: 'olive', head: 'bucket-cream' });
      const [kx, kz] = KP.pen.keeper.at;
      keeper.ch.root.position.set(KP.pen.x + kx, 0, KP.pen.z + kz);
      keeper.ch.root.rotation.y = KP.pen.keeper.ry || 0;
      b.scene.add(keeper.ch.root);
    }
    // Visitors watching at the pens (one a pen, every other pen), turned to it.
    watchers = (b.stations.watchers || []).filter((_, i) => i % 2 === 0).map((st) => {
      const o = game.makeNpc('');
      o.tag.style.visibility = 'hidden';
      o.ch.root.position.set(st.x, 0, st.z);
      o.ch.root.rotation.y = st.ry;
      b.scene.add(o.ch.root);
      return o;
    });
    const walks = b.walks;
    walkers = [];
    for (let i = 0; i < WALKERS; i++) {
      const path = i % walks.length, p = walks[path].p, k = Math.floor((i * 0.37 % 1) * (p.length - 1));
      const o = game.makeNpc('');
      o.tag.style.visibility = 'hidden';
      if (i % 3 === 2) o.ch.root.scale.setScalar(0.8); // a child with the family
      Object.assign(o, { path, i: k, dir: i % 2 ? 1 : -1, wait: 0, x: p[k][0], z: p[k][1], ry: 0 });
      o.ch.root.position.set(o.x, 0, o.z);
      b.scene.add(o.ch.root);
      walkers.push(o);
    }
    b.zooPeople = [keeper, ...watchers, ...walkers].filter(Boolean);
    camels.adopt(b); // the camel ride's keeper (game/zoo-camels.js) // (game/room-cache.js takes their name tags off the page if the room is let go)
  }

  const feedAct = (a, p) => ({ key: 'zoofeed:' + a.kind + zoo.food, label: '🥕 ' + game.fmt(L(ZOO_FOOD.feed), { name: L(ZOO_PET[a.kind] || ZOO_PET.rabbit), n: zoo.food }), run: () => {
    if (zoo.feedPet(a, p.x, p.z)) { game.me.play?.('wave'); game.showBubble(game.myLabel, '🥕'); game.missionEvent('pet'); }
    if (!zoo.food) game.shop.toast(L(ZOO_FOOD.empty));
  } });
  const petAct = (a, p) => ({ key: 'zoopet:' + a.kind, label: '🐾 ' + game.t('pet.pat', { name: L(ZOO_PET[a.kind] || ZOO_PET.rabbit) }), run: () => {
    zoo.pet(a, p.x, p.z);
    game.showBubble(game.myLabel, a.kind === 'goat' || a.kind === 'sheep' ? '😊' : '🥰');
    game.missionEvent('pet');
  } });
  const keeperAct = () => ({ key: 'zoo-keeper', label: '🧑‍🌾 ' + L(ZOO_FOOD.ask), run: () => {
    keeper.ch.wave?.();
    game.showBubble(keeper, L(KEEPER_TALK[keeperLine % KEEPER_TALK.length]), 8000, 'chat npc-say');
    keeperLine++;
    game.missionEvent('talk', 'zookeeper');
  } });
  const foodShopAct = (P) => ({ key: 'zoo-food', label: `🥕 ${L(ZOO_FOOD.buy)} · 🪙 ${P.pen.shop.price.toLocaleString()}`, run: () => {
    if (!game.wallet.spend(P.pen.shop.price, { name: ZOO_FOOD.item, at: P.pen.name })) { game.shop.toast(game.fmt(L(ZOO_FOOD.poor), { n: P.pen.shop.price.toLocaleString() })); return; }
    zoo.buyFood();
    game.shop.toast(game.fmt(L(ZOO_FOOD.got), { n: zoo.food }));
  } });
  const melonAct = (P, p) => ({ key: 'zoo-melon', label: `🍉 ${L(ZOO_TEXT.melon)} · 🪙 ${MELON_PRICE.toLocaleString()}`, run: () => {
    if (!game.wallet.spend(MELON_PRICE, { name: ZOO_TEXT.buy, at: P.pen.name })) { game.shop.toast(game.fmt(L(ZOO_TEXT.poor), { n: MELON_PRICE.toLocaleString() })); return; }
    if (zoo.feedMelon(P, p.x, p.z)) game.me.play?.('wave');
  } });
  const hallAct = () => ({ key: 'zoo-hall', label: '🦭 ' + L(ZOO_IN.hall), run: () => game.enterSeaHall() });
  const atHallDoor = (p) => built.stations.seaDoor.some((d) => Math.hypot(p.x - d.x, p.z - d.z) < 1.8);

  return {
    CART, carts, camels, adopt,
    get zoo() { return here() ? zoo : null; },
    get built() { return built; },
    welcome() { // (once in a while, not every time you come back out of the hall)
      if (!built || built.open || performance.now() - welcomed < 300e3) return;
      welcomed = performance.now();
      game.shop.toast(L(ZOO_IN.soon));
    },
    // The main button in the zoo, or null.
    action(p) {
      if (!here()) return null;
      if (game.riding === CART) return carts.offAct();
      if (camels.riding()) return camels.offAct();
      if (game.riding || game.seated) return null;
      const near = zoo.nearest(p.x, p.z);
      if (near && zoo.food > 0) return feedAct(near, p); // feed from your cup
      const shop = zoo.shopSpot(p.x, p.z); if (shop) return foodShopAct(shop); // the food counter at the barn door
      if (atHallDoor(p)) return hallAct();
      const cart = carts.act(p); if (cart) return cart; // the cart station
      const camel = camels.act(p); if (camel) return camel; // the camel ride's stand
      if (keeper && zoo.keeperSpot(p.x, p.z)) return keeperAct();
      if (near) return petAct(near, p); // the little animal village
      const melon = zoo.melonSpot(p.x, p.z); if (melon) return melonAct(melon, p); // watermelon for the hippo
      return null;
    },
    // Everything else you could do here (the "more" list).
    more(p) {
      if (!here() || game.riding || game.seated) return [];
      const out = [];
      const near = zoo.nearest(p.x, p.z);
      if (near) { out.push(petAct(near, p)); if (zoo.food > 0) out.push(feedAct(near, p)); }
      const shop = zoo.shopSpot(p.x, p.z); if (shop) out.push(foodShopAct(shop));
      if (keeper && zoo.keeperSpot(p.x, p.z)) out.push(keeperAct());
      return out;
    },
    // Each frame in the zoo: the visitors stroll, the keeper stands by, labels.
    tick(dt, p, camera, w, h) {
      camels.tick(); // (on a camel: carried on its saddle; out of the zoo: off)
      if (!here()) return;
      carts.tick(p);
      const near = (o) => {
        const r = o.ch.root, on = Math.hypot(r.position.x - p.x, r.position.z - p.z) < PEOPLE_VIEW;
        r.visible = on;
        if (!on && o.bubble) { o.bubble.remove(); o.bubble = null; }
        return on;
      };
      for (const o of walkers) {
        const speed = stepWalker(o, built.walks, dt);
        o.ch.root.position.set(o.x, 0, o.z);
        o.ch.root.rotation.y = o.ry;
        if (near(o)) { o.ch.animate(dt, speed); game.placeLabels(o, camera, w, h); }
      }
      for (const o of watchers) if (near(o)) o.ch.animate(dt, 0);
      if (keeper && near(keeper)) { keeper.ch.animate(dt, 0); game.placeLabels(keeper, camera, w, h); }
      if (keeper) keeper.tag.style.display = keeper.ch.root.visible ? '' : 'none';
    },
    // Out of the zoo: their name tags and bubbles go with it.
    hideLabels() {
      for (const o of [keeper, ...walkers, ...watchers]) if (o) { o.tag.style.display = 'none'; o.bubble?.remove(); o.bubble = null; }
    },
    showLabels() { if (keeper) keeper.tag.style.display = ''; },
  };
}
