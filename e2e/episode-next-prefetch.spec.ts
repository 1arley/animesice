import { expect, test } from "@playwright/test";
import { blockAds } from "./helpers";

// Slug com fonte mp4 no mock (o headless não toca HLS e o erro de mídia
// desmontaria o <video>).
const slug = "prefetch-next";
const nextEpisodeCacheKey = `src:v2:${slug}:2`;

/** Episódios 1 e 2 — sem o 2 não há "próximo" para aquecer. */
const episodes = [
  { id: `${slug}-1`, number: 1, title: "Episódio 1", views: 0 },
  { id: `${slug}-2`, number: 2, title: "Episódio 2", views: 0 },
];

/** Dispara `timeupdate` como o navegador faria com o vídeo já rodando. */
async function playUpTo(page: import("@playwright/test").Page, time: number) {
  await page.locator("video").evaluate((video, value) => {
    // O mock não entrega mídia de verdade: sem metadados o `currentTime`
    // continua 0, então forçamos a leitura usada pelo handler.
    Object.defineProperty(video, "currentTime", {
      value,
      configurable: true,
    });
    video.dispatchEvent(new Event("timeupdate", { bubbles: true }));
  }, time);
}

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  // Sessão presente: um `playback error` tentaria atualizar a fonte e o
  // endpoint de refresh recusa sem login.
  await page.context().addCookies([
    { name: "access_token", value: "e2e-token", url: "http://localhost:3000" },
  ]);
  await page.route(`**/anime/${slug}/episodes*`, (route) =>
    route.fulfill({ json: episodes }),
  );
  // Mídia que nunca responde: o <video> fica carregando em vez de emitir
  // `error` (que trocaria o player pelo painel de erro).
  await page.route("**/__e2e/video/*.mp4", () => {});
});

test("próximo episódio é aquecido quando o vídeo começa a tocar", async ({
  page,
}) => {
  const prefetches: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.endsWith("/stream/source") &&
      url.searchParams.get("episode") === "2"
    ) {
      prefetches.push(request.url());
    }
  });

  await page.goto(`/animes/${slug}/1`);
  await expect(page.locator("video")).toHaveAttribute("src", /\.mp4$/);

  // Antes de tocar, ninguém deve extrair o episódio seguinte.
  await page.waitForTimeout(500);
  expect(prefetches).toHaveLength(0);

  const warmed = page.waitForRequest(
    (request) => {
      const url = new URL(request.url());
      return (
        url.pathname.endsWith("/stream/source") &&
        url.searchParams.get("episode") === "2"
      );
    },
    { timeout: 5_000 },
  );
  await playUpTo(page, 30);
  await warmed;

  // A fonte resolvida fica no cache de sessão: o clique no "próximo"
  // renderiza sem esperar extração.
  await expect
    .poll(() => page.evaluate((key) => sessionStorage.getItem(key), nextEpisodeCacheKey))
    .not.toBeNull();

  // Um segundo timeupdate não repete a requisição.
  await playUpTo(page, 40);
  await page.waitForTimeout(500);
  expect(prefetches).toHaveLength(1);
});

test("sem reprodução iniciada, o próximo episódio não é extraído", async ({
  page,
}) => {
  const prefetches: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.endsWith("/stream/source") &&
      url.searchParams.get("episode") === "2"
    ) {
      prefetches.push(request.url());
    }
  });

  await page.goto(`/animes/${slug}/1`);
  await expect(page.locator("video")).toBeVisible();
  await page.waitForTimeout(1_000);

  expect(prefetches).toHaveLength(0);
});
