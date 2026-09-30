// @ts-ignore The shared runtime contract is authored as an ESM module for Node and Vite.
import { BOOM_BOX_WEAPON_CATALOG, BOOM_BOX_UTILITY_CATALOG, boomBoxTerrain } from "../boombox-rules.mjs";

type BoomBoxView = "mode" | "single" | "loadout" | "lobby" | "history" | "create" | "match" | "result";
type BoomBoxRoom = { id: string; name: string; creator: string; seats: number; connected: number; terrain: string; pace: string; firingMode?: string; aiFill: boolean; started: boolean; inviteToken?: string };
type WeaponId = "cannon" | "heavy-cannon" | "heavy-shell" | "precision-round" | "split-shell" | "mini-nuke" | "mirv" | "triple-shot" | "bouncing-bomb" | "riot-bomb" | "piercing-round" | "napalm" | "smoke-shell" | "liquid-dirt" | "terrain-tool" | "terrain-remover" | "tracer-round" | "laser-line" | "area-charge";
type UtilityId = "repair-kit" | "shield" | "heavy-shield" | "shield-recharge" | "terrain-lift" | "parachute" | "fuel-canister" | "guidance-kit" | "turret-upgrade";
type Difficulty = "recruit" | "veteran" | "ace" | "expert";
type Tank = { x: number; y: number; health: number; alive: boolean; falling: boolean; fallVelocity: number; label: string; color: string; shield: number; fuel?: number; movedThisTurn?: boolean; burning?: number; buried?: boolean; upgrades?: Record<string, number> };
type Projectile = { x: number; y: number; vx: number; vy: number; owner: "player" | "ai"; shooterIndex: number; weaponId: WeaponId; trail: Array<{ x: number; y: number }>; bounces?: number };
type ActionEntry = { sequence: number; kind: string; payload: string };
type MatchState = { seed: number; terrainName: string; terrain: number[]; terrainSolid?: boolean[]; terrainMaterial?: string[]; wind: number; turn: number; player: Tank; opponents: Tank[]; targetIndex: number; aiIndex: number; weaponId: WeaponId; utilityId: UtilityId; utilityUsed: boolean; credits: number; inventory: Record<WeaponId, number>; utilities: Record<UtilityId, number>; difficulty: Difficulty; phase: "aiming" | "ai" | "flight" | "resolve" | "finished"; projectile?: Projectile; shots: number; hits: number; damageDealt: number; damageTaken: number; craters: number; creditsSpent: number; startedAt: number; actionLog: ActionEntry[] };

const WEAPONS = BOOM_BOX_WEAPON_CATALOG as Record<WeaponId, any>;
const UTILITIES = BOOM_BOX_UTILITY_CATALOG as Record<UtilityId, any>;

export function actionLogChecksum(actions: ActionEntry[]) {
  return actions.reduce((hash, action) => { for (const character of `${action.sequence}:${action.kind}:${action.payload}`) hash = (hash * 31 + character.charCodeAt(0)) % 2147483647; return hash; }, 7);
}

const playerNameKey = "badant-games-player-name";
const boomBoxRoomKey = "badant-boombox-room";
const boomBoxSessionKey = "badant-boombox-session";
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const FIXED_DT = 1 / 60;
const GRAVITY = 150;

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing Boom Box element: ${selector}`);
  return element;
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export function makeTerrain(seed: number, profile = "sunset-range") {
  return boomBoxTerrain(seed, profile);
}

export function applyCrater(terrain: number[], center: number, radius: number, depth: number) {
  const boundedCenter = clamp(Math.round(center), 0, terrain.length - 1);
  for (let dx = -radius; dx <= radius; dx += 1) {
    const index = boundedCenter + dx;
    if (index < 0 || index >= terrain.length) continue;
    const factor = 1 - Math.abs(dx) / radius;
    terrain[index] = clamp(terrain[index] + depth * factor * factor, 210, CANVAS_HEIGHT - 18);
  }
  return terrain;
}

export function impactDamage(distance: number, direct: boolean, radius: number) {
  return direct ? 72 : Math.max(12, Math.round(48 * (1 - distance / (radius + 18))));
}

export function terrainChecksum(terrain: number[]) {
  return terrain.reduce((checksum, height, index) => (checksum + Math.round(height * (index + 17))) % 2147483647, 0);
}

export function initBoomBox() {
  const overlay = required<HTMLElement>("#overlay");
  const gameCanvas = required<HTMLCanvasElement>("#game");
  const homeButton = required<HTMLButtonElement>("#home");
  const platformPanel = required<HTMLElement>("#platform-panel");
  const modePanel = required<HTMLElement>("#boombox-mode-panel");
  const singlePanel = required<HTMLElement>("#boombox-single-panel");
  const loadoutPanel = required<HTMLElement>("#boombox-loadout-panel");
  const lobbyPanel = required<HTMLElement>("#boombox-lobby-panel");
  const createPanel = required<HTMLElement>("#boombox-create-panel");
  const matchPanel = required<HTMLElement>("#boombox-match-panel");
  const resultPanel = required<HTMLElement>("#boombox-result-panel");
  const modeSingleButton = required<HTMLButtonElement>("#boombox-mode-single");
  const modeMultiButton = required<HTMLButtonElement>("#boombox-mode-multi");
  const modeBackButton = required<HTMLButtonElement>("#boombox-mode-back");
  const singleBackButton = required<HTMLButtonElement>("#boombox-single-back");
  const loadoutOpenButton = required<HTMLButtonElement>("#boombox-loadout-open");
  const loadoutBackButton = required<HTMLButtonElement>("#boombox-loadout-back");
  const loadoutStartButton = required<HTMLButtonElement>("#boombox-loadout-start");
  const shopCreditsValue = required<HTMLElement>("#boombox-shop-credits");
  const shopList = required<HTMLElement>("#boombox-shop-list");
  const soloForm = required<HTMLFormElement>("#boombox-solo-form");
  const soloNameInput = required<HTMLInputElement>("#boombox-solo-name");
  const soloTerrainInput = required<HTMLSelectElement>("#boombox-solo-terrain");
  const soloSeedInput = required<HTMLInputElement>("#boombox-solo-seed");
  const opponentsInput = required<HTMLSelectElement>("#boombox-opponents");
  const soloWeaponInput = required<HTMLSelectElement>("#boombox-solo-weapon");
  const soloUtilityInput = required<HTMLSelectElement>("#boombox-solo-utility");
  const soloDifficultyInput = required<HTMLSelectElement>("#boombox-difficulty");
  const createButton = required<HTMLButtonElement>("#boombox-create");
  const refreshButton = required<HTMLButtonElement>("#boombox-refresh");
  const lobbyBackButton = required<HTMLButtonElement>("#boombox-lobby-back");
  const createdList = required<HTMLElement>("#boombox-created-list");
  const availableList = required<HTMLElement>("#boombox-available-list");
  const createdCount = required<HTMLElement>("#boombox-created-count");
  const availableCount = required<HTMLElement>("#boombox-available-count");
  const lobbyStatus = required<HTMLElement>("#boombox-lobby-status");
  const createForm = required<HTMLFormElement>("#boombox-create-form");
  const createBackButton = required<HTMLButtonElement>("#boombox-create-back");
  const createNextButton = required<HTMLButtonElement>("#boombox-create-next");
  const createSubmitButton = required<HTMLButtonElement>("#boombox-create-submit");
  const roomNameInput = required<HTMLInputElement>("#boombox-room-name");
  const commanderInput = required<HTMLInputElement>("#boombox-commander");
  const terrainInput = required<HTMLSelectElement>("#boombox-terrain");
  const seatsInput = required<HTMLSelectElement>("#boombox-seats");
  const firingModeInput = required<HTMLSelectElement>("#boombox-firing-mode");
  const gravityInput = required<HTMLSelectElement>("#boombox-gravity");
  const windModeInput = required<HTMLSelectElement>("#boombox-wind-mode");
  const windLimitInput = required<HTMLInputElement>("#boombox-wind-limit");
  const boundaryInput = required<HTMLSelectElement>("#boombox-boundary");
  const meteorEventsInput = required<HTMLInputElement>("#boombox-meteor-events");
  const sceneryInput = required<HTMLInputElement>("#boombox-scenery");
  const paceInput = required<HTMLSelectElement>("#boombox-turn-pace");
  const aiDifficultyInput = required<HTMLSelectElement>("#boombox-ai-difficulty");
  const aiFillInput = required<HTMLInputElement>("#boombox-ai-fill");
  const seatPlan = required<HTMLElement>("#boombox-seat-plan");
  const startingMoneyInput = required<HTMLInputElement>("#boombox-starting-money");
  const fullCatalogueInput = required<HTMLInputElement>("#boombox-full-catalogue");
  const movementInput = required<HTMLInputElement>("#boombox-movement");
  const createSummary = required<HTMLElement>("#boombox-create-summary");
  const steps = Array.from(createPanel.querySelectorAll<HTMLElement>("[data-boombox-step]"));
  const indicators = Array.from(createPanel.querySelectorAll<HTMLElement>("[data-boombox-step-indicator]"));
  const battlefield = required<HTMLCanvasElement>("#boombox-canvas");
  const context = battlefield.getContext("2d") as CanvasRenderingContext2D;
  if (!context) throw new Error("Boom Box canvas is unavailable");
  const matchStatus = required<HTMLElement>("#boombox-match-status");
  const matchSeed = required<HTMLElement>("#boombox-match-seed");
  const matchTerrain = required<HTMLElement>("#boombox-match-terrain");
  const angleInput = required<HTMLInputElement>("#boombox-angle");
  const powerInput = required<HTMLInputElement>("#boombox-power");
  const fuelValue = required<HTMLElement>("#boombox-fuel");
  const moveLeftButton = required<HTMLButtonElement>("#boombox-move-left");
  const moveRightButton = required<HTMLButtonElement>("#boombox-move-right");
  const angleValue = required<HTMLOutputElement>("#boombox-angle-value");
  const powerValue = required<HTMLOutputElement>("#boombox-power-value");
  const turnDeadlineValue = required<HTMLElement>("#boombox-turn-deadline");
  const targetInput = required<HTMLSelectElement>("#boombox-target");
  const weaponInput = required<HTMLSelectElement>("#boombox-weapon");
  const utilityInput = required<HTMLSelectElement>("#boombox-match-utility");
  const buyWeaponButton = required<HTMLButtonElement>("#boombox-buy-weapon");
  const buyUtilityButton = required<HTMLButtonElement>("#boombox-buy-utility");
  const windValue = required<HTMLElement>("#boombox-wind");
  const turnValue = required<HTMLElement>("#boombox-turn");
  const creditsValue = required<HTMLElement>("#boombox-credits");
  const difficultyValue = required<HTMLElement>("#boombox-difficulty-readout");
  const fireButton = required<HTMLButtonElement>("#boombox-fire");
  const utilityButton = required<HTMLButtonElement>("#boombox-utility");
  const playerLabel = required<HTMLElement>("#boombox-player-label");
  const playerHealth = required<HTMLElement>("#boombox-player-health");
  const playerHealthValue = required<HTMLElement>("#boombox-player-health-value");
  const opponentHealthList = required<HTMLElement>("#boombox-opponent-health-list");
  const shotLog = required<HTMLElement>("#boombox-shot-log");
  const matchExitButton = required<HTMLButtonElement>("#boombox-match-exit");
  const resultTitle = required<HTMLElement>("#boombox-result-title");
  const resultMessage = required<HTMLElement>("#boombox-result-message");
  const resultStats = required<HTMLElement>("#boombox-result-stats");
  const resultRestartButton = required<HTMLButtonElement>("#boombox-result-restart");
  const resultBackButton = required<HTMLButtonElement>("#boombox-result-back");
  const historyPanel = required<HTMLElement>("#boombox-history-panel");
  const historyOpenButton = required<HTMLButtonElement>("#boombox-history-open");
  const historyRefreshButton = required<HTMLButtonElement>("#boombox-history-refresh");
  const historyBackButton = required<HTMLButtonElement>("#boombox-history-back");
  const historyList = required<HTMLElement>("#boombox-history-list");
  const historyStatus = required<HTMLElement>("#boombox-history-status");
  const historyCanvas = required<HTMLCanvasElement>("#boombox-history-canvas");
  const replayA11y = required<HTMLElement>("#boombox-replay-a11y");
  const historyReplay = required<HTMLElement>("#boombox-history-replay");
  const historyStep = required<HTMLInputElement>("#boombox-history-step");
  const historyStepValue = required<HTMLOutputElement>("#boombox-history-step-value");
  const historyReplayStatus = required<HTMLElement>("#boombox-history-replay-status");
  const historyReplayPlay = required<HTMLButtonElement>("#boombox-replay-play");
  const historyReplaySpeedButtons = [required<HTMLButtonElement>("#boombox-replay-1"), required<HTMLButtonElement>("#boombox-replay-2"), required<HTMLButtonElement>("#boombox-replay-4")];
  const historyEvents = required<HTMLElement>("#boombox-history-events");
  const chatLog = required<HTMLElement>("#boombox-chat-log");
  const chatInput = required<HTMLInputElement>("#boombox-chat-input");
  const chatSendButton = required<HTMLButtonElement>("#boombox-chat-send");
  const aiIntent = required<HTMLElement>("#boombox-ai-intent");
  const eliminationList = required<HTMLElement>("#boombox-elimination-list");
  const speedButtons = [required<HTMLButtonElement>("#boombox-speed-1"), required<HTMLButtonElement>("#boombox-speed-2"), required<HTMLButtonElement>("#boombox-speed-4")];
  const pauseButton = required<HTMLButtonElement>("#boombox-speed-pause");

  let createStep = 1;
  let seatModes: Array<"human" | "ai"> = [];
  let joinedRoomId = "";
  let roomSequence = 1027;
  let createdRooms: BoomBoxRoom[] = [];
  let availableRooms: BoomBoxRoom[] = [
    { id: "BB-1024", name: "Sunset Showdown", creator: "Mara", seats: 4, connected: 2, terrain: "Sunset Range", pace: "Standard", aiFill: true, started: false },
    { id: "BB-1025", name: "Ice Shelf Siege", creator: "Rook", seats: 3, connected: 1, terrain: "Ice Shelf", pace: "Relaxed", aiFill: false, started: false },
    { id: "BB-1026", name: "Lunar Test Range", creator: "Nova", seats: 6, connected: 5, terrain: "Lunar Crater", pace: "Blitz", aiFill: true, started: false },
  ];
  let match: MatchState | undefined;
  let matchAnimation = 0;
  let lastFrame = 0;
  let accumulator = 0;
  let aiTimer = 0;
  let matchView: BoomBoxView = "mode";
  let shopCredits = 100;
  let shopInventory: Record<WeaponId, number> = Object.fromEntries((Object.keys(WEAPONS) as WeaponId[]).map((id) => [id, id === "cannon" ? 99 : 0])) as Record<WeaponId, number>;
  let targetSignature = "";
  let opponentHealthSignature = "";
  let networkSocket: WebSocket | undefined;
  let pendingNetworkMessages: object[] = [];
  let networkSeat = -1;
  let networkGameId = "";
  let networkTurnSeat = 0;
  let networkTurnDeadlineAt = 0;
  let networkFiringMode: "sequential" | "synchronous" | "simultaneous" = "sequential";
  let networkMovementEnabled = false;
  let networkPreparedSeats: number[] = [];
  let networkOpponentSeats: number[] = [];
  let networkMode = false;
  let networkSpectator = false;
  let networkActionSequence = 0;
  let soloNetworkMode = false;
  let soloNetworkUserId = "";
  let soloLoadoutSynced = false;
  let soloLoadoutPending = 0;
  let soloDesiredWeaponId: WeaponId = "cannon";
  let soloDesiredUtilityId: UtilityId = "repair-kit";
  let inviteRoomId = new URLSearchParams(location.search).get("boomboxRoom") || "";
  let inviteToken = new URLSearchParams(location.search).get("boomboxInvite") || "";
  let replayFrames: any[] = [];
  let networkFlight: Array<{ x: number; y: number }> = [];
  let networkFlights: Array<{ path: Array<{ x: number; y: number }>; index: number; seat?: number; weapon?: WeaponId; impact?: string; target?: number; center?: number }> = [];
  let networkFlightImpacts: Array<{ index: number; impact?: string; target?: number; center?: number; damage?: number }> = [];
  let networkFlightWeapon: WeaponId = "cannon";
  let networkFlightIndex = 0;
  let networkFlightBundleId = "";
  let networkFlightAckSent = false;
  let playbackSpeed = 1;
  let playbackPaused = false;
  let replayTimer = 0;
  let replaySpeed = 1;
  let replayPlaying = false;

  function networkUrl() { return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/boombox`; }
  function networkUserId() { return soloNetworkUserId || localStorage.getItem(playerNameKey)?.trim() || soloNameInput.value.trim() || "Commander"; }
  function networkCanSubmit() { return !networkSpectator && (!soloNetworkMode || (soloLoadoutSynced && soloLoadoutPending === 0)) && (networkFiringMode === "sequential" ? networkTurnSeat === networkSeat : !networkPreparedSeats.includes(networkSeat)); }
  function connectNetwork() {
    if (networkSocket && (networkSocket.readyState === WebSocket.OPEN || networkSocket.readyState === WebSocket.CONNECTING)) { networkMode = true; return; }
    networkMode = true; lobbyStatus.textContent = "Connecting to the authoritative war room...";
    try { networkSocket = new WebSocket(networkUrl()); } catch { networkMode = false; lobbyStatus.textContent = "Live room service is unavailable. Local preview remains available."; return; }
    networkSocket.addEventListener("open", () => { networkSocket?.send(JSON.stringify({ type: "boombox-list", userId: networkUserId() })); const savedRoom = localStorage.getItem(boomBoxRoomKey) || ""; const savedSession = localStorage.getItem(boomBoxSessionKey) || ""; const targetRoom = inviteRoomId || (!soloNetworkMode ? savedRoom : ""); if (inviteRoomId) networkSocket?.send(JSON.stringify({ type: "boombox-invite", userId: networkUserId(), gameId: inviteRoomId, inviteToken, name: networkUserId() })); else if (savedRoom && savedSession && !soloNetworkMode) networkSocket?.send(JSON.stringify({ type: "boombox-join", userId: networkUserId(), gameId: savedRoom, sessionId: savedSession, name: networkUserId() })); if (targetRoom) joinedRoomId = targetRoom; for (const payload of pendingNetworkMessages.splice(0)) networkSocket?.send(JSON.stringify(payload)); lobbyStatus.textContent = "Connected. Rooms are synchronized with the server."; });
    networkSocket.addEventListener("message", (event) => { let message; try { message = JSON.parse(event.data); } catch { return; } handleNetworkMessage(message); });
    networkSocket.addEventListener("close", () => { networkSocket = undefined; if (matchView === "lobby") lobbyStatus.textContent = "Room service disconnected. Refresh to reconnect."; });
    networkSocket.addEventListener("error", () => { const wasSolo = soloNetworkMode; networkMode = false; if (wasSolo) { resetSoloNetworkIdentity(); startSoloLocalMatch(); } else lobbyStatus.textContent = "Room service unavailable. Local preview remains available."; });
  }
  function sendNetwork(payload: unknown) { const message = { ...payload as object, userId: networkUserId() }; if (networkSocket?.readyState === WebSocket.OPEN) networkSocket.send(JSON.stringify(message)); else if (networkSocket?.readyState === WebSocket.CONNECTING) pendingNetworkMessages.push(message); }
  function nextNetworkActionId() { networkActionSequence += 1; return `${networkUserId()}-${Date.now().toString(36)}-${networkActionSequence}`; }
  function handleNetworkMessage(message: any) {
    if (message.type === "boombox-lobby-list") { const normalizeRoom = (room: any) => ({ ...room, id: room.id || room.gameId, terrain: room.terrain === "ice-shelf" ? "Ice Shelf" : room.terrain === "lunar-crater" ? "Lunar Crater" : "Sunset Range" }); createdRooms = Array.isArray(message.created) ? message.created.map(normalizeRoom) : []; availableRooms = Array.isArray(message.available) ? message.available.map(normalizeRoom) : []; renderRooms(); return; }
    if (message.type === "boombox-created" || message.type === "boombox-joined") { networkSpectator = false; networkGameId = message.gameId; networkSeat = message.seat; joinedRoomId = message.gameId; if (message.sessionId && !soloNetworkMode) localStorage.setItem(boomBoxSessionKey, message.sessionId); if (!soloNetworkMode) localStorage.setItem(boomBoxRoomKey, networkGameId); if (soloNetworkMode && message.type === "boombox-created") { sendNetwork({ type: "boombox-start-ai", gameId: networkGameId }); lobbyStatus.textContent = "Starting your solo range with AI opponents..."; } else lobbyStatus.textContent = message.type === "boombox-created" ? "Room created. Waiting for commanders to join." : "Joined room. Waiting for the match to fill."; return; }
    if (message.type === "boombox-watching") { networkSpectator = true; networkGameId = message.gameId; networkSeat = -1; lobbyStatus.textContent = "Spectator view connected."; return; }
    if (message.type === "boombox-flight-bundle" || message.type === "boombox-flight") {
      const flights = message.type === "boombox-flight-bundle" ? (Array.isArray(message.flights) ? message.flights : []) : (message.flight ? [message.flight] : []);
      networkFlightBundleId = String(message.bundleId || `legacy-${Date.now()}`);
      networkFlightAckSent = false;
      networkFlights = flights.flatMap((flight: any) => {
        const children = Array.isArray(flight.children) && flight.children.length ? flight.children : [{ path: flight.path, index: 0 }];
        return children.map((child: any) => ({ path: Array.isArray(child.path) ? child.path : [], index: Number(child.index) || 0, seat: Number(flight.seat) || 0, weapon: (flight.weapon || "cannon") as WeaponId, impact: child.impact, target: child.target, center: child.center })).filter((child: any) => child.path.length);
      });
      networkFlightWeapon = (flights[0]?.weapon || "cannon") as WeaponId;
      networkFlight = networkFlights.reduce((longest, child) => child.path.length > longest.length ? child.path : longest, [] as Array<{ x: number; y: number }>);
      networkFlightImpacts = flights.flatMap((flight: any) => Array.isArray(flight.impacts) ? flight.impacts : []);
      networkFlightIndex = 0;
      return;
    }
    if (message.type === "boombox-loadout") { lobbyStatus.textContent = `Loadout ready: ${message.money ?? 0} credits.`; return; }
    if (message.type === "boombox-purchase-result") { applyNetworkLoadout(message.loadout); if (soloNetworkMode) soloLoadoutPending = Math.max(0, soloLoadoutPending - 1); matchStatus.textContent = soloLoadoutPending ? "Loading your solo loadout..." : "Your turn. Set the shot."; updateControls(); return; }
    if (message.type === "boombox-purchase-error") { if (soloNetworkMode) soloLoadoutPending = Math.max(0, soloLoadoutPending - 1); matchStatus.textContent = message.message || "Purchase rejected."; updateControls(); return; }
    if (message.type === "boombox-state") { applyNetworkSnapshot(message.snapshot, Number(message.seat)); if (soloNetworkMode && !soloLoadoutSynced && Number(message.seat) >= 0) syncSoloLoadout(); return; }
    if (message.type === "boombox-chat") { const line = document.createElement("div"); line.className = "boombox-chat-line"; const sender = document.createElement("strong"); sender.textContent = `${message.message?.sender || "Commander"}:`; const text = document.createElement("span"); text.textContent = ` ${message.message?.text || ""}`; line.append(sender, text); if (networkSeat === 0 && message.message?.senderUserId && message.message.senderUserId !== networkUserId() && !message.message.system) { const mute = document.createElement("button"); mute.type = "button"; mute.className = "boombox-chat-mute"; mute.textContent = "Mute"; mute.addEventListener("click", () => { sendNetwork({ type: "boombox-moderate", gameId: networkGameId, action: "mute", targetUserId: message.message.senderUserId }); mute.disabled = true; }); line.append(mute); } chatLog.append(line); chatLog.scrollTop = chatLog.scrollHeight; return; }
    if (message.type === "boombox-error") { lobbyStatus.textContent = message.message || "The room rejected that action."; matchStatus.textContent = message.message || "The room rejected that action."; return; }
    if (message.type === "boombox-cancelled") { networkGameId = ""; networkSeat = -1; joinedRoomId = ""; localStorage.removeItem(boomBoxRoomKey); localStorage.removeItem(boomBoxSessionKey); setPanel("lobby"); return; }
  }
  function applyNetworkSnapshot(snapshot: any, seat: number) {
    networkFlights = []; networkFlightImpacts = []; networkFlight = []; networkFlightBundleId = ""; networkFlightAckSent = false;
    networkSpectator = seat < 0; networkSeat = seat; networkTurnSeat = Number(snapshot.turnSeat) || 0; networkTurnDeadlineAt = Number(snapshot.turnDeadlineAt) || 0; networkFiringMode = snapshot.rules?.firingMode || snapshot.firingMode || "sequential"; networkMovementEnabled = Boolean(snapshot.rules?.movement); networkPreparedSeats = Array.isArray(snapshot.preparedSeats) ? snapshot.preparedSeats.map((value: unknown) => Number(value)) : []; const players = Array.isArray(snapshot.players) ? snapshot.players : []; const viewSeat = seat >= 0 ? seat : 0; const local = players[viewSeat]; if (!local) return;
    networkOpponentSeats = players.map((_: any, index: number) => index).filter((index: number) => index !== viewSeat); const opponents = networkOpponentSeats.map((index) => { const player = players[index]; return { x: player.x, y: player.y, health: player.health, alive: player.alive, falling: Boolean(player.falling), fallVelocity: player.falling ? 180 : 0, label: player.name, color: player.color, shield: player.shield || 0 }; });
    const inventory = { ...(local.inventory || {}) } as Record<WeaponId, number>;
    const utilities = { ...(local.utilities || {}) } as Record<UtilityId, number>;
    populateNetworkCatalog(snapshot.rules, inventory, utilities);
    const selectedWeapon = soloNetworkMode && Object.prototype.hasOwnProperty.call(inventory, soloDesiredWeaponId) ? soloDesiredWeaponId : (Object.prototype.hasOwnProperty.call(inventory, match?.weaponId || "") ? match?.weaponId : "cannon") || "cannon";
    const selectedUtility = (soloNetworkMode && Object.prototype.hasOwnProperty.call(utilities, soloDesiredUtilityId) ? soloDesiredUtilityId : (Object.prototype.hasOwnProperty.call(utilities, match?.utilityId || "") ? match?.utilityId : Object.keys(utilities)[0] || "repair-kit")) as UtilityId;
    match = { seed: snapshot.seed, terrainName: snapshot.terrainName, terrain: snapshot.terrain, terrainSolid: snapshot.terrainSolid, terrainMaterial: snapshot.terrainMaterial, wind: snapshot.wind, turn: snapshot.turn, player: { x: local.x, y: local.y, health: local.health, alive: local.alive, falling: Boolean(local.falling), fallVelocity: local.falling ? 180 : 0, label: networkSpectator ? "Spectator view" : local.name, color: local.color, shield: local.shield || 0, fuel: local.fuel ?? 100, movedThisTurn: Boolean(local.movedThisTurn) }, opponents, targetIndex: 0, aiIndex: 0, weaponId: selectedWeapon as WeaponId, utilityId: selectedUtility, utilityUsed: false, credits: local.money || 0, inventory, utilities, difficulty: "veteran", phase: snapshot.phase === "finished" ? "finished" : "aiming", shots: local.shots || 0, hits: local.hits || 0, damageDealt: local.damage || 0, damageTaken: 0, craters: snapshot.log?.length || 0, creditsSpent: 0, startedAt: performance.now(), actionLog: (snapshot.log || []).map((entry: any) => ({ sequence: entry.sequence, kind: entry.kind, payload: JSON.stringify(entry) })) };
    targetSignature = ""; opponentHealthSignature = ""; networkFlight = []; networkFlightIndex = 0; networkFlightBundleId = ""; networkFlightAckSent = false; playerLabel.textContent = networkSpectator ? "Spectator view" : local.name; matchSeed.textContent = `Seed ${snapshot.seed}`; matchTerrain.textContent = snapshot.terrainName; const canSubmit = networkCanSubmit(); matchStatus.textContent = networkSpectator ? (snapshot.phase === "finished" ? "Spectator view — match complete." : `Spectating ${players[networkTurnSeat]?.name || "the next commander"}.`) : snapshot.phase === "finished" ? (snapshot.outcome === "draw" ? "The room ended in a draw." : snapshot.winner === seat ? "You won the room." : "You were eliminated.") : networkFiringMode === "sequential" ? networkTurnSeat === seat ? "Your turn. Set the shot." : `Waiting for ${players[networkTurnSeat]?.name || "the next commander"}.` : canSubmit ? `Prepare your shot. ${networkPreparedSeats.length} commander${networkPreparedSeats.length === 1 ? "" : "s"} ready.` : "Shot prepared. Waiting for the other commanders."; shotLog.textContent = snapshot.log?.length ? `Server log: ${snapshot.log.at(-1).hit ? "Impact confirmed" : snapshot.log.at(-1).impact === "terrain" ? "Terrain stopped the shot" : snapshot.log.at(-1).kind === "utility" ? "Utility resolved" : "Shot missed"}.` : "Server log: match ready."; weaponInput.value = match.weaponId; utilityInput.value = match.utilityId; setPanel("match"); updateControls(); if (snapshot.phase === "finished") showNetworkResult(!networkSpectator && snapshot.winner === seat, snapshot);
    renderTeachingState(snapshot);
  }
  function populateNetworkCatalog(rules: any, inventory: Record<WeaponId, number>, utilities: Record<UtilityId, number>) {
    if (!rules) return;
    const weapons = rules.weaponCatalog || {};
    weaponInput.replaceChildren(...Object.entries(weapons).map(([id, item]: any) => { const option = document.createElement("option"); option.value = id; const owned = inventory[id as WeaponId] || 0; const capacity = Number(item.inventory) || 0; option.textContent = `${item.label || id} · ${item.cost ? `${item.cost} cr` : "included"} · ${owned}/${capacity} · ${item.description || ""}`; return option; }));
    const utilityRules = rules.utilityCatalog || {};
    utilityInput.replaceChildren(...Object.entries(utilityRules).map(([id, item]: any) => { const option = document.createElement("option"); option.value = id; const owned = utilities[id as UtilityId] || 0; const capacity = Number(item.inventory) || 0; option.textContent = `${item.label || id} · ${item.cost || 0} cr · ${owned}/${capacity} · ${item.description || ""}`; return option; }));
  }
  function populateSoloWeaponCatalog() {
    const selected = soloWeaponInput.value;
    soloWeaponInput.replaceChildren(...Object.entries(WEAPONS).map(([id, item]: any) => { const option = document.createElement("option"); option.value = id; option.textContent = `${item.label} · ${item.cost ? `${item.cost} credits` : "included"}`; return option; }));
    soloWeaponInput.value = Object.prototype.hasOwnProperty.call(WEAPONS, selected) ? selected : "cannon";
  }
  function applyNetworkLoadout(loadout: any) {
    if (!match || !loadout) return;
    match.credits = Number(loadout.money ?? match.credits);
    match.inventory = { ...(loadout.inventory || {}) } as Record<WeaponId, number>;
    match.utilities = { ...(loadout.utilities || {}) } as Record<UtilityId, number>;
    updateControls();
  }
  function syncSoloLoadout() {
    if (!soloNetworkMode || !networkGameId || soloLoadoutSynced) return;
    const entries: Array<{ category: "weapon" | "utility"; item: string; quantity: number }> = (Object.keys(shopInventory) as WeaponId[]).filter((id) => id !== "cannon" && Number(shopInventory[id]) > 0).map((id) => ({ category: "weapon", item: id, quantity: Number(shopInventory[id]) }));
    if (soloDesiredUtilityId && !(Number(UTILITIES[soloDesiredUtilityId]?.starter) > 0)) entries.push({ category: "utility", item: soloDesiredUtilityId, quantity: 1 });
    soloLoadoutPending = entries.reduce((total, entry) => total + entry.quantity, 0);
    soloLoadoutSynced = true;
    for (const entry of entries) for (let index = 0; index < entry.quantity; index += 1) sendNetwork({ type: "boombox-purchase", gameId: networkGameId, purchaseId: `solo-loadout-${entry.category}-${entry.item}-${index}`, category: entry.category, item: entry.item, quantity: 1 });
    if (match) { match.weaponId = soloDesiredWeaponId; match.utilityId = soloDesiredUtilityId; matchStatus.textContent = entries.length ? "Loading your solo loadout..." : "Your turn. Set the shot."; updateControls(); }
  }
  function renderTeachingState(snapshot: any) {
    const intent = snapshot.aiIntent;
    const thinking = intent?.readyAt ? ` (ready in ${Math.max(0, Math.ceil((Number(intent.readyAt) - Date.now()) / 1000))}s)` : "";
    aiIntent.textContent = intent?.text ? `${intent.text}${thinking}` : (snapshot.phase === "finished" ? "The battle is complete. Review the placements below." : "Waiting for the next command.");
    const eliminations = Array.isArray(snapshot.eliminationOrder) ? snapshot.eliminationOrder : [];
    const placements = Array.isArray(snapshot.placements) ? snapshot.placements : [];
    const entries = eliminations.length ? eliminations.map((entry: any) => `#${entry.eliminationOrder || ""} ${entry.name} — ${entry.reason}`) : [];
    if (placements.length) entries.push(...placements.map((entry: any) => `${entry.place}. ${entry.name}`));
    eliminationList.replaceChildren(...entries.map((label: string) => { const item = document.createElement("span"); item.textContent = label; return item; }));
  }
  function showNetworkResult(won: boolean, snapshot: any) { const draw = snapshot.outcome === "draw"; resultTitle.textContent = draw ? "Draw." : won ? "Congratulations, commander." : "Your tank is out of the fight."; resultMessage.textContent = draw ? "No tank remained after the final exchange. The room is recorded as a draw." : won ? "The authoritative room confirmed your victory." : "You are eliminated. Watch the remaining battle or review the final standings."; resultStats.replaceChildren(); const rows: Array<[string, string]> = [["Result", draw ? "Draw" : won ? "Victory" : "Defeat"], ["Server actions", String(snapshot.log?.length || 0)], ["Match turns", String(snapshot.turn)], ["Eliminations", String(snapshot.eliminationOrder?.length || 0)]]; (snapshot.placements || []).forEach((entry: any) => rows.push([`${entry.place}. ${entry.name}`, entry.reason || "final standing"])); rows.forEach(([label, value]) => { const row = document.createElement("div"); const name = document.createElement("span"); name.textContent = label; const amount = document.createElement("strong"); amount.textContent = value; row.append(name, amount); resultStats.append(row); }); setPanel("result"); }

  function replayTerrain(terrain: unknown, changes: number, frames: any[] = []) {
    replayPlaying = false; if (replayTimer) window.clearInterval(replayTimer); replayTimer = 0; historyReplayPlay.textContent = "Play";
    const fallback = Array.isArray(terrain) && terrain.length ? [{ terrain }] : []; replayFrames = frames.length ? frames : fallback;
    if (!replayFrames.length) { historyStatus.textContent = "This older record has no replay snapshot."; historyCanvas.hidden = true; historyReplay.hidden = true; return; }
    historyCanvas.hidden = false; historyStep.disabled = true; historyStep.max = String(Math.max(0, replayFrames.length - 1)); historyStep.value = String(replayFrames.length - 1); drawReplayFrame(Number(historyStep.value)); historyReplay.hidden = false; historyStep.disabled = replayFrames.length < 2; historyStatus.textContent = `Replay loaded. ${changes} recorded terrain change${changes === 1 ? "" : "s"}.`;
  }
  function drawReplayPaths(replayContext: CanvasRenderingContext2D, fireEvents: any[]) {
    for (const event of fireEvents) {
      const paths = Array.isArray(event.childPaths) ? event.childPaths : [];
      for (const path of paths) {
        if (!Array.isArray(path) || path.length < 2) continue;
        replayContext.globalAlpha = .48; replayContext.strokeStyle = projectileColor((event.weapon || "cannon") as WeaponId); replayContext.lineWidth = 1.5; replayContext.beginPath();
        path.forEach((point: any, pointIndex: number) => { const x = Number(point.x) * historyCanvas.width / CANVAS_WIDTH; const y = (Number(point.y) - 210) * (historyCanvas.height - 28) / 312 + 12; pointIndex ? replayContext.lineTo(x, y) : replayContext.moveTo(x, y); }); replayContext.stroke();
      }
    }
    replayContext.globalAlpha = 1;
  }
  function drawReplayFrame(index: number) {
    const frame = replayFrames[Math.max(0, Math.min(replayFrames.length - 1, index))]; const terrain = frame?.terrain; if (!Array.isArray(terrain) || !terrain.length) return;
    const context = historyCanvas.getContext("2d"); if (!context) return; const width = historyCanvas.width; const height = historyCanvas.height;
    context.clearRect(0, 0, width, height); context.fillStyle = "#101b41"; context.fillRect(0, 0, width, height); context.beginPath(); terrain.forEach((value: number, pointIndex: number) => { const x = pointIndex * width / (terrain.length - 1); const y = (Number(value) - 210) * (height - 28) / 312 + 12; pointIndex ? context.lineTo(x, y) : context.moveTo(x, y); }); context.lineTo(width, height); context.lineTo(0, height); context.closePath(); context.fillStyle = "#d7734a"; context.fill(); context.strokeStyle = "#ffb36e"; context.lineWidth = 2; context.beginPath(); terrain.forEach((value: number, pointIndex: number) => { const x = pointIndex * width / (terrain.length - 1); const y = (Number(value) - 210) * (height - 28) / 312 + 12; pointIndex ? context.lineTo(x, y) : context.moveTo(x, y); }); context.stroke();
    (frame.players || []).forEach((player: any) => { const x = Number(player.x) * width / 960; const y = (Number(player.y) - 210) * (height - 28) / 312 + 12; context.globalAlpha = player.alive === false ? .35 : 1; context.fillStyle = player.color || "#fff"; context.beginPath(); context.arc(x, Math.max(8, y - 5), 5, 0, Math.PI * 2); context.fill(); });
    const fireEvents = (frame.events || []).filter((event: any) => event.kind === "fire"); drawReplayPaths(context, fireEvents); context.globalAlpha = 1;
    fireEvents.slice(-4).forEach((event: any, eventIndex: number) => { const impacts = Array.isArray(event.childImpacts) && event.childImpacts.length ? event.childImpacts : [event.terrainChange || { center: 0 }]; impacts.forEach((impact: any, impactIndex: number) => { const center = Number(impact.center ?? event.terrainChange?.center ?? 0); const x = center * width / 960; const y = ((Number(terrain[Math.max(0, Math.min(terrain.length - 1, Math.round(center / 6)))]) || 365) - 210) * (height - 28) / 312 + 12; context.fillStyle = impact.damage > 0 ? "#fff4b0" : "#9dffea"; context.strokeStyle = "#10182c"; context.lineWidth = 2; context.beginPath(); context.arc(x, Math.max(8, y - 5 - eventIndex * 2), impactIndex === 0 ? 5 : 4, 0, Math.PI * 2); context.fill(); context.stroke(); }); });
    context.globalAlpha = 1; const safeIndex = Math.max(0, Math.min(replayFrames.length - 1, index)); historyStepValue.textContent = `${safeIndex + 1} / ${replayFrames.length}`; historyReplayStatus.textContent = `Turn ${frame.turn || "-"} · ${frame.phase === "finished" ? "Match complete" : "Action resolved"}`;
    const events = Array.isArray(frame.events) ? frame.events.slice(-8) : []; const labels = (events.length ? events : [{ kind: "snapshot", sequence: frame.sequence }]).map((event: any) => { const kind = String(event.kind || "event").replaceAll("-", " "); const seat = Number.isInteger(event.seat) ? ` · Seat ${event.seat + 1}` : ""; const count = event.kind === "fire" ? (event.childImpacts?.length || event.children || 1) : 0; const childCount = count ? ` · ${count} impact${count === 1 ? "" : "s"}` : ""; return `${kind}${seat}${event.weapon ? ` · ${event.weapon}` : ""}${childCount}${event.reason ? ` · ${event.reason}` : ""}`; }); historyEvents.replaceChildren(...labels.map((label: string) => { const item = document.createElement("span"); item.textContent = label; return item; }));
    const currentImpacts = fireEvents.flatMap((event: any) => Array.isArray(event.childImpacts) ? event.childImpacts : []).slice(-12); replayA11y.textContent = `Replay step ${safeIndex + 1} of ${replayFrames.length}. ${currentImpacts.length ? `${currentImpacts.length} confirmed impact${currentImpacts.length === 1 ? "" : "s"} visible.` : "No projectile impacts on this step."} ${labels.slice(-3).join(". ")}`;
  }
  async function loadHistory() {
    historyStatus.textContent = "Loading completed matches..."; historyList.replaceChildren(); historyCanvas.hidden = true; historyReplay.hidden = true; replayFrames = [];
    try { const response = await fetch("/api/boombox-history"); if (!response.ok) throw new Error("History unavailable"); const payload = await response.json(); const matches = Array.isArray(payload.matches) ? payload.matches : []; if (!matches.length) { const empty = document.createElement("p"); empty.className = "boombox-empty-state"; empty.textContent = "No completed Boom Box matches yet."; historyList.append(empty); historyStatus.textContent = "Completed rooms and terrain changes."; return; }
      matches.forEach((record: any) => { const card = document.createElement("article"); card.className = "boombox-history-card"; const title = document.createElement("strong"); title.textContent = record.name || record.gameId; const meta = document.createElement("small"); const winner = Number.isInteger(record.winner) ? record.players?.[record.winner]?.name || `Seat ${record.winner + 1}` : "No winner"; const when = record.finishedAt ? new Date(record.finishedAt).toLocaleString() : "Unknown time"; const changes = Array.isArray(record.log) ? record.log.filter((entry: any) => entry.terrainChange || entry.kind === "fire").length : 0; meta.textContent = `${record.gameId} · ${when} · Winner: ${winner} · ${record.players?.length || 0} commanders · ${changes} terrain changes`; const button = document.createElement("button"); button.type = "button"; button.className = "secondary"; button.textContent = "Replay match"; button.addEventListener("click", () => replayTerrain(record.terrainData, changes, Array.isArray(record.replay) ? record.replay : [])); card.append(title, meta, button); historyList.append(card); }); historyStatus.textContent = `${matches.length} completed match${matches.length === 1 ? "" : "es"} available.`;
    } catch { historyStatus.textContent = "History is temporarily unavailable."; const error = document.createElement("p"); error.className = "boombox-empty-state"; error.textContent = "Could not load the match archive. Try again."; historyList.append(error); }
  }
  function sendChat() { const text = chatInput.value.trim(); if (!text || !networkMode || !networkGameId) return; sendNetwork({ type: "boombox-chat", gameId: networkGameId, text }); chatInput.value = ""; chatInput.focus(); }

  function setPanel(next: BoomBoxView) {
    matchView = next; overlay.hidden = false; overlay.scrollTop = 0; overlay.classList.remove("is-platform"); overlay.classList.add("is-boombox"); platformPanel.hidden = true; gameCanvas.hidden = true; homeButton.hidden = false;
    modePanel.hidden = next !== "mode"; singlePanel.hidden = next !== "single"; loadoutPanel.hidden = next !== "loadout"; lobbyPanel.hidden = next !== "lobby"; historyPanel.hidden = next !== "history"; createPanel.hidden = next !== "create"; matchPanel.hidden = next !== "match"; resultPanel.hidden = next !== "result";
    if (next === "lobby") renderRooms();
    if (next === "history") loadHistory();
    if (next === "match") { resizeBattlefield(); drawScene(); requestAnimationFrame((now) => { lastFrame = now; matchAnimation = requestAnimationFrame(frame); }); }
  }

  function stopMatch() { if (matchAnimation) cancelAnimationFrame(matchAnimation); matchAnimation = 0; if (aiTimer) window.clearTimeout(aiTimer); aiTimer = 0; match = undefined; }
  function resetSoloNetworkIdentity() { soloNetworkMode = false; soloNetworkUserId = ""; soloLoadoutSynced = false; soloLoadoutPending = 0; }

  function close() {
    stopMatch(); overlay.classList.remove("is-boombox"); overlay.hidden = true; platformPanel.hidden = false; modePanel.hidden = true; singlePanel.hidden = true; loadoutPanel.hidden = true; lobbyPanel.hidden = true; historyPanel.hidden = true; createPanel.hidden = true; matchPanel.hidden = true; resultPanel.hidden = true; gameCanvas.hidden = false;
  }

  function roomStatus(room: BoomBoxRoom) { const waiting = Math.max(0, room.seats - room.connected); if (room.started) return "Match in progress"; if (waiting === 0) return "Ready to launch"; return `Waiting for ${waiting} commander${waiting === 1 ? "" : "s"}`; }

  function createRoomCard(room: BoomBoxRoom, mine: boolean) {
    const card = document.createElement("article"); card.className = `boombox-room-card${room.id === joinedRoomId ? " is-joined" : ""}`;
    const heading = document.createElement("div"); heading.className = "boombox-room-heading"; const title = document.createElement("div"); const name = document.createElement("strong"); name.textContent = room.name; const id = document.createElement("span"); id.textContent = room.id; title.append(name, id); const badge = document.createElement("span"); badge.className = `boombox-room-badge ${room.connected === room.seats ? "is-ready" : ""}`; badge.textContent = roomStatus(room); heading.append(title, badge);
    const details = document.createElement("div"); details.className = "boombox-room-details"; const creator = document.createElement("span"); creator.textContent = `Created by ${room.creator}`; const seats = document.createElement("span"); seats.textContent = `${room.connected}/${room.seats} connected`; const terrain = document.createElement("span"); terrain.textContent = `${room.terrain} - ${room.pace}`; const firingMode = document.createElement("span"); firingMode.textContent = `${room.firingMode || "sequential"} fire`; details.append(creator, seats, terrain, firingMode);
    const actions = document.createElement("div"); actions.className = "boombox-room-actions"; const action = document.createElement("button"); action.type = "button";
    if (mine) { action.className = "secondary"; action.textContent = networkMode && room.aiFill && room.connected < room.seats ? "Start with AI" : "Cancel room"; action.addEventListener("click", () => { if (networkMode && room.aiFill && room.connected < room.seats) { sendNetwork({ type: "boombox-start-ai", gameId: room.id }); return; } if (networkMode) { sendNetwork({ type: "boombox-cancel", gameId: room.id }); return; } createdRooms = createdRooms.filter((candidate) => candidate.id !== room.id); if (joinedRoomId === room.id) joinedRoomId = ""; lobbyStatus.textContent = `${room.name} was cancelled.`; renderRooms(); }); }
    else if (room.id === joinedRoomId) { action.className = "secondary"; action.textContent = "Joined"; action.disabled = true; }
    else { action.textContent = room.started ? "Watch room" : room.connected === room.seats ? "Full" : "Join room"; action.disabled = !room.started && (room.connected >= room.seats); action.addEventListener("click", () => { if (networkMode) { sendNetwork({ type: room.started ? "boombox-watch" : "boombox-join", gameId: room.id, name: networkUserId() }); return; } joinedRoomId = room.id; room.connected = Math.min(room.seats, room.connected + 1); lobbyStatus.textContent = `Joined ${room.name}. Waiting for the room to launch.`; renderRooms(); }); }
    const invite = document.createElement("button"); invite.type = "button"; invite.className = "secondary"; invite.textContent = "Copy invite"; invite.disabled = !room.inviteToken; invite.title = room.inviteToken ? "Copy a secure invite link" : "Only the room creator can copy the secure invite"; invite.addEventListener("click", async () => { const link = `${location.origin}/?boomboxRoom=${encodeURIComponent(room.id)}&boomboxInvite=${encodeURIComponent(room.inviteToken || "")}`; try { await navigator.clipboard.writeText(link); lobbyStatus.textContent = "Secure invite link copied."; } catch { lobbyStatus.textContent = link; } }); actions.append(action, invite); card.append(heading, details, actions); return card;
  }

  function renderRooms() {
    createdList.replaceChildren(...createdRooms.map((room) => createRoomCard(room, true))); availableList.replaceChildren(...availableRooms.map((room) => createRoomCard(room, false))); createdCount.textContent = `${createdRooms.length} room${createdRooms.length === 1 ? "" : "s"}`; availableCount.textContent = `${availableRooms.length} room${availableRooms.length === 1 ? "" : "s"}`;
    if (!createdRooms.length) { const empty = document.createElement("p"); empty.className = "boombox-empty-state"; empty.textContent = "You have not created a room yet."; createdList.append(empty); } if (!availableRooms.length) { const empty = document.createElement("p"); empty.className = "boombox-empty-state"; empty.textContent = "No open rooms right now. Create one and invite your commanders."; availableList.append(empty); }
  }

  function renderSeatPlan() {
    const count = clamp(Number(seatsInput.value) || 2, 2, 10);
    const nextModes = Array.from({ length: count }, (_, index) => index === 0 ? "human" as const : (seatModes[index] || "ai"));
    seatModes = nextModes;
    seatPlan.replaceChildren(...seatModes.map((mode, index) => {
      const label = document.createElement("label");
      label.textContent = `Seat ${index + 1}${index === 0 ? " · You" : ""}`;
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Seat ${index + 1} control`);
      select.disabled = index === 0;
      for (const optionValue of ["human", "ai"] as const) {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue === "human" ? "Human commander" : "AI commander";
        option.selected = mode === optionValue;
        select.append(option);
      }
      select.addEventListener("change", () => { seatModes[index] = select.value === "human" ? "human" : "ai"; updateCreateSummary(); });
      label.append(select);
      return label;
    }));
  }

  function updateCreateSummary() {
    const movementEnabled = movementInput.checked && firingModeInput.value === "sequential";
    const controlSummary = seatModes.slice(0, Number(seatsInput.value) || 2).map((mode, index) => `S${index + 1} ${mode === "ai" ? "AI" : "Human"}`).join(", ");
    const rows = [["Room", roomNameInput.value.trim() || "Unnamed room"], ["Commander", commanderInput.value.trim() || "Commander"], ["Terrain", terrainInput.selectedOptions[0]?.textContent || "Sunset Range"], ["Seats", seatsInput.selectedOptions[0]?.textContent || "4 commanders"], ["Seat control", controlSummary || "Seat 1 Human"], ["Firing mode", firingModeInput.selectedOptions[0]?.textContent || "Sequential"], ["Gravity", gravityInput.selectedOptions[0]?.textContent || "Standard - 150"], ["Wind", `${windModeInput.selectedOptions[0]?.textContent || "Variable wind"} (limit ${clamp(Number(windLimitInput.value) || 0, 0, 2).toFixed(1)})`], ["Edge behavior", boundaryInput.selectedOptions[0]?.textContent || "Stop at the edge"], ["Meteor showers", meteorEventsInput.checked ? "Enabled" : "Off"], ["Scenery markers", sceneryInput.checked ? "Enabled" : "Off"], ["Movement and fuel", movementEnabled ? "Enabled" : "Off"], ["Turn pace", paceInput.selectedOptions[0]?.textContent || "Standard"], ["AI personality", aiDifficultyInput.selectedOptions[0]?.textContent || "Veteran"], ["AI fill", aiFillInput.checked ? "Allowed" : "Off"], ["Starting credits", String(clamp(Number(startingMoneyInput.value) || 0, 0, 10000))], ["Equipment", fullCatalogueInput.checked ? "Full catalogue" : "Core catalogue"]];
    createSummary.replaceChildren(...rows.flatMap(([label, value]) => { const term = document.createElement("dt"); term.textContent = label; const description = document.createElement("dd"); description.textContent = value; return [term, description]; }));
  }
  function utilityLabel(id: UtilityId) { return UTILITIES[id]?.label || id; }
  function purchaseNetwork(category: "weapon" | "utility", item: string) {
    if (!networkMode || networkSpectator || !networkGameId || !item) return;
    sendNetwork({ type: "boombox-purchase", gameId: networkGameId, purchaseId: nextNetworkActionId(), category, item, quantity: 1 });
  }

  function setCreateStep(next: number) { createStep = clamp(next, 1, 3); steps.forEach((step) => { step.hidden = Number(step.dataset.boomboxStep) !== createStep; }); indicators.forEach((indicator) => { const number = Number(indicator.dataset.boomboxStepIndicator); indicator.classList.toggle("is-active", number === createStep); indicator.classList.toggle("is-complete", number < createStep); }); createBackButton.textContent = createStep === 1 ? "Back to lobby" : "Back"; createNextButton.hidden = createStep === 3; createSubmitButton.hidden = createStep !== 3; if (createStep === 3) updateCreateSummary(); }
  function openCreate() { const savedName = localStorage.getItem(playerNameKey)?.trim(); if (savedName && commanderInput.value === "Commander") commanderInput.value = savedName; renderSeatPlan(); setCreateStep(1); setPanel("create"); }
  function createRoom() { const advancedWeapons: WeaponId[] = ["heavy-cannon", "heavy-shell", "precision-round", "split-shell", "mini-nuke", "mirv", "triple-shot", "bouncing-bomb", "riot-bomb", "piercing-round", "napalm", "smoke-shell", "liquid-dirt", "terrain-tool", "terrain-remover", "tracer-round", "laser-line", "area-charge"]; const advancedUtilities: UtilityId[] = ["heavy-shield", "shield-recharge", "fuel-canister", "guidance-kit", "turret-upgrade"]; const config = { name: roomNameInput.value.trim() || "Unnamed room", creator: commanderInput.value.trim() || networkUserId(), seats: Number(seatsInput.value), aiSeats: seatModes.map((mode, index) => mode === "ai" && index > 0 ? index : -1).filter((index) => index >= 0), terrain: terrainInput.value, pace: paceInput.value, aiDifficulty: aiDifficultyInput.value, aiFill: aiFillInput.checked, firingMode: firingModeInput.value, movement: movementInput.checked && firingModeInput.value === "sequential", gravity: Number(gravityInput.value), windMode: windModeInput.value, windLimit: clamp(Number(windLimitInput.value) || 0, 0, 2), boundary: boundaryInput.value, events: { meteorShower: meteorEventsInput.checked, scenery: sceneryInput.checked }, startingMoney: clamp(Number(startingMoneyInput.value) || 0, 0, 10000), disabledWeapons: fullCatalogueInput.checked ? [] : advancedWeapons, disabledUtilities: fullCatalogueInput.checked ? [] : advancedUtilities, seed: 314159 }; if (networkMode) { sendNetwork({ type: "boombox-create", config }); setPanel("lobby"); return; } const room: BoomBoxRoom = { id: `BB-${roomSequence++}`, name: config.name, creator: config.creator || "Commander", seats: config.seats, connected: 1, terrain: terrainInput.selectedOptions[0]?.textContent || "Sunset Range", pace: paceInput.selectedOptions[0]?.textContent?.split(" - ")[0] || "Standard", firingMode: config.firingMode, aiFill: aiFillInput.checked, started: false }; createdRooms = [room, ...createdRooms]; joinedRoomId = room.id; lobbyStatus.textContent = `${room.name} created. Share the room code when the match is ready.`; setPanel("lobby"); }

  function renderShop() {
    shopCreditsValue.textContent = String(shopCredits);
    const weaponCards = (Object.keys(WEAPONS) as WeaponId[]).filter((id) => id !== "cannon").map((id) => {
      const card = document.createElement("article"); card.className = "boombox-shop-card";
      const title = document.createElement("strong"); title.textContent = WEAPONS[id].label;
      const capacity = Number(WEAPONS[id].inventory) || 0; const owned = Number(shopInventory[id]) || 0; const description = document.createElement("small"); description.textContent = `${WEAPONS[id].description} ${WEAPONS[id].cost} credits per shot · ${owned}/${capacity} loaded.`;
      const button = document.createElement("button"); button.type = "button"; button.textContent = owned >= capacity ? "Capacity reached" : `Buy for ${WEAPONS[id].cost}`; button.disabled = owned >= capacity || shopCredits < WEAPONS[id].cost; button.addEventListener("click", () => { if (button.disabled) return; shopCredits -= WEAPONS[id].cost; shopInventory[id] = Math.min(capacity, owned + 1); renderShop(); });
      card.append(title, description, button); return card;
    });
    const utilityCards = (Object.keys(UTILITIES) as UtilityId[]).map((id) => { const card = document.createElement("article"); card.className = "boombox-shop-card"; const title = document.createElement("strong"); title.textContent = UTILITIES[id].label; const description = document.createElement("small"); description.textContent = `${UTILITIES[id].description} ${UTILITIES[id].cost} credits.`; const button = document.createElement("button"); button.type = "button"; button.className = "secondary"; button.textContent = "Available in match utilities"; button.disabled = true; card.append(title, description, button); return card; });
    shopList.replaceChildren(...weaponCards, ...utilityCards);
  }

  function recordAction(kind: string, payload: unknown) { if (!match) return; const entry = { sequence: match.actionLog.length + 1, kind, payload: JSON.stringify(payload) }; match.actionLog.push(entry); }
  function mutateSoloTerrain(center: number, radius: number, depth: number, material = "dirt", solid = true) {
    if (!match) return;
    applyCrater(match.terrain, center, radius, depth);
    const start = clamp(Math.round(center - radius), 0, CANVAS_WIDTH - 1); const end = clamp(Math.round(center + radius), 0, CANVAS_WIDTH - 1);
    if (match.terrainSolid) for (let index = start; index <= end; index += 1) match.terrainSolid[index] = solid;
    if (match.terrainMaterial) for (let index = start; index <= end; index += 1) match.terrainMaterial[index] = material;
  }
  function tickSoloStatuses() {
    if (!match) return;
    for (const tank of [match.player, ...match.opponents]) if (tank.alive && (tank.burning || 0) > 0) { const damage = 18; tank.health = Math.max(0, tank.health - damage); tank.burning = Math.max(0, (tank.burning || 0) - 1); if (tank.health === 0) tank.alive = false; recordAction("burn", { tank: tank.label, damage, turnsLeft: tank.burning }); }
  }

  function resizeBattlefield() { const rect = battlefield.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1; battlefield.width = Math.max(1, Math.round(rect.width * ratio)); battlefield.height = Math.max(1, Math.round(rect.height * ratio)); context.setTransform(battlefield.width / CANVAS_WIDTH, 0, 0, battlefield.height / CANVAS_HEIGHT, 0, 0); }
  function startSoloLocalMatch() {
    const seed = clamp(Number(soloSeedInput.value) || 314159, 1, 999999);
    const terrainName = soloTerrainInput.selectedOptions[0]?.textContent || "Sunset Range";
    const terrain = makeTerrain(seed, soloTerrainInput.value);
    const opponentCount = clamp(Number(opponentsInput.value) || 2, 1, 3);
    const positions = opponentCount === 1 ? [814] : opponentCount === 2 ? [700, 842] : [620, 748, 860];
    const colors = ["#ff8b63", "#d98cff", "#b8f266"];
    const opponents = positions.map((x, index) => ({ x, y: terrain[x] - 17, health: 100, alive: true, falling: false, fallVelocity: 0, label: `Rival ${index + 1}`, color: colors[index], shield: 0, fuel: 100, upgrades: {} }));
    const weaponId = soloWeaponInput.value as WeaponId;
    const utilityId = soloUtilityInput.value as UtilityId;
    const inventory = { ...shopInventory }; inventory.cannon = Math.max(99, inventory.cannon); if (inventory[weaponId] < 1 && weaponId !== "cannon") inventory[weaponId] = 1;
    const utilities = Object.fromEntries((Object.keys(UTILITIES) as UtilityId[]).map((id) => [id, Number(UTILITIES[id].starter) || 0])) as Record<UtilityId, number>;
    if ((utilities[utilityId] || 0) < 1) utilities[utilityId] = 1;
    match = { seed, terrainName, terrain, terrainSolid: Array(CANVAS_WIDTH).fill(true), terrainMaterial: Array(CANVAS_WIDTH).fill("dirt"), wind: (seed % 17 - 8) / 10, turn: 1, player: { x: 146, y: terrain[146] - 17, health: 100, alive: true, falling: false, fallVelocity: 0, label: soloNameInput.value.trim() || "Commander", color: "#54e7ff", shield: utilityId === "shield" ? Number(UTILITIES.shield.amount) || 35 : 0, fuel: 100, upgrades: {} }, opponents, targetIndex: 0, aiIndex: 0, weaponId, utilityId, utilityUsed: utilityId === "shield", credits: shopCredits, inventory, utilities, difficulty: soloDifficultyInput.value as Difficulty, phase: "aiming", shots: 0, hits: 0, damageDealt: 0, damageTaken: 0, craters: 0, creditsSpent: 100 - shopCredits, startedAt: performance.now(), actionLog: [] };
    recordAction("match-start", { seed, opponents: opponentCount, difficulty: match.difficulty, weaponId, utilityId });
    targetSignature = ""; opponentHealthSignature = ""; playerLabel.textContent = match.player.label; matchSeed.textContent = `Seed ${seed}`; matchTerrain.textContent = terrainName; matchStatus.textContent = "Your turn. Set the shot."; shotLog.textContent = "Shot log: match ready."; weaponInput.value = weaponId; targetInput.value = "0"; setPanel("match"); updateControls();
  }
  function startSoloMatch() {
    if (typeof WebSocket === "undefined") return startSoloLocalMatch();
    const name = soloNameInput.value.trim() || localStorage.getItem(playerNameKey)?.trim() || "Commander";
    localStorage.setItem(playerNameKey, name);
    soloNetworkMode = true; soloNetworkUserId = `${name}-solo-${Date.now().toString(36)}`; soloLoadoutSynced = false; soloLoadoutPending = 0;
    soloDesiredWeaponId = soloWeaponInput.value as WeaponId; soloDesiredUtilityId = soloUtilityInput.value as UtilityId;
    networkMode = true;
    if (networkSocket) { try { networkSocket.close(); } catch {} networkSocket = undefined; }
    const opponentCount = clamp(Number(opponentsInput.value) || 2, 1, 3);
    const config = { name: `Solo range for ${name}`, creator: name, seats: opponentCount + 1, aiSeats: Array.from({ length: opponentCount }, (_, index) => index + 1), aiFill: true, aiDifficulty: soloDifficultyInput.value, terrain: soloTerrainInput.value, firingMode: "sequential", movement: false, startingMoney: 100, disabledWeapons: [], disabledUtilities: [], seed: clamp(Number(soloSeedInput.value) || 314159, 1, 999999) };
    connectNetwork();
    sendNetwork({ type: "boombox-create", config });
    lobbyStatus.textContent = "Starting your authoritative solo match...";
  }
  function updateControls() {
    if (!match) return;
    angleValue.value = `${angleInput.value}°`; angleValue.textContent = `${angleInput.value}°`; powerValue.value = `${powerInput.value}%`; powerValue.textContent = `${powerInput.value}%`; windValue.textContent = `${match.wind >= 0 ? "+" : ""}${match.wind.toFixed(1)}`; turnValue.textContent = String(match.turn); creditsValue.textContent = String(match.credits); fuelValue.textContent = `Fuel ${Math.max(0, Math.floor(match.player.fuel ?? 100))}`; turnDeadlineValue.textContent = networkTurnDeadlineAt ? `${Math.max(0, Math.ceil((networkTurnDeadlineAt - Date.now()) / 1000))}s` : "Ready"; playerHealth.style.width = `${clamp(match.player.health, 0, 100)}%`; playerHealthValue.textContent = `${Math.max(0, Math.ceil(match.player.health))} HP`;
    const nextTargetSignature = match.opponents.map((opponent) => `${opponent.label}:${opponent.alive}`).join("|");
    if (nextTargetSignature !== targetSignature) { targetSignature = nextTargetSignature; targetInput.replaceChildren(...match.opponents.map((opponent, index) => { const option = document.createElement("option"); option.value = String(index); option.textContent = `${opponent.label}${opponent.alive ? "" : " - destroyed"}`; option.disabled = !opponent.alive; return option; })); }
    targetInput.value = String(match.targetIndex);
    const nextHealthSignature = match.opponents.map((opponent) => `${opponent.health}:${opponent.alive}`).join("|");
    if (nextHealthSignature !== opponentHealthSignature) { opponentHealthSignature = nextHealthSignature; opponentHealthList.replaceChildren(...match.opponents.map((opponent) => { const row = document.createElement("div"); row.className = "boombox-opponent-health"; const label = document.createElement("span"); label.textContent = opponent.label; const track = document.createElement("span"); track.className = "boombox-health-track"; const fill = document.createElement("i"); fill.style.width = `${clamp(opponent.health, 0, 100)}%`; fill.style.background = opponent.color; track.append(fill); const value = document.createElement("strong"); value.textContent = opponent.alive ? `${Math.max(0, Math.ceil(opponent.health))} HP` : "OUT"; row.append(label, track, value); return row; })); }
    difficultyValue.textContent = networkMode ? (networkSpectator ? "Spectator" : "Server") : match.difficulty[0].toUpperCase() + match.difficulty.slice(1); utilityInput.value = match.utilityId; const canSubmit = networkCanSubmit(); const canMove = networkMode && networkMovementEnabled && networkFiringMode === "sequential" && canSubmit && match.phase === "aiming" && match.player.alive && !match.player.movedThisTurn && (match.player.fuel ?? 0) >= 5; moveLeftButton.disabled = !canMove; moveRightButton.disabled = !canMove; fireButton.disabled = match.phase !== "aiming" || !match.player.alive || (networkMode ? !canSubmit : (match.weaponId !== "cannon" && match.inventory[match.weaponId] < 1)); utilityButton.disabled = match.phase !== "aiming" || match.utilityUsed || (match.utilities[match.utilityId] || 0) < 1 || (match.utilityId === "repair-kit" && match.player.health >= 100) || (networkMode && !canSubmit); utilityButton.textContent = networkMode ? (networkSpectator ? "Spectator controls disabled" : canSubmit ? `Use ${utilityLabel(match.utilityId)}` : networkFiringMode === "sequential" ? "Waiting for your turn" : "Shot prepared") : match.utilityUsed ? `${utilityLabel(match.utilityId)} used` : `${utilityLabel(match.utilityId)} ready`; buyWeaponButton.disabled = !networkMode || networkSpectator || match.phase === "finished"; buyUtilityButton.disabled = !networkMode || networkSpectator || match.phase === "finished"; fireButton.textContent = `${WEAPONS[match.weaponId].label} (${WEAPONS[match.weaponId].cost || "free"})`;
  }

  function terrainMaterialColor(material: string) { return material === "smoke" ? "rgba(176, 190, 214, .5)" : material === "reinforced" ? "rgba(255, 207, 104, .48)" : material === "liquid-dirt" ? "rgba(112, 225, 187, .42)" : material === "excavated" ? "rgba(82, 74, 112, .58)" : material === "meteor" ? "rgba(255, 96, 78, .64)" : material === "scenery" ? "rgba(126, 232, 190, .34)" : "rgba(215, 115, 74, .22)"; }
  function drawTerrain() {
    if (!match) return; context.fillStyle = "#0d1731"; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); const sky = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT); sky.addColorStop(0, "#101b41"); sky.addColorStop(1, "#261436"); context.fillStyle = sky; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = "rgba(146, 229, 255, .23)"; for (let x = 30; x < CANVAS_WIDTH; x += 80) { context.fillRect(x, 64 + (x % 5) * 7, 2, 2); context.fillRect(x + 26, 124 + (x % 7) * 8, 2, 2); }
    context.beginPath(); context.moveTo(0, CANVAS_HEIGHT); context.lineTo(0, match.terrain[0]); match.terrain.forEach((height, x) => context.lineTo(x, height)); context.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); context.closePath(); const ground = context.createLinearGradient(0, 250, 0, CANVAS_HEIGHT); ground.addColorStop(0, "#d7734a"); ground.addColorStop(1, "#532844"); context.fillStyle = ground; context.fill();
    if (match.terrainMaterial) for (let x = 0; x < CANVAS_WIDTH; x += 8) { const material = match.terrainMaterial[x] || "dirt"; if (material !== "dirt") { context.fillStyle = terrainMaterialColor(material); context.fillRect(x, match.terrain[x], 8, CANVAS_HEIGHT - match.terrain[x]); } }
    context.strokeStyle = "#ffb36e"; context.lineWidth = 3; context.beginPath(); match.terrain.forEach((height, x) => x ? context.lineTo(x, height) : context.moveTo(x, height)); context.stroke();
  }
  function drawTank(tank: Tank, color: string, facing: number) { context.save(); context.translate(tank.x, tank.y); context.globalAlpha = tank.alive ? 1 : .38; if (tank.falling) context.rotate(Math.min(Math.PI / 4, tank.fallVelocity / 260)); context.shadowBlur = tank.alive ? 12 : 0; context.shadowColor = color; context.fillStyle = color; context.beginPath(); context.roundRect(-19, -11, 38, 15, 5); context.fill(); context.shadowBlur = 0; context.fillStyle = "#10182c"; context.beginPath(); context.roundRect(-15, 3, 11, 6, 3); context.roundRect(4, 3, 11, 6, 3); context.fill(); context.fillStyle = "#f6fbff"; context.beginPath(); context.arc(0, -13, 8, 0, Math.PI * 2); context.fill(); context.strokeStyle = color; context.lineWidth = 5; context.beginPath(); context.moveTo(0, -13); context.lineTo(facing * 25, -19); context.stroke(); if ((tank.burning || 0) > 0) { context.fillStyle = "#ffcf5a"; context.beginPath(); context.arc(-facing * 12, -16, 4, 0, Math.PI * 2); context.fill(); } context.restore(); }  function drawAim() { if (!match || match.phase !== "aiming") return; const angle = Number(angleInput.value) * Math.PI / 180; const power = Number(powerInput.value) * 7; const x = match.player.x + 22; const y = match.player.y - 17; context.save(); context.setLineDash([7, 8]); context.strokeStyle = "rgba(255, 224, 154, .72)"; context.lineWidth = 2; context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.cos(angle) * power * .85, y - Math.sin(angle) * power * .85); context.stroke(); context.restore(); }
  function projectileColor(weaponId: WeaponId) { const mode = WEAPONS[weaponId]?.mode; return mode === "laser" ? "#ff6ff2" : mode === "napalm" ? "#ff8b5e" : mode === "smoke" ? "#c8d0df" : mode === "bounce" ? "#9dff7a" : mode === "piercing" ? "#8be9fd" : "#fff4b0"; }
  function drawProjectile() {
    if (!match) return;
    if (networkMode && networkFlights.length) {
      context.save();
      for (const flight of networkFlights) {
        const path = flight.path;
        const point = path[Math.min(networkFlightIndex, path.length - 1)];
        const color = projectileColor(flight.weapon || networkFlightWeapon);
        context.globalAlpha = .28; context.strokeStyle = color; context.lineWidth = 2; context.beginPath();
        path.forEach((trailPoint, index) => index ? context.lineTo(trailPoint.x, trailPoint.y) : context.moveTo(trailPoint.x, trailPoint.y)); context.stroke();
        context.globalAlpha = 1; context.fillStyle = color; context.shadowBlur = 18; context.shadowColor = color;
        context.beginPath(); context.arc(point.x, point.y, (flight.weapon || networkFlightWeapon) === "laser-line" ? 5 : 7, 0, Math.PI * 2); context.fill();
      }
      if (networkFlightImpacts.length && networkFlightIndex >= networkFlight.length - 1) { context.globalAlpha = .78; for (const impact of networkFlightImpacts) { const x = clamp(Number(impact.center) || 0, 0, CANVAS_WIDTH - 1); const y = match.terrain[x] || 365; context.fillStyle = impact.damage && impact.damage > 0 ? "#fff4b0" : "#9dffea"; context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill(); } }
      context.restore(); return;
    }
    if (!match.projectile) return;
    const projectile = match.projectile; const color = projectileColor(projectile.weaponId);
    context.save(); context.strokeStyle = projectile.owner === "player" ? "rgba(102, 231, 255, .45)" : "rgba(255, 165, 99, .45)"; context.lineWidth = 3; context.beginPath(); projectile.trail.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); context.fillStyle = color; context.shadowBlur = 16; context.shadowColor = color; context.beginPath(); context.arc(projectile.x, projectile.y, projectile.weaponId === "laser-line" ? 5 : 6, 0, Math.PI * 2); context.fill(); context.restore();
  }
  function drawScene() { if (!match) return; drawTerrain(); drawTank(match.player, match.player.color, 1); match.opponents.forEach((opponent) => drawTank(opponent, opponent.color, -1)); drawAim(); drawProjectile(); }
  function updateFalling(tank: Tank, dt: number) { if (!tank.falling) return; tank.fallVelocity += 180 * dt; tank.y += tank.fallVelocity * dt; if (tank.y > CANVAS_HEIGHT + 30) { tank.alive = false; tank.health = 0; } }

  function resolveImpact(x: number, y: number, owner: "player" | "ai") {
    if (!match) return;
    const projectile = match.projectile; const weapon = WEAPONS[projectile?.weaponId || match.weaponId]; const target = owner === "player" ? match.opponents[match.targetIndex] : match.player;
    const distance = Math.abs(target.x - x); const direct = distance < 22 && Math.abs(target.y - y) < 30; const radius = direct ? weapon.radius + 20 : weapon.radius; const depth = direct ? weapon.depth + 10 : weapon.depth; const center = clamp(Math.round(x), 0, CANVAS_WIDTH - 1); const mode = weapon.mode || "single";
    mutateSoloTerrain(center, radius, depth, weapon.material || (mode === "smoke" ? "smoke" : "dirt"), mode !== "remover"); match.craters += 1; recordAction("impact", { owner, weapon: projectile?.weaponId || match.weaponId, mode, center, radius, depth });
    if (weapon.directDamage > 0 && distance < radius + 18 && target.alive) { const rawDamage = direct ? weapon.directDamage : Math.max(12, Math.round(weapon.splashDamage * (1 - distance / (radius + 18)))); const absorbed = Math.min(target.shield, rawDamage); target.shield -= absorbed; const damage = rawDamage - absorbed; target.health = Math.max(0, target.health - damage); if (mode === "napalm") target.burning = Math.max(target.burning || 0, weapon.burningTurns || 2); if (owner === "player") match.damageDealt += damage; else match.damageTaken += damage; match.hits += 1; shotLog.textContent = `Shot log: ${owner === "player" ? (direct ? "Direct hit" : "Blast hit") : "Rival impact"} for ${damage} damage${absorbed ? ` (${absorbed} shielded)` : ""}.`; }
    else if (weapon.directDamage === 0) shotLog.textContent = `Shot log: ${weapon.label} resolved at ${center}.`;
    else shotLog.textContent = `Shot log: impact at ${center}; no tank damage.`;
    const childCount = Math.max(1, weapon.count || 1); for (let child = 1; child < childCount; child += 1) { const offset = (child - (childCount - 1) / 2) * (weapon.spread || 24); mutateSoloTerrain(center + offset, Math.max(12, weapon.radius * .72), weapon.depth * .72, weapon.material || "dirt", mode !== "remover"); match.craters += 1; recordAction("child-impact", { weapon: projectile?.weaponId || match.weaponId, center: Math.round(center + offset), child }); }
    if (mode === "terrain-tool" || mode === "filler") shotLog.textContent = `Shot log: ${weapon.label} changed the terrain; no tank damage.`;
    if (Math.abs(target.x - center) < radius * .72 && depth > 28) target.falling = true; if (target.alive && !target.falling) target.y = match.terrain[Math.round(target.x)] - 17; match.projectile = undefined; match.phase = "resolve"; updateControls();
    if (!target.alive) { if (owner === "player") { match.targetIndex = match.opponents.findIndex((opponent) => opponent.alive); if (match.targetIndex < 0) { finishMatch("win"); return; } } else { finishMatch("lose"); return; } }
    tickSoloStatuses();
    if (!match.player.alive) { finishMatch("lose"); return; }
    if (owner === "player") { matchStatus.textContent = "Rival turn. Tracking trajectory..."; aiTimer = window.setTimeout(startAiTurn, 720); } else { match.turn += 1; match.wind = clamp(match.wind + ((match.seed + match.turn * 13) % 7 - 3) / 10, -1.2, 1.2); match.phase = "aiming"; match.utilityUsed = false; matchStatus.textContent = "Your turn. Set the shot."; updateControls(); }
  }
  function stepProjectile(dt: number) {
    if (!match?.projectile) return; const projectile = match.projectile; const weapon = WEAPONS[projectile.weaponId]; const previousX = projectile.x; const previousY = projectile.y; projectile.vx += match.wind * 20 * dt; projectile.vy += GRAVITY * dt;
    if (weapon.guided) { const target = projectile.owner === "player" ? match.opponents[match.targetIndex] : match.player; if (target?.alive) { projectile.vx += (target.x - projectile.x) * .012; projectile.vy += ((target.y - 12) - projectile.y) * .012; } }
    projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt; projectile.trail.push({ x: projectile.x, y: projectile.y }); if (projectile.trail.length > 18) projectile.trail.shift(); const target = projectile.owner === "player" ? match.opponents[match.targetIndex] : match.player; const crossedTank = target.alive && Math.hypot(projectile.x - target.x, projectile.y - target.y) < 18;
    if (weapon.mode === "bounce" && (projectile.x < 0 || projectile.x > CANVAS_WIDTH - 1)) { if ((projectile.bounces || 0) < (weapon.bounces || 0)) { projectile.x = clamp(projectile.x, 0, CANVAS_WIDTH - 1); projectile.vx *= -.82; projectile.bounces = (projectile.bounces || 0) + 1; } else { resolveImpact(projectile.x, projectile.y, projectile.owner); return; } }
    const terrainIndex = clamp(Math.round(projectile.x), 0, CANVAS_WIDTH - 1); const terrainY = match.terrain[terrainIndex]; const terrainSolid = match.terrainSolid?.[terrainIndex] !== false; const terrainHit = !weapon.ignoreTerrain && terrainSolid && projectile.y >= terrainY; if (crossedTank || terrainHit || projectile.x < -10 || projectile.x > CANVAS_WIDTH + 10 || projectile.y > CANVAS_HEIGHT + 20) { if (!crossedTank && terrainHit && weapon.mode === "bounce" && (projectile.bounces || 0) < (weapon.bounces || 0)) { projectile.y = terrainY - 2; projectile.vy *= -.82; projectile.bounces = (projectile.bounces || 0) + 1; return; } resolveImpact(crossedTank ? target.x : projectile.x, crossedTank ? target.y : projectile.y, projectile.owner); return; }
    if (Math.abs(projectile.x - previousX) > 40 || Math.abs(projectile.y - previousY) > 40) resolveImpact(projectile.x, projectile.y, projectile.owner);
  }  function stepMatch(dt: number) { if (!match) return; updateFalling(match.player, dt); match.opponents.forEach((opponent) => updateFalling(opponent, dt)); if (match.phase === "flight") stepProjectile(dt); if (!match.player.alive) finishMatch("lose"); else if (!match.opponents.some((opponent) => opponent.alive)) finishMatch("win"); }
  function frame(now: number) { if (!match || matchView !== "match") return; const elapsed = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now; if (!playbackPaused && networkMode && networkFlight.length) { networkFlightIndex = Math.min(networkFlight.length - 1, networkFlightIndex + Math.max(1, Math.round(elapsed * 30 * playbackSpeed))); if (networkFlightIndex >= networkFlight.length - 1 && networkFlightBundleId && !networkFlightAckSent) { networkFlightAckSent = true; sendNetwork({ type: "boombox-flight-ack", gameId: networkGameId, bundleId: networkFlightBundleId }); networkFlight = []; networkFlights = []; networkFlightImpacts = []; } } accumulator += elapsed; while (accumulator >= FIXED_DT) { stepMatch(FIXED_DT); accumulator -= FIXED_DT; } drawScene(); updateControls(); matchAnimation = requestAnimationFrame(frame); }
  function moveNetwork(direction: -1 | 1) { if (!match || !networkMode || !networkMovementEnabled || !networkCanSubmit() || match.player.movedThisTurn) return; sendNetwork({ type: "boombox-action", actionId: nextNetworkActionId(), action: { kind: "move", direction, distance: 20 } }); matchStatus.textContent = "Movement submitted. Set your shot before the deadline."; updateControls(); }
  function fire(owner: "player" | "ai", angleDegrees: number, powerPercent: number, shooterIndex = -1) {
    if (!match || match.phase === "flight" || match.phase === "finished") return;
    if (networkMode && owner === "player") { sendNetwork({ type: "boombox-action", actionId: nextNetworkActionId(), action: { targetIndex: networkOpponentSeats[match.targetIndex] ?? networkOpponentSeats[0], weapon: match.weaponId, angle: angleDegrees, power: powerPercent } }); matchStatus.textContent = "Shot submitted. Waiting for server confirmation..."; updateControls(); return; }
    const tank = owner === "player" ? match.player : match.opponents[shooterIndex]; const weaponId = owner === "player" ? match.weaponId : "cannon"; const weapon = WEAPONS[weaponId]; if (owner === "player" && weaponId !== "cannon" && match.inventory[weaponId] < 1) { matchStatus.textContent = `No ${weapon.label} left in your loadout.`; return; }
    if (owner === "player" && weaponId !== "cannon") match.inventory[weaponId] -= 1;
    const direction = owner === "player" ? 1 : -1; const angle = angleDegrees * Math.PI / 180; const speed = powerPercent * 7 * weapon.speed; match.projectile = { x: tank.x + direction * 22, y: tank.y - 17, vx: Math.cos(angle) * speed * direction, vy: -Math.sin(angle) * speed, owner, shooterIndex, weaponId, trail: [], bounces: 0 }; match.phase = "flight"; match.shots += 1; recordAction("fire", { owner, shooterIndex, weapon: weaponId, angle: angleDegrees, power: powerPercent }); matchStatus.textContent = owner === "player" ? `${weapon.label} away. Watching the arc...` : `${tank.label} is firing...`; updateControls();
    if (weapon.mode === "laser") { const target = owner === "player" ? match.opponents[match.targetIndex] : match.player; resolveImpact(target.x, target.y, owner); }
  }  function startAiTurn() { if (!match || !match.player.alive) return; const next = match.opponents.findIndex((opponent) => opponent.alive); if (next < 0) { finishMatch("win"); return; } match.aiIndex = next; match.phase = "ai"; matchStatus.textContent = `${match.opponents[next].label} is lining up a shot...`; updateControls(); const targetDistance = Math.abs(match.opponents[next].x - match.player.x); const baseline = Math.atan2(Math.max(20, match.opponents[next].y - match.player.y), targetDistance) * 180 / Math.PI; const spread = match.difficulty === "ace" ? 3 : match.difficulty === "veteran" ? 10 : 20; const angle = clamp(30 + baseline * .35 + ((match.seed + match.turn * 11 + next * 9) % (spread * 2 + 1) - spread), 18, 72); const power = match.difficulty === "ace" ? clamp(56 + targetDistance / 15, 48, 88) : 54 + ((match.seed + match.turn * 7 + next * 5) % (match.difficulty === "veteran" ? 28 : 38)); aiTimer = window.setTimeout(() => fire("ai", angle, power, next), 650); }
  function finishMatch(result: "win" | "lose") { if (!match || match.phase === "finished") return; match.phase = "finished"; recordAction("match-end", { result }); if (aiTimer) window.clearTimeout(aiTimer); aiTimer = 0; const duration = Math.max(1, Math.round((performance.now() - match.startedAt) / 1000)); resultTitle.textContent = result === "win" ? "Congratulations, commander." : "Your tank is out of the fight."; resultMessage.textContent = result === "win" ? "The rival tanks have been destroyed. The range is yours." : "The rival tanks held the range. Adjust your angle and try again."; resultStats.replaceChildren(); [["Result", result === "win" ? "Victory" : "Defeat"], ["Shots fired", String(match.shots)], ["Impacts", String(match.hits)], ["Damage dealt", String(match.damageDealt)], ["Damage taken", String(match.damageTaken)], ["Craters / terrain changes", String(match.craters)], ["Credits spent", String(match.creditsSpent)], ["Action log entries", String(match.actionLog.length)], ["Match time", `${duration}s`]].forEach(([label, value]) => { const row = document.createElement("div"); const name = document.createElement("span"); name.textContent = label; const amount = document.createElement("strong"); amount.textContent = value; row.append(name, amount); resultStats.append(row); }); setPanel("result"); }
  function beginFromCanvas(event: PointerEvent) { if (!match || match.phase !== "aiming") return; const rect = battlefield.getBoundingClientRect(); const x = (event.clientX - rect.left) * CANVAS_WIDTH / rect.width; const y = (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height; const dx = Math.max(12, x - match.player.x); const dy = match.player.y - 17 - y; angleInput.value = String(Math.round(clamp(Math.atan2(dy, dx) * 180 / Math.PI, 8, 82))); powerInput.value = String(Math.round(clamp(Math.hypot(dx, dy) / 6, 25, 95))); updateControls(); }

  function useSoloUtility() {
    if (!match || match.phase !== "aiming" || match.utilityUsed || (networkMode && !networkCanSubmit())) return;
    if (networkMode) { sendNetwork({ type: "boombox-action", actionId: nextNetworkActionId(), action: { kind: "utility", utility: match.utilityId } }); matchStatus.textContent = "Utility submitted. Waiting for server confirmation..."; return; }
    const utility = UTILITIES[match.utilityId];
    if (!utility || (match.utilities[match.utilityId] || 0) < 1) return;
    const amount = Number(utility.amount) || 0;
    if (utility.effect === "repair") { match.player.health = Math.min(100, match.player.health + amount); shotLog.textContent = `Shot log: ${utility.label} restored ${amount} HP.`; }
    else if (utility.effect === "shield") { match.player.shield = Math.max(match.player.shield, amount); shotLog.textContent = `Shot log: ${utility.label} online; ${amount} damage is absorbed.`; }
    else if (utility.effect === "shield-recharge") { match.player.shield = Math.min(100, match.player.shield + amount); shotLog.textContent = `Shot log: ${utility.label} restored ${amount} shield.`; }
    else if (utility.effect === "terrain-lift") { mutateSoloTerrain(Math.round(match.player.x), 70, -26, "reinforced", true); match.player.y = match.terrain[Math.round(match.player.x)] - 17; match.craters += 1; shotLog.textContent = `Shot log: ${utility.label} raised cover around your tank.`; }
    else if (utility.effect === "fuel") { match.player.fuel = Math.min(100, (match.player.fuel ?? 0) + amount); shotLog.textContent = `Shot log: ${utility.label} restored ${amount} fuel.`; }
    else if (utility.effect === "parachute") { match.player.upgrades ||= {}; match.player.upgrades.parachute = (match.player.upgrades.parachute || 0) + 1; shotLog.textContent = `Shot log: ${utility.label} armed for the next terrain fall.`; }
    else if (utility.effect === "guidance") { match.player.upgrades ||= {}; match.player.upgrades.guidance = (match.player.upgrades.guidance || 0) + 1; shotLog.textContent = `Shot log: ${utility.label} armed for the next shot.`; }
    else if (utility.effect === "turret-upgrade") { match.player.upgrades ||= {}; match.player.upgrades.turret = (match.player.upgrades.turret || 0) + 1; shotLog.textContent = `Shot log: ${utility.label} installed.`; }
    match.utilities[match.utilityId] = Math.max(0, match.utilities[match.utilityId] - 1); match.utilityUsed = true; recordAction("utility", { utility: match.utilityId, effect: utility.effect, amount }); updateControls();
  }  modeSingleButton.addEventListener("click", () => { const savedName = localStorage.getItem(playerNameKey)?.trim(); if (savedName) soloNameInput.value = savedName; networkMode = false; setPanel("single"); }); modeMultiButton.addEventListener("click", () => { connectNetwork(); setPanel("lobby"); }); modeBackButton.addEventListener("click", () => { close(); window.dispatchEvent(new CustomEvent("boombox-back-games")); }); singleBackButton.addEventListener("click", () => setPanel("mode")); loadoutOpenButton.addEventListener("click", () => { shopCredits = 100; shopInventory = Object.fromEntries((Object.keys(WEAPONS) as WeaponId[]).map((id) => [id, id === "cannon" ? 99 : 0])) as Record<WeaponId, number>; renderShop(); setPanel("loadout"); }); loadoutBackButton.addEventListener("click", () => setPanel("single")); loadoutStartButton.addEventListener("click", () => startSoloMatch()); soloForm.addEventListener("submit", (event) => { event.preventDefault(); const name = soloNameInput.value.trim() || "Commander"; localStorage.setItem(playerNameKey, name); startSoloMatch(); }); createButton.addEventListener("click", openCreate); refreshButton.addEventListener("click", () => { if (networkMode) { sendNetwork({ type: "boombox-list" }); return; } const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); lobbyStatus.textContent = `Rooms refreshed at ${now}.`; availableRooms = [...availableRooms]; renderRooms(); }); historyOpenButton.addEventListener("click", () => setPanel("history")); historyRefreshButton.addEventListener("click", loadHistory); historyBackButton.addEventListener("click", () => setPanel("lobby")); historyStep.addEventListener("input", () => drawReplayFrame(Number(historyStep.value))); chatSendButton.addEventListener("click", sendChat); chatInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); sendChat(); } }); lobbyBackButton.addEventListener("click", () => setPanel("mode")); createBackButton.addEventListener("click", () => { if (createStep === 1) setPanel("lobby"); else setCreateStep(createStep - 1); }); createNextButton.addEventListener("click", () => setCreateStep(createStep + 1)); createForm.addEventListener("submit", (event) => { event.preventDefault(); if (createStep === 3) createRoom(); }); [roomNameInput, commanderInput, terrainInput, seatsInput, firingModeInput, gravityInput, windModeInput, windLimitInput, boundaryInput, meteorEventsInput, sceneryInput, paceInput, aiDifficultyInput, aiFillInput, startingMoneyInput, fullCatalogueInput, movementInput].forEach((input) => input.addEventListener("input", updateCreateSummary)); [angleInput, powerInput].forEach((input) => input.addEventListener("input", updateControls)); targetInput.addEventListener("change", () => { if (match) match.targetIndex = clamp(Number(targetInput.value), 0, match.opponents.length - 1); updateControls(); }); weaponInput.addEventListener("change", () => { if (match) match.weaponId = weaponInput.value as WeaponId; updateControls(); }); utilityInput.addEventListener("change", () => { if (match) match.utilityId = utilityInput.value as UtilityId; updateControls(); }); buyWeaponButton.addEventListener("click", () => purchaseNetwork("weapon", weaponInput.value)); buyUtilityButton.addEventListener("click", () => purchaseNetwork("utility", utilityInput.value)); utilityButton.addEventListener("click", () => { useSoloUtility(); }); moveLeftButton.addEventListener("click", () => moveNetwork(-1)); moveRightButton.addEventListener("click", () => moveNetwork(1)); fireButton.addEventListener("click", () => fire("player", Number(angleInput.value), Number(powerInput.value))); battlefield.addEventListener("pointerdown", beginFromCanvas); matchExitButton.addEventListener("click", () => { if (networkMode) sendNetwork({ type: networkSpectator ? "boombox-watch-leave" : "boombox-leave", gameId: networkGameId }); stopMatch(); resetSoloNetworkIdentity(); networkGameId = ""; networkSeat = -1; setPanel("mode"); }); resultRestartButton.addEventListener("click", () => networkMode ? (soloNetworkMode ? startSoloMatch() : setPanel("lobby")) : startSoloMatch()); resultBackButton.addEventListener("click", () => { if (networkMode && networkGameId) sendNetwork({ type: networkSpectator ? "boombox-watch-leave" : "boombox-leave", gameId: networkGameId }); stopMatch(); resetSoloNetworkIdentity(); networkGameId = ""; networkSeat = -1; setPanel("mode"); }); speedButtons.forEach((button, index) => button.addEventListener("click", () => { playbackSpeed = [1, 2, 4][index]; playbackPaused = false; speedButtons.forEach((candidate) => candidate.classList.remove("is-selected")); button.classList.add("is-selected"); pauseButton.textContent = "Pause"; })); pauseButton.addEventListener("click", () => { playbackPaused = !playbackPaused; pauseButton.textContent = playbackPaused ? "Resume" : "Pause"; }); window.addEventListener("resize", resizeBattlefield);
  populateSoloWeaponCatalog();
  seatsInput.addEventListener("change", renderSeatPlan);
  historyReplayPlay.addEventListener("click", () => {
    if (replayPlaying) { replayPlaying = false; if (replayTimer) window.clearInterval(replayTimer); replayTimer = 0; historyReplayPlay.textContent = "Play"; return; }
    if (replayFrames.length < 2) return;
    replayPlaying = true; historyReplayPlay.textContent = "Pause";
    replayTimer = window.setInterval(() => { const next = Number(historyStep.value) + 1; if (next >= replayFrames.length) { replayPlaying = false; window.clearInterval(replayTimer); replayTimer = 0; historyReplayPlay.textContent = "Play"; return; } historyStep.value = String(next); drawReplayFrame(next); }, Math.max(120, Math.round(700 / replaySpeed)));
  });
  historyReplaySpeedButtons.forEach((button, index) => button.addEventListener("click", () => { replaySpeed = [1, 2, 4][index]; historyReplaySpeedButtons.forEach((candidate) => candidate.classList.remove("is-selected")); button.classList.add("is-selected"); }));
  return { open: () => setPanel("mode"), close };
}
