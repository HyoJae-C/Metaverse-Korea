// Measuring tool (not in CI): stand at several places, look four ways, and
// list what is still drawn far away (past the fog) and what costs CPU each
// frame, to find far things that are drawn or updated for nothing
// (Yozi 2026-11-25).
//   npm run build && npx vite preview --port 4173 &
//   node tests/e2e/far-draw-audit.mjs http://localhost:4173/ out.json   (PHONE=1: a phone)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const url = process.argv[2], out = process.argv[3];
const phone = process.env.PHONE === '1';
const region = JSON.parse(readFileSync(new URL('../../public/regions/another-seoul/region.json', import.meta.url)));
const boat = JSON.parse(readFileSync(new URL('../../public/regions/another-seoul/boat-taxi.json', import.meta.url)));
const st = (id) => { const e = region.subway.stations.find((s) => s.id === id).exits; return [e.reduce((a, x) => a + x.at[0], 0) / e.length, e.reduce((a, x) => a + x.at[1], 0) / e.length]; };
const pier = (id) => boat.piers.find((p) => p.id === id).board;
const SPOTS = (process.env.SPOTS || '').split(',').filter(Boolean);
let places = [
  ['seongsu', st('seongsu-station')], ['seoul-forest', st('seoul-forest-station')], ['gangnam', st('gangnam-station')],
  ['yeouido', st('yeouinaru-station')], ['anguk-bukchon', st('anguk-station')], ['gwanghwamun', st('gwanghwamun-station')],
  ['myeongdong', st('myeongdong-station')], ['hongdae', st('hongik-univ-station')], ['jamsil', st('jamsil-station')],
  ['han-oksu-pier', pier('oksu')], ['han-yeouido-pier', pier('yeouido')], ['han-ttukseom-pier', pier('ttukseom')],
  ['dongjak', st('dongjak-station')], ['magok', st('magongnaru-station')],
];
if (SPOTS.length) places = places.filter((p) => SPOTS.includes(p[0]));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 760 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 900, height: 640 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept());
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.goto(url + '?debug&room=far' + Math.random().toString(36).slice(2, 8));
await page.click('#next-btn'); await page.fill('#nickname', 'Tester');
await page.click('#start-btn', { timeout: 90000 });
await page.waitForSelector('#hud:not([hidden])', { timeout: 90000 });
if (await page.isVisible('#welcome-panel')) await page.click('#welcome-close');
await page.waitForTimeout(3000);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
const res = [];
for (const [name, [x, z]] of places) {
  for (let i = 0; i < 2; i++) { await page.evaluate(([x, z]) => __mk.place(x, z), [x, z]); await page.waitForTimeout(5000); }
  const dirs = [];
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    await page.evaluate((yaw) => __mk.cam({ yaw }), yaw);
    await page.waitForTimeout(900);
    dirs.push(await page.evaluate(() => {
      const THREE = window.__THREE__ ? null : null;
      const scene = __mk.sceneRef();
      const info = __mk.renderInfo();
      const cam = scene.children.find((c) => c.isCamera) || null;
      const fog = scene.fog ? scene.fog.far : Infinity;
      const p = __mk.outside();
      // label: the chain of names/kinds from the scene down
      const label = (o) => { const a = []; for (let q = o; q && q !== scene; q = q.parent) a.push(q.name || q.userData?.kind || q.userData?.id || (q.isInstancedMesh ? 'inst' : q.type)); return a.reverse().slice(0, 3).join('/'); };
      const far = new Map(); let farCalls = 0, farTris = 0, noCull = 0;
      const camera = __mk.cameraRef(); camera.updateMatrixWorld();
      const F = new (scene.matrix.constructor)().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      const fr = new (__mk.frustumClass())(); fr.setFromProjectionMatrix(F);
      const root = (o) => { let q = o; while (q.parent && q.parent !== scene) q = q.parent; return q; };
      scene.traverseVisible((o) => {
        if (!(o.isMesh || o.isPoints || o.isLine) || !o.geometry) return;
        o.geometry.boundingSphere || o.geometry.computeBoundingSphere();
        const bs = o.geometry.boundingSphere; if (!bs) return;
        const c = bs.center.clone().applyMatrix4(o.matrixWorld);
        const s = o.matrixWorld.getMaxScaleOnAxis();
        let r = bs.radius * s;
        let d = Math.hypot(c.x - p.x, c.z - p.z) - r;
        if (o.isInstancedMesh) { // nearest instance
          const m = new (o.matrixWorld.constructor)(); let best = Infinity; const v = c.clone();
          for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); v.copy(bs.center).applyMatrix4(m); best = Math.min(best, Math.hypot(v.x - p.x, v.z - p.z) - bs.radius * m.getMaxScaleOnAxis()); }
          d = best;
        }
        if (!o.frustumCulled) noCull++;
        if (o.layers.test(camera.layers) && d > fog + 30 && (!o.frustumCulled || fr.intersectsObject(o))) {
          const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
          const R = root(o); const k = label(o) + (o.name ? ':' + o.name : '') + (R.position.x || R.position.z ? ' @' + Math.round(R.position.x) + ',' + Math.round(R.position.z) : '') + ' r' + (Math.round(r / 50) * 50); const e = far.get(k) || { n: 0, tris: 0, d: Infinity, noCull: 0 };
          e.n++; e.tris += n; e.d = Math.min(e.d, Math.round(d)); if (!o.frustumCulled) e.noCull++; far.set(k, e); farCalls++; farTris += n;
        }
      });
      return { info, fog, at: [p.x, p.z], farCalls, farTris: Math.round(farTris), noCull, far: [...far].sort((a, b) => b[1].n - a[1].n).slice(0, 25) };
    }));
  }
  // CPU: 3 s profile standing still
  await cdp.send('Profiler.start'); await page.waitForTimeout(3000);
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas; const cnt = new Map();
  profile.samples.forEach((s, i) => cnt.set(s, (cnt.get(s) || 0) + (dt[i] || 0)));
  for (const [id, us] of cnt) { const n = byId.get(id); const cf = n.callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber}`; self.set(k, (self.get(k) || 0) + us); }
  const total = [...cnt.values()].reduce((a, b) => a + b, 0);
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = new Map();
  for (const [id, us] of cnt) { const seen = new Set(); for (let q = id; q != null; q = parent.get(q)) { const cf = byId.get(q).callFrame; const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber}`; if (seen.has(k)) continue; seen.add(k); incl.set(k, (incl.get(k) || 0) + us); } }
  const inclTop = [...incl].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, us]) => [k, +(us / 1000).toFixed(0)]);
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, us]) => [k, +(us / 1000).toFixed(0)]);
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  res.push({ name, dirs, cpuMs: +(total / 1000).toFixed(0), top, inclTop, fps });
  console.log(name, dirs.map((d) => `${d.info.calls}c/${Math.round(d.info.frameTris / 1000)}k far ${d.farCalls}c/${Math.round(d.farTris / 1000)}k`).join(' | '), 'fps', fps);
}
writeFileSync(out, JSON.stringify(res, null, 1));
await browser.close();
