// End-to-end check: two separate browsers join the same room through the
// configured realtime provider and see each other.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/multiplayer.mjs http://localhost:4173/
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
// Each player gets a browser of their own, as in real life. (Two contexts in
// one browser share its GPU process: with software GL the second player's
// start-up queued behind the first player's frames, ~5x slower, and timed
// out at 90 s on CI runners as the map grew.)
const launch = () => chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const browsers = [];
const errors = [];
// A fresh room per run, so visitors on the live site (same Supabase project)
// or a parallel CI run can't change the player count.
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);

async function join(name) {
  const browser = await launch();
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => (m.type() === 'warning' || m.type() === 'error') && errors.push(`${name}: ${m.text()}`));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM); // private test room; debug exposes window.__mk
  await page.click('#next-btn');
  // Type key by key (fill() bypasses key handlers and once hid a bug here).
  await page.fill('#nickname', '');
  await page.type('#nickname', name);
  if ((await page.inputValue('#nickname')) !== name) throw new Error('nickname field did not accept typing');
  // Building the world blocks the page: with software GL the click can take
  // a while on CI runners.
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  // First visit: the welcome coins card covers the screen until it's closed.
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  return page;
}

const a = await join('E2E A');
const b = await join('E2E B');
let ok = false;
try {
  // Meeting in the test room (the online badge counts everyone on the live
  // map, so visitors can raise it; check the people around us instead).
  await a.waitForFunction(() => __mk.near() === 1, null, { timeout: 20000 });
  await b.keyboard.down('KeyW');
  await b.waitForTimeout(1000);
  await b.keyboard.up('KeyW');
  await b.click('#emote-main'); // open the emote wheel
  await b.click('#emotes button >> nth=0');
  await a.waitForSelector('.bubble', { timeout: 15000 }); // CI renders at ~2 fps
  // Text chat reaches the other player as a bubble and a log line.
  await b.click('#chat-btn');
  await b.fill('#chat-input', 'hello from B');
  await b.press('#chat-input', 'Enter');
  await a.waitForFunction(() => document.querySelector('#chat-log')?.textContent.includes('hello from B'), null, { timeout: 15000 });
  // On the street, chat from someone more than 10 m away is not shown.
  const [ax0, az0] = await a.evaluate(() => __mk.me());
  await b.evaluate(([x, z]) => __mk.goto(x + 25, z), [ax0, az0]);
  // Wait until A has B's new spot, so the check is about distance, not timing.
  await a.waitForFunction(([x, z]) => __mk.peers().some((p) => p.name === 'E2E B' && Math.hypot(p.x - x, p.z - z) > 20), [ax0, az0], { timeout: 10000 });
  await b.fill('#chat-input', 'too far to hear');
  await b.press('#chat-input', 'Enter');
  await a.waitForTimeout(2500);
  if (await a.evaluate(() => document.querySelector('#chat-log')?.textContent.includes('too far to hear'))) throw new Error('street chat from 25 m away was shown');
  await b.press('#chat-input', 'Escape');
  // Area cells: far away we drop out of each other's rooms, back nearby we meet again.
  const [ax, az] = await a.evaluate(() => __mk.me());
  await b.evaluate(([x, z]) => __mk.goto(x + 700, z), [ax, az]);
  // (The online count is everyone on the map: at least the two of us, even
  // apart. Visitors on the live site can make it more.)
  await a.waitForFunction(() => __mk.near() === 0, null, { timeout: 15000 });
  const total = await a.evaluate(() => { const o = document.querySelector('#online'); return o.hidden ? 0 : +(o.textContent.match(/\d+/)?.[0] || 0); });
  if (total < 2) throw new Error(`online count should stay global while apart (saw ${total})`);
  await b.evaluate(([x, z]) => __mk.goto(x + 3, z), [ax, az]);
  await a.waitForFunction(() => __mk.near() === 1, null, { timeout: 15000 });
  ok = true;
} catch (e) {
  errors.push('assertion: ' + e.message);
  // Diagnostics: what each player sees, and how fast the page is rendering.
  for (const [n, p] of [['A', a], ['B', b]]) {
    const info = await p.evaluate(async () => {
      const t0 = performance.now(); let f = 0;
      await new Promise((r) => { const tick = () => (++f < 10 ? requestAnimationFrame(tick) : r()); requestAnimationFrame(tick); });
      const o = document.querySelector('#online');
      const me = window.__mk?.me?.();
      const peers = (window.__mk?.peers?.() || []).map((p) => ({ name: p.name, dist: me ? +Math.hypot(p.x - me[0], p.z - me[1]).toFixed(1) : null }));
      const log = [...document.querySelectorAll('#chat-log .chat-line')].map((l) => l.textContent).slice(-4);
      return { online: o.hidden ? 'hidden' : o.textContent, near: window.__mk?.near?.(), peers, chat: window.__mk?.chatState?.(), log, fps: Math.round(10000 / (performance.now() - t0)) };
    }).catch((err) => ({ error: err.message }));
    errors.push(`${n}: ${JSON.stringify(info)}`);
  }
}
await a.screenshot({ path: 'e2e-multiplayer.png' });
console.log(ok ? 'PASS: players see each other, emotes and chat arrive, area cells switch' : 'FAIL');
if (errors.length) console.log(errors.join('\n'));
for (const b of browsers) await b.close();
process.exit(ok ? 0 : 1);
