import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Defaults to running against the live frontend; override with:
 *   PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test
 *
 * In CI we point at the staging URL once that exists. For now, the suite
 * is opt-in: `npm run test:e2e` runs locally; CI doesn't auto-run it until
 * the staging deploy is wired (POA P2 #23).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://hospital-vnyb.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
