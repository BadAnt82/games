import { chromium } from "playwright";

const base = process.env.BOOMBOX_BROWSER_URL || "https://games.badantproductions.com/";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem("badant-games-player-name", "Mobile Visual"));
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("#select-boombox").click(); await page.locator("#boombox-mode-single").click();
  await page.locator("#boombox-loadout-open").click(); await page.locator("#boombox-shop-list article").first().waitFor({ state: "visible" });
  const splitCard = page.locator("#boombox-shop-list article", { hasText: "Split shell" }).first(); if (!(await splitCard.isVisible())) throw new Error("Split shell is missing from the mobile loadout");
  await splitCard.getByRole("button", { name: /Buy for/ }).click(); await page.locator("#boombox-loadout-start").click(); await page.locator("#boombox-canvas").waitFor({ state: "visible" });
  const layout = await page.evaluate(() => { const canvas = document.querySelector("#boombox-canvas").getBoundingClientRect(); return { viewport: window.innerWidth, canvasWidth: canvas.width, canvasHeight: canvas.height, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  if (layout.canvasWidth <= 0 || layout.canvasWidth > layout.viewport + 1 || layout.overflow > 2) throw new Error(`Mobile layout overflow: ${JSON.stringify(layout)}`);
  const weaponOptions = await page.locator("#boombox-weapon option").count(); if (weaponOptions < 19) throw new Error(`Expected the full weapon selector, found ${weaponOptions}`);
  await page.locator("#boombox-match-exit").click(); await page.locator("#boombox-mode-multi").click(); await page.locator("#boombox-lobby-panel").waitFor({ state: "visible" }); await page.locator("#boombox-history-open").click();
  await page.locator("#boombox-replay-a11y").waitFor({ state: "attached" }); const describedBy = await page.locator("#boombox-history-canvas").getAttribute("aria-describedby"); if (describedBy !== "boombox-replay-a11y") throw new Error("Replay canvas is missing its accessible description");
  const cards = page.locator("#boombox-history-list article"); if (await cards.count()) { await cards.first().getByRole("button", { name: "Replay match" }).click(); await page.locator("#boombox-history-replay").waitFor({ state: "visible" }); const a11y = await page.locator("#boombox-replay-a11y").textContent(); if (!a11y?.includes("Replay step")) throw new Error("Replay accessible summary did not update"); }
  console.log(`Boom Box visual check passed: mobile ${layout.canvasWidth.toFixed(0)}px canvas, full weapon selector, replay accessibility, and ${await cards.count()} history record(s).`);
} finally { await context.close(); await browser.close(); }
