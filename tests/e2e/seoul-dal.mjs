// End-to-end check: Seoul Dal, the balloon in Yeouido Park. Sets the page's
// clock to the start of a flight, stands at the gate, boards, and checks it
// carries you up to the top and back down to the gate; then a waiting
// ticket while it flies, called and boarding at the next flight. Saves screenshots if
// given a dir.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/seoul-dal.mjs http://localhost:4173/ [shot dir] [phone]
import { chromium, devices } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const phone = process.argv[4] === 'phone';
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const context = await browser.newContext(phone ? { ...devices['iPhone 13'], deviceScaleFactor: 1 } : { viewport: { width: 1100, height: 680 } });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 20000, what = '') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await wait(150); } throw new Error('timed out ' + what); };
const T0 = Math.ceil(Date.UTC(2026, 10, 9, 3, 0, 0) / 180000) * 180000; // a flight's boarding starts (core/seoul-dal.js: 180 s a cycle)
// The clock pinned at t seconds into the flight, then running on from there
// (pinned, the page stops drawing).
const at = async (t) => { await page.clock.setFixedTime(T0 + t * 1000); await page.clock.resume(); };
const GATE = [-2895.9, 479.9]; // in front of the gate
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Moon');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await at(2);
  await mk('coins', 100000);
  await mk('place', ...GATE); await mk('face', 2.3387 + Math.PI); await mk('cam', { pitch: 0.25, dist: 16 });
  await until(async () => (await mk('action'))?.includes('🎈'), 30000, 'the gate button');
  await wait(6000);
  console.log('gate:', await mk('action'));
  if (shotDir) await page.screenshot({ path: `${shotDir}/1-gate.png` });
  console.log('choices:', JSON.stringify(await mk('choices')));
  await mk('pick', 0); // (the balloon first; someone passing by may be the "+1")
  let st = await mk('seoulDal');
  if (!st.busy || st.coins !== 75000) throw new Error('not aboard or not paid: ' + JSON.stringify(st));
  console.log('aboard:', await mk('action'), JSON.stringify(st));
  await at(60); await wait(2500);
  st = await mk('seoulDal');
  if (!(st.y > 15 && st.y < 60)) throw new Error('not rising: ' + JSON.stringify(st));
  if (shotDir) await page.screenshot({ path: `${shotDir}/2-rising.png` });
  await at(100); await wait(3000);
  st = await mk('seoulDal');
  if (!(st.y > 129)) throw new Error('not at the top: ' + JSON.stringify(st));
  console.log('top:', await mk('action'), JSON.stringify(st));
  // The stamp tour's Seoul Dal stamp: only up here, once (🪙10,000).
  if (!(await mk('action'))?.startsWith('🔖')) throw new Error('no stamp at the top: ' + (await mk('action')));
  if (shotDir) await page.screenshot({ path: `${shotDir}/stamp-1-button.png` });
  await mk('act'); await wait(1500);
  if (shotDir) await page.screenshot({ path: `${shotDir}/stamp-2-note.png` });
  st = await mk('seoulDal');
  if (st.coins !== 85000) throw new Error('the stamp did not pay: ' + JSON.stringify(st));
  await page.keyboard.press('Escape'); await page.evaluate(() => { const p = document.getElementById('stamp-panel'); if (p) p.hidden = true; });
  console.log('stamped:', await mk('action'));
  // Walk round the deck up there (Yozi's ask): moved, still aboard, still up.
  const before = (await mk('seoulDal')).at;
  await page.keyboard.down('KeyD'); await wait(1500); await page.keyboard.up('KeyD'); await wait(300);
  st = await mk('seoulDal');
  const moved = Math.hypot(st.at[0] - before[0], st.at[1] - before[1]);
  if (!st.busy || !(st.y > 129) || !(moved > 0.4) || Math.hypot(st.at[0] + 2902.1, st.at[1] - 485.4) > 4.6) throw new Error('did not walk round the deck: ' + moved.toFixed(2) + ' ' + JSON.stringify(st));
  console.log('walked:', moved.toFixed(2), 'm');
  if (shotDir) await page.screenshot({ path: `${shotDir}/3-top-down.png` });
  await mk('act'); await wait(2000); // look out
  if (shotDir) await page.screenshot({ path: `${shotDir}/4-top-out.png` });
  await at(181); await wait(2000);
  st = await mk('seoulDal');
  if (st.busy || st.y !== 0 || Math.hypot(st.at[0] - GATE[0], st.at[1] - GATE[1]) > 2) throw new Error('not back at the gate: ' + JSON.stringify(st));
  console.log('landed:', JSON.stringify(st));
  // While it's up: a waiting ticket, called when the gate opens next time.
  await at(181 + 70); await wait(1500);
  let label = await mk('action');
  if (!label?.startsWith('🎫')) throw new Error('no waiting ticket while it flies: ' + label);
  await mk('pick', 0); await wait(500);
  label = await mk('action');
  if (!label?.includes('1')) throw new Error('not No. 1 in line: ' + label);
  console.log('ticket:', label);
  await at(360 + 2); await wait(1500);
  label = await mk('action');
  if (!label?.startsWith('🔔')) throw new Error('not called: ' + label);
  console.log('called:', label);
  await mk('pick', 0); await wait(500);
  st = await mk('seoulDal');
  if (!st.busy || st.coins !== 60000) throw new Error('the called ticket did not board: ' + JSON.stringify(st));
  await at(360 + 181); await wait(1500);
  // From the fireworks lawn across Yunjung-ro: the balloon up over the park.
  await at(100);
  await mk('place', -2869.7, 454.1); await mk('face', 2.3387); await mk('cam', { yaw: 2.3387 + Math.PI, pitch: 0.05, dist: 7 });
  await wait(4000);
  if (shotDir) await page.screenshot({ path: `${shotDir}/5-from-lawn.png` });
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('seoul dal ok');
} catch (e) {
  console.error('FAIL', e.message, errors);
} finally {
  await browser.close();
  process.exit(ok ? 0 : 1);
}
