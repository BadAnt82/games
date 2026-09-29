# Boom Box Pass 8 — History, Secure Invites, and Spectator Chat

## Delivered

- Added a dedicated Match History panel to the Boom Box lobby.
- Completed matches are listed with winner, players, finish time, action count, and terrain change count.
- Added a terrain replay preview backed by the server-persisted terrain snapshot.
- Added per-room invite tokens. Only the room creator receives the token in lobby data; invite links are rejected when the token is missing or incorrect.
- Added bounded spectator and player chat (160 characters) broadcast by the room server.
- Persisted final terrain data with each completed match for later replay.

## Verification

- TypeScript/Vite production build.
- Server syntax check.
- Local and live WebSocket protocol checks cover secure invites, invalid-token rejection, chat broadcast, history persistence, terrain replay data, reconnect, spectators, AI fill, and turn authority.

## Boundary

Pass 8 keeps the existing in-memory room lifecycle and JSON history store. Authentication, moderation tools, and a full deterministic shot-by-shot replay timeline remain future work.
