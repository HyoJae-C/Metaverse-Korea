// End-to-end check: bowling with somebody else in the alley. One player bowls
// alone and the other, on the benches, sees the ball on that lane and the
// score on its screen; then they play a game together on one lane and both
// screens keep the same score.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/bowling-mp.mjs http://localhost:4173/ [screenshot dir]
// (With a build made with VITE_NET_PROVIDER=local, set LOCAL_RELAY=1: the
// local provider talks over BroadcastChannel, which this script then carries
// between the two browsers.)
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const ROOM = 'e2ebowl' + Math.random().toString(36).slice(2, 8);
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const errors = [], browsers = [];
const launch = () => chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const pages = [];
async function join(name) {
  const browser = await launch();
  browsers.push(browser);
  const page = await (await browser.newContext({ viewport: { width: 900, height: 640 } })).newPage();
  if (process.env.LOCAL_RELAY) {
    await page.exposeFunction('__relay', (name, data) => { for (const q of pages) if (q !== page) q.evaluate(([n, d]) => window.__relayIn?.(n, d), [name, data]).catch(() => {}); });
    await page.addInitScript(() => {
      const chans = [], Real = window.BroadcastChannel;
      window.__relayIn = (n, d) => { for (const c of chans) if (c.name === n) c.onmessage?.({ data: JSON.parse(d) }); };
      window.BroadcastChannel = class { constructor(n) { if (!n.startsWith('mk-room-')) return new Real(n); // (only the game's room: not the one-tab check)
 this.name = n; chans.push(this); } postMessage(d) { window.__relay(this.name, JSON.stringify(d)); } close() { chans.splice(chans.indexOf(this), 1); } addEventListener(t, f) { if (t === 'message') this.onmessage = f; } };
    });
  }
  pages.push(page);
  page.on('pageerror', (e) => { errors.push(`${name}: ${e.message}`); console.log('pageerror', name, e.message); });
  page.on('dialog', (d) => d.accept());
  page.on('console', (m) => { if (m.type() === 'error') console.log('console', name, m.text()); });
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', name);
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible' });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.evaluate(() => __mk.enter('strike-lane-bowling'));
  await page.waitForTimeout(1500);
  return page;
}
const lanes = (p) => p.evaluate(() => __mk.bowlLanes());
const shot = async (p, n) => { if (S) await p.screenshot({ path: `${S}/${n}.png` }); };
// The lane's action (with someone close by it comes in a list: pick Bowl).
const act = async (p) => {
  await p.evaluate(() => __mk.act());
  const pick = p.locator('#action-menu:not([hidden]) .action-choice', { hasText: 'Bowl' });
  if (await pick.count()) await pick.first().click();
};
const until = async (p, fn, arg, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn, arg)) return true; await p.waitForTimeout(250); } return false; };
const bowl = async (p) => { for (let k = 0; k < 2; k++) { await p.click('#bowling-panel .karaoke-pad', { force: true }); await p.waitForTimeout(450); } };

const a = await join('Alice'), b = await join('Bobby');
const L = await lanes(a);
assert(L?.length === 8, `eight lanes (${L?.length})`);
const lane = L[4];
// Alice bowls alone on lane 5; Bobby watches from behind.
await b.evaluate(([x, z]) => __mk.place(x, z), [lane.x, lane.z + 4]);
await a.evaluate(([x, z]) => __mk.place(x, z), [lane.x, lane.z]);
await a.waitForTimeout(500);
await until(a, () => /Bowl/.test(__mk.action() || ''));
await act(a);
await a.waitForSelector('#bowling-panel:not([hidden])', { timeout: 90000 });
await a.click('#bowling-panel .order-actions .primary');
await a.waitForTimeout(600);
await bowl(a);
const sawBall = await until(b, () => __mk.bowlLanes()[4].ball, null, 20000);
assert(sawBall, 'the watcher sees Alice\'s ball on lane 5');
await b.waitForTimeout(600);
await shot(b, 'watcher-sees-ball');
const scored = await until(b, () => { const r = __mk.bowlLanes()[4].rows; return r.length === 1 && r[0].name === 'Alice' && r[0].rolls.length === 1; }, null, 30000);
assert(scored, 'Alice\'s score is on lane 5\'s screen for the watcher');
await until(a, () => __mk.bowlLanes()[4].rows[0]?.rolls.length === 1, null, 30000); // (Alice's own ball has to finish rolling first)
const mine = (await lanes(a))[4].rows, theirs = (await lanes(b))[4].rows;
assert(JSON.stringify(mine) === JSON.stringify(theirs), `same score on both screens ${JSON.stringify(mine)} / ${JSON.stringify(theirs)}`);
await a.click('#bowling-panel .sheet-x');
const cleared = await until(b, () => __mk.bowlLanes()[4].rows.length === 0, null, 20000);
assert(cleared, 'the screen is cleared when Alice stops');

// Together: Alice invites Bobby, Bobby joins, they take turns on lane 5.
await b.evaluate(([x, z]) => __mk.place(x + 0.6, z + 0.4), [lane.x, lane.z]);
await a.waitForTimeout(1500);
await until(a, () => /Bowl/.test(__mk.action() || ''));
await act(a);
await a.waitForSelector('#bowling-panel:not([hidden])', { timeout: 90000 });
const invite = a.locator('#bowling-panel .order-actions button', { hasText: 'Bobby' });
await invite.waitFor({ timeout: 30000 });
await invite.click();
await until(b, () => /Bowl/.test(__mk.action() || ''));
await act(b);
await b.waitForSelector('#bowling-panel:not([hidden])', { timeout: 90000 });
const joinBtn = b.locator('#bowling-panel .order-actions button', { hasText: 'Join Alice' });
assert(await joinBtn.waitFor({ timeout: 30000 }).then(() => true, () => false), 'Bobby is invited: "Join Alice\'s game" on his panel');
await joinBtn.click();
const start = a.locator('#bowling-panel .order-actions .primary', { hasText: '2' });
await start.waitFor({ timeout: 30000 });
await start.click();
await b.waitForSelector('#bowling-panel .karaoke-pad', { timeout: 30000 });
// Six turns: whoever has the ball bowls.
for (let k = 0; k < 6; k++) {
  const who = await Promise.all([a, b].map((p) => p.evaluate(() => /^Your turn/.test(document.querySelector('#bowling-panel .karaoke-status')?.textContent || ''))));
  const p = who[0] ? a : who[1] ? b : null;
  if (!p) { await a.waitForTimeout(800); continue; }
  await bowl(p);
  await p.waitForTimeout(k === 1 ? 600 : 5500);
  if (k === 1) { await shot(p === a ? b : a, 'match-friend-watches'); await p.waitForTimeout(5000); }
}
const ra = (await lanes(a))[4].rows, rb = (await lanes(b))[4].rows;
assert(ra.length === 2 && ra[0].name === 'Alice' && ra[1].name === 'Bobby', `both on the screen ${JSON.stringify(ra)}`);
assert(ra[0].rolls.length > 0 && ra[1].rolls.length > 0, 'both have bowled');
assert(JSON.stringify(ra) === JSON.stringify(rb), `the same score on both screens ${JSON.stringify(ra)} / ${JSON.stringify(rb)}`);
await shot(a, 'match-alice');
await shot(b, 'match-bobby');
console.log('errors:', errors);
assert(!errors.length, 'no page errors');
for (const br of browsers) await br.close();
