import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 700, height: 500 }, deviceScaleFactor: 2 })).newPage();
page.on('pageerror', (e) => console.log('err', e.message));
await page.goto('http://localhost:5173/privacy.html');
await page.evaluate(async () => {
  document.body.innerHTML = '';
  const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => import('three'));
  const { makeZooAnimal, ZOO_LOOKS } = await import('/src/core/zoo-animals.js');
  const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(700, 500); document.body.appendChild(r.domElement);
  const s = new THREE.Scene(); s.background = new THREE.Color('#cfe8f5');
  s.add(new THREE.HemisphereLight(0xffffff, 0x887766, 2.2));
  const cam = new THREE.PerspectiveCamera(35, 1.4, 0.1, 50);
  const a = makeZooAnimal('hippo', ZOO_LOOKS.hippo[0]);
  s.add(a.root);
  window.shot = (az, flick) => {
    a.flaps.forEach((e, i) => { const sd = i ? 1 : -1; e.rotation.z = -0.35 * sd + flick * sd; e.rotation.x = Math.abs(flick) * 0.25; });
    cam.position.set(Math.sin(az) * 3.6, 2.2, Math.cos(az) * 3.6); cam.lookAt(0, 1.1, 0.6); r.render(s, cam);
  };
});
for (const [n, az, f] of [['a', 0.6, 0], ['b', 0.6, 0.7], ['c', -0.2, -0.7]]) {
  await page.evaluate(([az, f]) => window.shot(az, f), [az, f]);
  await page.screenshot({ path: `/tmp/claude-0/-home-user-metaverse-korea/87535d71-76fc-53de-b1ec-36c5a5156734/scratchpad/hip-${n}.png` });
}
await browser.close();
