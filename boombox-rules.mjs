// Shared Boom Box rules contract. The browser and authoritative server import
// this module so catalogue ids, effects, inventory limits, and seeded terrain
// cannot drift between execution paths.
export const BOOM_BOX_RULES_VERSION = 3;
export const BOOM_BOX_CANVAS = { width: 960, height: 540 };

export const BOOM_BOX_WEAPON_CATALOG = {
  cannon: { label: "Cannon", cost: 0, inventory: 99, starter: 99, damage: 70, directDamage: 70, splashDamage: 48, radius: 58, depth: 24, mode: "single", speed: 1, description: "Reliable free shell." },
  "heavy-cannon": { label: "Heavy cannon", cost: 45, inventory: 2, damage: 82, directDamage: 82, splashDamage: 56, radius: 72, depth: 36, mode: "single", speed: .86, description: "Harder impact with a slower arc." },
  "heavy-shell": { label: "Heavy shell", cost: 30, inventory: 2, damage: 78, directDamage: 78, splashDamage: 60, radius: 84, depth: 40, mode: "single", speed: .9, description: "Wide blast and deep crater." },
  "precision-round": { label: "Precision round", cost: 20, inventory: 3, damage: 92, directDamage: 92, splashDamage: 34, radius: 34, depth: 12, mode: "single", speed: 1.18, description: "Fast, accurate, small blast." },
  "split-shell": { label: "Split shell", cost: 25, inventory: 3, damage: 54, directDamage: 54, splashDamage: 28, radius: 42, depth: 24, mode: "spread", count: 2, spread: 7, speed: 1, description: "Splits into two nearby impacts." },
  "mini-nuke": { label: "Mini nuke", cost: 70, inventory: 1, damage: 100, directDamage: 100, splashDamage: 82, radius: 150, depth: 68, mode: "area", speed: .72, description: "Huge crater and area damage." },
  mirv: { label: "MIRV", cost: 65, inventory: 1, damage: 54, directDamage: 54, splashDamage: 34, radius: 54, depth: 28, mode: "spread", count: 3, spread: 10, speed: .94, description: "Three separated warheads." },
  "triple-shot": { label: "Triple shot", cost: 50, inventory: 2, damage: 44, directDamage: 44, splashDamage: 26, radius: 38, depth: 18, mode: "spread", count: 3, spread: 14, speed: 1, description: "Three spread shells." },
  "bouncing-bomb": { label: "Bouncing bomb", cost: 40, inventory: 2, damage: 64, directDamage: 64, splashDamage: 42, radius: 52, depth: 30, mode: "bounce", bounces: 5, speed: .94, description: "Bounces off walls and terrain." },
  "riot-bomb": { label: "Riot bomb", cost: 35, inventory: 2, damage: 58, directDamage: 58, splashDamage: 58, radius: 68, depth: 34, mode: "impact", speed: 1, description: "Strong close-range impact." },
  "piercing-round": { label: "Piercing round", cost: 40, inventory: 2, damage: 78, directDamage: 78, splashDamage: 24, radius: 36, depth: 20, mode: "piercing", ignoreTerrain: true, speed: .92, description: "Cuts through terrain." },
  napalm: { label: "Napalm", cost: 55, inventory: 2, damage: 40, directDamage: 40, splashDamage: 32, radius: 62, depth: 16, mode: "napalm", burningTurns: 2, speed: .9, description: "Leaves a burning target effect." },
  "smoke-shell": { label: "Smoke shell", cost: 20, inventory: 2, damage: 0, directDamage: 0, splashDamage: 0, radius: 80, depth: 0, mode: "smoke", material: "smoke", smokeTurns: 3, smokeDamageMultiplier: .7, speed: 1, economy: "Low-cost cover; best before a risky shot.", description: "Creates a smoke-covered impact zone that reduces incoming damage." },
  "liquid-dirt": { label: "Liquid dirt", cost: 25, inventory: 2, damage: 0, directDamage: 0, splashDamage: 0, radius: 74, depth: -32, mode: "filler", material: "liquid-dirt", speed: .9, description: "Adds raised terrain for cover." },
  "terrain-tool": { label: "Terrain tool", cost: 15, inventory: 2, damage: 0, directDamage: 0, splashDamage: 0, radius: 120, depth: -26, mode: "filler", material: "reinforced", reinforcedDamageMultiplier: .75, speed: .9, economy: "Cheap cover that trades damage for position.", description: "Raises reinforced terrain that absorbs part of blast damage." },
  "terrain-remover": { label: "Terrain remover", cost: 20, inventory: 2, damage: 0, directDamage: 0, splashDamage: 0, radius: 88, depth: 56, mode: "remover", material: "excavated", speed: .9, description: "Digs a broad trench." },
  "tracer-round": { label: "Tracer round", cost: 28, inventory: 2, damage: 62, directDamage: 62, splashDamage: 26, radius: 30, depth: 18, mode: "guided", guided: true, speed: 1.1, description: "Guides toward the marked target." },
  "laser-line": { label: "Laser line", cost: 60, inventory: 1, damage: 74, directDamage: 74, splashDamage: 0, radius: 8, depth: 0, mode: "laser", ignoreTerrain: true, speed: 1.4, description: "Instant line attack." },
  "area-charge": { label: "Area charge", cost: 40, inventory: 1, damage: 68, directDamage: 68, splashDamage: 64, radius: 110, depth: 48, mode: "area", speed: .8, description: "Large blast radius." },
};

export const BOOM_BOX_UTILITY_CATALOG = {
  "repair-kit": { label: "Repair kit", cost: 20, inventory: 2, starter: 1, effect: "repair", amount: 30, economy: "Reliable recovery after a direct hit.", description: "Restore 30 health." },
  shield: { label: "Light shield", cost: 25, inventory: 2, starter: 1, effect: "shield", amount: 35, description: "Absorb 35 damage." },
  "heavy-shield": { label: "Heavy shield", cost: 45, inventory: 1, effect: "shield", amount: 70, description: "Absorb 70 damage." },
  "shield-recharge": { label: "Shield recharge", cost: 30, inventory: 2, effect: "shield-recharge", amount: 25, description: "Restore 25 shield." },
  "terrain-lift": { label: "Terrain lift", cost: 15, inventory: 2, starter: 1, effect: "terrain-lift", description: "Raise reinforced cover." },
  parachute: { label: "Parachute", cost: 15, inventory: 2, starter: 1, effect: "parachute", description: "Protect the next terrain fall." },
  "fuel-canister": { label: "Fuel canister", cost: 15, inventory: 2, effect: "fuel", amount: 50, economy: "Keeps movement available in long matches.", description: "Restore 50 movement fuel." },
  "guidance-kit": { label: "Guidance kit", cost: 30, inventory: 1, effect: "guidance", description: "Adds steering to later shots." },
};

export function boomBoxTerrain(seed, profile = "sunset-range") {
  let value = seed >>> 0;
  const random = () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
  const baseline = profile === "ice-shelf" ? 342 : profile === "lunar-crater" ? 378 : 365;
  const roughness = profile === "ice-shelf" ? 16 : profile === "lunar-crater" ? 34 : 24;
  const terrain = Array.from({ length: BOOM_BOX_CANVAS.width }, (_, x) => Math.max(245, Math.min(450, baseline + Math.sin(x / 82) * 28 + Math.sin(x / 31 + 1.4) * 12 + (random() - .5) * roughness)));
  for (let pass = 0; pass < 3; pass += 1) for (let x = 1; x < terrain.length - 1; x += 1) terrain[x] = (terrain[x - 1] + terrain[x] + terrain[x + 1]) / 3;
  return terrain;
}

export function boomBoxRulesFromConfig(config = {}) {
  const firingModes = new Set(["sequential", "synchronous", "simultaneous"]);
  const boundaries = new Set(["stop", "bounce", "wrap"]);
  const pace = ["relaxed", "standard", "blitz"].includes(String(config.pace)) ? String(config.pace) : "standard";
  const aiDifficulty = ["recruit", "veteran", "ace", "expert"].includes(String(config.aiDifficulty)) ? String(config.aiDifficulty) : "veteran";
  return {
    version: BOOM_BOX_RULES_VERSION,
    seats: Math.max(2, Math.min(10, Number(config.seats) || 2)),
    firingMode: firingModes.has(String(config.firingMode)) ? String(config.firingMode) : "sequential",
    movement: Boolean(config.movement) && String(config.firingMode || "sequential") === "sequential",
    gravity: Math.max(60, Math.min(260, Number(config.gravity) || 150)),
    windMode: config.windMode === "fixed" ? "fixed" : "variable",
    windLimit: Math.max(0, Math.min(2, Number(config.windLimit) || 1.2)),
    boundary: boundaries.has(String(config.boundary)) ? String(config.boundary) : "stop",
    startingMoney: Math.max(0, Math.min(10000, Number(config.startingMoney) || 100)),
    turnPace: pace,
    aiDifficulty,
    events: { meteorShower: Boolean(config.events?.meteorShower), scenery: Boolean(config.events?.scenery) },
    weaponCatalog: Object.fromEntries(Object.entries(BOOM_BOX_WEAPON_CATALOG).filter(([id]) => !Array.isArray(config.disabledWeapons) || !config.disabledWeapons.includes(id))),
    utilityCatalog: Object.fromEntries(Object.entries(BOOM_BOX_UTILITY_CATALOG).filter(([id]) => !Array.isArray(config.disabledUtilities) || !config.disabledUtilities.includes(id))),
  };
}

export function boomBoxInitialInventory(catalog) { return Object.fromEntries(Object.entries(catalog).map(([id, item]) => [id, Math.max(0, Number(item.starter) || 0)])); }
export function boomBoxInitialCapacity(catalog) { return Object.fromEntries(Object.entries(catalog).map(([id, item]) => [id, Math.max(0, Number(item.inventory) || 0)])); }

export function createBoomBoxRulesContract(config = {}) {
  const rules = boomBoxRulesFromConfig(config);
  return { version: BOOM_BOX_RULES_VERSION, catalogues: { weapons: rules.weaponCatalog, utilities: rules.utilityCatalog }, rules };
}
