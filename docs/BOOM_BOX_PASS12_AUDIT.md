# Boom Box Pass 12 audit against Passes 10 and 11

## Audit result

The Pass 10 authoritative state contract and Pass 11 physics core remain intact. Local and live protocol checks pass, including turn authority, resolution locking, replay/history, purchases, MIRV child resolution, reconnect, AI fill, spectators, and moderation.

This audit identified a short Pass 12.1 hardening pass. That cleanup is now complete; see `BOOM_BOX_PASS12_1_CLEANUP.md` for the implementation and verification record.

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

Pass 12.1 is complete. The same local checks pass, and Pass 13 can begin. Pass 13's AI equipment decisions and teaching mode should build on the now-visible server catalogue. Solo preview parity remains explicitly tracked as a Pass 13 item.

## Closure mapping

The five cleanup findings above are closed by the Pass 12.1 changes: multiplayer catalogue controls and purchases are visible, network stock is hydrated from snapshots, terrain removal clears the solid mask, stale Pass 4 copy is gone, and solo preview status is explicit. Pass 10 metadata was corrected in the prior audit commit.
