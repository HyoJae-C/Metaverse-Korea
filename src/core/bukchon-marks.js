// Marks on the ground in Bukchon (data/bukchon.js): a pair of footprints in a
// ring at each of the 8 Views (gold until you take the photo, then grey) with
// a small numbered post, and a soft glowing ring at each Open House spot.
import * as THREE from 'three';
import { BUKCHON } from '../data/bukchon.js';

function numberTexture(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#6b4630'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#f6e7c4'; x.font = '800 40px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(n), 32, 35);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class BukchonMarks {
  constructor(scene, [ox, oz]) {
    this.group = new THREE.Group();
    this.group.name = 'bukchon-marks';
    this.views = new Map();
    const ring = new THREE.RingGeometry(0.9, 1.15, 32).rotateX(-Math.PI / 2);
    const foot = new THREE.CircleGeometry(0.16, 10).rotateX(-Math.PI / 2).scale(1, 1, 1.9);
    for (const v of BUKCHON.views) {
      const g = new THREE.Group();
      g.position.set(v.at[0] + ox, 0.08, v.at[1] + oz);
      g.rotation.y = Math.atan2(v.face[0], v.face[1]); // footprints point the way to look
      const mat = new THREE.MeshBasicMaterial({ color: 0xe0a93a, transparent: true, opacity: 0.9, depthWrite: false });
      g.add(new THREE.Mesh(ring, mat));
      for (const sx of [-1, 1]) { const f = new THREE.Mesh(foot, mat); f.position.set(sx * 0.22, 0.01, 0); g.add(f); }
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.08), [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? new THREE.MeshBasicMaterial({ map: numberTexture(v.n) }) : new THREE.MeshLambertMaterial({ color: '#6b4630' }))));
      post.position.set(1.4, 1.1, 0);
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), new THREE.MeshLambertMaterial({ color: '#6b4630' }));
      stick.position.set(1.4, 0.45, 0);
      g.add(post, stick);
      this.group.add(g);
      this.views.set(v.n, mat);
    }
    const glow = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false });
    for (const p of [...BUKCHON.openHouse.parts, BUKCHON.openHouse.tree]) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 28).rotateX(-Math.PI / 2), glow);
      m.position.set(p.at[0] + ox, 0.08, p.at[1] + oz); // (in the courtyard)
      this.group.add(m);
    }
    scene.add(this.group);
  }
  // Grey out the views already photographed.
  taken(book) {
    for (const [n, mat] of this.views) mat.color.set(book.has(n) ? 0x9a9a9a : 0xe0a93a);
  }
}
