import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distDir = resolve(__dirname, "dist");
const storePath = process.env.SCORE_STORE_PATH || resolve(__dirname, "data", "high-scores.json");
const snakeStorePath = process.env.SNAKE_SCORE_STORE_PATH || resolve(__dirname, "data", "snake-high-scores.json");
const breakoutStorePath = process.env.BREAKOUT_SCORE_STORE_PATH || resolve(__dirname, "data", "breakout-high-scores.json");
const bridgeTileStorePath = process.env.BRIDGE_TILE_SCORE_STORE_PATH || resolve(__dirname, "data", "glass-bridge-tile-scores.json");
const bridgePointStorePath =
  process.env.BRIDGE_POINT_SCORE_STORE_PATH || resolve(__dirname, "data", "glass-bridge-point-scores.json");
const bridgeJackpotStorePath =
  process.env.BRIDGE_JACKPOT_STORE_PATH || resolve(__dirname, "data", "glass-bridge-jackpot.json");
const boomBoxHistoryPath = process.env.BOOM_BOX_HISTORY_STORE_PATH || resolve(__dirname, "data", "boombox-match-history.json");
const issueStorePaths = {
  "glass-bridge": process.env.GLASS_BRIDGE_ISSUE_STORE_PATH || resolve(__dirname, "data", "glass-bridge-issues.json"),
  "jumpy-plane": process.env.JUMPY_PLANE_ISSUE_STORE_PATH || resolve(__dirname, "data", "jumpy-plane-issues.json"),
  "pixel-wars": process.env.PIXEL_WARS_ISSUE_STORE_PATH || resolve(__dirname, "data", "pixel-wars-issues.json"),
  breakout: process.env.BREAKOUT_ISSUE_STORE_PATH || resolve(__dirname, "data", "breakout-issues.json"),
  "digital-cribbage": process.env.DIGITAL_CRIBBAGE_ISSUE_STORE_PATH || resolve(__dirname, "data", "digital-cribbage-issues.json"),
  "shooting-snakes": process.env.SHOOTING_SNAKES_ISSUE_STORE_PATH || resolve(__dirname, "data", "shooting-snakes-issues.json"),
};
const bridgeJackpotSeed = 20;
const bridgeJackpotHitOdds = 20;
const port = Number(process.env.PORT || 3000);
const timeZone = process.env.SCORE_TIME_ZONE || "America/Los_Angeles";
function readBoomBoxHistory() { try { const parsed = JSON.parse(readFileSync(boomBoxHistoryPath, "utf8")); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function writeBoomBoxHistory(history) { mkdirSync(resolve(boomBoxHistoryPath, ".."), { recursive: true }); writeFileSync(boomBoxHistoryPath, JSON.stringify(history.slice(-100), null, 2)); }
const boomBoxHistory = readBoomBoxHistory();
const snakeBoard = {
  cellSize: 24,
  height: 1920,
  width: 2880,
};
const pixelBoard = {
  columns: 54,
  rows: 36,
};
const targetSnakeOrbCount = 54;
const maxSnakeOrbCount = 132;
const maxSnakeBotCount = 10;
const maxSnakeShotBank = 5;
const snakeProjectileRangeCells = 72;
const snakeProjectileSpeedCells = 4;
const snakeShotRecoilTicks = 4;
const snakeBotRespawnTicks = 26;
const snakeIdleResetDelayMs = 30000;
const snakeRandomOrbSpawnIntervalMs = 1000;
const snakeBotPersonalities = [
  { decisionMax: 5, decisionMin: 2, doubleShotChance: 0.018, mistakeChance: 0.04, randomSafeChance: 0.24, shootChance: 0.012 },
  { decisionMax: 4, decisionMin: 2, doubleShotChance: 0.04, mistakeChance: 0.07, randomSafeChance: 0.18, shootChance: 0.03 },
  { decisionMax: 6, decisionMin: 3, doubleShotChance: 0.028, mistakeChance: 0.13, randomSafeChance: 0.2, shootChance: 0.022 },
  { decisionMax: 7, decisionMin: 3, doubleShotChance: 0.012, mistakeChance: 0.025, randomSafeChance: 0.34, shootChance: 0.008 },
];
const snakeDirections = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
};
const snakePlayers = new Map();
const snakeBots = new Map();
const snakeOrbs = [];
const snakeProjectiles = [];
const pixelLobbies = new Map();
let nextSnakeId = 1;
let nextSnakeOrbId = 1;
let nextSnakeProjectileId = 1;
let nextPixelLobbyId = 1;
let snakeRoomInterval = null;
let snakeIdleResetTimer = null;
let lastSnakeRandomOrbSpawnAt = 0;
const pixelMaxPlayers = 9;
const pixelMaxTurretsPerOwner = 4;
const pixelLobbyTtlMs = 30 * 60 * 1000;
const pixelTickMs = 50;
const pixelBaseFireInterval = 1;
const pixelShotSpeed = 34;
const pixelShotLife = 2.2;
const pixelShieldMaxHealth = 100;
const pixelShieldDamage = 10;
const pixelShieldRadiusCells = 2.15;
// Perimeter turrets sweep a 180° semicircle around the board-facing normal;
// a turret placed in the centre has a full 360° rotation range.
const pixelEdgeTurretArc = Math.PI / 2;
const pixelCenterTurretArc = Math.PI;
const pixelRespawnShieldClearanceCells = 2;
const pixelRespawnSeconds = 10;
const pixelBombShotAward = 4;
const pixelOwnerColors = {
  "bot-1": "#ffd84d",
  "bot-2": "#f45dff",
  "bot-3": "#31e6ff",
  "bot-4": "#ff7f50",
  "bot-5": "#9cff57",
  "bot-6": "#b794ff",
  "bot-7": "#ff6f91",
  "bot-8": "#7afcff",
  "human-1": "#ff4d6d",
  "human-2": "#36f0a4",
  "human-3": "#5aa7ff",
  "human-4": "#ffd166",
  "human-5": "#c77dff",
  "human-6": "#f77f00",
  "human-7": "#06d6a0",
  "human-8": "#ef476f",
  "human-9": "#a3ff12",
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function randomGridCoordinate(limit) {
  const cells = Math.floor(limit / snakeBoard.cellSize) - 4;
  return (2 + Math.floor(Math.random() * cells)) * snakeBoard.cellSize;
}

function snakeColorFromId(id) {
  const hue = (Number(id.replace(/\D/g, "")) * 53) % 360;
  return `hsl(${hue} 82% 58%)`;
}

const fallbackSnakeOrbColors = Array.from({ length: maxSnakeBotCount }, (_, index) => snakeColorFromId(`snake-${index + 1}`));

function snakeOrbColor() {
  const colors = [...new Set(allSnakes().map((player) => player.color))];
  const palette = colors.length > 0 ? colors : fallbackSnakeOrbColors;
  const colorCounts = new Map(palette.map((color) => [color, 0]));

  for (const orb of snakeOrbs) {
    colorCounts.set(orb.color, (colorCounts.get(orb.color) || 0) + 1);
  }

  const lowestCount = Math.min(...palette.map((color) => colorCounts.get(color) || 0));
  const balancedChoices = palette.filter((color) => (colorCounts.get(color) || 0) <= lowestCount + 1);
  const choices = Math.random() < 0.82 ? balancedChoices : palette;
  return randomItem(choices);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomSnakeBotPersonality() {
  return snakeBotPersonalities[Math.floor(Math.random() * snakeBotPersonalities.length)];
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function resetSnakeBotDecision(bot) {
  bot.decisionTicks = randomInt(bot.personality.decisionMin, bot.personality.decisionMax);
}

function targetSnakeBotCount() {
  return Math.max(0, maxSnakeBotCount - Math.floor(activeSnakePlayers().length / 2));
}

function activeSnakePlayers() {
  return [...snakePlayers.values()].filter((player) => player.active && player.alive);
}

function allSnakes() {
  return [...snakePlayers.values(), ...snakeBots.values()];
}

function occupiedSnakePoint(x, y) {
  for (const player of allSnakes()) {
    if (!player.alive) {
      continue;
    }

    if (player.segments.some((segment) => segment.x === x && segment.y === y)) {
      return true;
    }
  }

  return false;
}

function createSnakeSegments(head, direction) {
  const step = snakeDirections[direction];
  return [
    head,
    { x: head.x - step.x * snakeBoard.cellSize, y: head.y - step.y * snakeBoard.cellSize },
    { x: head.x - step.x * snakeBoard.cellSize * 2, y: head.y - step.y * snakeBoard.cellSize * 2 },
  ];
}

function findSnakeSpawn() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const directionNames = Object.keys(snakeDirections);
    const direction = directionNames[Math.floor(Math.random() * directionNames.length)];
    const head = {
      x: randomGridCoordinate(snakeBoard.width),
      y: randomGridCoordinate(snakeBoard.height),
    };
    const segments = createSnakeSegments(head, direction);
    const safe = segments.every(
      (segment) =>
        segment.x > 0 &&
        segment.x < snakeBoard.width &&
        segment.y > 0 &&
        segment.y < snakeBoard.height &&
        !occupiedSnakePoint(segment.x, segment.y),
    );

    if (safe) {
      return { direction, segments };
    }
  }

  return {
    direction: "right",
    segments: createSnakeSegments({ x: snakeBoard.cellSize * 5, y: snakeBoard.cellSize * 5 }, "right"),
  };
}

function spawnSnakeOrb(x = randomGridCoordinate(snakeBoard.width), y = randomGridCoordinate(snakeBoard.height), color = snakeOrbColor()) {
  if (snakeOrbs.length >= maxSnakeOrbCount) {
    return false;
  }

  snakeOrbs.push({
    color,
    id: `orb-${nextSnakeOrbId}`,
    x,
    y,
  });
  nextSnakeOrbId += 1;
  return true;
}

function seedSnakeOrbs(options = {}) {
  const now = Date.now();
  const instant = Boolean(options.instant);

  if (instant) {
    while (snakeOrbs.length < targetSnakeOrbCount) {
      if (!spawnSnakeOrb()) {
        break;
      }
    }
    lastSnakeRandomOrbSpawnAt = now;
    return;
  }

  if (snakeOrbs.length >= targetSnakeOrbCount || now - lastSnakeRandomOrbSpawnAt < snakeRandomOrbSpawnIntervalMs) {
    return;
  }

  if (spawnSnakeOrb()) {
    lastSnakeRandomOrbSpawnAt = now;
  }
}

function respawnSnake(player) {
  const spawn = findSnakeSpawn();
  player.alive = true;
  player.direction = spawn.direction;
  player.nextDirection = spawn.direction;
  player.segments = spawn.segments;
  player.length = 3;
  player.bestLength = 3;
  player.orbsCollected = 0;
  player.score = 0;
  player.shotBank = 0;
  player.shootCooldown = 0;
  player.shotRecoilTicks = 0;
  if (player.personality) {
    resetSnakeBotDecision(player);
  }
}

function destroySnake(player) {
  if (!player.alive) {
    return;
  }

  player.alive = false;
  if (player.botRespawnTicks !== undefined) {
    player.botRespawnTicks = snakeBotRespawnTicks;
  } else {
    player.active = false;
  }
  const drops = Math.floor(player.segments.length * 0.5);
  for (let index = 0; index < drops; index += 1) {
    const segment = player.segments[Math.floor((index / Math.max(1, drops)) * player.segments.length)];
    spawnSnakeOrb(segment.x, segment.y, player.color);
  }
}

function trimSnake(player) {
  while (player.segments.length > player.length) {
    player.segments.pop();
  }
  if (player.length < 2) {
    destroySnake(player);
  }
}

function createSnakeBot() {
  const id = `snake-${nextSnakeId}`;
  nextSnakeId += 1;
  const bot = {
    alive: false,
    bestLength: 3,
    botRespawnTicks: 0,
    color: snakeColorFromId(id),
    decisionTicks: 0,
    direction: "right",
    id,
    length: 3,
    nextDirection: "right",
    orbsCollected: 0,
    personality: randomSnakeBotPersonality(),
    score: 0,
    segments: [],
    shotBank: 0,
    shootCooldown: 0,
    shotRecoilTicks: 0,
  };
  respawnSnake(bot);
  return bot;
}

function ensureSnakeBots() {
  const targetCount = targetSnakeBotCount();
  while (snakeBots.size > targetCount) {
    const removable = [...snakeBots.values()].find((bot) => !bot.alive) || [...snakeBots.values()].at(-1);
    if (!removable) {
      break;
    }
    snakeBots.delete(removable.id);
  }

  while (snakeBots.size < targetCount) {
    const bot = createSnakeBot();
    snakeBots.set(bot.id, bot);
  }

  for (const bot of snakeBots.values()) {
    if (bot.alive) {
      continue;
    }

    bot.botRespawnTicks = Math.max(0, (bot.botRespawnTicks || snakeBotRespawnTicks) - 1);
    if (bot.botRespawnTicks <= 0) {
      respawnSnake(bot);
    }
  }
}

function nearestSnakeOrb(head, player = null) {
  let target = null;
  let targetDistance = Infinity;
  for (const orb of snakeOrbs) {
    let distance = Math.abs(orb.x - head.x) + Math.abs(orb.y - head.y);
    if (player) {
      const matchesPlayer = orb.color === player.color;
      if (matchesPlayer && player.shotBank < maxSnakeShotBank) {
        distance *= player.shotBank <= 1 ? 0.68 : 0.88;
      }
      if (!matchesPlayer && player.length <= 5) {
        distance *= 0.72;
      }
      if (matchesPlayer && player.shotBank >= maxSnakeShotBank) {
        distance *= 1.35;
      }
    }
    if (distance < targetDistance) {
      target = orb;
      targetDistance = distance;
    }
  }
  return target;
}

function nextSnakeHead(player, directionName) {
  const step = snakeDirections[directionName];
  const head = player.segments[0];
  return {
    x: head.x + step.x * snakeBoard.cellSize,
    y: head.y + step.y * snakeBoard.cellSize,
  };
}

function directionWouldHit(player, directionName) {
  const head = nextSnakeHead(player, directionName);
  if (head.x < 0 || head.y < 0 || head.x > snakeBoard.width || head.y > snakeBoard.height) {
    return true;
  }

  return allSnakes().some(
    (other) =>
      other.id !== player.id &&
      other.alive &&
      other.segments.some((segment) => segment.x === head.x && segment.y === head.y),
  );
}

function chooseSnakeBotDirection(bot) {
  if (!bot.alive || bot.segments.length === 0) {
    return;
  }

  bot.decisionTicks = Math.max(0, bot.decisionTicks - 1);
  if (bot.decisionTicks > 0) {
    return;
  }
  resetSnakeBotDecision(bot);

  const target = nearestSnakeOrb(bot.segments[0], bot);
  const directionNames = Object.keys(snakeDirections);
  const candidates = directionNames
    .map((direction) => {
      const head = nextSnakeHead(bot, direction);
      const targetDistance = target ? Math.abs(target.x - head.x) + Math.abs(target.y - head.y) : Math.random() * 1000;
      return { direction, targetDistance: targetDistance + Math.random() * snakeBoard.cellSize * 0.4 };
    })
    .sort((a, b) => a.targetDistance - b.targetDistance);

  const safeCandidates = candidates.filter((candidate) => !directionWouldHit(bot, candidate.direction));
  const choiceRoll = Math.random();

  if (choiceRoll < bot.personality.mistakeChance) {
    bot.nextDirection = randomItem(candidates.slice(0, 2)).direction;
    return;
  }

  if (safeCandidates.length > 0 && choiceRoll < bot.personality.mistakeChance + bot.personality.randomSafeChance) {
    bot.nextDirection = randomItem(safeCandidates).direction;
    return;
  }

  bot.nextDirection = safeCandidates[0]?.direction || candidates[0]?.direction || bot.direction;
}

function snakeThreatInLine(player) {
  const step = snakeDirections[player.direction];
  const head = player.segments[0];
  const maxDistance = snakeBoard.cellSize * 18;

  for (const other of allSnakes()) {
    if (!other.alive || other.id === player.id) {
      continue;
    }

    for (const segment of other.segments) {
      const dx = segment.x - head.x;
      const dy = segment.y - head.y;
      const ahead = step.x !== 0 ? dx * step.x > 0 && dy === 0 : dy * step.y > 0 && dx === 0;
      const distance = Math.abs(dx) + Math.abs(dy);
      if (ahead && distance <= maxDistance) {
        return true;
      }
    }
  }

  return false;
}

function updateSnakeBot(bot) {
  if (!bot.alive) {
    return;
  }

  chooseSnakeBotDirection(bot);
  bot.direction = bot.nextDirection;

  if (bot.shotBank >= 2 && bot.length > 4 && snakeThreatInLine(bot) && Math.random() < bot.personality.doubleShotChance) {
    const firstShot = shootSnakeSegment(bot);
    if (firstShot && bot.shotBank > 0 && bot.length > 2) {
      shootSnakeSegment(bot, { leadCells: 2, skipCooldown: true });
    }
    return;
  }

  if (bot.shotBank > 0 && bot.length > 3 && snakeThreatInLine(bot) && Math.random() < bot.personality.shootChance) {
    shootSnakeSegment(bot);
  }
}

function updateSnakePlayer(player) {
  if (!player.alive || player.segments.length === 0) {
    return;
  }

  player.shootCooldown = Math.max(0, player.shootCooldown - 1);
  player.direction = player.nextDirection;
  if (player.shotRecoilTicks > 0) {
    player.shotRecoilTicks -= 1;
    return;
  }

  const head = nextSnakeHead(player, player.direction);

  if (head.x < 0 || head.y < 0 || head.x > snakeBoard.width || head.y > snakeBoard.height) {
    destroySnake(player);
    return;
  }

  for (const other of allSnakes()) {
    if (other.id === player.id || !other.alive) {
      continue;
    }

    if (other.segments.some((segment) => segment.x === head.x && segment.y === head.y)) {
      destroySnake(player);
      return;
    }
  }

  player.segments.unshift(head);
  const eatenIndex = snakeOrbs.findIndex(
    (orb) => Math.abs(orb.x - head.x) < snakeBoard.cellSize && Math.abs(orb.y - head.y) < snakeBoard.cellSize,
  );
  if (eatenIndex >= 0) {
    const eatenOrb = snakeOrbs[eatenIndex];
    player.orbsCollected += 1;
    player.score += 1;
    if (eatenOrb.color === player.color) {
      player.shotBank = Math.min(maxSnakeShotBank, player.shotBank + 1);
    } else {
      player.length += 1;
      player.bestLength = Math.max(player.bestLength || 3, player.length);
    }
    snakeOrbs.splice(eatenIndex, 1);
  }
  trimSnake(player);
}

function shootSnakeSegment(player, options = {}) {
  const skipCooldown = Boolean(options.skipCooldown);
  const leadCells = Number.isFinite(options.leadCells) ? options.leadCells : 1;
  if (!player.alive || player.length <= 2 || (!skipCooldown && player.shootCooldown > 0) || player.shotBank <= 0) {
    return false;
  }

  const direction = snakeDirections[player.direction];
  const head = player.segments[0];
  player.length -= 1;
  player.shotBank -= 1;
  player.segments.pop();
  if (!skipCooldown) {
    player.shootCooldown = 5;
  }
  player.shotRecoilTicks = Math.max(player.shotRecoilTicks || 0, snakeShotRecoilTicks);
  snakeProjectiles.push({
    color: player.color,
    distance: 0,
    dx: direction.x,
    dy: direction.y,
    id: `shot-${nextSnakeProjectileId}`,
    ownerId: player.id,
    x: head.x + direction.x * snakeBoard.cellSize * leadCells,
    y: head.y + direction.y * snakeBoard.cellSize * leadCells,
  });
  nextSnakeProjectileId += 1;
  return true;
}

function snakeProjectileHit(projectile) {
  for (const player of allSnakes()) {
    if (!player.alive || player.id === projectile.ownerId) {
      continue;
    }

    const head = player.segments[0];
    if (
      head &&
      Math.abs(head.x - projectile.x) <= snakeBoard.cellSize * 0.5 &&
      Math.abs(head.y - projectile.y) <= snakeBoard.cellSize * 0.5
    ) {
      destroySnake(player);
      return true;
    }

    if (
      player.segments.slice(1).some(
        (segment) =>
          Math.abs(segment.x - projectile.x) <= snakeBoard.cellSize * 0.5 &&
          Math.abs(segment.y - projectile.y) <= snakeBoard.cellSize * 0.5,
      )
    ) {
      player.length -= 1;
      trimSnake(player);
      return true;
    }
  }

  return false;
}

function updateSnakeProjectiles() {
  for (let index = snakeProjectiles.length - 1; index >= 0; index -= 1) {
    const projectile = snakeProjectiles[index];
    let removeProjectile = snakeProjectileHit(projectile);
    for (let step = 0; step < snakeProjectileSpeedCells; step += 1) {
      if (removeProjectile) {
        break;
      }

      projectile.x += projectile.dx * snakeBoard.cellSize;
      projectile.y += projectile.dy * snakeBoard.cellSize;
      projectile.distance += snakeBoard.cellSize;
      if (
        projectile.x < 0 ||
        projectile.x > snakeBoard.width ||
        projectile.y < 0 ||
        projectile.y > snakeBoard.height ||
        projectile.distance > snakeBoard.cellSize * snakeProjectileRangeCells
      ) {
        removeProjectile = true;
        break;
      }

      if (snakeProjectileHit(projectile)) {
        removeProjectile = true;
        break;
      }
    }

    if (removeProjectile) {
      snakeProjectiles.splice(index, 1);
    }
  }
}

function snakeSnapshot() {
  return {
    board: snakeBoard,
    maxShotBank: maxSnakeShotBank,
    orbs: snakeOrbs,
    players: allSnakes().map((player) => ({
      alive: player.alive,
      bestLength: player.bestLength || 3,
      color: player.color,
      id: player.id,
      orbsCollected: player.orbsCollected || 0,
      score: player.score,
      segments: player.segments,
      shotBank: player.shotBank || 0,
    })),
    projectiles: snakeProjectiles,
    type: "snake-state",
  };
}

function broadcastSnakeState() {
  const message = JSON.stringify(snakeSnapshot());
  for (const player of snakePlayers.values()) {
    if (player.socket.readyState === WebSocket.OPEN) {
      player.socket.send(message);
    }
  }
}

function tickSnakeRoom() {
  ensureSnakeBots();
  seedSnakeOrbs();
  for (const bot of snakeBots.values()) {
    updateSnakeBot(bot);
  }
  for (const player of allSnakes()) {
    updateSnakePlayer(player);
  }
  updateSnakeProjectiles();
  broadcastSnakeState();
  stopSnakeRoomIfIdle();
}

function startSnakeRoom() {
  if (snakeIdleResetTimer) {
    clearTimeout(snakeIdleResetTimer);
    snakeIdleResetTimer = null;
  }

  if (snakeRoomInterval) {
    return;
  }

  if (snakeOrbs.length === 0) {
    seedSnakeOrbs({ instant: true });
  }
  snakeRoomInterval = setInterval(tickSnakeRoom, 115);
}

function clearSnakeRoom() {
  if (snakeIdleResetTimer) {
    clearTimeout(snakeIdleResetTimer);
    snakeIdleResetTimer = null;
  }

  if (snakeRoomInterval) {
    clearInterval(snakeRoomInterval);
    snakeRoomInterval = null;
  }

  snakeBots.clear();
  snakeOrbs.length = 0;
  snakeProjectiles.length = 0;
  lastSnakeRandomOrbSpawnAt = 0;
}

function stopSnakeRoomIfIdle() {
  if (activeSnakePlayers().length > 0 || !snakeRoomInterval || snakeIdleResetTimer) {
    return;
  }

  snakeIdleResetTimer = setTimeout(() => {
    if (activeSnakePlayers().length === 0) {
      clearSnakeRoom();
    }
  }, snakeIdleResetDelayMs);
}

function pixelSpawnAnchors() {
  const insetX = 0.08;
  const insetY = 0.12;
  return [
    { xRatio: 0.5, yRatio: 1 },
    { xRatio: insetX, yRatio: insetY },
    { xRatio: 0.5, yRatio: 0 },
    { xRatio: 1 - insetX, yRatio: insetY },
    { xRatio: 1, yRatio: 0.5 },
    { xRatio: 1 - insetX, yRatio: 1 - insetY },
    { xRatio: insetX, yRatio: 1 - insetY },
    { xRatio: 0, yRatio: 0.5 },
    { xRatio: 0.5, yRatio: 0.5 },
  ];
}

function pixelHomeAngleForPoint(x, y) {
  return Math.atan2(pixelBoard.rows / 2 - y, pixelBoard.columns / 2 - x);
}

function pixelTurretArcForPoint(x, y) {
  const centered = Math.abs(x - pixelBoard.columns / 2) < 0.001 && Math.abs(y - pixelBoard.rows / 2) < 0.001;
  return centered ? pixelCenterTurretArc : pixelEdgeTurretArc;
}

function createPixelTurret(id, index, isBot = false, options = {}) {
  const anchor = pixelSpawnAnchors()[index % pixelMaxPlayers];
  const x = anchor.xRatio * pixelBoard.columns;
  const y = anchor.yRatio * pixelBoard.rows;
  const homeAngle = pixelHomeAngleForPoint(x, y);
  return {
    angle: homeAngle,
    autoRotate: true,
    arc: pixelTurretArcForPoint(x, y),
    bombShots: 0,
    bouncePower: 0,
    color: pixelOwnerColors[id] || "#ffffff",
    eliminated: false,
    fireCooldown: Math.random() * pixelBaseFireInterval,
    fireSpeedBoosts: 0,
    homeAngle,
    id,
    isBot,
    primary: options.primary ?? true,
    respawnPending: false,
    respawnTimer: 0,
    rotateDirection: Math.random() < 0.5 ? -1 : 1,
    rotateSpeed: isBot ? 0.55 + Math.random() * 0.45 : 0.75,
    shieldHealth: pixelShieldMaxHealth,
    socket: null,
    x,
    xRatio: anchor.xRatio,
    y,
    yRatio: anchor.yRatio,
  };
}

function createPixelMatch(lobby) {
  const turrets = [];
  for (let index = 0; index < lobby.humanPlayers; index += 1) {
    turrets.push(createPixelTurret(`human-${index + 1}`, index, false));
  }
  for (let index = 0; index < lobby.aiBots; index += 1) {
    turrets.push(createPixelTurret(`bot-${index + 1}`, lobby.humanPlayers + index, true));
  }

  const match = {
    cells: Array.from({ length: pixelBoard.columns * pixelBoard.rows }, () => "neutral"),
    interval: null,
    lobby,
    nextShotId: 1,
    shots: [],
    turrets,
  };
  const seedCount = pixelStartingSeedCount();
  turrets.forEach((turret) => seedPixelTurret(match, turret, seedCount));
  return match;
}

function pixelCellIndexAt(x, y) {
  const column = Math.floor(x);
  const row = Math.floor(y);
  if (column < 0 || column >= pixelBoard.columns || row < 0 || row >= pixelBoard.rows) {
    return -1;
  }
  return row * pixelBoard.columns + column;
}

function pixelSeedCandidates(turret) {
  const candidates = [];
  for (let row = 0; row < pixelBoard.rows; row += 1) {
    for (let column = 0; column < pixelBoard.columns; column += 1) {
      const x = column + 0.5;
      const y = row + 0.5;
      const dx = x - turret.x;
      const dy = y - turret.y;
      candidates.push({ distance: dx * dx + dy * dy, index: row * pixelBoard.columns + column });
    }
  }
  return candidates.sort((a, b) => a.distance - b.distance);
}

function pixelStartingSeedCount() {
  const sideReference = { x: pixelBoard.columns / 2, y: pixelBoard.rows };
  const radiusSquared = 2.7 * 2.7;
  return Math.max(3, pixelSeedCandidates(sideReference).filter((candidate) => candidate.distance <= radiusSquared).length);
}

function seedPixelTurret(match, turret, seedCount = pixelStartingSeedCount()) {
  pixelSeedCandidates(turret)
    .slice(0, seedCount)
    .forEach((candidate) => {
      match.cells[candidate.index] = turret.id;
    });
}

function pixelOwnedCellCount(match, owner) {
  return match.cells.reduce((total, currentOwner) => total + (currentOwner === owner ? 1 : 0), 0);
}

function pixelTurretIsActive(turret) {
  return !turret.eliminated && !turret.respawnPending && turret.respawnTimer <= 0 && turret.shieldHealth > 0;
}

function pixelOwnerTurrets(match, owner) {
  return match.turrets.filter((turret) => turret.id === owner && !turret.eliminated);
}

function pixelOwnerHasActiveTurret(match, owner) {
  return match.turrets.some((turret) => turret.id === owner && pixelTurretIsActive(turret));
}

function pixelOwnerCanRespawn(match, owner) {
  return pixelOwnedCellCount(match, owner) > 0 || pixelOwnerHasActiveTurret(match, owner);
}

function addPixelOwnerTurret(match, owner) {
  const ownerTurrets = pixelOwnerTurrets(match, owner);
  if (ownerTurrets.length >= pixelMaxTurretsPerOwner) {
    return null;
  }
  const allOwnerTurrets = match.turrets.filter((turret) => turret.id === owner);
  const referenceTurret = ownerTurrets[0] || allOwnerTurrets[0];
  if (!referenceTurret) {
    return null;
  }
  const turret = createPixelTurret(owner, match.turrets.length, referenceTurret.isBot, { primary: false });
  turret.color = referenceTurret.color;
  // Fire speed is a player-wide stat. Include eliminated turrets so upgrades
  // are retained and every replacement turret inherits the same rate.
  turret.fireSpeedBoosts = Math.max(0, ...allOwnerTurrets.map((ownedTurret) => ownedTurret.fireSpeedBoosts));
  turret.bouncePower = Math.max(0, ...ownerTurrets.map((ownedTurret) => ownedTurret.bouncePower));
  turret.respawnPending = true;
  turret.shieldHealth = 0;
  turret.fireCooldown = pixelBaseFireInterval;
  match.turrets.push(turret);
  return turret;
}

function clampPixelAngle(turret, angle) {
  let delta = angle - turret.homeAngle;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  delta = Math.max(-turret.arc, Math.min(turret.arc, delta));
  let result = turret.homeAngle + delta;
  while (result > Math.PI) {
    result -= Math.PI * 2;
  }
  while (result < -Math.PI) {
    result += Math.PI * 2;
  }
  return result;
}

function pixelPaintCell(match, index, owner) {
  if (index < 0 || index >= match.cells.length) {
    return;
  }
  const currentOwner = match.cells[index];
  if (currentOwner === "neutral") {
    match.cells[index] = owner;
  } else if (currentOwner !== owner) {
    match.cells[index] = "neutral";
  }
}

function pixelExplodeCells(match, index, owner) {
  const centerColumn = index % pixelBoard.columns;
  const centerRow = Math.floor(index / pixelBoard.columns);
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      const row = centerRow + rowOffset;
      const column = centerColumn + columnOffset;
      if (row >= 0 && row < pixelBoard.rows && column >= 0 && column < pixelBoard.columns) {
        pixelPaintCell(match, row * pixelBoard.columns + column, owner);
      }
    }
  }
}

function pixelEffectiveFireInterval(turret) {
  // There is deliberately no upper bound on fireSpeedBoosts. Each upgrade
  // continues to shorten the interval toward zero.
  return pixelBaseFireInterval / (1 + turret.fireSpeedBoosts * 0.25);
}

function pixelRayIntersectsBoard(turret, angle = turret.angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const targets = [
    dx !== 0 ? -turret.x / dx : Number.POSITIVE_INFINITY,
    dx !== 0 ? (pixelBoard.columns - turret.x) / dx : Number.POSITIVE_INFINITY,
    dy !== 0 ? -turret.y / dy : Number.POSITIVE_INFINITY,
    dy !== 0 ? (pixelBoard.rows - turret.y) / dy : Number.POSITIVE_INFINITY,
  ].filter((value) => Number.isFinite(value) && value > 0.001);
  return targets.some((distance) => {
    const x = turret.x + dx * distance;
    const y = turret.y + dy * distance;
    return x >= 0 && x <= pixelBoard.columns && y >= 0 && y <= pixelBoard.rows;
  });
}

function firePixelShot(match, turret) {
  if (!pixelTurretIsActive(turret) || !pixelRayIntersectsBoard(turret)) {
    return;
  }
  const dx = Math.cos(turret.angle);
  const dy = Math.sin(turret.angle);
  const isBomb = turret.bombShots > 0;
  if (isBomb) {
    turret.bombShots -= 1;
  }
  match.shots.push({
    bouncesRemaining: Math.floor(turret.bouncePower / 2),
    color: turret.color,
    id: `px-shot-${match.nextShotId++}`,
    kind: isBomb ? "bomb" : "normal",
    lastCell: -1,
    life: pixelShotLife,
    owner: turret.id,
    vx: dx * pixelShotSpeed,
    vy: dy * pixelShotSpeed,
    x: Math.max(0.02, Math.min(pixelBoard.columns - 0.02, turret.x + dx * 1.8)),
    y: Math.max(0.02, Math.min(pixelBoard.rows - 0.02, turret.y + dy * 1.8)),
  });
}

function knockOutPixelTurret(match, turret) {
  if (turret.eliminated || turret.respawnPending || turret.respawnTimer > 0) {
    return;
  }
  turret.shieldHealth = 0;
  turret.respawnPending = turret.isBot ? false : true;
  turret.respawnTimer = turret.isBot ? 1.2 : 0;
  turret.fireCooldown = pixelBaseFireInterval;
}

function eliminatePixelTurret(turret) {
  turret.eliminated = true;
  turret.respawnPending = false;
  turret.respawnTimer = 0;
  turret.shieldHealth = 0;
}

function updatePixelRespawnEliminations(match) {
  match.turrets.forEach((turret) => {
    if (
      !turret.eliminated &&
      (turret.respawnPending || turret.respawnTimer > 0) &&
      !pixelOwnerCanRespawn(match, turret.id)
    ) {
      eliminatePixelTurret(turret);
    }
  });
}

function queuePixelRespawn(match, turret, xRatio, yRatio) {
  if (turret.eliminated || !turret.respawnPending || !pixelOwnerCanRespawn(match, turret.id)) {
    if (!pixelOwnerCanRespawn(match, turret.id)) {
      eliminatePixelTurret(turret);
    }
    return false;
  }
  const nextXRatio = Math.max(0, Math.min(1, Number(xRatio)));
  const nextYRatio = Math.max(0, Math.min(1, Number(yRatio)));
  const nextX = nextXRatio * pixelBoard.columns;
  const nextY = nextYRatio * pixelBoard.rows;
  const minDistance = pixelShieldRadiusCells * 2 + pixelRespawnShieldClearanceCells;
  const minDistanceSquared = minDistance * minDistance;
  const blocked = match.turrets.some((otherTurret) => {
    if (otherTurret === turret || otherTurret.eliminated || otherTurret.respawnPending) {
      return false;
    }
    if (otherTurret.shieldHealth <= 0 && otherTurret.respawnTimer <= 0) {
      return false;
    }
    const dx = nextX - otherTurret.x;
    const dy = nextY - otherTurret.y;
    return dx * dx + dy * dy < minDistanceSquared;
  });
  if (blocked) {
    return false;
  }

  turret.xRatio = nextXRatio;
  turret.yRatio = nextYRatio;
  turret.x = nextX;
  turret.y = nextY;
  turret.homeAngle = pixelHomeAngleForPoint(turret.x, turret.y);
  turret.arc = pixelTurretArcForPoint(turret.x, turret.y);
  turret.angle = clampPixelAngle(turret, turret.angle);
  turret.respawnPending = false;
  turret.respawnTimer = pixelRespawnSeconds;
  return true;
}

function respawnPixelTurret(match, turret) {
  if (turret.eliminated || turret.respawnPending || turret.respawnTimer > 0) {
    return;
  }
  if (!pixelOwnerCanRespawn(match, turret.id)) {
    eliminatePixelTurret(turret);
    return;
  }
  turret.shieldHealth = pixelShieldMaxHealth;
  turret.fireCooldown = 0.35;
  seedPixelTurret(match, turret);
}

function updatePixelRespawns(match, dt) {
  match.turrets.forEach((turret) => {
    if (turret.eliminated || turret.respawnPending || turret.respawnTimer <= 0) {
      return;
    }
    turret.respawnTimer = Math.max(0, turret.respawnTimer - dt);
    if (turret.respawnTimer <= 0) {
      respawnPixelTurret(match, turret);
    }
  });
}

function updatePixelTurretAim(turret, dt) {
  if (!turret.isBot && !turret.autoRotate) {
    return;
  }
  turret.angle = clampPixelAngle(turret, turret.angle + turret.rotateDirection * turret.rotateSpeed * dt);
  let delta = turret.angle - turret.homeAngle;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  if (Math.abs(delta) > turret.arc * 0.97) {
    turret.rotateDirection *= -1;
  }
}

function bouncePixelShot(shot, previousX, previousY, cellIndex) {
  const column = cellIndex % pixelBoard.columns;
  const row = Math.floor(cellIndex / pixelBoard.columns);
  const crossedX = Math.floor(previousX) !== column;
  const crossedY = Math.floor(previousY) !== row;
  if (crossedX && !crossedY) {
    shot.vx *= -1;
  } else if (crossedY && !crossedX) {
    shot.vy *= -1;
  } else if (Math.abs(shot.vx) >= Math.abs(shot.vy)) {
    shot.vx *= -1;
  } else {
    shot.vy *= -1;
  }
}

function updatePixelShots(match, dt) {
  for (let index = match.shots.length - 1; index >= 0; index -= 1) {
    const shot = match.shots[index];
    shot.life -= dt;
    let hit = false;
    const distance = Math.hypot(shot.vx * dt, shot.vy * dt);
    const steps = Math.max(1, Math.ceil(distance / 0.35));
    for (let step = 0; step < steps && !hit; step += 1) {
      const previousX = shot.x;
      const previousY = shot.y;
      shot.x += (shot.vx * dt) / steps;
      shot.y += (shot.vy * dt) / steps;
      for (const turret of match.turrets) {
        if (turret.id === shot.owner || !pixelTurretIsActive(turret)) continue;
        const dx = shot.x - turret.x;
        const dy = shot.y - turret.y;
        if (dx * dx + dy * dy <= pixelShieldRadiusCells * pixelShieldRadiusCells) {
          turret.shieldHealth = Math.max(0, turret.shieldHealth - (shot.kind === "bomb" ? pixelShieldDamage * 3 : pixelShieldDamage));
          if (turret.shieldHealth <= 0) knockOutPixelTurret(match, turret);
          hit = true;
          break;
        }
      }
      const cellIndex = pixelCellIndexAt(shot.x, shot.y);
      if (!hit && cellIndex !== -1 && cellIndex !== shot.lastCell) {
        shot.lastCell = cellIndex;
        if (match.cells[cellIndex] !== shot.owner) {
          if (shot.kind === "bomb") pixelExplodeCells(match, cellIndex, shot.owner);
          else pixelPaintCell(match, cellIndex, shot.owner);
          if (shot.bouncesRemaining > 0) {
            shot.bouncesRemaining -= 1;
            bouncePixelShot(shot, previousX, previousY, cellIndex);
          } else {
            hit = true;
          }
        }
      }
      if (!hit) {
        const hitLeft = shot.x < 0;
        const hitRight = shot.x > pixelBoard.columns;
        const hitTop = shot.y < 0;
        const hitBottom = shot.y > pixelBoard.rows;
        if (hitLeft || hitRight || hitTop || hitBottom) {
          if (shot.bouncesRemaining > 0) {
            if (hitLeft || hitRight) {
              shot.vx *= -1;
              shot.x = hitLeft ? 0.02 : pixelBoard.columns - 0.02;
            }
            if (hitTop || hitBottom) {
              shot.vy *= -1;
              shot.y = hitTop ? 0.02 : pixelBoard.rows - 0.02;
            }
            shot.bouncesRemaining -= 1;
          } else {
            hit = true;
          }
        }
      }
    }
    if (hit) { match.shots.splice(index, 1); continue; }

    const outside = shot.x < 0 || shot.x > pixelBoard.columns || shot.y < 0 || shot.y > pixelBoard.rows;
    if (shot.life <= 0 || outside) {
      match.shots.splice(index, 1);
    }
  }
}

function tickPixelMatch(match) {
  const dt = pixelTickMs / 1000;
  updatePixelRespawnEliminations(match);
  updatePixelRespawns(match, dt);
  match.turrets.forEach((turret) => {
    if (!pixelTurretIsActive(turret)) {
      return;
    }
    updatePixelTurretAim(turret, dt);
    turret.fireCooldown -= dt;
    if (turret.fireCooldown <= 0) {
      firePixelShot(match, turret);
      turret.fireCooldown = pixelEffectiveFireInterval(turret) * (0.82 + Math.random() * 0.36);
    }
  });
  updatePixelShots(match, dt);
  updatePixelRespawnEliminations(match);
  broadcastPixelMatch(match);
}

function pixelMatchSnapshot(match) {
  return {
    board: pixelBoard,
    cells: match.cells,
    lobby: publicPixelLobby(match.lobby),
    shots: match.shots.map((shot) => ({
      color: shot.color,
      id: shot.id,
      kind: shot.kind,
      owner: shot.owner,
      xRatio: shot.x / pixelBoard.columns,
      yRatio: shot.y / pixelBoard.rows,
    })),
    turrets: match.turrets.map((turret) => ({
      angle: turret.angle,
      autoRotate: turret.autoRotate,
      bombShots: turret.bombShots,
      bouncePower: turret.bouncePower,
      color: turret.color,
      eliminated: turret.eliminated,
      fireSpeedBoosts: turret.fireSpeedBoosts,
      id: turret.id,
      isBot: turret.isBot,
      respawnPending: turret.respawnPending,
      respawnTimer: turret.respawnTimer,
      shieldHealth: turret.shieldHealth,
      xRatio: turret.xRatio,
      yRatio: turret.yRatio,
    })),
    type: "pixel-wars-state",
  };
}

function broadcastPixelMatch(match) {
  const message = JSON.stringify(pixelMatchSnapshot(match));
  match.turrets.forEach((turret) => {
    if (turret.socket?.readyState === WebSocket.OPEN) {
      turret.socket.send(message);
    }
  });
}

function startPixelMatch(match) {
  if (!match.interval) {
    match.interval = setInterval(() => tickPixelMatch(match), pixelTickMs);
  }
}

function activePixelSocketCount(match) {
  return match.turrets.filter((turret) => !turret.isBot && turret.primary && turret.socket?.readyState === WebSocket.OPEN).length;
}

function stopPixelMatchIfIdle(lobby) {
  if (!lobby.match || activePixelSocketCount(lobby.match) > 0) {
    return;
  }
  if (lobby.match.interval) {
    clearInterval(lobby.match.interval);
  }
  lobby.match = null;
  lobby.playerCount = 0;
  lobby.updatedAt = Date.now();
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(new Date());
}

function blankScores() {
  return {
    todayDate: todayKey(),
    todayHighest: 0,
    todayName: "",
    allTimeHighest: 0,
    allTimeName: "",
  };
}

function normalizeScores(scores) {
  const todayDate = todayKey();
  const todayHighest = Number.isFinite(scores.todayHighest) ? scores.todayHighest : 0;
  const allTimeHighest = Number.isFinite(scores.allTimeHighest) ? scores.allTimeHighest : 0;
  const current = {
    todayDate: typeof scores.todayDate === "string" ? scores.todayDate : todayDate,
    todayHighest,
    todayName: typeof scores.todayName === "string" && scores.todayName ? scores.todayName : todayHighest > 0 ? "Unknown scorer" : "",
    allTimeHighest,
    allTimeName:
      typeof scores.allTimeName === "string" && scores.allTimeName
        ? scores.allTimeName
        : allTimeHighest > 0
          ? "Unknown scorer"
          : "",
  };

  if (current.todayDate !== todayDate) {
    current.todayDate = todayDate;
    current.todayHighest = 0;
    current.todayName = "";
  }

  return current;
}

function cleanName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed.slice(0, 24) || "Unknown scorer";
}

function isClaimableName(name) {
  return !name || name === "Unknown scorer";
}

function readScores(path = storePath) {
  try {
    if (!existsSync(path)) {
      return blankScores();
    }

    return normalizeScores(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return blankScores();
  }
}

function writeScores(scores, path = storePath) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(scores, null, 2)}\n`);
}

function readIssues(path) {
  try {
    if (!existsSync(path)) {
      return [];
    }

    const issues = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(issues) ? issues : [];
  } catch {
    return [];
  }
}

function writeIssues(issues, path) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(issues, null, 2)}\n`);
}

function normalizeBridgeJackpot(store) {
  const value = Number(store?.value);
  return {
    value: Number.isFinite(value) && value >= 0 ? Math.floor(value) : bridgeJackpotSeed,
  };
}

function readBridgeJackpot() {
  try {
    if (!existsSync(bridgeJackpotStorePath)) {
      return { value: bridgeJackpotSeed };
    }

    return normalizeBridgeJackpot(JSON.parse(readFileSync(bridgeJackpotStorePath, "utf8")));
  } catch {
    return { value: bridgeJackpotSeed };
  }
}

function writeBridgeJackpot(store) {
  mkdirSync(resolve(bridgeJackpotStorePath, ".."), { recursive: true });
  writeFileSync(bridgeJackpotStorePath, `${JSON.stringify(normalizeBridgeJackpot(store), null, 2)}\n`);
}

function bridgeJackpotSnapshot() {
  return {
    jackpot: readBridgeJackpot().value,
    odds: bridgeJackpotHitOdds,
    seed: bridgeJackpotSeed,
  };
}

function cleanIssueText(value) {
  return (typeof value === "string" ? value.trim() : "").slice(0, 900);
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[".json"],
  });
  response.end(JSON.stringify(body));
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) {
        request.destroy();
        rejectBody(new Error("Request body too large."));
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function clampInteger(value, min, max) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.max(min, Math.min(max, number));
}

function prunePixelLobbies() {
  const now = Date.now();
  for (const [id, lobby] of pixelLobbies) {
    if (now - lobby.updatedAt > pixelLobbyTtlMs && (!lobby.match || activePixelSocketCount(lobby.match) === 0)) {
      if (lobby.match?.interval) {
        clearInterval(lobby.match.interval);
      }
      pixelLobbies.delete(id);
    }
  }
}

function publicPixelLobby(lobby) {
  const playerCount = lobby.match ? activePixelSocketCount(lobby.match) : lobby.playerCount;
  return {
    aiBots: lobby.aiBots,
    createdAt: lobby.createdAt,
    humanPlayers: lobby.humanPlayers,
    id: lobby.id,
    playerCount,
    status: playerCount >= lobby.humanPlayers ? "full" : "waiting",
  };
}

function pixelLobbyList() {
  prunePixelLobbies();
  return Array.from(pixelLobbies.values())
    .map(publicPixelLobby)
    .filter((lobby) => lobby.status === "waiting")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function handlePixelLobbyCreate(request, response) {
  try {
    const body = JSON.parse(await readRequestBody(request));
    const humanPlayers = clampInteger(body.humanPlayers, 1, pixelMaxPlayers);
    const aiBots = clampInteger(body.aiBots, 0, pixelMaxPlayers - humanPlayers);
    const id = `px-${Date.now().toString(36)}-${(nextPixelLobbyId++).toString(36)}`;
    const now = new Date().toISOString();
    const lobby = {
      aiBots,
      createdAt: now,
      humanPlayers,
      id,
      match: null,
      playerCount: 0,
      updatedAt: Date.now(),
    };
    pixelLobbies.set(id, lobby);
    sendJson(response, 201, { lobby: publicPixelLobby(lobby) });
  } catch {
    sendJson(response, 400, { error: "Invalid Pixel Wars lobby payload." });
  }
}

function handlePixelLobbyJoin(response, lobbyId) {
  prunePixelLobbies();
  const lobby = pixelLobbies.get(lobbyId);
  if (!lobby) {
    sendJson(response, 404, { error: "Pixel Wars lobby not found." });
    return;
  }

  if (lobby.playerCount >= lobby.humanPlayers) {
    sendJson(response, 409, { error: "Pixel Wars lobby is full." });
    return;
  }

  lobby.updatedAt = Date.now();
  sendJson(response, 200, { lobby: publicPixelLobby(lobby) });
}

async function handleApi(request, response) {
  const url = new URL(request.url || "/", "http://localhost");
  if (url.pathname === "/api/boombox-history" && request.method === "GET") {
    const requestedLimit = Number(url.searchParams.get("limit") || 50);
    const limit = Math.max(1, Math.min(50, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 50));
    const gameId = url.searchParams.get("gameId") || "";
    const matches = boomBoxHistory.slice().reverse().filter((match) => !gameId || match.gameId === gameId).slice(0, limit);
    sendJson(response, 200, { matches });
    return true;
  }
  if (request.url === "/api/high-scores" && request.method === "GET") {
    sendJson(response, 200, readScores(storePath));
    return true;
  }

  if (request.url === "/api/snake-high-scores" && request.method === "GET") {
    sendJson(response, 200, readScores(snakeStorePath));
    return true;
  }

  if (request.url === "/api/breakout-high-scores" && request.method === "GET") {
    sendJson(response, 200, readScores(breakoutStorePath));
    return true;
  }

  if (request.url === "/api/glass-bridge-tile-scores" && request.method === "GET") {
    sendJson(response, 200, readScores(bridgeTileStorePath));
    return true;
  }

  if (request.url === "/api/glass-bridge-point-scores" && request.method === "GET") {
    sendJson(response, 200, readScores(bridgePointStorePath));
    return true;
  }

  if (request.url === "/api/glass-bridge-jackpot" && request.method === "GET") {
    sendJson(response, 200, bridgeJackpotSnapshot());
    return true;
  }

  if (request.url === "/api/pixel-wars-lobbies" && request.method === "GET") {
    sendJson(response, 200, { lobbies: pixelLobbyList() });
    return true;
  }

  if (request.url === "/api/high-scores" && request.method === "POST") {
    await handleScorePost(request, response, storePath);
    return true;
  }

  if (request.url === "/api/snake-high-scores" && request.method === "POST") {
    await handleScorePost(request, response, snakeStorePath);
    return true;
  }

  if (request.url === "/api/breakout-high-scores" && request.method === "POST") {
    await handleScorePost(request, response, breakoutStorePath);
    return true;
  }

  if (request.url === "/api/glass-bridge-tile-scores" && request.method === "POST") {
    await handleScorePost(request, response, bridgeTileStorePath);
    return true;
  }

  if (request.url === "/api/glass-bridge-point-scores" && request.method === "POST") {
    await handleScorePost(request, response, bridgePointStorePath);
    return true;
  }

  if (request.url === "/api/glass-bridge-jackpot-spin" && request.method === "POST") {
    handleBridgeJackpotSpin(response);
    return true;
  }

  if (request.url === "/api/glass-bridge-jackpot-contribution" && request.method === "POST") {
    handleBridgeJackpotContribution(response);
    return true;
  }

  if (request.url === "/api/pixel-wars-lobbies" && request.method === "POST") {
    await handlePixelLobbyCreate(request, response);
    return true;
  }

  const pixelLobbyJoinMatch = url.pathname.match(/^\/api\/pixel-wars-lobbies\/([^/]+)\/join$/);
  if (pixelLobbyJoinMatch && request.method === "POST") {
    handlePixelLobbyJoin(response, decodeURIComponent(pixelLobbyJoinMatch[1]));
    return true;
  }

  if (url.pathname.startsWith("/api/issues/") && request.method === "POST") {
    const game = decodeURIComponent(url.pathname.replace("/api/issues/", ""));
    await handleIssuePost(request, response, game);
    return true;
  }

  return false;
}

function handleBridgeJackpotSpin(response) {
  const current = readBridgeJackpot();
  const contributedValue = current.value + 1;
  const hit = Math.floor(Math.random() * bridgeJackpotHitOdds) === 0;
  const award = hit ? contributedValue : 0;
  const nextValue = hit ? bridgeJackpotSeed : contributedValue;
  writeBridgeJackpot({ value: nextValue });
  sendJson(response, 200, {
    award,
    contributed: 1,
    hit,
    jackpot: nextValue,
    odds: bridgeJackpotHitOdds,
    seed: bridgeJackpotSeed,
  });
}

function handleBridgeJackpotContribution(response) {
  const current = readBridgeJackpot();
  const nextValue = current.value + 1;
  writeBridgeJackpot({ value: nextValue });
  sendJson(response, 200, {
    contributed: 1,
    jackpot: nextValue,
    odds: bridgeJackpotHitOdds,
    seed: bridgeJackpotSeed,
  });
}

async function handleIssuePost(request, response, game) {
  try {
    const path = issueStorePaths[game];
    if (!path) {
      sendJson(response, 404, { error: "Unknown game issue bucket." });
      return;
    }

    const body = JSON.parse(await readRequestBody(request));
    const message = cleanIssueText(body.message);
    if (message.length < 3) {
      sendJson(response, 400, { error: "Issue report must include a short message." });
      return;
    }

    const issues = readIssues(path);
    const issue = {
      createdAt: new Date().toISOString(),
      game,
      id: `${game}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      language: cleanIssueText(body.language).slice(0, 32),
      message,
      online: body.online === true,
      page: cleanIssueText(body.page).slice(0, 240),
      platform: cleanIssueText(body.platform).slice(0, 80),
      referrer: cleanIssueText(body.referrer).slice(0, 240),
      screen: cleanIssueText(body.screen).slice(0, 32),
      timezone: cleanIssueText(body.timezone).slice(0, 80),
      userAgent: cleanIssueText(body.userAgent).slice(0, 240),
      viewport: cleanIssueText(body.viewport).slice(0, 32),
    };
    issues.push(issue);
    writeIssues(issues.slice(-500), path);
    sendJson(response, 201, { ok: true });
  } catch {
    sendJson(response, 400, { error: "Invalid issue report." });
  }
}

async function handleScorePost(request, response, path) {
  try {
    const body = JSON.parse(await readRequestBody(request));
    const score = Number(body.score);
    if (!Number.isFinite(score) || score < 0) {
      sendJson(response, 400, { error: "Score must be a non-negative number." });
      return;
    }

    const scores = readScores(path);
    const rawName = typeof body.name === "string" ? body.name.trim() : "";
    const name = cleanName(body.name);
    const todayRecord = score > scores.todayHighest;
    const allTimeRecord = score > scores.allTimeHighest;
    const todayNameClaim = !todayRecord && score === scores.todayHighest && isClaimableName(scores.todayName) && rawName.length > 0;
    const allTimeNameClaim =
      !allTimeRecord && score === scores.allTimeHighest && isClaimableName(scores.allTimeName) && rawName.length > 0;

    if (todayRecord || todayNameClaim) {
      scores.todayHighest = score;
      scores.todayName = name;
    }

    if (allTimeRecord || allTimeNameClaim) {
      scores.allTimeHighest = score;
      scores.allTimeName = name;
    }

    writeScores(scores, path);
    sendJson(response, 200, { ...scores, todayRecord, allTimeRecord });
  } catch {
    sendJson(response, 400, { error: "Invalid score payload." });
  }
}

function serveStatic(request, response) {
  const url = new URL(request.url || "/", "http://localhost");
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(distDir, requestedPath));

  if (!filePath.startsWith(distDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const pathToServe = existsSync(filePath) ? filePath : join(distDir, "index.html");
  const extension = extname(pathToServe);
  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Type": contentTypes[extension] || "application/octet-stream",
  });
  createReadStream(pathToServe).pipe(response);
}

const server = createServer(async (request, response) => {
  if (await handleApi(request, response)) {
    return;
  }

  serveStatic(request, response);
});

const snakeServer = new WebSocketServer({ noServer: true });
const pixelServer = new WebSocketServer({ noServer: true });
const cribbageServer = new WebSocketServer({ noServer: true });
const boomboxServer = new WebSocketServer({ noServer: true });
const cribbageRooms = new Map();
const cribbageUserMemberships = new Map();
let nextCribbageRoomId = 1;
const boomboxRooms = new Map();
const boomboxUserMemberships = new Map();
let nextBoomBoxRoomId = 1027;

function boomBoxRoomId() { return `BB-${String(nextBoomBoxRoomId++).padStart(4, "0")}`; }
function boomBoxTerrain(seed, profile = "sunset-range") {
  let value = seed >>> 0; const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  const baseline = profile === "ice-shelf" ? 342 : profile === "lunar-crater" ? 378 : 365; const roughness = profile === "ice-shelf" ? 16 : profile === "lunar-crater" ? 34 : 24;
  const terrain = Array.from({ length: 960 }, (_, x) => Math.max(245, Math.min(450, baseline + Math.sin(x / 82) * 28 + Math.sin(x / 31 + 1.4) * 12 + (random() - .5) * roughness)));
  for (let pass = 0; pass < 3; pass += 1) for (let x = 1; x < terrain.length - 1; x += 1) terrain[x] = (terrain[x - 1] + terrain[x] + terrain[x + 1]) / 3;
  return terrain;
}
const BOOMBOX_RULES_VERSION = 1;
const BOOMBOX_WEAPON_CATALOG = {
  cannon: { label: "Cannon", cost: 0, inventory: 99, starter: 99, damage: 70, radius: 58, depth: 24, mode: "single" },
  "heavy-cannon": { label: "Heavy cannon", cost: 45, inventory: 2, damage: 82, radius: 72, depth: 36, mode: "single", speed: .86 },
  "heavy-shell": { label: "Heavy shell", cost: 30, inventory: 2, damage: 78, radius: 84, depth: 40, mode: "single", speed: .9 },
  "precision-round": { label: "Precision round", cost: 20, inventory: 3, damage: 92, radius: 34, depth: 12, mode: "single", speed: 1.18 },
  "split-shell": { label: "Split shell", cost: 25, inventory: 3, damage: 54, radius: 42, depth: 24, mode: "spread", count: 2, spread: 7 },
  "mini-nuke": { label: "Mini nuke", cost: 70, inventory: 1, damage: 100, radius: 150, depth: 68, mode: "area", speed: .72 },
  mirv: { label: "MIRV", cost: 65, inventory: 1, damage: 54, radius: 54, depth: 28, mode: "spread", count: 3, spread: 10 },
  "triple-shot": { label: "Triple shot", cost: 50, inventory: 2, damage: 44, radius: 38, depth: 18, mode: "spread", count: 3, spread: 14 },
  "bouncing-bomb": { label: "Bouncing bomb", cost: 40, inventory: 2, damage: 64, radius: 52, depth: 30, mode: "single", bounces: 5 },
  "riot-bomb": { label: "Riot bomb", cost: 35, inventory: 2, damage: 58, radius: 68, depth: 34, mode: "impact" },
  "piercing-round": { label: "Piercing round", cost: 40, inventory: 2, damage: 78, radius: 36, depth: 20, mode: "piercing", ignoreTerrain: true, speed: .92 },
  napalm: { label: "Napalm", cost: 55, inventory: 2, damage: 40, radius: 62, depth: 16, mode: "napalm", burningTurns: 2 },
  "smoke-shell": { label: "Smoke shell", cost: 20, inventory: 2, damage: 0, radius: 80, depth: 0, mode: "smoke", material: "smoke" },
  "liquid-dirt": { label: "Liquid dirt", cost: 25, inventory: 2, damage: 0, radius: 74, depth: -32, mode: "filler", material: "liquid-dirt" },
  "terrain-tool": { label: "Terrain tool", cost: 15, inventory: 2, damage: 0, radius: 76, depth: -26, mode: "filler", material: "reinforced" },
  "terrain-remover": { label: "Terrain remover", cost: 20, inventory: 2, damage: 0, radius: 88, depth: 56, mode: "remover", material: "excavated" },
  "tracer-round": { label: "Tracer round", cost: 28, inventory: 2, damage: 62, radius: 30, depth: 18, mode: "guided", guided: true, speed: 1.1 },
  "laser-line": { label: "Laser line", cost: 60, inventory: 1, damage: 74, radius: 8, depth: 0, mode: "laser", ignoreTerrain: true },
  "area-charge": { label: "Area charge", cost: 40, inventory: 1, damage: 68, radius: 110, depth: 48, mode: "area" },
};
const BOOMBOX_UTILITY_CATALOG = {
  "repair-kit": { label: "Repair kit", cost: 20, inventory: 2, starter: 1, effect: "repair", amount: 30 },
  shield: { label: "Light shield", cost: 25, inventory: 2, starter: 1, effect: "shield", amount: 35 },
  "heavy-shield": { label: "Heavy shield", cost: 45, inventory: 1, effect: "shield", amount: 70 },
  "shield-recharge": { label: "Shield recharge", cost: 30, inventory: 2, effect: "shield-recharge", amount: 25 },
  "terrain-lift": { label: "Terrain lift", cost: 15, inventory: 2, starter: 1, effect: "terrain-lift" },
  parachute: { label: "Parachute", cost: 15, inventory: 2, starter: 1, effect: "parachute" },
  "fuel-canister": { label: "Fuel canister", cost: 15, inventory: 2, effect: "fuel", amount: 50 },
  "guidance-kit": { label: "Guidance kit", cost: 30, inventory: 1, effect: "guidance" },
  "turret-upgrade": { label: "Turret upgrade", cost: 50, inventory: 1, effect: "turret-upgrade" },
};
function boomBoxRulesFromConfig(config = {}) {
  const firingModes = new Set(["sequential", "synchronous", "simultaneous"]);
  const boundaries = new Set(["stop", "bounce", "wrap"]);
  const pace = ["relaxed", "standard", "blitz"].includes(String(config.pace)) ? String(config.pace) : "standard";
  return {
    version: BOOMBOX_RULES_VERSION,
    seats: Math.max(2, Math.min(10, Number(config.seats) || 2)),
    firingMode: firingModes.has(String(config.firingMode)) ? String(config.firingMode) : "sequential",
    movement: Boolean(config.movement),
    gravity: Math.max(60, Math.min(260, Number(config.gravity) || 150)),
    windMode: config.windMode === "fixed" ? "fixed" : "variable",
    windLimit: Math.max(0, Math.min(2, Number(config.windLimit) || 1.2)),
    boundary: boundaries.has(String(config.boundary)) ? String(config.boundary) : "stop",
    startingMoney: Math.max(0, Math.min(10000, Number(config.startingMoney) || 100)),
    turnPace: pace,
    events: { meteorShower: Boolean(config.events?.meteorShower), scenery: Boolean(config.events?.scenery) },
    weaponCatalog: Object.fromEntries(Object.entries(BOOMBOX_WEAPON_CATALOG).filter(([id]) => !Array.isArray(config.disabledWeapons) || !config.disabledWeapons.includes(id))),
    utilityCatalog: Object.fromEntries(Object.entries(BOOMBOX_UTILITY_CATALOG).filter(([id]) => !Array.isArray(config.disabledUtilities) || !config.disabledUtilities.includes(id))),
  };
}
function boomBoxSend(socket, payload) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload)); }
function boomBoxPublicRoom(room, userId = "") { return { gameId: room.gameId, name: room.name, creator: room.creator, seats: room.seats.length, connected: room.seats.filter((seat) => seat.connected).length, spectators: room.spectators?.size || 0, terrain: room.terrain, pace: room.rules?.turnPace || room.pace, firingMode: room.rules?.firingMode || "sequential", aiFill: room.aiFill, started: room.started, phase: room.phase, mine: userId === room.ownerUserId, inviteToken: userId === room.ownerUserId ? room.inviteToken : "", resumable: room.seats.some((seat) => seat.userId === userId && Boolean(seat.sessionId)) }; }
function boomBoxLobbyPayload(userId = "") { const games = [...boomboxRooms.values()].map((room) => boomBoxPublicRoom(room, userId)); return { type: "boombox-lobby-list", games, created: games.filter((room) => room.mine), available: games.filter((room) => !room.mine && (!room.started ? room.connected < room.seats : true)) }; }
function broadcastBoomBoxLobby() { for (const room of boomboxRooms.values()) for (const seat of room.seats) if (seat.socket) boomBoxSend(seat.socket, boomBoxLobbyPayload(seat.userId)); }
function boomBoxSnapshot(room) { return { gameId: room.gameId, rules: room.rules, phase: room.phase, seed: room.seed, terrainName: room.terrain, terrain: room.state.terrain, terrainSolid: room.state.terrainSolid, terrainMaterial: room.state.terrainMaterial, wind: room.state.wind, turn: room.state.turn, turnSeat: room.state.turnSeat, actionSequence: room.state.actionSequence, players: room.state.players.map(({ socket, ...player }) => player), eliminationOrder: room.state.eliminationOrder, placements: room.state.placements, log: room.state.log, winner: room.state.winner ?? null }; }
function boomBoxLoadoutPayload(room, seatIndex) { const player = room.state?.players?.[seatIndex]; if (!player) return { type: "boombox-loadout", gameId: room.gameId, rules: room.rules, money: room.rules.startingMoney, inventory: boomBoxInitialInventory(room.rules.weaponCatalog), utilities: boomBoxInitialInventory(room.rules.utilityCatalog) }; return { type: "boombox-loadout", gameId: room.gameId, rules: room.rules, money: player.money, inventory: player.inventory, inventoryCapacity: player.inventoryCapacity, utilities: player.utilities, utilityCapacity: player.utilityCapacity }; }
function boomBoxSendLoadout(room, seatIndex) { const seat = room.seats[seatIndex]; if (seat?.socket) boomBoxSend(seat.socket, boomBoxLoadoutPayload(room, seatIndex)); }
function broadcastBoomBoxRoom(room) { const snapshot = boomBoxSnapshot(room); for (const [index, seat] of room.seats.entries()) if (seat.socket) boomBoxSend(seat.socket, { type: "boombox-state", snapshot, seat: index }); for (const spectator of room.spectators || []) boomBoxSend(spectator, { type: "boombox-state", snapshot, seat: -1, spectator: true }); broadcastBoomBoxLobby(); }
function boomBoxReplaySnapshot(room) { return { sequence: room.state.log.at(-1)?.sequence || 0, turn: room.state.turn, turnSeat: room.state.turnSeat, phase: room.phase, terrain: room.state.terrain.filter((_, index) => index % 6 === 0), terrainSolid: room.state.terrainSolid.filter((_, index) => index % 6 === 0), terrainMaterial: room.state.terrainMaterial.filter((_, index) => index % 6 === 0), players: room.state.players.map(({ socket, ...player }) => ({ ...player })), eliminationOrder: room.state.eliminationOrder, placements: room.state.placements }; }
function boomBoxRecordReplay(room) { if (!room.state) return; room.state.replay.push(boomBoxReplaySnapshot(room)); if (room.state.replay.length > 100) room.state.replay.shift(); }
function boomBoxRecordHistory(room) { if (!room.state || room.historyRecorded) return; room.historyRecorded = true; boomBoxHistory.push({ gameId: room.gameId, name: room.name, creator: room.creator, terrain: room.terrain, seed: room.seed, rules: room.rules, finishedAt: new Date().toISOString(), winner: room.state.winner, eliminationOrder: room.state.eliminationOrder, placements: room.state.placements, players: room.state.players.map(({ socket, ...player }) => player), terrainData: room.state.terrain, terrainSolid: room.state.terrainSolid, terrainMaterial: room.state.terrainMaterial, replay: room.state.replay, log: room.state.log }); writeBoomBoxHistory(boomBoxHistory); }
function boomBoxInitialInventory(catalog) { return Object.fromEntries(Object.entries(catalog).map(([id, item]) => [id, Math.max(0, Number(item.starter) || 0)])); }
function boomBoxInitialCapacity(catalog) { return Object.fromEntries(Object.entries(catalog).map(([id, item]) => [id, Math.max(0, Number(item.inventory) || 0)])); }
function createBoomBoxState(room) { const positions = room.seats.length === 2 ? [146, 814] : room.seats.map((_, index) => 146 + Math.round(index * (814 - 146) / Math.max(1, room.seats.length - 1))); const colors = ["#54e7ff", "#ff8b63", "#d98cff", "#b8f266", "#ffd166", "#f78fb3", "#8be9fd", "#ff79c6", "#50fa7b", "#f1fa8c"]; const inventory = boomBoxInitialInventory(room.rules.weaponCatalog); const utilities = boomBoxInitialInventory(room.rules.utilityCatalog); return { terrain: boomBoxTerrain(room.seed, room.terrain), terrainSolid: Array(960).fill(true), terrainMaterial: Array(960).fill("dirt"), wind: room.rules.windMode === "fixed" ? 0 : (room.seed % 17 - 8) / 10, turn: 1, turnSeat: 0, actionSequence: 0, winner: null, eliminationOrder: [], placements: [], log: [], replay: [], players: room.seats.map((seat, index) => ({ name: seat.name, x: positions[index], y: 0, turretAngle: 42, power: 58, health: 100, maxHealth: 100, alive: true, falling: false, buried: false, fallDistance: 0, burning: 0, color: colors[index % colors.length], shots: 0, hits: 0, damage: 0, shield: 0, fuel: 100, money: room.rules.startingMoney, inventory: { ...inventory }, inventoryCapacity: boomBoxInitialCapacity(room.rules.weaponCatalog), utilities: { ...utilities }, utilityCapacity: boomBoxInitialCapacity(room.rules.utilityCatalog), upgrades: {}, eliminatedAtTurn: null, eliminationOrder: null, placement: null, stats: { shots: 0, hits: 0, damage: 0, terrainChanges: 0, purchases: 0 } })) }; }
function startBoomBoxRoom(room) { room.started = true; room.phase = "turn-prep"; room.resolving = false; room.state = createBoomBoxState(room); room.state.players.forEach((player) => { player.y = room.state.terrain[player.x] - 17; }); room.updatedAt = Date.now(); broadcastBoomBoxRoom(room); scheduleBoomBoxAi(room); }
function fillBoomBoxAi(room) { for (const seat of room.seats) if (!seat.connected) { seat.connected = true; seat.bot = true; seat.name = `AI ${seat.name}`; } startBoomBoxRoom(room); }
function scheduleBoomBoxAi(room) {
  if (room.aiTimer || room.resolving || !room.started || room.phase !== "turn-prep" || !room.state) return;
  const seatIndex = room.state.turnSeat;
  if (!room.seats[seatIndex]?.bot || !room.state.players[seatIndex]?.alive) return;
  room.aiTimer = setTimeout(() => {
    room.aiTimer = null;
    if (!boomboxRooms.has(room.gameId) || room.resolving || !room.started || room.phase !== "turn-prep" || !room.state || room.state.turnSeat !== seatIndex) return;
    const targetIndex = room.state.players.findIndex((player, index) => index !== seatIndex && player.alive);
    if (targetIndex < 0) return;
    const shooter = room.state.players[seatIndex];
    const target = room.state.players[targetIndex];
    const distance = Math.abs(target.x - shooter.x);
    const angle = Math.max(18, Math.min(72, Math.round(38 + distance / 28 + ((room.seed + room.state.turn * 11 + seatIndex * 9) % 15 - 7))));
    const power = Math.max(35, Math.min(88, Math.round(50 + distance / 18 + ((room.seed + room.state.turn * 7 + seatIndex * 5) % 18))));
    const result = resolveBoomBoxAction(room, seatIndex, { targetIndex, angle, power, weapon: "cannon" }, `ai-${room.gameId}-${room.state.actionSequence + 1}`);
    if (result?.error) return;
    if (result?.flight) {
      for (const seat of room.seats) if (seat.socket) boomBoxSend(seat.socket, { type: "boombox-flight", flight: result.flight });
      for (const spectator of room.spectators || []) boomBoxSend(spectator, { type: "boombox-flight", flight: result.flight });
      setTimeout(() => { if (boomboxRooms.has(room.gameId)) { room.resolving = false; if (room.phase !== "finished") room.phase = "turn-prep"; broadcastBoomBoxRoom(room); scheduleBoomBoxAi(room); } }, 450);
    } else { broadcastBoomBoxRoom(room); scheduleBoomBoxAi(room); }
  }, 650);
}
function boomBoxAppendEvent(room, entry) { const event = { sequence: ++room.state.actionSequence, ...entry }; room.state.log.push(event); if (room.state.log.length > 100) room.state.log.shift(); return event; }
function boomBoxSegmentHitsCircle(from, to, center, radius) { const dx = to.x - from.x; const dy = to.y - from.y; const lengthSquared = dx * dx + dy * dy; const t = lengthSquared ? Math.max(0, Math.min(1, ((center.x - from.x) * dx + (center.y - from.y) * dy) / lengthSquared)) : 0; const x = from.x + dx * t; const y = from.y + dy * t; return Math.hypot(center.x - x, center.y - y) <= radius; }
function boomBoxProjectilePath(room, shooterIndex, requestedTargetIndex, weapon, angleDegrees, power) {
  const shooter = room.state.players[shooterIndex]; const requestedTarget = room.state.players[requestedTargetIndex]; const direction = requestedTarget.x >= shooter.x ? 1 : -1; const angle = angleDegrees * Math.PI / 180; const gravity = room.rules.gravity; const speed = power * 5.4 * (Number(weapon.speed) || 1); let x = shooter.x + direction * 22; let y = shooter.y - 17; let vx = Math.cos(angle) * speed * direction; let vy = -Math.sin(angle) * speed; let bounces = 0; const maxBounces = Math.max(0, Number(weapon.bounces) || 3); const path = [{ x, y }]; let impact = "miss"; let impactX = x; let impactTarget = -1;
  if (weapon.mode === "laser") { const end = { x: requestedTarget.x, y: requestedTarget.y - 12 }; const steps = 16; for (let step = 1; step <= steps; step += 1) path.push({ x: x + (end.x - x) * step / steps, y: y + (end.y - y) * step / steps }); impact = "tank"; impactTarget = requestedTargetIndex; impactX = end.x; return { path, impact, impactTarget, center: impactX, weapon }; }
  for (let step = 0; step < 360; step += 1) {
    const previous = { x, y }; const dt = 1 / 30; vx += room.state.wind * 20 * dt; vy += gravity * dt; x += vx * dt; y += vy * dt;
    if (weapon.guided) { vx += (requestedTarget.x - x) * .012; vy += ((requestedTarget.y - 12) - y) * .012; }
    if (x < 0 || x > 959) { if (room.rules.boundary === "wrap") x = (x + 960) % 960; else if (room.rules.boundary === "bounce" && bounces < maxBounces) { x = Math.max(0, Math.min(959, x)); vx *= -0.82; bounces += 1; } else { impact = "bounds"; impactX = Math.max(0, Math.min(959, x)); path.push({ x: impactX, y }); break; } }
    if (y < 0 && room.rules.boundary === "bounce" && bounces < maxBounces) { y = 0; vy *= -0.82; bounces += 1; }
    const current = { x, y }; path.push(current); impactX = x;
    const terrainIndex = Math.max(0, Math.min(959, Math.round(x))); const terrainY = room.state.terrain[terrainIndex]; if (!weapon.ignoreTerrain && room.state.terrainSolid[terrainIndex] && y >= terrainY) { impact = "terrain"; break; }
    const hitSeat = room.state.players.findIndex((candidate, index) => index !== shooterIndex && candidate.alive && boomBoxSegmentHitsCircle(previous, current, { x: candidate.x, y: candidate.y - 12 }, 22));
    if (hitSeat >= 0) { impact = "tank"; impactTarget = hitSeat; break; }
    if (y > 590) { impact = "bounds"; break; }
  }
  const center = impact === "tank" && impactTarget >= 0 ? room.state.players[impactTarget].x : impactX; return { path, impact, impactTarget, center, weapon };
}
function boomBoxMutateTerrain(room, center, radius, depth, material = "dirt", solid = true) {
  const before = room.state.players.map((player) => ({ x: player.x, y: player.y, surface: room.state.terrain[Math.max(0, Math.min(959, Math.round(player.x)))] }));
  const boundedRadius = Math.max(1, Math.round(radius)); for (let dx = -boundedRadius; dx <= boundedRadius; dx += 1) { const index = Math.max(0, Math.min(959, Math.round(center + dx))); const factor = 1 - Math.abs(dx) / boundedRadius; room.state.terrain[index] = Math.max(210, Math.min(522, room.state.terrain[index] + depth * factor * factor)); room.state.terrainMaterial[index] = material; room.state.terrainSolid[index] = solid; }
  for (const [index, player] of room.state.players.entries()) if (player.alive) { const terrainIndex = Math.max(0, Math.min(959, Math.round(player.x))); const afterSurface = room.state.terrain[terrainIndex]; const old = before[index]; if (!old) continue; if (afterSurface > old.surface + 8) { const drop = afterSurface - old.surface; player.y = afterSurface - 17; player.fallDistance = drop; player.falling = true; const parachute = player.upgrades.parachute || 0; if (parachute > 0) { player.upgrades.parachute -= 1; boomBoxAppendEvent(room, { kind: "fall", seat: index, distance: drop, protected: true }); } else { const fallDamage = Math.max(0, Math.round(drop * 0.35 - 8)); if (fallDamage > 0) { player.health = Math.max(0, player.health - fallDamage); boomBoxAppendEvent(room, { kind: "fall", seat: index, distance: drop, damage: fallDamage }); if (player.health === 0) { player.alive = false; boomBoxRecordElimination(room, index, "fall"); } } } player.falling = false; } else if (afterSurface < old.surface - 8) { player.y = afterSurface - 17; player.buried = true; boomBoxAppendEvent(room, { kind: "buried", seat: index }); } else player.y = afterSurface - 17; }
}
function boomBoxRecordElimination(room, seatIndex, reason = "damage") { const player = room.state.players[seatIndex]; if (!player || player.eliminatedAtTurn !== null) return; player.eliminatedAtTurn = room.state.turn; player.eliminationOrder = room.state.eliminationOrder.length + 1; room.state.eliminationOrder.push({ seat: seatIndex, name: player.name, turn: room.state.turn, reason }); boomBoxAppendEvent(room, { kind: "elimination", seat: seatIndex, reason, turn: room.state.turn }); }
function boomBoxPurchase(room, seatIndex, category, itemId, quantity = 1) {
  const player = room.state?.players?.[seatIndex]; const catalog = category === "utility" ? room.rules.utilityCatalog : room.rules.weaponCatalog; const item = catalog[itemId]; const count = Math.max(1, Math.min(20, Math.floor(Number(quantity) || 1)));
  if (!player || !item) return { error: "That item is not available in this ruleset." };
  const current = category === "utility" ? player.utilities[itemId] || 0 : player.inventory[itemId] || 0; const capacity = category === "utility" ? player.utilityCapacity[itemId] || item.inventory : player.inventoryCapacity[itemId] || item.inventory; const totalCost = Math.max(0, Number(item.cost) || 0) * count;
  if (current + count > capacity) return { error: `Inventory limit reached for ${item.label || itemId}.` }; if (player.money < totalCost) return { error: `You need ${totalCost} credits for that purchase.` }; if (totalCost === 0) return { error: "That item is already included in your loadout." };
  player.money -= totalCost; if (category === "utility") player.utilities[itemId] = current + count; else player.inventory[itemId] = current + count; player.stats.purchases += count; const entry = boomBoxAppendEvent(room, { kind: "purchase", seat: seatIndex, category, item: itemId, quantity: count, cost: totalCost }); room.updatedAt = Date.now(); return { entry, loadout: boomBoxLoadoutPayload(room, seatIndex) };
}
function boomBoxTickStatuses(room) { for (const [index, player] of room.state.players.entries()) if (player.alive && player.burning > 0) { const damage = 18; player.health = Math.max(0, player.health - damage); player.burning -= 1; boomBoxAppendEvent(room, { kind: "burn", seat: index, damage, turnsLeft: player.burning }); if (player.health === 0) { player.alive = false; boomBoxRecordElimination(room, index, "napalm"); } } }
function boomBoxFinish(room, winnerIndex) { if (room.phase === "finished") return; room.phase = "finished"; room.state.winner = winnerIndex; const placements = []; if (winnerIndex >= 0 && room.state.players[winnerIndex]?.alive) placements.push({ seat: winnerIndex, name: room.state.players[winnerIndex].name, place: 1, reason: "survivor" }); [...room.state.eliminationOrder].reverse().forEach((entry, index) => { const place = placements.length + 1; placements.push({ seat: entry.seat, name: entry.name, place, reason: entry.reason }); }); room.state.placements = placements; for (const placement of placements) room.state.players[placement.seat].placement = placement.place; for (const placement of placements) boomBoxAppendEvent(room, { kind: "placement", seat: placement.seat, place: placement.place }); boomBoxRecordReplay(room); boomBoxRecordHistory(room); }
function advanceBoomBoxTurn(room, seatIndex) {
  boomBoxTickStatuses(room);
  const living = room.state.players.map((player, index) => ({ player, index })).filter(({ player }) => player.alive);
  if (!living.some(({ index }) => index !== seatIndex)) { boomBoxFinish(room, seatIndex); return; }
  if (!living.some(({ index }) => !room.seats[index]?.bot)) { boomBoxFinish(room, living[0]?.index ?? seatIndex); return; }
  boomBoxRecordReplay(room); let next = (seatIndex + 1) % room.state.players.length; while (!room.state.players[next].alive) next = (next + 1) % room.state.players.length;
  room.state.turnSeat = next; room.state.turn += 1; const limit = room.rules.windLimit; room.state.wind = room.rules.windMode === "fixed" ? room.state.wind : Math.max(-limit, Math.min(limit, room.state.wind + ((room.seed + room.state.turn * 13) % 7 - 3) / 10));
}
function resolveBoomBoxAction(room, seatIndex, action, actionId = "") {
  if (!room.started || room.phase === "finished" || room.resolving || room.state.turnSeat !== seatIndex) return { error: "It is not your turn." };
  if (!actionId) return { error: "An action ID is required." };
  const player = room.state.players[seatIndex];
  if (action.kind === "utility") {
    const utility = String(action.utility || "repair-kit"); const utilityRules = room.rules.utilityCatalog[utility]; if (!utilityRules) return { error: "That utility is not available in this ruleset." }; if ((player.utilities[utility] || 0) < 1) return { error: "That utility is out of stock." }; const amount = Number(utilityRules.amount) || 0;
    if (utilityRules.effect === "repair") player.health = Math.min(player.maxHealth, player.health + amount); else if (utilityRules.effect === "shield") player.shield = Math.max(player.shield || 0, amount); else if (utilityRules.effect === "shield-recharge") player.shield = Math.min(100, (player.shield || 0) + amount); else if (utilityRules.effect === "terrain-lift") boomBoxMutateTerrain(room, player.x, 70, -26, "reinforced"); else if (utilityRules.effect === "parachute") player.upgrades.parachute = (player.upgrades.parachute || 0) + 1; else if (utilityRules.effect === "fuel") player.fuel = Math.min(100, player.fuel + amount); else if (utilityRules.effect === "guidance") player.upgrades.guidance = (player.upgrades.guidance || 0) + 1; else if (utilityRules.effect === "turret-upgrade") player.upgrades.turret = (player.upgrades.turret || 0) + 1;
    player.utilities[utility] -= 1; boomBoxAppendEvent(room, { kind: "utility", seat: seatIndex, utility, effect: utilityRules.effect, actionId }); advanceBoomBoxTurn(room, seatIndex); room.updatedAt = Date.now(); return { flight: null };
  }
  const targetIndex = Math.max(0, Math.min(room.state.players.length - 1, Number(action.targetIndex) || 0)); const target = room.state.players[targetIndex]; if (!target || targetIndex === seatIndex || !target.alive) return { error: "Choose a living opponent." };
  const angle = Math.max(8, Math.min(82, Number(action.angle) || 42)); const power = Math.max(25, Math.min(95, Number(action.power) || 58)); const weapon = String(action.weapon || "cannon"); const baseWeaponRules = room.rules.weaponCatalog[weapon]; if (!baseWeaponRules) return { error: "That weapon is not available in this ruleset." }; const weaponRules = player.upgrades.guidance ? { ...baseWeaponRules, guided: true } : baseWeaponRules; if ((player.inventory[weapon] || 0) < 1) return { error: "That weapon is out of stock." };
  player.inventory[weapon] -= 1; player.turretAngle = angle; player.power = power;
  const trajectories = []; const childCount = Math.max(1, Number(weaponRules.count) || 1); for (let child = 0; child < childCount; child += 1) { const childAngle = angle + (childCount > 1 ? (child - (childCount - 1) / 2) * (Number(weaponRules.spread) || 0) : 0); trajectories.push(boomBoxProjectilePath(room, seatIndex, targetIndex, weaponRules, childAngle, power)); }
  const trajectory = trajectories[0]; const hitTargetIndex = trajectory.impactTarget; const hit = hitTargetIndex >= 0; const hitTarget = hitTargetIndex >= 0 ? room.state.players[hitTargetIndex] : null; const damage = weaponRules.damage; const terrainCenter = trajectory.center; const terrainRadius = weaponRules.radius; const terrainDepth = weaponRules.depth ?? (weapon === "terrain-tool" ? -26 : 24); const material = weaponRules.material || "dirt";
  for (const child of trajectories) { const childDamageTarget = child.impactTarget >= 0 ? room.state.players[child.impactTarget] : null; if (childDamageTarget && weaponRules.damage > 0) { const absorbed = Math.min(childDamageTarget.shield || 0, weaponRules.damage); childDamageTarget.shield = Math.max(0, (childDamageTarget.shield || 0) - absorbed); const actual = weaponRules.damage - absorbed; childDamageTarget.health = Math.max(0, childDamageTarget.health - actual); player.hits += 1; player.stats.hits += 1; player.damage += actual; player.stats.damage += actual; if (weaponRules.mode === "napalm") childDamageTarget.burning = Math.max(childDamageTarget.burning || 0, Number(weaponRules.burningTurns) || 2); if (childDamageTarget.health === 0) { childDamageTarget.alive = false; boomBoxRecordElimination(room, room.state.players.indexOf(childDamageTarget), weaponRules.mode === "napalm" ? "napalm" : "damage"); } } boomBoxMutateTerrain(room, child.center, weaponRules.radius, terrainDepth, material, weaponRules.mode !== "remover"); }
  const entry = boomBoxAppendEvent(room, { kind: "fire", seat: seatIndex, target: targetIndex, actualTarget: hitTargetIndex, weapon, mode: weaponRules.mode, children: childCount, angle, power, hit, impact: trajectory.impact, damage: hit ? damage : 0, terrainChange: { center: Math.round(terrainCenter), radius: terrainRadius, depth: terrainDepth, material }, actionId }); player.shots += 1; player.stats.shots += 1; player.stats.terrainChanges += childCount;
  advanceBoomBoxTurn(room, seatIndex); room.phase = room.phase === "finished" ? "finished" : "flight"; room.resolving = true; room.updatedAt = Date.now(); return { flight: { seat: seatIndex, target: hitTargetIndex >= 0 ? hitTargetIndex : targetIndex, weapon, hit, impact: trajectory.impact, path: trajectory.path, sequence: entry.sequence } };
}
function pruneBoomBoxRooms() { const cutoff = Date.now() - 45 * 60 * 1000; for (const [id, room] of boomboxRooms) if (room.updatedAt < cutoff) { if (room.aiTimer) clearTimeout(room.aiTimer); boomboxRooms.delete(id); for (const seat of room.seats) if (seat.userId && boomboxUserMemberships.get(seat.userId) === id) boomboxUserMemberships.delete(seat.userId); } }

function cribbageRoomId() {
  return `crib-${String(nextCribbageRoomId++).padStart(4, "0")}`;
}

function cribbageToken() {
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function cribbagePublicRoom(room, userId = "") {
  return {
    gameId: room.gameId,
    variant: room.config.variant,
    playerCount: room.config.playerCount,
    format: room.config.format,
    ownerSeat: room.hostSeat,
    ownerName: room.seats[room.hostSeat]?.name || "Player 1",
    mine: Boolean(userId && room.ownerUserId === userId),
    started: room.started,
    seats: room.seats.map((seat, index) => ({ seat: index, name: seat.name, control: seat.control, team: seat.team, connected: Boolean(seat.socket), available: seat.control === "human" && !seat.sessionId })),
  };
}

function cribbageSend(socket, payload) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function cribbageLobbyPayload(userId = "") {
  const games = [...cribbageRooms.values()].filter((room) => !room.expired).map((room) => cribbagePublicRoom(room, userId));
  const created = games.filter((game) => game.mine);
  const available = games.filter((game) => !game.mine && !game.started && game.seats.some((seat) => seat.available));
  return { type: "cribbage-lobby-list", games, created, available, activeGameId: userId ? cribbageUserMemberships.get(userId) || "" : "" };
}

function broadcastCribbageLobby() {
  for (const room of cribbageRooms.values()) for (const seat of room.seats) if (seat.socket) cribbageSend(seat.socket, cribbageLobbyPayload(seat.userId || ""));
}

function cribbageConnectionPayload(room) {
  return { type: "cribbage-connection", gameId: room.gameId, seats: room.seats.map((seat, index) => ({ seat: index, name: seat.name, control: seat.control, connected: Boolean(seat.socket), quit: Boolean(seat.quit) })) };
}

function cribbageViewFor(room, seatIndex) {
  if (!room.snapshot) return null;
  const snapshot = JSON.parse(JSON.stringify(room.snapshot));
  snapshot.deck = [];
  const revealRound = snapshot.view === "round-over";
  if (!revealRound) snapshot.crib = Array.from({ length: snapshot.crib?.length || 0 }, () => ({ hidden: true }));
  snapshot.players = (snapshot.players || []).map((player, index) => ({
    ...player,
    hand: revealRound || index === seatIndex ? player.hand : [],
    scoringHand: revealRound || index === seatIndex ? player.scoringHand : [],
    handCount: player.hand?.length || 0,
    scoringHandCount: player.scoringHand?.length || 0,
  }));
  return snapshot;
}

function cribbageBroadcastRoom(room) {
  const connection = cribbageConnectionPayload(room);
  for (const [index, seat] of room.seats.entries()) {
    cribbageSend(seat.socket, connection);
    const snapshot = cribbageViewFor(room, index);
    if (snapshot) cribbageSend(seat.socket, { type: "cribbage-state", snapshot });
  }
  broadcastCribbageLobby();
}

function cribbageAllHumansConnected(room) {
  return room.seats.every((seat) => seat.control === "ai" || Boolean(seat.socket));
}

function cribbageFindSeat(room, token) {
  return room.seats.find((seat) => seat.sessionId && seat.sessionId === token);
}

function pruneCribbageRooms() {
  const now = Date.now();
  for (const [id, room] of cribbageRooms) {
    if (now - room.updatedAt > 30 * 60 * 1000) { cribbageRooms.delete(id); for (const seat of room.seats) if (seat.userId && cribbageUserMemberships.get(seat.userId) === id) cribbageUserMemberships.delete(seat.userId); }
  }
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "/", "http://localhost");
  if (url.pathname === "/snake") {
    snakeServer.handleUpgrade(request, socket, head, (ws) => {
      snakeServer.emit("connection", ws, request);
    });
    return;
  }
  if (url.pathname === "/pixel-wars") {
    pixelServer.handleUpgrade(request, socket, head, (ws) => {
      pixelServer.emit("connection", ws, request);
    });
    return;
  }
  if (url.pathname === "/cribbage") {
    cribbageServer.handleUpgrade(request, socket, head, (ws) => {
      cribbageServer.emit("connection", ws, request);
    });
    return;
  }
  if (url.pathname === "/boombox") {
    boomboxServer.handleUpgrade(request, socket, head, (ws) => {
      boomboxServer.emit("connection", ws, request);
    });
    return;
  }
  socket.destroy();
});

snakeServer.on("connection", (socket) => {
  const id = `snake-${nextSnakeId}`;
  nextSnakeId += 1;
  const player = {
    active: false,
    alive: false,
    bestLength: 3,
    color: snakeColorFromId(id),
    direction: "right",
    id,
    length: 3,
    nextDirection: "right",
    orbsCollected: 0,
    score: 0,
    segments: [],
    shotBank: 0,
    shootCooldown: 0,
    shotRecoilTicks: 0,
    socket,
  };
  snakePlayers.set(id, player);
  socket.send(JSON.stringify({ board: snakeBoard, id, type: "snake-welcome" }));
  socket.send(JSON.stringify(snakeSnapshot()));

  socket.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.type === "snake-start" || message.type === "snake-restart") {
      player.active = true;
      startSnakeRoom();
      respawnSnake(player);
      broadcastSnakeState();
      return;
    }

    if (message.type === "snake-direction" && typeof message.direction === "string" && snakeDirections[message.direction]) {
      player.nextDirection = message.direction;
      return;
    }

    if (message.type === "snake-shoot") {
      shootSnakeSegment(player);
      broadcastSnakeState();
    }
  });

  socket.on("close", () => {
    snakePlayers.delete(id);
    broadcastSnakeState();
    stopSnakeRoomIfIdle();
  });
});

cribbageServer.on("connection", (socket) => {
  let room = null;
  let seatIndex = -1;
  const memberships = new Set();
  cribbageSend(socket, cribbageLobbyPayload());
  socket.on("message", (data) => {
    let message;
    try { message = JSON.parse(data.toString()); } catch { return; }
    pruneCribbageRooms();
    if (message.type === "cribbage-list") { const userId = typeof message.userId === "string" ? message.userId.slice(0, 120) : ""; cribbageSend(socket, cribbageLobbyPayload(userId)); return; }
    if (message.type === "cribbage-create") {
      const userId = typeof message.userId === "string" ? message.userId.slice(0, 120) : "";
      if (!userId) { cribbageSend(socket, { type: "cribbage-error", message: "A player identity is required." }); return; }
      const existing = cribbageUserMemberships.get(userId);
      if (existing && cribbageRooms.has(existing)) { cribbageSend(socket, { type: "cribbage-error", message: "You already have an active game. Cancel it before creating another." }); return; }
      const config = message.config || {};
      const count = Math.min(4, Math.max(2, Number(config.playerCount) || 2));
      const sourceSeats = Array.isArray(config.seats) ? config.seats : [];
      room = { gameId: cribbageRoomId(), ownerUserId: userId, config: { variant: config.variant === "crazy" ? "crazy" : "standard", playerCount: count, format: config.format === "team" && count === 4 ? "team" : "individual" }, seats: Array.from({ length: count }, (_, index) => { const source = sourceSeats[index] || {}; return { name: String(source.name || `Player ${index + 1}`).slice(0, 18), control: source.control === "ai" ? "ai" : "human", team: Number(source.team) === 2 ? 2 : 1, sessionId: null, socket: null, userId: "", quit: false }; }), hostToken: cribbageToken(), snapshot: null, started: false, updatedAt: Date.now() };
      const hostSeat = room.seats.findIndex((seat) => seat.control === "human");
      if (hostSeat < 0) { cribbageSend(socket, { type: "cribbage-error", message: "At least one human seat is required." }); return; }
      room.seats[hostSeat].sessionId = room.hostToken; room.seats[hostSeat].socket = socket; room.seats[hostSeat].userId = userId; room.hostSeat = hostSeat; seatIndex = hostSeat; cribbageRooms.set(room.gameId, room); cribbageUserMemberships.set(userId, room.gameId); memberships.add(room);
      cribbageSend(socket, { type: "cribbage-created", gameId: room.gameId, sessionId: room.hostToken, seat: hostSeat, host: true, config: room.config });
      cribbageBroadcastRoom(room); if (cribbageAllHumansConnected(room)) { cribbageSend(room.seats[room.hostSeat].socket, { type: "cribbage-ready", gameId: room.gameId }); } return;
    }
    if (message.type === "cribbage-join") {
      const target = cribbageRooms.get(String(message.gameId || ""));
      if (!target) { cribbageSend(socket, { type: "cribbage-error", message: "Game not found." }); return; }
      const userId = typeof message.userId === "string" ? message.userId.slice(0, 120) : "";
      if (!userId) { cribbageSend(socket, { type: "cribbage-error", message: "A player identity is required." }); return; }
      const existing = cribbageUserMemberships.get(userId);
      if (existing && existing !== target.gameId && cribbageRooms.has(existing)) { cribbageSend(socket, { type: "cribbage-error", message: "You are already in another game. Cancel it before joining this one." }); return; }
      room = target; memberships.add(room);
      const token = typeof message.sessionId === "string" ? message.sessionId : "";
      const existingSeat = room.seats.findIndex((candidate) => candidate.userId === userId);
      if (existingSeat >= 0 && room.seats[existingSeat].sessionId !== token) { cribbageSend(socket, { type: "cribbage-error", message: "This player is already connected to that game." }); room = null; memberships.delete(target); return; }
      let index = cribbageFindSeat(room, token) ? room.seats.indexOf(cribbageFindSeat(room, token)) : -1;
      if (index < 0) index = room.seats.findIndex((seat) => seat.control === "human" && !seat.sessionId);
      if (index < 0) { cribbageSend(socket, { type: "cribbage-error", message: "No open human seat is available." }); room = null; return; }
      seatIndex = index; room.seats[index].sessionId = token || cribbageToken(); room.seats[index].socket = socket; room.seats[index].userId = userId; cribbageUserMemberships.set(userId, room.gameId); room.updatedAt = Date.now();
      cribbageSend(socket, { type: "cribbage-joined", gameId: room.gameId, sessionId: room.seats[index].sessionId, seat: index, host: index === room.hostSeat, config: room.config });
      cribbageBroadcastRoom(room); if (cribbageAllHumansConnected(room) && !room.started) { room.started = true; cribbageSend(room.seats[room.hostSeat].socket, { type: "cribbage-ready", gameId: room.gameId }); cribbageBroadcastRoom(room); } return;
    }
    if (!room || seatIndex < 0) return;
    const seat = room.seats[seatIndex]; room.updatedAt = Date.now();
    if (message.type === "cribbage-state" && seatIndex === room.hostSeat && message.snapshot) { room.snapshot = message.snapshot; room.started = true; cribbageBroadcastRoom(room); return; }
    if (message.type === "cribbage-action" && seatIndex !== room.hostSeat) { cribbageSend(room.seats[room.hostSeat].socket, { type: "cribbage-remote-action", seat: seatIndex, action: message.action || {} }); return; }
    if (message.type === "cribbage-rematch-ai-prompt" && seatIndex === room.hostSeat) { for (const [index, candidate] of room.seats.entries()) if (index === Number(message.targetSeat) && candidate.socket) cribbageSend(candidate.socket, { type: "cribbage-rematch-ai-prompt", declinedSeats: message.declinedSeats || [] }); return; }
    if (message.type === "cribbage-rematch-ended" && seatIndex === room.hostSeat) { for (const candidate of room.seats) if (candidate.socket && candidate.socket !== socket) cribbageSend(candidate.socket, { type: "cribbage-rematch-ended", message: message.message || "Rematch ended." }); return; }
    if (message.type === "cribbage-cancel") {
      const target = cribbageRooms.get(String(message.gameId || room?.gameId || ""));
      if (!target || target.seats[target.hostSeat]?.socket !== socket) return;
      for (const candidate of target.seats) if (candidate.socket && candidate.socket !== socket) candidate.socket.close(1000, "Game cancelled");
      cribbageRooms.delete(target.gameId); for (const candidate of target.seats) if (candidate.userId && cribbageUserMemberships.get(candidate.userId) === target.gameId) cribbageUserMemberships.delete(candidate.userId); memberships.delete(target); cribbageSend(socket, { type: "cribbage-cancelled", gameId: target.gameId }); broadcastCribbageLobby(); if (room === target) { room = null; seatIndex = -1; } return;
    }
    if (message.type === "cribbage-quit") {
      const wasHost = seatIndex === room.hostSeat;
      if (seat.userId && cribbageUserMemberships.get(seat.userId) === room.gameId) cribbageUserMemberships.delete(seat.userId);
      seat.control = "ai"; seat.quit = true; seat.socket = null;
      if (wasHost) {
        const successor = room.seats.findIndex((candidate, index) => index !== seatIndex && candidate.socket && candidate.control === "human");
        if (successor >= 0) { room.hostSeat = successor; cribbageSend(room.seats[successor].socket, { type: "cribbage-host-transfer", seat: successor, snapshot: room.snapshot }); }
        else { cribbageRooms.delete(room.gameId); broadcastCribbageLobby(); room = null; seatIndex = -1; return; }
      } else { cribbageSend(room.seats[room.hostSeat].socket, { type: "cribbage-player-quit", seat: seatIndex }); if (!room.seats.some((candidate) => candidate.control === "human" && candidate.socket)) { cribbageRooms.delete(room.gameId); broadcastCribbageLobby(); room = null; seatIndex = -1; return; } }
      cribbageBroadcastRoom(room); return;
    }
  });
  socket.on("close", () => {
    for (const member of memberships) { for (const seat of member.seats) if (seat.socket === socket) seat.socket = null; member.updatedAt = Date.now(); cribbageBroadcastRoom(member); }
  });
});

boomboxServer.on("connection", (socket) => {
  let room = null; let seatIndex = -1; let userId = ""; let sessionId = ""; let spectator = false;
  boomBoxSend(socket, boomBoxLobbyPayload());
  socket.on("message", (data) => {
    let message; try { message = JSON.parse(data.toString()); } catch { return; }
    pruneBoomBoxRooms();
    userId = typeof message.userId === "string" ? message.userId.slice(0, 120) : userId; socket.boomboxUserId = userId;
    if (message.type === "boombox-list") { boomBoxSend(socket, boomBoxLobbyPayload(userId)); return; }
    if (message.type === "boombox-invite") { const target = boomboxRooms.get(String(message.gameId || "")); if (!target) { boomBoxSend(socket, { type: "boombox-error", message: "Invite room not found." }); return; } if (!target.inviteToken || message.inviteToken !== target.inviteToken) { boomBoxSend(socket, { type: "boombox-error", message: "That invite link is invalid or expired." }); return; } message.type = target.started ? "boombox-watch" : "boombox-join"; }
    if (message.type === "boombox-watch") { const target = boomboxRooms.get(String(message.gameId || "")); if (!target || !target.started) { boomBoxSend(socket, { type: "boombox-error", message: "That room is not ready to watch." }); return; } room = target; spectator = true; target.spectators.add(socket); boomBoxSend(socket, { type: "boombox-watching", gameId: target.gameId }); boomBoxSend(socket, { type: "boombox-state", snapshot: boomBoxSnapshot(target), seat: -1, spectator: true }); broadcastBoomBoxLobby(); return; }
    if (message.type === "boombox-create") {
      if (!userId) { boomBoxSend(socket, { type: "boombox-error", message: "A commander identity is required." }); return; }
      if (boomboxUserMemberships.has(userId)) { boomBoxSend(socket, { type: "boombox-error", message: "You already have an active Boom Box room." }); return; }
      const config = message.config || {}; const rules = boomBoxRulesFromConfig(config); const count = rules.seats; const gameId = boomBoxRoomId();
      room = { gameId, inviteToken: `${gameId}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`, ownerUserId: userId, name: String(config.name || "Unnamed room").slice(0, 28), creator: String(config.creator || "Commander").slice(0, 18), seats: Array.from({ length: count }, (_, index) => ({ name: index === 0 ? String(config.creator || "Commander").slice(0, 18) : `Commander ${index + 1}`, userId: index === 0 ? userId : "", sessionId: index === 0 ? `${gameId}-${Math.random().toString(36).slice(2)}` : "", socket: index === 0 ? socket : null, connected: index === 0, bot: false, })), spectators: new Set(), mutedUserIds: new Set(), chatLastAt: new Map(), processedActionIds: new Set(), terrain: String(config.terrain || "sunset-range"), pace: rules.turnPace, rules, aiFill: Boolean(config.aiFill), started: false, phase: "setup", resolving: false, state: null, seed: Math.max(1, Math.min(999999, Number(config.seed) || 314159)), updatedAt: Date.now() };
      seatIndex = 0; sessionId = room.seats[0].sessionId; boomboxRooms.set(gameId, room); boomboxUserMemberships.set(userId, gameId); boomBoxSend(socket, { type: "boombox-created", gameId, inviteToken: room.inviteToken, sessionId, seat: 0, host: true }); boomBoxSend(socket, boomBoxLoadoutPayload(room, 0)); boomBoxSend(socket, boomBoxLobbyPayload(userId)); return;
    }
    if (message.type === "boombox-join") {
      const target = boomboxRooms.get(String(message.gameId || "")); if (!target) { boomBoxSend(socket, { type: "boombox-error", message: "Room not found." }); return; }
      if (!userId) { boomBoxSend(socket, { type: "boombox-error", message: "A commander identity is required." }); return; }
      if (boomboxUserMemberships.has(userId) && boomboxUserMemberships.get(userId) !== target.gameId) { boomBoxSend(socket, { type: "boombox-error", message: "You already have an active Boom Box room." }); return; }
      const requestedSession = typeof message.sessionId === "string" ? message.sessionId : ""; let index = target.seats.findIndex((seat) => requestedSession && seat.sessionId === requestedSession);
      if (target.started && index < 0) { boomBoxSend(socket, { type: "boombox-error", message: "That match has already started." }); return; }
      if (index < 0) index = target.seats.findIndex((seat) => !seat.connected && !seat.userId);
      if (index < 0) { boomBoxSend(socket, { type: "boombox-error", message: "No open commander seat is available." }); return; }
      room = target; seatIndex = index; const previousUserId = room.seats[index].userId; if (previousUserId && previousUserId !== userId) boomboxUserMemberships.delete(previousUserId); sessionId = room.seats[index].sessionId || `${room.gameId}-${Math.random().toString(36).slice(2)}`; room.seats[index] = { ...room.seats[index], name: String(message.name || room.seats[index].name).slice(0, 18), userId, sessionId, socket, connected: true }; boomboxUserMemberships.set(userId, room.gameId); room.updatedAt = Date.now(); boomBoxSend(socket, { type: "boombox-joined", gameId: room.gameId, sessionId, seat: index, host: index === room.seats.findIndex((seat) => seat.userId === room.ownerUserId) }); if (room.started) { boomBoxSend(socket, { type: "boombox-state", snapshot: boomBoxSnapshot(room), seat: index }); } else if (room.seats.every((seat) => seat.connected)) startBoomBoxRoom(room); else { boomBoxSend(socket, boomBoxLoadoutPayload(room, index)); boomBoxSend(socket, boomBoxLobbyPayload(userId)); broadcastBoomBoxLobby(); } return;
    }
    if (message.type === "boombox-start-ai") { const target = boomboxRooms.get(String(message.gameId || room?.gameId || "")); if (!target || target.ownerUserId !== userId || target.started || !target.aiFill) return; room = target; seatIndex = target.seats.findIndex((seat) => seat.userId === userId); fillBoomBoxAi(target); return; }
    if (message.type === "boombox-purchase") { const target = room || boomboxRooms.get(String(message.gameId || "")); const purchaseId = typeof message.purchaseId === "string" ? message.purchaseId.slice(0, 120) : ""; if (!target || spectator || seatIndex < 0 || !purchaseId) { boomBoxSend(socket, { type: "boombox-purchase-error", message: "A valid active room and purchase ID are required." }); return; } if (target.processedActionIds.has(`purchase:${purchaseId}`)) { boomBoxSend(socket, { type: "boombox-purchase-error", message: "That purchase was already processed." }); return; } if (!target.state) { boomBoxSend(socket, { type: "boombox-purchase-error", message: "The loadout is not ready yet." }); return; } const purchase = boomBoxPurchase(target, seatIndex, message.category === "utility" ? "utility" : "weapon", String(message.item || ""), message.quantity); if (purchase?.error) boomBoxSend(socket, { type: "boombox-purchase-error", message: purchase.error }); else { target.processedActionIds.add(`purchase:${purchaseId}`); boomBoxSend(socket, { type: "boombox-purchase-result", loadout: purchase.loadout, entry: purchase.entry }); broadcastBoomBoxRoom(target); } return; }
    if (message.type === "boombox-watch-leave") { if (room?.spectators) room.spectators.delete(socket); room = null; spectator = false; broadcastBoomBoxLobby(); return; }
    if (message.type === "boombox-cancel") { const target = boomboxRooms.get(String(message.gameId || room?.gameId || "")); if (!target || target.ownerUserId !== userId) return; if (target.aiTimer) clearTimeout(target.aiTimer); for (const seat of target.seats) if (seat.socket && seat.socket !== socket) seat.socket.close(1000, "Room cancelled"); for (const watcher of target.spectators || []) if (watcher !== socket) watcher.close(1000, "Room cancelled"); boomboxRooms.delete(target.gameId); for (const seat of target.seats) if (seat.userId) boomboxUserMemberships.delete(seat.userId); boomBoxSend(socket, { type: "boombox-cancelled", gameId: target.gameId }); broadcastBoomBoxLobby(); room = null; seatIndex = -1; return; }
    if (message.type === "boombox-moderate") { const target = room || boomboxRooms.get(String(message.gameId || "")); const ownerSeat = target?.seats.findIndex((seat) => seat.userId === target.ownerUserId); if (!target || spectator || seatIndex !== ownerSeat) return; const targetUserId = typeof message.targetUserId === "string" ? message.targetUserId.slice(0, 120) : ""; if (!targetUserId || targetUserId === target.ownerUserId) return; const action = message.action === "unmute" ? "unmute" : "mute"; if (action === "mute") target.mutedUserIds.add(targetUserId); else target.mutedUserIds.delete(targetUserId); const payload = { type: "boombox-chat", message: { sender: "System", text: `${targetUserId} was ${action}d by the room host.`, at: Date.now(), system: true } }; for (const seat of target.seats) if (seat.socket) boomBoxSend(seat.socket, payload); for (const watcher of target.spectators || []) boomBoxSend(watcher, payload); return; }
    if (message.type === "boombox-chat") { const target = room || boomboxRooms.get(String(message.gameId || "")); const text = typeof message.text === "string" ? message.text.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) : ""; const senderUserId = spectator ? String(socket.boomboxUserId || userId || "") : target?.seats[seatIndex]?.userId || ""; if (!target || !text || !senderUserId || target.mutedUserIds.has(senderUserId)) return; const now = Date.now(); const previous = target.chatLastAt.get(senderUserId) || 0; if (now - previous < 650) { boomBoxSend(socket, { type: "boombox-error", message: "Please wait a moment before sending another message." }); return; } target.chatLastAt.set(senderUserId, now); const sender = spectator ? "Spectator" : target.seats[seatIndex]?.name || "Commander"; const payload = { type: "boombox-chat", message: { sender, senderUserId, text, at: now } }; for (const seat of target.seats) if (seat.socket) boomBoxSend(seat.socket, payload); for (const watcher of target.spectators || []) boomBoxSend(watcher, payload); return; }
    if (!room || spectator || seatIndex < 0) return;
    if (message.type === "boombox-action") { const actionId = typeof message.actionId === "string" ? message.actionId.slice(0, 120) : ""; if (!actionId) { boomBoxSend(socket, { type: "boombox-error", message: "An action ID is required." }); return; } if (room.processedActionIds.has(actionId)) { boomBoxSend(socket, { type: "boombox-error", message: "That action was already processed." }); return; } const result = resolveBoomBoxAction(room, seatIndex, message.action || {}, actionId); if (result?.error) boomBoxSend(socket, { type: "boombox-error", message: result.error }); else { room.processedActionIds.add(actionId); if (room.processedActionIds.size > 500) room.processedActionIds.delete(room.processedActionIds.values().next().value); if (result?.flight) { for (const seat of room.seats) if (seat.socket) boomBoxSend(seat.socket, { type: "boombox-flight", flight: result.flight }); for (const spectator of room.spectators || []) boomBoxSend(spectator, { type: "boombox-flight", flight: result.flight }); setTimeout(() => { if (boomboxRooms.has(room.gameId)) { room.resolving = false; if (room.phase !== "finished") room.phase = "turn-prep"; broadcastBoomBoxRoom(room); scheduleBoomBoxAi(room); } }, 450); } else { broadcastBoomBoxRoom(room); scheduleBoomBoxAi(room); } } return; }
    if (message.type === "boombox-leave") { if (room.seats[seatIndex]) { room.seats[seatIndex].connected = false; room.seats[seatIndex].socket = null; } room.updatedAt = Date.now(); broadcastBoomBoxLobby(); return; }
  });
  socket.on("close", () => { if (!room) return; if (spectator) { room.spectators.delete(socket); broadcastBoomBoxLobby(); return; } if (seatIndex < 0) return; const seat = room.seats[seatIndex]; if (seat.socket === socket) { seat.socket = null; seat.connected = false; room.updatedAt = Date.now(); broadcastBoomBoxLobby(); } });
});

pixelServer.on("connection", (socket) => {
  let lobby = null;
  let match = null;
  let turret = null;

  socket.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (!turret) {
      if (message.type !== "pixel-join" || typeof message.lobbyId !== "string") {
        socket.close(1008, "Join required");
        return;
      }

      prunePixelLobbies();
      lobby = pixelLobbies.get(message.lobbyId);
      if (!lobby) {
        socket.close(1008, "Lobby not found");
        return;
      }
      if (!lobby.match) {
        lobby.match = createPixelMatch(lobby);
      }
      match = lobby.match;
      turret = match.turrets.find((candidate) => !candidate.isBot && candidate.primary && !candidate.socket);
      if (!turret) {
        socket.close(1008, "Lobby full");
        return;
      }
      turret.socket = socket;
      lobby.playerCount = activePixelSocketCount(match);
      lobby.updatedAt = Date.now();
      socket.send(JSON.stringify({ board: pixelBoard, id: turret.id, lobby: publicPixelLobby(lobby), type: "pixel-wars-welcome" }));
      socket.send(JSON.stringify(pixelMatchSnapshot(match)));
      startPixelMatch(match);
      broadcastPixelMatch(match);
      return;
    }

    if (message.type === "pixel-aim" && Number.isFinite(message.angle)) {
      const targetX = Number(message.targetXRatio) * pixelBoard.columns;
      const targetY = Number(message.targetYRatio) * pixelBoard.rows;
      const ownedTurrets = pixelOwnerTurrets(match, turret.id).filter((ownedTurret) => !ownedTurret.isBot);
      const targetIndex = Math.max(0, Math.min(ownedTurrets.length - 1, Math.round(Number(message.turretIndex) || 0)));
      const targetTurret = ownedTurrets[targetIndex];
      if (targetTurret && pixelTurretIsActive(targetTurret)) {
        const angle =
          Number.isFinite(targetX) && Number.isFinite(targetY)
            ? Math.atan2(targetY - targetTurret.y, targetX - targetTurret.x)
            : Number(message.angle);
        targetTurret.angle = clampPixelAngle(targetTurret, angle);
      }
      return;
    }

    if (message.type === "pixel-rotation" && typeof message.autoRotate === "boolean") {
      const ownedTurrets = pixelOwnerTurrets(match, turret.id).filter((ownedTurret) => !ownedTurret.isBot);
      const target = ownedTurrets[Math.max(0, Math.min(ownedTurrets.length - 1, Math.round(Number(message.turretIndex) || 0)))];
      if (target) target.autoRotate = message.autoRotate;
      broadcastPixelMatch(match);
      return;
    }

    if (message.type === "pixel-respawn") {
      const pendingTurret = match.turrets.find(
        (candidate) => candidate.id === turret.id && candidate.respawnPending && !candidate.eliminated,
      );
      if (pendingTurret) {
        queuePixelRespawn(match, pendingTurret, message.xRatio, message.yRatio);
      }
      broadcastPixelMatch(match);
      return;
    }

    if (message.type === "pixel-prize") {
      if (message.prize === "clock") {
        const ownerTurrets = match.turrets.filter((ownedTurret) => ownedTurret.id === turret.id);
        const nextBoost = Math.max(0, ...ownerTurrets.map((ownedTurret) => ownedTurret.fireSpeedBoosts)) + 1;
        ownerTurrets.forEach((ownedTurret) => {
          ownedTurret.fireSpeedBoosts = nextBoost;
        });
      } else if (message.prize === "bomb") {
        pixelOwnerTurrets(match, turret.id).forEach((ownedTurret) => {
          ownedTurret.bombShots += pixelBombShotAward;
        });
      } else if (message.prize === "bounce") {
        pixelOwnerTurrets(match, turret.id).forEach((ownedTurret) => {
          ownedTurret.bouncePower += 2;
        });
      } else if (message.prize === "turret") {
        addPixelOwnerTurret(match, turret.id);
      }
      broadcastPixelMatch(match);
    }
  });

  socket.on("close", () => {
    if (turret?.socket === socket) {
      turret.socket = null;
    }
    if (lobby && match) {
      lobby.playerCount = activePixelSocketCount(match);
      lobby.updatedAt = Date.now();
      stopPixelMatchIfIdle(lobby);
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Bad Ant Games listening on ${port}`);
});
