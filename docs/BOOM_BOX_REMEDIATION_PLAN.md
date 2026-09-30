# Boom Box remediation plan

**Prepared:** 2026-09-30  
**Purpose:** consolidate the post-Pass 6 audit into fixed, bounded work packages. These are lettered packages rather than a new pass-number sequence. A package may not add unrelated work without an explicit plan revision.

## Issue buckets

### Bucket 1 — production durability and operational truth

- Coolify persistence for `/app/data` has not been independently verified through a real container replacement.
- The configured deployment health check proves the static shell rather than writable storage and WebSocket room availability.
- Live WebSocket smoke coverage is intermittently timing out at lobby and spectator stages.

### Bucket 2 — identity and room lifecycle

- Name-only identity can collide across devices and can block or reclaim the wrong room membership.
- Room creation, cancellation, reconnect, started-room watching, and spectator transitions need one reliable identity/session contract in the browser.

### Bucket 3 — shared rules and solo parity

- Solo uses a local approximation instead of the authoritative multiplayer simulation.
- Solo AI, firing modes, utilities, child projectiles, terrain behavior, elimination, standings, and result statistics can differ from multiplayer.

### Bucket 4 — gameplay content and AI depth

- Smoke, buried-tank recovery, material modifiers, and collapse chains are simplified.
- AI strategy coverage is incomplete for fuel, terrain tools, parachutes, repair, smoke, shield recharge, and the full equipment catalogue.
- Economy teaching and utility explanations are incomplete even where the server behavior exists.

### Bucket 5 — player-facing acceptance and device coverage

- Browser coverage is incomplete for solo completion, AI-seat launch, synchronous/simultaneous UI, eliminated-player watching, UI reconnect, history/replay interaction, and mobile portrait/landscape.
- Seven-to-ten-seat setup and long-match layouts remain unproven on phones.
- Dynamic canvas state and changing controls are only partly accessible to assistive technology.

### Bucket 6 — replay, results, and presentation

- Child projectile paths and impacts are not presented with full fidelity in live play.
- Replay is an inspection timeline rather than a complete visual match playback.
- Solo results do not expose the same ranked elimination standings as multiplayer.
- Original Boom Box art, effects, sound, and mute/low-effects controls are absent.

### Bucket 7 — scale and archive behavior

- Long 10-seat matches, repeated terrain mutation, large child-projectile sets, and extended AI-vs-AI play have no performance evidence.
- History retention has no pagination or compaction evidence under many completed matches.

## Fixed implementation packages

### Package A — production durability and health truth

**Scope:** verify the deployed `/app/data` persistent volume, recovery of one active room and one completed history record across a controlled container replacement, actual writable-store failure reporting, and a deployment health check that validates the Boom Box health contract.

**Status:** Complete. Evidence is recorded in [BOOM_BOX_PACKAGE_A_RECOVERY.md](./BOOM_BOX_PACKAGE_A_RECOVERY.md).

**Exit evidence:** Coolify mapping is recorded; replacement recovery succeeds; a write failure is visible; the configured health check fails when the service or persistence is unhealthy.

**Out of scope:** gameplay rules, UI redesign, art, AI balance, and archive pagination.

### Package B — identity and room lifecycle contract

**Scope:** separate display names from per-device/session identity; preserve name display everywhere; make create, join, cancel, reconnect, started-room watch, spectator leave, and room cleanup consistent for one user across devices; eliminate membership collisions and stale lobby state.

**Status:** Complete. Evidence is recorded in [BOOM_BOX_PACKAGE_B_IDENTITY.md](./BOOM_BOX_PACKAGE_B_IDENTITY.md).

**Exit evidence:** browser and protocol tests cover two devices with the same display name, multiple rooms, cancellation, reconnect, spectator entry/exit, and stale-session recovery with no cross-room takeover.

**Out of scope:** solo rules parity, weapon behavior, art, sound, and performance tuning.

### Package C — one authoritative rules engine

**Scope:** route solo and multiplayer through the same simulation contract, or remove the claim that solo is a full rules mode and label it explicitly as practice. If retained as a full mode, align physics, firing modes, movement, inventory, utilities, child projectiles, terrain, elimination, standings, and result statistics.

**Exit evidence:** seeded solo and multiplayer fixtures produce matching state transitions for the same rules/configuration; every advertised mode has the same legal actions and outcomes; no local-only result path remains hidden behind the full-game label.

**Status:** Complete. Evidence is recorded in [BOOM_BOX_PACKAGE_C_RULES_PARITY.md](./BOOM_BOX_PACKAGE_C_RULES_PARITY.md).

**Out of scope:** generated art, sound, Coolify storage, and long-run performance.

### Package D — complete equipment, terrain, economy, and AI behavior

**Scope:** finish the gameplay content contract for all exposed weapons and utilities; give smoke a defined gameplay effect; define buried/freeing behavior, material modifiers, and collapse chains; complete economy explanations; expand AI decisions across all four personalities and the full equipment/utility set.

**Exit evidence:** every catalogue item has a distinct authoritative effect, inventory and purchase path, player-facing explanation, deterministic fixture, and AI decision coverage where legal; elimination causes and standings remain correct after secondary effects.

**Out of scope:** browser viewport certification, original presentation assets, Coolify operations, and archive scaling.

### Package E — browser, multiplayer, and device acceptance

**Scope:** exercise the actual UI for solo completion, AI-seat setup/launch, all-human 2/4/6/10 seats, sequential/synchronous/simultaneous firing, eliminated-player watching, reconnect, cancellation, history selection, replay controls, and room errors at desktop, phone portrait, and phone landscape sizes.

**Exit evidence:** Playwright flows assert visible panels, enabled/disabled controls, scrolling, focus order, final standings, spectator state, and successful recovery for every advertised entry path; live lobby and spectator smoke tests are repeatable.

**Out of scope:** changing weapon rules, creating art/audio, and production volume configuration.

### Package F — replay, results, presentation, and accessibility

**Scope:** render every child projectile and impact in live play; make replay reproduce trajectories, child effects, utility events, terrain materials, and result state; align solo and multiplayer standings presentation; add original Boom Box visual assets, impact effects, sound, mute/low-effects controls, and structured announcements for dynamic state.

**Exit evidence:** a completed match can be replayed visually from start to finish; result screens show identical ranked data in both modes; visual/audio controls persist; accessibility checks cover keyboard, reduced motion, screen-reader text, and dynamic status.

**Out of scope:** room identity, Coolify persistence, and server performance profiling.

### Package G — scale, archive, and final conformance

**Scope:** measure 10-seat long matches, repeated terrain mutations, large child-projectile resolutions, AI-vs-AI continuation, archive growth, and history retrieval; add pagination/compaction where measurements require it; run one final conformance audit against the original Boom Box reference and this plan.

**Exit evidence:** performance budgets are recorded and pass; archive behavior remains bounded and usable; the final audit maps every original issue bucket to evidence with no unresolved release blocker.

**Out of scope:** adding new features after the final audit or creating another implicit package.

## Order and drift control

Recommended order is **A → B → C → D → E → F → G**. A package is complete only when its exit evidence is recorded. Later packages may consume earlier contracts, but they may not silently reopen completed work or absorb issues listed under another package. This plan is the reference for the next implementation request.
