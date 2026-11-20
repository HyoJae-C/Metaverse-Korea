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
import { makeNpc, placeLabels } from './npcs.js';
import { randomLook } from '../data/appearance.js';
import { ConcertPlayer } from './concert-player.js';
import { OPERA_PROGRAM } from '../data/opera-scores.js';

// Seconds of each part of a piece's turn, before and after the music.
export const TURN = { tune: 4, walkIn: 5, open: 3, clap: 8, close: 4, rest: 4 };
export const lead = TURN.tune + TURN.walkIn + TURN.open; // from the turn's start to the first note
export const turnLength = (score) => lead + (score.beats * 60) / score.bpm + TURN.clap + TURN.close + TURN.rest;

export const STAGE_TEXT = {
  conductor: { en: 'Conductor', ko: '지휘자', ja: '指揮者', zh: '指挥' },
  welcome: {
    en: '🎭 Tonight: opera and ballet. Take any free seat and enjoy. Walking only in the hall.',
    ko: '🎭 오늘의 공연: 오페라와 발레. 빈자리에 앉아 감상하세요. 극장 안에서는 걸어서만 다녀요.',
    ja: '🎭 本日の公演：オペラとバレエ。空いている席に座ってお楽しみください。劇場内は歩いてね。',
    zh: '🎭 今日演出：歌剧与芭蕾。请随意入座欣赏。剧场内请慢慢走。',
  },
  now: { en: '🎼 Now: {title} · {by} ({year})', ko: '🎼 지금 연주: {title} · {by} ({year})', ja: '🎼 ただいまの曲：{title} · {by}（{year}）', zh: '🎼 正在演奏：{title} · {by}（{year}）' },
  next: { en: '🎻 Next: {title} · {by}. The orchestra is tuning.', ko: '🎻 다음 곡: {title} · {by}. 오케스트라가 조율 중이에요.', ja: '🎻 次の曲：{title} · {by}。オーケストラが音合わせ中です。', zh: '🎻 下一首：{title} · {by}。乐团正在调音。' },
  shh: { en: 'Shh! 🤫 No running in the theater, please.', ko: '쉿! 🤫 극장에서는 뛰지 말아 주세요.', ja: 'しーっ！🤫 劇場では走らないでね。', zh: '嘘！🤫 剧场里请不要奔跑。' },
};

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const smooth = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
const mir = ([x, y, z]) => [x, -y, -z]; // the right arm mirrors the left (core/studio-moves.js)

// Where the show is at time t (seconds): which piece, and how far into its turn.
export function showAt(t, program = OPERA_PROGRAM) {
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
// The conductor's tail coat.
function tailcoat() {
  const g = new THREE.Group();
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.3, 14), mat('#17161b'));
  coat.position.y = 0.47;
  const tails = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.03), mat('#17161b'));
  tails.position.set(0, 0.24, -0.2);
  tails.rotation.x = -0.12;
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.02), mat('#fbfaf6'));
  shirt.position.set(0, 0.5, 0.225);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.02), mat('#fbfaf6'));
  tie.position.set(0, 0.6, 0.24);
  g.add(coat, tails, shirt, tie);
  return g;
}

// The players in the pit, as one crowd: a seated body, a head, hair, and the
// instrument, merged per colour. Each sways a little in time (a group each).
function pitPlayers(scene, players) {
  const SKIN = ['#f3d2b3', '#e8bf9b', '#d9a67e'], HAIR = ['#1c1a1d', '#2e2320', '#4a3324', '#8a8580'];
  const groups = players.map((p, i) => {
    const g = new THREE.Group();
    const parts = new Map();
    const add = (geo, color) => { const q = geo.index ? geo.toNonIndexed() : geo; for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k); if (!parts.has(color)) parts.set(color, []); parts.get(color).push(q); };
    const stand = p.k === 'bass' || p.k === 'timpani', y0 = stand ? 0.3 : 0.38;
    add(new THREE.CylinderGeometry(0.15, 0.2, 0.44, 7).translate(0, y0 + 0.2, 0), '#17161b');
    add(new THREE.SphereGeometry(0.2, 8, 6).translate(0, y0 + 0.62, 0), SKIN[i % SKIN.length]);
    add(new THREE.SphereGeometry(0.215, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, y0 + 0.635, -0.02), HAIR[i % HAIR.length]);
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
    for (const [color, geos] of parts) g.add(new THREE.Mesh(mergeGeometries(geos), mat(color)));
    g.position.set(p.x, 0, p.z);
    g.rotation.y = p.ry;
    g.userData.k = p.k;
    scene.add(g);
    return g;
  });
  return groups;
}

// The dances: where each dancer is (stage metres: x across, z from the front
// towards the back, 0..1 of the stage's depth) and how she holds herself, by
// the beat. Formations change every 8 beats.
const FORMS = [
  (i, n) => [(i - (n - 1) / 2) * 2.3, 0.45], // a line across
  (i, n, ph) => { const a = (i / n) * Math.PI * 2 + ph * 0.5; return [Math.cos(a) * 3.2, 0.5 + Math.sin(a) * 0.26]; }, // a ring, turning
  (i, n) => (i === 0 ? [0, 0.3] : [((i - 1) - (n - 2) / 2) * 3, 0.72]), // the swan queen before a row
  (i, n) => { const k = i - (n - 1) / 2; return [k * 2.1, 0.32 + Math.abs(k) * 0.16]; }, // a V
];
const POSES = {
  // arms rounded overhead
  high: (b) => ({ spine: [-0.05, 0, 0], head: [-0.15, 0, 0], armL: [-2.0, -1.3 + 0.1 * Math.sin(b), 0], armR: mir([-2.0, -1.3 + 0.1 * Math.sin(b), 0]) }),
  // the swans' wings: arms out to the side, rising and falling
  wings: (b) => { const w = Math.sin(b * Math.PI); return { head: [0.1 - 0.1 * w, 0, 0], armL: [0, 0, 1.25 + 0.55 * w], armR: mir([0, 0, 1.25 + 0.55 * w]), foreL: [0, 0, -0.35 * w], foreR: mir([0, 0, -0.35 * w]) }; },
  // an arabesque: one leg lifted behind, leaning forward, one arm ahead
  arabesque: () => ({ spine: [0.32, 0, 0], head: [-0.25, 0, 0], legR: [1.05, 0, 0], armL: [-1.5, 0, 0], armR: mir([0.4, 0, 1.2]) }),
  // a curtsey
  bow: (b, k = 1) => ({ spine: [0.55 * k, 0, 0], head: [0.25 * k, 0, 0], kneeL: [0.5 * k, 0, 0], legL: [-0.25 * k, 0, 0], armL: [0, 0, 0.9 * k], armR: mir([0, 0, 0.9 * k]) }),
  rest: () => ({ armL: [-0.35, 0, 0.25], armR: mir([-0.35, 0, 0.25]) }),
};

export class StageShow {
  constructor(built, layer, L, { music, toast = null, program = OPERA_PROGRAM, now = () => Date.now() / 1000 } = {}) {
    const S = built.stations.stage;
    this.S = S;
    this.built = built;
    this.layer = layer;
    this.L = L;
    this.toast = toast;
    this.program = program;
    this.now = now;
    this.player = new ConcertPlayer(music);
    this.scene = built.scene;
    this.inside = false;
    // The conductor.
    const c = (this.conductor = makeNpc(layer, '🎼 ' + L(STAGE_TEXT.conductor), { ...randomLook(), model: 'basic', tee: null, hair: 'black', dye: 'black', pants: 'charcoal', shirt: 'charcoal', skin: 'fair' }));
    c.ch.addProp('body', tailcoat());
    c.ch.setHeld?.('baton');
    c.labelY = S.podium.y + 1.6;
    // The dancers.
    this.dancers = Array.from({ length: 5 }, (_, i) => {
      const o = makeNpc(layer, '', { ...randomLook(), model: 'basic', tee: null, pants: 'cream', shirt: 'cream', hair: 'black', dye: i === 0 ? 'black' : undefined });
      o.tag.style.visibility = 'hidden';
      o.ch.addProp('body', tutu());
      o.ch.addProp('head', crown());
      o.at = [0, 0.5];
      return o;
    });
    this.all = [c];
    for (const o of [c, ...this.dancers]) { this.scene.add(o.ch.root); o.ch.setMoves(() => o.pose || null); }
    this.pit = pitPlayers(this.scene, S.players);
    this.key = '';
    this.shhT = 0;
  }

  enter() {
    this.inside = true;
    this.key = '';
    this.toast?.(this.L(STAGE_TEXT.welcome));
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
    const P = S.podium, side = [S.pit.half - 0.6, S.pit.z1 - 0.7];
    let cx = P.x, cz = P.z, cy = P.y, ry = Math.PI, walking = false;
    c.pose = null;
    if (part.k === 'tune') { cx = side[0]; cz = side[1]; cy = 0; ry = -Math.PI / 2; }
    else if (part.k === 'walkIn') {
      const k = smooth(part.t / 2.6);
      cx = side[0] + (P.x - side[0]) * k; cz = side[1] + (P.z - side[1]) * k; cy = P.y * smooth((k - 0.8) / 0.2);
      walking = k < 1;
      ry = k < 1 ? -Math.PI / 2 : part.t < 4.2 ? 0 : Math.PI; // then faces the house, then the stage
      if (k >= 1 && part.t < 4.2) { const d = Math.sin(Math.min(1, (part.t - 2.6) / 1.6) * Math.PI); c.pose = { spine: [0.6 * d, 0, 0], head: [0.2 * d, 0, 0] }; }
    } else if (part.k === 'open') {
      const up = smooth(part.t / TURN.open); // arms raised, ready
      c.pose = { armL: [-1.5 * up, -0.25, 0], armR: mir([-1.5 * up, -0.25, 0]), foreL: [-0.5 * up, 0, 0], foreR: [-0.5 * up, 0, 0] };
    } else if (playing) {
      // A four-beat pattern: down, in, out, up, the left hand shaping the phrase.
      const ph = (b % 1), bi = Math.floor(b) % 4, drop = Math.sin(ph * Math.PI);
      const across = [0, 0.45, -0.45, 0][bi], lift = [0.5, 0.15, 0.15, 0.6][bi];
      c.pose = {
        spine: [0.06 + 0.04 * drop, 0, 0.03 * Math.sin(b * Math.PI / 2)],
        armR: mir([-1.25 - lift * (1 - drop) * 0.7, -0.2 + across * (1 - ph), 0]), foreR: [-0.75 + 0.35 * drop, 0, 0],
        armL: [-1.05 - 0.3 * Math.sin(b * Math.PI / 4), -0.35, 0], foreL: [-0.6 - 0.2 * Math.sin(b * Math.PI / 8), 0, 0],
      };
    } else if (part.k === 'clap') {
      ry = part.t > 1.2 ? 0 : Math.PI; // turns to the house and bows, twice
      const d = part.t > 1.8 ? Math.max(0, Math.sin(((part.t - 1.8) / 2.6) * Math.PI)) : 0;
      c.pose = { spine: [0.6 * d, 0, 0], head: [0.2 * d, 0, 0] };
    } else if (part.k === 'close' || part.k === 'rest') {
      const k = part.k === 'close' ? smooth(part.t / 2.6) : 1; // walks off to the side
      cx = P.x + (side[0] - P.x) * k; cz = P.z + (side[1] - P.z) * k; cy = P.y * (1 - smooth(k / 0.2));
      walking = k < 1; ry = Math.PI / 2;
    }
    c.ch.root.position.set(cx, cy, cz);
    c.ch.root.rotation.y = ry;
    c.ch.animate(dt, walking ? 0.3 : 0);
    placeLabels(c, camera, w, h);

    // The pit: everyone leans into the beat a little while playing.
    for (let k = 0; k < this.pit.length; k++) {
      const g = this.pit[k];
      g.rotation.z = playing ? Math.sin(b * Math.PI + k * 0.9) * 0.05 : 0;
      g.rotation.x = playing && g.userData.k !== 'timpani' ? Math.sin(b * Math.PI * 0.5 + k) * 0.03 : 0;
    }

    // The dancers.
    const n = this.dancers.length, depth = S.stage.front - S.stage.back - 2.5;
    const form = Math.floor(b / 8) % FORMS.length, into = (b % 8) / 8, show = part.k === 'play' || part.k === 'clap' || part.k === 'open' || part.k === 'close';
    this.dancers.forEach((o, k) => {
      o.ch.root.visible = show;
      if (!show) return;
      const line = score.kind === 'cancan'; // (the can-can: one line, shoulder to shoulder)
      const prev = line ? [(k - (n - 1) / 2) * 1.5, 0.35] : FORMS[(form + FORMS.length - 1) % FORMS.length](k, n, b / 4), cur = line ? prev : FORMS[form](k, n, b / 4);
      const mix = playing && b >= 8 ? smooth(into / 0.22) : 1; // glide into each new formation
      const fx = playing ? prev[0] + (cur[0] - prev[0]) * mix : FORMS[0](k, n)[0], fz = playing ? prev[1] + (cur[1] - prev[1]) * mix : FORMS[0](k, n)[1];
      const moved = Math.hypot(fx - o.at[0], (fz - o.at[1]) * depth) / Math.max(dt, 0.001);
      o.at = [fx, fz];
      const x = fx, z = S.stage.front - 1 - fz * depth;
      let face = 0, pose = POSES.rest(), lift = 0;
      if (playing && score.kind === 'cancan') { // a line of high kicks, one leg and then the other
        const kick = Math.max(0, Math.sin(b * Math.PI * 2)), left = Math.floor(b) % 2 === 0;
        pose = { spine: [-0.12 * kick, 0, 0], armL: [0, 0, 1.2], armR: mir([0, 0, 1.2]), [left ? 'legL' : 'legR']: [-1.5 * kick, 0, 0] };
        lift = Math.abs(Math.sin(b * Math.PI * 2)) * 0.04;
      } else if (playing) {
        if (mix < 1) pose = POSES.wings(b);
        else if (form === 0) { pose = POSES.wings(b / 2); lift = Math.abs(Math.sin(b * Math.PI)) * 0.05; }
        else if (form === 1) { pose = POSES.high(b); face = Math.atan2(-Math.sin((k / n) * Math.PI * 2 + b / 8), 1) * 0.6; lift = Math.abs(Math.sin(b * Math.PI)) * 0.07; }
        else if (form === 2) { if (k === 0) { pose = POSES.high(b); face = b * Math.PI * 0.5; lift = 0.06; } else pose = POSES.wings(b / 2 + k * 0.25); }
        else { pose = into > 0.3 ? POSES.arabesque() : POSES.wings(b); face = (k - (n - 1) / 2) * -0.25; }
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
