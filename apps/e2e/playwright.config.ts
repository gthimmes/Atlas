import { defineConfig, devices } from '@playwright/test';

// Playback = Playwright traces + screencasts + DOM/network assertions.
// Traces: trace.zip files opened with `pnpm exec playwright show-trace`.
// Config below keeps traces + videos on failure so every red CI run has
// a time-travel debuggable artifact attached.

const PORT = Number(process.env.ATLAS_WEB_PORT ?? 5173);
const API_PORT = Number(process.env.ATLAS_API_PORT ?? 5179);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      // The web app auto-proxies /v1 to the API. If the API isn't up, the
      // HealthBadge shows red dots -- tests that need DB wait on /v1/health/db.
      command: 'pnpm --filter @atlas/web run dev',
      cwd: '../..',
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
