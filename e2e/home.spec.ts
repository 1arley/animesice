import { test, expect } from "@playwright/test";

test.describe("Homepage & Shelf Navigation", () => {
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
    await expect(h1).toContainText("AnimesIce");

    // Check main content presence
    await expect(page.locator("body")).toBeVisible();
  });

  test("should not load the invasive OnClick tag", async ({ page }) => {
    await page.goto("/");

    const monetagScript = page.locator("script#monetag-loader");
    await expect(monetagScript).toHaveCount(0);
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
