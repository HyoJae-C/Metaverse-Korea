// End-to-end check: an open-air Han River park is part of the street. A on
// the park's lawn and B on the street just behind it see each other where
// they are, and walking on and off the lawn keeps the same people around
// (no reconnecting at the edge, which used to stutter and empty the view).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/open-park-mp.mjs http://localhost:4173/
// With a build made with VITE_NET_PROVIDER=local, add --bridge: the two
// browsers' BroadcastChannels are joined through this script (no server).
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const bridge = process.argv.includes('--bridge');
const shotDir = process.argv.slice(3).find((a) => !a.startsWith('--')) || null;
const pages = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);
const errors = [];

async function join(name) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 640 } });
  const page = await ctx.newPage();
  if (bridge) {
    await page.exposeFunction('__bcSend', (ch, data) => {
      for (const p of pages) if (p !== page) p.evaluate(([c, d]) => window.__bcDeliver?.(c, d), [ch, data]).catch(() => {});
    });
    await page.addInitScript(() => {
      const Real = window.BroadcastChannel, open = new Set();
      window.__bcDeliver = (c, d) => { for (const ch of open) if (ch.name === c && !ch.closed) ch.onmessage?.({ data: d }); };
      window.BroadcastChannel = class {
        constructor(name) { this.name = name; this.real = new Real(name); this.real.onmessage = (e) => this.onmessage?.(e); open.add(this); }
        postMessage(d) { this.real.postMessage(d); if (!this.name.includes('active-tab')) window.__bcSend(this.name, JSON.parse(JSON.stringify(d))); }
        close() { this.closed = true; open.delete(this); this.real.close(); }
        addEventListener(t, f) { if (t === 'message') { const prev = this.onmessage; this.onmessage = (e) => { prev?.(e); f(e); }; } }
        removeEventListener() {}
      };
    });
  }
  pages.push(page);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', '');
  await page.type('#nickname', name);
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  return page;
}

let ok = false;
const a = await join('Lawn A');
const b = await join('Street B');
const mk = (pg, f, ...x) => pg.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const park = await a.evaluate(async () => (await (await fetch('regions/another-seoul/stores.json')).json()).stores.find((s) => s.id === 'banpo-jamwon-hangang').open);
  const { at: [ox, oz], ry } = park;
  const world = (x, z) => [ox + x * Math.cos(ry) + z * Math.sin(ry), oz - x * Math.sin(ry) + z * Math.cos(ry)];
  await mk(a, 'place', ...world(0, 20));
  await mk(b, 'place', ...world(3, 20));
  await wait(4000);
  await mk(a, 'place', ...world(0, 8)); // onto the lawn
  await a.waitForFunction(() => __mk.room().id === 'banpo-jamwon-hangang', null, { timeout: 10000 });
  const seen = async (pg) => (await mk(pg, 'snowSeen')).filter((q) => !q[1] && q[3] != null);
  const at = world(0, 8);
  await b.waitForFunction(([x, z]) => __mk.snowSeen().some((q) => q[3] != null && Math.abs(q[3] - x) < 2), at, { timeout: 15000 }).catch(() => {});
  const bs = await seen(b), as = await seen(a);
  console.log('B sees', JSON.stringify(bs), 'A sees', JSON.stringify(as));
  if (!bs.some((q) => Math.abs(q[3] - at[0]) < 2)) throw new Error('B on the street does not see A on the lawn where A is');
  if (!as.length) throw new Error('A on the lawn sees nobody');
  // Off the lawn and back: still the same room (no reconnect), B still there.
  await mk(a, 'leave');
  await mk(a, 'place', ...world(0, 8));
  await a.waitForFunction(() => __mk.room().id === 'banpo-jamwon-hangang', null, { timeout: 10000 });
  await wait(500);
  if (!(await seen(a)).length) throw new Error('A lost B walking off and on the lawn');
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('PASS');
} catch (e) {
  console.error('FAIL', e.message, errors);
} finally {
  await browser.close();
  process.exit(ok ? 0 : 1);
}
