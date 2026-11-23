// Board games at the board game café (core/board-cafe-room.js), the game
// side. This file is small and in the first download only so the room's
// "🎲 Board games" button and invites from people at the café work; the
// panel, the rules and their words (ui/board-games-ui.js) load the first time
// someone opens a game or is invited to one.
//
// game: { myId, net, others, me, interior, safety, sfx, music, myLook, camera, canvas, scene, seated, sit, stand, seatFree }
import { localName, getLanguage } from '../core/i18n.js';
import { createCharacter } from '../core/character.js';
import { furnitureById } from '../core/furniture.js';
import { BOARD_SETS_ON_SALE } from '../core/board-game-sets.js';

const L = (o) => localName(o, getLanguage());
export const BOARD_GAMES_OPEN = { en: 'Board games', ko: '보드게임', ja: 'ボードゲーム', zh: '桌游', es: 'Juegos de mesa', id: 'Permainan papan', vi: 'Board game', hi: 'बोर्ड गेम', fr: 'Jeux de société', th: 'บอร์ดเกม', ar: 'ألعاب لوحية' };
const ASK = {
  text: { en: '🎲 {name} asks you to play {game}!', ko: '🎲 {name}님이 {game} 같이 하재요!', ja: '🎲 {name}さんが{game}に誘っています！', zh: '🎲 {name}邀请你玩{game}！', es: '🎲 ¡{name} te invita a jugar a {game}!', id: '🎲 {name} mengajakmu main {game}!', vi: '🎲 {name} rủ bạn chơi {game}!', hi: '🎲 {name} आपको {game} खेलने बुला रहे हैं!', fr: '🎲 {name} t\'invite à jouer à {game} !', th: '🎲 {name} ชวนคุณเล่น {game}!', ar: '🎲 {name} يدعوك للعب {game}!' },
  yes: { en: 'Play', ko: '같이 하기', ja: '遊ぶ', zh: '一起玩', es: 'Jugar', id: 'Main', vi: 'Chơi', hi: 'खेलें', fr: 'Jouer', th: 'เล่น', ar: 'العب' },
  no: { en: 'No thanks', ko: '괜찮아요', ja: 'やめておく', zh: '不用了', es: 'No, gracias', id: 'Tidak, terima kasih', vi: 'Thôi', hi: 'नहीं, धन्यवाद', fr: 'Non merci', th: 'ไม่เป็นไร', ar: 'لا، شكرًا' },
};
const ASK_MS = 28000; // a little under the host's 30 s wait (ui/board-games-ui.js)
const ASK_CSS = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:56;background:rgba(255,255,255,.96);border-radius:16px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.2);font:600 15px system-ui,sans-serif;color:#2b2230;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px)';
const ASK_BTN = 'border:0;border-radius:12px;padding:10px 14px;font:600 15px system-ui,sans-serif;color:#2b2230;cursor:pointer';

// Mafia is being built (special roles, ghost chat and its long table are to come): on the menu only with ?debug until then.
const MAFIA_OPEN = false;
const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

export function createBoardGames(game) {
  let ui = null, table = null, loading = null, ask = null, askTimer = 0;
  const cafe = () => !!game.interior?.stations?.boardgames;
  // At home (mine, or one I am visiting): the games whose sets stand in the room (core/board-game-sets.js).
  const homeSets = () => (game.home?.items || []).map((it) => ({ it, game: furnitureById(it.id)?.boardgame })).filter((s) => s.game);
  const here = () => cafe() || homeSets().length > 0;
  const figureOf = (id) => { try { return createCharacter(id === game.myId ? game.myLook : game.others.lookOf(id)).root; } catch { return null; } };
  let tableOnce = null;
  const getTable = () => (tableOnce ||= import('./board-table.js').then((m) => (table = m.createBoardTable(game))));

  // Other people's games in this room, for those who are not in them: the
  // cards and the toy on their table (game/board-table.js). The host sends
  // every move to the room anyway, so the same rules are followed here from
  // the start message on. Someone who walks in halfway sees the next game.
  const watched = new Map(); // host id → { gid, kind, g, ids, faces, gone }
  let watchQueue = Promise.resolve(), core = null;
  const FACE_MS = 2600;
  const showWatched = (host) => {
    const w = watched.get(host);
    if (!w || !table) return;
    const g = w.g, gone = w.ids.map((_, s) => !!w.gone[s]), now = performance.now();
    if (w.kind === 'thief') table.watchSync(host, { counts: g.hands.map((h) => h.length), from: g.over ? -1 : g.from, turn: g.turn, sel: g.sel, tip: g.tip, over: g.over, faces: w.ids.map((_, s) => (w.faces[s]?.until > now ? core.FACES[w.faces[s].n] : '')), gone, canPick: false });
    else table.watchSync(host, { pressed: g.pressed, bang: !!g.last?.bang, wobble: g.risk?.() ?? 0, placing: !!g.last?.placing, gone });
  };
  const unwatch = (host) => { if (watched.delete(host)) table?.unwatch(host); };
  const watchMsg = (from, e) => {
    watchQueue = watchQueue.then(async () => {
      core ||= await import('../core/board-games.js');
      const m = core.parseBg(e);
      if (!m || !here()) return;
      if (m.k === 'g') {
        unwatch(from);
        if (m.ids.includes(game.myId) || !(m.opt > 0) || !(m.game === 'thief' || core.TOYS.includes(m.game))) return;
        await getTable();
        if (!here()) return;
        const g = core.newGame(m.game, m.ids.length, m.seed, m.opt);
        const toy = m.game === 'thief' ? null : { kind: m.game, spots: g.spots, figure: m.game === 'pirate' ? figureOf(from) : null };
        if (!table.watch(from, { ids: m.ids, table: m.opt, kind: m.game, names: m.ids.map((id) => (id === '~' ? '🤖' : '')), bot: '~', toy })) return;
        watched.set(from, { gid: m.gid, kind: m.game, g, ids: m.ids, faces: [], gone: [] });
        showWatched(from);
        return;
      }
      const w = watched.get(from);
      if (!w || m.gid !== w.gid) return;
      if (m.k === 'c') { unwatch(from); return; }
      if (m.k !== 'y') return;
      if (m.act[0] === 'e') {
        if (!(m.act[1] >= 0 && m.act[1] < core.FACES.length)) return;
        w.faces[m.seat] = { n: m.act[1], until: performance.now() + FACE_MS };
        setTimeout(() => showWatched(from), FACE_MS + 50);
      } else {
        if (!core.applyAction(w.g, m.seat, m.act)) return;
        if (m.act[0] === 'l') w.gone[m.seat] = true;
      }
      showWatched(from);
    }).catch((err) => console.error('board watch', err));
  };

  const load = () => (loading ||= import('../ui/board-games-ui.js').then(async (m) => {
    const text = await import('../ui/board-games-text.js');
    const { BOARD_TRACKS } = await import('../ui/board-games-music.js');
    const { playBoardSound } = await import('../ui/board-games-sounds.js');
    await getTable();
    let songBefore = null; // what was playing before the game's own tune
    ui = new m.BoardGamesUI({
      // The café has every game; a home, the ones whose sets stand in it.
      games: () => (cafe() ? Object.keys(text.GAME_NAME).filter((id) => id !== 'onecard' && (id !== 'mafia' || MAFIA_OPEN || DEBUG)) : [...new Set(homeSets().map((s) => s.game))]),
      // The café sells the sets: the shop's own buying sheet (the money is asked for and written down there).
      sets: () => (BOARD_SETS_ON_SALE && cafe() ? (game.interior.store?.products || []).filter((pr) => furnitureById(pr.furniture)?.boardgame).map((pr) => ({
        id: furnitureById(pr.furniture).boardgame, label: game.priceLabel(pr.price), owned: !!game.owns?.(pr.furniture),
        buy: () => { ui.close(); game.shop.store = game.interior.store; game.shop.openProduct(pr); },
      })) : []),
      table,
      // A player as a little figure (the host sits in the pirate's barrel).
      figureOf,
      net: {
        myId: game.myId,
        nameOf: (id) => game.others.nameOf(id),
        nearby: () => game.others.nearbyFree(game.me.root.position.x, game.me.root.position.z, 12, { seated: true }).filter((p) => !game.safety.isBlocked(p.id, p.name)),
        send: (msg) => game.net?.sendEmote(msg),
        here,
      },
      // Each game has a tune (only heard with music on); leaving puts the
      // earlier song back, unless something else changed it meanwhile.
      onGame: (id) => {
        const music = game.music, tune = id && BOARD_TRACKS[id];
        if (!music) return;
        if (tune) { if (!Object.values(BOARD_TRACKS).includes(music.track)) songBefore = music.track; music.setTrack(tune); }
        else if (songBefore) { if (Object.values(BOARD_TRACKS).includes(music.track)) music.setTrack(songBefore); songBefore = null; }
      },
      onEvent: (k, id, info) => {
        if (k === 'win') game.me.play('cheer');
        playBoardSound(game.sfx, k, id, info);
      },
    });
    ui.text = text;
    if (new URLSearchParams(location.search).has('debug')) window.__bgUi = ui; // (for the e2e tests)
    return ui;
  }).catch((e) => { loading = null; throw e; }));

  function closeAsk() { clearTimeout(askTimer); ask?.remove(); ask = null; }
  async function showAsk(from, gameId) {
    const name = game.others.nameOf(from);
    const u = await load();
    if (!here() || u.busy || !u.text.GAME_NAME[gameId]) { game.net?.sendEmote(`bg:n:${from}`); return; }
    closeAsk();
    ask = document.createElement('div');
    ask.id = 'bg-ask';
    ask.style.cssText = ASK_CSS;
    const h = document.createElement('div');
    h.textContent = L(ASK.text).replace('{name}', name).replace('{game}', L(u.text.GAME_NAME[gameId]));
    ask.append(h);
    for (const [label, run, bg] of [[L(ASK.yes), () => u.accept(from, gameId), '#ffd36b'], [L(ASK.no), () => game.net?.sendEmote(`bg:n:${from}`), '#eee']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = ASK_BTN + ';background:' + bg;
      b.onclick = () => { closeAsk(); run(); };
      ask.append(b);
    }
    document.body.append(ask);
    game.sfx.tock(0.6, 900);
    askTimer = setTimeout(closeAsk, ASK_MS);
  }

  const api = {
    // The room's button: open the panel.
    async open(gameId = null) {
      const at = game.interior;
      const u = await load().catch((e) => { console.error('board games', e); return null; });
      if (u && game.interior === at) { closeAsk(); u.show(); if (gameId && !u.busy) u.choose(gameId); }
    },
    // At home, by one of my board game sets: ask the people here to a game (the host only).
    homeAct(p) {
      const d = game.home;
      if (!d || d.guest || d.editing || d.carry || ui?.open) return null;
      let best = null, bd = 1.5;
      for (const s of homeSets()) { const dist = Math.hypot(p.x - s.it.x, p.z - s.it.z); if (dist < bd) { bd = dist; best = s; } }
      return best && { key: 'bg:' + best.game, label: `🎲 ${L(furnitureById(best.it.id).name)} · ${L(ASK.yes)}`, run: () => api.open(best.game) };
    },
    // A room message: true when it was one of ours.
    onMsg(from, e) {
      if (typeof e !== 'string' || !e.startsWith('bg:')) return false;
      const name = game.others.nameOf(from);
      if (name == null || game.safety.isBlocked(from, name)) return true;
      // An invite (the panel loads for it); everything else is for a game
      // that is open, so the panel is loaded already.
      const inv = /^bg:i:([\w-]{1,64}):([a-z]{1,12})$/.exec(e);
      if (inv) { if (inv[1] === game.myId && here()) showAsk(from, inv[2]); return true; }
      if (/^bg:[gyc]:/.test(e) && here() && from !== game.myId) watchMsg(from, e);
      const m = ui && ui.parse(e);
      if (!m) return true;
      if (m.k === 'n' && m.to === game.myId) {
        // (an invite I didn't answer yet, taken back)
        if (ask && !ui?.busy) closeAsk();
      }
      ui?.onMsg(from, m);
      return true;
    },
    peerGone(id) { ui?.peerGone(id); watchQueue = watchQueue.then(() => unwatch(id)); },
    // Playing at a table in the café: my eyes at my chair (game/board-table.js), and no standing up by walking.
    camera(dt) { table?.camera(dt); },
    get seated() { return !!table?.on; },
    get watching() { return table?.watched || []; }, // (for the e2e tests)
    // Walked out of the room.
    leftRoom() { watchQueue = watchQueue.then(() => { for (const id of [...watched.keys()]) unwatch(id); }); closeAsk(); if (ui?.open || ui?.busy) ui.close(); },
    get panel() { return { get open() { return !!ui?.open; }, close() { ui?.close(); } }; },
  };
  return api;
}
