// End-to-end check: two players in the bank; A sends B 100 coins with a
// memo and B accepts, then B says no to a second one (A gets the coins and
// the fee back). Over the daily limit, or on a new account, Send stays off.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/bank.mjs http://localhost:4173/ [screenshot dir]
// With a build made with VITE_NET_PROVIDER=local, add --bridge (see gifts.mjs).
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

const a = await join('Bank A');
const b = await join('Bank B');
let ok = false;
try {
  const FEE = 5;
  for (const page of [a, b]) await page.evaluate(() => { __mk.bankAge(10); __mk.coins(500); __mk.enter('haetsal-bank'); });
  await a.waitForFunction(() => __mk.near() === 1, null, { timeout: 20000 });
  await b.waitForFunction(() => __mk.near() === 1, null, { timeout: 20000 });
  if (shotDir) { await a.waitForTimeout(1500); await a.screenshot({ path: shotDir + '/bank-inside.png' }); }
  // A sends 100 with a memo; B accepts.
  await a.evaluate(() => __mk.openBank());
  await a.waitForSelector('#bank-panel:not([hidden])');
  await a.fill('#bank-coins', '100');
  await a.click('.bank-memos .chip:nth-child(3)');
  await a.fill('#bank-coins', '100');
  if (shotDir) await a.screenshot({ path: shotDir + '/bank-send.png' });
  await a.click('#bank-send');
  await b.waitForSelector('.bank-card', { timeout: 10000 });
  if (shotDir) { await b.waitForTimeout(500); await b.screenshot({ path: shotDir + '/bank-card.png' }); }
  if ((await a.evaluate(() => __mk.coins())) !== 500 - 100 - FEE) throw new Error('A did not pay 100 + fee');
  await b.click('.bank-card .primary');
  await a.waitForFunction(() => !__mk.bank().out, null, { timeout: 10000 });
  if ((await b.evaluate(() => __mk.coins())) !== 600) throw new Error('B did not get 100');
  if ((await a.evaluate(() => __mk.coins())) !== 395) throw new Error('A was refunded after an accept');
  // A second one, declined: A gets the coins and the fee back.
  await a.evaluate(() => __mk.openBank());
  await a.fill('#bank-coins', '50');
  await a.click('#bank-send');
  await b.waitForSelector('.bank-card', { timeout: 10000 });
  await b.click('.bank-card .chip');
  await a.waitForFunction(() => __mk.coins() === 395, null, { timeout: 10000 });
  // Over the day's limit: the Send button stays off (300 a day, 100 already sent).
  await a.evaluate(() => __mk.openBank());
  await a.fill('#bank-coins', '201');
  if (!(await a.isDisabled('#bank-send'))) throw new Error('could send over the limit');
  // A new account can't send at all.
  await b.evaluate(() => { __mk.bankAge(0); __mk.openBank(); });
  if (!(await b.isDisabled('#bank-send'))) throw new Error('a new account could send');
  if (shotDir) await b.screenshot({ path: shotDir + '/bank-new.png' });
  ok = true;
} catch (e) {
  errors.push('assertion: ' + e.message);
  if (shotDir) { await a.screenshot({ path: shotDir + '/fail-a.png' }); await b.screenshot({ path: shotDir + '/fail-b.png' }); }
}
await browser.close();
for (const e of errors) console.log(e);
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
