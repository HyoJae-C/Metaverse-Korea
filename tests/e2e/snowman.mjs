// End-to-end check: snowballs with two players on a snowy street. A grabs
// a ball and walks it along: it grows, and stops alone at the last step of
// stage 6; with B holding on too it becomes a giant (stage 7). Then B puts a
// smaller ball on it (a snowman) and their own hat on that.
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
  for (let i = 0; i < 40; i++) { const l = await mk(pg, 'action'); if (!want || (l && l.includes(want)) || (await mk(pg, 'choices'))?.some((c) => c.includes(want))) { const ch = await mk(pg, 'choices'); if (ch) await pg.evaluate((i) => window.__mk.pick(i), Math.max(0, ch.findIndex((c) => c.includes(want)))); else await mk(pg, 'act'); return l; } await wait(150); }
  throw new Error('no button ' + want + ' (has ' + await mk(pg, 'action') + ')');
}
try {
  const p0 = await mk(a, 'pose');
  const X = p0[1] - 6, Z = p0[2] + 6;
  await a.evaluate(([x, z]) => window.__mk.place(x, z), [X, Z]);
  await b.evaluate(([x, z]) => window.__mk.place(x + 8, z), [X, Z]);
  await wait(1500);
  await press(a, 'Make a snowball');
  await wait(300);
  for (let i = 0; i < 4; i++) { // mashing E: one button, no list of choices popping up
    await press(a, 'Gather snow'); await wait(150);
    if (await mk(a, 'choices')) throw new Error('choices while gathering: ' + await mk(a, 'choices'));
  }
  console.log('gathered', await mk(a, 'snowballs'));
  await wait(800);
  await mk(a, 'snowSet', 120);
  await wait(800);
  const ball0 = await mk(a, 'snowballs');
  console.log('A ball', ball0);
  // grab it once and walk: it rolls along in front and grows
  await press(a, 'Grab and roll');
  await wait(300);
  if (await mk(a, 'snowHold') == null) throw new Error('not holding');
  await a.keyboard.down('KeyW'); await wait(3000); await a.keyboard.up('KeyW');
  await wait(300);
  const ball1 = await mk(a, 'snowballs');
  console.log('A walked it', ball1, JSON.stringify(await mk(a, 'pose')));
  const n = (s) => Number(s.split(',')[3]);
  if (!(n(ball1) > n(ball0))) throw new Error('did not grow walking: ' + ball1);
  // alone, it stops at the last step before giant
  await mk(a, 'snowSet', 139);
  await a.keyboard.down('KeyW'); await wait(1200); await a.keyboard.up('KeyW');
  await wait(300);
  const alone = await mk(a, 'snowballs');
  console.log('A alone at the gate', alone);
  if (n(alone) !== 139) throw new Error('grew past the gate alone: ' + alone);
  // B walks up beside the ball and holds on too
  const [, bx, bz] = alone.split(',').map(Number);
  await b.evaluate(([x, z]) => window.__mk.place(x + 1.2, z), [bx, bz]);
  for (let i = 0; i < 30; i++) { const s = await mk(a, 'snowSeen'); if (s[0] && Math.abs(s[0][3] - (bx + 1.2)) < 0.3) break; await wait(300); }
  await press(b, 'Roll it with');
  await wait(800);
  console.log('B holds', await mk(b, 'snowHold'), JSON.stringify(await mk(b, 'pose')));
  const bp0 = await mk(b, 'pose');
  await a.keyboard.down('KeyW'); await wait(3000); await a.keyboard.up('KeyW');
  await wait(1500);
  const after = await mk(a, 'snowballs');
  const bp1 = await mk(b, 'pose');
  console.log('together', after, 'B pose', JSON.stringify(bp1), 'A pose', JSON.stringify(await mk(a, 'pose')));
  if (!/,1[4-6]\d$/.test(after)) throw new Error('did not reach the giant stage together: ' + after);
  if (Math.hypot(bp1[1] - bp0[1], bp1[2] - bp0[2]) < 0.15) throw new Error('B did not come along');
  if (shotDir) await a.screenshot({ path: shotDir + '/sb-two.png' });
  await press(a, 'Let go');
  for (let i = 0; i < 30 && await mk(b, 'snowHold') != null; i++) await wait(300); // (B lets go once they see A has)
  if (await mk(a, 'snowHold') != null || await mk(b, 'snowHold') != null) throw new Error('still holding: ' + await mk(a, 'snowHold') + ' ' + await mk(b, 'snowHold') + ' ' + JSON.stringify(await b.evaluate(() => [...window.__mk.snowSeen()])));
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
  // B puts their hat on it
  console.log('B wears', await b.evaluate(() => window.__mk.wear({ head: 'bucket', hatColor: 'mint' })));
  await wait(500);
  await press(b, 'hat on the snowman');
  await wait(2000);
  const hat = await mk(a, 'snowballs');
  console.log('hat', hat);
  if (!/,bucket~mint/.test(hat)) throw new Error('no hat on the snowman');
  // B takes out the snow duck maker and stamps out two ducks; A sees them
  await b.evaluate(() => window.__mk.place(18.4, 52.5));
  await wait(1200);
  console.log('B bag', await mk(b, 'bagKinds'));
  if (!(await mk(b, 'bagKinds')).includes('duckmold')) throw new Error('no duck maker in the bag');
  if ((await mk(b, 'choices'))?.some((c) => c.includes('duck'))) throw new Error('duck maker offered as a choice');
  await b.evaluate(() => window.__mk.holdFromBag('duckmold'));
  await wait(400);
  console.log('B holds', await mk(b, 'heldNow'));
  if (await mk(b, 'heldNow') !== 'duckmold') throw new Error('no duck maker in hand');
  await press(b, 'Make a snow duck'); await wait(1000);
  await b.evaluate(() => window.__mk.place(19.4, 52.5)); await wait(600);
  await press(b, 'Make a snow duck'); await wait(1500);
  const ducks = await mk(b, 'ducks');
  console.log('ducks', ducks);
  if (!ducks || ducks.split(';').length !== 2) throw new Error('no ducks');
  let seen = null;
  for (let i = 0; i < 20 && seen !== ducks; i++) { seen = (await a.evaluate(() => [...window.__mk.snowSeenDucks?.() ?? []])).find(Boolean); await wait(300); }
  console.log('A sees ducks', seen);
  if (seen !== ducks) throw new Error('A does not see the ducks');
  if (shotDir) { await b.evaluate(() => window.__mk.place(19, 51.3)); await wait(1500); await b.screenshot({ path: shotDir + '/sb-ducks.png' }); }
  await b.evaluate(() => document.getElementById('stow-btn').click()); // back in the bag
  await wait(400);
  if (await mk(b, 'heldNow') === 'duckmold') throw new Error('duck maker still out');
  if (!(await mk(b, 'bagKinds')).includes('duckmold')) throw new Error('duck maker not back in the bag');
  await wait(1500);
  if (shotDir) { await b.screenshot({ path: shotDir + '/sb-snowman.png' }); }
  ok = true;
} catch (e) { console.error(e.message); }
console.log(ok ? 'OK' : 'FAIL', errors);
await browser.close();
process.exit(ok ? 0 : 1);
