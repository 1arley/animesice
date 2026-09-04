import { defineConfig, devices } from "@playwright/test";

const appPort = process.env.E2E_APP_PORT || "3000";
const backendPort = process.env.MOCK_BACKEND_PORT || "3001";
const localBaseUrl = `http://localhost:${appPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI já usa retries (navegação SPA do Next tem um race residual raro que
  // ocasionalmente "engole" o primeiro clique na paginação; o retry cobre).
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || localBaseUrl,
    trace: "on-first-retry",
    // O site anima entrada da página (CrystalSplash/CrystalTransition/motion)
    // e o splash cobre a tela por ~1s no primeiro acesso da sessão. Respeitar
    // prefers-reduced-motion renderiza tudo estático — testes estáveis e o
    // splash nunca bloqueia cliques.
    contextOptions: {
      reducedMotion: "reduce",
    },
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
    command: `sh -c "MOCK_BACKEND_PORT=${backendPort} E2E_APP_PORT=${appPort} node e2e/mock-backend.js >/tmp/mock-backend-${backendPort}.log 2>&1 & echo $! > /tmp/mock-backend-${backendPort}.pid; INCLUDE_LOCAL_API=1 NEXT_PUBLIC_API_URL=http://localhost:${backendPort} npm run build >/tmp/next-build-${appPort}.log 2>&1 && INCLUDE_LOCAL_API=1 NEXT_PUBLIC_API_URL=http://localhost:${backendPort} npm run start -- -p ${appPort}"`,
    url: localBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
  },
});
