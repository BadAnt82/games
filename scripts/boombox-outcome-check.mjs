import { spawn } from "node:child_process";
import { WebSocket } from "ws";
import { BOOM_BOX_UTILITY_CATALOG } from "../boombox-rules.mjs";

const port = 4331;
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
let stderr = ""; server.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`ws://localhost:${port}/boombox`); socket._messages = []; socket.on("message", (data) => { try { socket._messages.push(JSON.parse(data.toString())); } catch {} }); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const take = (socket, type, predicate = () => true) => { const index = socket._messages.findIndex((message) => message.type === type && predicate(message)); return index >= 0 ? socket._messages.splice(index, 1)[0] : null; };
const next = (socket, type, predicate = () => true, timeout = 5000) => new Promise((resolve, reject) => { const queued = take(socket, type, predicate); if (queued) return resolve(queued); const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`Timed out waiting for ${type}: ${stderr}`)); }, timeout); const onMessage = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type || !predicate(message)) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); }; socket.on("message", onMessage); });
const started = async (socket, userId, config) => { const createdPromise = next(socket, "boombox-created"); socket.send(JSON.stringify({ type: "boombox-create", userId, config })); const created = await createdPromise; const statePromise = next(socket, "boombox-state"); socket.send(JSON.stringify({ type: "boombox-start-ai", userId, gameId: created.gameId })); const state = await statePromise; return { created, state }; };

await wait(700);
try {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; const utilityResults = [];
  for (const [utilityId, rules] of Object.entries(BOOM_BOX_UTILITY_CATALOG)) {
    const userId = `outcome-${suffix}-${utilityId}`; const socket = await open();
    try {
      const { created, state } = await started(socket, userId, { name: `Utility ${utilityId}`, creator: "Outcome", seats: 2, aiFill: true, movement: utilityId === "fuel-canister", startingMoney: 10000, seed: 4000 + utilityId.length });
      const before = state.snapshot.players[0];
      if (utilityId === "fuel-canister") { const movedPromise = next(socket, "boombox-state", (message) => message.snapshot?.log?.some((entry) => entry.kind === "move")); socket.send(JSON.stringify({ type: "boombox-action", userId, gameId: created.gameId, actionId: `move-${utilityId}`, action: { kind: "move", direction: 1, distance: 20 } })); await movedPromise; }
      const purchasePromise = next(socket, "boombox-purchase-result"); socket.send(JSON.stringify({ type: "boombox-purchase", userId, gameId: created.gameId, purchaseId: `buy-${utilityId}`, category: "utility", item: utilityId, quantity: 1 })); const purchase = await purchasePromise; if (purchase.loadout.money !== 10000 - rules.cost) throw new Error(`${utilityId}: purchase cost mismatch`);
      const usedPromise = next(socket, "boombox-state", (message) => message.snapshot?.log?.some((entry) => entry.kind === "utility" && entry.utility === utilityId)); socket.send(JSON.stringify({ type: "boombox-action", userId, gameId: created.gameId, actionId: `use-${utilityId}`, action: { kind: "utility", utility: utilityId } })); const used = await usedPromise; const player = used.snapshot.players[0]; const event = used.snapshot.log.find((entry) => entry.kind === "utility" && entry.utility === utilityId); if (!event || player.utilities[utilityId] !== purchase.loadout.utilities[utilityId] - 1) throw new Error(`${utilityId}: use did not consume one inventory item`);
      if (utilityId === "shield" && player.shield < 35) throw new Error("shield effect did not apply");
      if (utilityId === "heavy-shield" && player.shield < 70) throw new Error("heavy-shield effect did not apply");
      if (utilityId === "shield-recharge" && player.shield < 25) throw new Error("shield-recharge effect did not apply");
      if (utilityId === "terrain-lift" && !used.snapshot.terrainMaterial.includes("reinforced")) throw new Error("terrain-lift effect did not persist material");
      if (utilityId === "parachute" && player.upgrades.parachute < 1) throw new Error("parachute effect did not arm");
      if (utilityId === "guidance-kit" && player.upgrades.guidance < 1) throw new Error("guidance effect did not arm");
      if (utilityId === "turret-upgrade" && player.upgrades.turret < 1) throw new Error("turret-upgrade effect did not apply");
      if (utilityId === "fuel-canister" && player.fuel <= before.fuel - 20) throw new Error("fuel-canister effect did not restore fuel");
      if (utilityId === "repair-kit" && player.health < before.health) throw new Error("repair-kit reduced health");
      utilityResults.push(utilityId);
    } finally { socket.close(); }
  }

  const host = await open(); const guest = await open(); const hostId = `placement-host-${suffix}`; const guestId = `placement-guest-${suffix}`; const createdPromise = next(host, "boombox-created"); host.send(JSON.stringify({ type: "boombox-create", userId: hostId, config: { name: `Placement ${suffix}`, creator: "Placement Host", seats: 2, aiFill: false, seed: 314159 } })); const created = await createdPromise;
  const joinedPromise = next(guest, "boombox-joined"); const hostStart = next(host, "boombox-state", (message) => message.snapshot?.phase === "turn-prep"); guest.send(JSON.stringify({ type: "boombox-join", userId: guestId, gameId: created.gameId, name: "Placement Guest" })); await joinedPromise; await hostStart;
  const guestTurn = next(guest, "boombox-state", (message) => message.snapshot?.turnSeat === 1 && message.snapshot.log.some((entry) => entry.kind === "fire")); host.send(JSON.stringify({ type: "boombox-action", userId: hostId, gameId: created.gameId, actionId: "placement-host-1", action: { targetIndex: 1, weapon: "cannon", angle: 42, power: 58 } })); await guestTurn;
  const hostTurn = next(host, "boombox-state", (message) => message.snapshot?.turnSeat === 0 && message.snapshot.log.filter((entry) => entry.kind === "fire").length >= 2); guest.send(JSON.stringify({ type: "boombox-action", userId: guestId, gameId: created.gameId, actionId: "placement-guest-1", action: { targetIndex: 0, weapon: "cannon", angle: 8, power: 25 } })); await hostTurn;
  const finishedPromise = next(host, "boombox-state", (message) => message.snapshot?.phase === "finished", 7000); host.send(JSON.stringify({ type: "boombox-action", userId: hostId, gameId: created.gameId, actionId: "placement-host-2", action: { targetIndex: 1, weapon: "cannon", angle: 30, power: 62 } })); const finished = await finishedPromise; const placements = finished.snapshot.placements || []; const eliminated = finished.snapshot.eliminationOrder || []; if (finished.snapshot.winner !== 0 || eliminated[0]?.seat !== 1 || placements[0]?.seat !== 0 || placements[0]?.place !== 1 || placements[1]?.seat !== 1 || placements[1]?.place !== 2) throw new Error(`Elimination placement contract failed: ${JSON.stringify({ winner: finished.snapshot.winner, eliminated, placements })}`);
  host.close(); guest.close(); console.log(`Boom Box outcome check passed: ${utilityResults.length} utilities, deterministic winner/runner-up placements, and elimination order.`);
} finally { server.kill(); }
