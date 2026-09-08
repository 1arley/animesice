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
    await expect(page.getByText("Waifu E2E")).toBeVisible();
  });

  test("perfil: aba Cartas mostra estado vazio", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.goto("/users/mock");
    await page.getByRole("button", { name: "Cartas" }).click();
    await expect(page.getByText("Nenhuma carta ainda.")).toBeVisible();
  });
});
