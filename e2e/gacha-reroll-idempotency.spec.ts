import { expect, test, type Page } from "@playwright/test";
import { blockAds, loginAs, VIEWER } from "./helpers";

const card = {
  id: "owned-reroll",
  condition: 0.45,
  conditionLabel: "PLAYED",
  foil: "NORMAL",
  edition: 1,
  value: 100,
  obtainedAt: "2026-09-11T00:00:00Z",
  user: VIEWER,
  card: {
    id: "card-reroll",
    name: "Carta do reroll",
    rarity: "RARA",
    image: null,
    favourites: 0,
    animeId: null,
    animeTitle: null,
  },
};

const rerollResult = {
  ...card,
  condition: 0.25,
  conditionLabel: "EX",
  foil: "HOLO",
  value: 150,
};

const otherCard = {
  ...card,
  id: "owned-reroll-b",
  card: { ...card.card, id: "card-reroll-b", name: "Outra carta" },
};

async function mockReroll(page: Page, collectionCards = [card]) {
  await blockAds(page);
  await loginAs(page);
  await page.route("**/gacha/status", (route) =>
    route.fulfill({ json: { canSpin: true, spinsLeft: 5, spinResets: 0 } }),
  );
  await page.route("**/gacha/spins", (route) => route.fulfill({ json: [] }));
  await page.route("**/gacha/recent?**", (route) =>
    route.fulfill({ json: [card] }),
  );
  await page.route("**/gacha/ranking?**", (route) =>
    route.fulfill({ json: [] }),
  );
  let transferred = false;
  await page.route("**/gacha/collection?**", (route) => {
    const data = transferred
      ? collectionCards.filter((item) => item.id !== card.id)
      : collectionCards;
    return route.fulfill({
      json: {
        data,
        stats: { total: data.length, totalValue: data.length * card.value },
        meta: {
          total: data.length,
          page: 1,
          limit: 24,
          totalPages: data.length ? 1 : 0,
        },
      },
    });
  });
  await page.route("**/gacha/economy", (route) =>
    route.fulfill({
      json: {
        balance: 1000,
        available: 1000,
        reserved: 0,
        protecao: 0,
        spinResets: 0,
        itemConfig: {
          card_floors: { RARA: 1000 },
          reroll_cost_pct: 0.15,
          reroll_protection_mint_block: true,
        },
      },
    }),
  );
  await page.route("**/gacha/collections/progress", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/gacha/engagement-pilot", (route) =>
    route.fulfill({ json: { enabled: false, percent: 0 } }),
  );
  await page.route("**/gacha/featured", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/gacha/cards/owned-reroll", (route) =>
    route.fulfill({ json: card }),
  );

  const requests: Array<Record<string, unknown>> = [];
  let rerollCalls = 0;
  await page.route("**/gacha/reroll", (route) => {
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    rerollCalls += 1;
    return rerollCalls === 1
      ? route.fulfill({ status: 503, json: { message: "Resposta incerta." } })
      : route.fulfill({ status: 201, json: rerollResult });
  });

  let ownershipChecks = 0;
  await page.route("**/gacha/collection/owned-reroll", (route) => {
    ownershipChecks += 1;
    if (ownershipChecks === 1)
      return route.fulfill({
        status: 503,
        json: { message: "Falha temporária." },
      });
    transferred = true;
    return route.fulfill({ json: { card: null } });
  });
  return requests;
}

for (const surface of ["home", "collection"] as const) {
  test(`${surface} repete o mesmo reroll e fecha preview quando a carta foi transferida`, async ({
    page,
  }) => {
    const requests = await mockReroll(page);
    await page.goto(
      surface === "home" ? "/gacha?card=owned-reroll" : "/gacha/cartas",
    );

    if (surface === "collection") {
      await page.getByRole("button", { name: /Carta do reroll/ }).click();
    }

    await expect(page.getByRole("dialog").first()).toBeVisible();
    await page
      .getByRole("button", { name: /Rerrollar condition\/foil/ })
      .click();
    await page
      .getByRole("dialog", { name: "Rerrollar carta?" })
      .getByRole("button", { name: "Rerrollar", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Repetir operação anterior" })
      .click();
    await expect(page.getByText(/não foi possível sincronizar/)).toBeVisible();
    await page
      .getByRole("button", { name: "Repetir operação anterior" })
      .click();
    const key = `animesice:gacha-reroll-uncertain:${VIEWER.id}:${card.id}`;
    const saved = await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey),
      key,
    );
    expect(saved).toBeNull();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    if (surface === "collection") {
      await expect(
        page.getByRole("button", { name: /Carta do reroll/ }),
      ).toHaveCount(0);
    }
    expect(requests).toHaveLength(3);
    expect(requests[1]).toEqual(requests[0]);
    expect(requests[2]).toEqual(requests[0]);
    expect(requests.map((body) => body.useProtection)).toEqual([
      false,
      false,
      false,
    ]);
  });
}

test("reconciliação atrasada não substitui o preview aberto depois", async ({
  page,
}) => {
  await mockReroll(page, [card, otherCard]);
  const key = `animesice:gacha-reroll-uncertain:${VIEWER.id}:${card.id}`;
  const pendingOperation = JSON.stringify({
    operationId: "b34789b1-4da7-47bd-b72a-930109c38a54",
    useProtection: false,
  });
  await page.addInitScript(
    ({ storageKey, value }) => localStorage.setItem(storageKey, value),
    { storageKey: key, value: pendingOperation },
  );

  let releaseOwnership!: () => void;
  let ownershipStarted!: () => void;
  const waitingForOwnership = new Promise<void>((resolve) => {
    releaseOwnership = resolve;
  });
  const ownershipRequest = new Promise<void>((resolve) => {
    ownershipStarted = resolve;
  });
  await page.route("**/gacha/collection/owned-reroll", async (route) => {
    ownershipStarted();
    await waitingForOwnership;
    await route.fulfill({ json: { card } });
  });

  await page.goto("/gacha/cartas");
  await page.getByRole("button", { name: /Carta do reroll/ }).click();
  await page.getByRole("button", { name: "Atualizar carta e saldo" }).click();
  await ownershipRequest;
  await page.getByRole("button", { name: "Fechar preview" }).click();
  await page.getByRole("button", { name: /Outra carta/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Outra carta");

  releaseOwnership();
  await expect(page.getByRole("dialog")).toContainText("Outra carta");
  expect(
    await page.evaluate((storageKey) => localStorage.getItem(storageKey), key),
  ).toBe(pendingOperation);
});
