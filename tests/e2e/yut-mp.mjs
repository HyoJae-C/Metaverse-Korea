// End-to-end check: yutnori with people in Namsangol's folk games yard
// (game/folk-yard.js, ui/yut-ui.js, core/yut-net.js). A opens the mat and
// invites B, who stands by it; B says yes on the card and waits; A starts.
// Both play their own turns (A also throws once with the hold-and-let-go
// gauge) and the locals' seat is played by A's browser; both boards stay the
// same to the end. Then B walks away from the mat and A's game goes on with
// a local in B's seat.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/yut-mp.mjs http://localhost:4173/ [screenshot dir]
// Realtime runs on a fake server in this script (fake-realtime.mjs).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime, summary, log as rtLog } from './fake-realtime.mjs';
import { propToWorld } from '../../src/data/folk-yard.js';

const url = process.argv[2] || 'http://localhost:4173/';
const bridge = false;
const shotDir = process.argv.slice(3).find((a) => !a.startsWith('--')) || null;
const pages = [];
const launch = () => chromium.launch({ executablePath: process.env.CHROME || process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const browsers = [];
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);
const errors = [];
const logs = [];
let step = 'joining';
const here = (f) => JSON.parse(readFileSync(new URL('../../public/regions/another-seoul/' + f, import.meta.url)));
const [OX, OZ] = here('region.json').districts.find((d) => d.id === 'euljiro').offset;
const lm = (type) => here('districts/euljiro.json').landmarks.find((l) => l.type === type);
const YARD = { x: OX + lm('folkyard').x, z: OZ + lm('folkyard').z }; // the yard in the district + its offset
const GATE = { x: OX + lm('hanokgate').x, z: OZ + lm('hanokgate').z };

async function join(name) {
  const browser = await launch();
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 640 } });
  if (!bridge) await useFakeRealtime(ctx, name);
  const page = await ctx.newPage();
  if (bridge) {
    await page.exposeFunction('__bcSend', (ch, data) => {
      for (const p of pages) if (p !== page) p.evaluate(([c, d]) => window.__bcDeliver?.(c, d), [ch, data]).catch(() => {});
    });
    await page.addInitScript(() => {
      const Real = window.BroadcastChannel, open = new Set();
      window.__bcDeliver = (c, d) => { for (const ch of open) if (ch.name === c && !ch.closed) ch._got({ data: d }); };
      window.BroadcastChannel = class extends EventTarget {
        constructor(name) { super(); this.name = name; this.real = new Real(name); this.real.onmessage = (e) => this._got(e); open.add(this); }
        _got(e) { this.onmessage?.(e); this.dispatchEvent(new MessageEvent('message', { data: e.data })); }
        postMessage(d) { this.real.postMessage(d); if (!this.name.includes('active-tab')) window.__bcSend(this.name, JSON.parse(JSON.stringify(d))); }
        close() { this.closed = true; open.delete(this); this.real.close(); }
      };
    });
  }
  pages.push(page);
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  // Warnings and errors are printed if the test fails (a realtime join that
  // timed out, a rate limit); with E2E_LOG=1, every console line as it comes.
  page.on('console', (m) => {
    const line = `${name} ${m.type()}: ${m.text().slice(0, 200)}`;
    if (process.env.E2E_LOG) console.log(line);
    else if (m.type() === 'error' || m.type() === 'warning') logs.push(line);
  });
  // Every toast the game shows (gift sent, nobody here, turned down...).
  await page.exposeFunction('__toastSeen', (t) => logs.push(`${name} toast: ${t}`));
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('toast');
    if (el) new MutationObserver(() => { if (!el.hidden && el.textContent) window.__toastSeen(el.textContent); }).observe(el, { childList: true, characterData: true, subtree: true, attributes: true });
  }));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', '');
  await page.type('#nickname', name);
  // Building the world blocks the page, so a plain click can time out
  // waiting for it to come back: press the button from inside the page on
  // the next tick and wait for the HUD, with room for a slow runner.
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible', timeout: 90000 });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.waitForFunction(() => window.__mk, null, { timeout: 60000 }); // (the test hooks come a moment after the HUD)
  return page;
}



const yut = (page, fn, arg) => page.evaluate(([f, a]) => new Function('u', 'a', 'return (' + f + ')(u, a)')(window.__folkYard.uis.yut, a), [fn.toString(), arg]);
const board = (page) => yut(page, (u) => (u.game ? JSON.stringify(u.game.snapshot()) : null));

const a = await join('Yut A');
const b = await join('Yut B');
let ok = false;
try {
  step = 'both into the yard, B by the mat';
  const stand = propToWorld(YARD, 'yut', [0, 1.9]);
  const side = propToWorld(YARD, 'yut', [2.6, 0.6]);
  for (const page of [a, b]) await page.evaluate(([x, z]) => { __mk.snow?.(0); __mk.goto(x, z, 0); }, [GATE.x, GATE.z + 6]);
  await a.waitForTimeout(1500);
  await a.evaluate(([x, z]) => __mk.place(x, z), stand);
  await b.evaluate(([x, z]) => __mk.place(x, z), side);
  await a.waitForFunction(() => [__mk.action(), ...(__mk.choices() || [])].some((l) => /Play yutnori/.test(l || '')), null, { timeout: 15000 });

  step = 'A opens the mat and invites B';
  await a.evaluate(() => { const i = (__mk.choices() || []).findIndex((l) => /Play yutnori/.test(l)); if (i >= 0) __mk.pick(i); else __mk.act(); });
  await a.waitForSelector('#yut-panel:not([hidden])', { timeout: 10000 });
  await a.waitForSelector('#yut-panel .yut-person button', { timeout: 20000 });
  await a.click('#yut-panel .folk-pick:nth-of-type(2) button:first-of-type').catch(() => {});
  await yut(a, (u) => { u.pieces = 2; u.speed = 5; });
  await a.click('#yut-panel .yut-person button');
  await b.waitForSelector('#yut-ask', { timeout: 15000 });
  if (shotDir) await b.screenshot({ path: shotDir + '/yut-ask.png' });
  await b.click('#yut-ask button:first-of-type');
  await b.waitForSelector('#yut-panel:not([hidden])', { timeout: 10000 });
  await b.waitForFunction(() => /Waiting for/.test(document.querySelector('#yut-panel')?.textContent || ''), null, { timeout: 10000 });
  await a.waitForFunction(() => /Playing ✓/.test(document.querySelector('#yut-panel')?.textContent || ''), null, { timeout: 15000 });
  if (shotDir) await a.screenshot({ path: shotDir + '/yut-lobby.png' });

  step = 'A starts with 3 players: A, B and a local';
  await yut(a, (u) => { u.players = 3; u.begin(); });
  await b.waitForFunction(() => window.__folkYard.uis.yut.game, null, { timeout: 10000 });
  await yut(b, (u) => { u.speed = 5; });
  const seats = await yut(a, (u) => u.seats.ids.slice());
  if (seats.length !== 3 || seats[2] !== '~') throw new Error('seats ' + seats);

  step = 'A throws with the gauge (hold, let go)';
  await a.waitForFunction(() => window.__folkYard.uis.yut.canThrow(), null, { timeout: 10000 });
  const btn = await a.locator('#yut-panel .yut-throw-btn').boundingBox();
  await a.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await a.mouse.down();
  await a.waitForTimeout(700);
  if (shotDir) await a.screenshot({ path: shotDir + '/yut-gauge.png' });
  await a.mouse.up();
  await a.waitForFunction(() => window.__folkYard.uis.yut.sticks, null, { timeout: 5000 });

  step = 'both play their turns to the end';
  const play = (u) => {
    const g = u.game;
    if (!g || g.phase === 'over' || u.anim) return g?.phase || 'none';
    if (u.canThrow()) { u.doThrow(4); return 'threw'; }
    if (u.mine(g.turn) && g.phase === 'move') { const o = g.options()[0]; if (o) u.pickDest(o); return 'moved'; }
    return 'wait';
  };
  let over = false, shot = false;
  for (let i = 0; i < 1200 && !over; i++) {
    await yut(a, play);
    await yut(b, play);
    if (shotDir && !shot && i === 30) { shot = true; await a.screenshot({ path: shotDir + '/yut-a.png' }); await b.screenshot({ path: shotDir + '/yut-b.png' }); }
    over = await yut(a, (u) => u.game?.phase === 'over') && await yut(b, (u) => u.game?.phase === 'over');
    await a.waitForTimeout(60);
  }
  if (!over) throw new Error('the game did not end: A ' + await board(a) + ' B ' + await board(b));
  const [ba, bb] = [await board(a), await board(b)];
  if (ba !== bb) throw new Error('boards differ:\nA ' + ba + '\nB ' + bb);
  console.log('winner seat', await yut(a, (u) => u.game.winner), 'status A:', await a.textContent('#yut-panel .yut-status'), '| B:', await b.textContent('#yut-panel .yut-status'));
  if (shotDir) { await a.screenshot({ path: shotDir + '/yut-over-a.png' }); await b.screenshot({ path: shotDir + '/yut-over-b.png' }); }

  step = 'A plays again; B walks away and a local takes the seat';
  await b.waitForFunction(() => window.__folkYard.uis.yut.busy, null, { timeout: 5000 });
  await a.click('#yut-panel .yut-actions .primary');
  await b.waitForFunction(() => window.__folkYard.uis.yut.seats, null, { timeout: 10000 });
  await b.evaluate(([x, z]) => __mk.place(x, z), [GATE.x, GATE.z + 6]);
  await b.waitForSelector('#yut-panel', { state: 'hidden', timeout: 10000 });
  await a.waitForFunction(() => window.__folkYard.uis.yut.seats?.ids[1] === '~', null, { timeout: 10000 });
  ok = true;
} catch (e) {
  console.error('FAIL at', step, e.message);
} finally {
  if (!ok || errors.length) { console.log(logs.slice(-40).join('\n')); console.log(rtLog.slice(-20).join('\n')); }
  console.log(summary());
  if (errors.length) console.error('page errors', errors);
  for (const br of browsers) await br.close();
  if (!ok || errors.length) process.exitCode = 1;
  else console.log('OK yutnori with people');
}
