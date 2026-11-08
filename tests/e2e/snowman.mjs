// End-to-end check: snowballs with two players on a snowy street. A's ball
// stops growing alone at the last step of stage 6; with B pushing too it
// becomes a giant (stage 7). Then B puts a smaller ball on it: a snowman.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/snowman.mjs http://localhost:4173/
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
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=snow&snow=1&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', '');
  await page.type('#nickname', name);
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  return page;
}

let ok = false;

const a = await join('Snow A');
const b = await join('Snow B');
const mk = (pg, f, x) => pg.evaluate(([f, x]) => window.__mk[f](x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function press(pg, want) { // wait for the button to show `want`, then press
  for (let i = 0; i < 40; i++) { const l = await mk(pg, 'action'); if (!want || (l && l.includes(want))) { const ch = await mk(pg, 'choices'); if (ch) await pg.evaluate((i) => window.__mk.pick(i), Math.max(0, ch.findIndex((c) => c.includes(want)))); else await mk(pg, 'act'); return l; } await wait(150); }
  throw new Error('no button ' + want + ' (has ' + await mk(pg, 'action') + ')');
}
try {
  const p0 = await mk(a, 'pose');
  const X = p0[1] - 6, Z = p0[2] + 6;
  await a.evaluate(([x, z]) => window.__mk.place(x, z), [X, Z]);
  await b.evaluate(([x, z]) => window.__mk.place(x + 8, z), [X, Z]);
  await wait(1500);
  await press(a, 'Make a snowball');
  await wait(800);
  await mk(a, 'snowSet', 119);
  await wait(800);
  console.log('A ball', await mk(a, 'snowballs'));
  await press(a, 'Roll');
  await wait(900);
  console.log('A alone at the gate', await mk(a, 'snowballs'));
  // B walks up to the far side of the ball
  const [k, bx, bz] = (await mk(a, 'snowballs')).split(',').map(Number);
  await b.evaluate(([x, z]) => window.__mk.place(x + 1.1, z), [bx, bz]);
  for (let i = 0; i < 30; i++) { const s = await mk(a, 'snowSeen'); if (s[0] && Math.abs(s[0][3] - (bx + 1.1)) < 0.3) break; await wait(300); }
  console.log('B sees', await mk(b, 'action'), JSON.stringify(await mk(b, 'snowSeen')), JSON.stringify(await mk(a, 'snowSeen')), JSON.stringify(await a.evaluate(() => globalThis.__sbdbg)));
  await Promise.all([press(b, 'Push with'), press(a, 'Roll')]);
  for (let i = 0; i < 3 && !/,12\d$/.test(await mk(a, 'snowballs')); i++) { await wait(500); await press(a, 'Roll'); }
  console.log('after first pair', await mk(a, 'snowballs'));
  await wait(1500);
  const after = await mk(a, 'snowballs');
  console.log('together', after, 'B pose', JSON.stringify(await mk(b, 'pose')), 'A pose', JSON.stringify(await mk(a, 'pose')));
  if (!/,12\d$/.test(after)) throw new Error('did not reach the giant stage together: ' + after);
  if (shotDir) await a.screenshot({ path: shotDir + '/sb-two.png' });
  // snowman: B makes a small ball away from the giant, then it's set next to it
  const [, gx, gz] = after.split(',').map(Number);
  await b.evaluate(() => window.__mk.place(18.4, 56.5));
  await wait(1500);
  console.log('B after place', JSON.stringify(await mk(b, 'pose')));
  console.log('B made', await press(b, 'Make a snowball'));
  await wait(800);
  await b.evaluate(([x, z]) => window.__mk.snowSet(90, x + 2.2, z), [gx, gz]);
  await b.evaluate(([x, z]) => window.__mk.place(x + 1.75, z + 0.6), [gx, gz]);
  await wait(1500);
  console.log('B choices', await mk(b, 'choices'));
  const ch = await mk(b, 'choices');
  const i = ch ? ch.findIndex((c) => c.includes('top')) : -1;
  if (i < 0) throw new Error('no snowman choice');
  for (let j = 0; j < 30; j++) { const s = await mk(a, 'snowSeen'); if (s[0] && Math.abs(s[0][3] - gx) < 3) break; await wait(300); }
  await b.evaluate((i) => window.__mk.pick(i), i);
  await wait(2000);
  const sm = await mk(a, 'snowballs');
  console.log('snowman', sm, 'B now', await mk(b, 'snowballs'));
  if (!/,90,/.test(sm)) throw new Error('no snowman');
  await wait(1500);
  if (shotDir) { await b.screenshot({ path: shotDir + '/sb-snowman.png' }); }
  ok = true;
} catch (e) { console.error(e.message); }
console.log(ok ? 'OK' : 'FAIL', errors);
await browser.close();
process.exit(ok ? 0 : 1);
