const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('request', r => console.log('REQ', r.method(), r.url()));
  page.on('response', r => console.log('RES', r.status(), r.url()));
  page.on('requestfailed', r => console.log('FAILED', r.method(), r.url(), r.failure()));
  await page.goto('http://localhost:3000/perfil/test-user-1');
  await page.waitForTimeout(5000);
  await browser.close();
})();