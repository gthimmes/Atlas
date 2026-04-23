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
  // Omit `workers` in dev to let Playwright pick its default; pin to 2 in CI.
  // Explicit `undefined` would trip exactOptionalPropertyTypes.
  ...(process.env.CI ? { workers: 2 } : {}),
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
      command: 'dotnet run --project apps/api/Atlas.Api --launch-profile http',
      cwd: '../..',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        // Integration tests assume the developer-db is up (docker compose up -d db
        // or `make db-up`). The seeder ran at least once so S-142 exists.
        ASPNETCORE_ENVIRONMENT: 'Development',
      },
    },
    {
      command: 'pnpm --filter @atlas/web run dev',
      cwd: '../..',
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
