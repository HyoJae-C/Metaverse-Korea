// End-to-end check: friend requests from several people at once
// (ui/friend-ask-ui.js). Three players ask B at nearly the same moment: a
// card with Accept stays on B's screen (not a toast that the next request
// overwrites), says "+2 more", and accepting or putting one off shows the
// next, until all three are answered.
// Local play (other tabs of this browser are the other players), so it
// needs a build without the online server:
//   VITE_NET_PROVIDER=local npx vite build --outDir dist-local && npx vite preview --outDir dist-local --port 4174 &
//   node tests/e2e/friend-requests.mjs http://localhost:4174/ [screenshot dir]
// The senders are written the way another tab's LocalFriends.add() does it
// (core/friends.js): their edge in the shared store, then the 'f' ping.
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4174/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let step = 'joining';
let ok = false;
try {
  const [vw, vh] = (process.env.E2E_VIEW || '390x760').split('x').map(Number); // (E2E_VIEW=900x640 for a PC screen)
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2efr' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Friend B');
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible', timeout: 90000 });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.waitForFunction(() => Object.values(JSON.parse(localStorage.getItem('mkfriends.local') || '{}').names || {}).includes('Friend B'), null, { timeout: 30000 });

  step = 'three requests at once';
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('mkfriends.local'));
    const me = Object.keys(s.names).find((u) => s.names[u] === 'Friend B');
    const bc = new BroadcastChannel('mk-friends');
    for (const [uid, name] of [['e2e-s1', 'Sender One'], ['e2e-s2', 'Sender Two'], ['e2e-s3', 'Sender Three']]) {
      const now = JSON.parse(localStorage.getItem('mkfriends.local'));
      now.names[uid] = name;
      now.edges.push([uid, me]);
      localStorage.setItem('mkfriends.local', JSON.stringify(now));
      bc.postMessage({ type: 'f', to: me });
    }
  });
  const card = async () => page.evaluate(() => { const c = document.getElementById('friend-ask'); return c && !c.hidden && getComputedStyle(c).display !== 'none' ? c.textContent : null; });
  await page.waitForFunction(() => { const c = document.getElementById('friend-ask'); return c && !c.hidden && /\+2/.test(c.textContent); }, null, { timeout: 10000 });
  const first = await card();
  if (!/Sender One/.test(first)) throw new Error('first card is not the first request: ' + first);
  // The 💬 button shows they're waiting even when the card is put away.
  if (await page.isHidden('#chat-unread') || (await page.textContent('#chat-unread')) !== '3') throw new Error('chat badge does not count the 3 requests');
  if (shotDir) await page.screenshot({ path: shotDir + '/friend-ask-3.png' });

  step = 'accept the first';
  await page.click('#friend-ask .chip.primary');
  await page.waitForFunction(() => /Sender Two/.test(document.getElementById('friend-ask')?.textContent || ''), null, { timeout: 10000 });
  if (!/\+1/.test(await card())) throw new Error('second card should say +1 more: ' + await card());

  step = 'put off the second';
  await page.click('#friend-ask .chip:not(.primary)');
  await page.waitForFunction(() => /Sender Three/.test(document.getElementById('friend-ask')?.textContent || ''), null, { timeout: 5000 });

  step = 'accept the third';
  await page.click('#friend-ask .chip.primary');
  await page.waitForFunction(() => document.getElementById('friend-ask').hidden, null, { timeout: 10000 });

  step = 'the put-off one still waits in the friends panel';
  await page.click('#chat-btn');
  await page.click('#friends-btn');
  await page.waitForSelector('#friends-panel .fr-request', { timeout: 5000 });
  const rows = await page.$$eval('#friends-panel .fr-request', (els) => els.map((e) => e.textContent));
  if (rows.length !== 1 || !/Sender Two/.test(rows[0])) throw new Error('panel requests: ' + JSON.stringify(rows));
  if (shotDir) await page.screenshot({ path: shotDir + '/friend-ask-panel.png' });
  const edges = await page.evaluate(() => JSON.parse(localStorage.getItem('mkfriends.local')).edges);
  const back = (u) => edges.some(([a, b]) => b === u && a !== u && edges.some(([x, y]) => x === u && y === a));
  if (!back('e2e-s1') || !back('e2e-s3') || back('e2e-s2')) throw new Error('accepted edges wrong: ' + JSON.stringify(edges));
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('friend requests e2e: ok');
} catch (e) {
  console.error(`friend requests e2e failed at "${step}":`, e.message);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
