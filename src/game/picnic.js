// Picnic mats (core/picnic-mat.js) in the Han River park and on the street's
// park lawns (Seoul Forest): spread the mat from your bag on the grass, lie
// down or sit on it, fold it up again. Everyone there sees the mats (the
// owner's "mt" state) and can take a free spot.
//
// The game's live state comes in through `game` (getters), as in dining.js.
import { MAT_COLORS, makeMat, matSpots, encodeMat, parseMat, canSpread, matInFront, matsOverlap, keepsMat, matLost, MAT_NEAR, matDir } from '../core/picnic-mat.js';
import { L } from '../ui/pocha-ui.js';

export const MAT_TEXT = {
  spread: { en: 'Spread picnic mat', ko: '돗자리 펴기', ja: 'レジャーシートを広げる', zh: '铺野餐垫', es: 'Extender la manta', id: 'Gelar tikar piknik', vi: 'Trải thảm picnic', hi: 'पिकनिक चटाई बिछाएँ', ar: 'افرش حصيرة النزهة' },
  fold: { en: 'Fold up picnic mat', ko: '돗자리 접기', ja: 'レジャーシートをたたむ', zh: '收起野餐垫', es: 'Recoger la manta', id: 'Lipat tikar piknik', vi: 'Gấp thảm picnic', hi: 'पिकनिक चटाई समेटें', ar: 'اطوِ حصيرة النزهة' },
  lie: { en: 'Lie down', ko: '눕기', ja: '寝転ぶ', zh: '躺下', es: 'Tumbarse', id: 'Berbaring', vi: 'Nằm xuống', hi: 'लेट जाएँ', ar: 'استلقِ' },
  sit: { en: 'Sit on the mat', ko: '돗자리에 앉기', ja: 'シートに座る', zh: '坐在垫子上', es: 'Sentarse en la manta', id: 'Duduk di tikar', vi: 'Ngồi trên thảm', hi: 'चटाई पर बैठें', ar: 'اجلس على الحصيرة' },
  spreadDone: { en: 'Mat spread! Up to four people can lie or sit on it. 🧺', ko: '돗자리를 폈어요! 네 명까지 눕거나 앉을 수 있어요. 🧺', ja: 'シートを広げました！4人まで寝転んだり座ったりできます。🧺', zh: '野餐垫铺好了！最多可以躺或坐四个人。🧺' },
  lawn: { en: 'Spread it on an open patch of green grass.', ko: '초록 잔디의 빈 곳에 펴 주세요.', ja: '緑の芝生の空いている所に広げてね。', zh: '请铺在空着的绿色草地上。' },
  taken: { en: 'Someone\'s mat is already there. Try a free spot.', ko: '이미 다른 사람의 돗자리가 있어요. 빈 곳을 찾아 보세요.', ja: 'そこには誰かのシートがあります。空いている所を探してね。', zh: '那里已经有别人的野餐垫了，换个空地吧。' },
  folded: { en: 'Mat folded back into your bag.', ko: '돗자리를 접어서 가방에 넣었어요.', ja: 'シートをたたんでバッグに入れました。', zh: '野餐垫已收回包里。' },
  bumped: { en: 'Someone spread a mat there just before you, so yours went back in the bag.', ko: '방금 다른 사람이 먼저 그 자리에 돗자리를 폈어요. 내 돗자리는 가방에 다시 넣었어요.', ja: '直前に誰かがそこに広げたので、シートはバッグに戻しました。', zh: '有人刚刚先在那里铺了垫子，你的已放回包里。' },
  // A mat left alone too long, or far behind (matLost): it is gone.
  lost: [
    { en: 'A gust of wind blew your picnic mat away! 🌬️', ko: '바람이 휙 불어서 돗자리가 날아갔어요! 🌬️', ja: '風がびゅっと吹いて、レジャーシートが飛んでいっちゃった！🌬️', zh: '一阵风吹来，你的野餐垫被吹走了！🌬️' },
    { en: 'The park keeper tidied away your picnic mat, left alone for too long. 🧹', ko: '오래 비워 둔 돗자리를 공원 관리인이 치웠어요. 🧹', ja: '長い間放っておいたシートを公園の管理人さんが片付けました。🧹', zh: '你放了太久没人管的野餐垫被公园管理员收走了。🧹' },
    { en: 'A puppy ran off with your picnic mat! 🐶', ko: '강아지가 돗자리를 물고 도망갔어요! 🐶', ja: '子犬がレジャーシートをくわえて逃げていった！🐶', zh: '一只小狗叼着你的野餐垫跑掉了！🐶' },
  ],
  have: { en: 'You already have a picnic mat in your bag.', ko: '가방에 이미 돗자리가 있어요.', ja: 'もうバッグにレジャーシートがあります。', zh: '包里已经有野餐垫了。' },
};

export const hasMat = (bag) => bag.list().some((e) => e.kind === 'gift' && e.g === 'mat');

/**
 * game: { interior, mode, seated, me, others, bag, shop, myId } as getters,
 * plus standUp(), resendState() and clearAction(). street: the street's park
 * lawns as a place like the park interior ({ scene, lawns, colliders, seats,
 * blocked }), or null.
 */
export function createPicnic(game, street = null) {
  let mine = null; // { x, z, c } while my mat is spread
  let lastUsed = 0; // when I was last by my mat (it goes if left alone, see matLost)
  let room = null; // the park interior the mats belong to
  let baseSeats = null; // the park's own seats (benches, tables)
  const drawn = new Map(); // owner id -> { key, mesh, mat }

  function reset() {
    // (the street's seats stay around: put back the ones that aren't mats)
    if (room && baseSeats) { room.seats.length = 0; room.seats.push(...baseSeats); }
    for (const d of drawn.values()) d.mesh.removeFromParent();
    drawn.clear();
    mine = null;
    room = null;
    baseSeats = null;
  }

  // Mats in the park right now: mine and everyone else's.
  function mats() {
    const out = [];
    if (mine) out.push({ id: game.myId, m: mine });
    for (const [id, p] of game.others.players) {
      const m = !p.hidden && parseMat(p.target?.mt, room?.lawns);
      if (m) out.push({ id, m });
    }
    return out;
  }

  function tick() {
    const it = game.mode === 'store' ? (game.interior?.lawns ? game.interior : null) : game.mode === 'street' ? street : null;
    if (it !== room) { reset(); room = it; baseSeats = it ? it.seats.slice() : null; if (!it) return; }
    if (!room) return;
    if (mine) {
      const p = game.me.root.position, now = Date.now();
      if (Math.hypot(p.x - mine.x, p.z - mine.z) < MAT_NEAR) lastUsed = now;
      if (matLost(mine, p.x, p.z, lastUsed, now)) { lose(); return tick(); }
    }
    const all = mats();
    // Two mats spread on the same spot at once: the lower id keeps it.
    if (mine && all.some((o) => o.id !== game.myId && matsOverlap(mine, o.m) && !keepsMat(game.myId, o.id))) {
      fold(true);
      return tick();
    }
    let changed = false;
    const seen = new Set();
    for (const { id, m } of all) {
      seen.add(id);
      const key = encodeMat(m);
      const d = drawn.get(id);
      if (d?.key === key) continue;
      d?.mesh.removeFromParent();
      const mesh = makeMat(m.c);
      mesh.position.set(m.x, 0, m.z);
      mesh.rotation.y = (m.d | 0) * Math.PI / 2; // the way its owner faced
      room.scene.add(mesh);
      drawn.set(id, { key, mesh, mat: m });
      changed = true;
    }
    for (const [id, d] of drawn) if (!seen.has(id)) { d.mesh.removeFromParent(); drawn.delete(id); changed = true; }
    if (changed) {
      room.seats.length = 0;
      room.seats.push(...baseSeats);
      for (const d of drawn.values()) room.seats.push(...matSpots(d.mat).map((q) => (room === street ? { ...q, street: true } : q)));
      // Lying on a mat that's just been folded away: get up.
      const s = game.seated;
      if (s?.mat && !room.seats.some((q) => q.mat && Math.hypot(q.x - s.x, q.z - s.z) < 0.05)) game.standUp();
    }
  }

  function spread() {
    const p = game.me.root.position;
    const at = matInFront(p.x, p.z, game.me.root.rotation.y);
    const d = matDir(game.me.root.rotation.y); // sit facing where you looked
    const m = { ...at, c: Math.floor(Math.random() * MAT_COLORS.length), ...(d ? { d } : {}) };
    const why = canSpread(m, { lawns: room.lawns, colliders: room.colliders, mats: mats().map((o) => o.m), blocked: room.blocked });
    if (why !== 'ok') { game.shop.toast(L(MAT_TEXT[why])); return; }
    mine = m;
    lastUsed = Date.now();
    game.me.play?.('cheer');
    game.shop.toast(L(MAT_TEXT.spreadDone));
    game.resendState();
    game.clearAction();
    tick();
  }

  function fold(bumped = false) {
    if (!mine) return;
    mine = null;
    game.shop.toast(L(bumped ? MAT_TEXT.bumped : MAT_TEXT.folded));
    game.resendState();
    game.clearAction();
  }

  // Left alone too long or far behind: the mat is gone, from the bag too.
  function lose() {
    mine = null;
    const i = game.bag.list().findIndex((e) => e.kind === 'gift' && e.g === 'mat');
    if (i >= 0) game.bag.take(i);
    const lines = MAT_TEXT.lost;
    game.shop.toast(L(lines[Math.floor(Math.random() * lines.length)]));
    game.resendState();
    game.clearAction();
  }

  // The action-button choice for the mat, or null: spread it (on the lawn,
  // with one in the bag) or fold it up (standing by your own mat).
  function action(p) {
    if (!room || game.seated) return null;
    if (mine) {
      const near = Math.abs(p.x - mine.x) < 2.2 && Math.abs(p.z - mine.z) < 1.9;
      return near ? { key: 'mat-fold', label: '🧺 ' + L(MAT_TEXT.fold), run: () => fold() } : null;
    }
    if (!hasMat(game.bag)) return null;
    // Only where it fits: open grass, clear of trees, benches and other mats
    // (standing on someone's mat you get "Lie down" instead).
    const ahead = { ...matInFront(p.x, p.z, game.me.root.rotation.y), c: 0, d: matDir(game.me.root.rotation.y) };
    if (canSpread(ahead, { lawns: room.lawns, colliders: room.colliders, mats: mats().map((o) => o.m), blocked: room.blocked }) !== 'ok') return null;
    return { key: 'mat-spread', label: '🧺 ' + L(MAT_TEXT.spread), run: () => spread() };
  }

  return {
    tick, action, fold,
    // For our state: "x,z,c" while our mat is spread.
    get sync() { return mine && room ? encodeMat(mine) : null; },
    get mine() { return mine; },
    // If the mat leaves the bag (sold, given away), it can't stay spread.
    checkBag() { if (mine && !hasMat(game.bag)) fold(); },
  };
}
