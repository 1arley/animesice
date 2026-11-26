import { test, expect } from "@playwright/test";
import { blockAds } from "./helpers";

test.describe("Homepage & Shelf Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await blockAds(page);
  });

  test("restores an httpOnly session after navigation and reload", async ({
    page,
  }) => {
    let meRequests = 0;
    let refreshRequests = 0;

    await page.context().addCookies([
      {
        name: "role",
        value: "USER",
        url: "http://localhost:3000",
      },
      {
        name: "refresh_token",
        value: "valid-refresh-token",
        url: "http://localhost:3001",
        httpOnly: true,
      },
    ]);
    await page.route("**/user/me", async (route) => {
      meRequests += 1;
      await route.fulfill({
        status: meRequests === 1 ? 401 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          meRequests === 1
            ? { message: "Unauthorized" }
            : {
                id: "viewer-1",
                email: "viewer@test.dev",
                name: "Viewer",
                userName: "viewer",
                avatar: null,
                bio: null,
                myAnimeList: null,
                role: "USER",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
        ),
      });
    });
    await page.route("**/auth/refresh", async (route) => {
      refreshRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    });

    await page.goto("/");
    const profileLink = page
      .locator('a[href="/configuracoes"]')
      .filter({ hasText: "Viewer" })
      .first();
    await expect(profileLink).toHaveCount(1);

    await page
      .getByRole("link", { name: "Lançamentos", exact: true })
      .last()
      .click();
    await page.reload();

    await expect(profileLink).toHaveCount(1);
    expect(refreshRequests).toBe(1);
    expect(meRequests).toBeGreaterThanOrEqual(3);
  });

  test("should render the homepage with accessible title and shelf sections", async ({ page }) => {
    await page.goto("/");

    // Verify accessible h1 tag exists
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("Sua próxima história");
    const discovery = page.getByRole("navigation", { name: "Descobrir animes" });
    await expect(discovery.getByRole("link", { name: "Dublados", exact: true })).toHaveAttribute("href", "/buscar?audio=DUBLADO");
    await expect(discovery.getByRole("link", { name: "Novos episódios" })).toHaveAttribute("href", "/lancamentos");
    const sections = await page.locator("main h2").allTextContents();
    const latestIndex = sections.findIndex((text) => text.startsWith("Últimos episódios"));
    expect(latestIndex).toBeGreaterThanOrEqual(0);
    expect(latestIndex).toBeLessThan(sections.indexOf("Melhores avaliados"));

    // Check main content presence
    await expect(page.locator("body")).toBeVisible();
  });

  test("carousel selection is accessible and respects reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/");
    const second = page.getByRole("button", { name: "Destaque 2:", exact: false });
    await second.focus();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#hero-title")).toHaveText("Uma história para descobrir");
    await expect(page.getByRole("button", { name: "Pausar destaques" })).toHaveCount(0);
    for (const width of [320, 480, 768]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const slide = await page.locator('[aria-roledescription="slide"]').boundingBox();
      const action = await page.getByRole("link", { name: "Ver anime", exact: true }).boundingBox();
      expect(slide!.x + slide!.width).toBeLessThanOrEqual(width);
      expect(action!.x + action!.width).toBeLessThanOrEqual(width);
    }
  });

  test("pausing the carousel survives pointer leave and focus changes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await page.getByRole("button", { name: "Pausar destaques" }).click();
    await page.getByRole("link", { name: "Explorar catálogo" }).focus();
    await page.mouse.move(0, 0);
    await page.clock.install();
    await page.clock.fastForward(8000);
    await expect(page.getByRole("button", { name: "Destaque 1:", exact: false })).toHaveAttribute("aria-current", "true");
    await page.getByRole("button", { name: "Reproduzir destaques automaticamente" }).click();
    await page.getByRole("link", { name: "Explorar catálogo" }).focus();
    await page.mouse.move(0, 0);
    await page.clock.fastForward(8000);
    await expect(page.getByRole("button", { name: "Destaque 2:", exact: false })).toHaveAttribute("aria-current", "true");
  });

  test("should not load the invasive OnClick tag", async ({ page }) => {
    await page.goto("/");

    const monetagScript = page.locator("script#monetag-loader");
    await expect(monetagScript).toHaveCount(0);
  });

  test("renders the AdSense slot and injects the loader on demand", async ({
    page,
  }) => {
    await page.goto("/");

    // NEXT_PUBLIC_ADSENSE_SLOT=0000000001 no build do e2e (playwright.config).
    const slot = page.locator("ins.adsbygoogle[data-ad-slot='0000000001']");
    await expect(slot).toHaveCount(1);

    // O loader só entra quando o slot se aproxima da viewport.
    await slot.scrollIntoViewIfNeeded();
    await expect(page.locator("script[data-adsense-loader]")).toHaveCount(1);
  });

  test("header is sticky and retracts on scroll down and reappears on scroll up", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(header).toHaveClass(/sticky/);
    await expect(header).toHaveClass(/translate-y-0/);

    // Scroll down past threshold
    await page.evaluate(() => {
      window.scrollTo(0, 400);
      window.dispatchEvent(new Event("scroll"));
    });
    await expect(header).toHaveClass(/-translate-y-full/);

    // Scroll up
    await page.evaluate(() => {
      window.scrollTo(0, 250);
      window.dispatchEvent(new Event("scroll"));
    });
    await expect(header).toHaveClass(/translate-y-0/);

    // Near top of page always visible
    await page.evaluate(() => {
      window.scrollTo(0, 20);
      window.dispatchEvent(new Event("scroll"));
    });
    await expect(header).toHaveClass(/translate-y-0/);
  });
});
