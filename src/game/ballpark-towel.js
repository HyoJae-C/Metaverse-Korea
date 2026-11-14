// Modu Ballpark: the team cheer towel held up overhead (Yozi 2026-11-15).
// Worn round the neck (core/character.js), it comes up in both hands, opened
// out with the team's name big on it, whenever its wearer cheers in the
// stands: clapping along, the wave, and their own team's hits. Loaded with
// game/ballpark-cams.js (not in the first download).
//
//   const towels = createTowels();
//   towels.up(scene, ch, seconds)  hold ch's towel up for that long
//   towels.tick(dt)                each frame: follow the heads, wave, put away
//   towels.clear()                 put them all away (leaving the stadium)

import * as THREE from 'three';
import { TEAM_LIST } from '../data/ballpark-teams.js';

const W = 0.95, H = 0.34; // the towel opened out (m)
const UP = 0.42; // m above the top of the head (the hands are up)
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';

const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const mats = new Map(); // one material per team (its name painted on)
function towelMat(t) {
  if (mats.has(t.team)) return mats.get(t.team);
  const team = TEAM_LIST.find((x) => x.id === t.team);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 184;
  const g = c.getContext('2d');
  g.fillStyle = team?.color || hex(t.color); g.fillRect(0, 0, 512, 184);
  g.fillStyle = team?.trim || hex(t.trim ?? 0xffffff);
  g.fillRect(0, 0, 512, 12); g.fillRect(0, 172, 512, 12); // the trim's stripes top and bottom
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 92px ${FONT}`;
  const name = team?.name.ko || '';
  const w = g.measureText(name).width;
  if (w > 470) g.font = `900 ${Math.floor(92 * 470 / w)}px ${FONT}`;
  g.fillText(name, 256, 96);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshLambertMaterial({ map: tex, side: THREE.FrontSide });
  mats.set(t.team, m);
  return m;
}
let geo = null;
const towelGeo = () => (geo ||= new THREE.PlaneGeometry(W, H));

export function createTowels() {
  const held = new Map(); // ch -> { mesh, marker, t, left }
  const v = new THREE.Vector3();
  function up(scene, ch, seconds) {
    if (!ch?.towel || !scene) return;
    let h = held.get(ch);
    if (!h) {
      const marker = new THREE.Object3D(); // rides on the head (core/character.js addProp)
      marker.position.y = 0.36;
      ch.addProp('head', marker);
      // Two faces back to back, so the name reads right from in front (the
      // field, the Kiss Cam) and from behind (your own camera).
      const mesh = new THREE.Group();
      const front = new THREE.Mesh(towelGeo(), towelMat(ch.towel)), back = new THREE.Mesh(towelGeo(), front.material);
      back.rotation.y = Math.PI; back.position.z = -0.004;
      mesh.add(front, back);
      scene.add(mesh);
      h = { mesh, marker, t: 0, left: 0 };
      held.set(ch, h);
    }
    h.left = Math.max(h.left, seconds);
  }
  function drop(ch, h) {
    h.mesh.removeFromParent();
    h.marker.removeFromParent();
    held.delete(ch);
  }
  function tick(dt) {
    for (const [ch, h] of held) {
      h.t += dt; h.left -= dt;
      if (h.left <= 0 || !ch.root.parent) { drop(ch, h); continue; }
      h.marker.getWorldPosition(v);
      const ry = ch.root.rotation.y;
      h.mesh.position.set(v.x, v.y + UP + Math.abs(Math.sin(h.t * 7)) * 0.06, v.z);
      h.mesh.rotation.set(0, ry, Math.sin(h.t * 7) * 0.28); // waved side to side
    }
  }
  function clear() { for (const [ch, h] of held) drop(ch, h); }
  return { up, tick, clear, held: (ch) => held.has(ch) };
}
