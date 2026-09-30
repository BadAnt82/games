# Boom Box Pass 23 — Conformance Corrections

**Date:** 2026-09-30  
**Target:** `games.badantproductions.com`  
**Status:** complete, deployed, and live acceptance passed

## Corrections made

- Added an explicit human/AI plan for every seat in the multiplayer wizard. Seat 1 is the creator; every other seat is reviewable as human or AI before room creation. AI seats are reserved from human joins and fill only when the creator requests the configured AI fill.
- Added the seat plan to the review summary and sent the selected AI seat indexes in the room configuration. Legacy `aiFill` requests still default to all non-host seats so existing clients remain compatible.
- Changed the bouncing bomb rules to bounce from terrain as well as configured boundaries. Each bounce consumes the weapon's finite bounce budget; an exhausted projectile resolves against terrain.
- Added event-aware replay snapshots. Replay history now shows recent fire, utility, movement, environmental, elimination, and placement events for each frame, with Play/Pause and 1x/2x/4x controls alongside the existing frame slider.
- Removed stale prototype language from the mode header and kept the multiplayer badge permanently worded as server-authoritative.
- Added a two-browser Playwright acceptance check covering room creation, per-seat review, human join, synchronized turns, three-shot deterministic completion, and the result panel.
- Fixed a client lobby mapping defect found by that browser check: server `gameId` values are now normalized to the room card's `id`, so Join room targets the actual room.

## Verification

Local:

- `npm run build`
- `node --check server.mjs`
- `git diff --check`
- `npm run test:boombox`
- `npm run test:boombox-network`
- `npm run test:boombox-release`
- Two-browser acceptance against the rebuilt local server

Live:

- Coolify deployment `d56jjt3i2qipqqqwbcvezxjy` finished with `status=finished`; application reports `running:healthy`.
- HTTP health returned `200`.
- Two-browser acceptance passed against `https://games.badantproductions.com/`.
- Live WebSocket matrix passed with `BOOMBOX_LIVE_URL=wss://games.badantproductions.com`.

## Loop reassessment

The four Pass 22 release blockers are closed. Human testing remains deferred because the earlier product-quality gaps are still open: content-complete generated art and audio, independent verification of the Coolify persistent volume, and shared rules parity between solo and the authoritative multiplayer simulation.

**Recommendation: proceed to Pass 24**, a content and production-hardening pass. Keep its scope bounded to original presentation assets/effects/audio, solo/multiplayer rules parity, and a documented persistent-volume/restart check. Do not broaden the ruleset until that pass is complete.

