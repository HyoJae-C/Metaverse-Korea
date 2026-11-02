// K-POP café: one music video for everyone in the room. Picking a song tells
// the room "play <id> from <seconds>"; someone who walks in later is caught
// up by whoever is already there. The video plays in YouTube's own embedded
// player, laid over the café's big wall screen (see main.js, CSS3D).
import { t } from '../core/i18n.js';
import { KPOP, kpopById, kpopMsg } from '../data/kpop.js';

let apiPromise = null;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return (apiPromise ||= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiPromise = null; reject(new Error('youtube')); };
    document.head.append(s);
  }));
}

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export class KpopRoom {
  // video: the box the player goes in (on the wall screen); tv: the
  // now-playing bar; panel: the song list sheet; send(msg): to everyone in
  // the room; toast(text).
  constructor({ video, tv, panel, send, toast }) {
    Object.assign(this, { video, tv, panel, send, toast });
    this.song = null; // { id, startedAt (ms, our clock) }
    this.inside = false;
    this.player = null;
    this.heardAt = 0;
  }

  get position() { return this.song ? (Date.now() - this.song.startedAt) / 1000 : 0; }

  enter() {
    this.inside = true;
    this.song = null;
    this._render();
  }

  leave() {
    this.inside = false;
    this.song = null;
    clearTimeout(this.catchUp);
    this.player?.destroy?.();
    this.player = null;
    this.tv.hidden = true;
    this.panel.hidden = true;
  }

  // Pick a song for everyone.
  pick(id) {
    this._play(id, 0);
    this.send(kpopMsg(id, 0));
  }

  stop() {
    this._stop();
    this.send(kpopMsg(null));
  }

  // A room message (already parsed).
  onMsg(m) {
    if (!this.inside) return;
    this.heardAt = performance.now();
    if (m.verb === 'stop') this._stop();
    else if (m.id !== this.song?.id || Math.abs(this.position - m.at) > 3) this._play(m.id, m.at);
  }

  // Someone walked in: if a song is on, one of us catches them up (a short
  // random wait, so not everyone answers at once).
  onPeerJoin() {
    if (!this.inside || !this.song) return;
    const asked = performance.now();
    clearTimeout(this.catchUp);
    this.catchUp = setTimeout(() => {
      if (this.song && this.heardAt < asked) this.send(kpopMsg(this.song.id, this.position));
    }, 300 + Math.random() * 1200);
  }

  _stop() {
    this.song = null;
    this.player?.stopVideo?.();
    this.tv.hidden = true;
    this._render();
  }

  async _play(id, at) {
    const song = kpopById(id);
    if (!song) return;
    this.song = { id, startedAt: Date.now() - at * 1000 };
    this.resumes = 0;
    this.tv.hidden = false;
    this._render();
    let YT;
    try { YT = await loadYouTube(); } catch { this.toast(t('kpop.noYoutube')); return; }
    if (!this.inside || this.song?.id !== id) return;
    const start = Math.floor(this.position);
    if (this.player?.loadVideoById) {
      this.player.loadVideoById({ videoId: id, startSeconds: start });
      return;
    }
    const box = this.video;
    box.replaceChildren(el('div'));
    this.player = new YT.Player(box.firstChild, {
      videoId: id,
      playerVars: { autoplay: 1, start, playsinline: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: (e) => e.target.playVideo(),
        // 101 / 150: the owner doesn't allow this video outside YouTube.
        onError: (e) => {
          if (e.data === 101 || e.data === 150) this.toast(t('kpop.blocked'));
          else this.toast(t('kpop.error'));
        },
        onStateChange: (e) => {
          // Autoplay with sound may be blocked until a tap: show the button.
          if (e.data === YT.PlayerState.PLAYING) this.tv.querySelector('.kpop-unmute').hidden = !e.target.isMuted();
          // Nobody can pause it (the player takes no taps), so a pause or a
          // reset here is the player stopping by itself, e.g. as an ad
          // ends: start it again, a few times at most per song.
          if ((e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) && this.song && this.resumes < 3) {
            const id = this.song.id;
            setTimeout(() => {
              if (this.song?.id !== id || this.player !== e.target) return;
              const st = e.target.getPlayerState?.();
              if (st === YT.PlayerState.PAUSED || st === YT.PlayerState.CUED) { this.resumes++; e.target.playVideo(); }
            }, 800);
          }
        },
      },
    });
  }

  // Tap to hear (browsers may start a video muted).
  unmute() {
    this.player?.unMute?.();
    this.player?.playVideo?.();
    this.tv.querySelector('.kpop-unmute').hidden = true;
  }

  _render() {
    const now = this.song && kpopById(this.song.id);
    this.tv.querySelector('.kpop-now').textContent = now ? `♪ ${now.artist} · ${now.title}` : '';
    if (this.panel.hidden) return;
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = () => { this.panel.hidden = true; };
    const list = el('div', 'lp-list');
    for (const s of KPOP) {
      const b = el('button', 'lp-row' + (now?.id === s.id ? ' on' : ''));
      const disc = el('span', 'lp-disc');
      disc.append(el('i'));
      const text = el('span', 'lp-text');
      text.append(el('strong', null, `${s.artist} · ${s.title}${now?.id === s.id ? ' · ' + t('lp.playing') : ''}`), el('small', null, t('kpop.official', { channel: s.channel })));
      b.append(disc, text);
      b.onclick = () => { this.pick(s.id); this._render(); };
      list.append(b);
    }
    const actions = el('div', 'order-actions');
    if (now) {
      const stop = el('button', 'chip', '⏹ ' + t('kpop.stop'));
      stop.onclick = () => this.stop();
      actions.append(stop);
    }
    this.panel.replaceChildren(x, el('h3', null, '📺 ' + t('kpop.title')), el('p', 'fine', t('kpop.note')), list, actions);
  }

  open() {
    this.panel.hidden = false;
    this._render();
  }
}
