import { defineConfig } from '@playwright/test';

/**
 * E2E config. Uses the system-installed Google Chrome (channel: 'chrome'),
 * so no Playwright browser download is needed behind the corporate proxy.
 *
 * Assumes the dev servers are already running:
 *   web → http://localhost:5103   ·   api → http://localhost:3093
 * Start them with `npm run dev` (or the Docker dev stack) before running.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.WEB_BASE_URL ?? 'http://localhost:5103',
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
});
