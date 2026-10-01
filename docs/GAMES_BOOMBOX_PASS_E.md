# Boom Box Pass E — Gameplay effect plumbing

Pass E connects the Games admin balance model to new authoritative Boom Box rooms and closes the remaining effect gaps.

- Global economy, tank, terrain, AI, and timing values are copied into each room's versioned rules snapshot.
- Weapon and utility balance overrides apply to the authoritative catalogs used for purchases and effects.
- Starting credits, health, movement fuel, shield caps, gravity, wind, turn timeout, projectile step, and AI timing/accuracy are wired into simulation.
- Direct and splash damage are resolved separately, including armor reduction, shields, terrain material, and smoke cover.
- Fall damage uses the configured threshold, multiplier, and base; smoke duration, napalm burn damage, and reinforced-cover multipliers are configurable.
- The admin catalog exposes projectile count, spread, burn, smoke, and reinforced-cover controls alongside cost, damage, radius, and capacity.

Validation:

- `npm run build`
- `npm run test:boombox-e-balance`
- `npm run test:boombox-d-content`
- `npm run test:boombox-outcomes`
- `npm run test:boombox-solo-parity`
