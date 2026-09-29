# Boom Box Pass 20 — Content and Simulation Hardening

**Date:** 2026-09-29  
**Target:** `games.badantproductions.com`

## Scope completed

Pass 20 closes the highest-risk simulation and recovery gaps carried forward from Pass 19:

- Projectile terrain collision now samples every movement segment, preventing fast or shallow shots from tunneling through thin terrain between simulation frames.
- Optional deterministic scenery markers and meteor showers are available in the setup wizard. Scenery is seeded into the terrain material map; meteor events apply seeded terrain changes every third turn and use the same authoritative mutation, support, fall, damage, and elimination path as weapons.
- AI intent snapshots include the planned delay and ready timestamp, so the match teaches that an AI commander is thinking while authoritative timing remains server-owned.
- Active-room snapshots are schema-versioned and written through a temporary file plus atomic rename. Restored rooms retain the turn deadline and continue scheduling timeout/AI work after a process restart.
- New terrain materials have visible canvas treatment while retaining the existing original Boom Box presentation system.

## Deliberate boundaries

This pass does not claim a complete Scorched Earth asset or audio set. The current original canvas effects and UI remain the presentation baseline until a dedicated art/audio pass. Meteor events are deterministic hazards and scenery cues, not a full weather/material-modifier system. Deployment durability still depends on the configured persistent volume being retained by the hosting environment.

## Verification

Passed locally:

- `npm run build`
- `node --check server.mjs`
- `git diff --check`
- `npm run test:boombox`
- `npm run test:boombox-network`
- `npm run test:boombox-release`
- `npm run test:cribbage-network`
- `npm run test:smoke`

The Pass 20 release matrix covers setup event normalization, deterministic scenery markers, versioned atomic active-room persistence, restored turn deadlines, movement/fuel, timeout fallback, disconnect takeover, all seat sizes, all firing modes, catalogue filtering, and reconnect continuity.

## Loop review and next decision

Pass 19’s turn authority, simultaneous resolution, disconnect takeover, and movement rules remain intact. Pass 20 adds only server-authoritative content and recovery behavior on those existing paths. The next recommended step is **Pass 21: production browser/live verification and targeted presentation cleanup**. Human playtesting remains deferred until the planned passes and the live acceptance matrix are complete.
