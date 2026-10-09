// Verifica o cristal vivo do reveal em três instantes do ciclo: selo subindo,
// brilho residual e dissolução. O fundo claro da sonda existe para que uma
// chave de alpha quebrada apareça como quadrado preto na captura manual.
import { expect, test } from "@playwright/test";

test("cristal vivo: o canvas recebe quadro novo do vídeo a cada batida", async ({
  page,
}) => {
  await page.goto("/test-crystal", { waitUntil: "networkidle" });
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();

  // O vídeo é o dono do movimento interno; sem ele o canvas fica parado.
  const avanca = async () =>
    page.evaluate(() => {
      const video = document.querySelector("canvas")?.parentElement?.querySelector("video");
      return video ? video.currentTime : null;
    });

  const t0 = await avanca();
  await expect
    .poll(async () => (await avanca()) !== t0, { timeout: 5000 })
    .toBe(true);

  // Três estados distintos: se fossem iguais, nem o vídeo nem o shader
  // estariam movendo nada.
  const selo = await canvas.screenshot();
  await page.waitForTimeout(1300); // selo no alto
  const residual = await canvas.screenshot();
  await page.waitForTimeout(1100); // dissolvendo
  const dissolvido = await canvas.screenshot();

  expect(Buffer.compare(selo, residual)).not.toBe(0);
  expect(Buffer.compare(residual, dissolvido)).not.toBe(0);

  // Sem WebGL o componente cairia no <video> com mix-blend-screen, que ficaria
  // visível no lugar do canvas.
  const semFallback = await canvas.evaluate((c) => {
    const video = c.parentElement?.querySelector("video");
    return !video || getComputedStyle(video).display === "none";
  });
  expect(semFallback).toBe(true);
});
