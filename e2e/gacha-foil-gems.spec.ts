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
      ? route.fallback()
      : route.abort();
  });
}

async function openFragments(page: Page, inventory = emptyEconomy) {
  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/economy", (route: Route) => route.fulfill({ json: inventory }));
  await page.route("**/gacha/collection?**", (route: Route) => route.fulfill({ json: {
    data: cards, meta: { page: 1, limit: 100, total: cards.length, totalPages: 1 },
  } }));
  await page.goto("/gacha/inventario/fragmentos");
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
  await page.goto("/gacha/inventario/fragmentos");
  const button = page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first();
  await button.click();
  await expect(page.getByRole("status").filter({ hasText: "Gema Holo fabricada. Restam 0 fragmentos e você tem 1 gema." })).toBeVisible();
  await expect(page.getByText("Fragmentos:").first()).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ foil: "HOLO" });
  expect((requests[0] as { operationId: string }).operationId).toMatch(/^[0-9a-f-]{36}$/i);
});

test("retries gem craft with the same operation id after a lost response", async ({ page }) => {
  await openFragments(page, { ...emptyEconomy, holoShards: 20 });
  const bodies: { foil: string; operationId: string }[] = [];
  let attempts = 0;
  await page.route("**/gacha/economy/gems/craft", async (route) => {
    bodies.push(route.request().postDataJSON());
    if (++attempts === 1) return route.abort();
    await route.fulfill({ json: { ...emptyEconomy, holoGems: 1 } });
  });
  const button = page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first();
  await button.click();
  await expect(page.locator('p[role="alert"]')).toBeVisible();
  await button.click();
  await expect(page.locator('p[role="status"]').filter({ hasText: "Gema Holo fabricada" })).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toEqual(bodies[1]);
});

test("mostra erro autoritativo do backend ao craftar sem saldo", async ({ page }) => {
  await openFragments(page);
  await page.route("**/gacha/economy/gems/craft", (route) => route.fulfill({
    status: 400,
    json: { message: "Fragmentos insuficientes para fabricar esta gema." },
  }));
  await page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first().click();
  await expect(page.locator('p[role="alert"]')).toContainText("Fragmentos insuficientes");
});

test("desabilita craft sem saldo e aplicação sem gema; oculta carta com foil", async ({ page }) => {
  await openFragments(page, { ...emptyEconomy, holoShards: 19 });
  await expect(page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first()).toBeDisabled();
  await expect(page.getByRole("option", { name: /Carta Holo/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aplicar gema" })).toBeDisabled();
  await expect(page.getByText("Cartas com foil não aceitam outra gema.")).toBeVisible();
});

test("aplica gema e atualiza foil e valor com a resposta do backend", async ({ page }) => {
  const inventory = { ...emptyEconomy, holoShards: 0, holoGems: 1 };
  await openFragments(page, inventory);
  let economyRequests = 0;
  await page.route("**/gacha/economy/gems/apply", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ foil: "HOLO", userCardId: "normal-card" });
    expect(route.request().postDataJSON().operationId).toMatch(/^[0-9a-f-]{36}$/i);
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

test("separa fragmentos do inventário principal com navegação bidirecional", async ({ page }) => {
  const richEconomy = {
    ...emptyEconomy,
    available: 1200,
    holoShards: 22,
    titanitaShards: 15,
    titanitaItems: 2,
    protecao: 1,
    itemConfig: {
      ...emptyEconomy.itemConfig,
      item_recipes: { TITANITA: 10, DRACONICA: 12 },
      item_convert_value: { TITANITA: 5, DRACONICA: 8 },
      item_shop_price: { TITANITA: 25, PROTECAO: 150 },
      item_shop_enabled: { TITANITA: true, PROTECAO: true },
      item_drop_available: { TITANITA: true, PROTECAO: true },
    },
  };
  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/economy", (route) => route.fulfill({ json: richEconomy }));
  await page.route("**/gacha/collection?**", (route) => route.fulfill({ json: {
    data: cards, meta: { page: 1, limit: 100, total: cards.length, totalPages: 1 },
  } }));

  await page.goto("/gacha/inventario");
  await expect(page.getByRole("heading", { name: "Inventário", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Oficina de Fragmentos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fragmentos e gemas de foil" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pedras e fragmentos" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Melhorar uma carta" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proteção de reroll" })).toBeVisible();

  await page.getByRole("link", { name: "Abrir oficina de fragmentos" }).click();
  await expect(page).toHaveURL(/\/gacha\/inventario\/fragmentos$/);
  await expect(page.getByRole("heading", { name: "Fragmentos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fragmentos e gemas de foil" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fragmentos de pedras" })).toBeVisible();

  await page.getByRole("link", { name: "← Voltar ao inventário" }).click();
  await expect(page).toHaveURL(/\/gacha\/inventario$/);
});

test("gerencia fragmentos de pedras, filtra categorias, trata erro/vazio e evita overflow", async ({ page }) => {
  let current = {
    ...emptyEconomy,
    holoShards: 0,
    titanitaShards: 12,
    titanitaItems: 0,
    draconicaShards: 14,
    draconicaItems: 1,
    itemConfig: {
      ...emptyEconomy.itemConfig,
      item_recipes: { TITANITA: 10, DRACONICA: 12 },
      item_convert_value: { TITANITA: 5, DRACONICA: 8 },
      item_shop_price: { TITANITA: 25, DRACONICA: 40 },
      item_shop_enabled: { TITANITA: true, DRACONICA: true },
      item_drop_available: { TITANITA: true, DRACONICA: true },
    },
  };
  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);

  let failFirst = true;
  await page.route("**/gacha/economy", (route) => {
    if (failFirst) {
      failFirst = false;
      return route.fulfill({ status: 500, json: { message: "Erro temporário" } });
    }
    return route.fulfill({ json: current });
  });
  await page.route("**/gacha/collection?**", (route) => route.fulfill({ json: {
    data: cards, meta: { page: 1, limit: 100, total: cards.length, totalPages: 1 },
  } }));
  await page.route("**/gacha/economy/items/craft", async (route) => {
    const body = route.request().postDataJSON() as { kind: string; quantity: number; operationId: string };
    expect(body.kind).toBe("DRACONICA");
    expect(body.quantity).toBe(1);
    expect(body.operationId).toMatch(/^[0-9a-f-]{36}$/i);
    current = { ...current, draconicaShards: 2, draconicaItems: 2 };
    await route.fulfill({ json: { kind: "DRACONICA", quantity: 1, shards: 2 } });
  });
  await page.route("**/gacha/economy/items/convert", async (route) => {
    const body = route.request().postDataJSON() as { kind: string; quantity: number; operationId: string };
    expect(body.kind).toBe("DRACONICA");
    expect(body.quantity).toBe(1);
    expect(body.operationId).toMatch(/^[0-9a-f-]{36}$/i);
    current = { ...current, draconicaShards: 1 };
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto("/gacha/inventario/fragmentos");
  await expect(page.locator('p[role="alert"]')).toContainText("Não foi possível carregar seus fragmentos");
  await page.getByRole("button", { name: "Tentar novamente" }).click();

  await expect(page.getByRole("heading", { name: "Fragmentos de pedras" })).toBeVisible();
  await page.getByRole("button", { name: "Pedras", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fragmentos e gemas de foil" })).toHaveCount(0);

  await expect(page.getByRole("button", { name: /^Titanita Sombria/ })).toBeVisible();
  await page.getByRole("button", { name: "Somente com saldo" }).click();
  await expect(page.getByRole("button", { name: /^Titanita Sombria/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Somente com saldo" }).click();
  await expect(page.getByRole("button", { name: /^Titanita Sombria/ })).toBeVisible();

  await page.getByRole("button", { name: /^Magnetita 14/ }).click();
  await page.getByRole("button", { name: "Fabricar pedra" }).click();
  const forgeDialog = page.locator("dialog[open]");
  await expect(forgeDialog.getByRole("heading", { name: "Forja de pedras" })).toBeVisible();
  await expect(forgeDialog.getByText("1 Magnetita fabricada.")).toBeVisible();
  await forgeDialog.getByRole("button", { name: "Continuar" }).click();
  await expect(forgeDialog).toHaveCount(0);
  await expect(page.getByText(/Fabricação concluída: \+1 pedra\(s\) de Magnetita/)).toBeVisible();
  await page.getByRole("button", { name: "Converter", exact: true }).click();
  await expect(page.getByText("Fragmentos convertidos em cristais.")).toBeVisible();

  await page.getByRole("link", { name: /Melhorar carta com Magnetita no inventário/ }).click();
  await expect(page).toHaveURL(/\/gacha\/inventario\?pedra=DRACONICA#melhorar-carta$/);
  await expect(page.getByRole("button", { name: /Magnetita \d+ prontas$/ })).toHaveAttribute("aria-pressed", "true");

  // Layout sem overflow no desktop e mobile
  await page.goto("/gacha/inventario/fragmentos");
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("exibe erro na página e fecha o diálogo da forja ao falhar", async ({ page }) => {
  const economy = {
    ...emptyEconomy,
    titanitaShards: 12,
    itemConfig: {
      ...emptyEconomy.itemConfig,
      item_recipes: { TITANITA: 10 },
      item_convert_value: { TITANITA: 5 },
      item_shop_price: { TITANITA: 25 },
      item_shop_enabled: { TITANITA: true },
      item_drop_available: { TITANITA: true },
    },
  };
  await openFragments(page, economy);
  await page.route("**/gacha/economy/items/craft", (route) =>
    route.fulfill({
      status: 400,
      json: { message: "Fragmentos insuficientes para fabricar esta pedra." },
    }),
  );

  await page.getByRole("button", { name: "Fabricar pedra" }).click();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page.locator('p[role="alert"]')).toContainText("Fragmentos insuficientes para fabricar esta pedra.");
  await expect(page.getByRole("button", { name: "Fabricar pedra" })).toBeEnabled();
});

test("exibe orientação quando não há fragmentos no inventário", async ({ page }) => {
  await openFragments(page, { ...emptyEconomy, holoShards: 0 });
  await expect(page.getByText("Você ainda não possui fragmentos no estoque")).toBeVisible();
  await expect(page.getByRole("link", { name: "Girar agora" })).toBeVisible();
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
