# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: report-and-pagination.spec.ts >> Public profile - report & pagination >> loads tabs, paginates comments and submits report
- Location: e2e/report-and-pagination.spec.ts:6:7

# Error details

```
TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "AnimesIce — home" [ref=e4] [cursor=pointer]:
        - /url: /
        - generic [ref=e6]: Animes
        - generic [ref=e7]: ·
        - generic [ref=e8]: Ice
      - generic [ref=e9]:
        - generic [ref=e11]: Ao vivo
        - time [ref=e12]: 03:33
      - search [ref=e13]:
        - generic [ref=e14]: Buscar animes
        - searchbox "Buscar animes" [ref=e16]
      - generic [ref=e18]:
        - link "Entrar" [ref=e19] [cursor=pointer]:
          - /url: /login
        - link "Cadastrar" [ref=e20] [cursor=pointer]:
          - /url: /register
  - navigation "Navegação principal" [ref=e21]:
    - generic [ref=e22]:
      - button "Animes" [ref=e24] [cursor=pointer]
      - button "Comunidade" [ref=e28] [cursor=pointer]
      - button "Conta" [ref=e32] [cursor=pointer]
  - main [ref=e35]:
    - generic [ref=e36]: Perfil não encontrado.
  - contentinfo [ref=e37]:
    - generic [ref=e38]:
      - generic [ref=e39]:
        - link "AnimesIce — home" [ref=e40] [cursor=pointer]:
          - /url: /
          - generic [ref=e42]: Animes
          - generic [ref=e43]: ·
          - generic [ref=e44]: Ice
        - paragraph [ref=e45]: Prateleira de streaming. Não hospedamos vídeo — todo conteúdo é provido de terceiros não afiliados.
      - generic [ref=e46]:
        - heading "Navegar" [level=2] [ref=e47]
        - list [ref=e48]:
          - listitem [ref=e49]:
            - link "Início" [ref=e50] [cursor=pointer]:
              - /url: /
      - generic [ref=e51]:
        - heading "Conta" [level=2] [ref=e52]
        - list [ref=e53]:
          - listitem [ref=e54]:
            - link "Entrar" [ref=e55] [cursor=pointer]:
              - /url: /login
          - listitem [ref=e56]:
            - link "Registrar" [ref=e57] [cursor=pointer]:
              - /url: /register
      - generic [ref=e58]:
        - heading "Referência" [level=2] [ref=e59]
        - list [ref=e60]:
          - listitem [ref=e61]:
            - link "MyAnimeList" [ref=e62] [cursor=pointer]:
              - /url: https://myanimelist.net
          - listitem [ref=e63]:
            - link "Jikan API" [ref=e64] [cursor=pointer]:
              - /url: https://jikan.moe
    - generic [ref=e66]:
      - paragraph [ref=e67]: © 2026 AnimesIce
      - paragraph [ref=e68]:
        - link "Privacidade" [ref=e69] [cursor=pointer]:
          - /url: /privacidade
        - text: ·
        - link "DMCA" [ref=e70] [cursor=pointer]:
          - /url: /dmca
  - alert [ref=e71]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const userId = 'test-user-1';
  4   | 
  5   | test.describe('Public profile - report & pagination', () => {
  6   |   test('loads tabs, paginates comments and submits report', async ({ page }) => {
  7   |     // Mock profile
  8   |     // Mock profile (intercept both /api/... and direct /user/... requests)
  9   |     const profileRoutePatterns = [
  10  |       '**/*/user/' + userId + '/profile*',
  11  |       '**/user/' + userId + '/profile*',
  12  |       '**/*user/' + userId + '/profile*',
  13  |     ];
  14  |     for (const pattern of profileRoutePatterns) {
  15  |       await page.route(new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '.*')), async route => {
  16  |         await route.fulfill({
  17  |           status: 200,
  18  |           contentType: 'application/json',
  19  |           body: JSON.stringify({
  20  |             id: userId,
  21  |             name: 'Test User',
  22  |             userName: 'testuser',
  23  |             avatar: null,
  24  |             bio: 'Bio here',
  25  |             createdAt: new Date().toISOString(),
  26  |             _count: { comments: 3, ratings: 2, favorites: 3, watchHistories: 1 }
  27  |           })
  28  |         });
  29  |       });
  30  |     }
  31  | 
  32  |     // Mock comments page 1 and 2 (both /api/... and /user/... patterns)
  33  |     const commentPatterns = [
  34  |       '**/api/user/' + userId + '/comments?page=1&limit=20',
  35  |       '**/user/' + userId + '/comments?page=1&limit=20',
  36  |     ];
  37  |     for (const p of commentPatterns) {
  38  |       await page.route(p, async route => {
  39  |         await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
  40  |           { id: 'c1', content: 'hello', createdAt: new Date().toISOString(), userId: 'u1', user: { id: 'u1', name: 'A', userName: 'a', avatar: null }, _count: { likes: 0, replies: 0 } },
  41  |           { id: 'c2', content: 'hi', createdAt: new Date().toISOString(), userId: 'u2', user: { id: 'u2', name: 'B', userName: 'b', avatar: null }, _count: { likes: 0, replies: 0 } }
  42  |         ]) });
  43  |       });
  44  |     }
  45  | 
  46  |     for (const p of ['**/*/user/' + userId + '/comments?page=2&limit=20', '**/user/' + userId + '/comments?page=2&limit=20']) {
  47  |       await page.route(new RegExp(p.replace(/\*\*/g, '.*').replace(/\*/g, '.*')), async route => {
  48  |         await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
  49  |           { id: 'c3', content: 'more', createdAt: new Date().toISOString(), userId: 'u3', user: { id: 'u3', name: 'C', userName: 'c', avatar: null }, _count: { likes: 0, replies: 0 } }
  50  |         ]) });
  51  |       });
  52  |     }
  53  | 
  54  |     // Mock other backend calls the app may make server-side
  55  |     for (const p of ['**/anime*', '**/episode/latest*', '**/anime/trending*', '**/anime/recently-added*']) {
  56  |       await page.route(p, async route => {
  57  |         await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  58  |       });
  59  |     }
  60  | 
  61  |     // Mock ratings
  62  |     await page.route('**/api/user/' + userId + '/ratings?page=1&limit=20', async route => {
  63  |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
  64  |         { id: 'r1', anime: { id: 'a1', title: 'Anime 1' }, score: 8, createdAt: new Date().toISOString() }
  65  |       ]) });
  66  |     });
  67  | 
  68  |     // Mock favorites
  69  |     await page.route('**/api/user/' + userId + '/favorites?page=1&limit=24', async route => {
  70  |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [ { id: 'f1', title: 'Fav 1', coverImage: null } ] }) });
  71  |     });
  72  | 
  73  |     // Capture report POST
  74  |     let reportPayload: any = null;
  75  |     await page.route('**/api/report', async route => {
  76  |       const req = route.request();
  77  |       reportPayload = await req.postDataJSON();
  78  |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'rpt1', ...reportPayload }) });
  79  |     });
  80  | 
  81  |     // Go to page
  82  |     await page.goto(`/perfil/${userId}`);
  83  | 
  84  |     // Wait for overview (either bio or name)
  85  |     try {
> 86  |       await page.waitForFunction(() => document.body.innerText.includes('Bio here') || document.body.innerText.includes('Test User'), null, { timeout: 15000 });
      |                  ^ TimeoutError: page.waitForFunction: Timeout 15000ms exceeded.
  87  |     } catch (e) {
  88  |       // dump HTML and screenshot for debugging
  89  |       const html = await page.content();
  90  |       const fs = require('fs');
  91  |       try { fs.writeFileSync('/tmp/profile_page_debug.html', html); } catch {}
  92  |       try { await page.screenshot({ path: '/tmp/profile_page_debug.png', fullPage: true }); } catch {}
  93  |       throw e;
  94  |     }
  95  | 
  96  |     // Open comments tab
  97  |     await page.click('button:has-text("Comentários")');
  98  |     await expect(page.locator('text=hello')).toBeVisible();
  99  | 
  100 |     // Load more comments
  101 |     await page.click('button:has-text("Carregar mais")');
  102 |     await expect(page.locator('text=more')).toBeVisible();
  103 | 
  104 |     // Open report modal
  105 |     await page.click('button:has-text("Denunciar usuário")');
  106 |     await expect(page.locator('text=Denunciar usuário')).toBeVisible();
  107 | 
  108 |     // Select reason and fill notes
  109 |     await page.selectOption('select', 'SPAM');
  110 |     await page.fill('textarea', 'Reason details');
  111 | 
  112 |     // Submit report
  113 |     await page.click('button:has-text("Enviar denúncia")');
  114 | 
  115 |     // Ensure report POST was called with expected payload
  116 |     await page.waitForTimeout(200); // small wait for route handler
  117 |     expect(reportPayload).not.toBeNull();
  118 |     expect(reportPayload.targetType).toBe('USER');
  119 |     expect(reportPayload.targetId).toBe(userId);
  120 |     expect(reportPayload.reason).toBe('SPAM');
  121 |     expect(reportPayload.notes).toBe('Reason details');
  122 |   });
  123 | });
  124 | 
```