import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development, "/api" is forwarded to the local backend, so VITE_API_URL can stay empty.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
  build: { outDir: 'dist', sourcemap: false },
});
