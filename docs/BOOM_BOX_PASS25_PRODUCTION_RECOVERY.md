# Boom Box Pass 25 — Production Recovery Report

**Status: PASS**

Pass 25 hardened the production boundary around Boom Box persistence. Gameplay rules and presentation were left unchanged.

## Implemented

- Added a Coolify persistent volume named `tmdedhfajs0iouepqit1but3-games-boombox-data` mounted at `/app/data`.
- Kept the existing server defaults under `/app/data` for active rooms and completed-match history.
- Changed `/api/boombox-health` to report the real storage state, the last write result, and a `degraded` status after a persistence failure.
- Logged active-room and match-history write failures with a clear `[boombox-persistence]` server message.
- Configured Coolify's application health check to use `GET /api/boombox-health` and require the response to contain `"status":"ok"`.

## Evidence

- Repository commit: `b5e5893` (`Make Boom Box persistence failures observable`), pushed to `BadAnt82/games` `master`.
- Deployment `jyjmvmupalbyb9o62p6io8yl` completed after the volume and health-check configuration were applied.
- Live Boom Box network protocol check passed, including lobby, secure invite, turn authority, reconnect, AI, spectators, moderation, replay, and history behavior.
- The live health endpoint reported writable history and active-room storage after the test match was created.
- A controlled Coolify restart (`kzjqzzxjlq8kll8zklmbcf9d`) preserved **2 active rooms** and **2 completed matches**.
- A second replacement deployment (`kc0fvy5y3jp0vlwhk8bwh3du`) preserved the same **2 active rooms** and **2 completed matches**.
- Coolify remained `running:healthy` with the health path set to `/api/boombox-health`.

## Verification commands

```text
npm run build
npm run test:boombox-persistence
npm run test:boombox-parity
npm run test:boombox-network   (with BOOMBOX_LIVE_URL=wss://games.badantproductions.com)
```

## Data note

The new volume was attached before the Pass 25 verification run. It began empty, so the pre-volume container-local test artifacts were not treated as production data. All records used for the recovery test were created after the volume was attached and survived both restart and replacement deployment.

## Loop recommendation

Pass 25 is complete. Proceed to Pass 26, which is the configuration and environment audit. Keep the recovery volume and health check in place while auditing deployment settings; do not change gameplay in that pass.
