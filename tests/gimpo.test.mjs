import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { gimpoFlights, EVERY, nightAt } from '../src/core/gimpo-flights.js';
import { deckHeight, deckParts } from '../src/game/gimpo-walk.js';

// Gimpo Airport (scripts/build-gimpo.mjs): real lines from OSM at 1/4,
// runways at half the real width, the roof deck, the stands and the
// flights (one every 20 minutes, none at night).
const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const gm = read('districts/gimpo.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/gimpo-osm.json', import.meta.url), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'gimpo').offset;
const l0 = gm.landmarks.find((q) => q.type === 'gimpoairport');
const l = { ...l0, x: ox, z: oz };
const real = (k) => osm.ways[k].p.map(([a, b]) => { const [x, z] = toGame(a, b); return [x - ox, z - oz]; });
const segDist = ([px, pz], [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(px - ax - t * dx, pz - az - t * dz); };
const toLine = (p, line) => Math.min(...line.slice(1).map((b, i) => segDist(p, line[i], b)));
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const UV = (u, v) => [u * l.u[0] + v * l.v[0], u * l.u[1] + v * l.v[1]];

test('Gimpo Airport sits on its real place: fence, runways and terminals within 2 m of OSM at 1/4', () => {
  const fence = gm.areas.find((a) => a.k === 'grass').p, rf = real('aerodrome');
  assert.ok(Math.max(...fence.map((p) => toLine(p, rf))) < 2.1, 'fence');
  for (const [k, key] of [['domestic', 'domestic'], ['intl', 'intl']]) assert.ok(Math.max(...l0[key].map((p) => toLine(p, real(k)))) < 1, k);
  for (const [k, side] of [['runwayL', 'L'], ['runwayR', 'R']]) {
    const r = real(k), rw = l0.runways[side];
    assert.ok(Math.hypot(rw.a[0] - r[0][0], rw.a[1] - r[0][1]) < 0.2 && Math.hypot(rw.b[0] - r.at(-1)[0], rw.b[1] - r.at(-1)[1]) < 0.2, side + ' ends');
    assert.equal(rw.w, +osm.ways[k].tags.width / 2, side + ' is half the real width (Yozi 2026-11-21)');
  }
  assert.ok(Math.abs(l0.runways.L.len - 901) < 2 && Math.abs(l0.runways.R.len - 800) < 2, '900 and 800 m');
});

test('the made-up parts are listed, and the airline is MODU AIR', () => {
  const what = gm.meta.approx.map((a) => a.what).join(' | ');
  for (const w of ['runway width', 'roof deck', 'stands', 'kerbside', 'taxi paths', 'airline']) assert.ok(what.includes(w), w);
  assert.ok(!/korean air|asiana|jeju air|t'way|jin air/i.test(JSON.stringify(gm)), 'no real airline names');
});

test('the planes at the stands: half size, inside the fence, clear of the terminal and of each other', () => {
  const fence = gm.blockers[0].p;
  const P = l0.plane;
  const box = (s) => [-1, 1].flatMap((a) => [-1, 1].map((b) => { const [x, z] = UV(s.u + (a * P.span) / 2, s.v + (b * P.len) / 2); return [x, z]; }));
  for (const s of l0.stands) {
    for (const [x, z] of box(s)) {
      assert.ok(inPoly(x, z, fence), `stand ${s.n} inside the fence`);
      assert.ok(!inPoly(x, z, l0.domestic), `stand ${s.n} clear of the terminal`);
    }
  }
  const us = l0.stands.map((s) => s.u).sort((a, b) => a - b);
  for (let i = 1; i < us.length; i++) assert.ok(us[i] - us[i - 1] > P.span + 3, 'wingtips apart');
  assert.ok(P.len > 20 && P.len < 24, 'about 22 m: half an A321');
  // The view from the deck is left open: no stand in front of the balcony.
  const [b0, , b1] = l0.deck.balcony;
  for (const s of l0.stands) assert.ok(s.u + P.span / 2 < b0 || s.u - P.span / 2 > b1, `stand ${s.n} not in front of the deck`);
});

test('the roof deck: you stand at the roof on it, the stair climbs from the forecourt, and you leave it only down the stair', () => {
  const d = deckParts(l0);
  const [bu0, bv0, bu1, bv1] = l0.deck.balcony;
  assert.equal(deckHeight(l0, (bu0 + bu1) / 2, (bv0 + bv1) / 2), l0.h);
  const [su0, sv0, , sv1] = l0.deck.stair, sm = (sv0 + sv1) / 2;
  assert.equal(deckHeight(l0, su0 + 0.01, sm) < 0.05, true, 'the stair starts at the ground');
  assert.ok(Math.abs(deckHeight(l0, su0 + l0.deck.run / 2, sm) - l0.h / 2) < 0.01, 'half way up');
  assert.equal(deckHeight(l0, su0 + l0.deck.run + 1, sm), l0.h, 'the top');
  assert.ok(Math.atan(l0.h / l0.deck.run) < (20 * Math.PI) / 180, 'under 20°');
  assert.equal(deckHeight(l0, bu0 - 5, bv0), 0, 'off the deck');
  // The foot of the stair is outside the airfield's fence; the balcony's edge is inside it (a wall).
  const fence = gm.blockers[0].p;
  assert.ok(!inPoly(...UV(su0 + 0.5, sm), fence), 'stair foot outside the fence');
  assert.ok(inPoly(...UV((bu0 + bu1) / 2, bv0 - 0.5), fence), 'past the balcony is the airfield');
  assert.equal(d.rails.length, 3);
});

test('flights: one every 20 minutes, a takeoff then a landing at the same stand, none at night', () => {
  const fl = gimpoFlights(l);
  assert.equal(EVERY, 20 * 60e3);
  assert.ok(fl.durations.takeoff < EVERY && fl.durations.landing < EVERY, 'each is done before the next');
  const t0 = Date.UTC(2026, 10, 21, 0, 0, 0);
  let flights = 0;
  for (let k = Math.floor(t0 / EVERY); k < Math.floor(t0 / EVERY) + 72; k++) { // a real day
    const f = fl.slot(k);
    if (!f) continue;
    flights++;
    assert.ok(!nightAt(f.start), 'not at night');
    if (f.kind === 'takeoff') { const g = fl.slot(k + 1); assert.ok(g && g.kind === 'landing' && g.stand === f.stand, 'its landing comes back to the stand'); }
  }
  assert.ok(flights >= 40 && flights <= 52, `${flights} flights a day (about 6 in each 3-hour game day)`);
});

test('a plane stays inside the airfield on the ground, takes off from the runway and parks at its stand', () => {
  const fl = gimpoFlights(l);
  const fence = gm.blockers[0].p.map(([x, z]) => [x + ox, z + oz]);
  let k = Math.floor(Date.UTC(2026, 10, 21, 1, 0) / EVERY); while (!(k % 2 === 0 && fl.slot(k))) k++;
  const dep = fl.slot(k), land = fl.slot(k + 1);
  let flew = false;
  for (let t = 0; t < fl.durations.takeoff; t += 1000) {
    const p = fl.at(dep.start + t);
    if (!p) continue;
    if (p.y < 0.5) assert.ok(inPoly(p.x, p.z, fence), `on the ground inside the fence at ${t / 1000} s`);
    else flew = true;
  }
  assert.ok(flew, 'it took off');
  assert.equal(fl.empty(dep.start + 60e3), dep.stand, 'its stand is empty once it has gone');
  const end = fl.at(land.start + fl.durations.landing - 500);
  const s = l0.stands[land.stand], [sx, sz] = UV(s.u, s.v);
  assert.ok(end && Math.hypot(end.x - ox - sx, end.z - oz - sz) < 1.5, 'the landing parks at the stand');
  assert.equal(fl.empty(land.start + fl.durations.landing + 1000), -1, 'then every stand has its plane');
  assert.ok(fl.next(dep.start - 1000).start === dep.start, 'the board counts down to it');
});

test('Gimpo Airport Station: Line 5, exits outside the airfield', () => {
  const st = region.subway.stations.find((s) => s.id === 'gimpo-airport-station');
  assert.ok(st && st.exits.length === 4);
  const fence = gm.blockers[0].p;
  for (const e of st.exits) assert.ok(!inPoly(e.at[0] - ox, e.at[1] - oz, fence), `exit ${e.n}`);
});

test('the international terminal: two parked planes nose-in at its airside, a kerb and a door outside the fence', () => {
  const fence = gm.blockers[0].p, P = l0.plane;
  assert.equal(l0.intlStands.length, 2);
  for (const s of l0.intlStands) {
    // the plane's box: its length along u (facing the terminal), its span along v
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      const [x, z] = UV(s.u + (a * P.len) / 2, s.v + (b * P.span) / 2);
      assert.ok(inPoly(x, z, fence), `intl stand ${s.n} inside the fence`);
      assert.ok(!inPoly(x, z, l0.intl), `intl stand ${s.n} clear of the terminal`);
    }
    assert.ok(s.u - P.len / 2 - s.wall > 2 && s.u - P.len / 2 - s.wall < 5, 'a short jet bridge from the wall to the nose');
    assert.ok(s.v - P.span / 2 > l0.fly.taxiV + 20, 'clear of the taxilane the flights use');
  }
  assert.ok(Math.abs(l0.intlStands[1].v - l0.intlStands[0].v) > P.span + 3, 'wingtips apart');
  const { u, v0, v1 } = l0.intlDoor;
  for (const v of [v0, (v0 + v1) / 2, v1]) assert.ok(!inPoly(...UV(u - 3, v), fence), 'the door opens outside the fence');
  const signs = JSON.stringify(gm.buildings.map((b) => b.n));
  assert.ok(signs.includes('김포국제공항 국제선') && signs.includes('김포국제공항 국내선'));
});
