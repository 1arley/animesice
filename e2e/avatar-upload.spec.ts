import { expect, test } from "@playwright/test";
import path from "node:path";
import { loginAs } from "./helpers";

test("comprime avatar grande e renova a sessao antes de enviar", async ({
  page,
}) => {
  await loginAs(page);

  let uploadAttempts = 0;
  let uploadedBytes = 0;
  await page.route("**/api/user/me/avatar", async (route) => {
    uploadAttempts++;
    if (uploadAttempts === 1) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Unauthorized" }),
      });
      return;
    }

    uploadedBytes = route.request().postDataBuffer()?.byteLength ?? 0;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "viewer-1",
        email: "viewer@test.dev",
        name: "Viewer",
        userName: "viewer",
        avatar: "http://localhost:3001/api/avatars/viewer-1",
        bio: null,
        myAnimeList: null,
        role: "USER",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });
  });
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );

  await page.goto("/settings");
  await page.locator('input[type="file"]').setInputFiles(
    path.join(process.cwd(), "public/aeliana/Aeliana.png"),
  );
  await page.getByRole("button", { name: "Salvar nova foto" }).click();

  await expect(page.getByText("Avatar atualizado com sucesso.")).toBeVisible();
  expect(uploadAttempts).toBe(2);
  expect(uploadedBytes).toBeGreaterThan(0);
  expect(uploadedBytes).toBeLessThan(1024 * 1024 + 1024);
});
