# Boom Box Pass 27 — Complete Weapon Catalogue and Economy

**Status: PASS**

Pass 27 closed the remaining weapon catalogue and economy drift identified after Pass 26. The client, server, and test fixtures now agree on every weapon's cost, capacity, effects, and child-projectile behavior.

## Implemented

- Added the missing `split-shell` option to the solo flow by generating the selector from the shared catalogue at runtime.
- Hardened the solo loadout bay with per-weapon capacity limits, loaded counts, disabled purchase buttons at capacity, and insufficient-credit handling.
- Expanded network weapon and utility selectors with descriptions and `owned/capacity` readouts.
- Extended authoritative fire events with a `childImpacts` record for every projectile child. Each record includes impact type, target, center, damage, shield absorption, path length, and material.
- Prevented child projectiles from applying damage to a target that was already eliminated by an earlier child in the same shot.
- Made the event damage total equal the sum of all child impacts while retaining the existing first-flight and terrain fields for compatibility.
- Added full field-by-field server/client catalogue parity checks.
- Added a deterministic 19-weapon matrix that creates a fresh authoritative room per weapon, verifies purchase costs and inventory, fires the weapon, and checks child count and terrain material.

## Verification

Passed locally:

```text
npm run build
npm run test:boombox-contract
npm run test:boombox-parity
npm run test:boombox-weapons
npm run test:boombox
npm run test:boombox-network
npm run test:boombox-release
npm run test:boombox-persistence
npm run test:boombox-browser
```

The weapon matrix covered all 19 catalogue entries: cannon, heavy cannon, heavy shell, precision round, split shell, mini nuke, MIRV, triple shot, bouncing bomb, riot bomb, piercing round, napalm, smoke shell, liquid dirt, terrain tool, terrain remover, tracer round, laser line, and area charge. Child counts matched the rules for split shell, MIRV, and triple shot.

## Deployment evidence

Commit `0626a1c` deployed successfully through Coolify as `jsk9345l4czofoxr04bvrzdr`.

Live health, WebSocket, and browser checks are recorded below after the production rollout.

Live verification passed:

```text
https://games.badantproductions.com/api/boombox-health  -> status ok, rules version 3
https://games.badantproductions.com/api/boombox-rules   -> 19 weapons, 9 utilities
npm run test:boombox-network   (BOOMBOX_LIVE_URL=wss://games.badantproductions.com)
npm run test:boombox-browser   (BOOMBOX_LIVE_URL=https://games.badantproductions.com)
```

The production protocol check covered the room lobby, secure invites, turn authority, purchases, reconnect, AI fill, spectators, chat moderation, replay persistence, and match history. The production browser check completed the two-human setup, join, synchronized turns, and result panel.

## Loop recommendation

Pass 27 is complete when the production deployment and live protocol/browser checks pass. Proceed to Pass 28 for child-projectile presentation, replay detail, and visual/effect parity; keep authoritative `childImpacts` as the source for that presentation work.
