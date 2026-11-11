// End-to-end check: Myeongdong Cathedral's hill. From Myeongdong-gil you
// walk up the stairs on the church's axis to the yard (4 m up) and its door;
// the terrace's brick wall beside the stairs can't be climbed, and the ramp
// west of the stairs takes you up too.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/cathedral-stairs.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// The church (scripts/build-myeongdong.mjs): its middle and front direction.
const HALL = [-1508.6, -519.7], F = [-0.4912, -0.8711], S = [-F[1], F[0]];
const on = (a, s) => [HALL[0] + F[0] * a + S[0] * s, HALL[1] + F[1] * a + S[1] * s];
const UP = Math.atan2(-F[0], -F[1]); // facing the church from the street
const face = async (ry) => { await mk('face', ry); await mk('cam', { yaw: ry + Math.PI }); }; // (the camera behind: W walks that way)
const at = async () => (await mk('parkRide')).at; // [x, y, z]
// Hold W (the software renderer is slow: a few metres a second at best).
const walk = async (ms) => { await page.keyboard.down('KeyW'); for (let t = 0; t < ms; t += 500) { await wait(500); if (process.env.TRACE) console.log('  ', (await at()).map((v) => +v.toFixed(2))); } await page.keyboard.up('KeyW'); await wait(300); };
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Stairs');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  // At the foot of the stairs, on Myeongdong-gil.
  await mk('place', ...on(31.5, 0)); await face(UP);
  await wait(3000);
  if (shotDir) await page.screenshot({ path: `${shotDir}/stairs-foot.png` });
  const y0 = (await at())[1];
  if (Math.abs(y0) > 0.05) throw new Error(`the street should be flat at the foot: y ${y0}`);
  await walk(25000);
  const top = await at();
  console.log('after walking up:', top.map((v) => +v.toFixed(2)));
  if (top[1] < 3.9) throw new Error(`didn't reach the yard up the stairs: y ${top[1]}`);
  if (shotDir) { await face(UP + Math.PI); await wait(1500); await page.screenshot({ path: `${shotDir}/stairs-from-top.png` }); }
  // The door's ring is up on the yard.
  const door = await mk('doorOf', 'myeongdong-cathedral');
  await mk('place', door[0], door[1]); await wait(800);
  const lab = [await mk('action'), ...((await mk('choices')) || [])].join('|');
  console.log('at the door:', lab, (await at())[1]);
  if (!lab) throw new Error('no button at the cathedral door');
  // The brick wall east of the stairs: walking at it from the street stops you.
  await mk('place', ...on(31.5, 6)); await face(UP); await wait(500);
  await walk(6000);
  const wall = await at();
  console.log('at the wall:', wall.map((v) => +v.toFixed(2)));
  if (wall[1] > 0.5) throw new Error(`climbed the wall: y ${wall[1]}`);
  // The ramp west of the stairs.
  await mk('place', ...on(31, -8.3)); await face(UP); await wait(500);
  await walk(30000);
  const ramp = await at();
  console.log('up the ramp:', ramp.map((v) => +v.toFixed(2)));
  if (ramp[1] < 3) throw new Error(`the ramp didn't take you up: y ${ramp[1]}`);
  if (errors.length) throw new Error(errors.join('\n'));
  ok = true;
} catch (e) {
  console.error(e.message);
} finally {
  await browser.close();
  console.log(ok ? 'OK' : 'FAILED');
  process.exit(ok ? 0 : 1);
}
