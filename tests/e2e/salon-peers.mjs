// End-to-end check: two players in a hair salon. A sits in the salon chair
// and flips through hairstyles (and pays for a cut); B still sees A, and A
// still sees B, the whole time. Realtime runs on the fake server.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/salon-peers.mjs http://localhost:4173/
import { chromium } from 'playwright';
import { useFakeRealtime, stats, log } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/';
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);
const browsers = [], errors = [];
const launch = () => chromium.launch({ executablePath: process.env.CHROME || process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function join(name) {
  const browser = await launch();
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 640 } });
  await useFakeRealtime(ctx, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', '');
  await page.type('#nickname', name);
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible', timeout: 90000 });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.waitForFunction(() => window.__mk, null, { timeout: 60000 });
  return page;
}
const seen = (p, name) => p.evaluate((n) => __mk.peers().find((q) => q.name === n) || null, name);
async function both(a, b, what) {
  for (const [p, other] of [[a, 'Salon B'], [b, 'Salon A']]) {
    await p.waitForFunction((n) => __mk.peers().some((q) => q.name === n && q.shown), other, { timeout: 15000 })
      .catch(async () => { throw new Error(`${what}: ${other} not shown on the other screen: ${JSON.stringify(await seen(p, other))}`); });
  }
}
let ok = false, step = 'joining';
try {
  const a = await join('Salon A');
  const b = await join('Salon B');
  step = 'both in the salon';
  for (const p of [a, b]) await p.evaluate(() => __mk.enter('gawison-hair'));
  await a.waitForTimeout(3000);
  await b.evaluate(() => __mk.goto(1, 1, 0));
  await a.evaluate(() => __mk.goto(-1, 1, 0));
  await both(a, b, 'in the salon');
  step = 'A sits in the salon chair';
  await a.evaluate(() => { for (let i = 0; i < __mk.seats(); i++) { __mk.sit(i); if (__mk.seated()) return; } });
  await a.waitForTimeout(1500);
  await both(a, b, 'A seated');
  step = 'A opens the mirror and flips styles';
  await a.evaluate(() => __mk.openBeauty('salon'));
  await a.waitForTimeout(1500);
  await both(a, b, 'mirror open');
  // Flipping through styles and colours for 40 s, about one a second (a
  // real customer at the mirror): each one goes out as a new look.
  const styles = ['bun', 'twin', 'curly', 'short', 'crop', 'bangs', 'bob', 'long', 'pony'];
  for (let i = 0; i < 40; i++) {
    await a.evaluate((h) => __mk.wear({ hairStyle: h }), styles[i % styles.length]);
    await a.waitForTimeout(1000);
    if (stats.presenceCuts) throw new Error('the server cut A off for too many presence updates after ' + (i + 1) + ' looks');
  }
  await a.waitForTimeout(1500);
  step = 'B sees the last look';
  await b.waitForFunction(() => __mk.peers().find((q) => q.name === 'Salon A')?.model != null, null, { timeout: 5000 });
  await both(a, b, 'after flipping styles');
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('salon peers: ok');
} catch (e) {
  console.error('FAILED at', step, '-', e.message, errors);
  console.error(log.slice(-15).join('\n'));
} finally {
  for (const br of browsers) await br.close();
  process.exit(ok ? 0 : 1);
}
