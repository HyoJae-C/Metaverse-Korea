// Baegundae's top, above the gate (Yozi 2026-11-27: "the view up there
// should be strong, and you should feel the wind"). In the street the haze
// ends at 420 m and far things are hidden, so from the top you saw trees and
// sky. Up the steps from the gate the top is drawn its own way, with no cut:
//
//   - the haze pulls back (core/weather.js lift, as on Seoul Dal), so the
//     mountain's own peaks stand round you;
//   - the far country stands all the way round: the real skyline (the same
//     data as the painted view, game/bukhansan-view.js paintStrip `backdrop`)
//     on a ring 900 m out: the ridges, the city, the Han;
//   - a sea of clouds lies under the peaks (it also covers where the
//     mountain's made-up outline ends);
//   - the wind: streaks blowing past, wisps of cloud over the rock, its
//     sound, and the flag flapping hard (game/bukhansan-park.js).
//
// How far "up" you are is `open` (0 at the gate, 1 near the top:
// game/bukhansan-park.js summitOpen): everything here fades in with it. Loaded by game/bukhansan-park.js when you come near
// the gate; nothing of it is in the first download.
//
//   const top = createBukhanSummit({ group, l, lowSpec, daylight, sfx });
//   top.update(p, dt, open)   p: where you are (world), open 0-1
//   top.dispose()
import * as THREE from 'three';
import { paintStrip, VIEW } from './bukhansan-view.js';

export const SUMMIT = {
  ring: 900, // m: how far out the far country stands (the camera sees 2000 m)
  low: -17, // degrees under level the ring goes down to (under about -12: the clouds)
  tall: 1.35, // the far country drawn this much taller than it is (it is 4-70 km away: true to scale it is a thin line)
  seaUnder: 90, // m under the top: the sea of clouds (under the gate and the hut too, over the valleys)
  seaR: 470, // m: how far the sea reaches; past its rim you look over it at the far country
  puffs: 110, // lumps on the sea (lowSpec: 40)
  streaks: 36, // streaks of wind round you (lowSpec: 16)
  wisps: 5, // wisps of cloud over the rock
  wind: [0.94, 0.34], // where it blows to (x, z): from the west-north-west, as it mostly does up there
  speed: 16, // m/s: the streaks
  loud: 0.16, // the wind's sound at the top
};

// The ring's geometry: a strip of a cylinder whose rows are at even angles
// from the eye (so the picture's degrees stay degrees). Bearing 0 is north
// (-z), 90 east (+x).
export function ringGeometry(R, eyeY, cols = 96, rows = 8) {
  const pos = [], uv = [], idx = [];
  for (let r = 0; r <= rows; r++) {
    const a = SUMMIT.low + ((VIEW.top - SUMMIT.low) * r) / rows, yy = eyeY + R * Math.tan((a * SUMMIT.tall * Math.PI) / 180), v = (a - VIEW.bottom) / (VIEW.top - VIEW.bottom);
    for (let c = 0; c <= cols; c++) {
      const b = (c / cols) * Math.PI * 2;
      pos.push(Math.sin(b) * R, yy, -Math.cos(b) * R);
      uv.push(c / cols, v);
    }
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + cols + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); } // (seen from inside)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export function createBukhanSummit({ group, l, lowSpec = false, daylight = () => 1, sfx = () => null, url = 'regions/another-seoul/bukhansan-view.json' }) {
  const S = SUMMIT, top = l.summit, eyeY = top.y + 1.6;
  const root = new THREE.Group();
  root.name = 'bukhansan-summit-sky';
  root.position.set(l.x + top.at[0], 0, l.z + top.at[1]); // (l: the landmark at its world place)
  root.visible = false;
  group.add(root);
  const mats = [];
  const mat = (m, a) => { m.userData.a = a; m.userData.c = m.color.clone(); mats.push(m); return m; }; // (a: how solid at the top; c: its colour by day)

  // The far country (painted when its data comes).
  let ring = null, gone = false;
  fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error('view ' + r.status)))).then((data) => {
    if (gone) return;
    const tex = new THREE.CanvasTexture(paintStrip(data, undefined, { backdrop: true, px: lowSpec ? 5.5 : 11 }));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    ring = new THREE.Mesh(ringGeometry(S.ring, eyeY), mat(new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false, side: THREE.DoubleSide, opacity: 0 }), 1));
    ring.name = 'bukhansan-far';
    ring.renderOrder = -3;
    root.add(ring);
  }).catch((e) => console.warn('bukhansan far', e));

  // The sea of clouds: a sheet, and lumps on it that drift with the wind.
  const seaY = top.y - S.seaUnder;
  const mist = document.createElement('canvas');
  mist.width = mist.height = 256;
  { // solid in the middle, thinning to nothing at the rim; a little bluer between the lumps
    const g = mist.getContext('2d'), f = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    f.addColorStop(0, 'rgba(226,235,244,1)'); f.addColorStop(0.72, 'rgba(232,240,247,1)'); f.addColorStop(0.9, 'rgba(240,246,250,0.75)'); f.addColorStop(1, 'rgba(244,248,251,0)');
    g.fillStyle = f; g.fillRect(0, 0, 256, 256);
  }
  const mistTex = new THREE.CanvasTexture(mist);
  mistTex.colorSpace = THREE.SRGBColorSpace;
  const sheet = new THREE.Mesh(new THREE.CircleGeometry(S.seaR, 48).rotateX(-Math.PI / 2), mat(new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, fog: false, depthWrite: false, opacity: 0 }), 1));
  sheet.position.y = seaY;
  sheet.renderOrder = -2;
  root.add(sheet);
  const nP = lowSpec ? 40 : S.puffs;
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, transparent: true, fog: false, opacity: 0 }), 1), nP);
  puffs.name = 'bukhansan-cloud-sea';
  puffs.renderOrder = -1;
  puffs.frustumCulled = false;
  const puffAt = Array.from({ length: nP }, (_, i) => { const a = hash(i) * Math.PI * 2, d = 60 + Math.sqrt(hash(i + 50)) * 330; return { x: Math.cos(a) * d, z: Math.sin(a) * d, r: 18 + hash(i + 9) * 34, h: 6 + hash(i + 3) * 12, v: 0.5 + hash(i + 7) * 0.8 }; });
  root.add(puffs);

  // The wind round you: thin streaks blowing past, and wisps of cloud over the rock.
  const nS = lowSpec ? 16 : S.streaks;
  const streaks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.035), mat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, opacity: 0 }), 0.5), nS);
  streaks.name = 'bukhansan-wind';
  streaks.frustumCulled = false;
  const streakAt = Array.from({ length: nS }, (_, i) => ({ u: hash(i + 100) * 40, side: (hash(i + 200) - 0.5) * 26, up: 0.4 + hash(i + 300) * 5, len: 1.6 + hash(i + 400) * 2.6, v: 0.75 + hash(i + 500) * 0.6 }));
  const wisps = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, fog: false, opacity: 0 }), 0.13), S.wisps * 3);
  wisps.name = 'bukhansan-wisps';
  wisps.frustumCulled = false;
  const world = new THREE.Group(); // (these follow you)
  world.add(streaks, wisps);
  group.add(world);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), eul = new THREE.Euler();
  const [wx, wz] = S.wind, yaw = Math.atan2(-wz, wx); // (a plane's long side along the wind)
  let t = 0, shown = 0;

  // The wind's sound: soft noise through a filter, swelling in gusts.
  let voice = null;
  const sound = (k) => {
    const s = sfx();
    const c = k > 0.02 && s?.on ? s._ctx?.() : null;
    if (!c) { if (voice) { try { voice.src.stop(); } catch { /* already stopped */ } voice.gain.disconnect(); voice = null; } return; }
    if (!voice) {
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; } // (soft noise; the loop's seam is lost in it)
      const src = c.createBufferSource(), band = c.createBiquadFilter(), gain = c.createGain();
      src.buffer = buf; src.loop = true;
      band.type = 'bandpass'; band.frequency.value = 420; band.Q.value = 0.6;
      gain.gain.value = 0;
      src.connect(band).connect(gain).connect(c.destination);
      src.start();
      voice = { src, band, gain };
    }
    const gust = 0.6 + 0.25 * Math.sin(t * 0.7) + 0.15 * Math.sin(t * 1.9 + 1);
    voice.gain.gain.value = S.loud * k * gust;
    voice.band.frequency.value = 330 + 260 * gust;
  };

  return {
    root,
    seaY,
    get ready() { return !!ring; },
    update(p, dt, open) {
      t += dt;
      shown = open;
      const on = open > 0.003;
      root.visible = world.visible = on;
      sound(open);
      if (!on) return;
      const day = Math.max(0.16, daylight());
      for (const m of mats) { m.opacity = m.userData.a * open; if (!m.isMeshLambertMaterial) m.color.copy(m.userData.c).multiplyScalar(day); } // (unlit things dim with the day; the lit ones do by themselves)
      // the sea drifts
      for (let i = 0; i < nP; i++) {
        const a = puffAt[i], wrap = S.seaR * 0.86, x = ((((a.x + wx * t * a.v * 2.2 + wrap) % (2 * wrap)) + 2 * wrap) % (2 * wrap)) - wrap, z = ((((a.z + wz * t * a.v * 2.2 + wrap) % (2 * wrap)) + 2 * wrap) % (2 * wrap)) - wrap;
        const edge = Math.max(0, 1 - Math.hypot(x, z) / wrap); // (small at the rim, so none pops)
        m4.compose(v3.set(x, seaY + a.h * 0.25, z), q.identity(), sc.set(a.r, a.h * Math.min(1, edge * 4), a.r * 0.8));
        puffs.setMatrixAt(i, m4);
      }
      puffs.instanceMatrix.needsUpdate = true;
      // the streaks blow past where you are
      q.setFromEuler(eul.set(0, yaw, 0));
      for (let i = 0; i < nS; i++) {
        const a = streakAt[i], u = ((a.u + t * S.speed * a.v) % 40) - 20;
        m4.compose(v3.set(p.x + wx * u - wz * a.side, p.y + a.up + Math.sin(t * 2 + i) * 0.15, p.z + wz * u + wx * a.side), q, sc.set(a.len * (1 - Math.abs(u) / 20), 1, 1));
        streaks.setMatrixAt(i, m4);
      }
      streaks.instanceMatrix.needsUpdate = true;
      // wisps of cloud cross the top
      for (let i = 0; i < S.wisps; i++) {
        const u = ((hash(i + 600) * 90 + t * (5 + hash(i + 700) * 4)) % 90) - 45, side = (hash(i + 800) - 0.5) * 40, up = top.y - 3 + hash(i + 900) * 7;
        for (let k = 0; k < 3; k++) {
          m4.compose(v3.set(l.x + top.at[0] + wx * (u + k * 3.2) - wz * side, up + (k === 1 ? 0.6 : 0), l.z + top.at[1] + wz * (u + k * 3.2) + wx * side), q, sc.set(5.5 - k * 0.8, 0.7, 2.4).multiplyScalar(1 - Math.abs(u) / 45));
          wisps.setMatrixAt(i * 3 + k, m4);
        }
      }
      wisps.instanceMatrix.needsUpdate = true;
    },
    get open() { return shown; },
    dispose() { gone = true; sound(0); group.remove(root, world); },
  };
}
