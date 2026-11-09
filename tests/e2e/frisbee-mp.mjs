// End-to-end check: two players in the Han River park. A throws a frisbee
// for their dog; B sees the same throw played with A's dog (the "fb" note).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/frisbee-mp.mjs http://localhost:4173/
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

const a = await join('Fetch A');
const b = await join('Fetch B');
const mk = (pg, f, ...x) => pg.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const pg of [a, b]) await mk(pg, 'enter', 'ttukseom-hangang');
  await wait(3000);
  await mk(a, 'givePet', 'pet-golden'); await mk(a, 'giveFrisbee', 2);
  await mk(b, 'place', 131, 377);
  const phases = new Set();
  for (let round = 0; round < 2; round++) {
    await mk(a, 'place', 135, 380); await mk(a, 'face', Math.PI / 2);
    let label = '';
    for (let i = 0; i < 60 && !label.includes('🥏'); i++) { label = [await mk(a, 'action'), ...((await mk(a, 'choices')) || [])].join('|'); await wait(150); }
    const ch = await mk(a, 'choices');
    if (ch) await mk(a, 'pick', ch.findIndex((c) => c.includes('🥏'))); else await mk(a, 'act');
    for (let i = 0; i < 200; i++) { for (const ph of await mk(b, 'frisbeePeers')) phases.add(ph); if ((await mk(a, 'frisbee'))[0] === 'idle' && i > 20) break; await wait(50); }
    console.log('round', round, 'B saw', [...phases].join('>'));
  }
  if (!phases.has('fly')) throw new Error('B never saw the frisbee fly');
  if (!phases.has('back')) throw new Error('B never saw the dog bring it back');
  ok = !errors.length;
} catch (e) { console.error('FAIL', e.message); }
if (errors.length) console.error('page errors:', errors);
await browser.close();
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
