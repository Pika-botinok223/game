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
npm test           # headless Playwright smoke test (builds, loads the menu + all 4 chapters, saves screenshots)
npm run test:play  # same, plus drives every chapter to the credits through completeObjective()
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
