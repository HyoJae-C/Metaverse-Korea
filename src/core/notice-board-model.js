// A notice board standing on the square: two posts, a small roof, a cork
// board with a few pinned notes and a title sign.
import * as THREE from 'three';

function titleTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#fff';
  g.font = '800 64px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeNoticeBoard(title, color) {
  const root = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a3a });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), wood);
    post.position.set(s * 1.25, 1.3, 0);
    root.add(post);
  }
  const cork = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.3, 0.08), new THREE.MeshLambertMaterial({ color: 0xc89b6a }));
  cork.position.set(0, 1.55, 0);
  root.add(cork);
  const notes = [[-0.7, 1.75, 0xfff4b0], [-0.15, 1.45, 0xffffff], [0.45, 1.8, 0xd9f2e6], [0.75, 1.35, 0xffd6e0], [-0.6, 1.3, 0xe3ecff]];
  for (const [x, y, c] of notes) {
    const n = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.34), new THREE.MeshLambertMaterial({ color: c }));
    n.position.set(x, y, 0.045);
    n.rotation.z = (x * 7 % 1) * 0.2 - 0.1;
    root.add(n);
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.5), new THREE.MeshBasicMaterial({ map: titleTexture(title, color) }));
  sign.position.set(0, 2.5, 0.05);
  root.add(sign);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.12, 0.7), new THREE.MeshLambertMaterial({ color }));
  roof.position.set(0, 2.85, 0.1);
  roof.rotation.x = 0.18;
  root.add(roof);
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

// A big bobbing, sparkling "!" over a board while it has something unread.
// Call tag.userData.tick(seconds) every frame to make it pulse and twinkle.
function canvasSprite(w, h, draw, scale) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(scale, scale * h / w, 1);
  sp.renderOrder = 5;
  return sp;
}

export function makeNewTag() {
  const root = new THREE.Group();
  const glow = canvasSprite(256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    r.addColorStop(0, 'rgba(255, 230, 120, .95)');
    r.addColorStop(.5, 'rgba(255, 200, 60, .45)');
    r.addColorStop(1, 'rgba(255, 200, 60, 0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  }, 2.4);
  glow.renderOrder = 4;
  const bang = canvasSprite(256, 256, (g) => {
    const r = g.createRadialGradient(100, 90, 10, 128, 128, 110);
    r.addColorStop(0, '#ff9a7a'); r.addColorStop(.6, '#e8432c'); r.addColorStop(1, '#c42a18');
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(128, 128, 116, 0, Math.PI * 2); g.fill();
    g.fillStyle = r;
    g.beginPath(); g.arc(128, 128, 102, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.font = '900 170px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('!', 128, 138);
  }, 1.25);
  const star = (g) => {
    g.fillStyle = '#ffe066'; g.shadowColor = '#fff6c0'; g.shadowBlur = 16;
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, rr = k % 2 ? 14 : 54;
      g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  };
  const sparks = [[-0.8, 0.55, 0.5, 0], [0.85, 0.35, 0.4, 2.1], [0.6, -0.6, 0.32, 4.2], [-0.7, -0.45, 0.28, 1.1]]
    .map(([x, y, s, ph]) => { const sp = canvasSprite(128, 128, star, s); sp.position.set(x, y, 0); sp.userData = { s, ph }; return sp; });
  root.add(glow, bang, ...sparks);
  root.userData.tick = (t) => {
    const p = 1 + Math.sin(t * 6) * 0.1;
    bang.scale.set(1.25 * p, 1.25 * p, 1);
    glow.scale.setScalar(2.4 * (1 + Math.sin(t * 6) * 0.15));
    glow.material.opacity = 0.75 + Math.sin(t * 6) * 0.25;
    for (const sp of sparks) {
      const k = Math.max(0, Math.sin(t * 4 + sp.userData.ph));
      sp.scale.set(sp.userData.s * k, sp.userData.s * k, 1);
      sp.material.rotation = t * 2 + sp.userData.ph;
    }
  };
  return root;
}
