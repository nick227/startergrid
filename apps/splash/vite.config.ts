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
  },
  preview: {
    port: 5175,
  },
});
