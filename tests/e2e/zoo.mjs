// End-to-end check: Children's Grand Park's zoo is a room you walk into.
// From the gate plaza, the entrance building's door; inside, the paths, the
// pens and their animals, visitors strolling, the keeper; a cart to drive;
// the Sea Animals hall's door, barred while it gets ready; out by the exit. Draw calls stay in
// the room budget (docs/PERFORMANCE.md).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/zoo.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 430, height: 860 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2ezoo' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const info = () => page.evaluate(() => __mk.renderInfo());

// On the street: the entrance at the end of the gate plaza (district offset 408, -86).
await page.evaluate(() => { __mk.place(440, -86); __mk.cam({ yaw: -Math.PI / 2, pitch: 0.3, dist: 14 }); });
await page.waitForTimeout(2500);
await shot('street-entrance');
await page.evaluate(() => { __mk.place(457, -86); });
await page.waitForTimeout(800);
const lbl = await page.evaluate(() => __mk.action());
assert(/Zoo/i.test(lbl || ''), `the door: ${lbl}`);

// In.
await page.evaluate(() => { __mk.coins(30000); __mk.enter('cgp-zoo'); });
for (let i = 0; i < 40 && !(await page.evaluate(() => __mk.room().id)) ; i++) await page.waitForTimeout(500);
await page.waitForTimeout(2500);
let room = await page.evaluate(() => __mk.room());
assert(room.mode === 'store' && room.id === 'cgp-zoo', `in the zoo: ${JSON.stringify(room)}`);
const me = await page.evaluate(() => __mk.me());
assert(Math.abs(me[0] - 55) < 0.5 && Math.abs(me[1]) < 0.5, `came in at the gate: ${me}`);
await shot('zoo-gate');
const counts = [];
for (const [x, z, yaw, name] of [[55, 0, -Math.PI / 2, 'gate'], [128, 8, Math.PI, 'plaza'], [150, 4, Math.PI * 0.85, 'herbivores'], [160, -36, 0, 'big-cats'], [92, 2, 0.3, 'petting']]) {
  await page.evaluate(([x, z, yaw]) => { __mk.place(x, z); __mk.cam({ yaw, pitch: 0.35, dist: 9 }); }, [x, z, yaw]);
  await page.waitForTimeout(1500);
  const ri = await info();
  counts.push([name, ri.calls, ri.frameTris]);
  await shot('zoo-' + name);
}
console.log('draw calls / triangles', JSON.stringify(counts));
for (const [name, calls, tris] of counts) assert(calls <= 300 && tris <= 150000, `${name}: ${calls} calls, ${tris} triangles`);

// The kangaroos and the camels.
await page.evaluate(() => { __mk.place(175, 5); __mk.cam({ yaw: Math.PI, pitch: 0.3, dist: 7 }); });
await page.waitForTimeout(1500);
await shot('zoo-kangaroos');
await page.evaluate(() => { __mk.place(175, 31.5); __mk.cam({ yaw: Math.PI, pitch: 0.3, dist: 7 }); });
await page.waitForTimeout(1500);
await shot('zoo-camels');

// A cart from the station, then back.
await page.evaluate(() => { __mk.place(70, 17); });
await page.waitForTimeout(800);
let a = await page.evaluate(() => __mk.action());
assert(/cart/i.test(a || ''), `cart station: ${a}`);
await page.evaluate(() => __mk.act());
await page.waitForTimeout(400);
assert((await page.evaluate(() => __mk.riding())) === 7, 'driving a cart in the zoo');
await page.evaluate(() => __mk.act());
await page.waitForTimeout(400);
assert((await page.evaluate(() => __mk.riding())) === 0, 'handed it back');

// The Sea Animals hall is getting ready: its door is barred, the button says so.
await page.evaluate(() => { __mk.place(81, -37); __mk.cam({ yaw: Math.PI, pitch: 0.2, dist: 7 }); });
await page.waitForTimeout(800);
a = await page.evaluate(() => __mk.action());
assert(/Sea Animals.*getting ready/i.test(a || ''), `hall door, shut: ${a}`);
await page.evaluate(() => __mk.act());
await page.waitForTimeout(1200);
room = await page.evaluate(() => __mk.room());
assert(room.id === 'cgp-zoo', `still in the zoo, not in the hall: ${JSON.stringify(room)}`);
await shot('sea-hall-shut');

// Out by the exit.
await page.evaluate(() => { __mk.place(52.6, 0); });
await page.waitForTimeout(900);
a = await page.evaluate(() => __mk.action());
assert(/leave|exit/i.test(a || ''), `exit: ${a}`);
await page.evaluate(() => __mk.act());
await page.waitForTimeout(1500);
room = await page.evaluate(() => __mk.room());
assert(room.mode === 'street', 'back on the street');
assert(!errors.length, 'no page errors ' + errors.join(' | '));
await browser.close();
