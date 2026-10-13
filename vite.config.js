import { defineConfig } from 'vite';

// base './' so the built game also works from file:// inside Electron.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    target: 'es2022',
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
