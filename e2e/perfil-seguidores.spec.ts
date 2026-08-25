import { test, expect } from "@playwright/test";
import { blockAds, mockGeneric, loginAs, clickCentered } from "./helpers";

/** Escopa mocks ao backend mockado (porta 3001), nunca à navegação do Next (3000). */
const API = (path: string) => new RegExp(`//localhost:3001/(?:api/)?${path}`);

/** Perfil de teste padrão — alterado por profileOverride quando necessário. */
function mockProfile(profileOverride: Record<string, unknown> = {}) {
  return {
    id: "u1",
    name: "Ana Teste",
    userName: "ana",
    avatar: null,
    bio: "Maratonando Frieren",
    myAnimeList: null,
    createdAt: new Date().toISOString(),
    _count: {
      comments: 3,
      ratings: 4,
      favorites: 5,
      watchHistories: 6,
      followers: 3,
      following: 2,
    },
    ...profileOverride,
  };
}

/**
 * Mocka o perfil público + as duas listas de follow. Retorna as URLs
 * registradas para assertions sobre os requests disparados pelas tabs.
 */
async function mockFollowLists(
  page: import("@playwright/test").Page,
  followers: unknown[],
  following: unknown[],
  profileOverride: Record<string, unknown> = {},
) {
  const profile = mockProfile(profileOverride);
  const userId = profile.id as string;
  const userName = profile.userName as string;
  const requests: string[] = [];
  await page.route(API(`users/${userName}$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(profile),
    });
  });
  const pageList = (data: unknown[]) =>
    ({ data, meta: { total: data.length, page: 1, limit: 20, totalPages: 1 } });
  // As listas vão com query (?page=&limit=) — o padrão cobre os params.
  await page.route(API(`social/followers/${userId}\\?.*`), async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(pageList(followers)),
    });
  });
  await page.route(API(`social/following/${userId}\\?.*`), async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(pageList(following)),
    });
  });
  return { requests };
}

test.describe("Perfil público / seguidores e seguindo", () => {
  test("anônimo: contadores nas stats e listas nas tabs Seguidores/Seguindo", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);

    const followers = [
      {
        id: "u2",
        name: "Bruno Teste",
        userName: "bruno",
        avatar: null,
        bio: "Fã de mecha",
        createdAt: new Date(Date.now() - 86400e3).toISOString(),
        _count: { comments: 2, ratings: 1, favorites: 1 },
        isFollowing: false,
      },
      {
        id: "u3",
        name: "Zoe Lima",
        userName: "zoe",
        avatar: null,
        bio: null,
        createdAt: new Date(Date.now() - 2 * 86400e3).toISOString(),
        _count: { comments: 0, ratings: 0, favorites: 0 },
        isFollowing: false,
      },
    ];
    const following = [
      {
        id: "u4",
        name: "Davi Reis",
        userName: "davi",
        avatar: null,
        bio: "Só seinen",
        createdAt: new Date(Date.now() - 3 * 86400e3).toISOString(),
        _count: { comments: 7, ratings: 6, favorites: 4 },
        isFollowing: false,
      },
    ];
    const { requests } = await mockFollowLists(page, followers, following);

    await page.goto("/users/ana");

    // Hero carregado + contadores de follow nas stats (label + valor juntos).
    await expect(page.getByText("Ana Teste").first()).toBeVisible();

    // Rola até as stats para garantir que o IntersectionObserver do CountUp
    // dispara na terceira linha do grid mobile (Seguindo/Seguidores).
    await page
      .getByRole("button", { name: /^Seguindo \d+$/ })
      .scrollIntoViewIfNeeded();

    await expect(
      page.getByRole("button", { name: "Seguidores 3" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Seguindo 2" }),
    ).toBeVisible();

    // Tab Seguidores → GET /social/followers/u1 + lista renderizada.
    await clickCentered(page.getByRole("button", { name: "Seguidores", exact: true }));
    await expect(page.getByText("@bruno")).toBeVisible();
    await expect(page.getByText("@zoe")).toBeVisible();

    // Tab Seguindo → GET /social/following/u1 (lazy, só quando ativada).
    await clickCentered(page.getByRole("button", { name: "Seguindo", exact: true }));
    await expect(page.getByText("@davi")).toBeVisible();

    expect(
      requests.filter((u) => u.includes("/social/followers/u1")),
    ).toHaveLength(1);
    expect(
      requests.filter((u) => u.includes("/social/following/u1")),
    ).toHaveLength(1);
  });

  test("logado: botão seguir nas listas segue o alvo certo", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);

    // u3 já é seguido pelo viewer (isFollowing: true) — estado inicial real.
    const followers = [
      {
        id: "u2",
        name: "Bruno Teste",
        userName: "bruno",
        avatar: null,
        bio: null,
        createdAt: new Date().toISOString(),
        _count: { comments: 1, ratings: 1, favorites: 0 },
        isFollowing: false,
      },
      {
        id: "u3",
        name: "Zoe Lima",
        userName: "zoe",
        avatar: null,
        bio: null,
        createdAt: new Date().toISOString(),
        _count: { comments: 0, ratings: 0, favorites: 0 },
        isFollowing: true,
      },
    ];
    const { requests } = await mockFollowLists(page, followers, []);

    // Captura do follow POST (o id do alvo está na URL).
    let followUrl: string | null = null;
    await page.route(API("social/follow/u2$"), async (route) => {
      followUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ following: true }),
      });
    });

await page.goto("/users/ana");
    await page.getByRole("button", { name: "Seguidores", exact: true }).click();

    // Estado inicial: Zoe já aparece como "Seguindo ✓", Bruno como "Seguir".
    // O mock-backend presta dados corretos; este teste captura o POST.
    const brunoRow = page.locator("li", { hasText: "@bruno" });
    const zoeRow = page.locator("li", { hasText: "@zoe" });
    await expect(
      brunoRow.getByRole("button", { name: "Seguir", exact: true }),
    ).toBeVisible();
    await expect(
      zoeRow.getByRole("button", { name: "Seguindo ✓" }),
    ).toBeVisible();

    // Segue Bruno → POST no alvo certo + estado otimista na linha.
    await clickCentered(brunoRow.getByRole("button", { name: "Seguir", exact: true }));
    await expect.poll(() => followUrl).not.toBeNull();
    expect(followUrl!.endsWith("/social/follow/u2")).toBe(true);
    await expect(
      brunoRow.getByRole("button", { name: "Seguindo ✓" }),
    ).toBeVisible();

    // A tab não refaz requests ao reabrir (dados em cache no estado).
    expect(
      requests.filter((u) => u.includes("/social/followers/u1")),
    ).toHaveLength(1);
  });

  test("próprio perfil: sem botão seguir no hero, mas segue outros nas listas", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);

    // Perfil com o id do próprio viewer — o hero esconde o botão seguir.
    const followers = [
      {
        id: "u2",
        name: "Bruno Teste",
        userName: "bruno",
        avatar: null,
        bio: null,
        createdAt: new Date().toISOString(),
        _count: { comments: 1, ratings: 1, favorites: 0 },
        isFollowing: false,
      },
    ];
    await mockFollowLists(
      page,
      followers,
      [],
      {
        id: "viewer-1",
        name: "Viewer",
        userName: "viewer",
        _count: {
          comments: 1,
          ratings: 1,
          favorites: 0,
          watchHistories: 2,
          followers: 0,
          following: 1,
        },
      },
    );

    await page.goto("/users/viewer");

    // No próprio perfil o hero não oferece "Seguir" (isOwnProfile).
    await expect(
      page.getByRole("button", { name: "Seguir", exact: true }),
    ).toHaveCount(0);

    // Mas nas listas o FollowButton segue outros usuários normalmente.
    await clickCentered(
      page.getByRole("button", { name: "Seguidores", exact: true }),
    );
    const brunoRow = page.locator("li", { hasText: "@bruno" });
    await expect(brunoRow).toBeVisible();
    await expect(
      brunoRow.getByRole("button", { name: "Seguir", exact: true }),
    ).toBeVisible();
  });
});
