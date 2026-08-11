const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR', err));
  page.on('requestfailed', r => console.log('REQFAILED', r.url(), r.failure()));
  await page.goto('http://localhost:3000/perfil/test-user-1');
  await page.waitForTimeout(5000);
  await browser.close();
})();