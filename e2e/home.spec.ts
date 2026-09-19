import { test, expect } from "@playwright/test";

test.describe("Homepage & Shelf Navigation", () => {
  test("restores an httpOnly session after navigation and reload", async ({
    page,
  }) => {
    let meRequests = 0;
    let refreshRequests = 0;

    await page.context().addCookies([
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
});
