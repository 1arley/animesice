import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    // Start a lightweight mock backend then start the Next.js server with the API URL
    // Ensures SSR requests from the Next server reach the mock-backend during tests.
    // Start mock backend, set INCLUDE_LOCAL_API so the dev server relaxes CSP for localhost mock, and start Next with NEXT_PUBLIC_API_URL pointing at the mock backend for SSR.
    command: "sh -c \"node e2e/mock-backend.js >/tmp/mock-backend.log 2>&1 & echo $! > /tmp/mock-backend.pid; INCLUDE_LOCAL_API=1 NEXT_PUBLIC_API_URL=http://localhost:3001 npm run start\"",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
