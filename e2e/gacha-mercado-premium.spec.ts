import { expect, test } from "@playwright/test";
import { blockAds, loginAs } from "./helpers";

const marketCard = {
  id: "listing-card-1",
  userId: "seller-1",
  user: { id: "seller-1", name: "Marina", userName: "marina" },
  itemType: "CARD",
  price: 1450,
  status: "ACTIVE",
  createdAt: "2026-11-25T12:00:00.000Z",
  expiresAt: "2026-11-28T12:00:00.000Z",
  item: {
    id: "copy-card-1",
    card: {
      id: "card-1",
      name: "Aeliana, guardiã do gelo",
      image: "/__e2e/market-card.svg",
      rarity: "LENDÁRIA",
      animeTitle: "Crônicas de AnimesIce",
    },
    foil: "HOLO",
    edition: 12,
    condition: 0.02,
    animeTitle: "Crônicas de AnimesIce",
  },
};

const marketSkin = {
  ...marketCard,
  id: "listing-skin-1",
  itemType: "SKIN",
  price: 820,
  item: {
    id: "skin-1",
    name: "Manto Boreal",
    imageUrl: "/__e2e/market-card.svg",
    rarity: "ÉPICA",
  },
};

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  await loginAs(page);
  await page.route(/\/user\/me$/, (route) =>
    route.fulfill({
      json: {
        id: "viewer-1",
        email: "viewer@test.dev",
        name: "Viewer",
        userName: "viewer",
        role: "USER",
        isVerified: true,
        createdAt: "2026-10-01T12:00:00.000Z",
        updatedAt: "2026-10-01T12:00:00.000Z",
      },
    }),
  );
  await page.route("**/__e2e/market-card.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#071b24"/><stop offset=".55" stop-color="#166d75"/><stop offset="1" stop-color="#111525"/></linearGradient><radialGradient id="r"><stop stop-color="#d2fff5" stop-opacity=".9"/><stop offset="1" stop-color="#47ddd0" stop-opacity="0"/></radialGradient></defs><path fill="url(#g)" d="M0 0h480v640H0z"/><circle cx="240" cy="260" r="190" fill="url(#r)"/><path d="m240 90 80 160-80 180-80-180z" fill="#b9fff3" fill-opacity=".78"/><path d="m240 145 45 105-45 110-45-110z" fill="#e9fffb"/><path d="M0 500 480 390v250H0z" fill="#06131a" fill-opacity=".75"/><text x="36" y="560" fill="#d8fff7" font-family="sans-serif" font-size="22" letter-spacing="5">AELIANA · HOLO</text></svg>`,
    }),
  );
  await page.route("**/gacha/collection?**", (route) =>
    route.fulfill({
      json: {
        data: [],
        meta: { page: 1, limit: 48, total: 0, totalPages: 1 },
      },
    }),
  );
  await page.route("**/gacha/economy**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = { items: [], total: 0, page: 1, limit: 24 };
    if (path.endsWith("/economy")) {
      json = {
        balance: 3000,
        available: 2800,
        reserved: 200,
        commonBoxes: 0,
        rareBoxes: 0,
        premiumBoxes: 0,
        keys: 0,
        spinResets: 0,
        loyaltyDays: 0,
      };
    } else if (path.endsWith("/market/listings")) {
      const itemType = new URL(route.request().url()).searchParams.get(
        "itemType",
      );
      const items =
        itemType === "CARD"
          ? [marketCard]
          : itemType === "SKIN"
            ? [marketSkin]
            : [];
      json = { items, total: items.length, page: 1, limit: 24 };
    } else if (path.endsWith("/mission")) {
      json = {
        periodStart: "2026-11-23T00:00:00.000Z",
        visits: 2,
        listingQualified: false,
        ready: false,
        claimedAt: null,
      };
    } else if (path.endsWith("/visit")) {
      json = {
        visits: 2,
        listingQualified: false,
        ready: false,
        claimedAt: null,
      };
    } else if (path.endsWith("/skins/mine")) {
      json = [];
    } else if (path.endsWith("/market/offers/mine")) {
      json = [];
    }
    return route.fulfill({ json });
  });
});

test("vitrine de cartas e skins mantém o layout sem overflow no mobile", async ({
  page,
}) => {
  await page.goto("/gacha/mercado");
  await expect(
    page.getByRole("heading", { name: "Mercado entre jogadores" }),
  ).toBeVisible();
  await expect(
    page.getByText("Aeliana, guardiã do gelo").first(),
  ).toBeVisible();
  await expect(page.getByText("Manto Boreal").first()).toBeVisible();
  await expect(page.getByText("2.800", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Nenhuma proposta recebida ativa."),
  ).toBeVisible();
  await expect(page.getByText("Nenhuma proposta enviada ativa.")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Cartas no mercado" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
