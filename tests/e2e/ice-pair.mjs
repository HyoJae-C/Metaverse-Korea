// End-to-end check: two friends skating together at Mokdong Ice Rink
// (game/ice-pair.js). Strangers get no offer; A asks B hand in hand, B says
// yes, A skates and B is held at A's side; B lets go; B pushes A crouching
// in front; stepping off the ice ends it on both sides.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/ice-pair.mjs http://localhost:4173/ [screenshot dir]
// Realtime runs on a fake server in this script (fake-realtime.mjs).
import { chromium, devices } from 'playwright';
import { useFakeRealtime, summary, log as rtLog } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/';
const bridge = process.argv.includes('--bridge');
const shotDir = process.argv.slice(3).find((a) => !a.startsWith('--')) || null;
const pages = [];
// Each player gets a browser of their own (as in multiplayer.mjs): two
// contexts in one browser share its GPU process, and with software GL the
// second player's start-up queued behind the first one's frames until the
// HUD wait timed out on CI (from 2026-11-13, as the city grew).
const launch = () => chromium.launch({ executablePath: process.env.CHROME || process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const browsers = [];
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);
const errors = [];
const logs = [];
let step = 'joining';

async function join(name) {
  const browser = await launch();
  browsers.push(browser);
  // E2E_PHONE=1: both on a phone (the button has to be on the screen there too).
  const ctx = await browser.newContext(process.env.E2E_PHONE ? { ...devices['iPhone 13'] } : { viewport: { width: 900, height: 640 } });
  if (!bridge) await useFakeRealtime(ctx, name);
  const page = await ctx.newPage();
  if (bridge) {
    await page.exposeFunction('__bcSend', (ch, data) => {
      for (const p of pages) if (p !== page) p.evaluate(([c, d]) => window.__bcDeliver?.(c, d), [ch, data]).catch(() => {});
    });
    await page.addInitScript(() => {
      const Real = window.BroadcastChannel, open = new Set();
      window.__bcDeliver = (c, d) => { for (const ch of open) if (ch.name === c && !ch.closed) ch._got({ data: d }); };
      window.BroadcastChannel = class extends EventTarget {
        constructor(name) { super(); this.name = name; this.real = new Real(name); this.real.onmessage = (e) => this._got(e); open.add(this); }
        _got(e) { this.onmessage?.(e); this.dispatchEvent(new MessageEvent('message', { data: e.data })); }
        postMessage(d) { this.real.postMessage(d); if (!this.name.includes('active-tab')) window.__bcSend(this.name, JSON.parse(JSON.stringify(d))); }
        close() { this.closed = true; open.delete(this); this.real.close(); }
      };
    });
  }
  pages.push(page);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  // Warnings and errors are printed if the test fails (a realtime join that
  // timed out, a rate limit); with E2E_LOG=1, every console line as it comes.
  page.on('console', (m) => {
    const line = `${name} ${m.type()}: ${m.text().slice(0, 200)}`;
    if (process.env.E2E_LOG) console.log(line);
    else if (m.type() === 'error' || m.type() === 'warning') logs.push(line);
  });
  // Every toast the game shows (gift sent, nobody here, turned down...).
  await page.exposeFunction('__toastSeen', (t) => logs.push(`${name} toast: ${t}`));
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('toast');
    if (el) new MutationObserver(() => { if (!el.hidden && el.textContent) window.__toastSeen(el.textContent); }).observe(el, { childList: true, characterData: true, subtree: true, attributes: true });
  }));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', '');
  await page.type('#nickname', name);
  // Building the world blocks the page, so a plain click can time out
  // waiting for it to come back: press the button from inside the page on
  // the next tick and wait for the HUD, with room for a slow runner.
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible', timeout: 90000 });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.waitForFunction(() => window.__mk, null, { timeout: 60000 }); // (the test hooks come a moment after the HUD)
  return page;
}

const a = await join('Ice A');
const b = await join('Ice B');
let ok = false;
const dbg = (page) => page.evaluate(() => ({ ...__mk.iceRink.pair.debug(), skating: __mk.iceRink.skating, pose: __mk.pose() }));
const dist = async (p1, p2) => { const [q, r] = [await p1.evaluate(() => __mk.pose()), await p2.evaluate(() => __mk.pose())]; return Math.hypot(q[1] - r[1], q[2] - r[2]); };
try {
  step = 'both onto the ice, side by side';
  for (const page of [a, b]) {
    await page.evaluate(() => __mk.enter('mokdong-ice-rink'));
    await page.waitForFunction(() => __mk.room().id === 'mokdong-ice-rink', null, { timeout: 30000 });
    await page.waitForFunction(() => __mk.iceRink.loaded, null, { timeout: 20000 });
  }
  await a.evaluate(() => __mk.place(10, -2));
  await b.evaluate(() => __mk.place(11.5, -2));
  for (const page of [a, b]) await page.waitForFunction(() => __mk.iceRink.skating && __mk.near() === 1, null, { timeout: 30000 });

  step = 'strangers cannot ask';
  await a.waitForTimeout(1500);
  if ((await dbg(a)).near) throw new Error('a stranger was offered');
  // The button is there all the same, and says why when tapped.
  if (!(await a.isVisible('#ice-pair')) || (await a.textContent('#ice-pair')).includes('Ice B')) throw new Error('the faint 🤝 button is missing, or names a stranger');
  await a.click('#ice-pair');
  await a.waitForFunction(() => /friend/i.test(document.getElementById('toast')?.textContent || ''), null, { timeout: 3000 });
  if (await a.isVisible('#ice-pair-panel')) throw new Error('a stranger got the menu');
  if (shotDir) await a.screenshot({ path: `${shotDir}/pair-hint.png` });

  step = 'a friend 4 m away can be asked (5 m reach)';
  await b.evaluate(() => __mk.place(14, -2));

  step = 'friends: A asks B to skate hand in hand, B says yes';
  await a.evaluate(() => __mk.giftFriends(['Ice B']));
  await b.evaluate(() => __mk.giftFriends(['Ice A']));
  await a.waitForFunction(() => __mk.iceRink.pair.debug().near, null, { timeout: 10000 });
  if (!(await a.textContent('#ice-pair')).includes('Ice B')) throw new Error('the 🤝 button does not name the friend');
  await a.click('#ice-pair');
  await a.waitForSelector('#ice-pair-panel button', { timeout: 3000 });
  if (shotDir) await a.screenshot({ path: shotDir + '/pair-menu.png' });
  await a.click('#ice-pair-panel button:nth-of-type(1)');
  await b.waitForSelector('#ice-pair-panel button', { timeout: 10000 });
  if (shotDir) await b.screenshot({ path: shotDir + '/pair-ask.png' });
  await b.click('#ice-pair-panel button:nth-of-type(1)');
  await a.waitForFunction(() => __mk.iceRink.pair.debug().pair?.role === 'L', null, { timeout: 10000 });
  await b.waitForFunction(() => __mk.iceRink.pair.debug().pair?.role === 'F', null, { timeout: 10000 });
  for (const page of [a, b]) if (!/✋/.test(await page.evaluate(() => __mk.action() || ''))) throw new Error('the action button is not Let go');

  step = 'A skates off and B is held at A\'s side, on both screens';
  await a.evaluate(() => { const s = __mk.iceRink.skater; s.vx = -6; s.vz = 0; });
  await a.waitForTimeout(1500);
  const d1 = await dist(a, b);
  if (!(d1 > 0.4 && d1 < 1.6)) throw new Error(`B is ${d1.toFixed(2)} m from A`);
  if ((await b.evaluate(() => __mk.pose()))[1] > 9) throw new Error('B did not travel with A');
  if (shotDir) { await a.evaluate(() => __mk.cam({ yaw: 2.6, pitch: 0.16, dist: 6 })); await a.waitForTimeout(500); await a.screenshot({ path: shotDir + '/pair-hand-a.png' }); await b.evaluate(() => __mk.cam({ yaw: -2.6, pitch: 0.16, dist: 6 })); await b.waitForTimeout(500); await b.screenshot({ path: shotDir + '/pair-hand-b.png' }); }

  step = 'B lets go: apart on both sides';
  await b.evaluate(() => __mk.iceRink.pair.letGo());
  for (const page of [a, b]) await page.waitForFunction(() => !__mk.iceRink.pair.debug().pair, null, { timeout: 10000 });
  await a.evaluate(() => { const s = __mk.iceRink.skater; s.vx = 0; s.vz = 0; });

  step = 'B asks to push A: A crouches in front of B';
  await a.evaluate(() => { __mk.iceRink.skater.vx = 0; __mk.place(0, -2); });
  await b.evaluate(() => { __mk.iceRink.skater.vx = 0; __mk.iceRink.skater.vz = 0; __mk.place(1.5, -2); });
  await b.waitForFunction(() => __mk.iceRink.pair.debug().near, null, { timeout: 15000 });
  await b.click('#ice-pair');
  await b.click('#ice-pair-panel button:nth-of-type(2)');
  await a.waitForSelector('#ice-pair-panel button', { timeout: 10000 });
  await a.click('#ice-pair-panel button:nth-of-type(1)');
  await b.waitForFunction(() => __mk.iceRink.pair.debug().pair?.kind === 'push' && __mk.iceRink.pair.debug().pair.role === 'L', null, { timeout: 10000 });
  await a.waitForFunction(() => __mk.iceRink.pair.debug().pair?.role === 'F', null, { timeout: 10000 });
  await b.evaluate(() => { const s = __mk.iceRink.skater; s.vx = -6; s.vz = 0; });
  await b.waitForTimeout(1500);
  const d2 = await dist(a, b);
  if (!(d2 > 0.3 && d2 < 1.5)) throw new Error(`A is ${d2.toFixed(2)} m from B`);
  const [pa, pb] = [await a.evaluate(() => __mk.pose()), await b.evaluate(() => __mk.pose())];
  if (!(pa[1] < pb[1] + 0.2)) throw new Error('A is not in front of B (B heads -x)');
  if (shotDir) { await b.evaluate(() => __mk.cam({ yaw: 2.4, pitch: 0.16, dist: 6 })); await b.waitForTimeout(500); await b.screenshot({ path: shotDir + '/pair-push-b.png' }); await a.evaluate(() => __mk.cam({ yaw: -2.4, pitch: 0.16, dist: 6 })); await a.waitForTimeout(500); await a.screenshot({ path: shotDir + '/pair-push-a.png' }); }

  step = 'B steps off the ice: it ends on both sides';
  await b.evaluate(() => __mk.place(0, 14));
  for (const page of [a, b]) await page.waitForFunction(() => !__mk.iceRink.pair.debug().pair, null, { timeout: 12000 });
  if (!(await a.evaluate(() => __mk.iceRink.skating))) throw new Error('A is no longer skating');
  ok = !errors.length;
} catch (e) {
  errors.push(`assertion at "${step}": ${e.message.split('\n')[0]}`);
  for (const [n, page] of [['A', a], ['B', b]]) {
    const st = await dbg(page).catch((x) => x.message);
    errors.push(`${n} state: ${JSON.stringify(st)}`);
  }
  errors.push(...logs.slice(-40));
  if (!bridge) errors.push(...rtLog.slice(-30));
  if (shotDir) { await a.screenshot({ path: shotDir + '/fail-a.png' }); await b.screenshot({ path: shotDir + '/fail-b.png' }); }
}
for (const br of browsers) await br.close();
for (const e of errors) console.log(e);
console.log(ok ? 'PASS' : 'FAIL');
if (!bridge) console.log(summary());
process.exit(ok ? 0 : 1);
