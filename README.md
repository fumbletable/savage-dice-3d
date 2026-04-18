# Savage Dice 3D

An Owlbear Rodeo extension for rolling Savage Worlds (SWADE / SW Pathfinder) dice. Real physics-driven 3D dice with ace chains, wild dies, and live broadcast so every player at the table sees every tumble.

**Current version:** v0.7.1 — [release notes](https://github.com/fumbletable/savage-dice-3d/releases)

## Install in Owlbear Rodeo

1. Open any OBR room (you'll be GM of rooms you create)
2. Settings (⚙, bottom-left) → **Extensions** → **Add Extension**
3. Paste: `https://fumbletable.github.io/savage-dice-3d/manifest.json`
4. Click **Add** → the dice icon appears in the top-left toolbar

Existing users auto-update — just hard refresh the OBR tab. If a previous install sticks, remove + re-add once.

## Using it

**Rolling a trait:**
1. Click the Savage Dice 3D icon → popover opens
2. **TRAIT** tab is default
3. Pick your die (D4 / D6 / D8 / D10 / D12)
4. Toggle **Wild Card** on or off (adds a d6 Wild Die)
5. Adjust modifier with the − / + / reset controls
6. Click **Roll** — dice tumble on screen, settle, and the best total appears

**Rolling damage:**
1. Switch to the **DAMAGE** tab
2. Tap dice to add them to the pool (click multiple times for 2×d6 etc.)
3. Remove a die by clicking its chip; use **clear** to reset the pool
4. Click **Roll** — all dice tumble together, total is the sum

**Settings (⚙ tab):**
- Pick your **Main dice** pack (affects trait + damage dice)
- Pick your **Wild die** pack separately — SWADE convention is that the wild die stands apart visually
- Choice saves to this browser; every player picks their own

**Watching other players:**
- When someone else rolls, your popover auto-opens
- Their dice tumble in a mini-tray bottom-right with their name + coloured border
- Newer rolls replace older ones — the main tray shows only the most recent
- Every roll lands in the rolls log below the roll button, so nothing is lost

## Features

### SWADE mechanics handled automatically
- **Ace chains:** rolling max on a die (6 on d6, 8 on d8, etc.) re-throws the same physical die, chained value reported
- **d10 → 0 = 10:** face reading handled per the SWADE d10 convention
- **Wild Die:** a second d6 physically rolls alongside the trait die; best-of-two highlighted in the result
- **Modifier:** applied to the final total per mode (trait = best-of + mod, damage = sum + mod)

### Multi-player broadcast
- Roll state publishes via `OBR.player.setMetadata` — all party members see the tumble on their own screen
- Deterministic physics (fixed timestep, no interpolation) so everyone sees the same dice land in the same places
- Popover auto-opens on remote rolls so you don't miss the moment
- Late-joiner snap: if your popover opens after the roll already settled, you see the final resting pose instead of a blank tray
- Hidden-roll flag supported in the schema (GM-private rolls — no UI toggle yet)

### Visual
- PBR-textured dice using baked-albedo materials from [owlbear-rodeo/dice](https://github.com/owlbear-rodeo/dice) (GPL-3.0) — 7 packs: Galaxy, Gemstone, Iron, Nebula, Sunrise, Sunset, Walnut
- Styled to match Savage Deck — warm-near-black, purple accent, thin borders
- Rolls log shows last 50 rolls with player colour, name, total, dice breakdown
- Version badge rendered in the scene so cache state is verifiable at a glance

## Coming later

- **Tray mesh + HDR environment** — biggest remaining visual upgrade
- **Hidden roll UI** — GM checkbox for private rolls (schema already supports it)
- **Broadcast the roller's pack choice** — so everyone sees your dice in the pack you picked
- **Pack previews** — thumbnails in the settings dropdown
- **Authoritative transform snap** — port `finishedTransforms` from owlbear-rodeo/dice if sims visibly diverge
- **Glass pack** — OBR's glass material uses a transparency mask rather than standard ORM, would need its own shader

## Feedback

Open an issue on this repo, or tell your GM.

## Local development

```bash
cd app
npm install
npm run dev
```

Dev server runs on `http://localhost:5173/popover.html`. OBR-specific features (broadcast, auto-open) no-op outside OBR — rolling still works locally so you can iterate on physics and visuals.

Pushes to `main` auto-deploy to GitHub Pages in ~30 seconds.

## Project docs

- `projects/savage-dice-3d/PLAN.md` (in the [8020Brain repo](https://github.com/...)) — architecture, broadcast schema, deferred work
- `app/src/lib/types.ts` — broadcast-compatible physics primitives (`DiceThrow`, `DiceTransform`, `SavageRoll`)
- `app/src/lib/DiceRollSync.tsx` — publishes roll state to OBR player metadata
- `app/src/lib/usePlayerDice.ts` — hydrates other players' metadata into roll state
- `app/src/components/PhysicsDie.tsx` — per-die Rapier rigid body, settle detection, imperative re-fire for aces
- `app/src/components/DiceScene.tsx` — `<Physics>` config (deterministic), tray colliders, camera
- `app/src/background.ts` — auto-opens popover on remote rolls

## License

GPL-3.0 — see [LICENSE](LICENSE).

This project incorporates substantial material from [owlbear-rodeo/dice](https://github.com/owlbear-rodeo/dice) (GPL-3.0) including dice GLB meshes, PBR texture packs, convex hull collider geometry, and architectural patterns for roll broadcast. Under GPL-3.0's copyleft terms, the combined work is itself GPL-3.0. If you fork or modify, keep it free and share-alike.

## Credits

- Dice GLB meshes + PBR texture packs + collider geometry: [owlbear-rodeo/dice](https://github.com/owlbear-rodeo/dice) (GPL-3.0) by Owlbear Rodeo
- Built by [Fumble Table](https://fumbletable.com)
