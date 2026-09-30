# Boom Box Package E — browser, multiplayer, and device acceptance

Package E certifies the advertised browser entry paths against the live deployment at `https://games.badantproductions.com/`.

## Evidence

- `npm run build` — TypeScript and Vite production build passed.
- `node scripts/boombox-e-acceptance.mjs` — live UI acceptance passed for the 2-seat all-human room, all three firing modes, creator-name visibility, real launch, portrait/landscape scrolling, focus, and overflow.
- `npm run test:boombox-browser` — two-human desktop create, join, synchronized turn, and result panel passed.
- `npm run test:boombox-browser-matrix` — 4, 6, and 10 human-seat desktop matrix plus reduced-motion landscape/focus checks passed.
- `npm run test:boombox-browser-pass5` — four-human long run, spectator view, reconnect resume, and owner cancellation passed.
- `npm run test:boombox-solo-browser` — authoritative AI-seat setup, synchronized loadout, mobile match, and resolved turn passed.
- `node scripts/boombox-visual-check.mjs` — mobile canvas sizing, complete weapon selector, replay accessibility, and history replay passed (20 records available during the check).
- Existing protocol/release checks cover malformed room messages, invalid room actions, reconnect/session recovery, spectator isolation, cancellation, room errors, replay timeline, and the 2/4/6/10 seat rule matrix.

## Test-harness hardening

The new E acceptance script and the visual replay check use the installed Chrome executable when available, with Playwright’s bundled browser as a fallback. This keeps Windows browser acceptance repeatable when the bundled headless process is denied by local process policy; it does not change runtime behavior.

## Result

The Package E exit evidence is complete. Browser acceptance, device layout, multiplayer room lifecycle, spectator/reconnect paths, replay/history, and live lobby coverage are recorded here. Gameplay rule changes, visual/audio production work, and scale/archive measurements remain in Packages D, F, and G respectively.
