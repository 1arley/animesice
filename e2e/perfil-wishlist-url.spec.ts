import { test, expect } from "@playwright/test";
import { blockAds, mockGeneric, clickCentered } from "./helpers";

/** Escopa mocks ao backend mockado (porta 3001), nunca à navegação do Next (3000). */
const API = (path: string) => new RegExp(`//localhost:3001/(?:api/)?${path}`);

const PROFILE = {
  id: "u1",
  name: "Ana Teste",
  userName: "ana",
  avatar: null,
  bio: null,
  myAnimeList: null,
  createdAt: new Date().toISOString(),
  _count: {
    comments: 1,
    ratings: 1,
    favorites: 0,
    watchHistories: 1,
    followers: 1,
    following: 1,
  },
};

const WISHLIST = {
  private: false,
  cards: [],
  sets: [],
  meta: {
    cards: 0,
    sets: 0,
    cardsPage: 1,
    setsPage: 1,
    cardsTotalPages: 1,
    setsTotalPages: 1,
  },
};

/** Perfil público + wishlist, com os params de página observáveis. */
async function mockProfileAndWishlist(
  page: import("@playwright/test").Page,
  wishlistStatus = 200,
) {
  const wishlistRequests: string[] = [];
  await page.route(API("users/ana$"), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROFILE),
    });
  });
  // A query (userId/cardsPage/setsPage) faz parte do match.
  await page.route(API("gacha/wishlist[/?].*"), async (route) => {
    wishlistRequests.push(route.request().url());
    if (wishlistStatus !== 200) {
      await route.fulfill({
        status: wishlistStatus,
        contentType: "application/json",
        body: JSON.stringify({ message: "boom" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(WISHLIST),
    });
  });
  return { wishlistRequests };
}

test.describe("Perfil público / wishlist na URL", () => {
  test("?tab= legado não trava o clique nas outras abas", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await mockProfileAndWishlist(page);

    // Chega por um link legado (?tab=ratings) e navega para outra aba: a aba
    // clicada precisa vencer o ?tab= remanescente na URL.
    await page.goto("/usuarios/ana?tab=ratings");
    await expect(page.getByText("Ana Teste").first()).toBeVisible();

    // A URL é o sinal estável: se o ?tab= legado sobrevive ao clique, o
    // popstate devolve o usuário para a aba antiga e a navegação não responde.
    await clickCentered(page.getByRole("button", { name: "Coleção", exact: true }));
    await expect(page).not.toHaveURL(/[?&]tab=/);

    await clickCentered(page.getByRole("button", { name: "Notas", exact: true }));
    await expect(page).not.toHaveURL(/[?&]tab=/);

    // A wishlist continua sendo a única aba que viaja na URL.
    await clickCentered(
      page.getByRole("button", { name: "Wishlist", exact: true }),
    );
    await expect(page).toHaveURL(/tab=wishlist/);

    // E a aba clicada é a que fica marcada, depois que os efeitos rodaram.
    await expect(
      page.getByRole("button", { name: "Wishlist", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("button", { name: "Coleção", exact: true }),
    ).not.toHaveAttribute("aria-current", "page");
  });

  test("recarregar ?tab=wishlist reabre a aba na página da URL", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    const { wishlistRequests } = await mockProfileAndWishlist(page);

    await page.goto("/usuarios/ana?tab=wishlist&cardsPage=2&setsPage=3");
    await expect(
      page.getByRole("button", { name: "Wishlist", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    // A paginação volta da URL, não do estado inicial do hook.
    await expect.poll(() => wishlistRequests.length).toBeGreaterThan(0);
    expect(
      wishlistRequests.some(
        (u) => u.includes("cardsPage=2") && u.includes("setsPage=3"),
      ),
    ).toBe(true);
  });

  test("falha ao carregar a wishlist mostra o alerta e some com o skeleton", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await mockProfileAndWishlist(page, 500);

    await page.goto("/usuarios/ana?tab=wishlist");

    // Escopado na section da wishlist: o route announcer do Next também é alert.
    const alert = page
      .getByRole("region", { name: "Wishlist" })
      .getByRole("alert");
    await expect(alert).toHaveText(/Não foi possível carregar a wishlist/);
    // O erro é texto real, não o booleano que o React não renderiza.
    await expect(
      page.getByRole("button", { name: "Tentar novamente" }),
    ).toBeVisible();
    await expect(page.locator(".skeleton")).toHaveCount(0);

    // O alert fica no <p> da mensagem, não no wrapper com o botão: um alert
    // no wrapper faria o leitor de tela anunciar "Tentar novamente" junto com
    // o erro. Um botão <button> nunca teria role, então isto é o que trava.
    const wishlist = page.getByRole("region", { name: "Wishlist" });
    await expect(wishlist.locator('[role="alert"]')).toHaveCount(1);
    expect(await wishlist.getByRole("alert").evaluate((el) => el.tagName)).toBe(
      "P",
    );
    await expect(wishlist.getByRole("alert").getByRole("button")).toHaveCount(0);
  });

  test("voltar do histórico restaura a aba da wishlist", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await mockProfileAndWishlist(page);

    await page.goto("/usuarios/ana?tab=ratings");
    await expect(page.getByText("Ana Teste").first()).toBeVisible();

    await clickCentered(
      page.getByRole("button", { name: "Wishlist", exact: true }),
    );
    await expect(page).toHaveURL(/tab=wishlist/);

    await clickCentered(page.getByRole("button", { name: "Notas", exact: true }));
    await expect(page).not.toHaveURL(/[?&]tab=/);

    // Back devolve a entrada da wishlist e a aba correspondente.
    await page.goBack();
    await expect(page).toHaveURL(/tab=wishlist/);
    await expect(
      page.getByRole("button", { name: "Wishlist", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("button", { name: "Notas", exact: true }),
    ).not.toHaveAttribute("aria-current", "page");
  });
});
