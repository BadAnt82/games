# Boom Box Pass 12 audit against Passes 10 and 11

## Audit result

The Pass 10 authoritative state contract and Pass 11 physics core remain intact. Local and live protocol checks pass, including turn authority, resolution locking, replay/history, purchases, MIRV child resolution, reconnect, AI fill, spectators, and moderation.

The project should **not move directly to Pass 13 yet**. A short Pass 12.1 hardening pass is required to close UI parity and a few catalogue semantics before AI work begins.

## Checks that passed

- Versioned rules still arrive with every started room.
- Money, inventory, utilities, action sequence, eliminations, placements, and replay data still serialize from the server.
- Pass 11 terrain height, solid mask, material, swept collision, crater mutation, fall handling, and resolution lock remain active.
- Duplicate fire actions and duplicate purchases are rejected.
- Purchased stock is paid for once and then consumed when fired.
- Existing shared smoke and Cribbage multiplayer checks still pass.
- Live `games.badantproductions.com` protocol and HTTP health checks pass.

## Required Pass 12.1 cleanup before Pass 13

1. **Multiplayer loadout UI:** the server supports atomic purchases, but multiplayer clients do not yet expose a purchase panel or utility selector. A player can only reach the new purchase path through a protocol message.
2. **Network catalogue parity:** `applyNetworkSnapshot` still uses a legacy hardcoded fallback for the client loadout and always selects the repair kit. Map the server catalogue and utility inventory into the controls so every purchased item is selectable and its stock is visible.
3. **Solo/network effect parity:** the server has distinct MIRV, bounce, piercing, laser, napalm, smoke, filler, remover, and guidance behavior. The solo preview still uses its older simplified projectile resolver for several of these items. Either route solo through the same simulation model or label the preview as a local approximation before Pass 13.
4. **Terrain remover semantics:** the remover changes height but does not yet clear the solid mask or expose a true empty/dug material. Add the support transition and render state before treating terrain removal as complete.
5. **Presentation drift:** Boom Box panels still contain “PASS 4” labels and setup copy. Replace these with product language so the UI does not advertise an obsolete implementation phase.
6. **Pass 10 metadata:** the Pass 10 report still says `Commit: pending`; update it to the actual commit reference for a clean audit trail.

## Recommendation

Complete Pass 12.1 first, rerun the same local/live matrix, and then begin Pass 13. Pass 13’s AI equipment decisions and teaching mode depend on players being able to see and use the same catalogue that the server already understands.

