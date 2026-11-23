#!/usr/bin/env node
// Pulls Seonjeongneung (서울 선릉과 정릉, the royal tombs in Samseong-dong)
// out of an OpenStreetMap extract round it into
// scripts/data/seonjeongneung-osm.json (lat/lon; © OpenStreetMap
// contributors, ODbL). The extract is
// /mnt/project-files/seonjeongneung/osm/seonjeongneung-osm.json, cut from the
// Geofabrik South Korea file (2026-11-14) with pyosmium.
//   node scripts/extract-seonjeongneung-osm.mjs [extract.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || '/mnt/project-files/seonjeongneung/osm/seonjeongneung-osm.json';
const osm = JSON.parse(readFileSync(src, 'utf8'));
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const byId = new Map(osm.elements.map((e) => [e.id, e]));
const line = (id) => { const e = byId.get(id); if (!e) throw new Error('missing OSM ' + id); return e.type === 'node' ? [r6(e.lat), r6(e.lon)] : e.geometry.map((g) => [r6(g.lat), r6(g.lon)]); };

// The park's outline: OSM relation 5493161 (삼릉공원 / 서울 선릉과 정릉), as
// the city data has it (scripts/data/seoul/green.json).
const green = JSON.parse(readFileSync(path.join(root, 'scripts/data/seoul/green.json'), 'utf8'));
const park = green.park.find((p) => p.id === 5493161);

const TOMB = (tomb, wall, hill, fence) => ({ tomb: line(tomb), wall: line(wall), hill: hill ? line(hill) : null, fence: fence.map(line) });
const out = {
  credit: '© OpenStreetMap contributors (ODbL)',
  note: 'Seonjeongneung from OpenStreetMap (scripts/extract-seonjeongneung-osm.mjs). lat/lon.',
  outline: park.o,
  // The three tombs: the mound (historic=tomb), the curved wall behind it
  // (곡장), the hill's front foot (man_made=embankment) and the fences.
  seolleung: {
    ...TOMB(369687345, 369687294, 382000579, [369687287, 369687284, 369687290, 369687292]),
    gate: line(2477254537), chamdo: line(369687314), jeongjagak: line(239953121), platform: line(382000583),
    bigak: line(239953124), subokbang: line(239953129), suragan: line(369687316), lawn: line(382000603),
  },
  jeonghyeon: { ...TOMB(369687346, 369687295, null, []), lawn: line(382000601) },
  jeongneung: {
    ...TOMB(369687342, 369687296, 382000581, [369687279, 369687286]),
    gate: line(2477254479), chamdo: line(369687315), jeongjagak: line(239953125), platform: line(382000585),
    bigak: line(239953128), lawn: line(382000602),
  },
  jaesil: line(369687323), jaesilWall: line(382000584),
  ginkgo: line(3734588276), // 500-year-old ginkgo, a natural monument (start_date 1515)
  museum: line(11032072605), // 선릉·정릉 역사문화관
  entrance: line(6393972191), // 삼릉공원 입구, the gate by the ticket office
  tickets: line(3852027226),
  // The ways inside the park (fee=yes footways and paths).
  paths: osm.elements.filter((e) => e.type === 'way' && (e.tags.highway === 'footway' || e.tags.highway === 'path' || e.tags.highway === 'steps') && e.tags.fee === 'yes' && !e.tags.footway)
    .map((e) => ({ id: e.id, k: e.tags.highway, ...(e.tags.surface ? { surface: e.tags.surface } : {}), p: e.geometry.map((g) => [r6(g.lat), r6(g.lon)]) })),
  // The streets round it: Seolleung-ro 100-gil and Samseong-ro 95-gil (south
  // and east to Samseong-ro), Bongeunsa-ro 68-gil (east, up to Bongeunsa-ro).
  streets: [
    { n: '선릉로100길', en: 'Seolleung-ro 100-gil', p: line(210328491).slice().reverse() },
    { n: '삼성로95길', en: 'Samseong-ro 95-gil', p: line(72465252).slice().reverse() },
    { n: '봉은사로68길', en: 'Bongeunsa-ro 68-gil', p: [...line(210328490), ...line(369687302).slice(1)] },
  ],
  // Seolleung-ro along the south-west side (the base map draws it): only to
  // keep the park off it.
  seolleungRo: line(369687318),
};
writeFileSync(path.join(root, 'scripts/data/seonjeongneung-osm.json'), JSON.stringify(out) + '\n');
console.log('paths', out.paths.length, 'outline', out.outline.length);
