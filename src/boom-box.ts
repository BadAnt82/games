type BoomBoxView = "mode" | "single" | "lobby" | "create" | "match" | "result";
type BoomBoxRoom = { id: string; name: string; creator: string; seats: number; connected: number; terrain: string; pace: string; aiFill: boolean; started: boolean };
type WeaponId = "cannon" | "heavy-shell" | "precision-round";
type UtilityId = "repair-kit" | "terrain-lift";
type Tank = { x: number; y: number; health: number; alive: boolean; falling: boolean; fallVelocity: number; label: string; color: string };
type Projectile = { x: number; y: number; vx: number; vy: number; owner: "player" | "ai"; shooterIndex: number; weaponId: WeaponId; trail: Array<{ x: number; y: number }> };
type MatchState = { seed: number; terrainName: string; terrain: number[]; wind: number; turn: number; player: Tank; opponents: Tank[]; targetIndex: number; aiIndex: number; weaponId: WeaponId; utilityId: UtilityId; utilityUsed: boolean; credits: number; phase: "aiming" | "ai" | "flight" | "resolve" | "finished"; projectile?: Projectile; shots: number; hits: number; startedAt: number };

const WEAPONS: Record<WeaponId, { label: string; cost: number; radius: number; depth: number; directDamage: number; splashDamage: number; speed: number }> = {
  cannon: { label: "Cannon", cost: 0, radius: 58, depth: 24, directDamage: 72, splashDamage: 48, speed: 1 },
  "heavy-shell": { label: "Heavy shell", cost: 30, radius: 84, depth: 40, directDamage: 88, splashDamage: 60, speed: .9 },
  "precision-round": { label: "Precision round", cost: 20, radius: 34, depth: 12, directDamage: 92, splashDamage: 34, speed: 1.18 },
};

const playerNameKey = "badant-games-player-name";
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

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}

export function makeTerrain(seed: number, profile = "sunset-range") {
  const random = seeded(seed);
  const baseline = profile === "ice-shelf" ? 342 : profile === "lunar-crater" ? 378 : 365;
  const roughness = profile === "ice-shelf" ? 16 : profile === "lunar-crater" ? 34 : 24;
  const terrain = Array.from({ length: CANVAS_WIDTH }, (_, x) => clamp(baseline + Math.sin(x / 82) * 28 + Math.sin(x / 31 + 1.4) * 12 + (random() - .5) * roughness, 245, 450));
  for (let pass = 0; pass < 3; pass += 1) for (let x = 1; x < terrain.length - 1; x += 1) terrain[x] = (terrain[x - 1] + terrain[x] + terrain[x + 1]) / 3;
  return terrain;
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
  const lobbyPanel = required<HTMLElement>("#boombox-lobby-panel");
  const createPanel = required<HTMLElement>("#boombox-create-panel");
  const matchPanel = required<HTMLElement>("#boombox-match-panel");
  const resultPanel = required<HTMLElement>("#boombox-result-panel");
  const modeSingleButton = required<HTMLButtonElement>("#boombox-mode-single");
  const modeMultiButton = required<HTMLButtonElement>("#boombox-mode-multi");
  const modeBackButton = required<HTMLButtonElement>("#boombox-mode-back");
  const singleBackButton = required<HTMLButtonElement>("#boombox-single-back");
  const soloForm = required<HTMLFormElement>("#boombox-solo-form");
  const soloNameInput = required<HTMLInputElement>("#boombox-solo-name");
  const soloTerrainInput = required<HTMLSelectElement>("#boombox-solo-terrain");
  const soloSeedInput = required<HTMLInputElement>("#boombox-solo-seed");
  const opponentsInput = required<HTMLSelectElement>("#boombox-opponents");
  const soloWeaponInput = required<HTMLSelectElement>("#boombox-solo-weapon");
  const soloUtilityInput = required<HTMLSelectElement>("#boombox-solo-utility");
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
  const paceInput = required<HTMLSelectElement>("#boombox-turn-pace");
  const aiFillInput = required<HTMLInputElement>("#boombox-ai-fill");
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
  const angleValue = required<HTMLOutputElement>("#boombox-angle-value");
  const powerValue = required<HTMLOutputElement>("#boombox-power-value");
  const targetInput = required<HTMLSelectElement>("#boombox-target");
  const weaponInput = required<HTMLSelectElement>("#boombox-weapon");
  const windValue = required<HTMLElement>("#boombox-wind");
  const turnValue = required<HTMLElement>("#boombox-turn");
  const creditsValue = required<HTMLElement>("#boombox-credits");
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

  let createStep = 1;
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
  let targetSignature = "";
  let opponentHealthSignature = "";

  function setPanel(next: BoomBoxView) {
    matchView = next; overlay.hidden = false; overlay.scrollTop = 0; overlay.classList.remove("is-platform"); overlay.classList.add("is-boombox"); platformPanel.hidden = true; gameCanvas.hidden = true; homeButton.hidden = false;
    modePanel.hidden = next !== "mode"; singlePanel.hidden = next !== "single"; lobbyPanel.hidden = next !== "lobby"; createPanel.hidden = next !== "create"; matchPanel.hidden = next !== "match"; resultPanel.hidden = next !== "result";
    if (next === "lobby") renderRooms();
    if (next === "match") { resizeBattlefield(); drawScene(); requestAnimationFrame((now) => { lastFrame = now; matchAnimation = requestAnimationFrame(frame); }); }
  }

  function stopMatch() { if (matchAnimation) cancelAnimationFrame(matchAnimation); matchAnimation = 0; if (aiTimer) window.clearTimeout(aiTimer); aiTimer = 0; match = undefined; }

  function close() {
    stopMatch(); overlay.classList.remove("is-boombox"); overlay.hidden = true; platformPanel.hidden = false; modePanel.hidden = true; singlePanel.hidden = true; lobbyPanel.hidden = true; createPanel.hidden = true; matchPanel.hidden = true; resultPanel.hidden = true; gameCanvas.hidden = false;
  }

  function roomStatus(room: BoomBoxRoom) { const waiting = Math.max(0, room.seats - room.connected); if (room.started) return "Match in progress"; if (waiting === 0) return "Ready to launch"; return `Waiting for ${waiting} commander${waiting === 1 ? "" : "s"}`; }

  function createRoomCard(room: BoomBoxRoom, mine: boolean) {
    const card = document.createElement("article"); card.className = `boombox-room-card${room.id === joinedRoomId ? " is-joined" : ""}`;
    const heading = document.createElement("div"); heading.className = "boombox-room-heading"; const title = document.createElement("div"); const name = document.createElement("strong"); name.textContent = room.name; const id = document.createElement("span"); id.textContent = room.id; title.append(name, id); const badge = document.createElement("span"); badge.className = `boombox-room-badge ${room.connected === room.seats ? "is-ready" : ""}`; badge.textContent = roomStatus(room); heading.append(title, badge);
    const details = document.createElement("div"); details.className = "boombox-room-details"; const creator = document.createElement("span"); creator.textContent = `Created by ${room.creator}`; const seats = document.createElement("span"); seats.textContent = `${room.connected}/${room.seats} connected`; const terrain = document.createElement("span"); terrain.textContent = `${room.terrain} - ${room.pace}`; details.append(creator, seats, terrain);
    const actions = document.createElement("div"); actions.className = "boombox-room-actions"; const action = document.createElement("button"); action.type = "button";
    if (mine) { action.className = "secondary"; action.textContent = "Cancel room"; action.addEventListener("click", () => { createdRooms = createdRooms.filter((candidate) => candidate.id !== room.id); if (joinedRoomId === room.id) joinedRoomId = ""; lobbyStatus.textContent = `${room.name} was cancelled.`; renderRooms(); }); }
    else if (room.id === joinedRoomId) { action.className = "secondary"; action.textContent = "Joined"; action.disabled = true; }
    else { action.textContent = room.connected === room.seats ? "Full" : "Join room"; action.disabled = room.started || room.connected >= room.seats; action.addEventListener("click", () => { joinedRoomId = room.id; room.connected = Math.min(room.seats, room.connected + 1); lobbyStatus.textContent = `Joined ${room.name}. Waiting for the room to launch.`; renderRooms(); }); }
    actions.append(action); card.append(heading, details, actions); return card;
  }

  function renderRooms() {
    createdList.replaceChildren(...createdRooms.map((room) => createRoomCard(room, true))); availableList.replaceChildren(...availableRooms.filter((room) => !room.started).map((room) => createRoomCard(room, false))); createdCount.textContent = `${createdRooms.length} room${createdRooms.length === 1 ? "" : "s"}`; availableCount.textContent = `${availableRooms.length} room${availableRooms.length === 1 ? "" : "s"}`;
    if (!createdRooms.length) { const empty = document.createElement("p"); empty.className = "boombox-empty-state"; empty.textContent = "You have not created a room yet."; createdList.append(empty); } if (!availableRooms.length) { const empty = document.createElement("p"); empty.className = "boombox-empty-state"; empty.textContent = "No open rooms right now. Create one and invite your commanders."; availableList.append(empty); }
  }

  function updateCreateSummary() {
    const rows = [["Room", roomNameInput.value.trim() || "Unnamed room"], ["Commander", commanderInput.value.trim() || "Commander"], ["Terrain", terrainInput.selectedOptions[0]?.textContent || "Sunset Range"], ["Seats", seatsInput.selectedOptions[0]?.textContent || "4 commanders"], ["Turn pace", paceInput.selectedOptions[0]?.textContent || "Standard"], ["AI fill", aiFillInput.checked ? "Allowed" : "Off"]];
    createSummary.replaceChildren(...rows.flatMap(([label, value]) => { const term = document.createElement("dt"); term.textContent = label; const description = document.createElement("dd"); description.textContent = value; return [term, description]; }));
  }

  function setCreateStep(next: number) { createStep = clamp(next, 1, 3); steps.forEach((step) => { step.hidden = Number(step.dataset.boomboxStep) !== createStep; }); indicators.forEach((indicator) => { const number = Number(indicator.dataset.boomboxStepIndicator); indicator.classList.toggle("is-active", number === createStep); indicator.classList.toggle("is-complete", number < createStep); }); createBackButton.textContent = createStep === 1 ? "Back to lobby" : "Back"; createNextButton.hidden = createStep === 3; createSubmitButton.hidden = createStep !== 3; if (createStep === 3) updateCreateSummary(); }
  function openCreate() { const savedName = localStorage.getItem(playerNameKey)?.trim(); if (savedName && commanderInput.value === "Commander") commanderInput.value = savedName; setCreateStep(1); setPanel("create"); }
  function createRoom() { const room: BoomBoxRoom = { id: `BB-${roomSequence++}`, name: roomNameInput.value.trim() || "Unnamed room", creator: commanderInput.value.trim() || "Commander", seats: Number(seatsInput.value), connected: 1, terrain: terrainInput.selectedOptions[0]?.textContent || "Sunset Range", pace: paceInput.selectedOptions[0]?.textContent?.split(" - ")[0] || "Standard", aiFill: aiFillInput.checked, started: false }; createdRooms = [room, ...createdRooms]; joinedRoomId = room.id; lobbyStatus.textContent = `${room.name} created. Share the room code when the match is ready.`; setPanel("lobby"); }

  function resizeBattlefield() { const rect = battlefield.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1; battlefield.width = Math.max(1, Math.round(rect.width * ratio)); battlefield.height = Math.max(1, Math.round(rect.height * ratio)); context.setTransform(battlefield.width / CANVAS_WIDTH, 0, 0, battlefield.height / CANVAS_HEIGHT, 0, 0); }
  function startSoloMatch() {
    const seed = clamp(Number(soloSeedInput.value) || 314159, 1, 999999);
    const terrainName = soloTerrainInput.selectedOptions[0]?.textContent || "Sunset Range";
    const terrain = makeTerrain(seed, soloTerrainInput.value);
    const opponentCount = clamp(Number(opponentsInput.value) || 2, 1, 3);
    const positions = opponentCount === 1 ? [814] : opponentCount === 2 ? [700, 842] : [620, 748, 860];
    const colors = ["#ff8b63", "#d98cff", "#b8f266"];
    const opponents = positions.map((x, index) => ({ x, y: terrain[x] - 17, health: 100, alive: true, falling: false, fallVelocity: 0, label: `Rival ${index + 1}`, color: colors[index] }));
    const weaponId = soloWeaponInput.value as WeaponId;
    const utilityId = soloUtilityInput.value as UtilityId;
    match = { seed, terrainName, terrain, wind: (seed % 17 - 8) / 10, turn: 1, player: { x: 146, y: terrain[146] - 17, health: 100, alive: true, falling: false, fallVelocity: 0, label: soloNameInput.value.trim() || "Commander", color: "#54e7ff" }, opponents, targetIndex: 0, aiIndex: 0, weaponId, utilityId, utilityUsed: false, credits: 100, phase: "aiming", shots: 0, hits: 0, startedAt: performance.now() };
    targetSignature = ""; opponentHealthSignature = ""; playerLabel.textContent = match.player.label; matchSeed.textContent = `Seed ${seed}`; matchTerrain.textContent = terrainName; matchStatus.textContent = "Your turn. Set the shot."; shotLog.textContent = "Shot log: match ready."; weaponInput.value = weaponId; targetInput.value = "0"; setPanel("match"); updateControls();
  }
  function updateControls() {
    if (!match) return;
    angleValue.value = `${angleInput.value}°`; angleValue.textContent = `${angleInput.value}°`; powerValue.value = `${powerInput.value}%`; powerValue.textContent = `${powerInput.value}%`; windValue.textContent = `${match.wind >= 0 ? "+" : ""}${match.wind.toFixed(1)}`; turnValue.textContent = String(match.turn); creditsValue.textContent = String(match.credits); playerHealth.style.width = `${clamp(match.player.health, 0, 100)}%`; playerHealthValue.textContent = `${Math.max(0, Math.ceil(match.player.health))} HP`;
    const nextTargetSignature = match.opponents.map((opponent) => `${opponent.label}:${opponent.alive}`).join("|");
    if (nextTargetSignature !== targetSignature) { targetSignature = nextTargetSignature; targetInput.replaceChildren(...match.opponents.map((opponent, index) => { const option = document.createElement("option"); option.value = String(index); option.textContent = `${opponent.label}${opponent.alive ? "" : " - destroyed"}`; option.disabled = !opponent.alive; return option; })); }
    targetInput.value = String(match.targetIndex);
    const nextHealthSignature = match.opponents.map((opponent) => `${opponent.health}:${opponent.alive}`).join("|");
    if (nextHealthSignature !== opponentHealthSignature) { opponentHealthSignature = nextHealthSignature; opponentHealthList.replaceChildren(...match.opponents.map((opponent) => { const row = document.createElement("div"); row.className = "boombox-opponent-health"; const label = document.createElement("span"); label.textContent = opponent.label; const track = document.createElement("span"); track.className = "boombox-health-track"; const fill = document.createElement("i"); fill.style.width = `${clamp(opponent.health, 0, 100)}%`; fill.style.background = opponent.color; track.append(fill); const value = document.createElement("strong"); value.textContent = opponent.alive ? `${Math.max(0, Math.ceil(opponent.health))} HP` : "OUT"; row.append(label, track, value); return row; })); }
    fireButton.disabled = match.phase !== "aiming" || !match.player.alive; utilityButton.disabled = match.phase !== "aiming" || match.utilityUsed || match.player.health >= 100 || match.utilityId !== "repair-kit"; utilityButton.textContent = match.utilityUsed ? "Repair kit used" : "Use repair kit (+30 HP)"; fireButton.textContent = `${WEAPONS[match.weaponId].label} (${WEAPONS[match.weaponId].cost || "free"})`;
  }

  function drawTerrain() { if (!match) return; context.fillStyle = "#0d1731"; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); const sky = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT); sky.addColorStop(0, "#101b41"); sky.addColorStop(1, "#261436"); context.fillStyle = sky; context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); context.fillStyle = "rgba(98, 218, 255, .16)"; for (let x = 30; x < CANVAS_WIDTH; x += 80) { context.fillRect(x, 64 + (x % 5) * 7, 2, 2); context.fillRect(x + 26, 124 + (x % 7) * 8, 2, 2); } context.beginPath(); context.moveTo(0, CANVAS_HEIGHT); context.lineTo(0, match.terrain[0]); match.terrain.forEach((height, x) => context.lineTo(x, height)); context.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); context.closePath(); const ground = context.createLinearGradient(0, 250, 0, CANVAS_HEIGHT); ground.addColorStop(0, "#d7734a"); ground.addColorStop(1, "#532844"); context.fillStyle = ground; context.fill(); context.strokeStyle = "#ffb36e"; context.lineWidth = 3; context.beginPath(); match.terrain.forEach((height, x) => x ? context.lineTo(x, height) : context.moveTo(x, height)); context.stroke(); }
  function drawTank(tank: Tank, color: string, facing: number) { context.save(); context.translate(tank.x, tank.y); context.globalAlpha = tank.alive ? 1 : .38; if (tank.falling) context.rotate(Math.min(Math.PI / 4, tank.fallVelocity / 260)); context.fillStyle = color; context.fillRect(-18, -10, 36, 14); context.fillStyle = "#10182c"; context.fillRect(-13, 4, 9, 5); context.fillRect(5, 4, 9, 5); context.fillStyle = "#f6fbff"; context.beginPath(); context.arc(0, -12, 8, 0, Math.PI * 2); context.fill(); context.strokeStyle = color; context.lineWidth = 5; context.beginPath(); context.moveTo(0, -12); context.lineTo(facing * 23, -18); context.stroke(); context.restore(); }
  function drawAim() { if (!match || match.phase !== "aiming") return; const angle = Number(angleInput.value) * Math.PI / 180; const power = Number(powerInput.value) * 7; const x = match.player.x + 22; const y = match.player.y - 17; context.save(); context.setLineDash([7, 8]); context.strokeStyle = "rgba(255, 224, 154, .72)"; context.lineWidth = 2; context.beginPath(); context.moveTo(x, y); context.lineTo(x + Math.cos(angle) * power * .85, y - Math.sin(angle) * power * .85); context.stroke(); context.restore(); }
  function drawProjectile() { if (!match?.projectile) return; const projectile = match.projectile; context.save(); context.strokeStyle = projectile.owner === "player" ? "rgba(102, 231, 255, .45)" : "rgba(255, 165, 99, .45)"; context.lineWidth = 3; context.beginPath(); projectile.trail.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.stroke(); context.fillStyle = "#fff4b0"; context.shadowBlur = 16; context.shadowColor = "#ffb15c"; context.beginPath(); context.arc(projectile.x, projectile.y, 6, 0, Math.PI * 2); context.fill(); context.restore(); }
  function drawScene() { if (!match) return; drawTerrain(); drawTank(match.player, match.player.color, 1); match.opponents.forEach((opponent) => drawTank(opponent, opponent.color, -1)); drawAim(); drawProjectile(); }
  function updateFalling(tank: Tank, dt: number) { if (!tank.falling) return; tank.fallVelocity += 180 * dt; tank.y += tank.fallVelocity * dt; if (tank.y > CANVAS_HEIGHT + 30) { tank.alive = false; tank.health = 0; } }

  function resolveImpact(x: number, y: number, owner: "player" | "ai") {
    if (!match) return;
    const projectile = match.projectile; const weapon = WEAPONS[projectile?.weaponId || match.weaponId]; const target = owner === "player" ? match.opponents[match.targetIndex] : match.player;
    const distance = Math.abs(target.x - x); const direct = distance < 22 && Math.abs(target.y - y) < 30; const radius = direct ? weapon.radius + 20 : weapon.radius; const depth = direct ? weapon.depth + 10 : weapon.depth; const center = clamp(Math.round(x), 0, CANVAS_WIDTH - 1);
    applyCrater(match.terrain, center, radius, depth);
    if (distance < radius + 18 && target.alive) { const damage = direct ? weapon.directDamage : Math.max(12, Math.round(weapon.splashDamage * (1 - distance / (radius + 18)))); target.health = Math.max(0, target.health - damage); match.hits += 1; shotLog.textContent = `Shot log: ${owner === "player" ? (direct ? "Direct hit" : "Blast hit") : "Rival impact"} for ${damage} damage.`; } else shotLog.textContent = `Shot log: impact at ${center}; no tank damage.`;
    if (Math.abs(target.x - center) < radius * .72 && depth > 28) target.falling = true; if (target.alive && !target.falling) target.y = match.terrain[Math.round(target.x)] - 17; match.projectile = undefined; match.phase = "resolve"; updateControls();
    if (!target.alive) { const remaining = match.opponents.some((opponent) => opponent.alive); if (owner === "player" && !remaining) { finishMatch("win"); return; } if (owner === "player") match.targetIndex = match.opponents.findIndex((opponent) => opponent.alive); else { finishMatch("lose"); return; } }
    if (owner === "player") { matchStatus.textContent = "Rival turn. Tracking trajectory..."; aiTimer = window.setTimeout(startAiTurn, 720); } else { match.turn += 1; match.wind = clamp(match.wind + ((match.seed + match.turn * 13) % 7 - 3) / 10, -1.2, 1.2); match.phase = "aiming"; matchStatus.textContent = "Your turn. Set the shot."; updateControls(); }
  }
  function stepProjectile(dt: number) { if (!match?.projectile) return; const projectile = match.projectile; const previousX = projectile.x; const previousY = projectile.y; projectile.vx += match.wind * 20 * dt; projectile.vy += GRAVITY * dt; projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt; projectile.trail.push({ x: projectile.x, y: projectile.y }); if (projectile.trail.length > 18) projectile.trail.shift(); const target = projectile.owner === "player" ? match.opponents[match.targetIndex] : match.player; const crossedTank = target.alive && Math.hypot(projectile.x - target.x, projectile.y - target.y) < 18; const terrainY = match.terrain[clamp(Math.round(projectile.x), 0, CANVAS_WIDTH - 1)]; if (crossedTank || projectile.y >= terrainY || projectile.x < -10 || projectile.x > CANVAS_WIDTH + 10 || projectile.y > CANVAS_HEIGHT + 20) { resolveImpact(crossedTank ? target.x : projectile.x, crossedTank ? target.y : projectile.y, projectile.owner); return; } if (Math.abs(projectile.x - previousX) > 40 || Math.abs(projectile.y - previousY) > 40) resolveImpact(projectile.x, projectile.y, projectile.owner); }
  function stepMatch(dt: number) { if (!match) return; updateFalling(match.player, dt); match.opponents.forEach((opponent) => updateFalling(opponent, dt)); if (match.phase === "flight") stepProjectile(dt); if (!match.player.alive) finishMatch("lose"); else if (!match.opponents.some((opponent) => opponent.alive)) finishMatch("win"); }
  function frame(now: number) { if (!match || matchView !== "match") return; const elapsed = Math.min(.1, (now - lastFrame) / 1000); lastFrame = now; accumulator += elapsed; while (accumulator >= FIXED_DT) { stepMatch(FIXED_DT); accumulator -= FIXED_DT; } drawScene(); updateControls(); matchAnimation = requestAnimationFrame(frame); }
  function fire(owner: "player" | "ai", angleDegrees: number, powerPercent: number, shooterIndex = -1) { if (!match || match.phase === "flight" || match.phase === "finished") return; const tank = owner === "player" ? match.player : match.opponents[shooterIndex]; const weaponId = owner === "player" ? match.weaponId : "cannon"; const weapon = WEAPONS[weaponId]; if (owner === "player" && match.credits < weapon.cost) { matchStatus.textContent = `Need ${weapon.cost} credits for ${weapon.label}.`; return; } if (owner === "player") match.credits -= weapon.cost; const direction = owner === "player" ? 1 : -1; const angle = angleDegrees * Math.PI / 180; const speed = powerPercent * 7 * weapon.speed; match.projectile = { x: tank.x + direction * 22, y: tank.y - 17, vx: Math.cos(angle) * speed * direction, vy: -Math.sin(angle) * speed, owner, shooterIndex, weaponId, trail: [] }; match.phase = "flight"; match.shots += 1; matchStatus.textContent = owner === "player" ? `${weapon.label} away. Watching the arc...` : `${tank.label} is firing...`; updateControls(); }
  function startAiTurn() { if (!match || !match.player.alive) return; const next = match.opponents.findIndex((opponent) => opponent.alive); if (next < 0) { finishMatch("win"); return; } match.aiIndex = next; match.phase = "ai"; matchStatus.textContent = `${match.opponents[next].label} is lining up a shot...`; updateControls(); const angle = 28 + ((match.seed + match.turn * 11 + next * 9) % 35); const power = 54 + ((match.seed + match.turn * 7 + next * 5) % 28); aiTimer = window.setTimeout(() => fire("ai", angle, power, next), 650); }
  function finishMatch(result: "win" | "lose") { if (!match || match.phase === "finished") return; match.phase = "finished"; if (aiTimer) window.clearTimeout(aiTimer); aiTimer = 0; const duration = Math.max(1, Math.round((performance.now() - match.startedAt) / 1000)); resultTitle.textContent = result === "win" ? "Congratulations, commander." : "Your tank is out of the fight."; resultMessage.textContent = result === "win" ? "The rival tank has been destroyed. The range is yours." : "The rival tank held the range. Adjust your angle and try again."; resultStats.replaceChildren(); [["Result", result === "win" ? "Victory" : "Defeat"], ["Shots fired", String(match.shots)], ["Impacts", String(match.hits)], ["Match time", `${duration}s`]].forEach(([label, value]) => { const row = document.createElement("div"); const name = document.createElement("span"); name.textContent = label; const amount = document.createElement("strong"); amount.textContent = value; row.append(name, amount); resultStats.append(row); }); setPanel("result"); }
  function beginFromCanvas(event: PointerEvent) { if (!match || match.phase !== "aiming") return; const rect = battlefield.getBoundingClientRect(); const x = (event.clientX - rect.left) * CANVAS_WIDTH / rect.width; const y = (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height; const dx = Math.max(12, x - match.player.x); const dy = match.player.y - 17 - y; angleInput.value = String(Math.round(clamp(Math.atan2(dy, dx) * 180 / Math.PI, 8, 82))); powerInput.value = String(Math.round(clamp(Math.hypot(dx, dy) / 6, 25, 95))); updateControls(); }

  modeSingleButton.addEventListener("click", () => { const savedName = localStorage.getItem(playerNameKey)?.trim(); if (savedName) soloNameInput.value = savedName; setPanel("single"); }); modeMultiButton.addEventListener("click", () => setPanel("lobby")); modeBackButton.addEventListener("click", () => { close(); window.dispatchEvent(new CustomEvent("boombox-back-games")); }); singleBackButton.addEventListener("click", () => setPanel("mode")); soloForm.addEventListener("submit", (event) => { event.preventDefault(); const name = soloNameInput.value.trim() || "Commander"; localStorage.setItem(playerNameKey, name); startSoloMatch(); }); createButton.addEventListener("click", openCreate); refreshButton.addEventListener("click", () => { const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); lobbyStatus.textContent = `Rooms refreshed at ${now}.`; availableRooms = [...availableRooms]; renderRooms(); }); lobbyBackButton.addEventListener("click", () => setPanel("mode")); createBackButton.addEventListener("click", () => { if (createStep === 1) setPanel("lobby"); else setCreateStep(createStep - 1); }); createNextButton.addEventListener("click", () => setCreateStep(createStep + 1)); createForm.addEventListener("submit", (event) => { event.preventDefault(); if (createStep === 3) createRoom(); }); [roomNameInput, commanderInput, terrainInput, seatsInput, paceInput, aiFillInput].forEach((input) => input.addEventListener("input", updateCreateSummary)); [angleInput, powerInput].forEach((input) => input.addEventListener("input", updateControls)); targetInput.addEventListener("change", () => { if (match) match.targetIndex = clamp(Number(targetInput.value), 0, match.opponents.length - 1); updateControls(); }); weaponInput.addEventListener("change", () => { if (match) match.weaponId = weaponInput.value as WeaponId; updateControls(); }); utilityButton.addEventListener("click", () => { if (!match || match.phase !== "aiming" || match.utilityUsed || match.utilityId !== "repair-kit") return; match.player.health = Math.min(100, match.player.health + 30); match.utilityUsed = true; shotLog.textContent = "Shot log: repair kit restored 30 HP."; updateControls(); }); fireButton.addEventListener("click", () => fire("player", Number(angleInput.value), Number(powerInput.value))); battlefield.addEventListener("pointerdown", beginFromCanvas); matchExitButton.addEventListener("click", () => { stopMatch(); setPanel("mode"); }); resultRestartButton.addEventListener("click", () => startSoloMatch()); resultBackButton.addEventListener("click", () => { stopMatch(); setPanel("mode"); }); window.addEventListener("resize", resizeBattlefield);
  return { open: () => setPanel("mode"), close };
}
