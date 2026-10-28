import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: /workspaces\.spec\.ts/, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5186', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5186', url: 'http://127.0.0.1:5186', reuseExistingServer: false },
});
