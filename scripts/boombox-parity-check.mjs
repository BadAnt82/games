import { spawn } from "node:child_process";
import { BOOM_BOX_RULES_VERSION, BOOM_BOX_UTILITY_CATALOG, BOOM_BOX_WEAPON_CATALOG } from "../boombox-rules.mjs";

const port = 4324;
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
let serverError = "";
server.stderr.on("data", (chunk) => { serverError += chunk.toString(); });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function getJson(path) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try { const response = await fetch(`http://localhost:${port}${path}`); if (response.ok) return response.json(); lastError = new Error(`HTTP ${response.status}`); } catch (error) { lastError = error; }
    await wait(150);
  }
  throw new Error(`${lastError?.message || `Unable to reach ${path}`} ${serverError}`);
}
try {
  const rules = await getJson("/api/boombox-rules");
  const health = await getJson("/api/boombox-health");
  const clientIds = Object.keys(BOOM_BOX_WEAPON_CATALOG).sort();
  const serverIds = Object.keys(rules.weapons || {}).sort();
  if (JSON.stringify(clientIds) !== JSON.stringify(serverIds)) throw new Error(`Solo and server weapon catalogs drifted: client=${clientIds.join(",")} server=${serverIds.join(",")}`);
  for (const id of clientIds) {
    const client = BOOM_BOX_WEAPON_CATALOG[id]; const server = rules.weapons[id];
    for (const field of ["label", "cost", "inventory", "damage", "directDamage", "splashDamage", "radius", "depth", "mode", "speed", "description", "count", "spread", "bounces", "material", "burningTurns"]) {
      if ((client[field] ?? null) !== (server[field] ?? null)) throw new Error(`Weapon ${id} field ${field} drifted: client=${client[field]} server=${server[field]}`);
    }
  }
  if (rules.version !== BOOM_BOX_RULES_VERSION || rules.version !== 5 || rules.weapons["bouncing-bomb"]?.mode !== "bounce" || BOOM_BOX_WEAPON_CATALOG["bouncing-bomb"]?.description !== "Bounces off walls and terrain.") throw new Error("Bouncing weapon parity contract is incomplete");
  if (JSON.stringify(Object.keys(BOOM_BOX_UTILITY_CATALOG).sort()) !== JSON.stringify(Object.keys(rules.utilities || {}).sort())) throw new Error("Solo and server utility catalogs drifted");
  if (health.status !== "ok" || health.rulesVersion !== rules.version || health.persistence?.activeRooms?.writable !== true || health.persistence?.history?.writable !== true) throw new Error(`Persistence health contract failed: ${JSON.stringify(health)}`);
  console.log(`Boom Box parity check passed: ${serverIds.length} weapon IDs match, bouncing rules align, and persistence health is writable.`);
} finally {
  server.kill();
}
