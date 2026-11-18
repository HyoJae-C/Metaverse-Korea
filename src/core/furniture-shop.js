// Furniture from the furniture shops on Euljiro (stores.json "furniture"
// products): only once you've bought one, then placed with Decorate. Three
// shops, three looks (Yozi 2026-11-16: new shapes, not recoloured basics):
// traditional Korean pieces, retro Euljiro, modern, and woodwork. Seven
// shops of three pieces each (Yozi 2026-11-16: three kinds a shop, more shops). Each shape comes in
// one colour (the item rule allows at most two).
// [id, emoji, footprint [w, d], seat, name, build(g, part, box, glow)]
// seat: false, true (one person), 2 (two side by side), 'floor' (two
// floor cushions) or 'bed' (two lie down); see furnitureSeats in furniture.js.
import * as THREE from 'three';

export const SHOP_FURNITURE = [
  // --- Traditional: 전통 가구 ---
  ['f-najeon', '🗄️', [1.2, 0.5], false, { en: 'Mother-of-pearl wardrobe', ko: '자개장', ja: '螺鈿のたんす', zh: '螺钿衣柜' }, (g, part, box) => {
    box(1.2, 1.5, 0.5, 0, 0.85, 0, '#1d1a1f'); // black lacquer
    box(1.24, 0.06, 0.54, 0, 1.63, 0, '#141216');
    for (const x of [-0.45, 0.45]) for (const z of [-0.2, 0.2]) box(0.06, 0.1, 0.06, x, 0.05, z, '#141216'); // legs
    box(0.012, 1.4, 0.01, 0, 0.85, 0.252, '#8a6a3a'); // the doors meet
    // Mother-of-pearl (Yozi 2026-11-16: cranes, like the old 자개장): two
    // cranes flying toward each other across the doors, with clouds, a sun
    // and a pine branch, inside an inlaid frame on each door.
    const pearl = new THREE.MeshLambertMaterial({ color: '#eef6f4', emissive: '#4a6a78', emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const pearlPink = new THREE.MeshLambertMaterial({ color: '#f6e4ea', emissive: '#6a4a5a', emissiveIntensity: 0.3 });
    const pearlGreen = new THREE.MeshLambertMaterial({ color: '#d8f0e0', emissive: '#3a6a50', emissiveIntensity: 0.3 });
    const crown = new THREE.MeshLambertMaterial({ color: '#d8323c', side: THREE.DoubleSide });
    const Z = 0.252;
    const shape = (pts) => { const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const q of pts.slice(1)) sh.lineTo(...q); return new THREE.ShapeGeometry(sh); };
    // A crane in flight, head to the left (flip: to the right), about 0.45 m across.
    const crane = (cx, cy, k, flip) => {
      const c = new THREE.Group();
      c.position.set(cx, cy, Z);
      c.scale.set(flip ? -k : k, k, 1);
      g.add(c);
      const add = (geo, m, x = 0, y = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, 0.001); c.add(o); return o; };
      add(new THREE.CircleGeometry(1, 16).scale(0.075, 0.03, 1), pearl); // body
      add(shape([[-0.05, 0.012], [-0.12, 0.03], [-0.19, 0.05], [-0.2, 0.034], [-0.12, 0.012], [-0.055, -0.006]]), pearl); // long neck
      add(new THREE.CircleGeometry(0.018, 10), pearl, -0.2, 0.044); // head
      add(shape([[-0.212, 0.05], [-0.27, 0.036], [-0.212, 0.036]]), pearl); // beak
      add(new THREE.CircleGeometry(0.008, 8), crown, -0.198, 0.06); // the red crown
      // Wings with feathered edges: the near one raised, the far one down.
      add(shape([[-0.03, 0.02], [-0.05, 0.1], [-0.03, 0.17], [0, 0.15], [0.01, 0.21], [0.04, 0.18], [0.06, 0.22], [0.08, 0.16], [0.1, 0.17], [0.09, 0.08], [0.05, 0.02]]), pearl);
      add(shape([[-0.02, -0.02], [-0.01, -0.09], [0.01, -0.08], [0.03, -0.14], [0.05, -0.11], [0.08, -0.15], [0.08, -0.06], [0.05, -0.02]]), pearl);
      add(shape([[0.07, 0.005], [0.12, 0.02], [0.11, -0.01], [0.07, -0.015]]), pearl); // tail
      for (const dy of [0, -0.014]) add(new THREE.PlaneGeometry(0.1, 0.006), pearl, 0.115, -0.02 + dy).rotation.z = -0.12; // legs trailing behind
    };
    crane(-0.27, 1.1, 1.2, false); // left door: flying up and in
    crane(0.27, 0.78, 1.05, true); // right door: answering it
    // Clouds: little rows of puffs.
    for (const [x, y, n] of [[-0.42, 1.45, 3], [0.2, 1.22, 4], [-0.2, 0.62, 3], [0.38, 0.48, 3]]) {
      for (let i = 0; i < n; i++) part(new THREE.CircleGeometry(i % 2 ? 0.026 : 0.034, 12), pearl, x + i * 0.045, y + (i % 2) * 0.012, Z + 0.001);
    }
    part(new THREE.CircleGeometry(0.06, 20), pearlPink, 0.36, 1.42, Z + 0.001); // the sun
    // A pine branch along the bottom of the left door.
    part(new THREE.PlaneGeometry(0.42, 0.018), '#b08a4a', -0.3, 0.32, Z + 0.001).rotation.z = 0.25;
    for (const [x, y] of [[-0.46, 0.3], [-0.36, 0.34], [-0.26, 0.37], [-0.16, 0.4], [-0.31, 0.27]]) part(new THREE.CircleGeometry(0.038, 7), pearlGreen, x, y + 0.02, Z + 0.002);
    // An inlaid frame round each door.
    for (const dx of [-0.3, 0.3]) for (const [w, h, x, y] of [[0.5, 0.012, 0, 0.66], [0.5, 0.012, 0, -0.66], [0.012, 1.32, 0.25, 0], [0.012, 1.32, -0.25, 0]]) {
      part(new THREE.PlaneGeometry(w, h), pearl, dx + x, 0.85 + y, Z + 0.001);
    }
    for (const s of [-1, 1]) part(new THREE.TorusGeometry(0.035, 0.008, 4, 12), '#c9a227', 0.06 * s, 0.85, 0.27); // brass pulls
  }],
  ['f-bandaji', '🧰', [0.9, 0.45], false, { en: 'Bandaji chest', ko: '반닫이', ja: 'パンダジ（衣装箱）', zh: '半开柜' }, (g, part, box) => {
    box(0.9, 0.6, 0.45, 0, 0.36, 0, '#8a4a2a'); // persimmon wood
    box(0.94, 0.04, 0.49, 0, 0.68, 0, '#6e3a20');
    for (const x of [-0.38, 0.38]) box(0.08, 0.06, 0.4, x, 0.03, 0, '#5a2e18');
    box(0.86, 0.02, 0.01, 0, 0.5, 0.227, '#4a2a18'); // the front flap's edge
    for (const x of [-0.3, 0.3]) box(0.16, 0.2, 0.01, x, 0.42, 0.229, '#2b2b31'); // iron hinges
    box(0.12, 0.14, 0.012, 0, 0.42, 0.23, '#c9a227'); // brass lock plate
    part(new THREE.CircleGeometry(0.035, 10), '#8a6a1a', 0, 0.42, 0.237);
  }],
  ['f-tea-table', '🍵', [0.8, 0.55], false, { en: 'Floor tea table', ko: '좌식 찻상', ja: '座卓の茶台', zh: '矮茶桌' }, (g, part, box) => {
    box(0.8, 0.04, 0.55, 0, 0.3, 0, '#7a4a2a');
    for (const x of [-0.34, 0.34]) for (const z of [-0.22, 0.22]) box(0.05, 0.28, 0.05, x, 0.14, z, '#5a3418');
    box(0.7, 0.03, 0.03, 0, 0.08, 0.22, '#5a3418');
    part(new THREE.CylinderGeometry(0.07, 0.06, 0.09, 12), '#e8efe6', -0.12, 0.365, 0); // a celadon teapot
    part(new THREE.SphereGeometry(0.02, 6, 4), '#c8d8c4', -0.12, 0.42, 0);
    for (const x of [0.1, 0.22]) part(new THREE.CylinderGeometry(0.035, 0.03, 0.05, 10), '#cfe0cc', x, 0.345, 0.06); // cups
  }],
  ['f-bangseok', '🟥', [1.0, 0.55], 'floor', { en: 'Floor cushions', ko: '방석 두 개', ja: '座布団ふたつ', zh: '坐垫两个' }, (g, part, box) => {
    for (const [x, c] of [[-0.25, '#c8323c'], [0.25, '#2f5aa8']]) {
      box(0.45, 0.08, 0.45, x, 0.04, 0, c);
      box(0.39, 0.085, 0.39, x, 0.042, 0, c === '#c8323c' ? '#d84a52' : '#4472c0');
      part(new THREE.CircleGeometry(0.05, 10), '#f2c14e', x, 0.086, 0).rotation.x = -Math.PI / 2; // a sewn knot
    }
  }],
  ['f-byeongpung', '🎎', [1.6, 0.4], false, { en: 'Folding screen', ko: '병풍', ja: '屏風', zh: '屏风' }, (g, part, box) => {
    const panel = new THREE.MeshLambertMaterial({ color: '#f3ead6', side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const x = -0.6 + i * 0.4, z = i % 2 ? 0.12 : -0.12;
      box(0.38, 1.2, 0.025, x, 0.66, z, panel);
      box(0.4, 0.04, 0.035, x, 1.27, z, '#5a3418');
      box(0.4, 0.06, 0.035, x, 0.06, z, '#5a3418');
      // An ink-wash plum branch, a little different on each panel.
      box(0.02, 0.5, 0.004, x - 0.05, 0.75 + i * 0.03, z + 0.015, '#3a3530').rotation.z = 0.4 - i * 0.2;
      for (const [dx, dy] of [[0.04, 0.95], [-0.08, 0.7], [0.08, 0.6]]) part(new THREE.CircleGeometry(0.025, 8), '#d84a6a', x + dx, dy, z + 0.016);
    }
  }],
  // --- Retro Euljiro: 레트로 ---
  ['f-retro-sofa', '🛋️', [1.7, 0.8], 2, { en: 'Retro check sofa', ko: '레트로 체크 소파', ja: 'レトロなチェックのソファ', zh: '复古格纹沙发' }, (g, part, box) => {
    const check = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#c86a3a'; x.fillRect(0, 0, 64, 64);
      x.fillStyle = 'rgba(70,40,25,0.45)';
      for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 6, 64); x.fillRect(0, i, 64, 6); }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1.5); t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshLambertMaterial({ map: t });
    })();
    box(1.7, 0.3, 0.75, 0, 0.3, 0, check);
    box(1.7, 0.45, 0.16, 0, 0.62, -0.3, check);
    for (const s of [-1, 1]) box(0.14, 0.32, 0.75, 0.78 * s, 0.48, 0, '#7a4a2a'); // wooden arms
    for (const x of [-0.75, 0.75]) for (const z of [-0.3, 0.3]) part(new THREE.CylinderGeometry(0.025, 0.015, 0.16, 6), '#5a3418', x, 0.08, z).rotation.x = z > 0 ? 0.2 : -0.2; // splayed legs
  }],
  ['f-steel-stool', '🪑', [0.4, 0.4], true, { en: 'Steel stool', ko: '철제 원형 의자', ja: 'スチールの丸椅子', zh: '铁艺圆凳' }, (g, part) => {
    part(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16), '#d8443a', 0, 0.45, 0); // red vinyl seat
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      part(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 6), '#9aa0a8', Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12).rotation.set(Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15);
    }
    part(new THREE.TorusGeometry(0.13, 0.008, 4, 16).rotateX(Math.PI / 2), '#9aa0a8', 0, 0.15, 0);
  }],
  ['f-crt-tv', '📺', [0.7, 0.55], false, { en: 'Old-school box TV', ko: '브라운관 TV', ja: 'ブラウン管テレビ', zh: '显像管电视' }, (g, part, box, glow) => {
    box(0.7, 0.32, 0.5, 0, 0.16, 0, '#6e4a2a'); // wooden cabinet
    box(0.62, 0.5, 0.5, 0, 0.57, -0.02, '#d8d0bc');
    box(0.44, 0.36, 0.01, -0.06, 0.58, 0.235, glow('#7ab8c8')); // the glowing screen
    for (const y of [0.68, 0.56]) part(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10).rotateX(Math.PI / 2), '#3a3a3a', 0.23, y, 0.24); // dials
    for (const s of [-1, 1]) part(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 4), '#9aa0a8', 0.08 * s, 0.98, -0.05).rotation.z = 0.5 * s; // rabbit ears
  }],
  ['f-record', '🎶', [0.9, 0.45], false, { en: 'Record player cabinet', ko: '전축 장식장', ja: 'レコードプレーヤーのキャビネット', zh: '唱机柜' }, (g, part, box) => {
    box(0.9, 0.55, 0.45, 0, 0.38, 0, '#7a4a2a');
    for (const x of [-0.38, 0.38]) box(0.04, 0.12, 0.04, x, 0.06, 0, '#5a3418');
    for (const x of [-0.25, 0.25]) box(0.3, 0.38, 0.01, x, 0.38, 0.227, '#c8b48a'); // speaker cloth
    box(0.82, 0.02, 0.4, 0, 0.665, 0, '#4a2e1a');
    part(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 24), '#1a1a1a', -0.1, 0.68, 0); // the record
    part(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 12), '#d84a3a', -0.1, 0.686, 0);
    box(0.02, 0.02, 0.2, 0.18, 0.69, -0.02, '#c0c4ca').rotation.y = 0.4; // tone arm
  }],
  // --- Modern: 모던 ---
  ['f-modular', '🛋️', [2.2, 0.9], 2, { en: 'Modular sofa', ko: '모듈 소파', ja: 'モジュールソファ', zh: '模块沙发' }, (g, part, box) => {
    for (const x of [-0.73, 0, 0.73]) {
      box(0.72, 0.3, 0.9, x, 0.15, 0, '#e8e2d6'); // three soft blocks
      box(0.72, 0.36, 0.22, x, 0.48, -0.34, '#e8e2d6');
    }
    box(0.4, 0.3, 0.1, -0.5, 0.45, -0.2, '#c86a4a').rotation.x = -0.2; // cushions
    box(0.4, 0.3, 0.1, 0.55, 0.45, -0.2, '#4a6a5a').rotation.x = -0.2;
  }],
  ['f-beanbag', '🫘', [0.8, 0.8], true, { en: 'Bean bag', ko: '빈백', ja: 'ビーズクッション', zh: '懒人沙发' }, (g, part) => {
    const bag = part(new THREE.SphereGeometry(0.42, 18, 12), '#f2c14e', 0, 0.28, 0.02);
    bag.scale.set(1, 0.62, 1);
    const back = part(new THREE.SphereGeometry(0.3, 14, 10), '#f2c14e', 0, 0.45, -0.22);
    back.scale.set(1.2, 0.9, 0.6);
  }],
  ['f-mirror', '🪞', [0.7, 0.3], false, { en: 'Round wavy mirror', ko: '웨이브 원형 거울', ja: '波形の丸い鏡', zh: '波浪圆镜' }, (g, part, box) => {
    box(0.5, 0.04, 0.25, 0, 0.02, 0, '#e8e2d6');
    box(0.05, 0.9, 0.05, 0, 0.47, -0.05, '#e8e2d6');
    const wave = new THREE.Shape();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2, r = 0.33 + Math.sin(a * 6) * 0.025;
      i ? wave.lineTo(Math.cos(a) * r, Math.sin(a) * r) : wave.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    part(new THREE.ExtrudeGeometry(wave, { depth: 0.03, bevelEnabled: false }), '#f2b8a0', 0, 1.15, -0.06);
    part(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: '#cfe0e8' }), 0, 1.15, -0.025);
  }],
  ['f-cloud-shelf', '☁️', [1.1, 0.3], false, { en: 'Arch bookshelf', ko: '아치 책장', ja: 'アーチ型の本棚', zh: '拱形书架' }, (g, part, box) => {
    box(1.1, 1.3, 0.04, 0, 0.65, -0.13, '#e8e2d6'); // back, open in front
    for (const s of [-1, 1]) box(0.04, 1.3, 0.3, 0.53 * s, 0.65, 0, '#e8e2d6');
    part(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 24, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), '#e8e2d6', 0, 1.3, 0); // the arch top
    for (const y of [0.02, 0.35, 0.8, 1.29]) box(1.04, 0.03, 0.28, 0, y, 0.01, '#d8cfbe');
    const books = ['#c86a4a', '#4a6a5a', '#f2c14e', '#7a8aa8'];
    for (let i = 0; i < 6; i++) box(0.08, 0.28, 0.2, -0.4 + i * 0.11, 0.51, 0.0, books[i % 4]);
    part(new THREE.SphereGeometry(0.12, 12, 8), '#8fbf7a', 0.25, 0.92, 0.03); // a little plant
  }],
  ['f-fabric-bed', '🛏️', [1.7, 2.2], 'bed', { en: 'Upholstered bed', ko: '패브릭 침대', ja: 'ファブリックベッド', zh: '布艺床' }, (g, part, box) => {
    box(1.7, 0.32, 2.2, 0, 0.16, 0, '#b8b0a4');
    box(1.6, 0.2, 2.05, 0, 0.42, 0.04, '#ffffff');
    box(1.62, 0.07, 1.25, 0, 0.55, 0.45, '#9cb8a8'); // a duvet
    box(1.62, 0.04, 0.3, 0, 0.6, -0.1, '#ffffff'); // folded back
    for (const x of [-0.4, 0.4]) box(0.6, 0.14, 0.38, x, 0.6, -0.75, '#f6f2ea');
    for (let i = 0; i < 4; i++) box(0.4, 0.9, 0.14, -0.6 + i * 0.4, 0.62, -1.06, '#a89c8c'); // a soft channel headboard
  }],
  // --- Cute beds: 꽃잠 침대 (Yozi 2026-11-18: cute beds, like a big flower quilt) ---
  ['f-flower-bed', '🌺', [1.6, 2.1], 'bed', { en: 'Big flower quilt bed', ko: '큰 꽃무늬 이불 침대', ja: '大きな花柄布団のベッド', zh: '大花被子床' }, (g, part, box) => {
    box(1.6, 0.3, 2.1, 0, 0.15, 0, '#f6efe4'); // a cream wooden frame
    box(1.5, 0.18, 1.95, 0, 0.39, 0.03, '#ffffff');
    const quilt = new THREE.MeshLambertMaterial({ map: flowerQuilt() });
    part(new THREE.BoxGeometry(1.58, 0.12, 1.5), quilt, 0, 0.53, 0.28); // the big flower quilt, puffy
    part(new THREE.BoxGeometry(1.58, 0.36, 0.05), quilt, 0, 0.36, 1.04); // hanging over the foot
    for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.05, 0.36, 1.5), quilt, 0.8 * s, 0.36, 0.28); // and the sides
    for (const x of [-0.38, 0.38]) {
      box(0.6, 0.15, 0.36, x, 0.56, -0.74, '#ffd6e2'); // pink pillows
      box(0.66, 0.03, 0.42, x, 0.5, -0.74, '#ffffff'); // with a frill
    }
    // A scalloped headboard: three round tops.
    box(1.6, 0.7, 0.08, 0, 0.55, -1.03, '#f6efe4');
    for (const [x, r] of [[-0.55, 0.26], [0, 0.34], [0.55, 0.26]]) part(new THREE.CylinderGeometry(r, r, 0.08, 20).rotateX(Math.PI / 2), '#f6efe4', x, 0.9, -1.03);
    part(new THREE.CircleGeometry(0.12, 5), '#f07a9a', 0, 1.02, -0.985); // a flower on it
    part(new THREE.CircleGeometry(0.05, 12), '#ffd34a', 0, 1.02, -0.98);
  }],
  ['f-cloud-bed', '☁️', [1.6, 2.1], 'bed', { en: 'Cloud bed', ko: '구름 침대', ja: '雲のベッド', zh: '云朵床' }, (g, part, box) => {
    box(1.6, 0.28, 2.1, 0, 0.14, 0, '#ffffff'); // a soft white base
    box(1.5, 0.18, 1.95, 0, 0.37, 0.03, '#ffffff');
    box(1.56, 0.1, 1.45, 0, 0.5, 0.3, '#a8d4f4'); // a sky blue duvet
    box(1.56, 0.04, 0.26, 0, 0.56, -0.38, '#ffffff'); // folded back
    for (let i = 0; i < 9; i++) part(new THREE.CircleGeometry(i % 3 ? 0.035 : 0.05, 5), '#ffe066', -0.6 + (i % 3) * 0.6 + (i % 2) * 0.2, 0.552, -0.1 + Math.floor(i / 3) * 0.45).rotation.x = -Math.PI / 2; // little stars
    for (const x of [-0.38, 0.38]) part(new THREE.SphereGeometry(0.3, 14, 10), '#ffffff', x, 0.56, -0.74).scale.set(1, 0.32, 0.6); // round pillows
    // The headboard is a cloud: white puffs, the big one in the middle.
    for (const [x, y, r] of [[-0.62, 0.62, 0.26], [-0.3, 0.86, 0.34], [0.12, 0.98, 0.4], [0.5, 0.8, 0.32], [0.72, 0.58, 0.22], [-0.1, 0.6, 0.3], [0.35, 0.56, 0.26]]) {
      part(new THREE.SphereGeometry(r, 16, 12), '#ffffff', x, y, -1.0).scale.z = 0.35;
    }
    for (const s of [-1, 1]) part(new THREE.CircleGeometry(0.04, 12), '#ffb0c0', 0.25 * s + 0.12, 0.9, -0.85); // rosy cheeks
    for (const s of [-1, 1]) part(new THREE.CircleGeometry(0.025, 10), '#4a4a5a', 0.12 * s + 0.12, 0.98, -0.855); // and two sleepy eyes
  }],
  ['f-bear-bed', '🧸', [1.6, 2.1], 'bed', { en: 'Teddy bear bed', ko: '곰돌이 침대', ja: 'くまのベッド', zh: '小熊床' }, (g, part, box) => {
    box(1.6, 0.3, 2.1, 0, 0.15, 0, '#c98b4f'); // honey wood
    box(1.5, 0.18, 1.95, 0, 0.39, 0.03, '#ffffff');
    box(1.56, 0.1, 1.45, 0, 0.52, 0.3, '#ffe2a8'); // a honey yellow duvet
    box(1.56, 0.04, 0.26, 0, 0.58, -0.38, '#ffffff');
    for (let i = 0; i < 3; i++) part(new THREE.CircleGeometry(0.09, 16), '#c98b4f', -0.45 + i * 0.45, 0.572, 0.1 + (i % 2) * 0.45).rotation.x = -Math.PI / 2; // paw prints
    for (const x of [-0.38, 0.38]) box(0.6, 0.15, 0.36, x, 0.58, -0.74, '#fff6e6');
    // The headboard is a bear's face: a round head, two ears, a muzzle.
    part(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 28).rotateX(Math.PI / 2), '#c98b4f', 0, 0.85, -1.0);
    for (const s of [-1, 1]) {
      part(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 20).rotateX(Math.PI / 2), '#c98b4f', 0.5 * s, 1.36, -1.0); // ears
      part(new THREE.CircleGeometry(0.12, 16), '#f3d9b8', 0.5 * s, 1.36, -0.945);
      part(new THREE.CircleGeometry(0.05, 12), '#2b2630', 0.2 * s, 0.98, -0.945); // eyes
      part(new THREE.CircleGeometry(0.07, 12), '#ffaaa0', 0.36 * s, 0.78, -0.945); // cheeks
    }
    part(new THREE.CircleGeometry(0.2, 20), '#f3d9b8', 0, 0.74, -0.944).scale.y = 0.75; // muzzle
    part(new THREE.CircleGeometry(0.06, 12), '#2b2630', 0, 0.8, -0.94).scale.y = 0.7; // nose
  }],
  // --- Woodwork: 원목 공방 ---
  ['f-wood-table', '🪵', [1.6, 0.9], false, { en: 'Solid wood dining table', ko: '원목 식탁', ja: '無垢材のダイニングテーブル', zh: '实木餐桌' }, (g, part, box) => {
    box(1.6, 0.07, 0.9, 0, 0.72, 0, '#b07a48'); // a thick slab
    for (let i = 0; i < 4; i++) box(1.6, 0.003, 0.012, 0, 0.756, -0.33 + i * 0.22, '#9a6638'); // board joins
    for (const s of [-1, 1]) {
      box(0.08, 0.68, 0.7, 0.66 * s, 0.34, 0, '#9a6638'); // slab legs
      box(0.08, 0.06, 0.8, 0.66 * s, 0.03, 0, '#8a5a30');
    }
    box(1.24, 0.06, 0.06, 0, 0.2, 0, '#9a6638'); // stretcher
  }],
  ['f-wood-bench', '🪑', [1.4, 0.4], 2, { en: 'Wooden bench', ko: '원목 벤치', ja: '木のベンチ', zh: '木长凳' }, (g, part, box) => {
    box(1.4, 0.06, 0.38, 0, 0.44, 0, '#c08a58');
    for (const s of [-1, 1]) {
      box(0.06, 0.41, 0.3, 0.6 * s, 0.205, 0, '#a87444');
      box(0.06, 0.04, 0.38, 0.6 * s, 0.02, 0, '#a87444');
    }
  }],
  ['f-rocking', '🪑', [0.7, 0.9], true, { en: 'Rocking chair', ko: '흔들의자', ja: 'ロッキングチェア', zh: '摇椅' }, (g, part, box) => {
    for (const s of [-1, 1]) { // the curved rockers
      const rocker = part(new THREE.TorusGeometry(1.2, 0.025, 4, 24, 0.75), '#8a5a30', 0.28 * s, 1.22, 0);
      rocker.rotation.set(0, Math.PI / 2, Math.PI * 1.5 - 0.375);
      box(0.04, 0.4, 0.04, 0.28 * s, 0.24, 0.22, '#9a6638');
      box(0.04, 0.95, 0.04, 0.28 * s, 0.5, -0.24, '#9a6638').rotation.x = -0.15;
      box(0.05, 0.04, 0.5, 0.3 * s, 0.62, 0, '#9a6638'); // arms
    }
    box(0.56, 0.05, 0.5, 0, 0.44, 0, '#b07a48');
    for (let i = 0; i < 5; i++) box(0.05, 0.6, 0.02, -0.2 + i * 0.1, 0.78, -0.28, '#b07a48').rotation.x = -0.15; // spindle back
    box(0.6, 0.06, 0.04, 0, 1.08, -0.33, '#9a6638').rotation.x = -0.15;
    box(0.42, 0.04, 0.4, 0, 0.48, 0.02, '#e8dcc0'); // a seat pad
  }],
  ['f-wood-shelf', '🪵', [1.2, 0.35], false, { en: 'Ladder shelf', ko: '원목 사다리 선반', ja: '木のはしご棚', zh: '实木梯形架' }, (g, part, box) => {
    for (const s of [-1, 1]) box(0.05, 1.7, 0.05, 0.55 * s, 0.85, -0.05, '#9a6638').rotation.x = 0.12; // leaning rails
    const shelves = [[0.25, 0.35], [0.7, 0.29], [1.15, 0.23], [1.55, 0.18]];
    for (const [y, d] of shelves) box(1.15, 0.035, d, 0, y, 0.12 - y * 0.12, '#c08a58');
    part(new THREE.CylinderGeometry(0.08, 0.06, 0.14, 10), '#e8e2d6', -0.3, 0.34, 0.1); // a pot
    part(new THREE.SphereGeometry(0.11, 10, 8), '#7aaa6a', -0.3, 0.48, 0.1);
    for (let i = 0; i < 4; i++) box(0.06, 0.22, 0.16, 0.15 + i * 0.07, 0.83, 0.04, ['#c86a4a', '#4a6a5a', '#f2c14e', '#7a8aa8'][i]);
    part(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), '#b8a07a', 0.3, 1.22, -0.02); // a basket
  }],
  // --- More for the seven shops of three ---
  ['f-gyeongdae', '🪞', [0.5, 0.4], false, { en: 'Gyeongdae dressing box', ko: '경대', ja: 'キョンデ（鏡台）', zh: '镜台' }, (g, part, box) => {
    box(0.5, 0.18, 0.38, 0, 0.09, 0, '#7a3a22'); // a low lacquered box with drawers
    for (const y of [0.05, 0.13]) box(0.44, 0.06, 0.01, 0, y, 0.191, '#6a3018');
    for (const y of [0.05, 0.13]) part(new THREE.CircleGeometry(0.012, 8), '#c9a227', 0, y, 0.197);
    for (const s of [-1, 1]) box(0.03, 0.4, 0.03, 0.17 * s, 0.38, -0.12, '#6a3018');
    const glass = part(new THREE.CircleGeometry(0.14, 24), new THREE.MeshBasicMaterial({ color: '#d8e6ee' }), 0, 0.42, -0.1);
    glass.rotation.x = -0.15;
    part(new THREE.TorusGeometry(0.145, 0.015, 6, 24), '#6a3018', 0, 0.42, -0.1).rotation.x = -0.15;
    part(new THREE.CylinderGeometry(0.025, 0.025, 0.06, 8), '#e8e0cc', 0.15, 0.21, 0.08); // a little jar
  }],
  ['f-radio', '📻', [0.45, 0.25], false, { en: 'Vintage radio', ko: '진공관 라디오', ja: '真空管ラジオ', zh: '电子管收音机' }, (g, part, box, glow) => {
    box(0.45, 0.04, 0.25, 0, 0.02, 0, '#5a3418');
    box(0.42, 0.3, 0.22, 0, 0.19, 0, '#8a5a30');
    part(new THREE.CylinderGeometry(0.21, 0.21, 0.22, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), '#8a5a30', 0, 0.34, 0); // rounded top
    box(0.24, 0.18, 0.01, -0.05, 0.22, 0.111, '#d8c8a0'); // speaker cloth
    box(0.12, 0.04, 0.01, 0.12, 0.27, 0.111, glow('#ffd27a')); // the dial glows
    for (const y of [0.17, 0.11]) part(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10).rotateX(Math.PI / 2), '#3a2a1a', 0.12, y, 0.115);
  }],
  ['f-jukebox', '🎵', [0.7, 0.5], false, { en: 'Jukebox', ko: '주크박스', ja: 'ジュークボックス', zh: '点唱机' }, (g, part, box, glow) => {
    box(0.7, 0.9, 0.5, 0, 0.45, 0, '#8a3a2a');
    part(new THREE.CylinderGeometry(0.35, 0.35, 0.5, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), '#8a3a2a', 0, 0.9, 0); // arched top
    part(new THREE.TorusGeometry(0.3, 0.03, 6, 20, Math.PI), glow('#ffb84a'), 0, 0.9, 0.26); // the glowing arch
    for (const [x, c] of [[-0.28, '#ff6a8a'], [0.28, '#6ad0ff']]) box(0.04, 0.75, 0.02, x, 0.5, 0.255, glow(c)); // light tubes
    box(0.4, 0.25, 0.01, 0, 0.82, 0.255, '#2a2228'); // the window
    for (let i = 0; i < 5; i++) part(new THREE.CylinderGeometry(0.08, 0.08, 0.004, 16).rotateX(Math.PI / 2), '#1a1a1a', -0.12 + i * 0.06, 0.82, 0.262); // records inside
    box(0.46, 0.2, 0.01, 0, 0.4, 0.255, '#c8b48a'); // speaker grille
    box(0.3, 0.06, 0.06, 0, 0.6, 0.27, '#c0c4ca'); // buttons
  }],
];

// The big flower quilt (꽃무늬 이불): big pink and red peonies with green
// leaves on cream, drawn once and shared.
let quiltTex = null;
function flowerQuilt() {
  if (quiltTex) return quiltTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff4e2'; g.fillRect(0, 0, 256, 256);
  const flower = (x, y, r, petal, heart) => {
    g.fillStyle = '#5aa86a';
    for (const a of [0.6, 2.4, 4.2]) { g.beginPath(); g.ellipse(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1, r * 0.55, r * 0.25, a, 0, Math.PI * 2); g.fill(); } // leaves
    g.fillStyle = petal;
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = heart; g.beginPath(); g.arc(x, y, r * 0.38, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd34a'; g.beginPath(); g.arc(x, y, r * 0.14, 0, Math.PI * 2); g.fill();
  };
  // Each flower again one canvas over, so the pattern runs on.
  for (const [x, y, r, p, h] of [[64, 70, 46, '#ff7aa0', '#e84a78'], [190, 180, 50, '#e8443a', '#b82a2a'], [196, 48, 28, '#ffb0c8', '#ff7aa0'], [60, 200, 30, '#ffb0c8', '#ff7aa0']]) {
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) flower(x + dx, y + dy, r, p, h);
  }
  quiltTex = new THREE.CanvasTexture(c);
  quiltTex.colorSpace = THREE.SRGBColorSpace;
  return quiltTex;
}
