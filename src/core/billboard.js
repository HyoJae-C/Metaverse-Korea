// The big screen (전광판) on a square: a tall frame with a screen that cycles
// through ads. For now the ads are the sample shops in town (house ads); real
// brand slots can be slides of the same shape later.
import * as THREE from 'three';

const W = 1024, H = 512;
export const SLIDE_SECONDS = 6;

// slide: { title, sub, bg, fg, tag }
function drawSlide(g, s) {
  g.fillStyle = s.bg; g.fillRect(0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)'); grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = s.fg || '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const font = (px, w = 800) => `${w} ${px}px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;
  let px = 120;
  g.font = font(px);
  while (g.measureText(s.title).width > W - 120 && px > 40) g.font = font((px -= 6));
  g.fillText(s.title, W / 2, H * 0.42);
  if (s.sub) {
    let sp = 44;
    g.font = font(sp, 600);
    while (g.measureText(s.sub).width > W - 120 && sp > 22) g.font = font((sp -= 2), 600);
    g.fillText(s.sub, W / 2, H * 0.68);
  }
  g.font = font(28, 700);
  g.textAlign = 'right';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillText(s.tag || 'AD', W - 28, 36);
}

// The animated title card: "모두서울" bouncing over a night skyline
// with Namsan Tower, twinkling stars and a slowly shifting sky (like a GIF).
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const SKYLINE = [ // [x, width, height] in screen units (0..W), repeats
  [0, 70, 120], [60, 50, 180], [105, 80, 140], [180, 40, 210], [215, 90, 160], [300, 60, 230], [355, 70, 150],
  [420, 50, 190], [465, 100, 130], [560, 60, 250], [615, 80, 170], [690, 45, 210], [730, 90, 140], [815, 60, 200], [870, 90, 160], [955, 69, 120],
];
const STARS = Array.from({ length: 40 }, (_, i) => [((i * 263) % 1000) / 1000, ((i * 137) % 450) / 1000, i]);
export function drawTitleCard(g, t) {
  const hue = (t * 12) % 360;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `hsl(${(250 + hue * 0.2) % 360}, 60%, 18%)`);
  sky.addColorStop(1, `hsl(${(300 + hue * 0.2) % 360}, 65%, 42%)`);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (const [x, y, i] of STARS) { // twinkle
    g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + i));
    g.fillStyle = '#fff';
    g.fillRect(x * W, y * H, 3, 3);
  }
  g.globalAlpha = 1;
  // Skyline drifting left, with Namsan Tower on the hill.
  const off = (t * 30) % W;
  g.fillStyle = 'rgba(20, 16, 40, 0.92)';
  for (const k of [0, 1]) {
    const ox = k * W - off;
    for (const [x, w, h] of SKYLINE) g.fillRect(ox + x, H - h, w + 1, h);
    g.beginPath(); g.ellipse(ox + 520, H, 160, 90, 0, Math.PI, 0); g.fill(); // Namsan
    g.fillRect(ox + 514, H - 250, 12, 160); // tower
    g.fillRect(ox + 500, H - 230, 40, 18);
    g.fillRect(ox + 518, H - 300, 4, 50);
    for (let i = 0; i < 18; i++) { // lit windows
      const [x, w, h] = SKYLINE[i % SKYLINE.length];
      if (Math.sin(t * 1.3 + i * 7) > 0.2) { g.fillStyle = 'rgba(255, 214, 120, 0.85)'; g.fillRect(ox + x + w / 3, H - h + 20 + (i % 4) * 22, 8, 8); g.fillStyle = 'rgba(20, 16, 40, 0.92)'; }
    }
  }
  // Bouncing rainbow letters.
  const text = '모두서울';
  g.font = `900 112px ${FONT}`;
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const widths = [...text].map((c) => g.measureText(c).width);
  let x = (W - widths.reduce((a, b) => a + b, 0)) / 2;
  [...text].forEach((c, i) => {
    const y = H * 0.36 + Math.sin(t * 4 - i * 0.6) * 16;
    g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.strokeText(c, x, y + 4);
    g.fillStyle = `hsl(${(hue * 3 + i * 40) % 360}, 95%, 72%)`;
    g.fillText(c, x, y);
    x += widths[i];
  });
  g.textAlign = 'center';
  g.font = `800 40px ${FONT}`;
  g.fillStyle = '#fff';
  g.globalAlpha = 0.75 + 0.25 * Math.sin(t * 3);
  g.fillText('M E T A V E R S E   S E O U L', W / 2, H * 0.58);
  g.globalAlpha = 1;
}

// A strip fixed along the bottom of every slide: who to contact about the
// game ({ label, handle }).
const STRIP = 92;
function drawContact(g, c) {
  g.fillStyle = 'rgba(16, 14, 24, 0.82)';
  g.fillRect(0, H - STRIP, W, STRIP);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(0, H - STRIP, W, 3);
  g.textBaseline = 'middle';
  const y = H - STRIP / 2 + 2;
  g.textAlign = 'left';
  g.fillStyle = '#ffffff';
  g.font = `800 38px ${FONT}`;
  g.fillText(c.label, 34, y);
  g.textAlign = 'right';
  g.font = `900 42px ${FONT}`;
  g.fillStyle = '#ffd36e';
  const hw = g.measureText(c.handle).width;
  g.fillText(c.handle, W - 34, y);
  g.font = '40px system-ui, sans-serif';
  g.fillText(c.icon || '📷', W - 46 - hw, y);
}

export class Billboard {
  // contact: { label, handle, icon } shown on every slide (optional).
  constructor(slides, contact = null) {
    this.contact = contact;
    // The animated title card first, then again after every three ads.
    const card = { anim: drawTitleCard, seconds: 10 };
    this.slides = [card];
    slides.forEach((s, i) => { this.slides.push(s); if (i % 3 === 2) this.slides.push(card); });
    this.frameT = 0;
    this.i = 0;
    this.t = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this._draw();

    const root = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x2b2b30 });
    const sw = 9, sh = sw / 2, y0 = 4.2;
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, y0, 0.5), dark);
      leg.position.set(s * sw * 0.35, y0 / 2, 0);
      root.add(leg);
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.5, sh + 0.5, 0.5), dark);
    frame.position.y = y0 + sh / 2;
    root.add(frame);
    // The screen glows (not lit by the sun), on both sides.
    for (const s of [1, -1]) {
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: this.tex }));
      screen.position.set(0, y0 + sh / 2, s * 0.26);
      if (s < 0) screen.rotation.y = Math.PI;
      root.add(screen);
    }
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.root = root;
    this.footprint = [sw * 0.35 * 2 + 0.6, 0.7]; // the two legs, for collision
  }

  _draw() {
    const s = this.slides[this.i];
    if (s.anim) s.anim(this.g, this.t);
    else drawSlide(this.g, s);
    if (this.contact) drawContact(this.g, this.contact);
    this.tex.needsUpdate = true;
  }

  update(dt) {
    this.t += dt;
    const s = this.slides[this.i];
    if (this.t >= (s.seconds || SLIDE_SECONDS) && this.slides.length > 1) {
      this.t = 0;
      this.i = (this.i + 1) % this.slides.length;
      this._draw();
    } else if (s.anim && (this.frameT += dt) >= 1 / 20) { // animate at ~20 fps
      this.frameT = 0;
      this._draw();
    }
  }
}
