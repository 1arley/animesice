import { expect, test } from "@playwright/test";
import { blockAds, loginAs } from "./helpers";

const ART_SVG_A = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640"><defs><linearGradient id="ga" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#071821"/><stop offset="55%" stop-color="#0f5362"/><stop offset="100%" stop-color="#09101c"/></linearGradient><radialGradient id="ra" cx="50%" cy="38%" r="45%"><stop offset="0%" stop-color="#a5f3fc" stop-opacity="0.9"/><stop offset="100%" stop-color="#38e8da" stop-opacity="0"/></radialGradient></defs><rect width="480" height="640" fill="url(#ga)"/><circle cx="240" cy="245" r="185" fill="url(#ra)"/><path d="M240 85 320 250 240 430 160 250Z" fill="#e0f2fe" fill-opacity="0.86"/><path d="M240 140 284 250 240 365 196 250Z" fill="#38e8da"/><path d="M0 495 480 390v250H0Z" fill="#040a10" fill-opacity="0.72"/></svg>`;
const ART_SVG_B = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640"><defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#191026"/><stop offset="55%" stop-color="#6b21a8"/><stop offset="100%" stop-color="#0a0d16"/></linearGradient></defs><rect width="480" height="640" fill="url(#gb)"/><circle cx="240" cy="240" r="140" fill="#fbbf24" fill-opacity="0.28"/><path d="M240 95 335 280 240 455 145 280Z" fill="#fde68a" fill-opacity="0.85"/></svg>`;

function makeOffers(revealedIds = new Set(["offer-2"]), purchasedIds = new Set(["offer-3"])) {
  return [
    {
      id: "offer-1",
      slot: 7,
      itemType: "CARD",
      price: 1120,
      discount: 28,
      purchasedAt: purchasedIds.has("offer-1") ? "2026-11-28T10:00:00.000Z" : null,
      revealed: revealedIds.has("offer-1"),
      payload: { foil: "HOLO", condition: 0.03 },
      card: {
        id: "card-1",
        name: "Aeliana, Guardiã Boreal",
        image: "/__e2e/nm-art-a.svg",
        rarity: "LENDARIA",
        imageHidden: false,
        animeTitle: "Crônicas de AnimesIce",
      },
    },
    {
      id: "offer-2",
      slot: 8,
      itemType: "CARD",
      price: 680,
      discount: 20,
      purchasedAt: purchasedIds.has("offer-2") ? "2026-11-28T10:00:00.000Z" : null,
      revealed: revealedIds.has("offer-2"),
      payload: { foil: "GOLD", condition: 0.12 },
      card: {
        id: "card-2",
        name: "Kaelen, Lâmina do Eclipse",
        image: "/__e2e/nm-art-b.svg",
        rarity: "EPICA",
        imageHidden: false,
        animeTitle: "Véu de Obsidiana",
      },
    },
    {
      id: "offer-3",
      slot: 9,
      itemType: "CARD",
      price: 450,
      discount: 15,
      purchasedAt: purchasedIds.has("offer-3") ? "2026-11-28T10:00:00.000Z" : null,
      revealed: revealedIds.has("offer-3") || true,
      payload: { foil: "NORMAL", condition: 0.04 },
      card: {
        id: "card-3",
        name: "Soraia das Cinzas",
        image: "/__e2e/nm-art-a.svg",
        rarity: "RARA",
        imageHidden: false,
        animeTitle: "Estrela Polar",
      },
    },
    {
      id: "offer-4",
      slot: 10,
      itemType: "SKIN",
      price: 940,
      discount: 24,
      purchasedAt: null,
      revealed: revealedIds.has("offer-4"),
      skin: {
        id: "skin-1",
        name: "Manto da Madrugada",
        imageUrl: "/__e2e/nm-art-b.svg",
        rarity: "MITICA",
      },
    },
    {
      id: "offer-5",
      slot: 11,
      itemType: "KEY",
      price: 75,
      discount: 25,
      purchasedAt: null,
      revealed: revealedIds.has("offer-5"),
    },
    {
      id: "offer-6",
      slot: 12,
      itemType: "COMMON_BOX",
      price: 420,
      discount: 16,
      purchasedAt: null,
      revealed: revealedIds.has("offer-6"),
    },
  ];
}

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  await loginAs(page);

  await page.route("**/__e2e/nm-art-a.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: ART_SVG_A }),
  );
  await page.route("**/__e2e/nm-art-b.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: ART_SVG_B }),
  );
  await page.route("**/gacha/engagement-pilot", (route) =>
    route.fulfill({ json: { enabled: false, percent: 0 } }),
  );
  await page.route("**/gacha/collections/progress", (route) =>
    route.fulfill({ json: [] }),
  );
});

test("exibe cofre com 6 monólitos, revela carta sem cobrir arte, compra e mantém layout sem overflow", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("animesice:splash-seen", "1");
    } catch {}
  });
  const revealed = new Set(["offer-2"]);
  const purchased = new Set(["offer-3"]);
  let available = 2400;

  await page.route("**/gacha/economy/night-market/status", (route) =>
    route.fulfill({
      json: { open: true, periodStart: "2026-11-28" },
    }),
  );
  await page.route("**/gacha/economy", (route) =>
    route.fulfill({
      json: {
        balance: available,
        available,
        reserved: 0,
        commonBoxes: 0,
        rareBoxes: 0,
        premiumBoxes: 0,
        keys: 0,
        spinResets: 0,
        loyaltyDays: 2,
        dailyClaimedToday: true,
      },
    }),
  );
  await page.route("**/gacha/economy/shop", (route) =>
    route.fulfill({
      json: makeOffers(revealed, purchased),
    }),
  );
  await page.route("**/gacha/economy/shop/*/reveal", (route) => {
    const match = route.request().url().match(/\/shop\/([^/]+)\/reveal/);
    const id = match?.[1] ?? "";
    revealed.add(id);
    return route.fulfill({ json: { offerId: id, revealed: true } });
  });
  await page.route("**/gacha/economy/shop/*/buy", (route) => {
    const match = route.request().url().match(/\/shop\/([^/]+)\/buy/);
    const id = match?.[1] ?? "";
    purchased.add(id);
    if (id === "offer-1") available -= 1120;
    return route.fulfill({ json: { ok: true } });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gacha/mercado-noturno");

  await expect(
    page.getByRole("heading", { level: 1, name: "Mercado Noturno" }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);

  const cards = page.locator("li.nm-offer");
  await expect(cards).toHaveCount(6);
  await expect(page.locator("button.nm-monolith")).toHaveCount(6);
  await expect(page.getByText("2 / 6")).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("night-market-desktop-initial.png"),
    fullPage: true,
  });

  // Revelar a primeira oferta selada (01 · Carta · Lendária)
  const firstRevealButton = page.getByRole("button", {
    name: /Revelar oferta 01: Carta, raridade Lendária/,
  });
  const revealBox = await firstRevealButton.boundingBox();
  expect(revealBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  await firstRevealButton.click();

  const firstCard = page.locator("#nm-offer-offer-1");
  await expect(firstCard).toHaveAttribute("data-revealed", "true");
  await expect(
    firstCard.getByRole("heading", { name: "Aeliana, Guardiã Boreal" }),
  ).toBeVisible({ timeout: 5000 });
  await expect(firstCard.locator(".nm-flipper")).not.toHaveClass(
    /is-animating/,
    { timeout: 4000 },
  );
  await expect(page.getByText("3 / 6")).toBeVisible();

  // Verifica que o botão "Comprar oferta" está fora do palco 3:4 da arte
  const stageBox = await firstCard.locator(".nm-stage").boundingBox();
  const buyButton = firstCard.getByRole("button", { name: "Comprar oferta" });
  const buyBox = await buyButton.boundingBox();
  expect(stageBox).not.toBeNull();
  expect(buyBox).not.toBeNull();
  expect(buyBox!.y).toBeGreaterThanOrEqual(stageBox!.y + stageBox!.height - 1);
  expect(buyBox!.height).toBeGreaterThanOrEqual(44);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(0);
  await page.screenshot({
    path: testInfo.outputPath("night-market-desktop-revealed.png"),
    fullPage: true,
  });

  // Inspecionar a arte ampliada da carta revelada
  await firstCard
    .getByRole("button", { name: "Ampliar arte de Aeliana, Guardiã Boreal" })
    .click();
  const previewDialog = page.getByRole("dialog", {
    name: "Aeliana, Guardiã Boreal",
  });
  await expect(previewDialog).toBeVisible();
  await previewDialog.getByRole("button", { name: "Fechar prévia" }).click();
  await expect(previewDialog).toHaveCount(0);

  // Abrir modal de compra e confirmar
  await buyButton.click();
  const purchaseDialog = page.getByRole("dialog", {
    name: "Comprar Aeliana, Guardiã Boreal",
  });
  await expect(purchaseDialog).toBeVisible();
  await expect(purchaseDialog).toHaveCSS("opacity", "1");
  await expect(purchaseDialog.getByText("1.120 cristais")).toBeVisible();
  await expect(purchaseDialog.getByText("1.280 cristais")).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("night-market-purchase-modal.png"),
  });

  await purchaseDialog
    .getByRole("button", { name: "Confirmar compra" })
    .click();
  await expect(purchaseDialog).toHaveCount(0);
  await expect(firstCard.getByText("Adquirida nesta edição")).toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  // Captura em viewport mobile 390×844
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(firstCard).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  const heroBox = await page.locator(".nm-hero").boundingBox();
  const trayBox = await page.locator(".nm-tray").boundingBox();
  expect(heroBox).not.toBeNull();
  expect(trayBox).not.toBeNull();
  expect(heroBox!.x).toBeGreaterThanOrEqual(0);
  expect(heroBox!.x + heroBox!.width).toBeLessThanOrEqual(390.5);
  expect(trayBox!.x + trayBox!.width).toBeLessThanOrEqual(390.5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("night-market-mobile.png"),
    fullPage: true,
  });
});

test("revela sem travar em prefers-reduced-motion e exibe estado fechado quando não há ofertas", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const revealed = new Set<string>();

  await page.route("**/gacha/economy/night-market/status", (route) =>
    route.fulfill({
      json: { open: true, periodStart: "2026-11-28" },
    }),
  );
  await page.route("**/gacha/economy", (route) =>
    route.fulfill({
      json: {
        balance: 2000,
        available: 2000,
        reserved: 0,
        commonBoxes: 0,
        rareBoxes: 0,
        premiumBoxes: 0,
        keys: 0,
        spinResets: 0,
        loyaltyDays: 0,
        dailyClaimedToday: false,
      },
    }),
  );
  await page.route("**/gacha/economy/shop", (route) =>
    route.fulfill({
      json: makeOffers(revealed, new Set()).slice(0, 2),
    }),
  );
  await page.route("**/gacha/economy/shop/*/reveal", (route) => {
    revealed.add("offer-1");
    return route.fulfill({ json: { offerId: "offer-1", revealed: true } });
  });

  await page.goto("/gacha/mercado-noturno");
  await page
    .getByRole("button", { name: /Revelar oferta 01:/ })
    .click();
  await expect(
    page
      .locator("#nm-offer-offer-1")
      .getByRole("heading", { name: "Aeliana, Guardiã Boreal" }),
  ).toBeVisible();

  // Testa estado fechado em segunda navegação
  await page.unroute("**/gacha/economy/night-market/status");
  await page.unroute("**/gacha/economy/shop");
  await page.route("**/gacha/economy/night-market/status", (route) =>
    route.fulfill({
      json: { open: false, periodStart: null },
    }),
  );
  await page.route("**/gacha/economy/shop", (route) =>
    route.fulfill({ json: [] }),
  );

  await page.goto("/gacha/mercado-noturno");
  await expect(
    page.getByRole("heading", { name: "A noite ainda não começou" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("night-market-closed.png"),
    fullPage: true,
  });
});
