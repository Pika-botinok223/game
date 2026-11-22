import * as THREE from 'three';
import './ui/style.css';
import { Renderer } from './render/Renderer.js';
import { LightPool } from './render/LightPool.js';
import { ParticleSystem } from './render/Particles.js';
import { Input } from './core/Input.js';
import { AudioManager } from './core/Audio.js';
import { assets } from './core/Assets.js';
import { Settings } from './core/Settings.js';
import { Save } from './core/Save.js';
import { Scheduler } from './core/Scheduler.js';
import { StaticWorld } from './physics/Collision.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { Player } from './player/Player.js';
import { HUD } from './ui/HUD.js';
import { Fader } from './ui/Fader.js';
import { ChapterCard } from './ui/ChapterCard.js';
import { Subtitles } from './ui/Subtitles.js';
import { Screens } from './ui/Screens.js';
import { Credits } from './ui/Credits.js';
import { Dialogue } from './story/Dialogue.js';
import { CHAPTERS } from './story/lines.js';
import { LevelBuilder } from './levels/LevelBuilder.js';
import { LEVELS, buildMenuScene } from './levels/index.js';
import { DevConsole } from './ui/Console.js';
import { Crawler } from './entities/Crawler.js';
import { Spitter } from './entities/Spitter.js';

const QUOTES = [
  'The Cells thank you for your contribution.',
  'Have you tried not being eaten?',
  'This incident has been reported to the Ave Maria Program. Nobody will read the report.',
  'Statistically, launch days are the safest days to be near a rocket. Statistically.',
  'Mister Mercer, please do not die. It is bad for morale.',
];

export class Game {
  constructor() {
    this.canvas = document.getElementById('view');
    this.uiRoot = document.getElementById('ui');
    this.params = new URLSearchParams(location.search);
    this.debug = this.params.has('chapter') || this.params.has('debug');
    this.renderer = new Renderer(this.canvas);
    this.scene = this.renderer.scene;
    this.camera = this.renderer.camera;
    this.input = new Input(this.canvas);
    this.audio = new AudioManager();
    this.scheduler = new Scheduler();
    this.hud = new HUD(this.uiRoot);
    this.fader = new Fader(this.uiRoot);
    this.subtitles = new Subtitles(this.uiRoot);
    this.chapterCard = new ChapterCard(this.uiRoot);
    this.dialogue = new Dialogue(this, this.subtitles);
    this.screens = new Screens(this.uiRoot, this);
    this.credits = new Credits(this.uiRoot);
    this.loadingEl = document.createElement('div');
    this.loadingEl.className = 'loading';
    this.loadingEl.innerHTML = '<span>LOADING...</span><div class="bar"><div></div></div>';
    this.uiRoot.appendChild(this.loadingEl);

    // persistent scene furniture
    this.ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.hemi = new THREE.HemisphereLight(0xaabbdd, 0x222222, 0.5);
    this.scene.add(this.ambient, this.hemi);
    this.levelRoot = new THREE.Group();
    this.scene.add(this.levelRoot);
    this.lights = new LightPool(this.scene, 7);
    this.fx = new ParticleSystem(this.scene, { max: 3000, additive: true });
    this.smoke = new ParticleSystem(this.scene, { max: 800, additive: false });

    this.statics = new StaticWorld();
    this.physics = new PhysicsWorld();
    this.props = this.physics.props;
    this.entities = [];
    this.enemies = [];
    this.flickerFixtures = [];
    this.timedLights = [];
    this.loops = [];
    this._dmg = [];
    this.time = 0; this.dt = 0.016;
    this.rumble = 0;
    this.state = 'boot';
    this.chapter = 0;
    this.level = null;
    this.objective = null;
    this.godMode = this.params.has('god');
    this.testMode = this.params.has('test');
    this.ups = parseInt(this.params.get('ups') || '8', 10);
    this.dtStep = 0.05;
    this.cutscene = false;
    this.camControl = null;
    this.loadToken = 0;

    // ---- cheats / developer console state (see core/Commands.js)
    this.svCheats = false;
    this.cheats = { buddha: false, notarget: false, infinite_suit: false, superpunt: false, bighead: false };
    this.timescale = 1;
    this.gravityUnits = 600; // Source units: 600 = default
    this.showFps = false;
    this._konami = [];

    this.player = new Player(this);
    this.console = new DevConsole(this);

    this.input.onLockChange = (locked) => {
      if (!locked && this.state === 'playing' && !this.debug && !this.noPause && !this.console.open) this.pause();
    };
    window.addEventListener('keydown', (e) => this._konamiKey(e));
    window.addEventListener('keydown', (e) => {
      if (this.console.open) return;
      if (e.code === 'Escape') {
        if (this.state === 'playing' && !this.noPause) this.pause();
        else if (this.state === 'paused') this.resume();
      }
    });
    window.addEventListener('blur', () => { if (this.state === 'playing' && !this.debug && !this.noPause && !this.console.open) this.pause(); });

    this._last = performance.now();
    requestAnimationFrame((t) => this._frame(t));
  }

  // ------------------------------------------------------------------ boot / menu
  async boot() {
    const bar = this.loadingEl.querySelector('.bar > div');
    this.loadingEl.classList.add('show');
    await assets.init(this.audio.ctx, (p) => { bar.style.width = Math.round(p * 100) + '%'; });
    this.loadingEl.classList.remove('show');
    if (this.params.has('chapter')) {
      const n = Math.max(1, Math.min(4, parseInt(this.params.get('chapter'), 10) || 1));
      await this.startChapter(n);
    } else {
      await this.toMenu(true);
    }
  }

  async toMenu(first = false) {
    this.state = 'menu';
    this.input.enabled = false;
    this.input.exitLock();
    this.cutscene = false; this.camControl = null;
    this._resetWorld();
    this.hud.setVisible(false); this.hud.showAll(true);
    this.renderer.renderViewmodel = false;
    this.dialogue.clear();
    this.setObjective(null);
    const b = new LevelBuilder(this);
    this.menuScene = buildMenuScene(this, b);
    b.finish();
    this.camera.fov = Settings.get('fov'); this.camera.updateProjectionMatrix();
    this.screens.main();
    this.audio.music('menu_theme', { fade: 2 });
    this.fader.set(1);
    await this.fader.clear(first ? 1.6 : 0.8);
  }

  newGame() { this.player.has.wrench = false; this.player.has.manipulator = false; this.startChapter(1); }
  continueGame() { const s = Save.load(); this.startChapter(s ? s.chapter : 1); }
  quit() { if (window.avemaria && window.avemaria.quit) window.avemaria.quit(); else window.close(); }

  // ------------------------------------------------------------------ chapter lifecycle
  async startChapter(n) {
    const token = ++this.loadToken;
    this.screens.hide();
    this.state = 'loading';
    this.input.enabled = false;
    this.input.exitLock();
    this.dialogue.clear();
    this.loadingEl.classList.add('show');
    this.loadingEl.querySelector('.bar > div').style.width = '30%';
    await this.fader.to('black', this.menuScene ? 0.6 : 0.05);
    this.audio.music(null, { fade: 0.8 });
    this._resetWorld();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const mod = LEVELS[n - 1];
    const b = new LevelBuilder(this);
    this.chapter = n;
    this.menuScene = null;
    this.camControl = null; this.cutscene = false;
    this.applyGravity();
    this.level = mod.build(this, b);
    b.finish();
    this.loadingEl.querySelector('.bar > div').style.width = '90%';
    // player inventory by chapter
    const p = this.player;
    p.reset(this.level.spawn.x, this.level.spawn.y, this.level.spawn.z, this.level.spawn.yaw || 0);
    p.hasSuit = n >= 2 || !!this.level.hasSuit;
    p.suit = n >= 2 ? 60 : 0;
    p.has.wrench = n >= 3 || (n === 2 && false);
    p.has.manipulator = n >= 4;
    p.current = null;
    p.holsterAll();
    this.hud.setWeaponsAvailable(p.has);
    if (p.has.manipulator) p.select('manipulator'); else if (p.has.wrench) p.select('wrench');
    this.renderer.renderViewmodel = !!p.current;
    this.hud.setVisible(p.hasSuit);
    this.hud.setCrosshair('normal');
    this.hud.setCounter(null);
    this.hud.lastH = -1; this.hud.lastS = -1;
    Save.write(n);
    this.time = 0;
    await new Promise((r) => setTimeout(r, 450));
    if (token !== this.loadToken) return;
    this.loadingEl.classList.remove('show');
    this.state = 'playing';
    this.input.enabled = true;
    this.input.clearAll();
    this.input.requestLock();
    if (!this.debug) setTimeout(() => { if (this.state === 'playing' && !this.input.locked && !this.screens.current) this.screens.clickToStart(); }, 700);
    this.audio.resume();
    if (this.level.music) this.audio.music(this.level.music, { fade: 2 });
    this.fader.clear(1.4);
    const ch = CHAPTERS[n - 1];
    this.chapterCard.show(ch.num, ch.title, 3.2);
    if (this.level.run) this.scheduler.run((s) => this.level.run(s), this);
  }

  async completeChapter() {
    if (this.chapter >= 4) return;
    const n = this.chapter + 1;
    await this.fader.to('black', 1.0);
    await this.startChapter(n);
  }

  _resetWorld() {
    this.scheduler.cancelAll();
    this.loopsStop();
    if (this.level && this.level.dispose) { try { this.level.dispose(); } catch (e) { console.error(e); } }
    this.level = null;
    for (const e of this.entities) { try { e.dispose(); } catch (err) { /* ignore */ } }
    this.entities.length = 0; this.enemies.length = 0; this.flickerFixtures.length = 0; this.timedLights.length = 0;
    this.player.weapons.manipulator.release(false);
    this.player.holdingProp = null;
    this.levelRoot.traverse((o) => { if (o.geometry && !o.userData.keepGeometry) o.geometry.dispose(); });
    this.scene.remove(this.levelRoot);
    this.levelRoot = new THREE.Group();
    this.scene.add(this.levelRoot);
    this.lights.spots.length = 0;
    this.fx.clear(); this.smoke.clear();
    this.physics = new PhysicsWorld();
    this.props = this.physics.props;
    this.statics = new StaticWorld();
    this.rumble = 0;
    this.scene.fog = null;
    this.scene.background = null;
    this.camControl = null;
    this.hud.setCamLabel(null);
    document.querySelectorAll('.window-frame').forEach((e) => e.classList.remove('show'));
  }

  loopSound(key, opts) { const h = this.audio.loop(key, opts); if (h) this.loops.push(h); return h; }
  loopsStop() { for (const h of this.loops) h.stop(0.3); this.loops.length = 0; }

  setAtmosphere(a) {
    const s = this.scene;
    if (a.fog) s.fog = new THREE.Fog(a.fog[0], a.fog[1], a.fog[2]); else s.fog = null;
    if (a.bg !== undefined) s.background = a.bg === null ? null : new THREE.Color(a.bg);
    if (a.ambient) { this.ambient.color.set(a.ambient[0]); this.ambient.intensity = a.ambient[1]; }
    if (a.hemi) { this.hemi.color.set(a.hemi[0]); this.hemi.groundColor.set(a.hemi[1]); this.hemi.intensity = a.hemi[2]; }
    this.renderer.gl.toneMappingExposure = a.exposure || 1.0;
    s.environmentIntensity = a.env !== undefined ? a.env : 0.35;
    this.renderer.bloom.strength = a.bloom !== undefined ? a.bloom : 0.45;
    this.renderer.bloom.threshold = a.bloomThreshold !== undefined ? a.bloomThreshold : 0.85;
    this.camera.far = a.far || 400; this.camera.updateProjectionMatrix();
  }

  teleport(x, y, z) { const p = this.player; p.pos.x = x; p.pos.y = y; p.pos.z = z; p.vel.x = p.vel.y = p.vel.z = 0; }

  // ------------------------------------------------------------------ cheats / console helpers
  /** sv_gravity: 600 is the Source default; maps onto cannon gravity (-18) and the player controller (20). */
  applyGravity() {
    const k = this.gravityUnits / 600;
    this.physics.world.gravity.set(0, -18 * k, 0);
    this.player.gravity = 20 * k;
  }
  /** names of every cheat that is currently active (for the HUD line, `status` and sv_cheats 0). */
  activeCheats() {
    const out = [];
    if (this.godMode) out.push('god');
    if (this.player.noclip) out.push('noclip');
    for (const k of ['buddha', 'notarget', 'infinite_suit', 'superpunt', 'bighead']) if (this.cheats[k]) out.push(k);
    if (this.timescale !== 1) out.push('host_timescale');
    if (this.gravityUnits !== 600) out.push('sv_gravity');
    return out;
  }
  disableAllCheats() {
    this.godMode = false;
    this.player.setNoclip(false);
    for (const k of Object.keys(this.cheats)) this.cheats[k] = false;
    this.player.weapons.manipulator.setSuper(false);
    this.timescale = 1;
    this.gravityUnits = 600; this.applyGravity();
    this._applyBighead();
  }
  setShowFps(v) {
    this.showFps = !!v;
    if (!this.fpsEl) {
      this.fpsEl = document.createElement('div');
      this.fpsEl.className = 'fps-counter';
      document.body.appendChild(this.fpsEl);
    }
    this.fpsEl.style.display = this.showFps ? 'block' : 'none';
  }
  completeObjective() {
    const o = this.objective;
    if (o && o.skip) { o.skip(); return true; }
    return false;
  }
  /** Konami code on the main menu: unlocks everything and enables cheats for the session. */
  _konamiKey(e) {
    const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    if (this.state !== 'menu' || this.console.open || e.repeat) { this._konami.length = 0; return; }
    this._konami.push(e.code);
    if (this._konami.length > SEQ.length) this._konami.shift();
    if (this._konami.length === SEQ.length && SEQ.every((c, i) => c === this._konami[i])) {
      this._konami.length = 0;
      Save.unlockAll();
      this.svCheats = true;
      this.audio.play('suit_beep', { vol: 0.9, throttle: 0 });
      this.console.toast('DEVELOPER MODE UNLOCKED \u2014 press ~ for the console', 4.5);
      if (this.screens.current === 'chapters') this.screens.chapters('main');
    }
  }
  /** bighead: scale NPC heads / creatures. Applied lazily so freshly spawned entities pick it up too. */
  _applyBighead() {
    const on = this.cheats.bighead;
    for (const e of this.entities) {
      if (!!e._bigOn === on) continue;
      if (e.isDead) continue;
      if (e.parts && e.parts.head) { e.parts.head.scale.setScalar(on ? 2.5 : 1); e._bigOn = on; }
      else if (e instanceof Crawler || e instanceof Spitter) {
        e.group.scale.setScalar(on ? (e instanceof Crawler ? 2.5 : 1.6) : 1); e._bigOn = on;
      }
    }
  }

  // ------------------------------------------------------------------ pause / death
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.exitLock();
    this.input.clearAll();
    this.dialogue.pause();
    this.audio.suspend();
    this.screens.pause();
  }
  resume() {
    if (this.state !== 'paused') return;
    this.screens.hide();
    this.state = 'playing';
    this.dialogue.resume();
    this.audio.resume();
    this.input.clearAll();
    this.input.requestLock();
  }

  onPlayerDeath() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    this.player.holsterAll();
    this.renderer.renderViewmodel = false;
    this.input.exitLock();
    this.hud.setPrompt('');
    this.dialogue.clear();
    this.audio.music(null, { fade: 1 });
    this.audio.play('suit_beep', { vol: 0.6, pitch: 0.6 });
    setTimeout(async () => {
      if (this.state !== 'dead') return;
      await this.fader.to('black', 1.2);
      if (this.state !== 'dead') return;
      this.hud.setVisible(false);
      this.screens.death(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, 900);
  }

  // ------------------------------------------------------------------ objectives
  setObjective(text, skip) {
    this.objective = text ? { text, skip } : null;
    this.hud.setObjective(text);
  }

  // ------------------------------------------------------------------ entities / helpers
  add(e) { this.entities.push(e); return e; }
  damageables() {
    const out = this._dmg; out.length = 0;
    for (const e of this.enemies) if (!e.isDead) out.push(e);
    return out;
  }
  flashLight(pos, color, intensity, distance, dur) {
    const spot = this.lights.add({ pos, color, intensity, distance });
    this.timedLights.push({ spot, t: dur, dur, base: intensity });
  }
  sparks(pos, n = 8) {
    for (let i = 0; i < n; i++) this.fx.emit({ pos, vel: { x: (Math.random() - 0.5) * 6, y: Math.random() * 5, z: (Math.random() - 0.5) * 6 }, life: 0.4 + Math.random() * 0.4, size0: 0.07, size1: 0.01, color0: [1, 0.85, 0.4], color1: [1, 0.3, 0.05], gravity: 12, alpha: 1 });
  }
  splat(pos, n = 12, acid = false) {
    for (let i = 0; i < n; i++) {
      const v = { x: (Math.random() - 0.5) * 5, y: Math.random() * 4, z: (Math.random() - 0.5) * 5 };
      this.fx.emit({ pos, vel: v, life: 0.5 + Math.random() * 0.5, size0: 0.22, size1: 0.05, color0: acid ? [0.5, 1, 0.2] : [0.7, 1, 0.3], color1: [0.2, 0.5, 0.1], gravity: 9, alpha: 0.8, drag: 1 });
    }
    for (let i = 0; i < n / 2; i++) this.smoke.emit({ pos, vel: { x: (Math.random() - 0.5) * 1.5, y: Math.random() * 1.5, z: (Math.random() - 0.5) * 1.5 }, life: 1.2, size0: 0.3, size1: 0.9, color0: [0.25, 0.4, 0.15], color1: [0.1, 0.15, 0.08], alpha: 0.35 });
  }
  explode(pos, radius, damage, source) {
    const p = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.audio.playAt(Math.random() < 0.5 ? 'explosion_1' : 'explosion_2', p, 1, { ref: 12, throttle: 0 });
    this.flashLight(p.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xff9a3a, 16, 16, 0.6);
    for (let i = 0; i < 38; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * 1.4, s = 2 + Math.random() * 7;
      this.fx.emit({ pos: p, vel: { x: Math.cos(a) * s * Math.cos(e), y: Math.sin(e) * s + 2, z: Math.sin(a) * s * Math.cos(e) }, life: 0.5 + Math.random() * 0.6, size0: 1.2, size1: 2.8, color0: [1, 0.8, 0.35], color1: [0.9, 0.2, 0.02], alpha: 0.8, drag: 2.2 });
    }
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3;
      this.smoke.emit({ pos: { x: p.x, y: p.y + 0.5, z: p.z }, vel: { x: Math.cos(a) * s, y: 1.5 + Math.random() * 3, z: Math.sin(a) * s }, life: 2 + Math.random() * 1.5, size0: 1.2, size1: 4, color0: [0.25, 0.22, 0.2], color1: [0.07, 0.07, 0.07], alpha: 0.6, drag: 1.2 });
    }
    this.sparks(p, 24);
    // player
    const pl = this.player;
    const c = pl.center;
    const d = Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z);
    pl.shake(Math.min(0.28, 1.6 / (1 + d)), 0.6);
    if (d < radius && this.statics.lineOfSight({ x: p.x, y: p.y + 0.3, z: p.z }, c)) {
      const f = 1 - d / radius;
      pl.damage(damage * 0.55 * f + 4, p, 'explosion');
      const l = d || 1;
      pl.vel.x += (c.x - p.x) / l * 8 * f; pl.vel.z += (c.z - p.z) / l * 8 * f; pl.vel.y += 4 * f;
    }
    // enemies
    for (const e of this.damageables()) {
      const ec = e.hitCenter();
      const ed = Math.hypot(ec.x - p.x, ec.y - p.y, ec.z - p.z);
      if (ed < radius + (e.hitRadius || 0.4)) e.takeDamage(damage * (1 - Math.min(1, ed / (radius + 1))) + 15, { type: 'explosion', from: p });
    }
    // props
    for (const pr of [...this.physics.props]) {
      if (pr === source || !pr.alive) continue;
      const b = pr.body.position;
      const pd = Math.hypot(b.x - p.x, b.y - p.y, b.z - p.z);
      if (pd < radius * 1.3) {
        const f = 1 - pd / (radius * 1.3);
        pr.body.wakeUp();
        const l = pd || 1;
        pr.body.applyImpulse({ x: (b.x - p.x) / l * 18 * f * pr.mass * 0.6, y: (6 + (b.y - p.y) / l * 8) * f * pr.mass * 0.6, z: (b.z - p.z) / l * 18 * f * pr.mass * 0.6 }, pr.body.position);
        pr.takeDamage(damage * f, { type: 'explosion' });
      }
    }
    this.rumbleBurst = 0.6;
  }

  // ------------------------------------------------------------------ use key
  _updateUse(dt) {
    const pl = this.player, input = this.input;
    if (pl.dead || pl.frozen || this.cutscene || !input.enabled) { this.hud.setPrompt(''); this.useTarget = null; return; }
    const o = pl.eyePos, d = pl.forward;
    let best = null, bestScore = 1e9;
    for (const e of this.entities) {
      if (!e.usable || !e.alive) continue;
      if (e.canUse && !e.canUse()) continue;
      const p = e.usePos();
      const dx = p.x - o.x, dy = p.y - o.y, dz = p.z - o.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > (e.useRange || 2.4)) continue;
      const dot = (dx * d.x + dy * d.y + dz * d.z) / Math.max(0.01, dist);
      if (dot < 0.7) continue;
      const perp = dist * Math.sqrt(Math.max(0, 1 - dot * dot));
      if (perp > (e.useRadius || 0.75)) continue;
      if (this.statics.raycast(o.x, o.y, o.z, dx / dist, dy / dist, dz / dist, dist - 0.4, true)) continue;
      const score = perp + dist * 0.1;
      if (score < bestScore) { best = e; bestScore = score; }
    }
    this.useTarget = best;
    if (!best) { this.hud.setPrompt(''); return; }
    const prog = best.holdUse && best.progress > 0 ? best.progress : -1;
    this.hud.setPrompt(`<b>[E]</b> ${best.prompt || 'USE'}`, prog);
    if (best.holdUse) {
      if (input.isDown('KeyE')) { if (best.onHold) best.onHold(dt); } else if (best.onRelease) best.onRelease();
      if (input.wasPressed('KeyE') && best.onUse) best.onUse(pl);
    } else if (input.wasPressed('KeyE')) best.onUse(pl);
  }

  // ------------------------------------------------------------------ frame loop
  _frame(now) {
    requestAnimationFrame((t) => this._frame(t));
    let dt = (now - this._last) / 1000; this._last = now;
    dt = Math.min(this.testMode ? 0.2 : 0.05, Math.max(0.0005, dt));
    this.dt = dt;
    if (this.showFps) {
      this._fpsAcc = (this._fpsAcc || 0) + dt; this._fpsN = (this._fpsN || 0) + 1;
      if (this._fpsAcc >= 0.4) { this.fpsEl.textContent = Math.round(this._fpsN / this._fpsAcc) + ' fps'; this._fpsAcc = 0; this._fpsN = 0; }
    }
    this.hud.setCheatLine(this.state === 'playing' || this.state === 'paused' || this.state === 'dead' ? this.activeCheats() : []);
    try {
      if ((this.state === 'playing' || this.state === 'dead') && !this.frozenDebug && !this.console.open) {
        if (this.testMode) { for (let i = 0; i < this.ups; i++) { this._stepScaled(this.dtStep); if (this.state !== 'playing' && this.state !== 'dead') break; } }
        else this._stepScaled(dt);
      }
      else if (this.state === 'menu') this._updateMenu(dt);
      this._frameNo = (this._frameNo || 0) + 1;
      if (!this.testMode || this._frameNo % 6 === 1) this.renderer.render(performance.now() / 1000);
    } catch (e) {
      console.error('frame error', e);
      this._errCount = (this._errCount || 0) + 1;
      window.__lastError = String(e && e.stack || e);
    }
    this.input.endFrame();
  }

  /** one logical step of `base` seconds, scaled by host_timescale (fast-forward is split so no sub-step exceeds `base`). */
  _stepScaled(base) {
    const ts = this.timescale;
    const n = ts > 1 ? Math.ceil(ts) : 1;
    const sdt = base * ts / n;
    for (let i = 0; i < n; i++) {
      this.dt = sdt;
      this._updateWorld(sdt);
      if (this.testMode || i < n - 1) this.input.endFrame();
      if (this.state !== 'playing' && this.state !== 'dead') break;
    }
  }

  _updateMenu(dt) {
    this.time += dt;
    const m = this.menuScene;
    if (m && m.update) m.update(dt);
    this.lights.update(dt, this.camera.position);
    this.fx.update(dt); this.smoke.update(dt);
    this.fx.setScale(this.renderer.heightPx, this.camera.fov); this.smoke.setScale(this.renderer.heightPx, this.camera.fov);
    this.audio.updateListener(this.camera);
    this._followSky();
    this._tickFixtures();
  }

  _tickFixtures() {
    for (const f of this.flickerFixtures) {
      const k = this.lights.spotIntensity(f.spot) / Math.max(0.001, f.spot.intensity);
      f.mesh.material.color.copy(f.base).multiplyScalar(0.15 + 0.85 * Math.min(1, k));
    }
    for (let i = this.timedLights.length - 1; i >= 0; i--) {
      const t = this.timedLights[i];
      t.t -= this.dt;
      t.spot.intensity = t.base * Math.max(0, t.t / t.dur);
      if (t.t <= 0) { this.lights.remove(t.spot); this.timedLights.splice(i, 1); }
    }
  }

  _followSky() {
    for (const c of this.levelRoot.children) if (c.userData.isSky) c.position.copy(this.camera.position);
  }

  _updateWorld(dt) {
    this.time += dt;
    const pl = this.player, input = this.input;
    this.physics.step(dt);
    this.physics.refreshColliders();
    if (this.rumbleBurst > 0) { this.rumbleBurst -= dt; }
    pl.update(dt, input);
    if (this.camControl) this.camControl(dt);
    this._updateUse(dt);
    const list = this.entities.slice();
    for (const e of list) e.update(dt);
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      if (!e.alive) { try { e.dispose(); } catch (err) { /* ignore */ } this.entities.splice(i, 1); }
    }
    if (this.level && this.level.update) this.level.update(dt);
    this.scheduler.tick(dt);
    if (this.cheats.bighead || this._bhDirty) { this._applyBighead(); this._bhDirty = this.cheats.bighead; }
    this.dialogue.update(dt);
    this._followSky();
    this._tickFixtures();
    this.lights.update(dt, this.camera.position);
    this.fx.update(dt); this.smoke.update(dt);
    this.fx.setScale(this.renderer.heightPx, this.camera.fov); this.smoke.setScale(this.renderer.heightPx, this.camera.fov);
    this.hud.update(dt, pl);
    this.audio.updateListener(this.camera);
  }
}
