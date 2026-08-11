import { test, expect } from '@playwright/test';

const userId = 'test-user-1';

test.describe('Public profile - report & pagination', () => {
  test('loads tabs, paginates comments and submits report', async ({ page }) => {
    // Mock profile
    // Mock profile (intercept both /api/... and direct /user/... requests)
    const profileRoutePatterns = [
      '**/*/user/' + userId + '/profile*',
      '**/user/' + userId + '/profile*',
      '**/*user/' + userId + '/profile*',
    ];
    for (const pattern of profileRoutePatterns) {
      await page.route(new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '.*')), async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: userId,
            name: 'Test User',
            userName: 'testuser',
            avatar: null,
            bio: 'Bio here',
            createdAt: new Date().toISOString(),
            _count: { comments: 3, ratings: 2, favorites: 3, watchHistories: 1 }
          })
        });
      });
    }

    // Mock comments page 1 and 2 (both /api/... and /user/... patterns)
    const commentPatterns = [
      '**/api/user/' + userId + '/comments?page=1&limit=20',
      '**/user/' + userId + '/comments?page=1&limit=20',
    ];
    for (const p of commentPatterns) {
      await page.route(p, async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
          { id: 'c1', content: 'hello', createdAt: new Date().toISOString(), userId: 'u1', user: { id: 'u1', name: 'A', userName: 'a', avatar: null }, _count: { likes: 0, replies: 0 } },
          { id: 'c2', content: 'hi', createdAt: new Date().toISOString(), userId: 'u2', user: { id: 'u2', name: 'B', userName: 'b', avatar: null }, _count: { likes: 0, replies: 0 } }
        ]) });
      });
    }

    for (const p of ['**/*/user/' + userId + '/comments?page=2&limit=20', '**/user/' + userId + '/comments?page=2&limit=20']) {
      await page.route(new RegExp(p.replace(/\*\*/g, '.*').replace(/\*/g, '.*')), async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
          { id: 'c3', content: 'more', createdAt: new Date().toISOString(), userId: 'u3', user: { id: 'u3', name: 'C', userName: 'c', avatar: null }, _count: { likes: 0, replies: 0 } }
        ]) });
      });
    }

    // Mock other backend calls the app may make server-side
    for (const p of ['**/anime*', '**/episode/latest*', '**/anime/trending*', '**/anime/recently-added*']) {
      await page.route(p, async route => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });
    }

    // Mock ratings
    await page.route('**/api/user/' + userId + '/ratings?page=1&limit=20', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'r1', anime: { id: 'a1', title: 'Anime 1' }, score: 8, createdAt: new Date().toISOString() }
      ]) });
    });

    // Mock favorites
    await page.route('**/api/user/' + userId + '/favorites?page=1&limit=24', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [ { id: 'f1', title: 'Fav 1', coverImage: null } ] }) });
    });

    // Capture report POST
    let reportPayload: any = null;
    await page.route('**/api/report', async route => {
      const req = route.request();
      reportPayload = await req.postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'rpt1', ...reportPayload }) });
    });

    // Go to page
    await page.goto(`/perfil/${userId}`);

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

    // Open report modal
    await page.click('button:has-text("Denunciar usuário")');
    await expect(page.locator('text=Denunciar usuário')).toBeVisible();

    // Select reason and fill notes
    await page.selectOption('select', 'SPAM');
    await page.fill('textarea', 'Reason details');

    // Submit report
    await page.click('button:has-text("Enviar denúncia")');

    // Ensure report POST was called with expected payload
    await page.waitForTimeout(200); // small wait for route handler
    expect(reportPayload).not.toBeNull();
    expect(reportPayload.targetType).toBe('USER');
    expect(reportPayload.targetId).toBe(userId);
    expect(reportPayload.reason).toBe('SPAM');
    expect(reportPayload.notes).toBe('Reason details');
  });
});
