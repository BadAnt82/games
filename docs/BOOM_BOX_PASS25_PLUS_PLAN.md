# Boom Box Pass 25+ Plan

**Prepared:** 2026-09-30  
**Target:** `games.badantproductions.com`  
**Basis:** [BOOM_BOX_FULL_READINESS_AUDIT.md](./BOOM_BOX_FULL_READINESS_AUDIT.md)

## How much belongs in one pass

One pass should deliver one bounded capability area, its automated checks, its browser or operational evidence where applicable, and a short reassessment against the earlier passes. A pass can touch several files and both client and server when they are part of the same capability. It should not combine unrelated infrastructure changes, simulation rewrites, visual production, and device testing into one unreviewable change.

Each pass below has an exit gate. Passing the gate means the next pass may begin; it does not waive earlier gates. If a pass exposes regression or scope drift, the next action is a correction pass against that same scope before advancing.

## Pass 25 — Production recovery and deployment integrity

**Primary outcome:** prove that the deployed service keeps Boom Box state through a real container replacement.

### Included

- Configure a persistent Coolify mapping for `/app/data`.
- Keep active-room and completed-history files on that mapping.
- Change the deployment health check from the generic shell response to `/api/boombox-health` or an equivalent check that verifies the application service and fails on an unhealthy response.
- Record the deployed commit, storage mapping, health settings, and rollback target.
- Run a controlled replacement/restart test with one active room and one completed match.
- Confirm write failures are observable instead of silently remaining only in memory.

### Excluded

- New weapons, terrain rules, AI strategy, or visual assets.
- Destructive cleanup of existing match history unless explicitly required by the storage migration.

### Exit gate

An active room and a completed match survive the production replacement test, the health signal checks the real service, and the recovery procedure is documented.

## Pass 26 — Shared rules contract and solo foundation

**Primary outcome:** remove the rules split between local solo play and authoritative multiplayer.

### Included

- Define one versioned Boom Box rules/state/action contract for catalogues, seed, terrain, player state, inventory, utilities, phases, and results.
- Move deterministic simulation primitives into a shared module that can be exercised by server tests and the solo client path.
- Make solo use the same weapon IDs, effect definitions, collision order, damage/shield rules, turn progression, and result schema as multiplayer.
- Preserve solo play as a local mode if desired, but remove duplicate rule constants and divergent formulas.
- Add seeded fixtures proving the same seed and action sequence produce the same terrain and outcomes.

### Excluded

- Adding new catalogue items.
- Art/audio production.
- Mobile layout changes.

### Exit gate

The same rules contract drives solo and multiplayer for the existing catalogue, and a shared deterministic fixture passes in both execution paths.

## Pass 27 — Complete weapon catalogue and economy

**Primary outcome:** every exposed weapon is a real, testable choice with authoritative inventory and economy behavior.

### Included

- Verify and harden all 19 weapon definitions: direct explosive, heavy/area, spread/MIRV, bounce, impact, piercing, napalm, smoke, filler, remover, guided, laser, and area effects.
- Resolve child projectiles as separate authoritative paths and record each impact.
- Make purchase cost, capacity, starter inventory, and disabled-catalogue behavior data-driven and consistent in solo and multiplayer.
- Add deterministic fixtures for every weapon, including hit, miss, terrain, edge, and duplicate-action cases.
- Update weapon cards and logs so a player can understand cost, inventory, impact, and remaining ammunition.

### Excluded

- New terrain material systems beyond what a weapon requires.
- AI personality tuning except for the minimum legal-action changes needed to consume the catalogue.

### Exit gate

Every exposed weapon has a distinct authoritative effect, a visible client explanation, an inventory path, and a passing deterministic test.

## Pass 28 — Utilities, terrain materials, and environmental rules

**Primary outcome:** utilities and terrain tools change the match in meaningful, consistent ways.

### Included

- Implement and test repair, light/heavy shields, recharge, parachute, fuel, guidance, turret upgrades, terrain lift, smoke, filler, remover, and napalm persistence.
- Define material behavior for dirt, smoke, reinforced, liquid dirt, excavated, meteor, and scenery where each is exposed.
- Add burial, digging/freeing, support loss, collapse/fall damage, and parachute resolution in a fixed order.
- Verify boundaries, wind, gravity, scenery, and meteor events against the same seed/action log.
- Add fixtures for terrain added, removed, collapsed, used as cover, and mutated under tanks.

### Excluded

- New lobby features.
- Art production beyond temporary effect indicators needed to verify the rules.

### Exit gate

Every exposed utility and terrain material has a defined effect, a visible state change, and a deterministic test covering normal and edge cases.

## Pass 29 — AI parity, elimination, and end-game teaching

**Primary outcome:** computer tanks are full participants and matches finish clearly.

### Included

- Give Recruit, Veteran, Ace, and Expert distinct but deterministic decision policies.
- Let AI buy and use weapons, shields, repair, fuel, parachute, guidance, turret upgrades, and terrain tools when legal and useful.
- Keep AI actions on the same validation path as human actions.
- Continue AI-vs-AI play after human elimination or disconnect when the rules allow it.
- Record elimination reason, turn, order, placements, ties/draws, damage, shield absorption, terrain changes, purchases, and shots consistently.
- Show live “watching the battle” state, AI intent, elimination order, and final standings.

### Excluded

- Art/audio polish.
- New firing modes or new lobby identity features.

### Exit gate

An eliminated human can watch the remaining battle, understand AI decisions, and receive a complete, accurate ranked result.

## Pass 30 — Live flight, replay, and match-surface fidelity

**Primary outcome:** the player sees the same events the server resolves.

### Included

- Render all child projectile paths for MIRV/spread/bounce actions without overwriting earlier flights.
- Keep the next turn locked until every child path and secondary effect is visually acknowledged.
- Expand replay records to include shot paths, child impacts, utilities, terrain materials, eliminations, and placements.
- Make live and history replay support pause, 1x, 2x, and 4x controls with clear status text.
- Show accurate damage, shield, inventory, wind, turn, and result statistics.

### Excluded

- Final art/audio asset production.
- Full mobile browser matrix; that is Pass 31.

### Exit gate

A reviewer can follow one complete match live or from history and account for every projectile, effect, terrain change, elimination, and final placement.

## Pass 31 — Browser acceptance matrix, mobile, and accessibility

**Primary outcome:** every advertised player flow works through the actual interface.

### Included

- Browser-test solo start, loadout, utilities, AI turns, elimination, result, and restart/back flows.
- Browser-test multiplayer AI seat plans, all-human 2/4/6/10 seats, sequential/synchronous/simultaneous modes, movement, spectators, reconnect, and room cancellation.
- Browser-test history selection and replay controls.
- Run desktop, phone portrait, and phone landscape viewports, including setup overflow and scrolling.
- Verify touch aiming, keyboard focus/order, dynamic status announcements, reduced-motion behavior, and non-color indicators.
- Fix only issues exposed by this matrix; record any new scope as a later pass.

### Excluded

- New gameplay rules.
- Final art/audio package.

### Exit gate

A human tester can complete every advertised entry path without developer tools, protocol scripts, or hidden recovery steps.

## Pass 32 — Original Boom Box presentation package

**Primary outcome:** replace the readable prototype presentation with the declared original game identity.

### Included

- Create original AI-generated title treatment, tanks, terrain biomes, weapons, projectiles, explosions, smoke, napalm, shields, debris, and result art.
- Add original firing, impact, terrain, utility, warning, and elimination sound effects.
- Add mute and low-effects options, loading/reconnect visuals, and clear weapon cards.
- Make live match and replay use the same visual language.
- Re-run build and the relevant browser viewport checks after asset integration.

### Excluded

- Rule changes unless an asset exposes an already-existing display bug.
- New multiplayer protocol features.

### Exit gate

The game is visually distinct from the prototype, understandable without developer terminology, performant on the supported phone sizes, and uses original assets.

## Pass 33 — Human-test release gate

**Primary outcome:** establish a controlled, reviewable build for first human testing.

### Included

- Run the complete deterministic weapon/utility/terrain/AI matrix.
- Run the complete browser matrix from Pass 31 against the deployed commit.
- Verify production storage recovery from Pass 25, health response, WebSocket service, history, rollback target, and deployment logs.
- Review every earlier pass against the final acceptance matrix for drift.
- Publish a short human-test brief describing supported modes, known limitations, test accounts/names, and how to report issues.

### Excluded

- New features discovered during human testing. Those become separately planned follow-up passes.

### Exit gate

The live build, repository commit, recovery path, test evidence, and known limitations are all recorded. Human testing may begin with an explicit scope and rollback plan.

## Sequence and reassessment rule

The recommended order is **25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33**. Pass 25 is infrastructure-only and should be completed first because every later persistence and replay result depends on it.

After each pass:

1. Run the pass exit gate.
2. Re-run the relevant earlier checks.
3. Compare the implementation to the original reference and acceptance matrix.
4. Fix regressions before advancing.
5. Report whether to proceed, repeat the current pass, or split a newly discovered scope item.

This plan does not assume that a pass is complete merely because its code compiles. Each exit gate must be demonstrated.
