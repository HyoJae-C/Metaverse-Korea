// End-to-end check: Modu Ballpark's Kiss Cam with two players (and a third
// watching). The clock is moved to just before the Kiss Cam of the game on
// now. Alice and Bobby sit side by side; the scoreboard picks them, Alice asks
// for a cheek kiss, Bobby kisses back, and everyone sees it. Then the next
// game's Dance Cam picks someone and they dance.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/ballpark-cams.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime, summary } from './fake-realtime.mjs';
import { camsOf } from '../../src/core/ballpark-cams.js';
import { playGame, GAME_CYCLE } from '../../src/core/ballgame.js';

const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const ROOM = 'e2ebp' + Math.random().toString(36).slice(2, 8);
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const errors = [], browsers = [];
const launch = () => chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

// Every page's clock: 75 s before the Kiss Cam of a game a little ahead.
const k = Math.floor(Date.now() / 1000 / GAME_CYCLE) + 3;
const kiss = camsOf(playGame(k)).find((c) => c.kind === 'kiss');
const offset = k * GAME_CYCLE + kiss.t0 - 75 - Date.now() / 1000; // s
const started = Date.now();

async function join(name) {
  const browser = await launch();
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  await useFakeRealtime(ctx, name);
  await ctx.addInitScript((off) => { const real = Date.now.bind(Date); Date.now = () => real() + off * 1000; }, offset);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors.push(`${name}: ${e.message}`); console.log('pageerror', name, e.message); });
  page.on('dialog', (d) => d.accept());
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', name);
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible' });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.evaluate(() => __mk.enter('seoul-another-dome'));
  await page.waitForFunction(() => __mk.room().id === 'seoul-another-dome' && __mk.ballpark(), null, { timeout: 60000 });
  return page;
}
const shot = async (p, n) => { if (S) await p.screenshot({ path: `${S}/${n}.png` }); };
const until = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const bp = (p) => p.evaluate(() => __mk.ballpark());
import { writeFileSync } from 'node:fs';
const snap = async (p, n) => { if (!S) return; const d = await p.evaluate(() => __mk.ballparkSnap()); if (d) writeFileSync(`${S}/${n}.png`, Buffer.from(d.split(',')[1], 'base64')); };

const a = await join('Alice'), b = await join('Bobby'), c = await join('Carol');
try {
  // Two seats next to each other in the front row behind home plate.
  await a.evaluate(() => __mk.sit(0));
  await b.evaluate(() => __mk.sit(1));
  const [sa, sb] = [await a.evaluate(() => __mk.seatInfo()), await b.evaluate(() => __mk.seatInfo())];
  console.log('seats', sa?.seat, sb?.seat);
  assert(sa && sb && Math.hypot(sa.x - sb.x, sa.z - sb.z) < 1.25, 'Alice and Bobby sit side by side');
  await c.evaluate(() => { __mk.place(0, 53); __mk.cam({ dist: 4, pitch: 0.1, yaw: Math.PI }); }); // Carol looks at the scoreboard
  // Wait for the Kiss Cam.
  const left = 75 - (Date.now() - started) / 1000;
  console.log('Kiss Cam in', left.toFixed(0), 's');
  assert(await until(a, () => __mk.ballpark()?.show?.kind === 'kiss', null, (left + 30) * 1000), 'the Kiss Cam comes on');
  await a.waitForTimeout(1500);
  const sA = await bp(a), sB = await bp(b), sC = await bp(c);
  console.log('on screen', sA.show.ids, sB.show.ids, sC.show.ids);
  assert(sA.show.ids?.length === 2 && sA.show.ids.join() === sB.show.ids?.join() && sA.show.ids.join() === sC.show.ids?.join(), 'all three screens show the same pair');
  const label = await a.evaluate(() => __mk.choices()?.[0] || __mk.action());
  console.log('Alice sees:', label, await a.evaluate(() => __mk.choices()));
  assert(/Bobby/.test(label || '') && /💋/.test(label), 'Alice can kiss Bobby on the cheek');
  await shot(c, 'kiss-cam-on');
  await snap(c, 'screen-on');
  await a.evaluate(() => __mk.pick(0));
  assert(await until(b, () => /💋/.test(__mk.choices()?.[0] || __mk.action() || ''), null, 8000), 'Bobby is asked');
  console.log('Bobby sees:', await b.evaluate(() => __mk.choices()));
  await b.evaluate(() => __mk.pick(0));
  for (const [p, n] of [[a, 'Alice'], [b, 'Bobby'], [c, 'Carol']]) assert(await until(p, () => __mk.ballpark()?.show?.settled, null, 8000), `${n} sees the kiss`);
  assert((await bp(c)).show?.note.includes('KISS'), 'the screen says KISS');
  await c.waitForTimeout(500);
  await snap(c, 'screen-kiss-a');
  await c.waitForTimeout(700);
  await snap(c, 'screen-kiss-b');
  await c.evaluate(() => { const cv = document.querySelector('canvas'); document.querySelectorAll('body *').forEach((e) => { if (e !== cv && !e.contains(cv)) e.style.visibility = 'hidden'; }); __mk.place(0, 53.5); __mk.cam({ dist: 1.2, pitch: -0.35, yaw: 0 }); });
  await c.waitForTimeout(500);
  await shot(c, 'kiss-cam-kiss');
  await c.evaluate(() => __mk.cam({ dist: 1.2, pitch: -0.35, yaw: Math.PI }));
  await c.waitForTimeout(300);
  await shot(c, 'kiss-cam-kiss2');
  await shot(a, 'kiss-cam-alice');
  // After the Kiss Cam: the screens go back to the scoreboard.
  assert(await until(c, () => !__mk.ballpark()?.show, null, 30000), 'the Kiss Cam ends');
  assert(!errors.length, 'no page errors');
} finally {
  console.log('errors', errors, summary());
  for (const br of browsers) await br.close();
}
