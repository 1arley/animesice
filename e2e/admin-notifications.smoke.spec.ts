import { expect, test } from "@playwright/test";
import { blockAds } from "./helpers";

const BASE = "http://localhost:3000";
const now = new Date().toISOString();

const CAMPAIGN = {
  id: "campaign-1",
  adminId: "admin-1",
  admin: { id: "admin-1", name: "Admin", userName: "admin" },
  category: "THANKS",
  audience: "SINGLE",
  title: "Obrigado pelo feedback",
  body: "Sua sugestão entrou no roadmap.",
  linkUrl: "/feedbacks",
  recipientCount: 1,
  createdAt: now,
};

const RECIPIENT = {
  id: "user-1",
  name: "Viewer",
  userName: "viewer",
  avatar: null,
  role: "USER",
};

async function mockAdmin(page: import("@playwright/test").Page) {
  await blockAds(page);
  await page.context().addCookies([{ name: "role", value: "ADMIN", url: BASE }]);
  await page.route("**/user/me", (route) =>
    route.fulfill({
      json: {
        id: "admin-1",
        email: "admin@test.dev",
        name: "Admin",
        userName: "admin",
        role: "ADMIN",
      },
    }),
  );
  await page.route("**/admin/notification/audience", (route) =>
    route.fulfill({ json: { count: 1234 } }),
  );
  await page.route("**/admin/notification/recipients**", (route) =>
    route.fulfill({
      json: {
        data: [RECIPIENT],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    }),
  );
  await page.route("**/admin/notification/history**", (route) =>
    route.fulfill({
      json: {
        data: [CAMPAIGN],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      },
    }),
  );
  await page.route("**/admin/notification/campaign-1**", (route) =>
    route.fulfill({
      json: {
        ...CAMPAIGN,
        recipients: {
          data: [{ id: "notif-1", read: false, createdAt: now, user: RECIPIENT }],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        },
      },
    }),
  );
}

test("envia agradecimento individual com categoria e destinatário", async ({
  page,
}) => {
  await mockAdmin(page);
  const payloads: Array<Record<string, unknown>> = [];
  await page.route("**/admin/notification/send", (route) => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({
      json: { ...CAMPAIGN, recipientCount: 1, duplicate: false },
    });
  });

  await page.goto("/admin/notificacoes");

  await page.getByLabel("Título").fill("Obrigado pelo feedback");
  await page.getByLabel("Mensagem").fill("Sua sugestão entrou no roadmap.");
  await page.getByLabel("Link interno (opcional)").fill("/feedbacks");

  await page.getByLabel("Buscar jogador").fill("viewer");
  await page.getByRole("button", { name: /Viewer/ }).click();
  await expect(
    page.getByRole("button", {
      name: "Remover Viewer dos destinatários",
    }),
  ).toBeVisible();

  await expect(page.getByText("Prévia")).toBeVisible();
  await page.getByRole("button", { name: "Enviar para 1 jogador" }).click();

  await expect(
    page.getByText("Comunicado entregue a 1 jogador."),
  ).toBeVisible();
  expect(payloads).toHaveLength(1);
  expect(payloads[0]).toMatchObject({
    audience: "SINGLE",
    userIds: ["user-1"],
    category: "THANKS",
    title: "Obrigado pelo feedback",
    body: "Sua sugestão entrou no roadmap.",
    linkUrl: "/feedbacks",
  });
  expect(payloads[0].dedupeKey).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test("envio global exige confirmação com a contagem de jogadores", async ({
  page,
}) => {
  await mockAdmin(page);
  const payloads: Array<Record<string, unknown>> = [];
  await page.route("**/admin/notification/send", (route) => {
    payloads.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        ...CAMPAIGN,
        audience: "GLOBAL",
        recipientCount: 1234,
        duplicate: false,
      },
    });
  });

  await page.goto("/admin/notificacoes");

  await page.getByRole("button", { name: /Todos/ }).click();
  await page.getByLabel("Título").fill("Manutenção programada");
  await page.getByLabel("Mensagem").fill("O site ficará fora do ar por 1 hora.");

  await page
    .getByRole("button", { name: "Enviar para toda a comunidade" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("1234 jogadores");
  expect(payloads).toHaveLength(0);

  await page.getByRole("button", { name: "Confirmar e enviar" }).click();

  await expect(
    page.getByText("Comunicado entregue a 1234 jogadores."),
  ).toBeVisible();
  expect(payloads).toHaveLength(1);
  expect(payloads[0]).toMatchObject({
    audience: "GLOBAL",
    confirmGlobal: true,
    category: "THANKS",
  });
  expect(payloads[0].userIds).toBeUndefined();
});

test("histórico mostra o envio e os destinatários no detalhe", async ({
  page,
}) => {
  await mockAdmin(page);
  await page.goto("/admin/notificacoes");

  await page.getByRole("button", { name: "Histórico" }).click();
  await expect(page.getByText("Obrigado pelo feedback")).toBeVisible();
  await expect(page.getByText("1 destinatário")).toBeVisible();

  await page
    .getByRole("button", { name: /Ver detalhes do comunicado/ })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Sua sugestão entrou no roadmap.");
  await expect(dialog).toContainText("@viewer");
  await expect(dialog).toContainText("Não lida");
});
