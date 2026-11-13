// The confession room (고해실) inside Myeongdong Cathedral: a small wooden
// room behind the confessional's curtain (core/cathedral-hall.js). You are
// alone in it: nobody else is in the room, and while you are here the game
// leaves multiplayer (main.js goSolo), like your own home.
//
// What you type here is not chat. It never leaves this device: it is not
// sent to other players, not sent to our server, and not written anywhere
// (no chat log, no local save). Only a bubble over your head and the
// priest's answer show, and they go when you leave. The priest behind the
// lattice answers with a few fixed, gentle lines (no AI: that would send
// the words to another server).
//
// Loaded with the room builder (game/room-kit.js), not in the first download.
//
//   const booth = new ConfessionPriest(built, layer, L, fit);
//   booth.hear(text)                  // you said something
//   booth.update(dt, camera, w, h)    // each frame inside
//   booth.reset()                     // leaving: no answer left pending
//   booth.all                         // the priest (name tag, for leaving)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch } from './cathedral-hall.js';
import { makeNpc, placeLabels } from './npcs.js';
import { showBubble } from './players.js';
import { randomLook } from '../data/appearance.js';

const SEAT_H = 0.38; // the same seat height as every chair in the game

// The room: your side (the door at +z) and the priest's, behind the lattice.
export const ROOM_CONFESSION = { w: 4.4, d: 6, h: 3 };

export const CONFESSION_LAYOUT = {
  screen: -1.2, // the wooden partition between you and the priest (z)
  window: { w: 1.0, y0: 0.85, y1: 1.75 }, // the lattice window in it
  bench: { z: -0.5 }, // your seat, facing the lattice
  priest: { x: 0, z: -2.1 }, // his chair, facing you
};

// Entered from the cathedral, back out into it (main.js enterConfession,
// backToPark). `solo`: nobody else in the room, no multiplayer.
export const CONFESSION_STORE = {
  id: 'myeongdong-confession',
  category: 'culture',
  workshop: 'confession',
  size: 'confession',
  solo: true,
  name: { en: 'Confession Room', ko: '고해성사실', ja: '告解室', zh: '告解室' },
  tagline: {
    en: 'Inside Myeongdong Cathedral: just you and the priest. Nothing you type here leaves your device.',
    ko: '명동대성당 안: 나와 신부님뿐. 여기서 친 글은 내 기기 밖으로 나가지 않아요.',
    ja: '明洞大聖堂の中：あなたと神父さまだけ。ここで書いたことは端末の外に出ません。',
    zh: '明洞大教堂里：只有你和神父。在这里输入的话不会离开你的设备。',
  },
  colors: { sign: '#4a2f20', awning: '#5b3a78', accent: '#3a2a22' },
  products: [],
};

export const CONFESSION_TEXT = {
  enter: { en: 'Go to confession', ko: '고해성사실에 들어가기', ja: '告解室に入る', zh: '进入告解室' },
  back: { en: 'Back to the cathedral', ko: '성당으로 돌아가기', ja: '聖堂に戻る', zh: '回到教堂' },
  priest: { en: 'Priest', ko: '신부님', ja: '神父さま', zh: '神父' },
  private: {
    en: '🔒 Only you are here. What you type is not sent anywhere or saved, not even on our server. When you leave, it is gone.',
    ko: '🔒 여기엔 나 혼자예요. 여기서 친 글은 어디로도 보내지거나 저장되지 않아요. 우리 서버에도요. 나가면 사라져요.',
    ja: '🔒 ここにいるのはあなただけ。書いたことはどこにも送られず、保存もされません。私たちのサーバーにもです。出ると消えます。',
    zh: '🔒 这里只有你一个人。你输入的话不会发送到任何地方，也不会被保存，包括我们的服务器。离开后就消失了。',
  },
  placeholder: {
    en: '🕯️ Speak to the priest (stays on this device)',
    ko: '🕯️ 신부님께 말하기 (내 기기 밖으로 안 나가요)',
    ja: '🕯️ 神父さまに話す（端末の外に出ません）',
    zh: '🕯️ 对神父说话（不会离开你的设备）',
  },
  greet: {
    en: 'Peace be with you. Take your time. Whatever you say stays in this room.',
    ko: '평화가 함께하길. 천천히 말해요. 여기서 한 말은 이 방 밖으로 나가지 않아요.',
    ja: 'あなたに平和がありますように。ゆっくりでいいですよ。ここで話したことは、この部屋の外に出ません。',
    zh: '愿你平安。慢慢说。你在这里说的话不会离开这个房间。',
  },
  // The priest's answers, in turn (a fresh order each visit).
  replies: [
    { en: 'I am listening. Go on, whenever you are ready.', ko: '듣고 있어요. 준비되면 이어서 말해요.', ja: '聞いていますよ。準備ができたら続けてください。', zh: '我在听。准备好了就继续说吧。' },
    { en: 'Thank you for saying it out loud. That takes courage.', ko: '소리 내어 말해 줘서 고마워요. 용기가 필요한 일이에요.', ja: '口に出してくれてありがとう。勇気のいることです。', zh: '谢谢你说出来。这需要勇气。' },
    { en: 'You are not alone in this. Many carry the same weight.', ko: '혼자가 아니에요. 같은 짐을 진 사람이 많아요.', ja: 'あなたは一人ではありません。同じ重荷を抱える人はたくさんいます。', zh: '你并不孤单。很多人背负着同样的重担。' },
    { en: 'Be gentle with yourself, as you would be with a friend.', ko: '친구에게 하듯이, 자신에게도 너그러워져요.', ja: '友だちにするように、自分にもやさしくしてあげてください。', zh: '像对待朋友那样，也温柔地对待自己吧。' },
    { en: 'Is there someone you would like to make peace with?', ko: '화해하고 싶은 사람이 있나요?', ja: '仲直りしたい人はいますか？', zh: '有没有你想和好的人？' },
    { en: 'A small step today is enough. Tomorrow is a new day.', ko: '오늘은 작은 한 걸음이면 충분해요. 내일은 새로운 날이에요.', ja: '今日は小さな一歩で十分です。明日は新しい日です。', zh: '今天迈出一小步就够了。明天又是新的一天。' },
    { en: 'Let us sit with that quietly for a moment.', ko: '잠시 그 마음과 함께 조용히 있어 봐요.', ja: 'しばらく、その気持ちと静かに向き合ってみましょう。', zh: '让我们静静地和这份心情待一会儿。' },
  ],
  // Every fourth answer: a blessing to close on (you may stay and go on).
  blessing: {
    en: 'May you find peace. Go in peace. 🕊️',
    ko: '마음에 평화가 깃들길. 평화롭게 가세요. 🕊️',
    ja: '心に平和がありますように。安心してお行きなさい。🕊️',
    zh: '愿你心中平安。平安地去吧。🕊️',
  },
};

const BLESS_EVERY = 4;

const C = {
  floor: '#6b4a34', wall: '#d8c9ae', panel: '#5a3a26', wood: '#6b4630', woodDark: '#3f281b', lattice: '#2c1c13',
  cushion: '#5b3a78', gold: '#c9a640', candle: '#fbf6ea', flame: '#ffc46b', priestWall: '#4a3a30',
};

export function buildConfessionRoom(store, ROOM, EXIT) {
  const { w, d, h } = ROOM;
  const Lo = CONFESSION_LAYOUT, S = Lo.screen, Wn = Lo.window;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1c1612');
  scene.add(new THREE.HemisphereLight(0xffe8c8, 0x3a2a20, 1.1));
  const candleLight = new THREE.PointLight(0xffc98a, 3.2, 6);
  candleLight.position.set(1.4, 1.6, -0.6);
  scene.add(candleLight);
  const priestLight = new THREE.PointLight(0xffe0b0, 2.2, 3.5); // a dim lamp on his side: he shows through the lattice
  priestLight.position.set(0, 2.1, -2.4);
  scene.add(priestLight);
  const colliders = [];
  const block = (x, z, sx, sz) => colliders.push({ p: [[x - sx / 2, z - sz / 2], [x + sx / 2, z - sz / 2], [x + sx / 2, z + sz / 2], [x - sx / 2, z + sz / 2]] });
  const b = new Batch();

  // Floor, walls facing in (seen from inside; from outside they vanish, so
  // the camera never looks at the back of a wall), a low wooden wainscot.
  b.add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), C.floor);
  for (const s of [-1, 1]) {
    b.add(new THREE.PlaneGeometry(d, h), C.wall, s * w / 2, h / 2, 0, { ry: -s * Math.PI / 2 });
    b.box(0.05, 1, d, s * (w / 2 - 0.025), 0.5, 0, C.panel);
  }
  b.add(new THREE.PlaneGeometry(w, h), C.priestWall, 0, h / 2, -d / 2); // behind the priest
  b.add(new THREE.PlaneGeometry(w, h), C.wall, 0, h / 2, d / 2, { ry: Math.PI }); // the door's wall
  b.add(new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2), C.panel, 0, h, 0); // the ceiling (from below)
  // The door you came in by: dark wood with a purple curtain drawn aside.
  b.box(1.1, 2.1, 0.06, EXIT.x, 1.05, d / 2 - 0.04, C.woodDark);
  b.box(0.45, 2.0, 0.04, EXIT.x - 0.75, 1.05, d / 2 - 0.08, C.cushion);

  // The partition: solid wood round the lattice window, full width and
  // height (the priest's side is his).
  const T = 0.08;
  const side = (w - Wn.w) / 2;
  for (const s of [-1, 1]) b.box(side, h, T, s * (Wn.w / 2 + side / 2), h / 2, S, C.wood);
  b.box(Wn.w, Wn.y0, T, 0, Wn.y0 / 2, S, C.wood);
  b.box(Wn.w, h - Wn.y1, T, 0, (Wn.y1 + h) / 2, S, C.wood);
  // The lattice: thin crossing slats (you see through the gaps).
  for (let x = -Wn.w / 2 + 0.1; x < Wn.w / 2 - 0.05; x += 0.1) b.box(0.018, Wn.y1 - Wn.y0, 0.02, x, (Wn.y0 + Wn.y1) / 2, S, C.lattice);
  for (let y = Wn.y0 + 0.1; y < Wn.y1 - 0.05; y += 0.1) b.box(Wn.w, 0.018, 0.02, 0, y, S, C.lattice);
  b.box(Wn.w + 0.12, 0.06, 0.14, 0, Wn.y0 - 0.03, S + 0.03, C.woodDark); // the sill
  b.box(Wn.w + 0.12, 0.06, 0.12, 0, Wn.y1 + 0.03, S + 0.02, C.woodDark);
  // A small cross over the window, on your side.
  b.box(0.04, 0.3, 0.02, 0, Wn.y1 + 0.35, S + 0.05, C.gold);
  b.box(0.18, 0.04, 0.02, 0, Wn.y1 + 0.4, S + 0.05, C.gold);
  block(0, S, w, T + 0.1);
  block(0, (S - d / 2) / 2, w, -d / 2 - S); // (nobody walks round to his side)

  // Your side: a kneeler with a purple cushion under the window, and a
  // short bench behind it to sit on, facing the lattice.
  const BZ = Lo.bench.z;
  b.box(1.0, 0.12, 0.3, 0, 0.06, S + 0.3, C.woodDark); // kneeler
  b.box(0.9, 0.05, 0.24, 0, 0.145, S + 0.3, C.cushion);
  b.box(1.0, 0.06, 0.25, 0, 0.85, S + 0.17, C.wood); // the armrest shelf under the window
  b.box(1.1, 0.07, 0.42, 0, SEAT_H - 0.035, BZ, C.wood); // the bench
  b.box(1.1, 0.5, 0.06, 0, SEAT_H + 0.27, BZ + 0.24, C.wood); // its back
  for (const e of [-1, 1]) b.box(0.06, SEAT_H, 0.42, e * 0.52, SEAT_H / 2, BZ, C.woodDark);
  block(0, BZ + 0.05, 1.2, 0.5);
  // A candle on a little stand in the corner, and a crucifix on the wall.
  const cx = 1.6, cz = S + 0.5;
  b.add(new THREE.CylinderGeometry(0.05, 0.08, 0.95, 8), C.woodDark, cx, 0.475, cz);
  b.add(new THREE.CylinderGeometry(0.16, 0.12, 0.05, 10), C.gold, cx, 0.97, cz);
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), C.candle, cx, 1.1, cz);
  block(cx, cz, 0.35, 0.35);
  b.box(0.05, 0.6, 0.03, -w / 2 + 0.03, 1.8, 0.6, C.woodDark, { ry: Math.PI / 2 });
  b.box(0.05, 0.05, 0.32, -w / 2 + 0.04, 1.95, 0.6, C.woodDark);

  // His side: a chair facing the lattice, a stole on a hook.
  const P = Lo.priest;
  b.box(0.5, 0.06, 0.45, P.x, SEAT_H, P.z, C.wood);
  b.box(0.5, 0.8, 0.06, P.x, SEAT_H + 0.4, P.z - 0.24, C.woodDark);
  for (const [dx, dz] of [[-0.22, -0.19], [0.22, -0.19], [-0.22, 0.19], [0.22, 0.19]]) b.box(0.05, SEAT_H, 0.05, P.x + dx, SEAT_H / 2, P.z + dz, C.woodDark);

  b.flush(scene);
  scene.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); } });

  // The candle flickers.
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4).scale(1, 1.8, 1), new THREE.MeshBasicMaterial({ color: C.flame }));
  flame.position.set(cx, 1.25, cz);
  scene.add(flame);
  let time = 0;
  const animate = (dt) => {
    time += dt;
    flame.scale.y = 1 + Math.sin(time * 9) * 0.12 + Math.sin(time * 23) * 0.06;
    candleLight.intensity = 3.2 + Math.sin(time * 7) * 0.3;
  };

  return {
    scene, products: [], colliders, clerk: null, turntable: null, room: ROOM, exit: EXIT,
    seats: [{ x: 0, z: BZ - 0.02, ry: Math.PI, stand: [0, BZ + 0.75] }],
    stations: { confession: { priest: { x: P.x, z: P.z, ry: 0, sit: true } } },
    animate,
    // The camera stays in your half of the room.
    camBlocked: (x, z) => Math.abs(x) > w / 2 - 0.25 || z > d / 2 - 0.25 || z < S + 0.15,
    confessionRoom: true,
  };
}

// A merged box for the priest's purple stole, over a black cassock.
function priestRobes() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.31, 0.56, 14), new THREE.MeshLambertMaterial({ color: '#1f1d24' }));
  robe.position.y = 0.34;
  const stole = new THREE.Mesh(mergeGeometries([
    new THREE.BoxGeometry(0.06, 0.42, 0.01).translate(-0.08, 0.42, 0.25),
    new THREE.BoxGeometry(0.06, 0.42, 0.01).translate(0.08, 0.42, 0.25),
  ]), new THREE.MeshLambertMaterial({ color: '#6b3f8f' }));
  g.add(robe, stole);
  return g;
}

// The order the answers come in: every one once before any repeats.
export function replyOrder(n, rand = Math.random) {
  const a = [...Array(n).keys()];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// What the priest says to your k-th line (k from 1): a blessing every
// BLESS_EVERY lines, else the next answer in `order`.
export function replyFor(k, order) {
  if (k % BLESS_EVERY === 0) return CONFESSION_TEXT.blessing;
  const i = k - 1 - Math.floor(k / BLESS_EVERY);
  return CONFESSION_TEXT.replies[order[i % order.length]];
}

export class ConfessionPriest {
  // fit(seat): where a seated character goes on that seat (main.js seatFit).
  constructor(built, layer, L, fit) {
    this.layer = layer;
    this.L = L;
    const P = built.stations.confession.priest;
    this.priest = makeNpc(layer, '⛪ ' + L(CONFESSION_TEXT.priest), { ...randomLook(), model: 'basic', tee: null, hair: 'black', dye: 'black', pants: 'charcoal', shirt: 'cream', skin: 'fair' });
    this.priest.ch.addProp('body', priestRobes());
    built.scene.updateMatrixWorld();
    const f = fit?.(P);
    this.priest.ch.root.position.set(f?.x ?? P.x, f?.y ?? 0, f?.z ?? P.z);
    this.priest.ch.root.rotation.y = P.ry;
    this.priest.ch.activity('sit');
    built.scene.add(this.priest.ch.root);
    this.timers = [];
    this.reset();
  }

  get all() { return [this.priest]; }

  // A new visit: a fresh order of answers, his greeting after a moment.
  reset() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    this.heard = 0;
    this.order = replyOrder(CONFESSION_TEXT.replies.length);
    this.priest.bubble?.remove();
    this.priest.bubble = null;
  }

  greet() {
    this.later(1200, CONFESSION_TEXT.greet);
  }

  // You said something: he answers a moment later. The words themselves go
  // nowhere (not even into this object: only how many lines there were).
  hear(text) {
    if (!String(text ?? '').trim()) return;
    this.heard++;
    this.later(1600 + Math.random() * 1200, replyFor(this.heard, this.order));
  }

  later(ms, line) {
    this.timers.push(setTimeout(() => showBubble(this.priest, this.layer, this.L(line), 8000, 'chat npc-say'), ms));
  }

  update(dt, camera, w, h) {
    this.priest.ch.animate(dt, 0);
    placeLabels(this.priest, camera, w, h);
  }
}
