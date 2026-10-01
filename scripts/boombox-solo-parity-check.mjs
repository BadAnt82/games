import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4338;
const liveUrl = process.env.BOOMBOX_LIVE_URL || "";
const server = liveUrl ? null : spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
const endpoint = liveUrl || `ws://localhost:${port}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => {
  const socket = new WebSocket(`${endpoint}/boombox`);
  socket._messages = [];
  socket.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      socket._messages.push(message);
      if (message.type === "boombox-flight-bundle" && message.bundleId) socket.send(JSON.stringify({ type: "boombox-flight-ack", gameId: message.gameId, bundleId: message.bundleId }));
    } catch {}
  });
  socket.once("open", () => resolve(socket));
  socket.once("error", reject);
});
const take = (socket, type, predicate = () => true) => {
  const index = socket._messages.findIndex((message) => message.type === type && predicate(message));
  return index < 0 ? null : socket._messages.splice(index, 1)[0];
};
const next = (socket, type, predicate = () => true, timeout = 12000) => new Promise((resolve, reject) => {
  const queued = take(socket, type, predicate);
  if (queued) return resolve(queued);
  const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`Timed out waiting for ${type}`)); }, timeout);
  const onMessage = (data) => {
    let message;
    try { message = JSON.parse(data.toString()); } catch { return; }
    if (message.type !== type || !predicate(message)) return;
    clearTimeout(timer); socket.off("message", onMessage); take(socket, type, predicate); resolve(message);
  };
  socket.on("message", onMessage);
});
const send = (socket, message) => socket.send(JSON.stringify(message));
const config = {
  name: "Parity fixture",
  creator: "Fixture host",
  seats: 2,
  terrain: "sunset-range",
  pace: "standard",
  aiDifficulty: "veteran",
  aiFill: true,
  firingMode: "sequential",
  movement: false,
  gravity: 150,
  windMode: "variable",
  windLimit: 1,
  boundary: "stop",
  events: { meteorShower: false, scenery: false },
  startingMoney: 100,
  disabledWeapons: [],
  disabledUtilities: [],
  seed: 90210,
};
const comparableSnapshot = (snapshot) => ({
  terrain: snapshot.terrain,
  terrainSolid: snapshot.terrainSolid,
  terrainMaterial: snapshot.terrainMaterial,
  wind: snapshot.wind,
  turn: snapshot.turn,
  turnSeat: snapshot.turnSeat,
  phase: snapshot.phase,
  rulesVersion: snapshot.rules?.version,
  player: snapshot.players?.[0] && {
    x: snapshot.players[0].x, y: snapshot.players[0].y, health: snapshot.players[0].health,
    alive: snapshot.players[0].alive, fuel: snapshot.players[0].fuel, money: snapshot.players[0].money,
    inventory: snapshot.players[0].inventory, utilities: snapshot.players[0].utilities,
  },
});
const fireEvent = (snapshot) => (snapshot.log || []).find((entry) => entry.kind === "fire" && entry.seat === 0);
const comparableFire = (entry) => entry && ({ weapon: entry.weapon, mode: entry.mode, children: entry.children, impact: entry.impact, damage: entry.damage, terrainChange: entry.terrainChange, childImpacts: entry.childImpacts });
if (!liveUrl) await wait(900);

let solo;
let multiHost;
let multiGuest;
let soloGameId = "";
let multiGameId = "";
let soloUserId = "";
let multiHostUserId = "";
try {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const soloId = `solo-parity-${suffix}`;
  const multiHostId = `multi-parity-host-${suffix}`;
  const multiGuestId = `multi-parity-guest-${suffix}`;
  soloUserId = soloId;
  multiHostUserId = multiHostId;

  solo = await open();
  const soloCreatedPromise = next(solo, "boombox-created");
  send(solo, { type: "boombox-create", userId: soloId, config: { ...config, creator: "Solo fixture", aiSeats: [1] } });
  const soloCreated = await soloCreatedPromise;
  soloGameId = soloCreated.gameId;
  const soloStartPromise = next(solo, "boombox-state", (message) => message.snapshot?.phase === "turn-prep");
  send(solo, { type: "boombox-start-ai", userId: soloId, gameId: soloCreated.gameId });
  const soloInitial = await soloStartPromise;

  multiHost = await open();
  const multiCreatedPromise = next(multiHost, "boombox-created");
  send(multiHost, { type: "boombox-create", userId: multiHostId, config: { ...config, creator: "Multiplayer fixture", aiFill: false, aiSeats: [] } });
  const multiCreated = await multiCreatedPromise;
  multiGameId = multiCreated.gameId;
  multiGuest = await open();
  const multiJoinPromise = next(multiGuest, "boombox-joined");
  const multiHostStartPromise = next(multiHost, "boombox-state", (message) => message.snapshot?.phase === "turn-prep");
  const multiGuestStartPromise = next(multiGuest, "boombox-state", (message) => message.snapshot?.phase === "turn-prep");
  send(multiGuest, { type: "boombox-join", gameId: multiCreated.gameId, userId: multiGuestId, name: "Multiplayer guest" });
  await multiJoinPromise;
  send(multiHost, { type: "boombox-start-ai", userId: multiHostId, gameId: multiCreated.gameId });
  const multiInitial = await multiHostStartPromise;
  await multiGuestStartPromise;

  if (JSON.stringify(comparableSnapshot(soloInitial.snapshot)) !== JSON.stringify(comparableSnapshot(multiInitial.snapshot))) {
    throw new Error(`Solo and multiplayer initial authoritative state diverged: ${JSON.stringify({ solo: comparableSnapshot(soloInitial.snapshot), multiplayer: comparableSnapshot(multiInitial.snapshot) })}`);
  }

  const soloMoveErrorPromise = next(solo, "boombox-error", (message) => message.message?.includes("Movement is disabled"));
  const multiMoveErrorPromise = next(multiHost, "boombox-error", (message) => message.message?.includes("Movement is disabled"));
  const moveAction = { kind: "move", direction: 1, distance: 20 };
  send(solo, { type: "boombox-action", userId: soloId, gameId: soloCreated.gameId, actionId: "solo-parity-illegal-move", action: moveAction });
  send(multiHost, { type: "boombox-action", userId: multiHostId, gameId: multiCreated.gameId, actionId: "multi-parity-illegal-move", action: moveAction });
  await soloMoveErrorPromise; await multiMoveErrorPromise;

  const soloAfterFirePromise = next(solo, "boombox-state", (message) => Boolean(fireEvent(message.snapshot)));
  const multiAfterFirePromise = next(multiHost, "boombox-state", (message) => Boolean(fireEvent(message.snapshot)));
  const fireAction = { targetIndex: 1, weapon: "cannon", angle: 42, power: 58 };
  send(solo, { type: "boombox-action", userId: soloId, gameId: soloCreated.gameId, actionId: "solo-parity-fire", action: fireAction });
  send(multiHost, { type: "boombox-action", userId: multiHostId, gameId: multiCreated.gameId, actionId: "multi-parity-fire", action: fireAction });
  const soloAfterFire = await soloAfterFirePromise;
  const multiAfterFire = await multiAfterFirePromise;
  const soloEvent = fireEvent(soloAfterFire.snapshot);
  const multiEvent = fireEvent(multiAfterFire.snapshot);
  if (JSON.stringify(comparableFire(soloEvent)) !== JSON.stringify(comparableFire(multiEvent))) {
    throw new Error(`Solo and multiplayer fire outcomes diverged: ${JSON.stringify({ solo: comparableFire(soloEvent), multiplayer: comparableFire(multiEvent) })}`);
  }
  if (JSON.stringify(soloAfterFire.snapshot.terrain) !== JSON.stringify(multiAfterFire.snapshot.terrain) || JSON.stringify(soloAfterFire.snapshot.terrainSolid) !== JSON.stringify(multiAfterFire.snapshot.terrainSolid)) {
    throw new Error("Solo and multiplayer terrain outcomes diverged");
  }

  console.log("Boom Box solo parity passed: identical authoritative setup, fire outcome, terrain mutation, and illegal-action validation for solo and multiplayer fixtures.");
} finally {
  for (const [socket, gameId, userId] of [[solo, soloGameId, soloUserId], [multiHost, multiGameId, multiHostUserId]]) {
    try { if (socket?.readyState === WebSocket.OPEN && gameId && userId) send(socket, { type: "boombox-cancel", gameId, userId }); } catch {}
  }
  await wait(150);
  for (const socket of [solo, multiHost, multiGuest]) { try { socket?.close(); } catch {} }
  server?.kill();
}
