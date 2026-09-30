import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4342;
const storeDir = mkdtempSync(join(tmpdir(), "boombox-ai-strategy-"));
const storePath = join(storeDir, "rooms.json");
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), BOOM_BOX_ROOM_STORE_PATH: storePath }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`ws://localhost:${port}/boombox`); socket._messages = []; socket.on("message", (data) => { try { const message = JSON.parse(data.toString()); socket._messages.push(message); if (message.type === "boombox-flight-bundle" && message.bundleId) socket.send(JSON.stringify({ type: "boombox-flight-ack", bundleId: message.bundleId })); } catch {} }); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const take = (socket, type, predicate = () => true) => { const index = socket._messages.findIndex((message) => message.type === type && predicate(message)); return index >= 0 ? socket._messages.splice(index, 1)[0] : null; };
const next = (socket, type, predicate = () => true, timeout = 8000) => new Promise((resolve, reject) => { const queued = take(socket, type, predicate); if (queued) return resolve(queued); const timer = setTimeout(() => { socket.off("message", onMessage); const latest = socket._messages.filter((message) => message.type === "boombox-state").at(-1); const errors = socket._messages.filter((message) => message.type === "boombox-error").map((message) => message.message); reject(new Error(`Timed out waiting for ${type}; messages=${socket._messages.map((message) => message.type).join(",")}; errors=${errors.join("|")}; latest=${JSON.stringify({ phase: latest?.snapshot?.phase, turnSeat: latest?.snapshot?.turnSeat, log: latest?.snapshot?.log?.slice(-5) })}`)); }, timeout); const onMessage = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type || !predicate(message)) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); }; socket.on("message", onMessage); });
const created = async (socket, userId, difficulty, movement) => { const createdPromise = next(socket, "boombox-created"); socket.send(JSON.stringify({ type: "boombox-create", userId, config: { name: `AI ${difficulty} ${movement ? "move" : "still"}`, creator: "Strategy Host", seats: 2, aiFill: true, aiDifficulty: difficulty, movement, startingMoney: 10000, pace: "blitz", seed: 7411 + difficulty.length + (movement ? 1 : 0) } })); const room = await createdPromise; const statePromise = next(socket, "boombox-state"); socket.send(JSON.stringify({ type: "boombox-start-ai", userId, gameId: room.gameId })); const state = await statePromise; return { room, state }; };
const nextAiUtility = async (socket, userId, gameId, actionId, lastUtilitySequence = 0) => { socket._messages = []; const responsePromise = next(socket, "boombox-state", (message) => (message.snapshot.log || []).some((entry) => entry.seat === 1 && entry.kind === "utility" && entry.sequence > lastUtilitySequence)); socket.send(JSON.stringify({ type: "boombox-action", userId, gameId, actionId, action: { targetIndex: 1, weapon: "cannon", angle: 8, power: 25 } })); const response = await responsePromise; return { event: response.snapshot.log.filter((entry) => entry.seat === 1 && entry.kind === "utility" && entry.sequence > lastUtilitySequence).at(-1), player: response.snapshot.players[1] }; };

try {
  await wait(700);
  for (const difficulty of ["recruit", "veteran", "ace", "expert"]) {
    const userId = `ai-strategy-${difficulty}-${Date.now()}`; const socket = await open();
    try {
      const { room, state } = await created(socket, userId, difficulty, false); console.log(`${difficulty}: started turn=${state.snapshot.turnSeat}`);
      let lastSequence = 0; const utilities = []; let latestPlayer = null;
      for (let step = 1; step <= 6 && !(utilities.includes("guidance-kit") && utilities.includes("turret-upgrade")); step += 1) { const result = await nextAiUtility(socket, userId, room.gameId, `${difficulty}-${step}`, lastSequence); utilities.push(result.event.utility); lastSequence = result.event.sequence; latestPlayer = result.player; }
      if (utilities[0] !== "shield" || !utilities.includes("guidance-kit") || !utilities.includes("turret-upgrade")) throw new Error(`${difficulty}: expected shield, guidance-kit, and turret-upgrade; saw ${utilities.join(", ")}`);
      console.log(`Boom Box AI ${difficulty} strategy passed: ${utilities.join(" -> ")} (upgrades ${JSON.stringify(latestPlayer?.upgrades)}).`);
    } finally { socket.close(); }
  }
  const movementUser = `ai-strategy-movement-${Date.now()}`; const movementSocket = await open();
  try {
    const { room } = await created(movementSocket, movementUser, "expert", true); const first = await nextAiUtility(movementSocket, movementUser, room.gameId, "movement-1"); if (first.event.utility !== "shield") throw new Error(`movement: utility priority was bypassed by ${first.event.utility}`); console.log("Boom Box AI movement strategy passed: utility protection resolves before repositioning.");
  } finally { movementSocket.close(); }
} finally { server.kill(); await wait(150); rmSync(storeDir, { recursive: true, force: true }); }
