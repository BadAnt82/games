import { chromium } from "playwright";

const base = process.env.BOOMBOX_BROWSER_URL || "https://games.badantproductions.com/";
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const roomName = `Browser ${suffix}`;
const browser = await chromium.launch({ headless: true });
const hostContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const guestContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await hostContext.addInitScript(({ name }) => localStorage.setItem("badant-games-player-name", name), { name: `Browser Host ${suffix}` });
await guestContext.addInitScript(({ name }) => localStorage.setItem("badant-games-player-name", name), { name: `Browser Guest ${suffix}` });
const host = await hostContext.newPage();
const guest = await guestContext.newPage();

async function openLobby(page) {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("#select-boombox").click();
  await page.locator("#boombox-mode-multi").click();
  await page.locator("#boombox-lobby-panel").waitFor({ state: "visible" });
}

try {
  await openLobby(host);
  await host.locator("#boombox-create").click();
  await host.locator("#boombox-room-name").fill(roomName);
  await host.locator("#boombox-seats").selectOption("2");
  await host.locator("#boombox-create-next").click();
  await host.locator("#boombox-seat-plan").waitFor({ state: "visible" });
  await host.locator("#boombox-create-next").click();
  if (!(await host.locator("#boombox-create-summary").innerText()).includes("2 human")) throw new Error("Seat control was not included in the review step");
  await host.locator("#boombox-create-submit").click();
  await host.locator(`#boombox-created-list article:has-text("${roomName}")`).waitFor({ state: "visible", timeout: 8000 });

  await openLobby(guest);
  const availableRoom = guest.locator("#boombox-available-list article", { hasText: roomName }).first();
  await availableRoom.waitFor({ state: "visible", timeout: 8000 });
  await availableRoom.getByRole("button", { name: "Join room" }).click();
  await host.locator(`#boombox-created-list article:has-text("${roomName}")`).getByRole("button", { name: "Start match" }).click();
  await host.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 10000 });
  await guest.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 10000 });
  if (!(await host.locator("#boombox-match-status").innerText()).includes("Your turn")) throw new Error("Host did not receive the first turn");

  await host.locator("#boombox-angle").fill("42");
  await host.locator("#boombox-power").fill("58");
  await host.locator("#boombox-fire").click();
  await guest.locator("#boombox-match-status").waitFor({ state: "visible" });
  await guest.waitForFunction(() => document.querySelector("#boombox-match-status")?.textContent?.includes("Your turn"), null, { timeout: 8000 });
  await guest.locator("#boombox-angle").fill("42");
  await guest.locator("#boombox-power").fill("58");
  await guest.locator("#boombox-fire").click();
  await host.waitForFunction(() => document.querySelector("#boombox-match-status")?.textContent?.includes("Your turn"), null, { timeout: 8000 });
  await host.locator("#boombox-angle").fill("30");
  await host.locator("#boombox-power").fill("62");
  await host.locator("#boombox-fire").click();
  await guest.waitForFunction(() => document.querySelector("#boombox-match-status")?.textContent?.includes("Your turn") || !document.querySelector("#boombox-result-panel")?.hasAttribute("hidden"), null, { timeout: 10000 });
  if (!(await host.locator("#boombox-shot-log").innerText()).includes("Server log")) throw new Error("The third authoritative shot did not update the match log");
  console.log(`Boom Box browser acceptance passed: ${roomName}, two human seats, review summary, join flow, synchronized turns, and repeated authoritative shots.`);
} catch (error) {
  console.error("Boom Box browser acceptance failed", error);
  console.error("Host status:", await host.locator("#boombox-lobby-status").textContent().catch(() => "unavailable"), "Guest status:", await guest.locator("#boombox-lobby-status").textContent().catch(() => "unavailable"));
  await host.screenshot({ path: "boombox-browser-host-failure.png", fullPage: true }).catch(() => {});
  await guest.screenshot({ path: "boombox-browser-guest-failure.png", fullPage: true }).catch(() => {});
  throw error;
} finally {
  await hostContext.close();
  await guestContext.close();
  await browser.close();
}
