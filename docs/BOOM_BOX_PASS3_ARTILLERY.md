# Boom Box Pass 3 — Artillery Vertical Slice

## What shipped

Pass 3 turns the single-player path into a complete local match against one rival tank:

- Solo setup with commander name, terrain profile, and reproducible numeric seed.
- Seeded destructible terrain rendered on a dedicated responsive battlefield canvas.
- Player and rival tanks with distinct colors, health bars, turret direction, and readable labels.
- Angle and power controls, a projected aim line, and pointer-to-aim support on the battlefield.
- Cannon projectile arc with fixed-step gravity, wind acceleration, trail, terrain collision, and impact resolution.
- Crater creation, blast damage, tank falling, death, turn advance, and deterministic wind changes between turns.
- AI turn delay and a legal cannon shot using the same projectile path as the player.
- Shot result log, active-turn status, seed/map badges, health readouts, exit control, and a complete victory/defeat result screen.
- Play again and return-to-Boom-Box controls.
- Phone and desktop layouts with a first-frame battlefield render and no underlying game-select panel bleed-through.

## Determinism boundary

Terrain generation uses a seeded linear-congruential random stream. Match simulation advances with a fixed 60 Hz step and keeps the seed, turn, projectile, terrain, health, and shot counters in one local match state. The server-authoritative event log and replay service remain multiplayer work for later passes.

## Deliberate boundary

This is a single-player vertical slice. The multiplayer lobby remains a local prototype from Pass 2. The slice intentionally uses one cannon, one AI opponent, stationary tanks, and match-local state; weapon breadth, economy, multiple opponents, networking, reconnects, and final art remain scheduled work.

## Verification

- `npm run build`
- `npm run test:smoke`
- `npm run test:cribbage`
- `npm run test:cribbage-network`
- Browser smoke flow: open Boom Box, choose Single player, start a seeded match, confirm canvas render and controls, fire, wait through projectile resolution and the AI turn, and return to the player's turn.
- Aiming matrix across six angle/power pairs confirmed reachable blast damage and a one-shot victory path.
- Result-screen flow verified with the visible victory state, statistics, Play again, and Back to Boom Box controls.
- Phone-sized visual check confirmed the battlefield, controls, health bars, shot log, and Exit match button fit without horizontal overflow.
- `npm run test:boombox` now locks the fixed-seed terrain checksum, crater mutation, and impact damage values.

## Reassessment

Pass 3 is closed after the deterministic hardening check. Pass 4 has begun with multiple rivals, terrain profiles, match credits, initial weapons/utilities, target selection, and help. Continue Pass 4 by expanding the shop, inventory, AI difficulty, effects, statistics, and fixed-seed action-log coverage.
