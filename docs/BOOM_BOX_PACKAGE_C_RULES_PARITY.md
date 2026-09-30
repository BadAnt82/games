# Boom Box Package C — Rules parity

**Status:** Complete — 2026-09-30

Package C makes solo and multiplayer use one authoritative Boom Box simulation. Solo creates a server room with AI seats and follows the same room, action, flight, terrain, inventory, utility, elimination, and result paths as multiplayer.

## Changes

- Removed the local solo full-game fallback. If WebSocket support or the authoritative service is unavailable, solo stays on setup and shows a reconnect message.
- Removed local room creation, joining, and cancellation mutations. Room actions require the authoritative room service.
- Removed seeded fake lobby rooms so the lobby only presents server-provided rooms.
- Kept the shared `boombox-rules.mjs` catalogue and rule contract used by both the server and client presentation.
- Added an explicit setup note that solo uses the same server simulation as multiplayer.

## Verification

The parity fixture starts a local server and creates two seeded rooms with the same configuration: one solo-style room filled with an AI seat and one two-human multiplayer room. It verifies:

- identical terrain, terrain masks/materials, wind, turn state, rules version, and host loadout;
- identical cannon fire event and terrain mutation;
- identical rejection of movement when movement is disabled.

Commands passed:

```text
npm run build
npm run test:boombox-solo-parity
npm run test:boombox-parity
npm run test:boombox-network
npm run test:boombox-release
npm run test:boombox-browser
npm run test:boombox-solo-browser
```

The browser checks also confirmed authoritative AI-seat launch, synchronized loadout, mobile solo rendering, two-human lobby flow, synchronized turns, and the result panel.

## Limits

Generated art and sound, long-run performance, archive scaling, and broader device certification remain in the later packages defined by the remediation plan.
