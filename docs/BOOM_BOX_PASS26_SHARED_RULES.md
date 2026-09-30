# Boom Box Pass 26 — Shared Rules and Solo Foundation

**Status: PASS**

Pass 26 removed the catalogue and seeded-terrain split between solo and multiplayer. The authoritative server and the solo client now consume the same versioned runtime contract.

## Implemented

- Added [`boombox-rules.mjs`](../boombox-rules.mjs) as the shared Boom Box rules source.
- Versioned the contract as **version 3**.
- Centralized all **19 weapon definitions**, including costs, capacity, damage, radius, terrain depth, mode, spread/bounce behavior, speed, descriptions, and materials.
- Centralized all **9 utility definitions**, including costs, capacity, starter inventory, effect, amount, and descriptions.
- Centralized seeded terrain generation for Sunset Range, Ice Shelf, and Lunar Crater.
- Centralized rules normalization, initial inventory, and inventory capacity helpers.
- Updated the solo client to use the shared catalogue and terrain generator.
- Updated solo utility handling so fuel, guidance, turret upgrades, parachutes, shields, repairs, terrain lift, and shield recharge have real state effects.
- Updated solo bouncing bombs to bounce from terrain as well as board edges.
- Kept the existing server action and state schema authoritative while exposing the shared rules version in snapshots and `/api/boombox-rules`.
- Added a shared-contract check and updated parity, network, and release checks for version 3.
- Updated the Docker runner to include the shared module.

## Deployment evidence

- `3c3ece6` — shared Boom Box rules between solo and multiplayer.
- `462274d` — include the shared rules module in the runtime image.
- The first deployment of `3c3ece6` was rejected by Coolify because the Docker runner did not yet copy `boombox-rules.mjs`. Coolify rolled back automatically and the prior production build remained healthy.
- The packaging fix deployed successfully as `zfcfxj22oi53mnf6fdic3kks`.
- Live health reports `status: ok`, rules version `3`, writable persistent storage, 2 active rooms, and 2 completed matches.
- The live rules endpoint reports 19 weapons and 9 utilities.

## Verification

Passed locally:

```text
npm run test:boombox-contract
npm run test:boombox
npm run test:boombox-network
npm run test:boombox-release
npm run test:boombox-persistence
npm run test:boombox-parity
npm run build
```

Passed against production:

```text
npm run test:boombox-network   (BOOMBOX_LIVE_URL=wss://games.badantproductions.com)
npm run test:boombox-browser   (BOOMBOX_LIVE_URL=https://games.badantproductions.com)
```

The browser check completed a two-human-seat match through setup, join, synchronized turns, and the result panel. The live WebSocket check passed lobby, secure invites, turn authority, action validation, reconnect, AI seat fill, spectators, moderation, replay timeline, and match history.

## Loop recommendation

Pass 26 is complete. Proceed to Pass 27, the complete weapon catalogue and economy pass. Keep the shared contract as the only catalogue source; do not reintroduce client-only weapon definitions.
