import { applyCrater, impactDamage, makeTerrain, terrainChecksum } from "../src/boom-box.ts";

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

console.log("Boom Box deterministic simulation checks passed: seeded terrain, crater mutation, collision damage.");
