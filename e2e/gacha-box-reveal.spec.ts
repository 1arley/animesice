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

test("abertura Three.js executa uma vez e só depois revela o prêmio, sem spoiler no toast", async ({
  page,
}, info) => {
  const pageErrors: string[] = [];
  const webglConsoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && /webgl|shader|three|nan|program/i.test(msg.text())) {
      webglConsoleErrors.push(msg.text());
    }
  });
  const mp4Requests: string[] = [];
  page.on("request", (req) => {
    if (/\/gacha\/box-.*\.mp4/.test(req.url())) mp4Requests.push(req.url());
  });
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
  await expect(dialog).toHaveAttribute("data-cinematic", "true");
  await expect(dialog).toHaveAttribute("data-tier", "PREMIUM");
  await expect(dialog.locator("video")).toHaveCount(0);
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });
  await expect(page.getByText("+640", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("box-opening.png") });
  await expect(dialog.getByText("+640", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(dialog.locator(".box-reveal-name")).toHaveText("Cristais");
  await expect(dialog).toHaveAccessibleName("Premium aberta");
  expect(calls).toBe(1);
  expect(mp4Requests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(webglConsoleErrors).toEqual([]);
  expect(webglConsoleErrors).toEqual([]);
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
  await expect(dialog.getByText("+2", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Chaves", { exact: true })).toBeVisible();
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
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("+1", { exact: true })).toBeVisible();
  await expect(dialog.locator(".box-reveal-name")).toHaveText("Reset de giro");
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
  await expect(dialog.getByText("+50", { exact: true })).toBeVisible();
  await expect(dialog.locator(".box-reveal-name")).toHaveText("Cristais");
  await expect(dialog.getByRole("button", { name: /^Abrir outra/ })).toHaveCount(
    0,
  );
  releaseRefresh();
  await expect(
    dialog.getByRole("button", { name: /^Abrir outra/ }),
  ).toBeEnabled();
});

test("ignora refresh atrasado de uma abertura anterior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 300 });
  let inventory = {
    balance: 4000,
    available: 4000,
    reserved: 0,
    commonBoxes: 3,
    rareBoxes: 2,
    premiumBoxes: 2,
    keys: 3,
    spinResets: 0,
    loyaltyDays: 1,
  };
  let openCalls = 0;
  let holdNextRefresh = false;
  let releaseOpen!: () => void;
  let releaseStaleRefresh!: () => void;
  let markStaleRefreshStarted!: () => void;
  const openGate = new Promise<void>((resolve) => {
    releaseOpen = resolve;
  });
  const staleRefreshGate = new Promise<void>((resolve) => {
    releaseStaleRefresh = resolve;
  });
  const staleRefreshStarted = new Promise<void>((resolve) => {
    markStaleRefreshStarted = resolve;
  });

  await page.route("**/gacha/economy**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/economy")) {
      const snapshot = { ...inventory };
      if (holdNextRefresh) {
        holdNextRefresh = false;
        markStaleRefreshStarted();
        await staleRefreshGate;
      }
      return route.fulfill({ json: snapshot });
    }
    if (path.endsWith("/boxes/open")) {
      const opening = ++openCalls;
      if (opening === 1) await openGate;
      inventory = {
        ...inventory,
        commonBoxes: inventory.commonBoxes - 1,
        keys: inventory.keys - 1,
      };
      if (opening === 1) holdNextRefresh = true;
      return route.fulfill({
        json: { reward: { category: "CRYSTAL", amount: 50 } },
      });
    }
    return route.fallback();
  });

  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  const dialog = page.getByRole("dialog");
  const liveStatus = dialog.locator("#box-status");
  await expect(liveStatus).toHaveAttribute("aria-live", "polite");
  const liveRegion = await liveStatus.elementHandle();
  expect(liveRegion).not.toBeNull();
  const openingMessage = await liveRegion!.textContent();
  releaseOpen();
  await expect(dialog.getByText("+50", { exact: true })).toBeVisible();
  await expect(liveStatus).toContainText("Cristais");
  expect(await liveRegion!.evaluate((node) => node.isConnected)).toBe(true);
  expect(await liveRegion!.textContent()).not.toBe(openingMessage);
  const continueButton = dialog.getByRole("button", { name: "Continuar" });
  await expect(continueButton).toBeFocused();
  await expect
    .poll(() =>
      continueButton.evaluate((el) => {
        const bounds = el.getBoundingClientRect();
        return bounds.top >= 0 && bounds.bottom <= window.innerHeight;
      }),
    )
    .toBe(true);

  await staleRefreshStarted;
  await continueButton.click();
  await openButton(page, "Comum").click();
  const nextDialog = page.getByRole("dialog");
  const openAgain = nextDialog.getByRole("button", {
    name: "Abrir outra comum",
  });
  await expect(openAgain).toBeEnabled();
  releaseStaleRefresh();
  await expect(openAgain).toBeVisible();
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
    page.getByRole("dialog").getByText("+75", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").locator(".box-reveal-name"),
  ).toHaveText("Cristais");
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

test("fallback sem WebGL não esconde recompensa Premium e erro da API Rara não celebra sucesso", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (
        contextId === "webgl" ||
        contextId === "webgl2" ||
        contextId === "experimental-webgl"
      ) {
        return null;
      }
      return orig.call(this, contextId, ...(args as []));
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
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
  await openButton(page, "Premium").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-renderer", "fallback");
  await expect(dialog.getByText("+100", { exact: true })).toBeVisible({
    timeout: 6000,
  });
  await expect(dialog.locator(".box-reveal-name")).toHaveText("Cristais");
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await openButton(page, "Rara").click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Sem chaves disponíveis.",
  );
  await expect(dialog.getByText("Você ganhou")).toHaveCount(0);
  await expect(dialog.locator("video")).toHaveCount(0);
  await expect(dialog.locator("canvas")).toHaveCount(0);
  expect(calls).toBe(2);
});

test("trava de segurança libera a recompensa Rara mesmo se o loop de renderização travar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 1;
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/boxes/open", (route) =>
    route.fulfill({
      json: {
        reward: { category: "SKIN", name: "Manto Astral", rarity: "RARE" },
      },
    }),
  );
  await page.goto("/gacha/loja");
  await openButton(page, "Rara").click();
  await expect(
    page.getByRole("dialog").locator(".box-reveal-name"),
  ).toHaveText("Skin: Manto Astral", { timeout: 10000 });
});

test("arte e nome longo cabem na cena Rara; teclado permanece no diálogo", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
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
          image: "/aeliana/Aeliana.png",
          foil: "HOLO",
        },
      },
    }),
  );
  await page.goto("/gacha/loja");
  await openButton(page, "Rara").click();
  const dialog = page.getByRole("dialog");
  const art = dialog.getByRole("img", { name, exact: true });
  await expect(dialog.getByText("Lendária", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(art).toBeVisible();
  await expect
    .poll(() => art.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  const continueBtn = dialog.getByRole("button", { name: "Continuar", exact: true });
  await expect(continueBtn).toBeFocused();
  await page.keyboard.press("Tab");
  const again = dialog.getByRole("button", { name: /^Abrir outra/ });
  if (await again.count()) {
    await expect(again).toBeFocused();
    await page.keyboard.press("Tab");
  }
  await expect(
    dialog.getByRole("button", { name: "Voltar à loja", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(continueBtn).toBeFocused();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath("box-card-reward.png") });
});

test("carrega arte HTTPS fora da allowlist diretamente no reveal", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const imageUrl = "https://art.example.test/reward-card.png";
  await page.route(imageUrl, (route) =>
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
          name: "Carta de teste",
          rarity: "EPICA",
          image: imageUrl,
        },
      },
    }),
  );

  await page.goto("/gacha/loja");
  await openButton(page, "Rara").click();

  const dialog = page.getByRole("dialog");
  const art = dialog.getByRole("img", { name: "Carta de teste" });
  await expect(art).toHaveAttribute("src", imageUrl, { timeout: 15000 });
  await expect
    .poll(() => art.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
});

test("abrir outra caixa recomeça a cena Three.js do início, sem reaproveitar estado antigo", async ({
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
  await expect(dialog.getByText("+101", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  // A segunda abertura (Rara) precisa iniciar a cena do zero antes de revelar.
  await openButton(page, "Rara").click();
  await expect(dialog).toHaveAttribute("data-tier", "RARE");
  await expect(dialog).toHaveAttribute("data-cinematic", "true");
  await expect(dialog.locator("video")).toHaveCount(0);
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });
  await expect(dialog.getByText("+102", { exact: true })).toHaveCount(0);
  await expect(dialog.getByText("+102", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(dialog.locator(".box-reveal-name")).toHaveText("Cristais");
  expect(calls).toBe(2);
});

test("caixa comum executa abertura e revelação Three.js em tela cheia com recompensa real", async ({
  page,
}, info) => {
  const pageErrors: string[] = [];
  const webglConsoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && /webgl|shader|three|nan|program/i.test(msg.text())) {
      webglConsoleErrors.push(msg.text());
    }
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const mp4Requests: string[] = [];
  page.on("request", (req) => {
    if (/\/gacha\/box-common\.mp4/.test(req.url())) mp4Requests.push(req.url());
  });
  let calls = 0;
  await page.route("**/boxes/open", (route) => {
    calls++;
    return route.fulfill({
      json: { reward: { category: "CRYSTAL", amount: 640 } },
    });
  });

  await page.addInitScript(() => {
    window.sessionStorage.setItem("animesice:splash-seen", "1");
  });
  await page.goto("/gacha/loja");
  const boxesSection = page.locator("section[aria-labelledby='boxes-title']");
  await boxesSection.scrollIntoViewIfNeeded();
  await boxesSection.screenshot({ path: info.outputPath("shop-boxes-grid.png") });

  const trigger = openButton(page, "Comum");
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-cinematic", "true");
  await expect(dialog).toHaveAttribute("data-tier", "COMMON");
  await expect(dialog.locator("video")).toHaveCount(0);
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });
  await expect(dialog.getByText("+640", { exact: true })).toHaveCount(0);

  await page.waitForTimeout(650);
  await page.screenshot({ path: info.outputPath("common-box-opening.png") });

  await expect(dialog.getByText("+640", { exact: true })).toBeVisible({
    timeout: 7000,
  });
  await expect(dialog.locator(".box-reveal-name")).toHaveText("Cristais");
  await expect(dialog).toHaveAccessibleName("Comum aberta");
  await expect(dialog).toHaveAttribute("data-phase", "reward");
  await page.screenshot({ path: info.outputPath("common-box-reward.png") });

  expect(calls).toBe(1);
  expect(mp4Requests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(webglConsoleErrors).toEqual([]);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );

  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("caixa comum segura no selo em API lenta, revela carta real e valida payload inválido", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let releaseApi!: () => void;
  const apiGate = new Promise<void>((resolve) => {
    releaseApi = resolve;
  });
  let calls = 0;
  await page.route("**/boxes/open", async (route) => {
    calls++;
    if (calls === 1) {
      await apiGate;
      return route.fulfill({
        json: {
          reward: {
            category: "CARD",
            name: "Aeliana — Guardiã do Gelo",
            rarity: "LENDARIA",
            image: "/aeliana/Aeliana.png",
            foil: "HOLO",
          },
        },
      });
    }
    return route.fulfill({ json: { reward: {} } });
  });

  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });
  await page.waitForTimeout(1150);
  await expect(dialog).toHaveAttribute("data-phase", "opening");
  await expect(dialog.getByText("Você ganhou")).toHaveCount(0);

  releaseApi();
  await expect(dialog).toHaveAttribute("data-phase", "revealing", {
    timeout: 5000,
  });
  await page.waitForTimeout(420);
  await page.screenshot({ path: info.outputPath("common-box-revealing.png") });
  const art = dialog.getByRole("img", { name: "Aeliana — Guardiã do Gelo" });
  await expect(art).toBeVisible({ timeout: 7000 });
  await expect(dialog.getByText("Lendária", { exact: true })).toBeVisible();
  await expect
    .poll(() => art.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await page.waitForTimeout(380);
  await page.screenshot({ path: info.outputPath("common-box-card-reward.png") });
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();

  // Resposta inválida do backend ({ reward: {} }) deve resultar em erro, nunca em sucesso
  await openButton(page, "Comum").click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Resposta inválida do servidor",
  );
  await expect(dialog.getByText("Você ganhou")).toHaveCount(0);
  await expect(dialog).toHaveAttribute("data-phase", "error");
});

test("caixa comum previne cliques duplicados e permite abrir outra caixa comum", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let releaseOpen!: () => void;
  const openGate = new Promise<void>((resolve) => {
    releaseOpen = resolve;
  });
  let calls = 0;
  await page.route("**/boxes/open", async (route) => {
    calls++;
    if (calls === 1) await openGate;
    return route.fulfill({
      json: { reward: { category: "CRYSTAL", amount: 200 + calls } },
    });
  });

  await page.goto("/gacha/loja");
  const trigger = openButton(page, "Comum");
  await trigger.evaluate((btn: HTMLButtonElement) => {
    btn.click();
    btn.click();
    btn.click();
  });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  releaseOpen();

  await expect(dialog.getByText("+201", { exact: true })).toBeVisible({
    timeout: 7000,
  });
  expect(calls).toBe(1);

  const againBtn = dialog.getByRole("button", { name: "Abrir outra comum" });
  await expect(againBtn).toBeEnabled();
  await againBtn.click();

  await expect(dialog).toHaveAttribute("data-phase", /opening|revealing/);
  await expect(dialog.getByText("+202", { exact: true })).toBeVisible({
    timeout: 7000,
  });
  expect(calls).toBe(2);
});

test("caixa comum com WebGL indisponível usa fallback elegante e nunca perde recompensa", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (
        contextId === "webgl" ||
        contextId === "webgl2" ||
        contextId === "experimental-webgl"
      ) {
        return null;
      }
      return orig.call(this, contextId, ...(args as []));
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/boxes/open", (route) =>
    route.fulfill({ json: { reward: { category: "CRYSTAL", amount: 320 } } }),
  );

  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-renderer", "fallback");
  await expect(dialog.locator("canvas")).toHaveCount(0);
  await expect(dialog.getByText("+320", { exact: true })).toBeVisible({
    timeout: 6000,
  });
  await expect(dialog.locator(".box-reveal-name")).toHaveText("Cristais");
  expect(pageErrors).toEqual([]);
});

test("navegar para fora durante a abertura comum desmonta WebGL sem erros e reentrada funciona", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/boxes/open", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    return route.fulfill({ json: { reward: { category: "KEY", amount: 1 } } });
  });

  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });

  await page.goto("/gacha");
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  await expect(dialog.getByText("+1", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(pageErrors).toEqual([]);
});

test("caixa comum em falha de rede exibe erro em português sem vazar exceção nem abrir WebGL", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/boxes/open", (route) => route.abort());

  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-phase", "error");
  await expect(dialog.getByRole("alert")).toContainText(
    "Não foi possível confirmar a abertura.",
  );
  await expect(dialog.getByRole("alert")).not.toContainText(/failed to fetch/i);
  await expect(dialog.locator("canvas")).toHaveCount(0);
  await expect(dialog.getByText("Você ganhou")).toHaveCount(0);
  await expect(dialog.locator("main")).toHaveCount(0);
});

test("pular caixa comum mantém foco preso no diálogo, preserva resultado após Escape e recupera foco ao concluir", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let releaseOpen!: () => void;
  const openGate = new Promise<void>((resolve) => {
    releaseOpen = resolve;
  });
  let calls = 0;
  await page.route("**/boxes/open", async (route) => {
    calls++;
    if (calls === 1) await openGate;
    return route.fulfill({
      json: { reward: { category: "CRYSTAL", amount: 450 + calls } },
    });
  });

  await page.goto("/gacha/loja");
  await openButton(page, "Comum").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });
  await expect(dialog.locator("main")).toHaveCount(0);

  const skipBtn = dialog.getByRole("button", { name: "Pular animação" });
  await page.keyboard.press("Tab");
  await expect(skipBtn).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(
    dialog.getByRole("button", { name: "Aguardando recompensa…" }),
  ).toBeDisabled();
  const closeBtn = dialog.getByRole("button", { name: "Voltar à loja" });
  await expect(closeBtn).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeBtn).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  releaseOpen();

  const viewResultBtn = page.getByRole("button", {
    name: "Ver resultado da caixa",
  });
  await expect(viewResultBtn).toBeVisible();
  await viewResultBtn.click();

  await expect(dialog).toHaveAttribute("data-phase", "reward");
  await expect(dialog.getByText("+451", { exact: true })).toBeVisible();
  await expect(dialog.locator("main")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();

  // Segunda abertura: pular via teclado após API já respondida mantém foco no botão Continuar
  await openButton(page, "Comum").click();
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Pular animação" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveAttribute("data-phase", "reward");
  await expect(
    dialog.getByRole("button", { name: "Continuar", exact: true }),
  ).toBeFocused();
});

test("caixa rara segura no selo, executa abertura split-wing e previne cliques duplicados", async ({
  page,
}, info) => {
  const pageErrors: string[] = [];
  const webglConsoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && /webgl|shader|three|nan|program/i.test(msg.text())) {
      webglConsoleErrors.push(msg.text());
    }
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const mp4Requests: string[] = [];
  page.on("request", (req) => {
    if (/\/gacha\/box-.*\.mp4/.test(req.url())) mp4Requests.push(req.url());
  });

  let releaseOpen!: () => void;
  const openGate = new Promise<void>((resolve) => {
    releaseOpen = resolve;
  });
  let calls = 0;
  await page.route("**/boxes/open", async (route) => {
    calls++;
    if (calls === 1) await openGate;
    return route.fulfill({
      json: {
        reward:
          calls === 1
            ? {
                category: "CARD",
                name: "Aeliana — Fenda Violeta",
                rarity: "EPICA",
                image: "/aeliana/Aeliana.png",
                foil: "HOLO",
              }
            : { category: "CRYSTAL", amount: 1450 },
      },
    });
  });

  await page.goto("/gacha/loja");
  const trigger = openButton(page, "Rara");
  await trigger.evaluate((btn: HTMLButtonElement) => {
    btn.click();
    btn.click();
    btn.click();
  });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-tier", "RARE");
  await expect(dialog).toHaveAttribute("data-cinematic", "true");
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });
  await page.waitForTimeout(950);
  await expect(dialog).toHaveAttribute("data-phase", "opening");
  await expect(dialog.getByText("Você ganhou")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("rare-box-opening.png") });

  releaseOpen();
  await expect(dialog).toHaveAttribute("data-phase", "revealing", {
    timeout: 6000,
  });
  await page.waitForTimeout(450);
  await page.screenshot({ path: info.outputPath("rare-box-revealing.png") });

  await expect(dialog).toHaveAttribute("data-phase", "reward", {
    timeout: 15000,
  });
  await expect(dialog.getByText("Épica", { exact: true })).toBeVisible();
  await expect(dialog).toHaveAccessibleName("Rara aberta");
  await page.screenshot({ path: info.outputPath("rare-box-reward.png") });
  expect(calls).toBe(1);
  expect(mp4Requests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(webglConsoleErrors).toEqual([]);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );

  await dialog.getByRole("button", { name: "Abrir outra rara" }).click();
  await expect(dialog).toHaveAttribute("data-phase", /opening|revealing/);
  await expect(dialog.getByText("+1.450", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(calls).toBe(2);
});

test("caixa premium executa abertura horológica, revela skins e carta lendária sem excesso", async ({
  page,
}, info) => {
  const pageErrors: string[] = [];
  const webglConsoleErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && /webgl|shader|three|nan|program/i.test(msg.text())) {
      webglConsoleErrors.push(msg.text());
    }
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const mp4Requests: string[] = [];
  page.on("request", (req) => {
    if (/\/gacha\/box-.*\.mp4/.test(req.url())) mp4Requests.push(req.url());
  });

  let releaseOpen!: () => void;
  const openGate = new Promise<void>((resolve) => {
    releaseOpen = resolve;
  });
  let calls = 0;
  await page.route("**/boxes/open", async (route) => {
    calls++;
    if (calls === 1) await openGate;
    return route.fulfill({
      json: {
        reward:
          calls === 1
            ? {
                category: "SKIN",
                skins: [
                  { name: "Aura Solar", rarity: "LEGENDARY" },
                  { name: "Velo Obsidian", rarity: "EPIC" },
                ],
              }
            : {
                category: "CARD",
                name: "Aeliana — Coroa Soberana",
                rarity: "LENDARIA",
                image: "/aeliana/Aeliana.png",
                foil: "GOLD",
              },
      },
    });
  });

  await page.goto("/gacha/loja");
  const trigger = openButton(page, "Premium");
  await trigger.evaluate((btn: HTMLButtonElement) => {
    btn.click();
    btn.click();
  });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-tier", "PREMIUM");
  await expect(dialog).toHaveAttribute("data-cinematic", "true");
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });
  await page.waitForTimeout(1100);
  await expect(dialog).toHaveAttribute("data-phase", "opening");
  await expect(dialog.getByText("Você ganhou")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("premium-box-opening.png") });

  releaseOpen();
  await expect(dialog).toHaveAttribute("data-phase", "revealing", {
    timeout: 7000,
  });
  await page.waitForTimeout(550);
  await page.screenshot({ path: info.outputPath("premium-box-revealing.png") });

  await expect(dialog).toHaveAttribute("data-phase", "reward", {
    timeout: 15000,
  });
  await expect(dialog).toHaveAccessibleName("Premium aberta");
  await expect(dialog.locator(".box-reveal-name")).toHaveText("2 skins recebidas");
  await expect(dialog.locator(".common-reward-details")).toContainText("Aura Solar");
  await expect(dialog.locator(".common-reward-details")).toContainText("Velo Obsidian");
  await page.screenshot({ path: info.outputPath("premium-box-reward.png") });
  expect(calls).toBe(1);

  await dialog.getByRole("button", { name: "Abrir outra premium" }).click();
  await expect(dialog).toHaveAttribute("data-phase", /opening|revealing/);
  const art = dialog.getByRole("img", { name: "Aeliana — Coroa Soberana" });
  await expect(art).toBeVisible({ timeout: 15000 });
  await expect(dialog.getByText("Lendária", { exact: true })).toBeVisible();
  await expect
    .poll(() => art.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("premium-box-card-reward.png") });

  expect(calls).toBe(2);
  expect(mp4Requests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(webglConsoleErrors).toEqual([]);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
});

test("caixas rara e premium respeitam movimento reduzido, compra antes de abrir e falhas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const mp4Requests: string[] = [];
  page.on("request", (req) => {
    if (/\/gacha\/box-.*\.mp4/.test(req.url())) mp4Requests.push(req.url());
  });

  // Fluxo Comprar e Abrir em Premium sem caixa/chave prévia
  const calls: string[] = [];
  let inv = {
    balance: 9000,
    available: 9000,
    reserved: 0,
    commonBoxes: 1,
    rareBoxes: 1,
    premiumBoxes: 0,
    keys: 0,
    spinResets: 0,
    loyaltyDays: 2,
  };
  await page.route("**/gacha/economy**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/economy")) return route.fulfill({ json: inv });
    if (path.endsWith("/boxes/open")) {
      calls.push("open");
      return route.fulfill({ json: { reward: { category: "CRYSTAL", amount: 4800 } } });
    }
    if (path.endsWith("/boxes")) {
      calls.push("box");
      inv = { ...inv, premiumBoxes: 1, available: 7000 };
      return route.fulfill({ json: { inventory: inv } });
    }
    if (path.endsWith("/keys")) {
      calls.push("key");
      inv = { ...inv, keys: 1, available: 6900 };
      return route.fulfill({ json: { inventory: inv } });
    }
    return route.fallback();
  });

  await page.goto("/gacha/loja");
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Premium", exact: true }) })
    .getByRole("button", { name: /Comprar e abrir/ })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-tier", "PREMIUM");
  await expect(dialog).toHaveAttribute("data-renderer", "reduced");
  await expect(dialog.locator("canvas")).toHaveCount(0);
  await expect(dialog.getByText("+4.800", { exact: true })).toBeVisible();
  expect(calls).toEqual(["box", "key", "open"]);
  await dialog.getByRole("button", { name: "Continuar", exact: true }).click();

  // Payload inválido em Rara resulta em erro amigável
  await page.unroute("**/boxes/open");
  await page.route("**/boxes/open", (route) => route.fulfill({ json: { reward: {} } }));
  await openButton(page, "Rara").click();
  await expect(dialog).toHaveAttribute("data-tier", "RARE");
  await expect(dialog).toHaveAttribute("data-phase", "error");
  await expect(dialog.getByRole("alert")).toContainText("Resposta inválida do servidor");
  await expect(dialog.locator("main")).toHaveCount(0);
  await expect(dialog.locator("canvas")).toHaveCount(0);
  await expect(dialog.locator(".common-box-action")).toHaveText("Voltar à loja");
  await dialog.locator(".common-box-action").click();

  // Abort de rede em Premium exibe mensagem em português sem vazar exceção
  await page.unroute("**/boxes/open");
  await page.route("**/boxes/open", (route) => route.abort());
  await openButton(page, "Premium").click();
  await expect(dialog).toHaveAttribute("data-phase", "error");
  await expect(dialog.getByRole("alert")).toContainText(
    "Não foi possível confirmar a abertura.",
  );
  await expect(dialog.getByRole("alert")).not.toContainText(/failed to fetch/i);
  await expect(dialog.locator("canvas")).toHaveCount(0);
  await expect(dialog.locator("main")).toHaveCount(0);
  expect(mp4Requests).toEqual([]);
});

test("navegar para fora durante abertura rara e premium desmonta WebGL sem erros", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/boxes/open", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    return route.fulfill({ json: { reward: { category: "KEY", amount: 3 } } });
  });

  await page.goto("/gacha/loja");
  await openButton(page, "Rara").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("canvas")).toHaveCount(1, { timeout: 6000 });

  await page.goto("/gacha");
  await expect(page.locator("canvas")).toHaveCount(0);

  await page.goto("/gacha/loja");
  await openButton(page, "Premium").click();
  await expect(dialog).toHaveAttribute("data-tier", "PREMIUM");
  await expect(dialog.getByText("+3", { exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(pageErrors).toEqual([]);
});

test("recuperação de perda de contexto WebGL em caixa rara ativa fallback e entrega a recompensa", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/boxes/open", (route) =>
    route.fulfill({ json: { reward: { category: "CRYSTAL", amount: 920 } } }),
  );

  await page.goto("/gacha/loja");
  await openButton(page, "Rara").click();
  const dialog = page.getByRole("dialog");
  const canvas = dialog.locator("canvas");
  await expect(canvas).toHaveCount(1, { timeout: 6000 });

  await canvas.evaluate((el) => {
    el.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  });

  await expect(dialog).toHaveAttribute("data-renderer", "fallback");
  await expect(dialog.locator("canvas")).toHaveCount(0);
  await expect(dialog.getByText("+920", { exact: true })).toBeVisible({
    timeout: 6000,
  });
  await expect(dialog.locator(".box-reveal-name")).toHaveText("Cristais");
  expect(pageErrors).toEqual([]);
});
