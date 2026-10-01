# Games Admin — Pass B

**Scope:** typed global balance configuration and the authenticated admin dashboard.

## Implemented

- Added a persistent versioned configuration document at `data/games-admin-config.json`.
- Added authenticated `GET` and `PUT` endpoints at `/api/admin/config`.
- Added server-side normalization and range validation for every editable value.
- Added dashboard tabs for:
  - Economy: starting credits and movement fuel values;
  - Tank: health, shield, armor, and fall-damage values;
  - Terrain: gravity, wind, collapse, and smoke values;
  - AI: four difficulty accuracy values;
  - Timing: turn timeout, projectile step, AI delay, and fast-forward multiplier;
  - Weapons: cost, capacity, damage, radius, depth, speed, and bounce fields where applicable;
  - Utilities: cost, capacity, and effect amount fields where applicable.
- Kept catalog labels and descriptions beside each editable row/card.
- Added sticky tabs and scrollable admin layout so the long weapon and utility catalogs remain usable on desktop and mobile.
- Added atomic config writes and no-password exposure in all responses.

## Verification

- `npm run test:admin` passed bootstrap, session handling, typed defaults, validation, and config persistence.
- `npm run test:admin-browser` passed authenticated bootstrap, dashboard tabs, catalog rendering, numeric editing, save status, and persisted value retrieval.
- `npm run build` passed.

Pass E will connect these stored global values to the authoritative game simulation. This pass intentionally establishes the configuration model and editing surface first.
