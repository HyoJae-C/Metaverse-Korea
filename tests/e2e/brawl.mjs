// End-to-end check: the fighting game cabinets in the arcade.
// The cabinet's action opens Rooftop Rumble; a match starts, the buttons
// hit, and leaving gives the room back.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/brawl.mjs http://localhost:4173/ [screenshot dir] [phone]
import { chromium, devices } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const phone = process.argv[4] === 'phone';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1100, height: 680 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2ebrawl' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (n) => { if (S) await page.screenshot({ path: `${S}/${n}${phone ? '-phone' : ''}.png` }); };

await page.evaluate(() => __mk.enter('punch-arcade'));
await page.waitForTimeout(1500);
const st = { x: -9.3, z: 1.6 }; // in front of a cabinet by the left wall (core/activity-rooms.js arcade)
await page.evaluate(([x, z]) => __mk.place(x, z), [st.x, st.z]);
await page.waitForTimeout(500);
await shot('brawl-room');
const act = await page.evaluate(() => __mk.action());
assert(/Rooftop Rumble/.test(act || ''), `cabinet action "${act}"`);
await page.evaluate(() => __mk.act());
await page.waitForSelector('#brawl .bw-card', { timeout: 20000 });
await page.waitForTimeout(2500);
await shot('brawl-menu');
await page.click('#brawl .bw-card .go');
await page.waitForFunction(() => __mk.brawl()?.match?.phase === 'fight', null, { timeout: 15000 });
await shot('brawl-fight');
// Walk in and hit: the rival's bar goes down.
if (phone) {
  for (let k = 0; k < 40; k++) { await page.locator('#brawl .bw-btns button').nth(k % 4).dispatchEvent('pointerdown'); await page.waitForTimeout(120); }
} else {
  await page.keyboard.down('KeyD');
  for (let k = 0; k < 40; k++) { await page.keyboard.press(['KeyU', 'KeyI', 'KeyJ', 'KeyK'][k % 4]); await page.waitForTimeout(110); if (k === 8) await shot('brawl-hit'); }
  await page.keyboard.up('KeyD');
}
await shot('brawl-mid');
const hp = await page.evaluate(() => { const m = __mk.brawl().match; return m ? [m.a.hp, m.b.hp, m.wins] : null; });
console.log('hp', JSON.stringify(hp));
assert(!hp || hp[1] < 100 || hp[2][0] > 0, 'our hits land on the rival');
// Two quick rounds (the rival left with one point of health): the result
// card, and the next rival on the ladder.
for (let r = 0; r < 2; r++) {
  await page.waitForFunction(() => __mk.brawl()?.match?.phase === 'fight', null, { timeout: 20000 });
  await page.evaluate(() => { const m = __mk.brawl().match; m.b.hp = 1; m.b.x = m.a.x + 0.8; m.b.z = m.a.z; });
  for (let k = 0; k < 60 && await page.evaluate(() => __mk.brawl()?.match?.phase === 'fight'); k++) {
    if (phone) await page.locator('#brawl .bw-btns button').nth(0).dispatchEvent('pointerdown'); else await page.keyboard.press('KeyU');
    await page.waitForTimeout(100);
  }
  if (r === 0) { await page.waitForTimeout(700); await shot('brawl-ko'); }
}
await page.waitForSelector('#brawl .bw-card', { timeout: 20000 });
await shot('brawl-won');
assert(/Dalgona Kid/.test(await page.textContent('#brawl .bw-card .big')), 'the result card names the rival we beat');
assert(await page.evaluate(() => JSON.parse(localStorage.getItem('mk.brawl')).stage === 1), 'the ladder moved up');
await page.click('#brawl .bw-card .go');
await page.waitForFunction(() => __mk.brawl()?.match?.phase === 'intro');
assert(/Mina/.test(await page.textContent('#brawl .bw-side.r .bw-name span')), 'the next rival steps in');
await page.waitForTimeout(1200);
await shot('brawl-next');
await page.click('#brawl .bw-x');
await page.waitForTimeout(400);
assert(!(await page.$('#brawl')), 'leaving closes the game');
assert(await page.evaluate(() => !document.documentElement.classList.contains('brawl-on')), 'the room\'s own screen is back');
await shot('brawl-after');
console.log('errors:', errors);
assert(!errors.length, 'no page errors');
await browser.close();
