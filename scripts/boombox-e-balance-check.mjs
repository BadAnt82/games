import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { WebSocket } from "ws";

const port = 4372;
const storeDir = join(process.cwd(), ".tmp-pass-e");
const configPath = join(storeDir, "admin-config.json");
mkdirSync(storeDir, { recursive: true });
writeFileSync(configPath, JSON.stringify({
  economy: { startingCredits: 321, movementFuel: 64, movementFuelCost: 7 },
  tank: { maxHealth: 180, maxShield: 50, armorDamageReduction: .25, fallDamageThreshold: 12, fallDamageMultiplier: .5, fallDamageBase: 4 },
  terrain: { gravity: 190, windLimit: .4, collapseThreshold: 8, smokeTurns: 5 },
  timing: { turnTimeoutSeconds: 12, projectileStepMs: 33, aiThinkDelayMs: 100, fastForwardMultiplier: 4 },
  weapons: { cannon: { damage: 33, directDamage: 33, splashDamage: 11 }, "laser-line": { cost: 20, directDamage: 30, splashDamage: 0 } },
  utilities: { shield: { amount: 90, durationRounds: 1 }, "fuel-canister": { purchaseAmount: 2 } },
}, null, 2));

const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), GAMES_ADMIN_CONFIG_STORE_PATH: configPath, GAMES_ADMIN_STORE_PATH: join(storeDir, "admin.json") }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const open = () => new Promise((resolve, reject) => { const socket = new WebSocket(`ws://localhost:${port}/boombox`); socket.messages = []; socket.on("message", (data) => { try { const message = JSON.parse(data.toString()); socket.messages.push(message); if (message.type === "boombox-flight-bundle") socket.send(JSON.stringify({ type: "boombox-flight-ack", gameId: message.flights?.[0]?.gameId, bundleId: message.bundleId })); } catch {} }); socket.once("open", () => resolve(socket)); socket.once("error", reject); });
const take = (socket, type, predicate = () => true) => { const index = socket.messages.findIndex((message) => message.type === type && predicate(message)); return index < 0 ? null : socket.messages.splice(index, 1)[0]; };
const next = (socket, type, predicate = () => true, timeout = 10000) => new Promise((resolve, reject) => { const queued = take(socket, type, predicate); if (queued) return resolve(queued); const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`Timed out waiting for ${type}`)); }, timeout); const onMessage = (data) => { let message; try { message = JSON.parse(data.toString()); } catch { return; } if (message.type !== type || !predicate(message)) return; clearTimeout(timer); socket.off("message", onMessage); resolve(message); }; socket.on("message", onMessage); });
const send = (socket, message) => socket.send(JSON.stringify(message));
const start = async (socket, userId, name) => { const createdPromise = next(socket, "boombox-created"); send(socket, { type: "boombox-create", userId, config: { name, creator: name, seats: 2, aiCount: 1, humanCount: 1, movement: true, pace: "blitz", seed: 424242 } }); const created = await createdPromise; const statePromise = next(socket, "boombox-state", (message) => message.snapshot?.phase === "turn-prep"); send(socket, { type: "boombox-start-ai", userId, gameId: created.gameId }); return { created, state: await statePromise }; };

try {
  await wait(500);
  const socket = await open();
  const userId = `e-balance-${Date.now()}`;
  const { created, state } = await start(socket, userId, "E Balance");
  const rules = state.snapshot.rules;
  if (rules.startingMoney !== 321 || rules.gravity !== 190 || rules.windLimit !== .4) throw new Error("Admin economy or terrain defaults were not applied to new rooms.");
  if (rules.balance?.tank?.maxHealth !== 180 || rules.balance?.economy?.movementFuel !== 64) throw new Error("Admin balance was not included in the authoritative rules snapshot.");
  if (state.snapshot.players[0].maxHealth !== 180 || state.snapshot.players[0].fuel !== 64) throw new Error("Admin tank defaults did not initialize player state.");
  if (rules.weaponCatalog.cannon.directDamage !== 33 || rules.weaponCatalog["laser-line"].cost !== 20 || rules.utilityCatalog.shield.amount !== 90 || rules.utilityCatalog.shield.durationRounds !== 1 || rules.utilityCatalog["fuel-canister"].purchaseAmount !== 2) throw new Error("Admin catalog overrides did not reach the room rules.");
  const purchasePromise = next(socket, "boombox-purchase-result"); send(socket, { type: "boombox-purchase", userId, gameId: created.gameId, purchaseId: "e-laser", category: "weapon", item: "laser-line", quantity: 1 }); await purchasePromise;
  const firePromise = next(socket, "boombox-state", (message) => message.snapshot?.log?.some((entry) => entry.kind === "fire" && entry.actionId === "e-laser-fire")); send(socket, { type: "boombox-action", userId, gameId: created.gameId, actionId: "e-laser-fire", action: { targetIndex: 1, weapon: "laser-line", angle: 42, power: 58 } }); const fired = await firePromise; const fire = fired.snapshot.log.find((entry) => entry.actionId === "e-laser-fire"); if (fire?.childImpacts?.[0]?.damage !== 23) throw new Error(`Armor/direct damage plumbing was not applied: ${JSON.stringify(fire)}`);
  socket.close();

  const utilitySocket = await open();
  const utilityUserId = `e-utility-${Date.now()}`;
  const utilityRoom = await start(utilitySocket, utilityUserId, "E Utility");
  const utilityPromise = next(utilitySocket, "boombox-state", (message) => message.snapshot?.log?.some((entry) => entry.kind === "utility" && entry.utility === "shield")); send(utilitySocket, { type: "boombox-action", userId: utilityUserId, gameId: utilityRoom.created.gameId, actionId: "e-shield", action: { kind: "utility", utility: "shield" } }); const utilityState = await utilityPromise; if (utilityState.snapshot.players[0].shield !== 50 || utilityState.snapshot.players[0].activeUtilities?.shield !== 1) throw new Error("Shield effect ignored the configured maximum or expiration duration.");
  const fuelPurchase = next(utilitySocket, "boombox-purchase-result"); send(utilitySocket, { type: "boombox-purchase", userId: utilityUserId, gameId: utilityRoom.created.gameId, purchaseId: "e-fuel", category: "utility", item: "fuel-canister", quantity: 1 }); const fuelResult = await fuelPurchase; if (fuelResult.loadout.utilities["fuel-canister"] !== 2) throw new Error("Utility purchase amount was not applied to the authoritative loadout."); utilitySocket.close();
  console.log("Boom Box Pass E balance check passed: admin defaults, catalog overrides, armor, direct damage, shield limits, and player initialization are authoritative.");
} finally { server.kill(); rmSync(storeDir, { recursive: true, force: true }); }
