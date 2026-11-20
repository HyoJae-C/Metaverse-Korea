// Plays a written score (data/opera-scores.js) live with Web Audio, through
// the game's own music output (core/music.js): no audio files, so nothing to
// download or license beyond the notes themselves, which are long out of
// copyright. An orchestra of simple voices: bowed strings (slow attack, a
// little vibrato), woodwinds, brass, harp and plucked strings, a piano and
// kettledrums, all into a concert hall's echo. Also the house's applause.
//
// The show keeps the clock (core/stage-show.js): it calls play(score, pos)
// every frame with how far into the piece the hall is, and the notes due in
// the next moment are handed to the audio clock. Everyone in the hall hears
// the same bar.
//
//   const player = new ConcertPlayer(music);
//   player.play(score, seconds)   // each frame while a piece is on
//   player.stop()                 // between pieces, and on leaving
//   player.applause(seconds, loud)
//   player.tune(seconds)          // the orchestra tuning to the oboe's A
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const AHEAD = 0.35; // seconds of notes kept scheduled

// Each voice: the wave, how fast it speaks and dies away, its brightness.
const VOICES = {
  strings: { wave: 'sawtooth', a: 0.09, r: 0.28, cut: 2100, vib: 5.2, two: 1.004, gain: 0.5 },
  cello: { wave: 'sawtooth', a: 0.07, r: 0.3, cut: 1300, vib: 4.8, two: 1.003, gain: 0.6 },
  flute: { wave: 'sine', a: 0.05, r: 0.16, cut: 3200, vib: 5, over: 0.18, gain: 0.8 },
  oboe: { wave: 'square', a: 0.04, r: 0.14, cut: 1900, vib: 5.4, gain: 0.3 },
  clarinet: { wave: 'triangle', a: 0.04, r: 0.15, cut: 2000, gain: 0.75 },
  horn: { wave: 'sawtooth', a: 0.06, r: 0.22, cut: 900, gain: 0.6 },
  brass: { wave: 'sawtooth', a: 0.035, r: 0.18, cut: 1700, gain: 0.5 },
  harp: { wave: 'triangle', pluck: 1.5, cut: 2600, gain: 0.9 },
  pizz: { wave: 'triangle', pluck: 0.35, cut: 1800, gain: 1 },
  piano: { wave: 'triangle', pluck: 2.2, cut: 3000, over: 0.3, gain: 0.9 },
  bass: { wave: 'triangle', a: 0.05, r: 0.2, cut: 600, gain: 1 },
  timpani: { drum: true, gain: 1 },
};
export const VOICE_NAMES = Object.keys(VOICES);

export class ConcertPlayer {
  constructor(music) {
    this.music = music;
    this.score = null;
    this.next = []; // per voice: the next note to schedule
    this.vol = 1;
    this.count = 0; // notes played so far
  }

  get ctx() { return this.music.on ? this.music.ctx : null; }

  // The hall: everything goes to the music output dry and through a long echo.
  _out() {
    const c = this.music.ctx;
    if (this.bus && this.bus.context === c) return this.bus;
    const bus = c.createGain();
    bus.gain.value = 1.5;
    const len = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
    const hall = c.createConvolver();
    hall.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = 0.4;
    bus.connect(this.music.master);
    bus.connect(hall).connect(wet).connect(this.music.master);
    return (this.bus = bus);
  }

  _note(inst, midi, t, dur, vol) {
    this.count++;
    const c = this.music.ctx, V = VOICES[inst] || VOICES.strings, out = this._out();
    const g = c.createGain(), peak = Math.max(0.0002, vol * V.gain * this.vol);
    if (V.drum) { // a kettledrum: a low thump that falls a little in pitch
      const o = c.createOscillator();
      o.frequency.setValueAtTime(hz(midi) * 1.5, t);
      o.frequency.exponentialRampToValueAtTime(hz(midi), t + 0.08);
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.5, dur));
      o.connect(g).connect(out);
      o.start(t); o.stop(t + Math.max(0.5, dur) + 0.05);
      return;
    }
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = V.cut;
    let end;
    if (V.pluck) { // struck or plucked: at once, then dying away
      end = t + Math.max(dur, 0.12) + V.pluck * 0.6;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(V.pluck * 1.6, Math.max(dur, 0.12) + V.pluck * 0.6));
    } else { // bowed or blown: swells in, holds, lets go
      const a = Math.min(V.a, dur * 0.4);
      end = t + dur + V.r;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, t + Math.max(a, dur - 0.02));
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    }
    f.connect(g).connect(out);
    const freq = hz(midi), oscs = [];
    const osc = (mul, type, lvl) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq * mul;
      if (lvl === 1) o.connect(f); else { const og = c.createGain(); og.gain.value = lvl; o.connect(og).connect(f); }
      oscs.push(o);
      return o;
    };
    osc(1, V.wave, 1);
    if (V.two) osc(V.two, V.wave, 0.7); // a second player, a hair sharp
    if (V.over) osc(2, 'sine', V.over);
    if (V.vib && dur > 0.35) { // vibrato once the note has settled
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = V.vib;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(freq * 0.006, t + 0.3);
      l.connect(lg);
      for (const o of oscs) lg.connect(o.frequency);
      l.start(t); l.stop(end + 0.05);
    }
    for (const o of oscs) { o.start(t); o.stop(end + 0.05); }
  }

  // pos: seconds into the piece. Schedules what is due before pos + AHEAD.
  play(score, pos) {
    const c = this.ctx;
    if (!c) { this.score = null; return; }
    const beat = 60 / score.bpm;
    if (this.score !== score || Math.abs(pos - this.pos) > 1.5) { // a new piece, or the clock jumped: find the place
      this.score = score;
      this.next = score.voices.map((v) => { let i = 0; while (i < v.n.length && v.n[i][0] * beat < pos + 0.03) i++; return i; });
    }
    this.pos = pos;
    const now = c.currentTime;
    score.voices.forEach((v, k) => {
      let i = this.next[k];
      for (; i < v.n.length; i++) {
        const [b, d, m, vel = 1] = v.n[i], at = b * beat;
        if (at >= pos + AHEAD) break;
        this._note(v.inst, m, now + Math.max(0.01, at - pos), d * beat * (v.legato ?? 0.96), (v.vol ?? 0.05) * vel);
      }
      this.next[k] = i;
    });
  }

  stop() { this.score = null; }

  // The house clapping for `dur` seconds: many hands, each a short burst of
  // noise, thick at first and thinning out.
  applause(dur, loud = 1) {
    const c = this.ctx;
    if (!c) return;
    const out = this._out(), t0 = c.currentTime + 0.02;
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.6;
    const g = c.createGain();
    g.gain.value = 0.11 * loud * this.vol;
    f.connect(g).connect(out);
    const n = Math.floor(dur * 46);
    for (let i = 0; i < n; i++) {
      const u = i / n, t = t0 + u * dur + Math.random() * 0.04;
      const src = c.createBufferSource();
      src.buffer = this.music.noise;
      const e = c.createGain(), lvl = (0.35 + Math.random() * 0.65) * (u < 0.1 ? u / 0.1 : 1 - Math.max(0, u - 0.55) / 0.45);
      e.gain.setValueAtTime(Math.max(0.0001, lvl), t);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      src.connect(e).connect(f);
      src.start(t, Math.random() * 0.9, 0.06);
    }
  }

  // Tuning: the oboe's A, then the strings finding it, fifths and all.
  tune(dur = 3) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + 0.05;
    this._note('oboe', 69, t, dur * 0.9, 0.035);
    for (const [m, d] of [[69, 0.5], [62, 0.9], [57, 1.2], [76, 1.4], [55, 1.6], [69, 1.9]]) this._note('strings', m + (Math.random() - 0.5) * 0.25, t + d, dur - d, 0.014);
  }
}
