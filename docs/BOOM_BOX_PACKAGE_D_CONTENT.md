# Boom Box Package D — Content, terrain, economy, and AI

**Status:** Complete — 2026-09-30

Package D completes the authoritative gameplay content contract while preserving Package C's single server simulation.

## Implemented

- Smoke shells now create three-turn smoke cover. Tanks in the cover take reduced incoming damage, and the event records the base damage, mitigation multiplier, and cover state.
- Reinforced terrain has a distinct damage modifier and terrain-tool blasts can bury nearby tanks. A buried tank has a defined movement action that consumes fuel and emits a `free` event.
- Excavated terrain can free a buried tank, with an explicit authoritative event.
- Deep blasts create deterministic collapse segments and a `collapse` event, so terrain mutation can produce secondary support changes.
- Player snapshots persist smoke status and restore it safely for active-room recovery.
- AI weapon choices now vary by personality: recruit favors forgiving heavy impact, veteran uses balanced options, ace favors precision and guidance, and expert prioritizes high-impact, napalm, smoke, and excavation tools.
- Weapon and utility presentation now explains match-local credit use, capacity limits, and strategic economy guidance. Smoke and terrain-tool descriptions include their gameplay modifiers.

## Evidence

The Package D content fixture verifies:

- all exposed catalogue items have descriptions, costs, and inventory limits;
- smoke cover is created and reduces a later incoming hit;
- reinforced terrain buries a tank and movement frees it;
- a deep blast creates a deterministic collapse event;
- all four AI personalities make distinct equipment choices when utilities are unavailable.

Regression checks also passed:

```text
npm run build
npm run test:boombox-d-content
npm run test:boombox-outcomes
npm run test:boombox-terrain
npm run test:boombox-ai
npm run test:boombox-weapons
npm run test:boombox-release
npm run test:boombox-parity
npm run test:boombox-network
```

## Limits

Browser viewport certification, original art and sound, archive scaling, and long-run performance remain in the later packages in the remediation plan.
