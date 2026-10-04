# Boom Box Changelog

This is the handoff record for Boom Box only. Each entry records the product-facing result and the verification that accompanied it. Detailed pass reports remain in the linked `docs/BOOM_BOX_*.md` files.

## 2026-10-03 — Configurable combat economy and destruction effects (working tree)

- Award configurable end-of-round credits for confirmed enemy destructions and for each hostile commander outlasted, defaulting to 25 and 10 credits respectively, while preserving shared team wallets.
- Show the base, destruction, and survival portions of each round payout in the between-round shop and retain each source in the authoritative credit ledger.
- Add admin controls for both economy rewards plus tank-destruction blast radius/damage and shrapnel count/size/damage; active matches continue using their immutable starting balance snapshot.
- Resolve tank-destruction blast and shrapnel damage authoritatively, include the configured effect data in flight playback, and scale the visible explosion and fragments to those same controls.
- Raise intermission text/control contrast and spacing so rankings, earnings, interest, and next-round defense remain legible on the dark panel.

## 2026-10-03 — Product-aligned setup and real match flow

- Removed every starting weapon, starting utility, and pre-Round-1 store choice from the rendered setup; Round 1 now visibly and authoritatively starts with the regular cannon only.
- Rebuilt solo and multiplayer setup around the actual match decisions: commander mix up to ten total tanks, free-for-all or two-seat teams, turn-by-turn or simultaneous volleys, rounds, optional timer, wind cadence, walls, terrain, AI, interest, and between-round catalogue rules.
- Removed the conflicting multiplayer seat total, made human plus AI counts the single source of truth, and made three rounds the default so the standings/shop loop is part of the normal experience.
- Replaced the single-column setup crawl with compact grouped layouts, clear high-contrast copy, collapsed advanced rules, and a primary desktop flow whose Start button remains in view.
- Wired the solo play-type choice into the authoritative room configuration and verified complete three-seat simultaneous rounds rather than only exposing the setting.
- Verification passed: production build; authoritative rules, network, outcomes, teams, rankings/economy, persistence, recovery, parity, AI, and ten-seat scale suites; desktop and phone visual inspection; and browser acceptance through visible destruction, standings/shop, a purchase, interest, Round 2, and a complete three-seat simultaneous round.

## 2026-10-02 — Shot-first turns, round loadouts, and teams (working tree)

- Make firing the only action that ends a commander's turn; movement and consumable repair, fuel, recharge, terrain, and guidance utilities resolve between shots without forfeiting the shot.
- Start Round 1 as a level playing field with cannon-only inventories, no starter utilities, no AI shopping, and no pre-round store or loadout bay.
- Move shields and parachutes into an explicit between-round defensive loadout that activates for the next round and lasts until depleted, triggered, or the round ends.
- Keep free-for-all AI target selection distributed across every hostile tank instead of dogpiling the weakest commander.
- Add optional two-seat teams, including human/AI pairings, hostile-only targeting, shared team rankings and credits, and mirrored teammate purchases controlled by a human teammate.
- Harden projectile presentation and action acknowledgement so every accepted player or AI shot is visibly resolved before the next action begins.
- Verification passed: production build; rules, network, three-round, AI, team/free-for-all, utility, weapon, terrain, balance, persistence, recovery, identity, scale, and parity suites; ten-player mobile solo; and full browser shot/explosion/intermission flow.

## 2026-10-01 — Turn-cycle and destruction presentation (working tree)

- Define one displayed turn as one complete cycle in which every living commander acts once; sequential matches advance on seat-order wrap and simultaneous matches advance once per resolved volley.
- Reset the turn counter to Turn 1 at each new round and change variable wind/environment effects only when a complete turn finishes.
- Hide a destroyed tank at impact, hold a visible explosion in its place, and keep eliminated tanks off the battlefield for the remainder of the round.
- Verification passed: production build; sequential and simultaneous turn-cycle protocol checks; rules, persistence, AI, outcome, and scale suites; destruction/intermission browser flow; and 4/6/10-player browser matrices.

## 2026-10-01 — Ten-player solo setup (working tree)

- Raise solo setup from three rivals to nine rivals so solo and multiplayer both support ten total commanders.
- Add browser coverage that launches a human plus nine authoritative AI tanks and verifies all ten health/target entries render without horizontal page overflow.
- Verification passed: production build, ten-player mobile solo browser check, authoritative contract, and 10-seat scale checks.

## 2026-10-01 — Multi-round competition, pacing, and legibility (working tree)

- Keep authoritative matches on the battlefield after an elimination, let destroyed commanders spectate, and route every non-final round through a dedicated standings, shopping, and ready-up intermission.
- Play every configured round and rank commanders by cumulative kills, cumulative survival points, current credits, and the combined category-rank score, including shared tie ranks and prior-round elimination order.
- Add a setup interest rate; award round credits before shopping and apply interest to post-shopping unspent credits when the next round begins, with a source-separated economy ledger ready for a later kill-reward setting.
- Slow player and AI projectile presentation with frame-rate-independent playback, hold impacts long enough to read, and add visible tank-destruction effects before spectating, intermission, or final results.
- Let AI commanders spend starting credits before Round 1, continue shopping only between rounds, and choose personality-specific equipment so their visible turns are tactically distinct.
- Raise Boom Box text and control contrast across setup, match, spectator, intermission, and results views, and add browser/protocol coverage for the complete three-round loop.
- Verification passed: production build; authoritative three-round ranking, tie, shopping, interest, wall-rotation, AI, network, persistence, recovery, identity, terrain, weapon, outcome, and parity suites; plus desktop/phone intermission, general browser, 4/6/10-seat, visual, admin, and accessibility checks.

## 2026-09-30 — Match setup, battlefield scale, and turn clarity (working tree)

- Expand the live battlefield on larger screens while preserving a compact, scrollable phone layout and readable 10-commander health/status information.
- Add explicit round count, optional turn timer, per-turn or per-round wind, and fixed/random/rotating wall behavior to setup and authoritative rules snapshots.
- Reduce play types to the two player-facing choices: turn order and simultaneous fire.
- Make the cannon barrel follow the selected aim, surface exact angle/power and directional wind in the battlefield HUD, and keep projectile physics authoritative to those values.
- Show only owned weapons/utilities during a round, restrict purchases to pre-round/inter-round shop windows, and keep AI actions visible while using the same validated action path.
- Verification passed: `npm run build`, `npm run test:admin`, `npm run test:admin-browser`, `npm run test:boombox-contract`, `npm run test:boombox-e-balance`, `npm run test:boombox-outcomes`, `npm run test:boombox-network`, `npm run test:boombox-ai`, `npm run test:boombox-match-options`, `npm run test:boombox-g-scale`, `npm run test:boombox-release`, plus local browser, 4/6/10-seat matrix, mobile visual, and desktop 10-seat layout checks.

## 2026-09-30 — Admin defaults and overrides (`0f5a19e`)

- Hid the admin login form after authentication.
- Split every balance field into a default baseline and a custom override.
- Added debounced autosave when an admin edits/leaves a field.
- Added a second confirmation before changing a default baseline.
- Replaced reload wording with **Discard unsaved edits**.
- Added **Restore default values** to clear custom overrides.
- Clarified that changes apply to new authoritative Boom Box matches; active matches retain their starting rules.
- Normalized custom values against the configured baseline and hardened sane defaults for projectile counts and utility quantities/capacities.
- Browser and API regression tests cover login hiding, split values, autosave, restore behavior, validation, and persistence.

## 2026-09-30 — Balance-control clarity (`43f4d3e`)

- Added utility purchase quantity, capacity, expiration rounds, and unit-specific effect labels.
- Removed non-applicable weapon fields from catalog cards and clarified cannon behavior and spread projectile counts.

## 2026-09-30 — Explicit lobby start (`31905ec`)

- Added a clear creator-controlled start action for AI-assisted rooms.
- Kept waiting human seats in the lobby until the creator starts the configured room.

## 2026-09-30 — Reskin foundation and accessibility (`986f87b`)

- Added replaceable Boom Box theme/asset IDs.
- Added reduced-motion handling and history pagination.
- Preserved the procedural presentation while creating a seam for future generated art and skins.

## 2026-09-30 — Recovery and room lifecycle (`e59ed7d`)

- Hardened reconnect and stale-room handling.
- Added recovery behavior for abandoned rooms and persisted active-room/history state.

## 2026-09-30 — Authoritative admin balance plumbing (`7a366da`)

- Connected the admin balance model to new Boom Box room rules.
- Wired economy, tank, terrain, timing, AI, weapon, and utility values into authoritative simulation paths.

## 2026-09-30 — Solo and loadout corrections (`f06ff47`)

- Corrected starting weapon grants and solo utility purchasing.
- Added clearer catalogue explanations and Expert difficulty handling.

## 2026-09-30 — Explicit multiplayer lobby (`f7339d2`)

- Replaced implicit AI seat filling with explicit human and AI counts.
- Enforced 1–10 total commanders, creator ownership, joinable-room filtering, cancellation, and waiting-room states.

## Earlier completed foundations

- Shared solo/multiplayer rules and authoritative room protocol.
- Deterministic terrain, projectile resolution, collision, damage, shields, armor, fall damage, utilities, economy, eliminations, placements, replay records, and history.
- Multiplayer firing modes, synchronized flight bundles, reconnect/session recovery, spectator support, moderation, and result statistics.
- Browser coverage for core multiplayer, multi-seat layouts, recovery, replay, reduced motion, keyboard focus, and mobile paths.

## Current known follow-up work

- Confirm persistent `/app/data` storage and a production container-replacement recovery test.
- Point the Coolify health check at `/api/boombox-health`.
- Finish any remaining human-facing browser matrix gaps and long-running multi-seat coverage.
- Review terrain depth/material gameplay, full AI equipment strategy, and remaining presentation work (original art, effects, audio, mute controls, performance).

## Changelog rule

Future Boom Box work must add an entry here with the date, commit, scope, user-visible behavior, and verification commands. Keep other games out of this file.
