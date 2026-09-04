import { expect, test } from "@playwright/test";

test("episode shell is visible while the stream source is still resolving", async ({ page }) => {
  const startedAt = Date.now();

  await page.goto("/animes/slow-stream/1", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Anime com stream lento" })).toBeVisible();
  await expect(page.getByTestId("episode-player-shell")).toBeVisible();
  expect(Date.now() - startedAt).toBeLessThan(2_500);
});

test("viewer can retry after stream resolution fails", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/stream-source?*", async (route) => {
    attempts += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ message: "Stream temporariamente indisponível." }),
    });
  });
  await page.route(/\/api\/stream\/source\?/, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Stream temporariamente indisponível." }),
    }),
  );

  await page.goto("/animes/retry-stream/1");
  await expect(page.getByTestId("episode-player-shell")).toBeVisible();
  await expect(page.getByTestId("episode-player-error")).toBeVisible();

  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect.poll(() => attempts).toBe(2);
});
