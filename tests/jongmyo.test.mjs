import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JONGMYO, JongmyoBook, onSamdo, inBox, MANNERS_REWARD, RITE_REWARD } from '../src/data/jongmyo.js';
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
  const jongnoWest = read(gb.map).roads.find((r) => r.k === 'secondary' && r.p[0][1] === r.p[1][1] && r.p[0][1] + gb.offset[1] === -765);
  assert.ok(jongnoWest, 'Gyeongbokgung\'s Jongno');
  const jongno = map.roads.find((r) => r.n?.en === 'Jongno');
  assert.equal(jongno.p[0][1] + oz, -765, 'one straight Jongno');
  assert.ok(Math.abs(jongno.p[0][0] + ox - (Math.max(...jongnoWest.p.map((q) => q[0])) + gb.offset[0])) < 1, 'it starts where the old one ends');
});

test('Seosunra-gil runs along the shrine\'s west wall, from Jongno to Yulgok-ro, shops facing the wall', () => {
  const lane = map.roads.find((r) => r.n?.en === 'Seosunra-gil');
  const [WX0] = JONGMYO.wall;
  assert.equal(lane.p[0][0], JONGMYO.lane);
  assert.ok(WX0 - (JONGMYO.lane + lane.w / 2) >= 1, 'a strip of pavement between the lane and the wall');
  assert.ok(lane.p[1][1] + oz <= -883, 'reaches Yulgok-ro');
  const shops = ['info-jongmyo', 'sunra-silver', 'sunra-jumak', 'doldam-cafe', 'yakgwa-dang', 'jongno-goldsmith'].map((id) => stores.find((s) => s.id === id));
  for (const s of shops) {
    assert.ok(s, 'shop on the map');
    assert.equal(s.front, 'hanok');
    const [x, z] = [s.at[0] - ox, s.at[1] - oz];
    assert.ok(x < JONGMYO.lane && x > JONGMYO.lane - 4, `${s.id} stands on the lane's west side`);
    assert.ok(!inSolid(x, z), `${s.id}'s door is clear`);
    assert.ok(map.buildings.some((b) => b.fr?.[0] === 1 && inside(x - 3, z, b.p)), `${s.id} has its hanok behind it`);
  }
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
  assert.ok(hall.w >= 60, 'Jeongjeon is long');
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

test('the ritual dance: 6 × 6 dancers on Jeongjeon\'s terrace, the orchestra behind them', () => {
  const { at: [x, z], rows, gap, band } = JONGMYO.rite;
  const half = ((rows - 1) / 2) * gap;
  for (const [dx, dz] of [[-half, -half], [half, half], [-half, half], [half, -half]]) assert.ok(inBox(x + dx, z + dz, JONGMYO.jeongjeon.woldae), 'every dancer on the terrace');
  assert.ok(inBox((band.x0 + band.x1) / 2, band.z, JONGMYO.jeongjeon.woldae));
  assert.ok(band.z < z - half, 'the orchestra is behind (north of) the dancers');
  const pose = FOLK_DANCES.ilmu(3);
  assert.ok(pose.armL && pose.armR, 'a pose for the civil dance');
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
