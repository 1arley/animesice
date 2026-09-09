import { test, expect } from "@playwright/test";
import { blockAds, mockGeneric, loginAs } from "./helpers";

test.describe("Gacha", () => {
  test("anônimo: explica o jogo, pede login e mostra listas vazias", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.goto("/gacha");
    await expect(page.getByRole("heading", { name: "Gacha" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Entre" })).toBeVisible();
    await expect(
      page.getByText("Nenhum pull ainda. Seja o primeiro."),
    ).toBeVisible();
    await expect(
      page.getByText("Ranking vazio por enquanto."),
    ).toBeVisible();
  });

  test("logado: status libera o roll, mostra pity e rola a carta", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    // Widget real do Turnstile não completa em headless — o app só precisa
    // de um token vindo do callback, então stubamos o script.
    await page.route(
      "**/challenges.cloudflare.com/turnstile/v0/api.js*",
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: `window.turnstile = {
            ready: (cb) => cb(),
            render: (el, opts) => { setTimeout(() => opts.callback("e2e-token"), 50); return "w1"; },
            reset: () => {},
          };
          window.onTurnstileLoad && window.onTurnstileLoad();`,
        }),
    );
    await page.goto("/gacha");
    await expect(
      page.getByRole("button", { name: "Rolar carta" }),
    ).toBeEnabled();
    await expect(page.getByText("Roll de hoje disponível")).toBeVisible();
    await expect(page.getByText("Pity ÉPICA+ em 30d")).toBeVisible();
    await page.getByRole("button", { name: "Rolar carta" }).click();
    await expect(
      page.getByRole("heading", { name: "Sua carta" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Waifu E2E")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Sua carta" })).toBeVisible();
  });

  for (const rarity of ["COMUM", "EPICA", "LENDARIA"]) {
    test(`reveal animado ${rarity}: espera API, Esc pula e backdrop fecha`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await blockAds(page);
      await mockGeneric(page);
      await loginAs(page);
      await page.route("**/challenges.cloudflare.com/turnstile/v0/api.js*", route => route.fulfill({
        contentType: "application/javascript",
        body: `window.turnstile = { ready: cb => cb(), render: (el, opts) => { setTimeout(() => opts.callback("e2e-token"), 50); return "w1"; }, reset: () => {} }; window.onTurnstileLoad?.();`,
      }));
      let release!: () => void;
      const responseReady = new Promise<void>(resolve => { release = resolve; });
      await page.route("**/gacha/roll", async route => {
        const response = await route.fetch();
        const pull = await response.json();
        pull.waifu.rarity = rarity;
        pull.foil = rarity === "LENDARIA" ? "GOLD" : "NORMAL";
        await responseReady;
        await route.fulfill({ response, json: pull });
      });
      await page.goto("/gacha");
      await page.getByRole("button", { name: "Rolar carta" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.click({ position: { x: 5, y: 5 } });
      await expect(dialog).toBeVisible();
      if (rarity !== "EPICA") await page.keyboard.press("Escape");
      else await page.waitForTimeout(2100); // Exercita a pausa da timeline com API lenta.
      await expect(dialog.getByRole("heading")).toHaveText("Invocando sua carta…");
      release();
      await expect(dialog.getByRole("button", { name: "Continuar" })).toBeVisible();
      await expect(dialog.getByText("Waifu E2E")).toBeVisible();
      if (rarity === "COMUM") await page.keyboard.press("Escape");
      else await dialog.click({ position: { x: 5, y: 5 } });
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Sua carta" })).toBeVisible();
    });
  }

  test("perfil: aba Cartas mostra estado vazio", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.goto("/users/mock");
    await page.getByRole("button", { name: "Cartas" }).click();
    await expect(page.getByText("Nenhuma carta ainda.")).toBeVisible();
  });
});
