import { test, expect } from "@playwright/test";
import { blockAds } from "./helpers";

const AD_DOMAIN = "omg10.com";

async function expectNoAdOpen(page: import("@playwright/test").Page) {
  const popup = await Promise.race([
    page.waitForEvent("popup", { timeout: 500 }).then((p) => p, () => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 600)),
  ]);
  if (popup) {
    expect(popup.url()).not.toContain(AD_DOMAIN);
  }
}

async function clickEmptyArea(
  page: import("@playwright/test").Page,
  options: Parameters<ReturnType<typeof page.locator>["click"]>[0] = {},
) {
  await page.locator("main").click({ position: { x: 10, y: 10 }, ...options });
}

async function clickAndAwaitAd(
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
) {
  await page.waitForTimeout(10_100);
  const popupPromise = context.waitForEvent("page", { timeout: 3000 });
  await clickEmptyArea(page);
  const popup = await popupPromise;
  expect(popup.url()).toContain(AD_DOMAIN);
}

async function getSession(
  page: import("@playwright/test").Page,
): Promise<{ lastOpenAt: number; seenPages: string[] }> {
  return page.evaluate(() => {
    const KEY = "animesice:ad-state";
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return { lastOpenAt: 0, seenPages: [] };
    return JSON.parse(raw) as { lastOpenAt: number; seenPages: string[] };
  });
}

async function setLastOpenAt(
  page: import("@playwright/test").Page,
  lastOpenAt: number,
) {
  await page.evaluate((value) => {
    const KEY = "animesice:ad-state";
    const raw = window.sessionStorage.getItem(KEY);
    const initial = raw
      ? (JSON.parse(raw) as { lastOpenAt: number; seenPages: string[] })
      : { lastOpenAt: 0, seenPages: [] };
    initial.lastOpenAt = value;
    window.sessionStorage.setItem(KEY, JSON.stringify(initial));
  }, lastOpenAt);
}

test.describe("Monetag direct link cooldown", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await blockAds(page);
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          "animesice:service-notice:2026-08-21",
          "dismissed",
        );
      } catch {
        // ignore
      }
    });
    await page.goto("/");
    await page.evaluate(() => window.sessionStorage.clear());
    await page.goto("/");
  });

  test("first click on a page opens the ad", async ({ page, context }) => {
    await clickAndAwaitAd(page, context);
  });

  test("second click on the same page does not open another ad", async ({
    page,
    context,
  }) => {
    await clickAndAwaitAd(page, context);
    await expectNoAdOpen(page);
  });

  test("navigation to a new page within 10s still blocks the ad", async ({
    page,
    context,
  }) => {
    await clickAndAwaitAd(page, context);
    await page.goto("/lancamentos");
    await expectNoAdOpen(page);
  });

  test("navigation to a new page after the 10s page-cooldown but within 60s global cooldown does not open the ad", async ({
    page,
    context,
  }) => {
    await clickAndAwaitAd(page, context);
    await page.goto("/lancamentos");
    await setLastOpenAt(page, Date.now() - 11_000);
    await page.goto("/buscar");
    await expectNoAdOpen(page);
  });

  test("navigation to a new page after 60s global cooldown opens the ad", async ({
    page,
  }) => {
    await page.evaluate(() => window.sessionStorage.clear());
    await page.goto("/");
    await page.waitForTimeout(10_100);
    await clickEmptyArea(page);
    const stateAfterFirst = await getSession(page);
    expect(stateAfterFirst.lastOpenAt).toBeGreaterThan(0);

    await page.goto("/lancamentos");
    await setLastOpenAt(page, Date.now() - 61_000);
    const before = await getSession(page);

    await page.goto("/buscar");
    await page.waitForTimeout(10_100);
    await clickEmptyArea(page);
    await expect
      .poll(async () => (await getSession(page)).lastOpenAt)
      .toBeGreaterThan(before.lastOpenAt);
  });

  test("mod-key click does not open the ad", async ({ page }) => {
    await clickEmptyArea(page, { modifiers: ["Control"] });
    await expectNoAdOpen(page);
  });

  test("after clearing session storage the cooldown resets", async ({
    page,
    context,
  }) => {
    await clickAndAwaitAd(page, context);
    await page.evaluate(() => window.sessionStorage.clear());
    await clickAndAwaitAd(page, context);
  });

  test("reload of the same page keeps the page blocked", async ({
    page,
    context,
  }) => {
    await clickAndAwaitAd(page, context);
    await page.reload();
    await expectNoAdOpen(page);
  });

  test("going back to the original page keeps it blocked for the session", async ({
    page,
    context,
  }) => {
    await clickAndAwaitAd(page, context);
    await page.goto("/lancamentos");
    await setLastOpenAt(page, Date.now() - 61_000);
    await page.goto("/");
    await expectNoAdOpen(page);
  });
});