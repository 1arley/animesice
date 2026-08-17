import type { Locator, Page } from "@playwright/test";

/**
 * Helpers compartilhados dos specs e2e — rede de anúncios, mocks genéricos
 * do backend e sessão simulada. Escopam tudo ao backend mockado (porta 3001),
 * nunca à navegação do Next (3000).
 */

// Redes de anúncio bloqueadas para iframes não interceptarem cliques
// ("<div></div> intercepts pointer events") e tornarem o teste flaky.
// Monetag (al5sm) e demais redes são abortadas; sem AdSense/AdBlockNotice
// não há mais sonda de rede a responder.
const AD_PATTERNS = [
  "**/pagead2.googlesyndication.com/**",
  "**/*.doubleclick.net/**",
  "**/fundingchoicesmessages.google.com/**",
  "**/al5sm.com/**",
  "**/my.rtmark.net/**",
  "**/255md.com/**",
  "**/ep1.adtrafficquality.google/**",
  "**/ep2.adtrafficquality.google/**",
  "**/static.cloudflareinsights.com/**",
];

/**
 * Bloqueia redes de anúncio — iframes de ads interceptam cliques
 * ("<div></div> intercepts pointer events") e tornam o teste flaky.
 */
export async function blockAds(page: Page) {
  for (const pattern of AD_PATTERNS) {
    await page.route(pattern, (route) => route.abort());
  }
}

/** Mocks genéricos para chamadas que o layout/servidor possa fazer. */
export async function mockGeneric(page: Page) {
  for (const p of [
    "**/anime*",
    "**/episode/latest*",
    "**/anime/trending*",
    "**/anime/recently-added*",
  ]) {
    await page.route(p, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  }
}

/**
 * Clica em um elemento rolando-o antes para o CENTRO da viewport.
 *
 * O MobileTabBar (fixo na base, só <sm) cobre a borda inferior da tela no
 * mobile. Rolar até o centro mantém o alvo longe da barra fixa.
 *
 * Usa o clique real do Playwright depois do scroll. Isso preserva as checagens
 * de actionability e espera o elemento ficar estável, evitando disparar um
 * `element.click()` durante a hidratação do Next.
 */
export async function clickCentered(locator: Locator) {
  // `.first()` reproduz a semântica não-estrita do `page.click(selector)` —
  // os specs legados contam com "primeiro match" para seletores CSS.
  const target = locator.first();
  await target.scrollIntoViewIfNeeded();
  await target.click();
}

/**
 * Sessão simulada: cookie `role` (não-httpOnly) + /user/me — o mesmo
 * contrato que o AuthProvider do frontend espera.
 */
export async function loginAs(page: Page) {
  await page.context().addCookies([
    { name: "role", value: "USER", url: "http://localhost:3000" },
  ]);
  await page.route(/\/\/localhost:3001\/(?:api\/)?user\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "viewer-1",
        email: "viewer@test.dev",
        name: "Viewer",
        userName: "viewer",
        avatar: null,
        bio: null,
        myAnimeList: null,
        role: "USER",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
  });
}

/** Usuário simulado retornado por /user/me (consistente com loginAs). */
export const VIEWER = {
  id: "viewer-1",
  name: "Viewer",
  userName: "viewer",
};
