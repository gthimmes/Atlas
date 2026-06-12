import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // ATLAS_WEB_PORT lets e2e (and anyone whose 5173 is taken) pick a port;
    // strictPort so a clash fails loudly instead of silently shifting.
    port: Number(process.env.ATLAS_WEB_PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/v1': {
        target: 'http://localhost:5179',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
