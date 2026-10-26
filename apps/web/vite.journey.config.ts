// Dev server for the real-API journey suite: same app, proxied to the disposable API.
import { mergeConfig } from 'vite';
import base from './vite.config.ts';

const api = `http://127.0.0.1:${process.env.JOURNEY_API_PORT ?? '3110'}`;
export default mergeConfig(base, {
  server: {
    proxy: {
      '/api': { target: api, changeOrigin: true },
      '/uploads': { target: api, changeOrigin: true },
      '/demo-assets': { target: api, changeOrigin: true },
    },
  },
});
