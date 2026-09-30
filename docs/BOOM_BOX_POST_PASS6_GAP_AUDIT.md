# Boom Box post-Pass 6 gap audit

**Audit date:** 2026-09-30  
**Scope:** current repository, deployed Boom Box service, original Scorched Earth baseline, and the completed correction track through Pass 6.

This document lists remaining issues only. Terrain boundary, edge-crater, support, and chained-fall issues found in the preceding audit are closed by the current implementation and focused regression suite.

## Release-blocking issues

- **Production storage durability is unverified.** The service can write its active-room and history stores, but a real Coolify volume mapping and controlled container replacement recovery have not been independently verified.
- **Solo and multiplayer do not use the same rules engine.** Solo remains a local approximation with different AI, physics, inventory, utility, child-projectile, and elimination behavior.
- **The human browser matrix is incomplete.** Solo completion, AI-seat setup and launch, synchronous and simultaneous UI, defeated-player spectator continuity, reconnect from the actual UI, history/replay interaction, and mobile portrait/landscape coverage are not all exercised end to end.
- **Live WebSocket smoke coverage is intermittently unstable.** Direct WebSocket handshakes work, but the full live harness has timed out at both lobby-list and spectator-watch stages on separate runs. This leaves live room startup and spectator timing without consistently repeatable evidence.

## Gameplay completeness issues

- **Terrain materials remain mostly presentation or solidity flags.** Smoke has no gameplay visibility effect, buried tanks have no clear digging/freeing resolution, and material modifiers and collapse chains remain simplified.
- **AI equipment strategy is incomplete.** Automated strategy coverage proves starter shields, guidance, turret upgrades, and movement priority, but not meaningful fuel, terrain-tool, parachute, shield-recharge, repair, smoke, or full weapon/equipment decisions across all personalities.
- **Projectile presentation is incomplete for child weapons.** The authoritative server resolves all child paths, while the client selects a single longest network path for the main flight display; simultaneous child trajectories and impacts are not presented with full fidelity.
- **Replay is an inspection timeline rather than a full match playback.** It stores snapshots and event summaries, but does not reproduce the complete live projectile, child-effect, utility, terrain-material, and impact animation sequence.
- **Solo results are less complete than multiplayer results.** Solo does not expose the authoritative ranked elimination order and standings model used by multiplayer.

## Product and presentation issues

- **The declared Boom Box presentation package is incomplete.** The battlefield still relies on canvas primitives and CSS; original generated tank, terrain, projectile, impact, smoke, napalm, shield, result, and audio assets are absent.
- **There is no Boom Box-specific sound or mute/low-effects control.** The host application has audio utilities, but Boom Box does not provide its own sound layer or preference.
- **Accessibility evidence is incomplete.** Dynamic match information is partly exposed through live regions, but the canvas state, child impacts, and several changing controls are not fully represented for assistive technology.
- **Mobile wide-seat setup remains unproven.** Server support exists for 2–10 seats, but the 7–10 seat wizard and long match layout have not been verified on phone portrait and landscape viewports.
- **Name-only identity can collide across devices.** Two devices using the same entered name can be treated as the same room identity and can reclaim or block the wrong membership.

## Operational and scale issues

- **The configured deployment health check proves only the static shell.** The Boom Box health endpoint exists, but the deployment check is not independently confirmed to require writable persistence and WebSocket availability.
- **Long-running scale evidence is limited.** There is no performance measurement for 10 human seats over long matches, repeated terrain mutations, large child-projectile sets, or extended AI-vs-AI play.
- **History retention has no long-term pagination or compaction proof.** Terrain snapshots and event arrays remain bounded per record, but many completed matches have not been tested for archive growth and retrieval behavior.
