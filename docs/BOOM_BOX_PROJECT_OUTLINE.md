# Boom Box Project Outline

**Canonical project:** `games.badantproductions.com`

**Repository:** `BadAnt82/games.git`, branch `master`

**Current commit:** `0f5a19e` — Harden Boom Box admin defaults and overrides

**Purpose:** Build a polished browser artillery game inspired by the early Scorched Earth formula. Boom Box supports solo and multiplayer play, deterministic terrain and shots, explicit human/AI seat planning, a server-authoritative match service, configurable equipment, replay/history, and replaceable presentation assets.

## Current product contract

- The Games home screen opens Boom Box in **Single player** or **Multiplayer** mode.
- Multiplayer creation requires at least one human (the creator), supports explicit AI seats, and allows 2–10 total commanders.
- Human seats wait in a dedicated lobby. The creator starts the match; full and started rooms are not offered as joinable rooms.
- The server owns room membership, turn authority, terrain, projectiles, damage, inventories, credits, utilities, eliminations, placements, replay events, and persistence.
- Solo uses the same authoritative room/rules protocol as multiplayer.
- The current catalogue contains 19 weapons and 8 utilities. Weapon and utility fields are exposed through the Games admin dashboard.
- Each match receives a rules snapshot when it starts. Later admin edits affect new matches, not an active match.
- The Games admin is isolated from player-name identity. The bootstrap email is `ant1982@gmail.com`; the password is created on first setup.

## Authoritative code map

| Area | Files |
| --- | --- |
| Client game and UI | `src/boom-box.ts`, `src/main.ts`, `src/styles.css`, `index.html` |
| Shared catalogue and themes | `boombox-rules.mjs` |
| WebSocket/API server and persistence | `server.mjs` |
| Production build | `Dockerfile`, `package.json`, `dist/` (generated) |
| Automated checks | `scripts/boombox-*.mjs`, `scripts/games-admin-*.mjs` |
| Historical plans and pass reports | `docs/BOOM_BOX_*.md`, `docs/GAMES_ADMIN_*.md` |

## Configuration model

The admin editor stores two layers in the server-side Games admin configuration:

1. **Default baseline** — the fallback starting point for a field.
2. **Custom override** — the active value used for new Boom Box matches.

The effective match configuration is the merged result. Custom fields autosave when edited. Changing a default baseline requires a second confirmation because it changes the future fallback. **Restore default values** clears all custom overrides and returns the effective configuration to the baseline. **Discard unsaved edits** reloads the saved two-layer document.

The persisted file is `data/games-admin-config.json` in the running service. It is intentionally not committed to source control.

## Verification baseline

Before resuming feature work, run:

```text
npm run build
npm run test:admin
npm run test:admin-browser
npm run test:boombox-e-balance
npm run test:boombox-outcomes
```

For a broader release check, also run the Boom Box determinism, contract, network, lobby, solo, weapon, terrain, persistence, recovery, browser, and visual scripts listed in `package.json`.

The live endpoints are:

- Public app: `https://games.badantproductions.com/`
- Boom Box health: `https://games.badantproductions.com/api/boombox-health`

## Open work and next decision

The current implementation is a tested production prototype. Before calling it the finished public game, review these items in order:

1. Verify Coolify has persistent storage for `/app/data`, then perform a controlled container replacement with one active room and one completed history record.
2. Make the deployment health check call `/api/boombox-health` rather than only checking the static home page.
3. Complete any remaining browser coverage for simultaneous/synchronous firing, spectator and reconnect UI, cancellation, long multi-seat play, and mobile layouts.
4. Finish terrain-material gameplay, chained support/fall behavior, and full AI equipment strategy where the product contract requires it.
5. Add the replaceable Boom Box art, projectile and impact effects, sound, mute/low-effects controls, and performance review.

Do not create a new numbered pass by assumption. For the next change, record the bounded scope, affected rules/state/messages/UI, and its acceptance test in the changelog before implementation.

## Resume checklist

1. Read this file and `docs/BOOM_BOX_CHANGELOG.md`.
2. Check `git status` and confirm the branch is `master`.
3. Run the verification baseline above.
4. Review the latest open-work item before changing code.
5. Update the changelog in the same commit as any Boom Box change.
