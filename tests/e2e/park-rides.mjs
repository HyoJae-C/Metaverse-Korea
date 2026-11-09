// End-to-end check: Another Land's Choco Viking and Candy Carousel (in the
// room under the island), and up on the island the Lollipop Drop, the Sugar
// Swing, the Macaron Gyro Swing and the Rainbow Wheel. Each has its
// attendant at the gate; wait for it to load, get on, the bar comes down
// and the view rides with the seat; switch the view; step off at the end.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/park-rides.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2erides' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const pr = () => page.evaluate(() => __mk.parkRide());

await page.evaluate(() => { __mk.coins(30000); __mk.enter('another-land'); });
await page.waitForTimeout(3000);
const staff = await page.evaluate(() => __mk.parkStaff());
assert(['carousel', 'viking', 'bumper'].every((k) => staff.includes(k)), `attendants: ${staff}`);

for (const [kind, gate] of [['viking', [-8.4, -5.2]], ['carousel', [-10.4, 12]]]) {
  await page.evaluate(([x, z]) => { __mk.place(x, z); __mk.cam({ yaw: 0, pitch: 0.35, dist: 9 }); }, gate);
  await page.waitForTimeout(600);
  // Wait for it to load.
  let p = await pr();
  for (let i = 0; i < 90 && !(p.phase[kind].phase === 'load' && p.phase[kind].left > 3); i++) { await page.waitForTimeout(500); p = await pr(); }
  await page.waitForTimeout(400);
  const lbl = await page.evaluate(() => __mk.action());
  assert(new RegExp(kind === 'viking' ? 'pirate ship' : 'carousel').test(lbl || ''), `${kind} board label: ${lbl}`);
  await page.evaluate(() => __mk.act());
  await page.waitForTimeout(500);
  p = await pr();
  assert(p.ride?.kind === kind, `${kind}: on`);
  await shot(kind + '-seated');
  let maxRoll = 0, ys = [], viewed = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 50000) {
    p = await pr();
    if (!p.ride) break;
    maxRoll = Math.max(maxRoll, Math.abs(p.ride.roll));
    ys.push(p.at[1]);
    if (p.locked && !viewed && p.phase[kind].p > 20) {
      await shot(kind + '-ride');
      const v = await page.evaluate(() => __mk.action());
      assert(/View/.test(v || ''), `${kind}: the button switches the view (${v})`);
      await page.evaluate(() => __mk.act());
      await page.waitForTimeout(600);
      await shot(kind + '-first');
      viewed = true;
    }
    await page.waitForTimeout(300);
  }
  p = await pr();
  assert(!p.ride, `${kind}: off at the end`);
  assert(Math.hypot(p.at[0] - gate[0], p.at[2] - gate[1]) < 0.3 && p.at[1] === 0, `${kind}: back at the gate ${p.at}`);
  if (kind === 'viking') assert(maxRoll > 1 && Math.max(...ys) - Math.min(...ys) > 3, `the ship swings (${maxRoll})`);
  else assert(Math.max(...ys) - Math.min(...ys) > 0.2, 'the horse bobs');
  assert(viewed, `${kind}: rode the run`);
}
// Up the stairs onto the island: its own rides and their attendants.
await page.evaluate(() => __mk.leave());
await page.waitForTimeout(3000);
const isl = await page.evaluate(() => [__mk.room().id, __mk.parkStaff()]);
assert(isl[0] === 'another-land-island' && ['wheel', 'drop', 'swing', 'gyro'].every((k) => isl[1].includes(k)), `on the island with its attendants: ${isl}`);
await page.evaluate(() => { __mk.place(-30, -50); __mk.cam({ yaw: Math.PI * 0.85, pitch: 0.42, dist: 30 }); });
await page.waitForTimeout(1500);
await shot('island-rides');
// The drop climbs the tower and falls, the swing ride's chairs fly out, the
// gyro swing goes up past level; the wheel takes you over the top.
for (const [kind, gate, high] of [['drop', [-13.2, -23.8], 12], ['swing', [-49.3, -29], 1.2], ['gyro', [5, -20.1], 8], ['wheel', [-42, -39.8], 10]]) {
  await page.evaluate(([x, z]) => { __mk.place(x, z); __mk.cam({ yaw: 0, pitch: 0.35, dist: 9 }); }, gate);
  await page.waitForTimeout(600);
  let p = await pr();
  const ready = (q) => (kind === 'wheel' ? q.wheelOpen : q.phase[kind].phase === 'load' && q.phase[kind].left > 3);
  for (let i = 0; i < 90 && !ready(p); i++) { await page.waitForTimeout(500); p = await pr(); }
  await page.waitForTimeout(300);
  const lbl = await page.evaluate(() => __mk.action());
  await page.evaluate(() => __mk.act());
  await page.waitForTimeout(500);
  p = await pr();
  assert(p.ride?.kind === kind, `${kind}: on (${lbl})`);
  await shot(kind + '-seated');
  const tags = await page.evaluate(() => [...document.querySelectorAll('.nametag, .bubble')].filter((e) => e.offsetParent).length);
  assert(tags === 0, `${kind}: no name tags while riding (${tags} showing)`);
  let top = 0, locked = false, shotTop = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 110000) {
    p = await pr();
    if (!p.ride) break;
    top = Math.max(top, p.at[1]);
    locked ||= p.locked;
    if (!shotTop && p.at[1] > high) { await shot(kind + '-top'); shotTop = true; }
    await page.waitForTimeout(300);
  }
  p = await pr();
  assert(locked, `${kind}: the safety bar locked`);
  assert(top > high, `${kind}: went up (${top})`);
  assert(!p.ride && p.at[1] === 0, `${kind}: off at the end ${p.at}`);
}
assert(!errors.length, 'page errors: ' + errors.join(' | '));
await browser.close();
