# Boom Box Pass 5 — Authoritative multiplayer (Complete)

Pass 5 moves the Boom Box room flow from a browser-only preview to a server-authoritative turn system over WebSockets.

## Included

- `/boombox` WebSocket endpoint in `server.mjs`.
- Server-owned room creation, lobby listing, creator ownership, seat assignment, join validation, cancellation, and disconnect handling.
- Rooms are synchronized across connected browsers; the lobby exposes the creator name, connected seat count, terrain, pace, and started state.
- A match starts when all configured commander seats have connected.
- The server owns turn order, legal target validation, angle/power bounds, damage, elimination, wind changes, winner selection, and action history.
- Clients receive authoritative snapshots and can only submit actions during their own turn.
- The client renders server state in the existing Boom Box battlefield and disables local-only utility controls while in a room.
- Rejected actions are returned as clear error messages instead of being applied optimistically.
- Rooms expire after 45 minutes without activity.

## Verification

- `npm run test:boombox-network` — creator lobby, join, turn authority, action validation, and state broadcast.
- `npm run test:boombox` — deterministic terrain, crater, damage, and action-log checks.
- `npm run build`
- `npm run test:smoke`
- `npm run test:cribbage`
- `npm run test:cribbage-network`
- Live deployment health and HTML endpoint check.

## Boundary for Pass 6

Pass 5 synchronizes turn results and match state. Pass 6 can add streamed projectile flight events, reconnect tokens with state resume, AI fill for missing seats, and persistent room history.
