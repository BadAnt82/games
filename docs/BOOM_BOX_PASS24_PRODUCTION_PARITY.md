# Boom Box Pass 24 — Production, Parity, and Accessibility Hardening

**Date:** 2026-09-30  
**Target:** `games.badantproductions.com`  
**Status:** complete and deployed; live UI and WebSocket acceptance passed

## Changes

- Added `GET /api/boombox-rules`, a versioned server rules contract used by automated parity checks.
- Added `GET /api/boombox-health`, which reports active rooms, completed history, and read/write availability for both persistence stores without exposing filesystem paths.
- Added a solo/server catalog parity check. All 19 weapon IDs match and the bouncing-bomb mode is aligned in both catalogs.
- Added a restart persistence check. An active room and its creator session were restored after stopping and restarting the server with the same room store.
- Updated the bouncing-bomb solo description to state that it bounces off walls and terrain.
- Added reduced-motion CSS for Boom Box panels and an accessible match instruction tied to the battlefield canvas with `aria-describedby`.

## Verification

Local:

- `npm run build`
- `node --check server.mjs`
- `git diff --check`
- `npm run test:boombox`
- `npm run test:boombox-network`
- `npm run test:boombox-release`
- `npm run test:boombox-parity`
- `npm run test:boombox-persistence`
- `npm run test:cribbage`
- `npm run test:cribbage-network`
- `npm run test:smoke`

Live:

- Coolify deployment finished healthy (`running:healthy`).
- `/api/boombox-health` returned `status=ok`; both stores reported writable.
- `/api/boombox-rules` returned version 2 and the 19-weapon catalog.
- Live two-browser acceptance passed through room creation, seat review, join, synchronized turns, and results.
- Live WebSocket regression passed through lobby, actions, reconnect, AI, spectator, replay, and history.

## Loop reassessment

The software-side parity and restart behavior are now covered. The live health endpoint proves the running container can write its stores, but Coolify's application configuration still does not expose an independently verified persistent-volume mapping. A container restart test against the live service would be destructive and was not performed.

The planned original generated art/audio set is also still outstanding; the current battlefield remains a deliberately readable canvas presentation. Human playtesting remains deferred.

**Recommendation: proceed to Pass 25**, focused on configuring and verifying the Coolify `/app/data` persistent volume, then adding the original Boom Box art/audio package and a small asset-loading/accessibility acceptance check. Keep game-rule changes out of that pass.

