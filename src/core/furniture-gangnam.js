// Two interior shops in Gangnam (Yozi 2026-11-25): 화이트 무드, an all-white
// look (white and light oak), and a gaming room (black with one neon colour).
// Same format as core/furniture-shop.js:
// [id, emoji, footprint [w, d], seat, name, build(g, part, box, glow)]
import * as THREE from 'three';

const WHITE = '#f4f1ec', WHITE2 = '#e6e1d8', OAK = '#d8b88a';
const BLACK = '#1c1d22', BLACK2 = '#2a2c33', NEON = '#2ee6ff';

// A box with softly rounded edges (cushions, the sofa's arms).
function soft(w, h, d, r = 0.05) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ExtrudeGeometry(s, { depth: d - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 4 }).translate(0, 0, -(d - 0.02) / 2);
}

// A game on a monitor: a dark sky, hills and a little ship, drawn once.
let gameTex = null;
function gameScreen() {
  if (gameTex) return gameTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 72;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 72);
  sky.addColorStop(0, '#0a0f3a'); sky.addColorStop(1, '#3a1a6a');
  g.fillStyle = sky; g.fillRect(0, 0, 128, 72);
  g.fillStyle = '#ffffff';
  for (const [x, y] of [[10, 8], [30, 20], [55, 6], [80, 15], [104, 9], [118, 26], [70, 30]]) g.fillRect(x, y, 1, 1);
  g.fillStyle = '#1a6a5a'; g.beginPath(); g.moveTo(0, 72); g.lineTo(0, 52); g.lineTo(30, 40); g.lineTo(60, 54); g.lineTo(95, 38); g.lineTo(128, 50); g.lineTo(128, 72); g.fill();
  g.fillStyle = NEON; g.beginPath(); g.moveTo(52, 34); g.lineTo(68, 30); g.lineTo(52, 26); g.fill();
  g.fillStyle = '#ff4a8a'; g.fillRect(74, 29, 6, 2); g.fillRect(86, 29, 6, 2);
  g.fillStyle = '#ffd34a'; g.font = 'bold 8px monospace'; g.fillText('SCORE 0420', 4, 9);
  gameTex = new THREE.CanvasTexture(c);
  gameTex.colorSpace = THREE.SRGBColorSpace;
  return gameTex;
}
const screenMat = () => new THREE.MeshBasicMaterial({ map: gameScreen() });

export const GANGNAM_FURNITURE = [
  // --- 화이트 무드: white and light oak ---
  ['f-white-sofa', '🛋️', [2.0, 0.9], 2, { en: 'White fabric sofa', ko: '화이트 패브릭 소파', ja: '白いファブリックソファ', zh: '白色布艺沙发' }, (g, part) => {
    part(soft(2.0, 0.22, 0.9, 0.06), WHITE, 0, 0.24, 0); // the base
    for (const x of [-0.46, 0.46]) part(soft(0.9, 0.14, 0.72, 0.06), WHITE, x, 0.42, 0.08); // two seat cushions
    part(soft(1.9, 0.5, 0.2, 0.08), WHITE, 0, 0.6, -0.34); // the back
    for (const x of [-0.92, 0.92]) part(soft(0.18, 0.42, 0.88, 0.07), WHITE, x, 0.43, 0); // round arms
    for (const x of [-0.5, 0.5]) part(soft(0.42, 0.36, 0.12, 0.08), WHITE2, x, 0.68, -0.18).rotation.x = -0.15; // back pillows
    for (const x of [-0.9, 0.9]) for (const z of [-0.36, 0.36]) part(new THREE.CylinderGeometry(0.025, 0.018, 0.13, 8), OAK, x, 0.065, z); // oak legs
  }],
  ['f-white-dining', '🍽️', [1.4, 1.0], false, { en: 'Round white table and chairs', ko: '화이트 원형 식탁과 의자', ja: '白い丸テーブルと椅子', zh: '白色圆桌和椅子' }, (g, part) => {
    part(new THREE.CylinderGeometry(0.45, 0.45, 0.035, 32), WHITE, 0, 0.73, 0); // the top
    part(new THREE.CylinderGeometry(0.05, 0.07, 0.7, 12), OAK, 0, 0.36, 0); // one oak pillar
    part(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 24), OAK, 0, 0.015, 0);
    part(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 20), '#ffffff', 0.1, 0.758, 0.05); // a white vase on a plate
    part(new THREE.CylinderGeometry(0.04, 0.05, 0.16, 12), '#ffffff', -0.12, 0.83, -0.08);
    for (const s of [-1, 1]) { // two chairs, one each side, facing the table
      const c = new THREE.Group(); c.position.x = 0.58 * s; c.rotation.y = -s * Math.PI / 2; g.add(c);
      const b = (w, h, d, x, y, z, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: col })); m.position.set(x, y, z); c.add(m); return m; };
      const seat = new THREE.Mesh(soft(0.42, 0.05, 0.42, 0.04), new THREE.MeshLambertMaterial({ color: WHITE }));
      seat.position.y = 0.46; c.add(seat);
      const back = new THREE.Mesh(soft(0.4, 0.34, 0.04, 0.12), new THREE.MeshLambertMaterial({ color: WHITE }));
      back.position.set(0, 0.7, -0.19); back.rotation.x = -0.1; c.add(back);
      for (const x of [-0.17, 0.17]) for (const z of [-0.17, 0.17]) b(0.03, 0.44, 0.03, x, 0.22, z, OAK);
    }
  }],
  ['f-white-shelf', '📚', [1.0, 0.36], false, { en: 'White open shelf', ko: '화이트 오픈 선반', ja: '白いオープンシェルフ', zh: '白色开放式书架' }, (g, part, box) => {
    for (const x of [-0.49, 0.49]) box(0.025, 1.6, 0.36, x, 0.8, 0, WHITE); // sides
    for (const y of [0.04, 0.42, 0.8, 1.18, 1.58]) box(1.0, 0.025, 0.36, 0, y, 0, y === 0.04 ? OAK : WHITE); // shelves, oak at the bottom
    box(0.95, 1.56, 0.01, 0, 0.8, -0.175, WHITE2); // the back
    // A few white and oak things, like a show home.
    for (const [x, h] of [[-0.3, 0.2], [-0.2, 0.26], [-0.1, 0.18]]) box(0.06, h, 0.22, x, 0.055 + h / 2 + 0.38, 0, x === -0.2 ? OAK : '#fbfaf7'); // books
    part(new THREE.SphereGeometry(0.1, 16, 10), '#ffffff', 0.25, 0.53, 0); // round vase
    part(new THREE.CylinderGeometry(0.05, 0.07, 0.24, 14), '#ffffff', -0.25, 0.94, 0);
    box(0.24, 0.16, 0.02, 0.18, 0.89, -0.14, OAK); // a picture frame
    box(0.2, 0.12, 0.01, 0.18, 0.89, -0.128, '#fbfaf7');
    box(0.3, 0.14, 0.26, 0.2, 1.27, 0, '#e9ddc8'); // a woven basket
    part(new THREE.CylinderGeometry(0.09, 0.07, 0.12, 12), '#ffffff', -0.22, 1.25, 0); // a pot with a little plant
    part(new THREE.SphereGeometry(0.1, 10, 8), '#8ab890', -0.22, 1.37, 0);
  }],
  // --- Gaming: black with cyan neon ---
  ['f-gaming-chair', '🎮', [0.72, 0.72], true, { en: 'Gaming chair', ko: '게이밍 의자', ja: 'ゲーミングチェア', zh: '电竞椅' }, (g, part, box) => {
    for (let i = 0; i < 5; i++) { // five-star base on wheels
      const a = (i / 5) * Math.PI * 2;
      const leg = box(0.05, 0.04, 0.32, Math.sin(a) * 0.16, 0.08, Math.cos(a) * 0.16, BLACK2); leg.rotation.y = a;
      part(new THREE.SphereGeometry(0.035, 8, 6), BLACK, Math.sin(a) * 0.3, 0.035, Math.cos(a) * 0.3);
    }
    part(new THREE.CylinderGeometry(0.03, 0.035, 0.3, 10), '#8a8f96', 0, 0.25, 0); // gas lift
    part(soft(0.52, 0.1, 0.5, 0.05), BLACK, 0, 0.45, 0.02); // seat
    for (const x of [-0.24, 0.24]) part(soft(0.06, 0.1, 0.46, 0.03), NEON, x, 0.5, 0.02); // raised neon side bolsters
    const back = part(soft(0.5, 0.82, 0.12, 0.1), BLACK, 0, 0.93, -0.25); back.rotation.x = -0.12; // tall racing back
    for (const x of [-0.17, 0.17]) { const st = box(0.05, 0.7, 0.01, x, 0.92, -0.18, NEON); st.rotation.x = -0.12; } // neon stripes
    part(soft(0.3, 0.1, 0.1, 0.05), BLACK2, 0, 1.08, -0.16).rotation.x = -0.12; // head pillow
    for (const s of [-1, 1]) { // armrests
      box(0.04, 0.2, 0.04, 0.3 * s, 0.56, 0, BLACK2);
      box(0.08, 0.03, 0.28, 0.3 * s, 0.67, 0.02, BLACK);
    }
  }],
  ['f-gaming-desk', '🖥️', [1.4, 0.7], false, { en: 'Gaming desk with two monitors', ko: '게이밍 책상과 모니터 2대', ja: 'モニター2台のゲーミングデスク', zh: '双屏电竞桌' }, (g, part, box, glow) => {
    box(1.4, 0.04, 0.7, 0, 0.73, 0, BLACK); // carbon top
    box(1.4, 0.012, 0.012, 0, 0.71, 0.345, glow(NEON)); // neon strip under the front edge
    for (const s of [-1, 1]) { // Z-shaped legs
      box(0.06, 0.04, 0.6, 0.62 * s, 0.02, 0, BLACK2);
      const l = box(0.06, 0.74, 0.06, 0.62 * s, 0.37, -0.02, BLACK2); l.rotation.x = 0.12;
    }
    const scr = screenMat();
    for (const [x, ry] of [[-0.4, 0.2], [0.1, -0.1]]) { // two monitors angled in
      const m = new THREE.Group(); m.position.set(x, 0.75, -0.16); m.rotation.y = ry; g.add(m);
      const add = (geo, mm, px, py, pz) => { const o = new THREE.Mesh(geo, typeof mm === 'string' ? new THREE.MeshLambertMaterial({ color: mm }) : mm); o.position.set(px, py, pz); m.add(o); return o; };
      add(new THREE.BoxGeometry(0.2, 0.012, 0.16), BLACK2, 0, 0.006, 0); // foot
      add(new THREE.BoxGeometry(0.04, 0.26, 0.03), BLACK2, 0, 0.14, -0.04); // neck
      add(new THREE.BoxGeometry(0.5, 0.3, 0.03), BLACK, 0, 0.34, -0.02); // bezel
      add(new THREE.PlaneGeometry(0.47, 0.27), scr, 0, 0.34, -0.004); // the game
    }
    box(0.46, 0.02, 0.15, -0.17, 0.76, 0.16, BLACK2); // keyboard
    box(0.44, 0.006, 0.13, -0.17, 0.772, 0.16, glow(NEON)); // its glowing keys
    part(new THREE.SphereGeometry(0.035, 10, 6).scale(0.8, 0.5, 1.2), BLACK2, 0.2, 0.76, 0.16); // mouse
    box(0.26, 0.004, 0.24, 0.2, 0.752, 0.16, '#26282e'); // mouse pad
    box(0.2, 0.44, 0.42, 0.57, 0.97, -0.08, BLACK); // the PC tower on the desk
    box(0.004, 0.36, 0.36, 0.469, 0.97, -0.08, glow(NEON)); // its glass side, lit
    for (const y of [0.88, 0.97, 1.06]) part(new THREE.TorusGeometry(0.05, 0.008, 4, 16).rotateY(Math.PI / 2), glow('#ffffff'), 0.462, y, -0.08); // fans
    part(new THREE.TorusGeometry(0.08, 0.018, 6, 16, Math.PI), BLACK2, 0.57, 1.19, -0.08); // headphones resting on the tower
  }],
  ['f-arcade-mini', '🕹️', [0.6, 0.62], false, { en: 'Mini arcade machine', ko: '미니 오락기', ja: 'ミニアーケード筐体', zh: '迷你街机' }, (g, part, box, glow) => {
    for (const s of [-1, 1]) { // side panels in the classic shape
      const sh = new THREE.Shape();
      sh.moveTo(-0.3, 0); sh.lineTo(0.3, 0); sh.lineTo(0.3, 0.95); sh.lineTo(0.18, 1.05); sh.lineTo(0.1, 1.45); sh.lineTo(-0.3, 1.5); sh.lineTo(-0.3, 0);
      // (turned so the shape's x runs front to back and it extrudes inward)
      part(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), BLACK, s > 0 ? 0.3 : -0.27, 0, 0).rotation.y = -Math.PI / 2;
      box(0.012, 0.95, 0.012, 0.3 * s, 0.475, 0.305, glow(NEON)); // neon edge up the front
    }
    box(0.54, 0.95, 0.56, 0, 0.475, -0.02, BLACK2); // the cabinet body
    const cp = box(0.54, 0.06, 0.24, 0, 0.98, 0.2, BLACK); cp.rotation.x = 0.25; // control panel
    part(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), '#c0c4ca', -0.12, 1.05, 0.2); // joystick
    part(new THREE.SphereGeometry(0.025, 10, 6), '#ff3a4a', -0.12, 1.09, 0.2);
    for (const [x, c] of [[0.04, NEON], [0.11, '#ffd34a'], [0.18, NEON]]) part(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), glow(c), x, 1.03, 0.21);
    const scr = part(new THREE.PlaneGeometry(0.46, 0.34), screenMat(), 0, 1.24, 0.02); scr.rotation.x = -0.2; // the screen
    box(0.54, 0.14, 0.04, 0, 1.47, -0.06, BLACK); // marquee
    box(0.48, 0.09, 0.005, 0, 1.47, -0.037, glow(NEON));
    box(0.5, 0.18, 0.005, 0, 0.5, 0.262, BLACK); // coin door
    for (const x of [-0.06, 0.06]) box(0.03, 0.05, 0.006, x, 0.52, 0.266, glow('#ff3a4a'));
  }],
];
