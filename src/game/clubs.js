// Itaewon clubs: each plays its genre's playlist (core/club-music.js). The
// songs run on the clock, so everyone inside hears the same song at the same
// moment. Our own background music pauses while inside.
import { CLUB_GENRES, CLUB_TRACKS, songSeconds } from '../data/club-tracks.js';
import { ClubMusic } from '../core/club-music.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { getLanguage, localName } from '../core/i18n.js';
import { setBeat } from '../core/model-pack.js';

export function createClubs(game) {
  const { $, applyMusicBtn, music, shop } = game;
  const clubMusic = new ClubMusic();
  let clubState = null; // { wasOn, genre } while inside a club
  const CLUB_TEXT = {
    open: { en: 'Playlist', ko: '플레이리스트', ja: 'プレイリスト', zh: '播放列表' },
    now: { en: 'Now playing', ko: '지금 나오는 곡', ja: '再生中', zh: '正在播放' },
    note: { en: 'Everyone in the club hears the same song. 10 songs, 2–3 minutes each, all made in your browser.', ko: '클럽 안의 모두가 같은 곡을 들어요. 2~3분짜리 10곡이 브라우저에서 바로 만들어져요.', ja: 'クラブの全員が同じ曲を聴いています。2〜3分の10曲をブラウザでその場で演奏します。', zh: '俱乐部里的每个人都听同一首歌。共10首，每首2–3分钟，在浏览器中实时生成。' },
    mute: { en: 'Mute', ko: '음소거', ja: 'ミュート', zh: '静音' },
    unmute: { en: 'Sound on', ko: '소리 켜기', ja: '音を出す', zh: '打开声音' },
    left: { en: '{t} left', ko: '{t} 남음', ja: '残り{t}', zh: '剩余{t}' },
  };
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  clubMusic.onSong = (i) => {
    if (!clubState) return;
    const tr = CLUB_TRACKS[clubState.genre][i];
    shop.toast('🎧 ' + localName(tr.name, getLanguage()));
    if (!$('lp-panel').hidden && $('lp-panel').dataset.club) openClubPanel();
  };
  async function enterClub(genre) {
    clubState = { wasOn: music.on, genre };
    if (music.on) { await music.setOn(false); applyMusicBtn(); }
    if (clubState?.genre === genre) await clubMusic.start(genre);
  }
  async function leaveClub() {
    if (!clubState) return;
    const { wasOn } = clubState;
    clubState = null;
    clubMusic.stop();
    $('lp-panel').hidden = true;
    delete $('lp-panel').dataset.club;
    if (wasOn && !music.on) { await music.setOn(true); applyMusicBtn(); }
  }
  function clubPulse() {
    if (!clubState || !clubMusic.on) return null;
    const p = clubMusic.pulse();
    return p && { ...p, title: localName(clubMusic.song.name, getLanguage()) };
  }
  setBeat(() => clubPulse()); // dancers move to the club's beat
  function openClubPanel() {
    if (!clubState) return;
    const root = $('lp-panel');
    root.dataset.club = '1';
    const lang = getLanguage();
    const g = CLUB_GENRES[clubState.genre];
    const x = document.createElement('button');
    x.className = 'sheet-x';
    x.textContent = '✕';
    x.onclick = () => { root.hidden = true; delete root.dataset.club; };
    const h = document.createElement('strong');
    h.className = 'wallet-title';
    h.textContent = `${g.icon} ${localName(g.name, lang)} · ${L(CLUB_TEXT.open)}`;
    const note = document.createElement('p');
    note.className = 'fine';
    note.textContent = localName(g.desc, lang) + ' ' + L(CLUB_TEXT.note);
    const list = document.createElement('div');
    list.className = 'lp-list';
    const p = clubMusic.pulse();
    CLUB_TRACKS[clubState.genre].forEach((tr, i) => {
      const playing = clubMusic.on && clubMusic.index === i;
      const row = document.createElement('div');
      row.className = 'lp-row' + (playing ? ' on' : '');
      row.innerHTML = '<span class="lp-text"><strong></strong><small></small></span>';
      row.querySelector('strong').textContent = `${i + 1}. ${localName(tr.name, lang)}`;
      const len = songSeconds(clubState.genre, tr);
      row.querySelector('small').textContent = playing && p
        ? `▶ ${L(CLUB_TEXT.now)} · ${fmt(L(CLUB_TEXT.left), { t: mmss(Math.max(0, len - p.pos)) })}`
        : `${tr.bpm} BPM · ${mmss(len)}`;
      list.append(row);
    });
    const mute = document.createElement('button');
    mute.className = 'chip';
    mute.textContent = clubMusic.muted ? '🔊 ' + L(CLUB_TEXT.unmute) : '🔇 ' + L(CLUB_TEXT.mute);
    mute.onclick = () => { clubMusic.setMuted(!clubMusic.muted); openClubPanel(); };
    const actions = document.createElement('div');
    actions.className = 'order-actions';
    actions.append(mute);
    root.replaceChildren(x, h, note, list, actions);
    root.hidden = false;
  }

  return { enterClub, leaveClub, get clubState() { return clubState; }, CLUB_TEXT, openClubPanel,
    clubPulse };
}
