// Board games at the board game café (core/board-cafe-room.js), the game
// side. This file is small and in the first download only so the room's
// "🎲 Board games" button and invites from people at the café work; the
// panel, the rules and their words (ui/board-games-ui.js) load the first time
// someone opens a game or is invited to one.
//
// game: { myId, net, others, me, interior, safety, sfx, music }
import { localName, getLanguage } from '../core/i18n.js';
import { createCharacter } from '../core/character.js';

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

export function createBoardGames(game) {
  let ui = null, loading = null, ask = null, askTimer = 0;
  const here = () => !!game.interior?.stations?.boardgames;
  const load = () => (loading ||= import('../ui/board-games-ui.js').then(async (m) => {
    const text = await import('../ui/board-games-text.js');
    const { BOARD_TRACKS } = await import('../ui/board-games-music.js');
    const { playBoardSound } = await import('../ui/board-games-sounds.js');
    let songBefore = null; // what was playing before the game's own tune
    ui = new m.BoardGamesUI({
      // A player as a little figure (the host sits in the pirate's barrel).
      figureOf: (id) => { try { return createCharacter(id === game.myId ? game.myLook : game.others.lookOf(id)).root; } catch { return null; } },
      net: {
        myId: game.myId,
        nameOf: (id) => game.others.nameOf(id),
        nearby: () => game.others.nearbyFree(game.me.root.position.x, game.me.root.position.z, 12).filter((p) => !game.safety.isBlocked(p.id, p.name)),
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

  return {
    // The room's button: open the panel.
    async open() {
      const at = game.interior;
      const u = await load().catch((e) => { console.error('board games', e); return null; });
      if (u && game.interior === at) { closeAsk(); u.show(); }
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
      const m = ui && ui.parse(e);
      if (!m) return true;
      if (m.k === 'n' && m.to === game.myId) {
        // (an invite I didn't answer yet, taken back)
        if (ask && !ui?.busy) closeAsk();
      }
      ui?.onMsg(from, m);
      return true;
    },
    peerGone(id) { ui?.peerGone(id); },
    // Walked out of the room.
    leftRoom() { closeAsk(); if (ui?.open || ui?.busy) ui.close(); },
    get panel() { return { get open() { return !!ui?.open; }, close() { ui?.close(); } }; },
  };
}
