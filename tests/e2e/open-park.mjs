// End-to-end check: Banpo-Jamwon Han River Park is open to the street
// (stores.json "open"). Standing on the bank you see it; stepping onto its
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
// The park's frame (scripts/build-banpo.mjs): u along the bank, v away from the river.
const A = Math.atan2(0.672, 0.74), U = [Math.cos(A), -Math.sin(A)], V = [Math.sin(A), Math.cos(A)];
const at = (u, v) => [-1129 + u * U[0] + v * V[0], 754 + u * U[1] + v * V[1]];
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=openpark' + Date.now());
  await page.click('#next-btn');
  await page.fill('#nickname', 'Picnic');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  // Arriving by map or taxi from far away (the park not built yet): you can walk.
  await page.evaluate(() => __mk.enter('banpo-jamwon-hangang'));
  await page.waitForFunction(() => __mk.room().id === 'banpo-jamwon-hangang', null, { timeout: 10000 });
  await page.evaluate(() => __mk.cam({ yaw: 0 }));
  const c0 = await page.evaluate(() => __mk.camPos());
  await page.keyboard.down('w');
  await page.waitForFunction((z0) => __mk.camPos()[2] < z0 - 2, c0[2], { timeout: 15000 });
  await page.keyboard.up('w');
  await page.evaluate(() => __mk.leave());
  // On the street behind the lawn, looking at the river: still outside.
  await page.evaluate(([x, z]) => __mk.place(x, z), at(0, -6));
  await page.evaluate((yaw) => __mk.cam({ yaw, pitch: 0.35, dist: 9 }), A);
  await page.waitForTimeout(1500);
  if ((await page.evaluate(() => __mk.room())).mode !== 'street') throw new Error('in the park before reaching its lawn');
  await shot('open-park-street');
  // On the lawn: in the park.
  await page.evaluate(([x, z]) => __mk.place(x, z), at(0, -16));
  await page.waitForFunction(() => __mk.room().id === 'banpo-jamwon-hangang', null, { timeout: 10000 });
  const spots = await page.evaluate(() => __mk.spots());
  await page.evaluate(([x, z]) => __mk.place(x, z), spots[1]);
  await page.waitForFunction(() => (__mk.action() || '').includes('🎣'), null, { timeout: 5000 });
  await shot('open-park-fishing');
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
  await shot('open-park-out');
  const [cx, , cz] = await page.evaluate(() => __mk.camPos());
  const [bx, bz] = at(0, -12);
  if (Math.hypot(cx - bx, cz - bz) > 25) throw new Error(`came out far from the lawn (${cx}, ${cz})`);
  ok = !errors.length;
} catch (e) {
  console.error(e);
} finally {
  console.log(errors.length ? errors : 'no page errors');
  await browser.close();
}
console.log(ok ? 'open park e2e: ok' : 'open park e2e: FAILED');
process.exit(ok ? 0 : 1);
