import { test, expect } from "@playwright/test";
import { blockAds, mockGeneric, loginAs } from "./helpers";

// Captura neutra: nao depende de nenhum contrato de DOM especifico, so do fluxo.
for (const rarity of ["COMUM", "LENDARIA", "MITICA", "GALACTICA"]) {
  test(`captura ${rarity}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await blockAds(page); await mockGeneric(page); await loginAs(page);
    await page.route("**/gacha/spin", async (route) => {
      const r = await route.fetch();
      const pull = await r.json();
      pull.card.rarity = rarity;
      pull.foil = rarity === "COMUM" ? "NORMAL" : "PRISM";
      await route.fulfill({ response: r, json: pull });
    });
    const t0 = Date.now();
    await page.goto("/gacha");
    await page.getByRole("button", { name: /^Girar/ }).click();
    const d = page.getByRole("dialog", { name: "Invocação" });
    await expect(d).toHaveAttribute("data-phase", "invocation");
    await page.waitForTimeout(900);
    await page.screenshot({ path: `/tmp/cmp/mine-${rarity}-a.png` });
    let msShowcase = -1;
    try {
      await expect(d).toHaveAttribute("data-phase", "showcase", { timeout: 20000 });
      msShowcase = Date.now() - t0;
    } catch { /* ficou preso */ }
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/cmp/mine-${rarity}-b.png` });
    const geo = await page.evaluate(() => {
      const badge = document.querySelector("[data-badge]")?.getBoundingClientRect();
      const btns = [...document.querySelectorAll("dialog button")].map(b => b.getBoundingClientRect());
      const top = btns.length ? Math.max(...btns.map(r => r.top)) : Infinity;
      return {
        badgeBottom: badge ? Math.round(badge.bottom) : null,
        barraTop: Math.round(top),
        colide: badge ? badge.bottom > top : false,
        scrollH: document.querySelector("dialog")?.scrollHeight,
        clientH: document.querySelector("dialog")?.clientHeight,
      };
    });
    console.log(`RESULT ${rarity} showcase_ms=${msShowcase} ${JSON.stringify(geo)}`);
  });
}
