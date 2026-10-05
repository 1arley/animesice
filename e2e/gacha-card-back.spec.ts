import { test, expect, type Page } from "@playwright/test";
import { blockAds, loginAs, VIEWER } from "./helpers";

/**
 * O verso desenha no mesmo slot e na mesma escala da arte da frente.
 *
 * O que este teste trava: um overscan no verso (o 1.06 que esteve aqui) deixa a
 * capa 6% maior que a arte da frente, e no giro a carta muda de tamanho. A
 * correcao nao e afinar o overscan, e tira-lo — os dois lados passam pelo mesmo
 * `object-cover` da janela 3/4. Sem folga para a renderizacao corrigir, a capa
 * tem de ser desenhada cobrindo o canvas inteiro.
 */

/** Slot 3/4 da carta: o mesmo viewBox que o gerador de capas exige. */
const SLOT = { w: 750, h: 1000 };

/** Arte da frente, servida localmente para o teste nao sair da maquina. */
const ART_URL = "https://cdn.myanimelist.net/test-card-art.svg";
const ART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="750" height="1000"><rect width="750" height="1000" fill="#0b1220"/></svg>`;

/** Capa no padrao: canvas 3/4 e plano de fundo cobrindo as quatro bordas. */
const GOOD_COVER = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ${SLOT.w} ${SLOT.h}">
  <rect width="${SLOT.w}" height="${SLOT.h}" fill="#120a1e"/>
  <circle cx="375" cy="500" r="220" fill="#0e2b33"/>
</svg>`;


const pull = {
  id: "pull-a", condition: 0.05, foil: "NORMAL", edition: 3, value: 420,
  obtainedAt: "2026-09-11T00:00:00Z", gachaCardBack: "BACK_TEST",
  user: { ...VIEWER, gachaCardBack: "BACK_TEST", gachaCosmetics: [] },
  card: { id: "card-a", name: "Bulat", rarity: "RARA", image: ART_URL,
    favourites: 1, animeId: "anime-a", animeTitle: "Anime A", anime: { slug: "anime-a" } },
};

async function mockBack(page: Page, svg: string) {
  await page.route(ART_URL, route => route.fulfill({ contentType: "image/svg+xml", body: ART_SVG }));
  await page.route("**/gacha/cards/card-a", route => route.fulfill({ json: pull }));
  await page.route("**/gacha/shop", route => route.fulfill({ json: {
    balance: 900, activeCardBack: "BACK_TEST",
    cosmetics: [{ key: "BACK_TEST", type: "BACK", label: "Genius", description: "", price: 0, owned: true, svg }],
  } }));
  await page.route("**/gacha/card-backs/BACK_TEST", route => route.fulfill({ json: {
    key: "BACK_TEST", name: "Genius", svg, previewUrl: null,
  } }));
}

/**
 * Os dois lados da carta coexistem no DOM (o wrapper 3D alterna a face de
 * frente), entao o palco da perspectiva ancora as medidas nas duas sem depender
 * do estado do giro.
 */
function stage(page: Page) {
  return page.locator('[style*="perspective"]');
}

async function showBack(page: Page) {
  await page.getByRole("button", { name: "Virar carta" }).click();
  const back = stage(page).getByRole("img", { name: "Verso personalizado da carta" });
  await expect(back).toBeVisible();
  return back;
}

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  await loginAs(page);
});

test("verso ocupa a mesma janela da arte da frente, sem overscan", async ({ page }, testInfo) => {
  await mockBack(page, GOOD_COVER);
  await page.goto("/gacha?card=card-a");

  const art = stage(page).getByRole("img", { name: "Bulat" });
  await expect(art).toBeVisible();
  const artBox = (await art.boundingBox())!;

  const back = await showBack(page);
  const cover = back.locator("img");
  await expect(cover).toBeVisible();
  const coverBox = (await cover.boundingBox())!;

  // 1. O requisito, medido: o verso cai exatamente na janela da arte da frente.
  //    Com overscan 1.06 a capa era 6% maior e o verso "pula" no giro.
  expect(coverBox.width).toBeCloseTo(artBox.width, 1);
  expect(coverBox.height).toBeCloseTo(artBox.height, 1);

  const m = await cover.evaluate(el => {
    const parent = el.parentElement!;
    const img = el as HTMLElement;
    const css = getComputedStyle(el);
    return {
      scale: css.scale,
      transform: css.transform,
      objectFit: css.objectFit,
      // offsetWidth/Height e o box de layout; getBoundingClientRect ja traria o
      // box escalado por transform, que e justamente o que nao deve existir.
      w: img.offsetWidth,
      h: img.offsetHeight,
      parentW: (parent as HTMLElement).offsetWidth,
      parentH: (parent as HTMLElement).offsetHeight,
      parentOverflow: getComputedStyle(parent).overflow,
    };
  });

  // 2. Nenhum transform no verso: e o overscan que produzia o salto de tamanho.
  //    A correcao e remove-lo, nao redimensionar a capa por cima da arte.
  expect(m.scale).toBe("none");
  expect(m.transform).toBe("none");

  // 3. A capa preenche a janela 3/4 inteira: sem faixa vazia, sem sangramento.
  expect(m.w).toBe(m.parentW);
  expect(m.h).toBe(m.parentH);
  expect(m.parentOverflow).toBe("hidden");

  // 4. Capa fora do 3/4 e recortada, nunca esticada.
  expect(m.objectFit).toBe("cover");

  await page.screenshot({ path: testInfo.outputPath("card-back.png") });
});

test("miniatura da loja mostra a capa inteira, sem o corte do verso", async ({ page }) => {
  await mockBack(page, GOOD_COVER);
  await page.goto("/gacha?card=card-a");

  // O seletor de capas no preview da carta mostra a capa inteira, com a moldura
  // propria: la o `contain` e o correto, e nao deve herdar o `cover` do verso.
  const thumb = page.getByRole("button", { name: /Genius/ }).locator("img");
  await expect(thumb).toBeVisible();
  const fit = await thumb.evaluate(el => ({
    objectFit: getComputedStyle(el).objectFit,
    scale: getComputedStyle(el).scale,
  }));
  expect(fit.scale).toBe("none");
  expect(fit.objectFit).not.toBe("cover");
});
