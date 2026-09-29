# Boom Box Pass 6 — Network polish (Complete)

Pass 6 hardens the authoritative multiplayer loop for real browser sessions.

## Included

- Reconnect tokens are issued when a commander creates or joins a room and stored locally by the client.
- A disconnected commander can resume the same seat and receive the current authoritative snapshot.
- Server-generated projectile flight paths are broadcast before the resolved state; clients render the shared arc instead of simulating different outcomes.
- Utilities now use the same server action path as firing. Repair Kit, Terrain Lift, and Shield effects are resolved by the server.
- Room owners can start a partially filled room with AI seats when AI fill is enabled.
- Room snapshots retain a bounded action history for the active match.
- Lobby entries identify rooms that can be resumed by the current commander.

## Verification

- `npm run test:boombox-network` — lobby, turn authority, action validation, reconnect resume, and AI seat filling.
- Live WebSocket protocol check against `wss://games.badantproductions.com/boombox`.
- `npm run build`
- `npm run test:boombox`
- `npm run test:smoke`
- `npm run test:cribbage`
- `npm run test:cribbage-network`

## Follow-up

Pass 7 now persists completed matches, supports spectators and invite links, and evaluates terrain collision on the server. A dedicated history screen and authenticated invite permissions remain future work.
