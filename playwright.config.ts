import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Jelly Party E2E tests.
 *
 * Note: Extension tests require:
 * - Chromium browser (not Chrome/Edge which block extension loading)
 * - Persistent context (handled in fixtures.ts)
 * - Headed mode (extensions don't work in headless in most cases)
 *
 * Use `vp run test:e2e`; its Vite Task builds the test extension first.
 */
export default defineConfig({
  testDir: "e2e",

  // Increase timeout for extension-based tests
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  // Run tests serially for now (extension context is shared)
  fullyParallel: false,
  workers: 1,

  // Fail fast during development
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Reporter - use 'list' to avoid browser popup, 'html' for detailed report
  reporter: process.env.CI ? "github" : "list",

  // Global settings
  use: {
    // Trace on failure for debugging
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // Projects - only Chromium for now (extensions support)
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Note: Context is configured in fixtures.ts for extension loading
      },
    },
    // Firefox extension support would need different approach
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
  ],

  // Output directories
  outputDir: "test-results",

  // Run local dev server before starting the tests
  webServer: [
    {
      command: "vp run test:services",
      // Wait for both backend and join site (Playwright waits for 2xx response)
      // Since we can only specify one URL, the Vite+ task starts both services.
      // Waiting for the join page is safer as it means Vite processed the static site.
      url: "http://localhost:16180",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 120 * 1000, // 2 minutes to start dev servers
    },
    {
      // Serve e2e/fixtures for local video swap tests
      command: "vp dlx http-server e2e/fixtures -p 16333 --cors",
      url: "http://localhost:16333/video-swap-test.html",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 10 * 1000,
    },
  ],
});
