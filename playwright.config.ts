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
    // Start a lightweight mock backend then build + start Next.js pointing at it.
    // The CSP (next.config.ts) relaxes connect-src for localhost:3001 ONLY when
    // INCLUDE_LOCAL_API=1 is present at BUILD time (headers are baked into the
    // build) — so the build must run inside this command, with the env vars set.
    command: "sh -c \"node e2e/mock-backend.js >/tmp/mock-backend.log 2>&1 & echo $! > /tmp/mock-backend.pid; INCLUDE_LOCAL_API=1 NEXT_PUBLIC_API_URL=http://localhost:3001 npm run build >/tmp/next-build.log 2>&1 && INCLUDE_LOCAL_API=1 NEXT_PUBLIC_API_URL=http://localhost:3001 npm run start\"",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
  },
});
