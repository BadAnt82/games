# Boom Box Pass 2 — Entry and Lobby Prototype

## What shipped

Pass 2 adds the complete front door for Boom Box inside the Games app:

- A dedicated Boom Box game tile with its own retro-futurist visual treatment.
- A clear mode choice between single player and multiplayer.
- A responsive multiplayer war room with separate **Your rooms** and **Available rooms** sections.
- Room cards that show the creator, room code, connected seats, terrain preview, turn pace, and waiting/ready state.
- Join-room behavior, full-room handling, refresh feedback, and creator cancellation.
- A three-step create flow: Basics, Players, and Review.
- Player-name prefill from the Games device name, seat limits from 2–6, terrain previews, turn pace, and optional AI fill.
- Mobile and landscape layouts that keep the lobby scrollable and hide the underlying game HUD while the lobby is open.

## Deliberate boundary

This pass is a local interaction prototype. Rooms are held in the current browser session and are labeled **Local prototype**. No multiplayer server, matchmaking, persistence, or artillery simulation is claimed yet. Pass 3 owns the first playable artillery slice; the authoritative room service remains scheduled for the multiplayer hardening phase.

## Verification

- `npm run build`
- `npm run test:smoke`
- `npm run test:cribbage`
- `npm run test:cribbage-network`
- Playwright smoke flow at desktop, phone, and landscape sizes: open Boom Box, choose multiplayer, verify three available rooms and creator names, join a room, create a room through all three steps, and verify the created-room card.

## Reassessment

Pass 2 is ready to exit as a UX prototype. Keep the nine-pass plan and move to Pass 3: a single-player artillery vertical slice with aiming, wind, firing, collision, terrain damage, turn flow, and a round-end state. Before calling multiplayer ready, harden the room state behind a server-authoritative API and repeat the lobby flow with two real browser sessions.
