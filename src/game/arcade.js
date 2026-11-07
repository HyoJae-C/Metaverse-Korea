// The batting cage, the shooting gallery in Another Land and darts at Bar
// Hush (core/arcade.js). Free skill games: no coins in or out, only your own
// best record. Their panels are loaded the first time you play one.
import { L, fmt } from '../ui/pocha-ui.js';
import { dartColorOf, dartPack, dartPinMsg, dartsGoMsg, dartsMsg, pickDartColor } from '../core/arcade.js';

export function createArcade(game) {
  const { $, cam, myId, safety, sfx, shop } = game;
  const arcade = {}; // kind → its UI, once loaded
  const arcadePanel = (kind) => ({ get open() { return !!arcade[kind]?.open; }, close() { arcade[kind]?.close(); } });
  const battingUi = arcadePanel('batting'), galleryUi = arcadePanel('gallery'), hauntUi = arcadePanel('hauntGallery'), dartsUi = arcadePanel('darts');
  const arcadeLoading = {}; // kind → its panel's import, while it loads
  let dartsInvite = null; // { from, name, at }: someone in the bar challenged you
  let dartsBoard = 0; // which of the bar's wall boards you play at
  // Flight colours (DART_COLORS), one per player: with friends, in line-up
  // order each takes the colour from their id or the next one still free (the
  // same on every screen); alone, a colour nobody on the boards throws now.
  function dartColors(ids) {
    if (ids.length === 1) return [pickDartColor(dartColorOf(myId), game.interior?.dartPins?.colorsInUse(myId) || [])];
    const out = [];
    for (const id of ids) out.push(pickDartColor(dartColorOf(id), out));
    return out;
  }
  const freshInvite = () => (dartsInvite && performance.now() - dartsInvite.at < 60000 && game.others.nameOf(dartsInvite.from) ? dartsInvite : null);
  async function openArcade(kind) {
    // Turn to face the cage, the targets or the board, with the camera behind you.
    const p = game.me.root.position, near = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const st = (game.interior?.stations?.[kind] || []).filter((q) => near(q) < 2.5).sort((a, b) => near(a) - near(b))[0];
    if (kind === 'darts') dartsBoard = st?.board ?? 0; // the bar has two boards: the one you stand at
    if (st?.ry != null) { game.me.root.rotation.y = st.ry; cam.yaw = st.ry + Math.PI; }
    if (!arcade[kind]) {
      // The first time, the panel loads: by then you may have walked off or
      // left; open it only if you are still in the same place.
      const at = game.interior;
      const ui = await (arcadeLoading[kind] ||= makeArcade(kind));
      arcade[kind] ||= ui;
      if (game.interior !== at || !game.interior?.stations?.[kind]?.some((q) => Math.hypot(game.me.root.position.x - q.x, game.me.root.position.z - q.z) < 3)) return;
    }
    if (!arcade[kind].open) arcade[kind].show();
  }
  async function makeArcade(kind) {
    {
      let ui;
      if (kind === 'batting') {
        const { BattingUI } = await import('../ui/batting-ui.js');
        ui = new BattingUI({
          root: $('batting-panel'), store: localStorage,
          onResult: (r) => {
            if (r === 'homerun' || r === 'hit') sfx.tock(1, r === 'homerun' ? 1200 : 900);
            if (r === 'homerun') game.me.play('cheer');
          },
        });
      } else if (kind === 'gallery') {
        const { GalleryUI } = await import('../ui/gallery-ui.js');
        ui = new GalleryUI({ root: $('gallery-panel'), store: localStorage, onPop: () => sfx.tock(0.6, 1500) });
      } else if (kind === 'hauntGallery') { // the haunted house's ghost lantern (same rules, its own look and record)
        const { GalleryUI, HAUNT_THEME } = await import('../ui/gallery-ui.js');
        ui = new GalleryUI({ root: $('haunt-panel'), store: localStorage, theme: HAUNT_THEME, onPop: () => sfx.tock(0.5, 700) });
      } else if (kind === 'darts') {
        const { DartsUI } = await import('../ui/darts-ui.js');
        ui = new DartsUI({
          root: $('darts-panel'), store: localStorage,
          myId, nameOf: (id) => game.others.nameOf(id),
          friends: () => game.others.nearbyFree(game.me.root.position.x, game.me.root.position.z, 6),
          sendGo: (to, mode, ids) => game.net.sendEmote(dartsGoMsg(to, mode, ids)),
          invite: freshInvite,
          clearInvite: () => { dartsInvite = null; },
          send: (to, k, thrown, total, extra) => game.net.sendEmote(dartsMsg(to, k, thrown, total, extra)),
          onThrow: (pts) => { sfx.tock(0.7, 600); if (pts >= 50) game.me.play('cheer'); },
          colors: dartColors,
          // Our dart sticks in the wall board, and everyone in the bar sees it.
          onDart: (at, color) => {
            game.interior?.dartPins?.add(myId, dartsBoard, color, at.x, at.y);
            game.net.sendEmote(dartPinMsg(dartsBoard, color, dartPack(at.x), dartPack(at.y)));
          },
        });
      }
      return ui;
    }
  }
  // Darts messages for me: a challenge waits up to a minute for you to walk to
  // the board; the rest goes to the darts panel.
  function onDartsMsg(from, m) {
    if (safety.isBlocked(from, game.others.nameOf(from))) return;
    if (m.kind === 'i') {
      dartsInvite = { from, name: game.others.nameOf(from) || '?', at: performance.now() };
      shop.toast(fmt(L(DARTS_INVITE), { name: dartsInvite.name }));
    } else if (m.kind === 'n' && dartsInvite?.from === from) dartsInvite = null;
    arcade.darts?.heard(from, m);
  }
  const DARTS_INVITE = {
    en: '🎯 {name} challenges you to darts! Go to the dartboard to play.',
    ko: '🎯 {name}님이 다트 대결을 신청했어요! 다트판으로 가서 받아 보세요.',
    ja: '🎯 {name}さんがダーツで勝負を挑んできました！ダーツボードへ。',
    zh: '🎯 {name}向你发起飞镖挑战！去飞镖靶那里接受吧。',
    es: '🎯 ¡{name} te reta a los dardos! Ve a la diana para jugar.',
    id: '🎯 {name} menantangmu main dart! Pergi ke papan dart untuk main.',
    vi: '🎯 {name} thách bạn chơi phi tiêu! Đến bảng phi tiêu để chơi.',
    hi: '🎯 {name} ने आपको डार्ट्स की चुनौती दी! खेलने के लिए डार्टबोर्ड पर जाएँ।',
    ar: '🎯 {name} يتحداك في رمي السهام! اذهب إلى اللوحة لتلعب.',
  };
  const ARCADE_OPEN = {
    batting: { en: 'Batting cage', ko: '야구 연습장', ja: 'バッティング', zh: '棒球击球', es: 'Jaula de bateo', id: 'Latihan memukul', vi: 'Tập đánh bóng', hi: 'बैटिंग', ar: 'قفص الضرب' },
    gallery: { en: 'Balloon shooting', ko: '풍선 사격', ja: '風船射的', zh: '气球射击', es: 'Tiro al globo', id: 'Tembak balon', vi: 'Bắn bóng bay', hi: 'गुब्बारा निशानेबाज़ी', ar: 'رماية البالونات' },
    hauntGallery: { en: 'Ghost lantern', ko: '유령 랜턴', ja: 'おばけランタン', zh: '幽灵灯笼', es: 'Farol de fantasmas', id: 'Lentera hantu', vi: 'Đèn lồng ma', hi: 'भूत लालटेन', ar: 'فانوس الأشباح' },
    darts: { en: 'Play darts', ko: '다트 하기', ja: 'ダーツをする', zh: '玩飞镖', es: 'Jugar a los dardos', id: 'Main dart', vi: 'Chơi phi tiêu', hi: 'डार्ट्स खेलें', ar: 'العب السهام' },
  };
  return { onDartsMsg, arcade, galleryUi, hauntUi, battingUi, dartsUi, ARCADE_OPEN, openArcade,
    freshInvite };
}
