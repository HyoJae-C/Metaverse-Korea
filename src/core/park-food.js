// Modu Land's food trucks (themepark.js places them): three little vans
// on the lane to the bumper cars, each with its serving hatch open to the
// lane, an awning, a big model of its snack on the roof and its name on a
// board. Ice cream cones, churros and hot dogs (park-rides.js FOOD_TRUCKS).
// A simple picture of its snack is painted on the back and on the name
// board. Returns the snacks as products (bought like a market stall's) and
// where each seller sits (on a stool inside, up at the hatch), like the Han
// River market (riverside-market.js).
import * as THREE from 'three';
import { FOOD_TRUCKS, FOOD_TRUCK, truckWindow, truckSeller, SELLER_Y } from './park-rides.js';
import { localName } from './i18n.js';
import { snackModel } from './held.js';

// A flat, friendly picture of a snack, about s pixels tall, centred on (cx, cy).
const round = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
export function drawSnack(g, id, cx, cy, s) {
  g.save();
  g.translate(cx, cy);
  g.scale(s / 100, s / 100); // (drawn on a 100-unit square round the middle)
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = '#5b3a2a'; g.lineWidth = 3;
  if (id === 'icecream') {
    // A waffle cone with a criss-cross, two scoops and a cherry.
    g.beginPath(); g.moveTo(-22, -4); g.lineTo(22, -4); g.lineTo(0, 48); g.closePath();
    g.fillStyle = '#e8b06a'; g.fill(); g.stroke();
    g.save(); g.clip(); g.strokeStyle = '#b97b3a'; g.lineWidth = 2;
    for (let k = -40; k <= 40; k += 9) { g.beginPath(); g.moveTo(k, -4); g.lineTo(k + 30, 50); g.stroke(); g.beginPath(); g.moveTo(k, -4); g.lineTo(k - 30, 50); g.stroke(); }
    g.restore();
    for (const [x, y, r, c] of [[0, -14, 21, '#8fe3c7'], [0, -36, 18, '#ff9ec7']]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); g.stroke(); }
    g.beginPath(); g.arc(0, -56, 6, 0, Math.PI * 2); g.fillStyle = '#ff3b55'; g.fill(); g.stroke();
  } else if (id === 'churro') {
    // Two ridged churros in a striped paper sleeve, sugar on top.
    for (const a of [-0.28, 0.28]) {
      g.save(); g.rotate(a);
      round(g, -8, -50, 16, 90, 8); g.fillStyle = '#e09a4f'; g.fill(); g.stroke();
      g.strokeStyle = '#b06a2a'; g.lineWidth = 2;
      for (const x of [-3, 3]) { g.beginPath(); g.moveTo(x, -44); g.lineTo(x, 30); g.stroke(); }
      g.fillStyle = '#fffaf3';
      for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(((k * 7) % 11) - 5, -42 + k * 9, 1.6, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    g.beginPath(); g.moveTo(-26, 14); g.lineTo(26, 14); g.lineTo(19, 50); g.lineTo(-19, 50); g.closePath();
    g.fillStyle = '#fffaf3'; g.fill(); g.stroke();
    g.fillStyle = '#ff5a5f'; for (const x of [-14, 0, 14]) g.fillRect(x - 3, 16, 6, 33);
  } else {
    // A hot dog: the bun, the sausage poking out, a zigzag of mustard.
    round(g, -46, -12, 92, 34, 17); g.fillStyle = '#f2b866'; g.fill(); g.stroke();
    round(g, -52, -20, 104, 20, 10); g.fillStyle = '#c4462e'; g.fill(); g.stroke();
    g.strokeStyle = '#ffd53d'; g.lineWidth = 5;
    g.beginPath(); for (let k = 0; k <= 8; k++) g.lineTo(-38 + k * 9.5, k % 2 ? -16 : -6); g.stroke();
    g.strokeStyle = '#5b3a2a'; g.lineWidth = 3;
    round(g, -44, 2, 88, 22, 11); g.fillStyle = '#e9a24e'; g.fill(); g.stroke();
  }
  g.restore();
}
// The painting on the back of a van: its snack big in a cream frame, with
// little sparkles, on the awning's colour.
function backPanel(f) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const tint = f.awning === '#fffaf3' ? f.color : f.awning;
  g.fillStyle = tint; g.fillRect(0, 0, 512, 256);
  round(g, 136, 18, 240, 220, 40); g.fillStyle = '#fffaf3'; g.fill();
  g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.12)'; g.stroke();
  drawSnack(g, f.id, 256, 128, 170);
  g.fillStyle = '#fffaf3';
  for (const [x, y, r] of [[60, 70, 14], [96, 180, 9], [452, 62, 10], [420, 176, 15], [40, 140, 6], [470, 120, 6]]) { // sparkles
    g.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, rr = k % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex }));
}

function nameBoard(f) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (lang) => {
    g.fillStyle = '#fffaf3'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = f.awning === '#fffaf3' ? f.color : f.awning; g.fillRect(8, 8, 496, 112);
    // Its snack in a cream circle on the left, the name beside it.
    g.beginPath(); g.arc(70, 64, 50, 0, Math.PI * 2); g.fillStyle = '#fffaf3'; g.fill();
    drawSnack(g, f.id, 70, 64, 78);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fffaf3';
    const text = lang ? localName(f.truck, lang) : f.truck.ko;
    g.font = '900 54px "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
    g.fillText(text, 304, lang ? 64 : 54, 370);
    if (!lang) { g.font = '800 22px system-ui, sans-serif'; g.fillText(f.truck.en.toUpperCase(), 304, 100, 370); }
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
    // The picture on the back (the side away from the lane), and a stool
    // inside so the seller sits up at the hatch.
    const back = backPanel(f);
    back.position.set(-0.3, 1.4, -d / 2 - 0.01);
    back.rotation.y = Math.PI;
    g.add(back);
    box(0.4, SELLER_Y + 0.38 - 0.48, 0.4, truckSeller(f).x - f.x, (SELLER_Y + 0.38 + 0.48) / 2, truckSeller(f).z - f.z - 0.05, '#ff5f9e');
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
        desc: { en: 'From the food truck in Modu Land. Eat it as you walk round the park.', ko: '모두랜드 푸드트럭 간식. 공원을 걸으면서 먹어요.', ja: 'モドゥランドのフードトラックのおやつ。歩きながら食べよう。', zh: 'Modu乐园餐车的小吃，边逛边吃。' } },
      mesh: g, pos: new THREE.Vector3(win.x, 0, win.z),
    });
    vendors.push({ ...truckSeller(f), stall: f.id });
  }
  return { products, vendors, setSignLang: (lang) => boards.forEach((b) => b.draw(lang)) };
}
