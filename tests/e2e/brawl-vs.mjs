// End-to-end check: Rooftop Rumble between two people in the arcade,
// and a third who watches it on the wall screen. One asks the other from the game's menu (no need to be friends), the
// other says yes on the card, picks a style and both screens play the same
// match: each sees their own fighter on the left, hits on one screen take
// health on the other, and leaving hands the win to whoever stayed.
// Realtime runs on the fake server in this script (fake-realtime.mjs).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/brawl-vs.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
import { useFakeRealtime, summary } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const ROOM = 'e2evs' + Math.random().toString(36).slice(2, 8);
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok', msg); };
const errors = [], browsers = [];
const launch = () => chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function join(name, x) {
  const browser = await launch();
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  await useFakeRealtime(ctx, name);
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
  await page.evaluate(() => __mk.enter('punch-arcade'));
  await page.waitForTimeout(1500);
  await page.evaluate(([px, pz]) => __mk.place(px, pz), [x, 1.6]);
  return page;
}
const shot = async (p, n) => { if (S) await p.screenshot({ path: `${S}/${n}.png` }); };
const until = (p, fn, arg, ms = 30000) => p.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const state = (p) => p.evaluate(() => { const b = __mk.brawl(), m = b?.match; return m ? { phase: m.phase, a: m.a.hp, b: m.b.hp, wins: m.wins, round: m.round, vs: b.versus } : { vs: b?.versus || null }; });

const a = await join('Alice', -9.3), b = await join('Bobby', 0), c = await join('Carol', 1.5); // Carol only watches
try {
  // Alice opens the game at the cabinet and sees Bobby on the list.
  await a.evaluate(() => __mk.act());
  await a.waitForSelector('#brawl .bw-card', { timeout: 20000 });
  assert(await until(a, () => !!document.querySelector('#brawl .bw-vs button[data-peer]')), 'the menu lists the other player in the room');
  await a.click('#brawl .bw-styles button[data-id="boxer"]');
  await shot(a, 'vs-menu');
  await a.click('#brawl .bw-vs button[data-peer]');
  // Bobby, standing in the room, gets the card and says yes.
  await b.waitForSelector('#darts-ask', { timeout: 15000 });
  assert(/Alice/.test(await b.textContent('#darts-ask')), 'the other player is asked by name');
  await shot(b, 'vs-ask');
  await b.click('#darts-ask button');
  await b.waitForSelector('#brawl .bw-card .go', { timeout: 20000 });
  await b.click('#brawl .bw-styles button[data-id="kicker"]');
  await shot(b, 'vs-pick');
  await b.click('#brawl .bw-card .go');
  // Both screens start the same match.
  assert(await until(a, () => __mk.brawl()?.versus?.st === 'play'), 'the host is in the match');
  assert(await until(b, () => __mk.brawl()?.versus?.st === 'play'), 'the guest is in the match');
  assert(await until(a, () => __mk.brawl()?.match?.phase === 'fight', null, 40000), 'the fight starts for the host');
  assert(await until(b, () => __mk.brawl()?.match?.phase === 'fight', null, 40000), 'the fight starts for the guest');
  const names = async (p) => p.evaluate(() => [...document.querySelectorAll('#brawl .bw-name span')].map((e) => e.textContent));
  assert((await names(a)).join() === 'Alice,Bobby' && (await names(b)).join() === 'Bobby,Alice', 'each sees their own name on the left');
  const styles = async (p) => p.evaluate(() => [...document.querySelectorAll('#brawl .bw-style')].map((e) => e.textContent).join(' | '));
  assert(/Boxer.*Kicker/.test(await styles(a)) && /Kicker.*Boxer/.test(await styles(b)), `styles shown: ${await styles(a)} / ${await styles(b)}`);
  // Both walk in; Alice punches, Bobby only walks.
  await a.keyboard.down('KeyD'); await b.keyboard.down('KeyD');
  await a.waitForTimeout(1500);
  await a.keyboard.up('KeyD'); await b.keyboard.up('KeyD');
  for (let k = 0; k < 30; k++) { await a.keyboard.press(['KeyJ', 'KeyK'][k % 2]); await a.waitForTimeout(140); }
  await a.waitForTimeout(1200);
  const sa = await state(a), sb = await state(b);
  await shot(a, 'vs-fight-host'); await shot(b, 'vs-fight-guest');
  assert(sa.b < 100 || sa.round > 1 || sa.wins[0] > 0, `the host's hits took the guest's health (${JSON.stringify(sa)})`);
  assert(sb.round === sa.round && sb.wins.join() === sa.wins.join() && Math.abs(sb.b - sa.b) <= 30 && Math.abs(sb.a - sa.a) <= 30, `both screens show the same match (${JSON.stringify(sb)})`);
  assert(sa.vs.head - sa.vs.sure < 40 && sb.vs.head - sb.vs.sure < 40, `neither screen is waiting (${sa.vs.head - sa.vs.sure} / ${sb.vs.head - sb.vs.sure} ticks ahead)`);
  // Carol, standing in the room, sees the match on a wall screen.
  assert(await until(c, () => __mk.brawlTv()?.[0]?.live === true, null, 30000), 'someone watching gets the match on a wall screen');
  const tv = (await c.evaluate(() => __mk.brawlTv()))[0];
  assert(tv.names.join() === 'Alice,Bobby' && tv.b !== 'r0', `the screen names both players (${tv.names})`);
  await c.waitForTimeout(1500);
  const tv2 = (await c.evaluate(() => __mk.brawlTv()))[0], sa3 = await state(a);
  assert(tv2.hp[1] < 100 || sa3.round > 1, `and shows the hits (${tv2.hp} on the screen, ${sa3.a}/${sa3.b} in the game)`);
  // By the bench she can turn the camera to the screens.
  await c.evaluate(() => __mk.place(3.2, 4.2));
  await c.waitForTimeout(600);
  const watch = await c.evaluate(() => __mk.action());
  assert(/Watch/.test(watch || ''), `by the bench the action is "${watch}"`);
  await c.evaluate(() => __mk.act());
  const pick = c.locator('#action-menu:not([hidden]) .action-choice', { hasText: 'Watch' }); // (by the bench there is also "Sit down")
  if (await pick.count()) await pick.first().click();
  assert(await until(c, () => __mk.watching(), null, 5000), 'and it turns the camera to the screens');
  await c.waitForTimeout(1500);
  await shot(c, 'vs-wall-screen');
  // The guest's own buttons work too.
  const before = (await state(b)).a;
  // (A finished string knocked them apart: walk back in. Three software-drawn browsers are slow, so wait for the distance, not a time.)
  await b.keyboard.down('KeyD');
  await until(b, () => { const m = __mk.brawl().match; return Math.abs(m.b.x - m.a.x) < 0.9; }, null, 30000);
  await b.keyboard.up('KeyD');
  for (let k = 0; k < 24; k++) { await b.keyboard.press(['KeyJ', 'KeyK'][k % 2]); await b.waitForTimeout(140); }
  await b.waitForTimeout(1200);
  const sb2 = await state(b), sa2 = await state(a);
  assert(sb2.a < before || sb2.round !== sb.round || sb2.wins.join() !== sb.wins.join(), `the guest's hits took the host's health (${before} → ${sb2.a})`);
  assert(sa2.round === sb2.round && Math.abs(sa2.a - sb2.a) <= 30, 'and the host sees it');
  // Bobby leaves: Alice is told and is back at the menu.
  await b.keyboard.press('Escape');
  assert(await until(a, () => /Bobby/.test(document.querySelector('#brawl .bw-note')?.textContent || ''), null, 15000), 'the one who stayed is told the other left');
  assert((await state(a)).vs === null && await b.evaluate(() => !__mk.brawl().open), 'the match is over on both screens');
  assert(await until(c, () => (__mk.brawlTv() || []).every((x) => !x), null, 15000), 'the wall screen goes back to waiting when the match ends');
    // Solo play advertises a status only, never a replay of the match.
  await a.click('#brawl .bw-card .go');
    assert(await until(c, () => __mk.brawlTv()?.some((x) => x?.solo && !x.live && !x.hp), null, 30000), 'solo play shows status without streaming the match');
  await c.waitForTimeout(2500);
  await shot(c, 'solo-wall-screen');
  await c.click('#tv-x');
  assert(await c.evaluate(() => !__mk.watching()), 'the button gives the camera back');
  await a.keyboard.press('Escape');
  await a.waitForTimeout(1200);
  await a.evaluate(() => __mk.act());
  await a.waitForSelector('#brawl .bw-card', { timeout: 20000 });
  // Again, and this time the other says no.
  await a.click('#brawl .bw-vs button[data-peer]');
  await b.waitForSelector('#darts-ask', { timeout: 15000 });
  await b.click('#darts-ask button:nth-of-type(2)');
  assert(await until(a, () => /Bobby/.test(document.querySelector('#brawl .bw-note')?.textContent || ''), null, 15000), 'a no comes back to the one who asked');
} finally {
  assert(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(summary());
  for (const br of browsers) await br.close();
}
