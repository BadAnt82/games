import { readFileSync } from "node:fs";
import { BOOM_BOX_RULES_VERSION, BOOM_BOX_UTILITY_CATALOG, BOOM_BOX_WEAPON_CATALOG, boomBoxTerrain } from "../boombox-rules.mjs";

for (const profile of ["sunset-range", "ice-shelf", "lunar-crater"]) for (const seed of [1, 314159, 999999]) {
  const shared = boomBoxTerrain(seed, profile);
  if (!shared.length || shared.length !== 960) throw new Error(`Shared terrain fixture is invalid for ${profile}/${seed}`);
}
const clientSource = readFileSync(new URL("../src/boom-box.ts", import.meta.url), "utf8");
if (!clientSource.includes('from "../boombox-rules.mjs"') || !clientSource.includes("return boomBoxTerrain(seed, profile);")) throw new Error("Solo client is not using the shared terrain contract");
console.log(`Boom Box shared contract check passed: version ${BOOM_BOX_RULES_VERSION}, ${Object.keys(BOOM_BOX_WEAPON_CATALOG).length} weapons, ${Object.keys(BOOM_BOX_UTILITY_CATALOG).length} utilities, and seeded solo/server terrain parity.`);
