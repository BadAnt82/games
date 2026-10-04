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
  if (await page.locator("#boombox-single-panel label", { hasText: "Starting weapon" }).count() || await page.locator("#boombox-single-panel label", { hasText: "Utility" }).count()) throw new Error("A starting equipment choice is still rendered in setup");
  if (!(await page.locator("#boombox-solo-firing-mode").isVisible())) throw new Error("Solo setup does not expose the play type");
  const setupPresentation = await page.evaluate(() => { const panel = document.querySelector("#boombox-single-panel")?.getBoundingClientRect(); return { width: panel?.width || 0, height: panel?.height || 0, viewportWidth: innerWidth, viewportHeight: innerHeight }; });
  if (setupPresentation.width > setupPresentation.viewportWidth + 2 || setupPresentation.height > setupPresentation.viewportHeight * 1.15) throw new Error(`Solo setup is not compact on desktop: ${JSON.stringify(setupPresentation)}`);
  await page.locator("#boombox-opponents").selectOption("1");
  await page.locator("#boombox-solo-rounds").selectOption("3");
  if (await page.locator("#boombox-loadout-open").isVisible()) throw new Error("The Round 1 loadout store is still visible");
  await page.locator("#boombox-solo-start").click();
  await page.locator("#boombox-match-panel").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(() => document.querySelectorAll("#boombox-weapon option").length === 1 && document.querySelector("#boombox-weapon option")?.getAttribute("value") === "cannon", null, { timeout: 15000 });
  await page.locator("#boombox-fire").click();
  await page.waitForTimeout(500);
  let destructionSeen = false;
  for (let attempt = 0; attempt < 5 && !(await page.locator("#boombox-intermission-panel").isVisible()); attempt += 1) {
    await page.waitForFunction(() => {
      const fire = document.querySelector("#boombox-fire");
      return document.querySelector("#boombox-canvas")?.getAttribute("data-destruction-effect") === "active"
        || !document.querySelector("#boombox-intermission-panel")?.hasAttribute("hidden")
        || (fire instanceof HTMLElement && fire.offsetParent !== null && !fire.hasAttribute("disabled"));
    }, null, { timeout: 30000 });
    if (await page.locator("#boombox-canvas").getAttribute("data-destruction-effect") === "active") { destructionSeen = true; await page.waitForFunction(() => document.querySelector("#boombox-canvas")?.getAttribute("data-destruction-effect") !== "active", null, { timeout: 8000 }); }
    if (!(await page.locator("#boombox-intermission-panel").isVisible())) {
      await page.waitForFunction(() => {
        const fire = document.querySelector("#boombox-fire");
        return !document.querySelector("#boombox-intermission-panel")?.hasAttribute("hidden")
          || (fire instanceof HTMLElement && fire.offsetParent !== null && !fire.hasAttribute("disabled"));
      }, null, { timeout: 30000 });
      if (!(await page.locator("#boombox-intermission-panel").isVisible())) await page.locator("#boombox-fire").click();
    }
  }
  if (!(await page.locator("#boombox-intermission-panel").isVisible())) { const diagnostic = await page.evaluate(() => ({ status: document.querySelector("#boombox-match-status")?.textContent, round: document.querySelector("#boombox-match-round")?.textContent, player: document.querySelector("#boombox-player-health-value")?.textContent, opponents: document.querySelector("#boombox-opponent-health-list")?.textContent, resultVisible: !document.querySelector("#boombox-result-panel")?.hasAttribute("hidden"), fireDisabled: document.querySelector("#boombox-fire")?.disabled })); throw new Error(`Round did not reach intermission: ${JSON.stringify(diagnostic)}`); }
  const visibleFlights = await page.locator("#boombox-canvas").evaluate((canvas) => ({ count: Number(canvas.getAttribute("data-flight-count")) || 0, seats: String(canvas.getAttribute("data-flight-seats") || "").split(",") })); if (visibleFlights.count < 2 || !visibleFlights.seats.includes("0") || !visibleFlights.seats.includes("1")) throw new Error(`Player and AI shots were not both presented: ${JSON.stringify(visibleFlights)}`);
  if (!destructionSeen) throw new Error("The destroyed tank did not enter the visible explosion/removal state before intermission");
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

  await page.goto(base, { waitUntil: "domcontentloaded" });
  if (await page.locator("#record-dialog").isVisible()) { await page.locator("#record-name").fill("Volley Test"); await page.locator("#record-save").click(); }
  await page.locator("#select-boombox").click();
  await page.locator("#boombox-mode-single").click();
  await page.locator("#boombox-opponents").selectOption("2");
  await page.locator("#boombox-solo-firing-mode").selectOption("simultaneous");
  await page.locator("#boombox-solo-start").click();
  await page.locator("#boombox-match-panel").waitFor({ state: "visible", timeout: 15000 });
  if ((await page.locator("#boombox-fire").innerText()).trim() !== "Lock shot") throw new Error("Simultaneous mode did not present a lock-shot action");
  const initialTurn = Number(await page.locator("#boombox-turn").innerText());
  await page.locator("#boombox-fire").click();
  await page.waitForFunction(() => {
    const seats = String(document.querySelector("#boombox-canvas")?.getAttribute("data-flight-seats") || "").split(",");
    return seats.includes("0") && seats.includes("1") && seats.includes("2");
  }, null, { timeout: 30000 });
  await page.waitForFunction((turn) => {
    const fire = document.querySelector("#boombox-fire");
    return Number(document.querySelector("#boombox-turn")?.textContent) === turn + 1 && fire instanceof HTMLButtonElement && !fire.disabled;
  }, initialTurn, { timeout: 30000 });
  const volleyFlights = await page.locator("#boombox-canvas").evaluate((canvas) => ({ count: Number(canvas.getAttribute("data-flight-count")) || 0, seats: String(canvas.getAttribute("data-flight-seats") || "").split(",") }));
  if (volleyFlights.count < 3) throw new Error(`The simultaneous volley did not visibly present all three shots: ${JSON.stringify(volleyFlights)}`);
  await page.locator("#boombox-speed-4").click();
  let spectatorSeen = false;
  for (let volley = 0; volley < 16 && !(await page.locator("#boombox-intermission-panel").isVisible()); volley += 1) {
    spectatorSeen ||= (await page.locator("#boombox-match-status").innerText()).includes("destroyed");
    if (await page.locator("#boombox-fire").isEnabled()) await page.locator("#boombox-fire").click();
    await page.waitForFunction(() => {
      const fire = document.querySelector("#boombox-fire");
      return !document.querySelector("#boombox-intermission-panel")?.hasAttribute("hidden")
        || (fire instanceof HTMLButtonElement && !fire.disabled)
        || (document.querySelector("#boombox-match-status")?.textContent || "").includes("destroyed");
    }, null, { timeout: 30000 });
    if (!spectatorSeen && (await page.locator("#boombox-match-status").innerText()).includes("destroyed")) spectatorSeen = true;
    if (spectatorSeen && !(await page.locator("#boombox-intermission-panel").isVisible())) await page.locator("#boombox-intermission-panel").waitFor({ state: "visible", timeout: 30000 });
  }
  if (!(await page.locator("#boombox-intermission-panel").isVisible())) throw new Error("The three-seat simultaneous round did not reach the between-round standings");
  if ((await page.locator("#boombox-standings .boombox-standings-row").count()) !== 4) throw new Error("The three-seat intermission standings were not rendered");
  console.log(`Boom Box round-flow browser check passed${externalBase ? " live" : ""}: cannon-only setup, full-turn counting, visible destruction, intermission rankings/shop, Round 2 with interest, and a complete three-seat simultaneous round all completed${spectatorSeen ? " including post-elimination spectating" : ""}.`);
} finally {
  await browser?.close();
  server?.kill();
  await wait(100);
  rmSync(storeDir, { recursive: true, force: true });
}
