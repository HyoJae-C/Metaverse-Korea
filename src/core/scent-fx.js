// The little perfume effects next to a character: a few sprites (emoji or
// drawn shapes, plus soft coloured clouds) that drift for about two seconds
// and fade. Cheap on purpose: one shared pool of sprites, a texture per
// symbol made once, no lights, no shadows, nothing to collide with.
import * as THREE from 'three';

const POOL = 64; // sprites alive at once, for everyone in view together
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif';

const textures = new Map();
function texture(token) {
  let tex = textures.get(token);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (token === '@cloud') { // a soft round puff, tinted by the sprite colour
    const r = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    r.addColorStop(0, 'rgba(255,255,255,0.95)');
    r.addColorStop(0.6, 'rgba(255,255,255,0.5)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  } else if (token === '@spark') { // a four-point twinkle
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 14);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, rr = i % 2 ? 6 : 30;
      g.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  } else if (token === '@bubble') { // a soap bubble: thin rim and a shine
    g.strokeStyle = 'rgba(160,210,255,0.95)';
    g.lineWidth = 3;
    g.fillStyle = 'rgba(200,235,255,0.25)';
    g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.ellipse(23, 22, 7, 4, -0.7, 0, Math.PI * 2); g.fill();
  } else if (token === '@pearl') { // a pearl
    const r = g.createRadialGradient(26, 24, 2, 32, 32, 24);
    r.addColorStop(0, '#ffffff');
    r.addColorStop(0.7, '#efe6da');
    r.addColorStop(1, '#cfc2b4');
    g.fillStyle = r;
    g.beginPath(); g.arc(32, 32, 22, 0, Math.PI * 2); g.fill();
  } else { // an emoji
    g.font = `48px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(token, 32, 35);
  }
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(token, tex);
  return tex;
}

export class ScentFx {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'scent-fx';
    this.free = [];
    this.live = [];
    for (let i = 0; i < POOL; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
      sp.visible = false;
      sp.renderOrder = 5;
      sp.raycast = () => {}; // never in the way of taps
      this.group.add(sp);
      this.free.push({ sp });
    }
  }

  // Follow the scene being drawn (street or a shop); effects of the old one
  // are dropped.
  attach(scene) {
    if (this.group.parent === scene) return;
    this.clear();
    this.group.parent?.remove(this.group);
    scene.add(this.group);
  }

  clear() {
    for (const p of this.live) { p.sp.visible = false; this.free.push(p); }
    this.live.length = 0;
  }

  // One puff of a perfume's effect next to (x, y, z) (the character's feet).
  // big: the moment of spraying (more and closer).
  puff(x, y, z, fx, big = false) {
    if (!fx) return;
    const emoji = fx.e?.length ? fx.e : [];
    const n = emoji.length ? (big ? 7 : 3) : 0;
    for (let i = 0; i < n; i++) this._spawn(x, y, z, emoji[i % emoji.length], fx.m, null, big);
    if (fx.c) for (let i = 0; i < (big ? 4 : 2); i++) this._spawn(x, y, z, '@cloud', fx.m === 'fall' || fx.m === 'twinkle' ? 'rise' : fx.m === 'orbit' ? 'orbit' : 'rise', fx.c, big);
  }

  _spawn(x, y, z, token, motion, tint, big) {
    const p = this.free.pop();
    if (!p) return; // too much going on: skip, nobody will miss it
    const cloud = token === '@cloud';
    const a = Math.random() * Math.PI * 2;
    const r = (big ? 0.25 : 0.35) + Math.random() * 0.4;
    Object.assign(p, {
      t: 0, life: (cloud ? 2.2 : 1.8) + Math.random() * 0.6, motion, ang: a, r, cx: x, cz: z, base: y,
      x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, y: y + 0.5 + Math.random() * 0.9,
      phase: Math.random() * 6.28, size: cloud ? 0.42 + Math.random() * 0.2 : 0.24 + Math.random() * 0.08,
      max: cloud ? 0.5 : 0.95, spin: (Math.random() - 0.5) * 2,
      vx: Math.cos(a) * 0.7, vz: Math.sin(a) * 0.7, vy: 0.5,
    });
    if (motion === 'fall') p.y = y + 1.9 + Math.random() * 0.4;
    if (motion === 'pop') p.y = y + 1.1 + Math.random() * 0.3;
    const m = p.sp.material;
    m.map = texture(token);
    m.color.set(tint || '#ffffff');
    m.rotation = 0;
    m.opacity = 0;
    m.needsUpdate = true;
    p.sp.visible = true;
    p.sp.position.set(p.x, p.y, p.z);
    p.sp.scale.setScalar(0.01);
    this.live.push(p);
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        p.sp.visible = false;
        this.live.splice(i, 1);
        this.free.push(p);
        continue;
      }
      let scale = 1, fade = Math.min(1, k * 6, (1 - k) * 3);
      const sway = Math.sin(p.phase + p.t * 3) * 0.12;
      switch (p.motion) {
        case 'rise': p.y += dt * 0.35; p.x += Math.cos(p.ang) * dt * 0.08; scale = 0.7 + k * 0.6; break;
        case 'fall': p.y -= dt * 0.45; p.sp.material.rotation += p.spin * dt; break;
        case 'twinkle': scale = Math.sin(Math.PI * k) * (1 + 0.25 * Math.sin(p.t * 14)); fade = Math.min(1, Math.sin(Math.PI * k) * 2); break;
        case 'orbit': p.ang += dt * 2.2; p.x = p.cx + Math.cos(p.ang) * 0.75; p.z = p.cz + Math.sin(p.ang) * 0.75; p.y += dt * 0.3; break;
        case 'pop': {
          const d = Math.exp(-p.t * 3);
          p.x += p.vx * d * dt; p.z += p.vz * d * dt; p.y += p.vy * d * dt;
          scale = Math.min(1, k * 8) * (1 + 0.2 * Math.max(0, 1 - k * 4));
          break;
        }
        default: p.y += dt * 0.45; scale = Math.min(1, k * 7); // float
      }
      const sx = p.motion === 'orbit' || p.motion === 'pop' || p.motion === 'twinkle' ? 0 : sway;
      p.sp.position.set(p.x + sx, p.y, p.z);
      p.sp.scale.setScalar(Math.max(0.01, p.size * scale));
      p.sp.material.opacity = p.max * Math.max(0, fade);
    }
  }
}
