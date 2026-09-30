import { chromium } from "playwright";
import { existsSync } from "node:fs";

const base = process.env.BOOMBOX_BROWSER_URL || "https://games.badantproductions.com/";
const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
});
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const contexts = [];

async function commander(name, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  contexts.push(context);
  await context.addInitScript(({ playerName }) => localStorage.setItem("badant-games-player-name", playerName), { playerName: name });
  return context.newPage();
}

async function openMode(page, mode) {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.locator("#select-boombox").waitFor({ state: "visible", timeout: 12000 });
  await page.locator("#select-boombox").click();
  await page.locator(`#boombox-mode-${mode}`).click();
}

async function createTwoSeatRoom(page, mode, roomName) {
  const storedRoomName = roomName.slice(0, 28);
  await page.locator("#boombox-create").click();
  await page.locator("#boombox-room-name").fill(roomName);
  await page.locator("#boombox-seats").selectOption("2");
  await page.locator("#boombox-firing-mode").selectOption(mode);
  await page.locator("#boombox-create-next").click();
  const seatControls = page.locator("#boombox-seat-plan select");
  if (await seatControls.count() !== 2) throw new Error(`2-seat setup rendered ${await seatControls.count()} seat controls`);
  await seatControls.nth(1).selectOption("human");
  await page.locator("#boombox-create-next").click();
  const summary = await page.locator("#boombox-create-summary").innerText();
  if (!summary.includes("S2 Human") || !summary.toLowerCase().includes(mode)) throw new Error(`2-seat review lost ${mode} configuration: ${summary}`);
  await page.locator("#boombox-create-submit").click();
  await page.locator(`#boombox-created-list article:has-text("${storedRoomName}")`).waitFor({ state: "visible", timeout: 12000 });
  return page.locator(`#boombox-created-list article:has-text("${storedRoomName}")`).first();
}

try {
  // The advertised smallest all-human room and every firing mode are exercised through the UI.
  const host = await commander(`E Host ${suffix}`);
  const guest = await commander(`E Guest ${suffix}`);
  await openMode(host, "multi");
  const rooms = [];
  for (const mode of ["sequential", "synchronous", "simultaneous"]) {
    const card = await createTwoSeatRoom(host, mode, `E-${mode}-${suffix}`);
    const cardText = await card.innerText();
    if (!cardText.toLowerCase().includes(`${mode} fire`)) throw new Error(`Lobby card omitted ${mode} firing mode`);
    rooms.push(card);
    if (mode !== "simultaneous") {
      await card.getByRole("button", { name: "Cancel room" }).click();
      await card.waitFor({ state: "detached", timeout: 10000 });
    }
  }
  const roomName = `E-simultaneous-${suffix}`.slice(0, 28);
  await openMode(guest, "multi");
  const available = guest.locator("#boombox-available-list article", { hasText: roomName }).first();
  await available.waitFor({ state: "visible", timeout: 12000 });
  if (!(await available.innerText()).includes(`Created by E Host`)) throw new Error("Available room omitted the creator name");
  await available.getByRole("button", { name: "Join room" }).click();
  for (const page of [host, guest]) {
    await page.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 12000 });
    const status = await page.locator("#boombox-match-status").innerText();
    if (!status || status.includes("unavailable")) throw new Error(`2-seat ${page === host ? "host" : "guest"} match did not become usable`);
  }
  await rooms.at(-1).getByRole("button", { name: "Cancel room" }).count().catch(() => {});

  // Portrait and landscape must retain a usable, scrollable setup surface without horizontal clipping.
  for (const [label, viewport] of [["portrait", { width: 390, height: 844 }], ["landscape", { width: 844, height: 390 }]]) {
    const page = await commander(`E ${label} ${suffix}`, viewport);
    await openMode(page, "multi");
    await page.locator("#boombox-create").click();
    const metrics = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight }));
    if (metrics.scrollWidth > metrics.viewport + 2) throw new Error(`${label} setup has horizontal clipping: ${JSON.stringify(metrics)}`);
    if (metrics.scrollHeight <= metrics.clientHeight) throw new Error(`${label} setup is not scrollable: ${JSON.stringify(metrics)}`);
    await page.locator("#boombox-room-name").focus();
    const focusId = await page.evaluate(() => document.activeElement?.id || "");
    if (focusId !== "boombox-room-name") throw new Error(`${label} setup focus order did not enter the room name`);
  }

  console.log(`Boom Box Package E acceptance passed: 2-seat all-human setup, sequential/synchronous/simultaneous UI, creator visibility, live launch, portrait/landscape overflow, scrolling, and focus (${suffix}).`);
} catch (error) {
  const details = [];
  for (const context of contexts) {
    const page = context.pages()[0];
    if (!page) continue;
    details.push({
      lobby: await page.locator("#boombox-lobby-status").textContent().catch(() => ""),
      mode: await page.locator("#boombox-mode-panel").isVisible().catch(() => false),
      create: await page.locator("#boombox-create-panel").isVisible().catch(() => false),
      created: await page.locator("#boombox-created-list").innerText().catch(() => ""),
    });
  }
  console.error("Boom Box Package E acceptance failed", error, details);
  throw error;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
