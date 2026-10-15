import { test, expect } from "@playwright/test";
import { blockAds, mockGeneric, loginAs } from "./helpers";
import { GACHA_RARITY_COLORS } from "../src/lib/gacha-rarity-colors";

function cssColor(hex: string) {
  const color = Number.parseInt(hex.slice(1), 16);
  return `rgb(${color >> 16}, ${(color >> 8) & 255}, ${color & 255})`;
}

test.describe("Gacha", () => {
  test("invocação pode ser pulada enquanto a API ainda calcula o giro", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    let spins: unknown[] = [];
    await page.route("**/gacha/spins", route => route.fulfill({ json: spins }));
    await page.route("**/gacha/spin", async route => {
      const response = await route.fetch();
      const pull = await response.json();
      spins = [pull];
      await pending;
      await route.fulfill({ response, json: pull });
    });
    await page.goto("/gacha");
    await page.getByRole("button", { name: /^Girar/ }).click();
    const dialog = page.getByRole("dialog", { name: "Invocação" });
    try {
      await expect(dialog).toHaveAttribute("data-phase", "invocation");
      const close = dialog.getByRole("button", { name: "Fechar", exact: true });
      await expect(close).toBeVisible();
      await expect(close).toBeEnabled();
      await page.screenshot({ path: test.info().outputPath("gacha-invocation.png") });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    } finally {
      release();
    }
    await expect(page.getByText(/Selecionada: Waifu E2E/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Girar/ })).toBeEnabled();
  });

  test("timeout do giro fecha a janela e informa como recuperar o preview", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/gacha/spin", async route => {
      const response = await route.fetch();
      await pending;
      await route.fulfill({ response });
    });
    await page.clock.install();
    await page.goto("/gacha");
    await page.getByRole("button", { name: /^Girar/ }).click();
    await page.clock.fastForward(15_001);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("alert").filter({ hasText: "A resposta demorou mais de 15 segundos" }),
    ).toContainText("Recarregue a página");
    release();
  });

  test("giro confirmado permanece selecionado se a atualização falhar", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    let spun = false;
    await page.route("**/gacha/spins", route => spun
      ? route.fulfill({ status: 503, json: { message: "Indisponível" } })
      : route.fulfill({ json: [] }));
    await page.route("**/gacha/spin", async route => {
      const response = await route.fetch();
      spun = true;
      await route.fulfill({ response });
    });
    await page.goto("/gacha");
    const failedRefresh = page.waitForResponse(response => response.url().endsWith("/gacha/spins") && response.status() === 503);
    await page.getByRole("button", { name: /^Girar/ }).click();
    await failedRefresh;
    const dialog = page.getByRole("dialog", { name: "Invocação" });
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Previews desta hora (1/5)")).toBeVisible();
    await expect(page.getByText(/Selecionada: Waifu E2E/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Pegar carta" })).toBeEnabled();
  });

  test("configuração tardia não reinicia uma invocação em espera", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    let releaseConfig!: () => void;
    let releaseSpin!: () => void;
    const configPending = new Promise<void>(resolve => { releaseConfig = resolve; });
    const spinPending = new Promise<void>(resolve => { releaseSpin = resolve; });
    await page.route("**/gacha/anim-config", async route => {
      await configPending;
      await route.fulfill({ json: { flipDuration: 0.8 } });
    });
    await page.route("**/gacha/spin", async route => {
      const response = await route.fetch();
      await spinPending;
      await route.fulfill({ response });
    });
    try {
      await page.goto("/gacha");
      await page.getByRole("button", { name: /^Girar/ }).click();
      const dialog = page.getByRole("dialog", { name: "Invocação" });
      await expect(dialog).toHaveAttribute("data-phase", "waiting");
      const phases = dialog.evaluate(el => new Promise<string[]>(resolve => {
        const seen: string[] = [];
        const observer = new MutationObserver(() => seen.push(el.getAttribute("data-phase") ?? ""));
        observer.observe(el, { attributes: true, attributeFilter: ["data-phase"] });
        setTimeout(() => { observer.disconnect(); resolve(seen); }, 900);
      }));
      await page.waitForTimeout(50);
      releaseConfig();
      expect(await phases).toEqual([]);
      await expect(dialog).toHaveAttribute("data-phase", "waiting");
    } finally {
      releaseConfig();
      releaseSpin();
    }
  });

  test("movimento reduzido não baixa vídeo nem monta canvas", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    const crystalRequests: string[] = [];
    page.on("request", request => {
      if (/\/gacha\/crystal\.(mp4|webp)(?:\?|$)/.test(request.url())) crystalRequests.push(request.url());
    });
    await page.goto("/gacha");
    await page.getByRole("button", { name: /^Girar/ }).click();
    const dialog = page.getByRole("dialog", { name: "Invocação" });
    await expect(dialog.getByRole("button", { name: "Continuar" })).toBeVisible();
    await expect(dialog.locator("video, canvas")).toHaveCount(0);
    await expect(dialog.locator("[data-badge]")).toHaveCSS("opacity", "1");
    await expect(dialog.locator("[data-name]")).toHaveText("Waifu E2E");
    await expect(dialog.locator("[data-rarity-label]")).toBeVisible();
    await expect(dialog.locator("[data-badge]")).toContainText("pts");
    expect(crystalRequests).toEqual([]);
  });

  test("anônimo: explica o jogo, pede login e mostra listas vazias", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.goto("/gacha");
    // level 1 desambigua do <h2> "Gacha" da nav "Áreas do Gacha".
    await expect(page.getByRole("heading", { name: "Gacha", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Entre" })).toBeVisible();
    await expect(
      page.getByText("Nenhum pull ainda. Seja o primeiro."),
    ).toBeVisible();
    await expect(page.getByText("Ranking vazio por enquanto.")).toBeVisible();
  });

  const rarities = Object.keys(GACHA_RARITY_COLORS) as Array<keyof typeof GACHA_RARITY_COLORS>;
  for (const rarity of rarities) {
    test(`reveal ${rarity}: Continuar aguarda a carta se acomodar`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await blockAds(page);
      await mockGeneric(page);
      await loginAs(page);
      const cdnGsapRequests: string[] = [];
      page.on("request", request => {
        if (request.url().includes("cdnjs.cloudflare.com/ajax/libs/gsap")) cdnGsapRequests.push(request.url());
      });
      await page.route("**/cdnjs.cloudflare.com/**", route => route.abort());
      await page.route("**/gacha/spin", async route => {
        const response = await route.fetch();
        const pull = await response.json();
        pull.card.rarity = rarity;
        await route.fulfill({ response, json: pull });
      });
      await page.goto("/gacha");
      const startedAt = Date.now();
      await page.getByRole("button", { name: /^Girar/ }).click();
      const dialog = page.getByRole("dialog", { name: "Invocação" });
      await expect(dialog).toHaveAttribute("data-phase", "showcase");
      await expect(dialog.locator("[data-stage]")).toHaveCSS("color", cssColor(GACHA_RARITY_COLORS[rarity]));
      // Sample the first rendered frame with Continuar, before polling can
      // conceal a button that appeared while the card was still rotating.
      const transform = await dialog.evaluate(el => new Promise<number[]>(resolve => {
        const sample = () => {
          if (el.querySelector("button")?.textContent === "Continuar") {
            const flip = el.querySelector("[data-flip]")!;
            const matrix = new DOMMatrixReadOnly(getComputedStyle(flip).transform);
            resolve([matrix.m11, matrix.m13, matrix.m22]);
          } else requestAnimationFrame(sample);
        };
        sample();
      }));
      expect(transform[0]).toBeCloseTo(-1, 2);
      expect(transform[1]).toBeCloseTo(0, 2);
      expect(transform[2]).toBeCloseTo(1, 2);
      await expect(dialog.locator("[data-badge]")).toHaveCSS("opacity", "1");
      await expect(dialog.locator("[data-name]")).toHaveText("Waifu E2E");
      expect(Date.now() - startedAt).toBeLessThan(10_000);
      expect(cdnGsapRequests).toEqual([]);
      await page.screenshot({ path: test.info().outputPath(`gacha-${rarity.toLowerCase()}-showcase.png`) });
      await dialog.getByRole("button", { name: "Continuar" }).click();
      await expect(dialog).toHaveCount(0);
    });

    if (["COMUM", "EPICA", "LENDARIA"].includes(rarity)) {
    test(`reveal animado ${rarity}: API lenta pausa a timeline até o resultado`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await blockAds(page);
      await mockGeneric(page);
      await loginAs(page);
      let release!: () => void;
      const responseReady = new Promise<void>((resolve) => {
        release = resolve;
      });
      let spins: unknown[] = [];
      await page.route("**/gacha/spins", route => route.fulfill({ json: spins }));
      await page.route("**/gacha/spin", async (route) => {
        const response = await route.fetch();
        const pull = await response.json();
        pull.card.rarity = rarity;
        pull.foil = rarity === "LENDARIA" ? "GOLD" : "NORMAL";
        await responseReady;
        spins = [pull];
        await route.fulfill({ response, json: pull });
      });
      await page.goto("/gacha");
      await page.getByRole("button", { name: /^Girar/ }).click();
      const dialog = page.getByRole("dialog");
      // API lenta: a timeline pausa em `waiting` e só revela quando a
      // resposta chega. O botão nesse estado é "Fechar" — não dá pular a
      // animação antes do resultado, então não há o que apertar aqui.
      await expect(dialog).toHaveAttribute("data-phase", "waiting");
      const revealDetails = dialog.evaluate(el => new Promise<string[]>((resolve) => {
        const observer = new MutationObserver(() => {
          const art = el.querySelector<HTMLElement>("[data-card-art]");
          if (art?.dataset.artReady !== "true") return;
          observer.disconnect();
          resolve([
            getComputedStyle(art).opacity,
            getComputedStyle(el.querySelector<HTMLElement>("[data-badge]")!).opacity,
            getComputedStyle(el.querySelector<HTMLElement>("[data-name-letter]")!).opacity,
          ]);
        });
        observer.observe(el, { subtree: true, attributes: true, attributeFilter: ["data-art-ready"] });
      }));
      release();
      if (rarity === "LENDARIA") {
        await expect(dialog.locator("[data-godrays]")).toHaveCSS("opacity", /0\.[1-9]/);
        await page.screenshot({ path: test.info().outputPath("gacha-lendaria-rays.png") });
      }
      expect(await revealDetails).toEqual(["1", "0", "0"]);
      await page.screenshot({ path: test.info().outputPath(`gacha-${rarity.toLowerCase()}-flip-midpoint.png`) });
      await expect(
        dialog.getByRole("button", { name: "Continuar" }),
      ).toBeVisible();
      await expect(dialog.locator("[data-name]")).toHaveText("Waifu E2E");
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByText("Previews desta hora (1/5)"),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Pegar carta" })).toBeEnabled();
    });
    }
  }

  test("Pular no meio do tease revela imediatamente a raridade sorteada", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await page.route("**/gacha/spin", async route => {
      const response = await route.fetch();
      const pull = await response.json();
      pull.card.rarity = "LENDARIA";
      await route.fulfill({ response, json: pull });
    });
    await page.goto("/gacha");
    await page.getByRole("button", { name: /^Girar/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAttribute("data-phase", "tease");
    await dialog.getByRole("button", { name: "Pular", exact: true }).click();
    await expect(dialog).toHaveAttribute("data-phase", "showcase");
    await expect(dialog.getByRole("button", { name: "Continuar" })).toBeVisible();
    await expect(dialog.locator("[data-badge]")).toContainText("LENDÁRIA");
    await page.screenshot({ path: test.info().outputPath("gacha-skip-mid-tease.png") });
  });

  // A linha de odds vinha de literal na página e dessincronizou quando o
  // backend somou INK/PRISM. Trava a fonte: percentuais vêm de foilWeights.
  test("odds de foil vêm do economy snapshot", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.route("**/gacha/economy/odds", (route) =>
      route.fulfill({
        json: {
          versionId: "v1",
          version: 1,
          dailyBonus: 350,
          crystalPackages: [],
          boxPrices: {},
          keyPrice: 0,
          categories: {},
          qualities: {},
          // Fecha em 100 de propósito: 3 vira 3%, 5 vira 5%.
          foilWeights: { NORMAL: 70, HOLO: 12, GOLD: 8, INK: 5, PRISM: 5 },
        },
      }),
    );
    await page.goto("/gacha");
    await expect(page.getByText(/Foil:/)).toContainText("NORMAL 70%");
    await expect(page.getByText(/Foil:/)).toContainText("GOLD 8%");
    await expect(page.getByText(/Foil:/)).toContainText("PRISM 5%");
  });

  test("sem odds do backend a linha lista os foils sem porcentagem", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.route("**/gacha/economy/odds", (route) => route.abort());
    await page.goto("/gacha");
    const linha = page.getByText(/Foil:/);
    await expect(linha).toContainText("PRISM");
    await expect(linha).not.toContainText("%");
  });

  test("perfil: aba Cartas mostra estado vazio", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.goto("/usuarios/mock");
    await page.getByRole("button", { name: "Cartas" }).click();
    await expect(page.getByText("Nenhuma carta ainda.")).toBeVisible();
  });

  // Regressão: `filter` é propriedade única e o utilitário de condition
  // chegava por último, apagando a arte do foil. Trava a composição de
  // --foil-art + --cond-art. PRISM é o caso oposto: sem --foil-art nenhum,
  // a arte do anime fica intacta (o foil NEGATIVE invertia e foi removido).
  const foilFilter: Record<string, RegExp> = {
    GOLD: /sepia/,
    INK: /grayscale/,
    PRISM: /^(?!.*(sepia|grayscale|invert|hue-rotate)).*$/,
  };
  // A identidade do foil mora no overlay. Sem esta asserção, um rename errado
  // em FOIL_OVERLAY sai como carta lisa e o teste continua verde.
  const foilOverlay: Record<string, string> = {
    GOLD: "gold-foil-overlay",
    INK: "ink-foil-overlay",
    PRISM: "prism-foil-overlay",
  };
  for (const foil of ["GOLD", "INK", "PRISM"]) {
    test(`arte do foil ${foil} sobrevive à condition`, async ({ page }) => {
      await blockAds(page);
      await mockGeneric(page);
      await loginAs(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.route("**/gacha/collection?**", (route) =>
        route.fulfill({
          json: {
            data: [
              {
                id: "foil-probe",
                condition: 0.9, // POOR: --cond-art é o mais agressivo, usa brightness(.88)
                conditionLabel: "POOR",
                foil,
                edition: 1,
                value: 100,
                obtainedAt: new Date().toISOString(),
                user: { id: "u1", name: "Probe", userName: "probe" },
                card: {
                  id: "c1",
                  name: "Carta Foil",
                  image: "/images/animesice-mascot.svg",
                  imageHidden: false,
                  rarity: "LENDARIA",
                  favourites: 0,
                  animeId: null,
                  animeTitle: null,
                  anime: null,
                },
              },
            ],
            stats: { total: 1, totalValue: 100, medals: [] },
            meta: { total: 1, page: 1, limit: 24, totalPages: 1 },
          },
        }),
      );
      await page.goto("/gacha/cartas");
      const art = page.locator("img.foil-art").first();
      await expect(art).toBeVisible();
      const filter = await art.evaluate((el) => getComputedStyle(el).filter);
      // Ambos precisam compor: filtro do foil E o de condition (POOR).
      expect(filter).toMatch(foilFilter[foil]!);
      expect(filter).toMatch(/brightness\(0\.88\)/);

      // O select precisa ter a opção do foil: value cru pro backend, label legível.
      const select = page.getByLabel("Tipo de foil");
      await expect(select.locator(`option[value="${foil}"]`)).toHaveText(
        foil.charAt(0) + foil.slice(1).toLowerCase(),
      );

      await expect(page.locator(`.${foilOverlay[foil]!}`).first()).toBeVisible();
    });
  }

  test("preview por deep-link fecha com Escape e backdrop", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.goto("/gacha?card=pull-e2e");
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Waifu E2E" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/gacha$/);
    await page.goto("/gacha?card=pull-e2e");
    await page.getByRole("dialog").click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("coleção própria permite destacar carta", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await page.route("**/gacha/collection?**", (route) =>
      route.fulfill({
        json: {
          data: [
            {
              id: "mine",
              condition: 0.04,
              foil: "NORMAL",
              edition: 2,
              value: 100,
              obtainedAt: new Date().toISOString(),
              user: {
                id: "viewer-1",
                name: "Viewer",
                userName: "viewer",
                avatar: null,
              },
              card: {
                id: "c1",
                name: "Minha carta",
                image: null,
                rarity: "RARA",
                favourites: 1,
                animeId: null,
                animeTitle: null,
                anime: null,
              },
            },
          ],
          stats: { total: 1, totalValue: 100 },
          meta: { total: 1, page: 1, limit: 24, totalPages: 1 },
        },
      }),
    );
    await page.goto("/gacha/cartas");
    await expect(
      page.getByRole("button", { name: "Destacar no perfil" }),
    ).toBeVisible();
  });

  test("carta privada não abre preview", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await page.route("**/gacha/cards/private", (route) =>
      route.fulfill({
        status: 404,
        json: { message: "Carta não encontrada." },
      }),
    );
    await page.goto("/gacha?card=private");
    await expect(page.getByText("Carta indisponível ou privada.")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("logado: gira preview e guarda a carta", async ({ page, isMobile }) => {
    if (isMobile) await page.setViewportSize({ width: 320, height: 740 });
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    await page.goto("/gacha");
    await expect(page.getByText("5/5 giros nesta hora")).toBeVisible();
    await expect(page.getByText("Pity ÉPICA+ em 30d")).toBeVisible();
    const spinPreview = {
      id: "spin-e2e-1",
      hour: new Date().toISOString(),
      slot: 0,
      condition: 0.04,
      conditionLabel: "MINT",
      foil: "GOLD",
      value: 9500,
      claimedAt: null,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      pityDue: false,
      card: {
        id: "w-e2e",
        name: "Waifu E2E",
        image: null,
        rarity: "EPICA",
        favourites: 5000,
        animeId: null,
        animeTitle: "Anime E2E",
        anime: null,
      },
    };
    // O mock default de GET /spins retorna []; o spec reflete o giro feito.
    await page.route("**/gacha/spins", (route) =>
      route.fulfill({ json: [spinPreview] }),
    );
    await page.route("**/gacha/spin", (route) =>
      route.fulfill({ json: spinPreview }),
    );
    await page.getByRole("button", { name: /Girar/ }).click();
    const dialog = page.getByRole("dialog");
    // O rebuild do roll stage trocou o callout de raridade pelo rótulo de
    // estágio: a prévia abre com "Prévia revelada" e vira "Sua carta" após
    // guardar. O heading acessível do diálogo segue sendo "Invocação".
    await expect(dialog.getByRole("heading")).toHaveText("Invocação");
    await expect(dialog.locator("[data-invocation-label]")).toHaveText("Prévia revelada");
    await expect(dialog.locator("video")).toHaveCount(0);
    await expect(dialog.locator("[data-name]")).toHaveText("Waifu E2E");
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Previews desta hora (1/5)")).toBeVisible();
    const preview = page.getByRole("button", { name: /Waifu E2E/ });
    const points = preview.getByText("~9500 pts", { exact: true });
    await points.scrollIntoViewIfNeeded();
    await expect(points).toBeInViewport();
    expect(await points.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole("button", { name: "Pegar carta", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Guardar carta?" })).toBeVisible();
    await expect(dialog.getByText("~9500 pts", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Pegar carta", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Invocação" })).toBeVisible();
  });

  test("em lock: aviso anti-frustração e botão de desbloqueio", async ({
    page,
  }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);
    const lockedAt = new Date(Date.now() + 6 * 3600_000).toISOString();
    await page.route("**/gacha/status", (route) =>
      route.fulfill({
        json: {
          canRoll: false,
          rollsLeft: 0,
          nextRollAt: null,
          pityDaysLeft: 30,
          pityDue: false,
          spinsLeft: 5,
          canSpin: true,
          nextSpinAt: null,
          canClaim: false,
          nextClaimAt: lockedAt,
          claimWarning:
            "Você já guardou uma carta. Girar continua liberado.",
          bypassPriceCents: 299,
        },
      }),
    );
    await page.goto("/gacha");
    await expect(
      page.getByText("Você já guardou uma carta. Girar continua liberado."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Girar/ }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /Desbloquear agora/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pegar carta" }),
    ).toBeDisabled();
  });
});
