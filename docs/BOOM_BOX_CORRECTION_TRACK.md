# Boom Box Correction Track

**Purpose:** close the gaps found by the read-only readiness audit without silently changing the game contract.

## Correction pass 1 — authoritative flight resolution

**Status: complete**

- Simultaneous and synchronous shots are sent as one flight bundle.
- Every connected commander receives the same bundle identifier.
- The server keeps the room resolving until all connected commanders acknowledge the bundle, with a bounded safety timeout.
- Disconnects remove a seat from the acknowledgement requirement.
- A restart during the visual flight phase resumes at the next turn instead of leaving a room stuck in `flight`.
- Release coverage verifies that neither supported prepared mode advances before acknowledgements.

## Correction pass 2 — replay and solo authority

**Status: complete**

- Fire events retain downsampled child paths for replay.
- Replay renders projectile trajectories as well as impact markers.
- AI can reposition when movement is enabled and can consume or purchase the utility families exposed by the rules catalogue.
- Solo mode now creates an authoritative AI room, synchronizes the selected loadout, and uses the same server turn, inventory, utility, elimination, and flight protocol as multiplayer.
- Added a mobile solo browser check covering loadout synchronization and one resolved turn.

## Verification

The current checkout passes:

- Build and TypeScript checks
- Determinism, shared contract, and parity checks
- 19-weapon matrix and 9-utility outcome checks
- Network, release, and restart persistence checks
- Two-human browser acceptance
- Mobile solo browser acceptance
- Mobile visual and replay accessibility check

## Remaining correction work

The game is materially closer to the desired scope, but this track is not the final release gate yet. Remaining work is a separate pass for:

1. Browser coverage for 4/6/10 human seats, synchronous/simultaneous UI, spectator viewing, reconnect, cancellation, landscape, keyboard focus, and reduced motion.
2. Full AI strategy fixtures for every utility and difficulty, including terrain tools, fuel, guidance, turret upgrades, and elimination continuation.
3. Terrain edge behavior and result-stat completeness.
4. Original Boom Box art, effects, sound, mute/low-effects controls, and final performance review.

The next implementation should be an explicit correction or presentation pass from this list; do not treat the current result as the unrestricted finished-game release.
