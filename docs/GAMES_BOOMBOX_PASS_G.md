# Boom Box Pass G — reskin foundation, accessibility, and history pagination

Pass G makes the presentation layer replaceable without changing authoritative gameplay.

## Theme and asset IDs

`boombox-rules.mjs` now exports `BOOM_BOX_THEME_CATALOG` and `boomBoxThemeIdForTerrain`. Each theme carries a stable ID, terrain mapping, replaceable background/terrain/tank/projectile asset IDs, and palette values. Server rule snapshots include `themeId`; the client applies the same theme to local and network matches. The current art remains procedural/vector, while the IDs provide the seam for future generated art or player skins.

## Reduced motion

Boom Box detects `prefers-reduced-motion`, publishes `data-reduced-motion` on the document, disables visual effects and pauses playback, and updates the presentation control label. CSS also removes transitions and animations under both the system preference and the explicit document flag. A user can still use the controls when the system preference is not active.

## Match history pagination

`GET /api/boombox-history` now accepts `limit` and `offset` and returns `total`, `hasMore`, and `nextOffset`. The archive loads 20 records at a time, appends older records with **Load more history**, and reports the visible count. Replay detail requests remain scoped by game ID.

## Validation

- `npm run build`
- `npm run test:boombox-g-reskin`
- `npm run test:boombox-contract`
- `npm run test:boombox-persistence`
- `npm run test:boombox-f-recovery`
