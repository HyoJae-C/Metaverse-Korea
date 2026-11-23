// End-to-end check: pot plants at home grow with watering (core/plant-growth.js).
// A home with four plants: one watered 40 days, two fully grown (a tree and a
// table plant) and one never watered. Walk up to a plant, water it with the
// action button (at once), and it is one day further; the size changes the
// next day, not today.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/plant-water.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'plants');
await ctx.addInitScript(() => {
  if (localStorage.getItem('mk.plants')) return; // (a reload keeps what the game saved)
  const p = (n) => String(n).padStart(2, '0'), day = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  localStorage.setItem('mk.items', JSON.stringify(['plant-monstera', 'plant-olive', 'plant-orchid', 'plant-cactus']));
  localStorage.setItem('mk.plants', JSON.stringify({ 'plant-monstera': { n: 40, d: day(2) }, 'plant-olive': { n: 100, d: day(1) }, 'plant-orchid': { n: 100, d: day(1) } }));
  localStorage.setItem('mk.home.forest-lane-apt', JSON.stringify([{ id: 'plant-monstera', x: -2, z: 0, ry: 0 }, { id: 'plant-olive', x: 0, z: 0, ry: 0 }, { id: 'plant-orchid', x: 2, z: 0, ry: 0 }, { id: 'plant-cactus', x: 0, z: 2, ry: 0 }]));
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const start = async () => {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2epl' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn').catch(() => {});
  await page.fill('#nickname', 'Tester').catch(() => {});
  await page.click('#start-btn', { timeout: 90000 }).catch(() => {});
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
  await page.evaluate(() => { __mk.homeStub?.(); __mk.enter('forest-lane-apt'); });
  await page.waitForFunction(() => __mk.decor() === 4, null, { timeout: 30000 });
};
const wait = (ms) => page.waitForTimeout(ms);
const label = () => page.evaluate(() => document.getElementById('action-btn')?.textContent || '');
const scale = (id) => page.evaluate((k) => __mk.decorAt().find((i) => i[0] === k)[4], id);
const days = (id) => page.evaluate((k) => JSON.parse(localStorage.getItem('mk.plants'))[k]?.n || 0, id);
const by = (id) => page.evaluate((k) => { const [, x, z] = __mk.decorAt().find((i) => i[0] === k); __mk.goto(x, z + 0.95, Math.PI); }, id);

await start();
assert(await scale('plant-monstera') === 1.4, `40 watered days: 140% (${await scale('plant-monstera')})`);
assert(await scale('plant-olive') === 2, `100 days: twice the size (${await scale('plant-olive')})`);
assert(await scale('plant-orchid') === 1.5, `a table plant stops at 150% (${await scale('plant-orchid')})`);
assert(await scale('plant-cactus') === 1, 'never watered: as bought');
await page.evaluate(() => { __mk.goto(0, 3.2, Math.PI); __mk.cam?.({ yaw: 0, pitch: 0.25, dist: 6 }); });
await wait(1500);
if (S) await page.screenshot({ path: `${S}/17-plants-grown-at-home.png` });

await by('plant-monstera');
await wait(600);
assert((await label()).includes('💧') && (await label()).includes('Monstera') && !(await label()).includes('▾'), `by the monstera: "${await label()}"`);
if (S) await page.screenshot({ path: `${S}/18-water-button.png` });
await page.click('#action-btn');
await wait(250);
if (S) await page.screenshot({ path: `${S}/19-watering.png` });
assert(await days('plant-monstera') === 41, 'watered at once: day 41');
assert(await scale('plant-monstera') === 1.4, 'no bigger today');
await wait(700);
assert((await label()).includes('41'), `the button now says it is done for today, with carry and remove behind it: "${await label()}"`);
await page.evaluate(() => __mk.pick(0));
assert(await days('plant-monstera') === 41, 'a second press the same day does nothing');

// Each plant on its own: the cactus is still waiting for its water.
await by('plant-cactus');
await wait(600);
assert((await label()).includes('💧') && !(await label()).includes('('), `the cactus still wants water: "${await label()}"`);
await page.click('#action-btn');
assert(await days('plant-cactus') === 1 && await scale('plant-cactus') === 1, 'the cactus: day 1, same size today');

// The next day (the saved days moved one day back): both have grown 1%.
await page.evaluate(() => {
  const p = (n) => String(n).padStart(2, '0'), d = new Date(); d.setDate(d.getDate() - 1);
  const y = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, s = JSON.parse(localStorage.getItem('mk.plants'));
  for (const k in s) s[k].d = y;
  localStorage.setItem('mk.plants', JSON.stringify(s));
});
await start();
assert(await scale('plant-monstera') === 1.41, `the next day: 141% (${await scale('plant-monstera')})`);
assert(await scale('plant-cactus') === 1.01, `the cactus: 101% (${await scale('plant-cactus')})`);
assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
