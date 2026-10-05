import { expect, test, type Page } from "@playwright/test";
import { blockAds } from "./helpers";

/**
 * Contrato de autoria de capas no editor de admin.
 *
 * O bug que estes testes travam: um SVG com `viewBox="0 0 750 1000"` mas com a
 * arte desenhada num canvas de 600x900. O navegador estica 600x900 para
 * preencher a caixa 3/4, entao a previa fica convincente e nada denuncia a
 * faixa vazia -- que so aparece na carta, com o fundo do container vazando.
 *
 * O ficheiro abaixo e o defeito real, reduzido ao essencial: viewBox correto,
 * clipPath e plano de fundo em 600x900, composicao centrada em (300, 450) e
 * moldura interna em x=14 (600 - 28).
 */
const BROKEN_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000" role="img">
<title>Capa de carta — Carmesim Glitch</title>
<defs>
<radialGradient id="cg-bg" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#240510"/><stop offset="1" stop-color="#050107"/></radialGradient>
<clipPath id="cg-clip"><rect width="600" height="900" rx="28"/></clipPath>
</defs>
<g clip-path="url(#cg-clip)">
<rect width="600" height="900" fill="url(#cg-bg)"/>
<circle cx="300" cy="450" r="200" fill="#ff3a62" fill-opacity=".4"/>
</g>
<rect width="600" height="900" fill="#050107" fill-opacity=".5"/>
<rect x="14" y="14" width="572" height="872" rx="20" fill="none" stroke="#d4143a" stroke-width="3"/>
</svg>`;

const CORRECT_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000" role="img">
<title>Capa de carta — Carmesim Glitch</title>
<defs>
<radialGradient id="cg-bg" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#240510"/><stop offset="1" stop-color="#050107"/></radialGradient>
<clipPath id="cg-clip"><rect width="750" height="1000" rx="36"/></clipPath>
</defs>
<g clip-path="url(#cg-clip)">
<rect width="750" height="1000" fill="url(#cg-bg)"/>
<circle cx="375" cy="500" r="250" fill="#ff3a62" fill-opacity=".4"/>
</g>
<rect width="750" height="1000" fill="#050107" fill-opacity=".5"/>
</svg>`;

const VIEWER = { id: "admin-1", name: "Admin", email: "admin@test.dev", role: "ADMIN" };

async function openEditor(page: Page, svg: string) {
  await blockAds(page);
  // O gate de /admin/** le o cookie `role` no middleware e `user/me` no
  // cliente; sem os dois a pagina nem renderiza.
  await page.context().addCookies([{ name: "role", value: "ADMIN", url: "http://localhost:3000" }]);
  await page.route(/\/\/localhost:3001\/(?:api\/)?user\/me$/, route => route.fulfill({ json: VIEWER }));
  await page.route("**/gacha/admin/card-backs", route => route.fulfill({ json: [] }));
  await page.goto("/admin/gacha/capas");
  await page.getByLabel("SVG da capa").fill(svg);
  return page.getByRole("region", { name: "Padrão do cosmético" });
}

test("admin vê a capa de canvas errado reprovada com as faixas medidas", async ({ page }) => {
  const padrao = await openEditor(page, BROKEN_BACK);

  // O viewBox esta correto: a auditoria nao pode acusar o que esta certo.
  await expect(padrao.getByText('viewBox "0 0 750 1000"').first()).toBeVisible();
  await expect(padrao.locator('li[data-level="erro"]')).toHaveCount(2);

  // 600x900 num canvas 750x1000 deixa 150px a direita e 100px embaixo.
  await expect(padrao.getByText(/600x900 num canvas 750x1000/)).toBeVisible();
  await expect(padrao.getByText(/150px/).first()).toBeVisible();
  await expect(padrao.getByText(/100px/).first()).toBeVisible();

  // Corrigir so o viewBox nao resolve: o aspect do plano e 2:3.
  await expect(padrao.getByText(/recorta 11\.1% da arte/).first()).toBeVisible();

  // As guias precisam expor a faixa em vez de esconder a esticadao.
  const outline = page.locator("div.border-signal");
  await expect(outline).toHaveCount(1);
  const box = (await outline.boundingBox())!;
  const frame = (await page.getByRole("img", { name: /Prévia da capa/ }).boundingBox())!;
  // O plano ocupa 80% da largura e 90% da altura da janela 3/4.
  expect(box.width / frame.width).toBeCloseTo(0.8, 2);
  expect(box.height / frame.height).toBeCloseTo(0.9, 2);
});

test("admin vê a capa no padrão aprovada e sem contorno de falha", async ({ page }) => {
  const padrao = await openEditor(page, CORRECT_BACK);

  // Tres regras, nenhuma em erro nem aviso.
  await expect(padrao.locator('li[data-level="erro"], li[data-level="aviso"]')).toHaveCount(0);
  await expect(padrao.getByText(/750x1000 \(3\/4\)/)).toBeVisible();
  await expect(padrao.getByText(/sangra ate a borda da carta/)).toBeVisible();

  // Nada a sinalizar: o contorno do plano some porque ele cobre a janela.
  await expect(page.locator("div.border-signal")).toHaveCount(0);
});

test("trocar o tipo do cosmetico reavalia a auditoria", async ({ page }) => {
  const padrao = await openEditor(page, BROKEN_BACK);
  await expect(padrao.locator('li[data-level="erro"]')).toHaveCount(2);

  // Uma moldura nao tem plano de fundo nem regra de sangria: as regras do
  // verso nao podem vazar para outro tipo.
  await page.locator("select").first().selectOption("FRAME");
  await expect(padrao.getByText(/Plano de fundo/)).toHaveCount(0);
  await expect(padrao.getByText('viewBox "-30 -30 810 1060"').first()).toBeVisible();
});