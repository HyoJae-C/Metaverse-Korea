// End-to-end check: two separate browsers join the same room through the
// configured realtime provider and see each other.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/multiplayer.mjs http://localhost:4173/
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

async function join(name) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } }); // separate context: no shared tabs
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'warning' && errors.push(`${name}: ${m.text()}`));
  await page.goto(url);
  await page.click('#next-btn');
  await page.fill('#nickname', name);
  await page.click('#start-btn');
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  return page;
}

const a = await join('E2E-A');
const b = await join('E2E-B');
let ok = false;
try {
  await a.waitForFunction(() => document.querySelector('#online')?.textContent.includes('2'), null, { timeout: 20000 });
  await b.keyboard.down('KeyW');
  await b.waitForTimeout(1000);
  await b.keyboard.up('KeyW');
  await b.click('#emotes button >> nth=0');
  await a.waitForSelector('.bubble', { timeout: 5000 });
  ok = true;
} catch (e) {
  errors.push('assertion: ' + e.message);
}
await a.screenshot({ path: 'e2e-multiplayer.png' });
console.log(ok ? 'PASS: players see each other and emotes arrive' : 'FAIL');
if (errors.length) console.log(errors.join('\n'));
await browser.close();
process.exit(ok ? 0 : 1);
