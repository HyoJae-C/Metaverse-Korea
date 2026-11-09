// End-to-end check: a Han River park laid straight on the street
// (game/han-parks.js; Banpo-Jamwon first). You never leave the street: no
// room, no door. Walking around Moonlight Square and Jamwon's bank, you can
// sit on the stone steps, buy at the kiosk, cook ramen, look at the food
// trucks' goods, fish (on the pier too), sell your catch, and take a duck
// boat out while your dog waits on the bank.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/han-park.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = async (name) => { if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png` }); };
const fail = (m) => { throw new Error(m); };
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=hanpark' + Date.now());
  await page.click('#next-btn');
  await page.fill('#nickname', 'Picnic');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.evaluate(() => __mk.givePet('pet-golden'));
  const { l, offset } = await page.evaluate(async () => {
    const region = await (await fetch('regions/another-seoul/region.json')).json();
    const d = region.districts.find((x) => x.id === 'banpo-jamwon');
    const map = await (await fetch('regions/another-seoul/' + d.map)).json();
    return { l: map.landmarks.find((x) => x.type === 'hanpark'), offset: d.offset };
  });
  const ox = l.x + offset[0], oz = l.z + offset[1], c = Math.cos(l.ry), s = Math.sin(l.ry);
  const world = (x, z) => [ox + x * c + z * s, oz - x * s + z * c];
  const at = async (x, z) => { await page.evaluate(([wx, wz]) => __mk.place(wx, wz), world(x, z)); await page.waitForTimeout(250); };
  const street = async (what) => { const r = await page.evaluate(() => __mk.room()); if (r.mode !== 'street') fail(`${what}: not on the street (${JSON.stringify(r)})`); };

  // Arriving by map or taxi: dropped on the river path by Moonlight Square, on the street.
  await page.evaluate(() => __mk.enter('banpo-jamwon-hangang'));
  await page.waitForTimeout(800);
  await street('arriving');
  // The park gets built as you come near.
  await at(-24, 11);
  await page.waitForFunction(() => __mk.hanPark()?.id === 'banpo-jamwon-hangang', null, { timeout: 15000 });
  if (await page.isVisible('#store-banner')) fail('a shop banner on the street');
  await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.3, dist: 12 }), l.ry + Math.PI);
  await page.waitForTimeout(1200);
  await shot('banpo-square');
  // The map and the operators' live view: outdoors, where I am.
  const out = await page.evaluate(() => __mk.outside());
  const [sx, sz] = world(-24, 11);
  if (!out.out || Math.hypot(out.x - sx, out.z - sz) > 1) fail(`the map puts me indoors or elsewhere: ${JSON.stringify(out)}`);

  // The stone steps facing the fountain: sit down.
  await at(-31, 1.0);
  await page.waitForFunction(() => /🪑|💺|앉|Sit/i.test(__mk.choices()?.join(' ') || __mk.action() || ''), null, { timeout: 5000 }).catch(() => fail('no seat on the steps: ' + JSON.stringify([page.url()])));
  // The kiosk under the bridge: its counter, then the ramen machine.
  const clerk = await page.evaluate(() => __mk.clerkAt());
  if (!clerk) fail('no kiosk clerk');
  await page.evaluate(([x, z]) => __mk.place(x, z), [clerk[0] + (world(-14.6, 4.5)[0] - world(-14.6, 5.65)[0]), clerk[1] + (world(-14.6, 4.5)[1] - world(-14.6, 5.65)[1])]);
  await page.waitForFunction(() => (__mk.choices()?.join(' ') || __mk.action() || '').includes('🏪'), null, { timeout: 5000 }).catch(() => fail('no kiosk counter'));
  const ramen = await page.evaluate(() => __mk.ramenSpot());
  await page.evaluate(([x, z]) => __mk.place(x, z), ramen);
  await page.waitForFunction(() => (__mk.choices()?.join(' ') || __mk.action() || '').includes('🍜'), null, { timeout: 5000 }).catch(() => fail('no ramen machine'));
  // A food truck's goods.
  const goods = await page.evaluate(() => __mk.productsAt());
  if (!goods || goods.length < 7) fail(`goods: ${goods?.length}`);
  await page.evaluate(([x, z]) => __mk.place(x, z), goods[goods.length - 1]);
  await page.waitForFunction(() => (__mk.choices()?.join(' ') || __mk.action() || '').includes('👀'), null, { timeout: 5000 }).catch(() => fail('cannot look at a stall\'s goods'));
  await street('at the stalls');

  // Out along the pier to its end: walkable over the river, and fishing there.
  const spots = await page.evaluate(() => __mk.spots());
  const pierEnd = spots.find(([x, z]) => Math.hypot(x - world(16, -8.2)[0], z - world(16, -8.2)[1]) < 0.5);
  if (!pierEnd) fail('no fishing spot at the pier end');
  await at(16, 1.2);
  await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.25, dist: 7 }), l.ry); // (facing the river: the camera behind)
  await page.keyboard.down('w');
  await page.waitForFunction(([x, z]) => { const [, px, pz] = __mk.pose(); return Math.hypot(px - x, pz - z) < 1.2; }, pierEnd, { timeout: 15000 }).catch(() => fail('could not walk out along the pier'));
  await page.keyboard.up('w');
  await page.waitForFunction(() => (__mk.choices()?.join(' ') || __mk.action() || '').includes('🎣'), null, { timeout: 5000 }).catch(() => fail('no fishing at the pier end'));
  await shot('banpo-pier');
  // Walking off the side of the pier: the river still stops you.
  const before = await page.evaluate(() => __mk.pose());
  await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.25, dist: 7 }), l.ry - Math.PI / 2);
  await page.keyboard.down('w'); await page.waitForTimeout(1500); await page.keyboard.up('w');
  const side = await page.evaluate(() => __mk.pose());
  const [lx] = [(side[1] - ox) * c - (side[2] - oz) * s];
  if (Math.abs(lx - 16) > 1.6) fail(`walked off the pier into the river (${lx.toFixed(2)}, from ${before})`);
  // The fish buyer.
  const fb = await page.evaluate(() => __mk.fishBuySpot());
  await page.evaluate(([x, z]) => __mk.place(x, z), fb);
  await page.waitForFunction(() => (__mk.choices()?.join(' ') || __mk.action() || '').includes('🐟'), null, { timeout: 5000 }).catch(() => fail('no fish buyer'));

  // A duck boat out on the river; the dog waits on the bank.
  const hp = await page.evaluate(() => __mk.hanPark());
  await page.evaluate(([x, z]) => __mk.place(x, z), hp.docks[0]);
  await page.waitForFunction(() => (__mk.choices()?.join(' ') || __mk.action() || '').includes('🦆'), null, { timeout: 5000 }).catch(() => fail('no duck boat to board'));
  await page.evaluate(() => { const o = __mk.choices(); if (o) __mk.pick(o.findIndex((t) => t.includes('🦆'))); else __mk.act(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => __mk.duckGo());
  await page.evaluate((yaw) => __mk.cam({ yaw }), l.ry);
  const b0 = (await page.evaluate(() => __mk.duckBoats()))[0];
  await page.keyboard.down('w');
  await page.waitForFunction(([x, z]) => { const b = __mk.duckBoats()?.[0]; return b && Math.hypot(b[0] - x, b[1] - z) > 3; }, b0, { timeout: 15000 }).catch(() => fail('the boat did not set off'));
  await page.keyboard.up('w');
  await street('on the boat');
  if (await page.evaluate(() => __mk.petShown())) fail('the dog is out on the river with the duck boat');
  const [, rx, rz] = await page.evaluate(() => __mk.pose());
  const rlz = (rx - ox) * s + (rz - oz) * c;
  if (rlz > -1) fail(`not out on the water (z ${rlz.toFixed(2)})`);
  await shot('banpo-duck');
  await page.evaluate(() => __mk.stand());
  // Picnic lawn by the water at Jamwon: a mat can go down there (street lawns).
  await at(60, 7);
  await street('on the lawn');
  if (!(await page.evaluate(() => __mk.hanPark()))) fail('the lawn is not part of the park');
  ok = !errors.length;
} catch (e) {
  console.error(e);
} finally {
  console.log(errors.length ? errors : 'no page errors');
  await browser.close();
}
console.log(ok ? 'han park e2e: ok' : 'han park e2e: FAILED');
process.exit(ok ? 0 : 1);
