// The show in the Opera Theater (core/opera-hall.js): the orchestra in the
// pit, the conductor on the podium, ballet dancers on the stage. One piece
// after another from the programme (data/opera-scores.js), each the way a
// real evening goes, kept short:
//
//   the house lights are up and the orchestra tunes to the oboe's A;
//   the conductor walks in, the house claps, he bows and turns to the stage;
//   the lights go down, the curtain opens, the piece is played and danced;
//   the house claps, the dancers curtsey, the conductor turns and bows;
//   the curtain closes, the lights come up, and the next piece is announced.
//
// The clock is the real time, so everyone in the hall sees and hears the
// same moment. Nobody speaks: the music is core/concert-player.js, and the
// piece's name comes up as a note on your screen. Loaded with the room
// (game/room-kit.js).
//
//   const show = new StageShow(built, layer, L, { music, toast });
//   show.enter() / show.leave()
//   show.update(dt, camera, w, h)   // each frame inside
//   show.all                        // the people with name tags
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeNpc } from './npcs.js';
import { randomLook } from '../data/appearance.js';
import { ConcertPlayer } from './concert-player.js';
import { faceParts } from './opera-hall.js';

// Seconds of each part of a piece's turn, before and after the music.
export const TURN = { tune: 4, walkIn: 5, open: 3, clap: 8, close: 4, rest: 4 };
export const lead = TURN.tune + TURN.walkIn + TURN.open; // from the turn's start to the first note
export const turnLength = (score) => lead + (score.beats * 60) / score.bpm + TURN.clap + TURN.close + TURN.rest;

export const STAGE_TEXT = {
  welcome: {
    en: '🎭 Tonight: opera and ballet. Take any free seat and enjoy. Walking only in the hall.',
    ko: '🎭 오늘의 공연: 오페라와 발레. 빈자리에 앉아 감상하세요. 극장 안에서는 걸어서만 다녀요.',
    ja: '🎭 本日の公演：オペラとバレエ。空いている席に座ってお楽しみください。劇場内は歩いてね。',
    zh: '🎭 今日演出：歌剧与芭蕾。请随意入座欣赏。剧场内请慢慢走。',
  },
  now: { en: '🎼 Now: {title} · {by} ({year})', ko: '🎼 지금 연주: {title} · {by} ({year})', ja: '🎼 ただいまの曲：{title} · {by}（{year}）', zh: '🎼 正在演奏：{title} · {by}（{year}）' },
  next: { en: '🎻 Next: {title} · {by}. The orchestra is tuning.', ko: '🎻 다음 곡: {title} · {by}. 오케스트라가 조율 중이에요.', ja: '🎻 次の曲：{title} · {by}。オーケストラが音合わせ中です。', zh: '🎻 下一首：{title} · {by}。乐团正在调音。' },
  welcomeConcert: {
    en: '🎻 Tonight: classical favourites with the orchestra. Take any free seat and enjoy. Walking only in the hall.',
    ko: '🎻 오늘의 공연: 오케스트라와 함께하는 클래식 명곡. 빈자리에 앉아 감상하세요. 홀 안에서는 걸어서만 다녀요.',
    ja: '🎻 本日の公演：オーケストラで聴くクラシック名曲。空いている席に座ってお楽しみください。ホール内は歩いてね。',
    zh: '🎻 今日演出：管弦乐团演奏古典名曲。请随意入座欣赏。音乐厅内请慢慢走。',
  },
  shh: { en: 'Shh! 🤫 No running in the theater, please.', ko: '쉿! 🤫 극장에서는 뛰지 말아 주세요.', ja: 'しーっ！🤫 劇場では走らないでね。', zh: '嘘！🤫 剧场里请不要奔跑。' },
};

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const PLAYER_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
const smooth = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
const mir = ([x, y, z]) => [x, -y, -z]; // the right arm mirrors the left (core/studio-moves.js)

// Where the show is at time t (seconds): which piece, and how far into its turn.
export function showAt(t, program) {
  const total = program.reduce((s, p) => s + turnLength(p), 0);
  let u = ((t % total) + total) % total;
  for (let i = 0; i < program.length; i++) { const len = turnLength(program[i]); if (u < len) return { i, score: program[i], u, len }; u -= len; }
  return { i: 0, score: program[0], u: 0, len: turnLength(program[0]) };
}
// The part of the turn: { k, t } with t seconds into that part.
export function partAt(score, u) {
  const music = (score.beats * 60) / score.bpm;
  const marks = [['tune', TURN.tune], ['walkIn', TURN.walkIn], ['open', TURN.open], ['play', music], ['clap', TURN.clap], ['close', TURN.close], ['rest', TURN.rest]];
  for (const [k, len] of marks) { if (u < len) return { k, t: u, len }; u -= len; }
  return { k: 'rest', t: 0, len: TURN.rest };
}

// A ballerina's tutu: a flat white skirt at the hips and a bodice.
function tutu() {
  const g = new THREE.Group();
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.52, 0.07, 18), mat('#fbfbff'));
  skirt.position.y = 0.36;
  const under = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.46, 0.05, 18), mat('#e8eaf6'));
  under.position.y = 0.32;
  const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.2, 14), mat('#fbfbff'));
  bodice.position.y = 0.49;
  g.add(skirt, under, bodice);
  return g;
}
function crown() { // a small feathered headpiece
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 5, 14).rotateX(Math.PI / 2), mat('#fbfbff'));
  band.position.y = 0.2;
  g.add(band);
  return g;
}
// The conductor's tail coat: a long-sleeved suit jacket (model suit)
// with tails behind and a white bow tie.
function tailcoat() {
  const g = new THREE.Group();
  const tails = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.03), mat('#2a2e38'));
  tails.position.set(0, 0.24, -0.2);
  tails.rotation.x = -0.12;
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.02), mat('#fbfaf6'));
  tie.position.set(0, 0.6, 0.24);
  g.add(tails, tie);
  return g;
}
const COAT_LOOK = { model: 'suit', hair: 'black', dye: 'black', pants: 'charcoal', shirt: 'charcoal', skin: 'fair', shoes: 'black' };

// The players in the pit, as one crowd: a seated body, a head, hair, and the
// instrument, merged per colour. Each sways a little in time (a group each).
function pitPlayers(scene, players) {
  const SKIN = ['#f3d2b3', '#e8bf9b', '#d9a67e'], HAIR = ['#1c1a1d', '#2e2320', '#4a3324', '#8a8580'];
  const groups = players.map((p, i) => {
    const g = new THREE.Group();
    const parts = [], tint = new THREE.Color();
    const add = (geo, color) => { // one mesh a player: the colour goes on the corners
      const q = geo.index ? geo.toNonIndexed() : geo;
      for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k);
      tint.set(color);
      const n = q.attributes.position.count, col = new Float32Array(n * 3);
      for (let j = 0; j < n; j++) col.set([tint.r, tint.g, tint.b], j * 3);
      q.setAttribute('color', new THREE.BufferAttribute(col, 3));
      parts.push(q);
    };
    const stand = p.k === 'bass' || p.k === 'timpani', y0 = stand ? 0.3 : 0.38;
    add(new THREE.CylinderGeometry(0.15, 0.2, 0.44, 7).translate(0, y0 + 0.2, 0), '#17161b');
    add(new THREE.SphereGeometry(0.2, 8, 6).translate(0, y0 + 0.62, 0), SKIN[i % SKIN.length]);
    add(new THREE.SphereGeometry(0.215, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, y0 + 0.635, -0.02), HAIR[i % HAIR.length]);
    for (const [geo, color] of faceParts(y0 + 0.62)) add(geo, color); // a face, like the house's
    if (p.k === 'violin' || p.k === 'viola') {
      const s = p.k === 'viola' ? 1.15 : 1;
      add(new THREE.BoxGeometry(0.12 * s, 0.04, 0.26 * s).rotateY(0.5).translate(-0.17, y0 + 0.42, 0.14), '#a8632c');
      add(new THREE.BoxGeometry(0.02, 0.02, 0.2).rotateY(0.5).translate(-0.27, y0 + 0.43, 0.3), '#3a2516');
      add(new THREE.CylinderGeometry(0.006, 0.006, 0.42, 4).rotateZ(Math.PI / 2 - 0.35).translate(-0.02, y0 + 0.47, 0.22), '#e9e2d0'); // the bow
    } else if (p.k === 'cello' || p.k === 'bass') {
      const s = p.k === 'bass' ? 1.45 : 1;
      add(new THREE.BoxGeometry(0.24 * s, 0.4 * s, 0.1 * s).translate(0, 0.3 * s, 0.24), '#8e4f22');
      add(new THREE.BoxGeometry(0.03, 0.34 * s, 0.03).translate(0, 0.66 * s, 0.24), '#3a2516');
      add(new THREE.CylinderGeometry(0.006, 0.006, 0.46, 4).rotateZ(Math.PI / 2).translate(0.05, 0.32 * s, 0.31), '#e9e2d0');
    } else if (p.k === 'wind') {
      add(new THREE.CylinderGeometry(0.014, 0.02, 0.4, 6).rotateX(-0.9).translate(0, y0 + 0.4, 0.2), i % 2 ? '#2a2420' : '#c9ccd1');
    } else if (p.k === 'brass') {
      add(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 6).rotateX(Math.PI / 2).translate(0, y0 + 0.56, 0.3), '#d9b45c');
      add(new THREE.ConeGeometry(0.075, 0.12, 10, 1, true).rotateX(-Math.PI / 2).translate(0, y0 + 0.56, 0.5), '#d9b45c');
    } else if (p.k === 'timpani') {
      for (const dx of [-0.42, 0.42]) {
        add(new THREE.SphereGeometry(0.34, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(dx, 0.66, 0.52), '#b8733a');
        add(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 12).translate(dx, 0.67, 0.52), '#f1ead8');
      }
    }
    g.add(new THREE.Mesh(mergeGeometries(parts), PLAYER_MAT));
    g.position.set(p.x, p.y || 0, p.z);
    g.rotation.y = p.ry;
    g.userData.k = p.k;
    scene.add(g);
    return g;
  });
  return groups;
}

// The dances. Each piece has its own (DANCES, by the score's id): a list of
// figures, each `len` bars long, danced in turn. A figure is where the
// dancers stand (a formation: stage metres across, and 0..1 of the stage's
// depth from the front) and what they do there (a step: the pose, which way
// they face, how high off the floor), by the beat.
const FORMS = {
  line: (i, n) => [(i - (n - 1) / 2) * 2.3, 0.45], // a line across
  tight: (i, n) => [(i - (n - 1) / 2) * 1.15, 0.38], // shoulder to shoulder
  ring: (i, n, ph) => { const a = (i / n) * Math.PI * 2 + ph * 0.5; return [Math.cos(a) * 3.2, 0.5 + Math.sin(a) * 0.26]; }, // a ring, turning
  queen: (i, n) => (i === 0 ? [0, 0.3] : [((i - 1) - (n - 2) / 2) * 3, 0.72]), // one before a row
  vee: (i, n) => { const k = i - (n - 1) / 2; return [k * 2.1, 0.32 + Math.abs(k) * 0.16]; },
  diagonal: (i, n) => { const k = i - (n - 1) / 2; return [k * 2, 0.5 + k * 0.14]; },
  columns: (i, n) => (i === n - 1 && n % 2 ? [0, 0.3] : [(i % 2 ? 1 : -1) * 2.6, 0.3 + Math.floor(i / 2) * 0.32]), // two files, an odd one out in front
  sweep: (i, n, ph) => [Math.sin(ph * 1.6 + i * 1.25) * 5.2, 0.25 + (i / Math.max(1, n - 1)) * 0.55], // crossing the stage, each on her own track
  advance: (i, n, ph) => [(i - (n - 1) / 2) * 1.5, 0.45 + 0.25 * Math.sin(ph * 1.6)], // a line coming forward and going back
  wedge: (i, n) => { const k = i - (n - 1) / 2; return [k * 1.9, 0.7 - Math.abs(k) * 0.2]; }, // a point towards the house
};
const up = (v) => Math.max(0, v);
const POSES = {
  // arms rounded overhead
  high: (b) => ({ spine: [-0.05, 0, 0], head: [-0.15, 0, 0], armL: [-2.0, -1.3 + 0.1 * Math.sin(b), 0], armR: mir([-2.0, -1.3 + 0.1 * Math.sin(b), 0]) }),
  // the swans' wings: arms out to the side, rising and falling
  wings: (b) => { const w = Math.sin(b * Math.PI); return { head: [0.1 - 0.1 * w, 0, 0], armL: [0, 0, 1.25 + 0.55 * w], armR: mir([0, 0, 1.25 + 0.55 * w]), foreL: [0, 0, -0.35 * w], foreR: mir([0, 0, -0.35 * w]) }; },
  // an arabesque: one leg lifted behind, leaning forward, one arm ahead
  arabesque: () => ({ spine: [0.32, 0, 0], head: [-0.25, 0, 0], legR: [1.05, 0, 0], armL: [-1.5, 0, 0], armR: mir([0.4, 0, 1.2]) }),
  // a pirouette's shape: one foot drawn up to the knee, arms rounded before her
  passe: () => ({ legR: [-0.95, 0, 0], kneeR: [1.7, 0, 0], armL: [-1.15, -0.55, 0], armR: mir([-1.15, -0.55, 0]), foreL: [0, 0, -0.5], foreR: mir([0, 0, -0.5]) }),
  // a leap: legs split, one arm ahead (k: 0 on the floor, 1 at the top)
  jete: (k) => ({ spine: [-0.1 * k, 0, 0], legL: [-1.15 * k, 0, 0], legR: [1.0 * k, 0, 0], armL: [-1.6 * k - 0.2, 0, 0.2], armR: mir([0, 0, 1.3]) }),
  // a high kick, arms overhead or out (k: 0..1; left: which leg)
  kick: (k, left, arms = 1.2) => ({ spine: [-0.12 * k, 0, 0], armL: [0, 0, arms], armR: mir([0, 0, arms]), [left ? 'legL' : 'legR']: [-1.5 * k, 0, 0] }),
  // a waltz: the body leaning from side to side, the arms following
  sway: (b) => { const w = Math.sin(b * Math.PI); return { spine: [0, 0, 0.16 * w], head: [0, 0.25 * w, 0.1 * w], armL: [0, 0, 0.9 + 0.5 * w], armR: mir([0, 0, 0.9 - 0.5 * w]), foreL: [0, 0, -0.3], foreR: mir([0, 0, -0.3]) }; },
  // the little swans: hands crossed low and linked, heads turning together
  linked: (b) => ({ head: [0.05, 0.55 * Math.sign(Math.sin(b * Math.PI)), 0], armL: [-0.45, 0, -0.35], armR: mir([-0.45, 0, -0.35]), [Math.floor(b * 2) % 2 ? 'legL' : 'legR']: [-0.55 * up(Math.sin(b * Math.PI * 2 * 2)), 0, 0] }),
  // a swan folding down over her front leg
  fold: (k = 1) => ({ spine: [0.75 * k, 0, 0], head: [0.3 * k, 0, 0], legL: [-0.5 * k, 0, 0], kneeR: [0.7 * k, 0, 0], armL: [-0.9 * k, 0, 0.5], armR: mir([-0.9 * k, 0, 0.5]) }),
  // a Valkyrie: one arm thrust high (her spear), a deep lunge, the other hand on her hip
  spear: (k = 1) => ({ spine: [-0.1, 0, 0], head: [-0.2, 0, 0], armL: [-2.75 * k, 0, 0.1], armR: mir([0, 0, 0.7]), foreR: mir([0, 0, -1.3]), legL: [-0.55 * k, 0, 0], kneeL: [0.7 * k, 0, 0], legR: [0.45 * k, 0, 0] }),
  // riding: both hands on the reins, knees lifting in turn
  gallop: (b) => { const left = Math.floor(b * 2) % 2 === 0, k = up(Math.sin(b * Math.PI * 2 * 2)); return { spine: [0.12, 0, 0], armL: [-1.1, 0, 0], armR: mir([-1.1, 0, 0]), foreL: [-0.6, 0, 0], foreR: mir([-0.6, 0, 0]), [left ? 'legL' : 'legR']: [-0.9 * k, 0, 0], [left ? 'kneeL' : 'kneeR']: [1.0 * k, 0, 0] }; },
  // a curtsey
  bow: (b, k = 1) => ({ spine: [0.55 * k, 0, 0], head: [0.25 * k, 0, 0], kneeL: [0.5 * k, 0, 0], legL: [-0.25 * k, 0, 0], armL: [0, 0, 0.9 * k], armR: mir([0, 0, 0.9 * k]) }),
  rest: () => ({ armL: [-0.35, 0, 0.25], armR: mir([-0.35, 0, 0.25]) }),
};
// The steps: ({ b: beats, k: which dancer, n: how many, into: 0..1 of the figure }) => { pose, face, lift }.
const hop = (b, h) => Math.abs(Math.sin(b * Math.PI)) * h;
const STEPS = {
  wings: ({ b }) => ({ pose: POSES.wings(b / 2), lift: hop(b, 0.05) }),
  ripple: ({ b, k }) => ({ pose: POSES.wings(b / 2 + k * 0.25) }), // the wings, one after another
  highTurn: ({ b, k, n }) => ({ pose: POSES.high(b), face: Math.atan2(-Math.sin((k / n) * Math.PI * 2 + b / 8), 1) * 0.6, lift: hop(b, 0.07) }),
  // the first dancer turns on the spot; the others frame her
  solo: ({ b, k }) => (k === 0 ? { pose: Math.floor(b / 2) % 2 ? POSES.passe() : POSES.high(b), face: b * Math.PI, lift: 0.06 } : { pose: POSES.wings(b / 2 + k * 0.25) }),
  arabesque: ({ b, k, n, into }) => ({ pose: into > 0.3 ? POSES.arabesque() : POSES.wings(b), face: (k - (n - 1) / 2) * -0.25 }),
  // arabesques taken in turn down the line, the rest waiting with open arms
  canon: ({ b, k, n }) => ({ pose: Math.floor(b / 2) % n === k || Math.floor(b / 2 + 2) % n === k ? POSES.arabesque() : POSES.wings(0.5), face: -0.5 }),
  cygnets: ({ b }) => ({ pose: POSES.linked(b), lift: Math.abs(Math.sin(b * Math.PI * 2)) * 0.04 }),
  pirouette: ({ b, k }) => { const t = (b + k * 0.5) % 4; return t < 2 ? { pose: POSES.passe(), face: t * Math.PI * 2, lift: 0.06 } : { pose: POSES.high(b) }; }, // two turns, then a breath
  jete: ({ b, k }) => { const a = up(Math.sin((b + k * 0.5) * Math.PI)); return { pose: POSES.jete(a), face: Math.cos(b * 1.6 + k * 1.25) > 0 ? 1.2 : -1.2, lift: a * 0.5 }; }, // leaping the way she travels
  fold: ({ b, k, into }) => ({ pose: k === 0 ? POSES.high(b) : POSES.fold(smooth((into - 0.15) / 0.3)), face: k === 0 ? 0 : Math.sign(k - 2.5) * -0.5 }), // the swans sink round their queen
  waltz: ({ b }) => ({ pose: POSES.sway(b), face: Math.sin(b * Math.PI * 0.5) * 0.5, lift: hop(b, 0.04) }),
  waltzTurn: ({ b, k }) => ({ pose: POSES.sway(b), face: b * Math.PI * 0.5 + k, lift: hop(b, 0.05) }), // turning as the ring turns
  battement: ({ b, k }) => ({ pose: POSES.kick(up(Math.sin(b * Math.PI)), (Math.floor(b) + k) % 2 === 0, 2.0), lift: 0.02 }), // slow high kicks, arms up, neighbours on opposite legs
  kicks: ({ b }) => ({ pose: POSES.kick(up(Math.sin(b * Math.PI * 2)), Math.floor(b) % 2 === 0), lift: Math.abs(Math.sin(b * Math.PI * 2)) * 0.04 }), // the can-can's line
  kickWave: ({ b, k }) => { const t = b - k * 0.2; return { pose: POSES.kick(up(Math.sin(t * Math.PI * 2)), Math.floor(t) % 2 === 0), lift: 0.03 }; }, // the kick running down the line
  skirts: ({ b }) => ({ pose: { spine: [0.2, 0, 0], armL: [-0.7, 0, 0.5 + 0.5 * Math.sin(b * Math.PI * 4)], armR: mir([-0.7, 0, 0.5 - 0.5 * Math.sin(b * Math.PI * 4)]), [Math.floor(b * 2) % 2 ? 'legL' : 'legR']: [-0.7, 0, 0] }, face: b * Math.PI * 0.5, lift: Math.abs(Math.sin(b * Math.PI * 2)) * 0.1 }), // running round, skirts shaken
  cartwheel: ({ b, k }) => { const t = (b + k * 0.4) % 2; return t < 1 ? { pose: POSES.kick(1, true, 2.2), face: t * Math.PI * 2, lift: Math.sin(t * Math.PI) * 0.35 } : { pose: POSES.kick(up(Math.sin(b * Math.PI * 2)), Math.floor(b) % 2 === 0) }; }, // a spinning jump, then kicks again
  ride: ({ b, k }) => ({ pose: POSES.gallop(b), face: Math.cos(b * 1.6 + k * 1.25) > 0 ? 1.3 : -1.3, lift: Math.abs(Math.sin(b * Math.PI * 2)) * 0.14 }),
  spears: ({ b, k, into }) => ({ pose: POSES.spear(smooth((into - 0.1) / 0.2) * (0.9 + 0.1 * Math.sin(b * Math.PI))), face: (k - 2) * -0.2 }),
  whirl: ({ b, k }) => ({ pose: { armL: [0, 0, 1.45], armR: mir([0, 0, 1.45]), head: [-0.2, 0, 0] }, face: b * Math.PI + k, lift: hop(b, 0.06) }), // arms flung wide, spinning
  charge: ({ b, k }) => ({ pose: (Math.floor(b) + k) % 2 ? POSES.spear(1) : POSES.jete(up(Math.sin(b * Math.PI))), lift: (Math.floor(b) + k) % 2 ? 0 : up(Math.sin(b * Math.PI)) * 0.45 }), // lunge and leap by turns
  hail: ({ b, k }) => (k === 0 ? { pose: POSES.spear(1), lift: 0.04 } : { pose: POSES.high(b), face: Math.sign(k - 2.5) * -0.6, lift: hop(b, 0.05) }), // the leader's spear up, the rest saluting her
};
// Each piece's dance: [formation, step] by turns, `len` bars each (the last one holds to the end).
export const DANCES = {
  'swan-lake': { len: 8, figs: [['line', 'wings'], ['ring', 'highTurn'], ['queen', 'solo'], ['vee', 'arabesque'], ['tight', 'cygnets'], ['diagonal', 'canon'], ['sweep', 'jete'], ['queen', 'fold'], ['line', 'ripple']] },
  'la-donna-e-mobile': { len: 4, figs: [['line', 'waltz'], ['ring', 'waltzTurn'], ['columns', 'battement'], ['vee', 'pirouette'], ['sweep', 'jete'], ['wedge', 'waltz'], ['ring', 'highTurn']] },
  'can-can': { len: 4, figs: [['tight', 'kicks'], ['advance', 'kickWave'], ['ring', 'skirts'], ['tight', 'cartwheel'], ['columns', 'battement'], ['advance', 'kicks'], ['ring', 'skirts'], ['tight', 'kickWave'], ['tight', 'kicks']] },
  'ride-of-the-valkyries': { len: 4, figs: [['sweep', 'ride'], ['wedge', 'spears'], ['ring', 'whirl'], ['diagonal', 'charge'], ['sweep', 'ride'], ['line', 'spears'], ['ring', 'whirl'], ['queen', 'hail'], ['wedge', 'spears']] },
};
const DEFAULT_DANCE = DANCES['swan-lake'];
// Where the show is in a piece's dance at beat b: the figure, the one before, and how far in.
export function figureAt(score, b) {
  const d = DANCES[score.id] || DEFAULT_DANCE, i = Math.min(d.figs.length - 1, Math.floor(Math.max(0, b) / d.len));
  return { cur: d.figs[i], prev: d.figs[Math.max(0, i - 1)], into: i === d.figs.length - 1 && b >= d.len * d.figs.length ? 1 : (Math.max(0, b) - i * d.len) / d.len, i };
}

export class StageShow {
  constructor(built, layer, L, { music, toast = null, program = null, now = () => Date.now() / 1000 } = {}) {
    const S = built.stations.stage;
    this.S = S;
    this.built = built;
    this.layer = layer;
    this.L = L;
    this.toast = toast;
    // The programme comes with the hall (stations.stage.load), when you walk in.
    this.program = program;
    this.concert = S.mode === 'concert'; // the Concert Hall: the orchestra on the stage, no curtain, no dancers
    if (!program) (S.load ? S.load() : import('../data/opera-scores.js').then((m) => m.OPERA_PROGRAM)).then((p) => { this.program = p; }).catch((e) => console.warn('scores', e));
    this.now = now;
    this.player = new ConcertPlayer(music);
    this.scene = built.scene;
    this.inside = false;
    // The conductor.
    const c = (this.conductor = makeNpc(layer, '', { ...randomLook(), ...COAT_LOOK }));
    c.ch.addProp('body', tailcoat());
    c.ch.setHeld?.('baton');
    c.labelY = S.podium.y + 1.6;
    // The pianist, for the piano pieces (a hall with a piano).
    if (S.piano) {
      const o = (this.pianist = makeNpc(layer, '', { ...randomLook(), ...COAT_LOOK }));
      o.ch.addProp('body', tailcoat());
      o.labelY = S.stage.y + 1.5;
    }
    // The dancers.
    this.dancers = Array.from({ length: this.concert ? 0 : 5 }, (_, i) => {
      const o = makeNpc(layer, '', { ...randomLook(), model: 'basic', tee: null, pants: 'cream', shirt: 'cream', hair: 'black', dye: i === 0 ? 'black' : undefined });
      o.tag.style.visibility = 'hidden';
      o.ch.addProp('body', tutu());
      o.ch.addProp('head', crown());
      o.at = [0, 0.5];
      return o;
    });
    this.all = [c, ...(this.pianist ? [this.pianist] : [])];
    for (const o of [...this.all, ...this.dancers]) { this.scene.add(o.ch.root); o.ch.setMoves(() => o.pose || null); }
    this.pit = pitPlayers(this.scene, S.players);
    this.key = '';
    this.shhT = 0;
  }

  enter() {
    this.inside = true;
    this.key = '';
    this.toast?.(this.L(this.concert ? STAGE_TEXT.welcomeConcert : STAGE_TEXT.welcome));
  }

  leave() {
    this.inside = false;
    this.player.stop();
  }

  // Trying to run in here: true when it's time to say "shh" again.
  shh() {
    const t = performance.now();
    if (t - this.shhT < 9000) return false;
    this.shhT = t;
    return true;
  }

  _say(text, score) {
    const L = this.L;
    this.toast?.(L(text).replace('{title}', L(score.title)).replace('{by}', L(score.by)).replace('{year}', score.year));
  }

  update(dt, camera, w, h) {
    if (!this.program?.length) { for (const o of this.all) { o.ch.root.visible = false; o.tag.style.display = 'none'; } return; } // (the scores are still on their way)
    const S = this.S, T = this.now(), { i, score, u } = showAt(T, this.program), part = partAt(score, u);
    const beat = 60 / score.bpm, c = this.conductor;
    this.state = { piece: score.id, part: part.k, t: part.t, notes: this.player.count };
    // Once at the start of each part.
    const key = i + part.k;
    if (key !== this.key) {
      const first = !this.key;
      this.key = key;
      if (this.inside) {
        if (part.k === 'tune') { this.player.tune(TURN.tune - 0.5); this._say(STAGE_TEXT.next, score); }
        if (part.k === 'walkIn' && !first) this.player.applause(TURN.walkIn - 0.5, 0.7);
        if (part.k === 'play') this._say(STAGE_TEXT.now, score);
        if (part.k === 'clap' && !first) this.player.applause(TURN.clap + 1.5, 1);
        if (part.k !== 'play') this.player.stop();
      }
    }
    // The house: lights, curtain, clapping.
    const playing = part.k === 'play';
    const lightK = part.k === 'tune' || part.k === 'rest' ? 1 : part.k === 'walkIn' ? 1 - 0.5 * smooth((part.t - 3) / 2) : part.k === 'open' ? 0.5 * (1 - smooth(part.t / 2)) : part.k === 'close' ? smooth(part.t / 3) * 0.8 : part.k === 'clap' ? 0.25 : 0;
    S.lights(lightK);
    const curtainK = playing ? 1 : part.k === 'open' ? smooth(part.t / TURN.open) : part.k === 'clap' ? 1 : part.k === 'close' ? 1 - smooth(part.t / (TURN.close - 0.5)) : 0;
    S.curtain(curtainK);
    S.clap(part.k === 'clap' ? Math.min(1, part.t / 0.6) * (1 - smooth((part.t - TURN.clap + 1.5) / 1.5)) : part.k === 'walkIn' ? 0.6 * (1 - smooth((part.t - 3.5) / 1)) : 0);
    // The music.
    if (playing && this.inside) this.player.play(score, part.t);
    const b = playing ? part.t / beat / (score.pulse || 1) : 0; // the conductor's beats into the piece

    // The conductor: walks in from the pit's side, bows to the house, turns
    // to the stage and beats time; turns and bows again at the end.
    // (In the Concert Hall they walk on the stage; a piano piece is the
    // pianist's: the conductor stays in the wings and the pianist comes on.)
    const solo = score.kind === 'piano' && this.pianist ? this.pianist : null, lead$ = solo || c;
    const P = solo ? { x: S.piano.bench[0], z: S.piano.bench[1], y: S.stage.y } : S.podium, side = S.wing || [S.pit.half - 0.6, S.pit.z1 - 0.7], y0 = S.wing ? S.stage.y : 0;
    let cx = P.x, cz = P.z, cy = P.y, ry = Math.PI, walking = false;
    const toP = Math.atan2(P.x - side[0], P.z - side[1]), bow = (d) => ({ spine: [0.6 * d, 0, 0], head: [0.2 * d, 0, 0] });
    // The pianist on the bench: knees bent, hands on the keys.
    const SEATED = { legL: [-1.45, 0, 0.08], legR: [-1.45, 0, -0.08], kneeL: [1.45, 0, 0], kneeR: [1.45, 0, 0] };
    const atKeys = (lift, k = 0) => ({ ...SEATED, spine: [0.1 + 0.05 * Math.sin(k * 0.7), 0, 0], armL: [-0.75 - lift * 0.25 * Math.max(0, Math.sin(k * Math.PI)), -0.12, 0], armR: mir([-0.75 - lift * 0.25 * Math.max(0, Math.sin(k * Math.PI + 1.7)), -0.12, 0]), foreL: [-0.85, 0, 0], foreR: [-0.85, 0, 0] });
    const seat = solo ? Math.PI / 2 : Math.PI; // at the place: the pianist faces the keys (+x), the conductor the orchestra
    let pose = null;
    if (part.k === 'tune') { cx = side[0]; cz = side[1]; cy = y0; ry = toP; }
    else if (part.k === 'walkIn') {
      const k = smooth(part.t / 2.6);
      cx = side[0] + (P.x - side[0]) * k; cz = side[1] + (P.z - side[1]) * k; cy = y0 + (P.y - y0) * smooth((k - 0.8) / 0.2);
      walking = k < 1;
      ry = k < 1 ? toP : part.t < 4.2 ? 0 : seat; // then faces the house, then the stage
      if (k >= 1 && part.t < 4.2) pose = bow(Math.sin(Math.min(1, (part.t - 2.6) / 1.6) * Math.PI));
      else if (k >= 1 && solo) pose = atKeys(0);
    } else if (part.k === 'open') {
      ry = seat;
      const up = smooth(part.t / TURN.open); // arms raised, ready
      pose = solo ? atKeys(0) : { armL: [-1.5 * up, -0.25, 0], armR: mir([-1.5 * up, -0.25, 0]), foreL: [-0.5 * up, 0, 0], foreR: [-0.5 * up, 0, 0] };
    } else if (playing && solo) {
      ry = seat;
      pose = atKeys(1, b * 2);
    } else if (playing) {
      // A four-beat pattern: down, in, out, up, the left hand shaping the phrase.
      const ph = (b % 1), bi = Math.floor(b) % 4, drop = Math.sin(ph * Math.PI);
      const across = [0, 0.45, -0.45, 0][bi], lift = [0.5, 0.15, 0.15, 0.6][bi];
      pose = {
        spine: [0.06 + 0.04 * drop, 0, 0.03 * Math.sin(b * Math.PI / 2)],
        armR: mir([-1.25 - lift * (1 - drop) * 0.7, -0.2 + across * (1 - ph), 0]), foreR: [-0.75 + 0.35 * drop, 0, 0],
        armL: [-1.05 - 0.3 * Math.sin(b * Math.PI / 4), -0.35, 0], foreL: [-0.6 - 0.2 * Math.sin(b * Math.PI / 8), 0, 0],
      };
    } else if (part.k === 'clap') {
      ry = part.t > 1.2 ? 0 : seat; // turns to the house and bows
      pose = part.t > 1.2 ? bow(part.t > 1.8 ? Math.max(0, Math.sin(((part.t - 1.8) / 2.6) * Math.PI)) : 0) : solo ? atKeys(0) : null;
    } else if (part.k === 'close' || part.k === 'rest') {
      const k = part.k === 'close' ? smooth(part.t / 2.6) : 1; // walks off to the side
      cx = P.x + (side[0] - P.x) * k; cz = P.z + (side[1] - P.z) * k; cy = P.y + (y0 - P.y) * smooth(k / 0.2);
      walking = k < 1; ry = toP + Math.PI;
    }
    const seated = !!pose?.kneeL;
    lead$.pose = pose;
    lead$.ch.root.position.set(cx, cy - (seated ? 0.14 : 0), cz);
    lead$.ch.root.rotation.y = ry;
    lead$.ch.animate(dt, walking ? 0.3 : 0);
    for (const o of this.all) { // (the one whose piece it is not waits out of sight)
      o.ch.root.visible = o === lead$;
      o.tag.style.display = 'none'; // (no name tags on the stage: Yozi)
    }

    // The pit: everyone leans into the beat a little while playing.
    for (let k = 0; k < this.pit.length; k++) {
      const g = this.pit[k];
      g.rotation.z = playing && !solo ? Math.sin(b * Math.PI + k * 0.9) * 0.05 : 0;
      g.rotation.x = playing && !solo && g.userData.k !== 'timpani' ? Math.sin(b * Math.PI * 0.5 + k) * 0.03 : 0;
    }

    // The dancers.
    const n = this.dancers.length, depth = S.stage.front - S.stage.back - 2.5;
    const show = part.k === 'play' || part.k === 'clap' || part.k === 'open' || part.k === 'close';
    const fig = figureAt(score, b), step = STEPS[fig.cur[1]];
    this.state.figure = fig.cur.join(':');
    this.dancers.forEach((o, k) => {
      o.ch.root.visible = show;
      if (!show) return;
      const prev = FORMS[fig.prev[0]](k, n, b / 4), cur = FORMS[fig.cur[0]](k, n, b / 4), home = FORMS.line(k, n);
      const mix = playing && fig.i > 0 ? smooth(fig.into / 0.22) : 1; // glide into each new formation
      const fx = playing ? prev[0] + (cur[0] - prev[0]) * mix : home[0], fz = playing ? prev[1] + (cur[1] - prev[1]) * mix : home[1];
      const moved = Math.hypot(fx - o.at[0], (fz - o.at[1]) * depth) / Math.max(dt, 0.001);
      o.at = [fx, fz];
      const x = fx, z = S.stage.front - 1 - fz * depth;
      let face = 0, pose = POSES.rest(), lift = 0;
      if (playing) {
        const d = step({ b, k, n, into: fig.into });
        pose = d.pose; face = d.face || 0; lift = d.lift || 0;
      } else if (part.k === 'clap') {
        const d = Math.max(0, Math.sin(((part.t - 0.8) / 2.8) * Math.PI)) * (part.t < 6.4 ? 1 : 0);
        pose = POSES.bow(0, d);
      }
      o.pose = pose;
      o.ch.root.position.set(x, S.stage.y + lift, z);
      o.ch.root.rotation.y = face;
      o.ch.animate(dt, Math.min(0.5, moved * 0.25));
    });
  }
}
