// Modu Land's balloon clown (풍선 삐에로): one of our usual NPCs in a
// clown's colours, standing tall on big platform shoes by Main Street. Talk
// to them and pay a little, and they twist you a balloon: a sword or a dog
// to hold, or a crown to wear (held 'balloon:<kind>', so others see it too).
// A balloon lasts a few minutes; in its last seconds it shrinks as the air
// goes out, then it's gone.
import * as THREE from 'three';
import { makeNpc, say } from '../core/npcs.js';
import { CLOWN } from '../core/park-rides.js';
import { BALLOONS } from '../core/held.js';
import { t } from '../core/i18n.js';

export const BALLOON_PRICE = 1000; // won
export const BALLOON_LIFE_MS = 5 * 60 * 1000;
export const DEFLATE_MS = 20 * 1000; // the last stretch, shrinking
export const STILT = 0.5; // m the platform shoes lift the clown
const MAKE_MS = 1800; // twisting time
const NEAR = 2.8;
const ICON = { sword: '🗡️', dog: '🐶', crown: '👑' };
const LOOK = { model: 'basic', shirt: 'butter', pants: 'indigo', shoes: 'red', hair: 'chestnut', skin: 'light', dye: 'red', hairStyle: 'afro', head: null, face: null, ear: null, neck: null, back: null, skirt: null, tee: null };
const DONE = {
  sword: ['짠! 풍선 칼이에요!', 'jjan! pungseon kariyeyo!', 'Ta-da! A balloon sword!'],
  dog: ['짠! 풍선 강아지예요!', 'jjan! pungseon gangajiyeyo!', 'Ta-da! A balloon puppy!'],
  crown: ['짠! 풍선 왕관이에요!', 'jjan! pungseon wanggwanieyo!', 'Ta-da! A balloon crown!'],
};
const HELLO = [['풍선 만들어 줄까요?', 'pungseon mandeureo julkkayo?', 'Shall I make you a balloon?'], ['뭐 만들어 줄까요?', 'mwo mandeureo julkkayo?', 'What shall I make you?']];

// The held entry for a balloon, and its held kind (pure: main.js uses these
// while it starts up). A saved one past its time is gone.
export function restoreBalloon(h, now = Date.now()) {
  if (h?.kind !== 'balloon' || !BALLOONS.includes(h.b) || !(h.until > now)) return null;
  return { kind: 'balloon', b: h.b, until: Math.min(h.until, now + BALLOON_LIFE_MS), sips: 1, name: String(h.name || '').slice(0, 40) };
}
export const balloonKind = (h) => (h?.kind === 'balloon' ? 'balloon:' + h.b : null);
// How full a balloon is: 1 until its last stretch, then down to 0.
export const balloonFill = (h, now = Date.now()) => Math.max(0, Math.min(1, (h.until - now) / DEFLATE_MS));

// The clown's platform shoes: two tall red blocks from under the legs down
// to the ground, each with a round toe and a white sole (metres, on the
// character's root, which stands STILT up; the clown only stands, so the
// shoes needn't follow the feet).
function stiltShoes() {
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: '#e0402f' }), white = new THREE.MeshLambertMaterial({ color: '#fffaf3' });
  for (const x of [-0.1, 0.1]) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.15, STILT, 0.2), red);
    block.position.set(x, -STILT / 2 + 0.02, 0);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), red);
    toe.scale.set(0.9, 0.75, 1.3);
    toe.position.set(x, -STILT + 0.1, 0.14);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.4), white);
    sole.position.set(x, -STILT + 0.025, 0.06);
    g.add(block, toe, sole);
  }
  return g;
}
// A red nose and a little striped cone hat with a pompom (head units).
function clownHead() {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshLambertMaterial({ color: c });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), m('#ff2e3a'));
  nose.position.set(0, 0.0, 0.34);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 14), m('#8fd0ff'));
  hat.position.set(0.08, 0.5, -0.02);
  hat.rotation.z = -0.25;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.05, 14), m('#fffaf3'));
  band.position.set(0.04, 0.35, -0.02);
  band.rotation.z = -0.25;
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), m('#ff5f9e'));
  pom.position.set(0.12, 0.67, -0.02);
  g.add(nose, hat, band, pom);
  return g;
}

export function createBalloonClown(game) {
  const { $, shop, wallet } = game;
  let clown = null, making = null, warned = false;
  const label = () => '🎈 ' + t('clown.name');

  return {
    // Once per Modu Land room: the clown, on their shoes.
    spawn(built) {
      if (!built.themepark || built.island) return null; // (Modu Land's island has no plaza for the clown)
      if (!built.clownNpc) {
        const o = makeNpc($('labels'), label(), { ...game.randomLook(), ...LOOK });
        o.ch.root.add(stiltShoes());
        o.ch.addProp('head', clownHead());
        o.ch.root.position.set(CLOWN.x, STILT, CLOWN.z);
        o.ch.root.rotation.y = CLOWN.ry;
        o.labelY = 1.55 + STILT;
        built.scene.add(o.ch.root);
        built.clownNpc = o;
      }
      clown = built.clownNpc;
      return clown;
    },
    leave() { clown = null; making = null; },
    relabel() { if (clown) clown.tag.textContent = label(); },
    // The balloons on offer while you stand by the clown.
    actions(p) {
      if (!clown || making) return [];
      const r = clown.ch.root.position;
      if (Math.hypot(p.x - r.x, p.z - r.z) > NEAR) return [];
      return BALLOONS.map((b) => ({
        key: 'balloon:' + b,
        label: `${ICON[b]} ${t('balloon.' + b)} · 🪙 ${BALLOON_PRICE.toLocaleString()}`,
        run: () => this.buy(b),
      }));
    },
    buy(b) {
      if (!clown || making || !game.handReady()) return;
      const name = t('balloon.' + b);
      if (!wallet.spend(BALLOON_PRICE, { name: { en: 'Balloon ' + b }, at: { en: 'Modu Land', ko: '모두랜드' } })) { shop.toast(t('balloon.poor', { n: BALLOON_PRICE })); return; }
      game.refreshWallet();
      game.action = game.STALE;
      making = b;
      clown.ch.play('clap');
      say(clown, $('labels'), HELLO[Math.floor(Math.random() * HELLO.length)]);
      setTimeout(() => {
        making = null;
        if (!clown) return;
        clown.ch.wave();
        say(clown, $('labels'), DONE[b]);
        game.holdNew({ kind: 'balloon', b, until: Date.now() + BALLOON_LIFE_MS, sips: 1, name });
        warned = false;
        shop.toast(t('balloon.got', { name, n: BALLOON_LIFE_MS / 60000 }));
        game.action = game.STALE;
      }, MAKE_MS);
    },
    // Every frame: the clown (in the park), and a held balloon losing its air
    // (anywhere: it goes down wherever you carry it).
    tick(dt, inPark, camera, w, h, placeLabels) {
      if (clown && inPark) {
        clown.ch.animate(dt, 0);
        clown.ch.root.position.y = STILT + Math.abs(Math.sin(performance.now() / 380)) * 0.03; // a little bounce on the shoes
        placeLabels(clown, camera, w, h);
      }
      const held = game.held;
      if (held?.kind !== 'balloon') return;
      const k = balloonFill(held);
      const o = game.me.heldObject;
      if (o) {
        if (o.userData.full == null) o.userData.full = o.scale.x;
        o.scale.setScalar(o.userData.full * (0.3 + 0.7 * k));
      }
      if (k < 1 && !warned) { warned = true; shop.toast(t('balloon.deflating', { name: held.name })); }
      if (k <= 0) { game.setHeld(null); shop.toast(t('balloon.gone', { name: held.name })); }
    },
    hideLabels() { if (clown) { clown.tag.style.display = 'none'; clown.bubble?.remove(); clown.bubble = null; } },
  };
}
