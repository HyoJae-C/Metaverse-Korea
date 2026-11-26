#!/usr/bin/env node
// Cuts the palace grounds' green out of an OpenStreetMap extract into
// scripts/data/gyeongbokgung-grounds-osm.json (© OpenStreetMap contributors,
// ODbL): the lawns, the woods, single trees and tree rows, Hyangwonji's
// island, Chwihyanggyo, the pond's retaining wall and Yeolsangjinwon spring.
// scripts/build-gyeongbokgung.mjs lays them out.
//
//   node scripts/extract-gyeongbokgung-grounds.mjs CUT.json
//
// CUT.json: { ways: [{ id, tags, pts: [[lat, lon]] }], nodes: [{ id, tags,
// pt: [lat, lon] }], rels: [{ id, tags, members: [[type, ref, role]] }] } for
// the box 37.575..37.5855 N, 126.9725..126.9815 E (made with pyosmium from
// Geofabrik's south-korea-latest.osm.pbf, 2026-11-14).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cut = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const palace = JSON.parse(readFileSync(path.join(root, 'scripts/data/gyeongbokgung-osm.json'), 'utf8')).elements.find((e) => e.kind === 'palace').pts;
const lats = palace.map((p) => p[0]), lons = palace.map((p) => p[1]);
const BOX = [Math.min(...lats) - 0.0001, Math.min(...lons) - 0.0001, Math.max(...lats) + 0.0001, Math.max(...lons) + 0.0001];
const inBox = ([la, lo]) => la >= BOX[0] && la <= BOX[2] && lo >= BOX[1] && lo <= BOX[3];
const r6 = (v) => Math.round(v * 1e6) / 1e6, P = (pts) => pts.map(([a, b]) => [r6(a), r6(b)]);
const mid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
const ways = new Map(cut.ways.map((w) => [w.id, w]));

// A relation's member ways joined into closed rings.
function rings(ids) {
  const left = ids.map((id) => ways.get(id)?.pts).filter(Boolean).map((p) => p.slice()), out = [];
  while (left.length) {
    let ring = left.pop();
    for (let grew = true; grew && String(ring[0]) !== String(ring.at(-1));) {
      grew = false;
      for (let i = 0; i < left.length; i++) {
        const w = left[i];
        if (String(w[0]) === String(ring.at(-1))) ring = ring.concat(w.slice(1));
        else if (String(w.at(-1)) === String(ring.at(-1))) ring = ring.concat(w.slice(0, -1).reverse());
        else continue;
        left.splice(i, 1); grew = true; break;
      }
    }
    if (ring.length > 3 && String(ring[0]) === String(ring.at(-1))) out.push(ring);
  }
  return out;
}

const kindOf = (t) => (t.landuse === 'grass' || t.landuse === 'meadow' || t.natural === 'grassland' ? 'grass' : t.natural === 'wood' || t.landuse === 'forest' ? 'wood' : t.natural === 'scrub' ? 'scrub' : t.leisure === 'garden' ? 'garden' : null);
const out = { source: '© OpenStreetMap contributors (ODbL), Geofabrik south-korea extract 2026-11-14', grass: [], wood: [], scrub: [], garden: [], trees: [], rows: [] };
const inRel = new Set();
for (const r of cut.rels) {
  const k = kindOf(r.tags);
  if (!k || r.tags.type !== 'multipolygon') continue;
  const outer = rings(r.members.filter((m) => m[0] === 'w' && m[2] !== 'inner').map((m) => m[1]));
  const inner = rings(r.members.filter((m) => m[0] === 'w' && m[2] === 'inner').map((m) => m[1]));
  for (const o of outer) {
    if (!inBox(mid(o))) continue;
    for (const m of r.members) inRel.add(m[1]);
    out[k].push({ id: 'r' + r.id, pts: P(o), holes: inner.filter((h) => inBox(mid(h))).map(P) });
  }
}
for (const w of cut.ways) {
  const t = w.tags, k = kindOf(t);
  if (k && !inRel.has(w.id) && w.pts.length > 3 && inBox(mid(w.pts))) out[k].push({ id: w.id, pts: P(w.pts) });
  if (t.natural === 'tree_row' && inBox(mid(w.pts))) out.rows.push(P(w.pts));
  if (t['bridge:name'] === '취향교') out.bridge = P(w.pts);
  if (t.barrier === 'retaining_wall' && inBox(mid(w.pts))) (out.banks ||= []).push({ id: w.id, h: Number(t.height) || undefined, pts: P(w.pts) });
}
for (const n of cut.nodes) {
  if (!inBox(n.pt)) continue;
  if (n.tags.natural === 'tree') out.trees.push([r6(n.pt[0]), r6(n.pt[1]), n.tags.leaf_type === 'needleleaved' ? 'n' : n.tags.leaf_type === 'broadleaved' ? 'b' : '']);
  if (n.tags.natural === 'spring') out.spring = { name: n.tags.name, pt: [r6(n.pt[0]), r6(n.pt[1])] };
}
for (const k of ['grass', 'wood', 'scrub', 'garden']) for (const e of out[k]) if (!e.holes?.length) delete e.holes;
const file = path.join(root, 'scripts/data/gyeongbokgung-grounds-osm.json');
writeFileSync(file, JSON.stringify(out).replace(/\},\{/g, '},\n{') + '\n');
console.log(Object.entries(out).map(([k, v]) => `${k} ${Array.isArray(v) ? v.length : 1}`).join(', '));
