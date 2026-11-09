// Another Land's rides as numbers (no 3D, so main.js and the tests can use
// them without loading the park's models, which come with import() on the
// first visit: themepark.js). Prices, where each ride stands, where seat i is
// at time t, the rides' names for their signs and attendants, and the park's
// layout: the central plaza and each ride's gate.

// Ticket prices (won): the thrill rides cost more, the gentle ones less.
// The bumper cars' fare is BUMPER_COST in bumper-cars.js.
export const RIDE_PRICE = { coaster: 7000, drop: 4000, viking: 4000, wheel: 3000, carousel: 2000 };
// The ride-all day pass, sold at the ticket booth: every ride in the park
// (bumper cars and the coaster too) as often as you like, today.
export const RIDE_PASS = 20000;
export const RIDE_SECONDS = { carousel: 24, wheel: 32, viking: 22, drop: 16 };

// Pure ride motion (unit-tested): where seat i is at time t (seconds).
export const RIDES = {
  carousel: { x: -14, z: -2, seats: 6, r: 3, speed: 0.55 },
  wheel: { x: 11, z: -9.5, seats: 8, r: 7, hub: 9.4, drop: 1.9, speed: (Math.PI * 2) / RIDE_SECONDS.wheel },
  viking: { x: -9.5, z: -10, seats: 4, pivot: 6.2, arm: 5, max: 1.05 },
  // Drop tower: seats round a pole; one shared cycle of load, climb, hold, drop.
  drop: { x: 18.5, z: -2, seats: 6, r: 1.55, low: 0.55, top: 16, cycle: 16 },
};
// Height of the drop tower's seat ring at time t (seconds).
export function dropY(t, low = RIDES.drop.low, top = RIDES.drop.top, cycle = RIDES.drop.cycle) {
  const p = ((t % cycle) + cycle) % cycle;
  if (p < 3) return low; // loading
  if (p < 11) return low + ((p - 3) / 8) * (top - low); // slow climb
  if (p < 13) return top; // hold at the top…
  if (p < 14) { const k = p - 13; return top - k * k * (top - low - 2); } // …then drop
  return low + 2 * (1 - (p - 14) / 2); // brakes, settle
}
// When a ride that starts now ends. The drop tower runs on its own cycle:
// board while it loads and you ride this cycle, otherwise the next one.
export function rideUntil(kind, now) {
  if (kind !== 'drop') return now + RIDE_SECONDS[kind];
  const { cycle } = RIDES.drop, start = Math.floor(now / cycle) * cycle;
  return now - start < 3 ? start + cycle : start + cycle * 2;
}
export function seatAt(kind, i, t, started = 0) {
  const R = RIDES[kind];
  if (kind === 'carousel') {
    const a = (i / R.seats) * Math.PI * 2 + t * R.speed;
    return { x: R.x + Math.sin(a) * R.r, y: 0.55 + 0.25 * Math.sin(t * 2.4 + i * 1.7), z: R.z + Math.cos(a) * R.r, ry: a + Math.PI / 2 };
  }
  if (kind === 'wheel') {
    const a = (i / R.seats) * Math.PI * 2 + t * R.speed;
    // Cabins hang below the rim; the seat is the cabin floor.
    return { x: R.x + Math.sin(a) * R.r, y: R.hub - Math.cos(a) * R.r - R.drop, z: R.z + 0.2, ry: 0 };
  }
  if (kind === 'drop') {
    const a = (i / R.seats) * Math.PI * 2;
    return { x: R.x + Math.sin(a) * R.r, y: dropY(t), z: R.z + Math.cos(a) * R.r, ry: a };
  }
  // viking: swings higher for the first seconds of the ride.
  const ramp = Math.min(1, Math.max(0.15, (t - started) / 8));
  const ang = R.max * ramp * Math.sin(t * 1.25);
  const off = (i - (R.seats - 1) / 2) * 1.1; // along the ship
  const along = off * Math.cos(ang) + Math.sin(ang) * R.arm;
  return { x: R.x + along, y: R.pivot - Math.cos(ang) * R.arm + off * Math.sin(ang) + 0.4, z: R.z, ry: -Math.PI / 2 };
}

// The park's layout (room metres; the gate is at the south, z = 14).
// Main Street runs north from the gate to the round central plaza with its
// fountain; the rides stand round the plaza, each in its own fenced yard
// with a gate on the side facing the plaza.
export const PLAZA = { x: 0, z: -1, r: 5.5 };
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
export const RIDE_EMOJI = { carousel: '🎠', wheel: '🎡', viking: '🏴‍☠️', drop: '🍭', bumper: '🚗', coaster: '🎢' };
