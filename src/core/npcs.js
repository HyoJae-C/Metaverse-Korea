// NPCs so the streets never feel empty: passers-by who stroll along real
// streets near their home spot, and a clerk in each shop. They live only on
// this device (not synced), and say short Korean phrases with romanization
// and a translation, which doubles as a tiny Korean lesson.
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';
import { showBubble } from './players.js';

const NAMES = ['민지', '지훈', '서연', '도윤', '하은', '준서', '지아', '현우', '수빈', '예준', '다은', '시우'];
// Revised Romanization, shown next to the Hangul in missions.
export const NAME_ROMAN = {
  민지: 'Minji', 지훈: 'Jihun', 서연: 'Seoyeon', 도윤: 'Doyun', 하은: 'Haeun', 준서: 'Junseo',
  지아: 'Jia', 현우: 'Hyeonu', 수빈: 'Subin', 예준: 'Yejun', 다은: 'Daeun', 시우: 'Siu',
};

// Phrases: Korean, romanization (Revised Romanization), English.
export const PHRASES = {
  street: [
    ['안녕하세요!', 'annyeonghaseyo', 'Hello!'],
    ['반가워요!', 'bangawoyo', 'Nice to meet you!'],
    ['좋은 하루 보내세요!', 'joeun haru bonaeseyo', 'Have a nice day!'],
    ['성수동 처음이에요?', 'seongsudong cheoeumieyo?', 'Is this your first time in Seongsu?'],
    ['날씨 좋네요!', 'nalssi jonneyo!', 'Nice weather, isn’t it?'],
  ],
  welcome: [['어서 오세요!', 'eoseo oseyo', 'Welcome!']],
  library: [
    ['도서관에서는 조용히 해 주세요.', 'doseogwaneseoneun joyonghi hae juseyo', 'Please keep quiet in the library.'],
    ['책은 자유롭게 읽으세요.', 'chaegeun jayuropge ilgeuseyo', 'Feel free to read any book.'],
    ['자리는 아무 데나 앉으셔도 돼요.', 'jarineun amu dena anjeusyeodo dwaeyo', 'You can sit anywhere.'],
  ],
  museum: [
    ['국립중앙미술관에 오신 걸 환영해요. 천천히 둘러보세요.', 'gungnipjungangmisulgwane osin geol hwanyeonghaeyo. cheoncheonhi dulleoboseyo', 'Welcome to the art museum. Take your time looking around.'],
    ['그림 앞에 서면 설명을 볼 수 있어요.', 'geurim ape seomyeon seolmyeong-eul bol su isseoyo', 'Stand in front of a painting to read about it.'],
    ['그림은 눈으로만 감상해 주세요.', 'geurimeun nuneuroman gamsanghae juseyo', 'Please enjoy the paintings with your eyes only.'],
  ],
  school: [
    ['여러분, 안녕하세요! 자리에 앉으세요.', 'yeoreobun, annyeonghaseyo! jarie anjeuseyo', 'Hello, everyone! Please take a seat.'],
    ['오늘도 열심히 공부해 봐요!', 'oneuldo yeolsimhi gongbuhae bwayo!', "Let's study hard today too!"],
    ['모르는 게 있으면 물어보세요.', 'moreuneun ge isseumyeon mureoboseyo', 'Ask me if there is anything you don’t know.'],
  ],
  shop: [
    ['천천히 구경하세요!', 'cheoncheonhi gugyeonghaseyo', 'Take your time and look around!'],
    ['감사합니다!', 'gamsahamnida', 'Thank you!'],
    ['또 오세요!', 'tto oseyo', 'Please come again!'],
  ],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const phraseText = ([ko, rom, en]) => `${ko}\n${rom} · ${en}`;

const v = new THREE.Vector3();
// Puts a name tag and speech bubble over a character on screen.
export function placeLabels(o, camera, width, height) {
  const r = o.ch.root;
  v.set(r.position.x, o.labelY ?? 1.55, r.position.z).project(camera);
  const dist = camera.position.distanceTo(r.position);
  const show = r.visible && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && dist < 30;
  const sx = (v.x * 0.5 + 0.5) * width, sy = (-v.y * 0.5 + 0.5) * height;
  for (const el of [o.tag, o.bubble]) {
    if (!el) continue;
    el.style.display = show ? '' : 'none';
    // Keep a long bubble on screen when its speaker is near the edge.
    const half = el === o.bubble && show ? Math.min(el.offsetWidth / 2, width / 2 - 8) : 0;
    const x = half ? Math.max(half + 8, Math.min(width - half - 8, sx)) : sx;
    el.style.transform = `translate(-50%, -100%) translate(${x}px, ${sy - (el === o.bubble ? 24 : 0)}px)`;
  }
}

export function makeNpc(layer, name, look = randomLook()) {
  const ch = createCharacter(look);
  const tag = document.createElement('div');
  tag.className = 'nametag npc';
  tag.textContent = name;
  layer.appendChild(tag);
  return { ch, tag, bubble: null, name, talkT: 0 };
}

export function say(o, layer, phrase) {
  showBubble(o, layer, phraseText(phrase), 5000, 'chat npc-say');
}

export class StreetNpcs {
  // homes: [[x, z], ...] spots the NPCs stroll around (e.g. meeting zones).
  constructor(scene, layer, graph, homes, perHome = 2) {
    this.layer = layer;
    this.graph = graph;
    this.list = [];
    if (!graph.nodes.length) return;
    let i = 0;
    for (const [hx, hz] of homes) {
      for (let k = 0; k < perHome; k++) {
        const o = makeNpc(layer, NAMES[i++ % NAMES.length]);
        o.home = [hx, hz];
        o.node = graph.nearest(hx + (Math.random() - 0.5) * 30, hz + (Math.random() - 0.5) * 30);
        o.prev = -1;
        o.side = Math.random() < 0.5 ? -1.8 : 1.8; // keep to one side of the street
        o.speed = 1.5 + Math.random() * 0.8;
        o.pause = Math.random() * 3;
        const [x, z] = graph.nodes[o.node];
        o.ch.root.position.set(x, 0, z);
        this._next(o);
        scene.add(o.ch.root);
        this.list.push(o);
      }
    }
  }

  // Pick the next street node: a random neighbour, heading home when far away.
  _next(o) {
    const g = this.graph;
    const nbs = g.adj[o.node].map(([n]) => n).filter((n) => n !== o.prev);
    const options = nbs.length ? nbs : g.adj[o.node].map(([n]) => n);
    if (!options.length) { o.target = null; return; }
    const far = Math.hypot(g.nodes[o.node][0] - o.home[0], g.nodes[o.node][1] - o.home[1]) > 120;
    let n = pick(options);
    if (far) n = options.reduce((a, b) => (Math.hypot(g.nodes[a][0] - o.home[0], g.nodes[a][1] - o.home[1]) <
      Math.hypot(g.nodes[b][0] - o.home[0], g.nodes[b][1] - o.home[1]) ? a : b));
    o.prev = o.node;
    o.target = n;
  }

  nearest(x, z, max = 2.4) {
    let best = null, bd = max;
    for (const o of this.list) {
      const d = Math.hypot(o.ch.root.position.x - x, o.ch.root.position.z - z);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  greet(o, x, z) {
    o.talkT = 5;
    o.faceX = x; o.faceZ = z;
    o.ch.wave();
    say(o, this.layer, pick(PHRASES.street));
  }

  setVisible(on) {
    for (const o of this.list) {
      o.ch.root.visible = on;
      if (!on) { o.tag.style.display = 'none'; if (o.bubble) o.bubble.style.display = 'none'; }
    }
  }

  update(dt, camera, width, height) {
    const g = this.graph;
    for (const o of this.list) {
      const r = o.ch.root;
      if (!r.visible) continue;
      let moving = false;
      if (o.talkT > 0) {
        o.talkT -= dt;
        turnTo(r, Math.atan2(o.faceX - r.position.x, o.faceZ - r.position.z), dt);
      } else if (o.pause > 0) {
        o.pause -= dt;
      } else if (o.target != null) {
        const [ax, az] = g.nodes[o.node], [bx, bz] = g.nodes[o.target];
        const len = Math.hypot(bx - ax, bz - az) || 1;
        // Aim for the target node, shifted to our side of the street.
        const tx = bx + (-(bz - az) / len) * o.side, tz = bz + ((bx - ax) / len) * o.side;
        const dx = tx - r.position.x, dz = tz - r.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.4) {
          o.node = o.target;
          this._next(o);
          if (Math.random() < 0.15) o.pause = 1 + Math.random() * 3;
        } else {
          const step = Math.min(d, o.speed * dt);
          r.position.x += (dx / d) * step;
          r.position.z += (dz / d) * step;
          turnTo(r, Math.atan2(dx, dz), dt);
          moving = true;
        }
      }
      o.ch.animate(dt, moving ? o.speed / 12 : 0);
      placeLabels(o, camera, width, height);
    }
  }
}

function turnTo(r, ry, dt) {
  let d = ry - r.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  r.rotation.y += d * Math.min(1, dt * 8);
}
