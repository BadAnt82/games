import { chromium } from "playwright";

const base = process.env.BOOMBOX_BROWSER_URL || "https://games.badantproductions.com/";
const browser = await chromium.launch({ headless: true });
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function openLobby(page) {
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.locator("#select-boombox").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#select-boombox").click();
  await page.locator("#boombox-mode-multi").click();
  await page.locator("#boombox-lobby-panel").waitFor({ state: "visible" });
}

async function runSeatMatrix(seats) {
  const contexts = [];
  const pages = [];
  const roomName = `M${seats}-${suffix}`;
  try {
    for (let index = 0; index < seats; index += 1) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.addInitScript(({ name }) => localStorage.setItem("badant-games-player-name", name), { name: `Matrix ${seats} P${index + 1} ${suffix}` });
      contexts.push(context);
      pages.push(await context.newPage());
    }
    const host = pages[0];
    await openLobby(host);
    await host.locator("#boombox-create").click();
    await host.locator("#boombox-room-name").fill(roomName);
    await host.locator("#boombox-seats").selectOption(String(seats));
    await host.locator("#boombox-create-next").click();
    await host.locator("#boombox-human-count").selectOption(String(seats));
    await host.locator("#boombox-ai-count").selectOption("0");
    await host.locator("#boombox-seat-plan").waitFor({ state: "visible" });
    const controls = host.locator("#boombox-seat-plan .boombox-seat-plan-item");
    if (await controls.count() !== seats) throw new Error(`${seats}-seat setup rendered ${await controls.count()} seat summaries`);
    await host.locator("#boombox-create-next").click();
    if (!(await host.locator("#boombox-create-summary").innerText()).includes(`${seats} human`)) throw new Error(`${seats}-seat review omitted the last human seat`);
    await host.locator("#boombox-create-submit").click();
    await host.locator(`#boombox-created-list article:has-text("${roomName}")`).waitFor({ state: "visible", timeout: 15000 });

    for (let index = 1; index < seats; index += 1) {
      const guest = pages[index];
      await openLobby(guest);
      const card = guest.locator("#boombox-available-list article", { hasText: roomName }).first();
      await card.waitFor({ state: "visible", timeout: 8000 });
      if (!(await card.innerText()).includes(`Matrix ${seats} P1`)) throw new Error(`${seats}-seat lobby did not show its creator name`);
      await card.getByRole("button", { name: "Join room" }).click();
    }
    for (const page of pages) {
      await page.locator("#boombox-canvas").waitFor({ state: "visible", timeout: 12000 });
      await page.locator("#boombox-match-status").waitFor({ state: "visible", timeout: 3000 });
      const opponents = await page.locator("#boombox-opponent-health-list > *").count();
      if (opponents < seats - 1) throw new Error(`${seats}-seat match rendered only ${opponents} opponent health rows`);
    }
    if (!(await host.locator("#boombox-match-status").innerText()).includes("Your turn")) throw new Error(`${seats}-seat match did not assign the opening turn`);
    console.log(`Boom Box ${seats}-human browser matrix passed: setup, creator label, all joins, synchronized canvas, opponent rows, and opening turn.`);
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
  }
}

async function runAccessibilityLayoutCheck() {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => localStorage.setItem("badant-games-player-name", "Matrix Layout"));
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.locator("#select-boombox").click();
    await page.locator("#boombox-mode-single").click();
    await page.locator("#boombox-single-panel").waitFor({ state: "visible" });
    const layout = await page.evaluate(() => ({ viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches }));
    if (layout.scrollWidth > layout.viewport + 2 || !layout.reduced) throw new Error(`Landscape/reduced-motion layout failed: ${JSON.stringify(layout)}`);
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id || "" }));
    if (focus.tag === "BODY" || !focus.id) throw new Error(`Keyboard focus did not enter a named control: ${JSON.stringify(focus)}`);
    console.log(`Boom Box landscape/reduced-motion/keyboard check passed: ${layout.viewport}px viewport, no horizontal overflow, focus on #${focus.id}.`);
  } finally {
    await context.close();
  }
}

try {
  for (const seats of [4, 6, 10]) await runSeatMatrix(seats);
  await runAccessibilityLayoutCheck();
} finally {
  await browser.close();
}
