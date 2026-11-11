// End-to-end check: the Namsan trail. From the foot you walk up the hill at
// its height and can't step off the trail into the woods; at the top the
// button takes you onto the summit plaza by its back gate, and its gate
// button brings you back out at the top of the trail.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/namsan-walk.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R), 'utf8'));
const itaewon = JSON.parse(readFileSync(new URL('districts/itaewon.json', R), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const hill = itaewon.landmarks.find((l) => l.type === 'namsan');
const line = hill.trail.map(([x, z]) => [hill.x + ox + x, hill.z + oz + z]);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const label = async () => [await mk('action'), ...((await mk('choices')) || [])].join('|');
const until = async (f, ms = 15000, what = '') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return; await wait(100); } throw new Error('timed out ' + what + ' ' + await label()); };
const me = () => page.evaluate(() => { const { me } = window.__mk.sky(); return [me.root.position.x, me.root.position.y, me.root.position.z]; });
const pick = async (icon) => { const ch = await mk('choices'); if (ch) await mk('pick', ch.findIndex((c) => c.includes(icon))); else await mk('act'); };
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Hiker');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  // Halfway up: standing on the trail, at the hill's height.
  const k = Math.floor(line.length / 2), [a, b] = [line[k - 1], line[k]];
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  await mk('place', ...mid);
  await mk('face', Math.atan2(b[0] - a[0], b[1] - a[1]));
  await wait(600);
  const y = (await me())[1];
  console.log('halfway up at', mid.map(Math.round), 'height', y.toFixed(1));
  if (y < 10) throw new Error('not on the slope: y ' + y);
  if (shotDir) { await wait(2500); await page.screenshot({ path: `${shotDir}/namsan-trail-mid.png` }); }
  // Walk sideways for a second: the trail's edge holds you.
  await mk('face', Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2);
  for (const key of ['a', 'd', 'w']) { await page.keyboard.down(key); await wait(1500); await page.keyboard.up(key); }
  const [sx, , sz] = await me();
  const off = Math.min(...line.slice(1).map((q, i) => {
    const p = line[i], dx = q[0] - p[0], dz = q[1] - p[1], t = Math.max(0, Math.min(1, ((sx - p[0]) * dx + (sz - p[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(sx - p[0] - dx * t, sz - p[1] - dz * t);
  }));
  console.log('tried to step off: now', off.toFixed(1), 'm from the trail\'s middle, moved', Math.hypot(sx - mid[0], sz - mid[1]).toFixed(1), 'm');
  if (off > (hill.trailW || 3) / 2 + 0.2) throw new Error('walked off the trail: ' + off.toFixed(1) + ' m from its middle');
  // The top: on to the summit plaza.
  const top = line.at(-1);
  await mk('place', top[0], top[1]);
  await until(async () => (await label()).includes('⛰️'), 15000, 'summit button');
  console.log('top button:', await label());
  if (shotDir) { await wait(1500); await page.screenshot({ path: `${shotDir}/namsan-trail-top.png` }); }
  await pick('⛰️');
  await until(async () => (await mk('room')).id === 'namsan-sky-cable', 30000, 'on the plaza');
  await wait(800);
  const [px, py, pz] = await me();
  console.log('on the plaza at', [px, py, pz].map((v) => v.toFixed(1)).join(', '));
  if (py < 30) throw new Error('not up on the plaza: y ' + py);
  await until(async () => (await label()).includes('🥾'), 15000, 'down button');
  if (shotDir) { await mk('face', Math.PI); await wait(1500); await page.screenshot({ path: `${shotDir}/namsan-plaza-gate.png` }); }
  await pick('🥾');
  await until(async () => (await mk('room')).mode === 'street', 15000, 'back out');
  await wait(600);
  const [qx, qy, qz] = await me();
  const fromTop = Math.hypot(qx - top[0], qz - top[1]);
  console.log('back out', fromTop.toFixed(1), 'm from the top, height', qy.toFixed(1));
  if (fromTop > 6 || qy < 50) throw new Error('not back at the top of the trail');
  if (errors.length) throw new Error(errors.join('\n'));
  ok = true;
} catch (e) {
  console.error(e.message);
} finally {
  await browser.close();
  console.log(ok ? 'OK' : 'FAILED');
  process.exit(ok ? 0 : 1);
}
