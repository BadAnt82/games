# Boom Box Pass 21 — Live Acceptance and Device Sweep

**Date:** 2026-09-29  
**Target:** `games.badantproductions.com`

## Scope

Pass 21 checked the production browser flows and mobile presentation against the Pass 20 rules and recovery work:

- Player-name prompt and Boom Box entry.
- Single-player and multiplayer mode selection.
- Multiplayer lobby, room creation wizard, event toggles, review summary, and history navigation.
- Single-player match canvas, controls, and mobile layout.
- Phone viewport: 390×844.
- Landscape viewport: 844×390.

## Results

The live browser sweep passed at both viewports. Every checked screen had no horizontal overflow (`scrollWidth` matched the viewport width): create steps 1–3, history, and the live single-player match. The event review displayed both “Meteor showers” and “Scenery markers” with their enabled state. The match canvas retained its accessible Boom Box battlefield label.

The live HTTP endpoint returned 200, and the live WebSocket matrix passed for lobby, secure invites, turn authority, action validation, reconnect, AI fill, spectator state, chat moderation, replay, and match history.

The complete local verification also passed:

- `npm run build`
- `node --check server.mjs`
- `git diff --check`
- `npm run test:boombox`
- `npm run test:boombox-network`
- `npm run test:boombox-release`
- `npm run test:cribbage`
- `npm run test:cribbage-network`
- `npm run test:smoke`

## Findings and decision

No code correction was required in this pass. A first local run hit Windows `spawn EPERM` because stale local test/Vite processes were still running; those processes were cleaned up and all checks passed on rerun. The deployment also needed its normal rollout warm-up before the live WebSocket check became stable.

Pass 20’s code remains the deployed implementation; Pass 21 adds acceptance evidence only. Human playtesting remains deferred.

## Next loop step

Pass 22 should be a final read-only conformance and gap audit against the proposed finished prototype. If it finds no release-blocking gap, the next decision can be to open the first controlled human test session.
