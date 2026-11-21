// The seed shop (종묘상) for the weekend farm's seeds, in the Euljiro &
// Dongdaemun district's map (Yozi 2026-11-21: "seeds from Dongdaemun").
//
// Real: Seoul's seed and seedling shops line Jongno between Jongno 5-ga and
// Dongdaemun (Jongno 5-ga and 6-ga, by Dongdaemun Market).
// Made up (the landmark's `why` says so): this one shop and its spot. The
// game has no Jongno between Jongmyo and Heunginjimun yet, so the shop
// stands at the street's Dongdaemun end: on the west kerb of Jongno where
// it turns up round Heunginjimun, facing the gate. That is the Jongno 6-ga
// side of the real street, about 100 m (game) east of Jongno 5-ga's shops.
//
// Run after build-euljiro.mjs (it drops these; this puts them back):
//   node scripts/build-seed-shop.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { SEED_SHOP, SEED_STAND } from '../src/core/seed-shop-site.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'euljiro.json');
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const map = readJson(MAP);
const r1 = (v) => Math.round(v * 10) / 10;
for (const k of ['pois', 'landmarks']) map[k] = (map[k] || []).filter((it) => !it.sd);

// Jongno's west side by the gate: the first piece of its line runs north.
const jongno = map.roads.find((r) => r.n?.en === 'Jongno');
const [a, b] = jongno.p; // from Cheonggyecheon-ro up to where it turns round the gate
if (Math.abs(a[0] - b[0]) > 0.5) throw new Error('Jongno no longer runs north here');
const kerb = a[0] - jongno.w / 2; // the road's west edge
const GAP = 3; // m of pavement between the awning and the kerb
const x = r1(kerb - GAP - SEED_SHOP.front), z = r1((a[1] + b[1]) / 2 - 1);
const ry = Math.round((Math.PI / 2) * 1000) / 1000; // its front looks east, at the gate
const why = 'made up: the real seed shops line Jongno from Jongno 5-ga to Dongdaemun; the game has no Jongno west of Heunginjimun yet, so this one stands at the Dongdaemun end, on the west kerb facing the gate (Yozi 2026-11-21)';
const name = (ko, en, ja, zh) => ({ ko, en, ja, zh });
map.landmarks.push({ type: 'seedshop', x, z, ry, clear: 6, sd: 1, why });
map.pois.push({ kind: 'landmark', x: r1(x + SEED_STAND[1]), z, name: name('동대문 종묘상', 'Dongdaemun Seed Shop', '東大門 種苗店', '东大门种苗店'), sd: 1 });
// Nothing else may stand there.
const box = [x + SEED_SHOP.back - 1, z - SEED_SHOP.hw - 1, x + SEED_SHOP.front + GAP, z + SEED_SHOP.hw + 1];
const inBox = ([px, pz]) => px > box[0] && px < box[2] && pz > box[1] && pz < box[3];
for (const k of ['buildings', 'blockers', 'areas']) for (const it of map[k]) if ((it.p || []).some(inBox)) throw new Error(`the seed shop stands on a ${k} item`);
writeFileSync(MAP, JSON.stringify(map, null, 1) + '\n'); // (as build-euljiro.mjs writes it)
console.log(`seed shop at district (${x}, ${z}), ${GAP} m from Jongno's kerb`);
