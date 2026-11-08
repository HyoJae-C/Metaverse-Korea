// End-to-end check: fetch on the Han River park lawn. With a dog and a
// frisbee, the button shows only on the grass; the dog runs, brings the
// frisbee back (in the air or off the grass) and the game ends. A cat only
// watches; walking to the frisbee picks it up.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/frisbee.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 } })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 15000, what = '') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await wait(100); } throw new Error('timed out ' + what + ' ' + JSON.stringify(await mk('frisbee')) + ' ' + await label()); };
let ok = false;
let label = async () => '';
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Fetch');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await mk('givePet', 'pet-shiba');
  await mk('giveFrisbee');
  label = async () => [await mk('action'), ...((await mk('choices')) || [])].join('|');
  // On the street, away from any park: no frisbee.
  await wait(500);
  if ((await label()).includes('🥏')) throw new Error('frisbee off the lawn: ' + await label());
  await mk('enter', 'ttukseom-hangang');
  await until(async () => (await mk('room')).id === 'ttukseom-hangang');
  await mk('place', -10, 7); await mk('face', Math.PI / 2);
  await until(async () => (await label()).includes('🥏'));
  console.log('button:', await label());
  // Held in the hand (out of the bag) it still works.
  await mk('holdFromBag', 'gift');
  if ((await mk('bagKinds')).includes('gift')) throw new Error('still in the bag');
  if (await mk('heldNow') !== 'frisbee') throw new Error('held as ' + await mk('heldNow'));
  await wait(300);
  if (!(await label()).includes('🥏')) throw new Error('no button with the frisbee in hand: ' + await label());
  console.log('in hand: button shows');
  await mk('place', 2, -2); await wait(400);
  if ((await label()).includes('🥏')) throw new Error('frisbee on the path');
  await mk('place', -10, 7); await mk('face', Math.PI / 2);
  for (let round = 0; round < 3; round++) {
    await until(async () => (await label()).includes('🥏'));
    const ch = await mk('choices');
    if (ch) await mk('pick', ch.findIndex((c) => c.includes('🥏'))); else await mk('act');
    await until(async () => (await mk('frisbee'))[0] !== 'idle', 3000);
    if (shotDir && round === 0) { await wait(900); await page.screenshot({ path: `${shotDir}/fly.png` }); }
    const seen = new Set();
    await until(async () => { const [ph] = await mk('frisbee'); seen.add(ph); return ph === 'idle'; }, 20000);
    const pet = await mk('pet');
    console.log('round', round, [...seen].join('>'), 'streak', (await mk('frisbee'))[1], 'pet at', pet.x.toFixed(1), pet.z.toFixed(1));
    if (!seen.has('back')) throw new Error('the dog never brought it back');
  }
  // The golden retriever and the monkey play too (they come by code).
  for (const id of ['pet-golden', 'pet-monkey']) {
    await mk('givePet', id);
    await mk('place', -10, 7); await mk('face', Math.PI / 2);
    const seen = new Set();
    for (let round = 0; round < 2; round++) {
      await until(async () => (await label()).includes('🥏'), 15000, id + ' button');
      const c = await mk('choices');
      if (c) await mk('pick', c.findIndex((x) => x.includes('🥏'))); else await mk('act');
      await until(async () => { const [ph] = await mk('frisbee'); seen.add(ph); return ph === 'idle' && seen.size > 1; }, 20000, id + ' fetch');
    }
    if (!seen.has('back')) throw new Error(id + ' never brought it back');
    console.log(id, [...seen].join('>'), 'streak', (await mk('frisbee'))[1]);
  }
  // A cat just watches; walk over to pick it up.
  await mk('givePet', 'pet-cheesecat');
  await mk('place', -10, 7); await mk('face', Math.PI / 2);
  await until(async () => (await label()).includes('🥏'), 15000, 'cat button');
  const ch = await mk('choices');
  if (ch) await mk('pick', ch.findIndex((c) => c.includes('🥏'))); else await mk('act');
  await until(async () => (await mk('frisbee'))[0] === 'lie', 6000, 'cat lie');
  if ((await label()).includes('🥏')) throw new Error('throwing again while it lies on the grass');
  const [, , at] = await mk('frisbee');
  await mk('place', at[0] - 0.5, at[1]);
  await until(async () => (await mk('frisbee'))[0] === 'idle', 3000, 'pick up');
  console.log('cat: watched, picked up');
  ok = !errors.length;
} catch (e) { console.error('FAIL', e.message); }
if (errors.length) console.error('page errors:', errors);
await browser.close();
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
