# AVE MARIA

A short first-person story game in the style of Valve's *Half-Life* and *Portal*: a silent protagonist, a cheerfully
useless PA announcer, a gravity-gun-like tool, physics puzzles, and a very large rocket.

**Premise.** Earth is dying from the inside. Deep-mantle probes found *Cellula voratrix* ("the Cells"), a silicate colonial
organism that feeds on the heat of the outer core. The **Ave Maria Program** has one answer: the crewed **DX-90**,
launched on the reusable **Gabriel** booster, carrying the **HALO Array**, an orbital resonance emitter that can shatter the
Cells' lattice from above. You are **Alan Mercer**, 3rd-shift Launch Systems Technician. Today is launch day, T-minus four
hours. During a final calibration test the Cells answer back, and the automated launch crew is gone.

Four chapters, about 20 minutes:

1. **Ave Maria Inbound** - a tram ride through the complex, your EVA suit, Officer Brooks.
2. **Core Sample** - Lab C-4, the resonance chamber, the breach, a wrench.
3. **Containment Failure** - the M-7 Field Manipulator, crate stacking, a fuse-cell door, barrel-bombing Cell nests.
4. **Pad 39** - night, three propellant valves, the tower lift, boarding the DX-90, the launch, the Overseer.

## Controls

| Key | Action |
| --- | --- |
| `W A S D` | Move |
| Mouse | Look |
| `Space` | Jump (hold to bunny-hop) |
| `Ctrl` / `C` | Crouch |
| `Shift` | Walk slowly |
| `E` | Use (hold for chargers and valves) |
| Left mouse | Wrench swing / **M-7 punt** |
| Right mouse | **M-7 grab / hold / drop** |
| `1` / `2` / mouse wheel | Switch tool |
| `Esc` | Pause |
| `F11` | Fullscreen (desktop app) |

Health and suit chargers are on the walls; hold `E` while looking at them. Explosive barrels are red.

## Cheats & developer console

Ave Maria ships the authentic Valve way of cheating: a Source-style developer console.

- Press `` ` `` / `~` (or `F10` if your keyboard makes backtick awkward) to open it, in-game or in the menus. Opening it
  releases the mouse and freezes the game; `Esc` (or the key again) closes it and re-locks the pointer. `Esc` never opens
  the pause menu while the console is up.
- Cheat commands refuse to run until you type **`sv_cheats 1`**. (`sv_cheats 0` switches every active cheat back off.)
  Active cheats are listed in an amber `CHEATS: ...` line under the HUD.
- `Up` / `Down` recall the last 30 commands, `Tab` completes command names (suggestions appear under the input), `PageUp` /
  `PageDown` scroll the log. Commands are case-insensitive. `help` lists everything, `help <cmd>` shows one.
- Options has a **Developer console** toggle (default on). When it is off, `~` does nothing in game (it still works on the
  main menu).
- **Konami code** on the main menu (`Up Up Down Down Left Right Left Right B A`) unlocks every chapter in CHAPTER SELECT
  (persisted), beeps, shows "DEVELOPER MODE UNLOCKED" and sets `sv_cheats 1` for the session.

`impulse 101` is the classic: all weapons, full health and suit.

| Command | Cheat? | What it does |
| --- | :---: | --- |
| `help` / `cmdlist` `[cmd]` | | List commands, or describe one |
| `sv_cheats 0\|1` | | Allow cheat commands; `0` turns all cheats off |
| `clear` | | Clear the console |
| `echo <text>` | | Print text |
| `fov <60-110>` | | Field of view (saved) |
| `sensitivity <n>` | | Mouse sensitivity |
| `volume <0-1>` | | Master volume |
| `cl_showfps 0\|1` | | FPS counter |
| `r_postfx 0\|1` | | Bloom / vignette / grain |
| `subtitles 0\|1` | | Subtitles |
| `chapter <1-4>` / `map <1-4>` | | Load a chapter; also `inbound`, `core`, `containment`, `pad39` |
| `quit` / `exit` | | Quit the desktop app (main menu in a browser) |
| `version` | | Game version |
| `status` | | Chapter, health, suit, position, active cheats |
| `god` | yes | Toggle god mode |
| `buddha` | yes | Take damage, but health never drops below 1 |
| `noclip` | yes | Fly through walls: `WASD` along the view, `Space` up, `Ctrl`/`C` down, `Shift` fast |
| `notarget` | yes | Crawlers, Spitters and Nests ignore you |
| `impulse 101` | yes | All weapons (wrench + M-7, even in chapters 1-2), health 100, suit 100 |
| `give <item>` | yes | `wrench`, `manipulator`, `medkit`, `battery`, `health`, `suit` (`give` alone lists them) |
| `hurtme <n>` | yes | Take `n` damage |
| `kill` | yes | Suicide (normal death screen) |
| `killall` | yes | Kill every living enemy |
| `ent_create <type>` | yes | Spawn `crawler`, `spitter`, `crate`, `barrel` or `barrel_explosive` 3 m in front of you |
| `host_timescale <0.1-5>` | yes | Slow-motion / fast-forward of the game world |
| `sv_gravity <n>` | yes | World gravity in Source units (default 600) |
| `sv_lowgrav` | yes | Toggle gravity 150 / 600 |
| `infinite_suit` | yes | The suit never drains |
| `superpunt` | yes | Supercharged M-7: punt force x4, range x2, can grab and fling enemies (they die on impact) |
| `skip` / `ent_fire objective complete` | yes | Complete the current objective |
| `bighead` | yes | Giant NPC heads and creatures |

## Run it (development)

```bash
npm install
npm run dev        # http://localhost:5173
```

Debug helpers: `http://localhost:5173/?chapter=3` starts directly at a chapter. `window.__game` exposes `chapter`, `health`,
`state`, `objective`, `skipTo(n)`, `completeObjective()`, `setGod(true)`, `teleport(x,y,z)` for automated tests.
`?noassets` forces the all-procedural fallbacks (no textures/models/sound files), `?noglb` skips the glTF models.

```bash
npm run build      # production bundle in dist/
npm start          # run the Electron shell on dist/ (after npm run build)
npm test           # headless Playwright smoke test (builds, loads the menu + all 4 chapters, saves screenshots), the console/cheats test and the tram-exit walk
npm run test:play  # same, plus drives every chapter to the credits through completeObjective()
npm run test:walk  # real key/mouse input: full chapter 1 walk-through + chapter 2/3/4 gate checks (doors, cart, grab, valves, lift)
```

## Get the macOS DMG

The DMG can only be built on macOS (it needs `hdiutil`), so it is built by GitHub Actions on `macos-latest`
(`.github/workflows/build-mac.yml`):

* **Every push** to `main` or a `claude/**` branch: open the *Actions* tab, pick the run, and download the
  **ave-maria-mac-dmg** artifact. It contains an x64 and an arm64 DMG.
* **Tagged releases**: push a tag like `v1.0.0` and the same workflow attaches the DMGs to a GitHub **Release**.
* On a Mac you can also build locally: `npm ci && npm run dist:mac` (output in `release/`).

### The app is unsigned

The DMG is not code-signed or notarised. On first launch macOS Gatekeeper will complain. Either:

* right-click `Ave Maria.app` and choose **Open** (then **Open** again), or
* run `xattr -cr "/Applications/Ave Maria.app"` in Terminal once, then open it normally.

## Tech

Three.js + cannon-es (props), a custom AABB character controller, Vite, Electron + electron-builder. The game runs
completely without asset files: every texture, model and sound has a procedural fallback (`src/core/Assets.js`,
`src/render/Proc*.js`, `src/core/synth.js`). If `public/assets/manifest.json` exists its files are used instead. The DX-90
and the Gabriel booster are always built procedurally (`src/render/Rocket.js`) because the launch cinematic animates their
legs, grid fins and HALO petals. Voices use the Web Speech API (`speechSynthesis`); subtitles are always shown.

## Credits

Asset authors and licences are listed in [`public/assets/CREDITS.md`](public/assets/CREDITS.md) and in the in-game credits roll,
which reads `public/assets/manifest.json`.
