// Background music made live in the browser with Web Audio. The songs are
// short recipes in data/tracks.js (lo-fi by default; the music café's record
// player switches songs). No audio files, so nothing to license and nothing
// to download. Starts only after a tap.

import { trackById } from '../data/tracks.js';

const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export class Music {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.step = 0; // eighth notes
    this.nextTime = 0;
    this.timer = null;
    this.seed = 7;
    this.track = trackById('lofi');
  }

  // Switch songs (see data/tracks.js); starts the new one from its first bar.
  setTrack(id) {
    const next = trackById(id);
    if (next === this.track) return;
    this.track = next;
    this.step = 0;
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
      // swing: long on-beats, short off-beats
      const beat = 60 / this.track.bpm, sw = this.track.swing;
      this.nextTime += (beat / 2) * (this.step % 2 ? 2 - sw : sw);
      this.step = (this.step + 1) % 64;
    }
  }

  _playStep(s, t) {
    const tr = this.track, BEAT = 60 / tr.bpm;
    const bar = Math.floor(s / 8) % 4;
    const e = s % 8;
    const chord = tr.chords[bar], root = tr.bass[bar];
    if (e === 0) {
      if (tr.pad) chord.forEach((m) => this._pad(hz(m), t, BEAT * 7.6, 0.035));
      else chord.forEach((m, i) => this._key(hz(m), t + i * 0.025, BEAT * 3.8, 0.07));
      if (tr.waves) this._noise(t, 0.035, BEAT * 6, 'lowpass', 380);
    }
    if (tr.walk) { // walking bass: a chord tone on every beat
      if (e % 2 === 0) this._bass(hz(e === 0 ? root : chord[e / 2] - 12), t, BEAT * 0.9);
    } else if (tr.octaveBass) {
      this._bass(hz(root + (e % 2 ? 12 : 0)), t, BEAT * 0.45);
    } else {
      for (const [at, iv, len] of tr.bassHits) if (e === at) this._bass(hz(root + iv), t, BEAT * len);
    }
    if (tr.kick.includes(e)) this._kick(t);
    if (tr.snare.includes(e)) tr.brush ? this._noise(t, 0.03, 0.22, 'bandpass', 3200) : this._snare(t);
    if (tr.rim?.includes(e)) this._noise(t, 0.06, 0.04, 'bandpass', 4200);
    if (tr.hat === 'odd' && e % 2 === 1) this._hat(t, 0.025);
    if (tr.hat === 'all') this._hat(t, e % 2 ? 0.03 : 0.018);
    if (tr.hat === 'ride' && e !== 1 && e !== 5) this._noise(t, 0.02, 0.25, 'highpass', 5500);
    // a sparse melody
    if (s >= tr.melodyFrom && e % 2 === 0 && this._rand() < tr.melody) {
      const m = tr.scale[Math.floor(this._rand() * tr.scale.length)];
      if (tr.lead === 'pluck') this._pluck(hz(m), t, BEAT * 0.7, 0.05);
      else if (tr.lead === 'gayageum') this._pluck(hz(m), t, BEAT * 1.4, 0.07, this._rand() < 0.35);
      else this._key(hz(m), t, BEAT * 0.9, 0.05, true);
    }
  }

  // Long soft chord tone with a slow swell.
  _pad(f, t, dur, vol) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    o.detune.value = (this._rand() - 0.5) * 8;
    o.connect(g).connect(this.master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Plucked string; bend: slide up into the note, like a gayageum's 농현.
  _pluck(f, t, dur, vol, bend = false) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    if (bend) {
      o.frequency.setValueAtTime(f * 0.94, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.18);
    } else o.frequency.value = f;
    o.connect(g).connect(this.master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
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
    src.loop = dur > 0.5; // long swells (waves) outlast the 1 s buffer
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

// Short sound effects, sharing the music's audio setup.
export class Sfx {
  constructor() { this.ctx = null; this.on = true; }
  _ctx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  // Two-tone shop door chime ("ding-dong").
  doorbell() {
    if (!this.on) return;
    const c = this._ctx();
    if (!c) return;
    const t = c.currentTime + 0.02;
    [[1318.5, 0], [1046.5, 0.32]].forEach(([f, dt]) => {
      for (const [mult, vol] of [[1, 0.22], [2.76, 0.05], [5.4, 0.02]]) { // bell partials
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0.0001, t + dt);
        g.gain.exponentialRampToValueAtTime(vol, t + dt + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 1.1);
        o.connect(g).connect(c.destination);
        o.start(t + dt);
        o.stop(t + dt + 1.2);
      }
    });
  }
}
