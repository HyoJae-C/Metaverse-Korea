import { defineConfig } from 'vite';

// One id per build. The game compares it with dist/version.json now and then
// and shows a "new features, refresh" banner when a newer build is live
// (src/core/update-check.js).
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) || String(Date.now());

export default defineConfig(({ command }) => ({
  // Relative base so the build works from any sub-path (e.g. GitHub Pages).
  base: './',
  define: { __BUILD_ID__: JSON.stringify(command === 'build' ? BUILD_ID : 'dev') },
  plugins: [{
    name: 'version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: BUILD_ID }) });
    },
  }],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    // admin.html: operators' live player map (src/admin/), not linked from the game.
    rollupOptions: {
      input: { main: 'index.html', admin: 'admin.html' },
      // three.js in a file of its own: it only changes when we upgrade it, so
      // returning players keep it cached across deploys and only download the
      // game code again (about 180 KB of the ~1 MB download).
      output: { codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }] } },
    },
  },
  server: { host: true },
}));
