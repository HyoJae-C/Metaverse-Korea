// End-to-end check: two players in the same shop; A buys a gift for B, B
// accepts it (it lands in B's bag), then B says no to a second one (A gets
// the coins back). Clothes go to the friend's items. Gifts are for friends
// only: before they're friends, A's picker offers to add B instead.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/gifts.mjs http://localhost:4173/
// With a build made with VITE_NET_PROVIDER=local, add --bridge: the two
// browsers' BroadcastChannels are joined through this script (no server).
// Otherwise realtime runs on a fake server in this script (fake-realtime.mjs),
// not the live Supabase project; E2E_REAL_REALTIME=1 uses the real one.
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

const a = await join('Gift A');
const b = await join('Gift B');
// Both in the shop, and each one sees the other there. An offer sent before
// the friend has the giver in the room's presence is dropped on arrival
// (only known people's messages are heard), so wait on both sides.
async function bothIn(shop) {
  step = `${shop}: both going in`;
  for (const page of [a, b]) await page.evaluate((id) => __mk.enter(id), shop);
  for (const page of [a, b]) await page.waitForFunction((id) => __mk.room().id === id && __mk.near() === 1, shop, { timeout: 30000 });
}
let ok = false;
try {
  // Not friends yet: no one to pick, only B to add.
  await bothIn('salam-halal');
  step = 'not friends: picker offers Add friend';
  await a.evaluate(() => __mk.product(1));
  await a.waitForSelector('#product-gift:not([hidden])', { timeout: 5000 });
  await a.click('#product-gift');
  await a.waitForSelector('.gift-add', { timeout: 5000 });
  if (await a.isVisible('.gift-person')) throw new Error('a stranger could be picked for a gift');
  if (shotDir) await a.screenshot({ path: shotDir + '/gift-not-friend.png' });
  await a.click('#gift-panel .sheet-x');
  for (const page of [a, b]) await page.evaluate(() => __mk.leave());
  await a.waitForTimeout(1500);
  await a.evaluate(() => __mk.giftFriends(['Gift B']));
  await b.evaluate(() => __mk.giftFriends(['Gift A']));
  for (const [shop, idx, check] of [['salam-halal', 1, 'bag'], ['denim-lab', 0, 'item'], ['botanic-cactus-house', 3, 'item']]) { // (the last: a pot plant, furniture for the friend's home)
    await bothIn(shop);
    step = `${shop}: A sends a gift`;
    const before = await a.evaluate(() => __mk.coins());
    const bagBefore = await b.evaluate(() => __mk.bagList().length);
    await a.evaluate((i) => __mk.product(i), idx);
    await a.waitForSelector('#product-gift:not([hidden])', { timeout: 5000 });
    await a.click('#product-gift');
    if (shotDir && check === 'bag') await a.screenshot({ path: shotDir + '/gift-picker.png' });
    await a.click('.gift-person');
    // "Spend ₩…?" (game/spend-ask.js): OK plays the tap again and pays.
    await a.click('.spend-ask:not([hidden]) .primary', { timeout: 5000 });
    step = `${shop}: B waits for the gift card`;
    await b.waitForSelector('.gift-card', { timeout: 10000 });
    if (shotDir && check === 'bag') { await b.waitForTimeout(800); await b.screenshot({ path: shotDir + '/gift-card.png' }); }
    const paid = before - (await a.evaluate(() => __mk.coins()));
    if (paid <= 0) throw new Error('A did not pay');
    step = `${shop}: B accepts`;
    await b.click('.gift-card .primary');
    await a.waitForFunction(() => __mk.gifts().out === 0, null, { timeout: 10000 });
    if ((await a.evaluate(() => __mk.coins())) !== before - paid) throw new Error('A was refunded after an accept');
    if (check === 'bag' && (await b.evaluate(() => __mk.bagList().length)) !== bagBefore + 1) throw new Error('gift not in B\'s bag');
    if (check === 'item') {
      const res = await fetch(new URL('regions/another-seoul/stores.json', url));
      const p0 = (await res.json()).stores.find((s) => s.id === shop).products[idx];
      const itemId = p0.item || p0.outfit || p0.furniture;
      if (!(await b.evaluate((x) => __mk.owns(x), itemId))) throw new Error(`${itemId} not in B's items`);
      if (p0.furniture && (await b.evaluate(() => __mk.bagList().length)) !== bagBefore) throw new Error('furniture came as a souvenir in the bag too');
    }
    await a.evaluate(() => __mk.leave());
    await b.evaluate(() => __mk.leave());
    await a.waitForTimeout(1500);
  }
  // At a stand on the street (the greenhouse's pot plants, no room): a
  // friend standing close by can be given the plant; nobody near, no button.
  step = 'street stand: A opens a rare plant alone';
  await a.evaluate(() => __mk.coins(500000));
  const goStand = async (page, off = 0) => { // (off: metres along the walk from the stand, so the two don't stand in one spot)
    await page.evaluate(() => __mk.goto(-4898.4, -662.8, 0)); // (by the greenhouse: stores.json "seoul-botanic-greenhouse")
    await page.waitForFunction(() => !!__mk.botanic?.site?.products, null, { timeout: 60000 });
    await page.evaluate((d) => { const p = __mk.botanic.site.products.find((q) => q.product.furniture === 'plant-orchid'), n = Math.hypot(p.pos.x - p.at[0], p.pos.z - p.at[1]) || 1; __mk.goto(p.pos.x + ((p.pos.x - p.at[0]) / n) * d, p.pos.z + ((p.pos.z - p.at[1]) / n) * d, 0); }, off);
  };
  const look = async (page) => { // the "Look at …" action, on its own or in the list
    await page.waitForFunction(() => (__mk.choices() || [document.getElementById('action-btn')?.textContent || '']).some((l) => l.includes('👀')), null, { timeout: 15000 });
    await page.evaluate(() => { const c = __mk.choices(); __mk.pick(c ? c.findIndex((l) => l.includes('👀')) : 0); });
    await page.waitForSelector('#product-panel:not([hidden])', { timeout: 10000 });
  };
  await goStand(a);
  await look(a);
  if (await a.isVisible('#product-gift')) throw new Error('a gift button with nobody near the stand');
  await a.keyboard.press('Escape');
  step = 'street stand: B comes, A sends the orchid';
  await goStand(b, 2.5);
  for (const page of [a, b]) await page.waitForFunction(() => __mk.near() >= 1, null, { timeout: 30000 });
  await a.waitForTimeout(1500);
  const before2 = await a.evaluate(() => __mk.coins());
  await look(a);
  await a.waitForSelector('#product-gift:not([hidden])', { timeout: 10000 });
  if (shotDir) await a.screenshot({ path: shotDir + '/gift-greenhouse.png' });
  await a.click('#product-gift');
  await a.click('.gift-person');
  await a.click('.spend-ask:not([hidden]) .primary', { timeout: 5000 });
  await b.waitForSelector('.gift-card', { timeout: 10000 });
  await b.click('.gift-card .primary');
  await a.waitForFunction(() => __mk.gifts().out === 0, null, { timeout: 10000 });
  if (!(await b.evaluate(() => __mk.owns('plant-orchid')))) throw new Error('the orchid is not in B\'s items');
  if ((await a.evaluate(() => __mk.coins())) !== before2 - 100000) throw new Error('A did not pay ₩100,000 for the orchid: ' + (before2 - await a.evaluate(() => __mk.coins())));
  if (await a.evaluate(() => __mk.owns('plant-orchid'))) throw new Error('the giver kept the orchid');
  await a.evaluate(() => __mk.goto(0, 0, 0)); await b.evaluate(() => __mk.goto(3, 0, 0));
  await a.waitForTimeout(2500);

  // Gift-wrapped with a letter: A buys it wrapped in the shop, carries the
  // box out in the bag, and hands it to B on the street from the bag.
  await bothIn('denim-lab');
  step = 'wrap: A buys it gift-wrapped with a letter';
  await a.evaluate(() => __mk.bagAdd({ kind: 'letter', sips: 2 }));
  await a.evaluate(() => __mk.product(1));
  await a.waitForSelector('#product-wrap:not([hidden])', { timeout: 5000 });
  await a.click('#product-wrap');
  await a.fill('.wrap-letter-in', 'Happy trip to Seoul!');
  if (shotDir) await a.screenshot({ path: shotDir + '/wrap-letter.png' });
  await a.click('.wrap-panel .wrap-row .primary');
  await a.click('.spend-ask:not([hidden]) .primary', { timeout: 5000 });
  await a.waitForFunction(() => __mk.bagList().some((e) => e.kind === 'wrap' && e.lt === 'Happy trip to Seoul!'), null, { timeout: 5000 });
  if (!(await a.evaluate(() => __mk.bagList().some((e) => e.kind === 'letter' && e.sips === 1)))) throw new Error('the letter did not use a sheet');
  const wrapped = await a.evaluate(() => { const e = __mk.bagList().find((x) => x.kind === 'wrap'); return e && { s: e.s, p: e.p }; });
  for (const page of [a, b]) await page.evaluate(() => __mk.leave());
  await a.waitForTimeout(1500);
  step = 'wrap: A hands it over from the bag';
  for (const page of [a, b]) await page.waitForFunction(() => __mk.near() >= 1, null, { timeout: 15000 }); // (an offer before B sees A is dropped)
  await b.waitForTimeout(1000);
  await a.evaluate(() => __mk.bagTab('bag'));
  await a.click('#bag-panel .bag-slot[title="Wrapped gift"]');
  if (shotDir) await a.screenshot({ path: shotDir + '/wrap-bag.png' });
  await a.click('#bag-panel .bag-actions .chip.on');
  await a.click('.wrap-panel .gift-person', { timeout: 5000 });
  step = 'wrap: B opens it';
  await b.waitForSelector('.gift-card', { timeout: 10000 });
  if (shotDir) { await b.waitForTimeout(600); await b.screenshot({ path: shotDir + '/wrap-card.png' }); }
  await b.click('.gift-card .primary');
  await a.waitForFunction(() => !__mk.bagList().some((e) => e.kind === 'wrap'), null, { timeout: 10000 });
  const res = await fetch(new URL('regions/another-seoul/stores.json', url));
  const p1 = (await res.json()).stores.find((s) => s.id === wrapped.s).products.find((p) => p.id === wrapped.p);
  if (!(await b.evaluate((x) => __mk.owns(x), p1.item || p1.outfit))) throw new Error('wrapped clothes not in B\'s items');
  if (shotDir) await b.screenshot({ path: shotDir + '/wrap-opened.png' });
  await b.click('.wrap-panel .sheet-x');
  // A last one, declined: A gets the coins back, and B isn't asked again
  // by A for a while (the next offer is turned down on its own).
  await bothIn('salam-halal');
  const before = await a.evaluate(() => __mk.coins());
  const sendOne = async () => { await a.evaluate(() => __mk.product(2)); await a.click('#product-gift'); await a.click('.gift-person'); await a.click('.spend-ask:not([hidden]) .primary', { timeout: 5000 }); };
  step = 'decline: A sends a gift';
  await sendOne();
  step = 'decline: B waits for the gift card';
  await b.waitForSelector('.gift-card', { timeout: 10000 });
  step = 'decline: B says no, A gets the coins back';
  await b.click('.gift-card .chip');
  await a.waitForFunction((m) => __mk.coins() === m, before, { timeout: 10000 });
  step = 'decline: A asks again and is turned down on its own';
  await sendOne();
  await a.waitForFunction((m) => __mk.gifts().out === 0 && __mk.coins() === m, before, { timeout: 10000 });
  if (await b.isVisible('.gift-card')) throw new Error('B was asked again right after saying no');
  ok = true;
} catch (e) {
  errors.push(`assertion at "${step}": ${e.message.split('\n')[0]}`);
  for (const [n, page] of [['A', a], ['B', b]]) {
    const st = await page.evaluate(() => ({ room: __mk.room(), near: __mk.near(), gifts: __mk.gifts(), coins: __mk.coins() })).catch((x) => x.message);
    errors.push(`${n} state: ${JSON.stringify(st)}`);
  }
  errors.push(...logs.slice(-40));
  if (!bridge) errors.push(...rtLog.slice(-30));
  if (shotDir) { await a.screenshot({ path: shotDir + '/fail-a.png' }); await b.screenshot({ path: shotDir + '/fail-b.png' }); }
}
for (const br of browsers) await br.close();
for (const e of errors) console.log(e);
console.log(ok ? 'PASS' : 'FAIL');
if (!bridge) console.log(summary());
process.exit(ok ? 0 : 1);
