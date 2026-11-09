// Another Land's food trucks (themepark.js places them): three little vans
// on the lane to the bumper cars, each with its serving hatch open to the
// lane, an awning, a big model of its snack on the roof and its name on a
// board. Ice cream cones, churros and hot dogs (park-rides.js FOOD_TRUCKS).
// Returns the snacks as products (bought like a market stall's) and where
// each seller stands, like the Han River market (riverside-market.js).
import * as THREE from 'three';
import { FOOD_TRUCKS, FOOD_TRUCK, truckWindow, truckSeller } from './park-rides.js';
import { localName } from './i18n.js';
import { snackModel } from './held.js';

function nameBoard(f) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lang) => {
    g.fillStyle = '#fffaf3'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = f.awning === '#fffaf3' ? f.color : f.awning; g.fillRect(8, 8, 496, 112);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fffaf3';
    const text = lang ? localName(f.truck, lang) : f.truck.ko;
    g.font = '900 54px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
    g.fillText(text, 256, lang ? 64 : 54, 480);
    if (!lang) { g.font = '800 22px system-ui, sans-serif'; g.fillText(f.truck.en.toUpperCase(), 256, 100, 480); }
    tex.needsUpdate = true;
  };
  draw(null);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshBasicMaterial({ map: tex }));
  return { mesh, draw };
}

// mat: the park's own material cache, so the vans merge with the rest of
// the park's still meshes, colour by colour (merge-static.js).
export function buildFoodTrucks(scene, block, mat) {
  const own = (o) => { o.traverse((m) => { if (m.isMesh) m.material = mat('#' + m.material.color.getHexString()); }); return o; };
  const products = [], vendors = [], boards = [];
  const { w, d } = FOOD_TRUCK;
  for (const f of FOOD_TRUCKS) {
    const g = new THREE.Group();
    g.position.set(f.x, 0, f.z);
    scene.add(g);
    const box = (sx, sy, sz, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c)); m.position.set(x, y, z); g.add(m); return m; };
    // The van: a rounded body in the truck's colour, a cab at the east end,
    // wheels, and the hatch cut into the side facing the lane.
    // (hollow, so the seller shows through the hatch: back, ends, roof,
    // floor, and the lane side built round the opening)
    const HX0 = -1.6, HX1 = 1, HY0 = 1.1, HY1 = 2;
    box(w, 1.9, 0.08, 0, 1.35, -d / 2 + 0.04, f.color);
    for (const s of [-1, 1]) box(0.08, 1.9, d, s * (w / 2 - 0.04), 1.35, 0, f.color);
    box(w, 0.08, d, 0, 2.26, 0, f.color);
    box(w, 0.08, d, 0, 0.44, 0, '#fffaf3');
    box(w, HY0 - 0.4, 0.08, 0, (HY0 + 0.4) / 2, d / 2 - 0.04, f.color);
    box(w, 2.3 - HY1, 0.08, 0, (HY1 + 2.3) / 2, d / 2 - 0.04, f.color);
    box(HX0 + w / 2, HY1 - HY0, 0.08, (HX0 - w / 2) / 2, (HY0 + HY1) / 2, d / 2 - 0.04, f.color);
    box(w / 2 - HX1, HY1 - HY0, 0.08, (HX1 + w / 2) / 2, (HY0 + HY1) / 2, d / 2 - 0.04, f.color);
    box(w - 0.2, 0.9, 0.3, 0, 1.0, -d / 2 + 0.25, '#fff3d6'); // the kitchen at the back
    box(w + 0.06, 0.12, d + 0.06, 0, 2.33, 0, '#fffaf3'); // roof trim
    box(1.1, 1.3, d - 0.1, w / 2 + 0.5, 1.05, 0, f.color); // the cab
    box(0.04, 0.55, d - 0.4, w / 2 + 1.06, 1.35, 0, '#8fd0ff'); // windscreen
    for (const x of [-w / 2 + 0.7, w / 2 + 0.3]) for (const z of [-d / 2, d / 2]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 14).rotateX(Math.PI / 2), mat('#7a4a2e'));
      wh.position.set(x, 0.34, z);
      g.add(wh);
    }
    box(2.8, 0.08, 0.45, -0.3, 1.08, d / 2 + 0.2, '#fffaf3'); // its counter
    for (let i = 0; i < 6; i++) { // a striped awning over the hatch
      const a = box(0.5, 0.06, 0.8, -0.3 - 1.25 + i * 0.5, 2.15, d / 2 + 0.35, i % 2 ? '#fffaf3' : f.awning === '#fffaf3' ? f.color : f.awning);
      a.rotation.x = 0.3;
    }
    const board = nameBoard(f);
    board.mesh.position.set(-0.3, 2.7, d / 2 - 0.2);
    g.add(board.mesh);
    boards.push(board);
    // A giant snack on the roof, and two on the counter.
    const big = own(snackModel(f.id));
    big.scale.setScalar(5);
    big.position.set(-0.3, 2.4, 0);
    g.add(big);
    for (const x of [-0.9, 0.3]) {
      const s = own(snackModel(f.id));
      s.scale.setScalar(2.2);
      s.position.set(x, 1.13, d / 2 + 0.2);
      g.add(s);
    }
    block(f.x + 0.5, f.z, w + 1.2, d + 0.4);
    const win = truckWindow(f);
    products.push({
      product: { id: 'al-' + f.id, model: f.id, snack: f.id, color: f.color, price: f.price, stall: f.id, name: f.name,
        desc: { en: 'From the food truck in Another Land. Eat it as you walk round the park.', ko: '어나더랜드 푸드트럭 간식. 공원을 걸으면서 먹어요.', ja: 'アナザーランドのフードトラックのおやつ。歩きながら食べよう。', zh: '另一乐园餐车的小吃，边逛边吃。' } },
      mesh: g, pos: new THREE.Vector3(win.x, 0, win.z),
    });
    vendors.push({ ...truckSeller(f), stall: f.id });
  }
  return { products, vendors, setSignLang: (lang) => boards.forEach((b) => b.draw(lang)) };
}
