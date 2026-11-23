// Catch the Thief played in the café itself (Yozi 2026-11-23: "as if playing
// in the game"): the players sit down at one of the café's free tables as
// themselves, each with a fan of card backs held up to the table, and the
// view is your own eyes at your chair, turning to whoever you are dealing
// with. Your own cards are in the small panel at the bottom of the screen
// (ui/board-games-ui.js, its "mini" look), seen by you alone.
//
// Nothing new goes over the net: sitting is the café chair's own "sit" flag,
// and the cards are drawn from the game the panel already follows. The host
// names the table in the start message (its option digit, 1 to 4). Games of
// more than four, or with no free table, stay in the panel.
//
// game: { interior, me, camera, canvas, scene, seated, sit(seat), stand(), seatFree(seat) }
// createBoardTable(game) → { pick(n), start(play), sync(state), end(), camera(dt), on }
import * as THREE from 'three';
import { createCharacter } from '../core/character.js';
import { BOARD_CAFE_TABLES } from '../core/board-cafe-room.js';
import { furnitureById } from '../core/furniture.js';
import { backTexture, label, CARD_W, CARD_H } from '../ui/board-thief-3d.js';

const TABLE_TOP = 0.75; // (core/board-cafe-room.js: the table's top)
const TOY_SIZE = { croc: 0.11, bulldog: 0.1, pirate: 0.12, tower: 0.1 }; // the panel's toys, shrunk to stand on the table

const FREE_TABLES = [2, 3]; // (people already play at the first two: core/board-cafe-room.js)
const ORDER = { 2: [0, 1], 3: [0, 2, 1], 4: [0, 2, 1, 3] }; // chairs (west, east, north, south) by seat: two sit face to face, more go round
const HOME = 9, FLOOR_R = 1.0; // (the table number that means "the set in this home"; how far from it people sit)
const EYE = 1.2, HAND = 0.79, REACH = 0.45, SMALL = 0.75; // (eyes a little above the head, to look down over the fans at the faces)

export function createBoardTable(game) {
  let on = null; // the game at the table: { chair, mine, people, group, ... }
  const mats = () => { const plain = new THREE.MeshLambertMaterial({ color: '#fffdf6' }); return [plain, plain, plain, plain, new THREE.MeshLambertMaterial({ map: backTexture() }), plain]; };
  const chairsOf = (t) => {
    const [tx, tz] = BOARD_CAFE_TABLES[t] || [];
    return tx == null ? [] : (game.interior?.seats || []).filter((s) => Math.abs(s.x - tx) < 1.1 && Math.abs(s.z - tz) < 1.1);
  };
  // At home the game's own set (a low play table, core/board-game-sets.js) is the table: people sit on the floor round it.
  const setOf = (kind) => (game.home?.items || []).find((it) => furnitureById(it.id)?.boardgame === kind) || null;
  const floorSeats = new Map(); // piece → its four places (kept, so "am I still sitting there" compares the same objects)
  const floorOf = (it) => {
    if (!floorSeats.has(it)) floorSeats.set(it, [[-1, 0, Math.PI / 2], [1, 0, -Math.PI / 2], [0, -1, 0], [0, 1, Math.PI]].map(([sx, sz, ry]) => ({ x: it.x + sx * FLOOR_R, z: it.z + sz * FLOOR_R, ry, y: 0, mat: true, stand: [it.x + sx * (FLOOR_R + 0.5), it.z + sz * (FLOOR_R + 0.5)] })));
    return floorSeats.get(it);
  };
  // Where a game is played: its four places, the middle, and the heights that go with chairs or the floor.
  const placeOf = (table, kind) => {
    if (table === HOME) {
      const it = setOf(kind);
      return it && { chairs: floorOf(it), center: [it.x, it.z], top: 0.44, eye: 0.86, hand: 0.5, name: 1.0, face: 1.28, set: it };
    }
    const chairs = chairsOf(table - 1);
    return chairs.length === 4 ? { chairs, center: BOARD_CAFE_TABLES[table - 1], top: TABLE_TOP, eye: EYE, hand: HAND, name: 1.25, face: 1.55, set: null } : null;
  };
  const tmp = new THREE.Vector3(), ndc = new THREE.Vector2();

  // The card nearest a tap, when it is my turn (a computer's mouse; on a phone the panel's big cards are easier).
  const tap = (e) => {
    const o = on, p = o?.people[o.state.from];
    if (!o || !o.state.canPick || !p?.cards.length || e.target !== game.canvas) return;
    const r = e.target.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    let best = -1, bestD = Math.max(48, r.width * 0.05);
    p.cards.forEach((m, i) => {
      m.getWorldPosition(tmp).project(game.camera);
      const d = Math.hypot((tmp.x - ndc.x) * r.width / 2, (tmp.y - ndc.y) * r.height / 2);
      if (tmp.z < 1 && d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) o.onPick(best);
  };

  const api = {
    get on() { return !!on; },
    // The host: a free table for n players (1 to 4), or 0 for none.
    pick(n, kind) {
      if (!ORDER[n]) return 0;
      if (!game.interior?.stations?.boardgames) { const it = setOf(kind); return it && floorOf(it).every((s) => game.seatFree(s)) ? HOME : 0; }
      const p = game.me.root.position;
      const free = FREE_TABLES.filter((t) => { const c = chairsOf(t); return c.length === 4 && c.every((s) => game.seatFree(s)); });
      free.sort((a, b) => Math.hypot(BOARD_CAFE_TABLES[a][0] - p.x, BOARD_CAFE_TABLES[a][1] - p.z) - Math.hypot(BOARD_CAFE_TABLES[b][0] - p.x, BOARD_CAFE_TABLES[b][1] - p.z));
      return free.length ? free[0] + 1 : 0;
    },
    // A game starts: sit down and set the table. False: not here (the panel shows it all instead).
    start({ ids, seat, table, kind, names = [], bot, onPick, toy = null }) {
      api.end();
      const at = placeOf(table, kind), order = ORDER[ids.length];
      if (!order || !at || seat < 0) return false;
      const chairs = at.chairs;
      const mine = chairs[order[seat]];
      if (!game.seatFree(mine)) return false;
      game.sit(mine);
      const y0 = game.me.root.position.y;
      const group = new THREE.Group();
      const geo = new THREE.BoxGeometry(CARD_W, CARD_H, 0.006), mat = mats();
      const people = ids.map((id, s) => {
        const c = chairs[order[s]], fx = Math.sin(c.ry), fz = Math.cos(c.ry); // (the way the chair faces: to the table)
        const p = { s, c, cards: [], hand: new THREE.Group(), count: -1, faceText: '', face: null, ch: null, yaw: c.ry };
        if (s === seat) return p;
        p.hand.position.set(c.x + fx * REACH, y0 + at.hand, c.z + fz * REACH);
        p.hand.rotation.order = 'YXZ';
        p.hand.rotation.set(-0.12, c.ry, 0);
        p.hand.scale.setScalar(SMALL);
        group.add(p.hand);
        if (id === bot) {
          // A computer player: someone to sit in the chair.
          p.ch = createCharacter(null);
          if (c.mat) p.ch.activity?.('matsit'); // (on the floor)
          p.ch.root.position.set(c.x, y0, c.z);
          p.ch.root.rotation.y = c.ry;
          group.add(p.ch.root);
          if (names[s]) { p.name = label(names[s], { size: 34 }); p.name.scale.set(0.15 * p.name.userData.ratio, 0.15, 1); p.name.position.set(c.x, y0 + at.name, c.z); group.add(p.name); }
        }
        return p;
      });
      game.scene.add(group);
      on = { chair: mine, seat, people, group, geo, mat, y0, at, center: at.center, onPick, state: { from: -1, turn: -1, sel: -1, canPick: false, over: false }, look: null, want: new THREE.Vector3(), flying: [] };
      addEventListener('pointerdown', tap, true);
      if (toy) {
        // A toy game: the toy itself stands in the middle of the table.
        const o = on, [tx, tz] = at.center;
        o.toyKind = toy.kind; o.toyFigure = toy.figure || null; o.pressed = new Set();
        // (at home the set's own little model makes way for the one that is played)
        o.hid = (at.set?.mesh?.children || []).slice(5).filter((m) => m.visible);
        for (const m of o.hid) m.visible = false;
        import('../ui/board-toy-3d.js').then((m) => {
          if (on !== o) return;
          o.toy = m.createToyModel(toy.kind, toy.spots, toy.figure || null);
          o.bangDelay = m.bangDelay;
          const stand = new THREE.Group(); // (the toy moves its own root when it jumps)
          stand.scale.setScalar(TOY_SIZE[toy.kind] || 0.1);
          stand.position.set(tx, at.top, tz);
          stand.rotation.y = Math.atan2(mine.x - tx, mine.z - tz) + (toy.kind === 'tower' ? Math.PI / 4 : 0); // (its front to my chair)
          stand.add(o.toy.root);
          o.group.add(stand);
          if (o.toyState) api.sync(o.toyState);
        }).catch((e) => console.error('board table toy', e));
      }
      return true;
    },
    // The game as it stands (the same as ui/board-thief-3d.js takes).
    sync({ counts, from, turn, sel, faces = [], gone = [], over = false, canPick = false, pressed = null, bang = false, wobble = 0, placing = false }) {
      const o = on;
      if (!o) return;
      if (pressed) {
        // A toy game: the same presses on the toy on the table.
        o.toyState = { pressed, bang, wobble, placing, gone };
        for (const p of o.people) if (p.ch) p.ch.root.visible = !gone[p.s];
        if (!o.toy) return;
        const now = performance.now();
        for (const i of pressed) if (!o.pressed.has(i)) { o.pressed.add(i); o.toy.press(i, now, wobble); }
        if (bang && !o.banged) { o.banged = true; o.toy.bang(now + o.bangDelay(o.toyKind, placing)); }
        return;
      }
      const st = o.state;
      const handAt = (s, out) => (s === o.seat ? out.copy(game.me.root.position).setY(o.y0 + 0.5) : out.copy(o.people[s].hand.position));
      if (st.from >= 0 && st.turn >= 0 && o.people[st.from].count > 0 && counts[st.from] === o.people[st.from].count - 1) {
        // A card changed hands: it flies across the table.
        const m = new THREE.Mesh(o.geo, o.mat);
        o.flying.push({ m, a: handAt(st.from, new THREE.Vector3()), b: handAt(st.turn, new THREE.Vector3()), at: performance.now() });
        o.group.add(m);
      }
      for (const p of o.people) {
        const n = counts[p.s];
        if (p.s !== o.seat && p.count !== n) {
          while (p.cards.length > n) p.hand.remove(p.cards.pop());
          while (p.cards.length < n) { const m = new THREE.Mesh(o.geo, o.mat); m.userData.lift = 0; p.cards.push(m); p.hand.add(m); }
        }
        p.count = n;
        if (p.s === o.seat) continue;
        p.hand.visible = !gone[p.s];
        if (p.ch) p.ch.root.visible = !gone[p.s];
        if (p.name) p.name.visible = !gone[p.s];
        const text = gone[p.s] ? '' : faces[p.s] || '';
        if (text !== p.faceText) {
          if (p.face) { o.group.remove(p.face); p.face.material.map.dispose(); p.face.material.dispose(); p.face = null; }
          if (text) { p.face = label(text, { size: 72, pad: 18 }); p.face.scale.set(0.32 * p.face.userData.ratio, 0.32, 1); p.face.position.set(p.c.x, o.y0 + o.at.face, p.c.z); o.group.add(p.face); }
          p.faceText = text;
        }
      }
      o.state = { from: over ? -1 : from, turn, sel, canPick: canPick && !over, over };
    },
    // Every frame, after the game's own camera: my eyes at my chair.
    camera(dt) {
      const o = on;
      if (!o) return;
      if (game.seated !== o.chair) { if (game.interior?.seats?.includes(o.chair) || (o.chair.mat && game.home)) game.sit(o.chair); else { api.end(); return; } }
      const now = performance.now(), st = o.state, me = game.me.root, cam = game.camera;
      const spot = (s, out) => (s === o.seat ? out.set(me.position.x, 0, me.position.z) : out.set(o.people[s].c.x, 0, o.people[s].c.z));
      for (const p of o.people) {
        if (p.s === o.seat) continue;
        p.ch?.animate(dt, 0, true);
        // The holder turns the fan to whoever is picking; otherwise it faces the table.
        let yaw = p.c.ry;
        if (st.from === p.s && st.turn >= 0) { spot(st.turn, tmp); yaw = Math.atan2(tmp.x - p.c.x, tmp.z - p.c.z); }
        p.yaw += Math.atan2(Math.sin(yaw - p.yaw), Math.cos(yaw - p.yaw)) * Math.min(1, dt * 5);
        p.hand.rotation.y = p.yaw;
        p.hand.position.set(p.c.x + Math.sin(p.yaw) * REACH, o.y0 + o.at.hand, p.c.z + Math.cos(p.yaw) * REACH);
        if (p.ch) p.ch.root.rotation.y = p.yaw;
        const k = p.cards.length, step = Math.min(CARD_W * 0.62, 0.8 / Math.max(1, k - 1)), turn = Math.min(0.11, 0.8 / Math.max(1, k - 1));
        p.cards.forEach((m, i) => {
          const d = i - (k - 1) / 2, up = st.from === p.s && st.sel === i ? 0.12 : 0;
          m.userData.lift += (up - m.userData.lift) * Math.min(1, dt * 12);
          m.position.set(-d * step, -(Math.abs(d) ** 1.6) * 0.012 + m.userData.lift, i * 0.004);
          m.rotation.z = d * turn;
        });
        if (p.face) p.face.position.y = o.y0 + o.at.face + Math.sin(now / 160) * 0.03;
      }
      for (let i = o.flying.length - 1; i >= 0; i--) {
        const f = o.flying[i], t = (now - f.at) / 420;
        if (t >= 1) { o.group.remove(f.m); o.flying.splice(i, 1); continue; }
        const e = t * t * (3 - 2 * t);
        f.m.position.lerpVectors(f.a, f.b, e).y += Math.sin(e * Math.PI) * 0.18;
        f.m.rotation.set(-0.3, e * 5, 0);
      }
      if (o.toyKind) {
        // A toy game: I watch the toy.
        o.toy?.update(now, o.pressed);
        cam.position.set(me.position.x - Math.sin(o.chair.ry) * 0.15, o.y0 + o.at.eye, me.position.z - Math.cos(o.chair.ry) * 0.15);
        cam.up.set(0, 1, 0);
        cam.lookAt(o.center[0], o.at.top + (o.toyKind === 'tower' ? 0.2 : 0.05), o.center[1]);
        me.visible = false;
        return;
      }
      // Where my eyes go: who I pick from, who picks from me, or the two who are at it.
      const w = o.want;
      const tx = o.center, face = o.y0 + o.at.eye - 0.35;
      if (st.over || st.from < 0 || st.turn < 0) w.set(tx[0], o.at.top, tx[1]);
      else if (st.turn === o.seat) spot(st.from, w).setY(face);
      else if (st.from === o.seat) spot(st.turn, w).setY(face);
      else { spot(st.from, w).add(spot(st.turn, tmp)).multiplyScalar(0.5).setY(face); }
      if (!o.look) o.look = w.clone(); else o.look.lerp(w, Math.min(1, dt * 4));
      // (a little lower than the face: the small panel covers the bottom of the screen)
      cam.position.set(me.position.x - Math.sin(o.chair.ry) * 0.15, o.y0 + o.at.eye, me.position.z - Math.cos(o.chair.ry) * 0.15);
      cam.up.set(0, 1, 0);
      cam.lookAt(o.look.x, o.look.y - 0.3, o.look.z);
      me.visible = false;
    },
    // The game is closed: put the cards away and stand up.
    end() {
      const o = on;
      if (!o) return;
      on = null;
      removeEventListener('pointerdown', tap, true);
      if (o.toy) { o.toyFigure?.removeFromParent(); o.toy.root.traverse((m) => { m.geometry?.dispose(); m.material?.dispose?.(); }); } // (the figure in the barrel is a game character, its shapes shared: taken out first)
      game.scene.remove(o.group);
      o.geo.dispose();
      for (const m of new Set(o.mat)) { m.map?.dispose(); m.dispose(); }
      for (const p of o.people) for (const s of [p.face, p.name]) if (s) { s.material.map.dispose(); s.material.dispose(); }
      for (const m of o.hid || []) m.visible = true;
      game.me.root.visible = true;
      if (game.seated === o.chair) game.stand();
    },
  };
  return api;
}
