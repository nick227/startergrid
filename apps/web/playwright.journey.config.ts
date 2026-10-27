import { defineConfig, devices } from '@playwright/test';
import { API_PORT, ROOT, WEB_PORT, journeyDatabaseUrl } from './e2e/journey/database.ts';

// Real API + real (disposable, migrate-only) MySQL database. No intercepted responses.
// Run `npm run build` at the repository root first; `npm run e2e:journey` does both.
export default defineConfig({
  testDir: './e2e', testMatch: ['v5-journey.spec.ts', 'channel-setup.spec.ts'], timeout: 120_000, workers: 1,
  globalSetup: './e2e/journey/global-setup.ts',
  globalTeardown: './e2e/journey/global-teardown.ts',
  use: { baseURL: `http://localhost:${WEB_PORT}/app/`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node dist/src/scripts/server.js', cwd: ROOT, url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: false, timeout: 60_000,
      env: {
        DATABASE_URL: journeyDatabaseUrl(), PORT: API_PORT, NODE_ENV: 'development',
        APP_BASE_URL: `http://localhost:${WEB_PORT}`, VIN_DECODER_PROVIDER: 'mock',
        SMTP_ENABLED: 'false', TWILIO_ACCOUNT_SID: '', V5_AUTOPILOT_ENABLED: 'false',
      },
    },
    {
      command: `npx vite --config vite.journey.config.ts --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}/app/`, reuseExistingServer: false, timeout: 60_000,
      env: { JOURNEY_API_PORT: API_PORT, VITE_DEV_OPERATOR_ID: '', VITE_API_URL: '' },
    },
  ],
});
