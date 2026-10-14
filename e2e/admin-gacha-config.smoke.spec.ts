import { expect, test } from "@playwright/test";

const BASE = "http://localhost:3000";

const CONFIG = [
  { key: "economia.custoRoll", value: 120, label: "Custo do roll", group: "economia" },
  { key: "skins.precoBase", value: 4500, label: "Preço base", group: "skins" },
];

function mockConfig(page: import("@playwright/test").Page, role: string, patches: unknown[] = []) {
  return Promise.all([
    page.context().addCookies([{ name: "role", value: "ADMIN", url: BASE }]),
    page.route("**/user/me", (route) =>
      route.fulfill({
        json: { id: "admin", email: "admin@test.dev", name: "Admin", userName: "admin", role },
      }),
    ),
    page.route("**/gacha/admin/config**", (route) => {
      if (route.request().method() === "PATCH") {
        patches.push(route.request().postDataJSON());
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: CONFIG });
    }),
  ]);
}

test("admin comum lê a config sem botão de editar", async ({ page }) => {
  await mockConfig(page, "ADMIN");
  await page.goto("/admin/gacha/config");
  await expect(page.getByText("só contas superadmin alteram")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
});

test("superadmin edita, valida no card e salva com motivo", async ({ page }) => {
  const patches: unknown[] = [];
  await mockConfig(page, "SUPERADMIN", patches);
  await page.goto("/admin/gacha/config");

  await page.getByRole("button", { name: "Editar" }).first().click();
  const textarea = page.getByRole("textbox", { name: /Custo do roll/ });
  await expect(textarea).toBeFocused();

  // Erro de validação aparece dentro do card, não no topo da página.
  await textarea.fill("{quebrado");
  await page.getByRole("button", { name: "Salvar" }).click();
  const erro = page.getByRole("alert").filter({ hasText: "JSON inválido" });
  await expect(erro).toBeVisible();
  await expect(erro).toBeInViewport();

  // Motivo obrigatório antes de qualquer PATCH.
  await textarea.fill("150");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Motivo obrigatório" })).toBeVisible();
  expect(patches).toHaveLength(0);

  await page.getByLabel("Motivo da alteração (mínimo 10 caracteres — fica no histórico)").fill("ajuste após evento de domingo");
  await page.getByRole("button", { name: "Salvar" }).click();

  // Grupo sensível abre confirmação antes do PATCH.
  const confirmar = page.getByRole("dialog");
  await expect(confirmar).toContainText("assim que você confirmar");
  await page.getByRole("button", { name: "Alterar agora" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "Configuração salva." })).toBeVisible();
  expect(patches).toHaveLength(1);
  expect(patches[0]).toMatchObject({ reason: "ajuste após evento de domingo" });
});

test("chave em edição sobrevive a recarregar pela URL", async ({ page }) => {
  await mockConfig(page, "SUPERADMIN");
  await page.goto("/admin/gacha/config?chave=skins.precoBase");
  await expect(page.getByRole("textbox", { name: /Preço base/ })).toHaveValue("4500");
});

test("no celular o campo de edição ocupa a largura do card", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) > 500, "regra de viewport estreito");
  await mockConfig(page, "SUPERADMIN");
  await page.goto("/admin/gacha/config");
  await page.getByRole("button", { name: "Editar" }).first().click();
  const box = await page.getByRole("textbox", { name: /Custo do roll/ }).boundingBox();
  const card = await page.getByText("economia.custoRoll").locator("xpath=ancestor::div[3]").boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(card!.width - 32);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
});