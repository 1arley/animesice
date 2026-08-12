import { test, expect } from "@playwright/test";
import { blockAds, mockGeneric, loginAs, VIEWER } from "./helpers";

/** Escopa mocks ao backend mockado (porta 3001), nunca à navegação do Next (3000). */
const API = (path: string) => new RegExp(`//localhost:3001/(?:api/)?${path}`);

/** Feed global controlado: 1 post + 1 evento de atividade. */
async function mockFeed(page: import("@playwright/test").Page) {
  await page.route(API("social/feed"), async (route) => {
    const scope = new URL(route.request().url()).searchParams.get("scope");
    if (scope === "following") {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 401,
          message: "Entre para ver o feed de quem você segue.",
        }),
      });
      return;
    }
    const now = Date.now();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            type: "post",
            post: {
              id: "p1",
              content: "Terminando Frieren e não esperava gostar tanto.",
              animeId: null,
              anime: null,
              shareCount: 2,
              status: "VISIBLE",
              createdAt: new Date(now - 2 * 3600e3).toISOString(),
              updatedAt: new Date().toISOString(),
              user: { id: "u1", name: "Ana Teste", userName: "ana", avatar: null },
              _count: { likes: 1, comments: 1 },
              hasLiked: false,
            },
          },
          {
            type: "activity",
            event: {
              type: "rating",
              score: 9,
              anime: { slug: "frieren", title: "Frieren", coverImage: null },
              createdAt: new Date(now - 5 * 3600e3).toISOString(),
            },
            user: { id: "u1", name: "Ana Teste", userName: "ana", avatar: null },
          },
        ],
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      }),
    });
  });
}

test.describe("Comunidade / feed", () => {
  test("anônimo: renderiza posts + atividade e a tab Seguindo pede login", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await mockFeed(page);

    await page.goto("/comunidade/feed");

    // Post do feed
    await expect(
      page.getByText("Terminando Frieren e não esperava gostar tanto."),
    ).toBeVisible();

    // Evento de atividade mesclado (rating → "avaliou" + título do anime)
    await expect(page.getByText("avaliou")).toBeVisible();
    await expect(page.getByRole("link", { name: "Frieren" })).toBeVisible();

    // Composer oculto para anônimos
    await expect(
      page.getByPlaceholder("O que você está assistindo?"),
    ).toHaveCount(0);

    // Tab "Seguindo" sem sessão → CTA de login (escopado ao conteúdo — o
    // Header e o Footer também têm links "Entrar").
    await page.getByRole("button", { name: "Seguindo" }).click();
    await expect(
      page.locator("#body-content").getByRole("link", { name: "Entrar" }),
    ).toBeVisible();
  });

  test("anônimo: feed paginado com carregar mais", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);

    const post = (id: string, content: string) => ({
      type: "post",
      post: {
        id,
        content,
        animeId: null,
        anime: null,
        shareCount: 0,
        status: "VISIBLE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: { id: "u1", name: "Ana Teste", userName: "ana", avatar: null },
        _count: { likes: 0, comments: 0 },
        hasLiked: false,
      },
    });

    await page.route(API("social/feed"), async (route) => {
      const pageN = parseInt(
        new URL(route.request().url()).searchParams.get("page") || "1",
        10,
      );
      const data =
        pageN === 1 ? [post("pg1", "Primeira página")] : [post("pg2", "Segunda página")];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data,
          meta: { total: 2, page: pageN, limit: 20, totalPages: 2 },
        }),
      });
    });

    await page.goto("/comunidade/feed");
    await expect(page.getByText("Primeira página")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Carregar mais" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Carregar mais" }).click();
    await expect(page.getByText("Segunda página")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Carregar mais" }),
    ).toHaveCount(0);
  });

  test("logado: cria post, curte, comenta, compartilha e exclui", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await mockFeed(page);

    // Captura do POST de criação — responde com o post criado (echo).
    let createPayload: any = null;
    await page.route(API("social/posts$"), async (route) => {
      createPayload = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "new-post",
          content: createPayload.content,
          animeId: createPayload.animeId ?? null,
          anime: null,
          shareCount: 0,
          status: "VISIBLE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: VIEWER.id, name: VIEWER.name, userName: VIEWER.userName, avatar: null },
          _count: { likes: 0, comments: 0 },
          hasLiked: false,
        }),
      });
    });

    await page.goto("/comunidade/feed");

    // Composer visível logado
    const composer = page.getByPlaceholder("O que você está assistindo?");
    await expect(composer).toBeVisible();

    await composer.fill("Meu primeiro post");
    await page.getByRole("button", { name: "Postar" }).click();

    // Payload correto enviado ao backend
    await expect.poll(() => createPayload).not.toBeNull();
    expect(createPayload.content).toBe("Meu primeiro post");
    expect(createPayload.animeId).toBeUndefined();

    // Post novo entra no topo do feed
    const newPost = page.locator("article", { hasText: "Meu primeiro post" });
    await expect(newPost).toBeVisible();

    // Curtir → POST no backend e estado visual (toggle de volta também)
    let likeUrl: string | null = null;
    let liked = false;
    await page.route(API("social/posts/new-post/like"), async (route) => {
      likeUrl = route.request().url();
      liked = !liked;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ liked }),
      });
    });
    const likeBtn = newPost.locator('button[title="Curtir post"]');
    // Token exato de classe — /text-signal/ também casaria "hover:text-signal".
    const likedClass = async () =>
      ((await likeBtn.getAttribute("class")) ?? "").split(/\s+/).includes("text-signal");

    await likeBtn.click();
    await expect.poll(() => likeUrl).not.toBeNull();
    expect(likeUrl!.endsWith("/social/posts/new-post/like")).toBe(true);
    await expect.poll(likedClass).toBe(true);

    // Descurtir (toggle de volta)
    await likeBtn.click();
    await expect.poll(likedClass).toBe(false);

    // Comentários: lista vazia + criação com payload
    let commentPosted = false;
    let commentPayload: any = null;
    await page.route(API("social/posts/new-post/comments"), async (route) => {
      if (route.request().method() === "POST") {
        commentPayload = await route.request().postDataJSON();
        commentPosted = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "pc-1",
            postId: "new-post",
            content: commentPayload.content,
            createdAt: new Date().toISOString(),
            user: { id: VIEWER.id, name: VIEWER.name, userName: VIEWER.userName, avatar: null },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
          }),
        });
      }
    });

    await newPost.locator('button:has-text("Comentar")').click();
    await expect(newPost.getByText("Nenhum comentário ainda.")).toBeVisible();

    await newPost
      .getByPlaceholder("Escreva um comentário…")
      .fill("Gostei demais!");
    await newPost.getByRole("button", { name: "Enviar" }).click();

    await expect.poll(() => commentPosted).toBe(true);
    expect(commentPayload.content).toBe("Gostei demais!");
    await expect(newPost.getByText("Gostei demais!")).toBeVisible();

    // Compartilhar → POST + feedback "Copiado!"
    let shareUrl: string | null = null;
    await page.route(API("social/posts/new-post/share"), async (route) => {
      shareUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ shared: true, shareCount: 1 }),
      });
    });
    await newPost.locator('button:has-text("Compartilhar")').click();
    await expect.poll(() => shareUrl).not.toBeNull();
    await expect(newPost.getByText("Copiado!")).toBeVisible();

    // Excluir o próprio post (confirm) → DELETE + some do feed
    let deleteUrl: string | null = null;
    page.on("dialog", (d) => d.accept());
    await page.route(API("social/posts/new-post$"), async (route) => {
      if (route.request().method() === "DELETE") {
        deleteUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Post removido." }),
        });
      } else {
        await route.continue();
      }
    });
    await newPost.locator('button:has-text("Excluir")').click();
    await expect.poll(() => deleteUrl).not.toBeNull();
    expect(deleteUrl!.endsWith("/social/posts/new-post")).toBe(true);
    await expect(page.getByText("Meu primeiro post")).toHaveCount(0);
  });

  test("logado: a tab Seguindo mostra o feed de quem eu sigo", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await mockFeed(page);

    // Registrado DEPOIS do mockFeed (LIFO: vence para scope=following).
    await page.route(API("social/feed.*"), async (route) => {
      const scope = new URL(route.request().url()).searchParams.get("scope");
      if (scope !== "following") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              type: "post",
              post: {
                id: "fp1",
                content: "Post de quem eu sigo",
                animeId: null,
                anime: null,
                shareCount: 0,
                status: "VISIBLE",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: { id: "u2", name: "Bruno Teste", userName: "bruno", avatar: null },
                _count: { likes: 0, comments: 0 },
                hasLiked: false,
              },
            },
          ],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
      });
    });

    await page.goto("/comunidade/feed");
    await expect(
      page.getByPlaceholder("O que você está assistindo?"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Seguindo" }).click();
    await expect(page.getByText("Post de quem eu sigo")).toBeVisible();
  });
});
