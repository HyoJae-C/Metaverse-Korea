// Clothes lineup screenshot (before/after checks of outfit shapes).
//   npx vite --port 5199 &
//   node scripts/clothes-lineup/shot.mjs "m=basic,rogue,suit-navy&yaw=0.2" out.png
import { chromium } from 'playwright';
const [,, q, out] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 4000, height: 1200 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://localhost:5199/scripts/clothes-lineup/lineup.html?' + q);
await p.waitForTimeout(9000);
await p.locator('canvas').screenshot({ path: out });
await b.close();
