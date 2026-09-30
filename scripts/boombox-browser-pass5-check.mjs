import { chromium } from "playwright";

const base = process.env.BOOMBOX_BROWSER_URL || "https://games.badantproductions.com/";
const browser = await chromium.launch({ headless: true });
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const roomName = `P5-${suffix}`;
const contexts = [];

async function openLobby(page) {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.locator("#select-boombox").waitFor({ state: "visible", timeout: 12000 });
  await page.locator("#select-boombox").click();
  await page.locator("#boombox-mode-multi").click();
  await page.locator("#boombox-lobby-panel").waitFor({ state: "visible", timeout: 12000 });
}

async function newCommander(name) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  contexts.push(context);
  await context.addInitScript(({ playerName }) => localStorage.setItem("badant-games-player-name", playerName), { playerName: name });
  return context.newPage();
}

async function createHumanRoom(page) {
  await page.locator("#boombox-create").click();
  await page.locator("#boombox-room-name").fill(roomName);
  await page.locator("#boombox-seats").selectOption("4");
  await page.locator("#boombox-create-next").click();
  await page.locator("#boombox-seat-plan").waitFor({ state: "visible" });
  const seats = page.locator("#boombox-seat-plan select");
  if (await seats.count() !== 4) throw new Error(`Pass 5 room rendered ${await seats.count()} seat controls`);
  for (let index = 1; index < 4; index += 1) await seats.nth(index).selectOption("human");
  await page.locator("#boombox-create-next").click();
  if (!(await page.locator("#boombox-create-summary").innerText()).includes("S4 Human")) throw new Error("Pass 5 review did not preserve four human seats");
  await page.locator("#boombox-create-submit").click();
  await page.locator(`#boombox-created-list article:has-text("${roomName}")`).waitFor({ state: "visible", timeout: 12000 });
}

async function joinRoom(page) {
  await openLobby(page);
  const card = page.locator("#boombox-available-list article", { hasText: roomName }).first();
  await card.waitFor({ state: "visible", timeout: 12000 });
  await card.getByRole("button", { name: "Join room" }).click();
}

async function submitTurn(page, label) {
  await page.waitForFunction(() => document.querySelector("#boombox-match-status")?.textContent?.includes("Your turn"), null, { timeout: 15000 });
  await page.locator("#boombox-angle").fill("8");
  await page.locator("#boombox-power").fill("25");
  await page.locator("#boombox-fire").click();
  await page.waitForFunction(() => !document.querySelector("#boombox-match-status")?.textContent?.includes("Your turn"), null, { timeout: 8000 }).catch(() => {});
  const status = await page.locator("#boombox-match-status").innerText();
  if (status.includes("rejected") || status.includes("error")) throw new Error(`${label} received an action error: ${status}`);
}

try {
  const host = await newCommander(`Pass5 Host ${suffix}`);
  const guestOne = await newCommander(`Pass5 One ${suffix}`);
  const guestTwo = await newCommander(`Pass5 Two ${suffix}`);
  const guestThree = await newCommander(`Pass5 Three ${suffix}`);
  await openLobby(host);
  await createHumanRoom(host);
  for (const page of [guestOne, guestTwo, guestThree]) await joinRoom(page);
  for (const page of [host, guestOne, guestTwo, guestThree]) await page.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 15000 });

  // Three complete four-seat rounds exercise turn cycling and long-running synchronization.
  const commanders = [host, guestOne, guestTwo, guestThree];
  for (let round = 1; round <= 3; round += 1) for (let seat = 0; seat < commanders.length; seat += 1) await submitTurn(commanders[seat], `round ${round} seat ${seat + 1}`);
  const spectator = await newCommander(`Pass5 Spectator ${suffix}`);
  await openLobby(spectator);
  const watchedCard = spectator.locator("#boombox-available-list article", { hasText: roomName }).first();
  await watchedCard.waitFor({ state: "visible", timeout: 12000 });
  await watchedCard.getByRole("button", { name: "Watch room" }).click();
  await spectator.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 12000 });
  await spectator.waitForFunction(() => document.querySelector("#boombox-match-status")?.textContent?.includes("Spectating"), null, { timeout: 8000 });

  // Reconnect the second commander with its persisted room/session identity.
  const guestContext = contexts[1];
  await guestOne.close();
  const reconnectedGuest = await guestContext.newPage();
  await openLobby(reconnectedGuest);
  await reconnectedGuest.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 15000 });
  const reconnectStatus = await reconnectedGuest.locator("#boombox-match-status").innerText();
  if (reconnectStatus.includes("Room service unavailable")) throw new Error("Reconnected commander did not restore the room service");

  // Cancellation is tested with a separate owner so it is independent of the active match.
  const cancelOwner = await newCommander(`Pass5 Cancel ${suffix}`);
  await openLobby(cancelOwner);
  const cancelRoom = `Cancel-${suffix}`;
  await cancelOwner.locator("#boombox-create").click();
  await cancelOwner.locator("#boombox-room-name").fill(cancelRoom);
  await cancelOwner.locator("#boombox-create-next").click();
  await cancelOwner.locator("#boombox-create-next").click();
  await cancelOwner.locator("#boombox-create-submit").click();
  const cancelCard = cancelOwner.locator(`#boombox-created-list article:has-text("${cancelRoom}")`);
  await cancelCard.waitFor({ state: "visible", timeout: 12000 });
  await cancelCard.getByRole("button", { name: "Cancel room" }).click();
  await cancelCard.waitFor({ state: "detached", timeout: 12000 });
  console.log(`Boom Box Pass 5 browser acceptance passed: four-human long run, spectator view, reconnect resume, and owner cancellation (${roomName}).`);
} catch (error) {
  console.error("Boom Box Pass 5 browser acceptance failed", error);
  for (const [index, context] of contexts.entries()) {
    const page = context.pages()[0];
    if (page) console.error(`page${index + 1}`, await page.locator("#boombox-lobby-status").textContent().catch(() => "unavailable"), await page.locator("#boombox-match-status").textContent().catch(() => "unavailable"), await page.locator("#boombox-canvas").isVisible().catch(() => false));
  }
  throw error;
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close();
}
