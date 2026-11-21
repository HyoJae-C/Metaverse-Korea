// Haechi design drafts next to a player.
//   npx vite --port 5199 &
//   node scripts/haechi-lineup/shot.mjs "k=stone,gold,dancheong" out.png
import { chromium } from 'playwright';
const [,, q, out, w = 2400, h = 900] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('ERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('CON', m.text()); });
await p.goto(`http://localhost:5199/scripts/haechi-lineup/lineup.html?w=${w}&h=${h}&${q}`);
await p.waitForTimeout(9000);
await p.screenshot({ path: out });
await b.close();
