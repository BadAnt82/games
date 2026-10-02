import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4344;
const storeDir = mkdtempSync(join(tmpdir(), "boombox-terrain-"));
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), BOOM_BOX_ROOM_STORE_PATH: join(storeDir, "rooms.json") }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`ws://localhost:${port}/boombox`); socket._messages = []; socket.on("message", (data) => { try { const message = JSON.parse(data.toString()); socket._messages.push(message); if (message.type === "boombox-flight-bundle" && message.bundleId) socket.send(JSON.stringify({ type: "boombox-flight-ack", bundleId: message.bundleId })); } catch {} }); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const take = (socket, type, predicate = () => true) => { const index = socket._messages.findIndex((message) => message.type === type && predicate(message)); return index >= 0 ? socket._messages.splice(index, 1)[0] : null; };
const next = (socket, type, predicate = () => true, timeout = 7000) => new Promise((resolve, reject) => { const queued = take(socket, type, predicate); if (queued) return resolve(queued); const timer = setTimeout(() => { socket.off("message", onMessage); const recent = socket._messages.slice(-12).map((message) => ({ type: message.type, message: message.message, phase: message.snapshot?.phase, actions: message.snapshot?.log?.slice(-2).map((entry) => entry.actionId || entry.kind) })); reject(new Error(`Timed out waiting for ${type}; recent messages: ${JSON.stringify(recent)}`)); }, timeout); const onMessage = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type || !predicate(message)) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); }; socket.on("message", onMessage); });
const started = async (socket, userId, config) => { const createdPromise = next(socket, "boombox-created"); socket.send(JSON.stringify({ type: "boombox-create", userId, config })); const created = await createdPromise; const statePromise = next(socket, "boombox-state"); socket.send(JSON.stringify({ type: "boombox-start-ai", userId, gameId: created.gameId })); const state = await statePromise; return { created, state }; };
const purchase = async (socket, userId, gameId, item, quantity = 1) => { const resultPromise = next(socket, "boombox-purchase-result"); socket.send(JSON.stringify({ type: "boombox-purchase", userId, gameId, purchaseId: `terrain-${item}-${Date.now()}`, category: "weapon", item, quantity })); return resultPromise; };
const fire = async (socket, userId, gameId, actionId, action) => { const flightPromise = next(socket, "boombox-flight-bundle", (message) => message.flights?.some((flight) => flight.seat === 0)); const statePromise = next(socket, "boombox-state", (message) => (message.snapshot?.log || []).some((entry) => entry.kind === "fire" && entry.actionId === actionId)); socket.send(JSON.stringify({ type: "boombox-action", userId, gameId, actionId, action })); const [flight, state] = await Promise.all([flightPromise, statePromise]); return { flight, state }; };
const reachIntermission = async (socket, userId, gameId, prefix) => {
  let result = await fire(socket, userId, gameId, `${prefix}-round-one-1`, { targetIndex: 1, weapon: "cannon", angle: 42, power: 58 });
  let state = result.state;
  if (state.snapshot.phase !== "intermission") state = await next(socket, "boombox-state", (message) => message.snapshot?.phase === "intermission" || (message.snapshot?.turnSeat === 0 && message.snapshot?.log?.some((entry) => entry.actionId === `${prefix}-round-one-1`)), 10000);
  if (state.snapshot.phase !== "intermission") {
    result = await fire(socket, userId, gameId, `${prefix}-round-one-2`, { targetIndex: 1, weapon: "cannon", angle: 42, power: 58 });
    state = result.state.snapshot.phase === "intermission" ? result.state : await next(socket, "boombox-state", (message) => message.snapshot?.phase === "intermission", 10000);
  }
  return state;
};
const startRoundTwo = async (socket, userId, gameId) => { const statePromise = next(socket, "boombox-state", (message) => message.snapshot?.round === 2 && message.snapshot?.phase === "turn-prep", 10000); socket.send(JSON.stringify({ type: "boombox-next-round", userId, gameId })); return statePromise; };

try {
  await wait(700);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  for (const boundary of ["stop", "bounce", "wrap"]) {
    const socket = await open();
    try {
      const userId = `terrain-boundary-${boundary}-${suffix}`;
      const { created } = await started(socket, userId, { name: `Boundary ${boundary}`, creator: "Terrain", seats: 2, aiFill: true, fullCatalogue: true, gravity: 60, boundary, seed: 7811, roundCount: 2, timerEnabled: false, startingMoney: 10000 });
      await reachIntermission(socket, userId, created.gameId, `boundary-${boundary}`);
      await purchase(socket, userId, created.gameId, "piercing-round");
      await startRoundTwo(socket, userId, created.gameId);
      const result = await fire(socket, userId, created.gameId, `boundary-${boundary}`, { targetIndex: 1, weapon: "piercing-round", angle: 25, power: 95 });
      const child = result.flight.flights[0].children[0];
      if (boundary === "bounce" && Number(child.bounces) < 1) throw new Error("boundary bounce did not reflect a terrain-ignoring shell");
      if (boundary === "stop" && (child.impact !== "bounds" || Number(child.bounces) !== 0)) throw new Error(`stop boundary changed unexpectedly: ${JSON.stringify(child)}`);
      if (boundary === "wrap" && !child.path.some((point, index) => index > 0 && Math.abs(point.x - child.path[index - 1].x) > 500)) throw new Error("wrap boundary did not cross the horizontal edge");
      console.log(`Boom Box ${boundary} boundary passed.`);
    } finally { socket.close(); }
  }

  const fallSocket = await open();
  try {
    const userId = `terrain-fall-${suffix}`;
    const { created } = await started(fallSocket, userId, { name: "Terrain fall", creator: "Terrain", seats: 2, aiFill: true, fullCatalogue: true, gravity: 150, boundary: "stop", seed: 314159, startingMoney: 10000, roundCount: 2, timerEnabled: false });
    await reachIntermission(fallSocket, userId, created.gameId, "terrain-fall");
    await purchase(fallSocket, userId, created.gameId, "terrain-remover", 2);
    await startRoundTwo(fallSocket, userId, created.gameId);
    const first = await fire(fallSocket, userId, created.gameId, "terrain-fall-1", { targetIndex: 1, weapon: "terrain-remover", angle: 42, power: 58 });
    const firstFall = first.state.snapshot.log.find((entry) => entry.kind === "fall" && entry.seat === 1);
    if (!firstFall || !Number.isFinite(firstFall.distance)) throw new Error(`terrain fall was not recorded: ${JSON.stringify(firstFall)}`);
    if (first.state.snapshot.phase !== "finished") {
      await next(fallSocket, "boombox-state", (message) => message.snapshot?.turnSeat === 0 && message.snapshot.log.some((entry) => entry.actionId === "terrain-fall-1"));
      const second = await fire(fallSocket, userId, created.gameId, "terrain-fall-2", { targetIndex: 1, weapon: "terrain-remover", angle: 42, power: 58 });
      const chainedFall = second.state.snapshot.log.find((entry) => entry.kind === "fall" && entry.seat === 1);
      if (!chainedFall || !Number.isFinite(chainedFall.distance)) throw new Error(`chained terrain fall was not recorded: ${JSON.stringify({ firstFall, player: second.state.snapshot.players[1] })}`);
      console.log(`Boom Box terrain fall passed: ${Math.round(firstFall.distance)}px first drop and ${Math.round(chainedFall.distance)}px chained drop.`);
    } else console.log(`Boom Box terrain fall passed: ${Math.round(firstFall.distance)}px drop caused a finished room.`);
  } finally { fallSocket.close(); }
} finally { server.kill(); await wait(150); rmSync(storeDir, { recursive: true, force: true }); }
