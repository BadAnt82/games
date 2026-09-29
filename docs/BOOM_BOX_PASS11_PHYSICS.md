# Boom Box Pass 11 — Physics and terrain simulation

## Status

Pass 11 is complete and ready for deployment. The server now owns projectile movement, collision, terrain changes, support/fall outcomes, and the resolution lock between turns.

## Implemented

- Fixed-step projectile integration at 30 steps per second with gravity, wind, angle, power, and a bounded flight path.
- Swept segment collision so a projectile cannot skip across a tank between simulation steps.
- Explicit solid terrain mask, height data, and terrain material data in live snapshots, replay frames, and completed-match history.
- Collision ordering for bounds, solid terrain, and exposed tanks. Tank hits now record the actual seat struck instead of trusting the requested target.
- Configurable edge behavior for stop, bounce, and wrap rules. Bounce is capped to prevent an unbounded flight.
- Deterministic crater and terrain-lift mutation with clamped terrain bounds.
- Support updates after terrain mutation. Tank states now carry `falling`, `buried`, and `fallDistance` values.
- Fall resolution with damage and a consumable parachute utility. Falling damage can eliminate a tank and records the elimination reason.
- Turn resolution lock remains active through the flight window, so a second action cannot start before the first projectile resolves.
- Replay and history records now retain terrain mask/material data alongside terrain heights, player state, placements, and event logs.

## Verification

- `npm run build`
- `npm run test:boombox`
- `node scripts/boombox-network-check.mjs`
- `npm run test:smoke`
- `npm run test:cribbage-network`
- `node --check server.mjs`
- `git diff --check`

The network protocol test covers a direct swept tank hit, terrain collision, deterministic terrain mutation, authoritative turn changes, duplicate action rejection, replay/history persistence, reconnect restoration, AI resolution, spectator isolation, and chat moderation.

## Deliberate scope boundary

This pass establishes the reliable artillery core. Multi-projectile weapons, persistent fire, full shop/economy behavior, AI equipment strategy, environmental events, and the remaining Scorched Earth equipment catalogue stay in Pass 12 and later. The current client renders the authoritative terrain and tank state; richer impact effects and art remain a later presentation pass.

