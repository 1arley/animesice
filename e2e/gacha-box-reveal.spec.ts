import { test, expect, type Page } from "@playwright/test";
import { blockAds, loginAs } from "./helpers";

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  await loginAs(page);
  await page.route("**/gacha/economy**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let json: unknown = { items: [], total: 0, page: 1 };
    if (path.endsWith("/economy"))
      json = {
        balance: 4000,
        available: 4000,
        reserved: 0,
        commonBoxes: 2,
        rareBoxes: 2,
        premiumBoxes: 2,
        keys: 6,
        spinResets: 0,
        loyaltyDays: 1,
      };
    else if (path.endsWith("/odds"))
      json = {
        boxPrices: { COMMON: 500, RARE: 1000, PREMIUM: 2000 },
        keyPrice: 100,
        categories: {},
        qualities: {},
      };
    else if (path.endsWith("/shop") || path.endsWith("/skins/mine")) json = [];
    else if (path.includes("/mission") || path.endsWith("/visit"))
      json = { visits: 0, ready: false };
    return route.fulfill({ json });
  });
});

function openButton(page: import("@playwright/test").Page, tier: string) {
  return page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: tier, exact: true }) })
    .getByRole("button", { name: "Abrir", exact: true });
}

async function mockPurchaseFlow(page: Page, failKeyPurchase = false) {
  const calls: string[] = [];
  let inventory = {
    balance: 4000,
    available: 4000,
    reserved: 0,
    commonBoxes: 0,
    rareBoxes: 2,
    premiumBoxes: 2,
    keys: 0,
    spinResets: 0,
    loyaltyDays: 1,
  };
  await page.route("**/gacha/economy**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/economy")) return route.fulfill({ json: inventory });
    if (path.endsWith("/boxes/open")) {
      calls.push("open");
      return route.fulfill({
        json: { reward: { category: "CRYSTAL", amount: 75 } },
      });
    }
    if (path.endsWith("/boxes")) {
      calls.push("box");
      inventory = { ...inventory, commonBoxes: 1, available: 3500 };
      return route.fulfill({ json: { inventory } });
    }
    return route.fallback();
  });
  await page.route("**/gacha/economy/keys**", async (route) => {
    calls.push("key");
    if (failKeyPurchase) {
      return route.fulfill({ status: 400, json: { message: "Compra recusada." } });
    }
    inventory = { ...inventory, keys: 1, available: 3400 };
    return route.fulfill({ json: { inventory } });
  });
  await page.route("**/gacha/economy/odds", (route) =>
    route.fulfill({
      json: {
        boxPrices: { COMMON: 500, RARE: 1000, PREMIUM: 2000 },
        keyPrice: 100,
        categories: {},
        qualities: {},
      },
    }),
  );
  return calls;
}

test("filme toca uma vez e só depois revela o prêmio, sem spoiler no toast", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let calls = 0;
  await page.route("**/boxes/open", (route) => {
    calls++;
    return route.fulfill({
      json: { reward: { category: "CRYSTAL", amount: 640 } },
    });
  });
  await page.goto("/gacha/loja");
  const trigger = openButton(page, "Premium");
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const movie = dialog.locator("video");
  await expect(movie).toHaveAttribute("src", "/gacha/box-premium.mp4");
  await expect
    .poll(() => movie.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.1);
  await expect(page.getByText("640 cristais", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("box-opening.png") });
  await expect(dialog.getByText("640 cristais", { exact: true })).toBeVisible({
    timeout: 7000,
  });
  await expect(dialog).toHaveAccessibleName("Premium aberta");
  expect(calls).toBe(1);
  await expect(movie).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("box-reward.png") });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(trigger).toBeFocused();
});

test("pular não inventa prêmio; fechar durante API lenta preserva o resultado", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let resolve!: () => void;
  const wait = new Promise<void>((done) => {
    resolve = done;
  });
  await page.route("**/boxes/open", async (route) => {
    await wait;
    await route.fulfill({ json: { reward: { category: "KEY", amount: 2 } } });
  });
  await page.goto("/gacha/loja");
  await openButton(page, "Rara").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Pular animação" }).click();
  await expect(
    dialog.getByRole("button", { name: "Aguardando recompensa…" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ver abertura" }),
  ).toBeFocused();
  resolve();
  await expect(page.getByText("2 chaves", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ver resultado da caixa" }).click();
  await expect(dialog.getByText("2 chaves", { exact: true })).toBeVisible();
  await expect(dialog.locator("video")).toHaveCount(0);
});

test("movimento reduzido revela direto e não baixa vídeo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const movies: string[] = [];
  page.on("request", (req) => {
    if (/\/gacha\/box-.*\.mp4/.test(req.url())) movies.push(req.url());
  });
  await page.route("**/boxes/open", (route) =>
    route.fulfill({ json: { reward: { category: "SPIN_RESET", amount: 1 } } }),
  );
  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("1 reset de giro (5 previews)", { exact: true }),
  ).toBeVisible();
  expect(movies).toEqual([]);
});

test("só permite abrir outra caixa depois de confirmar o inventário atualizado", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let inventoryReads = 0;
  let releaseRefresh!: () => void;
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  await page.route("**/gacha/economy**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/economy")) {
      inventoryReads++;
      if (inventoryReads === 2) await refreshGate;
      return route.fulfill({
        json: {
          balance: 4000,
          available: 4000,
          reserved: 0,
          commonBoxes: 1,
          rareBoxes: 2,
          premiumBoxes: 2,
          keys: 1,
          spinResets: 0,
          loyaltyDays: 1,
        },
      });
    }
    return route.fallback();
  });
  await page.route("**/boxes/open", (route) =>
    route.fulfill({ json: { reward: { category: "CRYSTAL", amount: 50 } } }),
  );
  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("50 cristais", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^Abrir outra/ })).toHaveCount(
    0,
  );
  releaseRefresh();
  await expect(
    dialog.getByRole("button", { name: /^Abrir outra/ }),
  ).toBeEnabled();
});

test("compra caixa e chave antes de abrir", async ({ page }) => {
  const calls = await mockPurchaseFlow(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gacha/loja");
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Comum", exact: true }) })
    .getByRole("button", { name: /Comprar e abrir/ })
    .click();
  await expect(
    page.getByRole("dialog").getByText("75 cristais", { exact: true }),
  ).toBeVisible();
  expect(calls).toEqual(["box", "key", "open"]);
});

test("não abre a caixa se a compra da chave falhar", async ({ page }) => {
  const calls = await mockPurchaseFlow(page, true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gacha/loja");
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Comum", exact: true }) })
    .getByRole("button", { name: /Comprar e abrir/ })
    .click();
  await expect(page.getByText("Compra recusada.", { exact: true })).toBeVisible();
  expect(calls).toEqual(["box", "key"]);
});

test("vídeo ausente não esconde recompensa e erro da API não celebra sucesso", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/gacha/box-*.mp4", (route) => route.abort());
  let calls = 0;
  await page.route("**/boxes/open", (route) => {
    calls++;
    return calls === 1
      ? route.fulfill({
          json: { reward: { category: "CRYSTAL", amount: 100 } },
        })
      : route.fulfill({
          status: 400,
          json: { message: "Sem chaves disponíveis." },
        });
  });
  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("100 cristais", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await openButton(page, "Rara").click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Sem chaves disponíveis.",
  );
  await expect(dialog.getByText("Você ganhou")).toHaveCount(0);
  await expect(dialog.locator("video")).toHaveCount(0);
  expect(calls).toBe(2);
});

test("download travado libera a recompensa sem depender do evento ended", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/gacha/box-*.mp4", () => {});
  await page.route("**/boxes/open", (route) =>
    route.fulfill({ json: { reward: { category: "CRYSTAL", amount: 750 } } }),
  );
  await page.goto("/gacha/loja");
  await openButton(page, "Rara").click();
  await expect(
    page.getByRole("dialog").getByText("750 cristais", { exact: true }),
  ).toBeVisible({ timeout: 7000 });
});

test("arte e nome longo cabem na cena; teclado permanece no diálogo", async ({
  page,
}, info) => {
  const name =
    "Aeliana — Guardiã dos cristais do inverno e das constelações distantes";
  await page.route("**/test-box-art.png", (route) =>
    route.fulfill({
      path: "public/aeliana/Aeliana.png",
      contentType: "image/png",
    }),
  );
  await page.route("**/boxes/open", (route) =>
    route.fulfill({
      json: {
        reward: {
          category: "CARD",
          name,
          rarity: "LENDARIA",
          image: "https://cdn.myanimelist.net/test-box-art.png",
          foil: "HOLO",
        },
      },
    }),
  );
  await page.goto("/gacha/loja");
  await openButton(page, "Rara").click();
  const dialog = page.getByRole("dialog");
  const art = dialog.getByRole("img", { name, exact: true });
  await expect(dialog.getByText("Lendária", { exact: true })).toBeVisible();
  await expect(art).toBeVisible();
  await expect
    .poll(() => art.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Continuar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  const again = dialog.getByRole("button", { name: /^Abrir outra/ });
  if (await again.count()) {
    await expect(again).toBeFocused();
    await page.keyboard.press("Tab");
  }
  await expect(
    dialog.getByRole("button", { name: "Voltar à loja", exact: true }),
  ).toBeFocused();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath("box-card-reward.png") });
});

test("abrir outra caixa toca o filme de novo, sem reaproveitar estado antigo", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let calls = 0;
  await page.route("**/boxes/open", (route) => {
    calls++;
    return route.fulfill({
      json: { reward: { category: "CRYSTAL", amount: 100 + calls } },
    });
  });
  await page.goto("/gacha/loja");
  const dialog = page.getByRole("dialog");

  await openButton(page, "Comum").click();
  await expect(dialog.getByText("101 cristais", { exact: true })).toBeVisible({
    timeout: 7000,
  });
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  // A segunda abertura precisa recomeçar: `finished` da primeira não pode
  // pular o filme e revelar o prêmio direto.
  await openButton(page, "Rara").click();
  const movie = dialog.locator("video");
  await expect(movie).toHaveAttribute("src", "/gacha/box-rare.mp4");
  await expect
    .poll(() => movie.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await expect(dialog.getByText("102 cristais", { exact: true })).toHaveCount(
    0,
  );
  await expect(dialog.getByText("102 cristais", { exact: true })).toBeVisible({
    timeout: 7000,
  });
  expect(calls).toBe(2);
});
