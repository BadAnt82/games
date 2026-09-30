import { chromium } from "playwright";

const base = process.env.BOOMBOX_BROWSER_URL || "https://games.badantproductions.com/";
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await context.addInitScript(({ name }) => localStorage.setItem("badant-games-player-name", name), { name: `Solo Browser ${suffix}` });
const page = await context.newPage();
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("#select-boombox").click();
  await page.locator("#boombox-mode-single").click();
  await page.locator("#boombox-solo-weapon").selectOption("split-shell");
  await page.locator("#boombox-loadout-open").click();
  const split = page.locator("#boombox-shop-list article", { hasText: "Split shell" }).first();
  await split.getByRole("button", { name: /Buy for/ }).click();
  await page.locator("#boombox-loadout-start").click();
  await page.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 12000 });
  await page.waitForFunction(() => { const text = document.querySelector("#boombox-match-status")?.textContent || ""; return text.includes("Your turn") || text.includes("Waiting for") || text.includes("Spectating"); }, null, { timeout: 12000 });
  if (await page.locator("#boombox-weapon").inputValue() !== "split-shell") throw new Error("Solo loadout did not synchronize the selected weapon");
  await page.locator("#boombox-fire").click();
  await page.waitForFunction(() => { const text = document.querySelector("#boombox-match-status")?.textContent || ""; return text.includes("Your turn") || text.includes("Waiting for") || text.includes("out of the fight") || text.includes("complete"); }, null, { timeout: 12000 });
  console.log(`Boom Box solo browser check passed: authoritative AI room, synchronized loadout, mobile match, and one resolved turn (${suffix}).`);
} finally {
  await context.close();
  await browser.close();
}
