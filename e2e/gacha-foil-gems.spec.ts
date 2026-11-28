import { test, expect, type Page, type Route } from "@playwright/test";
import { blockAds, loginAs } from "./helpers";

const emptyEconomy = {
  commonBoxes: 0, rareBoxes: 0, premiumBoxes: 0, keys: 0, spinResets: 0,
  weeklyRewardReady: false, loyaltyDays: 0, loyaltyRarePlusReady: false,
  balance: 0, reserved: 0, available: 0,
  titanitaShards: 0, titanitaItems: 0, titanitaSombriaShards: 0,
  titanitaSombriaItems: 0, draconicaShards: 0, draconicaItems: 0,
  sombriaDraconicaShards: 0, sombriaDraconicaItems: 0, protecao: 0,
  foilExtractors: 0,
  holoShards: 20, goldShards: 0, inkShards: 0, prismShards: 0,
  holoGems: 0, goldGems: 0, inkGems: 0, prismGems: 0,
  dailyClaimedToday: false, watchEarnedToday: 0,
  itemConfig: {
    item_shop_price: {}, item_convert_value: {}, item_recipes: {},
    item_eligibility: {}, item_condition_anchor: {}, card_floors: {},
    base_value: {}, foil_mult: {}, reroll_cost_pct: 0,
    reroll_protection_mint_block: false,
    foil_extract_fragments: { default: 10 },
    gem_fragment_recipe: 20,
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
  await expect(page.getByRole("heading", { name: "Melhorar uma carta" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Melhorar cartas" })).toHaveAttribute(
    "href",
    "/gacha/inventario/fragmentos#melhorar-carta",
  );
  await expect(page.getByRole("heading", { name: "Proteção de reroll" })).toBeVisible();

  await page.getByRole("link", { name: "Abrir oficina de fragmentos" }).click();
  await expect(page).toHaveURL(/\/gacha\/inventario\/fragmentos$/);
  await expect(page.getByRole("heading", { name: "Fragmentos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fragmentos e gemas de foil" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fragmentos de pedras" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Melhorar uma carta" })).toBeVisible();

  await page.getByRole("link", { name: "← Voltar ao inventário" }).click();
  await expect(page).toHaveURL(/\/gacha\/inventario$/);
});

test("blocks cross-route actions while an operation awaits a retry", async ({ page }) => {
  const inventory = {
    ...emptyEconomy,
    available: 1000,
    titanitaShards: 1,
    holoShards: 20,
    itemConfig: {
      ...emptyEconomy.itemConfig,
      item_shop_price: { TITANITA: 25, PROTECAO: 150 },
      item_convert_value: { TITANITA: 5 },
      item_recipes: { TITANITA: 10 },
      item_shop_enabled: { TITANITA: true, PROTECAO: true },
      item_drop_available: { TITANITA: true, PROTECAO: true },
    },
  };
  const pendingCraft = "animesice:gacha-item-op:viewer-1:craft:TITANITA:1";
  const pendingUse = "animesice:gacha-item-op:viewer-1:use:TITANITA:normal-card";
  const pendingProtection = "animesice:gacha-item-op:viewer-1:buy:PROTECAO:1";
  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/economy", (route) => route.fulfill({ json: inventory }));
  await page.route("**/gacha/collection/normal-card", (route) =>
    route.fulfill({ json: { card: cards[0] } }),
  );
  await page.route("**/gacha/collection?**", (route) => route.fulfill({ json: {
    data: cards, meta: { page: 1, limit: 100, total: cards.length, totalPages: 1 },
  } }));

  await page.goto("/gacha/inventario");
  await page.evaluate((key) => localStorage.setItem(key, "pending-id"), pendingCraft);
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "Há uma operação de fragmentos pendente" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar proteção" })).toBeDisabled();
  await page.getByRole("link", { name: "Abrir fragmentos" }).click();
  await expect(page.getByRole("button", { name: "Repetir a mesma operação com segurança" })).toBeVisible();

  await page.evaluate(([oldKey, useKey]) => {
    localStorage.removeItem(oldKey);
    localStorage.setItem(useKey, "pending-use-id");
  }, [pendingCraft, pendingUse]);
  await page.goto("/gacha/inventario");
  await expect(page.getByRole("status").filter({ hasText: "Há uma operação de fragmentos pendente" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar proteção" })).toBeDisabled();
  await page.goto("/gacha/inventario/fragmentos");
  await expect(page.getByRole("button", { name: "Repetir a mesma melhoria com segurança" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Converter", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Fabricar pedra" })).toBeDisabled();
  await expect(page.getByLabel("Pedra", { exact: true })).toBeDisabled();

  await page.evaluate(([useKey, newKey]) => {
    localStorage.removeItem(useKey);
    localStorage.setItem(newKey, "pending-id");
  }, [pendingUse, pendingProtection]);
  await page.goto("/gacha/inventario/fragmentos");
  await expect(page.getByRole("status").filter({ hasText: "Há uma operação do inventário pendente" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fabricar gema · 20 fragmentos" }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Converter", exact: true })).toBeDisabled();
});

test("moves the selected mineral when the owned filter removes it", async ({ page }) => {
  let current = {
    ...emptyEconomy,
    titanitaShards: 1,
    draconicaShards: 10,
    itemConfig: {
      ...emptyEconomy.itemConfig,
      item_convert_value: { TITANITA: 5, DRACONICA: 8 },
      item_recipes: { TITANITA: 10, DRACONICA: 12 },
    },
  };
  await openFragments(page, current);
  await page.route("**/gacha/economy", (route) => route.fulfill({ json: current }));
  await page.route("**/gacha/economy/items/convert", async (route) => {
    current = { ...current, titanitaShards: 0 };
    await route.fulfill({ json: { ok: true } });
  });

  await page.getByRole("button", { name: "Somente com saldo" }).click();
  await page.getByRole("button", { name: /^Titanita/ }).click();
  const oneButton = page.getByRole("button", { name: "1×" });
  const oneButtonBox = await oneButton.boundingBox();
  expect(oneButtonBox?.width).toBeGreaterThanOrEqual(44);
  expect(oneButtonBox?.height).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "Converter", exact: true }).click();

  await expect(page.getByRole("button", { name: /^Titanita/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Magnetita/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Magnetita", exact: true })).toBeVisible();
});

test("gerencia fragmentos de pedras, melhora carta na oficina, filtra categorias e evita overflow", async ({ page }) => {
  const upgradeCard = {
    ...cards[0],
    id: "upgrade-card",
    condition: 0.25,
    conditionLabel: "EX",
    value: 300,
    card: { ...cards[0].card, name: "Carta EX" },
  };
  let currentCards = [upgradeCard, ...cards];
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
      item_eligibility: {
        DRACONICA: {
          foils: ["NORMAL", "HOLO"],
          sourceConditions: ["EX", "NM"],
          maxCondition: "MINT",
        },
      },
      item_condition_anchor: {
        PLAYED: 0.45,
        EX: 0.25,
        NM: 0.1,
        MINT: 0.03,
      },
      base_value: { RARA: 100 },
      foil_mult: { NORMAL: 1, HOLO: 2 },
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
    data: currentCards, meta: { page: 1, limit: 100, total: currentCards.length, totalPages: 1 },
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
  const useRequests: { kind: string; userCardId: string; operationId: string }[] = [];
  await page.route("**/gacha/economy/items/use", async (route) => {
    const body = route.request().postDataJSON() as {
      kind: string;
      userCardId: string;
      operationId: string;
    };
    useRequests.push(body);
    current = { ...current, draconicaItems: current.draconicaItems - 1 };
    currentCards = currentCards.map((card) =>
      card.id === body.userCardId
        ? { ...card, condition: 0.1, conditionLabel: "NM", value: 400 }
        : card,
    );
    await route.fulfill({
      json: { userCardId: body.userCardId, condition: 0.1, conditionLabel: "NM", value: 400 },
    });
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

  await page.getByRole("link", { name: /Usar Magnetita em uma carta/ }).click();
  await expect(page).toHaveURL(/\/gacha\/inventario\/fragmentos#melhorar-carta$/);
  await expect(page.getByLabel("Pedra", { exact: true })).toHaveValue("DRACONICA");
  await page.getByLabel("Carta elegível para Magnetita").selectOption("upgrade-card");
  await expect(page.getByText("Condição: EX → NM · Valor: 300 → 400 cristais")).toBeVisible();
  await expect(page.getByText("Foil mantido: NORMAL")).toBeVisible();
  await page.getByRole("button", { name: "Usar pedra" }).click();
  const confirmDialog = page.getByRole("dialog", { name: "Confirmar melhoria?" });
  await expect(confirmDialog.getByRole("heading", { name: "Confirmar melhoria?" })).toBeVisible();
  await confirmDialog.getByRole("button", { name: "Usar pedra" }).click();
  await expect(confirmDialog).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Carta melhorada; saldos e coleção atualizados." })).toBeVisible();
  expect(useRequests).toHaveLength(1);
  expect(useRequests[0]).toMatchObject({ kind: "DRACONICA", userCardId: "upgrade-card" });
  expect(useRequests[0].operationId).toMatch(/^[0-9a-f-]{36}$/i);

  // Query string ?pedra=DRACONICA pré-seleciona Magnetita e layout evita overflow no desktop e mobile
  await page.goto("/gacha/inventario/fragmentos?pedra=DRACONICA");
  await expect(page.getByRole("button", { name: /^Magnetita 1 \// })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Pedra", { exact: true })).toHaveValue("DRACONICA");
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/gacha/inventario");
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

test("compra Extrator de Foil no inventário com idempotência", async ({ page }) => {
  let current = {
    ...emptyEconomy,
    balance: 5000,
    available: 5000,
    foilExtractors: 0,
    itemConfig: {
      ...emptyEconomy.itemConfig,
      item_shop_price: { PROTECAO: 150, EXTRATOR_FOIL: 2000 },
      item_shop_enabled: { PROTECAO: true, EXTRATOR_FOIL: true },
      item_drop_available: { PROTECAO: true, EXTRATOR_FOIL: false },
    },
  };
  const buyBodies: { kind: string; quantity: number; operationId: string }[] = [];

  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/economy", (route) => route.fulfill({ json: current }));
  await page.route("**/gacha/economy/items/buy", async (route) => {
    const body = route.request().postDataJSON() as {
      kind: string;
      quantity: number;
      operationId: string;
    };
    buyBodies.push(body);
    current = {
      ...current,
      balance: current.balance - 2000 * body.quantity,
      available: current.available - 2000 * body.quantity,
      foilExtractors: (current.foilExtractors ?? 0) + body.quantity,
    };
    await route.fulfill({ json: { ok: true } });
  });

  await page.goto("/gacha/inventario");
  await expect(page.getByRole("heading", { name: "Extrator de Foil" })).toBeVisible();
  await page.getByLabel("Quantidade de extratores").fill("2");
  await page.getByRole("button", { name: "Comprar extrator de foil" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Operação concluída." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Extrair foil", exact: true })).toHaveAttribute(
    "href",
    "/gacha/inventario/fragmentos#extrair-foil",
  );
  expect(buyBodies).toHaveLength(1);
  expect(buyBodies[0]).toMatchObject({ kind: "EXTRATOR_FOIL", quantity: 2 });
  expect(buyBodies[0].operationId).toMatch(/^[0-9a-f-]{36}$/i);

  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("extrai foil na oficina de fragmentos com feedback e retry idempotente", async ({ page }) => {
  let current = {
    ...emptyEconomy,
    holoShards: 0,
    foilExtractors: 1,
  };
  let currentCards = [...cards];
  const extractBodies: { userCardId: string; operationId: string }[] = [];
  let failOnce = true;

  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/economy", (route) => route.fulfill({ json: current }));
  await page.route("**/gacha/collection?**", (route) =>
    route.fulfill({
      json: {
        data: currentCards,
        meta: { page: 1, limit: 100, total: currentCards.length, totalPages: 1 },
      },
    }),
  );
  await page.route("**/gacha/economy/gems/extract/preview/foil-card", (route) =>
    route.fulfill({
      json: {
        userCardId: "foil-card",
        cardName: "Carta Holo",
        rarity: "RARA",
        edition: 1,
        condition: 0.5,
        conditionLabel: "NM",
        currentFoil: "HOLO",
        targetFoil: "NORMAL",
        currentValue: 100,
        projectedValue: 50,
        currentRankedValue: 100,
        projectedRankedValue: 50,
        extractorsAvailable: current.foilExtractors,
        fragments: {
          foil: "HOLO",
          itemId: "FRAG_HOLO",
          itemName: "Fragmento Holo",
          quantity: 10,
        },
        canExtract: (current.foilExtractors ?? 0) >= 1 && currentCards[1]?.foil === "HOLO",
        blockedReason: (current.foilExtractors ?? 0) >= 1 ? null : "Extrator de Foil insuficiente.",
      },
    }),
  );
  await page.route("**/gacha/economy/gems/extract", async (route) => {
    const body = route.request().postDataJSON() as {
      userCardId: string;
      operationId: string;
    };
    extractBodies.push(body);
    if (failOnce) {
      failOnce = false;
      return route.abort();
    }
    current = {
      ...current,
      holoShards: current.holoShards + 10,
      foilExtractors: Math.max(0, (current.foilExtractors ?? 0) - 1),
    };
    currentCards = currentCards.map((c) =>
      c.id === "foil-card" ? { ...c, foil: "NORMAL", value: 50 } : c,
    );
    await route.fulfill({
      json: {
        userCardId: "foil-card",
        extractedFoil: "HOLO",
        foil: "NORMAL",
        value: 50,
        rankedValue: 50,
        extractorsRemaining: current.foilExtractors,
        fragments: {
          foil: "HOLO",
          itemId: "FRAG_HOLO",
          itemName: "Fragmento Holo",
          quantity: 10,
        },
      },
    });
  });

  await page.goto("/gacha/inventario/fragmentos#extrair-foil");
  await expect(page.getByRole("heading", { name: "Extrair foil para fragmentos" })).toBeVisible();

  await page.getByRole("button", { name: /Carta Holo/ }).click();
  await page.getByRole("button", { name: "Extrair foil" }).click();

  const dialog = page.getByRole("dialog", { name: "Extrair foil da carta?" });
  await expect(dialog.getByText("+10 Fragmento Holo")).toBeVisible();
  await expect(dialog.getByText("Holo → Normal")).toBeVisible();
  await dialog.getByRole("button", { name: "Confirmar extração" }).click();

  await expect(dialog.getByRole("alert")).toContainText("Resultado incerto");
  await dialog.getByRole("button", { name: "Repetir com segurança" }).click();

  expect(extractBodies).toHaveLength(2);
  expect(extractBodies[0]).toEqual(extractBodies[1]);

  const feedback = page.getByRole("dialog", { name: "Foil extraído" });
  await expect(feedback).toBeVisible();
  await expect(feedback.getByText("+10 Fragmento Holo")).toBeVisible();
  await expect(feedback.getByText("Extratores restantes: 0")).toBeVisible();
  await feedback.getByRole("button", { name: "Continuar" }).click();
  await expect(feedback).toHaveCount(0);

  await expect(page.getByRole("status").filter({ hasText: "Foil extraído; fragmentos e coleção atualizados." })).toBeVisible();
  await expect(page.getByText("Nenhuma carta com foil encontrada na coleção.")).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("extrai foil pelo CardPreview na coleção preservando carta e bloqueia carta indisponível", async ({ page }) => {
  const blockedCard = {
    ...cards[1],
    id: "blocked-foil-card",
    card: { ...cards[1].card, id: "card-c", name: "Carta em Troca" },
  };
  let current = { ...emptyEconomy, foilExtractors: 1 };
  let collectionCards = [cards[1], blockedCard];

  await blockAds(page);
  await blockExternalNavigation(page);
  await loginAs(page);
  await page.route("**/gacha/collection?**", (route) =>
    route.fulfill({
      json: {
        data: collectionCards,
        meta: { page: 1, limit: 24, total: collectionCards.length, totalPages: 1 },
      },
    }),
  );
  await page.route("**/gacha/featured", (route) => route.fulfill({ json: null }));
  await page.route("**/gacha/collections/progress", (route) => route.fulfill({ json: [] }));
  await page.route("**/gacha/engagement-pilot", (route) => route.fulfill({ json: { enabled: false, percent: 0 } }));
  await page.route("**/gacha/economy", (route) => route.fulfill({ json: current }));
  await page.route("**/gacha/economy/gems/extract/preview/foil-card", (route) =>
    route.fulfill({
      json: {
        userCardId: "foil-card",
        cardName: "Carta Holo",
        rarity: "RARA",
        edition: 1,
        condition: 0.5,
        conditionLabel: "NM",
        currentFoil: "HOLO",
        targetFoil: "NORMAL",
        currentValue: 100,
        projectedValue: 50,
        currentRankedValue: 100,
        projectedRankedValue: 50,
        extractorsAvailable: 1,
        fragments: { foil: "HOLO", itemId: "FRAG_HOLO", itemName: "Fragmento Holo", quantity: 10 },
        canExtract: true,
        blockedReason: null,
      },
    }),
  );
  await page.route("**/gacha/economy/gems/extract/preview/blocked-foil-card", (route) =>
    route.fulfill({
      json: {
        userCardId: "blocked-foil-card",
        cardName: "Carta em Troca",
        rarity: "RARA",
        edition: 1,
        condition: 0.5,
        conditionLabel: "NM",
        currentFoil: "HOLO",
        targetFoil: "NORMAL",
        currentValue: 100,
        projectedValue: 50,
        currentRankedValue: 100,
        projectedRankedValue: 50,
        extractorsAvailable: 1,
        fragments: { foil: "HOLO", itemId: "FRAG_HOLO", itemName: "Fragmento Holo", quantity: 10 },
        canExtract: false,
        blockedReason: "Carta envolvida em troca pendente.",
      },
    }),
  );
  await page.route("**/gacha/economy/gems/extract", async (route) => {
    current = { ...current, foilExtractors: 0, holoShards: 30 };
    collectionCards = collectionCards.map((c) =>
      c.id === "foil-card" ? { ...c, foil: "NORMAL", value: 50 } : c,
    );
    await route.fulfill({
      json: {
        userCardId: "foil-card",
        extractedFoil: "HOLO",
        foil: "NORMAL",
        value: 50,
        rankedValue: 50,
        extractorsRemaining: 0,
        fragments: { foil: "HOLO", itemId: "FRAG_HOLO", itemName: "Fragmento Holo", quantity: 10 },
      },
    });
  });

  await page.goto("/gacha/cartas");
  await page.getByRole("button", { name: /Carta em Troca/ }).click();
  await page.getByRole("button", { name: /Extrair foil/ }).click();
  const blockedDialog = page.getByRole("dialog", { name: "Extrair foil da carta?" });
  await expect(blockedDialog.getByRole("alert")).toContainText("Carta envolvida em troca pendente.");
  await expect(blockedDialog.getByRole("button", { name: "Confirmar extração" })).toBeDisabled();
  await blockedDialog.getByRole("button", { name: "Cancelar" }).click();

  await page.getByRole("button", { name: /Carta Holo/ }).click();
  await page.getByRole("button", { name: "Extrair foil · 1 no inventário" }).click();
  const confirmDialog = page.getByRole("dialog", { name: "Extrair foil da carta?" });
  await confirmDialog.getByRole("button", { name: "Confirmar extração" }).click();

  const feedback = page.getByRole("dialog", { name: "Foil extraído" });
  await expect(feedback).toBeVisible();
  await feedback.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: /Carta Holo/ })).toBeVisible();
});
