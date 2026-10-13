# AVE MARIA — Design & Build Plan

A short first-person story game in the style of Valve's Half-Life and Portal: a silent protagonist, no cutscenes that take control from the player (except the final launch), environmental storytelling, a PA announcer, chapter title cards, physics puzzles and a gravity-gun-like tool.

## 1. Story

**Earth is dying from the inside.** In 2031 deep-mantle probes found *Cellula voratrix* ("the Cells"), a silicate-based colonial organism that feeds on the thermal energy of Earth's outer core. The core is cooling, the magnetosphere is failing, and the Cells are climbing upward through the crust.

**The Ave Maria Program** is a joint international space project run from the **Ave Maria Launch Complex** in a desert test range. Its flagship is the **DX-90**, a crewed deep-space vessel that launches on a **reusable launch vehicle (RLV)** booster called **"Gabriel"**. The booster separates, flips and lands back on its pad. The DX-90 carries the **HALO Array**: an orbital resonance emitter that will pulse a tuned frequency through the planet and shatter the Cells' lattice from above. Ground-based emitters can't do it because the crust damps the signal.

**Alan Mercer** (the player, silent) is a 3rd-shift Launch Systems Technician. Today is launch day, T-minus 4 hours.

During a final calibration test, the HALO resonance is fired at a live Cell core sample in Lab C-4. The sample *answers*. A "resonance breach" (Valve-style, our version of the resonance cascade) wakes every Cell colony under the complex. They break through the floors. Alan must get to Pad 39 and launch the DX-90 manually (the automated launch crew is dead or gone).

**Cast** (NPCs are simple figures with speech text and voices, not complex AI)
- **Dr. Ilse Varga**: HALO project lead (Dr. Kleiner/Eli figure). Guides Alan over radio.
- **Officer Dale Brooks**: complex security (Barney figure). "Hey Mercer, you owe me a coffee."
- **The PA Announcer**: dry, cheerful, bureaucratic (Black Mesa announcer and GLaDOS tone).
- **The Overseer**: a man in a grey suit glimpsed at a distance behind glass (G-Man figure). He has one line at the very end.

**Ending**: the DX-90 lifts off on Gabriel. Stage separation; the booster flips and lands on the pad (shown from the window cam). The DX-90 climbs to orbit, the HALO Array unfolds and the screen goes white. Black screen, then the Overseer: *"Prepare for... re-entry, Mr. Mercer."* Credits.

## 2. Chapters (levels)

Each chapter opens with a Half-Life-style title card: white text, lower left, fading in and out ("CHAPTER 1 — AVE MARIA INBOUND").

1. **Ave Maria Inbound** (on rails, ~2 min). Alan rides a monorail tram through the complex: the VAB, cell-containment silos, and the DX-90 on the Gabriel booster visible through a window at Pad 39. The PA announcer gives safety notices and lore. The tram stops at Sector C. Alan walks to the locker room, picks up the **EVA suit** (the HUD turns on), and talks to Brooks at the security desk. Tutorial: move, jump, crouch, use (E).
2. **Core Sample** (scripted event). Lab C-4. Varga asks Alan to push the sample cart into the resonance chamber (a physics push). Alan presses the big button. The resonance breach follows: screen shake, lights die, red emergency lights, alarms, PA garbled. Cells burst from floor vents and the first enemies appear. Alan picks up a **Hydraulic Wrench** (melee weapon).
3. **Containment Failure** (combat and puzzles). Alan takes the damaged service corridors to the maintenance bay and finds the **M-7 Field Manipulator** (gravity gun: LMB punt, RMB grab/hold/drop). Physics puzzles:
   - stack crates to climb a ledge
   - grab a fuse cell and insert it into a socket to power a door
   - use the manipulator to throw explosive barrels at Cell nests

   Enemies: **Crawlers** (small, fast, leap at you; like headcrabs) and **Spitters** (stationary or slow, fire acid globs). Health and suit chargers on the walls; pickups for medkits and suit batteries.
4. **Pad 39** (finale). Outdoors at night with floodlights. The DX-90 stands on the Gabriel booster with a service tower beside it. Alan must open **3 propellant valves** around the pad (an objective counter on the HUD) while Cells swarm. Then he rides the tower elevator to the crew access arm, boards, and presses LAUNCH. The launch sequence plays: countdown, liftoff, stage separation, booster return and landing, orbit, HALO deploy, white-out, the Overseer, credits.

Target length is 15–25 minutes.

## 3. Valve-style feel checklist
- Silent first-person protagonist with smooth, fast movement (Source-like acceleration, bunny-hop not required), crouch, jump and a use key.
- HUD in the lower corners with the amber/orange HL palette: `HEALTH` and `SUIT`, ammo/tool in the lower right, a crosshair, and damage-direction indicators.
- Subtitles/closed captions for every voice line, with a coloured speaker name.
- Voice lines play through the Web Speech API (`speechSynthesis`), which works offline in Electron on macOS. The announcer gets a different pitch and rate. Use different voices where available.
- Chapter title cards, a fade from black at the start, and a "Loading..." strip between levels.
- Main menu: big title "AVE MARIA" on the left with menu items (NEW GAME, CHAPTER SELECT, OPTIONS, QUIT) over a slowly drifting 3D background of the DX-90 on the pad.
- Options menu: mouse sensitivity, invert Y, volume (master/music/sfx), FOV, subtitles on/off. Save options to localStorage.
- Lighting: point lights, emergency red lights, flickering fluorescents and bloom. Post-processing: UnrealBloomPass, light vignette and film grain.
- Levels use brush-style geometry (boxes and ramps) with textures: concrete, metal floor panels, hazard stripes, tile, and Valve-orange "dev" textures only as a fallback.
- Physics props: crates, barrels, carts, fuse cells and debris.
- Saves: autosave at each chapter start (localStorage); "Continue" in the menu.

## 4. Tech stack
- **Three.js** (r16x+) for rendering and **cannon-es** for physics. Use a kinematic capsule for the player, or a sphere body with a custom controller.
- **Vite** for the build and **Electron** for the desktop shell. **electron-builder** packages a macOS **DMG** for both x64 and arm64.
- The DMG is built on **GitHub Actions `macos-latest`**, because DMG creation needs macOS `hdiutil`. The workflow is `.github/workflows/build-mac.yml`. It runs on push to any `claude/**` branch and on `v*` tags, uploads the DMG as an artifact, and on tags also creates a GitHub Release with the DMG attached. The build is unsigned; the README explains right-click → Open, or `xattr -cr "/Applications/Ave Maria.app"`.
- Plain JavaScript (ES modules). No TypeScript, to keep it simple.
- Must also run in a browser (`npm run dev`), so it can be tested headlessly with Playwright/Chromium in Linux CI and in the dev container.

## 5. Repository layout
```
package.json            # scripts: dev, build, start (electron), dist:mac, test
vite.config.js          # base: './' so file:// works inside Electron
electron/main.cjs       # BrowserWindow, fullscreen toggle (F11), loads dist/index.html
electron/preload.cjs    # exposes quit()
index.html
src/
  main.js               # bootstrap, game loop
  core/                 # Input, Audio, Assets (manifest loader + procedural fallbacks), Save, Settings
  render/               # renderer, post-processing, materials
  physics/              # cannon world helpers
  player/               # PlayerController, weapons (Wrench, Manipulator)
  entities/             # Crawler, Spitter, NPC, Prop, Trigger, Door, Button, Valve, Charger, Pickup
  levels/               # level01_inbound.js ... level04_pad39.js + LevelBuilder (brush helpers)
  ui/                   # HUD, Menu, Subtitles, ChapterCard, Fader, Credits
  story/                # dialogue lines (text + speaker + voice params), scripted sequences
public/assets/          # OWNED BY THE ASSET AGENT (see §6)
build/icon.png          # 1024x1024 app icon (asset agent)
.github/workflows/build-mac.yml
README.md
```

## 6. Asset contract (shared between both agents)

The asset agent fills `public/assets/` and writes `public/assets/manifest.json`:
```json
{
  "textures": { "<key>": { "path": "textures/concrete_wall.jpg", "repeat": 2, "license": "CC0", "source": "<url>" } },
  "models":   { "<key>": { "path": "models/crate.glb", "scale": 1.0, "license": "...", "source": "..." } },
  "sfx":      { "<key>": { "path": "sfx/footstep_metal_1.ogg", "license": "...", "source": "..." } },
  "music":    { "<key>": { "path": "music/menu_theme.ogg", "license": "...", "source": "..." } }
}
```
The coder's `Assets` module loads the manifest. **Every key must have a procedural fallback** (canvas-generated texture, primitive mesh, WebAudio-synthesized sound), so the game runs with zero assets. A missing or failed key is never fatal.

Required keys (asset agent: try to fill all; coder: use exactly these names):

**textures** (tileable, ≤1024px, JPG/PNG; with a matching `_normal` map where available, key `<key>_normal`)
`concrete_wall`, `concrete_floor`, `metal_floor`, `metal_wall`, `metal_plate`, `tile_white`, `tile_floor`, `hazard_stripes`, `ceiling_panel`, `rust_metal`, `asphalt`, `sand_ground`, `cell_flesh` (organic/alien veiny surface for the Cells), `crate_wood`, `crate_metal`, `glass_dirty`, `sky_night` (equirect or a big gradient image), `logo_avemaria` (the program logo, generated: a stylised "AM" with a halo ring)

**models** (glTF/GLB, small, low-poly preferred)
`crate`, `barrel`, `barrel_explosive`, `cart`, `computer_console`, `chair`, `desk`, `locker`, `pipe_straight`, `valve_wheel`, `fuse_cell`, `medkit`, `battery`, `wrench`, `manipulator` (any sci-fi gun model), `npc_scientist`, `npc_guard`, `npc_overseer` (any humanoid, ideally rigged/animated; one humanoid reused is fine), `crawler` (creature: spider/insect/crab-like), `spitter` (creature), `rocket_booster` and `spaceship_dx90` (if unavailable, the coder builds them procedurally from cylinders, cones and fins; this is fine and expected), `tram`

**sfx** (OGG preferred, or MP3/WAV; short)
`footstep_concrete_1..4`, `footstep_metal_1..4`, `jump_land`, `wrench_swing`, `wrench_hit_flesh`, `wrench_hit_metal`, `manipulator_punt`, `manipulator_grab`, `manipulator_drop`, `manipulator_dryfire`, `door_open`, `door_close`, `button_press`, `button_denied`, `alarm_loop`, `explosion_1`, `explosion_2`, `glass_break`, `metal_impact_1..3`, `crawler_idle`, `crawler_attack`, `crawler_die`, `spitter_spit`, `spitter_die`, `acid_hit`, `player_hurt_1..3`, `suit_beep` (HEV-style chime), `suit_charge_loop`, `health_charge_loop`, `pickup_item`, `valve_turn`, `tram_loop`, `tram_brake`, `elevator_loop`, `rumble_loop`, `rocket_launch_loop`, `stage_separation`, `pa_chime` (ding-dong before announcements), `ui_hover`, `ui_click`, `fluorescent_hum_loop`, `spark_1`

**music** (OGG/MP3, CC0/CC-BY, loopable where possible)
`menu_theme` (atmospheric synth), `inbound_ambient`, `breach_action` (tense percussive), `combat_loop`, `pad39_finale` (epic/driving), `credits_theme`

Licensing rule: use only **CC0, CC-BY, CC-BY-SA, MIT, or public domain** assets. Every file gets a row in `public/assets/CREDITS.md` (file, title, author, license, source URL). The credits screen in-game reads `manifest.json` to list authors.

Network note (dev container): poly haven, kenney.nl, opengameart, freesound, ambientcg and wikimedia are **blocked**. Use **GitHub** (`git clone --depth 1 --filter=blob:none --sparse` and `raw.githubusercontent.com`), **npm** packages and **PyPI** packages that bundle CC0 assets. Examples: the three.js repo `examples/textures`, `examples/models`, `examples/sounds`; KhronosGroup/glTF-Sample-Assets; GitHub mirrors of Kenney CC0 packs; CC0 music repos. When something cannot be found, **synthesize it** (Python + numpy for SFX and music as OGG via ffmpeg or soundfile; Pillow + noise for tileable textures) and mark the license as `CC0 (generated)`. Keep the total under ~120 MB and every file under 20 MB.
