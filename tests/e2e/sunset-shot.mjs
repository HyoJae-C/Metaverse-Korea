// Screenshots of the sunset from Mangwon Han River Park (for the before/after).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/sunset-shot.mjs http://localhost:4173/ <dir> [name] [hour]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || '.';
const NAME = process.argv[4] || 'sunset';
const HOURS = (process.argv[5] || '15,17.6,18.1').split(',').map(Number);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
for (const h of HOURS) {
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 600 } })).newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(url + '?debug&weather=clear&hour=' + h + '&room=e2esun' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Tester');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.evaluate(() => { __mk.snow(0); document.documentElement.classList.add('ui-hidden'); });
  await page.evaluate(() => __mk.goto(-3443, -192, 0));
  await page.waitForTimeout(2500);
  await page.evaluate(() => __mk.place(-3443, -192));
  for (const [tag, yaw, pitch, dist] of [['west', Number(process.env.YAW ?? 1.75), 0.12, 9]]) {
    await page.evaluate((o) => __mk.cam(o), { yaw, pitch, dist });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${S}/${NAME}-${tag}-${h}.png` });
  }
  await page.close();
}
console.log('errors', errors);
await browser.close();
