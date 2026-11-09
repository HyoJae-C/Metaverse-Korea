// End-to-end check: a Han River park laid straight on the street
// (game/han-parks.js), each in turn. You never leave the street: no
// room, no door. Walking round each park you can sit on its steps or a bench, buy at the kiosk, cook ramen, look at the food
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
  const parks = await page.evaluate(async () => {
    const region = await (await fetch('regions/another-seoul/region.json')).json();
    const out = [];
    for (const d of region.districts) {
      const map = await (await fetch('regions/another-seoul/' + d.map)).json();
      for (const l of map.landmarks || []) if (l.type === 'hanpark') out.push({ l, offset: d.offset });
    }
    return out;
  });
  if (parks.length < 2) fail(`only ${parks.length} parks on the street`);
  for (const { l, offset } of parks) {
    const id = l.store, L = l.layout;
    console.log(id);
    const ox = l.x + offset[0], oz = l.z + offset[1], c = Math.cos(l.ry), s = Math.sin(l.ry);
    const world = (x, z) => [ox + x * c + z * s, oz - x * s + z * c];
    const at = async (x, z) => { await page.evaluate(([wx, wz]) => __mk.place(wx, wz), world(x, z)); await page.waitForTimeout(250); };
    const street = async (what) => { const r = await page.evaluate(() => __mk.room()); if (r.mode !== 'street') fail(`${what}: not on the street (${JSON.stringify(r)})`); };

    // Arriving by map or taxi: dropped on its river path, on the street.
    await page.evaluate((id) => __mk.enter(id), id);
    await page.waitForTimeout(800);
    await street('arriving');
    // The park gets built as you come near.
    const drop = await page.evaluate(() => __mk.pose());
    await page.evaluate(([x, z]) => __mk.place(x, z), [drop[1], drop[2]]);
    await page.waitForFunction((id) => __mk.hanPark()?.id === id, id, { timeout: 15000 });
    if (await page.isVisible('#store-banner')) fail('a shop banner on the street');
    await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.3, dist: 12 }), l.ry + Math.PI);
    await page.waitForTimeout(1200);
    await shot(`${id}-arrive`);
    // The map and the operators' live view: outdoors, where I am.
    const out = await page.evaluate(() => __mk.outside());
    const [sx, sz] = [drop[1], drop[2]];
    if (!out.out || Math.hypot(out.x - sx, out.z - sz) > 1) fail(`the map puts me indoors or elsewhere: ${JSON.stringify(out)}`);

    // Stone steps (Banpo, facing the fountain) or a bench: sit down.
    const seat = L.steps?.[0] ? [L.steps[0].x, L.steps[0].z - 0.8] : [L.benches[0][0], L.benches[0][1] - 0.8];
    await at(...seat);
    await page.waitForFunction(() => /🪑|💺|앉|Sit/i.test(__mk.choices()?.join(' ') || __mk.action() || ''), null, { timeout: 5000 }).catch(() => fail('no seat'));
    // The kiosk under the bridge: its counter, then the ramen machine.
    const clerk = await page.evaluate(() => __mk.clerkAt());
    if (!clerk) fail('no kiosk clerk');
    const [kx, kz, kry] = L.kiosk, front = (d) => [kx + Math.sin(kry) * d, kz + Math.cos(kry) * d]; // (its front, in the park's metres)
    await at(...front(3.4));
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
    const P = L.pier, end = world(P.x, -P.len + 0.8);
    const pierEnd = spots.find(([x, z]) => Math.hypot(x - end[0], z - end[1]) < 0.5);
    if (!pierEnd) fail('no fishing spot at the pier end');
    await at(P.x, 1.2);
    await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.25, dist: 7 }), l.ry); // (facing the river: the camera behind)
    await page.keyboard.down('w');
    await page.waitForFunction(([x, z]) => { const [, px, pz] = __mk.pose(); return Math.hypot(px - x, pz - z) < 1.2; }, pierEnd, { timeout: 15000 }).catch(() => fail('could not walk out along the pier'));
    await page.keyboard.up('w');
    await page.waitForFunction(() => (__mk.choices()?.join(' ') || __mk.action() || '').includes('🎣'), null, { timeout: 5000 }).catch(() => fail('no fishing at the pier end'));
    await shot(`${id}-pier`);
    // Walking off the side of the pier: the river still stops you.
    const before = await page.evaluate(() => __mk.pose());
    await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.25, dist: 7 }), l.ry - Math.PI / 2);
    await page.keyboard.down('w'); await page.waitForTimeout(1500); await page.keyboard.up('w');
    const side = await page.evaluate(() => __mk.pose());
    const [lx] = [(side[1] - ox) * c - (side[2] - oz) * s];
    if (Math.abs(lx - P.x) > 1.6) fail(`walked off the pier into the river (${lx.toFixed(2)}, from ${before})`);
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
    await page.waitForFunction(([x, z]) => { const b = __mk.duckBoats()?.[0]; return b && Math.hypot(b[0] - x, b[1] - z) > 3; }, b0, { timeout: 15000 }).catch(async () => fail('the boat did not set off: ' + JSON.stringify(await page.evaluate(() => [__mk.duck(), __mk.duckBoats(), __mk.pose(), __mk.action()]))));
    await page.waitForTimeout(800);
    await page.keyboard.up('w');
    await street('on the boat');
    // Straight out where the camera looks (the river), not off to one side.
    const b1 = (await page.evaluate(() => __mk.duckBoats()))[0];
    const mx = (b1[0] - b0[0]) * c - (b1[1] - b0[1]) * s, mz = (b1[0] - b0[0]) * s + (b1[1] - b0[1]) * c;
    if (!(mz < -2 && Math.abs(mx) < Math.abs(mz))) fail(`the boat went the wrong way (${mx.toFixed(1)}, ${mz.toFixed(1)} in the park's metres)`);
    if (await page.evaluate(() => __mk.petShown())) fail('the dog is out on the river with the duck boat');
    const [, rx, rz] = await page.evaluate(() => __mk.pose());
    const rlz = (rx - ox) * s + (rz - oz) * c;
    if (rlz > -1) fail(`not out on the water (z ${rlz.toFixed(2)})`);
    await shot(`${id}-duck`);
    await page.evaluate(() => __mk.stand());
    await street('back on the bank');
  }
  ok = !errors.length;
} catch (e) {
  console.error(e);
} finally {
  console.log(errors.length ? errors : 'no page errors');
  await browser.close();
}
console.log(ok ? 'han park e2e: ok' : 'han park e2e: FAILED');
process.exit(ok ? 0 : 1);
