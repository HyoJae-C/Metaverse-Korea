// Another Land's rides as numbers (no 3D, so main.js and the tests can use
// them without loading the park's models, which come with import() on the
// first visit: themepark.js). Prices, where each ride stands, where seat i is
// at time t, the rides' names for their signs and attendants, and the park's
// layout: the central plaza and each ride's gate.

// Every member of staff (ride attendants, the coaster's, the ticket booth)
// wears the park's uniform: a pink shirt with a white placket, navy
// trousers, white sneakers and a berry cap with a heart. Faces and hair stay
// their own (main.js lays this over a random look).
export const PARK_UNIFORM = { model: 'ranger', shirt: 'peach', pants: 'navy', shoes: 'white', head: 'cap', hatColor: 'berry', hatPatch: 'heart', face: null, ear: null, neck: null, back: null, skirt: null, tee: null };

// Ticket prices (won): the thrill rides cost more, the gentle ones less.
// The bumper cars' fare is BUMPER_COST in bumper-cars.js.
export const RIDE_PRICE = { coaster: 7000, drop: 4000, viking: 4000, wheel: 3000, carousel: 2000 };
// The ride-all day pass, sold at the ticket booth: every ride in the park
// (bumper cars and the coaster too) as often as you like, today.
export const RIDE_PASS = 20000;
export const RIDE_SECONDS = { carousel: 24, wheel: 40, viking: 22, drop: 13 };

// Pure ride motion (unit-tested): where seat i is at time t (seconds).
export const RIDES = {
  // 8 horses on the outer ring, 4 on the inner one.
  carousel: { x: -16, z: 12, seats: 12, r: 3, inner: 1.85, outer: 8, speed: 0.55 },
  // 8 gondolas of 2 (seat = gondola * 2 + side); you board the one at the bottom.
  wheel: { x: 24, z: -8, cabins: 8, seats: 16, r: 7, hub: 9.4, drop: 1.9, speed: (Math.PI * 2) / RIDE_SECONDS.wheel },
  // 4 benches of 2 along the ship, everyone facing the middle; the deck is
  // `arm` below the pivot, the end benches stand higher (to see over).
  viking: { x: -13, z: -9, seats: 8, pivot: 6.6, arm: 5, max: 1.2, rows: [-2.25, -1.1, 1.1, 2.25], bench: [1.05, 0.6, 0.6, 1.05], omega: 1.36 },
  // Drop tower: 8 seats round the pole, facing out; load, climb, hold, drop.
  drop: { x: 52, z: -4, seats: 8, r: 1.75, low: 0.55, top: 17 },
};
// The carousel, the pirate ship and the drop tower run on everyone's shared
// clock (like the coaster), in cycles: load (stopped, bars up: get on now), run, stop. So
// friends ride the same swing, and everyone sees the same ship.
export const RIDE_CYCLE = { carousel: { load: 9, run: RIDE_SECONDS.carousel, stop: 3 }, viking: { load: 9, run: RIDE_SECONDS.viking, stop: 3 }, drop: { load: 9, run: 13, stop: 2 } };
const cycleLen = (c) => c.load + c.run + c.stop;
export function ridePhase(kind, t) {
  const c = RIDE_CYCLE[kind], len = cycleLen(c), n = Math.floor(t / len), p = t - n * len;
  const phase = p < c.load ? 'load' : p < c.load + c.run ? 'run' : 'stop';
  return { n, p, phase, s: p - c.load, left: phase === 'load' ? c.load - p : 0, next: phase === 'load' ? 0 : len - p };
}
// You can get on while it loads (not in its last second, when the bars come down).
export const canBoard = (kind, t) => { const r = ridePhase(kind, t); return r.phase === 'load' && r.left > 1.2; };
// The safety bars: 0 up, 1 down. They come down at the end of loading and
// go up once it has stopped.
export function barDown(kind, t) {
  const r = ridePhase(kind, t), c = RIDE_CYCLE[kind];
  if (r.phase === 'run') return 1;
  if (r.phase === 'load') return Math.min(1, Math.max(0, (1.2 - r.left) / 0.7));
  return Math.min(1, Math.max(0, 1 - (r.p - c.load - c.run - 1) / 0.7));
}
// The pirate ship's swing: builds up for 7 s, swings high, and dies down in
// the last 6 s, ending still.
export function vikingAngle(t) {
  const r = ridePhase('viking', t), V = RIDES.viking, run = RIDE_CYCLE.viking.run;
  if (r.phase !== 'run') return 0;
  const env = Math.min(1, r.s / 7, (run - r.s) / 6);
  return V.max * Math.max(0, env) * Math.sin(r.s * V.omega);
}
// The carousel's turn: speeds up for 3 s, slows to a stop in the last 4 s.
const UP = 3, DOWN = 4;
function turned(s, run, w) {
  if (s <= 0) return 0;
  if (s < UP) return (w * s * s) / (2 * UP);
  const full = run - DOWN;
  if (s < full) return (w * UP) / 2 + w * (s - UP);
  const d = Math.min(s, run) - full;
  return (w * UP) / 2 + w * (full - UP) + w * d - (w * d * d) / (2 * DOWN);
}
export function carouselAngle(t) {
  const c = RIDE_CYCLE.carousel, r = ridePhase('carousel', t), w = RIDES.carousel.speed;
  return r.n * turned(c.run, c.run, w) + turned(r.s, c.run, w);
}
// How fast it's turning, 0..1 (the horses only bob while it turns).
export function carouselPace(t) {
  const c = RIDE_CYCLE.carousel, r = ridePhase('carousel', t);
  if (r.phase !== 'run') return 0;
  return Math.min(1, r.s / UP, (c.run - r.s) / DOWN);
}
// Height of the drop tower's seat ring at time t (seconds): still while it
// loads, a slow 8 s climb, 2 s at the top with your feet dangling, a
// one-second fall, then the brakes.
export function dropY(t) {
  const { low, top } = RIDES.drop, r = ridePhase('drop', t);
  if (r.phase !== 'run') return low;
  const s = r.s;
  if (s < 8) return low + (s / 8) * (top - low); // slow climb
  if (s < 10) return top; // hold at the top…
  if (s < 11) { const k = s - 10; return top - k * k * (top - low - 2); } // …then drop
  return low + 2 * Math.max(0, 1 - (s - 11) / 2); // brakes, settle
}
// The Ferris wheel turns all the time, on the shared clock; gondola i's angle
// from the bottom. You get on at the bottom and ride one full turn.
export const wheelAngle = (i, t) => (i / RIDES.wheel.cabins) * Math.PI * 2 + t * RIDES.wheel.speed;
// The gondola nearest the bottom now (the one you board).
export function wheelBottom(t) {
  const n = RIDES.wheel.cabins, k = Math.round((-t * RIDES.wheel.speed) / ((Math.PI * 2) / n));
  return ((k % n) + n) % n;
}
// A gondola's door is open near the bottom (and its bar shut everywhere else).
export function wheelDoorOpen(i, t) {
  const a = (((wheelAngle(i, t) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return Math.abs(a) < 0.3;
}
// When a ride that starts now ends. The carousel, the ship and the drop
// tower: at the end of this cycle (you get on while it loads). The wheel:
// one full turn, back at the bottom.
export function rideUntil(kind, now) {
  if (RIDE_CYCLE[kind]) { const c = RIDE_CYCLE[kind], r = ridePhase(kind, now); return now - r.p + c.load + c.run + 0.6; }
  return now + RIDE_SECONDS[kind];
}
// Whether you're held in (bar down, or up in the air): the action button
// switches the view instead of letting you off.
export function rideLocked(kind, seat, t) {
  if (RIDE_CYCLE[kind]) return ridePhase(kind, t).phase === 'run';
  if (kind === 'wheel') return !wheelDoorOpen(seat >> 1, t);
  return false;
}
// Where a carousel horse is (in the carousel's own turning frame, angle 0).
export function horseSpot(i) {
  const R = RIDES.carousel, out = i < R.outer;
  const a = out ? (i / R.outer) * Math.PI * 2 : ((i - R.outer + 0.5) / (R.seats - R.outer)) * Math.PI * 2;
  return { a, r: out ? R.r : R.inner };
}
// Seat i at time t: where the rider sits (feet), which way they face (ry),
// and roll: how far the ride tips them (the ship's swing, about the z axis).
export function seatAt(kind, i, t) {
  const R = RIDES[kind];
  if (kind === 'carousel') {
    const h = horseSpot(i), a = h.a + carouselAngle(t);
    const bob = 0.22 * carouselPace(t) * Math.sin(t * 2.4 + i * 1.7);
    return { x: R.x + Math.sin(a) * h.r, y: 0.62 + bob, z: R.z + Math.cos(a) * h.r, ry: a + Math.PI / 2, roll: 0 };
  }
  if (kind === 'wheel') {
    const a = wheelAngle(i >> 1, t);
    // Gondolas hang below the rim; sit on its bench, looking out over the park (south).
    return { x: R.x + Math.sin(a) * R.r + (i % 2 ? 0.38 : -0.38), y: R.hub - Math.cos(a) * R.r - R.drop + 0.12, z: R.z + 0.2 - 0.3, ry: 0, roll: 0 };
  }
  if (kind === 'drop') {
    const a = (i / R.seats) * Math.PI * 2;
    return { x: R.x + Math.sin(a) * R.r, y: dropY(t) + 0.12, z: R.z + Math.cos(a) * R.r, ry: a, roll: 0 };
  }
  // viking: the bench's spot in the ship, turned about the pivot.
  const ang = vikingAngle(t), off = R.rows[i >> 1], side = i % 2 ? 0.45 : -0.45;
  const ly = -R.arm + R.bench[i >> 1] - 0.38; // (feet: the sitting pose's seat height below the bench)
  const c = Math.cos(ang), s = Math.sin(ang);
  return { x: R.x + off * c - ly * s, y: R.pivot + off * s + ly * c, z: R.z + side, ry: off < 0 ? Math.PI / 2 : -Math.PI / 2, roll: ang };
}

// The park's layout (room metres; the gate is at the south, z = 34).
// Main Street runs north from the gate to the round central plaza with its
// fountain. The rides are spread round it, a short walk apart along winding
// paths (park-grounds.js), each in its own fenced yard with a gate on the
// side its path comes from: the carousel and the pirate ship west, by the
// coaster's avenue; the Ferris wheel and the drop tower out along the east
// promenade; the bumper cars past the food trucks, south-east.
export const PLAZA = { x: 0, z: 4, r: 6 };
// Where you board each ride (at its yard's gate) and where its attendant stands.
export const RIDE_GATES = {
  carousel: { x: RIDES.carousel.x + 5.6, z: RIDES.carousel.z, ry: Math.PI / 2, staff: { x: RIDES.carousel.x + 5.2, z: RIDES.carousel.z - 1.9, ry: Math.PI / 2 } },
  viking: { x: RIDES.viking.x + 4.6, z: RIDES.viking.z + 3.8, ry: 0, staff: { x: RIDES.viking.x + 2.6, z: RIDES.viking.z + 3.7, ry: 0 } },
  wheel: { x: RIDES.wheel.x - 2, z: RIDES.wheel.z + 4.2, ry: 0, staff: { x: RIDES.wheel.x - 4, z: RIDES.wheel.z + 3.7, ry: 0 } },
  drop: { x: RIDES.drop.x - 4.7, z: RIDES.drop.z, ry: -Math.PI / 2, staff: { x: RIDES.drop.x - 4.2, z: RIDES.drop.z + 1.9, ry: -Math.PI / 2 } },
};

// The rides' names, on the signs over their gates and in their attendants'
// name tags (the coaster's own sign is coaster-model.js).
export const COASTER_NAME = { ko: '솜사탕 특급', en: 'Cotton Candy Express', ja: 'わたあめ特急', zh: '棉花糖特快', es: 'Expreso Algodón de Azúcar', id: 'Ekspres Gulali', vi: 'Tàu Lượn Kẹo Bông', hi: 'कॉटन कैंडी एक्सप्रेस', fr: 'Express Barbe à Papa', th: 'สายไหมเอ็กซ์เพรส', ar: 'قطار غزل البنات السريع' };
export const RIDE_NAME = {
  carousel: { ko: '사탕 회전목마', en: 'Candy Carousel', ja: 'キャンディ・メリーゴーランド', zh: '糖果旋转木马', es: 'Carrusel de Caramelo', id: 'Komidi Putar Permen', vi: 'Vòng Quay Ngựa Kẹo', hi: 'कैंडी कैरोसेल', fr: 'Carrousel Bonbon', th: 'ม้าหมุนลูกกวาด', ar: 'دوّامة الحلوى' },
  viking: { ko: '초코 바이킹', en: 'Choco Viking', ja: 'チョコ・バイキング', zh: '巧克力海盗船', es: 'Vikingo de Chocolate', id: 'Viking Cokelat', vi: 'Thuyền Viking Sô-cô-la', hi: 'चॉको वाइकिंग', fr: 'Drakkar Chocolat', th: 'ไวกิ้งช็อกโก', ar: 'سفينة الشوكولاتة' },
  wheel: { ko: '무지개 관람차', en: 'Rainbow Wheel', ja: 'にじいろ観覧車', zh: '彩虹摩天轮', es: 'Noria Arcoíris', id: 'Bianglala Pelangi', vi: 'Đu Quay Cầu Vồng', hi: 'रेनबो व्हील', fr: 'Grande Roue Arc-en-ciel', th: 'ชิงช้าสวรรค์สายรุ้ง', ar: 'عجلة قوس قزح' },
  drop: { ko: '롤리팝 드롭', en: 'Lollipop Drop', ja: 'ロリポップ・ドロップ', zh: '棒棒糖跳楼机', es: 'Caída Piruleta', id: 'Menara Lolipop', vi: 'Tháp Rơi Kẹo Mút', hi: 'लॉलीपॉप ड्रॉप', fr: 'Chute Sucette', th: 'ลูกอมดิ่งพสุธา', ar: 'برج المصاصة' },
  bumper: { ko: '젤리 범퍼카', en: 'Jelly Bumper Cars', ja: 'ゼリー・バンパーカー', zh: '果冻碰碰车', es: 'Autos Chocones de Gominola', id: 'Bom-bom Car Jeli', vi: 'Xe Điện Đụng Thạch', hi: 'जेली बंपर कार', fr: 'Autos Tamponneuses Gelée', th: 'รถบั๊มเยลลี่', ar: 'سيارات الجيلي المتصادمة' },
  coaster: COASTER_NAME,
};
// The food trucks on the lane from the plaza to the bumper cars, serving
// window to the lane (+z): ice cream cones, churros and hot dogs. Each sells
// one snack, eaten from the hand (held 'food:<snack>'). Prices in won.
export const FOOD_TRUCKS = [
  { id: 'icecream', x: 12.5, z: 8.2, color: '#8fd0ff', awning: '#fffaf3', price: 3000,
    name: { ko: '아이스크림 콘', en: 'Ice Cream Cone', ja: 'ソフトクリーム', zh: '冰淇淋甜筒', es: 'Cono de helado', id: 'Es Krim Cone', vi: 'Kem ốc quế', hi: 'आइसक्रीम कोन', fr: 'Cornet de glace', th: 'ไอศกรีมโคน', ar: 'آيس كريم بالبسكويت' },
    truck: { ko: '말랑 아이스크림', en: 'Mallang Ice Cream', ja: 'マルラン・アイス', zh: '软软冰淇淋' } },
  { id: 'churro', x: 18.5, z: 9.7, color: '#ffad6b', awning: '#ff5a5f', price: 3500,
    name: { ko: '츄러스', en: 'Churros', ja: 'チュロス', zh: '吉事果', es: 'Churros', id: 'Churros', vi: 'Churros', hi: 'चुरोस', fr: 'Churros', th: 'ชูโรส', ar: 'تشوروس' },
    truck: { ko: '바삭 츄러스', en: 'Basak Churros', ja: 'バサク・チュロス', zh: '酥脆吉事果' } },
  { id: 'hotdog', x: 24.5, z: 11, color: '#ffe27a', awning: '#ff5f9e', price: 4000,
    name: { ko: '핫도그', en: 'Hot Dog', ja: 'ホットドッグ', zh: '热狗', es: 'Perrito caliente', id: 'Hot Dog', vi: 'Xúc xích kẹp bánh mì', hi: 'हॉट डॉग', fr: 'Hot-dog', th: 'ฮอทดอก', ar: 'هوت دوج' },
    truck: { ko: '통통 핫도그', en: 'Tongtong Hot Dogs', ja: 'トントン・ホットドッグ', zh: '胖胖热狗' } },
];
export const FOOD_TRUCK = { w: 4, d: 2.2 }; // the body, long side along x
// Where you stand to buy (in front of the window) and where the seller is.
export const truckWindow = (f) => ({ x: f.x, z: f.z + FOOD_TRUCK.d / 2 + 0.9 });
export const truckSeller = (f) => ({ x: f.x, z: f.z + 0.1, ry: 0 });
// The balloon clown on tall stilt shoes, by Main Street (game/balloon-clown.js).
export const CLOWN = { x: 4.8, z: 14, ry: -Math.PI / 2 };

export const RIDE_EMOJI = { carousel: '🎠', wheel: '🎡', viking: '🏴‍☠️', drop: '🍭', bumper: '🚗', coaster: '🎢' };
