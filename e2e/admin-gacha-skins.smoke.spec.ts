import { expect, test } from "@playwright/test";

test("admin cria, edita e desativa skin", async ({ page }) => {
  await page.context().addCookies([
    { name: "role", value: "ADMIN", url: "http://localhost:3000" },
  ]);
  const skin = {
    id: "skin-1",
    cardId: null,
    name: "Skin de teste",
    imageUrl: "https://img.test/skin.jpg",
    sourceUrl: null,
    active: true,
    blocked: false,
    rarity: "COMMON",
    createdAt: "2026-10-07T00:00:00.000Z",
    updatedAt: "2026-10-07T00:00:00.000Z",
    card: null,
  };
  let current: typeof skin | null = null;
  await page.route("**/user/me", (route) =>
    route.fulfill({ json: { id: "admin", email: "admin@test.dev", name: "Admin", userName: "admin", role: "ADMIN" } }),
  );
  await page.route("**/gacha/admin/skins**", async (route) => {
    if (route.request().method() === "POST") {
      current = { ...skin, ...route.request().postDataJSON() };
      return route.fulfill({ json: current });
    }
    if (route.request().method() === "PATCH") {
      current = { ...current!, ...route.request().postDataJSON() };
      return route.fulfill({ json: current });
    }
    if (route.request().method() === "DELETE") {
      current = { ...current!, active: false };
      return route.fulfill({ json: current });
    }
    return route.fulfill({ json: { data: current ? [current] : [], meta: { page: 1, limit: 48, total: Number(Boolean(current)), totalPages: 1 } } });
  });

  await page.goto("/admin/gacha/skins");
  await expect(page.getByRole("heading", { name: "Skins de personagens" })).toBeVisible();
  await page.getByLabel("Nome da skin").fill("Skin de teste");
  await page.getByLabel("URL da imagem (HTTPS)").fill("https://img.test/skin.jpg");
  await page.getByRole("button", { name: "Criar skin" }).click();
  await expect(page.getByText("Skin de teste", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nome da skin").fill("Skin atualizada");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Skin atualizada", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Desativar" }).click();
  await expect(page.getByText("Desativada", { exact: true })).toBeVisible();
});
