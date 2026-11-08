// The roller coaster's speed and wind, on top of the 3D view (riding is in
// main.js, the numbers come from coaster.js rideFx):
// - speed lines streaming in from the screen's edges and a darkening round
//   the edge (a light canvas over the scene; no post-processing),
// - pink cotton candy bits flying past the camera (one THREE.Points),
// - the sounds, all made with Web Audio: the chain lift's clack-clack and a
//   heartbeat getting quicker on the way up, near silence at the top, the
//   brake's "clunk", then the wind roaring with the speed, a whoosh at the
//   bottom, other riders screaming, and the tunnel muffling it all.
import * as THREE from 'three';

export class CoasterFx {
  // host: the element to put the overlay in, before `before`; sfx: core/music.js Sfx.
  constructor(host, before, sfx) {
    this.sfx = sfx;
    this.el = document.createElement('div');
    this.el.className = 'coaster-fx';
    this.el.hidden = true;
    this.canvas = document.createElement('canvas');
    this.vig = document.createElement('div');
    this.vig.className = 'coaster-vignette';
    this.el.append(this.canvas, this.vig);
    host.insertBefore(this.el, before);
    this.g = this.canvas.getContext('2d');
    this.lines = Array.from({ length: 46 }, () => this._line({}));
    this.on = false;
    this.wind = null;
    this.clickT = 0;
    this.beatT = 0;
    this.lastPhase = '';
    this.points = null;
    this.t = 0;
  }
  _line(l) {
    l.a = Math.random() * Math.PI * 2;
    l.r = 0.55 + Math.random() * 0.6; // where it starts, in half-diagonals
    l.len = 0.12 + Math.random() * 0.22;
    l.v = 0.8 + Math.random() * 1.2;
    l.w = 1 + Math.random() * 2.2;
    return l;
  }
  _ctx() { return this.sfx.on && this.sfx.ctx?.state === 'running' ? this.sfx.ctx : (this.sfx.on ? this.sfx._ctx() : null); }

  start(scene) {
    this.on = true;
    this.el.hidden = false;
    this.lastPhase = '';
    // Cotton candy bits round the camera (positions in the camera's space).
    const n = 70;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this._bit(pos, i, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffc2dd', size: 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  _bit(pos, i, anywhere) {
    pos[i * 3] = (Math.random() - 0.5) * 6;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
    pos[i * 3 + 2] = anywhere ? -Math.random() * 22 : -16 - Math.random() * 6;
  }
  stop() {
    this.on = false;
    this.el.hidden = true;
    this.points?.removeFromParent();
    this.points?.geometry.dispose();
    this.points = null;
    this._setWind(null, 0, 0);
  }

  // Each frame while riding. fx: rideFx(); k: speed / top; phase; camera;
  // tunnel: inside the chocolate tunnel.
  update(dt, { fx, k, v, phase, camera, tunnel }) {
    if (!this.on) return;
    this.t += dt;
    // Speed lines and the dark edge.
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(W * dpr)) { this.canvas.width = Math.round(W * dpr); this.canvas.height = Math.round(H * dpr); }
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (fx.lines > 0.01) {
      const R = Math.hypot(W, H) / 2;
      g.strokeStyle = '#ffffff';
      g.lineCap = 'round';
      for (const l of this.lines) {
        l.r -= l.v * dt * (0.6 + k * 1.6);
        if (l.r < 0.3) this._line(l);
        const r0 = l.r * R, r1 = (l.r + l.len) * R;
        g.globalAlpha = fx.lines * 0.55 * Math.min(1, (l.r - 0.3) * 4);
        g.lineWidth = l.w;
        g.beginPath();
        g.moveTo(W / 2 + Math.cos(l.a) * r0, H / 2 + Math.sin(l.a) * r0);
        g.lineTo(W / 2 + Math.cos(l.a) * r1, H / 2 + Math.sin(l.a) * r1);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    this.vig.style.opacity = String(Math.min(0.85, fx.vignette + (tunnel ? 0.35 : 0)));
    // Cotton candy bits stream past (faster with the train).
    if (this.points && camera) {
      this.points.position.copy(camera.position);
      this.points.quaternion.copy(camera.quaternion);
      const pos = this.points.geometry.attributes.position.array;
      const sp = Math.max(0.4, v) * 1.1;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 2] += sp * dt;
        if (pos[i * 3 + 2] > 0.4) this._bit(pos, i, false);
      }
      this.points.geometry.attributes.position.needsUpdate = true;
      this.points.material.opacity = phase === 'board' || phase === 'unload' ? 0 : Math.min(0.9, 0.15 + k);
    }
    // Sounds.
    const c = this._ctx();
    if (c && c.state === 'running') {
      if (phase === 'lift') {
        this.clickT -= dt;
        if (this.clickT <= 0) { this.clickT = 0.16; this._click(c); }
      }
      if (phase === 'lift' || phase === 'hold') {
        this.beatT -= dt;
        if (this.beatT <= 0) { this.beatT = phase === 'hold' ? 0.42 : 0.75; this._beat(c); }
      }
      if (phase === 'drop' && this.lastPhase === 'hold') { this._clunk(c); setTimeout(() => this.on && this._scream(c), 600); }
      if (phase === 'run' && this.lastPhase === 'drop') this._whoosh(c);
    }
    const loud = phase === 'hold' ? 0.004 : phase === 'board' || phase === 'unload' ? 0 : 0.012 + 0.15 * k * k;
    this._setWind(c, tunnel ? loud * 0.55 : loud, tunnel ? 0.15 + k * 0.25 : 0.25 + k * 0.75);
    this.lastPhase = phase;
  }

  _noise(c) {
    if (this.noiseBuf) return this.noiseBuf;
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this.noiseBuf = b);
  }
  // Wind: looped noise through a low-pass; bright 0..1 opens it up.
  _setWind(c, gain, bright) {
    if (!this.wind) {
      if (!c || gain <= 0.0005) return;
      const src = c.createBufferSource();
      src.buffer = this._noise(c);
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(filter).connect(g).connect(c.destination);
      src.start();
      this.wind = { src, filter, g, c };
    }
    const w = this.wind, t = w.c.currentTime;
    w.g.gain.setTargetAtTime(c ? gain : 0, t, 0.12);
    w.filter.frequency.setTargetAtTime(250 + 3200 * bright, t, 0.15);
    if (!c || gain <= 0.0005) {
      clearTimeout(this.windOff);
      this.windOff = setTimeout(() => { if (this.wind === w && !this.on) { try { w.src.stop(); } catch { /* stopped */ } this.wind = null; } }, 900);
    }
  }
  _tone(c, { type = 'sine', f0, f1, dur, gain, at = 0 }) {
    const t = c.currentTime + 0.01 + at;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  _click(c) { this._tone(c, { type: 'square', f0: 1300, f1: 500, dur: 0.035, gain: 0.03 }); this._tone(c, { type: 'triangle', f0: 180, f1: 90, dur: 0.06, gain: 0.05 }); }
  _beat(c) { this._tone(c, { f0: 70, f1: 45, dur: 0.12, gain: 0.12 }); this._tone(c, { f0: 62, f1: 40, dur: 0.12, gain: 0.08, at: 0.16 }); }
  _clunk(c) { this._tone(c, { type: 'square', f0: 220, f1: 60, dur: 0.18, gain: 0.08 }); this._tone(c, { type: 'triangle', f0: 900, f1: 300, dur: 0.07, gain: 0.05 }); }
  _whoosh(c) {
    const t = c.currentTime + 0.01;
    const src = c.createBufferSource();
    src.buffer = this._noise(c);
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.35);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.9);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t); src.stop(t + 1.05);
  }
  // Riders screaming somewhere in the train: a few voices sliding down.
  _scream(c) {
    for (let i = 0; i < 3; i++) {
      const f0 = 700 + Math.random() * 500;
      this._tone(c, { type: 'sawtooth', f0, f1: f0 * 0.7, dur: 1.4 + Math.random() * 0.6, gain: 0.012, at: i * 0.12 });
    }
  }
}
