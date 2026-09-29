# Boom Box Pass 7 — History and spectators (Complete)

Pass 7 adds the public room features needed to operate multiplayer matches beyond a single browser session.

## Included

- Completed matches are persisted to `data/boombox-match-history.json`, capped at the most recent 100 matches.
- `GET /api/boombox-history` exposes the latest 50 completed matches for history views and operations.
- Spectator WebSocket sessions can watch active rooms without receiving a player seat or action permissions.
- Spectators receive the same authoritative snapshots and projectile flight events as players.
- Lobby entries expose active started rooms and spectator counts.
- Room cards include invite-link copy actions using `?boomboxRoom=<room id>`.
- Invite links automatically join an open room or enter spectator mode when the match has already started.
- Authoritative terrain collision is evaluated on the server before damage is applied.
- Winner seat `0` and other falsy numeric values serialize correctly in snapshots.

## Verification

- `npm run test:boombox-network` — history persistence, reconnect, AI fill, spectator isolation, and winner selection.
- Live WebSocket protocol check against `wss://games.badantproductions.com/boombox`.
- Live HTTP history endpoint check.
- `npm run build`
- `npm run test:boombox`
- `npm run test:smoke`
- `npm run test:cribbage`
- `npm run test:cribbage-network`

## Boundary for Pass 8

Future work can add a dedicated match-history screen, authenticated invite permissions, spectator chat, and terrain deformation replay in completed-match records.
