// End-to-end check: Mokdong Ice Rink. The hall loads near its place on the
// street, you go in at its door, step through a gate onto the ice (skates
// on), glide, jump and type a triple and a backflip in the air, land, and
// fall when a quad is still turning at the ice.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/ice-rink.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const store = JSON.parse(readFileSync(new URL('stores.json', R))).stores.find((s) => s.id === 'mokdong-ice-rink');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 }, deviceScaleFactor: S ? 2 : 1 });
await useFakeRealtime(ctx, 'icerink');
if (process.env.DAY) await ctx.addInitScript(() => {
  const CYC = 180 * 60000, now = Date.now(), off = Math.floor(now / CYC) * CYC + 55 * 60000 - now, RD = Date;
  class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }
  window.Date = FD;
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2eice' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.addStyleTag({ content: '#notice-pin,.info-hint,#info-hint,#keys-panel{display:none!important}' });
const shot = async (name) => { if (S) await page.screenshot({ path: `${S}/${name}.png` }); };
const wait = (ms) => page.waitForTimeout(ms);

// The street: in front of the door, the hall drawn.
const [dx, dz] = store.at;
await page.evaluate(([x, z]) => __mk.goto(x + 3, z + 9, 0), [dx, dz]);
await wait(4000);
assert(await page.evaluate(() => !!__mk.mokdong?.group), 'the rink and the stadiums loaded near');
await page.evaluate(() => __mk.cam({ yaw: 0.3, pitch: 0.2, dist: 16 }));
await wait(1500);
await shot('1-outside-door');
await page.evaluate(([x, z]) => __mk.goto(x + 40, z + 14, 0), [dx, dz]);
await page.evaluate(() => __mk.cam({ yaw: 1.0, pitch: 0.42, dist: 60 }));
await wait(1500);
await shot('2-outside-complex');
console.log('street render', JSON.stringify(await page.evaluate(() => __mk.renderInfo?.())));

// Inside.
await page.evaluate(() => __mk.enter('mokdong-ice-rink'));
await page.waitForFunction(() => __mk.room().id === 'mokdong-ice-rink', null, { timeout: 30000 });
await wait(1500);
await page.waitForFunction(() => __mk.iceRink.loaded, null, { timeout: 20000 });
await page.evaluate(() => __mk.cam({ yaw: 0, pitch: 0.3, dist: 9 }));
await wait(800);
await shot('3-lobby');
assert(!(await page.evaluate(() => __mk.iceRink.skating)), 'in the lobby: on foot');

// Through the east gate onto the ice.
await page.evaluate(() => __mk.place(9, 12.5));
await wait(300);
await page.keyboard.down('KeyW');
await wait(1600);
assert(await page.evaluate(() => __mk.iceRink.skating), 'through the gate: skating');
await wait(1800);
const fast = await page.evaluate(() => __mk.iceRink.debug());
assert(fast.speed > 4, `gliding at ${fast.speed} m/s`);
await page.keyboard.up('KeyW');
await wait(400);
assert((await page.evaluate(() => __mk.iceRink.debug().speed)) > 3, 'still gliding with no push');
await wait(500);
const gl = await page.evaluate(() => __mk.iceRink.debug());
assert(gl.glide === 'g1' || gl.glide === 'g2', `coasting: the arms open (${gl.glide}, coast ${gl.coast}, speed ${gl.speed})`);
await shot('4-on-the-ice');
// The commands: a list on the left while you skate, closed and opened by its button.
const cmd = () => page.evaluate(() => { const c = document.getElementById('ice-cmd'); return { shown: !c.hidden, open: !c.lastChild.hidden, cells: c.lastChild.children.length }; });
let c = await cmd();
assert(c.shown && c.open && c.cells === 24, `the command list is open on the ice: ${JSON.stringify(c)}`);
await page.click('#ice-cmd button');
assert(!(await cmd()).open, 'its button closes it');
await page.click('#ice-cmd button');
assert((await cmd()).open, 'and opens it again');
assert(/⛸/.test(await page.evaluate(() => __mk.action() || '')), 'the action button is Jump');

// A jump with a triple: Space, then ← → ← in the air.
const speedUp = async () => { await page.evaluate(() => { const s = __mk.iceRink.skater; s.vx = -8; s.vz = 0; __mk.place(14, -2); }); await wait(120); };
await speedUp();
await page.keyboard.press('Space');
await wait(60);
for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowLeft']) { await page.keyboard.press(k); await wait(30); }
const air = await page.evaluate(() => __mk.iceRink.debug());
assert(air.air && air.tricks.join() === 'L3', `in the air doing ${air.tricks} (code ${air.code})`);
await wait(350);
await shot('5-triple');
await page.waitForFunction(() => !__mk.iceRink.debug().air, null, { timeout: 4000 });
const after = await page.evaluate(() => __mk.iceRink.debug());
assert(after.down === 0 && after.saved?.pts >= 700 && after.chain === 1, `landed the triple: ${JSON.stringify(after.saved)}`);

// Straight on: a backflip, called at the landing (the combo holds).
await speedUp();
await page.keyboard.press('Space');
await wait(50);
await page.keyboard.press('ArrowDown'); await wait(30); await page.keyboard.press('ArrowUp');
await wait(250);
await shot('6-backflip');
await page.evaluate(() => new Promise((done) => { // Jump again just before the ice (checked every frame)
  const sk = __mk.iceRink.skater;
  const look = () => { if (!sk.air) return done(); if (sk.vy < 0 && sk.y < 0.7 && sk.pressedAt < 0) __mk.act(); requestAnimationFrame(look); };
  look();
}));
const second = await page.evaluate(() => __mk.iceRink.debug());
assert(second.chain === 2 && second.saved.pts > after.saved.pts + 600, `backflip landed in a combo: chain ${second.chain}, ${JSON.stringify(second.saved)}`);

// A quad from a standstill is still turning at the ice: a fall.
await page.evaluate(() => { const s = __mk.iceRink.skater; s.vx = 0; s.vz = 0; });
await wait(100);
await page.keyboard.press('Space');
await wait(400);
for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowRight', 'ArrowLeft']) { await page.keyboard.press(k); await wait(20); }
await page.waitForFunction(() => __mk.iceRink.debug().down > 0, null, { timeout: 4000 });
assert(true, 'a late quad from a standstill falls');
await shot('7-fall');
await wait(1500);
assert((await page.evaluate(() => __mk.iceRink.debug().chain)) === 0, 'the combo is gone after a fall');

// The whole rink from above, and what it costs to draw.
await page.evaluate(() => { __mk.place(0, 4); __mk.cam({ yaw: 0, pitch: 0.5, dist: 30 }); });
await wait(1500);
await shot('8-rink');
const info = await page.evaluate(() => __mk.renderInfo?.());
console.log('room render', JSON.stringify(info));

// Off the ice by the gate: on foot again; and out of the door.
await page.evaluate(() => __mk.place(9, 13));
await wait(400);
assert(!(await page.evaluate(() => __mk.iceRink.skating)), 'off the ice: on foot');
await page.evaluate(() => __mk.leave());
await wait(1500);
assert((await page.evaluate(() => __mk.room().mode)) === 'street', 'back on the street');
assert(!errors.length, `no page errors ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
