# Boom Box Package A — production durability and health truth

**Verified:** 2026-09-30  
**Repository commit:** `875af67`

## Result

Package A is complete. No gameplay, UI, art, AI, or archive behavior was changed.

## Production evidence

- Coolify application `games` (`tmdedhfajs0iouepqit1but3`) has a persistent volume with storage UUID `03aeme7vbhdonmkn0zkozn3o` mounted at `/app/data`.
- The Coolify health check is enabled and calls `GET /api/boombox-health` on port `3000` through the application. It requires HTTP `200` and the response text `"status":"ok"`, with a 10-second interval, 5-second timeout, and 3 retries.
- Before replacement, a uniquely named completed match (`BB-1044`, `Package A completed …`) and a waiting active room (`BB-1045`, `Package A active …`) were created on the live service.
- Coolify restart deployment `wzrvlzbgndfb6e7rre9twsg7` completed and returned the application to `running:healthy`.
- After replacement, `/api/boombox-health` returned `status: "ok"`; both history and active-room stores reported `writable: true`.
- The completed fixture remained available in `/api/boombox-history` by its unique fixture name.
- Reconnecting the active fixture with its saved creator session returned `boombox-joined` and `boombox-loadout` for `BB-1045`, proving the waiting-room record and session survived replacement. The room was canceled after verification.

## Failure contract

The health endpoint now treats a directory at a configured file path as unusable. `scripts/boombox-storage-failure-check.mjs` verifies that invalid store targets report `status: "degraded"` and that a failed active-room write sets `lastWriteOk: false`.

## Automated checks

```text
npm run build
npm run test:boombox-storage-failure
npm run test:boombox-persistence
```

All three passed. The existing short game-ID collision seen when an older history record shares `BB-1044` is recorded as an identity/archive concern for Package B, not changed in this operational package.
