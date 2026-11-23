// End-to-end check: the board game café (game/board-games.js). A opens the
// panel at a free table and puts a stone down against the computer, and rolls
// a few dice at Snakes & Ladders; then A
// invites B to Croc Teeth, B says yes on the card, they take turns until the
// croc snaps (a line of chat typed in the game card reaches the other
// player), and both screens show the same teeth pressed and the same result. B walking out closes B's panel.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/board-games.mjs http://localhost:4173/ [screenshot dir]
// Realtime runs on a fake server in this script (fake-realtime.mjs).
import { chromium } from 'playwright';
import { useFakeRealtime, summary, log as rtLog } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/';
const bridge = process.argv.includes('--bridge');
const shotDir = process.argv.slice(3).find((a) => !a.startsWith('--')) || null;
const pages = [];
// Each player gets a browser of their own (as in multiplayer.mjs): two
// contexts in one browser share its GPU process, and with software GL the
// second player's start-up queued behind the first one's frames until the
// HUD wait timed out on CI (from 2026-11-13, as the city grew).
const launch = () => chromium.launch({ executablePath: process.env.CHROME || process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const browsers = [];
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);
const errors = [];
const logs = [];
let step = 'joining';

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


// Press the room's "Board games" button. The button is worked out once a
// frame, so right after the panel closes it may still be the one from while
// it was open (Sit down, a high five): wait until ours is back.
async function openPanel(page) {
  const has = () => [__mk.action(), ...(__mk.choices() || [])].some((l) => /Board games/.test(l || ''));
  await page.waitForFunction(has, null, { timeout: 15000 });
  await page.evaluate(() => { const i = (__mk.choices() || []).findIndex((l) => /Board games/.test(l)); if (i >= 0) __mk.pick(i); else __mk.act(); });
}

const a = await join('Dice A');
const b = await join('Dice B');
const STAND = [-5.15, 2.4]; // behind a free chair at the café's third table (core/board-cafe-room.js)
let ok = false, c = null;
try {
  step = 'both into the board game café';
  for (const page of [a, b]) await page.evaluate(() => __mk.enter('dice-and-tea'));
  for (const page of [a, b]) await page.waitForFunction(() => __mk.room()?.id === 'dice-and-tea', null, { timeout: 30000 });
  await a.evaluate(([x, z]) => __mk.place(x, z), STAND);
  await b.evaluate(([x, z]) => __mk.place(x + 1, z + 1.5), STAND);
  await a.waitForFunction(() => /Board games/.test(__mk.action() || ''), null, { timeout: 10000 });

  step = 'A opens the panel and plays Omok against the computer';
  await openPanel(a);
  await a.waitForSelector('#bg-panel.on [data-game="omok"]', { timeout: 20000 });
  await a.click('#bg-panel [data-game="omok"]');
  await a.click('#bg-panel [data-act="rule33"]'); // the host turns the 3-3 rule on
  await a.waitForSelector('#bg-panel [data-act="rule33"][aria-pressed="true"]');
  if (shotDir) await a.screenshot({ path: shotDir + '/omok-lobby.png' });
  await a.click('#bg-panel [data-act="start"]');
  await a.waitForSelector('#bg-panel canvas.bg-omok');
  const box = await a.locator('#bg-panel canvas.bg-omok').boundingBox();
  await a.mouse.click(box.x + box.width * 8 / 16, box.y + box.height * 8 / 16); // the centre point
  await a.waitForFunction(() => /Your turn/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''), null, { timeout: 8000 });
  if (shotDir) await a.screenshot({ path: shotDir + '/omok.png' });
  await a.click('#bg-panel .bg-x');

  step = 'the host sits in the pirate barrel';
  await openPanel(a);
  await a.waitForSelector('#bg-panel.on [data-game="pirate"]');
  await a.click('#bg-panel [data-game="pirate"]');
  await a.click('#bg-panel [data-act="start"]');
  await a.waitForSelector('#bg-panel canvas.bg-toy3d');
  await a.waitForTimeout(600);
  if (shotDir) await a.screenshot({ path: shotDir + '/pirate-host.png' });
  await a.click('#bg-panel .bg-x');

  step = 'Catch the Thief with three computers: the table in 3D, seen from my seat';
  await openPanel(a);
  await a.waitForSelector('#bg-panel.on [data-game="thief"]');
  await a.evaluate(() => { const u = window.__bgUi; u.begin('thief', [u.net.myId, '~', '~', '~'], u.net.myId, 5); });
  await a.waitForSelector('#bg-panel canvas.bg-thief3d', { timeout: 15000 });
  await a.waitForTimeout(1200);
  if (shotDir) await a.screenshot({ path: shotDir + '/thief-four.png' });
  await a.click('#bg-panel .bg-x');

  step = 'A rolls the dice at Snakes & Ladders against the computer';
  await openPanel(a);
  await a.waitForSelector('#bg-panel.on [data-game="ladders"]');
  await a.click('#bg-panel [data-game="ladders"]');
  await a.click('#bg-panel [data-act="start"]');
  await a.waitForSelector('#bg-panel canvas.bg-ladders');
  // First the board is laid out: A puts down a ladder, then a snake, with two taps each; the computer does its own.
  for (const [piece, from, to] of [[0, 10, 30], [1, 50, 28], [0, 12, 35], [1, 60, 44], [0, 6, 21], [1, 38, 19]]) {
    await a.waitForSelector(`#bg-panel [data-piece="${piece}"]:not([disabled])`, { timeout: 15000 });
    await a.click(`#bg-panel [data-piece="${piece}"]`);
    // (a square the computer took in the meantime: the next free one in that row)
    await a.evaluate(([f, t]) => { const u = window.__bgUi, g = u.play.g, free = (k) => { while (g.taken().has(k)) k++; return k; }; u.ladderTap(free(f)); u.ladderTap(free(t)); }, [from, to]);
  }
  if (shotDir) { await a.waitForTimeout(300); await a.screenshot({ path: shotDir + '/ladders-setup.png' }); }
  for (let k = 0; k < 6; k++) {
    await a.waitForSelector('#bg-panel [data-act="roll"]:not([disabled])', { timeout: 30000 }); // (the computer may roll a 6 or two first)
    await a.click('#bg-panel [data-act="roll"]');
    if (k === 0 && shotDir) { await a.waitForTimeout(350); await a.screenshot({ path: shotDir + '/ladders-dice.png' }); }
    await a.waitForFunction(() => +document.querySelector('#bg-panel .bg-dice')?.dataset.dice > 0, null, { timeout: 8000 });
  }
  await a.waitForTimeout(1200);
  if (shotDir) await a.screenshot({ path: shotDir + '/ladders.png' });
  await a.click('#bg-panel .bg-x');

  step = 'A takes blocks out of the 3D tower against the computer';
  await openPanel(a);
  await a.waitForSelector('#bg-panel.on [data-game="tower"]');
  await a.click('#bg-panel [data-game="tower"]');
  await a.click('#bg-panel [data-act="start"]');
  await a.waitForSelector('#bg-panel canvas.bg-toy3d', { timeout: 15000 });
  await a.waitForTimeout(400);
  if (shotDir) await a.screenshot({ path: shotDir + '/tower-start.png' });
  await a.evaluate(() => document.querySelector('#bg-panel .bg-spot[data-spot="28"]').click()); // the middle of the top layer
  await a.waitForFunction(() => document.querySelectorAll('#bg-panel .bg-spot:disabled').length >= 1 && !!document.querySelector('#bg-panel [data-wobble]') || /💥/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''), null, { timeout: 8000 });
  await a.waitForTimeout(1500);
  if (shotDir) await a.screenshot({ path: shotDir + '/tower.png' });
  await a.click('#bg-panel .bg-x');

  step = 'mafia: needs four people; a night, the talk and the vote on the host\'s screen';
  await openPanel(a);
  await a.waitForSelector('#bg-panel.on [data-game="mafia"]');
  await a.click('#bg-panel [data-game="mafia"]');
  await a.waitForSelector('#bg-panel [data-act="talktime"]', { timeout: 15000 });
  await a.click('#bg-panel [data-act="start"]');
  await a.waitForFunction(() => /at least 4/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''), null, { timeout: 8000 });
  if (shotDir) await a.screenshot({ path: shotDir + '/mafia-lobby.png' });
  // Three more seats, played from here through the host (as their moves would arrive).
  await a.evaluate(() => { const u = window.__bgUi; u.begin('mafia', [u.net.myId, 'm-one', 'm-two', 'm-three'], u.net.myId, 8); });
  await a.waitForSelector('#bg-panel .mf[data-phase="night"]', { timeout: 15000 });
  const mf = () => a.evaluate(() => { const g = window.__bgUi.play.g; return { roles: g.roles, phase: g.phase, alive: g.alive, step: g.step, over: g.over, winner: g.winner }; });
  const others = (act) => a.evaluate((x) => { const u = window.__bgUi; u.hostApply(x[0], x[1]); }, act);
  let st = await mf();
  const mafia = st.roles.indexOf('mafia'), doctor = st.roles.indexOf('doctor'), town = st.roles.indexOf('town');
  if (await a.locator('#bg-panel .mf-role').count() !== 1) throw new Error('my role is not shown');
  // Only my own role shows among the people (and never someone else's while the game runs).
  const shown = await a.evaluate(() => [...document.querySelectorAll('#bg-panel .mf-who')].filter((b) => /🔪|💉|🔍|🙂/.test(b.textContent)).map((b) => +b.dataset.seat));
  if (shown.length !== 1 || shown[0] !== 0) throw new Error(`roles shown for seats ${shown}`);
  if (shotDir) await a.screenshot({ path: shotDir + '/mafia-night.png' });
  // Night 1: the mafia goes for the townsperson, the doctor saves them: a quiet morning.
  if (mafia === 0) await a.click(`#bg-panel .mf-who[data-seat="${town}"]`); else await others([mafia, ['k', town]]);
  if (doctor === 0) await a.click(`#bg-panel .mf-who[data-seat="${town}"]`); else await others([doctor, ['h', town]]);
  await others([0, ['n', st.step]]);
  await a.waitForSelector('#bg-panel .mf[data-phase="talk"]', { timeout: 8000 });
  await a.waitForFunction(() => /doctor saved/.test(document.querySelector('#bg-panel .mf-news')?.textContent || ''), null, { timeout: 8000 });
  if (shotDir) await a.screenshot({ path: shotDir + '/mafia-talk.png' });
  await a.click('#bg-panel [data-act="mf-done"]');
  for (const s of [1, 2, 3]) await others([s, ['z']]);
  await a.waitForSelector('#bg-panel .mf[data-phase="vote"]', { timeout: 8000 });
  // Everyone but the mafia votes the mafia out: the town wins and every role shows.
  if (mafia === 0) await a.click('#bg-panel [data-act="mf-pass"]'); else await a.click(`#bg-panel .mf-who[data-seat="${mafia}"]`);
  if (shotDir) await a.screenshot({ path: shotDir + '/mafia-vote.png' });
  for (const s of [1, 2, 3]) await others([s, ['v', s === mafia ? 9 : mafia]]);
  await a.waitForFunction(() => /town wins/i.test(document.querySelector('#bg-panel .mf-phase')?.textContent || ''), null, { timeout: 8000 });
  st = await mf();
  if (st.winner !== 'town') throw new Error('the town should have won: ' + JSON.stringify(st));
  if (await a.evaluate(() => [...document.querySelectorAll('#bg-panel .mf-who')].filter((b) => /🔪|💉|🔍|🙂/.test(b.textContent)).length) !== 4) throw new Error('every role shows at the end');
  if (shotDir) await a.screenshot({ path: shotDir + '/mafia-end.png' });
  await a.click('#bg-panel .bg-x');

  step = 'C walks in to watch';
  c = await join('Dice C');
  await c.evaluate(() => __mk.enter('dice-and-tea'));
  await c.waitForFunction(() => __mk.room()?.id === 'dice-and-tea', null, { timeout: 30000 });
  await c.evaluate(([x, z]) => __mk.place(x + 2.2, z + 0.4), STAND);
  await a.waitForFunction(() => __mk.peers().length >= 2, null, { timeout: 30000 }).catch(() => {});

  step = 'A invites B to Croc Teeth';
  await openPanel(a);
  await a.waitForSelector('#bg-panel.on [data-game="croc"]');
  await a.click('#bg-panel [data-game="croc"]');
  await a.waitForFunction(() => [...document.querySelectorAll('#bg-panel .bg-btn')].some((x) => /Invite Dice B/.test(x.textContent)), null, { timeout: 15000 });
  await a.evaluate(() => [...document.querySelectorAll('#bg-panel .bg-btn')].find((x) => /Invite Dice B/.test(x.textContent)).click());
  await b.waitForSelector('#bg-ask', { timeout: 15000 });
  if (shotDir) await b.screenshot({ path: shotDir + '/invite.png' });
  await b.evaluate(() => document.querySelector('#bg-ask button').click());
  await a.waitForFunction(() => /Dice B is in/.test(document.querySelector('#bg-panel')?.textContent || ''), null, { timeout: 15000 });
  await a.click('#bg-panel [data-act="start"]');
  await b.waitForSelector('#bg-panel.on .bg-croc', { state: 'attached', timeout: 15000 });

  step = 'the 3D croc shows, and chat works from inside the game card';
  for (const page of [a, b]) await page.waitForSelector('#bg-panel canvas.bg-toy3d', { state: 'attached', timeout: 15000 });
  // They sit at a table in the café: the one whose turn it is has the big panel, the other a small one and the toy on the table.
  await b.waitForSelector('#bg-panel.mini', { timeout: 8000 });
  await a.waitForFunction(() => !document.querySelector('#bg-panel.mini'), null, { timeout: 8000 });
  if (shotDir) { await b.waitForTimeout(800); await b.screenshot({ path: shotDir + '/croc-table.png' }); }
  await a.fill('#bg-panel .bg-chat input', 'good luck');
  await a.press('#bg-panel .bg-chat input', 'Enter');
  for (const page of [a, b]) await page.waitForFunction(() => /good luck/.test(document.querySelector('#bg-panel .bg-chat-lines')?.textContent || ''), null, { timeout: 15000 });

  step = 'they take turns until the croc snaps; both screens agree';
  const pressedOn = (page) => page.evaluate(() => [...document.querySelectorAll('#bg-panel .bg-spot')].filter((x) => x.textContent === '·').length);
  const isOver = (page) => page.evaluate(() => !!document.querySelector('#bg-panel [data-act="again"]') || /💥/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''));
  for (let k = 0; k < 14 && !(await isOver(a)); k++) {
    let mover = null;
    for (const page of [a, b]) if (await page.evaluate(() => /Your turn/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''))) mover = page;
    if (!mover) { await a.waitForTimeout(300); continue; }
    const n = await pressedOn(a);
    await mover.evaluate(() => document.querySelector('#bg-panel .bg-spot:not(:disabled)')?.click());
    // Both screens move on (or the croc snapped).
    for (const page of [a, b]) await page.waitForFunction((m) => [...document.querySelectorAll('#bg-panel .bg-spot')].filter((x) => x.textContent === '·').length > m || /💥/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''), n, { timeout: 8000 });
  }
  await a.waitForSelector('#bg-panel [data-act="again"]', { timeout: 15000 });
  await b.waitForFunction(() => /💥/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''), null, { timeout: 15000 });
  // C, who is not in the game, sees the croc on their table with its teeth pressed.
  step = 'C watches the croc game on the table';
  await c.waitForFunction(() => { const w = __mk.boardWatch()[0]; return w && w.kind === 'croc' && w.toy && w.pressed >= 1; }, null, { timeout: 15000 });
  if (shotDir) { await c.evaluate(([x, z]) => { __mk.goto?.(x + 1.6, z + 1.6, Math.PI * 1.25); __mk.cam?.({ yaw: 0.8, pitch: 0.35, dist: 3.2 }); }, STAND); await c.waitForTimeout(700); await c.screenshot({ path: shotDir + '/watch-croc.png' }); }
  const pressed = await Promise.all([a, b].map((p) => p.evaluate(() => [...document.querySelectorAll('#bg-panel .bg-spot')].map((x) => x.textContent === '·' ? 1 : 0).join(''))));
  if (pressed[0] !== pressed[1]) throw new Error(`different boards: ${pressed[0]} vs ${pressed[1]}`);
  if (shotDir) { await a.screenshot({ path: shotDir + '/croc-a.png' }); await b.screenshot({ path: shotDir + '/croc-b.png' }); }

  step = 'the joker game: choose a card (it lifts on both screens), then draw; a face pops up for the other player';
  for (const page of [a, b]) await page.evaluate(() => document.querySelector('#bg-panel.on .bg-x')?.click());
  await openPanel(a);
  await a.waitForSelector('#bg-panel.on [data-game="thief"]');
  await a.click('#bg-panel [data-game="thief"]');
  await a.waitForFunction(() => [...document.querySelectorAll('#bg-panel .bg-btn')].some((x) => /Invite Dice B/.test(x.textContent)), null, { timeout: 15000 });
  await a.evaluate(() => [...document.querySelectorAll('#bg-panel .bg-btn')].find((x) => /Invite Dice B/.test(x.textContent)).click());
  await b.waitForSelector('#bg-ask', { timeout: 15000 });
  await b.evaluate(() => document.querySelector('#bg-ask button').click());
  await a.waitForFunction(() => /Dice B is in/.test(document.querySelector('#bg-panel')?.textContent || ''), null, { timeout: 15000 });
  await a.click('#bg-panel [data-act="start"]');
  for (const page of [a, b]) await page.waitForSelector('#bg-panel.on [data-hand="from"]', { timeout: 15000 });
  const drawer = async () => { for (const page of [a, b]) if (await page.evaluate(() => !!document.querySelector('#bg-panel [data-act="draw"]'))) return page; return null; };
  const thiefOver = (page) => page.evaluate(() => !document.querySelector('#bg-panel [data-hand="from"]'));
  let faced = false, watched = false;
  for (let k = 0; k < 80 && !(await thiefOver(a)); k++) {
    const mover = await drawer();
    if (!mover) { await a.waitForTimeout(200); continue; }
    const other = mover === a ? b : a;
    const n = await mover.evaluate(() => document.querySelectorAll('#bg-panel [data-hand="from"] .bg-card1').length);
    if (await mover.evaluate(() => !document.querySelector('#bg-panel [data-act="draw"]').disabled)) throw new Error('Draw is on before a card is chosen');
    await mover.evaluate(() => document.querySelector('#bg-panel [data-hand="from"] .bg-card1:last-child').click());
    // The holder sees which of their cards is being eyed.
    await other.waitForSelector('#bg-panel [data-hand="from"] .bg-card1.sel', { timeout: 8000 });
    if (!faced) {
      // The holder shuffles (once a turn): the finger comes off, and the picker points again.
      await other.click('#bg-panel [data-act="mix"]');
      await mover.waitForFunction(() => /shuffled/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''), null, { timeout: 8000 });
      if (await other.locator('#bg-panel [data-act="mix"]').count()) throw new Error('a second shuffle in one turn is offered');
      await mover.evaluate(() => document.querySelector('#bg-panel [data-hand="from"] .bg-card1:last-child').click());
      await other.waitForSelector('#bg-panel [data-hand="from"] .bg-card1.sel', { timeout: 8000 });
      if (!(await mover.evaluate(() => /⏳/.test(document.querySelector('#bg-panel .bg-clock')?.textContent || '')))) throw new Error('the turn clock is not shown');
      await other.click('#bg-panel [data-face="1"]');
      await mover.waitForFunction(() => /😱/.test(document.querySelector('#bg-panel .bg-pop')?.textContent || ''), null, { timeout: 8000 });
      if (shotDir) { await mover.screenshot({ path: shotDir + '/thief-picker.png' }); await other.screenshot({ path: shotDir + '/thief-holder.png' }); }
      faced = true;
    }
    await mover.click('#bg-panel [data-act="draw"]:not([disabled])');
    if (!watched) {
      // C sees both hands of card backs on the table.
      await c.waitForFunction(() => { const w = __mk.boardWatch()[0]; return w && w.kind === 'thief' && w.cards.length === 2 && w.cards.every((n) => n > 0); }, null, { timeout: 15000 });
      if (shotDir) { await c.waitForTimeout(500); await c.screenshot({ path: shotDir + '/watch-thief.png' }); }
      watched = true;
    }
    for (const page of [a, b]) await page.waitForFunction((m) => { const f = document.querySelector('#bg-panel [data-hand="from"]'); return !f || f.querySelectorAll('.bg-card1').length !== m || !f.querySelector('.sel'); }, n, { timeout: 8000 });
  }
  for (const page of [a, b]) await page.waitForFunction(() => /🃏/.test(document.querySelector('#bg-panel .bg-status')?.textContent || ''), null, { timeout: 15000 });
  if (shotDir) await a.screenshot({ path: shotDir + '/thief-end.png' });

  step = 'mafia: the host leaves and the game goes on under the next player';
  for (const page of [a, b]) await page.evaluate(() => { const u = window.__bgUi; u.leaveAll(); u.render(); });
  const [idA, idB] = await Promise.all([a, b].map((page) => page.evaluate(() => window.__bgUi.net.myId)));
  await b.evaluate((host) => { const u = window.__bgUi; u.host = { id: host, name: 'Dice A', game: 'mafia' }; u.state = 'waiting'; u.show(); }, idA);
  await a.evaluate((guest) => { const u = window.__bgUi; u.show(); u.begin('mafia', [u.net.myId, guest, 'm-one', 'm-two'], u.net.myId, 4); }, idB);
  await b.waitForSelector('#bg-panel .mf[data-phase="night"]', { timeout: 15000 });
  await a.click('#bg-panel .bg-x'); // the host closes the game on their side
  await b.waitForFunction((me) => window.__bgUi.play?.hostId === me && window.__bgUi.play.g.out[0] && !window.__bgUi.play.closed, idB, { timeout: 15000 });
  // The new host's clock moves the night on.
  await b.evaluate(() => { const u = window.__bgUi; u.play.phaseAt -= 21000; });
  await b.waitForFunction(() => window.__bgUi.play.g.over || window.__bgUi.play.g.phase === 'talk', null, { timeout: 8000 });
  if (shotDir) await b.screenshot({ path: shotDir + '/mafia-new-host.png' });
  await b.evaluate(() => { const u = window.__bgUi; u.leaveAll(); u.render(); });

  step = 'B walks out: A is told';
  await b.evaluate(() => __mk.place(0, 0));
  await b.evaluate(() => __mk.enter('lucky-piggy-tarot'));
  await b.waitForFunction(() => !document.querySelector('#bg-panel.on'), null, { timeout: 15000 });
  ok = true;
} catch (e) {
  errors.push(`assertion at "${step}": ${e.message.split('\n')[0]}`);
  for (const [n, page] of [['A', a], ['B', b]]) {
    const st = await page.evaluate(() => ({ room: __mk.room()?.id, near: __mk.near(), action: __mk.action(), panel: document.querySelector('#bg-panel')?.textContent?.slice(0, 300) })).catch((x) => x.message);
    errors.push(`${n} state: ${JSON.stringify(st)}`);
  }
  errors.push(...logs.slice(-40));
  if (!bridge) errors.push(...rtLog.slice(-30));
  if (shotDir) { await a.screenshot({ path: shotDir + '/fail-a.png' }); await b.screenshot({ path: shotDir + '/fail-b.png' }); }
}
if (errors.length && ok) ok = !errors.some((x) => !x.includes('toast'));
for (const br of browsers) await br.close();
for (const e of errors) console.log(e);
console.log(ok ? 'PASS' : 'FAIL');
if (!bridge) console.log(summary());
process.exit(ok ? 0 : 1);
