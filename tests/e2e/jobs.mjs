// End-to-end check: jobs (직업). At an Information Center the game guide
// opens the job picker; pick the convenience store; at a convenience store
// the shift panel shows "My job · Lv 1" and no five-a-day limit.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/jobs.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await (await browser.newContext({ viewport: { width: 900, height: 640 } })).newPage();
page.on('pageerror', (e) => errors.push(e.message));
const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 15000, what = '') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await f(); if (v) return v; await wait(100); } throw new Error('timed out ' + what + ' ' + await mk('action')); };
const nearClerk = async () => { const c = await until(() => mk('clerk'), 15000, 'clerk'); await mk('place', c[0], c[1] + 1.2); };
let ok = false;
try {
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2e' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Worker');
  await page.click('#start-btn', { timeout: 90000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');

  await mk('enter', 'info-center');
  await nearClerk();
  await until(async () => String(await mk('action')).includes('🎮'), 15000, 'game guide');
  await mk('act');
  await page.waitForSelector('#info-panel:not([hidden]) .info-row button', { timeout: 15000 });
  await page.locator('#info-panel .info-row').first().locator('button').click();
  await until(() => page.locator('#info-panel h3').innerText().then((s) => s.includes('💼')), 15000, 'job picker');
  if (shotDir) await page.screenshot({ path: `${shotDir}/picker.png` });
  const rows = page.locator('#info-panel .info-row');
  if (await rows.count() !== 3) throw new Error('jobs: ' + await rows.count());
  await rows.nth(1).locator('button').click(); // the convenience store
  await until(() => rows.nth(1).innerText().then((s) => /my job/i.test(s)), 10000, 'mart is my job');
  console.log('picked:', (await rows.nth(1).innerText()).replace(/\n/g, ' | '));
  if (shotDir) await page.screenshot({ path: `${shotDir}/picked.png` });
  if (await rows.nth(2).locator('button').count()) throw new Error('can change again right away');
  await page.click('#info-panel .sheet-x');

  await mk('enter', 'soda24-mart');
  await nearClerk();
  await until(async () => String(await mk('action')).includes('💼') || String(await mk('action')).includes('Part-time'), 15000, 'job action');
  await mk('act');
  await page.waitForSelector('#job-panel:not([hidden])', { timeout: 15000 });
  const txt = await page.locator('#job-panel').innerText();
  console.log('shift panel:', txt.replace(/\n/g, ' | '));
  if (!/My job · Lv 1 · bonus \+20%/.test(txt)) throw new Error('no job status');
  if (/Shifts left/i.test(txt)) throw new Error('still shows a daily limit');
  if (shotDir) await page.screenshot({ path: `${shotDir}/mart.png` });
  await page.click('#job-panel .sheet-x');

  // The new delivery shops (Yeonnam, by Bukchon) hire riders; the first starts a run
  // (one run at a time, so the second only shows the job).
  for (const id of ['wolhwa-banjeom', 'seongsu-mandu']) {
    await mk('enter', id);
    await nearClerk();
    await until(async () => /Delivery rider/i.test(String(await mk('action'))), 15000, 'delivery action at ' + id);
    if (id !== 'wolhwa-banjeom') continue;
    await mk('act');
    await until(() => page.isVisible('#delivery-chip'), 15000, 'delivery started at ' + id);
    console.log(id, 'delivery:', await page.locator('#delivery-chip').innerText());
  }
  if (errors.length) throw new Error('page errors: ' + errors.join(' / '));
  ok = true;
  console.log('ok');
} catch (e) {
  console.error('FAIL', e.message, errors);
} finally {
  await browser.close();
  process.exit(ok ? 0 : 1);
}
