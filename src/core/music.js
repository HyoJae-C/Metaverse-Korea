// Background music made live in the browser with Web Audio. The songs are
// short recipes in data/tracks.js (lo-fi by default; the music café's record
// player switches songs). No audio files, so nothing to license and nothing
// to download. Starts only after a tap.

import { trackById } from '../data/tracks.js';

const hz = (m) => 440 * 2 ** ((m - 69) / 12);

// iPhones mute Web Audio when the ring/silent switch is on, unless the page
// says it plays media. Newer Safari has navigator.audioSession; older ones
// switch over once an <audio> element is playing, so a silent one loops.
let unlocked = false;
export function playThroughSilentSwitch() {
  if (unlocked) return;
  unlocked = true;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
  if (!/iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) || !('ontouchend' in document)) return;
  try {
    // 0.1 s of silence (8 kHz, 8-bit mono WAV).
    const n = 800, b = new Uint8Array(44 + n);
    const v = new DataView(b.buffer);
    const str = (o, t) => [...t].forEach((c, i) => { b[o + i] = c.charCodeAt(0); });
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
    b.fill(128, 44);
    const a = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
    a.loop = true;
    a.setAttribute('playsinline', '');
    a.play().catch(() => { unlocked = false; });
  } catch { unlocked = false; }
}

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
      playThroughSilentSwitch();
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
    if (this.ctx.state === 'suspended') { playThroughSilentSwitch(); this.ctx.resume(); }
    return this.ctx;
  }
  // A short wooden "tock": a bat meeting the ball, a dart in the board, a
  // cork popping a balloon. loud 0..1, pitch in Hz.
  tock(loud = 1, pitch = 900) {
    if (!this.on) return;
    const c = this._ctx();
    if (!c) return;
    const t = c.currentTime + 0.01;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.exponentialRampToValueAtTime(pitch * 0.45, t + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25 * loud, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.15);
  }
  // ---- Fishing (Han River). All synthesised here. ----
  // The cast: the rod whipping through the air, then the line running out.
  castWhoosh() {
    if (!this.on || !this._ctx()) return;
    this._hiss(0, 0.28, 0.16, 700, 3800); // swish
    this._hiss(0.16, 0.7, 0.035, 5200, 2600); // line zipping off the spool
    this._tone(1500, 0.16, 0.6, 0.012, 'sawtooth', 700);
  }
  // The bobber (or a fish) hitting the water. big 0..1.
  splash(big = 0.5) {
    if (!this.on || !this._ctx()) return;
    this._hiss(0, 0.18 + big * 0.3, 0.09 + big * 0.16, 2600, 350);
    this._tone(420 + big * 80, 0, 0.14, 0.07 + big * 0.05, 'sine', 140); // plop
    if (big > 0.6) this._hiss(0.12, 0.5, 0.05, 1800, 500); // water falling back
  }
  // A fish nibbling: a tiny "plip" from the bobber.
  plip() {
    if (!this.on || !this._ctx()) return;
    this._tone(980, 0, 0.07, 0.035, 'sine', 520);
  }
  // A bite: the bobber is pulled under (two bloops) and the line goes taut.
  bite() {
    if (!this.on || !this._ctx()) return;
    this._tone(360, 0, 0.12, 0.12, 'sine', 120);
    this._tone(300, 0.13, 0.14, 0.12, 'sine', 100);
    this._hiss(0, 0.2, 0.08, 2000, 500);
    this._tone(520, 0.05, 0.28, 0.035, 'triangle', 1350); // the line singing
  }
  // One turn of the reel: a quick ratchet "tik-tik-tik".
  reelClick(n = 3) {
    if (!this.on || !this._ctx()) return;
    const c = this.ctx;
    for (let i = 0; i < n; i++) {
      const t = c.currentTime + 0.01 + i * 0.032;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(2300 + Math.random() * 300, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.022, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.03);
    }
  }
  // Winding an empty line back in (missed or got away).
  reelIn(len = 0.6) {
    if (!this.on || !this._ctx()) return;
    for (let t = 0; t < len; t += 0.11) setTimeout(() => this.reelClick(3), t * 1000);
  }
  // The line snapping as a fish escapes.
  snap() {
    if (!this.on || !this._ctx()) return;
    this._tone(1300, 0, 0.22, 0.06, 'sawtooth', 180);
    this.tock(0.6, 1400);
  }
  // Pulling the catch out of the water: a big splash and a rising swoosh.
  landed() {
    if (!this.on || !this._ctx()) return;
    this.splash(0.9);
    this._hiss(0.05, 0.35, 0.08, 600, 3200);
  }
  // A soft, wobbly "wooo" for the haunted house's ghost: a sine that
  // slides down with a slow vibrato. Quiet; nothing sudden.
  ghostly() {
    if (!this.on) return;
    const c = this._ctx();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const o = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(300, t + 1.3);
    lfo.frequency.value = 6;
    depth.gain.value = 18;
    lfo.connect(depth).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g).connect(c.destination);
    o.start(t); lfo.start(t);
    o.stop(t + 1.45); lfo.stop(t + 1.45);
  }
  // Automatic sliding door: a soft motor hum and the glass panels gliding
  // open ("shhh"), ending in a gentle stop. Quiet and smooth, no chime.
  // (Kept the name doorbell: every door uses it.)
  doorbell() {
    if (!this.on) return;
    const c = this._ctx();
    if (!c) return;
    const t = c.currentTime + 0.02;
    const len = 0.75;
    // Glide: filtered noise that swells and fades, its tone rising a little
    if (!this._noise) {
      const b = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) { last = last * 0.96 + (Math.random() * 2 - 1) * 0.04; d[i] = last * 6; } // soft, brownish
      this._noise = b;
    }
    const src = c.createBufferSource();
    src.buffer = this._noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(900, t + len * 0.6);
    f.frequency.linearRampToValueAtTime(650, t + len);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.18);
    g.gain.setValueAtTime(0.09, t + len * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + len + 0.05);
    // Motor hum underneath
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(110, t);
    o.frequency.linearRampToValueAtTime(135, t + len * 0.5);
    o.frequency.linearRampToValueAtTime(100, t + len);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.025, t + 0.12);
    og.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(og).connect(c.destination);
    o.start(t);
    o.stop(t + len + 0.05);
    // Soft stop of the panels
    const k = c.createOscillator();
    k.frequency.setValueAtTime(180, t + len - 0.08);
    k.frequency.exponentialRampToValueAtTime(70, t + len);
    const kg = c.createGain();
    kg.gain.setValueAtTime(0.0001, t + len - 0.08);
    kg.gain.exponentialRampToValueAtTime(0.03, t + len - 0.07);
    kg.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.02);
    k.connect(kg).connect(c.destination);
    k.start(t + len - 0.08);
    k.stop(t + len + 0.05);
  }

  // Heartbeat for the tarot reveal: n low "lub-dub" thumps, speeding up.
  heartbeat(n = 3) {
    if (!this.on) return;
    const c = this._ctx();
    if (!c) return;
    let t = c.currentTime + 0.03;
    for (let i = 0; i < n; i++) {
      for (const [dt, vol] of [[0, 0.32], [0.16, 0.22]]) {
        const o = c.createOscillator(), g = c.createGain(), at = t + dt;
        o.type = 'sine';
        o.frequency.setValueAtTime(70, at);
        o.frequency.exponentialRampToValueAtTime(38, at + 0.14);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
        o.connect(g).connect(c.destination);
        o.start(at); o.stop(at + 0.2);
      }
      t += Math.max(0.42, 0.7 - i * 0.1);
    }
  }
  // The card turns over: a soft shimmer rising into a bell.
  reveal(big = false) {
    if (!this.on) return;
    const c = this._ctx();
    if (!c) return;
    const t0 = c.currentTime + 0.02;
    const notes = big ? [72, 76, 79, 84, 88] : [76, 83, 88];
    notes.forEach((m, i) => {
      const f = 440 * 2 ** ((m - 69) / 12), t = t0 + i * 0.07, len = big ? 1.6 : 1.0;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + len + 0.05);
    });
  }

  // Train arrival chime: our own short bell-like phrase (not a recording of
  // any real metro jingle). Four soft notes rising, then a settling fifth.
  arrivalChime() {
    if (!this.on) return;
    const c = this._ctx();
    if (!c) return;
    const t0 = c.currentTime + 0.03;
    const notes = [[76, 0], [79, 0.22], [84, 0.44], [83, 0.66], [79, 0.98]]; // E5 G5 C6 B5 G5
    for (const [m, at] of notes) {
      const f = 440 * 2 ** ((m - 69) / 12), t = t0 + at, len = 1.1;
      for (const [mult, vol] of [[1, 0.07], [2.76, 0.012], [5.4, 0.005]]) { // bell partials
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * mult;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len / mult);
        o.connect(g).connect(c.destination);
        o.start(t);
        o.stop(t + len + 0.05);
      }
    }
  }

  // ---- Subway sounds (all made here; no real metro recordings) ----
  _tone(f, at, len, vol, type = 'sine', f2 = null) {
    const c = this.ctx, t = c.currentTime + 0.02 + at;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, len / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    o.connect(lp).connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + len + 0.05);
  }
  _hiss(at, len, vol, from = 3000, to = 1200) {
    const c = this.ctx, t = c.currentTime + 0.02 + at;
    if (!this._white) {
      const b = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this._white = b;
    }
    const src = c.createBufferSource();
    src.buffer = this._white;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + len);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + len + 0.05);
  }
  // Doors opening: an air hiss and a soft two-note "ding-dong".
  doorOpen() {
    if (!this.on || !this._ctx()) return;
    this._hiss(0, 0.7, 0.05);
    this._tone(1047, 0.05, 0.6, 0.05); // C6
    this._tone(880, 0.3, 0.8, 0.05); // A5
  }
  // Doors closing: three quick warning beeps, then the doors meet.
  doorClose() {
    if (!this.on || !this._ctx()) return;
    for (let i = 0; i < 3; i++) this._tone(1319, i * 0.28, 0.14, 0.04, 'triangle'); // E6
    this._hiss(0.85, 0.45, 0.04, 1800, 700);
    this._tone(120, 1.25, 0.18, 0.08, 'sine', 60); // thud
  }
  // Departure signal: a short two-note horn, then the motor winding up.
  depart() {
    if (!this.on || !this._ctx()) return;
    this._tone(587, 0, 0.32, 0.035, 'square'); // D5
    this._tone(784, 0.34, 0.5, 0.035, 'square'); // G5
    this._tone(140, 0.5, 1.8, 0.03, 'sawtooth', 420); // motor whine rising
  }
}
