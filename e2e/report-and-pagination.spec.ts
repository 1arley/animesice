import { test, expect } from '@playwright/test';

const userId = 'test-user-1';
// O mock do perfil tem userName próprio — a página /users deve
// canonicalizar a URL (id → userName), como uma rede social.
const canonicalUserName = 'testuser';

test.describe('Public profile - report & pagination', () => {
  test('loads tabs, paginates comments and submits report', async ({ page }) => {
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
          createdAt: new Date().toISOString(),
          _count: { comments: 3, ratings: 2, favorites: 3, watchHistories: 1 }
        })
      });
    });

    // Comments page 1: 20 itens para o "Carregar mais" aparecer.
    const page1 = Array.from({ length: 20 }, (_, i) => ({
      id: 'c' + (i + 1),
      content: i === 0 ? 'hello' : 'comment ' + (i + 1),
      createdAt: new Date().toISOString(),
      userId: 'u' + (i + 1),
      user: { id: 'u' + (i + 1), name: 'User ' + (i + 1), userName: 'user' + (i + 1), avatar: null },
      _count: { likes: 0, replies: 0 }
    }));
    await page.route(usersApi('users/[^/]+/comments\\?page=1&limit=20'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: page1, meta: { total: 21, page: 1, limit: 20, totalPages: 2 } })
      });
    });
    await page.route(usersApi('users/[^/]+/comments\\?page=2&limit=20'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ id: 'c21', content: 'more', createdAt: new Date().toISOString(), userId: 'u21', user: { id: 'u21', name: 'User 21', userName: 'user21', avatar: null }, _count: { likes: 0, replies: 0 } }],
          meta: { total: 21, page: 2, limit: 20, totalPages: 2 }
        })
      });
    });

    // Ratings
    await page.route(usersApi('users/[^/]+/ratings\\?page=1&limit=20'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{ anime: { id: 'a1', slug: 'anime-1', title: 'Anime 1', coverImage: null }, score: 8, createdAt: new Date().toISOString() }],
          meta: { total: 1, page: 1, limit: 20, totalPages: 1 }
        })
      });
    });

    // Favorites (shape: registro do favorito + anime pai)
    await page.route(usersApi('users/[^/]+/favorites\\?page=1&limit=24'), async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            createdAt: new Date().toISOString(),
            anime: { id: 'f1', slug: 'fav-1', title: 'Fav 1', coverImage: null }
          }],
          meta: { total: 1, page: 1, limit: 24, totalPages: 1 }
        })
      });
    });

    // Mock other backend calls the app may make server-side
    for (const p of ['**/anime*', '**/episode/latest*', '**/anime/trending*', '**/anime/recently-added*']) {
      await page.route(p, async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });
    }

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

    // Open comments tab
    await page.click('button:has-text("Comentários")');
    await expect(page.locator('text=hello')).toBeVisible();

    // Load more comments
    await page.click('button:has-text("Carregar mais")');
    await expect(page.locator('text=more')).toBeVisible();

    // Ratings tab (shape: { score, createdAt, anime })
    await page.click('button:has-text("Avaliações")');
    await expect(page.locator('text=Anime 1')).toBeVisible();

    // Favorites tab (shape: { createdAt, anime })
    await page.click('button:has-text("Favoritos")');
    await expect(page.locator('text=Fav 1')).toBeVisible();
    await expect(page.locator('a[href="/animes/fav-1"]')).toBeVisible();

    // Open report modal
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
