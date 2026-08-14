import type { Locator, Page } from "@playwright/test";

/**
 * Helpers compartilhados dos specs e2e — rede de anúncios, mocks genéricos
 * do backend e sessão simulada. Escopam tudo ao backend mockado (porta 3001),
 * nunca à navegação do Next (3000).
 */

/** 1×1 PNG transparente — resposta "válida" para a sonda do AdBlockNotice. */
const VALID_IMG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// pagead2 NÃO entra no abort: o AdBlockNotice usa uma sonda de rede nesse
// domínio (gen_204) e só mostra o banner quando a sonda E o script do AdSense
// falham juntos. Abortar > precisaria de ir no site e acusaria adblock falso
// nos testes — o banner fixo interceptaria cliques nos testes mobile. Em vez
// de abortar, respondemos com uma imagem válida: a sonda carrega e a detecção
// resolve "sem bloqueio". As demais redes de anúncio seguem bloqueadas.
const AD_PATTERNS = [
  "**/*.doubleclick.net/**",
  "**/adsbygoogle.js",
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
 * A sonda do AdBlockNotice (pagead2) é respondida com imagem válida para a
 * detecção concluir "sem bloqueio" (banner nunca aparece nos testes).
 */
export async function blockAds(page: Page) {
  for (const pattern of AD_PATTERNS) {
    await page.route(pattern, (route) => route.abort());
  }
  await page.route("**/pagead2.googlesyndication.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(VALID_IMG, "base64"),
    }),
  );
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
 * O MobileTabBar (fixo na base, só <sm) e o AdBlockNotice (fixo, quando
 * exibido) cobrem a borda inferior da tela no mobile. Rolar até o centro
 * mantém o alvo longe das barras fixas.
 *
 * O clique usa `element.click()` em vez do clique por coordenadas: o Link do
 * Next navega via router SPA (mesmo comportamento) ou cai no default nativo
 * do <a> — sem corrida com scroll/prefetch/hidratação que fazia o clique de
 * coordenadas ser "engolido" (o evento disparava mas a URL não mudava).
 */
export async function clickCentered(locator: Locator) {
  // `.first()` reproduz a semântica não-estrita do `page.click(selector)` —
  // os specs legados contam com "primeiro match" para seletores CSS.
  await locator.first().evaluate((el) => {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    (el as HTMLElement).click();
  });
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
