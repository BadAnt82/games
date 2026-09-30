import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4325;
const root = mkdtempSync(join(tmpdir(), "boombox-pass24-"));
const roomStore = join(root, "active-rooms.json");
const historyStore = join(root, "history.json");
const env = { ...process.env, PORT: String(port), BOOM_BOX_ROOM_STORE_PATH: roomStore, BOOM_BOX_HISTORY_STORE_PATH: historyStore };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const start = () => spawn(process.execPath, ["server.mjs"], { env, stdio: ["ignore", "pipe", "pipe"] });
const stop = (child) => new Promise((resolve) => { if (!child || child.exitCode !== null) { resolve(); return; } child.once("exit", resolve); child.kill(); });
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`ws://localhost:${port}/boombox`); socket._messages = []; socket.on("message", (data) => { try { socket._messages.push(JSON.parse(data.toString())); } catch {} }); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const next = async (socket, type, timeout = 3500) => { const existing = socket._messages.findIndex((message) => message.type === type); if (existing >= 0) return socket._messages.splice(existing, 1)[0]; return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), timeout); const handler = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type) return; clearTimeout(timer); socket.off("message", handler); resolve(message); }; socket.on("message", handler); }); };
const nextWhere = async (socket, type, predicate, timeout = 3500) => { const existing = socket._messages.findIndex((message) => message.type === type && predicate(message)); if (existing >= 0) return socket._messages.splice(existing, 1)[0]; return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), timeout); const handler = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type || !predicate(message)) return; clearTimeout(timer); socket.off("message", handler); resolve(message); }; socket.on("message", handler); }); };
let server;
try {
  server = start();
  await wait(700);
  const owner = `pass24-owner-${Date.now()}`;
  const socket = await open();
  const createdPromise = next(socket, "boombox-created");
  socket.send(JSON.stringify({ type: "boombox-create", userId: owner, config: { name: "Pass 24 persistence", creator: "Pass 24", seats: 2, aiFill: false, seed: 2401 } }));
  const created = await createdPromise;
  socket.close();
  await stop(server);
  await wait(250);
  server = start();
  await wait(700);
  const resumed = await open();
  const listPromise = nextWhere(resumed, "boombox-lobby-list", (message) => message.created?.some((room) => room.gameId === created.gameId));
  resumed.send(JSON.stringify({ type: "boombox-list", userId: owner }));
  const list = await listPromise;
  if (!list.created?.some((room) => room.gameId === created.gameId)) throw new Error(`Persisted room was not restored into the creator lobby: ${JSON.stringify({ created, list, roomStore })}`);
  const joinedPromise = next(resumed, "boombox-joined");
  resumed.send(JSON.stringify({ type: "boombox-join", userId: owner, gameId: created.gameId, sessionId: created.sessionId, name: "Pass 24" }));
  const joined = await joinedPromise;
  if (joined.gameId !== created.gameId || joined.seat !== 0) throw new Error("Persisted creator session did not reclaim its seat");
  resumed.close();
  console.log("Boom Box persistence check passed: an active room and creator session survived a server restart.");
} finally {
  await stop(server);
  rmSync(root, { recursive: true, force: true });
}
