import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = 4361;
const storeDir = mkdtempSync(join(tmpdir(), "games-admin-check-"));
const adminPath = join(storeDir, "admin.json");
const configPath = join(storeDir, "admin-config.json");
const server = spawn(process.execPath, ["server.mjs"], { env: { ...process.env, PORT: String(port), GAMES_ADMIN_STORE_PATH: adminPath, GAMES_ADMIN_CONFIG_STORE_PATH: configPath }, stdio: ["ignore", "pipe", "pipe"] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const request = async (path, options = {}) => {
  const response = await fetch(`http://localhost:${port}${path}`, options);
  const body = await response.json();
  return { response, body };
};
const cookieFrom = (response) => response.headers.get("set-cookie")?.split(";")[0] || "";

try {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { await fetch(`http://localhost:${port}/api/admin/status`); break; } catch { await wait(100); }
  }
  let result = await request("/api/admin/status");
  if (result.body.configured || result.body.authenticated) throw new Error(`Fresh admin store was not empty: ${JSON.stringify(result.body)}`);
  result = await request("/api/admin/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ant1982@gmail.com", password: "weak" }) });
  if (result.response.status !== 400 || result.body.code !== "weak_password") throw new Error("Weak admin password was accepted.");
  result = await request("/api/admin/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "wrong@example.com", password: "Strong1!" }) });
  if (result.response.status !== 400 || result.body.code !== "invalid_email") throw new Error("Unexpected bootstrap email was accepted.");
  result = await request("/api/admin/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ant1982@gmail.com", password: "Strong1!" }) });
  const cookie = cookieFrom(result.response);
  if (result.response.status !== 201 || !cookie || !result.body.authenticated) throw new Error(`Valid bootstrap failed: ${JSON.stringify(result.body)}`);
  result = await request("/api/admin/session", { headers: { Cookie: cookie } });
  if (!result.body.authenticated || result.body.email !== "ant1982@gmail.com") throw new Error("Admin session was not established.");
  result = await request("/api/admin/config", { headers: { Cookie: cookie } });
  if (result.response.status !== 200 || result.body.config?.economy?.startingCredits !== 100 || result.body.defaults?.economy?.startingCredits !== 100 || Object.keys(result.body.custom || {}).length || !result.body.config?.weapons?.cannon || !result.body.catalogs?.utilities?.["guidance-kit"]) throw new Error("Admin configuration defaults or split model were not returned.");
  for (const [id, weapon] of Object.entries(result.body.defaults.weapons)) if (weapon.count !== undefined && weapon.count < 1) throw new Error(`Unsafe default projectile count for ${id}.`);
  for (const [id, utility] of Object.entries(result.body.defaults.utilities)) {
    if (utility.purchaseAmount < 1 || utility.inventory < utility.purchaseAmount) throw new Error(`Unsafe default utility capacity for ${id}.`);
    if (utility.amount !== undefined && utility.amount <= 0) throw new Error(`Non-positive default utility effect for ${id}.`);
  }
  const savedDefaults = result.body.defaults;
  result = await request("/api/admin/config", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ defaults: savedDefaults, custom: { economy: { startingCredits: 275 }, weapons: { cannon: { cost: 42 } } } }) });
  if (result.response.status !== 200 || result.body.config.economy.startingCredits !== 275 || result.body.defaults.economy.startingCredits !== 100 || result.body.custom.economy.startingCredits !== 275 || result.body.config.weapons.cannon.cost !== 42) throw new Error("Admin custom values did not merge with the default baseline.");
  result = await request("/api/admin/config", { headers: { Cookie: cookie } });
  if (result.body.config.economy.startingCredits !== 275 || result.body.custom.economy.startingCredits !== 275) throw new Error("Admin custom values did not persist.");
  result = await request("/api/admin/config", { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ defaults: result.body.defaults, custom: {} }) });
  if (result.response.status !== 200 || result.body.config.economy.startingCredits !== 100 || Object.keys(result.body.custom || {}).length) throw new Error("Restore-default behavior did not clear custom overrides.");
  result = await request("/api/admin/logout", { method: "POST", headers: { Cookie: cookie } });
  if (result.response.status !== 200 || result.body.authenticated) throw new Error("Admin logout failed.");
  result = await request("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ant1982@gmail.com", password: "wrong1!" }) });
  if (result.response.status !== 401 || result.body.code !== "invalid_credentials") throw new Error("Invalid admin credentials were accepted.");
  result = await request("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ant1982@gmail.com", password: "Strong1!" }) });
  const restoredCookie = cookieFrom(result.response);
  if (result.response.status !== 200 || !restoredCookie) throw new Error("Persisted admin login failed.");
  const saved = readFileSync(adminPath, "utf8");
  if (saved.includes("Strong1!") || !saved.includes("passwordHash") || !saved.includes("salt")) throw new Error("Admin credential storage is not hashed.");
  result = await request("/api/admin/config", { headers: { Cookie: restoredCookie } });
  if (result.body.config.economy.startingCredits !== 100 || result.body.config.weapons.cannon.cost !== 0) throw new Error("Restored admin configuration did not persist.");
  console.log("Games admin check passed: bootstrap policy, hashed storage, session/logout, invalid login rejection, split default/custom persistence, validation, restore-default behavior, and sane projectile defaults.");
} finally {
  server.kill();
  await wait(100);
  rmSync(storeDir, { recursive: true, force: true });
}
