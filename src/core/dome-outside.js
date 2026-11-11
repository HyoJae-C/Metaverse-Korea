// Modu Ballpark from outside (the Songpa map, west of Jamsil Station),
// and the size of its room. Small on purpose: it ships with the map, while
// the stadium inside (core/dome.js) is loaded on the first visit.
import * as THREE from 'three';
import { matCache, canvasTex } from './three-kit.js';
import { TEAMS } from './ballgame.js';

const mat = matCache();
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
export const ROOM_DOME = { w: 120, d: 120, h: 34 };
// A point at radius r and angle a round the bowl (a = 0 towards +z).
export const polar = (r, a) => ({ x: r * Math.sin(a), z: r * Math.cos(a) });

// ---- The dome from outside (the Songpa map) ----------------------------------
// A white ring wall with glass bands, a low silver dome on top, the name
// over the entrance on the plaza side (+z, towards Olympic-ro). r: radius.
export function domeOutside(g, l) {
  const r = l.r || 50, h = l.h || 14;
  const wallM = new THREE.MeshLambertMaterial({ color: '#f1f3f6' });
  const wallMesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 1.5, h, 64), wallM);
  wallMesh.position.y = h / 2;
  g.add(wallMesh);
  for (const y of [h * 0.35, h * 0.72]) { // glass bands
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 2.2, 64, 1, true), mat('#8fc8ea'));
    band.position.y = y;
    g.add(band);
  }
  const roof = new THREE.Mesh(new THREE.SphereGeometry(r + 0.5, 48, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#cfd8e3' }));
  roof.scale.y = 0.36;
  roof.position.y = h;
  g.add(roof);
  // Ribs over the roof.
  for (let i = 0; i < 16; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(r + 0.55, 0.25, 4, 32, Math.PI), mat('#9aa8b8'));
    rib.scale.set(1, 0.36, 1);
    rib.rotation.y = (i / 16) * Math.PI;
    rib.position.y = h;
    g.add(rib);
  }
  // The entrance: a glass front and the sign above it. Both shrink with a
  // small (1/4 scale) dome, but never below a door a player fits through.
  const k = Math.min(1, r / 50), doorW = Math.max(7, 12 * k), doorH = Math.max(4.5, 6 * k);
  const doorM = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 1.2), mat('#4f86c6'));
  doorM.position.set(0, doorH / 2, r + 0.8);
  g.add(doorM);
  const sign = canvasTex(1024, 256, (x, w) => {
    x.fillStyle = '#1f4f8f'; x.fillRect(0, 0, w, 256);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 100px ${FONT}`; x.fillText('모두야구장', 512, 92);
    x.font = '800 60px system-ui, sans-serif'; x.fillText('MODU BALLPARK', 512, 196);
  });
  const signW = Math.max(12, 18 * k), signH = signW / 4;
  const s = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), new THREE.MeshBasicMaterial({ map: sign }));
  s.position.set(0, Math.max(h - 3, doorH + 0.4 + signH / 2), r + 1.7);
  g.add(s);
  // Team flags along the front.
  TEAMS.forEach((team, i) => {
    const a = (i - 3.5) * Math.min(0.14, 4.5 / (r + 4)); // about 4.5 m apart
    const p = polar(r + 4, a);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 9, 6), mat('#d9dde3'));
    pole.position.set(p.x, 4.5, p.z);
    g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshLambertMaterial({ color: team.color, side: THREE.DoubleSide }));
    flag.position.set(p.x + 0.85, 7.6, p.z);
    g.add(flag);
  });
}
