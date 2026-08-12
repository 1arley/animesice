import { test, expect } from '@playwright/test';

const userId = 'test-user-1';
// O mock do perfil tem userName próprio — a página /users deve
// canonicalizar a URL (id → userName), como uma rede social.
const canonicalUserName = 'testuser';

test.describe('Public profile - report & tabs', () => {
  test('loads tabs, paginates activity and submits report from the actions menu', async ({ page }) => {
    // Bloqueia redes de anúncio: iframes de ads podem interceptar cliques
    // ("<div></div> intercepts pointer events") e tornar o teste flaky.
    const AD_PATTERNS = [
      '**/pagead2.googlesyndication.com/**',
      '**/*.doubleclick.net/**',
      '**/adsbygoogle.js',
      '**/fundingchoicesmessages.google.com/**',
      '**/al5sm.com/**',
      '**/my.rtmark.net/**',
      '**/255md.com/**',
      '**/ep1.adtrafficquality.google/**',
      '**/ep2.adtrafficquality.google/**',
      '**/static.cloudflareinsights.com/**',
    ];
    for (const pattern of AD_PATTERNS) {
      await page.route(pattern, (route) => route.abort());
    }

    // Mock other backend calls the app may make server-side. Registrados ANTES
    // dos mocks de /users: o Playwright dá precedência ao último handler que
    // casa, então os específicos (registrados depois) vencem os genéricos.
    for (const p of ['**/anime*', '**/episode/latest*', '**/anime/trending*', '**/anime/recently-added*']) {
      await page.route(p, async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });
    }

    // Profile: /perfil/:id redireciona (server-side) para /users/:id e a
    // página /users canonicaliza para /users/:userName.
    // Os mocks escopam ao backend (porta 3001) — nunca à navegação do Next (3000).
    const usersApi = (path: string) =>
      new RegExp(`//localhost:3001/(?:api/)?${path}$`);
    await page.route(usersApi('users/[^/]+'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: userId,
          name: 'Test User',
          userName: canonicalUserName,
          avatar: null,
          bio: 'Bio here',
          myAnimeList: null,
          createdAt: new Date().toISOString(),
          _count: { comments: 1, ratings: 1, favorites: 1, watchHistories: 1 }
        })
      });
    });

    // Visão geral: coleção (anime-list) usada por "Agora assistindo" e "Gosto".
    await page.route(usersApi('users/[^/]+/anime-list\\?page=1&limit=100'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            userId,
            animeId: 'a-watch',
            status: 'WATCHING',
            episodesWatched: 7,
            score: null,
            rewatchCount: 0,
            private: false,
            startedAt: null,
            completedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            anime: { id: 'a-watch', slug: 'watching-anime', title: 'Watching Anime', coverImage: null, year: null, format: 'TV', genres: [{ id: 'g1', slug: 'acao', name: 'Ação' }], episodeCount: 12 }
          }],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 }
        })
      });
    });

    // Atividade: 20 eventos para o "Carregar mais" aparecer (2 comentários).
    const events = Array.from({ length: 20 }, (_, i) => ({
      type: 'comment',
      id: 'c' + (i + 1),
      content: i === 0 ? 'hello' : 'comment ' + (i + 1),
      edited: false,
      likeCount: 0,
      anime: { slug: 'anime-1', title: 'Anime 1' },
      createdAt: new Date().toISOString(),
    }));
    await page.route(usersApi('users/[^/]+/activity\\?page=1&limit=8'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: events.slice(0, 8), meta: { total: 21, page: 1, limit: 8, totalPages: 3 } })
      });
    });
    await page.route(usersApi('users/[^/]+/activity\\?page=1&limit=24'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: events, meta: { total: 25, page: 1, limit: 24, totalPages: 2 } })
      });
    });
    await page.route(usersApi('users/[^/]+/activity\\?page=2&limit=24'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ type: 'comment', id: 'c21', content: 'more', edited: false, likeCount: 0, anime: { slug: 'anime-1', title: 'Anime 1' }, createdAt: new Date().toISOString() }],
          meta: { total: 25, page: 2, limit: 24, totalPages: 2 }
        })
      });
    });

    // Ratings (overview usa limit=4; a tab Notas usa limit=24)
    await page.route(usersApi('users/[^/]+/ratings\\?page=1&limit=4'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ anime: { id: 'a1', slug: 'anime-1', title: 'Anime 1', coverImage: null }, score: 8, createdAt: new Date().toISOString() }],
          meta: { total: 1, page: 1, limit: 4, totalPages: 1 }
        })
      });
    });
    await page.route(usersApi('users/[^/]+/ratings\\?page=1&limit=24'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ anime: { id: 'a1', slug: 'anime-1', title: 'Anime 1', coverImage: null }, score: 8, createdAt: new Date().toISOString() }],
          meta: { total: 1, page: 1, limit: 24, totalPages: 1 }
        })
      });
    });

    // Favorites (overview usa limit=12; a tab Favoritos usa limit=24)
    const favItem = {
      createdAt: new Date().toISOString(),
      anime: { id: 'f1', slug: 'fav-1', title: 'Fav 1', coverImage: null, year: null, format: 'TV' }
    };
    await page.route(usersApi('users/[^/]+/favorites\\?page=1&limit=12'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [favItem], meta: { total: 1, page: 1, limit: 12, totalPages: 1 } })
      });
    });
    await page.route(usersApi('users/[^/]+/favorites\\?page=1&limit=24'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [favItem], meta: { total: 1, page: 1, limit: 24, totalPages: 1 } })
      });
    });

    // Sessão simulada: o modal de denúncia exige login (useAuth checa o
    // cookie `role` e /user/me). Sem isso, o formulário não aparece.
    await page.context().addCookies([
      { name: 'role', value: 'USER', url: 'http://localhost:3000' },
    ]);
    await page.route(usersApi('user/me'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'viewer-1',
          email: 'viewer@test.dev',
          name: 'Viewer',
          userName: 'viewer',
          avatar: null,
          bio: null,
          myAnimeList: null,
          role: 'USER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      });
    });

    // Capture report POST
    let reportPayload: any = null;
    await page.route(usersApi('report'), async route => {
      const req = route.request();
      reportPayload = await req.postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'rpt1', ...reportPayload }) });
    });

    // Rota legada redireciona para o novo sistema de perfis.
    await page.goto(`/perfil/${userId}`);
    await page.waitForURL(`**/users/${canonicalUserName}`);

    // Wait for overview (either bio or name)
    try {
      await page.waitForFunction(() => document.body.innerText.includes('Bio here') || document.body.innerText.includes('Test User'), null, { timeout: 15000 });
    } catch (e) {
      // dump HTML and screenshot for debugging
      const html = await page.content();
      const fs = require('fs');
      try { fs.writeFileSync('/tmp/profile_page_debug.html', html); } catch {}
      try { await page.screenshot({ path: '/tmp/profile_page_debug.png', fullPage: true }); } catch {}
      throw e;
    }

    // Visão geral mostra "Agora assistindo" com progresso real
    await expect(page.locator('text=Watching Anime')).toBeVisible();
    await expect(page.locator('text=Episódio 7 de 12')).toBeVisible();

    // Atividade tab: comentários com like preservado + load more
    await page.click('button:has-text("Atividade")');
    await expect(page.locator('text=hello')).toBeVisible();
    await page.click('button:has-text("Carregar mais")');
    await expect(page.locator('text=more')).toBeVisible();

    // Notas tab (shape: { score, createdAt, anime })
    await page.click('button:has-text("Notas")');
    await expect(page.locator('text=Anime 1')).toBeVisible();

    // Favoritos tab (shape: { createdAt, anime })
    await page.click('button:has-text("Favoritos")');
    await expect(page.locator('text=Fav 1')).toBeVisible();
    await expect(page.locator('a[href="/animes/fav-1"]')).toBeVisible();

    // Denúncia agora vive no menu de ações (⋯), não competindo com a identidade.
    await page.click('button[aria-label="Mais ações"]');
    await page.click('button:has-text("Denunciar usuário")');
    await expect(
      page.getByRole('heading', { name: 'Denunciar usuário' }),
    ).toBeVisible();

    // Select reason and fill notes
    await page.selectOption('select', 'SPAM');
    await page.fill('textarea', 'Reason details');

    // Submit report
    await page.click('button:has-text("Enviar denúncia")');

    // Ensure report POST was called with expected payload
    await expect.poll(() => reportPayload).not.toBeNull();
    expect(reportPayload.targetType).toBe('USER');
    expect(reportPayload.targetId).toBe(userId);
    expect(reportPayload.reason).toBe('SPAM');
    expect(reportPayload.notes).toBe('Reason details');
  });
});
