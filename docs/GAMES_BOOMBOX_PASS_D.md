# Boom Box Pass D — Solo and loadout correctness

Pass D hardens the solo deployment path while keeping the authoritative server as the source of truth.

- The selected solo starting weapon is granted through the authoritative purchase path before the first turn, so the selected weapon is actually available instead of silently falling back to Cannon.
- The solo loadout bay can purchase utilities as well as weapons. Purchased utility quantities, costs, and capacity limits are synchronized through the same server purchase contract.
- Expert is available in solo setup and keeps the equipment-aware AI rules path selected.
- Solo weapon and utility selectors now include effect descriptions, prices, and economy guidance so the choices are understandable before deployment.
- Existing starter utilities remain available from the server starter inventory; additional copies are purchased normally.

Validation:

- `npm run build`
- `npm run test:boombox-d-solo`
- `npm run test:boombox-parity`
- `npm run test:boombox-outcomes`
- `npm run test:boombox-solo-parity`
