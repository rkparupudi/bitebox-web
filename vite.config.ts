import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :3000. Vite proxies /api and the Socket.IO path to it,
// so the browser sees a single origin and there are no CORS issues while developing.
const API = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: API, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
      '/socket.io': { target: API, ws: true, changeOrigin: true },
    },
  },
});
