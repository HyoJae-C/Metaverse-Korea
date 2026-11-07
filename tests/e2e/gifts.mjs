// End-to-end check: two players in the same shop; A buys a gift for B, B
// accepts it (it lands in B's bag), then B says no to a second one (A gets
// the coins back). Clothes go to the friend's items.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/gifts.mjs http://localhost:4173/
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

const a = await join('Gift A');
const b = await join('Gift B');
let ok = false;
try {
  for (const [shop, idx, check] of [['salam-halal', 1, 'bag'], ['denim-lab', 0, 'item']]) {
    await a.evaluate((id) => __mk.enter(id), shop);
    await b.evaluate((id) => __mk.enter(id), shop);
    await a.waitForFunction(() => __mk.near() === 1, null, { timeout: 20000 });
    await b.waitForFunction(() => __mk.near() === 1, null, { timeout: 20000 });
    const before = await a.evaluate(() => __mk.coins());
    const bagBefore = await b.evaluate(() => __mk.bagList().length);
    await a.evaluate((i) => __mk.product(i), idx);
    await a.waitForSelector('#product-gift:not([hidden])', { timeout: 5000 });
    await a.click('#product-gift');
    if (shotDir && check === 'bag') await a.screenshot({ path: shotDir + '/gift-picker.png' });
    await a.click('.gift-person');
    await b.waitForSelector('.gift-card', { timeout: 10000 });
    if (shotDir && check === 'bag') { await b.waitForTimeout(800); await b.screenshot({ path: shotDir + '/gift-card.png' }); }
    const paid = before - (await a.evaluate(() => __mk.coins()));
    if (paid <= 0) throw new Error('A did not pay');
    await b.click('.gift-card .primary');
    await a.waitForFunction(() => __mk.gifts().out === 0, null, { timeout: 10000 });
    if ((await a.evaluate(() => __mk.coins())) !== before - paid) throw new Error('A was refunded after an accept');
    if (check === 'bag' && (await b.evaluate(() => __mk.bagList().length)) !== bagBefore + 1) throw new Error('gift not in B\'s bag');
    if (check === 'item') {
      const res = await fetch(new URL('regions/seongsu/stores.json', url));
      const p0 = (await res.json()).stores.find((s) => s.id === 'denim-lab').products[idx];
      const itemId = p0.item || p0.outfit;
      if (!(await b.evaluate((x) => __mk.owns(x), itemId))) throw new Error('clothes not in B\'s items');
    }
    await a.evaluate(() => __mk.leave());
    await b.evaluate(() => __mk.leave());
    await a.waitForTimeout(1500);
  }
  // A last one, declined: A gets the coins back, and B isn't asked again
  // by A for a while (the next offer is turned down on its own).
  for (const page of [a, b]) await page.evaluate(() => __mk.enter('salam-halal'));
  await a.waitForFunction(() => __mk.near() === 1, null, { timeout: 20000 });
  const before = await a.evaluate(() => __mk.coins());
  const sendOne = async () => { await a.evaluate(() => __mk.product(2)); await a.click('#product-gift'); await a.click('.gift-person'); };
  await sendOne();
  await b.waitForSelector('.gift-card', { timeout: 10000 });
  await b.click('.gift-card .chip');
  await a.waitForFunction((m) => __mk.coins() === m, before, { timeout: 10000 });
  await sendOne();
  await a.waitForFunction((m) => __mk.gifts().out === 0 && __mk.coins() === m, before, { timeout: 10000 });
  if (await b.isVisible('.gift-card')) throw new Error('B was asked again right after saying no');
  ok = true;
} catch (e) {
  errors.push('assertion: ' + e.message);
  if (shotDir) { await a.screenshot({ path: shotDir + '/fail-a.png' }); await b.screenshot({ path: shotDir + '/fail-b.png' }); }
}
await browser.close();
for (const e of errors) console.log(e);
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
