// End-to-end check: a fishing contest between two friends in a Han River
// park (game/fish-contest.js). A asks B and picks a rule, B accepts, both
// count down and start; A's catch shows on B's side; B walking out of the
// park ends it on both sides. (Three minutes of fishing isn't waited for:
// the scoring is in tests/fish-contest.test.mjs.)
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/fish-contest.mjs http://localhost:4173/
// With a build made with VITE_NET_PROVIDER=local, add --bridge: the two
// browsers' BroadcastChannels are joined through this script (no server).
// Otherwise realtime runs on a fake server in this script (fake-realtime.mjs),
// not the live Supabase project; E2E_REAL_REALTIME=1 uses the real one.
import { chromium } from 'playwright';
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
  const ctx = await browser.newContext({ viewport: { width: 900, height: 640 } });
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

const a = await join('Rod A');
const b = await join('Rod B');
let ok = false;
try {
  step = 'friends, then both to the same park';
  await a.evaluate(() => __mk.giftFriends(['Rod B']));
  await b.evaluate(() => __mk.giftFriends(['Rod A']));
  const park = await a.evaluate(async () => {
    const region = await (await fetch('regions/another-seoul/region.json')).json();
    for (const d of region.districts) {
      const map = await (await fetch('regions/another-seoul/' + d.map)).json();
      const l = (map.landmarks || []).find((q) => q.type === 'hanpark');
      if (l) return l.store;
    }
    return null;
  });
  if (!park) throw new Error('no Han River park');
  for (const page of [a, b]) await page.evaluate((id) => __mk.enter(id), park);
  for (const page of [a, b]) {
    const drop = await page.evaluate(() => __mk.pose());
    await page.evaluate(([x, z]) => __mk.place(x, z), [drop[1], drop[2]]);
    await page.waitForFunction((id) => __mk.hanPark()?.id === id, park, { timeout: 20000 });
  }
  const [sx, sz] = (await a.evaluate(() => __mk.spots()))[0];
  await a.evaluate(([x, z]) => __mk.place(x, z), [sx, sz]);
  await b.evaluate(([x, z]) => __mk.place(x + 1.5, z), [sx, sz]);
  for (const page of [a, b]) await page.waitForFunction(() => __mk.near() === 1, null, { timeout: 30000 });

  step = 'A asks B and picks "stars added up"';
  await a.waitForFunction(() => (__mk.choices() || [__mk.action()]).some((l) => /contest/i.test(l || '')), null, { timeout: 10000 });
  await a.evaluate(() => { const i = (__mk.choices() || []).findIndex((l) => /contest/i.test(l)); __mk.pick(i); });
  await a.waitForSelector('.fc-rules:not([hidden]) button.chip', { timeout: 5000 });
  if (shotDir) await a.screenshot({ path: shotDir + '/contest-rules.png' });
  await a.click('.fc-rules .fc-rule-list button:nth-child(2)');

  step = 'B accepts';
  await b.waitForFunction(() => /accept/i.test(__mk.action() || ''), null, { timeout: 25000 });
  await b.evaluate(() => { const i = (__mk.choices() || []).findIndex((l) => /accept/i.test(l)); __mk.pick(i); });
  for (const page of [a, b]) await page.waitForFunction(() => __mk.contest()?.phase === 'count' || __mk.contest()?.phase === 'fish', null, { timeout: 10000 });
  // Both see the big VS banner with both names (Yozi 2026-11-21).
  for (const page of [a, b]) {
    const vs = await page.evaluate(() => __mk.contestVs());
    if (!vs || !vs.includes('Rod A') || !vs.includes('Rod B')) throw new Error('no VS banner with both names: ' + JSON.stringify(vs));
  }
  if (shotDir) await b.screenshot({ path: shotDir + '/contest-vs.png' });
  for (const page of [a, b]) if ((await page.evaluate(() => __mk.contest().rule)) !== 'sum') throw new Error('the rule A picked did not reach both');
  for (const page of [a, b]) await page.waitForFunction(() => __mk.contest()?.phase === 'fish', null, { timeout: 8000 });
  if (!(await a.isVisible('#contest-chip'))) throw new Error('no contest chip');

  step = "A's catch reaches B";
  const cm = await a.evaluate(() => __mk.contestCatch('carp'));
  if (!(cm > 0)) throw new Error('the catch did not count');
  await b.waitForFunction(() => __mk.contest().them.cm > 0, null, { timeout: 10000 });
  if (shotDir) { await a.waitForTimeout(600); await a.screenshot({ path: shotDir + '/contest-chip.png' }); }

  step = 'B walks out of the park: it ends on both sides';
  await b.evaluate(() => __mk.place(0, 0));
  await b.waitForFunction(() => __mk.contest()?.done && __mk.contest().quit === 'me', null, { timeout: 15000 });
  await a.waitForFunction(() => __mk.contest()?.done && __mk.contest().quit === 'them', null, { timeout: 15000 });
  await a.waitForFunction(() => document.getElementById('contest-chip').hidden, null, { timeout: 3000 });
  ok = true;
} catch (e) {
  errors.push(`assertion at "${step}": ${e.message.split('\n')[0]}`);
  for (const [n, page] of [['A', a], ['B', b]]) {
    const st = await page.evaluate(() => ({ room: __mk.room(), near: __mk.near(), park: __mk.hanPark()?.id, action: __mk.action(), choices: __mk.choices(), contest: __mk.contest() })).catch((x) => x.message);
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
