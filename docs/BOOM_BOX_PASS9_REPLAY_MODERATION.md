# Boom Box Pass 9 — Replay Timeline and Chat Moderation

## Delivered

- Completed match records now include a bounded authoritative replay timeline. Each resolved turn stores terrain, player positions, health, shields, and phase.
- The history screen now includes a step slider and battlefield preview so a completed match can be inspected turn by turn.
- The history API supports `limit` and `gameId` filters for focused operational lookups.
- Room chat now normalizes control characters, limits message rate, and rejects messages from muted users.
- The room owner can mute another commander or spectator directly from the chat stream. Moderation events are broadcast as system messages.

## Verification

- `npm run build`
- `node --check server.mjs`
- Local and live Boom Box protocol checks cover replay persistence, filtered history, secure invites, chat, and host moderation.
- Existing smoke, cribbage, and deterministic Boom Box checks remain part of the release gate.

## Boundary

Replay remains an inspection timeline rather than a video playback system. History remains public because completed Boom Box records are public game results; account-based ownership and deletion controls are future work.
