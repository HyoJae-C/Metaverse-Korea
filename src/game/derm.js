// The skin clinic in Gangnam (Yozi 2026-11-27): lie on a treatment bed, pay
// for the 물광 (glass-skin) care, and the LED lamp over the pillow glows pink
// while sparkles rise off your face; you get up with a dewy shine that lasts
// 7 days (core/glow.js) and shows on everyone's screen (it rides in the look).
// Downloaded the first time you lie on one of its beds (main.js lazyPanel).
//
// game: { me, cam, interior, seated, myLook (get/set), wallet, shop, sfx } as
// getters, plus setLook, refreshWallet and t.
import * as THREE from 'three';
import { GLOW_PRICE, canTreat, glowDays, treated } from '../core/glow.js';
import { saveLook } from '../core/look-editor.js';
import { won } from '../core/money.js';

const TREAT_SECS = 4.5;
// The ledger's line, in every language the shop's name is in.
const NOTE_NAME = { ko: '물광 피부 관리 (7일)', en: 'Glass-skin glow (7 days)', ja: '水光肌ケア（7日）', zh: '水光肌护理（7天）' };

export function createDerm(game) {
  const { t } = game;
  let run = null; // the treatment under way: { t, seat, cam, light, beam, sparks }
  const kit = {};

  function begin() {
    const seat = game.seated;
    if (run || !seat?.derm) return;
    if (!canTreat(game.myLook)) { game.shop.toast(t('derm.again', { n: glowDays(game.myLook) })); return; }
    const note = { name: NOTE_NAME, at: game.interior?.store?.name };
    if (!game.wallet.spend(GLOW_PRICE, note)) {
      if (!game.wallet.justDeclined) game.shop.toast(t('pet.noCoins', { n: GLOW_PRICE - game.wallet.coins }));
      return;
    }
    game.refreshWallet?.();
    const scene = game.interior.scene;
    const [lx, ly, lz] = seat.lamp;
    // The lamp lit pink, a soft cone of light down onto the face, sparkles.
    const light = new THREE.Mesh(kit.disc ||= new THREE.CircleGeometry(0.23, 24).rotateX(Math.PI / 2), kit.led ||= new THREE.MeshBasicMaterial({ color: '#ff6fa8' }));
    light.position.set(lx, ly + 0.02, lz);
    const beam = new THREE.Mesh(kit.cone ||= new THREE.CylinderGeometry(0.22, 0.34, 1, 24, 1, true), kit.beamMat ||= new THREE.MeshBasicMaterial({ color: '#ff8fbd', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const faceY = 0.72;
    beam.scale.y = ly - faceY;
    beam.position.set(lx, (ly + faceY) / 2, lz);
    const n = 24, pos = new Float32Array(n * 3), life = new Float32Array(n);
    for (let i = 0; i < n; i++) life[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sparks = new THREE.Points(geo, kit.sparkMat ||= new THREE.PointsMaterial({ color: '#fff4fa', size: 0.05, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(light, beam, sparks);
    const cam = { ...game.cam };
    Object.assign(game.cam, { yaw: seat.ry, dist: 2.2, pitch: 0.8 }); // looking down at the face from the foot end
    run = { t: 0, seat, cam, light, beam, sparks, life, face: [lx, faceY, lz] };
    game.shop.toast(t('derm.start'));
  }

  function finish() {
    const r = run;
    if (!r) return;
    run = null;
    for (const o of [r.light, r.beam, r.sparks]) o.removeFromParent();
    r.sparks.geometry.dispose();
    Object.assign(game.cam, r.cam);
    const look = treated(game.myLook);
    game.myLook = look;
    saveLook(look);
    game.setLook(look); // (others get the new look, shine and all)
    game.sfx.pop?.();
    game.shop.toast(t('derm.done'), 4000);
  }

  return {
    get busy() { return !!run; },
    // The button while lying on a treatment bed.
    action() {
      if (run) return null;
      if (!canTreat(game.myLook)) {
        const n = glowDays(game.myLook);
        return { key: 'derm-on', label: '✨ ' + t('derm.left', { n }), run: () => game.shop.toast(t('derm.again', { n })) };
      }
      return { key: 'derm', label: '✨ ' + t('derm.treat', { price: won(GLOW_PRICE) }), run: begin };
    },
    tick(dt) {
      const r = run;
      if (!r) return;
      r.t += dt;
      r.beam.material.opacity = 0.16 + 0.1 * Math.sin(r.t * 6);
      const p = r.sparks.geometry.attributes.position;
      const [fx, fy, fz] = r.face;
      for (let i = 0; i < r.life.length; i++) {
        r.life[i] += dt * 0.6;
        if (r.life[i] > 1) r.life[i] -= 1;
        const a = i * 2.4 + r.t * 0.8, k = r.life[i];
        p.setXYZ(i, fx + Math.cos(a) * 0.18 * (1 - k * 0.5), fy + k * 0.7, fz + Math.sin(a) * 0.18 * (1 - k * 0.5));
      }
      p.needsUpdate = true;
      if (r.t >= TREAT_SECS) finish();
    },
    // Got up (or left) mid-treatment: it's paid for, so it's done.
    stop: finish,
  };
}
