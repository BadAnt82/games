# Boom Box Full Readiness Audit

**Audit date:** 2026-09-30  
**Target:** `https://games.badantproductions.com/`  
**Scope:** the Scorched Earth baseline, the content-completion acceptance matrix, Passes 10–24, the current repository, and the deployed service.

## Verdict

Boom Box is a working multiplayer artillery prototype with an authoritative room service. Its lobby, seat plans, turn authority, reconnect flow, AI fill, spectators, chat moderation, purchases, firing modes, deterministic terrain, result placements, replay records, and persistence code are present and passing the existing automated checks.

It is **not yet ready for an unrestricted human test of the proposed finished game**. The remaining work is concentrated in four areas:

1. Production durability has not been proven through a real Coolify container replacement.
2. Single-player is a separate, reduced local simulation rather than the same rules implementation used by multiplayer.
3. Several important player-facing flows have protocol tests but no browser acceptance coverage.
4. The original presentation package (art, effects, and sound) is still absent.

The prior reports correctly closed the four Pass 22 conformance findings. They did not close the broader content-completeness items in the acceptance matrix. The older “Pass 24 complete” wording should therefore be read as software-side hardening complete, not finished-game scope complete.

## Evidence collected

### Repository checks

All of these passed on the current checkout:

- `npm run build`
- `node --check server.mjs`
- `npm run test:boombox`
- `npm run test:boombox-network`
- `npm run test:boombox-release`
- `npm run test:boombox-parity`
- `npm run test:boombox-persistence`
- `npm run test:cribbage`
- `npm run test:cribbage-network`
- `npm run test:smoke`
- `git diff --check`

The release matrix covers malformed payloads, setup and started-room restart recovery in a local process, 2/4/6/10-seat rules, setup normalization, scenery, movement/fuel, deadlines, disconnect takeover, catalogue filtering, synchronous and simultaneous protocol behavior, atomic persistence, and session continuity.

### Live checks

- The deployed application reports `running:healthy` in Coolify.
- The live `/api/boombox-health` endpoint reported `status: ok`, rules version 2, writable history and active-room stores, and a completed match after the acceptance run.
- The live `/api/boombox-rules` endpoint reported the versioned 19-weapon catalogue and utility catalogue.
- `npm run test:boombox-browser` passed against the live URL for a two-browser, two-human match: setup review, join, synchronized turns, and result panel.
- The live WebSocket matrix passed lobby, invite validation, turn authority, action validation, purchases, reconnect, AI fill, spectator state, chat moderation, replay timeline, and history persistence.

These checks prove the current behavior. They do not prove every exposed rule or every viewport.

## Remaining gaps

### P0 — resolve before calling the game human-test ready

| Gap | What the audit found | Why it matters | Required exit evidence |
| --- | --- | --- | --- |
| **Coolify data durability** | The application writes history and active rooms under `/app/data`. The live health endpoint proves that the running container can write there, but the Coolify application record does not independently show a persistent volume mapping. The local restart test uses a temporary host path, not the deployed container. | A container replacement or redeploy can erase active rooms and match history. Reconnect and replay are not dependable if the host storage is ephemeral. | Declare a persistent `/app/data` mapping in Coolify, deploy it, and perform a controlled restart/replacement check that restores one active room and one completed history record. |
| **Single-player rules parity** | `src/boom-box.ts` contains a local approximation. Solo AI fires cannon-only and uses a simple aim heuristic. Solo does not share the server simulation, does not implement coordinated firing modes, and several utilities are only consumed and described without applying their real effect (`fuel-canister`, `guidance-kit`, `turret-upgrade`, and `parachute` in the local path). Solo bouncing resolves at the edge; terrain impact is not a continuing bounce. Spread weapons create extra craters locally rather than showing separate child projectile flights. | A player can select “Single player” and receive materially different rules from multiplayer. This is a product correctness problem for the stated single/multiplayer game, not merely a visual difference. | Either route solo through the shared authoritative simulation or explicitly redefine solo as a limited practice mode. If it remains a full mode, add matching rules, inventory, utility, AI, elimination, and result behavior. |
| **Human-facing acceptance coverage** | The browser test covers one desktop 2-seat sequential match. There is no browser acceptance run for solo completion, AI-seat setup and launch, all-human 4/6/10 seats, synchronous or simultaneous UI, a defeated player watching the remaining battle, live history/replay controls, reconnect from the UI, or mobile portrait and landscape layouts. | Passing protocol tests does not prove that controls, copy, scrolling, or state transitions are usable to a person. These are the paths a human tester will exercise first. | Add a browser matrix for the flows above at desktop, phone portrait, and phone landscape sizes. A run must assert visible state, control enablement, scrolling, and final results. |

### P1 — complete before describing the build as the finished Boom Box scope

| Gap | Detail |
| --- | --- |
| **Rules and terrain depth** | Terrain materials are mainly visual or solid-mask changes. Smoke does not yet provide a visibility/gameplay effect; buried tanks have no clear digging/freeing resolution; material modifiers and collapse chains remain simplified. These were listed in the reference acceptance matrix. |
| **AI equipment strategy** | Server AI can purchase a weapon and use repair, shields, or parachute in selected situations. It does not make meaningful decisions about fuel, guidance, turret upgrades, terrain tools, or distinct personalities beyond thresholds and shot sampling. The automated AI check proves one MIRV purchase/action path, not the full catalogue or utility strategy. |
| **Projectile presentation** | The server resolves spread/MIRV children, but the client stores one `boombox-flight` path at a time. A human may see only the last child path even though multiple impacts were recorded. The solo client also does not animate child projectiles independently. |
| **Replay completeness** | History stores terrain/player snapshots and a recent event slice. The replay canvas shows terrain and tank dots plus text events; it does not replay projectile trajectories, child effects, terrain-material visuals, or utility animations. This is an inspection timeline, not a full match playback. |
| **Result and statistics accuracy** | Multiplayer placements and elimination order are shown. The server state does not populate a target’s `damageTaken` statistic, so damage-taken reporting is not complete. Solo results do not show an elimination order or ranked standings. |
| **Economy and utility teaching** | Multiplayer purchases are authoritative, but the shop and in-match cards do not yet explain inventory capacity, effect timing, or the strategic difference among all utilities. Solo’s loadout bay cannot purchase utilities and starts with only the selected utility. |
| **Presentation package** | The battlefield uses canvas primitives and CSS. No original Boom Box tank/terrain/weapon art set, impact animations, or sound package has been added. This remains a direct miss against the stated “AI-generated art and effects” goal and Pass 15’s exit gate. |
| **Device and accessibility proof** | Responsive CSS and reduced-motion rules exist, but no automated viewport run has verified 2–10 seat setup overflow, touch aiming, landscape scrolling, focus order, or screen-reader announcements. The canvas has a label and description, but most dynamic match state is still visual/text-only rather than structured for assistive technology. |
| **Name-only identity edge cases** | The site intentionally uses the saved player name as the multiplayer identity. Two devices using the same name share an identity key and can be blocked from separate rooms or reclaim the wrong membership. Human test instructions must require unique names, or the client needs a separate per-device identifier while continuing to display the entered name. |
| **Operational health signal** | Coolify is checking `GET /` for HTTP 200. That proves the static shell responds, but it does not prove the API store is writable or that the WebSocket room service is available. The Boom Box health endpoint exists but is not the configured deployment health check. |

### P2 — polish and scale backlog

- Add history pagination or a compact record format before retaining many 960-cell terrain snapshots and event arrays.
- Decide whether public match history should expose full player names and action logs without an account or room token.
- Add explicit loading, reconnecting, and server-error states for history, room creation, and replay loading.
- Add a rules/version migration plan before changing the persisted snapshot schema.
- Add performance measurements for 10 seats, large spread weapons, repeated terrain mutations, and long AI-vs-AI matches.

## Acceptance matrix status

| Acceptance requirement from the content plan | Status |
| --- | --- |
| Configure relevant multiplayer rules | **Implemented; protocol-tested.** Browser review still needs coverage for each option. |
| Stationary and fuel-powered tanks | **Implemented in sequential server rules;** broader human/UI coverage needed. |
| Distinct tested effect for every weapon and utility | **Not complete.** Catalogue exists, but deterministic fixtures and UI tests do not cover every effect. |
| AI buys and uses equipment under the same rules | **Partially complete.** Weapon purchase and selected utilities are covered; full strategy is not. |
| Projectile resolves before next turn | **Implemented and protocol-tested.** Child-flight presentation still needs work. |
| Terrain removed, added, collapsed, and used as cover | **Partially complete.** Core masks and falls work; material modifiers and digging/freeing are simplified. |
| Defeated player watches remaining AI battle | **Protocol path exists; browser path untested.** |
| Elimination order and final placement visible and persisted | **Multiplayer implemented;** solo and statistics remain incomplete. |
| Pause and 1x/2x/4x in live matches and replays | **Controls exist;** full browser verification is missing, and replay is snapshot-based. |
| Reconnect and server restart without state loss | **Local process test passes;** production volume/replacement test is still open. |
| 2–10 seat matrix with mobile overflow handled | **Server matrix passes;** mobile UI matrix is unproven. |
| Original Boom Box art, sound, and effects | **Not implemented.** |

## Recommended next work packages

These are recommendations from this audit, not a newly approved numbered pass. Keeping them unnumbered avoids repeating the earlier pass-number drift.

### Work package A — production recovery gate

1. Configure and document a persistent Coolify volume for `/app/data`.
2. Change the deployment health check to call `/api/boombox-health` and require `status: ok` (or use a small server-side health command that fails correctly).
3. Deploy, record the commit and storage mapping, then run a controlled replacement test with an active room and a completed match.
4. Confirm that a failed write is surfaced instead of silently leaving state only in memory.

**Exit:** production room/history recovery is demonstrated, and the live health signal checks the actual service.

### Work package B — simulation and content parity

1. Choose one rule engine for solo and multiplayer, or explicitly label solo as a practice subset.
2. Add deterministic fixtures for every exposed weapon and utility, including child projectiles, bounce, napalm ticks, smoke, terrain add/remove, shields, parachute, fuel, guidance, and turret upgrades.
3. Expand AI tests to each utility family, equipment purchases, elimination continuation, and all four difficulty labels.
4. Record target damage, shield absorption, terrain changes, elimination reason, and final standings consistently.

**Exit:** every item in the catalogue has a real effect, a visible explanation, and a matching automated check.

### Work package C — player-facing browser matrix

1. Exercise solo start, loadout, utility use, AI turns, elimination, and result flow.
2. Exercise multiplayer AI seat plans, all-human 2/4/6/10 seats, synchronous and simultaneous preparation, spectator takeover, and reconnect from the actual UI.
3. Exercise history selection, replay play/pause/speed controls, and result standings.
4. Run the same matrix at desktop, phone portrait, and phone landscape sizes, including setup overflow and scroll behavior.
5. Add assertions for keyboard focus, dynamic status announcements, and reduced-motion behavior.

**Exit:** a human tester can complete every advertised entry path without relying on developer tools or protocol scripts.

### Work package D — finished presentation

1. Add original AI-generated title treatment, tank and terrain art, weapon/projectile silhouettes, explosions, smoke, napalm, shields, and result art.
2. Add original sound effects with a mute/low-effects option.
3. Make the replay show the same visual language as a live match, including child projectiles and material effects.
4. Re-run the browser matrix after art/audio integration to catch layout and performance regressions.

**Exit:** the game meets the declared Boom Box presentation goal instead of presenting as a readable prototype.

## Recommended human-test gate

Begin controlled human testing only after Work packages A and C pass. Work package B is required before claiming the solo mode and full Scorched Earth feature scope are complete. Work package D can be scheduled before or after the first mechanics test only if the test invitation clearly labels the current build as a mechanics preview.

No new numbered pass is being assigned by this audit. The next decision is whether to approve Work package A, B, C, or D as the next bounded implementation unit.
