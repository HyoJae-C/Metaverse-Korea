import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { JONGMYO, JongmyoBook, onSamdo, offSindo, inBox, MANNERS_REWARD, RITE_REWARD } from '../src/data/jongmyo.js';
import { inside } from '../src/data/bukchon.js';
import { CRAFT, craftWear, craftEntry } from '../src/ui/bukchon-ui.js';
import { WEARABLES } from '../src/data/wearables.js';
import { ACCESSORIES } from '../src/data/appearance.js';
import { TRAILS } from '../src/data/trails.js';
import { STAMPS } from '../src/data/stamps.js';
import { FOLK_DANCES } from '../src/core/folk-dance.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const map = read('districts/jongmyo.json');
const stores = read('stores.json').stores;
const d = region.districts.find((x) => x.id === 'jongmyo');
const [ox, oz] = d.offset;
const mem = () => { const s = {}; return { getItem: (k) => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); } }; };
const solids = map.buildings.map((b) => b.p).concat(map.blockers.map((b) => b.p));
const inSolid = (x, z) => solids.some((p) => inside(x, z, p));

test('Jongmyo stands on its gate\'s real spot on Jongno, and Jongno runs on from Gwanghwamun', () => {
  assert.ok(d.anchor.place.includes('Oedaemun'));
  assert.ok(d.anchor.why, 'a nudge says why');
  const gb = region.districts.find((x) => x.id === 'gyeongbokgung');
  const jongnoWest = read(gb.map).roads.find((r) => r.k === 'secondary' && r.p[0][1] === r.p[1][1] && r.p[0][1] + gb.offset[1] === -725);
  assert.ok(jongnoWest, 'Gyeongbokgung\'s Jongno');
  const jongno = map.roads.find((r) => r.n?.en === 'Jongno');
  assert.equal(jongno.p[0][1] + oz, -725, 'one straight Jongno');
  assert.ok(Math.abs(jongno.p[0][0] + ox - (Math.max(...jongnoWest.p.map((q) => q[0])) + gb.offset[0])) < 1, 'it starts where the old one ends');
});

test('Seosunra-gil is out for now; the Information Center stands on Jongno by a grove', () => {
  assert.ok(!map.roads.some((r) => r.n?.en === 'Seosunra-gil'), 'no lane');
  assert.ok(!map.pois.some((p) => p.name?.en === 'Seosunra-gil'), 'no map label');
  assert.ok(!JSON.stringify(map).includes('Seosunra'), 'no sign or note');
  for (const id of ['sunra-silver', 'sunra-jumak', 'doldam-cafe', 'yakgwa-dang', 'jongno-goldsmith']) assert.ok(!stores.some((s) => s.id === id), id);
  const info = stores.find((s) => s.id === 'info-jongmyo');
  assert.equal(info.name.en, 'Jongmyo Information Center');
  assert.equal(info.front, 'hanok');
  const [x, z] = [info.at[0] - ox, info.at[1] - oz];
  assert.ok(!inSolid(x, z), 'its door is clear');
  assert.ok(map.buildings.some((b) => b.fr?.[1] === 1 && inside(x, z - 3, b.p)), 'its hanok behind it');
  const jongno = map.roads.find((r) => r.n?.en === 'Jongno');
  assert.ok(z < jongno.p[0][1] - jongno.w / 2, 'on the pavement, off the road');
  assert.ok(map.landmarks.filter((l) => l.type === 'shrinetrees').flatMap((l) => l.spots).some(([tx]) => tx < JONGMYO.wall[0] - 4), 'the grove west of the wall');
  // Fictional brands only (sample data).
  assert.ok(read('stores.json').sampleData);
});

test('the shrine: walled, one gate on Jongmyo Square, the halls in their yards, drawn when you walk in', () => {
  const [x0, z0, x1, z1] = JONGMYO.wall;
  assert.deepEqual(map.meta.enclosure.box, JONGMYO.wall);
  // The only way in is Oedaemun: walking round the wall's line, every point
  // is inside a blocker except at the gate.
  const gaps = [];
  for (let x = x0 + 1; x < x1 - 1; x += 0.5) if (!inSolid(x, z0)) gaps.push(x);
  assert.ok(gaps.length && gaps.every((x) => Math.abs(x - JONGMYO.gate.at[0]) < JONGMYO.gate.w / 2), 'one gap, at the gate');
  for (let z = z1 + 1; z < z0 - 1; z += 0.5) assert.ok(inSolid(x0, z) && inSolid(x1, z), 'side walls are closed');
  for (let x = x0 + 1; x < x1 - 1; x += 0.5) assert.ok(inSolid(x, z1), 'the north wall is closed');
  // The halls' yards each open by their own gate, at the end of the stone path.
  for (const h of [JONGMYO.jeongjeon, JONGMYO.yeongnyeongjeon]) {
    assert.ok(!inSolid(h.gate[0], h.gate[1]), 'yard gate open');
    assert.ok(JONGMYO.samdo.some(([, b]) => b[0] === h.gate[0] && b[1] === h.gate[1]), 'the path leads to it');
    assert.ok(inBox(h.woldae[0] + 1, h.woldae[1] - 1, h.yard), 'terrace inside its yard');
    assert.ok(!inSolid((h.woldae[0] + h.woldae[2]) / 2, (h.woldae[1] + h.woldae[3]) / 2), 'you can stand on the terrace');
  }
  const hall = map.landmarks.find((l) => l.type === 'shrinehall' && l.bays === 19);
  assert.ok(Math.abs(hall.w - 92 / 4) < 3, 'Jeongjeon at a quarter of its real 92 m, like the rest of Seoul');
  // Both halls stand on their real spots (OpenStreetMap), within 15 m.
  const off = region.districts.find((d) => d.id === 'jongmyo').offset;
  for (const h of [JONGMYO.jeongjeon, JONGMYO.yeongnyeongjeon]) {
    const [rx, rz] = toGame(...h.real);
    const d = Math.hypot((h.hall[0] + h.hall[2]) / 2 + off[0] - rx, (h.hall[1] + h.hall[3]) / 2 + off[1] - rz);
    assert.ok(d < 15, `hall ${Math.round(d)} m from its real spot`);
  }
  assert.equal(map.landmarks.find((l) => l.type === 'shrinehall' && l.bays === 16).mid, 4, 'Yeongnyeongjeon\'s taller middle');
});

test('the stone path: the raised middle strip is the spirits\', the sides are for people', () => {
  const [[a, b]] = JONGMYO.samdo;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  assert.equal(onSamdo(mx, mz), 'sindo');
  assert.equal(onSamdo(mx + JONGMYO.samdoW / 2 - 0.3, mz), 'side');
  assert.equal(onSamdo(mx + 5, mz), null);
  for (const [p, q] of JONGMYO.samdo) for (const t of [0.25, 0.5, 0.75]) assert.ok(!inSolid(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t), 'the path is clear');
});

test('manners and the rite each pay once, and a walk on the spirits\' strip doesn\'t count', () => {
  const s = mem();
  const book = new JongmyoBook(s);
  book.enter(); book.step();
  assert.equal(book.arrive(), 0, 'stepped on the sindo');
  book.enter();
  assert.equal(book.arrive(), MANNERS_REWARD);
  book.enter();
  assert.equal(book.arrive(), 0, 'once');
  assert.equal(book.arrive(), 0, 'not without coming through the gate');
  assert.equal(book.watched(), RITE_REWARD);
  assert.equal(book.watched(), 0);
  const again = new JongmyoBook(s);
  assert.ok(again.manners && again.rite, 'saved');
});

test('the ritual dance: a quarter of the real troupe, civil and military dances side by side', () => {
  const { at: [x, z], rows, cols, gap, groups, band } = JONGMYO.rite;
  assert.equal(groups.length * rows * cols, 16, '16 dancers, a quarter of the full rite\'s 64');
  assert.equal(band.n, 15, '15 musicians (57-60 on a real stage)');
  assert.deepEqual(groups.map((g) => g.dance), ['ilmu', 'mumu']);
  assert.ok(groups[0].dx < 0 && groups[1].dx > 0, 'civil on the west, military on the east');
  const hx = ((cols - 1) / 2) * gap, hz = ((rows - 1) / 2) * gap;
  for (const { dx } of groups) for (const [ax, az] of [[-hx, -hz], [hx, hz], [-hx, hz], [hx, -hz]]) assert.ok(inBox(x + dx + ax, z + az, JONGMYO.jeongjeon.woldae), 'every dancer on the terrace');
  assert.ok(groups[1].dx - groups[0].dx > 2 * hx + gap, 'the two groups apart');
  assert.ok(inBox((band.x0 + band.x1) / 2, band.z, JONGMYO.jeongjeon.woldae));
  assert.ok(band.z < z - hz, 'the orchestra is behind (north of) the dancers');
  for (const k of ['ilmu', 'mumu', 'mumuspear']) { const pose = FOLK_DANCES[k](3); assert.ok(pose.armL && pose.armR, k); }
  // No arm raised overhead like a thrust: a lifted staff stays below the head.
  for (let t = 0; t < 30; t += 0.5) for (const k of ['ilmu', 'mumu']) assert.ok(FOLK_DANCES[k](t).armR[0] > -1.8, `${k} at ${t}s`);
  // The sign below the terrace explains the two dances and that they take turns.
  const sign = map.landmarks.find((l) => l.type === 'sign' && l.title?.en === JONGMYO.riteSign.title.en);
  assert.ok(sign && inBox(sign.x, sign.z, JONGMYO.jeongjeon.yard) && !inBox(sign.x, sign.z, JONGMYO.jeongjeon.woldae));
  assert.match(sign.text.en, /take turns/);
  for (const lang of ['en', 'ko', 'ja', 'zh']) assert.ok(sign.title[lang] && sign.text[lang], lang);
});

test('stepping up onto the spirits\' strip puts you back beside it', () => {
  const [[a, b]] = JONGMYO.samdo;
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  assert.equal(offSindo(mx + 3, mz), null, 'off the path: nothing');
  assert.equal(offSindo(mx + 1.2, mz), null, 'on a side strip: nothing');
  for (const off of [0.4, -0.4, 0]) {
    const [x, z] = offSindo(mx + off, mz);
    assert.equal(onSamdo(x, z), 'side', `from ${off}`);
    if (off) assert.equal(Math.sign(x - mx), Math.sign(off), 'down on the side you came from');
  }
  // At the corners of the path too.
  for (const [[p]] of [JONGMYO.samdo.slice(1)]) { const r = offSindo(p[0] + 0.1, p[1] + 0.1); assert.ok(r && onSamdo(...r) !== 'sindo'); }
  for (const [, q] of JONGMYO.samdo) { const r = offSindo(q[0], q[1]); assert.ok(r && onSamdo(...r) !== 'sindo', `${q}`); }
});

test('Sunra Silver Studio\'s pendants are worn: every metal and charm is a real accessory', () => {
  const k = CRAFT.pendant;
  assert.ok(k.wear);
  for (let ci = 0; ci < k.colors.length; ci++) for (let si = 0; si < k.shapes.length; si++) {
    const id = craftWear('pendant', ci, si);
    assert.ok(WEARABLES[id], id);
    const neck = WEARABLES[id].wear.neck;
    assert.ok(ACCESSORIES.neck.some((a) => a.id === neck && a.shape === 'pendant'), neck);
  }
  assert.equal(craftWear('pendant', 9, 0), null);
  assert.equal(craftEntry('pendant', 0, 0), null, 'not a bag good');
  assert.equal(craftWear('knot', 0, 0), null, 'the knot charms still go in the bag');
  for (const s of stores) for (const p of s.products || []) if (p.item?.startsWith('acc-pendant')) assert.ok(WEARABLES[p.item], p.id);
});

test('the guide\'s facts, the stamp and the Joseon Royal Walk', () => {
  assert.ok(JONGMYO.guideCards.length >= 4);
  for (const c of JONGMYO.guideCards) for (const lang of ['en', 'ko', 'ja', 'zh']) assert.ok(c.name[lang] && c.text[lang], `${c.name.en} ${lang}`);
  const jeong = JONGMYO.guideCards.find((c) => c.name.en === 'Jeongjeon');
  assert.match(jeong.text.en, /19 spirit chambers/);
  assert.match(jeong.text.en, /49/);
  const stamp = STAMPS.find((s) => s.id === 'jongmyo');
  assert.ok(stamp && inBox(stamp.place.at[0] - ox, stamp.place.at[1] - oz, [JONGMYO.wall[0], 18, JONGMYO.wall[2], JONGMYO.wall[1]]), 'stamp on Jongmyo Square');
  assert.ok(!inSolid(stamp.place.at[0] - ox, stamp.place.at[1] - oz));
  const walk = TRAILS.find((t) => t.id === 'royal');
  assert.deepEqual(walk.stamps, ['gyeongbokgung', 'bukchon', 'jongmyo']);
  for (const id of walk.stamps) assert.ok(STAMPS.some((s) => s.id === id), id);
});

test('the map credits OpenStreetMap', () => {
  assert.match(map.meta.source, /OpenStreetMap/);
});

test('Enter Jongmyo from in front of the stamp; the inside is built on the first visit', () => {
  const { entry } = JONGMYO;
  const stamp = STAMPS.find((s) => s.id === 'jongmyo');
  const [sx, sz] = [stamp.place.at[0] - ox, stamp.place.at[1] - oz];
  assert.ok(Math.hypot(entry.at[0] - sx, entry.at[1] - sz) < 5, 'by the stamp');
  assert.ok(!inBox(...entry.at, JONGMYO.wall), 'the Enter spot is outside the wall');
  assert.ok(inBox(...entry.inside, JONGMYO.wall) && !inSolid(...entry.inside), 'lands inside, on clear ground');
  assert.ok(inBox(...entry.leave.at, JONGMYO.wall), 'Leave is inside the gate');
  assert.ok(Math.hypot(entry.inside[0] - entry.leave.at[0], entry.inside[1] - entry.leave.at[1]) > entry.leave.r, 'you don\'t land on Leave');
  assert.ok(!inBox(...entry.out, JONGMYO.wall) && !inSolid(...entry.out), 'leaving puts you on the square');
  // The halls, terraces, stone path, inner woods and the rite sign wait for the first visit.
  const inner = map.landmarks.filter((l) => l.inner);
  for (const t of ['shrinehall', 'woldae', 'samdo', 'shrinetrees', 'sign']) assert.ok(inner.some((l) => l.type === t), t);
  const [x0, z0, x1, z1] = JONGMYO.wall;
  const inWall = (x, z) => x >= x0 - 1 && x <= x1 + 1 && z <= z0 + 1 && z >= z1 - 1;
  for (const l of inner) assert.ok(l.p ? l.p.every(([x, z]) => inWall(x, z)) : inWall(l.x, l.z), l.type);
  for (const l of inner.filter((q) => q.type === 'shrinetrees')) for (const [x, z] of l.spots) assert.ok(inWall(x, z), 'inner trees inside');
  // The outer wall, the main gate and the square's trees stay built from the start.
  assert.ok(map.landmarks.some((l) => l.type === 'jongmyogate' && !l.small && !l.inner));
  assert.ok(map.landmarks.some((l) => l.type === 'shrinetrees' && !l.inner));
  const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(src, /buildLandmarks\(map\.landmarks\.filter\(\(l\) => !l\.inner\)/);
});
