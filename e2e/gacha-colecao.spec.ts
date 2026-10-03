import { test, expect } from "@playwright/test";
import { blockAds, loginAs, VIEWER } from "./helpers";

const svg = (viewBox: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><rect x="10" y="10" width="200" height="200" fill="none" stroke="#38e8da" stroke-width="8"/></svg>`;

const cosmetics = [
  {
    key: "BACK_NEON", type: "BACK", label: "Neon", description: "Verso",
    price: 500, owned: true, svg: svg("0 0 750 1000"),
  },
  {
    key: "FRAME_AURORA", type: "FRAME", label: "Aurora", description: "Moldura",
    price: 900, owned: true, svg: svg("-30 -30 810 1060"),
  },
  {
    key: "FRAME_SANGUE", type: "FRAME", label: "Sangue", description: "Moldura",
    price: 900, owned: false, svg: svg("-30 -30 810 1060"),
  },
  {
    key: "DESTAQUE_CARTA", type: "HIGHLIGHT", label: "Dourado", description: "Realce",
    price: 700, owned: true, svg: svg("-60 -60 870 1120"),
  },
];

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  await loginAs(page);
});

test("coleção de cosméticos lista só o que o usuário possui", async ({ page }) => {
  await page.route("**/gacha/shop", (r) => r.fulfill({ json: { balance: 100, cosmetics } }));
  await page.route("**/gacha/loadout", (r) => r.fulfill({ json: {
    loadout: { FRAME: null, HIGHLIGHT: null }, cardBack: null,
  } }));

  await page.goto("/gacha/colecao");

  const moldura = page.getByRole("group", { name: /Moldura disponíveis/ });
  // Só a possessed entra na fileira: Sangue não é listado.
  await expect(moldura.getByRole("button")).toHaveCount(1);
  await expect(moldura.getByRole("button", { name: /Aurora/ })).toBeVisible();
  await expect(page.getByRole("group", { name: /Destaque disponíveis/ }).getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("group", { name: /Capa disponíveis/ }).getByRole("button")).toHaveCount(1);
  await expect(page.getByText("Padrão da série").first()).toBeVisible();
});

test("equipar moldura envia o slot e marca o estado com aria-pressed", async ({ page }) => {
  await page.route("**/gacha/shop", (r) => r.fulfill({ json: { balance: 100, cosmetics } }));
  await page.route("**/gacha/loadout", (r) => {
    if (r.request().method() === "PATCH") {
      return r.fulfill({ json: {
        gachaLoadout: { FRAME: "FRAME_AURORA", HIGHLIGHT: null },
      } });
    }
    return r.fulfill({ json: { loadout: { FRAME: null, HIGHLIGHT: null }, cardBack: null } });
  });
  const patches: Record<string, unknown>[] = [];
  page.on("request", (req) => {
    if (req.method() === "PATCH" && req.url().includes("/gacha/loadout")) {
      patches.push(JSON.parse(req.postData() ?? "{}"));
    }
  });

  await page.goto("/gacha/colecao");
  const moldura = page.getByRole("group", { name: /Moldura disponíveis/ });
  const botao = moldura.getByRole("button", { name: /Aurora/ });
  await expect(botao).toHaveAttribute("aria-pressed", "false");

  await botao.click();
  await expect(botao).toHaveAttribute("aria-pressed", "true");
  expect(patches).toEqual([{ slot: "FRAME", key: "FRAME_AURORA" }]);

  // Clicar de novo desequipa: o backend recebe key null.
  await botao.click();
  await expect(botao).toHaveAttribute("aria-pressed", "false");
  expect(patches[1]).toEqual({ slot: "FRAME", key: null });
});

test("falha ao equipar é anunciada e o estado volta ao do servidor", async ({ page }) => {
  await page.route("**/gacha/shop", (r) => r.fulfill({ json: { balance: 100, cosmetics } }));
  await page.route("**/gacha/loadout", (r) => {
    if (r.request().method() === "PATCH") {
      return r.fulfill({ status: 400, json: { message: "Cosmético indisponível." } });
    }
    return r.fulfill({ json: { loadout: { FRAME: null, HIGHLIGHT: null }, cardBack: null } });
  });

  await page.goto("/gacha/colecao");
  const moldura = page.getByRole("group", { name: /Moldura disponíveis/ });
  await moldura.getByRole("button", { name: /Aurora/ }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Cosmético" })).toBeVisible();
  await expect(moldura.getByRole("button", { name: /Aurora/ })).toHaveAttribute("aria-pressed", "false");
});

test("moldura equipada aparece sobre a arte na carta", async ({ page }) => {
  const pull = {
    id: "p1", condition: 0.1, foil: "NORMAL", edition: 1, value: 100,
    obtainedAt: "2026-09-11T00:00:00Z",
    user: {
      ...VIEWER,
      gachaLoadout: { FRAME: "FRAME_AURORA", HIGHLIGHT: null },
    },
    card: { id: "c1", name: "Carta A", rarity: "RARA", image: null, favourites: 1,
      animeId: "a1", animeTitle: "Anime A", anime: { slug: "anime-a" } },
  };
  await page.route("**/gacha/collection?**", (r) => r.fulfill({ json: {
    data: [pull],
    meta: { page: 1, limit: 24, total: 1, totalPages: 1 },
    stats: { total: 1, totalValue: 100 },
  } }));
  await page.route("**/gacha/featured", (r) => r.fulfill({ json: null }));
  await page.route("**/gacha/collections/progress", (r) => r.fulfill({ json: [] }));
  await page.route("**/gacha/engagement-pilot", (r) => r.fulfill({ json: { enabled: false, percent: 0 } }));
  await page.route("**/gacha/loadout", (r) => r.fulfill({ json: {
    loadout: { FRAME: "FRAME_AURORA", HIGHLIGHT: null }, cardBack: null,
  } }));
  await page.route("**/gacha/card-backs/FRAME_AURORA", (r) => r.fulfill({ json: {
    key: "FRAME_AURORA", name: "Aurora", svg: svg("-30 -30 810 1060"), previewUrl: null,
  } }));

  await page.goto("/gacha/cartas");
  const moldura = page.locator('img[src^="data:image/svg+xml"][class*="z-10"]');
  await expect(moldura).toHaveCount(1);

  // O overlay é 108% x 106% (viewBox com sangue) e centralizado, então a
  // janela da arte cai exatamente sobre o cartão.
  const box = await moldura.evaluate((el) => {
    const host = el.parentElement!;
    const a = el.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    return {
      w: a.width / b.width,
      h: a.height / b.height,
      cx: a.left + a.width / 2,
      ccx: b.left + b.width / 2,
      style: el.getAttribute("style"),
    };
  });
  expect(box.style, "estilo inline do overlay").toContain("108%");
  expect(box.w).toBeCloseTo(810 / 750, 2);
  expect(box.h).toBeCloseTo(1060 / 1000, 2);
  expect(box.cx).toBeCloseTo(box.ccx, 0);
});
