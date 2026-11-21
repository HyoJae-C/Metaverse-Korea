import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The room draws its backdrop and boards on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, style: {} }) };

const { buildOperaHall, ROOM_OPERA, OPERA_LAYOUT } = await import('../src/core/opera-hall.js');
const { ROOM_SIZES, exitOf, roomOf } = await import('../src/core/interior.js');
const { OPERA_PROGRAM, seq, midiOf, at } = await import('../src/data/opera-scores.js');
const { VOICE_NAMES } = await import('../src/core/concert-player.js');
const { trackById } = await import('../src/data/tracks.js');
const { toGame } = await import('../src/core/seoul-grid.js');

const R = new URL('../public/regions/another-seoul/', import.meta.url);
const region = JSON.parse(readFileSync(new URL('region.json', R)));
const ac = JSON.parse(readFileSync(new URL('districts/arts-center.json', R)));
const stores = JSON.parse(readFileSync(new URL('stores.json', R))).stores;
const osm = JSON.parse(readFileSync(new URL('../scripts/data/arts-center-osm.json', import.meta.url)));
const entry = region.districts.find((d) => d.id === 'arts-center');
const L = ac.landmarks.find((l) => l.type === 'artscenter');
const store = stores.find((s) => s.id === 'arts-opera-theater');
const area = (p) => Math.abs(p.reduce((s, [x, z], i) => { const [u, v] = p[(i + 1) % p.length]; return s + x * v - u * z; }, 0)) / 2;
const inside = (p, [x, z]) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [a, b] = p[i], [u, v] = p[j]; if ((b > z) !== (v > z) && x < ((u - a) * (z - b)) / (v - b) + a) c = !c; } return c; };

test('Seoul Arts Center stands at its real crossing, the whole place at 50%', () => {
  assert.ok(entry, 'arts-center is in region.json');
  // The anchor: the crossing of Banpo-daero and Nambusunhwan-ro, at 1/4 from Seongsu Station.
  const [gx, gz] = toGame(entry.anchor.lat, entry.anchor.lon);
  assert.ok(Math.hypot(gx - entry.offset[0], gz - entry.offset[1]) < 1, `the offset is the anchor's real spot (${gx.toFixed(1)}, ${gz.toFixed(1)})`);
  assert.equal(ac.meta.scale.grow, 2, 'twice the 1/4 map = 50% of the real place');
  assert.match(ac.meta.scale.why, /Yozi/);
  // What is estimated or made up is written down (map rule 12).
  for (const what of ['heights', 'ground']) assert.ok(ac.meta.approx.some((a) => a.what.includes(what)), `approx lists ${what}`);
  for (const r of ac.roads) if (r.made) assert.ok(r.approx, 'a made-up walk is marked approx');
});

test('the Opera House is where OpenStreetMap has it, doubled about the gate crossing', () => {
  const ring = (osm.areas.opera || osm.areas.find?.((a) => a.id === 'opera'));
  const pts = (ring.p || ring.points || ring).map(([lat, lon]) => { const [x, z] = toGame(lat, lon); return [(x - entry.offset[0]) * 2, (z - entry.offset[1]) * 2]; });
  const c = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
  assert.ok(Math.hypot(c[0] - L.opera.at[0], c[1] - L.opera.at[1]) < 3, `the round hall's middle is OSM's (${c.map((v) => v.toFixed(1))} vs ${L.opera.at})`);
  const r = Math.sqrt(area(pts) / Math.PI);
  assert.ok(Math.abs(r - L.opera.r) < 3, `and as wide (${r.toFixed(1)} vs ${L.opera.r})`);
});

test('its doors are on walks, not in walls or water', () => {
  const walls = ac.buildings.map((b) => b.p || b.points).filter(Boolean);
  const water = ac.areas.filter((a) => a.k === 'water').map((a) => a.p || a.points);
  for (const [name, d] of Object.entries(ac.doors)) {
    for (const p of [...walls, ...water]) assert.ok(!inside(p, d), `the ${name} door is clear`);
  }
  assert.ok(store, 'arts-opera-theater is in stores.json');
  assert.equal(store.front, 'landmark');
  assert.equal(store.district, 'arts-center');
  assert.ok(Math.hypot(store.at[0] - entry.offset[0] - ac.doors.opera[0], store.at[1] - entry.offset[1] - ac.doors.opera[1]) < 0.5, 'the Opera Theater is entered at the Opera House door');
});

test('the halls doors: solid porches, and the Music Hall door faces out of its wall', () => {
  const walls = ac.buildings.map((b) => b.p || b.points || b);
  for (const n of ['opera-porch', 'music-porch']) assert.ok(ac.buildings.some((b) => b.n === n), `${n} is a wall`);
  // Walking from each door straight in: stopped by a wall within 1.7 m.
  for (const [name, face] of [['opera', L.opera.face], ['music', L.music.face]]) {
    const d = ac.doors[name], inX = -Math.sin(face), inZ = -Math.cos(face);
    assert.ok(!walls.some((p) => inside(p, d)), `${name}: the door ring is outside`);
    assert.ok(walls.some((p) => inside(p, [d[0] + inX * 1.7, d[1] + inZ * 1.7])), `${name}: nobody walks through the doors`);
  }
  // The Music Hall's door front lies along its wall: the nearest wall point is straight behind the door.
  const m = L.music, back = [m.door[0] - Math.sin(m.face) * 1.6, m.door[1] - Math.cos(m.face) * 1.6];
  let gap = Infinity;
  for (let i = 0; i < m.p.length; i++) { const a = m.p[i], b = m.p[(i + 1) % m.p.length], t = Math.max(0, Math.min(1, ((back[0] - a[0]) * (b[0] - a[0]) + (back[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2))); gap = Math.min(gap, Math.hypot(back[0] - a[0] - (b[0] - a[0]) * t, back[1] - a[1] - (b[1] - a[1]) * t)); }
  assert.ok(gap < 0.2, `the door is 1.6 m straight out of the wall (${gap.toFixed(2)})`);
});

test('the Opera Theater: a stage, a pit, stalls and three balconies', () => {
  assert.equal(ROOM_SIZES.opera, ROOM_OPERA);
  const room = roomOf(store), built = buildOperaHall(store, room, exitOf(room));
  const S = built.stations.stage;
  assert.ok(S.players.length >= 24, `an orchestra in the pit (${S.players.length})`);
  assert.ok(built.seats.length >= 40, `free seats for players (${built.seats.length})`);
  assert.ok(S.crowd >= 150, `a full house (${S.crowd})`);
  assert.equal(OPERA_LAYOUT.tiers.length, 3);
  // Every free seat faces the stage and is in front of it.
  for (const s of built.seats) assert.ok(s.z > OPERA_LAYOUT.pit.z1, 'a seat is in the house');
  // Draw calls stay low: the house is merged and instanced.
  let meshes = 0;
  built.scene.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes < 80, `the hall is few meshes (${meshes})`);
  for (const f of ['curtain', 'clap', 'lights']) assert.equal(typeof S[f], 'function');
});

test('the Concert Hall: the orchestra on the stage, seats all round it', async () => {
  const { buildConcertHall, ROOM_CONCERT, CONCERT_LAYOUT } = await import('../src/core/concert-hall.js');
  const hall = stores.find((s) => s.id === 'arts-concert-hall');
  assert.ok(hall, 'arts-concert-hall is in stores.json');
  assert.equal(hall.front, 'landmark');
  assert.equal(hall.district, 'arts-center');
  assert.ok(Math.hypot(hall.at[0] - entry.offset[0] - ac.doors.music[0], hall.at[1] - entry.offset[1] - ac.doors.music[1]) < 0.5, 'the Concert Hall is entered at the Music Hall door');
  assert.equal(ROOM_SIZES.concert, ROOM_CONCERT);
  const room = roomOf(hall), built = buildConcertHall(hall, room, exitOf(room));
  const S = built.stations.stage, P = CONCERT_LAYOUT.stage;
  assert.equal(S.mode, 'concert');
  assert.ok(S.players.length >= 30, `an orchestra on the stage (${S.players.length})`);
  for (const p of S.players) assert.ok(p.y >= P.y && p.z < P.front && p.z > P.back && Math.abs(p.x) < P.half, `a ${p.k} sits on the platform`);
  assert.ok(S.piano && S.wing, 'a grand piano and a way on');
  assert.ok(built.seats.length >= 40, `free seats for players (${built.seats.length})`);
  assert.ok(built.seats.some((s) => s.z < P.back), 'some of them behind the stage');
  assert.ok(S.crowd >= 150, `a full house (${S.crowd})`);
  let meshes = 0;
  built.scene.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes < 80, `the hall is few meshes (${meshes})`);
  // Its programme is the classical one, fetched when you walk in.
  const program = await S.load();
  assert.ok(program.length >= 9);
  assert.ok(program.some((p) => p.id === 'clair-de-lune') && program.some((p) => p.kind === 'piano'));
  assert.ok(!program.some((p) => OPERA_PROGRAM.includes(p)), 'no opera here');
});

test('watching the show: no name tags on the stage, and the eye button hides the buttons', () => {
  const show = readFileSync(new URL('../src/core/stage-show.js', import.meta.url), 'utf8');
  assert.ok(!/STAGE_TEXT\.(conductor|pianist)/.test(show), 'the conductor and the pianist have no name tag');
  assert.match(show, /model: 'suit'/, 'and wear a long-sleeved coat');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /html:not\(\.ui-hidden\) body\.in-store\.in-show \.ui-eye \{ display: grid; \}/, 'the eye shows in a hall with a show');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /classList\.add\('in-show'\)/);
  assert.match(main, /running: input\.run && !stamina\.tired && !steadyWalk && !quiet/, 'no running footsteps in a quiet place');
  assert.match(main, /classList\.remove\('in-store', 'in-show'\)/);
});

test('the scores: written notes, in order, inside their length', () => {
  assert.equal(midiOf('A4'), 69);
  assert.equal(midiOf('C4'), 60);
  assert.equal(midiOf('F#5'), 78);
  assert.equal(midiOf('Bb3'), 58);
  const s = seq('C4:1 r:.5 [E4 G4]:2 | D4:.5');
  assert.deepEqual([...s], [[0, 1, 60], [1.5, 2, 64], [1.5, 2, 67], [3.5, 0.5, 62]]);
  assert.equal(s.beats, 4);
  assert.deepEqual(at(4, [[0, 1, 60]], 12), [[4, 1, 72]]);
  assert.ok(OPERA_PROGRAM.length >= 4);
  assert.equal(new Set(OPERA_PROGRAM.map((p) => p.id)).size, OPERA_PROGRAM.length);
  for (const p of OPERA_PROGRAM) {
    for (const lang of ['en', 'ko', 'ja', 'zh']) { assert.ok(p.title[lang], `${p.id} title ${lang}`); assert.ok(p.by[lang], `${p.id} composer ${lang}`); }
    // Out of copyright everywhere: written well over a century ago.
    assert.ok(p.year < 1900, `${p.id} is old (${p.year})`);
    const secs = (p.beats * 60) / p.bpm;
    assert.ok(secs > 20 && secs < 120, `${p.id} lasts ${secs.toFixed(0)} s`);
    let notes = 0;
    for (const v of p.voices) {
      assert.ok(VOICE_NAMES.includes(v.inst), `${p.id}: ${v.inst} is an instrument of the orchestra`);
      v.n.forEach(([b, d, m], i) => {
        assert.ok(b >= 0 && d > 0 && b + d <= p.beats + 1e-6, `${p.id} ${v.inst}: note ${i} is inside the piece`);
        assert.ok(m >= 28 && m <= 100, `${p.id} ${v.inst}: note ${m} is in range`);
        if (i) assert.ok(b >= v.n[i - 1][0], `${p.id} ${v.inst}: in order`);
      });
      notes += v.n.length;
    }
    assert.ok(notes > 100, `${p.id} has ${notes} notes`);
  }
});

test('the show: tuning, the conductor, the piece, applause, the next piece', async () => {
  globalThis.performance ??= { now: () => 0 };
  const { showAt, partAt, turnLength, TURN, lead, STAGE_TEXT } = await import('../src/core/stage-show.js');
  const total = OPERA_PROGRAM.reduce((s, p) => s + turnLength(p), 0);
  assert.ok(total > 180 && total < 600, `the whole programme takes ${Math.round(total)} s`);
  // Everyone sees the same moment: it depends on the clock alone.
  assert.deepEqual(showAt(1000, OPERA_PROGRAM), showAt(1000, OPERA_PROGRAM));
  assert.equal(showAt(0, OPERA_PROGRAM).score, OPERA_PROGRAM[0]);
  assert.equal(showAt(turnLength(OPERA_PROGRAM[0]) + 1, OPERA_PROGRAM).score, OPERA_PROGRAM[1]);
  assert.equal(showAt(total + 1, OPERA_PROGRAM).score, OPERA_PROGRAM[0], 'and round again');
  const p = OPERA_PROGRAM[0], order = [];
  for (let u = 0; u < turnLength(p); u += 0.5) { const k = partAt(p, u).k; if (order.at(-1) !== k) order.push(k); }
  assert.deepEqual(order, ['tune', 'walkIn', 'open', 'play', 'clap', 'close', 'rest']);
  assert.equal(partAt(p, lead + 1).k, 'play');
  assert.ok(TURN.clap >= 5);
  for (const k of Object.keys(STAGE_TEXT)) for (const lang of ['en', 'ko', 'ja', 'zh']) assert.ok(STAGE_TEXT[k][lang], `${k} in ${lang}`);
  // In the hall the game's own music is silent: only the orchestra plays.
  assert.equal(trackById('concert').silent, true);
  assert.equal(trackById('concert').hidden, true);
});
