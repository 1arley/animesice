import { test, expect } from "@playwright/test";
import { blockAds, loginAs, VIEWER } from "./helpers";

const key = "mark-of-sacrifice";
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#20121a"/><path d="M150 70v250m-60-180 120 120m0-120L90 260" stroke="#ff6b4a" stroke-width="12"/></svg>';
const cosmetic = {
  key,
  type: "BACK",
  label: "Mark of sacrifice",
  description: "Um símbolo para sua coleção.",
  price: 500,
  owned: true,
  svg,
};
const card = {
  id: "owned-a",
  condition: 0.04,
  foil: "NORMAL",
  edition: 1,
  value: 100,
  obtainedAt: "2026-09-11T00:00:00Z",
  user: VIEWER,
  card: {
    id: "card-a",
    name: "Carta A",
    rarity: "RARA",
    image: null,
    favourites: 1,
    animeId: "anime-a",
    animeTitle: "Anime A",
  },
};

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  await loginAs(page);
  await page.route("**/gacha/engagement-pilot", (route) =>
    route.fulfill({ json: { enabled: false, percent: 0 } }),
  );
  await page.route("**/gacha/collections/progress", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/gacha/shop", (route) =>
    route.fulfill({
      json: {
        balance: 2000,
        activeCardBack: null,
        cosmetics: [
          cosmetic,
          { ...cosmetic, key: "BACK_FRAME", type: "FRAME", label: "Moldura" },
        ],
      },
    }),
  );
  await page.route("**/gacha/crystals?**", (route) =>
    route.fulfill({
      json: {
        balance: 2000,
        dailyClaimedToday: false,
        events: [],
        meta: { total: 0 },
      },
    }),
  );
  await page.route("**/gacha/economy/odds", (route) =>
    route.fulfill({
      json: {
        dailyBonus: 350,
        crystalPackages: [
          { id: "BRL_490", cents: 490, crystals: 950 },
          { id: "BRL_990", cents: 990, crystals: 2000 },
        ],
        boxPrices: { COMMON: 500, RARE: 1000, PREMIUM: 2000 },
        keyPrice: 100,
        categories: {},
      },
    }),
  );
  await page.route("**/gacha/card-backs/**", (route) =>
    route.fulfill({ json: { key, svg } }),
  );
  await page.route("**/gacha/card-back", (route) =>
    route.fulfill({
      json: { gachaCardBack: route.request().postDataJSON().key },
    }),
  );
});

test("capa personalizada possuída pode ser equipada na loja", async ({
  page,
}, testInfo) => {
  await page.goto("/gacha/cristais");
  const item = page
    .getByRole("listitem")
    .filter({ hasText: "Mark of sacrifice" });
  await expect(item.getByText("SEU", { exact: true })).toBeVisible();
  await item
    .getByRole("button", { name: "Usar capa" })
    .click({ timeout: 5000 });
  await expect(
    item.getByRole("button", { name: /Remover capa|Capa ativa/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Moldura" })
      .getByRole("button"),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("cristais.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("capa personalizada aparece no seletor da carta", async ({ page }) => {
  await page.route(/\/gacha\/collection\?/, (route) =>
    route.fulfill({
      json: {
        data: [card],
        meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
      },
    }),
  );
  await page.goto("/gacha/colecao");
  await page.getByRole("button", { name: /Carta A/ }).click();
  const back = page
    .getByRole("dialog")
    .getByRole("button", { name: "Mark of sacrifice" });
  await expect(back).toBeVisible({ timeout: 5000 });
  await back.click();
  await expect(back).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Moldura", exact: true }),
  ).toHaveCount(0);
});

test("mercado preserva oferta com erro e só confirma cancelamento concluído", async ({
  page,
}, testInfo) => {
  const listing = {
    id: "listing-a",
    itemType: "CARD",
    price: 500,
    status: "ACTIVE",
    expiresAt: "2099-01-01T00:00:00Z",
    item: { id: card.id, cardId: card.card.id, card: card.card },
  };
  await page.route("**/gacha/economy", (route) =>
    route.fulfill({
      json: {
        balance: 2000,
        available: 1800,
        reserved: 200,
        commonBoxes: 2,
        rareBoxes: 0,
        premiumBoxes: 1,
        keys: 0,
        spinResets: 0,
        loyaltyDays: 3,
        dailyClaimedToday: true,
      },
    }),
  );
  await page.route("**/gacha/economy/market/listings?**", (route) =>
    route.fulfill({
      json: {
        items: route.request().url().includes("CARD") ? [listing] : [],
        total: route.request().url().includes("CARD") ? 1 : 0,
        page: 1,
      },
    }),
  );
  await page.route("**/gacha/economy/market/listings/mine?**", (route) =>
    route.fulfill({ json: { items: [listing], total: 1 } }),
  );
  await page.route("**/gacha/economy/market/orders/mine?**", (route) =>
    route.fulfill({ json: { items: [], total: 0 } }),
  );
  await page.route("**/gacha/economy/shop", (route) =>
    route.fulfill({
      json: [
        {
          id: "offer-skin",
          itemType: "SKIN",
          price: 800,
          discount: 20,
          purchasedAt: null,
          skin: {
            id: "skin-a",
            name: "Skin de teste com nome completo",
            rarity: "EPICA",
            imageUrl: "https://cdn.myanimelist.net/images/test-market.png",
          },
        },
      ],
    }),
  );
  await page.route("**/gacha/economy/skins/mine", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/gacha/economy/market/mission", (route) =>
    route.fulfill({ json: { visits: 1, ready: false } }),
  );
  await page.route("**/gacha/economy/market/visit", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route(/test-market|\/_next\/image/, route => route.fulfill({ path: "public/images/logo.png", contentType: "image/png" }));
  await page.goto("/gacha/mercado");
  await expect(
    page.getByRole("heading", { name: "Cartas no mercado" }),
  ).toBeVisible();
  await expect(
    page.getByText("Você tem a caixa. Falta uma chave para abrir."),
  ).toHaveCount(2);
  await page.screenshot({
    path: testInfo.outputPath("mercado.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const shop = page.getByRole("region", { name: "Seleção de hoje" });
  await expect(shop.getByText("Skin · EPICA", { exact: true })).toBeVisible();
  const preview = shop.getByRole("button", {
    name: "Ver detalhes de Skin de teste com nome completo",
  });
  await preview.click();
  const art = page.getByRole("dialog", {
    name: "Skin de teste com nome completo",
  });
  await expect(art.getByRole("img")).toBeVisible();
  await art.getByRole("button", { name: "Ampliar 2×" }).click();
  await expect(
    art.getByRole("button", { name: "Ajustar à tela" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: testInfo.outputPath("mercado-zoom.png") });
  await page.keyboard.press("Escape");
  await expect(art).toHaveCount(0);
  await expect(preview).toBeFocused();
  let purchases = 0;
  await page.route("**/gacha/economy/shop/offer-skin/buy", (route) => {
    purchases += 1;
    return route.fulfill({
      status: 400,
      json: { message: "Oferta indisponível. Atualize o mercado." },
    });
  });
  await shop.getByRole("button", { name: "Comprar", exact: true }).click();
  expect(purchases).toBe(0);
  const purchase = page.getByRole("dialog");
  await expect(
    purchase.getByText("1.000 cristais", { exact: true }),
  ).toBeVisible();
  await purchase.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(purchase.getByRole("alert")).toHaveText(
    "Oferta indisponível. Atualize o mercado.",
  );
  expect(purchases).toBe(1);
  await purchase.getByRole("button", { name: "Cancelar" }).click();
  await page.route("**/gacha/economy/market/orders", (route) =>
    route.fulfill({
      status: 400,
      json: { message: "Oferta não aceita. Tente novamente." },
    }),
  );
  await page.getByRole("button", { name: "Fazer oferta" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Sua oferta em cristais").fill("450");
  await dialog.getByRole("button", { name: "Reservar cristais" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Oferta não aceita. Tente novamente.",
  );
  await expect(dialog.getByLabel("Sua oferta em cristais")).toHaveValue("450");
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toHaveCount(0);
  let cancellations = 0;
  await page.route(
    "**/gacha/economy/market/listings/CARD/listing-a",
    (route) => {
      cancellations += 1;
      return route.fulfill({ json: {} });
    },
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  expect(cancellations).toBe(0);
  await expect(
    page.getByText("Anúncio cancelado.", { exact: true }),
  ).toHaveCount(0);
});
