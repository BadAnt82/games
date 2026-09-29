# Boom Box Pass 18 — Setup and Rules Parity

**Date:** 2026-09-29  
**Target:** `games.badantproductions.com`

## Scope

Pass 18 closes the setup gap identified in the previous audit. The multiplayer create wizard now sends and reviews the rules the server already supports:

- 2–10 commander seats
- Sequential, synchronous, or simultaneous firing
- Light, standard, or heavy gravity
- Variable or calm wind with a bounded wind limit
- Stop, bounce, or wrap edge behavior
- Configurable starting credits (0–10,000)
- Full equipment catalogue or a clearly named core catalogue
- Existing turn pace, AI personality, AI fill, terrain, and room name

The review step shows the exact selected values before creation. Lobby cards also identify the room’s firing mode. The server remains authoritative and continues to clamp invalid values and filter the equipment catalogue.

## Deliberate gating

Movement/fuel and environmental events are not exposed as selectable rules yet. The server has placeholders for those values, but the match does not execute their complete gameplay. Keeping them out of the wizard avoids creating rooms that claim to support rules that do not work. They remain explicit follow-up work for the match-flow hardening/content passes.

## Loop review

Pass 17’s synchronous and simultaneous firing implementation remains intact. The new controls map directly to that versioned rules object; no firing or room lifecycle behavior was changed. Existing persistence, reconnect, spectator, replay, and catalogue checks remain green.

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

The browser and live deployment checks are recorded after deployment in this report’s final section.

## Next loop decision

If the live setup check passes, Pass 18 is complete and Pass 19 should address match-flow hardening: movement/fuel behavior, human turn deadlines, non-sequential disconnect handling, explicit draw/zero-survivor rules, and faster/pauseable AI presentation. Those items stay out of this pass because they require authoritative simulation changes rather than form wiring.
