// End-to-end check: Sinchon's live café. Two players in the café; one steps
// up to the mic (a fake microphone) and sings, the other hears it; mute shows
// on the listener's side; the listener joins the line; the singer steps down
// and the voice stops. Someone outside the café never gets the voice.
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/live-cafe.mjs http://localhost:4173/ [screenshot dir]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:4173/';
const S = process.argv[3] || null;
const assert = (ok, msg) => { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } };
const ROOM = 'e2elive' + Math.random().toString(36).slice(2, 8);
const browsers = [];
const errors = [];
async function join(name) {
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'], ...(process.env.E2E_PROXY ? { proxy: { server: process.env.E2E_PROXY, bypass: 'localhost,127.0.0.1' } } : {}) });
  browsers.push(browser);
  const ctx = await browser.newContext({ viewport: { width: 900, height: 640 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('dialog', (d) => d.accept());
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&room=' + ROOM);
  await page.click('#next-btn');
  await page.fill('#nickname', name);
  await page.waitForSelector('#start-btn:not([disabled])', { state: 'visible' });
  await page.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
  await page.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
  if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
  return page;
}
const [singer, fan, outside] = await Promise.all([join('Singer'), join('Fan'), join('Outside')]);
for (const p of [singer, fan]) await p.evaluate(() => __mk.enter('open-mic-live-cafe'));
await singer.waitForTimeout(4000);
console.log('in room:', await singer.evaluate(() => __mk.room()), 'people near:', await singer.evaluate(() => __mk.near()));
const spot = await singer.evaluate(() => __mk.live() && null) ?? null;
void spot;
// Walk to the mic and turn it on.
const mic = await singer.evaluate(() => { const r = __mk.room(); return r.id; });
assert(mic === 'open-mic-live-cafe', 'inside the live café');
await singer.evaluate(() => { const v = window.__mk; v.place(0, -5.5 + 1.5); });
await singer.waitForTimeout(500);
const label = await singer.evaluate(() => __mk.action());
console.log('action at the mic:', label);
assert(label === '🎤 Turn on the mic and sing', 'the mic action');
await singer.evaluate(() => __mk.act());
await singer.waitForFunction(() => __mk.live()?.performing, null, { timeout: 10000 }).catch(() => {});
await fan.waitForFunction(() => __mk.live()?.playing, null, { timeout: 20000 }).catch(() => {});
const s1 = await singer.evaluate(() => __mk.live()), f1 = await fan.evaluate(() => __mk.live());
console.log('singer:', s1, '\nfan:', f1);
assert(s1?.performing && s1.sent.includes('connected'), 'singing, the voice connected to the fan');
assert(f1?.heard === 'connected' && f1.playing && f1.stage, 'the fan hears the singer');
if (S) { await fan.screenshot({ path: S + '/live-fan.png' }); await singer.screenshot({ path: S + '/live-singer.png' }); }
// Mute shows on the fan's side.
await singer.evaluate(() => __mk.liveVoice().setMuted(true));
await fan.waitForFunction(() => __mk.live()?.stageMuted, null, { timeout: 8000 }).catch(() => {});
assert((await fan.evaluate(() => __mk.live())).stageMuted, 'the fan sees the mic muted');
await singer.evaluate(() => __mk.liveVoice().setMuted(false));
// The fan gets in line; the singer sees a timer.
await fan.evaluate(() => __mk.liveVoice().joinLine());
await singer.waitForFunction(() => __mk.live()?.line.length === 1, null, { timeout: 8000 }).catch(() => {});
const s2 = await singer.evaluate(() => __mk.live());
console.log('singer with a line:', s2.panel);
assert(s2.line.length === 1 && /left/.test(s2.panel), 'the singer sees one waiting and the time left');
// The player on the street never got an offer.
assert((await outside.evaluate(() => __mk.live())) === null, 'outside the café: no voice at all');
// Step off the stage: the mic turns off and the fan stops hearing.
await singer.evaluate(() => __mk.place(0, 2));
await fan.waitForFunction(() => !__mk.live()?.stage, null, { timeout: 8000 }).catch(() => {});
const s3 = await singer.evaluate(() => __mk.live()), f3 = await fan.evaluate(() => __mk.live());
console.log('after stepping off:', s3, f3);
assert(!s3.performing && !f3.stage && !f3.playing, 'stepping off ends the song for everyone');
console.log('errors', errors);
assert(!errors.length, 'no page errors');
await Promise.all(browsers.map((b) => b.close()));
