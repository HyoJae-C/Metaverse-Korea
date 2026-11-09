// End-to-end check: the Han River parks open to the street (stores.json
// "open"), each in turn. Standing on the bank you see it; stepping onto its
// lawn takes you in with no door, fishing works on the street's river, a
// duck boat goes out on it, and walking off the lawn puts you back on the
// street where you were.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/open-park.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = async (name) => { if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png` }); };
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=openpark' + Date.now());
  await page.click('#next-btn');
  await page.fill('#nickname', 'Picnic');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  const parks = await page.evaluate(async () => (await (await fetch('regions/another-seoul/stores.json')).json()).stores.filter((st) => st.open).map((st) => ({ id: st.id, ...st.open })));
  if (parks.length < 2) throw new Error(`only ${parks.length} open parks`);
  for (const park of parks) {
    // The park's own metres (core/park.js; its bank is z = -4) → world.
    const { id, at: [ox, oz], ry } = park;
    const world = (x, z) => [ox + x * Math.cos(ry) + z * Math.sin(ry), oz - x * Math.sin(ry) + z * Math.cos(ry)];
    console.log(id);
    // Arriving by map or taxi from far away (the park not built yet): you can walk.
    await page.evaluate((id) => __mk.enter(id), id);
    await page.waitForFunction((id) => __mk.room().id === id, id, { timeout: 10000 });
    if (await page.isVisible('#store-banner')) throw new Error('a shop banner with an Exit button over the open park');
    await page.evaluate(() => __mk.cam({ yaw: 0 }));
    const c0 = await page.evaluate(() => __mk.camPos());
    await page.keyboard.down('w');
    await page.waitForFunction((z0) => __mk.camPos()[2] < z0 - 2, c0[2], { timeout: 15000 });
    await page.keyboard.up('w');
    await page.evaluate(() => __mk.leave());
    // On the street behind the lawn, looking at the river: still outside.
    await page.evaluate(([x, z]) => __mk.place(x, z), world(0, 18));
    await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.35, dist: 9 }), ry);
    await page.waitForTimeout(1500);
    if ((await page.evaluate(() => __mk.room())).mode !== 'street') throw new Error('in the park before reaching its lawn');
    await shot(`${id}-street`);
    // Stepping in where the park has a tree and the street has none (core/park.js
    // trees at (-4, 12.2)): you come in beside it, not stuck inside it.
    await page.evaluate(([x, z]) => __mk.place(x, z), world(-4, 12.2));
    await page.waitForFunction((id) => __mk.room().id === id, id, { timeout: 10000 });
    const [, tx, tz] = await page.evaluate(() => __mk.pose());
    if (Math.max(Math.abs(tx + 4), Math.abs(tz - 12.2)) < 0.4 + 0.35) throw new Error(`walked in inside a tree (${tx}, ${tz})`);
    await page.evaluate(() => __mk.leave());
    await page.evaluate(([x, z]) => __mk.place(x, z), world(0, 18));
    // On the lawn: in the park.
    await page.evaluate(([x, z]) => __mk.place(x, z), world(0, 8));
    await page.waitForFunction((id) => __mk.room().id === id, id, { timeout: 10000 });
    const spots = await page.evaluate(() => __mk.spots());
    await page.evaluate(([x, z]) => __mk.place(x, z), spots[1]);
    await page.waitForFunction(() => (__mk.action() || '').includes('🎣'), null, { timeout: 5000 });
    await shot(`${id}-fishing`);
    // A duck boat out on the river.
    const boats = await page.evaluate(() => __mk.duckBoats());
    await page.evaluate(([x, z]) => __mk.place(x, z + 2.2), boats[0]);
    await page.waitForFunction(() => (__mk.action() || '').includes('🦆'), null, { timeout: 5000 });
    await page.evaluate(() => __mk.act());
    await page.evaluate(() => __mk.duckGo());
    await page.keyboard.down('w');
    await page.waitForFunction((z0) => __mk.duck() && __mk.duck().z < z0 - 2, boats[0][1], { timeout: 15000 });
    await page.keyboard.up('w');
    if ((await page.evaluate(() => __mk.room())).mode !== 'store') throw new Error('left the park on the boat');
    await page.evaluate(() => __mk.stand());
    // Off the back of the lawn (past its edge): on the street, just behind it.
    await page.evaluate(() => __mk.place(0, 14.8));
    await page.waitForFunction(() => __mk.room().mode === 'street', null, { timeout: 10000 });
    await page.waitForTimeout(500);
    await shot(`${id}-out`);
    const [cx, , cz] = await page.evaluate(() => __mk.camPos());
    const [bx, bz] = world(0, 16);
    if (Math.hypot(cx - bx, cz - bz) > 25) throw new Error(`came out far from the lawn (${cx}, ${cz})`);
  }
  ok = !errors.length;
} catch (e) {
  console.error(e);
} finally {
  console.log(errors.length ? errors : 'no page errors');
  await browser.close();
}
console.log(ok ? 'open park e2e: ok' : 'open park e2e: FAILED');
process.exit(ok ? 0 : 1);
