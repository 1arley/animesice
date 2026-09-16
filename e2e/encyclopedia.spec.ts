import { test, expect } from "@playwright/test";
import { blockAds, loginAs } from "./helpers";

test("paginação, filtros e histórico preservam estado; falha permite tentar novamente", async ({ page }) => {
  await blockAds(page);
  await loginAs(page);
  let fail = false;
  const queries: URLSearchParams[] = [];
  await page.route(/localhost:3001\/(?:api\/)?gacha\/encyclopedia\?/, route => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(query);
    if (fail) return route.fulfill({ status: 503, json: { message: "Indisponível" } });
    const current = Number(query.get("page"));
    return route.fulfill({ json: {
      view: "cards", sets: [],
      cards: [{ id: `card-${current}`, name: `Carta página ${current}`, image: null, rarity: "RARA", owned: false, animeId: null, animeTitle: null }],
      meta: { page: current, limit: 24, total: 25, totalPages: 2 },
    } });
  });
  await page.goto("/gacha/encyclopedia");
  await expect(page.getByRole("heading", { name: "Carta página 1" })).toBeVisible();
  await page.getByRole("link", { name: "Próxima" }).click();
  await expect(page.getByRole("heading", { name: "Carta página 2" })).toBeVisible();
  await page.getByLabel("Raridade", { exact: true }).selectOption("RARA");
  await expect(page.getByRole("heading", { name: "Carta página 1" })).toBeVisible();
  await expect(page).toHaveURL(/rarity=RARA/);
  expect(queries.at(-1)?.get("page")).toBe("1");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Carta página 2" })).toBeVisible();
  await page.getByLabel("Buscar personagem ou anime").fill("Naruto");
  await page.locator("form").getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Carta página 1" })).toBeVisible();
  expect(queries.at(-1)?.get("search")).toBe("Naruto");
  await page.reload();
  await expect(page.getByLabel("Buscar personagem ou anime")).toHaveValue("Naruto");
  await expect(page.getByRole("heading", { name: "Carta página 1" })).toBeVisible();
  fail = true;
  await page.getByLabel("Posse das cartas").selectOption("missing");
  await expect(page.getByRole("alert").filter({ hasText: "Não foi possível carregar" })).toContainText("Não foi possível carregar");
  fail = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("heading", { name: "Carta página 1" })).toBeVisible();
  expect(queries.at(-1)?.get("ownership")).toBe("missing");
});
