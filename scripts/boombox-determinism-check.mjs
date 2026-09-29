import { actionLogChecksum, applyCrater, impactDamage, makeTerrain, terrainChecksum } from "../src/boom-box.ts";

const first = makeTerrain(314159, "sunset-range");
const second = makeTerrain(314159, "sunset-range");
if (terrainChecksum(first) !== terrainChecksum(second)) throw new Error("same seed produced different terrain");
if (terrainChecksum(first) !== 172341345) throw new Error(`unexpected seeded terrain checksum: ${terrainChecksum(first)}`);
if (terrainChecksum(first) === terrainChecksum(makeTerrain(314160, "sunset-range"))) throw new Error("different seeds produced identical terrain");

const before = terrainChecksum(first);
applyCrater(first, 786, 78, 34);
if (terrainChecksum(first) === before) throw new Error("crater did not mutate terrain");
if (impactDamage(0, true, 78) !== 72) throw new Error("direct impact damage changed");
if (impactDamage(76, false, 58) !== 12) throw new Error("edge blast damage changed");

const actionLog = [
  { sequence: 1, kind: "match-start", payload: JSON.stringify({ seed: 314159, opponents: 3 }) },
  { sequence: 2, kind: "fire", payload: JSON.stringify({ owner: "player", weapon: "heavy-shell", target: 1 }) },
  { sequence: 3, kind: "impact", payload: JSON.stringify({ owner: "player", center: 748, radius: 104 }) },
  { sequence: 4, kind: "match-end", payload: JSON.stringify({ result: "win" }) },
];
const logHash = actionLogChecksum(actionLog);
if (logHash !== actionLogChecksum([...actionLog])) throw new Error("action log checksum is not deterministic");
if (logHash === actionLogChecksum([actionLog[0], actionLog[2], actionLog[1], actionLog[3]])) throw new Error("action log ordering is not represented");

console.log("Boom Box deterministic simulation checks passed: seeded terrain, crater mutation, collision damage, and action-log ordering.");
