import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4336;
const root = mkdtempSync(join(tmpdir(), "boombox-storage-failure-"));
const historyPath = join(root, "history-store");
const roomPath = join(root, "room-store");
mkdirSync(historyPath);
mkdirSync(roomPath);
const env = { ...process.env, PORT: String(port), BOOM_BOX_HISTORY_STORE_PATH: historyPath, BOOM_BOX_ROOM_STORE_PATH: roomPath };
const server = spawn(process.execPath, ["server.mjs"], { env, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getHealth = async () => (await fetch(`http://localhost:${port}/api/boombox-health`)).json();
const open = () => new Promise((resolve, reject) => {
  const socket = new WebSocket(`ws://localhost:${port}/boombox`);
  socket.once("open", () => resolve(socket));
  socket.once("error", reject);
});

try {
  await wait(700);
  const before = await getHealth();
  if (before.status !== "degraded" || before.persistence.history.writable || before.persistence.activeRooms.writable) {
    throw new Error(`Directory-backed stores were reported healthy: ${JSON.stringify(before)}`);
  }
  const socket = await open();
  socket.send(JSON.stringify({ type: "boombox-create", userId: `storage-failure-${Date.now()}`, config: { name: "Storage failure", creator: "Check", seats: 2, aiFill: true } }));
  await wait(250);
  const after = await getHealth();
  socket.close();
  if (after.status !== "degraded" || after.persistence.activeRooms.lastWriteOk !== false) {
    throw new Error(`Failed active-room write was not surfaced: ${JSON.stringify(after)}`);
  }
  console.log("Boom Box storage failure check passed: invalid file targets report degraded health and failed writes.");
} finally {
  server.kill();
  await wait(150);
  rmSync(root, { recursive: true, force: true });
}
