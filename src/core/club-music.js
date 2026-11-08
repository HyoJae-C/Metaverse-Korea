// Club music for Itaewon, made live in the browser with Web Audio (see
// data/club-tracks.js for the songs). Each song has a form (intro, build,
// drop…) and its patterns come from a seed, so every player hears the same
// notes; the playlist runs on the clock, so everyone in a club hears the
// same song at the same moment without the server doing anything.

import { CLUB_TRACKS, sectionAt, songBars, playlistAt } from '../data/club-tracks.js';
import { playThroughSilentSwitch } from './music.js';

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// MIDI note of a scale step (any integer) above `key`.
export function scaleNote(key, step, major = false) {
  const sc = major ? MAJOR : MINOR;
  const o = Math.floor(step / 7);
  return key + 12 * o + sc[((step % 7) + 7) % 7];
}

// The fixed patterns of one song, picked from its seed.
export function songPatterns(genre, track) {
  const r = seeded(track.seed * 7919 + 13);
  const pick = (a) => a[Math.floor(r() * a.length)];
  // Lead melody: 16 steps, each null (rest) or a scale step above the chord.
  const density = { edm: 0.55, hiphop: 0.32, kpop: 0.5 }[genre];
  const lead = [];
  let last = 2;
  for (let e = 0; e < 16; e++) {
    const on = e === 0 || (e % 4 === 0 ? r() < density + 0.25 : r() < density * (e % 2 ? 0.6 : 1));
    if (!on) { lead.push(null); continue; }
    last = Math.max(-1, Math.min(9, last + pick([-2, -1, 1, 2, 0, 3, -3])));
    lead.push(e % 4 === 0 ? pick([0, 2, 4, 7]) : last);
  }
  // A different ending for the 4th bar of each phrase.
  const leadEnd = lead.map((n, e) => (e >= 12 ? (e % 2 ? null : pick([4, 5, 7, 9])) : n));
  return {
    lead,
    leadEnd,
    kick: pick([
      [0, 10], [0, 7, 10], [0, 3, 10], [0, 6, 9], [0, 10, 11], [0, 2, 7, 10],
    ]),
    rolls: [pick([6, 7, 14, 15]), pick([11, 13, 15])], // hi-hat roll steps (trap)
    chops: pick([[0, 3, 6, 10, 12], [0, 3, 6, 8, 11, 14], [2, 4, 7, 10, 13], [0, 4, 6, 10, 14]]),
    chopNotes: Array.from({ length: 6 }, () => pick([0, 2, 4, 4, 5, 7])),
    stabs: pick([[0, 3, 6, 10, 12], [0, 3, 6, 8, 11, 14], [0, 4, 7, 10, 14], [0, 2, 6, 8, 12]]),
    arp: pick([[0, 2, 4, 7], [0, 4, 2, 7], [0, 2, 4, 2], [4, 2, 0, 2]]),
  };
}

export class ClubMusic {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.genre = null;
    this.muted = false;
    this.clockOffset = 0; // seconds to add to Date.now() (server clock, if known)
    this.onSong = null; // called with (index) when a new song starts
  }

  // ctx: an AudioContext to use (tests render into an OfflineAudioContext).
  _init(ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ctx && !AC) return false;
    const c = (this.ctx = ctx || new AC());
    this.master = c.createGain();
    this.master.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    this.master.connect(comp).connect(c.destination);
    this.drums = c.createGain();
    this.drums.connect(this.master);
    this.duck = c.createGain(); // music under the kick (sidechain pump)
    const lift = c.createGain(); // music sits a bit louder than the drums
    lift.gain.value = 2.6;
    this.duck.connect(lift).connect(this.master);
    // A small room: convolver with a made-up decaying-noise impulse.
    // Mono and short: a convolver is the costliest node here.
    const len = Math.floor(c.sampleRate * 0.9);
    const ir = c.createBuffer(1, len, c.sampleRate);
    const ird = ir.getChannelData(0);
    for (let i = 0; i < len; i++) ird[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    this.verb = c.createConvolver();
    this.verb.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = 0.22;
    this.verb.connect(wet).connect(this.master);
    const nlen = c.sampleRate;
    this.noise = c.createBuffer(1, nlen, c.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  get song() { return this.genre ? CLUB_TRACKS[this.genre][this.index] : null; }

  // Start playing a genre's playlist (call from a tap: browsers need one).
  async start(genre) {
    if (!this.ctx && !this._init()) return false;
    this.genre = genre;
    this.on = true;
    playThroughSilentSwitch();
    await this.ctx.resume().catch(() => {}); // refused on iOS at times: silent, not an error
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(0, t);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.42, t + 1.2);
    this._syncAt(t + 0.1);
    clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 40);
    return true;
  }

  stop() {
    if (!this.ctx || !this.on) return;
    this.on = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.5);
    clearInterval(this.timer);
    this.timer = null;
    setTimeout(() => { if (!this.on) this.ctx.suspend(); }, 600);
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(m ? 0 : 0.42, t + 0.3);
  }

  // Find the song and step that should sound at audio time `at`.
  _syncAt(at) {
    const wall = Date.now() / 1000 + this.clockOffset + (at - this.ctx.currentTime) + 0.001;
    const { index, pos } = playlistAt(this.genre, wall);
    const track = CLUB_TRACKS[this.genre][index];
    const prev = this.index;
    this.index = index;
    this.track = track;
    this.pat = songPatterns(this.genre, track);
    this.stepDur = 60 / track.bpm / 4;
    this.total = songBars(this.genre) * 16;
    let step = Math.ceil(pos / this.stepDur - 1e-6);
    this.songStart = at - pos; // audio time of the song's first step
    if (step >= this.total) { // the song ends right here: start the next
      this._syncAt(at + 0.01);
      return;
    }
    this.step = step;
    this.nextTime = this.songStart + step * this.stepDur;
    if (prev !== index && this.onSong) this.onSong(index);
  }

  // Render one whole song offline (tests and tools): returns the AudioBuffer.
  async render(genre, index, seconds, rate = 22050) {
    const track = CLUB_TRACKS[genre][index];
    const stepDur = 60 / track.bpm / 4;
    const steps = Math.min(songBars(genre) * 16, Math.ceil((seconds ?? 1e9) / stepDur));
    const ctx = new OfflineAudioContext(2, Math.ceil((steps * stepDur + 2) * rate), rate);
    this._init(ctx);
    this.master.gain.value = 0.42;
    Object.assign(this, { genre, index, track, pat: songPatterns(genre, track), stepDur, total: steps });
    for (let s = 0; s < steps; s++) this._play(s, 0.05 + s * stepDur);
    return ctx.startRendering();
  }

  _schedule() {
    if (!this.on) return;
    const horizon = this.ctx.currentTime + 0.2;
    // After a pause (a hidden tab), jump back to the clock.
    if (this.nextTime < this.ctx.currentTime - 0.3) this._syncAt(this.ctx.currentTime + 0.05);
    while (this.nextTime < horizon) {
      this._play(this.step, this.nextTime);
      this.step++;
      this.nextTime += this.stepDur;
      if (this.step >= this.total) this._syncAt(this.nextTime);
    }
  }

  // For the lights: { beat, phase (0–1 within the beat), energy, section }.
  pulse() {
    if (!this.on || !this.track) return null;
    const s = (this.ctx.currentTime - this.songStart) / this.stepDur;
    if (s < 0) return null;
    const bar = Math.floor(s / 16);
    const sec = sectionAt(this.genre, bar);
    return { beat: Math.floor(s / 4), phase: (s / 4) % 1, energy: sec.energy, section: sec.name, pos: s * this.stepDur, length: this.total * this.stepDur };
  }

  // ---- arrangement -------------------------------------------------------

  _play(s, t) {
    const g = this.genre, tr = this.track;
    const bar = Math.floor(s / 16), e = s % 16;
    const sec = sectionAt(g, bar);
    const p = (sec.bar * 16 + e) / (sec.bars * 16); // 0–1 through the section
    const lastBar = sec.bar === sec.bars - 1;
    const chordSteps = g === 'hiphop' ? 2 : 1; // bars per chord
    const deg = tr.prog[Math.floor(bar / chordSteps) % 4];
    const key = tr.key, maj = !!tr.major;
    const note = (step, oct = 0) => scaleNote(key, deg + step, maj) + 12 * oct;
    const chord = (oct) => [0, 2, 4].map((k) => note(k, oct));
    const swing = g === 'hiphop' && e % 2 ? this.stepDur * 0.16 : 0;
    t += swing;
    const fade = sec.name === 'outro' ? 1 - p * 0.8 : sec.name === 'intro' && sec.bar < 2 ? 0.5 + p : 1;
    if (e === 0 && sec.bar === 0 && (sec.name === 'drop' || sec.name === 'hook')) this._crash(t);
    if (g === 'edm') this._edm(sec, p, lastBar, e, t, note, chord, fade, bar);
    else if (g === 'hiphop') this._hiphop(sec, p, e, t, note, chord, fade, bar);
    else this._kpop(sec, p, lastBar, e, t, note, chord, fade, bar);
  }

  _melody(bar, e) { return (bar % 4 === 3 ? this.pat.leadEnd : this.pat.lead)[e]; }

  _edm(sec, p, lastBar, e, t, note, chord, fade, bar) {
    const n = sec.name, P = this.pat, tr = this.track;
    const gap = n === 'build' && lastBar && e >= 12; // the breath before the drop
    if (gap) return;
    const fourFloor = n === 'drop' || n === 'outro' || (n === 'intro' && sec.bar >= 4) || (n === 'build' && p < 0.5);
    if (fourFloor && e % 4 === 0) this._kick(t, fade);
    if (n === 'drop' || n === 'outro' || n === 'intro') {
      if (e % 4 === 2) this._hat(t, 0.09 * fade, true);
      else if (n === 'drop') this._hat(t, 0.035);
      if (n === 'drop' && (e === 4 || e === 12)) this._clap(t, 0.9);
    }
    if (n === 'build') { // snare roll: quarter notes, then eighths, then sixteenths
      const every = p < 0.5 ? 4 : p < 0.75 ? 2 : 1;
      if (e % every === 0) this._snare(t, 0.25 + p * 0.6);
      if (e === 0 && sec.bar === 0) this._riser(t, sec.bars * 16 * this.stepDur);
    }
    // Bass.
    if (n === 'drop' || n === 'outro' || (n === 'intro' && sec.bar >= 4)) {
      const kind = tr.bass || 'offbeat';
      const hit = kind === 'rolling' ? e % 4 !== 0 : kind === 'pulse' ? e % 2 === 0 : e % 4 === 2;
      if (hit) this._bassSaw(hz(note(0, -1)), t, this.stepDur * (kind === 'rolling' ? 0.9 : 1.6), 0.22 * fade);
    }
    // Chords: a pumping saw stack in the drop, a long pad otherwise.
    if (n === 'drop' && P.stabs.includes(e)) this._supersaw(chord(1).map(hz), t, this.stepDur * 1.6, 0.07, 2600);
    if (e === 0 && (n === 'break' || n === 'build' || n === 'intro')) this._pad(chord(1).map(hz), t, this.stepDur * 16, n === 'break' ? 0.09 : 0.035);
    // Lead.
    const m = this._melody(bar, e);
    if (m != null) {
      if (n === 'drop') this._supersaw([hz(note(m, 2))], t, this.stepDur * 1.8, 0.06, 4200);
      else if (n === 'break' || n === 'build' || (n === 'intro' && sec.bar >= 4)) this._pluck(hz(note(m, 2)), t, this.stepDur * 2, 0.06, n === 'build' ? 1200 + p * 3000 : 1800);
    }
  }

  _hiphop(sec, p, e, t, note, chord, fade, bar) {
    const n = sec.name, P = this.pat, trap = this.track.hats === 'trap';
    const drums = n === 'verse' || n === 'hook' || (n === 'intro' && sec.bar >= 2);
    if (n !== 'intro' && n !== 'outro' || (n === 'outro' && sec.bar < 2)) {
      if (P.kick.includes(e) || (n === 'hook' && e === 8 && bar % 2)) {
        this._kick(t, 0.9 * fade, true);
        this._808(hz(note(0, -1)), t, this.stepDur * (e === 0 ? 5 : 3), 0.32 * fade);
      }
      if (e === 4 || e === 12) { this._snare(t, 0.55 * fade); this._clap(t, 0.5 * fade); }
    }
    if (drums) {
      if (trap) {
        this._hat(t, e % 2 ? 0.035 : 0.05);
        if (P.rolls.includes(e) && n !== 'intro') { // a quick triplet roll
          for (let k = 1; k < 3; k++) this._hat(t + (k * this.stepDur) / 3, 0.035);
        }
      } else if (e % 2 === 0) this._hat(t, e % 4 ? 0.04 : 0.06);
      if (n === 'hook' && e === 14) this._hat(t, 0.08, true);
    }
    // Keys: a chord every two bars, played softly; a bell melody on top.
    if (e === 0 && bar % 2 === 0) chord(1).forEach((m, i) => this._keys(hz(m), t + i * 0.02, this.stepDur * 26, 0.06 * fade));
    const m = this._melody(bar, e);
    if (m != null && (n === 'hook' || (n === 'intro' && sec.bar >= 2) || (n === 'verse' && bar % 2 === 1 && e < 8))) {
      this._bell(hz(note(m, 2)), t, this.stepDur * 3, (n === 'hook' ? 0.07 : 0.045) * fade);
    }
    if (n === 'hook' && e === 0) this._pad(chord(1).map(hz), t, this.stepDur * 16, 0.025);
  }

  _kpop(sec, p, lastBar, e, t, note, chord, fade, bar) {
    const n = sec.name, P = this.pat;
    if (n === 'build' && lastBar && e >= 12) { if (e === 14) this._hey(t); return; }
    const four = n === 'drop' || (n === 'build' && p < 0.5);
    if (four && e % 4 === 0) this._kick(t, fade);
    if ((n === 'verse' || n === 'intro' && sec.bar >= 4) && (e === 0 || e === 10)) this._kick(t, 0.8 * fade);
    if ((n === 'verse' || n === 'drop') && (e === 4 || e === 12)) this._clap(t, n === 'drop' ? 0.9 : 0.5);
    if (n === 'drop' && e % 4 === 2) this._hat(t, 0.08, true);
    if ((n === 'verse' || n === 'drop') && e % 2 === 1) this._hat(t, 0.03);
    if (n === 'build') {
      const every = p < 0.5 ? 4 : p < 0.8 ? 2 : 1;
      if (e % every === 0) this._snare(t, 0.2 + p * 0.5);
      if (e === 0 && sec.bar === 0) this._riser(t, sec.bars * 16 * this.stepDur);
    }
    // Bass: sub notes on the chord root.
    if ((n === 'drop' && (e === 0 || e === 3 || e === 8 || e === 11)) || (n === 'verse' && (e === 0 || e === 8))) this._bassSaw(hz(note(0, -1)), t, this.stepDur * 2.5, 0.2 * fade, 380);
    // Future-bass chords in the drop: swelling saw stacks on a syncopated rhythm.
    if (n === 'drop' && P.stabs.includes(e)) this._supersaw(chord(1).concat(note(7, 1)).map(hz), t, this.stepDur * 2.4, 0.045, 3000, true);
    if (e === 0 && (n === 'verse' || n === 'build' || n === 'intro')) this._pad(chord(1).map(hz), t, this.stepDur * 16, 0.035);
    // Vocal chops: the hook of every drop, and a hint in the intro.
    const ci = P.chops.indexOf(e);
    if (ci >= 0 && (n === 'drop' || (n === 'intro' && sec.bar >= 4) || (n === 'build' && p < 0.5))) {
      this._chop(hz(note(P.chopNotes[ci], 2)), t, this.stepDur * 1.6, n === 'drop' ? 0.09 : 0.05, ci % 3);
    }
    // Plucked arpeggio in the verse.
    if (n === 'verse' && e % 2 === 0) this._pluck(hz(note(P.arp[(e / 2) % 4], 2)), t, this.stepDur * 1.5, 0.05, 2200);
  }

  // ---- instruments ---------------------------------------------------------

  _env(g, t, peak, a, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  _osc(type, f, t, dur, out, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  _noiseSrc(t, dur, out) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = dur > 0.9;
    s.connect(out);
    s.start(t, Math.random() * 0.4);
    s.stop(t + dur + 0.05);
    return s;
  }

  _filter(type, f, q = 0.8) {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    return b;
  }

  _kick(t, v = 1, long = false) {
    const c = this.ctx;
    const g = c.createGain();
    g.connect(this.drums);
    const o = this._osc('sine', 150, t, long ? 0.5 : 0.35, g);
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    this._env(g, t, 0.75 * v, 0.004, long ? 0.45 : 0.32);
    const cg = c.createGain(); // click
    const hp = this._filter('highpass', 3000);
    hp.connect(cg).connect(this.drums);
    this._noiseSrc(t, 0.02, hp);
    this._env(cg, t, 0.12 * v, 0.001, 0.02);
    // Pump the music down under the kick.
    this.duck.gain.setValueAtTime(0.4, t);
    this.duck.gain.setTargetAtTime(1, t + 0.03, 0.07);
  }

  _clap(t, v = 1) {
    const g = this.ctx.createGain();
    const f = this._filter('bandpass', 1500, 1.2);
    f.connect(g);
    g.connect(this.drums);
    g.connect(this.verb);
    this._noiseSrc(t, 0.2, f);
    g.gain.setValueAtTime(0.0001, t);
    for (const [dt, a] of [[0, 0.4], [0.011, 0.35], [0.022, 0.5]]) {
      g.gain.setValueAtTime(a * v, t + dt);
      g.gain.exponentialRampToValueAtTime(0.02 * v, t + dt + 0.009);
    }
    g.gain.setValueAtTime(0.45 * v, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  }

  _snare(t, v = 1) {
    const g = this.ctx.createGain();
    g.connect(this.drums);
    g.connect(this.verb);
    this._noiseSrc(t, 0.16, this._filter('highpass', 1200)).connect(g);
    this._env(g, t, 0.35 * v, 0.002, 0.15);
    const tg = this.ctx.createGain();
    tg.connect(this.drums);
    this._osc('triangle', 190, t, 0.1, tg);
    this._env(tg, t, 0.25 * v, 0.002, 0.08);
  }

  _hat(t, v, open = false) {
    const g = this.ctx.createGain();
    const f = this._filter('highpass', 8000);
    f.connect(g).connect(this.drums);
    this._noiseSrc(t, open ? 0.25 : 0.05, f);
    this._env(g, t, v * 3, 0.001, open ? 0.22 : 0.045);
  }

  _crash(t) {
    const g = this.ctx.createGain();
    const f = this._filter('highpass', 5000);
    f.connect(g);
    g.connect(this.drums);
    g.connect(this.verb);
    this._noiseSrc(t, 1.8, f);
    this._env(g, t, 0.18, 0.003, 1.7);
  }

  _riser(t, dur) {
    const g = this.ctx.createGain();
    const f = this._filter('bandpass', 400, 2);
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    f.connect(g);
    g.connect(this.master);
    this._noiseSrc(t, dur, f);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.97);
    g.gain.linearRampToValueAtTime(0, t + dur);
  }

  _hey(t) { // a shouted "hey!": a buzz and a breath through two vowel formants
    const g = this.ctx.createGain();
    g.connect(this.master);
    g.connect(this.verb);
    const a = this._filter('bandpass', 700, 4), b = this._filter('bandpass', 1900, 5);
    a.connect(g); b.connect(g);
    const src = this._noiseSrc(t, 0.22, a);
    src.connect(b);
    const o = this._osc('sawtooth', 240, t, 0.22, a);
    o.frequency.setValueAtTime(240, t);
    o.frequency.linearRampToValueAtTime(300, t + 0.15);
    o.connect(b);
    this._env(g, t, 0.5, 0.01, 0.22);
  }

  _bassSaw(f, t, dur, v, cut = 600) {
    const g = this.ctx.createGain();
    const lp = this._filter('lowpass', cut, 2);
    lp.connect(g).connect(this.duck);
    this._osc('sawtooth', f, t, dur, lp);
    this._osc('sine', f / 2, t, dur, g);
    this._env(g, t, v, 0.006, dur);
  }

  _808(f, t, dur, v) {
    const g = this.ctx.createGain();
    g.connect(this.master);
    const o = this._osc('sine', f, t, dur, g);
    o.frequency.setValueAtTime(f * 1.9, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const g2 = this.ctx.createGain(); // a little grit an octave up
    g2.gain.value = 0.18;
    g2.connect(g);
    this._osc('triangle', f * 2, t, dur, g2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.5, dur * 0.25);
  }

  _supersaw(fs, t, dur, v, cut, swell = false) {
    const g = this.ctx.createGain();
    const lp = this._filter('lowpass', cut, 1);
    lp.connect(g);
    g.connect(this.duck);
    g.connect(this.verb);
    // One note gets three detuned saws, a chord two each (lighter on the CPU).
    const spread = fs.length > 1 ? [-11, 11] : [-14, 0, 14];
    for (const f of fs) for (const d of spread) this._osc('sawtooth', f, t, dur, lp, d);
    if (swell) { // future-bass swell: quick rise, wobble the filter down
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + dur * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      lp.frequency.setValueAtTime(cut * 0.4, t);
      lp.frequency.exponentialRampToValueAtTime(cut, t + dur * 0.3);
      lp.frequency.exponentialRampToValueAtTime(cut * 0.3, t + dur);
    } else this._env(g, t, v, 0.008, dur);
  }

  _pad(fs, t, dur, v) {
    const g = this.ctx.createGain();
    const lp = this._filter('lowpass', 1600);
    lp.connect(g);
    g.connect(this.duck);
    g.connect(this.verb);
    for (const f of fs) { this._osc('sawtooth', f, t, dur, lp, -8); this._osc('triangle', f, t, dur, lp, 8); }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  _pluck(f, t, dur, v, cut) {
    const g = this.ctx.createGain();
    const lp = this._filter('lowpass', cut, 3);
    lp.frequency.setValueAtTime(cut * 2, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, cut * 0.25), t + dur);
    lp.connect(g);
    g.connect(this.duck);
    g.connect(this.verb);
    this._osc('sawtooth', f, t, dur, lp);
    this._osc('square', f * 2, t, dur, lp, 6);
    this._env(g, t, v, 0.003, dur);
  }

  _keys(f, t, dur, v) {
    const g = this.ctx.createGain();
    g.connect(this.duck);
    g.connect(this.verb);
    this._osc('sine', f, t, dur, g);
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.3;
    g2.connect(g);
    this._osc('triangle', f * 1.003, t, dur, g2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  _bell(f, t, dur, v) {
    const g = this.ctx.createGain();
    g.connect(this.duck);
    g.connect(this.verb);
    this._osc('sine', f, t, dur, g);
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.35;
    g2.connect(g);
    this._osc('sine', f * 2.01, t, dur * 0.5, g2);
    this._env(g, t, v, 0.003, dur);
  }

  // A "vocal chop": a buzz through vowel formants, sliding into the note.
  _chop(f, t, dur, v, vowel) {
    const F = [[800, 1200], [500, 900], [350, 2200]][vowel];
    const g = this.ctx.createGain();
    g.connect(this.duck);
    g.connect(this.verb);
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.start(t);
    o.stop(t + dur + 0.05);
    for (const [fq, q, a] of [[F[0], 6, 1], [F[1], 8, 0.6]]) {
      const bp = this._filter('bandpass', fq, q);
      const ga = this.ctx.createGain();
      ga.gain.value = a * 3;
      o.connect(bp).connect(ga).connect(g);
    }
    o.frequency.setValueAtTime(f * 0.94, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.012);
    g.gain.setValueAtTime(v, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
}

