// End-to-end check: Modu Land's newer rides under the island (the
// Teacup Party, the Candy Train and the Jelly Flume) and the Mirror Maze.
// Each ride: wait at its gate for it to load, get on, the bar comes down,
// ride the run (up in the air, round the oval, up the lift and down the
// drop), step off at the end. The maze: step in at its door.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/park-new-rides.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2enew' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const pr = () => page.evaluate(() => __mk.parkRide());

await page.evaluate(() => { __mk.coins(40000); __mk.enter('another-land'); });
await page.waitForTimeout(3000);
const staff = await page.evaluate(() => __mk.parkStaff());
assert(['teacups', 'train', 'flume'].every((k) => staff.includes(k)), `attendants: ${staff}`);

// (the swing ride is up on the island: park-rides.mjs)
const only = (process.env.RIDES || 'teacups,train,flume').split(',');
const RIDES = [
  ['teacups', [29.5, 22.3], (q) => q.moved > 3, /teacups/i],
  ['train', [47.1, 24], (q) => q.maxX > 57, /train/i],
  ['flume', [54.5, -14.3], (q) => q.maxY > 5, /flume/i],
].filter(([k]) => only.includes(k));
for (const [kind, gate, ok, word] of RIDES) {
  await page.evaluate(([x, z]) => { __mk.place(x, z); __mk.cam({ yaw: Math.PI, pitch: 0.3, dist: 9 }); }, gate);
  await page.waitForTimeout(800);
  let p = await pr();
  for (let i = 0; i < 140 && !(p.phase[kind].phase === 'load' && p.phase[kind].left > 3); i++) { await page.waitForTimeout(500); p = await pr(); }
  await shot(kind + '-gate');
  const lbl = await page.evaluate(() => __mk.action());
  assert(word.test(lbl || ''), `${kind} board label: ${lbl}`);
  await page.evaluate(() => __mk.act());
  await page.waitForTimeout(500);
  p = await pr();
  assert(p.ride?.kind === kind, `${kind}: on`);
  const q = { maxY: 0, maxX: -1e9, moved: 0 };
  let last = p.at, locked = false, shotRun = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 75000) {
    p = await pr();
    if (!p.ride) break;
    locked ||= p.locked;
    q.maxY = Math.max(q.maxY, p.at[1]);
    q.maxX = Math.max(q.maxX, p.at[0]);
    q.moved += Math.hypot(p.at[0] - last[0], p.at[2] - last[2]);
    last = p.at;
    const s = p.phase[kind].s;
    if (!shotRun && p.locked && s > (kind === 'flume' ? 27 : 12)) { await shot(kind + '-ride'); shotRun = true; }
    await page.waitForTimeout(250);
  }
  p = await pr();
  assert(locked, `${kind}: held in while it ran`);
  assert(ok(q), `${kind}: rode (${JSON.stringify(q)})`);
  assert(!p.ride && Math.hypot(p.at[0] - gate[0], p.at[2] - gate[1]) < 0.3 && p.at[1] === 0, `${kind}: off at the gate ${p.at}`);
}
// The maze: in at its door, a look down a mirror corridor.
await page.evaluate(() => { __mk.place(35.5, -1.5); __mk.cam({ yaw: Math.PI, pitch: 0.35, dist: 7 }); });
await page.waitForTimeout(800);
await shot('maze-door');
await page.evaluate(() => { __mk.place(35.5, -5); });
await page.waitForTimeout(800);
const toast = await page.evaluate(() => document.body.innerText);
assert(/Mirror Maze/.test(toast), 'the maze says hello');
await shot('maze-in');
// Out of the park: none of its attendants' name tags stay over the street.
const tagsUp = () => page.evaluate(() => [...document.querySelectorAll('#labels .nametag.npc')].filter((e) => e.style.display !== 'none' && e.style.visibility !== 'hidden' && /attendant/i.test(e.textContent)).length);
await page.evaluate(() => { __mk.place(30, 15); __mk.cam({ yaw: 0, pitch: 0.2, dist: 6 }); });
await page.waitForTimeout(1200);
const inPark = await tagsUp();
await page.evaluate(() => __mk.leave());
await page.waitForTimeout(2000);
const onStreet = await tagsUp();
assert(inPark > 0 && onStreet === 0, `attendant tags: ${inPark} in the park, ${onStreet} on the street`);
assert(!errors.length, 'page errors: ' + errors.join(' | '));
await browser.close();
