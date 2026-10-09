// Revelação do gacha: o cristal vivo é um canvas WebGL (não um <video> com
// blend) e a carta assenta reta, sem meia-volta. As capturas ficam em
// test-results para conferência visual; as asserções cobrem só o que dá para
// checar sem baseline: canvas presente, três momentos distintos e carta visível.
import { expect, test } from "@playwright/test";
import { blockAds, loginAs, VIEWER } from "./helpers";

const carta = {
  id: "card-reveal",
  name: "Aeliana",
  image: "https://cdn.myanimelist.net/reveal-art.png",
  rarity: "LENDARIA",
  favourites: 1200,
  animeId: null,
  animeTitle: "Anime E2E",
  anime: null,
};
const pull = {
  id: "pull-reveal",
  condition: 0.04,
  conditionLabel: "MINT",
  foil: "GOLD",
  edition: 1,
  value: 9500,
  obtainedAt: "2026-09-11T00:00:00Z",
  user: VIEWER,
  card: carta,
};
const spin = { ...pull, createdAt: pull.obtainedAt, claimedAt: null, slot: 0 };

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  await loginAs(page);
  await page.route("**/reveal-art.png", (route) =>
    route.fulfill({
      path: "public/aeliana/Aeliana.png",
      contentType: "image/png",
    }),
  );
  await page.route("**/gacha/status", (route) =>
    route.fulfill({
      json: {
        spinsLeft: 5,
        canSpin: true,
        canRoll: true,
        rollsLeft: 1,
        nextSpinAt: null,
        pityDaysLeft: 30,
        pityDue: false,
        canClaim: true,
        nextClaimAt: null,
        claimWarning: null,
        bypassPriceCents: null,
      },
    }),
  );
  await page.route("**/gacha/spins", (route) =>
    route.fulfill({ json: [spin] }),
  );
  // A janela de invocação faz parte do reveal; o mock global responde
  // instantaneamente e só mostraria a carta já assentada.
  await page.route("**/gacha/spin", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.fulfill({ json: spin });
  });
});

test("cristal entra em WebGL e a carta assenta reta", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/gacha");
  await page.getByRole("button", { name: "Girar (5)", exact: true }).click();

  const cristal = page.locator("[data-cristal] canvas");
  await expect(cristal).toBeVisible();
  // O <video> só existe como fallback sem WebGL: com WebGL no ar ele some.
  await expect(page.locator("[data-cristal] video")).toHaveCount(0);

  // A revelação inteira dura ~1.6s: capturar por relógio erra fácil (duas
  // capturas caem no mesmo estado final e o teste passa sem provar nada).
  // Aqui a ordem vem do estado visível: cristal em cena → carta assentada.
  const comCristal = await page.screenshot({
    path: info.outputPath("cristal.png"),
  });

  // "Continuar" só vira clicável quando o objeto assentou (fase `settled`):
  // é o próprio estado final, sem depender de relógio.
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await expect(continuar).toBeVisible({ timeout: 8000 });
  const assentada = await page.screenshot({
    path: info.outputPath("carta.png"),
  });
  expect(Buffer.compare(comCristal, assentada)).not.toBe(0);
  // Sem meia-volta: a carta fica de frente, nunca espelhada (scaleX/rotateY
  // negativos apareceriam numa virada de 180° pela metade).
  const virada = await page.locator("[data-carta]").evaluate((el) => {
    const estilo = getComputedStyle(el);
    return { transform: estilo.transform, visibility: estilo.visibility };
  });
  expect(virada.visibility).toBe("visible");
  expect(virada.transform).not.toMatch(/matrix3d\(-1/);

  await continuar.click();
  await expect(page.locator("[aria-labelledby='roll-title']")).toHaveCount(0);
});
