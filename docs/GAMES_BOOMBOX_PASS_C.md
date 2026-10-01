# Boom Box Pass C — Explicit multiplayer lobby

Pass C replaces automatic room filling with an explicit lobby contract.

- Room creation records human and AI seat counts (one or more human commanders, at most ten total).
- The creator is always the first human seat. AI seats are explicit and are filled only after the creator presses **Start match**.
- A waiting room remains in setup until every configured human seat is connected. Joining the final human seat does not start the match by itself.
- The lobby identifies the room creator and reports human readiness separately from AI seats.
- A waiting commander can leave and release the seat for another player. The creator can cancel a waiting room.
- Finished rooms are excluded from active created/available lobby lists and finished records are not restored as active rooms after restart.

The browser create flow now shows human and AI selectors, a read-only seat plan, and a review row explaining the creator start gate.

The Games admin page also has a top-left game selector populated with all current Games titles. Boom Box displays its dashboard; other games display an intentionally empty placeholder for future game-specific controls.

Validation:

- `npm run build`
- `npm run test:boombox-c-lobby`
- `npm run test:boombox-network`
- `npm run test:boombox-ai`
- `npm run test:admin`
- `npm run test:admin-browser`
