# Boom Box utility catalog cleanup

**Date:** 2026-09-30

The undefined **Turret Upgrade** item has been removed from the active Boom Box product surface. It was a placeholder with no agreed player-facing behavior and did not belong in the current equipment set.

The cleanup covers:

- the shared server/client utility catalog;
- solo and multiplayer utility selectors;
- the multiplayer room configuration's advanced utility list;
- server AI purchase and use decisions;
- solo utility handling;
- utility outcome and AI strategy checks.

The active catalog now contains eight defined utilities. No turret state is created or changed by utility actions. Additional upgrade types can be specified later as a separate, deliberate feature with defined purchase, inventory, balance, UI, and simulation behavior.
