import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4318;
const liveUrl = process.env.BOOMBOX_LIVE_URL || "";
const server = liveUrl ? null : spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`${liveUrl || `ws://localhost:${port}`}/boombox`); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const next = (socket, type) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 3000); const onMessage = (data) => { const message = JSON.parse(data.toString()); if (message.type !== type) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); }; socket.on("message", onMessage); });
if (!liveUrl) await wait(900);
try {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; const hostId = `boom-host-${suffix}`; const guestId = `boom-guest-${suffix}`;
  const host = await open(); const hostLobbyPromise = next(host, "boombox-lobby-list"); host.send(JSON.stringify({ type: "boombox-list", userId: hostId })); await hostLobbyPromise;
  const createdPromise = next(host, "boombox-created"); host.send(JSON.stringify({ type: "boombox-create", userId: hostId, config: { name: "Network Range", creator: "Host", seats: 2, terrain: "sunset-range", pace: "standard", seed: 314159 } })); const created = await createdPromise;
  const guest = await open(); const guestLobbyPromise = next(guest, "boombox-lobby-list"); guest.send(JSON.stringify({ type: "boombox-list", userId: guestId })); const lobby = await guestLobbyPromise; if (lobby.available[0]?.creator !== "Host") throw new Error("Creator name missing from Boom Box lobby");
  const joinedPromise = next(guest, "boombox-joined"); const hostStatePromise = next(host, "boombox-state"); const guestStatePromise = next(guest, "boombox-state"); guest.send(JSON.stringify({ type: "boombox-join", gameId: created.gameId, userId: guestId, name: "Guest" })); await joinedPromise; const hostState = await hostStatePromise; const guestState = await guestStatePromise; if (hostState.snapshot.turnSeat !== 0 || guestState.snapshot.players.length !== 2) throw new Error("Authoritative match did not start with two seats");
  const rejectedPromise = next(guest, "boombox-error"); guest.send(JSON.stringify({ type: "boombox-action", userId: guestId, action: { targetIndex: 0, angle: 42, power: 58 } })); const rejected = await rejectedPromise; if (!rejected.message.includes("not your turn")) throw new Error("Turn ownership was not enforced");
  const afterHostPromise = next(guest, "boombox-state"); host.send(JSON.stringify({ type: "boombox-action", userId: hostId, action: { targetIndex: 1, angle: 42, power: 58 } })); const afterHost = await afterHostPromise; if (afterHost.snapshot.turnSeat !== 1 || afterHost.snapshot.log.length !== 1) throw new Error("Host action was not broadcast authoritatively");
  const afterGuestPromise = next(host, "boombox-state"); guest.send(JSON.stringify({ type: "boombox-action", userId: guestId, action: { targetIndex: 0, angle: 42, power: 58 } })); const afterGuest = await afterGuestPromise; if (afterGuest.snapshot.turnSeat !== 0 || afterGuest.snapshot.log.length !== 2) throw new Error("Guest action was not synchronized");
  host.close(); guest.close(); console.log("Boom Box network protocol passed: creator lobby, join, turn authority, action validation, and state broadcast.");
} finally { server?.kill(); }
