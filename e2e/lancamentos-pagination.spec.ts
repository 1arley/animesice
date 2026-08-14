import { test, expect } from '@playwright/test';
import { blockAds, clickCentered } from './helpers';

/**
 * Paginação do /lancamentos — verificação de regressão no mesmo padrão do
 * /buscar (links de paginação perdiam a query). Aqui o único parâmetro é
 * `page`, usado de forma consistente na leitura e nos links; o teste
 * garante que avançar/voltar mantém os resultados e o contador.
 *
 * O mock-backend devolve 60 animes paginados quando há filtros (status), 
 * então 24 por página → 3 páginas.
 */
test.describe('Lançamentos - paginação', () => {
  test.beforeEach(async ({ page }) => {
    // Desliga animações (BlurText/motion) p/ o elemento de paginação ficar
    // estável ao clique; redes de anúncio bloqueadas + sonda do AdBlockNotice
    // respondida com imagem válida (banner fixo na base não intercepta o
    // clique). Sem o bloqueio, o tag.min.js do Monetag injeta listeners de
    // clique que "engolem" a navegação do Link (flaky).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await blockAds(page);
  });

  test('avança de página mantendo os resultados', async ({ page }) => {
    await page.goto('/lancamentos');

    // Página 1: 24 cards + contador "1 / 3" (formato do componente Pagination)
    await expect(page.locator('a[href^="/animes/e2e-anime-"]')).toHaveCount(24);
    await expect(page.getByText('1 / 3').first()).toBeVisible();

    // Clica em Próxima → página 2 com os cards da segunda metade
    await clickCentered(page.locator('a:has-text("Próxima")'));
    await page.waitForURL('**/lancamentos?page=2');

    await expect(page.locator('a[href="/animes/e2e-anime-25"]').first()).toBeVisible();
    await expect(page.locator('a[href="/animes/e2e-anime-1"]')).toHaveCount(0);
    await expect(page.getByText('2 / 3').first()).toBeVisible();
    await expect(page.locator('a[href^="/animes/e2e-anime-"]')).toHaveCount(24);
  });

  test('navega de volta com Anterior sem perder resultados', async ({ page }) => {
    await page.goto('/lancamentos?page=3');

    await expect(page.getByText('3 / 3').first()).toBeVisible();
    await expect(page.locator('a[href="/animes/e2e-anime-60"]').first()).toBeVisible();

    await clickCentered(page.locator('a:has-text("Anterior")'));
    await page.waitForURL('**/lancamentos?page=2');
    await expect(page.getByText('2 / 3').first()).toBeVisible();
    await expect(page.locator('a[href="/animes/e2e-anime-25"]').first()).toBeVisible();
  });
});
