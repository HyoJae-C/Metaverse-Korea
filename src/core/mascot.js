import * as THREE from 'three';

// A big plush animal head (a mascot costume) for the square's guide, so the
// guide stands out from players at a glance. Built in the chibi head's units:
// centre at the origin, ~0.65 m wide, facing +z. The costume head is about
// 1.6 times that, sitting a little higher so it rests on the shoulders.
const m = (hex) => new THREE.MeshLambertMaterial({ color: hex });

export function makeMascotHead() {
  const g = new THREE.Group();
  const fur = m(0xffc24a), cream = m(0xfff1d6), stripe = m(0xe8892b), dark = m(0x2b2230);
  const pink = m(0xff9db0), white = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.52, 24, 18), fur);
  skull.scale.set(1, 0.92, 0.95);
  g.add(skull);

  // Round ears with a pink inside.
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), fur);
    ear.position.set(0.36 * s, 0.38, -0.02);
    ear.scale.set(1, 1, 0.55);
    g.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), pink);
    inner.position.set(0.36 * s, 0.37, 0.05);
    inner.scale.set(1, 1, 0.35);
    g.add(inner);
  }

  // Three stripes on the forehead.
  for (const [x, w] of [[-0.13, 0.05], [0, 0.06], [0.13, 0.05]]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.04), stripe);
    st.position.set(x, 0.33, 0.38);
    st.rotation.x = -0.75;
    g.add(st);
  }

  // Muzzle, nose and a smile.
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), cream);
  muzzle.position.set(0, -0.14, 0.38);
  muzzle.scale.set(1.25, 0.85, 0.7);
  g.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), dark);
  nose.position.set(0, -0.07, 0.52);
  nose.scale.set(1.3, 0.8, 0.8);
  g.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 6, 16, Math.PI), dark);
  smile.position.set(0, -0.15, 0.51);
  smile.rotation.z = Math.PI;
  g.add(smile);

  // Big shiny eyes and pink cheeks.
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), dark);
    eye.position.set(0.17 * s, 0.08, 0.44);
    eye.scale.set(0.9, 1.15, 0.5);
    g.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), white);
    shine.position.set(0.17 * s + 0.025, 0.12, 0.48);
    g.add(shine);
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), pink);
    cheek.position.set(0.3 * s, -0.08, 0.41);
    cheek.rotation.y = 0.6 * s;
    g.add(cheek);
  }

  g.position.y = 0.12;
  g.scale.setScalar(1.05);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
