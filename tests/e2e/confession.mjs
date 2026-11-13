// End-to-end check: Myeongdong Cathedral's confession room. From the nave
// you walk up to the confessional and go in; inside you are alone (the game
// is out of multiplayer: nothing goes out on the realtime channel at all),
// what you type gets the priest's answer, and the words never leave the
// page: every message the page sends or stores (realtime sockets,
// BroadcastChannel, fetch, XHR, beacons, localStorage) is recorded and
// searched for them. The door takes you back into the nave.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/confession.mjs http://localhost:4173/ [shot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4173/';
const shotDir = process.argv[3] || null;
const SECRET = 'zebra-umbrella-4417'; // what we confess (searched for in everything sent)
const ROOM = 'e2e' + Math.random().toString(36).slice(2, 10);
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || process.env.CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const proxy = process.env.E2E_PROXY ? { server: process.env.E2E_PROXY, bypass: 'localhost,127.0.0.1' } : undefined; // (a sandbox that reaches the internet only through a proxy)
const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 }, proxy, ignoreHTTPSErrors: !!proxy });
// Record everything the page sends, before any of its code runs.
await ctx.addInitScript(() => {
  const out = (window.__sent = []);
  const keep = (kind, d) => { try { out.push(kind + ':' + (typeof d === 'string' ? d : d instanceof Blob ? '[blob]' : JSON.stringify(d))); } catch { out.push(kind + ':?'); } };
  const ws = WebSocket.prototype.send;
  WebSocket.prototype.send = function (d) { keep('ws', d); return ws.call(this, d); };
  const bc = BroadcastChannel.prototype.postMessage;
  BroadcastChannel.prototype.postMessage = function (d) { keep('bc', d); return bc.call(this, d); };
  const f = window.fetch;
  window.fetch = function (u, o) { keep('fetch', String(u) + ' ' + (o?.body ?? '')); return f.apply(this, arguments); };
  const xs = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (d) { keep('xhr', d ?? ''); return xs.call(this, d); };
  const beacon = navigator.sendBeacon?.bind(navigator);
  if (beacon) navigator.sendBeacon = (u, d) => { keep('beacon', String(u) + ' ' + (d ?? '')); return beacon(u, d); };
  const set = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { keep('storage', k + '=' + v); return set.call(this, k, v); };
});
const errors = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function join(name) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('  [page]', m.text().slice(0, 200)); });
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', name);
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible' });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  const mk = (f, ...x) => page.evaluate(([f, x]) => window.__mk[f](...x), [f, x]);
  return { page, mk };
}

let ok = false;
try {
  const A = await join('Confessor');
  await A.mk('enter', 'myeongdong-cathedral');
  // (Where the realtime server can't be reached, the game plays solo
  // everywhere: then the "back in multiplayer" check is skipped.)
  const online = await A.page.waitForFunction(() => !window.__mk.solo(), null, { timeout: 30000 }).then(() => true, () => false);
  console.log(online ? 'in the nave, in multiplayer' : 'realtime unreachable here: playing solo, the rejoin check is skipped');
  // A walks up to the confessional.
  const spot = await A.page.evaluate(() => { const r = window.__mk.room(); return r.id; });
  if (spot !== 'myeongdong-cathedral') throw new Error('not in the cathedral: ' + spot);
  await A.page.evaluate(() => window.__mk.place(5.6, 12.4));
  await A.mk('face', Math.PI / 2);
  await wait(800);
  const label = await A.mk('action');
  console.log('at the confessional:', label);
  if (!/confession/i.test(label || '')) throw new Error('no "Go to confession" button: ' + label);
  if (shotDir) { await A.mk('face', Math.PI / 2); await A.mk('cam', { yaw: -Math.PI / 2 + 0.5, pitch: 0.25 }); await wait(1200); await A.page.screenshot({ path: `${shotDir}/confessional-nave.png` }); }
  await A.mk('act');
  await wait(2500);
  const inside = await A.mk('room');
  console.log('inside:', inside);
  if (inside.id !== 'myeongdong-confession') throw new Error('did not go in');
  await wait(1500);
  const live = () => A.page.evaluate(() => window.__sent.filter((s) => s.startsWith('ws:') || s.startsWith('bc:')).length);
  const live0 = await live(); // from here on, inside: nothing on the realtime channel
  // Sit and confess through the chat bar.
  await A.mk('sit', 0);
  await wait(800);
  const sentBefore = (await A.page.evaluate(() => window.__sent.length));
  await A.page.click('#chat-btn');
  const ph = await A.page.getAttribute('#chat-input', 'placeholder');
  console.log('placeholder:', ph);
  await A.page.type('#chat-input', 'I ate my sister\'s cake ' + SECRET);
  await A.page.keyboard.press('Enter');
  await A.page.waitForFunction(() => [...document.querySelectorAll('.npc-say')].some((e) => e.textContent.length > 5 && !/^Peace be with you/.test(e.textContent) && getComputedStyle(e).display !== 'none'), null, { timeout: 15000 });
  const said = await A.page.evaluate(() => [...document.querySelectorAll('.npc-say')].map((e) => e.textContent));
  console.log('the priest:', said.join(' / '));
  if (shotDir) { await A.mk('cam', { yaw: 0.35, pitch: 0.3 }); await wait(1500); await A.page.screenshot({ path: `${shotDir}/confession-room.png` }); }
  const log = await A.page.evaluate(() => document.getElementById('chat-log').textContent);
  if (log.includes(SECRET)) throw new Error('the confession went into the chat log');
  await wait(3000);
  const liveIn = (await live()) - live0;
  console.log('realtime messages sent while inside:', liveIn, '· out of multiplayer:', await A.mk('solo'));
  if (!(await A.mk('solo'))) throw new Error('still in multiplayer in the confession room');
  if (liveIn) throw new Error(`${liveIn} realtime messages went out from the confession room`);
  // Back out into the nave.
  await A.mk('stand'); await wait(400);
  await A.mk('backOut'); await wait(2500);
  const back = await A.mk('room');
  console.log('after the door:', back);
  if (back.id !== 'myeongdong-cathedral') throw new Error('the door did not lead back to the nave');
  if (online) {
    await A.page.waitForFunction(() => !window.__mk.solo(), null, { timeout: 30000 });
    console.log('back in multiplayer in the nave');
  }
  await wait(3000);
  // The words were never sent or stored.
  for (const [name, p] of [['A', A]]) {
    const sent = await p.page.evaluate(() => window.__sent);
    const hit = sent.filter((s) => s.includes(SECRET));
    console.log(`${name}: ${sent.length} messages sent/stored in all${name === 'A' ? `, ${sent.length - sentBefore} while confessing and after` : ''}; with the words: ${hit.length}`);
    if (hit.length) throw new Error(`${name} sent or stored the confession: ${hit[0].slice(0, 200)}`);
  }
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('OK');
} catch (e) {
  console.error('FAIL', e.message);
} finally {
  await browser.close();
  process.exit(ok ? 0 : 1);
}
