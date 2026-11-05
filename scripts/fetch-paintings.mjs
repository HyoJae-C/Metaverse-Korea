// Downloads the museum paintings (src/data/paintings.js) from the National
// Museum of Korea's site and saves compressed copies in public/museum/.
// Every one is KOGL Type 1 (check the page before adding a new one).
// Needs ImageMagick (`convert`). Prints each file's pixel size, which goes in
// the painting's w/h.
//
//   node scripts/fetch-paintings.mjs          # only missing files
//   node scripts/fetch-paintings.mjs --all    # download everything again
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PAINTINGS } from '../src/data/paintings.js';

const OUT = new URL('../public/', import.meta.url).pathname;
const LONG = 900; // longest side in pixels
const TARGET = 110 * 1024;
mkdirSync(join(OUT, 'museum'), { recursive: true });

for (const p of PAINTINGS) {
  const out = join(OUT, p.file);
  if (existsSync(out) && !process.argv.includes('--all')) continue;
  const res = await fetch(p.src);
  if (!res.ok) { console.error(`${p.id}: HTTP ${res.status}`); continue; }
  const raw = join(tmpdir(), `museum-${p.id}`);
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  // Step the quality down until the file is small enough.
  for (const q of [82, 76, 70, 64, 58]) {
    execFileSync('convert', [raw, '-resize', `${LONG}x${LONG}>`, '-strip', '-interlace', 'JPEG', '-quality', String(q), out]);
    if (statSync(out).size <= TARGET) break;
  }
  rmSync(raw);
  const size = execFileSync('identify', ['-format', '%w %h', out]).toString();
  console.log(`${p.id}: ${size} px, ${Math.round(statSync(out).size / 1024)} KB`);
}
