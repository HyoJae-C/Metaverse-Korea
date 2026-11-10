import { defineConfig } from 'vite';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Shop product descriptions are only read inside a shop, so the build moves
// them out of stores.json (fetched before "Next" works) into store-descs.json,
// fetched at the first shop door (src/game/store-descs.js). Han River parks
// and other parks open to the street keep theirs: their goods are looked at
// from the street. `npm run dev` serves the full stores.json.
export function splitStoreDescs(data) {
  const descs = {};
  for (const s of data.stores || []) {
    if (s.open || s.hanpark) continue;
    for (const p of s.products || []) {
      if (p.desc == null) continue;
      (descs[s.id] ||= {})[p.id] = p.desc;
      delete p.desc;
    }
  }
  return descs;
}


// One id per build. The game compares it with dist/version.json now and then
// and shows a "new features, refresh" banner when a newer build is live
// (src/core/update-check.js).
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) || String(Date.now());

export default defineConfig(({ command }) => ({
  // Relative base so the build works from any sub-path (e.g. GitHub Pages).
  base: './',
  define: { __BUILD_ID__: JSON.stringify(command === 'build' ? BUILD_ID : 'dev') },
  plugins: [{
    name: 'split-store-descs',
    apply: 'build',
    closeBundle() {
      const root = join('dist', 'regions');
      if (!existsSync(root)) return;
      for (const r of readdirSync(root)) {
        const f = join(root, r, 'stores.json');
        if (!existsSync(f)) continue;
        const data = JSON.parse(readFileSync(f, 'utf8'));
        const descs = splitStoreDescs(data);
        writeFileSync(f, JSON.stringify(data));
        writeFileSync(join(root, r, 'store-descs.json'), JSON.stringify(descs));
      }
    },
  }, {
    name: 'version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: BUILD_ID }) });
    },
  }],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    // dist/.vite/manifest.json: which file needs which, for the download budget
    // (scripts/check-size.mjs).
    manifest: true,
    // admin.html: operators' live player map (src/admin/), not linked from the game.
    // apply.html: the free exhibition application form (src/apply/).
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html', apply: 'apply.html' },
      // three.js in a file of its own: it only changes when we upgrade it, so
      // returning players keep it cached across deploys and only download the
      // game code again (about 180 KB of the ~1 MB download).
      output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] } },
    },
  },
  server: { host: true },
}));
