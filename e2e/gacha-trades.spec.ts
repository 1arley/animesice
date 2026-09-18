import { expect, test } from "@playwright/test";
import { blockAds, mockGeneric, loginAs, VIEWER } from "./helpers";

const A = (path: string) => new RegExp(`//localhost:3001/(?:api/)?${path}`);

const nowIso = () => new Date().toISOString();

const ZOE = { id: "u-zoe", name: "Zoe", userName: "zoe" };

function pull(
  id: string,
  name: string,
  rarity: string,
  foil: string,
  user = VIEWER,
) {
  return {
    id,
    condition: "MINT",
    conditionLabel: "Mint",
    foil,
    edition: 2,
    value: rarity === "GALACTICA" ? 1600 : rarity === "LENDARIA" ? 800 : 120,
    obtainedAt: nowIso(),
    user: { id: user.id, name: user.name, userName: user.userName, avatar: null },
    card: { id: `${id}-card`, name, image: "https://img1.ak.crunchyroll.com/i/spire4-tmb/1.webp", rarity, favourites: 0, animeTitle: "Solo Leveling", animeId: "solo-leveling", animeSlug: null },
  };
}

const MY_A = pull("m-a", "Sung Jin-Woo", "LENDARIA", "GOLD");
const MY_B = pull("m-b", "Cha Hae-In", "COMUM", "NORMAL");
const ZOE_BERU = pull("z-a", "Beru, Rei das Formigas", "GALACTICA", "GOLD", ZOE);
const ZOE_GOJO = pull("z-b", "Satoru Gojo", "EPICA", "HOLO", ZOE);

function trade(
  id: string,
  status: string,
  offeredPull: ReturnType<typeof pull>,
  requestedPull: ReturnType<typeof pull>,
) {
  return {
    id,
    status,
    expiresAt: new Date(Date.now() + 48 * 3600e3).toISOString(),
    createdAt: nowIso(),
    completedAt: null as string | null,
    offeredUserId: offeredPull.user.id,
    requestedUserId: requestedPull.user.id,
    offeredUserCardId: offeredPull.id,
    requestedUserCardId: requestedPull.id,
    offeredUserCard: offeredPull,
    requestedUserCard: requestedPull,
  };
}

test.describe("Gacha trading — fluxo de propostas", () => {
  test("receber, aceitar, recusar e cancelar segregam para o histórico", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);

    const state = {
      trades: [
        trade("t-in1", "PENDING", ZOE_BERU, MY_A),
        trade("t-in2", "PENDING", ZOE_GOJO, MY_B),
        trade("t-out", "PENDING", MY_A, ZOE_BERU),
      ],
    };

    await page.route(A("gacha/trades/mine$"), (r) =>
      r.fulfill({ json: state.trades }),
    );
    await page.route(A("gacha/trades/([^/]+)/(accept|decline|cancel)$"), async (r) => {
      const id = r.request().url().match(/\/gacha\/trades\/([^/]+)\//)?.[1];
      const verb = r.request().url().match(/\/(accept|decline|cancel)$/)?.[1];
      const tr = state.trades.find((t) => t.id === id);
      if (!tr) return r.fulfill({ status: 404, json: { message: "Troca não encontrada." } });
      tr.status = verb === "accept" ? "COMPLETED" : "CANCELLED";
      tr.completedAt = nowIso();
      return r.fulfill({ json: { ...tr } });
    });

    await page.goto("/gacha/trades");

    await expect(page.getByRole("heading", { name: /Recebidas \(2\)/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Enviadas \(1\)/ })).toBeVisible();
    await expect(page.getByText("quer trocar a carta dele pela sua", { exact: false })).toHaveCount(2);

    const incomingText = /quer trocar a carta dele pela sua/;
    const beruRow = page
      .locator("li", { hasText: incomingText })
      .filter({ hasText: "Beru" });
    await expect(beruRow).toBeVisible();
    await beruRow.getByRole("button", { name: "Visualizar Beru, Rei das Formigas" }).click();
    await expect(page.getByRole("dialog", { name: "Beru, Rei das Formigas" })).toBeVisible();
    await page.getByRole("button", { name: "Fechar preview" }).click();
    await beruRow.getByRole("button", { name: "Aceitar" }).click();

    await expect(page.getByRole("heading", { name: /Recebidas \(1\)/ })).toBeVisible();
    await expect(page.getByText("Troca concluída")).toBeVisible();

    const gojoRow = page
      .locator("li", { hasText: incomingText })
      .filter({ hasText: "Satoru Gojo" });
    await gojoRow.getByRole("button", { name: "Recusar" }).click();

    await expect(page.getByRole("heading", { name: /Recebidas \(0\)/ })).toBeVisible();
    await expect(page.getByText("Troca concluída")).toBeVisible();
    await expect(page.getByText("Troca cancelada").first()).toBeVisible();

    const outRow = page.locator("li", { hasText: /Você quer trocar a sua carta/ });
    await outRow.getByRole("button", { name: "Cancelar" }).click();

    await expect(page.getByRole("heading", { name: /Enviadas \(0\)/ })).toBeVisible();
    await expect(page.getByText("Troca cancelada").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Histórico/ })).toBeVisible();
  });
});

test.describe("Gacha trading — composer", () => {
  test("cria proposta e ela aparece em Enviadas", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);

    const state = { trades: [] as ReturnType<typeof trade>[] };

    await page.route(A("gacha/trades/mine$"), (r) =>
      r.fulfill({ json: state.trades }),
    );
    await page.route(A("users/zoe$"), (r) =>
      r.fulfill({ json: { id: ZOE.id, name: ZOE.name, userName: ZOE.userName, avatar: null, bio: null, role: "USER", myAnimeList: null, createdAt: nowIso(), updatedAt: nowIso() } }),
    );
    await page.route(A("gacha/collection(?:\\?|$)"), (r) => {
      const isZoe = r.request().url().includes(`userId=${ZOE.id}`);
      return r.fulfill({
        json: {
          data: isZoe ? [ZOE_BERU] : [MY_A, MY_B],
          meta: { total: isZoe ? 1 : 2, totalPages: 1, page: 1, perPage: 24 },
        },
      });
    });
    await page.route(A("gacha/trades$"), async (r) => {
      if (r.request().method() !== "POST") return r.fulfill({ status: 405, json: { message: "Method not allowed" } });
      const body = r.request().postDataJSON();
      const tr = trade(
        "t-new",
        "PENDING",
        state.trades.length === 0 ? MY_A : MY_B,
        ZOE_BERU,
      );
      state.trades.push(tr);
      return r.fulfill({ status: 201, json: { ...tr } });
    });

    await page.goto("/gacha/trades");
    await page.getByRole("button", { name: "Nova proposta" }).click();
    const dialog = page.getByRole("dialog");
    await page.getByLabel("userName da outra pessoa").fill("zoe");
    await dialog.getByRole("button", { name: "Buscar" }).click();

    const want = page.getByLabel("Carta que você quer");
    await expect(want.locator("option")).toHaveCount(2);
    await want.selectOption("z-a");

    const give = page.getByLabel("Sua carta de oferta");
    await expect(give.locator("option")).toHaveCount(3);
    await give.selectOption("m-a");

    await page.getByRole("button", { name: "Enviar proposta" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("heading", { name: /Enviadas \(1\)/ })).toBeVisible();
    await expect(page.getByText("Beru, Rei das Formigas")).toBeVisible();
  });

  test("erro na criação (409) aparece no modal", async ({ page }) => {
    await blockAds(page);
    await mockGeneric(page);
    await loginAs(page);

    await page.route(A("gacha/trades/mine$"), (r) =>
      r.fulfill({ json: [] }),
    );
    await page.route(A("users/zoe$"), (r) =>
      r.fulfill({ json: { id: ZOE.id, name: ZOE.name, userName: ZOE.userName, avatar: null, bio: null, role: "USER", myAnimeList: null, createdAt: nowIso(), updatedAt: nowIso() } }),
    );
    await page.route(A("gacha/collection(?:\\?|$)"), (r) => {
      const isZoe = r.request().url().includes(`userId=${ZOE.id}`);
      return r.fulfill({
        json: {
          data: isZoe ? [ZOE_BERU] : [MY_A, MY_B],
          meta: { total: isZoe ? 1 : 2, totalPages: 1, page: 1, perPage: 24 },
        },
      });
    });
    await page.route(A("gacha/trades$"), (r) =>
      r.fulfill({ status: 409, json: { message: "Essa carta já está em uma troca ativa." } }),
    );

    await page.goto("/gacha/trades");
    await page.getByRole("button", { name: "Nova proposta" }).click();
    await page.getByLabel("userName da outra pessoa").fill("zoe");
    await page.getByRole("dialog")
      .getByRole("button", { name: "Buscar" })
      .click();

    await page.getByLabel("Carta que você quer").selectOption("z-a");
    const give = page.getByLabel("Sua carta de oferta");
    await expect(give.locator("option")).toHaveCount(3);
    await give.selectOption("m-a");
    await page.getByRole("button", { name: "Enviar proposta" }).click();

    await expect(
      page.getByRole("dialog").getByText(/já está em uma troca ativa/),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
