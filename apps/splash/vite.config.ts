import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: true,
    hmr: {
      host: 'localhost',
      clientPort: 5175,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      '/app': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
      '/marketplace': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5175,
  },
});
