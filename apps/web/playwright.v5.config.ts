import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'v5-contracts.spec.ts', timeout: 30000,
  use: { baseURL: 'http://localhost:5187/app/' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev -- --port 5187 --strictPort', url: 'http://localhost:5187/app/',
    reuseExistingServer: false, env: { VITE_DEV_OPERATOR_ID: '', VITE_API_URL: '' } },
});
