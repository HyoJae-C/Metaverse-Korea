// Quiet movement sounds, made with Web Audio (no sound files):
// - footsteps when walking, a little quicker and firmer when running,
// - a soft wind while riding (stronger the faster you go),
// - an engine purr on the motorbike and car (pitch follows speed),
// - the bicycle bell and the horn, which nearby players hear too.
// Everything is kept low so it never gets in the way of the game.
// Pure helpers are exported for tests.

export const STEP_GAP = { walk: 0.48, run: 0.32 }; // seconds between steps
export const STEP_VOL = { walk: 0.05, run: 0.075 };
export const WIND_MAX = 0.035; // wind gain at full speed
export const ENGINE_MAX = 0.05; // engine gain
export const HORN_VOL = 0.09;
export const BELL_VOL = 0.08;
export const HEAR_RADIUS = 30; // m: others hear a bell or horn within this

// Engine: idle ~ 38 Hz, up to ~ 85 Hz at full speed (car a bit lower).
export const engineHz = (speed01, car = false) => (car ? 30 : 38) + Math.max(0, Math.min(1, speed01)) * (car ? 40 : 47);
// How loud someone else's bell or horn is at distance d (0 = silent).
export const hearGain = (d) => (d >= HEAR_RADIUS ? 0 : Math.max(0, 1 - d / HEAR_RADIUS) ** 1.5);
// Which "honk" a vehicle has: bicycles ring, motor vehicles beep.
export const honkKind = (riding) => (riding === 1 || riding === 2 || riding === 3 ? 'bell' : riding === 4 || riding === 5 || riding === 6 || riding === 7 ? 'horn' : null);
export const honkMsg = (kind) => `honk:${kind}`;
export function parseHonk(e) {
  const m = /^honk:(bell|horn)$/.exec(String(e));
  return m ? m[1] : null;
}

export class MotionSound {
  // sfx: core/music.js Sfx (its audio context and on/off switch).
  constructor(sfx) {
    this.sfx = sfx;
    this.stepT = 0;
    this.noise = null;
    this.wind = null; // { src, filter, gain }
    this.engine = null; // { osc, osc2, filter, gain }
    // Browsers only start audio after a tap or key press: wake it up then, so
    // footsteps play even before any other sound has.
    if (typeof addEventListener === 'function') {
      const unlock = () => {
        if (this.sfx.on) this.sfx._ctx();
        if (this.sfx.ctx?.state === 'running') { removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); }
      };
      addEventListener('pointerdown', unlock);
      addEventListener('keydown', unlock);
    }
  }
  _ctx() { return this.sfx.on ? this.sfx._ctx() : null; }
  _noiseBuffer(c) {
    if (this.noise) return this.noise;
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this.noise = b);
  }

  // Each frame. state: { walking, running, riding (0–5), speed01, indoor }.
  update(dt, st) {
    const c = this.sfx.on && this.sfx.ctx && this.sfx.ctx.state === 'running' ? this.sfx.ctx : null;
    // Footsteps.
    if (c && st.walking && !st.riding) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        const kind = st.running ? 'run' : 'walk';
        this.stepT = STEP_GAP[kind] * (0.94 + Math.random() * 0.12);
        this._step(c, STEP_VOL[kind] * (st.indoor ? 0.8 : 1), st.indoor);
      }
    } else this.stepT = 0.05;
    // Wind and engine.
    // (Sound switched off: let them fade out.)
    this._setWind(c, c && st.riding ? WIND_MAX * st.speed01 * (st.riding >= 4 ? 1 : 0.7) : 0);
    this._setEngine(c, c && st.riding >= 4 && st.riding !== 7 ? st.speed01 : -1, st.riding === 4 || st.riding === 6);
  }
  stopAll() { this._setWind(null, 0); this._setEngine(null, -1); }

  // One footstep: a soft heel thud (low, muffled), then the sole rolling
  // off with a faint scuff a moment later, like shoes on pavement (or a
  // wooden floor indoors).
  _step(c, vol, indoor) {
    const t = c.currentTime + 0.005;
    const noise = (start, len, type, freq, q, peak, attack) => {
      const src = c.createBufferSource();
      src.buffer = this._noiseBuffer(c);
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, start + len);
      src.connect(f).connect(g).connect(c.destination);
      src.start(start, Math.random() * 1.5);
      src.stop(start + len + 0.02);
    };
    const r = 0.9 + Math.random() * 0.2;
    // Heel: muffled thud
    noise(t, 0.085, 'lowpass', (indoor ? 520 : 380) * r, 0.9, vol, 0.006);
    const o = c.createOscillator();
    const og = c.createGain();
    o.frequency.setValueAtTime((indoor ? 120 : 85) * r, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.07);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(vol * 0.7, t + 0.006);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(og).connect(c.destination);
    o.start(t);
    o.stop(t + 0.1);
    // Sole rolling off: a soft, short scuff
    noise(t + 0.045 * r, 0.11, 'bandpass', (indoor ? 2600 : 1900) * r, 0.8, vol * 0.28, 0.02);
  }
  _setWind(c, target) {
    if (!this.wind) {
      if (!c || target <= 0.0005) return;
      const src = c.createBufferSource();
      src.buffer = this._noiseBuffer(c);
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      const gain = c.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
      this.wind = { src, filter, gain, c };
    }
    const { gain, filter, c: wc } = this.wind;
    const t = wc.currentTime;
    gain.gain.setTargetAtTime(Math.max(0, target), t, 0.25);
    filter.frequency.setTargetAtTime(350 + target / WIND_MAX * 650, t, 0.3);
    if (target <= 0.0005 && gain.gain.value < 0.001) {
      this.wind.src.stop();
      this.wind = null;
    }
  }
  _setEngine(c, speed01, car) {
    if (!this.engine) {
      if (!c || speed01 < 0) return;
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      const osc2 = c.createOscillator(); // a slightly detuned second voice: a "purr"
      osc2.type = 'square';
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 260;
      filter.Q.value = 2;
      const gain = c.createGain();
      gain.gain.value = 0;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain).connect(c.destination);
      osc.start();
      osc2.start();
      this.engine = { osc, osc2, filter, gain, c };
    }
    const e = this.engine;
    const t = e.c.currentTime;
    if (speed01 < 0) {
      e.gain.gain.setTargetAtTime(0, t, 0.15);
      if (e.gain.gain.value < 0.001) { e.osc.stop(); e.osc2.stop(); this.engine = null; }
      return;
    }
    const hz = engineHz(speed01, car);
    e.osc.frequency.setTargetAtTime(hz, t, 0.2);
    e.osc2.frequency.setTargetAtTime(hz * 0.5 * 1.012, t, 0.2);
    e.filter.frequency.setTargetAtTime(220 + speed01 * 380, t, 0.2);
    e.gain.gain.setTargetAtTime(ENGINE_MAX * (0.55 + 0.45 * speed01), t, 0.2);
  }

  // Bicycle bell: the thumb flicks the striker against a small metal dome,
  // "ting… ting". Bell-like inharmonic partials, each a slightly detuned
  // pair so it shimmers, a tiny metallic click, and a ringing decay.
  bell(gain = 1) {
    const c = this._ctx();
    if (!c || gain <= 0) return;
    const t0 = c.currentTime + 0.01;
    const f0 = 2350;
    for (const [dt, hit] of [[0, 1], [0.24, 0.8]]) {
      const t = t0 + dt;
      for (const [ratio, v, decay] of [[1, 1, 1.3], [2.32, 0.45, 0.8], [4.25, 0.18, 0.45], [6.63, 0.07, 0.25]]) {
        for (const det of [1, 1.0045]) {
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = 'sine';
          o.frequency.value = f0 * ratio * det;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(BELL_VOL * v * hit * gain * 0.5, t + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
          o.connect(g).connect(c.destination);
          o.start(t);
          o.stop(t + decay + 0.05);
        }
      }
      // The striker's click
      const src = c.createBufferSource();
      src.buffer = this._noiseBuffer(c);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 4000;
      const cg = c.createGain();
      cg.gain.setValueAtTime(BELL_VOL * 0.4 * hit * gain, t);
      cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
      src.connect(hp).connect(cg).connect(c.destination);
      src.start(t, Math.random());
      src.stop(t + 0.03);
    }
  }
  // Horn: two short "beep-beep"s, mellow (filtered square waves).
  horn(gain = 1) {
    const c = this._ctx();
    if (!c || gain <= 0) return;
    const t0 = c.currentTime + 0.01;
    for (const [dt, len] of [[0, 0.13], [0.2, 0.2]]) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      const g = c.createGain();
      const t = t0 + dt;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(HORN_VOL * gain, t + 0.015);
      g.gain.setValueAtTime(HORN_VOL * gain, t + len - 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      f.connect(g).connect(c.destination);
      for (const hz of [415, 523]) {
        const o = c.createOscillator();
        o.type = 'square';
        o.frequency.value = hz;
        o.connect(f);
        o.start(t);
        o.stop(t + len + 0.02);
      }
    }
  }
  honk(kind, gain = 1) { if (kind === 'bell') this.bell(gain); else if (kind === 'horn') this.horn(gain); }
}
