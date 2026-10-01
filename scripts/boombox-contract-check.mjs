import { readFileSync } from "node:fs";
import { BOOM_BOX_RULES_VERSION, BOOM_BOX_UTILITY_CATALOG, BOOM_BOX_WEAPON_CATALOG, boomBoxRulesFromConfig, boomBoxTerrain } from "../boombox-rules.mjs";

for (const profile of ["sunset-range", "ice-shelf", "lunar-crater"]) for (const seed of [1, 314159, 999999]) {
  const shared = boomBoxTerrain(seed, profile);
  if (!shared.length || shared.length !== 960) throw new Error(`Shared terrain fixture is invalid for ${profile}/${seed}`);
}
const clientSource = readFileSync(new URL("../src/boom-box.ts", import.meta.url), "utf8");
if (!clientSource.includes('from "../boombox-rules.mjs"') || !clientSource.includes("return boomBoxTerrain(seed, profile);")) throw new Error("Solo client is not using the shared terrain contract");
const options = boomBoxRulesFromConfig({ seats: 10, roundCount: 7, interestRate: 17, timerEnabled: false, firingMode: "simultaneous", windMode: "fixed", boundaries: ["bounce", "wrap"], boundaryMode: "rotate" });
if (options.seats !== 10 || options.roundCount !== 7 || options.interestRate !== 17 || options.timerEnabled !== false || options.firingMode !== "simultaneous" || options.windMode !== "fixed" || options.boundaryMode !== "rotate" || options.boundaries.join(",") !== "bounce,wrap") throw new Error("Round, interest, timer, wind, play-type, or rotating-wall rules were not preserved by the shared contract");
console.log(`Boom Box shared contract check passed: version ${BOOM_BOX_RULES_VERSION}, ${Object.keys(BOOM_BOX_WEAPON_CATALOG).length} weapons, ${Object.keys(BOOM_BOX_UTILITY_CATALOG).length} utilities, match options, and seeded solo/server terrain parity.`);
