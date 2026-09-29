# Boom Box Pass 10 — Rules and Authoritative State

**Status:** Complete  
**Commit:** `pending`  
**Scope:** authoritative match contract and state hardening

## What changed

- Added versioned Boom Box rules (`version: 1`) to every started match snapshot.
- Added rules fields for seats, firing mode, movement, gravity, wind mode/limit, boundaries, starting money, turn pace, events, weapons, and utilities.
- Added stable tank state for turret angle, shot power, maximum health, fuel, money, weapon inventory, utility inventory, upgrades, statistics, elimination turn, elimination order, and placement.
- Added explicit server phases: `setup`, `turn-prep`, `flight`, and `finished`.
- Added authoritative action sequence numbers.
- Added action IDs and duplicate-action rejection so a retry cannot fire twice or spend twice.
- Added a resolution lock so the next action cannot commit while a projectile flight is being displayed.
- Added elimination events, elimination order, placement events, and placement data to snapshots, history, and replay frames.
- Made server weapon and utility availability checks authoritative.
- Updated the client to send action IDs and display server money/inventory state.
- Updated the network test to cover duplicate actions, versioned state, placement data, and reconnect restoration.

## Verification

- `node --check server.mjs`
- `npm run build`
- `npm run test:boombox`
- `npm run test:smoke`
- `npm run test:cribbage-network`
- `node scripts/boombox-network-check.mjs`

The network check now covers lobby creation, secure invites, turn authority, duplicate-action rejection, server state sequencing, reconnects, AI fill, spectators, chat moderation, replay state, and match history.

## Deliberate boundaries

This pass creates the state contract; it does not claim that all catalogue entries, terrain materials, movement, firing modes, AI upgrades, or setup controls are complete. Those belong to Passes 11–14. The existing match behavior remains sequential and uses the current simplified physics until Pass 11 replaces it with the complete terrain and projectile simulation.

## Exit gate

A client can serialize and restore the current rules, terrain, inventory, money, turn, event sequence, eliminations, placements, and result without relying on client-owned authority. The next content pass can build weapons and terrain effects against this contract.
