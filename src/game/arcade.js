// The batting cage, the shooting gallery in Another Land and darts at Bar
// Hush (core/arcade.js). Free skill games: no coins in or out, only your own
// best record (and a small teddy bear for a gold at the balloon booth). Their panels are loaded the first time you play one.
import { L, fmt } from '../ui/pocha-ui.js';
import { DART_COLORS, dartColorOf, dartPack, dartPinMsg, dartsGoMsg, dartsMsg, pickDartColor } from '../core/arcade.js';
import { WordFx } from '../core/runway-fx.js';

const INVITE_MS = 28000; // a little under the host's 30 s wait (ui/darts-ui.js)
const ASK_CSS = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:40;background:rgba(255,255,255,.96);border-radius:16px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.2);font:600 15px system-ui,sans-serif;color:#2b2230;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px)';
const PLACE_SIZE = [1.1, 0.8, 0.62, 0.5]; // m tall: 1st, 2nd, 3rd, 4th
const DARTS_PLACE = [
  { en: '🥇 1st!', ko: '🥇 1등!', ja: '🥇 1位！', zh: '🥇 第1名！', es: '🥇 ¡1.º!', id: '🥇 Juara 1!', vi: '🥇 Hạng 1!', hi: '🥇 पहला!', fr: '🥇 1er !', th: '🥇 ที่ 1!', ar: '🥇 الأول!' },
  { en: '🥈 2nd', ko: '🥈 2등', ja: '🥈 2位', zh: '🥈 第2名', es: '🥈 2.º', id: '🥈 Juara 2', vi: '🥈 Hạng 2', hi: '🥈 दूसरा', fr: '🥈 2e', th: '🥈 ที่ 2', ar: '🥈 الثاني' },
  { en: '🥉 3rd', ko: '🥉 3등', ja: '🥉 3位', zh: '🥉 第3名', es: '🥉 3.º', id: '🥉 Juara 3', vi: '🥉 Hạng 3', hi: '🥉 तीसरा', fr: '🥉 3e', th: '🥉 ที่ 3', ar: '🥉 الثالث' },
  { en: '4th', ko: '4등', ja: '4位', zh: '第4名', es: '4.º', id: 'Juara 4', vi: 'Hạng 4', hi: 'चौथा', fr: '4e', th: 'ที่ 4', ar: 'الرابع' },
];
const ASK_BTN = 'border:0;border-radius:12px;padding:10px 14px;font:600 15px system-ui,sans-serif;color:#2b2230;cursor:pointer';

export function createArcade(game) {
  const { $, myId, safety, sfx, shop } = game;
  const arcade = {}; // kind → its UI, once loaded
  const arcadePanel = (kind) => ({ get open() { return !!arcade[kind]?.open; }, close() { arcade[kind]?.close(); } });
  const bowlingUi = arcadePanel('bowling'), climbUi = arcadePanel('climbing'), aimUi = arcadePanel('aim');
  const battingUi = arcadePanel('batting'), galleryUi = arcadePanel('gallery'), hauntUi = arcadePanel('hauntGallery'), dartsUi = arcadePanel('darts');
  const arcadeLoading = {}; // kind → its panel's import, while it loads
  let dartsInvite = null; // { from, name, at }: someone in the bar challenged you
  let dartsBoard = 0; // which of the bar's wall boards you play at
  let dartsView = null; // the camera on the wall board while you play (game/darts-view.js)
  let bowlView = null, bowlLane = null; // the same on the bowling lane you stand at (game/bowling-view.js)
  // Flight colours (DART_COLORS), one per player: with friends, in line-up
  // order each takes the colour from their id or the next one still free (the
  // same on every screen); alone, a colour nobody on the boards throws now.
  function dartColors(ids) {
    if (ids.length === 1) return [pickDartColor(dartColorOf(myId), game.interior?.dartPins?.colorsInUse(myId) || [])];
    const out = [];
    for (const id of ids) out.push(pickDartColor(dartColorOf(id), out));
    return out;
  }
  // The host gives up on an invite after 30 s (ui/darts-ui.js WAIT_ACCEPT),
  // so accepting later would only wait for a game that never starts.
  const freshInvite = () => (dartsInvite && performance.now() - dartsInvite.at < INVITE_MS && game.others.nameOf(dartsInvite.from) ? dartsInvite : null);
  // The invite card: it stays up (with Play / No thanks) until the invite
  // runs out, so a friend who is just standing in the bar still sees it and
  // can join from where they are; the game is played on the wall board's own
  // camera (game/darts-view.js), so they need not walk to the throw line.
  let ask = null, askTimer = 0;
  function closeAsk() { clearTimeout(askTimer); ask?.remove(); ask = null; }
  function showAsk(inv) {
    closeAsk();
    ask = document.createElement('div');
    ask.id = 'darts-ask';
    ask.style.cssText = ASK_CSS;
    const h = document.createElement('div');
    h.textContent = fmt(L(DARTS_INVITE), { name: inv.name });
    ask.append(h);
    for (const [label, run, bg] of [[L(DARTS_ASK.yes), acceptInvite, '#ffd36b'], [L(DARTS_ASK.no), () => declineInvite(inv), '#eee']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = ASK_BTN + ';background:' + bg;
      b.onclick = () => { closeAsk(); run(); };
      ask.append(b);
    }
    document.body.append(ask);
    askTimer = setTimeout(closeAsk, Math.max(0, INVITE_MS - (performance.now() - inv.at)));
  }
  function declineInvite(inv) {
    if (dartsInvite === inv) dartsInvite = null;
    game.net.sendEmote(dartsMsg(inv.from, 'n'));
  }
  async function acceptInvite() {
    const inv = freshInvite(), at = game.interior;
    const boards = at?.stations?.darts || [];
    if (!inv || !boards.length) return;
    const p = game.me.root.position;
    dartsBoard = [...boards].sort((a, b) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z))[0].board ?? 0;
    const ui = await (arcadeLoading.darts ||= makeArcade('darts'));
    arcade.darts ||= ui;
    if (game.interior !== at || freshInvite() !== inv) return; // walked out, or it ran out while loading
    if (!ui.open) ui.show();
    ui.accept(inv);
  }
  async function openArcade(kind) {
    // Turn to face the cage, the targets or the board (the camera stays as the player has it).
    const p = game.me.root.position, near = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const st = (game.interior?.stations?.[kind] || []).filter((q) => near(q) < 2.5).sort((a, b) => near(a) - near(b))[0];
    if (kind === 'darts') dartsBoard = st?.board ?? 0; // the bar has two boards: the one you stand at
    if (kind === 'bowling') bowlLane = st || null;
    if (st?.ry != null) game.me.root.rotation.y = st.ry;
    if (!arcade[kind]) {
      // The first time, the panel loads: by then you may have walked off or
      // left; open it only if you are still in the same place.
      const at = game.interior;
      const ui = await (arcadeLoading[kind] ||= makeArcade(kind));
      arcade[kind] ||= ui;
      if (game.interior !== at || !game.interior?.stations?.[kind]?.some((q) => Math.hypot(game.me.root.position.x - q.x, game.me.root.position.z - q.z) < 3)) return;
    }
    if (kind === 'darts') closeAsk(); // the panel has its own Join button
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
      } else if (kind === 'bowling' || kind === 'climbing' || kind === 'aim') { // the modern activities (ui/activity-ui.js)
        const { BowlingUI, ClimbUI, AimUI } = await import('../ui/activity-ui.js');
        if (kind === 'bowling') {
          const { createBowlingView } = await import('./bowling-view.js');
          bowlView = createBowlingView(game, () => bowlLane);
        }
        if (kind === 'bowling') ui = new BowlingUI({ root: $('bowling-panel'), store: localStorage, view: bowlView, onHit: () => sfx.tock(1, 260), onRoll: (n, k) => { sfx.tock(0.8, 500 + n * 60); if (k === 'strike') game.me.play('cheer'); } });
        else if (kind === 'climbing') ui = new ClimbUI({ root: $('climb-panel'), store: localStorage, onTop: () => game.me.play('cheer'), onFall: () => sfx.tock(0.6, 300) });
        else ui = new AimUI({ root: $('aim-panel'), store: localStorage, onHit: () => sfx.tock(0.5, 1400) });
      } else if (kind === 'gallery') {
        const { GalleryUI } = await import('../ui/gallery-ui.js');
        ui = new GalleryUI({
          root: $('gallery-panel'), store: localStorage, onPop: () => sfx.tock(0.6, 1500),
          give: game.give, onGold: () => game.me.play('cheer'),
        });
      } else if (kind === 'hauntGallery') { // the haunted house's ghost lantern (same rules, its own look and record)
        const { GalleryUI, HAUNT_THEME } = await import('../ui/gallery-ui.js');
        ui = new GalleryUI({ root: $('haunt-panel'), store: localStorage, theme: HAUNT_THEME, onPop: () => sfx.tock(0.5, 700) });
      } else if (kind === 'darts') {
        const [{ DartsUI }, { createDartsView }] = await Promise.all([import('../ui/darts-ui.js'), import('./darts-view.js')]);
        dartsView = createDartsView(game, () => dartsBoard);
        ui = new DartsUI({
          view: dartsView,
          root: $('darts-panel'), store: localStorage,
          myId, nameOf: (id) => game.others.nameOf(id),
          friends: () => game.others.nearbyFree(game.me.root.position.x, game.me.root.position.z, 6),
          sendGo: (to, mode, ids) => game.net.sendEmote(dartsGoMsg(to, mode, ids)),
          invite: freshInvite,
          clearInvite: () => { dartsInvite = null; },
          send: (to, k, thrown, total, extra) => game.net.sendEmote(dartsMsg(to, k, thrown, total, extra)),
          onEnd: showPlaces,
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
  // The end of a game with friends: over each player's head their place, in
  // their dart colour, the bigger the better (like the runway's photo words
  // at DDP); the winner cheers. Every screen works it out the same.
  let placeFx = null;
  function showPlaces(places) {
    const scene = game.activeScene;
    if (!scene) return;
    placeFx ||= new WordFx(4);
    placeFx.attach(scene);
    for (const p of places) {
      const ch = p.me ? game.me : game.others.charOf(p.id);
      if (!ch?.root) continue;
      const { x, y, z } = ch.root.position, k = Math.min(p.place, 4) - 1;
      placeFx.pop(x, y + 2.3 + PLACE_SIZE[k] * 0.3, z, L(DARTS_PLACE[k]), DART_COLORS[p.color] || '#ffd166', false, PLACE_SIZE[k], 3.5);
      if (p.place === 1) ch.play?.('cheer');
    }
  }
  // Darts messages for me: a challenge waits up to a minute for you to walk to
  // the board; the rest goes to the darts panel.
  function onDartsMsg(from, m) {
    if (safety.isBlocked(from, game.others.nameOf(from))) return;
    if (m.kind === 'i') {
      dartsInvite = { from, name: game.others.nameOf(from) || '?', at: performance.now() };
      if (arcade.darts?.open) shop.toast(fmt(L(DARTS_INVITE), { name: dartsInvite.name }), 4000);
      else showAsk(dartsInvite);
      sfx.tock(0.6, 900);
    } else if (m.kind === 'n' && dartsInvite?.from === from) { dartsInvite = null; closeAsk(); }
    arcade.darts?.heard(from, m);
  }
  const DARTS_INVITE = {
    en: '🎯 {name} challenges you to darts!',
    ko: '🎯 {name}님이 다트 대결을 신청했어요!',
    ja: '🎯 {name}さんがダーツで勝負を挑んできました！',
    zh: '🎯 {name}向你发起飞镖挑战！',
    es: '🎯 ¡{name} te reta a los dardos!',
    id: '🎯 {name} menantangmu main dart!',
    vi: '🎯 {name} thách bạn chơi phi tiêu!',
    hi: '🎯 {name} ने आपको डार्ट्स की चुनौती दी!',
    fr: '🎯 {name} te défie aux fléchettes !',
    th: '🎯 {name} ท้าคุณปาเป้า!',
    ar: '🎯 {name} يتحداك في رمي السهام!',
  };
  const DARTS_ASK = {
    yes: { en: '🤝 Play', ko: '🤝 같이 하기', ja: '🤝 一緒にやる', zh: '🤝 一起玩', es: '🤝 Jugar', id: '🤝 Main', vi: '🤝 Chơi', hi: '🤝 खेलें', fr: '🤝 Jouer', th: '🤝 เล่นด้วย', ar: '🤝 العب' },
    no: { en: 'No thanks', ko: '괜찮아요', ja: 'やめておく', zh: '不了', es: 'No, gracias', id: 'Tidak, terima kasih', vi: 'Không, cảm ơn', hi: 'नहीं, धन्यवाद', fr: 'Non merci', th: 'ไม่เป็นไร', ar: 'لا، شكرًا' },
  };
  const ARCADE_OPEN = {
    batting: { en: 'Batting cage', ko: '야구 연습장', ja: 'バッティング', zh: '棒球击球', es: 'Jaula de bateo', id: 'Latihan memukul', vi: 'Tập đánh bóng', hi: 'बैटिंग', fr: 'Cage de batting', th: 'ตู้ตีเบสบอล', ar: 'قفص الضرب' },
    gallery: { en: 'Balloon shooting', ko: '풍선 사격', ja: '風船射的', zh: '气球射击', es: 'Tiro al globo', id: 'Tembak balon', vi: 'Bắn bóng bay', hi: 'गुब्बारा निशानेबाज़ी', fr: 'Tir aux ballons', th: 'ยิงลูกโป่ง', ar: 'رماية البالونات' },
    hauntGallery: { en: 'Ghost lantern', ko: '유령 랜턴', ja: 'おばけランタン', zh: '幽灵灯笼', es: 'Farol de fantasmas', id: 'Lentera hantu', vi: 'Đèn lồng ma', hi: 'भूत लालटेन', fr: 'Lanterne à fantômes', th: 'โคมไฟล่าผี', ar: 'فانوس الأشباح' },
    bowling: { en: 'Bowl', ko: '볼링 치기', ja: 'ボウリングする', zh: '打保龄球', es: 'Jugar a los bolos', id: 'Main bowling', vi: 'Chơi bowling', hi: 'बॉलिंग खेलें', fr: 'Jouer au bowling', th: 'เล่นโบว์ลิ่ง', ar: 'العب البولينغ' },
    climbing: { en: 'Climb', ko: '클라이밍', ja: 'ボルダリング', zh: '攀岩', es: 'Escalar', id: 'Memanjat', vi: 'Leo tường', hi: 'चढ़ाई करें', fr: 'Grimper', th: 'ปีนผา', ar: 'تسلّق' },
    aim: { en: 'Play NEON STRIKE', ko: '네온 스트라이크 하기', ja: 'NEON STRIKEをプレイ', zh: '玩 NEON STRIKE', es: 'Jugar NEON STRIKE', id: 'Main NEON STRIKE', vi: 'Chơi NEON STRIKE', hi: 'NEON STRIKE खेलें', fr: 'Jouer à NEON STRIKE', th: 'เล่น NEON STRIKE', ar: 'العب NEON STRIKE' },
    darts: { en: 'Play darts', ko: '다트 하기', ja: 'ダーツをする', zh: '玩飞镖', es: 'Jugar a los dardos', id: 'Main dart', vi: 'Chơi phi tiêu', hi: 'डार्ट्स खेलें', fr: 'Jouer aux fléchettes', th: 'เล่นปาเป้า', ar: 'العب السهام' },
  };
  // Darts or bowling played in the world: the camera is theirs (main.js).
  return { camOn: () => !!(dartsView?.active || bowlView?.active), camera: (dt) => { dartsView?.update(); bowlView?.update(dt); placeFx?.update(dt); }, onDartsMsg, arcade, galleryUi, hauntUi, battingUi, dartsUi, bowlingUi, climbUi, aimUi, ARCADE_OPEN, openArcade,
    freshInvite };
}
