// End-to-end check: the yoga & pilates studio and the gym's bench press.
// Join the yoga class on a free mat (the pose follows the flow), lie on a
// reformer and breathe with it, then lie on the gym's bench (the racked bar
// goes into your hands) and get off again.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/studio.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 }, deviceScaleFactor: S ? 2 : 1 })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2estudio' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const studio = () => page.evaluate(() => __mk.studio());
const YOGA = ['ymountain', 'ytree', 'ywarrior', 'ydog', 'ycobra', 'ylotus'];

await page.evaluate(() => __mk.enter('sum-yoga'));
await page.waitForTimeout(1500);
let st = await studio();
console.log('studio:', JSON.stringify({ spots: st.spots.length, instructor: st.instructor, npcs: st.npcs }));
assert(st.spots.filter((s) => s[2] === 'yoga').length === 9 && st.spots.filter((s) => s[2] === 'yoga' && s[3]).length === 4, 'nine mats, four with members on');
assert(st.spots.filter((s) => s[2] === 'reformer').length === 4 && st.spots.filter((s) => s[2] === 'reformer' && s[3]).length === 2, 'four reformers, two in use');
assert(YOGA.includes(st.instructor?.[2]) && st.npcs.filter((a) => a === st.instructor[2]).length === 5, 'the instructor leads and the four members follow her pose');
assert(st.npcs.filter((a) => a === 'reformer').length === 2, 'two members on reformers');

// Yoga: a free mat.
const mat = st.spots.find((s) => s[2] === 'yoga' && !s[3]);
await page.evaluate(([x, z]) => __mk.place(x, z), mat);
await page.waitForTimeout(400);
assert((await page.evaluate(() => __mk.action())) === '🧘 Join the yoga class', 'the action on a free mat');
await page.evaluate(() => __mk.act());
await page.waitForSelector('#gym-panel:not([hidden])');
await page.waitForTimeout(300);
st = await studio();
assert(st.kind === 'yoga' && st.ac === 'ymountain', 'on the mat in mountain pose before starting');
await page.click('#gym-panel .order-actions .primary');
// Keep the balance marker in the middle: tap the side it should move to.
const balance = async (ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const going = await page.evaluate(() => {
      const m = document.querySelector('#gym-panel .gym-mark');
      if (!m) return false;
      const x = parseFloat(m.style.left || '50');
      const pads = document.querySelectorAll('#gym-panel .duck-pad');
      const tap = (b) => b?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      if (x < 44) tap(pads[1]); else if (x > 56) tap(pads[0]);
      return true;
    });
    if (!going) return;
    await page.waitForTimeout(120);
  }
};
await balance(6000);
st = await studio();
console.log('after a few seconds:', st.pose, st.ac);
assert(YOGA.indexOf(st.ac) >= 1, 'held the first pose: on to the next one');
if (S) { await page.evaluate(() => __mk.cam({ dist: 3, pitch: 0.3, yaw: 0.5 })); await page.waitForTimeout(500); await page.screenshot({ path: S + '/yoga.png' }); }
await balance(70000);
const yogaDone = await page.evaluate(() => document.querySelector('#gym-panel')?.textContent || '');
console.log('flow end:', yogaDone.slice(0, 160));
assert(/Namaste/.test(yogaDone), 'the whole flow done');
await page.evaluate(([x, z]) => __mk.place(x + 3, z), mat);
await page.waitForTimeout(500);
st = await studio();
assert(!st.open && st.ac === null && !st.spot, 'walking off the mat ends the class');

// Pilates: a free reformer.
const ref = st.spots.find((s) => s[2] === 'reformer' && !s[3]);
await page.evaluate(([x, z]) => __mk.place(x, z), ref);
await page.waitForTimeout(400);
assert((await page.evaluate(() => __mk.action())) === '🤸 Pilates on the reformer', 'the action by a free reformer');
await page.evaluate(() => __mk.act());
await page.waitForSelector('#gym-panel:not([hidden])');
await page.waitForTimeout(500);
st = await studio();
assert(st.ac === 'reformer' && Math.abs(st.at[0] - ref[0] - 0.85) < 0.01, 'lying on the reformer');
await page.click('#gym-panel .order-actions .primary');
// Breathe with the circle: hold PUSH on the out-breath for three breaths.
const push = page.locator('#gym-panel .gym-lift');
const box = await push.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
const tEnd = Date.now() + 12500;
let down = false;
while (Date.now() < tEnd) {
  const out = await page.evaluate(() => document.querySelector('#gym-panel .breath-ring')?.classList.contains('out'));
  if (out && !down) { await page.mouse.down(); down = true; }
  if (!out && down) { await page.mouse.up(); down = false; }
  await page.waitForTimeout(60);
}
if (down) await page.mouse.up();
const reps = await page.evaluate(() => document.querySelector('#gym-panel .karaoke-status')?.textContent);
console.log('reformer reps:', reps);
assert(parseInt(reps, 10) >= 2, 'breaths in time count as reps');
if (S) { await page.evaluate(() => __mk.cam({ dist: 3, pitch: 0.35, yaw: 2.2 })); await page.waitForTimeout(500); await page.screenshot({ path: S + '/reformer.png' }); }
await page.click('#gym-panel .sheet-x');
await page.waitForTimeout(400);
st = await studio();
assert(!st.open && st.ac === null && Math.abs(st.at[0] - ref[0]) < 0.01, 'closing gets you off, beside the reformer');
if (S) { await page.evaluate(() => __mk.place(0, 6)); await page.evaluate(() => __mk.cam({ dist: 9, pitch: 0.5, yaw: Math.PI })); await page.waitForTimeout(900); await page.screenshot({ path: S + '/studio.png' }); }

// The gym's bench press.
await page.evaluate(() => __mk.leave?.());
await page.waitForTimeout(800);
await page.evaluate(() => __mk.enter('muscle-gym'));
await page.waitForTimeout(1500);
st = await studio();
const bench = st.gym.find((g) => g[2] === 'bench');
assert(bench && st.bar === true, 'the bar sits on the rack');
await page.evaluate(([x, z]) => __mk.place(x, z), bench);
await page.waitForTimeout(400);
await page.evaluate(() => __mk.act());
await page.waitForTimeout(800);
st = await studio();
console.log('bench:', JSON.stringify(st.spot), st.ac, st.bar);
assert(st.ac === 'bench' && st.bar === false && Math.abs(st.at[0] - bench[0] + 1.1) < 0.01, 'lying on the bench with the bar off the rack');
if (S) { await page.evaluate(() => document.querySelector('#gym-panel').style.visibility = 'hidden'); await page.evaluate(() => __mk.cam({ dist: 3, pitch: 0.35, yaw: 2.4 })); await page.waitForTimeout(1200); await page.screenshot({ path: S + '/bench.png' }); await page.evaluate(() => document.querySelector('#gym-panel').style.visibility = ''); }
// Moving gets you up again, beside the bench.
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(250); await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(500);
st = await studio();
console.log('after moving:', JSON.stringify(st));
assert(st.ac === null && !st.open && st.bar === true && Math.hypot(st.at[0] - bench[0], st.at[1] - bench[1]) < 1.5, 'up from the bench, the bar back on the rack');
console.log('errors', errors);
assert(!errors.length, 'no page errors');
await browser.close();
