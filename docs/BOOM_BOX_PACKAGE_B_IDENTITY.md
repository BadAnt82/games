# Boom Box Package B — identity and room lifecycle

**Verified:** 2026-09-30  
**Repository commit:** `0db20a5`

## Result

Package B is complete. Display names and network identity are now separate, and room/session lifecycle rules are explicit.

## Implemented contract

- The browser creates a stable random device identity in `localStorage` and sends that as `userId`.
- The saved player name remains the display name sent in room configuration, joins, invites, and chat.
- A connected session cannot be taken over by another socket, even when it presents the same user ID and session token.
- A disconnected seat can reclaim its session with the saved session token.
- A user cannot join or create a second active room while already belonging to another room.
- Owner cancellation clears all memberships and removes the room from later lobby responses.
- Started-room spectators can enter and leave without becoming seat members.
- New room IDs skip both active-room IDs and every historical ID.

## Historical ID repair

At startup, duplicate historical IDs are migrated deterministically. The newest record retains the original ID; older records receive a stable suffix such as `BB-1044-legacy-1`. The live archive now shows the former duplicate `BB-1044` pair as:

- `BB-1044` — `Package A completed …`
- `BB-1044-legacy-1` — `NR-…`

The same migration repaired the other duplicate IDs found in the archive. New IDs are allocated above the highest numeric historical ID and skip any remaining collision.

## Verification

Local checks passed:

```text
npm run build
npm run test:boombox-identity
npm run test:boombox-persistence
npm run test:boombox-network
npm run test:boombox-browser
```

Live Package B check passed with two devices using the same display name: first room `BB-1082`, replacement room `BB-1083`, connected-session takeover rejected, reconnect succeeded, cancellation cleared membership, spectator entry/exit succeeded, and the replacement room was canceled after verification.
