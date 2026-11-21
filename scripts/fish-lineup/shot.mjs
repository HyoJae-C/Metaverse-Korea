// Fish lineup screenshot: node scripts/fish-lineup/shot.mjs "<query>" out.png
import { chromium } from 'playwright';
const [,, q, out] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 2000, height: 1200 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto(q === 'tanks' ? 'http://localhost:5199/scripts/fish-lineup/tanks.html' : 'http://localhost:5199/scripts/fish-lineup/lineup.html?' + q);
await p.waitForTimeout(5000);
await p.locator('canvas').screenshot({ path: out });
await b.close();
