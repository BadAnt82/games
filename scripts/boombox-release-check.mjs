import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { WebSocket } from "ws";

const port = 4327;
const base = `http://localhost:${port}`;
const wsBase = `ws://localhost:${port}`;
const storeDir = join(process.cwd(), ".tmp-boombox-release");
const roomStore = join(storeDir, "active-rooms.json");
const historyStore = join(storeDir, "history.json");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let server;

async function stopServer() {
  if (!server || server.killed) return;
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await Promise.race([exited, wait(2000)]);
  await wait(150);
}

function startServer() {
  server = spawn(process.execPath, ["server.mjs"], {
    env: { ...process.env, PORT: String(port), BOOM_BOX_ROOM_STORE_PATH: roomStore, BOOM_BOX_HISTORY_STORE_PATH: historyStore, BOOMBOX_TURN_TIMEOUT_MS: "1200" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return waitForHttp();
}

async function waitForHttp() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { const response = await fetch(`${base}/api/boombox-history`); if (response.ok) return; } catch {}
    await wait(100);
  }
  throw new Error("Boom Box server did not start");
}

async function waitForPersistedRoom(gameId, started) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const rooms = JSON.parse(readFileSync(roomStore, "utf8"));
      if (rooms.some((room) => room.gameId === gameId && room.started === started)) return;
    } catch {}
    await wait(50);
  }
  throw new Error(`Room ${gameId} was not persisted with started=${started}`);
}

function open() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${wsBase}/boombox`);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function next(socket, type, predicate = () => true, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`Timed out waiting for ${type}`)); }, timeout);
    const onMessage = (data) => {
      let message;
      try { message = JSON.parse(data.toString()); } catch { return; }
      if (message.type !== type || !predicate(message)) return;
      clearTimeout(timer); socket.off("message", onMessage); resolve(message);
    };
    socket.on("message", onMessage);
  });
}

async function createRoom(socket, userId, config) {
  const createdPromise = next(socket, "boombox-created");
  socket.send(JSON.stringify({ type: "boombox-create", userId, config }));
  return createdPromise;
}

async function startAi(socket, gameId, userId) {
  const statePromise = next(socket, "boombox-state", (message) => message.snapshot?.gameId === gameId);
  socket.send(JSON.stringify({ type: "boombox-start-ai", userId, gameId }));
  return statePromise;
}

async function verifyPreparedMode(mode, suffix) {
  const hostId = `mode-host-${mode}-${suffix}`;
  const guestId = `mode-guest-${mode}-${suffix}`;
  const host = await open();
  const created = await createRoom(host, hostId, { name: `Mode ${mode} ${suffix}`, creator: "Mode Host", seats: 2, firingMode: mode, aiFill: false, seed: 8120 + mode.length });
  const guest = await open();
  const joinedPromise = next(guest, "boombox-joined");
  const hostStartPromise = next(host, "boombox-state", (message) => message.snapshot?.phase === "turn-prep");
  const guestStartPromise = next(guest, "boombox-state", (message) => message.snapshot?.phase === "turn-prep");
  guest.send(JSON.stringify({ type: "boombox-join", gameId: created.gameId, userId: guestId, name: "Mode Guest" }));
  await joinedPromise; await hostStartPromise; await guestStartPromise;
  const preparedPromise = next(host, "boombox-state", (message) => message.snapshot?.phase === "prepare" && message.snapshot.preparedSeats?.includes(0));
  host.send(JSON.stringify({ type: "boombox-action", userId: hostId, actionId: `${mode}-host-1`, action: { targetIndex: 1, weapon: "cannon", angle: 42, power: 58 } }));
  const prepared = await preparedPromise;
  if (prepared.snapshot.log.some((entry) => entry.kind === "fire")) throw new Error(`${mode} resolved before every commander prepared`);
  const releasedPromise = next(host, "boombox-state", (message) => ["turn-prep", "finished"].includes(message.snapshot?.phase) && message.snapshot.log.filter((entry) => entry.kind === "fire").length >= 2, 7000);
  guest.send(JSON.stringify({ type: "boombox-action", userId: guestId, actionId: `${mode}-guest-1`, action: { targetIndex: 0, weapon: "cannon", angle: 42, power: 58 } }));
  const released = await releasedPromise;
  if (released.snapshot.rules?.firingMode !== mode || released.snapshot.log.filter((entry) => entry.kind === "fire").length !== 2) throw new Error(`${mode} did not release both prepared actions deterministically`);
  close(host); close(guest);
}

async function verifyPass19(suffix) {
  const mover = await open();
  const moverId = `movement-${suffix}`;
  const moverRoom = await createRoom(mover, moverId, { name: `Movement ${suffix}`, creator: "Mover", seats: 2, firingMode: "sequential", movement: true, aiFill: true, seed: 4401 });
  const moverStart = await startAi(mover, moverRoom.gameId, moverId);
  if (!moverStart.snapshot.rules?.movement) throw new Error("Movement rule was not enabled");
  const beforeX = moverStart.snapshot.players[0].x;
  const movedPromise = next(mover, "boombox-state", (message) => message.snapshot?.log?.some((entry) => entry.kind === "move"));
  mover.send(JSON.stringify({ type: "boombox-action", userId: moverId, actionId: `move-${suffix}`, action: { kind: "move", direction: 1, distance: 20 } }));
  const moved = await movedPromise;
  if (moved.snapshot.players[0].x === beforeX || moved.snapshot.players[0].fuel >= 100 || !moved.snapshot.players[0].movedThisTurn) throw new Error("Movement did not consume fuel and update authoritative position");
  close(mover);

  const deadlineHost = await open();
  const deadlineId = `deadline-${suffix}`;
  const deadlineRoom = await createRoom(deadlineHost, deadlineId, { name: `Deadline ${suffix}`, creator: "Deadline Host", seats: 2, firingMode: "sequential", aiFill: false, pace: "blitz", seed: 4402 });
  const deadlineGuest = await open();
  const joined = next(deadlineGuest, "boombox-joined");
  const started = next(deadlineHost, "boombox-state", (message) => message.snapshot?.phase === "turn-prep");
  deadlineGuest.send(JSON.stringify({ type: "boombox-join", gameId: deadlineRoom.gameId, userId: `deadline-guest-${suffix}`, name: "Deadline Guest" }));
  await joined; await started;
  const timeoutState = await next(deadlineHost, "boombox-state", (message) => message.snapshot?.log?.some((entry) => entry.kind === "timeout"), 5000);
  if (!timeoutState.snapshot.log.some((entry) => entry.kind === "fire")) throw new Error("Turn deadline did not resolve a legal fallback shot");
  close(deadlineHost); close(deadlineGuest);

  const disconnectHost = await open();
  const disconnectId = `disconnect-${suffix}`;
  const disconnectRoom = await createRoom(disconnectHost, disconnectId, { name: `Disconnect ${suffix}`, creator: "Disconnect Host", seats: 2, firingMode: "synchronous", aiFill: false, seed: 4403 });
  const disconnectGuest = await open();
  const disconnectJoined = next(disconnectGuest, "boombox-joined");
  const disconnectStarted = next(disconnectHost, "boombox-state", (message) => message.snapshot?.phase === "turn-prep");
  disconnectGuest.send(JSON.stringify({ type: "boombox-join", gameId: disconnectRoom.gameId, userId: `disconnect-guest-${suffix}`, name: "Disconnect Guest" }));
  await disconnectJoined; await disconnectStarted; disconnectGuest.close(); await new Promise((resolve) => setTimeout(resolve, 120));
  const recovered = next(disconnectHost, "boombox-state", (message) => message.snapshot?.log?.filter((entry) => entry.kind === "fire").length >= 2, 5000);
  disconnectHost.send(JSON.stringify({ type: "boombox-action", userId: disconnectId, actionId: `disconnect-fire-${suffix}`, action: { targetIndex: 1, weapon: "cannon", angle: 42, power: 58 } }));
  const recoveredState = await recovered;
  if (!recoveredState.snapshot.log.some((entry) => entry.kind === "disconnect")) throw new Error("Disconnect takeover was not recorded");
  close(disconnectHost);
}

function close(socket) { if (socket && socket.readyState === WebSocket.OPEN) socket.close(); }

mkdirSync(storeDir, { recursive: true });
for (const file of [roomStore, historyStore]) if (existsSync(file)) rmSync(file, { force: true });

try {
  await startServer();

  // Invalid JSON values must not crash the room service.
  const malformed = await open();
  const malformedPromise = next(malformed, "boombox-error");
  malformed.send("null");
  if (!(await malformedPromise).message.includes("Malformed")) throw new Error("Malformed payload was not rejected");
  close(malformed);

  // A setup room survives a process restart and keeps its creator session.
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const hostId = `release-host-${suffix}`;
  const host = await open();
  const created = await createRoom(host, hostId, { name: `Restart ${suffix}`, creator: "Release Host", seats: 2, seed: 918273 });
  const setupRoomId = created.gameId;
  const setupSession = created.sessionId;
  await waitForPersistedRoom(setupRoomId, false);
  close(host);
  await stopServer();
  await startServer();
  const resumed = await open();
  const resumedPromise = next(resumed, "boombox-joined");
  resumed.send(JSON.stringify({ type: "boombox-join", gameId: setupRoomId, userId: hostId, sessionId: setupSession, name: "Release Host" }));
  const resumedMessage = await resumedPromise;
  if (resumedMessage.gameId !== setupRoomId || resumedMessage.sessionId !== setupSession) throw new Error("Setup-room session did not survive restart");
  close(resumed);

  // Exercise the supported seat matrix and every configured firing mode.
  for (const [seats, firingMode] of [[2, "sequential"], [4, "synchronous"], [6, "simultaneous"], [10, "sequential"]]) {
    const userId = `matrix-${seats}-${firingMode}-${suffix}`;
    const socket = await open();
    const createdMatrix = await createRoom(socket, userId, { name: `Matrix ${seats} ${firingMode}`, creator: `Matrix ${seats}`, seats, firingMode, aiFill: true, seed: 4000 + seats });
    const initial = await startAi(socket, createdMatrix.gameId, userId);
    if (initial.snapshot.rules?.seats !== seats || initial.snapshot.rules?.firingMode !== firingMode) throw new Error(`Rules were not preserved for ${seats}-seat ${firingMode} room`);
    if (initial.snapshot.players?.length !== seats || Object.keys(initial.snapshot.rules.weaponCatalog || {}).length < 18) throw new Error(`Seat/catalog matrix failed for ${seats}-seat room`);
    close(socket);
  }
  // Every setup control exposed by Pass 18 must survive server normalization.
  const configured = await open();
  const configuredRoom = await createRoom(configured, `configured-${suffix}`, { name: `Configured ${suffix}`, creator: "Configured Host", seats: 10, firingMode: "simultaneous", gravity: 210, windMode: "fixed", windLimit: 1.7, boundary: "bounce", startingMoney: 500, disabledWeapons: ["mini-nuke"], disabledUtilities: ["fuel-canister"], aiFill: true, seed: 7654321 });
  const configuredState = await startAi(configured, configuredRoom.gameId, `configured-${suffix}`);
  const configuredRules = configuredState.snapshot.rules;
  if (configuredRules?.seats !== 10 || configuredRules.firingMode !== "simultaneous" || configuredRules.gravity !== 210 || configuredRules.windMode !== "fixed" || configuredRules.windLimit !== 1.7 || configuredRules.boundary !== "bounce" || configuredRules.startingMoney !== 500 || configuredRules.weaponCatalog?.["mini-nuke"] || configuredRules.utilityCatalog?.["fuel-canister"]) throw new Error("Pass 18 setup rules were not preserved or filtered");
  close(configured);
  await verifyPreparedMode("synchronous", suffix);
  await verifyPreparedMode("simultaneous", suffix);
  await verifyPass19(suffix);

  // A started room also restores authoritative state, inventory, and rules.
  const activeId = `active-${suffix}`;
  const active = await open();
  const activeCreated = await createRoom(active, activeId, { name: `Active ${suffix}`, creator: "Active Host", seats: 2, aiFill: true, aiDifficulty: "expert", firingMode: "sequential", seed: 123456 });
  const activeState = await startAi(active, activeCreated.gameId, activeId);
  if (activeState.snapshot.rules?.version !== 2 || activeState.snapshot.players.length !== 2) throw new Error("Started room did not expose versioned state");
  await waitForPersistedRoom(activeCreated.gameId, true);
  const activeSession = activeCreated.sessionId;
  close(active);
  await stopServer();
  await startServer();
  const restored = await open();
  const restoredJoinPromise = next(restored, "boombox-joined");
  const restoredStatePromise = next(restored, "boombox-state", (message) => message.snapshot?.gameId === activeCreated.gameId);
  restored.send(JSON.stringify({ type: "boombox-join", gameId: activeCreated.gameId, userId: activeId, sessionId: activeSession, name: "Active Host" }));
  await restoredJoinPromise;
  const restoredState = await restoredStatePromise;
  if (restoredState.snapshot.rules?.version !== 2 || restoredState.snapshot.players.length !== 2 || restoredState.snapshot.gameId !== activeCreated.gameId) throw new Error("Started room state did not survive restart");
  close(restored);

  console.log("Boom Box Pass 19 release matrix passed: malformed payload rejection, setup restart recovery, started-match restart recovery, 2/4/6/10-seat rules, setup rules normalization, movement and fuel, turn deadlines, disconnect takeover, catalogue filtering, synchronous prepare/release, simultaneous deterministic release, versioned catalogue, and session continuity.");
} finally {
  if (server && !server.killed) server.kill();
  try { rmSync(storeDir, { recursive: true, force: true }); } catch {}
}
