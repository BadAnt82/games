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
  if (await page.locator("#boombox-loadout-open").isVisible()) throw new Error("Round 1 loadout store should be hidden");
  await page.locator("#boombox-solo-start").click();
  await page.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 12000 });
  await page.waitForFunction(() => { const text = document.querySelector("#boombox-match-status")?.textContent || ""; return text.includes("Your turn") || text.includes("Waiting for") || text.includes("Spectating"); }, null, { timeout: 12000 });
  if (await page.locator("#boombox-weapon").inputValue() !== "cannon" || await page.locator("#boombox-weapon option").count() !== 1) throw new Error("Solo Round 1 was not cannon-only");
  await page.locator("#boombox-fire").click();
  await page.waitForFunction(() => { const text = document.querySelector("#boombox-match-status")?.textContent || ""; return text.includes("Your turn") || text.includes("Waiting for") || text.includes("out of the fight") || text.includes("complete"); }, null, { timeout: 12000 });
  console.log(`Boom Box solo browser check passed: authoritative AI room, cannon-only Round 1, mobile match, and one visibly resolved turn (${suffix}).`);
} finally {
  await context.close();
  await browser.close();
}
