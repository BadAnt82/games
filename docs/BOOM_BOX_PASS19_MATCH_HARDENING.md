# Boom Box Pass 19 — Match Flow Hardening

**Date:** 2026-09-29  
**Target:** `games.badantproductions.com`

## Scope completed

Pass 19 closes the match-flow gaps carried forward from Pass 18:

- Optional movement and fuel are now a real sequential-fire rule. A commander can move once per turn, movement consumes fuel, the server clamps distance and board edges, and the tank is re-seated on the authoritative terrain surface.
- Every live turn has a server-owned deadline derived from Relaxed, Standard, or Blitz pace. If a commander does not act, the server records a timeout and resolves a legal cannon shot so the room cannot stall.
- Disconnecting seats are recorded and taken over by AI while the match continues. This applies to sequential, synchronous, and simultaneous rooms; a reconnecting commander can reclaim the same session seat.
- Zero-survivor resolution is explicit. The server records `outcome: "draw"`, clears the winner, and gives every eliminated tank a tied draw placement.
- The client shows fuel, movement controls, and a live deadline readout. Movement controls are available only when the room’s authoritative rules enable sequential movement.

## Deliberate boundaries

Movement is intentionally restricted to sequential firing in this pass. Synchronous and simultaneous rooms continue to coordinate shots without a second movement phase. Environmental events, full physics parity, and persistent active-room storage across infrastructure replacement remain later work because they require separate simulation and operations changes.

## Loop review

Pass 18’s setup controls still map to the same versioned server rules. Pass 17’s prepare/release semantics remain unchanged. The new deadline, disconnect, and movement paths use the same action validation, action IDs, replay log, and authoritative snapshots.

## Verification

Passed locally:

- `npm run build`
- `node --check server.mjs`
- `git diff --check`
- `npm run test:boombox`
- `npm run test:boombox-network`
- `npm run test:boombox-release`
- `npm run test:cribbage`
- `npm run test:cribbage-network`
- `npm run test:smoke`

The Pass 19 release matrix now covers movement/fuel, deadline fallback, and disconnect takeover in addition to the prior restart, seat, catalogue, firing-mode, and session checks.

## Next loop decision

After the live checks pass, Pass 19 is complete. Pass 20 should address the remaining content and simulation gaps: broader projectile/terrain hardening, environmental events, active-room durability guarantees, richer AI playback controls, and the original Boom Box art/effects/audio set. Human testing remains deferred until the planned passes are complete.
