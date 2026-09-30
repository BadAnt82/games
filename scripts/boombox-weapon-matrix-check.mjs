import { spawn } from "node:child_process";
import { WebSocket } from "ws";
import { BOOM_BOX_RULES_VERSION, BOOM_BOX_WEAPON_CATALOG } from "../boombox-rules.mjs";

const port = 4330;
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
let stderr = ""; server.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`ws://localhost:${port}/boombox`); socket._messages = []; socket.on("message", (data) => { try { const message = JSON.parse(data.toString()); socket._messages.push(message); if (message.type === "boombox-flight-bundle" && message.bundleId) socket.send(JSON.stringify({ type: "boombox-flight-ack", bundleId: message.bundleId })); } catch {} }); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const take = (socket, type, predicate = () => true) => { const index = socket._messages.findIndex((message) => message.type === type && predicate(message)); return index >= 0 ? socket._messages.splice(index, 1)[0] : null; };
const next = (socket, type, predicate = () => true, timeout = 5000) => new Promise((resolve, reject) => { const queued = take(socket, type, predicate); if (queued) return resolve(queued); const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`Timed out waiting for ${type}: ${stderr}`)); }, timeout); const onMessage = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type || !predicate(message)) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); }; socket.on("message", onMessage); });

await wait(700);
try {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const results = [];
  for (const [weaponId, item] of Object.entries(BOOM_BOX_WEAPON_CATALOG)) {
    const userId = `matrix-${suffix}-${weaponId}`; const socket = await open();
    try {
      const createdPromise = next(socket, "boombox-created");
      socket.send(JSON.stringify({ type: "boombox-create", userId, config: { name: `Weapon ${weaponId}`, creator: "Matrix", seats: 2, aiFill: true, startingMoney: 10000, fullCatalogue: true, seed: 271828 } }));
      const created = await createdPromise; const statePromise = next(socket, "boombox-state"); socket.send(JSON.stringify({ type: "boombox-start-ai", userId, gameId: created.gameId }));
      const initial = await statePromise; if (initial.snapshot.rules.version !== BOOM_BOX_RULES_VERSION) throw new Error(`${weaponId}: rules version drifted`);
      if (weaponId !== "cannon") {
        const purchasePromise = next(socket, "boombox-purchase-result"); socket.send(JSON.stringify({ type: "boombox-purchase", userId, gameId: created.gameId, purchaseId: `purchase-${weaponId}`, category: "weapon", item: weaponId, quantity: 1 }));
        const purchase = await purchasePromise; if (purchase.loadout.inventory[weaponId] !== 1 || purchase.loadout.money !== 10000 - item.cost) throw new Error(`${weaponId}: purchase economy mismatch`);
      }
      const flightPromise = next(socket, "boombox-flight-bundle", (message) => message.flights?.some((flight) => flight.weapon === weaponId)); const fireState = next(socket, "boombox-state", (message) => (message.snapshot?.log || []).some((entry) => entry.kind === "fire" && entry.weapon === weaponId));
      socket.send(JSON.stringify({ type: "boombox-action", userId, gameId: created.gameId, actionId: `fire-${weaponId}`, action: { targetIndex: 1, weapon: weaponId, angle: 42, power: 58 } }));
      const flight = await flightPromise; const resolved = await fireState; const event = [...resolved.snapshot.log].reverse().find((entry) => entry.kind === "fire" && entry.weapon === weaponId);
      const expectedChildren = Math.max(1, Number(item.count) || 1); if (!event || event.children !== expectedChildren || !Number.isInteger(event.resolutionOrder) || !Array.isArray(event.childImpacts) || event.childImpacts.length !== expectedChildren || !Array.isArray(event.childPaths) || event.childPaths.length !== expectedChildren) throw new Error(`${weaponId}: child impact/replay path contract mismatch`);
      const weaponFlight = flight.flights.find((candidate) => candidate.weapon === weaponId); if (!Array.isArray(weaponFlight?.children) || weaponFlight.children.length !== expectedChildren || weaponFlight.children.some((child) => !Array.isArray(child.path) || child.path.length < 2)) throw new Error(`${weaponId}: child flight playback contract mismatch`);
      if (weaponId === "bouncing-bomb" && Number(weaponFlight.children[0].bounces) < 1) throw new Error("bouncing-bomb did not report a terrain bounce");
      if (weaponId === "napalm" && event.childImpacts.some((impact) => impact.target >= 0) && !resolved.snapshot.players.some((player) => player.burning > 0)) throw new Error("napalm did not preserve its burning status");
      if (item.material && !resolved.snapshot.terrainMaterial.includes(item.material)) throw new Error(`${weaponId}: material effect was not persisted in the snapshot`);
      if (!event.terrainChange || event.terrainChange.material !== (item.material || "dirt")) throw new Error(`${weaponId}: terrain material contract mismatch`);
      results.push(`${weaponId}:${event.childImpacts.length}`);
      socket.send(JSON.stringify({ type: "boombox-cancel", userId, gameId: created.gameId }));
    } finally { socket.close(); }
  }
  console.log(`Boom Box weapon matrix passed: ${results.join(", ")}`);
} finally { server.kill(); }
