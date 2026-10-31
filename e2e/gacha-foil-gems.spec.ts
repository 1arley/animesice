import { test, expect, type Page, type Route } from "@playwright/test";
import { blockAds, loginAs } from "./helpers";

const emptyEconomy = {
  commonBoxes: 0, rareBoxes: 0, premiumBoxes: 0, keys: 0, spinResets: 0,
  weeklyRewardReady: false, loyaltyDays: 0, loyaltyRarePlusReady: false,
  balance: 0, reserved: 0, available: 0,
  titanitaShards: 0, titanitaItems: 0, titanitaSombriaShards: 0,
  titanitaSombriaItems: 0, draconicaShards: 0, draconicaItems: 0,
  sombriaDraconicaShards: 0, sombriaDraconicaItems: 0, protecao: 0,
  holoShards: 20, goldShards: 0, inkShards: 0, prismShards: 0,
  holoGems: 0, goldGems: 0, inkGems: 0, prismGems: 0,
  dailyClaimedToday: false, watchEarnedToday: 0,
  itemConfig: {
    item_shop_price: {}, item_convert_value: {}, item_recipes: {},
    item_eligibility: {}, item_condition_anchor: {}, card_floors: {},
    base_value: {}, foil_mult: {}, reroll_cost_pct: 0,
    reroll_protection_mint_block: false,
  },
};

const cards = [
  { id: "normal-card", condition: 0.5, conditionLabel: "NM", foil: "NORMAL", edition: 1, value: 100, obtainedAt: "2026-10-01", user: { id: "viewer-1" }, card: { id: "card-a", name: "Carta Normal", rarity: "RARA", image: null, favourites: 0, animeId: "anime-a", animeTitle: "Anime A", anime: { slug: "anime-a" } } },
  { id: "foil-card", condition: 0.5, conditionLabel: "NM", foil: "HOLO", edition: 1, value: 100, obtainedAt: "2026-10-01", user: { id: "viewer-1" }, card: { id: "card-b", name: "Carta Holo", rarity: "RARA", image: null, favourites: 0, animeId: "anime-a", animeTitle: "Anime A", anime: { slug: "anime-a" } } },
];

async function blockExternalNavigation(page: Page) {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "localhost" || url.hostname === "127.0.0.1"
      ? route.continue()
      : route.abort();
  });
}

async function openInventory(page: Page, inventory = emptyEconomy) {
  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/economy", (route: Route) => route.fulfill({ json: inventory }));
  await page.route("**/gacha/collection?**", (route: Route) => route.fulfill({ json: {
    data: cards, meta: { page: 1, limit: 100, total: cards.length, totalPages: 1 },
  } }));
  await page.goto("/gacha/inventario");
  await expect(page.getByRole("heading", { name: "Fragmentos e gemas de foil" })).toBeVisible();
}

test("crafta gema pelo retorno atualizado do inventário", async ({ page }) => {
  const requests: unknown[] = [];
  let current = emptyEconomy;
  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/economy", (route) => route.fulfill({ json: current }));
  await page.route("**/gacha/collection?**", (route) => route.fulfill({ json: { data: cards, meta: { page: 1, limit: 100, total: 2, totalPages: 1 } } }));
  await page.route("**/gacha/economy/gems/craft", async (route) => {
    requests.push(route.request().postDataJSON());
    current = { ...current, holoShards: 0, holoGems: 1 };
    await route.fulfill({ json: current });
  });
  await page.goto("/gacha/inventario");
  const button = page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first();
  await button.click();
  await expect(page.getByRole("status").filter({ hasText: "Gema Holo fabricada. Restam 0 fragmentos e você tem 1 gema." })).toBeVisible();
  await expect(page.getByText("Fragmentos:").first()).toBeVisible();
  expect(requests).toEqual([{ foil: "HOLO" }]);
});

test("mostra erro autoritativo do backend ao craftar sem saldo", async ({ page }) => {
  await openInventory(page);
  await page.route("**/gacha/economy/gems/craft", (route) => route.fulfill({
    status: 400,
    json: { message: "Fragmentos insuficientes para fabricar esta gema." },
  }));
  await page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first().click();
  await expect(page.locator('p[role="alert"]')).toContainText("Fragmentos insuficientes");
});

test("desabilita craft sem saldo e aplicação sem gema; oculta carta com foil", async ({ page }) => {
  await openInventory(page, { ...emptyEconomy, holoShards: 19 });
  await expect(page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first()).toBeDisabled();
  await expect(page.getByRole("option", { name: /Carta Holo/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aplicar gema" })).toBeDisabled();
  await expect(page.getByText("Cartas com foil não aceitam outra gema.")).toBeVisible();
});

test("aplica gema e atualiza foil e valor com a resposta do backend", async ({ page }) => {
  const inventory = { ...emptyEconomy, holoShards: 0, holoGems: 1 };
  await openInventory(page, inventory);
  let economyRequests = 0;
  await page.route("**/gacha/economy/gems/apply", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ foil: "HOLO", userCardId: "normal-card" });
    await route.fulfill({ json: { ...cards[0], foil: "HOLO", value: 777 } });
  });
  await page.route("**/gacha/economy", (route) => {
    economyRequests++;
    return route.fulfill({ json: { ...inventory, holoGems: 0 } });
  });
  await page.getByLabel("Carta própria sem foil").selectOption("normal-card");
  await page.getByRole("button", { name: "Aplicar gema" }).click();
  await expect(page.getByRole("region", { name: "Fragmentos e gemas de foil" }).getByRole("status")).toContainText("foil HOLO e valor de 777 cristais");
  await expect(page.getByText("Gemas:").first()).toHaveText("Gemas: 0");
  expect(economyRequests).toBe(1);
});

test("não estima payout de Crystal antes de confirmar o burn", async ({ page }) => {
  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/collection?**", (route) => route.fulfill({ json: {
    data: [cards[1]], meta: { page: 1, limit: 24, total: 1, totalPages: 1 },
  } }));
  await page.route("**/gacha/featured", (route) => route.fulfill({ json: null }));
  await page.route("**/gacha/collections/progress", (route) => route.fulfill({ json: [] }));
  await page.route("**/gacha/engagement-pilot", (route) => route.fulfill({ json: { enabled: false, percent: 0 } }));
  await page.route("**/gacha/economy", (route) => route.fulfill({ json: emptyEconomy }));
  await page.goto("/gacha/cartas");
  await page.getByRole("button", { name: /Carta Holo/ }).click();
  const preview = page.locator("dialog");
  await expect(preview.getByRole("button", { name: "Queimar carta" })).toBeVisible();
  await expect(preview.getByRole("button", { name: /Crystal|crystals/ })).toHaveCount(0);
});
