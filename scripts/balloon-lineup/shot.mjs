// Held-balloon lineup screenshot.
//   npx vite --port 5199 &
//   node scripts/balloon-lineup/shot.mjs "b=sword,dog&spd=0" out.png
import { chromium } from 'playwright';
const [,, q, out] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1400, height: 700 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:5199/scripts/balloon-lineup/lineup.html?' + q);
await p.waitForTimeout(9000);
await p.locator('canvas').screenshot({ path: out });
await b.close();
