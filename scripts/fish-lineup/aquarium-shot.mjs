import { chromium } from 'playwright';
const [,, url, out] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(url + '?debug&room=aqshot' + Math.random().toString(36).slice(2, 7));
await p.click('#next-btn'); await p.fill('#nickname', 'Shot');
await p.waitForSelector('#start-btn:not([disabled])', { state: 'visible', timeout: 120000 });
await p.evaluate(() => setTimeout(() => document.getElementById('start-btn').click(), 0));
await p.waitForSelector('#hud:not([hidden])', { timeout: 180000 });
if (await p.isVisible('#welcome-panel')) await p.click('#welcome-close');
await p.waitForFunction(() => window.__mk, null, { timeout: 60000 });
await p.evaluate(() => __mk.enter('konext-aquarium'));
await p.waitForTimeout(8000);
const me = await p.evaluate(() => __mk.me());
console.log('me', me);
const shots = JSON.parse(process.argv[4] || '[]');
let i = 0;
for (const [dx, dz, ry] of shots) {
  await p.evaluate(([x, z, r]) => { __mk.place(x, z); __mk.face(r); }, [me[0] + dx, me[1] + dz, ry]);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: out.replace('.png', `-${i++}.png`) });
}
await b.close();
