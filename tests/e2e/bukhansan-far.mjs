// Bukhansan from elsewhere: is it drawn where it can't be seen, and is it
// there where it should be? (Yozi 2026-11-27.) Prints, for places further
// and further away, whether the mountain's module is loaded, how much of it
// is being drawn (triangles handed to the renderer), and the whole frame.
//
//   npm run build && npx vite preview --port 4173
//   node tests/e2e/bukhansan-far.mjs http://localhost:4173/
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { useFakeRealtime } from './fake-realtime.mjs';

const url = process.argv[2] || 'http://localhost:4173/';
const R = new URL('../../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R), 'utf8'));
const off = (id) => region.districts.find((d) => d.id === id).offset;
const [bx, bz] = off('bukhansan');
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
await useFakeRealtime(ctx, 'bukhansan-far');
const page = await ctx.newPage();
const errors = [], chunks = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (/bukhansan/.test(r.url())) chunks.push(r.url().split('/').pop().replace(/-[\w-]{8}\.js$/, '.js')); });
let failed = 0;
const assert = (ok, msg) => { console.log(`${ok ? 'ok' : 'FAIL'} ${msg}`); if (!ok) failed++; };
await page.goto(url + (url.includes('?') ? '&' : '?') + 'debug&weather=clear&room=e2ebukfar' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn');
await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 60000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
// What of the mountain is handed to the renderer: its meshes that are visible (and not hidden as far), in triangles.
const measure = () => page.evaluate(() => {
  const g = __mk.bukhan?.group;
  let tris = 0, meshes = 0;
  const walk = (o) => {
    if (!o.visible) return;
    if (o.isMesh && o.geometry) { const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; tris += n * (o.isInstancedMesh ? o.count : 1); meshes++; }
    for (const k of o.children) walk(k);
  };
  if (g) walk(g);
  const r = __mk.renderInfo?.() || {};
  return { loaded: !!g, shown: !!g && g.visible, meshes, tris: Math.round(tris), frameTris: r.frameTris, calls: r.calls };
});
const at = async (name, x, z, wait = 1800) => {
  await page.evaluate(([px, pz]) => __mk.goto(px, pz, 0), [x, z]);
  await page.waitForTimeout(wait);
  const m = await measure();
  console.log(`${name.padEnd(34)} loaded ${m.loaded ? 'yes' : 'no '}  drawn ${String(m.meshes).padStart(3)} meshes ${String(m.tris).padStart(7)} tris   frame ${String(m.frameTris).padStart(7)} tris ${String(m.calls).padStart(4)} calls`);
  return m;
};
// 1) Elsewhere in the city, before ever going near: nothing of it is loaded.
for (const id of ['seongsu', 'bukchon', 'gangnam', 'yeouido', 'hongdae', 'magok'].filter((d) => region.districts.some((q) => q.id === d))) {
  const [x, z] = off(id);
  const m = await at(`${id} (${Math.round(Math.hypot(x - bx, z - bz))} m away)`, x, z);
  assert(!m.loaded, `${id}: the mountain is not loaded`);
}
assert(!chunks.some((c) => /bukhansan-(park|view|summit)/.test(c)), `no mountain file was downloaded elsewhere (${[...new Set(chunks)].join(', ') || 'none'})`);
// 2) Coming up to the station from the east: it loads before you can see it (the haze ends at 420 m).
const far = await at('1,200 m east of the station', bx + 1200, bz);
assert(!far.loaded, 'not loaded 1,200 m away');
const near = await at('at the station', bx, bz, 4000);
assert(near.loaded && near.tris > 20000, `at the station it is there (${near.tris} triangles)`);
// 3) Going away again: what is still drawn?
const rows = [];
for (const d of [200, 400, 600, 900, 1500, 3000]) rows.push([d, await at(`${d} m east of the station`, bx + d, bz)]);
const back = await at('Seongsu again', ...off('seongsu'));
assert(rows.find(([d]) => d === 200)[1].tris > 5000, 'still seen 200 m off (inside the haze)');
for (const [d, m] of rows) if (d >= 600) assert(m.tris === 0, `${d} m off, past the haze: none of it is drawn (${m.tris} triangles)`);
assert(back.tris === 0, `back in Seongsu none of it is drawn (${back.tris} triangles)`);
assert(errors.length === 0, 'no page errors ' + errors.join(' | '));
await browser.close();
process.exit(failed ? 1 : 0);
