# Boom Box Pass 12 — Equipment catalogue and economy

## Status

Pass 12 is complete locally and ready for deployment. Weapon and utility availability now comes from the versioned server ruleset. Purchases are authoritative, atomic, capped by inventory, and recorded in the match log.

## Balance table

| Item | Price | Capacity | Server effect |
|---|---:|---:|---|
| Cannon | 0 | 99 | Standard shell |
| Heavy cannon | 45 | 2 | Slower, harder impact |
| Heavy shell | 30 | 2 | Deep wide crater |
| Precision round | 20 | 3 | Fast, high direct damage |
| Split shell | 25 | 3 | Two spread impacts |
| Mini nuke | 70 | 1 | Large area blast |
| MIRV | 65 | 1 | Three spread warheads |
| Triple shot | 50 | 2 | Three spread shells |
| Bouncing bomb | 40 | 2 | Extra boundary bounces |
| Riot bomb | 35 | 2 | Close impact blast |
| Piercing round | 40 | 2 | Ignores solid terrain during flight |
| Napalm | 55 | 2 | Applies burn damage on later turns |
| Smoke shell | 20 | 2 | Smoke material impact zone |
| Liquid dirt | 25 | 2 | Adds raised cover |
| Terrain tool | 15 | 2 | Adds reinforced cover |
| Terrain remover | 20 | 2 | Broad trench |
| Tracer round | 28 | 2 | Guided projectile steering |
| Laser line | 60 | 1 | Instant line attack |
| Area charge | 40 | 1 | Large area blast |

Utilities use the same server inventory rules: repair kit, light/heavy shields, shield recharge, terrain lift, parachute protection, fuel, guidance, and turret upgrade.

## Implementation

- Rules now include labels, prices, capacity, starter stock, effect mode, and weapon-specific parameters.
- Match starts provide only starter stock; purchased ammunition is consumed when fired and is paid for once at purchase time.
- `boombox-purchase` validates item, quantity, money, capacity, ownership, and idempotency before changing state.
- Purchase results return the authoritative money and inventory values and append a purchase event.
- Disabled weapon and utility lists can be supplied in room configuration.
- MIRV, spread, guided, bounce, piercing, laser, napalm, smoke, filler, and remover effects are resolved by the server action path.
- Solo loadout UI now explains the full catalogue and utility effects. Multiplayer snapshots expose the same catalogue and balances.

## Verification

- `npm run build`
- `npm run test:boombox`
- `node scripts/boombox-network-check.mjs`
- `npm run test:smoke`
- `npm run test:cribbage-network`
- `node --check server.mjs`
- `git diff --check`

The network protocol now verifies an atomic heavy-cannon purchase, duplicate purchase rejection, catalogue size, MIRV purchase, three-child spread resolution, AI continuation, replay/history, reconnect, spectator, and moderation paths.

## Deliberate scope boundary

Pass 12 supplies the equipment and economy foundation. AI equipment selection, candidate-shot search, personalities, elimination teaching mode, and continued AI-vs-AI play remain in Pass 13.

