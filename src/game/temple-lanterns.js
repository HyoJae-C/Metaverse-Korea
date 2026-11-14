// Players' lanterns on Jogyesa's canopy, drawn (core/temple-lanterns.js has
// the rules and the server): each one takes its spot's lantern on the
// canopy (core/jogyesa-model.js), in the colour its owner picked and a size
// bigger, and the nearest few show their owner's name and wish above them as
// you walk under. Loaded by game/temple-lanterns-near.js.
//
// The canopy's own colours are kept in canopy.userData.base, which the
// lantern parade (game/lantern-parade.js) dims and lights from, so a
// lantern hung during the parade is lit with the rest.
import * as THREE from 'three';
import { localName } from '../core/i18n.js';
import { WISHES, WISH_COLORS } from '../core/lanterns.js';
import { canopySlots, JOGYESA as J } from '../data/jogyesa.js';

const NEAR = 7; // m: names show for hung lanterns this close
const MAX_TAGS = 6;
const BIG = 1.3; // a player's lantern, a size bigger than the canopy's own

// game: { scene, off (the Gyeongbokgung district's offset), labels (the
// name tags' layer) }.
export function createLanternPainter(game) {
  const { scene, off, labels } = game;
  const slots = canopySlots().map(([x, z]) => new THREE.Vector3(x + off[0], J.canopy.y - 0.35, z + off[1]));
  let canopy = null, base0 = null, mats = null, rows = [];
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  const find = () => {
    canopy = scene.getObjectByName('jogyesa-canopy');
    if (!canopy?.instanceColor) { canopy = null; return false; }
    canopy.userData.base ||= canopy.instanceColor.array.slice();
    base0 ||= canopy.userData.base.slice(); // (the canopy's own colours, before any player's)
    mats ||= Array.from({ length: canopy.count }, (_, i) => { const m = new THREE.Matrix4(); canopy.getMatrixAt(i, m); return m; });
    return true;
  };
  const paint = () => {
    if (!canopy && !find()) return;
    const base = canopy.userData.base, hung = new Map(rows.map((r) => [r.slot, r]));
    base.set(base0);
    for (let i = 0; i < canopy.count; i++) {
      const r = hung.get(i);
      if (r) { col.set(WISH_COLORS[r.color] || '#ffffff'); base[i * 3] = col.r; base[i * 3 + 1] = col.g; base[i * 3 + 2] = col.b; }
      mats[i].decompose(v, q, sc);
      canopy.setMatrixAt(i, m4.compose(v, q, sc.setScalar(r ? BIG : 1)));
    }
    canopy.instanceMatrix.needsUpdate = true;
    if (!canopy.userData.dimmed) { canopy.instanceColor.array.set(base); canopy.instanceColor.needsUpdate = true; }
  };
  // Name tags: a few divs, reused.
  const tags = Array.from({ length: MAX_TAGS }, () => {
    const d = document.createElement('div');
    d.className = 'nametag npc temple-tag';
    d.style.display = 'none';
    labels?.appendChild(d);
    return d;
  });
  const hideTags = () => { for (const d of tags) d.style.display = 'none'; };
  return {
    set(list) { rows = list.filter((r) => r.slot >= 0 && r.slot < slots.length); paint(); },
    get rows() { return rows; },
    // Every frame while you are in the yard.
    update(p, camera, w, h) {
      if (!canopy) paint();
      const near = rows.map((r) => ({ r, d: Math.hypot(slots[r.slot].x - p.x, slots[r.slot].z - p.z) }))
        .filter((o) => o.d < NEAR).sort((a, b) => a.d - b.d).slice(0, MAX_TAGS);
      tags.forEach((d, i) => {
        const o = near[i];
        if (!o) { d.style.display = 'none'; return; }
        v.copy(slots[o.r.slot]).project(camera);
        if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { d.style.display = 'none'; return; }
        const text = `🏮 ${o.r.name} · ${localName(WISHES[o.r.wish] || WISHES[0])}`;
        if (d.textContent !== text) d.textContent = text;
        d.classList.toggle('mine', !!o.r.mine);
        d.style.display = '';
        d.style.transform = `translate(-50%, -100%) translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
      });
    },
    hideTags,
    dispose() { rows = []; paint(); hideTags(); for (const d of tags) d.remove(); },
  };
}
