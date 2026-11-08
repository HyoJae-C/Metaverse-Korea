// Music café: pick an LP to change the song. Only this player hears it (the
// music plays in this browser). Leaving puts the usual music back.
import { TRACKS } from '../data/tracks.js';
import { getLanguage, localName, t } from '../core/i18n.js';

export function createMusicCafe(game) {
  const { $, applyMusicBtn, kpop, music, shop } = game;
  let cafeMusic = null; // { wasOn } while inside a music café
  // K-POP café: everyone in the room watches and hears the same music video
  // (ui/kpop-room.js). Our own background music pauses while inside.
  let kpopMusic = null;
  // The cinema works the same way, with its own films.
  // The black-and-white cinema shows the whole hall, its film and the people
  // in it in black and white (a filter on the 3D view and the video).
  async function enterKpopCafe(kind = 'kpop', cinema = true) {
    kpopMusic = { wasOn: music.on };
    kpop.enter(kind, cinema);
    document.body.classList.toggle('cinema-silver', cinema === 'silver');
    if (music.on) { await music.setOn(false); applyMusicBtn(); }
  }
  async function leaveKpopCafe() {
    if (!kpopMusic) return;
    const { wasOn } = kpopMusic;
    kpopMusic = null;
    kpop.leave();
    document.body.classList.remove('cinema-silver');
    if (wasOn && !music.on) { await music.setOn(true); applyMusicBtn(); }
  }
  async function enterMusicCafe(track = 'lofi') {
    cafeMusic = { wasOn: music.on };
    music.setTrack(track);
    if (!music.on) { await music.setOn(true); applyMusicBtn(); } // the room's music plays on entering
  }
  async function leaveMusicCafe() {
    if (!cafeMusic) return;
    const { wasOn } = cafeMusic;
    cafeMusic = null;
    $('lp-panel').hidden = true;
    music.setTrack('lofi');
    if (!wasOn && music.on) { await music.setOn(false); applyMusicBtn(); }
  }
  function openLpPanel() {
    const root = $('lp-panel');
    root.dataset.kind = 'lp';
    const lang = getLanguage();
    const x = document.createElement('button');
    x.className = 'sheet-x';
    x.textContent = '✕';
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => { root.hidden = true; };
    const h = document.createElement('h3');
    h.textContent = '💿 ' + t('lp.title');
    const note = document.createElement('p');
    note.className = 'fine';
    note.textContent = t('lp.note');
    const list = document.createElement('div');
    list.className = 'lp-list';
    for (const tr of TRACKS.filter((x) => !x.hidden)) { // (the runway's show music stays at the runway)
      const b = document.createElement('button');
      const playing = music.on && music.track.id === tr.id;
      b.className = 'lp-row' + (playing ? ' on' : '');
      b.innerHTML = `<span class="lp-disc"><i></i></span><span class="lp-text"><strong></strong><small></small></span>`;
      b.querySelector('.lp-disc').style.background = `radial-gradient(circle, ${tr.color} 0 26%, #141418 27% 100%)`;
      b.querySelector('strong').textContent = `${tr.icon} ${localName(tr.name, lang)}${playing ? ' · ' + t('lp.playing') : ''}`;
      b.querySelector('small').textContent = localName(tr.desc, lang);
      b.onclick = async () => {
        music.setTrack(tr.id);
        if (!music.on) { await music.setOn(true); applyMusicBtn(); }
        shop.toast(t('lp.now', { name: localName(tr.name, lang) }));
        openLpPanel();
      };
      list.append(b);
    }
    const off = document.createElement('button');
    off.className = 'chip';
    off.textContent = music.on ? '🔇 ' + t('lp.stop') : '🔊 ' + t('lp.play');
    off.onclick = async () => { await music.setOn(!music.on); applyMusicBtn(); openLpPanel(); };
    const actions = document.createElement('div');
    actions.className = 'order-actions';
    actions.append(off);
    root.replaceChildren(x, h, note, list, actions);
    root.hidden = false;
  }
  return { enterMusicCafe, enterKpopCafe, leaveMusicCafe, leaveKpopCafe,
    get cafeMusic() { return cafeMusic; }, openLpPanel };
}
