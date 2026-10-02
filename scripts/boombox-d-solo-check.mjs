import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 4371;
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (let attempt = 0; attempt < 30; attempt += 1) { try { await page.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded", timeout: 2000 }); break; } catch (error) { if (attempt === 29) throw error; await wait(100); } }
  if (await page.locator("#record-dialog").isVisible().catch(() => false)) { await page.locator("#record-name").fill("D Solo Check"); await page.locator("#record-save").click(); }
  await page.locator("#select-boombox").click();
  await page.locator("#boombox-mode-single").click();
  await page.locator("#boombox-opponents").selectOption("9");
  await page.locator("#boombox-difficulty").selectOption("expert");
  if (await page.locator("#boombox-loadout-open").isVisible()) throw new Error("Round 1 loadout store should be hidden");
  await page.locator("#boombox-solo-start").click();
  await page.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(() => { const status = document.querySelector("#boombox-match-status")?.textContent || ""; return status.includes("Your turn") || status.includes("Loading") || status.includes("Waiting") || status.includes("cannon-only"); }, null, { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector("#boombox-weapon")?.value === "cannon" && document.querySelectorAll("#boombox-weapon option").length === 1, null, { timeout: 15000 }).catch(async () => { throw new Error(`Cannon-only loadout did not settle: weapon=${await page.locator("#boombox-weapon").inputValue()} status=${await page.locator("#boombox-match-status").innerText()}`); });
  const tenPlayerLayout = await page.evaluate(() => ({ opponents: document.querySelectorAll("#boombox-opponent-health-list .boombox-opponent-health").length, targets: document.querySelectorAll("#boombox-target option").length, viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  if (tenPlayerLayout.opponents !== 9 || tenPlayerLayout.targets !== 9 || tenPlayerLayout.scrollWidth > tenPlayerLayout.viewport + 2) throw new Error(`Ten-player solo layout failed: ${JSON.stringify(tenPlayerLayout)}`);
  if (await page.locator("#boombox-difficulty").inputValue() !== "expert") throw new Error("Expert difficulty selection was not retained.");
  console.log("Boom Box Pass D solo check passed: ten-player authoritative launch, nine rival health/target entries, cannon-only Round 1, expert selection, and mobile overflow.");
} finally { await browser.close(); server.kill(); }
