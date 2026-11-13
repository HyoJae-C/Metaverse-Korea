// Saved games load: the game is started with a few returning players' saves
// already on the device (what the cloud copies in before main.js runs) and
// must reach the HUD with no error. Restoring a save runs code early in
// main.js (the cup in your hand, the errand chip…); if that code reaches
// something defined further down, the load stops halfway and the player
// can't get in on any device (KimPD, 2026-11-13: a drink in hand + today's
// errand done → "openParkHere is not a function", then "pF.onMsg").
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/saved-start.mjs http://localhost:4173/
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/';
const today = new Date();
const dayStr = today.toDateString(); // (quests.js keys its day like this)
const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const base = {
  'mk.lang': 'en', 'mk.made': '1', 'mk.name': 'Tester', 'mk.onboard': '2', 'mk.helpSeen': '1', 'mk.lastPlace': 'seongsu',
  'mk.look': { model: 'basic', shirt: 'sky', pants: 'charcoal', hair: 'rose', skin: 'deep', shoes: 'black' },
  'mk.wallet': { coins: 932, day: '', ads: 0, gift: 1000 },
  'mk.identity': { name: 'Tester', nameAt: 1, model: null, modelAt: 0 },
};
// Each save: what a player had when they last left.
const SAVES = {
  'drink in hand, errand done': {
    'mk.held': { kind: 'coffee', sips: 2, name: 'Energy drink' },
    'mk.quests': { day: dayStr, done: 0, active: { kind: 'taxi', need: 1, n: 1, starter: 1 }, last: 'visit', starter: 1, v: 2 },
    'mk.daily': { day: iso, missions: [{ type: 'talk', target: '시우', need: 1, id: 'talk:시우', n: 0 }, { type: 'pet', need: 1, id: 'pet:', n: 0 }], bonus: false, streak: 1, last: iso, total: 2 },
    'mk.bag': { cap: 20, items: [{ kind: 'umbrella' }] },
    'mk.lastSpot': { x: -364.6, z: -36.8, ry: 1.87, t: Date.now() - 60000 },
  },
  'food in hand, errand half done': {
    'mk.held': { kind: 'food', sips: 3, name: 'Tteokbokki', snack: 'tteokbokki' },
    'mk.quests': { day: dayStr, done: 1, active: { kind: 'coffee', need: 2, n: 1 }, last: 'taxi', v: 2 },
    'mk.daily': { day: iso, missions: [{ type: 'visit', target: 'mulgyeol-hair', need: 1, id: 'visit:mulgyeol-hair', n: 1 }], bonus: false, streak: 3, last: iso, total: 9 },
    'mk.umbrella': '1',
  },
};

const browser = await chromium.launch({
  executablePath: process.env.E2E_CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const failed = [];
for (const [label, save] of Object.entries(SAVES)) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  await useFakeRealtime(ctx, 'saved-start');
  const entries = Object.entries({ ...base, ...save }).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]);
  await ctx.addInitScript((kv) => {
    if (sessionStorage.getItem('e2e.seeded')) return; // (once: the game saves over it as it plays)
    for (const [k, v] of kv) localStorage.setItem(k, v);
    sessionStorage.setItem('e2e.seeded', '1');
  }, entries);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && /game failed to load|\[mk\]/.test(m.text())) errors.push(m.text().split('\n')[0]); });
  await page.goto(url + '?debug&weather=clear&room=saved' + Math.random().toString(36).slice(2, 8));
  let hud = false;
  try {
    await page.click('#next-btn', { timeout: 90000 });
    if (await page.locator('#start-btn').isVisible().catch(() => false)) await page.click('#start-btn');
    await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
    hud = true;
    await page.waitForTimeout(4000);
    // The game ran to its end: the ?debug hooks near the bottom of main.js exist.
    if (!(await page.evaluate(() => typeof window.__mk === 'object'))) errors.push('setup did not finish');
  } catch (e) { errors.push('no HUD: ' + e.message.split('\n')[0]); }
  console.log(`${hud && !errors.length ? 'ok  ' : 'FAIL'} ${label}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
  if (!hud || errors.length) failed.push(label);
  await ctx.close();
}
await browser.close();
if (failed.length) {
  console.error(`\nA saved game no longer loads: ${failed.join(', ')}.\nLook for code that runs while main.js is still setting up (restoring the save) and reaches something defined further down.`);
  process.exit(1);
}
console.log('Saved games load OK');
