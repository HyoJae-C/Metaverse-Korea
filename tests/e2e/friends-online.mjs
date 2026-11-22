// End-to-end check: friends online now (supabase/068_friends_online.sql,
// LocalFriends.online() here). B has three friends: online, away (no input
// for 30 min) and gone. The picker lists them 🟢, 🔴, ⚪ in that order, the
// 👥 panel shows the same dots, and B's switch
// "Let friends see when I'm online" is on by default and can be turned off.
// Local play, like friend-requests.mjs:
//   VITE_NET_PROVIDER=local npx vite build --outDir dist-local && npx vite preview --outDir dist-local --port 4174 &
//   node tests/e2e/friends-online.mjs http://localhost:4174/ [screenshot dir]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:4174/';
const shotDir = process.argv[3] || null;
const browser = await chromium.launch({ executablePath: process.env.CHROME || process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
let step = 'joining';
let ok = false;
try {
  const [vw, vh] = (process.env.E2E_VIEW || '390x760').split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=e2eon' + Math.random().toString(36).slice(2, 8));
  await page.click('#next-btn');
  await page.fill('#nickname', 'Friend B');
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible', timeout: 90000 });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  await page.waitForFunction(() => Object.values(JSON.parse(localStorage.getItem('mkfriends.local') || '{}').names || {}).includes('Friend B'), null, { timeout: 30000 });

  step = 'two friends, one online';
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('mkfriends.local'));
    const me = Object.keys(s.names).find((u) => s.names[u] === 'Friend B');
    s.seen = s.seen || {};
    s.away = s.away || {};
    for (const [uid, name, ago, away] of [['e2e-on', 'Mina Online', 5000, false], ['e2e-away', 'Sora Idle', 5000, true], ['e2e-off', 'Joon Gone', 3600e3, false]]) {
      s.names[uid] = name;
      s.edges.push([uid, me], [me, uid]);
      s.seen[uid] = Date.now() - ago;
      s.away[uid] = away;
    }
    localStorage.setItem('mkfriends.local', JSON.stringify(s));
    new BroadcastChannel('mk-friends').postMessage({ type: 'f', to: me });
  });
  await page.waitForTimeout(500);

  step = 'the picker shows who is online';
  await page.click('#chat-btn');
  await page.waitForFunction(() => /Mina Online/.test(document.getElementById('chat-to')?.textContent || ''), null, { timeout: 10000 });
  await page.waitForFunction(() => [...document.querySelectorAll('#chat-to option')].some((o) => o.textContent.startsWith('🟢 Mina Online')), null, { timeout: 10000 });
  const opts = await page.$$eval('#chat-to option', (els) => els.map((e) => e.textContent));
  const iOn = opts.findIndex((o) => o.startsWith('🟢 Mina Online')), iAway = opts.findIndex((o) => o.startsWith('🔴 Sora Idle')), iOff = opts.findIndex((o) => o === '⚪ Joon Gone');
  if (iOn < 0 || iAway < 0 || iOff < 0 || !(iOn < iAway && iAway < iOff)) throw new Error('picker options: ' + JSON.stringify(opts));
  if (shotDir) await page.screenshot({ path: shotDir + '/online-picker.png' });

  step = 'the friends panel shows the dot and the switch';
  await page.click('#friends-btn');
  await page.waitForSelector('#friends-panel .fr-on', { timeout: 5000 });
  const dots = await page.$$eval('#friends-panel .fr-conv', (els) => Object.fromEntries(els.map((e) => [e.querySelector('.fr-name').textContent, e.querySelector('.fr-dot')?.className || ''])));
  if (!/fr-on/.test(dots['Mina Online']) || !/fr-away/.test(dots['Sora Idle']) || !/fr-off/.test(dots['Joon Gone']) || dots['All friends']) throw new Error('dots: ' + JSON.stringify(dots));
  const box = '#friends-panel .fr-online-switch input';
  if (!(await page.isChecked(box))) throw new Error('switch should be on by default');
  if (shotDir) await page.screenshot({ path: shotDir + '/online-panel.png' });

  step = 'turning it off hides me';
  await page.click(box);
  await page.waitForFunction(() => {
    const s = JSON.parse(localStorage.getItem('mkfriends.local'));
    const me = Object.keys(s.names).find((u) => s.names[u] === 'Friend B');
    return s.hidden?.[me] === true;
  }, null, { timeout: 5000 });
  if (await page.isChecked(box)) throw new Error('switch did not turn off');
  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  ok = true;
  console.log('friends online e2e: ok');
} catch (e) {
  console.error(`friends online e2e failed at "${step}":`, e.message);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
