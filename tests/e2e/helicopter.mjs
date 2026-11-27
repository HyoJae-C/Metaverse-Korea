// End-to-end check: the operators' helicopter (game/helicopter.js). A (an
// operator) types /헬기; the helicopter flies in and lands next to A, and B
// sees the same helicopter at the same spot. A gets in, asks B aboard, flies
// up and across with B on the bench behind, lands, and both get out.
// /헬기보내기 sends it off.
// Run against the dev server, where everyone counts as an operator:
//   npx vite --port 5173 &
//   node tests/e2e/helicopter.mjs http://localhost:5173/ [shot dir]
import { chromium } from 'playwright';
import { useFakeRealtime } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:5173/';
const shotDir = process.argv[3] || null;
const launch = () => chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const browsers = [];
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function join(name) {
  const browser = await launch();
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: shotDir ? 2 : 1 });
  await useFakeRealtime(ctx, name);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', '');
  await page.type('#nickname', name);
  await page.click('#start-btn', { timeout: 120000 });
  await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  return page;
}
const craft = (page) => page.evaluate(() => {
  const h = window.__mk.heli(), c = h.loaded ? h.spots()[0] : null;
  return c ? { ...c, x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1), dust: +c.dust.toFixed(2) } : null;
});
// Set how long ago it was called (or sent away), so the test doesn't sit
// through the flight (and a slow software GL frame doesn't change the story).
const age = (page, s) => page.evaluate((s) => { window.__mk.heli().mine.t0 = Date.now() / 1000 - s; }, s);
const leftAgo = (page, s) => page.evaluate((s) => { const m = window.__mk.heli().mine; if (m) m.t1 = Date.now() / 1000 - s; }, s);
// Poll until f() is truthy (the software GL here runs the game several times slower than a clock).
const until = async (f, ms = 120000) => { for (const t0 = Date.now(); Date.now() - t0 < ms;) { const v = await f(); if (v) return v; await wait(400); } return null; };
const shot = async (page, name) => { if (shotDir) await page.screenshot({ path: `${shotDir}/${name}.png` }); };

let ok = false;
try {
  const a = await join('Pilot'), b = await join('Watcher');
  const at = await a.evaluate(() => window.__mk.outside());
  await b.evaluate(([x, z]) => window.__mk.place(x + 3, z - 4), [at.x, at.z]);
  await a.evaluate(() => window.__mk.cam({ pitch: 0.12, dist: 16 }));
  await b.evaluate(() => { window.__mk.heli().ready().then((h) => h.trustAll()); });
  await wait(1500);

  // The call.
  const mine = await a.evaluate(async () => { const h = window.__mk.heli(); await h.command('헬기'); return { ...h.mine }; });
  if (!mine?.t0) throw new Error('the call did nothing');
  const me = await a.evaluate(() => window.__mk.outside());
  const pad = Math.hypot(mine.x - me.x, mine.z - me.z);
  if (pad < 6 || pad > 21) throw new Error(`the spot is ${pad.toFixed(1)} m from the operator`);
  await a.evaluate(([x, z]) => { const p = window.__mk.sky().me.root; p.rotation.y = Math.atan2(x - p.position.x, z - p.position.z); }, [mine.x, mine.z]);
  await wait(800);
  const far = await craft(a);
  if (!far || far.y < 50 || Math.hypot(far.x - mine.x, far.z - mine.z) < 250) throw new Error('it should start far away, high up: ' + JSON.stringify(far));
  console.log(`called: the spot is ${pad.toFixed(1)} m from the operator; it starts ${Math.hypot(far.x - mine.x, far.z - mine.z).toFixed(0)} m out, ${far.y} m up`);
  await age(a, 14); await wait(1200); await shot(a, 'heli-1-coming');

  // B sees the same helicopter (the spot is in A's state).
  let seen = null;
  for (let i = 0; i < 40 && !seen; i++) { await wait(500); seen = await b.evaluate(() => { const h = window.__mk.heli(); if (!h.loaded || !h.count) return null; return true; }); }
  if (!seen) throw new Error('B does not see the helicopter');

  // Over the spot, coming down slowly, the dust blowing.
  await age(a, 29); await wait(1500);
  const down = await craft(a);
  if (Math.hypot(down.x - mine.x, down.z - mine.z) > 0.5 || down.y > 18 || down.y < 0.5) throw new Error('it should be over the spot, coming down: ' + JSON.stringify(down));
  await a.evaluate(() => window.__mk.cam({ pitch: 0.2, dist: 20 }));
  await wait(300); await shot(a, 'heli-2-landing');
  await age(a, 37); await wait(1500);
  const low = await craft(a);
  if (low.dust < 0.3) throw new Error('no dust under it: ' + JSON.stringify(low));
  await shot(a, 'heli-3-dust'); await shot(b, 'heli-3-dust-other-player');

  // Down, at the same place on both screens.
  await age(a, 60); await wait(3500);
  const landedA = await craft(a);
  const landedB = await craft(b);
  if (landedA.y > 0.05 + mine.y) throw new Error('not on the ground: ' + JSON.stringify(landedA));
  if (!landedB || Math.hypot(landedA.x - landedB.x, landedA.z - landedB.z) > 0.2) throw new Error(`B draws it somewhere else: ${JSON.stringify(landedA)} vs ${JSON.stringify(landedB)}`);
  console.log('landed at', landedA.x, landedA.z, '(B: the same spot)');
  await shot(a, 'heli-4-landed');

  // A gets in; B, standing next to it, is asked aboard and accepts.
  await a.evaluate(([x, z]) => window.__mk.place(x + 3, z), [landedA.x, landedA.z]);
  await b.evaluate(([x, z]) => window.__mk.place(x - 3.5, z - 1), [landedA.x, landedA.z]);
  await wait(1500);
  await a.evaluate(() => window.__mk.heli().board());
  if (!await a.evaluate(() => !!window.__mk.heli().crew)) throw new Error('the operator could not get in');
  if (!await until(() => a.evaluate(() => window.__mk.heli().crew.phase === 'fly'))) throw new Error('the blades never got up to speed');
  let crewedB = false;
  for (let i = 0; i < 30 && !crewedB; i++) { await wait(400); crewedB = await b.evaluate(() => window.__mk.heli().craft(window.__mk.heli().spots()[0]?.id)?.pose?.phase === 'crew'); }
  if (!crewedB) throw new Error('B does not see the operator in it');
  await a.evaluate(() => window.__mk.heli().ask());
  await b.waitForSelector('#heli-panel button', { timeout: 15000 });
  await shot(b, 'heli-5-asked-aboard');
  await b.click('#heli-panel button');
  let riders = [];
  for (let i = 0; i < 30 && !riders.length; i++) { await wait(400); riders = await a.evaluate(() => window.__mk.heli().riders); }
  if (riders.length !== 1) throw new Error('B did not get a seat: ' + JSON.stringify(riders));
  console.log('aboard: the operator flying, B on seat', riders[0][0]);

  // Up and across: B rides along, on the bench behind the pilot, on both screens.
  await a.keyboard.down('Space');
  await until(() => a.evaluate(() => window.__mk.heli().crew.pos.y > 12));
  await a.keyboard.up('Space');
  await a.keyboard.down('KeyW');
  await until(() => a.evaluate(([x, z]) => { const p = window.__mk.heli().crew.pos; return Math.hypot(p.x - x, p.z - z) > 25; }, [landedA.x, landedA.z]));
  await a.keyboard.up('KeyW');
  await wait(3000);
  const air = await craft(a);
  const moved = Math.hypot(air.x - landedA.x, air.z - landedA.z);
  if (air.y < 8 || moved < 10) throw new Error(`it should have flown up and across: ${air.y} m up, ${moved.toFixed(1)} m away`);
  const seatGap = async (page) => page.evaluate(() => {
    const h = window.__mk.heli(), me = window.__mk.sky().me.root.position, c = h.spots()[0];
    return c ? Math.hypot(me.x - c.x, me.y - c.y, me.z - c.z) : null;
  });
  const gapB = await seatGap(b);
  if (gapB == null || gapB > 2) throw new Error('B is not in the helicopter on their own screen: ' + gapB);
  const airB = await craft(b);
  if (Math.abs(airB.y - air.y) > 6) throw new Error(`B sees it at another height: ${airB.y} vs ${air.y}`);
  console.log(`flying: ${air.y} m up, ${moved.toFixed(0)} m from the spot; B rides along (${gapB.toFixed(1)} m from its middle)`);
  await a.evaluate(() => window.__mk.cam({ pitch: 0.1, dist: 14 }));
  await wait(400); await shot(a, 'heli-6-flying'); await shot(b, 'heli-6-flying-passenger');
  // A passenger can't jump out up there.
  await b.evaluate(() => window.__mk.heli().getOut());
  if (!await b.evaluate(() => !!window.__mk.heli().riding)) throw new Error('B got out in the air');

  // ⬇: it lands on clear ground and both are back on their feet.
  await a.evaluate(() => window.__mk.heli().land());
  if (!await until(() => a.evaluate(() => !window.__mk.heli().crew), 240000)) throw new Error('it did not land');
  if (!await until(() => b.evaluate(() => !window.__mk.heli().riding), 30000)) throw new Error('B is still aboard after the landing');
  const feet = await Promise.all([a, b].map((pg) => pg.evaluate(() => window.__mk.sky().me.root.position.y)));
  if (feet.some((y) => Math.abs(y) > 0.3)) throw new Error('someone is not back on the ground: ' + feet);
  if (!await a.evaluate(() => !!window.__mk.heli().mine)) throw new Error('the helicopter should stand where it landed');
  console.log('landed again: both out, on the ground');
  await wait(800); await shot(a, 'heli-7-landed-again');

  // Sent away.
  await a.evaluate(() => { window.__mk.heli().mine.t0 -= 200; });
  await a.evaluate(() => window.__mk.heli().command('헬기보내기'));
  await leftAgo(a, 8); await wait(1500);
  const up = await craft(a);
  if (!up || up.y < 3) throw new Error('it should be lifting off: ' + JSON.stringify(up));
  await shot(a, 'heli-8-leaving');
  await leftAgo(a, 40); await wait(1500);
  if (await a.evaluate(() => window.__mk.heli().count) !== 0) throw new Error('it should be gone');
  let left = false;
  for (let i = 0; i < 30 && !left; i++) { await wait(500); left = await b.evaluate(() => window.__mk.heli().count === 0); }
  if (!left) throw new Error('B still sees it');
  console.log('sent away: gone on both screens');
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
} catch (e) {
  console.error('FAIL', e.message);
} finally {
  for (const b of browsers) await b.close();
}
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
