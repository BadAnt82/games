import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const port = 4361;
const externalBase = process.env.BOOMBOX_BROWSER_URL?.replace(/\/$/, "");
const storeDir = mkdtempSync(join(tmpdir(), "boombox-round-browser-"));
const server = externalBase ? null : spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), BOOM_BOX_ROOM_STORE_PATH: join(storeDir, "rooms.json"), BOOMBOX_AI_DELAY_MS: "120" }, stdio: ["ignore", "pipe", "pipe"] });
const base = externalBase || `http://127.0.0.1:${port}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let browser;

try {
  if (server) await wait(600);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  if (await page.locator("#record-dialog").isVisible()) { await page.locator("#record-name").fill("Round Flow Test"); await page.locator("#record-save").click(); }
  await page.locator("#select-boombox").click();
  await page.locator("#boombox-mode-single").click();
  await page.locator("#boombox-opponents").selectOption("1");
  await page.locator("#boombox-solo-rounds").selectOption("3");
  await page.locator("#boombox-solo-interest").fill("10");
  await page.locator("#boombox-loadout-open").click();
  const nuke = page.locator("#boombox-shop-list article", { hasText: "Mini nuke" });
  await nuke.getByRole("button", { name: /Buy for/ }).click();
  await page.locator("#boombox-loadout-start").click();
  await page.locator("#boombox-match-panel").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll("#boombox-weapon option")).some((option) => option.textContent?.includes("Mini nuke")), null, { timeout: 15000 });
  await page.locator("#boombox-weapon").selectOption("mini-nuke");
  await page.locator("#boombox-fire").click();
  await page.waitForTimeout(500);
  for (let attempt = 0; attempt < 5 && !(await page.locator("#boombox-intermission-panel").isVisible()); attempt += 1) {
    await page.waitForFunction(() => !document.querySelector("#boombox-intermission-panel")?.hasAttribute("hidden") || !document.querySelector("#boombox-fire")?.disabled, null, { timeout: 30000 });
    if (!(await page.locator("#boombox-intermission-panel").isVisible())) await page.locator("#boombox-fire").click();
  }
  if (!(await page.locator("#boombox-intermission-panel").isVisible())) { const diagnostic = await page.evaluate(() => ({ status: document.querySelector("#boombox-match-status")?.textContent, round: document.querySelector("#boombox-match-round")?.textContent, player: document.querySelector("#boombox-player-health-value")?.textContent, opponents: document.querySelector("#boombox-opponent-health-list")?.textContent, resultVisible: !document.querySelector("#boombox-result-panel")?.hasAttribute("hidden"), fireDisabled: document.querySelector("#boombox-fire")?.disabled })); throw new Error(`Round did not reach intermission: ${JSON.stringify(diagnostic)}`); }
  if (await page.locator("#boombox-result-panel").isVisible()) throw new Error("A non-final elimination opened the final result panel");
  if ((await page.locator("#boombox-standings .boombox-standings-row").count()) !== 3) throw new Error("The two-player intermission standings were not rendered");
  const standingsText = await page.locator("#boombox-standings").innerText();
  if (!standingsText.toLowerCase().includes("total kills") || !standingsText.toLowerCase().includes("total survival") || !standingsText.toLowerCase().includes("overall")) throw new Error(`Intermission rankings are incomplete: ${standingsText}`);
  const desktopPresentation = await page.evaluate(() => {
    const status = document.querySelector("#boombox-intermission-status");
    const color = status ? getComputedStyle(status).color : "";
    const values = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [0, 0, 0];
    const luminance = values.reduce((total, value, index) => total + (value / 255) * [0.2126, 0.7152, 0.0722][index], 0);
    return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, color, luminance };
  });
  if (desktopPresentation.scrollWidth > desktopPresentation.viewport + 2) throw new Error(`Intermission overflows the desktop viewport: ${JSON.stringify(desktopPresentation)}`);
  if (desktopPresentation.luminance < .7) throw new Error(`Intermission supporting text is too dark: ${JSON.stringify(desktopPresentation)}`);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobilePresentation = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, panelWidth: document.querySelector("#boombox-intermission-panel")?.getBoundingClientRect().width || 0, shopColumns: getComputedStyle(document.querySelector(".boombox-intermission-shop")).gridTemplateColumns }));
  if (mobilePresentation.scrollWidth > mobilePresentation.viewport + 2 || mobilePresentation.panelWidth > mobilePresentation.viewport + 2) throw new Error(`Intermission overflows a small phone: ${JSON.stringify(mobilePresentation)}`);
  if (mobilePresentation.shopColumns.split(" ").length !== 1) throw new Error(`The mobile intermission shop did not stack: ${JSON.stringify(mobilePresentation)}`);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const beforeText = await page.locator("#boombox-intermission-credits").innerText(); const beforeCredits = Number(beforeText.match(/\d+/)?.[0]);
  await page.locator("#boombox-intermission-weapon").selectOption("split-shell");
  await page.locator("#boombox-intermission-buy-weapon").click();
  await page.waitForFunction((prior) => Number(document.querySelector("#boombox-intermission-credits")?.textContent?.match(/\d+/)?.[0]) === prior - 25, beforeCredits, { timeout: 10000 });
  const postShopCredits = beforeCredits - 25;
  await page.locator("#boombox-intermission-ready").click();
  await page.locator("#boombox-match-panel").waitFor({ state: "visible", timeout: 15000 });
  if ((await page.locator("#boombox-match-round").textContent())?.trim() !== "Round 2 / 3") throw new Error(`Ready-up did not begin Round 2: ${await page.locator("#boombox-match-round").textContent()}`);
  const roundTwoCredits = Number(await page.locator("#boombox-credits").innerText());
  if (roundTwoCredits !== postShopCredits + Math.floor(postShopCredits * .1)) throw new Error(`Round-start interest was incorrect: ${roundTwoCredits}`);
  console.log(`Boom Box round-flow browser check passed${externalBase ? " live" : ""}: elimination stayed authoritative, intermission rankings/shop appeared legibly without viewport overflow, and Round 2 began with post-shop interest.`);
} finally {
  await browser?.close();
  server?.kill();
  await wait(100);
  rmSync(storeDir, { recursive: true, force: true });
}
