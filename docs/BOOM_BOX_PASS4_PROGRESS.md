# Boom Box Pass 4 — Single-Player Expansion (Started)

## What shipped in this increment

- Solo setup now supports one, two, or three rival tanks.
- Three seeded terrain profiles are selectable: Sunset Range, Ice Shelf, and Lunar Crater.
- Match-local credits begin at 100 and are shown during play.
- Initial loadout choices are wired into the match: Cannon, Heavy Shell, and Precision Round.
- Heavy Shell and Precision Round have different costs, blast sizes, terrain depth, damage, and projectile speed.
- The player can select which living rival to target.
- Each rival has its own tank, color, health row, turn, and AI shot.
- Repair Kit utility restores 30 HP once per match; Terrain Lift remains explicitly marked as upcoming.
- Solo setup includes a collapsible rules/help panel.

## Deliberate boundary

Pass 4 has started but is not complete. The economy is match-local and intentionally small. The first weapon set is represented by three functional weapons and one utility; the remaining shop, inventory breadth, multi-projectile behavior, area effects, AI difficulty, statistics, and rematch polish remain in this pass.

The multiplayer lobby is still a local prototype. No server-authoritative room or match state is being claimed.

## Verification

- `npm run test:boombox`
- `npm run build`
- Existing smoke and Cribbage rule/network checks
- Browser check with two rivals, Lunar Crater, Heavy Shell, target selection, 30-credit deduction, and phone-sized canvas layout

## Next Pass 4 work

1. Add a real inventory/shop screen and purchase validation for every launch weapon and utility.
2. Add multi-projectile, terrain-tool, and area-effect behavior with one-impact-per-projectile event logging.
3. Add AI difficulty profiles and a legal action selector that uses the selected weapon catalogue.
4. Add match statistics, rematch setup preservation, and explanatory help for every weapon and utility.
5. Add fixed-seed action-log tests for multi-rival targeting, credit deduction, weapon effects, and winner selection.
