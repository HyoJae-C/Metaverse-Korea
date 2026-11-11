// End-to-end check: the Ttukseom drone light show. Sets the page's clock to
// moments of the 18:00 KST show, stands on the lawn facing the river and
// checks the sky turns to night, the drones load and draw, and the timed
// stamp stand is only up during the show. Saves screenshots if given a dir.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/drone-show.mjs http://localhost:4173/ [shot dir] [phone]
import { chromium, devices } from 'playwright';
import { nextDroneShow } from '../../src/core/drone-show.js';

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
const START = nextDroneShow(Date.UTC(2026, 10, 9, 9, 0, 0)); // the first show after 18:00 KST
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Drones');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.clock.setFixedTime(START - 30 * 60e3); // half an hour before: day
  await mk('enter', 'ttukseom-hangang');
  await until(async () => (await mk('hanPark'))?.id === 'ttukseom-hangang'); // (laid on the street)
  const stand = () => page.evaluate(() => window.__mk.droneShow());
  await mk('place', 304.9, 426.7); await mk('face', -0.16); await mk('cam', { yaw: 2.981, pitch: 0.12, dist: 7 }); // on the lawn, facing the barge
  await wait(8000); // (a software renderer takes a while to draw a new room the first time)
  let st = await stand();
  if (st.night !== 0 || st.stamp) throw new Error('night or stamp in the day: ' + JSON.stringify(st));
  if (shotDir) await page.screenshot({ path: `${shotDir}/0-day.png` });
  const moments = [[-150, 'lift'], [-5, 'countdown'], [12, 'another-seoul'], [80, 'annyeong'], [101, 'konnichiwa'], [135, 'waver'], [156, 'fan'], [179, 'hanbok'], [199, 'janggu'], [217, 'mask'], [235, 'taekwondo'], [267, 'palace'], [305, 'tower'], [341, 'another-tower'], [361, 'mugunghwa'], [381, 'subway'], [420, 'whale'], [468, 'duck'], [485, 'bike'], [503, 'bridge'], [533, 'chimaek'], [560, 'ramen'], [583, 'meokgo'], [613, 'wheel'], [635, 'coaster'], [706, 'neo-heart'], [724, 'hearts'], [781, 'photo-frame'], [809, 'act3'], [850, 'lightstick'], [876, 'wave'], [900, 'star'], [934, 'moon'], [961, 'dipper'], [989, 'shooting-star'], [1015, 'clover'], [1041, 'blossom'], [1059, 'rainbow'], [1079, 'firework'], [1100, 'sugo'], [1139, 'burst'], [1190, 'next-show']];
  for (const [t, name] of moments) {
    await page.clock.setFixedTime(START + t * 1000);
    if (t === -150) await mk('cam', { yaw: 2.981 });
    await wait(t === -150 ? 3000 : 1600);
    st = await stand();
    if (t > -100 && !(st.night > 0.99)) throw new Error(`not night at ${t}: ` + JSON.stringify(st));
    if (t > -100 && !st.drones) throw new Error(`no drones at ${t}: ` + JSON.stringify(st));
    if (Math.abs(st.pitch - 0.12) > 0.01) throw new Error(`the view moved by itself at ${t} (only the player turns it): ` + JSON.stringify(st));
    if (t > 0 && !st.stamp) throw new Error(`no stamp stand at ${t}`);
    if (t > 0 && !(st.lit > 50)) throw new Error(`too few drones lit at ${t}: ` + JSON.stringify(st));
    console.log(t, name, JSON.stringify(st));
    if (shotDir) await page.screenshot({ path: `${shotDir}/${String(t + 200).padStart(4, '0')}-${name}.png` });
  }
  await page.clock.setFixedTime(START + 1500 * 1000);
  await wait(1200);
  st = await stand();
  if (st.night !== 0 || st.stamp) throw new Error('still night after the show: ' + JSON.stringify(st));
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('drone show ok');
} catch (e) {
  console.error('FAIL', e.message, errors);
} finally {
  await browser.close();
  process.exit(ok ? 0 : 1);
}
