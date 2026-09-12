import { test, expect } from "@playwright/test";
import { blockAds, loginAs, VIEWER } from "./helpers";

const card = {
  id: "owned-a", condition: 0.04, foil: "NORMAL", edition: 1, value: 100,
  obtainedAt: "2026-09-11T00:00:00Z", user: VIEWER,
  card: { id: "card-a", name: "Carta A", rarity: "RARA", image: null,
    favourites: 1, animeId: "anime-a", animeTitle: "Anime A", anime: { slug: "anime-a" } },
};
const spin = { ...card, createdAt: card.obtainedAt, claimedAt: null, slot: 0 };
const meta = { page: 1, limit: 50, total: 1, totalPages: 1 };

test.beforeEach(async ({ page }) => {
  await blockAds(page);
  await loginAs(page);
});

for (const unlock of ["clock", "alreadyUnlocked", "unlocked"]) {
  test(`claim libera por ${unlock}`, async ({ page }) => {
    const now = new Date("2026-09-11T00:00:00Z");
    await page.clock.install({ time: now });
    let unlocked = false;
    await page.route("**/gacha/status", route => route.fulfill({ json: {
      spinsLeft: 4, canSpin: true, nextSpinAt: null, pityDaysLeft: 30,
      canClaim: unlocked, nextClaimAt: unlocked ? null : new Date(+now + 12 * 3600_000).toISOString(),
      claimWarning: unlocked ? null : "Aguarde o fim do bloqueio.", bypassPriceCents: unlocked ? null : 299,
    } }));
    await page.route("**/gacha/spins", route => route.fulfill({ json: [spin] }));
    await page.route("**/gacha/bypass", route => {
      unlocked = true;
      return route.fulfill({ json: { [unlock]: true } });
    });
    await page.goto("/gacha");
    const claim = page.getByRole("button", { name: "Pegar carta" });
    await expect(claim).toBeDisabled();
    await expect(page.getByText("Previews desta hora (1/5)")).toBeVisible();
    if (unlock === "clock") {
      unlocked = true;
      await page.clock.fastForward(12 * 3600_000 + 3000);
    } else {
      await page.getByRole("button", { name: /Desbloquear agora/ }).click();
    }
    await expect(claim).toBeEnabled();
    expect(page.context().pages()).toHaveLength(1);
  });
}

test("preview e coleção não aninham controles interativos", async ({ page }) => {
  await page.route("**/gacha/recent?**", route => route.fulfill({ json: [card] }));
  await page.route("**/gacha/spins", route => route.fulfill({ json: [spin] }));
  await page.route("**/gacha/collection?**", route => route.fulfill({ json: {
    data: [card], meta, stats: { total: 1, totalValue: 100 },
  } }));
  await page.route("**/gacha/cards/owned-a", route => route.fulfill({ json: card }));
  await page.goto("/gacha");
  const preview = page.locator('a[href="/gacha?card=owned-a"]');
  await expect(preview).toBeVisible();
  await expect(preview.locator("a")).toHaveCount(0);
  await expect(page.locator("button a")).toHaveCount(0);
  await preview.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/gacha/collection");
  const owned = page.getByRole("button", { name: /Carta A/ });
  await expect(owned).toBeVisible();
  await expect(owned.locator("a")).toHaveCount(0);
  await owned.click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("admin descarta cartas e respostas da seleção anterior", async ({ page }) => {
  await page.route("**/user/me", route => route.fulfill({ json: { ...VIEWER, role: "ADMIN" } }));
  await page.route("**/admin/users?**", route => route.fulfill({ json: {
    data: [{ id: "a", userName: "Usuario A" }, { id: "b", userName: "Usuario B" }], meta,
  } }));
  await page.route("**/gacha/admin/cards?**", route => route.fulfill({ json: { data: [], meta } }));
  let release!: () => void;
  let requested!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { requested = resolve; });
  await page.route("**/gacha/admin/users/a/cards?**", route => route.fulfill({ json: { data: [card], meta } }));
  await page.route("**/gacha/admin/users/b/cards?**", async route => {
    requested();
    await pending;
    await route.fulfill({ json: { data: [{ ...card, id: "owned-b", card: { ...card.card, name: "Carta B" } }], meta } });
  });
  await page.goto("/admin/gacha");
  await page.getByPlaceholder("Buscar usuário").fill("Usuario");
  await page.getByRole("button", { name: "Usuario A", exact: true }).click();
  await expect(page.getByText("Carta A · RARA")).toBeVisible();
  await page.getByRole("button", { name: "Usuario B", exact: true }).click();
  await started;
  await expect(page.getByRole("button", { name: "Excluir", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Usuario A", exact: true }).click();
  await expect(page.getByText("Carta A · RARA")).toBeVisible();
  const response = page.waitForResponse(url => url.url().includes("/users/b/cards"));
  release();
  await response;
  await expect(page.getByText("Carta B · RARA")).toHaveCount(0);
  await expect(page.getByText("Carta A · RARA")).toBeVisible();
});

for (const staleFails of [false, true]) {
  test(`coleção ignora resposta antiga ${staleFails ? "com erro" : "com cartas"}`, async ({ page }) => {
    let release!: () => void;
    let requested!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { requested = resolve; });
    await page.route("**/gacha/collection?**", async route => {
      const rarity = new URL(route.request().url()).searchParams.get("rarity");
      if (rarity === "COMUM") {
        requested();
        await pending;
        if (staleFails) return route.fulfill({ status: 500, json: { message: "Erro antigo" } });
      }
      return route.fulfill({ json: {
        data: [{ ...card, card: { ...card.card, name: rarity || "Inicial" } }],
        meta: { ...meta, totalPages: rarity === "COMUM" ? 2 : 1 },
      } });
    });
    await page.goto("/gacha/collection");
    await expect(page.getByRole("button", { name: /Inicial/ })).toBeVisible();
    await page.getByLabel("Raridade", { exact: true }).selectOption("COMUM");
    await started;
    await page.getByLabel("Raridade", { exact: true }).selectOption("RARA");
    await expect(page.getByRole("button", { name: /RARA/ }).first()).toBeVisible();
    const response = page.waitForResponse(r => new URL(r.url()).searchParams.get("rarity") === "COMUM");
    release();
    await (await response).finished();
    // Let the obsolete fetch continuation commit if it has not been invalidated.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /COMUM/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Próxima", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Raridade", { exact: true })).toHaveValue("RARA");
  });
}

test("destacar carta mostra erro e permite tentar novamente", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/gacha/collection?**", route => route.fulfill({ json: { data: [card], meta } }));
  let attempts = 0;
  await page.route("**/gacha/featured", route => {
    if (route.request().method() === "GET") return route.fulfill({ json: null });
    return ++attempts === 1
      ? route.fulfill({ status: 500, json: { message: "Falha no destaque" } })
      : route.fulfill({ json: card });
  });
  await page.goto("/gacha/collection");
  const feature = page.getByRole("button", { name: "Destacar no perfil" });
  await feature.click();
  await expect(page.locator('p[role="alert"]')).toContainText("Não foi possível destacar a carta.");
  await feature.click();
  await expect(page.getByRole("button", { name: "Em destaque" })).toBeDisabled();
  await expect(page.locator('p[role="alert"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("virada da hora remove previews mesmo com giros restantes", async ({ page }) => {
  const now = new Date("2026-09-11T00:59:50Z");
  const expiresAt = "2026-09-11T01:00:00Z";
  await page.clock.install({ time: now });
  let expired = false;
  await page.route("**/gacha/status", route => route.fulfill({ json: {
    spinsLeft: expired ? 5 : 4, canSpin: true, nextSpinAt: null,
    canClaim: true, nextClaimAt: null, pityDaysLeft: 30,
  } }));
  await page.route("**/gacha/spins", route => route.fulfill({ json: expired ? [] : [{ ...spin, expiresAt }] }));
  await page.goto("/gacha");
  const claim = page.getByRole("button", { name: "Pegar carta" });
  await expect(claim).toBeEnabled();
  expired = true;
  await page.clock.fastForward(10_000);
  await expect(claim).toBeDisabled();
  await page.clock.fastForward(3000);
  await expect(page.getByRole("button", { name: "Girar (5)", exact: true })).toBeEnabled();
  await expect(page.getByText("Previews desta hora (1/5)")).toHaveCount(0);
});

test("checkout Pix oferece link mesmo quando popups são bloqueados", async ({ page }) => {
  await page.addInitScript(() => { window.open = () => null; });
  await page.clock.install();
  let paid = false;
  await page.route("**/gacha/status", route => route.fulfill({ json: {
    spinsLeft: 4, canSpin: true, nextSpinAt: null,
    canClaim: paid, nextClaimAt: null,
    claimWarning: paid ? null : "Aguarde o fim do bloqueio.",
    bypassPriceCents: paid ? null : 299,
  } }));
  await page.route("**/gacha/spins", route => route.fulfill({ json: [spin] }));
  await page.route("**/gacha/bypass", route => route.fulfill({ json: {
    reference: "checkout-test", checkoutUrl: "https://livepix.gg/checkout-test", amountCents: 299,
  } }));
  await page.route("**/gacha/bypass/checkout-test", route => route.fulfill({ json: { status: paid ? "PAID" : "PENDING" } }));
  await page.goto("/gacha");
  await page.getByRole("button", { name: /Desbloquear agora/ }).click();
  const checkout = page.getByRole("link", { name: "Abrir checkout Pix" });
  await expect(checkout).toHaveAttribute("href", "https://livepix.gg/checkout-test");
  await expect(checkout).toHaveAttribute("target", "_blank");
  paid = true;
  await page.clock.fastForward(3000);
  await expect(page.getByRole("button", { name: "Pegar carta" })).toBeEnabled();
  await expect(checkout).toHaveCount(0);
});
