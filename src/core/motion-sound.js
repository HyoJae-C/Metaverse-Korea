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
export const honkKind = (riding) => (riding === 1 || riding === 2 || riding === 3 ? 'bell' : riding === 4 || riding === 5 ? 'horn' : null);
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
    this._setWind(c, c && st.riding ? WIND_MAX * st.speed01 * (st.riding === 4 || st.riding === 5 ? 1 : 0.7) : 0);
    this._setEngine(c, c && (st.riding === 4 || st.riding === 5) ? st.speed01 : -1, st.riding === 4);
  }
  stopAll() { this._setWind(null, 0); this._setEngine(null, -1); }

  _step(c, vol, indoor) {
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer(c);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = (indoor ? 900 : 650) + Math.random() * 250;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t, Math.random() * 1.5);
    src.stop(t + 0.1);
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

  // Bicycle bell: two quick "ring-ring" strikes. gain: 1 = my own.
  bell(gain = 1) {
    const c = this._ctx();
    if (!c || gain <= 0) return;
    const t0 = c.currentTime + 0.01;
    for (const dt of [0, 0.16]) {
      for (const [f, v] of [[2093, 1], [2637, 0.5], [5200, 0.15]]) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const t = t0 + dt;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(BELL_VOL * v * gain, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        o.connect(g).connect(c.destination);
        o.start(t);
        o.stop(t + 0.5);
      }
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
