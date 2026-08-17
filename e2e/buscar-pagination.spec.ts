import { test, expect } from '@playwright/test';
import { blockAds, clickCentered } from './helpers';

/**
 * Paginação do /buscar — regressão: clicar em "Próxima" na página 1/3
 * perdia a busca (links gerados com ?search= mas a página lê ?q=), então
 * a página 2 mostrava 0 resultados / estado vazio.
 *
 * O mock-backend (porta 3001) devolve 60 animes paginados quando ?search=,
 * então 24 por página → 3 páginas.
 */
test.describe('Buscar - paginação', () => {
  test.beforeEach(async ({ page }) => {
    // Desliga animações (BlurText/motion) p/ o elemento de paginação ficar
    // estável ao clique.
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Redes de anúncio bloqueadas (sem banner fixo p/ interceptar o clique).
    // O gate do Monetag está ligado no build de e2e; sem o bloqueio, o
    // tag.min.js injeta listeners de clique que "engolem" a navegação do
    // Link da paginação (flaky).
    await blockAds(page);
  });

  test('avança de página mantendo a busca e os resultados', async ({ page }) => {
    await page.goto('/buscar?q=naruto');

    // Página 1: 24 cards, contador "página 1 de 3"
    await expect(page.locator('a[href^="/animes/e2e-anime-"]')).toHaveCount(24);
    await expect(page.getByText('página 1 de 3')).toBeVisible();

    // Clica em Próxima → deve ir para página 2 mantendo q=naruto
    await clickCentered(page.locator('a:has-text("Próxima")'));
    await page.waitForURL('**/buscar?page=2&q=naruto', { waitUntil: 'commit' });

    // Página 2: primeiro aguarda a árvore anterior sair por completo; depois
    // valida conteúdo e contador no DOM já estabilizado.
    await expect(page.locator('a[href^="/animes/e2e-anime-"]')).toHaveCount(24);
    await expect(page.locator('a[href="/animes/e2e-anime-25"]').first()).toBeVisible();
    await expect(page.locator('a[href="/animes/e2e-anime-1"]')).toHaveCount(0);
    await expect(page.getByText('página 2 de 3').first()).toBeVisible();

    // O input de busca preserva o termo
    await expect(page.locator('input[name="q"]').first()).toHaveValue('naruto');
  });

  test('navega de volta com Anterior sem perder a busca', async ({ page }) => {
    await page.goto('/buscar?q=naruto&page=3');

    await expect(page.getByText('página 3 de 3').first()).toBeVisible();
    await expect(page.locator('a[href="/animes/e2e-anime-60"]').first()).toBeVisible();

    await clickCentered(page.locator('a:has-text("Anterior")'));
    await page.waitForURL('**/buscar?page=2&q=naruto', { waitUntil: 'commit' });
    await expect(page.getByText('página 2 de 3').first()).toBeVisible();
    await expect(page.locator('a[href="/animes/e2e-anime-25"]').first()).toBeVisible();
  });

  test('busca combinada com filtros (gêneros, ano, status) mantém tudo na página 2', async ({ page }) => {
    // q + múltiplos gêneros (array, como o form envia) + ano + status + sort
    await page.goto('/buscar?q=naruto&genres=acao&genres=comedia&year=2024&status=LANCAMENTO&sort=rating');

    // Página 1: resultados + contador + chips de filtros ativos
    await expect(page.locator('a[href^="/animes/e2e-anime-"]')).toHaveCount(24);
    await expect(page.getByText('página 1 de 3').first()).toBeVisible();
    // Chips de filtros ativos (span específico, não a option do select)
    const chips = page.locator('span[class*="border-ice/40"]');
    await expect(chips.filter({ hasText: '"naruto"' })).toBeVisible();
    await expect(chips.filter({ hasText: '2024' })).toBeVisible();
    await expect(chips.filter({ hasText: 'Em lançamento' })).toBeVisible();

    // Checkboxes de gênero mantêm a seleção (vindos da URL como array)
    await expect(page.locator('input[name="genres"][value="acao"]')).toBeChecked();
    await expect(page.locator('input[name="genres"][value="comedia"]')).toBeChecked();
    await expect(page.locator('input[name="genres"][value="drama"]')).not.toBeChecked();

    // Selects preservam ano/status/sort
    await expect(page.locator('select[name="year"]')).toHaveValue('2024');
    await expect(page.locator('select[name="status"]')).toHaveValue('LANCAMENTO');
    await expect(page.locator('select[name="sort"]')).toHaveValue('rating');

    // Próxima → página 2 deve manter TODOS os filtros (q, genres CSV, year, status, sort)
    const next = page.locator('a[href*="/buscar?page=2"]');
    await expect(next).toBeVisible();
    await clickCentered(next);
    await page.waitForURL('**/buscar?page=2&**', { waitUntil: 'commit' });

    // Confere cada filtro individualmente (a vírgula de genres vem codificada %2C)
    const url = new URL(page.url());
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('q')).toBe('naruto');
    expect(url.searchParams.get('genres')).toBe('acao,comedia');
    expect(url.searchParams.get('year')).toBe('2024');
    expect(url.searchParams.get('status')).toBe('LANCAMENTO');
    expect(url.searchParams.get('sort')).toBe('rating');

    // Resultados da página 2 (segunda metade), contador atualizado
    await expect(page.getByText('página 2 de 3').first()).toBeVisible();
    await expect(page.locator('a[href="/animes/e2e-anime-25"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/animes/e2e-anime-"]')).toHaveCount(24);

    // Filtros continuam ativos na página 2: chips, checkboxes e selects
    const chips2 = page.locator('span[class*="border-ice/40"]');
    await expect(chips2.filter({ hasText: '"naruto"' })).toBeVisible();
    await expect(chips2.filter({ hasText: '2024' })).toBeVisible();
    await expect(chips2.filter({ hasText: 'Em lançamento' })).toBeVisible();
    await expect(page.locator('input[name="genres"][value="acao"]')).toBeChecked();
    await expect(page.locator('input[name="genres"][value="comedia"]')).toBeChecked();
    await expect(page.locator('select[name="year"]')).toHaveValue('2024');
    await expect(page.locator('select[name="status"]')).toHaveValue('LANCAMENTO');
    await expect(page.locator('select[name="sort"]')).toHaveValue('rating');
    await expect(page.locator('input[name="q"]').first()).toHaveValue('naruto');
  });
});
