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

// A bobbing "NEW" tag over a board while it has something unread.
export function makeNewTag() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e0604d';
  g.beginPath(); g.roundRect(8, 16, 240, 96, 48); g.fill();
  g.fillStyle = '#fff';
  g.font = '900 64px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('NEW', 128, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.scale.set(1.0, 0.5, 1);
  sp.renderOrder = 5;
  return sp;
}
