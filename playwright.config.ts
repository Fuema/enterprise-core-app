import { defineConfig, devices } from '@playwright/test';
import { E2E_PORT, e2eEnv } from './e2e/e2e.env';

const isCI = Boolean(process.env.CI);

/** process.env without undefined values, merged with the fixed e2e environment. */
const serverEnv: Record<string, string> = {
  ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
  ...e2eEnv,
};

/**
 * End-to-end suite = the automated browser checklist (agents.md).
 * Runs against `vite` dev on a dedicated port with the MSW mock backend, so it
 * needs no real API and never collides with a dev server on 5173.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${String(E2E_PORT)}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${String(E2E_PORT)} --strictPort`,
    url: `http://localhost:${String(E2E_PORT)}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: serverEnv,
  },
});
