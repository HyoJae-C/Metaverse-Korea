// The record café's listening bar (청음): stand at a station, put the
// headphones on and listen to a song. The character wears headphones and
// nods along (others see it too: the 'listen' activity). Only the listener
// hears the song; the café's music pauses meanwhile and comes back after.
// Walking away, leaving the café or the song ending takes the headphones off.
import { LISTEN_TRACKS, listenTrackById, clock } from '../data/listening.js';
import { getLanguage, localName } from '../core/i18n.js';

export const LISTEN_TEXT = {
  open: { en: 'Listen on headphones', ko: '헤드폰으로 듣기', ja: 'ヘッドホンで試聴', zh: '戴耳机试听' },
  off: { en: 'Take off headphones', ko: '헤드폰 벗기', ja: 'ヘッドホンを外す', zh: '摘下耳机' },
  title: { en: 'Listening bar', ko: '청음대', ja: '試聴コーナー', zh: '试听台' },
  note: {
    en: 'Put on the headphones and listen. Only you hear it; the café music pauses until you take them off.',
    ko: '헤드폰을 쓰고 들어 보세요. 나에게만 들리고, 헤드폰을 벗을 때까지 카페 음악은 잠시 멈춰요.',
    ja: 'ヘッドホンをつけて聴いてみよう。聞こえるのは自分だけ。外すまでカフェの音楽は止まります。',
    zh: '戴上耳机听一听。只有你听得到，摘下耳机前咖啡馆的音乐会暂停。',
  },
  lyrics: { en: 'Lyrics (Korean)', ko: '가사', ja: '歌詞（韓国語）', zh: '歌词（韩语）' },
  showLyrics: { en: 'View lyrics', ko: '가사 보기', ja: '歌詞を見る', zh: '查看歌词' },
  hideLyrics: { en: 'Hide lyrics', ko: '가사 닫기', ja: '歌詞を閉じる', zh: '收起歌词' },
  listen: { en: 'Listen', ko: '듣기', ja: '聴く', zh: '试听' },
  playing: { en: 'listening', ko: '듣는 중', ja: '試聴中', zh: '正在听' },
  now: { en: '🎧 Now listening: {name}', ko: '🎧 듣는 중: {name}', ja: '🎧 試聴中：{name}', zh: '🎧 正在听：{name}' },
  failed: { en: "The song couldn't load. Check your connection and try again.", ko: '곡을 불러오지 못했어요. 연결을 확인하고 다시 눌러 주세요.', ja: '曲を読み込めませんでした。接続を確認してもう一度どうぞ。', zh: '歌曲加载失败，请检查网络后重试。' },
};
const L = (o, vars) => {
  let s = localName(o, getLanguage());
  for (const [k, v] of Object.entries(vars || {})) s = s.replace('{' + k + '}', v);
  return s;
};

// How close to a station you stand to use it, and how far you can wander
// before the headphones come off (the cable only reaches so far).
export const STATION_REACH = 1.3;
export const CABLE = 2.1;

export const nearestStation = (stations, x, z, reach = STATION_REACH) => {
  let best = null, bd = reach;
  for (const s of stations || []) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < bd && !s.taken) { bd = d; best = s; }
  }
  return best;
};

export function createListeningBar(game) {
  const { $, music, applyMusicBtn, shop, me, base = '/' } = game;
  let now = null; // { track, station, audio, wasOn }
  let tick = 0;
  let lyricsOpen = false; // lyrics stay folded until asked for

  async function play(id, station) {
    const track = listenTrackById(id);
    if (!track) return;
    if (now?.track.id === id) return;
    const wasOn = now ? now.wasOn : music.on;
    stopAudio();
    const audio = new Audio(base + track.file);
    audio.preload = 'auto';
    audio.volume = 0.9;
    now = { track, station, audio, wasOn };
    audio.onended = () => { if (now?.audio === audio) stop(); };
    audio.onerror = () => { if (now?.audio === audio) { shop.toast(L(LISTEN_TEXT.failed)); stop(); } };
    me().activity('listen');
    game.onChange?.();
    if (music.on) { await music.setOn(false); applyMusicBtn(); }
    try { await audio.play(); } catch { /* autoplay refused: the panel's button is a tap, so this is rare */ }
    shop.toast(L(LISTEN_TEXT.now, { name: localName(track.title, getLanguage()) }));
    if (!$('lp-panel').hidden && $('lp-panel').dataset.kind === 'listen') open(station);
  }
  function stopAudio() {
    if (!now) return;
    now.audio.onended = now.audio.onerror = null;
    now.audio.pause();
    now.audio.removeAttribute('src');
    now.audio.load();
  }
  async function stop() {
    if (!now) return;
    const { wasOn } = now;
    stopAudio();
    now = null;
    me().activity(null);
    game.onChange?.();
    if ($('lp-panel').dataset.kind === 'listen') $('lp-panel').hidden = true;
    if (wasOn && !music.on) { await music.setOn(true); applyMusicBtn(); }
  }

  function open(station) {
    const root = $('lp-panel');
    root.dataset.kind = 'listen';
    const lang = getLanguage();
    const x = document.createElement('button');
    x.className = 'sheet-x';
    x.textContent = '✕';
    x.setAttribute('aria-label', 'Close');
    x.onclick = () => { root.hidden = true; };
    const h = document.createElement('h3');
    h.textContent = '🎧 ' + L(LISTEN_TEXT.title);
    const note = document.createElement('p');
    note.className = 'fine';
    note.textContent = L(LISTEN_TEXT.note);
    const list = document.createElement('div');
    list.className = 'lp-list';
    for (const tr of LISTEN_TRACKS) {
      const on = now?.track.id === tr.id;
      const b = document.createElement('button');
      b.className = 'lp-row listen-row' + (on ? ' on' : '');
      b.innerHTML = '<img class="listen-cover" alt=""><span class="lp-text"><strong></strong><small></small></span><span class="listen-go"></span>';
      b.querySelector('img').src = base + tr.cover;
      b.querySelector('strong').textContent = localName(tr.title, lang);
      const sub = lang === 'ko' ? '' : tr.title.ko !== localName(tr.title, lang) ? tr.title.ko + ' · ' : '';
      b.querySelector('small').textContent = sub + clock(tr.seconds) + (on ? ' · ' + L(LISTEN_TEXT.playing) : '');
      b.querySelector('.listen-go').textContent = on ? '🎧' : '▶ ' + L(LISTEN_TEXT.listen);
      b.onclick = () => play(tr.id, station);
      list.append(b);
      if (on && tr.lyrics && lyricsOpen) list.append(lyricsBlock(tr.lyrics)); // right under its song
    }
    const children = [x, h, note, list];
    if (now) {
      const off = document.createElement('button');
      off.className = 'chip';
      off.textContent = '🎧 ' + L(LISTEN_TEXT.off);
      off.onclick = () => stop();
      const actions = document.createElement('div');
      actions.className = 'order-actions';
      if (now.track.lyrics) {
        const ly = document.createElement('button');
        ly.className = 'chip listen-lyrics-btn';
        ly.textContent = '📝 ' + L(lyricsOpen ? LISTEN_TEXT.hideLyrics : LISTEN_TEXT.showLyrics);
        ly.onclick = () => { lyricsOpen = !lyricsOpen; open(station); };
        actions.append(ly);
      }
      actions.append(off);
      children.push(actions);
    }
    root.replaceChildren(...children);
    root.hidden = false;
    root.querySelector('.listen-lyrics')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }

  // The playing song's lyrics, a paragraph per verse.
  function lyricsBlock(text) {
    const box = document.createElement('div');
    box.className = 'listen-lyrics';
    const h = document.createElement('h4');
    h.textContent = '📝 ' + L(LISTEN_TEXT.lyrics);
    box.append(h);
    for (const part of text.split(/\n\s*\n/)) {
      const p = document.createElement('p');
      for (const line of part.split('\n')) {
        const el = document.createElement('span');
        el.textContent = line;
        p.append(el);
      }
      box.append(p);
    }
    return box;
  }

  // Every frame: the headphones come off when you walk away from the bar.
  function update(dt, p) {
    if (!now) return;
    tick += dt;
    if (tick < 0.2) return;
    tick = 0;
    if (Math.hypot(p.x - now.station.x, p.z - now.station.z) > CABLE) stop();
  }

  return {
    open, play, stop, update,
    get listening() { return now?.track.id || null; },
    get station() { return now?.station || null; },
    // (tests) how far into the song we are
    get position() { return now ? now.audio.currentTime : 0; },
  };
}
