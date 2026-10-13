import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { Entity } from '../entities/Entity.js';
import { Valve } from '../entities/Valve.js';
import { Button } from '../entities/Button.js';
import { Charger } from '../entities/Charger.js';
import { Pickup } from '../entities/Pickup.js';
import { Crawler } from '../entities/Crawler.js';
import { Spitter } from '../entities/Spitter.js';
import { Prop } from '../entities/Prop.js';
import { Trigger } from '../entities/Trigger.js';
import { Vent, sign, cylinder } from './kit.js';
import { buildPad, ventVapor, TOP_Y, TOWER, MOUNT_TOP } from './pad.js';
import { buildCockpit, runLaunch } from '../story/Launch.js';

const LIFT = { x0: 8.3, x1: 11.7, z0: -1.7, z1: 1.7 };

class Lift extends Entity {
  constructor(game, b) {
    super(game);
    this.y = 0.25; this.state = 'idle'; this.dy = 0; this.speed = 3.6;
    this.group = new THREE.Group();
    const L = LIFT;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L.x1 - L.x0, 0.3, L.z1 - L.z0), assets.material('metal_floor', { color: 0xaab0b6 }));
    deck.position.set((L.x0 + L.x1) / 2, -0.15, 0);
    this.group.add(deck);
    const railMat = assets.material('hazard_stripes', {});
    const rail = (x0, z0, x1, z1) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.12, x1 - x0), 1.1, Math.max(0.12, z1 - z0)), railMat);
      m.position.set((x0 + x1) / 2, 0.55, (z0 + z1) / 2); this.group.add(m);
    };
    rail(L.x0, L.z0, L.x1, L.z0 + 0.1); rail(L.x0, L.z1 - 0.1, L.x1, L.z1); rail(L.x1 - 0.1, L.z0, L.x1, L.z1);
    this.gate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, L.z1 - L.z0), assets.material('hazard_stripes', {}));
    this.gate.position.set(L.x0 + 0.05, 0.5, 0); this.gate.visible = false; this.group.add(this.gate);
    this.group.position.y = this.y;
    game.levelRoot.add(this.group);
    const g = game.statics;
    this.deckBox = g.add(L.x0, this.y - 0.3, L.z0, L.x1, this.y, L.z1, { surface: 'metal' });
    this.rails = [
      g.add(L.x0, this.y, L.z0 - 0.05, L.x1, this.y + 1.1, L.z0 + 0.1, { surface: 'metal' }),
      g.add(L.x0, this.y, L.z1 - 0.1, L.x1, this.y + 1.1, L.z1 + 0.05, { surface: 'metal' }),
      g.add(L.x1 - 0.1, this.y, L.z0, L.x1 + 0.05, this.y + 1.1, L.z1, { surface: 'metal' }),
    ];
    this.gateBox = g.add(L.x0 - 0.05, this.y, L.z0, L.x0 + 0.1, this.y + 1.1, L.z1, { surface: 'metal' });
    this.gateBox.enabled = false;
    this.spot = game.lights.add({ pos: new THREE.Vector3(10, this.y + 2.5, 0), color: 0xffd9a0, intensity: 60, distance: 12 });
    this.snd = null;
    this.onTop = null;
  }
  start() {
    if (this.state !== 'idle') return;
    this.state = 'rising';
    this.gateBox.enabled = true; this.gate.visible = true;
    this.snd = this.game.audio.play('elevator_loop', { vol: 0.8, loop: true, throttle: 0, pos: { x: 10, y: 5, z: 0 }, ref: 10 });
    this.game.audio.play('door_close', { vol: 0.8 });
  }
  update(dt) {
    const g = this.game;
    this.deckBox.moveDelta = null;
    if (this.state === 'rising') {
      const speed = this.speed * Math.min(1, 0.3 + (this.y - 0.25) / 4) * Math.min(1, 0.25 + (TOP_Y - this.y) / 5);
      this.dy = Math.min(TOP_Y - this.y, Math.max(0.02, speed) * dt);
      this.y += this.dy;
      this.move(this.dy);
      this.deckBox.moveDelta = { x: 0, y: this.dy, z: 0 };
      g.player.shake(0.004, 0.1);
      if (this.y >= TOP_Y - 0.001) {
        this.state = 'top'; this.gateBox.enabled = false; this.gate.visible = false;
        if (this.snd) { this.snd.stop(0.4); this.snd = null; }
        g.audio.play('door_open', { vol: 0.8 });
        if (this.onTop) this.onTop();
      }
    }
  }
  move(dy) {
    for (const b of [this.deckBox, ...this.rails, this.gateBox]) { b.minY += dy; b.maxY += dy; }
    this.group.position.y = this.y;
    this.spot.pos.y += dy;
  }
  dispose() { if (this.snd) this.snd.stop(0.1); }
}

export function build(game, b) {
  const { rocket } = buildPad(game, b);
  const cockpit = buildCockpit(game, b, rocket);

  // --- tower side bits: lift, buttons, signs
  const lift = game.add(new Lift(game, b));
  const liftBtn = game.add(new Button(game, { x: LIFT.x1 - 0.2, y: 0.25 + 1.0, z: 0, rotY: -Math.PI / 2, prompt: 'RAISE LIFT', color: 0xffaa22 }));
  liftBtn.setDisabled(true);
  liftBtn.group.position.x = LIFT.x1 - 0.2; liftBtn.pos.x = LIFT.x1 - 0.2;
  sign(game, ['SERVICE TOWER', 'CREW ACCESS'], 7.7, 3, 0, 2.2, 0.8, -Math.PI / 2, { pw: 512 });
  sign(game, 'PAD 39', 0, 1.6, 6.15, 2.6, 0.7, 0, { pw: 512 });

  // --- vents (where the Cells burst out)
  const ventPos = [[-18, 24], [18, 26], [-26, -16], [26, -6], [6, -28], [-6, -14], [18, 12], [-18, 8], [-24, 22], [26, -26]];
  const vents = ventPos.map(([x, z]) => game.add(new Vent(game, x, 0.25, z)));

  // --- valves
  const state = { done: 0, spawnedAt: 0 };
  const valveDefs = [
    { x: -25.2, z: -6, rotY: Math.PI / 2, name: 'WEST' },
    { x: 10, z: -26.2, rotY: 0, name: 'NORTH' },
    { x: 24.6, z: 14, rotY: -Math.PI / 2, name: 'EAST' },
  ];
  const valves = [];
  for (const d of valveDefs) {
    const sx = Math.sin(d.rotY), sz = Math.cos(d.rotY);
    // post behind the valve
    b.box(d.x - sx * 0.9 - 0.6 * Math.abs(sz), 0.25, d.z - sz * 0.9 - 0.6 * Math.abs(sx), d.x - sx * 0.2 + 0.6 * Math.abs(sz), 2.4, d.z - sz * 0.2 + 0.6 * Math.abs(sx), 'concrete_wall', { tile: 1 });
    const v = new Valve(game, { x: d.x, y: 1.3, z: d.z, rotY: d.rotY, duration: 2.8, onDone: () => onValve(v) });
    v.defName = d.name;
    game.add(v); valves.push(v);
    sign(game, d.name + ' VALVE', d.x + sx * 0.25 + (-sz) * 0.0, 2.2, d.z + sz * 0.25, 1.3, 0.4, d.rotY, { pw: 512, font: 'bold 54px Arial' });
  }

  // --- chargers + pickups
  game.add(new Charger(game, 'health', -9.5, 1.3, 11.92, 0));
  game.add(new Charger(game, 'suit', -7.5, 1.3, 11.92, 0));
  // (shed faces +Z? chargers mounted on its north face at z=12, facing -Z)
  for (const c of game.entities) if (c instanceof Charger) { c.group.rotation.y = Math.PI; c.group.position.z = 11.88; c.pos.z = 11.88; }
  const pk = [['medkit', -22, -2], ['medkit', 22, 10], ['battery', 6, -22], ['medkit', 12, 28], ['battery', -14, 14], ['medkit', 4, -20], ['battery', 20, -6], ['medkit', -20, -14], ['battery', -4, 20]];
  for (const [t, x, z] of pk) game.add(new Pickup(game, t, x, 0.4, z));

  // --- props for cover/fun
  const barrels = [[-10, 26], [14, 22], [-6, -8], [18, -20], [-26, 4], [12, -10]];
  for (const [x, z] of barrels) game.add(new Prop(game, 'barrel_explosive', x, 0.3, z));
  for (const [x, z] of [[-3, 14], [9, 8], [-12, -4], [16, -2], [0, -12]]) game.add(new Prop(game, 'crate', x, 0.3, z));

  // --- spitters (dormant until they see you)
  game.add(new Spitter(game, -21, 0.25, -11, { yaw: 1 }));
  game.add(new Spitter(game, 17, 0.25, -24, { yaw: 3 }));
  game.add(new Spitter(game, 21, 0.25, 22, { yaw: 4 }));
  game.add(new Spitter(game, -4, 0.25, -19, { yaw: 0, mobile: true }));

  // --- wave spawner
  let waveId = 0;
  function wave(nCrawlers, nSpitters = 0) {
    const myWave = ++waveId;
    game.scheduler.run(async (s) => {
      const pp = game.player.pos;
      const order = vents.slice().sort((a, b2) => Math.hypot(a.pos.x - pp.x, a.pos.z - pp.z) - Math.hypot(b2.pos.x - pp.x, b2.pos.z - pp.z)).filter((v) => Math.hypot(v.pos.x - pp.x, v.pos.z - pp.z) > 9);
      for (let i = 0; i < nCrawlers; i++) {
        const v = order[i % Math.min(order.length, 5)];
        v.open();
        game.audio.playAt('crawler_attack', v.pos, 0.8, { pitch: 0.7 });
        const c = new Crawler(game, v.pos.x, v.pos.y + 0.2, v.pos.z, { aggro: true });
        c.body.vel.y = 6; game.add(c);
        await s.wait(0.5 + Math.random() * 0.5);
      }
    }, game);
  }

  function onValve(v) {
    state.done++;
    game.hud.setCounter('PROPELLANT VALVES', state.done, 3);
    const lines = ['varga_v1', 'varga_v2', 'varga_v3'];
    game.dialogue.say(lines[state.done - 1]);
    if (state.done < 3) wave(state.done === 1 ? 5 : 8);
    game.audio.play('suit_beep', { vol: 0.7 });
  }

  const level = {
    spawn: { x: -4, y: 0.25, z: 34, yaw: 0 },
    music: 'pad39_finale',
    hasSuit: true,
    vapor: {},
    update(dt) {
      ventVapor(game, rocket, dt, this.vapor);
      for (const f of rocket.petals) f.glow.rotation.z += 0;
    },
    async run(s) {
      game.player.noPause = false;
      await s.wait(2.0);
      s.sayNoWait('pa_c4');
      await s.wait(1.0);
      wave(2);
      await s.say('varga_c4a');
      game.hud.setCounter('PROPELLANT VALVES', 0, 3);
      await s.step('Open the three propellant valves around the pad', () => state.done >= 3, () => { const v = valves.find((x) => !x.done); if (v) v.finish(); });
      game.hud.toast('FUEL LINES OPEN', 3);
      liftBtn.setDisabled(false);
      await s.wait(2.5);
      await s.step('Ride the tower lift up to the crew access arm', () => lift.state !== 'idle', () => { game.teleport = null; lift.start(); });
      s.sayNoWait('varga_lift');
      await s.until(() => lift.state === 'top');
      wave(3);
      s.sayNoWait('varga_top');
      rocket.hideHatch(true);
      rocket.hatchLight.material.color.setHex(0x44ff66);
      let aboard = false;
      const trig = game.add(new Trigger(game, [1.4, TOP_Y - 0.5, -1.0], [3.2, TOP_Y + 2.5, 1.0], { onEnter: () => { aboard = true; } }));
      await s.step('Board the DX-90', () => aboard, () => { game.player.pos.x = 2.4; game.player.pos.y = TOP_Y; game.player.pos.z = 0; });
      // cabin
      game.hud.setCounter(null);
      await s.step('Press LAUNCH on the main console', () => cockpit.launch.pressed, () => cockpit.launch.onUse());
    },
  };
  cockpit.launch.setDisabled(false);
  cockpit.launch.onPress = (btn) => {
    if (btn.pressed) return;
    btn.pressed = true;
    btn.setDisabled(true);
    game.scheduler.run((s) => runLaunch(s, game, rocket, {}), game);
  };
  liftBtn.onPress = () => {
    // must be standing on the lift
    const p = game.player.pos;
    if (p.x < LIFT.x0 || p.x > LIFT.x1) { game.hud.toast('STEP ONTO THE LIFT FIRST', 2); liftBtn.disabled = false; return; }
    lift.start();
  };
  lift.onTop = () => {};
  return level;
}

/** Menu background: the pad at night with a slowly drifting camera. */
export function buildShowcase(game, b) {
  const { rocket } = buildPad(game, b);
  rocket.hatchLight.material.color.setHex(0xffaa22);
  let t = 0;
  const acc = {};
  const flicker = new THREE.Vector3();
  return {
    update(dt) {
      t += dt;
      const a = -0.5 + t * 0.035;
      const r = 54 + Math.sin(t * 0.07) * 6;
      const cam = game.camera;
      cam.position.set(Math.sin(a) * r, 5 + Math.sin(t * 0.11) * 2.5, Math.cos(a) * r);
      cam.lookAt(0, 22 + Math.sin(t * 0.13) * 3, 0);
      cam.fov = 58; cam.updateProjectionMatrix();
      ventVapor(game, rocket, dt, acc);
    },
  };
}
