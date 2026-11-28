import { expect, test } from "@playwright/test";
import { blockAds, clickCentered, loginAs } from "./helpers";

test.describe("Central de Recompensas e Roleta de Prêmios", () => {
  test.beforeEach(async ({ page }) => {
    await blockAds(page);
    await loginAs(page);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("animesice:roll-sound", "false");
      } catch {
        // ignore
      }
    });
  });

  test("renderiza a Central de Recompensas, oculta raridade/probabilidades na roleta e executa giro", async ({
    page,
  }) => {
    await page.goto("/gacha/recompensas");

    await expect(
      page.getByRole("heading", { name: "Central de Recompensas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Gire e conquiste recompensas" }),
    ).toBeVisible();

    const rouletteSection = page.locator(
      'section[aria-labelledby="roulette-heading"]',
    );
    await expect(rouletteSection).not.toContainText("%");
    await expect(rouletteSection).not.toContainText("GALACTICA");
    await expect(rouletteSection).not.toContainText("LENDARIA");

    const spinButton = page.getByRole("button", { name: /Girar Roleta/i });
    await expect(spinButton).toBeEnabled();
    await clickCentered(spinButton);

    await expect(page.getByText("Prêmio confirmado")).toBeVisible({
      timeout: 12_000,
    });
    await expect(
      page.getByRole("heading", { name: "120 Cristais" }),
    ).toBeVisible();
  });
});
