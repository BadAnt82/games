# Boom Box Pass 16 — release hardening

**Target:** `games.badantproductions.com`  
**Status:** complete locally; ready for deployment verification

## What changed

- Added an opt-in active-room recovery store at `data/boombox-active-rooms.json` (override with `BOOM_BOX_ROOM_STORE_PATH`). Room metadata, sessions, rules, terrain, inventory, action IDs, replay state, and placements are serialized without sockets or timers.
- Restored recent setup and in-progress rooms on server start, rebuilding membership and reconnect state. Rooms older than the existing 45-minute expiry window are discarded.
- Persisted room creation, joins, state broadcasts, disconnects, leaves, cancellations, and pruning so a restart does not silently discard a reconnectable Boom Box room.
- Limited Boom Box WebSocket messages to 64 KiB and reject malformed JSON values such as `null` or arrays with a clear protocol error.
- Added `scripts/boombox-release-check.mjs`, an automated release matrix covering malformed input, setup restart recovery, started-match restart recovery, 2/4/6/10-seat configurations, all three configured firing-mode values, versioned rules/catalogue state, and session continuity.

## Automated validation

- `npm run build`
- `node --check server.mjs`
- `git diff --check`
- `npm run test:boombox`
- `npm run test:boombox-release`
- `npm run test:cribbage`
- `npm run test:smoke`

The release matrix passed with restart recovery and all seat/mode cases. No user testing is requested yet; that remains gated until Pass 17 is complete.

## Loop review against earlier passes

- Pass 15 visual and balance changes remain isolated to the client and still build cleanly.
- Pass 14 rules snapshots continue to carry the version, seat count, catalogue, and firing-mode value through restart.
- Pass 13 AI state, replay, elimination, and playback fields survive serialization because the authoritative match snapshot is part of the room record.
- Passes 10–12 server authority, inventory checks, action idempotency, and terrain state remain unchanged.

## Remaining Pass 17 gate

The current server accepts and persists the `sequential`, `synchronous`, and `simultaneous` rule values, but action resolution is still sequential for all three. Pass 17 must either implement the prepare/release semantics for synchronous and simultaneous firing or explicitly remove those options before final user testing. This is a rules-completeness gate, not a restart or data-loss issue.

**Pass 17 follow-up:** this gate was closed by the prepare/release implementation documented in [BOOM_BOX_PASS17_FINAL_CONFORMANCE.md](./BOOM_BOX_PASS17_FINAL_CONFORMANCE.md).
