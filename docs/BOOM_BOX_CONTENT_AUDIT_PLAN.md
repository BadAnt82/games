# Boom Box Content Audit and Completion Plan

**Audit date:** 2026-09-29  
**Target:** `games.badantproductions.com`  
**Reference:** [BOOM_BOX_REFERENCE.md](./BOOM_BOX_REFERENCE.md)

## Executive finding

Boom Box is currently a working multiplayer artillery prototype with a polished lobby, authoritative room service, reconnects, spectators, chat moderation, replay history, and a small single-player loadout. It is **not** yet a near-complete Scorched Earth feature match.

The project completed much of the network and operations work that was scheduled for Passes 5, 6, 8, and 9. The content work scheduled for Passes 4, 7, and 8 was only partially implemented. The old â€œPass 9â€ label describes replay and moderation work, not a release-complete game.

The correct next step is a content and rules completion track. More lobby features should wait until the simulation, weapons, economy, AI, and end-game model are complete.

## Current implementation compared with the reference

| Reference capability | Current state | Gap | Completion requirement |
| --- | --- | --- | --- |
| Configurable player count | 2–10 seats | 7–10 seat layout is now available in the setup wizard; mobile layout still needs dedicated validation | Keep the rules clamp and validate the wide setup on mobile |
| Human and computer seats | Human room seats plus AI fill | AI fill starts a room, but AI is cannon-only | Every AI seat uses the same legal action, inventory, utility, and damage rules as humans |
| Sequential firing | Implemented | Projectile resolution is simplified and server pacing is not configurable | Lock the complete resolution state machine and block the next action until it finishes |
| Synchronous firing | Implemented | Prepare/release is server-authoritative and covered by the Pass 17 release matrix | Preserve the protocol while hardening disconnect and timeout behavior |
| Simultaneous firing | Implemented | Coordinated launch and deterministic ordering are covered by the Pass 17 release matrix | Preserve the protocol while hardening collision and disconnect behavior |
| Angle, power, gravity, wind | Versioned rules with setup controls | Human turn deadlines and movement remain unimplemented | Add deadlines and movement without regressing the rules contract |
| Destructible terrain | Height array and craters | No material mask, burial, support, collapse, or fall resolution in multiplayer | Add deterministic terrain cells, swept collision, support checks, burial, collapse, and fall damage |
| Dirt add/remove tools | One simplified terrain lift | No dirt material, bury/expose rules, or tank digging behavior | Implement add/remove terrain as first-class effects |
| Tank movement and fuel | Stationary tanks | Fuel and movement are absent | Decide whether near-parity requires movement; recommended optional movement setting with fuel |
| Boundaries | Stop, bounce, or wrap rules are configurable and server-clamped | Edge behavior still needs broader projectile and mobile validation | Expand deterministic boundary cases in match-flow hardening |
| Economy | Solo-only local credits | Multiplayer server does not own money, prices, purchases, or limits | Make economy server-authoritative and atomic |
| Weapons | Six simplified IDs | No real MIRV child projectiles, persistent effects, bounce, lasers, smoke, napalm, or exact weapon behaviors | Build a data-driven launch catalogue with independent simulation and tests |
| Utilities | Repair, shield, terrain lift | Multiplayer utility inventory and limits are not authoritative | Add shields, parachute/fall protection, fuel, repair, guidance, and inventory rules |
| AI | Local difficulty profiles; network AI uses cannon | No upgrades, utility use, terrain risk analysis, or AI personalities | AI must choose legal equipment and use the same action path as humans |
| Elimination | Alive flag and winner | No elimination order, placement, or spectator teaching state | Record elimination sequence and calculate final placements |
| Human elimination | AI room can terminate when no human remains | This stops the AI showcase early | Let eliminated humans watch until one tank remains |
| AI pacing | Fixed server delays | No pause or fast-forward | Add 1Ã—/2Ã—/4Ã— playback, pause, and a readable default speed |
| Match setup | Reviewable wizard exposes seats, firing, gravity, wind, boundaries, money, catalogue, pace, AI, and terrain | Movement and environmental events remain intentionally gated until their simulation exists | Complete the remaining match rules before exposing those controls |
| Environmental content | Three terrain profiles | No meteor events, scenery, material differences, or environmental modifiers | Add optional events after core simulation is stable |
| Presentation | Canvas primitives and CSS panels | No complete original art, effects, sound, or content-specific UI | Produce the original Boom Box visual and audio set |
| Replay | Terrain timeline and match history | Inspection timeline only; no live speed controls or full event playback | Replay every authoritative event with the same speed controls |
| Persistence | Completed history persists | Active rooms are in memory and disappear on restart/deploy | Persist active room snapshots and reconnect metadata |

## What â€œnear replicaâ€ means for Boom Box

The target is feature and rules parity with the Scorched Earth baseline: configurable artillery combat, destructible terrain, a large equipment catalogue, an economy, computer opponents, and multiple firing modes.

The implementation must remain original. We should not copy the original executable, source, artwork, sound, taunts, screenshots, logo, or exact branding. Boom Box can reproduce the gameplay categories and decision rhythm with original names, art, effects, balancing, and code.

## Required rules decisions

These choices should be written into the ruleset before content implementation:

1. **Seats:** support 2â€“10 total tanks for historical parity. Keep 2â€“6 as the first mobile layout target, then add a scrollable 7â€“10 seat setup.
2. **Firing modes:** sequential is the default; synchronous is the next mode; simultaneous is an advanced option.
3. **Movement:** add an optional movement phase with fuel. Stationary mode remains available for short matches.
4. **Money:** match-local money resets each match; starting money is configurable.
5. **Physics:** expose gravity, wind range, edge behavior, and terrain profile in the setup wizard.
6. **Turn pacing:** the selected pace controls the human turn deadline. Animation speed is separate from the rules clock.
7. **AI continuation:** a defeated human becomes a spectator; the match ends only when one living tank remains.
8. **Placement:** first eliminated is last place; the last living tank is first place; simultaneous eliminations use a documented tie rule.
9. **Playback:** default 1.5Ã— AI presentation speed with Pause, 1Ã—, 2Ã—, and 4Ã— controls. Fast-forward changes presentation and AI delay, never authoritative outcomes.
10. **Catalogue:** all weapons and utilities are data-driven so cost, damage, radius, inventory, and unlock rules can be tuned without rewriting simulation code.

## Completion plan

### Pass 10 â€” Rules and state reconciliation

**Purpose:** replace the prototype state with the complete authoritative match contract.

#### Build

- Versioned match rules object: gravity, wind, boundaries, firing mode, movement, starting money, catalogue, events, and turn pace.
- Stable player state: tank position, turret, health, shield, fuel, money, inventory, upgrades, alive state, eliminated turn, placement, and statistics.
- Explicit match phases: setup, ready, turn preparation, projectile flight, secondary effects, placement, finished.
- Action sequence numbers, idempotency keys, and server rejection for duplicate or early actions.
- Full event log for purchases, movement, firing, impacts, terrain mutations, utilities, eliminations, and placements.

#### Exit gate

The server can serialize and restore a match without losing rules, terrain, inventory, turn ownership, or placement data. A client cannot make a legal state change without a server event.

### Pass 11 â€” Correct artillery and terrain simulation

**Purpose:** make the core match physically reliable before adding content.

#### Build

- Fixed-step authoritative projectile simulation with swept segment collision.
- Solid terrain mask plus height/surface data for rendering.
- Correct collision ordering: bounds, terrain, tank, shields, effect, terrain mutation, support, burial, fall, death, child effects.
- Terrain add/remove, tank support loss, burial, digging free, fall damage, and parachute protection.
- Configurable boundary behavior: bounce, wrap, or stop.
- Projectile resolution lock so the next turn cannot begin before all child effects finish.

#### Exit gate

Thin terrain, edge shots, direct hits, terrain shots, falling tanks, buried tanks, and multi-effect weapons resolve once and deterministically across repeated seeds.

### Pass 12 â€” Equipment catalogue and economy

**Purpose:** provide the content that makes the original game more than a cannon demo.

#### Launch catalogue

Implement original Boom Box names and behavior equivalents for:

- Cannon and heavy cannon
- Large explosive and mini-nuke class weapons
- Multi-projectile/MIRV weapon
- Triple or spread projectile weapon
- Bouncing bomb
- Riot/impact bomb
- Piercing or tunneling projectile
- Napalm and persistent fire
- Smoke/visibility effect
- Liquid dirt and terrain filler
- Terrain remover
- Tracer/guidance weapon
- Laser or line attack
- Area charge

#### Utilities and upgrades

- Light and heavy shields
- Shield recharge
- Repair kit
- Parachute/fall protection
- Fuel and movement
- Guidance/tracer support
- Turret or shot upgrades where the ruleset allows them

#### Economy

- Server-authoritative money and prices
- Atomic purchases
- Inventory limits and ammunition counts
- Clear shop previews and purchase feedback
- Configurable starting money and catalogue availability

#### Exit gate

Every item has a distinct simulation effect, a legal inventory path, a test case, a visible UI explanation, and a balance table.

### Pass 13 â€” AI parity, elimination order, and teaching mode

**Purpose:** make computer tanks full participants and make the end game educational.

#### AI behavior

- Recruit, Veteran, Ace, and Expert personalities
- Candidate-shot search using angle, power, wind, gravity, terrain, and self-risk
- Weapon selection based on inventory and target geometry
- Shield, repair, fuel, parachute, and terrain-tool decisions
- Deterministic seeded tie-breaking
- Short readable AI intent text: â€œRook is lining up a heavy shellâ€

#### End game

- Record every elimination with turn and cause
- Assign placements when the match ends
- Display a live elimination panel
- When the local player is eliminated, disable controls and switch to â€œWatching the battleâ€
- Continue AI-vs-AI play until one tank survives
- Show final standings, damage, shots, purchases, terrain changes, and elimination order

#### Speed controls

- Pause
- 1Ã—, 2Ã—, and 4Ã— playback
- Recommended 1.5Ã— default for AI turns
- Fast-forward projectile animation while preserving the full trajectory and impact explanation
- Local playback speed must never change authoritative damage or turn order

#### Exit gate

An eliminated player can watch the remaining match, understand why each AI acted, and see a complete ranked result instead of an abrupt loss screen.

### Pass 14 â€” Complete setup and firing modes

**Purpose:** expose the real game configuration instead of hiding rules in code.

#### Setup wizard

1. Players and seats
2. Human/AI assignment and AI skill
3. Money and equipment catalogue
4. Terrain/map and seed
5. Gravity, wind, boundaries, and movement
6. Firing mode and turn pace
7. Environmental events
8. Review and room creation

Only settings relevant to the selected rules should appear. The review step must show the exact rules that will govern the match.

#### Firing modes

- Sequential default
- Synchronous prepare-all/release phase
- Simultaneous launch with deterministic collision ordering

#### Exit gate

Two matches created with different settings visibly and mechanically behave differently, and the match snapshot records those settings.

### Pass 15 â€” Original presentation and device experience

**Purpose:** turn the complete ruleset into the finished Boom Box game.

- AI-generated original title treatment, tanks, terrain biomes, weapons, projectiles, explosions, smoke, napalm, shields, debris, and result art.
- Original sound effects for firing, impacts, terrain collapse, warnings, utilities, and elimination.
- Distinct weapon cards with damage/range/use explanations.
- Clear wind, gravity, turn, money, fuel, shield, and inventory HUD.
- Portrait and landscape layouts for 2â€“10 seats.
- Keyboard, touch, pointer, and screen-reader support.
- Reduced motion and low-effects options.
- Loading and reconnect states that never hide the current match state.

#### Exit gate

The content-complete game is understandable without developer terminology, readable on a phone, and visually distinct from a prototype canvas.

### Pass 16 â€” Release hardening

- Determinism matrix for every weapon and utility
- Two-, four-, six-, and ten-seat human/AI matrices
- All firing modes
- Reconnect during setup, flight, secondary effects, elimination, and spectator mode
- Duplicate actions, forged seat IDs, negative money, invalid catalogue IDs, stale tokens, and malformed payloads
- Persistence through server restart and deployment
- Full replay and speed-control validation
- Performance tests for large terrain mutation, 10 seats, and multi-projectile effects
- Final production browser tests, rollback check, and live release report

### Pass 17 â€” Final conformance and release sign-off

**Purpose:** close the last rules-completeness gaps and establish the final user-test gate.

#### Build

- Implement and test the prepare/release behavior for synchronous firing, and deterministic collision ordering for simultaneous firing; if either mode is intentionally removed, remove it from the wizard and rules contract instead.
- Run the complete weapon, utility, terrain, elimination, replay, speed-control, reconnect, restart, and malformed-input matrix against the final ruleset.
- Run production browser automation for lobby, setup, solo match, multiplayer match, spectator, results, and history flows at the supported viewport sizes.
- Verify the deployed commit, health response, live WebSocket protocol, rollback target, and recovery-store configuration.
- Record the final release report. Human playtesting remains blocked until this pass exits successfully.

#### Exit gate

Every exposed rule has matching authoritative behavior and an automated acceptance check. The live deployment is verified, rollback is documented, and the project is ready for the first user test session.

## Acceptance matrix for the finished game

The content-complete release is not done until all of these are true:

- A player can configure every relevant rule in the wizard.
- A match can be played with stationary or fuel-powered tanks when selected.
- Every launch weapon and utility has a distinct, tested effect.
- AI buys and uses equipment under the same server rules as humans.
- Projectiles resolve completely before the next turn.
- Terrain can be removed, added, collapsed, and used as cover.
- A defeated player can watch the remaining AI battle.
- Elimination order and final placement are visible and persisted.
- Pause and 1Ã—/2Ã—/4Ã— speed controls work in live matches and replays.
- A match survives reconnect and server restart without state loss.
- The 2â€“10 seat matrix is tested, with mobile overflow handled.
- The final UI, sound, effects, and art are original Boom Box assets.

## What should happen next

Passes 10 through 17 have been completed and checked against the earlier implementation. Pass 18 closes the setup and rules parity gap without exposing nonfunctional movement or environmental-event controls. The next implementation pass is **Pass 19: Match-flow hardening**.
