// End-to-end check: the Namsan trail and summit. You walk up the hill at its
// height and can't step off the trail into the woods; it comes out on the
// summit plaza outdoors, with the love locks by the heart; at the cable
// car's upper station you ride down outdoors along the real line, get out by
// the lower station, and ride back up onto the plaza.
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
  // The top: the trail comes out on the summit plaza, outdoors.
  const top = line.at(-1);
  const tower = [hill.x + ox + hill.px, hill.z + oz + hill.pz];
  await mk('place', top[0], top[1]);
  await wait(600);
  const ty = (await me())[1];
  console.log('top of the trail, height', ty.toFixed(1));
  if (ty < hill.h - 1) throw new Error('not up on the summit: y ' + ty);
  // The love locks, by the heart on the plaza's west side.
  await mk('place', tower[0] - 17.2, tower[1]);
  await until(async () => (await label()).includes('🔒'), 15000, 'love lock button');
  console.log('heart:', await label());
  if (shotDir) { await mk('face', Math.PI / 2 + Math.PI); await wait(3000); await page.screenshot({ path: `${shotDir}/namsan-summit-heart.png` }); }
  // The cable car's upper station: ride down from here.
  const cable = itaewon.landmarks.find((l) => l.type === 'cablecar');
  const e = cable.path.at(-1), st = [cable.x + ox + e[0], cable.z + oz + e[1]];
  const d = Math.hypot(st[0] - tower[0], st[1] - tower[1]), door = [st[0] - ((st[0] - tower[0]) / d) * 7.5, st[1] - ((st[1] - tower[1]) / d) * 7.5];
  await mk('place', ...door);
  await until(async () => (await label()).includes('🚡'), 15000, 'ride down button');
  console.log('station:', await label());
  if (shotDir) { await mk('face', Math.atan2(tower[0] - door[0], tower[1] - door[1])); await wait(2500); await page.screenshot({ path: `${shotDir}/namsan-summit-plaza.png` }); }
  // Ride down outdoors, along the real line, and out by the lower station.
  const low = JSON.parse(readFileSync(new URL('stores.json', R), 'utf8')).stores.find((q) => q.id === 'namsan-sky-cable').at;
  const ride = async (word, to, what) => {
    await until(async () => (await label()).includes(word), 40000, what + ' button');
    await pick(word);
    let seen = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 40000) { // aboard until it pulls in at the other end
      const [x, y, z] = await me();
      seen = Math.max(seen, Math.min(Math.hypot(x - low[0], z - low[1]), Math.hypot(x - door[0], z - door[1])));
      if (Math.hypot(x - to[0], z - to[1]) < 4 && seen > 30 && !/Going|Get off/.test(await mk('action'))) { await wait(600); const [x2, y2, z2] = await me(); return { x: x2, y: y2, z: z2, seen }; }
      await wait(250);
    }
    throw new Error('never got to the other end: ' + what);
  };
  const down = await ride('Ride down', low, 'ride down');
  console.log('rode down: out', Math.hypot(down.x - low[0], down.z - low[1]).toFixed(1), 'm from the lower door, height', down.y.toFixed(1), '(farthest from both doors on the way', down.seen.toFixed(0), 'm)');
  if (down.y > 1) throw new Error('not down on the street');
  if (shotDir) await page.screenshot({ path: `${shotDir}/namsan-cable-low.png` });
  // And back up: pay, ride, and out onto the summit plaza.
  await ride('Get in', door, 'ride up');
  await wait(600);
  const [qx, qy, qz] = await me();
  console.log('rode up: out', Math.hypot(qx - door[0], qz - door[1]).toFixed(1), 'm from the upper station door, height', qy.toFixed(1));
  if (qy < hill.h - 2) throw new Error('not up on the plaza: y ' + qy);
  if (errors.length) throw new Error(errors.join('\n'));
  ok = true;
} catch (e) {
  console.error(e.message);
} finally {
  await browser.close();
  console.log(ok ? 'OK' : 'FAILED');
  process.exit(ok ? 0 : 1);
}
