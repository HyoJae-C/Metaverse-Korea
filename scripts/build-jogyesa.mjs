#!/usr/bin/env node
// Builds Jogyesa (src/data/jogyesa.js) into districts/gyeongbokgung.json:
// Ujeongguk-ro from Yulgok-ro down to Jong-ro, the temple's paved grounds,
// its landmark (core/jogyesa-model.js draws the halls, trees, gate and the
// lantern canopy), the Buddhist history museum north of Daeungjeon as a
// plain building, and the blockers.
//
// Before, the block north of Jong-ro was two made-up filler buildings
// (56-110 and 124-186 × 40-76, and 124-186 × 86-122 south of them); they are
// cut back to make room: the west one stops short of Geungnakjeon, the east
// ones start across Ujeongguk-ro.
//
// What it writes is marked "jg": 1, so it can be run again.
//   node scripts/build-jogyesa.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JOGYESA as J } from '../src/data/jogyesa.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP = path.join(root, 'public', 'regions', 'another-seoul', 'districts', 'gyeongbokgung.json');
const map = JSON.parse(readFileSync(MAP, 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [r1(x), r1(z)]);
const around = (x, z, w, d) => rect(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
const drop = (list) => list.filter((e) => !e.jg);
for (const k of ['roads', 'buildings', 'areas', 'blockers', 'landmarks', 'pois']) map[k] = drop(map[k]);

// The filler buildings: cut back (found by their old west/east edges).
const filler = (x0, z0) => map.buildings.find((b) => !b.jg && b.p.length === 4 && Math.min(...b.p.map((q) => q[0])) === x0 && Math.min(...b.p.map((q) => q[1])) === z0);
const roadEast = J.road.x + J.road.w / 2 + 0.5;
const west = filler(56, 40), east = filler(124, 40) || filler(roadEast, 40), southEast = filler(124, 86) || filler(roadEast, 86);
if (west) west.p = rect(56, 40, 80, 76); // (the temple at 37.5% reaches x 82)
if (east) east.p = rect(roadEast, 40, 186, 76);
if (southEast) southEast.p = rect(roadEast, 86, 186, 122); // (Ujeongguk-ro runs on down to Jong-ro)

const jg = 1;
map.roads.push({ k: 'secondary', w: J.road.w, p: [[J.road.x, J.road.from], [J.road.x, J.road.to]], n: { ko: '우정국로', en: 'Ujeongguk-ro' }, jg });
map.areas.push({ k: 'stone', p: J.site, jg, why: 'Jogyesa\'s grounds at 37.5% (OSM way 223157537 grown 1.5 times about Iljumun, squared off; Yozi 2026-11-15)' });
map.buildings.push({ h: 10, p: rect(...J.museum), n: { ko: '한국불교역사문화기념관', en: 'Korean Buddhist History and Culture Memorial Hall' }, jg, why: 'OSM outline at 37.5%, its north end cut at Yulgok-ro (19 m deep, not 27)' });
map.landmarks.push({ type: 'jogyesa', x: J.daeungjeon.x, z: J.daeungjeon.z, clear: 30, jg, name: { ko: '조계사', en: 'Jogyesa Temple', ja: '曹渓寺', zh: '曹溪寺' }, why: 'the whole temple at 37.5%, grown about Iljumun: bigger than 1/4 on purpose (src/data/jogyesa.js)' });

map.pois.push({ kind: 'landmark', x: J.daeungjeon.x, z: J.daeungjeon.z + 12, name: { ko: '조계사', en: 'Jogyesa Temple', ja: '曹渓寺', zh: '曹溪寺' }, jg });

const B = (p, why) => map.blockers.push({ p, why, jg });
const D = J.daeungjeon, G = J.geungnakjeon, I = J.iljumun;
B(around(D.x, D.z, D.w + 2.6, D.d + 2.6), 'Daeungjeon on its plinth');
B(around(G.x, G.z, G.w + 2.6, G.d + 2.6), 'Geungnakjeon on its plinth');
for (const sz of [-1, 1]) B(around(I.x, I.z + sz * (I.w / 2 - I.bay / 2), I.d, I.bay), 'Iljumun: a side bay with two of the Four Heavenly Kings');
B(around(J.pagodaTree.x, J.pagodaTree.z, 1.6, 1.6), 'the pagoda tree');
B(around(J.whitePine.x, J.whitePine.z, 1.4, 1.4), 'the white pine');
B(around(J.sarira.x, J.sarira.z, 3, 3), 'the sarira pagoda\'s base');
B(around(J.babyBuddha.x, J.babyBuddha.z, 1.6, 1.6), 'the baby Buddha');
B(around(J.stele.x, J.stele.z, 1.2, 0.8), 'the stele');
B(around(J.bell.x, J.bell.z, J.bell.w + 0.5, J.bell.w + 0.5), 'the bell pavilion');
const U = J.ujeongguk;
B(around(U.x, U.z, U.w + 2.6, U.d + 2.6), 'Ujeongchongguk on its base');
map.pois.push({ kind: 'landmark', x: U.x, z: U.z + 4, name: { ko: '우정총국', en: 'Ujeongchongguk (old post office)', ja: '郵征総局', zh: '邮征总局' }, jg });

const pretty = (o) => JSON.stringify(o, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (m, body) => '[' + body.split(/,\s*/).join(', ') + ']'); // (as build-gyeongbokgung.mjs writes it)
writeFileSync(MAP, pretty(map) + '\n');
console.log('Jogyesa written: filler', !!west, !!east, !!southEast);
