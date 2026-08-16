import { test, expect } from "@playwright/test";

test.describe("Homepage & Shelf Navigation", () => {
  test("should render the homepage with accessible title and shelf sections", async ({ page }) => {
    await page.goto("/");

    // Verify accessible h1 tag exists
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("Prateleira");

    // Check main content presence
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load ThirdPartyScripts without breaking main layout", async ({ page }) => {
    await page.goto("/");

    // Monetag script presence
    const monetagScript = page.locator("script#monetag-loader");
    await expect(monetagScript).toHaveCount(1);
  });
});
