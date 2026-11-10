// Short recorded sounds: the shop's "paid" and "not enough
// money" blips. They come from Kenney's Interface Sounds pack (CC0, https://kenney.nl), cut to mono MP3 in public/audio/sfx/.
// Each file is fetched the first time it is needed (a few KB), so nothing is
// added to the game's start-up download. Until a file has arrived, play()
// returns false and the caller can fall back to its synthesised sound.
// Pure helpers are exported for tests.

// name -> how many variants (name-0.mp3 ... name-(n-1).mp3); 1 = name.mp3.
export const SOUND_FILES = {
  pay: 1,
  short: 1,
};

// The file for variant i of a sound (i wraps around).
export function soundUrl(name, i = 0, base = '') {
  const n = SOUND_FILES[name];
  if (!n) return null;
  return `${base}audio/sfx/${n > 1 ? `${name}-${((i % n) + n) % n}` : name}.mp3`;
}

export class SoundFiles {
  // sfx: core/music.js Sfx (its audio context and on/off switch).
  // base: the site's base path (import.meta.env.BASE_URL).
  constructor(sfx, base = '/') {
    this.sfx = sfx;
    this.base = base;
    this.buffers = new Map(); // url -> AudioBuffer
    this.loading = new Map(); // url -> Promise
    this.last = new Map(); // name -> last variant played
  }
  // Start fetching every variant of these sounds (no sound plays).
  load(...names) {
    const c = this.sfx.ctx;
    if (!c) return;
    for (const name of names) {
      const n = SOUND_FILES[name] || 0;
      for (let i = 0; i < n; i++) this._fetch(c, soundUrl(name, i, this.base));
    }
  }
  _fetch(c, url) {
    if (!url || this.buffers.has(url) || this.loading.has(url)) return;
    const p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
      .then((a) => new Promise((ok, no) => c.decodeAudioData(a, ok, no)))
      .then((b) => { this.buffers.set(url, b); })
      .catch(() => {}) // offline or not supported: the synthesised sound stays
      .finally(() => this.loading.delete(url));
    this.loading.set(url, p);
  }
  // Play a sound (a different variant from last time). vol 0..1, rate 1 =
  // normal pitch. Returns true when it played; false while it is still
  // loading (it is then fetched for next time) or the sound is off.
  play(name, vol = 1, rate = 1) {
    if (!this.sfx.on) return false;
    const c = this.sfx.ctx;
    const n = SOUND_FILES[name];
    if (!c || c.state !== 'running' || !n) return false;
    let i = 0;
    if (n > 1) {
      i = Math.floor(Math.random() * (n - 1));
      if (i >= (this.last.get(name) ?? -1)) i++;
      this.last.set(name, i);
    }
    const url = soundUrl(name, i, this.base);
    const buf = this.buffers.get(url);
    if (!buf) { this.load(name); return false; }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(g).connect(c.destination);
    src.start();
    return true;
  }
}
