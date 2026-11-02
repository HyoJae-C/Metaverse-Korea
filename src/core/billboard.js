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

export class Billboard {
  constructor(slides) {
    this.slides = slides.length ? slides : [{ title: 'Metaverse Korea', bg: '#ff8a65' }];
    this.i = 0;
    this.t = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    drawSlide(this.g, this.slides[0]);

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

  update(dt) {
    this.t += dt;
    if (this.t < SLIDE_SECONDS || this.slides.length < 2) return;
    this.t = 0;
    this.i = (this.i + 1) % this.slides.length;
    drawSlide(this.g, this.slides[this.i]);
    this.tex.needsUpdate = true;
  }
}
