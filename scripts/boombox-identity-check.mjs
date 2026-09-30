import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4337;
const root = mkdtempSync(join(tmpdir(), "boombox-identity-"));
const historyPath = join(root, "history.json");
const roomPath = join(root, "rooms.json");
writeFileSync(historyPath, JSON.stringify([
  { gameId: "BB-0001", name: "Older record", finishedAt: "2026-09-29T00:00:00.000Z" },
  { gameId: "BB-0001", name: "Newer record", finishedAt: "2026-09-30T00:00:00.000Z" },
]));
writeFileSync(roomPath, "[]");
const env = { ...process.env, PORT: String(port), BOOM_BOX_HISTORY_STORE_PATH: historyPath, BOOM_BOX_ROOM_STORE_PATH: roomPath };
const server = spawn(process.execPath, ["server.mjs"], { env, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => {
  const socket = new WebSocket(`ws://localhost:${port}/boombox`);
  socket.messages = [];
  socket.on("message", (data) => { try { const message = JSON.parse(data.toString()); socket.messages.push(message); if (message.type === "boombox-flight-bundle" && message.bundleId) socket.send(JSON.stringify({ type: "boombox-flight-ack", bundleId: message.bundleId })); } catch {} });
  socket.once("open", () => resolve(socket));
  socket.once("error", reject);
});
const next = async (socket, type, predicate = () => true, timeout = 5000) => {
  const index = socket.messages.findIndex((message) => message.type === type && predicate(message));
  if (index >= 0) return socket.messages.splice(index, 1)[0];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`Timed out waiting for ${type}`)); }, timeout);
    const onMessage = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type || !predicate(message)) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); };
    socket.on("message", onMessage);
  });
};
const sendAndNext = async (socket, payload, type, predicate = () => true) => { const result = next(socket, type, predicate); socket.send(JSON.stringify(payload)); return result; };
const errorMessage = async (socket, payload) => (await sendAndNext(socket, payload, "boombox-error")).message;

try {
  await wait(700);
  const health = await (await fetch(`http://localhost:${port}/api/boombox-health`)).json();
  const history = await (await fetch(`http://localhost:${port}/api/boombox-history?limit=10`)).json();
  const ids = history.matches.map((match) => match.gameId);
  if (health.status !== "ok" || new Set(ids).size !== ids.length || !ids.includes("BB-0001") || !ids.some((id) => id.startsWith("BB-0001-legacy-"))) throw new Error(`History ID migration failed: ${JSON.stringify({ health, ids, file: readFileSync(historyPath, "utf8") })}`);

  const host = await open();
  const guest = await open();
  const sameName = "Alex";
  const hostId = "device-host";
  const guestId = "device-guest";
  const created = await sendAndNext(host, { type: "boombox-create", userId: hostId, config: { name: "Identity room", creator: sameName, seats: 2, aiFill: false, seed: 1101 } }, "boombox-created");
  if (created.gameId === "BB-0001" || created.gameId.includes("legacy")) throw new Error(`New room reused a historical ID: ${created.gameId}`);
  const joined = next(guest, "boombox-joined"); const hostStarted = next(host, "boombox-state", (message) => message.snapshot?.phase === "turn-prep"); guest.send(JSON.stringify({ type: "boombox-join", userId: guestId, gameId: created.gameId, name: sameName })); await joined; await hostStarted;
  const hijacker = await open();
  const hijackError = await errorMessage(hijacker, { type: "boombox-join", userId: hostId, gameId: created.gameId, sessionId: created.sessionId, name: sameName });
  if (!hijackError.includes("already connected")) throw new Error(`Connected-session takeover was not rejected: ${hijackError}`);
  hijacker.close(); host.close(); await wait(180);
  const resumed = await open();
  const resumedJoin = await sendAndNext(resumed, { type: "boombox-join", userId: hostId, gameId: created.gameId, sessionId: created.sessionId, name: sameName }, "boombox-joined");
  if (resumedJoin.seat !== 0) throw new Error("Creator session did not reclaim its original seat");

  const otherOwner = await open();
  const second = await sendAndNext(otherOwner, { type: "boombox-create", userId: "device-other", config: { name: "Other room", creator: "Other", seats: 2, aiFill: false, seed: 1102 } }, "boombox-created");
  const crossRoomError = await errorMessage(guest, { type: "boombox-join", userId: guestId, gameId: second.gameId, name: sameName });
  if (!crossRoomError.includes("already have an active")) throw new Error(`Cross-room membership was not rejected: ${crossRoomError}`);
  const cancelSecond = next(otherOwner, "boombox-cancelled"); otherOwner.send(JSON.stringify({ type: "boombox-cancel", userId: "device-other", gameId: second.gameId })); await cancelSecond;
  const cancelFirst = next(resumed, "boombox-cancelled"); resumed.send(JSON.stringify({ type: "boombox-cancel", userId: hostId, gameId: created.gameId })); await cancelFirst;
  await wait(180);
  const replacement = await sendAndNext(resumed, { type: "boombox-create", userId: hostId, config: { name: "Replacement room", creator: sameName, seats: 2, aiFill: true, seed: 1103 } }, "boombox-created");
  const start = next(resumed, "boombox-state", (message) => message.snapshot?.phase === "turn-prep"); resumed.send(JSON.stringify({ type: "boombox-start-ai", userId: hostId, gameId: replacement.gameId })); await start;
  const watcher = await open();
  const watching = await sendAndNext(watcher, { type: "boombox-watch", userId: "device-watcher", gameId: replacement.gameId }, "boombox-watching");
  if (watching.gameId !== replacement.gameId) throw new Error("Spectator did not enter the started room");
  watcher.send(JSON.stringify({ type: "boombox-watch-leave", userId: "device-watcher", gameId: replacement.gameId })); watcher.close();
  const cleanup = next(resumed, "boombox-cancelled"); resumed.send(JSON.stringify({ type: "boombox-cancel", userId: hostId, gameId: replacement.gameId })); await cleanup;
  guest.close(); resumed.close();
  console.log("Boom Box identity check passed: duplicate history IDs migrated, display-name collisions are isolated by device identity, session takeover is rejected, reconnect/cancel/cross-room rules hold, and spectator leave works.");
} finally {
  server.kill();
  await wait(150);
  rmSync(root, { recursive: true, force: true });
}
