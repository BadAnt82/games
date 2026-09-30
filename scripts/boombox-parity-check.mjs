import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const port = 4324;
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  await wait(700);
  const rules = await (await fetch(`http://localhost:${port}/api/boombox-rules`)).json();
  const health = await (await fetch(`http://localhost:${port}/api/boombox-health`)).json();
  const source = readFileSync(new URL("../src/boom-box.ts", import.meta.url), "utf8");
  const clientSection = source.slice(source.indexOf("const WEAPONS"), source.indexOf("const UTILITIES"));
  const clientIds = [...clientSection.matchAll(/^\s*(?:"([a-z0-9-]+)"|([a-z0-9-]+))\s*:/gim)].map((match) => match[1] || match[2]).filter((id) => id !== "Record").sort();
  const serverIds = Object.keys(rules.weapons || {}).sort();
  if (JSON.stringify(clientIds) !== JSON.stringify(serverIds)) throw new Error(`Solo and server weapon catalogs drifted: client=${clientIds.join(",")} server=${serverIds.join(",")}`);
  if (rules.version !== 2 || rules.weapons["bouncing-bomb"]?.mode !== "bounce" || !source.includes('description: "Bounces off walls and terrain."')) throw new Error("Bouncing weapon parity contract is incomplete");
  if (health.status !== "ok" || health.rulesVersion !== rules.version || health.persistence?.activeRooms?.writable !== true || health.persistence?.history?.writable !== true) throw new Error(`Persistence health contract failed: ${JSON.stringify(health)}`);
  console.log(`Boom Box parity check passed: ${serverIds.length} weapon IDs match, bouncing rules align, and persistence health is writable.`);
} finally {
  server.kill();
}
