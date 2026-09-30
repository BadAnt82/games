import { chromium } from "playwright";
import { existsSync } from "node:fs";

const base = process.env.BOOMBOX_BROWSER_URL || "https://games.badantproductions.com/";
const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ headless: true, ...(existsSync(chromePath) ? { executablePath: chromePath } : {}) });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await context.addInitScript(() => localStorage.setItem("badant-games-player-name", "Package F Tester"));
const page = await context.newPage();
try {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.locator("#select-boombox").click();
  await page.locator("#boombox-mode-single").click();
  await page.locator("#boombox-loadout-open").click();
  await page.locator("#boombox-loadout-start").click();
  await page.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 12000 });
  for (const id of ["boombox-sound-toggle", "boombox-effects-toggle", "boombox-announcement"]) await page.locator(`#${id}`).waitFor({ state: "visible", timeout: 5000 });
  const sound = page.locator("#boombox-sound-toggle");
  const effects = page.locator("#boombox-effects-toggle");
  const initialSound = await sound.getAttribute("aria-pressed");
  const initialEffects = await effects.getAttribute("aria-pressed");
  await sound.click(); await effects.click();
  if ((await sound.getAttribute("aria-pressed")) === initialSound || (await effects.getAttribute("aria-pressed")) === initialEffects) throw new Error("Presentation toggles did not change state");
  await page.locator("#boombox-match-exit").click();
  await page.locator("#boombox-mode-panel").waitFor({ state: "visible", timeout: 5000 });
  await page.locator("#boombox-mode-multi").click();
  await page.locator("#boombox-history-open").click();
  await page.locator("#boombox-history-list article").first().waitFor({ state: "visible", timeout: 15000 });
  const replayButton = page.locator("#boombox-history-list article button", { hasText: "Replay match" }).first();
  await replayButton.scrollIntoViewIfNeeded();
  await replayButton.evaluate((button) => button.click());
  await page.waitForTimeout(250);
  await page.locator("#boombox-history-replay").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#boombox-replay-result").waitFor({ state: "visible", timeout: 10000 });
  const replay = await page.locator("#boombox-replay-result").innerText();
  if (!replay || replay.includes("No replay selected") || replay.includes("Replay is in progress")) throw new Error(`Replay result summary did not render: ${replay}; history=${await page.locator("#boombox-history-status").innerText()}; replayStatus=${await page.locator("#boombox-history-replay-status").innerText()}; step=${await page.locator("#boombox-history-step-value").innerText()}`);
  console.log(`Boom Box Package F presentation check passed: persistent sound/effects controls, live announcement region, mobile match, replay controls, and result summary (${replay}).`);
} finally {
  await context.close();
  await browser.close();
}
