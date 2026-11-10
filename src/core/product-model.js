// Small low-poly product models for shop displays: used inside rooms
// (core/interior.js) and by the street's stalls and markets (han-park,
// riverside-market, dining). Its own file so the street doesn't need the
// whole interior builder, which loads only when a room is first entered.
import * as THREE from 'three';
import { accessory } from '../data/appearance.js';
import { buildFurniture } from './furniture.js';
import { makeEars, makePaw } from './animal-wear.js';
import { skirtDisplay } from './skirt-mesh.js';

const mats = {};
export const mat = (c, opts) => (mats[c + JSON.stringify(opts || {})] ||= new THREE.MeshLambertMaterial({ color: c, ...opts }));

export function productModel(kind, color, product = null) {
  const g = new THREE.Group();
  const m = mat(color);
  const add = (geo, x = 0, y = 0, z = 0, mm = m) => {
    const mesh = new THREE.Mesh(geo, mm);
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };
  switch (kind) {
    case 'tee': {
      add(new THREE.BoxGeometry(0.5, 0.55, 0.06), 0, 0.3);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.22, 0.18, 0.06), 0.3 * s, 0.48).rotation.z = 0.5 * s;
      add(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), 0, 0.6, 0, mat('#8a8f99'));
      break;
    }
    case 'jeans':
      add(new THREE.BoxGeometry(0.42, 0.12, 0.06), 0, 0.62);
      for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.19, 0.55, 0.06), 0.11 * s, 0.3);
      break;
    case 'sneaker':
      add(new THREE.CapsuleGeometry(0.09, 0.2, 4, 8).rotateZ(Math.PI / 2), 0, 0.1);
      add(new THREE.BoxGeometry(0.38, 0.04, 0.16), 0, 0.03, 0, mat('#ffffff'));
      break;
    case 'bottle':
      add(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 12), 0, 0.14);
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 10), 0, 0.32, 0, mat('#ffffff'));
      break;
    case 'jar':
      add(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 16), 0, 0.06);
      add(new THREE.CylinderGeometry(0.125, 0.125, 0.04, 16), 0, 0.14, 0, mat('#ffffff'));
      break;
    case 'lipstick':
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 10), 0, 0.07, 0, mat('#2b2230'));
      add(new THREE.CylinderGeometry(0.028, 0.03, 0.08, 10), 0, 0.18);
      break;
    case 'cap':
      add(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.02);
      add(new THREE.BoxGeometry(0.2, 0.02, 0.16), 0, 0.03, 0.18);
      break;
    case 'hat':
      add(new THREE.CylinderGeometry(0.12, 0.15, 0.12, 14), 0, 0.08);
      add(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 18), 0, 0.02);
      break;
    case 'tote':
      add(new THREE.BoxGeometry(0.36, 0.4, 0.08), 0, 0.2);
      add(new THREE.TorusGeometry(0.1, 0.015, 4, 12, Math.PI), 0, 0.4);
      break;
    case 'plush':
      add(new THREE.SphereGeometry(0.15, 14, 10), 0, 0.15);
      for (const s of [-1, 1]) add(new THREE.CapsuleGeometry(0.035, 0.12, 4, 8), 0.06 * s, 0.33);
      break;
    case 'ramyeon': // an instant-noodle pack: a red pillow bag with a yellow label
      add(new THREE.BoxGeometry(0.34, 0.07, 0.26), 0, 0.035);
      add(new THREE.BoxGeometry(0.16, 0.075, 0.12), -0.05, 0.036, 0.02, mat('#ffd166'));
      break;
    case 'picnicmat': // a rolled-up picnic mat with a white strap
      add(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 12).rotateZ(Math.PI / 2), 0, 0.07);
      for (const sx of [-0.12, 0.12]) add(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12).rotateZ(Math.PI / 2), sx, 0.07, 0, mat('#ffffff'));
      break;
    case 'frisbee': // a frisbee lying flat, with a white rim
      add(new THREE.CylinderGeometry(0.16, 0.14, 0.03, 20), 0, 0.03);
      add(new THREE.TorusGeometry(0.15, 0.014, 6, 20).rotateX(Math.PI / 2), 0, 0.04, 0, mat('#ffffff'));
      break;
    case 'egg': // a small tray of eggs
      add(new THREE.BoxGeometry(0.3, 0.04, 0.2), 0, 0.02, 0, mat('#d9c7a6'));
      for (const ex of [-0.09, 0, 0.09]) for (const ez of [-0.05, 0.05]) add(new THREE.SphereGeometry(0.04, 10, 8).scale(1, 1.3, 1), ex, 0.07, ez);
      break;
    case 'notebook':
      add(new THREE.BoxGeometry(0.3, 0.04, 0.4), 0, 0.02);
      add(new THREE.BoxGeometry(0.28, 0.035, 0.38), 0.01, 0.022, 0, mat('#ffffff'));
      break;
    case 'pen':
      for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8).rotateZ(Math.PI / 2), 0, 0.02, -0.06 + i * 0.06);
      break;
    case 'furniture': { // a lamp for your home (lighting shops), shrunk to fit the display
      const f = buildFurniture(product?.furniture);
      const box = new THREE.Box3().setFromObject(f), size = box.getSize(new THREE.Vector3());
      f.scale.setScalar(Math.min(1, 0.55 / Math.max(size.y, 0.01), 0.5 / Math.max(size.x, size.z, 0.01)));
      g.add(f);
      break;
    }
    case 'candle':
      add(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16), 0, 0.08, 0, mat('#ffffff', { transparent: true, opacity: 0.7 }));
      add(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16), 0, 0.06);
      break;
    case 'bread':
      add(new THREE.SphereGeometry(0.14, 12, 8).scale(1.3, 0.7, 1), 0, 0.08);
      break;
    case 'bowl': // a dish of food on a white plate
      add(new THREE.CylinderGeometry(0.17, 0.12, 0.08, 16), 0, 0.04, 0, mat('#ffffff'));
      add(new THREE.SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), 0, 0.08);
      break;
    case 'bacon': // slices of raw meat on a plate
      add(new THREE.CylinderGeometry(0.19, 0.15, 0.04, 16), 0, 0.02, 0, mat('#ffffff'));
      for (let i = -1; i <= 1; i++) {
        add(new THREE.BoxGeometry(0.26, 0.03, 0.07), 0, 0.055 + (i + 1) * 0.012, i * 0.075);
        add(new THREE.BoxGeometry(0.26, 0.031, 0.015), 0, 0.055 + (i + 1) * 0.012, i * 0.075 + 0.01, mat('#fbeee4')); // fat stripe
      }
      break;
    case 'roll': // sliced gimbap
      for (let i = -1; i <= 1; i++) {
        add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12).rotateX(Math.PI / 2), i * 0.07, 0.06);
        add(new THREE.CylinderGeometry(0.045, 0.045, 0.052, 10).rotateX(Math.PI / 2), i * 0.07, 0.06, 0, mat('#fff8e8'));
      }
      break;
    case 'cup':
      add(new THREE.CylinderGeometry(0.08, 0.06, 0.2, 14), 0, 0.1);
      add(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 14), 0, 0.21, 0, mat('#ffffff'));
      break;
    case 'cocktail': // a stemmed glass with a coloured drink and a lemon slice
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 14), 0, 0.006, 0, mat('#e8f3f6', { transparent: true, opacity: 0.8 }));
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), 0, 0.07, 0, mat('#e8f3f6', { transparent: true, opacity: 0.8 }));
      add(new THREE.ConeGeometry(0.09, 0.11, 16).rotateX(Math.PI), 0, 0.185);
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 10).rotateZ(Math.PI / 2), 0.085, 0.235, 0, mat('#f5d54a'));
      break;
    case 'skewer': // grilled skewers on a plate
      add(new THREE.CylinderGeometry(0.17, 0.12, 0.03, 16), 0, 0.015, 0, mat('#ffffff'));
      for (let i = -1; i <= 1; i++) {
        add(new THREE.CylinderGeometry(0.006, 0.006, 0.32, 6).rotateZ(Math.PI / 2), 0, 0.05, i * 0.07, mat('#d9c09a'));
        for (let k = -1; k <= 1; k++) add(new THREE.BoxGeometry(0.06, 0.05, 0.05), k * 0.07, 0.05, i * 0.07);
      }
      break;
    case 'samgak': // triangle rice ball in its wrapper, a seaweed band
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 3).rotateX(Math.PI / 2), 0, 0.11, 0, mat('#fbfaf6'));
      add(new THREE.BoxGeometry(0.08, 0.1, 0.075), 0, 0.06);
      break;
    case 'milk': // a round little milk pot with a foil top
      add(new THREE.SphereGeometry(0.09, 12, 10).scale(1, 1.15, 1), 0, 0.1);
      add(new THREE.CylinderGeometry(0.035, 0.045, 0.06, 10), 0, 0.22);
      add(new THREE.CylinderGeometry(0.037, 0.037, 0.01, 10), 0, 0.255, 0, mat('#d9dde2'));
      break;
    case 'umbrella': // a furled umbrella standing on its tip
      add(new THREE.ConeGeometry(0.06, 0.5, 8).rotateX(Math.PI), 0, 0.3);
      add(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), 0, 0.6, 0, mat('#d9dde2'));
      add(new THREE.TorusGeometry(0.04, 0.012, 6, 10, Math.PI), 0.04, 0.66, 0, mat('#3b2a22'));
      break;
    case 'scarf':
      add(new THREE.TorusGeometry(0.13, 0.05, 8, 16), 0, 0.2).rotation.x = Math.PI / 2;
      break;
    case 'glasses': // round frames on a little stand
    case 'sunglasses': {
      const lens = kind === 'sunglasses' ? mat(color, { transparent: true, opacity: 0.85 }) : mat('#dff1f8', { transparent: true, opacity: 0.4 });
      const frame = kind === 'sunglasses' ? mat('#2b2230') : m;
      for (const s of [-1, 1]) {
        add(new THREE.TorusGeometry(0.07, 0.012, 6, 18), 0.085 * s, 0.14, 0, frame);
        add(new THREE.CircleGeometry(0.066, 18), 0.085 * s, 0.14, -0.002, lens);
        add(new THREE.BoxGeometry(0.012, 0.012, 0.16), 0.15 * s, 0.15, -0.08, frame); // arm
      }
      add(new THREE.BoxGeometry(0.04, 0.012, 0.012), 0, 0.15, 0, frame);
      add(new THREE.CylinderGeometry(0.02, 0.05, 0.08, 10), 0, 0.04, -0.06, mat('#fffaf0'));
      break;
    }
    case 'earrings': // a pair hanging from a small card
      add(new THREE.BoxGeometry(0.2, 0.22, 0.015), 0, 0.15, -0.02, mat('#fffaf0'));
      for (const s of [-1, 1]) {
        add(new THREE.TorusGeometry(0.035, 0.008, 6, 16), 0.05 * s, 0.13, 0.0);
        add(new THREE.SphereGeometry(0.014, 8, 6), 0.05 * s, 0.18, 0.0);
      }
      add(new THREE.CylinderGeometry(0.01, 0.05, 0.04, 10), 0, 0.02, -0.02, mat('#fffaf0'));
      break;
    case 'backpack':
      add(new THREE.CapsuleGeometry(0.13, 0.12, 4, 10).scale(1.1, 1, 0.7), 0, 0.22);
      add(new THREE.BoxGeometry(0.16, 0.1, 0.04), 0, 0.16, 0.1, mat('#fffaf0'));
      break;
    case 'beanie':
      add(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.02);
      add(new THREE.SphereGeometry(0.04, 8, 6), 0, 0.18, 0, mat('#fff8ec'));
      break;
    case 'beret':
      add(new THREE.SphereGeometry(0.17, 14, 8).scale(1, 0.32, 1), 0, 0.06);
      break;
    case 'skirt': { // the skirt itself, in its pattern (core/skirt-mesh.js)
      const sk = skirtDisplay(product?.skirt);
      if (sk) g.add(sk);
      else add(new THREE.CylinderGeometry(0.16, 0.26, 0.4, 16, 1, true), 0, 0.4);
      add(new THREE.TorusGeometry(0.08, 0.02, 6, 12, Math.PI), 0, 0.72, 0, mat('#8a8f99'));
      break;
    }
    case 'ears': { // an animal-ear headband (Nyang Meong To Pan) on a little stand
      const a = accessory('head', product?.tryOn?.head);
      add(new THREE.CylinderGeometry(0.02, 0.06, 0.12, 10), 0, 0.06, 0, mat('#fffaf0'));
      if (a) { const e = makeEars(a); e.scale.setScalar(0.5); e.position.y = 0.12; g.add(e); }
      break;
    }
    case 'paws': { // a pair of paw gloves
      const a = accessory('hand', product?.tryOn?.hand);
      if (a) for (const s of [-1, 1]) { const p = makePaw(a); p.scale.multiplyScalar(1.6); p.position.set(0.09 * s, 0.11, 0); g.add(p); }
      break;
    }
    case 'ribbon':
      for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.06, 10, 8).scale(1.3, 0.9, 0.6), 0.07 * s, 0.1);
      add(new THREE.SphereGeometry(0.03, 8, 6), 0, 0.1);
      break;
    default:
      add(new THREE.BoxGeometry(0.25, 0.25, 0.25), 0, 0.12);
  }
  return g;
}
