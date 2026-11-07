// Restaurants (core/dining.js): sit at a table, open the menu and order.
//
// Moved out of main.js. The game's live state (the shop you're in, your seat,
// the other players…) comes in through `game`, whose getters are read only
// when needed.
import * as THREE from 'three';
import { localName, getLanguage } from '../core/i18n.js';
import { coinPrice, takeoutKind, Meal, FOOD_BITES, parseMealSync, biteMsg, BITE_REACH, BITE_GAP_MS, foodScale, isDining } from '../core/dining.js';
import { productModel } from '../core/interior.js';
import { say } from '../core/npcs.js';
import { L, fmt } from '../ui/pocha-ui.js';

const $ = (id) => document.getElementById(id);

export const DINE_TEXT = {
  menu: { en: 'Menu', ko: '메뉴판', ja: 'メニュー', zh: '菜单' },
  note: { en: 'Order here and your food comes to the table. Paid in coins.', ko: '여기서 주문하면 음식이 식탁으로 나와요. 결제는 코인으로 해요.', ja: 'ここで注文すると料理がテーブルに届きます。お支払いはコインで。', zh: '在这里点餐，菜会送到桌上。用硬币支付。', es: 'Pide aquí y la comida llega a tu mesa. Se paga con monedas.', ar: 'اطلب هنا وسيصل طعامك إلى الطاولة. الدفع بالعملات.', vi: 'Gọi món ở đây và đồ ăn sẽ được mang ra bàn. Trả bằng xu.', hi: 'यहाँ ऑर्डर करें और खाना मेज़ पर आएगा। भुगतान सिक्कों में।', id: 'Pesan di sini dan makanan diantar ke meja. Bayar pakai koin.' },
  here: { en: 'Eat here', ko: '먹고 가기', ja: '店内で', zh: '堂食' },
  togo: { en: 'To go', ko: '포장', ja: '持ち帰り', zh: '打包' },
  ordered: { en: 'Ordered {name}! It will be right out.', ko: '{name} 주문 완료! 곧 나와요.', ja: '{name}を注文しました！すぐお持ちします。', zh: '已点{name}！马上就好。' },
  served: { en: 'Your {name} is here. Enjoy!', ko: '{name} 나왔습니다. 맛있게 드세요!', ja: '{name}お待たせしました。どうぞ！', zh: '您的{name}来了，请慢用！' },
  waiting: { en: 'Cooking…', ko: '조리 중…', ja: '調理中…', zh: '烹饪中…' },
  eat: { en: 'Eat', ko: '먹기', ja: '食べる', zh: '吃' },
  bite: { en: 'Yum! {n} bites left', ko: '냠냠! {n}입 남았어요', ja: 'もぐもぐ！あと{n}口', zh: '好吃！还剩{n}口' },
  finished: { en: 'All gone. That was good!', ko: '다 먹었어요. 잘 먹었습니다!', ja: '完食！ごちそうさまでした！', zh: '吃完了，真好吃！' },
  packed: { en: '{name} packed to go. Tap 🥡 to eat.', ko: '{name} 포장 완료! 🥡를 눌러 먹어요.', ja: '{name}を持ち帰りにしました。🥡で食べられます。', zh: '{name}已打包，点🥡就能吃。' },
  poor: { en: 'Not enough coins ({n} needed)', ko: '코인이 부족해요 ({n}코인 필요)', ja: 'コインが足りません（{n}枚必要）', zh: '硬币不够（需要{n}枚）' },
  busy: { en: 'Finish the dish on your table first.', ko: '식탁의 음식을 먼저 다 드세요.', ja: 'まずテーブルの料理を食べ終えてね。', zh: '先把桌上的菜吃完吧。' },
  share: { en: 'Have a bite of {name}\'s food', ko: '{name}의 음식 한 입 먹기', ja: '{name}の料理をひと口', zh: '吃一口{name}的菜', es: 'Probar la comida de {name}', ar: 'تذوّق طعام {name}', vi: 'Ăn thử một miếng của {name}', hi: '{name} के खाने से एक कौर लें', id: 'Cicipi makanan {name}' },
  took: { en: 'You had a bite of {name}\'s food. Thanks! 😋', ko: '{name}의 음식을 한 입 얻어먹었어요. 잘 먹을게요! 😋', ja: '{name}の料理をひと口もらいました。ごちそうさま！😋', zh: '吃了一口{name}的菜，谢谢款待！😋', es: 'Probaste la comida de {name}. ¡Gracias! 😋', ar: 'تذوّقت طعام {name}. شكرًا! 😋', vi: 'Bạn đã ăn thử một miếng của {name}. Cảm ơn nhé! 😋', hi: 'आपने {name} के खाने से एक कौर लिया। धन्यवाद! 😋', id: 'Kamu mencicipi makanan {name}. Makasih! 😋' },
  stolen: { en: '{name} had a bite of your food! {n} bites left', ko: '{name}이(가) 내 음식을 한 입 먹었어요! {n}입 남았어요', ja: '{name}があなたの料理をひと口食べました！あと{n}口', zh: '{name}吃了你一口菜！还剩{n}口', es: '¡{name} probó tu comida! Quedan {n} bocados', ar: 'تذوّق {name} طعامك! بقيت {n} لقمات', vi: '{name} đã ăn một miếng đồ ăn của bạn! Còn {n} miếng', hi: '{name} ने आपके खाने से एक कौर लिया! {n} कौर बाक़ी', id: '{name} mencicipi makananmu! Sisa {n} gigitan' },
  stolenLast: { en: '{name} ate the last bite!', ko: '{name}이(가) 마지막 한 입을 먹었어요!', ja: '{name}が最後のひと口を食べました！', zh: '{name}吃掉了最后一口！', es: '¡{name} se comió el último bocado!', ar: 'أكل {name} آخر لقمة!', vi: '{name} đã ăn miếng cuối cùng!', hi: '{name} ने आख़िरी कौर खा लिया!', id: '{name} menghabiskan gigitan terakhir!' },
  boxDesc: { en: 'Takeout box · {n} bites left', ko: '포장 음식 · {n}입 남음', ja: '持ち帰り · あと{n}口', zh: '外带餐盒 · 还剩{n}口' },
};

/**
 * game: { interior, seated, mode, me, clerk, others, net, safety, held, wallet,
 * shop, sfx, canvas, camera } as getters, plus missionEvent, refreshWallet,
 * recordFood, setHeld, holdNew, handReady, openMenu, clearAction() and resendState().
 */
export function createDining(game) {
  // The dish comes to your table a few seconds later; eat it in 5 bites. Or
  // order to go and carry the box (5 bites too). Prices are won on the menu,
  // paid in coins at 1 per 1,000 won.
  let meal = null; // Meal on a table in this restaurant (+ .mesh once served)
  function clearMeal() {
    if (meal?.mesh) meal.mesh.removeFromParent();
    meal = null;
  }
  function dineAction() {
    if (meal?.seat === game.seated) {
      if (!meal.ready(performance.now())) return { key: 'dine-wait', label: '⏳ ' + L(DINE_TEXT.waiting), run: () => {} };
      return { key: 'dine-eat:' + meal.bites, label: `😋 ${L(DINE_TEXT.eat)} (${meal.bites}/${FOOD_BITES})`, run: () => eatMeal() };
    }
    return { key: 'dine-menu', label: '📖 ' + L(DINE_TEXT.menu), run: () => game.openMenu() };
  }
  function makePlate(seat, product) {
    const [x, z] = seat.plate;
    const g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.02, 20), new THREE.MeshLambertMaterial({ color: '#fbfaf6' }));
    plate.position.y = 0.01;
    const food = productModel(product.model, product.color);
    food.scale.setScalar(1.5);
    food.position.y = 0.02;
    g.add(plate, food);
    g.position.set(x, 0.645, z);
    g.rotation.y = seat.ry;
    game.interior.scene.add(g);
    return { mesh: g, food };
  }
  function updateMeal() {
    syncPeerMeals();
    if (!meal || meal.mesh || !game.interior || !meal.ready(performance.now())) return;
    Object.assign(meal, makePlate(meal.seat, meal.product));
    game.resendState(); // show the dish to the room
    game.sfx.pop?.();
    const name = localName(meal.product.name, getLanguage());
    game.shop.toast(fmt(L(DINE_TEXT.served), { name }));
    game.clerk && say(game.clerk, $('labels'), ['맛있게 드세요!', 'masitge deuseyo!', fmt(L(DINE_TEXT.served), { name })]);
    game.clearAction();
  }
  function eatMeal() {
    if (!meal) return;
    const left = meal.bite(performance.now());
    game.me.play('clap');
    game.sfx.pop?.();
    if (left <= 0) { clearMeal(); game.shop.toast(L(DINE_TEXT.finished)); game.missionEvent('eat'); }
    else { meal.food.scale.setScalar(foodScale(left)); game.shop.toast(fmt(L(DINE_TEXT.bite), { n: left })); }
    game.resendState();
  }
  // Other people's dishes in this restaurant (from their state): anyone can
  // tap one to take a bite, and the owner's game counts it.
  const peerMeals = new Map(); // player id -> { key, mesh, food, seat, owner, bites }
  function clearPeerMeals() {
    for (const pm of peerMeals.values()) pm.mesh.removeFromParent();
    peerMeals.clear();
  }
  function syncPeerMeals() {
    if (game.mode !== 'store' || !isDining(game.interior?.store)) { if (peerMeals.size) clearPeerMeals(); return; }
    const seen = new Set();
    for (const [id, p] of game.others.players) {
      const m = !p.hidden && parseMealSync(p.target?.ml, game.interior.seats, game.interior.store.products);
      if (!m || m.seat === meal?.seat) continue;
      seen.add(id);
      let pm = peerMeals.get(id);
      const key = m.seatIndex + ':' + m.product.id;
      if (!pm || pm.key !== key) {
        pm?.mesh.removeFromParent();
        pm = { key, seat: m.seat, owner: id, ...makePlate(m.seat, m.product) };
        peerMeals.set(id, pm);
      }
      if (pm.bites !== m.bites) { pm.bites = m.bites; pm.food.scale.setScalar(foodScale(m.bites)); }
    }
    for (const [id, pm] of peerMeals) if (!seen.has(id)) { pm.mesh.removeFromParent(); peerMeals.delete(id); }
  }
  function nearPeerMeal(p, r = 1.3) {
    let best = null, bestD = r;
    for (const pm of peerMeals.values()) {
      const d = Math.hypot(p.x - pm.seat.plate[0], p.z - pm.seat.plate[1]);
      if (d < bestD) { bestD = d; best = pm; }
    }
    return best;
  }
  let lastSteal = 0;
  function stealBite(pm) {
    const now = performance.now();
    if (now - lastSteal < BITE_GAP_MS || !peerMeals.has(pm.owner)) return;
    lastSteal = now;
    game.net.sendEmote(biteMsg(pm.owner));
    pm.food.scale.setScalar(foodScale(pm.bites - 1)); // until their state catches up
    game.me.play('clap');
    game.sfx.pop?.();
    game.shop.toast(fmt(L(DINE_TEXT.took), { name: game.others.nameOf(pm.owner) || '?' }));
  }
  const lastBittenBy = new Map(); // id -> when they last took a bite
  function onBitten(id) {
    if (!meal?.mesh || game.safety.isBlocked(id, game.others.nameOf(id))) return;
    const at = game.others.positionOf(id);
    const [px, pz] = meal.seat.plate;
    if (!at || Math.hypot(at.x - px, at.z - pz) > BITE_REACH) return;
    const now = performance.now();
    if (now - (lastBittenBy.get(id) || 0) < BITE_GAP_MS * 0.8) return;
    lastBittenBy.set(id, now);
    const name = game.others.nameOf(id) || '?';
    const left = meal.bite(now);
    game.sfx.pop?.();
    if (left <= 0) { clearMeal(); game.shop.toast(fmt(L(DINE_TEXT.stolenLast), { name })); }
    else { meal.food.scale.setScalar(foodScale(left)); game.shop.toast(fmt(L(DINE_TEXT.stolen), { name, n: left })); }
    game.resendState();
    game.clearAction();
  }
  // Tap a dish on the table (yours: eat; someone else's: take a bite).
  {
    const tapRay = new THREE.Raycaster();
    let down = null;
    game.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    game.canvas.addEventListener('pointerup', (e) => {
      if (!down || game.mode !== 'store' || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10 || performance.now() - down.t > 500) return;
      const targets = [...peerMeals.values()].map((pm) => [pm.mesh, pm]);
      if (meal?.mesh && meal.seat === game.seated) targets.push([meal.mesh, null]);
      if (!targets.length) return;
      const r = game.canvas.getBoundingClientRect();
      tapRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), game.camera);
      const hit = tapRay.intersectObjects(targets.map((t) => t[0]), true)[0];
      if (!hit) return;
      const t = targets.find(([m]) => { let o = hit.object; while (o && o !== m) o = o.parent; return !!o; });
      if (!t) return;
      const p = game.me.root.position;
      if (!t[1]) { eatMeal(); game.clearAction(); return; }
      if (Math.hypot(p.x - t[1].seat.plate[0], p.z - t[1].seat.plate[1]) > BITE_REACH) return;
      stealBite(t[1]);
    });
  }
  function orderFood(product, togo) {
    const cost = coinPrice(product.price);
    if (!togo && meal?.seat === game.seated) { game.shop.toast(L(DINE_TEXT.busy)); return; }
    if (togo && !game.handReady()) return;
    if (!game.wallet.spend(cost, { name: product.name, at: game.interior?.store.name })) { game.shop.toast(fmt(L(DINE_TEXT.poor), { n: cost })); return; }
    game.refreshWallet();
    game.recordFood(game.interior.store, product, true);
    const name = localName(product.name, getLanguage());
    $('lp-panel').hidden = true;
    if (togo) {
      game.holdNew({ kind: takeoutKind(product), sips: FOOD_BITES, name: localName(product.name, 'en') });
      game.shop.toast(fmt(L(DINE_TEXT.packed), { name }));
      game.clerk && say(game.clerk, $('labels'), ['포장해 드릴게요!', 'pojanghae deurilgeyo!', fmt(L(DINE_TEXT.packed), { name })]);
      return;
    }
    clearMeal();
    meal = new Meal(game.seated, product, performance.now());
    game.shop.toast(fmt(L(DINE_TEXT.ordered), { name }));
    game.clerk && say(game.clerk, $('labels'), ['네, 주문 받았습니다!', 'ne, jumun badatseumnida!', fmt(L(DINE_TEXT.ordered), { name })]);
    game.clearAction();
  }

  return {
    get meal() { return meal; },
    peerMeals,
    clearMeal, dineAction, updateMeal, nearPeerMeal, stealBite, onBitten, orderFood,
  };
}
