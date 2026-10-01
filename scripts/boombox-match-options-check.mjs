import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";

const port = 4358;
const storeDir = mkdtempSync(join(tmpdir(), "boombox-match-options-"));
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), BOOM_BOX_ROOM_STORE_PATH: join(storeDir, "rooms.json") }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`ws://127.0.0.1:${port}/boombox`); socket.queue = []; socket.on("message", (data) => { const message = JSON.parse(data.toString()); socket.queue.push(message); if (message.type === "boombox-flight-bundle") socket.send(JSON.stringify({ type: "boombox-flight-ack", bundleId: message.bundleId })); }); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const next = (socket, type, predicate = () => true, timeout = 10000) => new Promise((resolve, reject) => { const take = () => { const index = socket.queue.findIndex((message) => message.type === type && predicate(message)); return index < 0 ? null : socket.queue.splice(index, 1)[0]; }; const queued = take(); if (queued) return resolve(queued); const timer = setInterval(() => { const message = take(); if (!message) return; clearInterval(timer); clearTimeout(limit); resolve(message); }, 10); const limit = setTimeout(() => { clearInterval(timer); const latest = socket.queue.filter((message) => message.type === "boombox-state").at(-1); reject(new Error(`Timed out waiting for ${type}; latest=${JSON.stringify({ phase: latest?.snapshot?.phase, round: latest?.snapshot?.round, turnSeat: latest?.snapshot?.turnSeat, health: latest?.snapshot?.players?.map((player) => player.health), log: latest?.snapshot?.log?.slice(-4) })}`)); }, timeout); });

try {
  await wait(600);
  const host = await open(); const guest = await open(); const hostId = `options-host-${Date.now()}`; const guestId = `options-guest-${Date.now()}`;
  host.send(JSON.stringify({ type: "boombox-create", userId: hostId, config: { creator: "Host", humanCount: 2, aiCount: 0, seats: 2, roundCount: 2, timerEnabled: false, windMode: "fixed", boundaries: ["stop", "bounce"], boundaryMode: "rotate", seed: 314159 } }));
  const created = await next(host, "boombox-created"); guest.send(JSON.stringify({ type: "boombox-join", userId: guestId, gameId: created.gameId, name: "Guest" })); await next(guest, "boombox-joined"); host.send(JSON.stringify({ type: "boombox-start-ai", userId: hostId, gameId: created.gameId })); const start = await next(host, "boombox-state", (message) => message.snapshot?.phase === "turn-prep");
  if (start.snapshot.round !== 1 || start.snapshot.rules.roundCount !== 2 || start.snapshot.rules.timerEnabled !== false || start.snapshot.turnDeadlineAt !== null || start.snapshot.boundary !== "stop") throw new Error("Round-one options were not authoritative");
  host.send(JSON.stringify({ type: "boombox-purchase", userId: hostId, purchaseId: "laser-pre-round", category: "weapon", item: "laser-line" })); await next(host, "boombox-purchase-result");
  host.send(JSON.stringify({ type: "boombox-action", userId: hostId, actionId: "host-laser", action: { targetIndex: 1, weapon: "laser-line", angle: 42, power: 58 } })); await next(host, "boombox-state", (message) => message.snapshot?.turnSeat === 1);
  host.send(JSON.stringify({ type: "boombox-purchase", userId: hostId, purchaseId: "active-buy", category: "weapon", item: "heavy-shell" })); const rejected = await next(host, "boombox-purchase-error"); if (!rejected.message.includes("only before a round")) throw new Error("An active-round purchase was not rejected");
  guest.send(JSON.stringify({ type: "boombox-action", userId: guestId, actionId: "guest-miss", action: { targetIndex: 0, weapon: "cannon", angle: 8, power: 25 } })); await wait(1500);
  host.send(JSON.stringify({ type: "boombox-action", userId: hostId, actionId: "host-finish", action: { targetIndex: 1, weapon: "cannon", angle: 42, power: 58 } })); const intermission = await next(host, "boombox-state", (message) => message.snapshot?.phase === "intermission");
  if (intermission.snapshot.round !== 1 || intermission.snapshot.roundWinner !== 0) throw new Error("Round one did not enter the shop intermission");
  host.send(JSON.stringify({ type: "boombox-next-round", userId: hostId, gameId: created.gameId })); guest.send(JSON.stringify({ type: "boombox-next-round", userId: guestId, gameId: created.gameId })); const roundTwo = await next(host, "boombox-state", (message) => message.snapshot?.round === 2 && message.snapshot?.phase === "turn-prep");
  if (roundTwo.snapshot.boundary !== "bounce" || roundTwo.snapshot.turnDeadlineAt !== null || !roundTwo.snapshot.players.every((player) => player.alive && player.health === player.maxHealth)) throw new Error("Round two did not rotate walls, keep the timer off, and reset tanks");
  host.close(); guest.close();
  console.log("Boom Box match options passed: two rounds, timer off, fixed-per-round wind, rotating walls, intermission shopping, and active-round purchase rejection.");
} finally { server.kill(); await wait(100); rmSync(storeDir, { recursive: true, force: true }); }
