import * as THREE from 'three';
import { moveBody } from '../physics/Collision.js';
import { Settings } from '../core/Settings.js';
import { Viewmodel } from './Viewmodel.js';
import { Wrench } from './Wrench.js';
import { Manipulator } from './Manipulator.js';

const WALK = 6.2, SLOW = 3.1, CROUCH_SPD = 2.7;
const GRAVITY = 20, JUMP_V = 6.5;
const ACCEL = 11, AIR_ACCEL = 9, FRICTION = 7, STOP_SPEED = 2.0;
const STAND_H = 1.8, CROUCH_H = 1.0, EYE_STAND = 1.62, EYE_CROUCH = 0.88;

export class Player {
  constructor(game) {
    this.game = game;
    this.body = { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, r: 0.3, height: STAND_H, step: 0.45, onGround: false, groundBox: null };
    this.pos = this.body.pos; this.vel = this.body.vel;
    this.yaw = 0; this.pitch = 0;
    this.crouched = false;
    this.eye = EYE_STAND;
    this.health = 100; this.suit = 0; this.maxHealth = 100;
    this.hasSuit = false;
    this.dead = false;
    this.frozen = false;          // scripted (no movement), still can look unless lookFrozen
    this.lookFrozen = false;
    this.bobPhase = 0; this.bobAmt = 0; this.landDip = 0; this.stepDist = 0;
    this.shakeAmt = 0; this.shakeT = 0;
    this.lastHurt = -10;
    this.lowHealthTimer = 0;
    this.noclip = false;
    this.camera = game.camera;
    this.eyePos = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, -1);
    this.viewmodel = new Viewmodel(game);
    this.weapons = { wrench: new Wrench(game, this), manipulator: new Manipulator(game, this) };
    this.has = { wrench: false, manipulator: false };
    this.current = null;
    this.externalVel = null;      // for riding platforms
    this.fallSpeed = 0;
    this.holdingProp = null;
  }

  reset(x, y, z, yaw = 0) {
    this.pos.x = x; this.pos.y = y; this.pos.z = z;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.yaw = yaw; this.pitch = 0;
    this.health = 100; this.dead = false; this.crouched = false; this.body.height = STAND_H; this.eye = EYE_STAND;
    this.frozen = false; this.lookFrozen = false;
    this.weapons.manipulator.release();
    this.lastHurt = -10;
  }

  giveWeapon(name, select = true) {
    this.has[name] = true;
    this.game.hud.setWeaponsAvailable(this.has);
    if (select || !this.current) this.select(name);
  }
  select(name) {
    if (!this.has[name]) return;
    if (this.current === this.weapons[name]) return;
    if (this.current) this.current.holster();
    this.current = this.weapons[name];
    this.current.deploy();
    this.game.hud.setWeapon(name);
  }
  holsterAll() { if (this.current) { this.current.holster(); this.current = null; } this.weapons.manipulator.release(); }

  get center() { return { x: this.pos.x, y: this.pos.y + this.body.height * 0.55, z: this.pos.z }; }

  // ---------------------------------------------------------------- damage
  damage(amount, from, kind = 'generic') {
    if (this.dead || this.game.godMode) return;
    let toHealth = amount;
    if (this.suit > 0 && kind !== 'fall') {
      const absorbed = Math.min(this.suit, amount * 0.7);
      this.suit -= absorbed;
      toHealth = amount - absorbed;
    }
    this.health = Math.max(0, this.health - toHealth);
    this.lastHurt = this.game.time;
    this.shake(0.04 + Math.min(0.12, amount * 0.004), 0.3);
    this.game.audio.play(this.game.audio.variant('player_hurt', 3), { vol: 0.8, throttle: 120 });
    this.game.hud.damageFlash(Math.min(1, 0.3 + amount / 40));
    if (from) {
      const dx = from.x - this.pos.x, dz = from.z - this.pos.z;
      // angle relative to view direction: 0 = in front
      const ang = Math.atan2(dx, -dz) - (-this.yaw) ; // world heading of the source minus view heading
      this.game.hud.damageIndicator(ang);
    }
    if (this.health <= 0) {
      this.dead = true;
      this.game.onPlayerDeath();
    }
  }
  heal(n) { const before = this.health; this.health = Math.min(this.maxHealth, this.health + n); return this.health - before; }
  addSuit(n) { const before = this.suit; this.suit = Math.min(100, this.suit + n); return this.suit - before; }
  shake(amount, dur = 0.3) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeT = Math.max(this.shakeT, dur); this._shakeDur = dur; }

  // ---------------------------------------------------------------- update
  update(dt, input) {
    const g = this.game;
    const b = this.body;
    const canControl = !this.dead && !this.frozen && g.state === 'playing';

    // look
    const m = input.consumeMouse();
    if (!this.lookFrozen && !this.dead && (g.state === 'playing')) {
      const sens = 0.0022 * Settings.get('sensitivity');
      this.yaw -= m.dx * sens;
      this.pitch -= m.dy * sens * (Settings.get('invertY') ? -1 : 1);
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch));
    }
    this.mouseDX = m.dx; this.mouseDY = m.dy;

    // movement intent
    let fwd = 0, side = 0;
    if (canControl) {
      if (input.isDown('KeyW') || input.isDown('ArrowUp')) fwd += 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown')) fwd -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) side += 1;
      if (input.isDown('KeyA') || input.isDown('ArrowLeft')) side -= 1;
    }
    const wantCrouch = canControl && (input.isDown('ControlLeft') || input.isDown('KeyC') || input.isDown('ControlRight'));
    this._updateCrouch(wantCrouch);

    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    let wx = -sinY * fwd + cosY * side;
    let wz = -cosY * fwd - sinY * side;
    const wl = Math.hypot(wx, wz);
    if (wl > 0) { wx /= wl; wz /= wl; }
    let maxSpd = this.crouched ? CROUCH_SPD : (canControl && input.isDown('ShiftLeft') ? SLOW : WALK);
    if (this.noclip) { this._noclip(dt, input, wx, wz); } else {
      const wasGround = b.onGround;
      const prevVy = this.vel.y;
      // ground friction
      if (b.onGround) {
        const speed = Math.hypot(this.vel.x, this.vel.z);
        if (speed > 0.01) {
          const drop = Math.max(speed, STOP_SPEED) * FRICTION * dt;
          const ns = Math.max(0, speed - drop) / speed;
          this.vel.x *= ns; this.vel.z *= ns;
        } else { this.vel.x = this.vel.z = 0; }
      }
      // accelerate (Source style: air movement is capped so you keep momentum but can still steer a little)
      if (wl > 0) {
        const wish = b.onGround ? maxSpd * Math.min(1, wl) : Math.min(maxSpd, 1.6);
        const cur = this.vel.x * wx + this.vel.z * wz;
        const add = wish - cur;
        if (add > 0) {
          const acc = (b.onGround ? ACCEL : AIR_ACCEL) * maxSpd * dt;
          const lim = Math.min(acc, add);
          this.vel.x += wx * lim; this.vel.z += wz * lim;
        }
      }
      // jump
      if (canControl && b.onGround && input.isDown('Space')) {
        this.vel.y = JUMP_V; b.onGround = false;
        g.audio.playVar('footstep_' + this._surface(), 4, { vol: 0.5, pitch: 0.8 });
      }
      this.vel.y -= GRAVITY * dt;
      if (this.vel.y < -40) this.vel.y = -40;
      const prevY = this.pos.y;
      this._ride(dt);
      moveBody(b, dt, g.statics, {
        dynamic: g.physics.colliders,
        ignore: (c) => c.prop === this.holdingProp || c.prop.noPlayerCollide,
        onPush: (c, nx, nz) => this._push(c, nx, nz),
      });
      if (b.onGround && !wasGround) this._land(prevVy);
      if (!b.onGround) this.fallSpeed = -this.vel.y; 
      // kill planes
      if (this.pos.y < -30) { this.damage(1000, null, 'fall'); }
    }

    this._cameraUpdate(dt, input, Math.hypot(this.vel.x, this.vel.z), canControl);
    this._footsteps(dt);

    // weapons
    if (this.current && canControl) this.current.update(dt, input);
    else if (this.current) this.current.update(dt, null);
    this.viewmodel.update(dt, this, Math.hypot(this.vel.x, this.vel.z));
    if (canControl) {
      if (input.wasPressed('Digit1')) this.select('wrench');
      if (input.wasPressed('Digit2')) this.select('manipulator');
      if (input.wheel !== 0 && this.has.wrench && this.has.manipulator) this.select(this.current === this.weapons.wrench ? 'manipulator' : 'wrench');
    }

    // low health warning
    if (this.health > 0 && this.health < 25 && this.hasSuit && !g.cutscene) {
      this.lowHealthTimer -= dt;
      if (this.lowHealthTimer <= 0) { g.audio.play('suit_beep', { vol: 0.5 }); this.lowHealthTimer = 3.5; }
    }
  }

  _ride(dt) {
    const gb = this.body.groundBox;
    if (gb && gb.moveDelta) { this.pos.x += gb.moveDelta.x; this.pos.y += gb.moveDelta.y; this.pos.z += gb.moveDelta.z; }
  }

  _push(c, nx, nz) {
    const p = c.prop;
    if (!p || !p.pushable) return;
    const f = p.pushFactor !== undefined ? p.pushFactor : 0.8;
    const spd = Math.min(5.5, Math.hypot(this.vel.x, this.vel.z) + 0.8) * f;
    p.body.wakeUp();
    p.body.angularVelocity.set(0, p.body.angularVelocity.y * 0.5, 0);
    if (nx) p.body.velocity.x = nx * spd;
    if (nz) p.body.velocity.z = nz * spd;
  }

  _updateCrouch(want) {
    const b = this.body;
    if (want && !this.crouched) { this.crouched = true; b.height = CROUCH_H; if (b.onGround) {/* feet stay */} }
    else if (!want && this.crouched) {
      // need headroom
      if (!b.anyOverlap || !b.anyOverlap(this.pos.x, this.pos.y + 0.001, this.pos.z, STAND_H)) { this.crouched = false; b.height = STAND_H; }
    }
    const target = this.crouched ? EYE_CROUCH : EYE_STAND;
    this.eye += (target - this.eye) * Math.min(1, 14 * (this.game.dt || 0.016));
  }

  _noclip(dt, input, wx, wz) {
    const sp = 12;
    this.vel.x = wx * sp; this.vel.z = wz * sp; this.vel.y = (input.isDown('Space') ? sp : 0) - (input.isDown('ControlLeft') ? sp : 0);
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.pos.z += this.vel.z * dt;
  }

  _surface() {
    const gb = this.body.groundBox;
    if (gb && gb.surface) return gb.surface === 'metal' ? 'metal' : 'concrete';
    if (gb && gb.prop) return 'metal';
    return 'concrete';
  }

  _land(prevVy) {
    const speed = -prevVy;
    if (speed > 4) {
      this.landDip = Math.min(0.28, (speed - 3) * 0.03);
      this.game.audio.play('jump_land', { vol: Math.min(1, 0.4 + speed * 0.05) });
      this.game.audio.playVar('footstep_' + this._surface(), 4, { vol: 0.7 });
    }
    if (speed > 15) {
      const dmg = (speed - 15) * 6;
      this.damage(dmg, null, 'fall');
    }
  }

  _footsteps(dt) {
    const b = this.body;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (!b.onGround || sp < 1.2 || this.dead) { this.stepDist *= 0.9; return; }
    this.stepDist += sp * dt;
    const stride = this.crouched ? 1.3 : 2.1;
    if (this.stepDist > stride) {
      this.stepDist = 0;
      const surf = this._surface();
      const vol = this.crouched ? 0.18 : (sp < 3.8 ? 0.28 : 0.45);
      this.game.audio.playVar('footstep_' + surf, 4, { vol, throttle: 100, jitter: 0.1 });
    }
  }

  _cameraUpdate(dt, input, speed, canControl) {
    const cam = this.camera;
    const g = this.game;
    // bob
    const targetBob = this.body.onGround ? Math.min(1, speed / WALK) : 0;
    this.bobAmt += (targetBob - this.bobAmt) * Math.min(1, 10 * dt);
    this.bobPhase += speed * dt * (this.crouched ? 1.2 : 1.45);
    const bobY = Math.sin(this.bobPhase * 2) * 0.032 * this.bobAmt;
    const bobX = Math.sin(this.bobPhase) * 0.02 * this.bobAmt;
    this.landDip *= Math.max(0, 1 - 7 * dt);

    // shake
    let sx = 0, sy = 0, sr = 0;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT / (this._shakeDur || 0.3));
      const a = this.shakeAmt * Math.min(1, k * 1.5);
      sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; sr = (Math.random() - 0.5) * a * 0.6;
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
    // continuous rumble shake from scripts
    if (g.rumble > 0) { const a = g.rumble * 0.03; sx += (Math.random() - 0.5) * a; sy += (Math.random() - 0.5) * a; sr += (Math.random() - 0.5) * a * 0.5; }

    this.eyePos.set(this.pos.x + bobX * Math.cos(this.yaw), this.pos.y + this.eye + bobY - this.landDip, this.pos.z - bobX * Math.sin(this.yaw));
    if (this.dead) { this.eyePos.y = this.pos.y + 0.35; }
    cam.position.copy(this.eyePos);
    const strafe = (input && canControl) ? ((input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0)) : 0;
    this._roll = (this._roll || 0) + ((-strafe * 0.012 * Math.min(1, speed / WALK)) - (this._roll || 0)) * Math.min(1, 8 * dt);
    cam.rotation.set(this.pitch + sy, this.yaw + sx, this._roll + sr + (this.dead ? 0.9 : 0));
    cam.updateMatrixWorld();
    this.forward.set(0, 0, -1).applyQuaternion(cam.quaternion);
  }
}
