// Wallpaper and flooring for your home, from the three wallpaper shops on the
// Euljiro furniture street (Yozi 2026-11-18: three shops, one look each,
// three wallpapers and three floors a shop). Bought once each (an item with a
// server receipt, like furniture), then picked in Decorate; the room's own
// look stays as "Basic". Visitors see the host's choice.
//
// This file is the light part (names, prices, the choice): it is in the first
// download for the bag and the shop. The patterns are drawn in
// core/home-finish-art.js, which loads with the rooms.
//
// [id, emoji, swatch [base, accent], price (won), name]
const W = 'wall', F = 'floor';
export const FINISHES = [
  // --- 한옥 지물포: traditional ---
  [W, 'wall-hanji', '📜', ['#f4ecd8', '#e6d9b8'], 60000, { en: 'Hanji paper wall', ko: '한지 벽지', ja: '韓紙の壁紙', zh: '韩纸壁纸' }],
  [W, 'wall-changho', '🪟', ['#f6efdc', '#8a6440'], 90000, { en: 'Lattice door wall', ko: '띠살 창호 벽지', ja: '格子戸の壁紙', zh: '格子门壁纸' }],
  [W, 'wall-maehwa', '🌸', ['#f3eee2', '#3a3230'], 120000, { en: 'Plum blossom ink wall', ko: '매화 수묵 벽지', ja: '梅の水墨画の壁紙', zh: '梅花水墨壁纸' }],
  [F, 'floor-kongdam', '🟨', ['#e2b45a', '#c8963e'], 80000, { en: 'Oiled paper floor (jangpan)', ko: '콩댐 장판', ja: '油紙の床（チャンパン）', zh: '油纸地板（炕纸）' }],
  [F, 'floor-maru', '🪵', ['#b88250', '#8a5a32'], 150000, { en: 'Daecheong wooden floor', ko: '대청마루', ja: '大庁の板の間', zh: '大厅木地板' }],
  [F, 'floor-wanggol', '🎋', ['#d9c890', '#b8a468'], 100000, { en: 'Woven sedge mat', ko: '왕골 돗자리', ja: 'ワンゴルのござ', zh: '莞草席' }],
  // --- 을지 레트로 벽지: retro ---
  [W, 'wall-flower70', '🌼', ['#f6e2b0', '#d9653a'], 80000, { en: '70s flower wall', ko: '70년대 꽃무늬 벽지', ja: '70年代の花柄の壁紙', zh: '70年代花纹壁纸' }],
  [W, 'wall-check', '🟫', ['#efe2c6', '#b0583a'], 60000, { en: 'Check wall', ko: '체크 벽지', ja: 'チェックの壁紙', zh: '格纹壁纸' }],
  [W, 'wall-greentile', '🟩', ['#f2eee0', '#3f8a6a'], 110000, { en: 'Green tile half wall', ko: '초록 타일 반벽', ja: '緑のタイル腰壁', zh: '绿瓷砖半墙' }],
  [F, 'floor-checker', '🏁', ['#f2ede2', '#2a2a2e'], 120000, { en: 'Checkerboard tiles', ko: '체스판 타일', ja: '市松模様のタイル', zh: '棋盘格地砖' }],
  [F, 'floor-terrazzo', '🪨', ['#d8d2c4', '#7a7266'], 140000, { en: 'Terrazzo floor', ko: '도끼다시 바닥', ja: 'テラゾーの床', zh: '水磨石地面' }],
  [F, 'floor-flowermat', '🌺', ['#e8c890', '#c0503a'], 80000, { en: 'Flower vinyl floor', ko: '꽃무늬 장판', ja: '花柄のクッションフロア', zh: '花纹地板革' }],
  // --- 새벽 인테리어: modern ---
  [W, 'wall-white', '🤍', ['#fbfaf7', '#e8e4dc'], 60000, { en: 'White paint wall', ko: '화이트 페인트 벽', ja: '白いペンキの壁', zh: '白色涂料墙' }],
  [W, 'wall-sage', '🌿', ['#b8c8b0', '#a3b59a'], 80000, { en: 'Sage green wall', ko: '세이지 그린 벽', ja: 'セージグリーンの壁', zh: '鼠尾草绿墙' }],
  [W, 'wall-stripe', '🦓', ['#efe6d6', '#d6c6a8'], 100000, { en: 'Beige stripe wall', ko: '베이지 줄무늬 벽지', ja: 'ベージュのストライプ壁紙', zh: '米色条纹壁纸' }],
  [F, 'floor-herringbone', '🪵', ['#c89a66', '#a87a4a'], 150000, { en: 'Herringbone oak floor', ko: '헤링본 원목 마루', ja: 'ヘリンボーンの無垢フローリング', zh: '人字纹实木地板' }],
  [F, 'floor-concrete', '⬜', ['#b4b2ae', '#9a9894'], 90000, { en: 'Polished concrete', ko: '폴리싱 콘크리트', ja: '磨きコンクリート', zh: '抛光水泥地' }],
  [F, 'floor-marble', '🤍', ['#f0eeea', '#a8a6a4'], 140000, { en: 'Marble tiles', ko: '대리석 타일', ja: '大理石のタイル', zh: '大理石地砖' }],
].map(([kind, id, emoji, swatch, price, name]) => ({ kind, id, emoji, swatch, price, name }));

export const finishById = (id) => FINISHES.find((f) => f.id === id) || null;
export const FINISH_IDS = FINISHES.map((f) => [f.id, f.emoji, f.name]);

// The choice: { wall, floor }, each a finish id or null (the room's own look).
// mk.* rides in the account save.
export const FINISH_KEY = 'mk.homeFinish';
export function cleanFinish(v, owns = () => true) {
  const pick = (id, kind) => (finishById(id)?.kind === kind && owns(id) ? id : null);
  return { wall: pick(v?.wall, W), floor: pick(v?.floor, F) };
}
export function readFinish(owns, storage = globalThis.localStorage) {
  try { return cleanFinish(JSON.parse(storage.getItem(FINISH_KEY) || 'null'), owns); } catch { return cleanFinish(null); }
}
export function writeFinish(v, storage = globalThis.localStorage) {
  try { storage.setItem(FINISH_KEY, JSON.stringify(cleanFinish(v))); } catch { /* storage blocked */ }
}
