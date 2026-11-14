// End-to-end check: NEON STRIKE at a free PC in the PC방. Sitting down gives
// the action, the menu opens, a match against bots starts, shots fly, the
// match ends with a scoreboard, and leaving gives the room back.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/strike.mjs http://localhost:4173/ [screenshot dir] [phone]
import { chromium, devices } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const phone = process.argv[4] === 'phone';
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext(phone ? { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } } : { viewport: { width: 1100, height: 680 } })).newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2estrike' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
const shot = async (n) => { if (S) await page.screenshot({ path: `${S}/${n}${phone ? '-phone' : ''}.png` }); };

await page.evaluate(() => __mk.enter('level-up-pc'));
await page.waitForTimeout(1500);
await page.evaluate(() => __mk.sitNear(0, 0, 'pc'));
await page.waitForTimeout(600);
const act = await page.evaluate(() => __mk.action());
assert(/NEON STRIKE/.test(act || ''), `PC action "${act}"`);
await page.evaluate(() => __mk.act());
await page.waitForSelector('#strike .sk-card', { timeout: 20000 });
await page.waitForTimeout(2500);
await shot('strike-menu');
assert((await page.locator('#strike .sk-card .sk-pick').nth(2).locator('button').count()) === 4, 'four guns to pick');
console.log('measure', JSON.stringify(await page.evaluate(() => __mk.strike().measure())));
if (process.env.MAP) await page.locator('#strike .sk-card .sk-pick').nth(0).locator('button').nth(1).click();
await page.click('#strike .sk-card .go');
await page.waitForFunction(() => __mk.strike()?.match?.phase === 'play', null, { timeout: 15000 });
const m0 = await page.evaluate(() => { const m = __mk.strike().match; return { n: m.players.length, bots: m.players.filter((p) => p.bot).length }; });
assert(m0.n === 8 && m0.bots === 7, '4 vs 4 with seven bots ' + JSON.stringify(m0));
await page.waitForTimeout(400);
await shot('strike-start');
// Hold the trigger: our bullets go and the magazine empties.
await page.evaluate(() => __mk.strike().trigger(true));
await page.waitForTimeout(700);
await shot('strike-fire');
await page.evaluate(() => __mk.strike().trigger(false));
const ammo = await page.evaluate(() => __mk.strike().match.byId('me').ammo);
assert(ammo < 30, 'shots fired, ammo ' + ammo);
// Let the bots play for a while: they walk and fight.
const before = await page.evaluate(() => __mk.strike().match.players.map((p) => [p.x, p.z]));
await page.waitForTimeout(12000);
const after = await page.evaluate(() => { const m = __mk.strike().match; return { pos: m.players.map((p) => [p.x, p.z]), score: m.score, left: m.left }; });
const moved = after.pos.filter((p, i) => Math.hypot(p[0] - before[i][0], p[1] - before[i][1]) > 2).length;
assert(moved >= 5, `bots walk (${moved} moved) score ${after.score} left ${after.left.toFixed(0)}`);
await shot('strike-mid');
// Look at a bot up close (for the picture).
await page.evaluate(() => { const m = __mk.strike().match, me = m.byId('me'), b = m.players.find((p) => p.team === 1); b.bot = false; b.x = me.x + Math.sin(me.yaw) * 3; b.z = me.z + Math.cos(me.yaw) * 3; b.yaw = me.yaw + Math.PI; b.vx = b.vz = 0; __mk.strike().aim(me.yaw, -0.05); });
await page.waitForTimeout(500);
await shot('strike-close');
// Time up: the result card.
await page.evaluate(() => { __mk.strike().match.left = 0.05; });
await page.waitForSelector('#strike .sk-card .sk-board', { timeout: 10000 });
await page.waitForTimeout(300);
await shot('strike-result');
assert(await page.evaluate(() => JSON.parse(localStorage.getItem('mk.strike')).played === 1), 'the record counts the match');
await page.click('#strike .sk-x');
await page.waitForTimeout(400);
assert(!(await page.$('#strike')), 'leaving closes the game');
assert(await page.evaluate(() => !document.documentElement.classList.contains('strike-on')), 'the room\'s own screen is back');
await shot('strike-after');
console.log('errors:', errors);
assert(!errors.length, 'no page errors');
await browser.close();
