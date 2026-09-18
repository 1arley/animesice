import { test, expect } from "@playwright/test";
import { blockAds, mockGeneric, loginAs, VIEWER } from "./helpers";

const A = (path: string) => new RegExp(`//localhost:3001/(?:api/)?${path}`);

const nowIso = () => new Date().toISOString();

function wikiCard(id: string, name: string, rarity: string, owned: boolean, image: string | null) {
  return { id, name, rarity, favourites: 0, owned, image };
}

const CARDS = {
  lvl: [
    wikiCard("c1", "Sung Jin-Woo", "LENDARIA", true, "https://img1.ak.crunchyroll.com/i/spire4-tmb/1.webp"),
    wikiCard("c2", "Esperteza & Finta Genshin Impacta Longa", "COMUM", false, null),
    wikiCard("c3", "Beru, Rei das Formigas Gigantes do Castelo", "GALACTICA", false, "https://img1.ak.crunchyroll.com/i/spire4-tmb/3.webp"),
  ],
  gachi: [
    wikiCard("c4", "Sensei & Aluno", "EPICA", false, null),
  ],
};

const ENC = {
  stats: { totalCards: 4, ownedCards: 1, totalSets: 2, completeSets: 0 },
  sets: [
    {
      animeId: "solo-leveling-s2",
      animeTitle: "Solo Leveling Season 2 Arise from the Shadow",
      animeSlug: "solo-leveling",
      total: 3,
      owned: 1,
      complete: false,
      cards: CARDS.lvl,
    },
    {
      animeId: "gachiakuta",
      animeTitle: "Gachiakuta",
      animeSlug: "gachiakuta",
      total: 1,
      owned: 0,
      complete: false,
      cards: CARDS.gachi,
    },
  ],
};

function pull(id: string, name: string, rarity: string, foil: string) {
  return {
    id,
    condition: "MINT",
    conditionLabel: "Mint",
    foil,
    edition: 2,
    value: 980,
    obtainedAt: nowIso(),
    user: { id: VIEWER.id, name: VIEWER.name, userName: VIEWER.userName, avatar: null },
    card: { id: `${id}-card`, name, image: "https://img1.ak.crunchyroll.com/i/spire4-tmb/1.webp", rarity, favourites: 0, animeTitle: "Solo Leveling", animeId: "solo-leveling", animeSlug: null },
  };
}

const STATUS = { canSpin: true, canClaim: true, spinsLeft: 5, pityDaysLeft: 14, pityDue: false, nextSpinAt: null, nextClaimAt: null, claimWarning: null, bypassPriceCents: null };

async function ceremonyFixture(page: import("@playwright/test").Page) {
  await page.route(A("gacha/status$"), (r) => r.fulfill({ json: STATUS }));
  await page.route(A("gacha/spins$"), (r) =>
    r.fulfill({
      json: [
        { id: "s1", condition: "MINT", conditionLabel: "Mint", foil: "GOLD", value: 900, createdAt: nowIso(), expiresAt: new Date(Date.now() + 3600e3).toISOString(), card: { id: "sc1", name: "Beru, Rei das Formigas", image: "https://img1.ak.crunchyroll.com/i/spire4-tmb/1.webp", rarity: "GALACTICA", favourites: 0 } },
        { id: "s2", condition: "NM", conditionLabel: "Near Mint", foil: "NORMAL", value: 120, createdAt: nowIso(), expiresAt: new Date(Date.now() + 3600e3).toISOString(), card: { id: "sc2", name: "Cha Hae-In", image: "https://img1.ak.crunchyroll.com/i/spire4-tmb/2.webp", rarity: "COMUM", favourites: 0 } },
      ],
    }),
  );
  await page.route(A("gacha/recent(?:\\?|$)"), (r) => r.fulfill({ json: [pull("p1", "Sung Jin-Woo", "LENDARIA", "GOLD")] }));
  await page.route(A("gacha/ranking(?:\\?|$)"), (r) =>
    r.fulfill({ json: [{ user: { id: "u1", userName: "frostnova", name: "FrostNova", avatar: null }, pulls: 42, totalValue: 12480 }] }),
  );
}

async function collectionFixture(page: import("@playwright/test").Page) {
  await page.route(A("gacha/collection(?:\\?|$)"), (r) =>
    r.fulfill({ json: { data: [pull("owned-a", "Sung Jin-Woo", "LENDARIA", "GOLD")], meta: { total: 1, totalPages: 1, page: 1, perPage: 24 } } }),
  );
  await page.route(A("gacha/featured$"), (r) => r.fulfill({ json: pull("owned-a", "Sung Jin-Woo", "LENDARIA", "GOLD") }));
  await page.route(A("gacha/encyclopedia(?:\\?|$)"), (r) => {
    const query = new URL(r.request().url()).searchParams;
    const sets = ENC.sets.map(({ cards, ...set }) => set);
    const cards = query.get("animeId") === "gachiakuta" ? CARDS.gachi : CARDS.lvl;
    const isSets = query.get("view") === "sets";
    return r.fulfill({ json: {
      view: isSets ? "sets" : "cards", cards: isSets ? [] : cards, sets: isSets ? sets : [],
      meta: { total: isSets ? sets.length : cards.length, page: 1, limit: 24, totalPages: 1 },
    } });
  });
}

async function profileFixture(page: import("@playwright/test").Page) {
  const profile = { id: VIEWER.id, name: VIEWER.name, userName: VIEWER.userName, avatar: null, bio: null, role: "USER", myAnimeList: null, createdAt: nowIso(), updatedAt: nowIso(), _count: { comments: 0, ratings: 0, favorites: 0, watchHistories: 0, followers: 0, following: 0 } };
  await page.route(A("users/viewer$"), (r) => r.fulfill({ json: profile }));
  for (const suffix of ["anime-list", "activity", "ratings", "favorites"]) {
    await page.route(A(`users/${VIEWER.id}/${suffix}(?:\\?|$)`), (r) =>
      r.fulfill({ json: { data: [], meta: { total: 0, totalPages: 0, page: 1, perPage: 24 } } }),
    );
  }
  await page.route(A(`gacha/featured/${VIEWER.id}$`), (r) =>
    r.fulfill({ json: { ...pull("owned-a", "Sung Jin-Woo", "LENDARIA", "GOLD"), setComplete: true } }),
  );
}

async function noHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow, "página não deve ter scroll horizontal").toBe(false);
}

test.describe("Gacha harden — cerimônia", () => {
  test("hero animado: telemetria, CTAs e previews sem overflow horizontal", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await ceremonyFixture(page);
    await page.goto("/gacha");

    await expect(page.getByRole("heading", { name: "Gacha" })).toBeVisible();
    await expect(page.getByText("5/5 giros nesta hora")).toBeVisible();
    await expect(page.getByText(/Pity ÉPICA\+ em 14d/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Girar \(5\)$/ })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Pegar carta" })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Minha coleção" })).toBeVisible();
    await expect(page.getByText("Previews desta hora (2/5)")).toBeVisible();
    await expect(page.getByText(/Selecionada: Cha Hae-In/)).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("anônimo: bloco de login sem overflow", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.goto("/gacha");
    await expect(page.getByRole("link", { name: "Entre" })).toBeVisible();
    await noHorizontalOverflow(page);
  });
});

test.describe("Gacha harden — enciclopédia paginada", () => {
  test("coleção não busca catálogo; faltantes usam preto e branco e marcador", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await collectionFixture(page);
    const requests: string[] = [];
    page.on("request", request => {
      if (request.url().includes("localhost:3001/gacha/encyclopedia")) requests.push(request.url());
    });
    await page.goto("/gacha/collection");
    await expect(page.getByRole("button", { name: "Em destaque" })).toBeVisible();
    expect(requests).toHaveLength(0);
    await page.getByRole("link", { name: "Explorar enciclopédia" }).click();
    await expect(page.getByRole("heading", { name: "Enciclopédia", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Beru, Rei das Formigas Gigantes do Castelo" })).toHaveCSS("filter", "grayscale(1)");
    await expect(page.getByRole("img", { name: "Sung Jin-Woo", exact: true })).toHaveCSS("filter", "none");
    await expect(page.getByText("Falta", { exact: true })).toHaveCount(2);
    await noHorizontalOverflow(page);
  });

  test("conjuntos carregam cartas ao abrir e preservam visão na URL", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await collectionFixture(page);
    await page.goto("/gacha/encyclopedia?view=sets");
    await expect(page.getByText("Sensei & Aluno")).toHaveCount(0);
    await page.getByRole("link", { name: /Gachiakuta.*Ver cartas/ }).click();
    await expect(page.getByText("Sensei & Aluno")).toBeVisible();
    await expect(page).toHaveURL(/animeId=gachiakuta/);
    await page.getByLabel("Posse das cartas").selectOption("missing");
    await expect(page).toHaveURL(/ownership=missing/);
    await page.getByRole("link", { name: "Voltar aos conjuntos" }).click();
    await expect(page.getByRole("heading", { name: "Gachiakuta", exact: true })).toBeVisible();
    await expect(page.getByText("Sensei & Aluno")).toHaveCount(0);
    await noHorizontalOverflow(page);
  });
});

test.describe("Gacha harden — prestígio no perfil", () => {
  test("ribbon de conjunto completo cabe no frame e quebra limpa", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await profileFixture(page);
    await page.goto("/users/viewer");

    const ribbon = page.getByText("CONJUNTO COMPLETO");
    await ribbon.waitFor({ timeout: 10000 });
    const geo = await page.evaluate(() => {
      const s = [...document.querySelectorAll("span")].find((x) => (x.textContent ?? "").trim() === "CONJUNTO COMPLETO");
      if (!s) return null;
      const lh = parseFloat(getComputedStyle(s).lineHeight);
      const lines = Math.round(s.getBoundingClientRect().height / lh);
      const frame = s.parentElement;
      return {
        lines,
        fits: s.getBoundingClientRect().width <= (frame ? frame.getBoundingClientRect().width : 0) + 0.5,
        width: Math.round(s.getBoundingClientRect().width),
      };
    });
    expect(geo).not.toBeNull();
    expect(geo!.lines).toBeLessThanOrEqual(2);
    expect(geo!.fits).toBe(true);
    await noHorizontalOverflow(page);
  });
});