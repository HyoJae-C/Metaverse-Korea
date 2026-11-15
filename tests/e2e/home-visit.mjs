// End-to-end check: home visits. Host opens their home (visits: everyone),
// the guest picks it from the door's list, walks in and sees the host's
// furniture; the host moves a piece and the guest sees it; with the host
// on "Nobody" the guest is sent out; the host leaving sends the guest out.
// The server functions (047_home_visits.sql) are stubbed (__mk.homeStub);
// realtime runs on the fake server (fake-realtime.mjs).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/home-visit.mjs http://localhost:4173/ [shot dir]
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


const h = await join('Host H');
const g = await join('Guest G');
const state = (p) => p.evaluate(() => __mk.homeVisit());
let ok = false;
try {
  step = 'host opens the home';
  await h.evaluate(() => { __mk.homeStub(); localStorage.setItem('mk.homeVisit', 'all'); });
  await h.evaluate(() => __mk.enter('forest-lane-apt'));
  await h.waitForFunction(() => __mk.homeVisit().hosting, null, { timeout: 30000 });
  const hostId = (await state(h)).me;
  const pieces = await h.evaluate(() => __mk.decor());
  if (pieces < 6) throw new Error('no starter room: ' + pieces);

  step = 'guest picks it at the door';
  await g.evaluate((id) => __mk.homeStub([{ net_id: id, name: 'Host H', friend: false }]), hostId);
  await g.evaluate(() => __mk.openHomes());
  await g.waitForSelector('#visit-panel .visit-list button', { timeout: 10000 });
  if (shotDir) await g.screenshot({ path: shotDir + '/visit-list.png' });
  await g.click('#visit-panel .visit-list button');
  await g.waitForFunction((id) => __mk.homeVisit().guest === id, hostId, { timeout: 30000 });
  step = 'guest sees the furniture';
  await g.waitForFunction((n) => __mk.decor() === n, pieces, { timeout: 20000 });
  if (await g.isVisible('#decor-btn')) throw new Error('a guest can decorate');
  if (shotDir) { await g.waitForTimeout(1500); await g.screenshot({ path: shotDir + '/visit-inside.png' }); }

  step = 'host removes a piece, the guest sees it';
  const tap = (p, sel) => p.evaluate((q) => document.querySelector(q).click(), sel); // (the pinned notice can sit over the Decorate button)
  await tap(h, '#decor-btn');
  await tap(h, '#decor-grid [data-id="plant"]');
  await tap(h, '#piece-remove');
  await g.waitForFunction((n) => __mk.decor() === n, pieces - 1, { timeout: 10000 });

  step = 'host closes the home: the guest goes out';
  await tap(h, '#visit-row [data-visit="none"]');
  await g.waitForFunction(() => !__mk.homeVisit().guest, null, { timeout: 15000 });
  if (!(await h.evaluate(() => __mk.solo()))) throw new Error('host not alone after closing');

  step = 'host opens again, guest back in, host leaves: guest goes out';
  await tap(h, '#visit-row [data-visit="all"]');
  await h.waitForFunction(() => __mk.homeVisit().hosting, null, { timeout: 30000 });
  await g.evaluate(() => __mk.openHomes());
  await g.waitForSelector('#visit-panel .visit-list button', { timeout: 10000 });
  await g.click('#visit-panel .visit-list button');
  await g.waitForFunction((id) => __mk.homeVisit().guest === id, hostId, { timeout: 30000 });
  await g.waitForFunction(() => __mk.near() === 1, null, { timeout: 20000 });
  await h.evaluate(() => __mk.leave());
  await g.waitForFunction(() => !__mk.homeVisit().guest, null, { timeout: 15000 });
  ok = true;
  console.log('home visits ok');
} catch (e) {
  console.error('FAILED at', step, '-', e.message);
  console.error(logs.slice(-30).join('\n'));
  console.error(rtLog.slice(-30).join('\n'));
} finally {
  if (errors.length) { console.error(errors.join('\n')); ok = false; }
  console.log(summary());
  for (const b of browsers) await b.close();
  process.exit(ok ? 0 : 1);
}
