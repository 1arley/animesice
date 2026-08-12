import { test, expect } from "@playwright/test";
import { blockAds, mockGeneric, loginAs } from "./helpers";

/** Escopa mocks ao backend mockado (porta 3001), nunca à navegação do Next (3000). */
const API = (path: string) => new RegExp(`//localhost:3001/(?:api/)?${path}`);

/** 30 usuários: 'Zoe Lima' (zoe) é o alvo da busca; 'User N' alimenta o load more. */
function makeUsers() {
  return Array.from({ length: 30 }, (_, i) => ({
    id: "u" + (i + 1),
    name: i === 0 ? "Zoe Lima" : "User " + (i + 1),
    userName: i === 0 ? "zoe" : "user" + (i + 1),
    avatar: null,
    bio: i === 0 ? "Maratonando Frieren" : null,
    createdAt: new Date(Date.now() - (i + 1) * 86400e3).toISOString(),
    _count: { comments: i, ratings: i, favorites: i, watchHistories: i * 2 },
    isFollowing: false,
  }));
}

/**
 * Mock do diretório: responde paginado/filtrado conforme os query params
 * reais da página e registra cada URL de request para assertions.
 */
async function mockUsersDirectory(page: import("@playwright/test").Page) {
  const users = makeUsers();
  const requests: string[] = [];
  await page.route(API("users\\?.*"), async (route) => {
    const u = new URL(route.request().url());
    requests.push(route.request().url());
    const search = (u.searchParams.get("search") || "").toLowerCase();
    const pageN = parseInt(u.searchParams.get("page") || "1", 10);
    const limit = parseInt(u.searchParams.get("limit") || "24", 10);
    const filtered = search
      ? users.filter(
          (x) =>
            (x.name || "").toLowerCase().includes(search) ||
            (x.userName || "").toLowerCase().includes(search),
        )
      : users;
    const data = filtered.slice((pageN - 1) * limit, pageN * limit);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data,
        meta: {
          total: filtered.length,
          page: pageN,
          limit,
          totalPages: Math.ceil(filtered.length / limit),
        },
      }),
    });
  });
  return { requests };
}

test.describe("Comunidade / usuários", () => {
  test("grid: lista paginada, busca com debounce, sort e carregar mais", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    const { requests } = await mockUsersDirectory(page);

    await page.goto("/comunidade/usuarios");

    // Primeira página: 24 cards (limit 24) + botão carregar mais
    await expect(page.getByText("Zoe Lima")).toBeVisible();
    await expect(page.getByText("User 24")).toBeVisible();
    const cards = page.locator('a[href^="/users/"]');
    await expect(cards).toHaveCount(24);
    await expect(
      page.getByRole("button", { name: "Carregar mais" }),
    ).toBeVisible();

    // Request inicial: sort=recommended (padrão) + page=1 + limit=24
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(requests[0]).toContain("sort=recommended");
    expect(requests[0]).toContain("page=1");
    expect(requests[0]).toContain("limit=24");

    // Carregar mais → página 2 (usuários 25..30), botão some no fim
    await page.getByRole("button", { name: "Carregar mais" }).click();
    await expect(page.getByText("User 25")).toBeVisible();
    await expect(page.getByText("User 30")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Carregar mais" }),
    ).toHaveCount(0);

    // Busca com debounce: digita e o request sai com search=zoe (1 resultado)
    await page.getByPlaceholder("Buscar por nome ou @apelido…").fill("zoe");
    await expect
      .poll(() => requests.some((u) => u.includes("search=zoe")))
      .toBe(true);
    await expect(page.getByText("Zoe Lima")).toBeVisible();
    await expect(cards).toHaveCount(1);

    // Limpa a busca antes de testar sort — senão o filtro 'zoe' persiste.
    await page.getByPlaceholder("Buscar por nome ou @apelido…").fill("");
    await expect(cards).toHaveCount(24);

    // Sort: tab "Novos" → request com sort=new E o grid re-renderiza (24 cards).
    const sortResponse = page.waitForResponse(
      (r) => r.url().includes("/users?") && r.url().includes("sort=new"),
    );
    await page.getByRole("button", { name: "Novos" }).click();
    await sortResponse;
    await expect(cards).toHaveCount(24);
  });

  test("logado: botão seguir envia o payload certo e muda de estado", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);

    // Sessão simulada (cookie role + /user/me) para o FollowButton renderizar.
    await loginAs(page);

    // Diretório pequeno e determinístico (1 usuário).
    await page.route(API("users\\?.*"), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "u1",
              name: "Ana Teste",
              userName: "ana",
              avatar: null,
              bio: null,
              createdAt: new Date().toISOString(),
              _count: { comments: 1, ratings: 1, favorites: 1, watchHistories: 1 },
              isFollowing: false,
            },
          ],
          meta: { total: 1, page: 1, limit: 24, totalPages: 1 },
        }),
      });
    });

    // Captura do follow POST (o id do alvo está na URL).
    let followUrl: string | null = null;
    await page.route(API("social/follow/u1"), async (route) => {
      followUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ following: true }),
      });
    });

    await page.goto("/comunidade/usuarios");
    await expect(page.getByText("Ana Teste")).toBeVisible();

    const followBtn = page.getByRole("button", { name: "Seguir", exact: true });
    await expect(followBtn).toBeVisible();

    await followBtn.click();
    await expect.poll(() => followUrl).not.toBeNull();
    expect(followUrl!.endsWith("/social/follow/u1")).toBe(true);

    // Estado otimista refletido na UI
    await expect(
      page.getByRole("button", { name: "Seguindo ✓" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Seguir", exact: true }),
    ).toHaveCount(0);
  });
});
