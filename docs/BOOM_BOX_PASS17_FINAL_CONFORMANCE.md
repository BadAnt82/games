# Boom Box Pass 17 — final conformance

**Target:** `games.badantproductions.com`  
**Status:** complete and deployed; live protocol verification passed

## Rules correction

- Synchronous rooms now use a prepare window. Each living commander submits exactly one fire or utility action; the server keeps the action private until every living seat has prepared.
- Simultaneous rooms use the same prepare window and release all submitted actions in ascending seat order. This gives every match a deterministic collision and terrain-mutation order while preserving one authoritative result.
- Sequential rooms retain the existing turn-by-turn behavior.
- AI seats participate in the same prepare/release path as humans. The scheduler advances through each unprepared AI seat instead of treating non-sequential rooms as a single-turn room.
- Snapshots now expose the firing mode and prepared seat numbers without exposing another commander’s pending angle, power, weapon, or utility.
- The client enables controls for every unprepared seat in non-sequential modes and clearly reports “Prepare your shot” or “Shot prepared.”
- Pending actions are included in active-room recovery state so a restart cannot silently discard a prepared round.

## Automated validation

- `npm run build`
- `node --check server.mjs`
- `git diff --check`
- `npm run test:boombox`
- `npm run test:boombox-network`
- `npm run test:boombox-release`
- `npm run test:cribbage`
- `npm run test:cribbage-network`
- `npm run test:smoke`
- `npx -p playwright node .tmp_pass17_browser.mjs` (live browser smoke)

The release matrix now proves that synchronous mode does not resolve after the first submission, and that both synchronous and simultaneous modes release two prepared actions deterministically.

The deployed site returned HTTP 200, the live Boom Box WebSocket protocol check passed after the deployment proxy completed its restart, and the live browser smoke passed for the home page, Boom Box entry, multiplayer lobby, and create wizard. An initial live WebSocket attempt returned a transient 502 during that restart window; the retry passed.

## Loop review

- Passes 10–12: authoritative validation, terrain, inventory, and economy remain server-owned.
- Pass 13: AI intent, elimination, replay, and playback state remain intact; AI now uses the same batch path for non-sequential modes.
- Pass 14: rules snapshots preserve the selected firing mode and now enforce its behavior.
- Pass 15: presentation and client rendering remain compatible with the new preparation state.
- Pass 16: room recovery, malformed-input rejection, and the seat matrix remain covered.

## Exit gate

The firing-mode gap identified during Pass 16 is closed. The production deployment and live protocol checks are complete. Human playtesting may begin when requested.
