import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 4362;
const storeDir = mkdtempSync(join(tmpdir(), "games-admin-browser-"));
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), GAMES_ADMIN_STORE_PATH: join(storeDir, "admin.json"), GAMES_ADMIN_CONFIG_STORE_PATH: join(storeDir, "config.json") }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
  for (let attempt = 0; attempt < 30; attempt += 1) { try { await page.goto(`http://localhost:${port}/`, { waitUntil: "domcontentloaded", timeout: 2000 }); break; } catch { await wait(100); } }
  if (await page.locator("#record-dialog").isVisible()) { await page.locator("#record-name").fill("Admin Browser Test"); await page.locator("#record-save").click(); }
  await page.locator("#admin-open").click();
  await page.locator("#admin-panel").waitFor({ state: "visible" });
  await page.locator("#admin-email").fill("ant1982@gmail.com");
  await page.locator("#admin-password").fill("Strong1!");
  await page.locator("#admin-confirm-password").fill("Strong1!");
  await page.locator("#admin-submit").click();
  await page.locator("#admin-dashboard").waitFor({ state: "visible", timeout: 5000 });
  if (await page.locator("#admin-form").isVisible() || !(await page.locator("#admin-session-actions").isVisible())) throw new Error("Admin login controls were not hidden after authentication.");
  const gameOptions = await page.locator("#admin-game-select option").allTextContents();
  if (gameOptions.length < 7 || !gameOptions.includes("Boom Box") || !gameOptions.includes("Digital Cribbage")) throw new Error("Admin game selector did not include the Games catalog.");
  await page.locator("#admin-game-select").selectOption("digital-cribbage");
  if (!(await page.locator("#admin-game-placeholder").isVisible()) || await page.locator("#admin-dashboard").isVisible()) throw new Error("Non-Boom Box game selector did not show its placeholder page.");
  await page.locator("#admin-game-select").selectOption("boombox");
  await page.locator("#admin-dashboard").waitFor({ state: "visible" });
  await page.waitForFunction(() => !document.querySelector("#admin-config-status")?.textContent?.includes("Loading"), null, { timeout: 5000 });
  if (!(await page.locator("#admin-config-fields").innerText()).includes("Default starting credits") || await page.locator("input[data-admin-default-path='economy.startingCredits']").count() !== 1 || await page.locator("input[data-admin-custom-path='economy.startingCredits']").count() !== 1) throw new Error("Economy dashboard did not render split default/custom fields.");
  await page.locator("button[data-admin-tab='weapons']").click();
  const weaponText = await page.locator("#admin-config-fields").innerText();
  const cannonText = await page.locator(".admin-catalog-card").evaluateAll((cards) => cards.find((card) => card.querySelector("header strong")?.textContent === "Cannon")?.textContent || "");
  if (!weaponText.includes("Cannon") || cannonText.includes("Projectiles per shot")) throw new Error("Weapon catalog tab did not hide non-applicable projectile settings.");
  await page.locator("button[data-admin-tab='utilities']").click();
  const utilityText = await page.locator("#admin-config-fields").innerText();
  if (!utilityText.includes("Amount per purchase") || !utilityText.includes("Expiration (rounds)") || !utilityText.includes("Effect amount (health points)") || utilityText.includes("Effect amount (units)")) throw new Error("Utility catalog tab did not render clear purchase, capacity, duration, and applicable effect fields.");
  await page.locator("#overlay").evaluate((element) => { element.scrollTop = 0; });
  await page.locator("button[data-admin-tab='economy']").click();
  await page.locator("input[data-admin-custom-path='economy.startingCredits']").fill("275");
  await page.locator("input[data-admin-custom-path='economy.startingCredits']").press("Tab");
  await page.waitForFunction(async () => { const body = await (await fetch("/api/admin/config", { cache: "no-store" })).json(); return body.config?.economy?.startingCredits === 275 && body.defaults?.economy?.startingCredits === 100 && body.custom?.economy?.startingCredits === 275; }, null, { timeout: 5000 });
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#admin-config-restore").click();
  await page.waitForFunction(async () => { const body = await (await fetch("/api/admin/config", { cache: "no-store" })).json(); return body.custom && Object.keys(body.custom).length === 0 && body.config?.economy?.startingCredits === 100; }, null, { timeout: 5000 });
  await page.waitForFunction(async () => { const body = await (await fetch("/api/admin/config", { cache: "no-store" })).json(); return body.config?.economy?.startingCredits === 100 && body.custom && Object.keys(body.custom).length === 0; }, null, { timeout: 5000 });
  console.log("Games admin browser check passed: login hiding, dashboard tabs, split default/custom fields, blur autosave, catalog clarity, and restore defaults.");
} finally {
  await browser.close();
  server.kill();
  await wait(100);
  rmSync(storeDir, { recursive: true, force: true });
}
