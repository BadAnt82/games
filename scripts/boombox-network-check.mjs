import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4318;
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`ws://localhost:${port}/boombox`); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const next = (socket, type) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 3000); const onMessage = (data) => { const message = JSON.parse(data.toString()); if (message.type !== type) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); }; socket.on("message", onMessage); });
await wait(900);
try {
  const host = await open(); host.send(JSON.stringify({ type: "boombox-list", userId: "boom-host" })); await next(host, "boombox-lobby-list");
  host.send(JSON.stringify({ type: "boombox-create", userId: "boom-host", config: { name: "Network Range", creator: "Host", seats: 2, terrain: "sunset-range", pace: "standard", seed: 314159 } })); const created = await next(host, "boombox-created");
  const guest = await open(); guest.send(JSON.stringify({ type: "boombox-list", userId: "boom-guest" })); const lobby = await next(guest, "boombox-lobby-list"); if (lobby.available[0]?.creator !== "Host") throw new Error("Creator name missing from Boom Box lobby");
  guest.send(JSON.stringify({ type: "boombox-join", gameId: created.gameId, userId: "boom-guest", name: "Guest" })); await next(guest, "boombox-joined"); const hostState = await next(host, "boombox-state"); const guestState = await next(guest, "boombox-state"); if (hostState.snapshot.turnSeat !== 0 || guestState.snapshot.players.length !== 2) throw new Error("Authoritative match did not start with two seats");
  guest.send(JSON.stringify({ type: "boombox-action", userId: "boom-guest", action: { targetIndex: 0, angle: 42, power: 58 } })); const rejected = await next(guest, "boombox-error"); if (!rejected.message.includes("not your turn")) throw new Error("Turn ownership was not enforced");
  host.send(JSON.stringify({ type: "boombox-action", userId: "boom-host", action: { targetIndex: 1, angle: 42, power: 58 } })); const afterHost = await next(guest, "boombox-state"); if (afterHost.snapshot.turnSeat !== 1 || afterHost.snapshot.log.length !== 1) throw new Error("Host action was not broadcast authoritatively");
  guest.send(JSON.stringify({ type: "boombox-action", userId: "boom-guest", action: { targetIndex: 0, angle: 42, power: 58 } })); const afterGuest = await next(host, "boombox-state"); if (afterGuest.snapshot.turnSeat !== 0 || afterGuest.snapshot.log.length !== 2) throw new Error("Guest action was not synchronized");
  host.close(); guest.close(); console.log("Boom Box network protocol passed: creator lobby, join, turn authority, action validation, and state broadcast.");
} finally { server.kill(); }
