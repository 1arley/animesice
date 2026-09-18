import { expect, test } from "@playwright/test";

for (const failure of ["error", "timeout"] as const) {
  test(`playback ${failure} refreshes a cached source once and shows a terminal error`, async ({ page }) => {
    await page.clock.install();
    await page.addInitScript(() => {
      sessionStorage.setItem("src:v2:retry-stream:1", JSON.stringify({
        source: { src: `${location.origin}/stale-video.mp4` },
        ts: Date.now(),
      }));
    });
    await page.route("**/*-video.mp4", () => {});
    const refreshes: string[] = [];
    await page.route(/\/api\/stream\/source\?/, (route) => {
      refreshes.push(route.request().url());
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ src: new URL("/fresh-video.mp4", page.url()).href }),
      });
    });

    await page.goto("/animes/retry-stream/1", { waitUntil: "domcontentloaded" });
    await expect(page.locator("video")).toHaveAttribute("src", /stale-video\.mp4$/);
    if (failure === "error") {
      await page.locator("video").dispatchEvent("error");
    } else {
      await page.clock.fastForward(10_001);
    }
    await expect(page.locator("video")).toHaveAttribute("src", /fresh-video\.mp4$/);
    expect(refreshes).toHaveLength(1);
    expect(new URL(refreshes[0]).searchParams.get("refresh")).toBe("1");

    await page.locator("video").dispatchEvent("error");
    await expect(page.getByText("Falha ao carregar o vídeo.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    expect(refreshes).toHaveLength(1);
  });
}

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
