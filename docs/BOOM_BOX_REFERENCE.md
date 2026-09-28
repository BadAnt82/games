# Boom Box — Scorched Earth Baseline Reference

**Status:** Research and development reference only. No Boom Box code is defined by this document.

**Prepared:** 2026-09-28

**Target:** `games.badantproductions.com`

## 1. Purpose

Boom Box will use the early-to-mid 1990s DOS artillery game *Scorched Earth* as a gameplay baseline. The goal of the baseline is to capture the readable loop that made the original work:

1. Set up a match and players.
2. Buy or select a weapon and utilities.
3. Aim a tank turret and choose shot power.
4. Fire into a shared 2D landscape affected by gravity and wind.
5. Let the projectile resolve, deform the terrain, and apply damage.
6. Pass the turn until one tank remains.

Future Boom Box passes may change weapons, progression, presentation, controls, networking, or rules. Changes should be recorded against this baseline rather than silently drifting from it.

## 2. Reference identity

The reference is the DOS *Scorched Earth* family developed by Wendell Hicken:

- **Initial release:** 1991, shareware, MS-DOS.
- **Known public versions:** 1.0b, 1.0, 1.1, 1.2, and 1.5 (1995).
- **Genre:** turn-based 2D artillery/tank combat.
- **Players:** hot-seat human and computer-controlled tanks; contemporary descriptions say the game supports a player against up to nine other human or computer players.
- **Core differentiators:** destructible terrain, a large weapon and utility catalogue, configurable match rules, and an in-game economy.

Version differences matter. Napalm, smoke tracers, liquid dirt, joystick support, and additional death animations appeared in 1.1; synchronous firing and another death animation appeared in 1.2; lasers, SuperMags, scenery, and the registered triple-turret tank appeared in 1.5.

## 3. Baseline match rules

### 3.1 Match setup

The baseline match needs configurable:

- player count and player names;
- human or computer control per seat;
- starting money and shop/economy rules;
- gravity;
- wind strength and direction;
- terrain/map selection or random generation;
- wall and ceiling behavior (bounce, wrap, or no effect in the original family);
- firing mode: sequential turns, simultaneous, or synchronous;
- available weapons and utilities;
- optional environmental events such as meteor showers.

Boom Box should expose these as understandable match settings. A first implementation may use sensible defaults while keeping the settings model extensible.

### 3.2 Turn loop

For a sequential turn:

1. The active tank is the only tank allowed to change its shot controls.
2. The player chooses a weapon or utility.
3. The player adjusts turret angle and shot power.
4. Optional tracer or guidance information is shown without revealing a future result.
5. The player fires or cancels before committing.
6. The projectile simulation runs to completion, including bounces, terrain deformation, secondary effects, falling tanks, and damage.
7. The game records the shot result and advances to the next eligible living tank.

The projectile must resolve completely before the next turn starts. A tank destroyed during a shot is removed from turn rotation. If only one living tank remains, the match ends; computer tanks may continue fighting when human tanks have been eliminated.

### 3.3 Tanks and damage

Each tank needs at least:

- stable player ID and display name;
- position and turret angle;
- health and maximum health;
- inventory and money;
- active shield state and shield strength;
- alive/dead state;
- optional fuel, parachute, or movement state;
- per-shot and match statistics.

Damage is applied by the weapon effect, then reduced or absorbed by an active shield when applicable. A tank can be buried, exposed by removing terrain, or damaged by a fall. The exact original damage formulas are not sufficiently documented in the public references below; Boom Box should define and test its own explicit formulas rather than imply undocumented parity.

## 4. Projectile and terrain model

### 4.1 Ballistics

The baseline projectile state should include:

- position and velocity;
- gravity contribution;
- wind contribution;
- collision mode;
- remaining lifetime or detonation state;
- owning player and weapon type;
- deterministic random seed for effects that are intentionally random.

The expected trajectory is a visible arc. Angle and power affect initial velocity; gravity curves the path; wind changes horizontal travel. Guidance systems, shields, and some weapons can alter a projectile after launch.

For a browser implementation, use a fixed simulation step or a deterministic tick accumulator. Rendering may interpolate between simulation states, but the authoritative hit and terrain results must come from the simulation step.

### 4.2 Destructible landscape

The terrain is a shared 2D height or mask field. An explosion should:

1. detect its impact point;
2. apply the weapon’s damage and terrain profile;
3. remove, add, or displace terrain;
4. update tank support and burial state;
5. resolve falling tanks and deaths;
6. redraw the affected region.

Terrain should be generated from a seed and stored as a compact, reproducible representation. The seed and terrain mutations belong in the match state so a reconnecting player sees the same world.

Important baseline behaviors:

- explosions form craters rather than only damaging tanks;
- dirt weapons can add material and bury tanks;
- removing ground under a tank can make it fall;
- tanks can shoot themselves free if buried;
- edge behavior may be configured as bounce, wraparound, or no effect;
- meteor showers and scenery are optional environmental modifiers, not required for the first playable slice.

### 4.3 Collision and resolution order

Use a consistent order for every simulation tick:

1. advance projectile position;
2. test world bounds and terrain collision;
3. test shield and tank collision;
4. resolve the first collision along the swept segment;
5. apply the weapon effect once unless that weapon explicitly creates child effects;
6. mutate terrain;
7. resolve tank support, fall, damage, and death;
8. spawn secondary particles, smoke, napalm, MIRV children, or bounce effects;
9. continue or end the projectile according to its weapon rules.

This order prevents tunneling through thin terrain and prevents a projectile from applying the same impact repeatedly because of frame rate.

## 5. Baseline weapon catalogue

The original family is known for a large payload catalogue. Names below are grouped by the behavior Boom Box should model; they are not a requirement to copy every 1.5 item in the first pass.

| Group | Reference examples | Baseline behavior to capture |
| --- | --- | --- |
| Direct explosive | Cannon, Big Cannon, Mini Nuke, Nuke | Impact crater plus radial damage; larger payloads increase radius and damage. |
| Multi-projectile | MIRV-style warheads, Triple Cannon | One shot creates multiple child projectiles or impact points. |
| Area and persistent | Napalm, Hot Napalm, Smoke | Area effect or lingering terrain/visibility effect after the initial impact. |
| Terrain tools | Liquid Dirt and other earth weapons | Add or remove terrain; can bury or expose tanks. |
| Impact modifiers | Bouncing bombs, riot bombs, sonic effects | Distinct collision or propagation behavior instead of a simple radial explosion. |
| Precision | Tracer, laser, guided or tracing weapons | Shows or adjusts the next trajectory, or resolves as a near-instant line attack. |
| Registered-era additions | Lasers, SuperMags, triple turret | Optional later parity layer, not required for the first Boom Box slice. |

The open-source OpenScorchedEarth reference also exposes a useful implementation vocabulary: cannon, big cannon, triple cannon, mini nuke, nuke, riot bomb, heavy riot bomb, defense pillar bombs, piercer, funky bomb, sonic wave, sonic bomb, and tracer, plus light/heavy shields, parachute, repair kit, and fuel. This list is a design reference only; Boom Box should use its own names, art, balancing, and implementation.

## 6. Utilities and economy

The economy is a major part of the *Scorched Earth* identity. A player should earn or start with money, shop for ordnance and utilities, then decide between immediate damage and survivability.

Baseline utility concepts:

- light and heavy deflector shields;
- shield or battery recharge;
- parachute for a tank falling from terrain;
- repair kit;
- fuel for movement, if movement is enabled;
- tracer ammunition or guidance aid;
- optional turret upgrades or multi-turret equipment.

The reference game’s exact prices and progression are version-dependent. Boom Box should keep prices and inventory limits in a data table so they can be tuned without rewriting the match engine. A shop purchase must be atomic: check funds, decrement funds, increment inventory, and record the transaction before the turn begins.

## 7. Computer opponents

Computer tanks are part of the baseline, not a later cosmetic feature. The original game offered differently skilled computer player types and allowed AI-vs-AI continuation after human elimination. AI should:

- choose a legal weapon from its inventory;
- estimate a shot using angle, power, gravity, wind, and target position;
- account for terrain and self-harm risk;
- use shields, repair, or terrain weapons when strategically useful;
- show optional short pre-shot and defeat messages without delaying the simulation;
- remain subject to the same turn, inventory, damage, and terrain rules as humans.

For the first AI pass, use a bounded search or sampled candidate shots. Store the selected action as a normal match action so human and AI turns share validation and replay behavior.

## 8. Firing modes to preserve as options

The reference family included more than one timing model:

- **Sequential:** one player fires, the shot fully resolves, then the next player acts.
- **Simultaneous:** players prepare shots and multiple projectiles are released in a coordinated phase.
- **Synchronous:** all players choose angle and power before any projectile launches.

Boom Box should start with sequential turns because it is easiest to test and is the clearest baseline. The match model should still reserve a firing phase and a resolution phase so simultaneous and synchronous modes can be added without rewriting the rules.

## 9. Web adaptation for Games

The DOS reference was a hot-seat game. Boom Box will be a browser game, so the baseline needs modern presentation while preserving the decision rhythm.

### 9.1 Recommended first-screen layout

- match title and short rules summary;
- player slots with human/AI selection;
- map and rules controls;
- a clear start button;
- no hidden configuration that changes physics without a visible setting;
- a compact mobile layout that can scroll before the match begins.

### 9.2 Recommended in-match HUD

- terrain and all living tanks;
- active player and turn timer, if enabled;
- wind direction and strength;
- turret angle and power controls;
- weapon selector with inventory count and price/value context;
- health, shield, money, and key utilities;
- fire, cancel, and help controls;
- shot/result log that remains readable on mobile.

### 9.3 Input

Support pointer, touch, and keyboard input. Angle and power must have a precise control path in addition to drag gestures; keyboard users need predictable increments and a visible current value. Never rely on color alone for wind, player identity, or weapon state.

### 9.4 Multiplayer architecture

For online multiplayer, the server should own:

- lobby membership and seat assignment;
- match seed and settings;
- turn ownership and legal-action validation;
- projectile and terrain simulation;
- inventory, money, damage, and win state;
- reconnect tokens and snapshot delivery.

Clients may render prediction or aiming previews, but the server result is authoritative. Each committed shot should have a sequence number and an event record so clients can recover after a dropped connection. Spectators, replay export, and matchmaking can wait until the core match is stable.

## 10. Suggested multi-pass development plan

### Pass 1 — Playable artillery core

- one map seed and one terrain style;
- 2 human hot-seat players;
- sequential turns;
- cannon only;
- angle, power, gravity, wind;
- destructible terrain and damage;
- win/lose and restart flow.

**Acceptance:** two players can finish a complete match, and the same seed plus actions produces the same result.

### Pass 2 — Core weapon and utility layer

- small/big explosive payloads;
- one multi-projectile weapon;
- tracer preview;
- light shield and repair;
- inventory and simple money/shop screen;
- shot log and end-of-match summary.

**Acceptance:** every item has a legal inventory count, a visible effect, and a meaningful test case.

### Pass 3 — Terrain and environmental depth

- persistent area effects;
- dirt add/remove tools;
- falling and burial rules;
- map seeds and multiple terrain profiles;
- optional boundaries, meteor showers, and scenery.

**Acceptance:** terrain mutations are deterministic, visible, and do not allow tunneling or duplicate damage.

### Pass 4 — AI and firing modes

- multiple AI skill levels;
- AI continuation after human elimination;
- synchronous firing;
- simultaneous firing as a separate rules option.

**Acceptance:** AI uses the same validated action path as humans and never advances the turn while a projectile is unresolved.

### Pass 5 — Online multiplayer and polish

- 2–10 seats or an explicitly chosen supported limit;
- lobby, ready state, reconnect, and host transfer;
- authoritative server simulation;
- mobile and keyboard pass;
- accessibility, sound, effects, replay/debug tools.

**Acceptance:** a disconnected player can reconnect to the same seed, terrain, inventory, and turn without desynchronizing the match.

## 11. Open decisions before coding

These decisions should be made explicitly before the first implementation pass:

1. Is Boom Box sequential-only at launch, or should synchronous fire be included in the first version?
2. What is the supported online player limit? The historical reference allowed up to nine other players, but a smaller browser limit may be clearer.
3. Are tanks stationary, or will fuel-powered movement be included?
4. Which five weapons and two utilities form the first balanced loadout?
5. Should money persist between matches, or reset per match?
6. Should wind and gravity be visible exact values or only directional/qualitative indicators?
7. What is the target visual style: retro-inspired, modern neon, or a hybrid?
8. Are random events enabled by default or opt-in?
9. Which features are deliberately Boom Box changes rather than historical parity?
10. What is the rules policy for ties, simultaneous kills, and a last shot that kills the shooter and target together?

## 12. Verification checklist for every implementation pass

- [ ] A complete match can be started, played, won, lost, and exited.
- [ ] Only the active player can commit a sequential shot.
- [ ] A projectile cannot tunnel through thin terrain or apply an impact twice.
- [ ] Terrain, tank support, falling, burial, shields, and damage resolve in a fixed order.
- [ ] The next turn waits until every projectile and secondary effect is finished.
- [ ] Inventory and money cannot become negative through duplicate or repeated actions.
- [ ] Human and AI actions use the same server validation path.
- [ ] A match seed and action log reproduce the same result.
- [ ] Mobile controls remain usable in portrait and landscape.
- [ ] Screen-reader labels and non-color indicators identify the active player, wind, weapon, health, and turn state.
- [ ] End-of-match results identify the winner and all surviving players.

## 13. Source and reference material

These sources were consulted on 2026-09-28. They are references for mechanics and history, not assets to copy into Boom Box.

1. **Wikipedia — Scorched Earth (video game)**  
   https://en.wikipedia.org/wiki/Scorched_Earth_(video_game)  
   Release history, modes, player count, configuration options, weapons/utilities, terrain behavior, firing modes, and historical context.

2. **Official Scorch site / archived developer material**  
   http://whicken.com/scorch/  
   `faq.html` and the linked 1.2/1.5 distribution pages document version changes, synchronous mode, added weapons, shields, lasers, simultaneous-mode improvements, and the original distribution context.

3. **OpenScorchedEarth source reference**  
   https://github.com/benapetr/OpenScorchedEarth  
   Open-source reimplementation used to cross-check vocabulary for weapons, shields, utilities, tank state, terrain updates, and projectile categories. Its code and assets are not part of Boom Box.

4. **OpenScorchedEarth playable project page**  
   http://game.insw.cz/scorche/  
   A modern reimplementation reference for the broad artillery presentation and game loop.

5. **Ars Technica interview with Wendell Hicken**  
   https://arstechnica.com/features/2005/03/scorched/  
   Historical developer context and the game’s place in the shareware artillery genre.

6. **Computer Gaming World review reference**  
   https://www.cgwmuseum.org/galleries/index.php?year=1993&pub=2&id=110  
   Contemporary commentary on configurability, playability, graphics, and value.

## 14. IP and implementation boundary

Boom Box should be an original game inspired by the baseline loop. Do not copy the original executable, source, artwork, sound, text, taunts, UI images, logo, or exact branding. Use original names, assets, interface text, balancing, and code. This document records mechanics and design observations so later passes have a stable target while leaving the implementation and presentation original.
