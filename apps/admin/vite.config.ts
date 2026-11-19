import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `base: './'` keeps asset URLs relative, so the build works on GitHub Pages
// (https://<user>.github.io/<repo>/) or any static host without changes.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
  server: { fs: { allow: ['..', '../..'] } },
  build: { chunkSizeWarningLimit: 1600 },
});
