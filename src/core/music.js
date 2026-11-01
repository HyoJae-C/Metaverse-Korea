// Background music made live in the browser with Web Audio: a slow, cozy
// lo-fi loop (soft keys, bass, light drums, a little melody). No audio files,
// so nothing to license and nothing to download. Starts only after a tap.

const BPM = 78;
const BEAT = 60 / BPM;
// Imaj7 – vi7 – IVmaj7 – V7sus in F major (MIDI notes)
const CHORDS = [
  [53, 57, 60, 64],
  [50, 53, 57, 60],
  [46, 50, 53, 57],
  [48, 53, 55, 58],
];
const BASS = [41, 38, 34, 36];
const SCALE = [65, 67, 69, 72, 74, 77]; // F major pentatonic, upper octave
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export class Music {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.step = 0; // eighth notes
    this.nextTime = 0;
    this.timer = null;
    this.seed = 7;
  }

  _rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  _init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    this.master.connect(lp).connect(ctx.destination);
    // short noise buffer for drums and vinyl crackle
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  async setOn(on) {
    if (on && !this.ctx && !this._init()) return false;
    if (!this.ctx) return false;
    this.on = on;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    if (on) {
      await this.ctx.resume();
      this.master.gain.linearRampToValueAtTime(0.32, t + 1.5);
      if (!this.timer) {
        this.nextTime = this.ctx.currentTime + 0.1;
        this.timer = setInterval(() => this._schedule(), 50);
      }
    } else {
      this.master.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => {
        if (this.on) return;
        clearInterval(this.timer);
        this.timer = null;
        this.ctx.suspend();
      }, 700);
    }
    return true;
  }

  _schedule() {
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      this._playStep(this.step, this.nextTime);
      // gentle swing on off-beats
      this.nextTime += (BEAT / 2) * (this.step % 2 ? 0.84 : 1.16);
      this.step = (this.step + 1) % 64;
    }
  }

  _playStep(s, t) {
    const bar = Math.floor(s / 8) % 4;
    const e = s % 8;
    if (e === 0) {
      CHORDS[bar].forEach((m, i) => this._key(hz(m), t + i * 0.025, BEAT * 3.8, 0.07));
      this._bass(hz(BASS[bar]), t, BEAT * 1.8);
    }
    if (e === 5) this._bass(hz(BASS[bar] + 7), t, BEAT * 0.9);
    if (e === 0 || e === 3) this._kick(t);
    if (e === 4) this._snare(t);
    if (e % 2 === 1) this._hat(t, 0.025);
    // sparse melody, only in the second half of each 8-bar loop
    if (s >= 32 && e % 2 === 0 && this._rand() < 0.42) {
      const m = SCALE[Math.floor(this._rand() * SCALE.length)];
      this._key(hz(m), t, BEAT * 0.9, 0.05, true);
    }
  }

  _env(g, t, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  _key(f, t, dur, vol, bell = false) {
    const c = this.ctx;
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o2.type = bell ? 'sine' : 'triangle';
    o.frequency.value = f;
    o2.frequency.value = bell ? f * 2 : f * 1.003;
    const g2 = c.createGain();
    g2.gain.value = bell ? 0.25 : 0.4;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.master);
    this._env(g, t, vol, dur);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  _bass(f, t, dur) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g).connect(this.master);
    this._env(g, t, 0.16, dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _kick(t) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    o.connect(g).connect(this.master);
    this._env(g, t, 0.28, 0.3);
    o.start(t);
    o.stop(t + 0.35);
  }

  _noise(t, vol, dur, type, freq) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    src.connect(f).connect(g).connect(this.master);
    this._env(g, t, vol, dur);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  _snare(t) { this._noise(t, 0.07, 0.18, 'bandpass', 1800); }
  _hat(t, vol) { this._noise(t, vol, 0.05, 'highpass', 7000); }
}
