// A big screen (대형 전광판) fixed to a building's wall, high up. For now it
// shows a "coming soon" card; ads can be drawn on the same canvas later.
//
// Placed from region.json "screens": [{ at: [x, z], along, w, h, y, image,
// city, text }]: the screen goes on the building wall nearest `at` (moved
// `along` metres sideways), facing out of the building. It shows `image`, a
// `city` card ({ name, local }) for a tall screen, or a line of `text`.
import * as THREE from 'three';

const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

function inPoly(x, z, p) {
  let r = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r;
  }
  return r;
}

// The wall nearest (x, z) that is at least `minLen` long: its middle point
// nearest (x, z), the outward normal, and the building height.
export function wallNear(buildings, x, z, minLen = 8) {
  let best = null;
  for (const b of buildings) {
    const p = b.p;
    for (let i = 0; i < p.length; i++) {
      const [x1, z1] = p[i], [x2, z2] = p[(i + 1) % p.length];
      const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
      if (len < minLen) continue;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (len * len)));
      const px = x1 + dx * t, pz = z1 + dz * t, d = Math.hypot(px - x, pz - z);
      if (best && d >= best.d) continue;
      let nx = -dz / len, nz = dx / len;
      const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
      if (inPoly(mx + nx * 0.5, mz + nz * 0.5, p)) { nx = -nx; nz = -nz; }
      best = { d, x: px, z: pz, nx, nz, len, h: b.h || 10, ax: dx / len, az: dz / len, x1, z1, x2, z2, b };
    }
  }
  return best;
}

function drawSoon(g, t) {
  const { width: W, height: H } = g.canvas;
  const sky = g.createLinearGradient(0, 0, W, H);
  const k = (Math.sin(t * 0.4) + 1) / 2;
  sky.addColorStop(0, `hsl(${250 + k * 30}, 55%, 16%)`);
  sky.addColorStop(1, `hsl(${200 + k * 40}, 60%, 22%)`);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // A slow light sweep across the screen.
  const sx = ((t * 160) % (W + 400)) - 200;
  const sweep = g.createLinearGradient(sx - 120, 0, sx + 120, 0);
  sweep.addColorStop(0, 'rgba(255,255,255,0)'); sweep.addColorStop(0.5, 'rgba(255,255,255,0.10)'); sweep.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sweep; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  g.font = `900 120px ${FONT}`;
  g.fillText('광고 준비 중', W / 2, H * 0.42);
  g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 2.4);
  g.font = `800 46px ${FONT}`;
  g.fillStyle = '#ffd36e';
  g.fillText('COMING SOON', W / 2, H * 0.68);
  g.globalAlpha = 1;
  // LED dots.
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 2);
}

// A picture (e.g. the game's link-preview image), cover-fitted, with a slow
// light sweep and LED lines so it reads as a screen.
function drawImage(g, img, t) {
  const { width: W, height: H } = g.canvas;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const k = Math.max(W / img.width, H / img.height);
  const w = img.width * k, h = img.height * k;
  g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  const sx = ((t * 160) % (W + 400)) - 200;
  const sweep = g.createLinearGradient(sx - 120, 0, sx + 120, 0);
  sweep.addColorStop(0, 'rgba(255,255,255,0)'); sweep.addColorStop(0.5, 'rgba(255,255,255,0.12)'); sweep.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sweep; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 2);
}

function sweepAndLines(g, t, W, H) {
  const sx = ((t * 160) % (W + 400)) - 200;
  const sweep = g.createLinearGradient(sx - 120, 0, sx + 120, 0);
  sweep.addColorStop(0, 'rgba(255,255,255,0)'); sweep.addColorStop(0.5, 'rgba(255,255,255,0.10)'); sweep.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sweep; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 2);
}
// Shrink the font until the text fits.
function fit(g, text, px, maxW, weight = 900) {
  do g.font = `${weight} ${px}px ${FONT}`; while (g.measureText(text).width > maxW && (px -= 4) > 12);
}

// A tall screen: the next city, in its own script and in English.
function drawCity(g, city, t) {
  const { width: W, height: H } = g.canvas;
  const sky = g.createLinearGradient(0, 0, 0, H);
  const k = (Math.sin(t * 0.5 + city.hue) + 1) / 2;
  sky.addColorStop(0, `hsl(${city.hue}, 70%, ${12 + k * 6}%)`);
  sky.addColorStop(1, `hsl(${city.hue + 40}, 75%, ${26 + k * 8}%)`);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // City lights: little windows twinkling along the bottom.
  for (let i = 0; i < 26; i++) {
    const bx = (i * 97) % W, bh = 120 + ((i * 53) % 260);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(bx, H - bh, 40 + (i % 3) * 14, bh);
    g.fillStyle = `rgba(255,220,140,${0.35 + 0.35 * Math.sin(t * 2 + i)})`;
    for (let y = H - bh + 14; y < H - 10; y += 26) g.fillRect(bx + 8, y, 8, 10);
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = 0.65 + 0.35 * Math.sin(t * 2.2);
  g.fillStyle = '#ffd36e';
  fit(g, 'COMING NEXT', 64, W - 60, 800);
  g.fillText('COMING NEXT', W / 2, H * 0.12);
  g.globalAlpha = 1;
  g.fillStyle = '#fff';
  fit(g, city.local, 260, W - 60);
  g.fillText(city.local, W / 2, H * 0.36);
  fit(g, city.name, 120, W - 50);
  g.fillText(city.name, W / 2, H * 0.55);
  sweepAndLines(g, t, W, H);
}

// A wide banner with one line of text, the trailing dots blinking in turn.
function drawText(g, text, t) {
  const { width: W, height: H } = g.canvas;
  const sky = g.createLinearGradient(0, 0, W, 0);
  const k = (t * 0.08) % 1;
  sky.addColorStop(0, `hsl(${(k * 360) | 0}, 70%, 18%)`);
  sky.addColorStop(1, `hsl(${((k * 360) + 90) | 0}, 70%, 24%)`);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const base = text.replace(/\.+$/, '');
  const dots = '.'.repeat(1 + (Math.floor(t * 2.5) % 3));
  g.textAlign = 'left'; g.textBaseline = 'middle';
  fit(g, base + '...', 150, W - 120);
  const full = g.measureText(base + '...').width;
  const x0 = (W - full) / 2;
  g.shadowColor = 'rgba(255,210,110,0.8)'; g.shadowBlur = 24;
  g.fillStyle = '#fff';
  g.fillText(base, x0, H / 2 + 4);
  g.fillStyle = '#ffd36e';
  g.fillText(dots, x0 + g.measureText(base).width, H / 2 + 4);
  g.shadowBlur = 0;
  sweepAndLines(g, t, W, H);
}

export class WallScreen {
  // image: a picture to show (url), instead of the "coming soon" card.
  // city / text: see the region.json note at the top.
  constructor({ w = 20, h = 10, image = null, city = null, text = null } = {}) {
    this.t = 0;
    this.frameT = 0;
    this.city = city; this.text = text;
    this.canvas = document.createElement('canvas');
    // The longer side gets 1024 pixels; the canvas has the screen's shape.
    const k = 1024 / Math.max(w, h);
    this.canvas.width = Math.round(w * k); this.canvas.height = Math.round(h * k);
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    drawSoon(this.g, 0);
    this.img = null;
    if (image && typeof Image !== 'undefined') {
      const img = new Image();
      img.onload = () => { this.img = img; };
      img.src = image;
    }
    const root = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, h + 0.8, 0.4), new THREE.MeshLambertMaterial({ color: 0x1f1f24 }));
    frame.position.z = 0.2;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex }));
    screen.position.z = 0.42;
    root.add(frame, screen);
    this.root = root;
  }

  // Fix it on a wall from wallNear(), its bottom edge `y` metres up.
  mount(wall, y, h) {
    this.root.position.set(wall.x + wall.nx * 0.05, y + h / 2, wall.z + wall.nz * 0.05);
    this.root.rotation.y = Math.atan2(wall.nx, wall.nz);
  }

  update(dt) {
    this.t += dt;
    this.frameT += dt;
    if (this.frameT < 1 / 15) return; // 15 fps is plenty for a sign
    this.frameT = 0;
    if (this.img) drawImage(this.g, this.img, this.t);
    else if (this.city) drawCity(this.g, this.city, this.t);
    else if (this.text) drawText(this.g, this.text, this.t);
    else drawSoon(this.g, this.t);
    this.tex.needsUpdate = true;
  }
}
