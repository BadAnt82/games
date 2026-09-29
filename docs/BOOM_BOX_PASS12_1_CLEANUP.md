# Boom Box Pass 12.1 cleanup report

## Result

Pass 12.1 is complete. The Pass 12 audit findings were closed and the project is ready to begin Pass 13.

## Cleanup completed

- Added multiplayer weapon and utility selectors driven by the server's versioned catalogue.
- Added multiplayer purchase controls. Purchases use unique action IDs and are accepted or rejected by the authoritative room.
- Removed the client-side hardcoded loadout fallback. Credits, weapon stock, utility stock, and catalogue labels now come from the room snapshot and purchase responses.
- Preserved the selected network item across snapshots instead of resetting every update to the cannon and repair kit.
- Terrain remover now clears `terrainSolid` in the affected area, so dug terrain is passable instead of only changing its height.
- Removed obsolete Pass 4 labels and replaced them with product language.
- Marked solo as a local preview while multiplayer remains the authoritative rules and effects path; full solo parity remains a deliberate Pass 13 work item.

## Verification

- `npm run build`
- `npm run test:boombox`
- `npm run test:smoke`
- `npm run test:cribbage-network`
- `node --check server.mjs`
- `git diff --check`

## Recommendation

Proceed to Pass 13. Keep the solo preview parity item visible in the Pass 13 checklist, then address AI equipment decisions and teaching mode against the now-visible multiplayer catalogue.
