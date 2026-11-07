import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any sub-path (e.g. GitHub Pages).
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    // admin.html: operators' live player map (src/admin/), not linked from the game.
    rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } },
  },
  server: { host: true },
});
