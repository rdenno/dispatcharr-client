import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Served by nginx at /m/ on the same origin as Dispatcharr, so API calls are same-origin
// and the Authelia session covers both. In dev, Vite proxies the API to a local Dispatcharr.
const dispatcharr = process.env.DISPATCHARR_URL ?? 'http://127.0.0.1:9191';

export default defineConfig({
  base: '/m/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      '/api': { target: dispatcharr, changeOrigin: true },
      '/proxy': { target: dispatcharr, changeOrigin: true },
    },
  },
});
