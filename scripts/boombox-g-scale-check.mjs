import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { WebSocket } from "ws";

const port = 4397;
const root = mkdtempSync(join(tmpdir(), "boombox-g-"));
const historyPath = join(root, "history.json");
const roomPath = join(root, "rooms.json");
const seedHistory = Array.from({ length: 120 }, (_, index) => ({ gameId: `G-SEED-${String(index + 1).padStart(3, "0")}`, name: "Scale fixture", finishedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), players: [], placements: [], replay: [], log: [] }));
writeFileSync(historyPath, JSON.stringify(seedHistory));
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), BOOM_BOX_HISTORY_STORE_PATH: historyPath, BOOM_BOX_ROOM_STORE_PATH: roomPath, BOOMBOX_TURN_TIMEOUT_MS: "700" }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const next = (socket, type, predicate = () => true, timeout = 15000) => new Promise((resolve, reject) => {
  const queued = (socket.messages || []).find((message) => message.type === type && predicate(message));
  if (queued) { socket.messages.splice(socket.messages.indexOf(queued), 1); resolve(queued); return; }
  const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`Timed out waiting for ${type}`)); }, timeout);
  const onMessage = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type || !predicate(message)) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); };
  socket.on("message", onMessage);
});
const open = () => new Promise((resolve, reject) => {
  const socket = new WebSocket(`ws://localhost:${port}/boombox`); socket.messages = [];
  socket.on("message", (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } socket.messages.push(message); if (message.type === "boombox-flight-bundle" && message.bundleId) socket.send(JSON.stringify({ type: "boombox-flight-ack", bundleId: message.bundleId })); });
  socket.once("open", () => resolve(socket)); socket.once("error", reject);
});
const send = (socket, payload) => socket.send(JSON.stringify(payload));
const waitForHealth = async () => { for (let index = 0; index < 30; index += 1) { try { const response = await fetch(`http://localhost:${port}/api/boombox-health`); if (response.ok) return; } catch {} await wait(100); } throw new Error("Local Boom Box server did not become healthy"); };

try {
  await waitForHealth();
  const archiveStart = performance.now();
  const seededHealth = await (await fetch(`http://localhost:${port}/api/boombox-health`)).json();
  const seededList = await (await fetch(`http://localhost:${port}/api/boombox-history?limit=50`)).json();
  const archiveMs = performance.now() - archiveStart;
  const persistedSeed = JSON.parse(readFileSync(historyPath, "utf8"));
  if (seededHealth.completedMatches !== 100 || seededList.matches.length !== 50 || persistedSeed.length !== 100) throw new Error(`Archive bound failed: ${JSON.stringify({ seededHealth, list: seededList.matches.length, persisted: persistedSeed.length })}`);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const host = await open();
  const owner = `g-owner-${suffix}`;
  const createdPromise = next(host, "boombox-created");
  const createStart = performance.now();
  send(host, { type: "boombox-create", userId: owner, config: { name: `G-${suffix}`, creator: "Scale Owner", seats: 10, aiFill: true, aiDifficulty: "expert", firingMode: "simultaneous", pace: "blitz", startingMoney: 10000, fullCatalogue: true, events: { meteorShower: true, scenery: true }, seed: 707070 } });
  const created = await createdPromise;
  const initialStatePromise = next(host, "boombox-state");
  send(host, { type: "boombox-start-ai", userId: owner, gameId: created.gameId });
  const initial = await initialStatePromise;
  const snapshotBytes = Buffer.byteLength(JSON.stringify(initial.snapshot));
  if (initial.snapshot.players.length !== 10 || initial.snapshot.rules?.seats !== 10 || initial.snapshot.rules?.firingMode !== "simultaneous") throw new Error("10-seat authoritative setup did not preserve the configured room");

  const purchasePromise = next(host, "boombox-purchase-result");
  send(host, { type: "boombox-purchase", userId: owner, gameId: created.gameId, purchaseId: "g-mirv", category: "weapon", item: "mirv", quantity: 1 });
  await purchasePromise;
  const mirvStatePromise = next(host, "boombox-state", (message) => message.snapshot?.log?.some((entry) => entry.kind === "fire" && entry.weapon === "mirv"), 20000);
  send(host, { type: "boombox-action", userId: owner, gameId: created.gameId, actionId: "g-mirv-fire", action: { targetIndex: 1, weapon: "mirv", angle: 42, power: 58 } });
  const mirvState = await mirvStatePromise;
  const mirvEvent = mirvState.snapshot.log.find((entry) => entry.kind === "fire" && entry.weapon === "mirv");
  if (!mirvEvent || mirvEvent.children !== 3 || mirvEvent.childImpacts?.length !== 3 || mirvEvent.childPaths?.length !== 3) throw new Error("Large child-projectile resolution was not retained in the authoritative log");

  const watcher = await open();
  const watchingPromise = next(watcher, "boombox-watching");
  const watcherStatePromise = next(watcher, "boombox-state");
  send(watcher, { type: "boombox-watch", userId: `g-watcher-${suffix}`, gameId: created.gameId });
  await watchingPromise; await watcherStatePromise;
  const aiOnlyStatePromise = next(watcher, "boombox-state", (message) => (message.snapshot?.log || []).filter((entry) => entry.kind === "fire" && entry.seat !== 0).length >= 3 && (message.snapshot?.log || []).some((entry) => entry.kind === "disconnect" && entry.seat === 0), 30000);
  host.close();
  const aiOnlyState = await aiOnlyStatePromise;
  watcher.close();
  if (!aiOnlyState.snapshot.log.some((entry) => entry.kind === "fire" && entry.seat !== 0)) throw new Error("AI-vs-AI continuation did not continue after the human owner disconnected");

  const matchMs = performance.now() - createStart;
  const archiveHost = await open();
  const archiveGuest = await open();
  const archiveOwner = `g-archive-owner-${suffix}`;
  const archiveCreatedPromise = next(archiveHost, "boombox-created");
  send(archiveHost, { type: "boombox-create", userId: archiveOwner, config: { name: `G archive ${suffix}`, creator: "Archive Owner", seats: 2, aiFill: false, seed: 808080 } });
  const archiveCreated = await archiveCreatedPromise;
  const archiveJoinedPromise = next(archiveGuest, "boombox-joined");
  send(archiveGuest, { type: "boombox-join", userId: `g-archive-guest-${suffix}`, gameId: archiveCreated.gameId, name: "Archive Guest" });
  await archiveJoinedPromise;
  await next(archiveHost, "boombox-state");
  const archiveFirst = next(archiveHost, "boombox-state", (message) => message.snapshot?.turn >= 2);
  send(archiveHost, { type: "boombox-action", userId: archiveOwner, gameId: archiveCreated.gameId, actionId: "g-archive-first", action: { targetIndex: 1, weapon: "cannon", angle: 42, power: 58 } });
  await archiveFirst;
  const archiveSecond = next(archiveHost, "boombox-state", (message) => message.snapshot?.phase === "finished", 20000);
  send(archiveHost, { type: "boombox-action", userId: archiveOwner, gameId: archiveCreated.gameId, actionId: "g-archive-second", action: { targetIndex: 1, weapon: "cannon", angle: 30, power: 62 } });
  const finishedArchive = await archiveSecond;
  if (!Array.isArray(finishedArchive.snapshot.placements)) throw new Error("Archive fixture did not produce final standings");
  const historyResponse = await fetch(`http://localhost:${port}/api/boombox-history?gameId=${encodeURIComponent(archiveCreated.gameId)}`);
  const history = await historyResponse.json();
  const record = history.matches?.[0];
  if (!record || !Array.isArray(record.replay) || !Array.isArray(record.terrainData) || !Array.isArray(record.placements)) throw new Error("Completed match record did not retain replay, terrain, and standings data");
  archiveHost.close(); archiveGuest.close();
  const archiveAfter = await (await fetch(`http://localhost:${port}/api/boombox-health`)).json();
  if (archiveAfter.completedMatches > 100) throw new Error(`Archive grew beyond the 100-record bound: ${archiveAfter.completedMatches}`);
  console.log(`Boom Box Package G scale check passed: archive read ${archiveMs.toFixed(1)}ms (100 persisted / 50 API page), 10-seat snapshot ${snapshotBytes} bytes, child impacts ${mirvEvent.childImpacts.length}, AI continuation after disconnect, and match setup/resolution ${matchMs.toFixed(1)}ms.`);
} finally {
  server.kill();
  await wait(250);
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}
