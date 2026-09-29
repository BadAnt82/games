# Boom Box Development Plan

**Purpose:** turn the Scorched Earth baseline into a polished browser game for `games.badantproductions.com`.

**Plan size:** the original 9-pass product plan is complete as a historical baseline. The subsequent content-audit completion track continues through Pass 17.

- A first **single-player playable build** is complete after Pass 3.
- A **playable multiplayer beta** is complete after Pass 6.
- The **polished release target** is complete after Pass 9.

This is an ordered plan rather than a promise of fixed calendar dates. Each pass ends with a reviewable build and an explicit exit gate. A later pass can add content, but it should not quietly change the rules established in an earlier pass.

## Pass 1 — Product and technical foundation

### Included

- Produce [BOOM_BOX_PASS1_FOUNDATION.md](./BOOM_BOX_PASS1_FOUNDATION.md) as the written product and technical contract.
- Confirm Boom Box’s baseline rules against [BOOM_BOX_REFERENCE.md](./BOOM_BOX_REFERENCE.md).
- Decide the launch player limit, firing modes, movement rules, economy model, win conditions, and first weapon set.
- Define the authoritative match state: players, seats, settings, seed, terrain, inventory, money, turn, projectile events, damage, and result.
- Define the deterministic simulation tick and event log format.
- Define the browser/server boundary and reconnect model.
- Create the visual direction brief for the Boom Box identity, tanks, terrain biomes, HUD, projectiles, explosions, and sound.
- Create the AI-art production rules: original assets, consistent canvas sizes, transparent layers where useful, naming, versioning, and review process.

### Exit gate

The rules, state model, art direction, and multiplayer constraints are written down well enough that two people can implement the same match without inventing conflicting behavior.

## Pass 2 — Experience design and polished lobby prototype

### Included

- Opening screen with two clear choices: **Single player** and **Multiplayer**.
- Responsive Boom Box shell with its own visual identity and generated placeholder art.
- Multiplayer lobby with separate **Create game** and **Join game** paths.
- Game cards showing creator name, player count, open seats, map/rules summary, status, and a clear Join button.
- Create flow with step-by-step settings, player slots, human/AI selection, map preview, weapon/rules summary, and review before creation.
- Lobby states for loading, empty lobby, game full, game starting, reconnecting, cancelled game, and invalid/expired game.
- Creator workspace showing games the user created, opponent connection state, ready state, cancel control, and return-to-lobby behavior.
- Mobile portrait and landscape layouts, keyboard focus order, and clear status language.

### Exit gate

Someone unfamiliar with the project can open the game, choose multiplayer, create a room, find a room, understand who created it, and return safely without entering a match by accident.

## Pass 3 — Core artillery vertical slice

### Included

- One complete single-player match against one AI tank.
- One generated terrain profile with a reproducible seed.
- Tank placement, turret angle, power, fire, projectile arc, gravity, and wind.
- Swept collision detection, one-impact-one-resolution behavior, crater creation, tank damage, falling, death, and turn advance.
- Cannon weapon, health, win/lose state, restart, exit, and a readable shot result log.
- Initial HUD for active player, wind, angle, power, health, and fire state.

### Exit gate

The match can be played from start to finish without developer tools. A recorded seed and action sequence produces the same terrain, trajectory, impact, damage, and winner on repeated runs.

## Pass 4 — Complete single-player game

### Included

- Configurable single-player setup with multiple AI opponents.
- Initial shop/economy and inventory model.
- First balanced content set: direct explosive, large explosive, multi-projectile, tracer/precision, terrain tool, and one area-effect weapon.
- Light shield, repair, parachute or fall protection, and one additional utility.
- Multiple terrain profiles and map seeds.
- AI skill levels using the same legal action path as humans.
- End-of-match results, statistics, and a rematch/restart path.
- Help panel explaining wind, power, weapons, utilities, and terrain.

### Exit gate

A player can configure and complete a replayable single-player match with meaningful choices, multiple opponents, and no placeholder-only rule systems.

## Pass 5 — Multiplayer foundation and lobby integration

### Included

- Server-authoritative match creation from the polished lobby.
- Seat assignment, creator ownership, ready state, configuration lock, and start gate.
- Private hands/controls where applicable and server validation for every committed action.
- Authoritative terrain, projectile, damage, inventory, money, turn, and result state.
- Player disconnect, reconnect, session token, host transfer, cancel, quit, and forfeit behavior.
- Clear lobby refresh behavior and live connection indicators.
- Full-game filtering so new players cannot join started or full rooms.

### Exit gate

Two or more human players can create, join, start, play, finish, leave, and reconnect to a match without desynchronizing or accidentally controlling another player’s tank.

## Pass 6 — Multiplayer quality and game-flow depth

### Included

- Multiplayer rematch flow with unanimous approval.
- Declined-player replacement with an explicit AI takeover choice.
- Mid-match pause rules, turn timer rules if enabled, and safe recovery after refresh or temporary connection loss.
- Simultaneous or synchronous firing mode if selected in Pass 1.
- Match event sequence numbers, replayable action log, and snapshot recovery.
- Host/creator indicators, ready summaries, launch countdown, and post-match lobby return.
- Automated two-, three-, and four-player human test matrices plus reconnect and quit tests.

### Exit gate

The multiplayer beta is fun and dependable across the supported player count. Every state transition has a visible next step and a recovery path.

## Pass 7 — Full content, AI, balance, and generated presentation

### Included

- Remaining launch weapons and utilities, each with distinct rules and clear counterplay.
- Persistent napalm/smoke effects, dirt add/remove behavior, bouncing or special projectiles, and optional environmental events.
- Additional AI personalities and difficulty levels.
- Economy balancing, shop prices, inventory limits, damage curves, shield values, and win pacing.
- Original AI-generated art set: title treatment, tanks, tank variants, terrain/biome textures, weapon icons, projectiles, explosions, smoke, fire, shields, menu illustrations, and victory/defeat visuals.
- Generated sound/effect direction and implementation for launches, impacts, terrain collapse, warnings, and result moments.
- Consistent visual language across lobby, setup, match, shop, and results.

### Exit gate

Every launch item is understandable, visually distinct, balanced enough for public play, and represented with original art/effects that belong to Boom Box rather than looking like an unstyled prototype.

## Pass 8 — UX, accessibility, performance, and device pass

### Included

- Touch aiming and power controls plus precise keyboard controls.
- Portrait and landscape support for lobby, setup, shop, and match.
- Responsive scaling for small phones, tablets, and desktop screens.
- Reduced-motion option, readable contrast, color-independent player identification, focus states, labels, and screen-reader announcements.
- Performance profiling for projectile effects, terrain redraws, particles, audio, and multiplayer snapshots.
- Mobile bandwidth and reconnect behavior.
- Clear errors, issue-report entry point, and diagnostic context for failed joins or desyncs.

### Exit gate

The complete game remains usable and understandable on the supported phone and desktop matrix without hidden controls, clipped dialogs, or effects that make the match unreadable.

## Pass 9 — Release hardening and live launch

### Included

- Full rules, simulation, lobby, multiplayer, AI, content, mobile, accessibility, and security test matrix.
- Determinism tests using fixed seeds and action logs.
- Abuse checks for duplicate fire, invalid seat actions, negative money, duplicate purchases, stale reconnects, and forged snapshots.
- Browser smoke tests for single-player and multiplayer start-to-finish flows.
- Error logging, issue archive/resolution flow, health checks, and deployment rollback plan.
- Final generated-art review for consistency, licensing, originality, and loading size.
- Production build, staged deployment, live smoke test, and release checklist.

### Exit gate

Boom Box can be invited to real players with a known rollback path, observable failures, tested multiplayer transitions, and a stable live URL.

## Playable milestones

| Milestone | Pass | What a player can do |
| --- | ---: | --- |
| Mechanics prototype | 3 | Play one complete artillery match against one AI. |
| Single-player beta | 4 | Configure a match, buy/select equipment, fight multiple AI tanks, and replay it. |
| Multiplayer beta | 6 | Use a polished lobby to create or join, play online, reconnect, rematch, and recover from a quit. |
| Content-complete beta | 7 | Use the full launch content set with original generated presentation. |
| Release candidate | 8 | Play on supported devices with accessibility and performance safeguards. |
| Public release | 9 | Play the tested, monitored, rollback-ready production version. |

## Rules for handling later changes

Every requested change should identify:

1. Which pass it belongs to.
2. Whether it changes baseline rules or adds Boom Box-specific behavior.
3. Which saved state, network message, UI flow, and test matrix it affects.
4. The acceptance test that proves it works.

This keeps a multi-pass build from drifting, especially around the lobby, authoritative multiplayer state, projectile resolution, and terrain mutation.
