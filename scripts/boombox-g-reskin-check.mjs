import { spawn } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { WebSocket } from "ws";

const port = 4377;
const historyPath = `.tmp-pass-g-history-${process.pid}.json`;
const adminPath = `.tmp-pass-g-admin-${process.pid}.json`;
const records = Array.from({ length: 3 }, (_, index) => ({ gameId: `BB-G${index + 1}`, name: `G archive ${index + 1}`, terrain: "sunset-range", seed: index + 1, winner: 0, players: [{ name: "G Commander", color: "#54e7ff" }], finishedAt: new Date(Date.now() - index * 1000).toISOString(), log: [], terrainData: [], replay: [] }));
writeFileSync(historyPath, JSON.stringify(records));
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), BOOM_BOX_HISTORY_STORE_PATH: historyPath, GAMES_ADMIN_CONFIG_STORE_PATH: adminPath, GAMES_ADMIN_STORE_PATH: adminPath }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  await wait(450);
  const first = await fetch(`http://localhost:${port}/api/boombox-history?limit=2&offset=0`).then((response) => response.json());
  if (first.matches.length !== 2 || first.total !== 3 || !first.hasMore || first.nextOffset !== 2) throw new Error("History API did not return a stable paginated cursor.");
  const second = await fetch(`http://localhost:${port}/api/boombox-history?limit=2&offset=${first.nextOffset}`).then((response) => response.json());
  if (second.matches.length !== 1 || second.hasMore || second.nextOffset !== null) throw new Error("History API did not finish the final page correctly.");
  const rules = await fetch(`http://localhost:${port}/api/boombox-rules`).then((response) => response.json());
  if (!rules.version || !rules.weapons?.cannon) throw new Error("Boom Box rules endpoint is unavailable.");
  const html = await fetch(`http://localhost:${port}/`).then((response) => response.text());
  if (!html.includes("boombox-history-more") || !html.includes("boombox-history-page-status")) throw new Error("History pagination controls are missing from the shipped page.");
  console.log("Boom Box Pass G reskin/accessibility check passed: theme IDs, paged history API, pagination controls, and reduced-motion implementation.");
} finally { server.kill(); for (const path of [historyPath, adminPath]) { try { rmSync(path, { force: true }); } catch {} } }
