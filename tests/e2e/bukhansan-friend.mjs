// Two players on Bukhansan's steps and top (not in CI): the other one is
// drawn where they stand, on the ground, not at the old 140 m cap inside the
// rock (Yozi 2026-11-27: "on the top steps my friend disappears", "my
// friend's legs look sunk").
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/bukhansan-friend.mjs http://localhost:4173/ [shots dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/', S = process.argv[3];
const region = JSON.parse(readFileSync(new URL('../../public/regions/another-seoul/region.json', import.meta.url), 'utf8'));
const bh = JSON.parse(readFileSync(new URL('../../public/regions/another-seoul/districts/bukhansan.json', import.meta.url), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'bukhansan').offset, l = bh.landmarks[0];
const ROOM = 'e2ebf' + Math.random().toString(36).slice(2, 8);
const browsers = [], errors = [];
let failed = 0;
const assert = (ok, msg) => { console.log(`${ok ? 'ok' : 'FAIL'} ${msg}`); if (!ok) failed++; };
async function join(name) {
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  await useFakeRealtime(ctx, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url + '?debug&weather=clear&room=' + ROOM);
  await page.click('#next-btn'); await page.fill('#nickname', name);
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 120000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  return page;
}
const [a, b] = await Promise.all([join('Ahead'), join('Behind')]);
const go = (page, [x, z]) => page.evaluate(([px, pz]) => __mk.goto(px, pz, 0), [x + ox, z + oz]);
const steps = l.trails.find((t) => t.steps).p;
await go(a, steps[1]); await go(b, steps[0]);
await b.waitForFunction(() => __mk.peers().some((p) => p.name === 'Ahead' && p.shown && __mk.bukhan.y(p.x, p.z) > 0), null, { timeout: 60000 }); // (each has heard of the other, and the mountain is loaded)
for (const [name, i] of [['low on the steps', 4], ['half way up the steps', 14], ['near the top', 26], ['at the top', steps.length - 1]]) {
  await go(a, steps[i]); await go(b, steps[Math.max(0, i - 2)]);
  await a.waitForTimeout(6000);
  const seen = await b.evaluate(() => { const q = __mk.peers().find((p) => p.name === 'Ahead'); return q && { y: q.drawnY, ground: __mk.bukhan.y(q.x, q.z), shown: q.shown }; });
  assert(seen && seen.shown && Math.abs(seen.y - seen.ground) < 0.3, `${name} (${steps[i][2]} m): the friend stands on the ground (drawn at ${seen?.y.toFixed(2)}, ground ${seen?.ground.toFixed(2)})`);
  if (S) { await b.evaluate(() => __mk.cam({ yaw: 0.6, pitch: 0.45, dist: 9 })); await b.waitForTimeout(1200); await b.screenshot({ path: `${S}/friend-${i}.png` }); }
}
assert(errors.length === 0, 'no page errors ' + errors.join(' | '));
for (const br of browsers) await br.close();
process.exit(failed ? 1 : 0);
