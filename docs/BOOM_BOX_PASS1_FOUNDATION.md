# Boom Box - Pass 1 Foundation

**Status:** Pass 1 complete; recommended decisions are ready for review.

**Date:** 2026-09-28

**Related documents:**

- [Scorched Earth baseline reference](./BOOM_BOX_REFERENCE.md)
- [Boom Box development plan](./BOOM_BOX_DEVELOPMENT_PLAN.md)

This document turns the research baseline into a concrete starting contract for the next pass. It records recommended launch decisions, the state boundary, the simulation contract, the multiplayer boundary, and the original art pipeline. It does not implement the game.

## 1. Product decisions for the first release

These are recommended defaults for Boom Box. Any change after Pass 1 should be recorded as a deliberate rules change.

| Decision | Pass 1 recommendation | Reason |
| --- | --- | --- |
| Opening choice | Single player or Multiplayer immediately | Keeps the main decision obvious and gives multiplayer its own first-class flow. |
| Multiplayer beta seats | 2-4 human seats, with AI seats available in created games | This is the smallest useful test matrix and keeps the lobby readable on phones. |
| Release seat model | 2-6 seats, with the data model compatible with 10 | Supports a richer release without forcing the first beta to solve a ten-seat UI. |
| Firing mode | Sequential turns at launch | It is the clearest mode to validate and the most reliable online. |
| Future firing modes | Synchronous first; simultaneous only after it has a clear UX | Both require a preparation phase and need separate testing. |
| Tank movement | Stationary tanks at launch | Keeps the artillery decisions central and avoids adding fuel, movement collision, and turn-order complexity too early. |
| Terrain | Seeded, destructible 2D terrain with craters, burial, exposure, and falling | These are the defining choices that make a shot more than a damage roll. |
| Economy | Match-local credits; no cross-match progression | Prevents pay-to-win or account-state balance issues while rules are being tuned. |
| Win condition | Last living tank wins; zero living tanks produces a draw | Provides a deterministic result for simultaneous or chain reactions. |
| Starting inventory | Cannon for every tank; a small shared starter catalogue for later passes | The first vertical slice needs a reliable default weapon before the shop expands. |
| Randomness | One match seed controls terrain, wind rolls, AI tie-breaks, and intentional random effects | A seed plus action log must reproduce the same match. |
| Match persistence | Reconnectable active rooms; no long-term saved campaign in the first release | Protects multiplayer continuity without inventing a campaign system. |

The 2-4 seat beta limit is a testing and UX limit, not a simulation limit. The room model should use a seat array and avoid hardcoding four players so expansion to six or ten does not require a protocol rewrite.

## 2. Match state contract

The server is authoritative. A client may preview an aim line or local animation, but it cannot decide a hit, terrain mutation, damage result, purchase, turn change, or winner.

### 2.1 Match envelope

```text
MatchState
  schemaVersion
  matchId
  matchSeed
  status: lobby | countdown | aiming | resolving | paused | finished
  settings
  seats[]
  activeSeat
  turnNumber
  turnId
  phaseRevision
  terrain
  projectiles[]
  effects[]
  eventSequence
  eventLogWindow
  result
```

### 2.2 Settings

```text
MatchSettings
  playerLimit
  firingMode
  terrainProfile
  terrainSeed
  gravity
  windMode
  windStrengthLimit
  boundaryMode: bounce | wrap | solid
  movementEnabled
  meteorEventsEnabled
  economyEnabled
  startingCredits
  allowedWeapons[]
  allowedUtilities[]
  turnTimeLimitMs
  reconnectGraceMs
  aiTakeoverPolicy
```

Settings are copied into the match at start. Changing a lobby setting must create a new revision and must be rejected after the countdown begins.

### 2.3 Seat and player state

```text
SeatState
  seatIndex
  playerId
  displayName
  controller: human | ai
  connection: connected | disconnected | forfeited
  ready
  tank

TankState
  position { x, y }
  turretAngle
  shotPower
  health
  maxHealth
  shield { type, remaining }
  credits
  inventory { itemId: count }
  alive
  buried
  fallState
  statistics
```

The player ID is stable for the room. A reconnecting browser receives its existing seat through a session token; it does not create a second tank.

### 2.4 Projectile and effect state

```text
ProjectileState
  projectileId
  ownerSeat
  weaponId
  position { x, y }
  velocity { x, y }
  childIndex
  bouncesRemaining
  lifetimeTicks
  state: flying | impacted | expired

EffectState
  effectId
  sourceProjectileId
  effectType
  position { x, y }
  radius
  remainingTicks
  affectedTargets[]
```

Effects must identify their source and affected targets so a delayed or persistent effect cannot damage the same target twice in one tick unless the weapon explicitly allows repeated damage.

## 3. Deterministic simulation contract

### 3.1 Clock

- Use a fixed **60 Hz simulation tick**.
- Render at the browser's available frame rate; rendering never advances game time.
- Use an accumulator for variable render frame rates.
- The server advances the authoritative tick. Clients animate from snapshots and events.
- A projectile resolves before the turn can advance.

### 3.2 Fixed step order

Every simulation tick follows this order:

1. Apply the accepted action or pending phase transition.
2. Apply wind and gravity to active projectiles.
3. Sweep each projectile from its previous position to its new position.
4. Resolve the first collision along the swept segment.
5. Apply the weapon effect once, then mutate terrain.
6. Resolve shield absorption, tank damage, burial, support loss, falling, and death.
7. Spawn child projectiles and persistent effects.
8. Advance or expire persistent effects.
9. Remove expired projectiles and effects.
10. Recalculate living seats, result state, and the next legal phase.
11. Emit an event batch and increment `eventSequence`.

The same ordered rules apply to a human action and an AI action. No client-side hit test is authoritative.

### 3.3 Actions and event log

Accepted actions are small, explicit commands:

```text
Action
  actionId
  playerId
  turnId
  clientSequence
  kind: aim | chooseWeapon | buy | fire | useUtility | ready | pauseVote | rematchVote
  payload
```

The event log contains results rather than intentions:

```text
Event
  eventSequence
  tick
  type: actionAccepted | actionRejected | projectileSpawned | impact |
        terrainChanged | damageApplied | tankFell | tankDestroyed |
        turnStarted | matchPaused | matchResumed | matchFinished
  payload
```

An action is accepted only when its player owns the active turn, its `turnId` matches, its payload is legal, and the match is in the correct phase. Duplicate `actionId` values are ignored after the first result.

### 3.4 Terrain representation

Use a fixed logical terrain grid, initially recommended at **512 x 288 cells**, packed and chunked for transport. The terrain contains solid/empty state and a small material enum so later passes can add dirt, rock, or persistent surface effects.

Each mutation returns:

- the affected chunk IDs;
- the old and new terrain revision;
- the impact profile used;
- any tank support changes;
- a checksum for determinism testing.

The renderer may use a larger canvas, but the logical grid remains the source of truth.

## 4. Multiplayer boundary

### 4.1 Lobby responsibilities

The lobby server owns:

- room creation and unique room ID;
- creator identity and creator-only controls;
- seat count and open-seat state;
- public room summary and private session token;
- configuration revision and ready state;
- start/cancel/expire transitions;
- room visibility rules for full and started games.

The public room card should show creator name, room ID, player count, open seats, selected map/rules, and a plain-language status such as `Waiting for 2 players`.

### 4.2 Match responsibilities

The match server owns:

- phase and turn ownership;
- legal actions;
- fixed-step physics;
- terrain and projectile state;
- inventory and credits;
- damage, death, result, rematch, and AI takeover;
- event sequence and resync snapshots.

### 4.3 Reconnect policy

- A seat gets a reconnect token when it joins.
- A disconnected active player pauses the match for **90 seconds** by default.
- Reconnection within that window restores the seat and resumes from the latest snapshot.
- After the window, the creator may use the room's configured policy: forfeit the seat or allow AI takeover.
- A disconnected non-active player remains in the room and receives the next snapshot on reconnect.
- A browser refresh must never create a duplicate seat.

## 5. Initial art and effects direction

### 5.1 Visual direction

Recommended identity: **retro-futurist demolition arcade**.

- Deep navy/black space for contrast.
- Hot orange, electric cyan, acid lime, and magenta for energy and player identity.
- Terrain palettes that separate sand, rock, ice, and alien biomes.
- Chunky silhouettes that remain readable at phone scale.
- Modern UI spacing and typography over a restrained retro texture layer.

This is inspired by the era and genre, not a recreation of the original logo, fonts, screenshots, tank art, or menus.

### 5.2 Asset categories

Create original assets for:

- title and lobby background;
- tank silhouettes and player-color variants;
- terrain materials and map thumbnails;
- weapon icons and inventory states;
- projectile trails and impact sprites;
- explosions, smoke, napalm, shields, terrain collapse, and debris;
- victory, defeat, draw, reconnect, and invalid-action states;
- optional sound effects and short music loops.

### 5.3 AI-art production rules

- Store the prompt, model/tool, generation date, selected seed when available, and edit history with each accepted asset.
- Generate at a consistent source resolution, then normalize to an explicit runtime size.
- Keep transparent foreground objects separate from backgrounds and effects.
- Review every asset for readable silhouette, accidental text, watermarks, logos, artifacts, and inconsistent lighting.
- Do not use original Scorched Earth screenshots, extracted sprites, logos, copied taunts, or source code as generation inputs.
- Keep a rejected-assets folder outside the runtime bundle so experimentation does not increase load size.
- Use an asset ID rather than a filename in match state so art can change without invalidating replays.

### 5.4 Runtime effects rules

- Effects are cosmetic clients of authoritative events.
- A missing effect asset must fall back to a simple geometric effect rather than block the match.
- Effects cannot change collision, damage, terrain, or timing.
- Reduce-motion mode must shorten or disable camera shake, flashing, and long particle trails.

## 6. Pass 1 exit review

Pass 1 is complete when:

- launch limits and rules have a written recommendation;
- the match state and action/event vocabulary are explicit;
- simulation tick and collision order are fixed;
- the server/client authority boundary is unambiguous;
- reconnect and duplicate-seat behavior are specified;
- the art direction and asset review rules are recorded;
- the next pass can prototype the lobby without inventing core rules.

All six conditions are satisfied by this document and the related reference/plan documents.

## 7. Reassessment of the development plan

### Keep

- Keep the nine-pass structure.
- Keep the polished lobby before gameplay networking; it is a product feature, not a temporary menu.
- Keep deterministic simulation and event logging before content expansion.
- Keep original AI-generated art as a dedicated content pass after the mechanics are stable.

### Modify

- Treat Pass 2 as a **working interaction prototype**, not a visual mockup. It must exercise the real lobby state shapes with temporary art and local mock rooms.
- Add a deterministic simulation harness during Pass 3, including fixed-seed replay, collision sweep tests, terrain checksum tests, and one-impact-one-resolution tests.
- Keep Pass 5 focused on server-authoritative room and match integration; move rematch, reconnect stress, host transfer, and quit/forfeit matrix work into Pass 6.
- Correct the plan's milestone wording: the multiplayer beta is complete after **Pass 6**, not Pass 5. Pass 5 is the first networked integration build.

### Hardening gates

These are mandatory gates inside the existing passes rather than extra feature passes:

1. **After Pass 2:** lobby transition and settings revision gate.
2. **After Pass 3:** deterministic physics and terrain gate.
3. **After Pass 5:** two-browser authoritative sync and reconnect gate.
4. **After Pass 7:** asset provenance, loading size, and readability gate.
5. **Before Pass 9 release:** full live smoke and rollback gate.

### Recommendation

Pass 1 is complete. Proceed to **Pass 2** next. Do not start weapon breadth, generated final art, or public multiplayer deployment yet. Pass 2 should first prove the opening choice and the polished lobby flow with realistic room data and temporary generated placeholders. Once that flow survives the Pass 2 gate, Pass 3 can build the artillery vertical slice against the state contract above.
