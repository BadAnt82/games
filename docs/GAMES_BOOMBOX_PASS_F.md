# Boom Box Pass F — Recovery and tempo

Pass F hardens recovery and pacing around the authoritative match service.

- Browser multiplayer sessions automatically reconnect with exponential backoff and reclaim the saved seat/session.
- Interrupted actions are not queued blindly during a disconnect; the authoritative room snapshot remains the source of truth.
- Flight animation pause now pauses presentation and local simulation consistently. Network pause affects only the viewer while the server continues authoritative timing.
- Local AI playback responds to the 1x/2x/4x controls, while network animation speed never changes authoritative outcomes.
- Server room pruning runs continuously, clears timers and memberships, broadcasts the updated lobby, and supports short test windows through environment overrides.
- Reconnect after a server-side flight or disconnect resumes from the persisted room snapshot, with flight phases safely normalized to turn preparation.

Validation:

- `npm run build`
- `npm run test:boombox-f-recovery`
- `npm run test:boombox-network`
- `npm run test:boombox-persistence`
- `npm run test:boombox-release`
- Live mobile solo smoke test and health check
