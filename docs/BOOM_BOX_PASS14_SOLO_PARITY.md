# Boom Box Pass 14 — solo parity and visual balance

## Result

Pass 14 is complete locally. The solo preview now follows the same weapon effect vocabulary as the authoritative multiplayer resolver, and the match controls remain usable on mobile layouts.

## Implemented

- Solo terrain tracks solid and material masks alongside height data.
- Spread, triple-shot, and MIRV weapons create their child impacts.
- Bouncing bombs reflect from the battlefield boundary up to their configured bounce count.
- Piercing rounds pass through non-solid terrain during flight.
- Guided rounds steer toward the current target.
- Laser rounds resolve immediately against the selected target.
- Napalm applies burn damage on later turns.
- Smoke, filler, and terrain-remover effects update the local material and solid state.
- Solo utility use consumes inventory and resets correctly for the next turn.
- Local terrain lift, repair, shield, parachute, guidance, fuel, and upgrade utilities now have explicit resolution feedback.
- Playback and battle-note controls receive responsive mobile layout rules.

## Loop verification

- `npm run build`
- `npm run test:boombox`
- `node scripts/boombox-network-check.mjs`
- `npm run test:smoke`
- `npm run test:cribbage-network`
- `node --check server.mjs`
- `git diff --check`

## Review against earlier passes

Pass 11 collision and terrain rules remain unchanged on the server. Pass 12 equipment pricing and inventory remain authoritative. Pass 13 AI intent, elimination order, replay data, and playback controls remain intact. No obsolete Pass 4 presentation copy was reintroduced.

## Recommendation

Pass 14 is ready for deployment. After live verification, the next pass should be a focused play-balance and art polish review rather than another rules rewrite.
