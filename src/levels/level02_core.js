import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { Door } from '../entities/Door.js';
import { Button } from '../entities/Button.js';
import { NPC } from '../entities/NPC.js';
import { Prop } from '../entities/Prop.js';
import { Pickup } from '../entities/Pickup.js';
import { Crawler } from '../entities/Crawler.js';
import { Trigger } from '../entities/Trigger.js';
import { Vent, Beacon, sign, glass, cylinder, pipeRun } from './kit.js';
import { makeSky } from '../render/Sky.js';

export function build(game, b) {
  game.setAtmosphere({ fog: [0x0a0e14, 20, 80], bg: 0x05070a, ambient: [0x9fb4cc, 0.5], hemi: [0xc8d8ee, 0x303844, 0.55], exposure: 1.05, bloom: 0.5, bloomThreshold: 0.85, far: 200 });
  const H = 4.6;
  const white = 'tile_white';
  // ------------------------------------------------------------ Room A: lab hall  x 0..16, z 0..20
  b.room(0, 0, 16, 20, H, {
    wall: white, floor: 'tile_floor', ceil: 'ceiling_panel',
    sides: { w: { gaps: [{ at: 9, w: 2.2, h: 2.8 }] }, n: { gaps: [{ at: 8, w: 2.2, h: 2.8 }] }, e: { gaps: [{ at: 8, w: 3.2, h: 3.0 }, { at: 16.5, w: 1.8, h: 2.7 }] }, s: {} },
  });
  // ------------------------------------------------------------ chamber  x 16.3..28, z 3..13
  b.room(16.3, 3, 28, 13, 6.2, {
    wall: 'concrete_wall', floor: 'concrete_floor', ceil: 'metal_plate', wallOpts: {},
    sides: { w: { skip: true }, s: { skip: true } },
  });
  // chamber's west wall (x 16..16.3) is room A's east wall; closing wall segments north of chamber are the room's n side.
  // chamber south wall (z 13..13.3) with an observation window (x 18.5..26.5, y 1..3.4)
  b.box(16.3, 0, 13, 28.3, 1.0, 13.3, 'concrete_wall'); b.box(16.3, 3.4, 13, 28.3, 6.2, 13.3, 'concrete_wall');
  b.box(16.3, 1.0, 13, 18.5, 3.4, 13.3, 'concrete_wall'); b.box(26.5, 1.0, 13, 28.3, 3.4, 13.3, 'concrete_wall');
  // ------------------------------------------------------------ control room  x 16.3..28, z 13.3..20
  b.room(16.3, 13.3, 28, 20, H, { wall: 'metal_wall', floor: 'tile_floor', ceil: 'ceiling_panel', sides: { w: { skip: true }, n: { skip: true } } });
  glass(b, 18.5, 1.0, 13.12, 26.5, 3.4, 13.2, { opacity: 0.25 });

  // ---- lights
  b.lamp(4, H - 0.1, 5, { color: 0xeef6ff, intensity: 32, distance: 12, w: 1.8, flicker: 0.0 });
  b.lamp(4, H - 0.1, 15, { color: 0xeef6ff, intensity: 32, distance: 12, w: 1.8 });
  b.lamp(12, H - 0.1, 10, { color: 0xeef6ff, intensity: 34, distance: 14, w: 1.8, flicker: 0.2 });
  b.lamp(21, 5.9, 8, { color: 0xdfeeff, intensity: 70, distance: 16, w: 2.4 });
  b.lamp(24, H - 0.1, 17, { color: 0xbfe0ff, intensity: 26, distance: 10, w: 1.6 });
  b.lamp(19, H - 0.1, 17, { color: 0xeef6ff, intensity: 22, distance: 9, w: 1.4 });
  const lampSpots = game.lights.spots.slice();

  // ---- room dressing
  for (const [x, z, r] of [[3, 3, 0], [3, 3, 0]]) { /* placeholder */ }
  b.box(1, 0, 2, 5, 0.9, 3.2, 'metal_wall', { tile: 1.5, matOpts: { color: 0xb8c4d0 } });
  b.box(1, 0.9, 1.9, 5, 0.97, 3.3, 'tile_white', { tile: 1, collide: false });
  b.box(1, 0, 16.5, 5.2, 0.9, 18, 'metal_wall', { tile: 1.5, matOpts: { color: 0xb8c4d0 } });
  b.box(9.5, 0, 17.4, 14.5, 0.9, 19.4, 'metal_wall', { tile: 1.5, matOpts: { color: 0xb8c4d0 } });      // workbench (wrench)
  b.box(9.5, 0.9, 17.3, 14.5, 0.97, 19.5, 'tile_white', { tile: 1, collide: false });
  for (const [x, z, ry] of [[3, 2.6, 0], [10, 3, 0]]) {
    const m = assets.model('computer_console'); m.position.set(x, 0.97, z); m.rotation.y = ry; m.scale.setScalar(0.7); game.levelRoot.add(m);
  }
  const chair = assets.model('chair'); chair.position.set(3, 0, 4); chair.scale.setScalar(1.3); game.levelRoot.add(chair);
  sign(game, ['LAB C-4', 'RESONANCE RESEARCH'], 0.1, 3.2, 9, 2.4, 0.7, Math.PI / 2, { pw: 512, bg: '#0f1a24', fg: '#44ddff' });
  sign(game, ['HALO PROJECT', 'CELL COUPLING TRIAL 7'], 8, 3.3, 19.95, 3.2, 0.8, Math.PI, { pw: 512, bg: '#0f1a24', fg: '#ffb22e' });
  sign(game, ['DANGER', 'RESONANCE CHAMBER'], 16.15, 3.6, 8, 2.2, 0.7, -Math.PI / 2, { pw: 512, bg: '#f2c200', fg: '#101010', border: null });
  sign(game, ['MAINTENANCE', 'EXIT'], 8, 3.3, -0.05, 2, 0.6, 0, { pw: 512, bg: '#0f2418', fg: '#44ff88' });
  pipeRun(b, 0.5, H - 0.4, 0.8, 15.5, 0.8, 3);
  pipeRun(b, 0.5, H - 0.4, 19.2, 15.5, 19.2, 2);
  cylinder(b, 14.5, 2, 1.0, 0.5, 4, 'y', 'metal_wall', { collide: true, color: 0xd5d9dc });

  // ---- chamber hardware: pedestal, containment, HALO emitter
  b.box(23, 0, 7, 25, 0.9, 9, 'metal_wall', { tile: 1, matOpts: { color: 0x8a96a2 } });
  const glassC = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.7, 24, 1, true), assets.material('glass_dirty', { transparent: true, opacity: 0.28, color: 0xaaffdd, side: THREE.DoubleSide }));
  glassC.position.set(24, 1.75, 8); game.levelRoot.add(glassC);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 2), assets.material('cell_flesh', { emissive: 0x22ff77, emissiveIntensity: 1.2, color: 0x7a3a66 }));
  core.position.set(24, 1.6, 8); game.levelRoot.add(core);
  const coreSpot = game.lights.add({ pos: new THREE.Vector3(24, 1.8, 8), color: 0x44ff88, intensity: 18, distance: 9 });
  const dish = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.4, 24, 1, true), assets.material('metal_plate', { color: 0xc9a24a, metalness: 0.8, side: THREE.DoubleSide }));
  dish.rotation.x = Math.PI; dish.position.set(24, 5.3, 8); game.levelRoot.add(dish);
  const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.0, 14), assets.material(null, { color: 0x2b3238, metalness: 0.7 })); emitter.position.set(24, 5.8, 8); game.levelRoot.add(emitter);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.8, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.set(24, 3.55, 8); game.levelRoot.add(beam);
  // floor target zone (hazard outline) where the cart must go
  b.box(18.8, 0, 7.1, 21.4, 0.02, 7.2, 'hazard_stripes', { collide: false, tile: 0.4 }); b.box(18.8, 0, 8.8, 21.4, 0.02, 8.9, 'hazard_stripes', { collide: false, tile: 0.4 });
  b.box(18.8, 0, 7.1, 18.9, 0.02, 8.9, 'hazard_stripes', { collide: false, tile: 0.4 }); b.box(21.3, 0, 7.1, 21.4, 0.02, 8.9, 'hazard_stripes', { collide: false, tile: 0.4 });
  const zoneSpot = game.lights.add({ pos: new THREE.Vector3(20.1, 2.5, 8), color: 0xffaa22, intensity: 10, distance: 6 });
  sign(game, ['SAMPLE', 'ZONE'], 20.1, 0.03, 8, 1.4, 0.5, 0, { pw: 256 }).rotation.x = -Math.PI / 2;

  // ---- control room console
  b.box(19.5, 0, 14.0, 25.5, 1.0, 15.2, 'metal_wall', { tile: 1.5, matOpts: { color: 0x7a8794 } });
  b.box(19.4, 1.0, 13.9, 25.6, 1.1, 15.3, null, { collide: false });
  for (const x of [20.5, 22.5, 24.5]) {
    const m = assets.model('computer_console'); m.position.set(x, 1.0, 14.3); m.rotation.y = Math.PI; m.scale.setScalar(0.5); game.levelRoot.add(m);
  }
  sign(game, ['HALO PULSE', 'ARMED'], 22.5, 1.55, 14.05, 1.6, 0.5, Math.PI, { pw: 512, bg: '#1a0a0a', fg: '#ff5a44' });
  const redBtn = game.add(new Button(game, { x: 22.5, y: 0.65, z: 15.23, rotY: 0, big: true, color: 0xff2020, prompt: 'FIRE HALO PULSE' }));
  redBtn.setDisabled(true);

  // ---- doors
  const chamberDoor = game.add(new Door(game, { x: 16.15, y: 0, z: 8, w: 3.2, h: 3.0, d: 0.3, axis: 'z', tex: 'metal_plate', locked: true }));
  const controlDoor = game.add(new Door(game, { x: 16.15, y: 0, z: 16.5, w: 1.8, h: 2.7, d: 0.3, axis: 'z', auto: true, tex: 'metal_plate' }));
  const exitDoor = game.add(new Door(game, { x: 8, y: 0, z: -0.15, w: 2.2, h: 2.8, d: 0.3, axis: 'x', locked: true, tex: 'metal_plate' }));
  const entryDoor = game.add(new Door(game, { x: -0.15, y: 0, z: 9, w: 2.2, h: 2.8, d: 0.3, axis: 'z', locked: true, tex: 'metal_plate' }));
  // exit corridor (north of exit door)
  b.box(6.4, -0.4, -12, 9.6, 0, 0, 'metal_floor', { tile: 1.5 });
  b.box(6.4, 3.0, -12, 9.6, 3.3, 0, 'ceiling_panel', { tile: 2 });
  b.box(6.1, 0, -12, 6.4, 3.3, 0, 'metal_wall', { tile: 2 }); b.box(9.6, 0, -12, 9.9, 3.3, 0, 'metal_wall', { tile: 2 });
  b.box(6.1, 0, -12.3, 9.9, 3.3, -12, 'hazard_stripes', { tile: 1 });
  b.lamp(8, 2.9, -5, { color: 0xffc8a0, intensity: 16, distance: 8, w: 1.2 });
  // ---- cart
  const cart = game.add(new Prop(game, 'cart', 5.5, 0.02, 8.0, { rotY: 0.0 }));
  {
    const can = new THREE.Group();
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.55, 16), assets.material(null, { color: 0x9fe8ff, transparent: true, opacity: 0.3, roughness: 0.1 }));
    const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), assets.material('cell_flesh', { emissive: 0x33ff88, emissiveIntensity: 1.4, color: 0x6a2a55 }));
    const cap1 = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 16), assets.material(null, { color: 0x20262b, metalness: 0.6 }));
    const cap2 = cap1.clone(); cap1.position.y = -0.3; cap2.position.y = 0.3;
    can.add(gl, cr, cap1, cap2); can.position.set(0.1, 1.15, 0);
    cart.model.add(can);
    cart.core = cr;
  }
  // ---- beacons (emergency lighting, off until the breach)
  const beacons = [];
  for (const [x, y, z] of [[8, H - 0.2, 6], [8, H - 0.2, 14], [22, H - 0.2, 17], [22, 5.9, 5], [3, H - 0.2, 10]]) { const bc = game.add(new Beacon(game, x, y, z, 0xff2200, 3.2, 9)); bc.on = false; bc.spot.enabled = false; bc.dome.visible = true; beacons.push(bc); }
  // ---- vents for the crawlers
  const vents = [[5, 6], [11, 5.5], [8, 14], [13, 11], [4, 12], [21, 4.5], [26, 11]].map(([x, z]) => game.add(new Vent(game, x, 0, z)));

  const state = { pressed: false, pulse: 0, wave: [] };
  redBtn.onPress = () => { state.pressed = true; redBtn.setDisabled(true); };

  function spawnCrawlers(n, ventIdx) {
    game.scheduler.run(async (s) => {
      for (let i = 0; i < n; i++) {
        const v = vents[ventIdx[i % ventIdx.length]];
        v.open();
        const c = new Crawler(game, v.pos.x, 0.2, v.pos.z, { aggro: true });
        c.body.vel.y = 6; game.add(c); state.wave.push(c);
        game.audio.playAt('crawler_attack', v.pos, 0.9, { pitch: 0.7 });
        await s.wait(0.7);
      }
    }, game);
  }

  const level = {
    spawn: { x: 2.5, y: 0, z: 8, yaw: -Math.PI / 2 },
    music: null,
    update(dt) {
      core.rotation.y += dt * 0.6;
      if (state.pulse > 0) {
        coreSpot.intensity = 18 + state.pulse * 80 * (0.7 + 0.3 * Math.sin(game.time * 30));
        core.scale.setScalar(1 + state.pulse * 0.6);
        core.material.emissiveIntensity = 1.2 + state.pulse * 5;
      }
    },
    async run(s) {
      await s.wait(2.5);
      s.sayNoWait('varga_c4_1');
      chamberDoor.setLocked(false); chamberDoor.openDoor();
      const inZone = () => { const p = cart.body.position; return Math.abs(p.x - 20.1) < 1.0 && Math.abs(p.z - 8) < 0.8 && p.y < 1.2; };
      await s.step('Push the sample cart into the resonance chamber (walk into it)', inZone, () => { cart.body.position.set(20.1, 0.5, 8); cart.body.velocity.set(0, 0, 0); cart.body.wakeUp(); });
      await s.wait(1.2);
      game.audio.play('suit_beep', { vol: 0.6 });
      s.sayNoWait('varga_c4_2');
      let inControl = false;
      game.add(new Trigger(game, [17, -1, 13.5], [28, 4, 20], { onEnter: () => { inControl = true; } }));
      await s.step('Go to the control room', () => inControl, () => game.teleport(21, 0, 17));
      chamberDoor.closeDoor(); chamberDoor.setLocked(true);
      redBtn.setDisabled(false);
      await s.step('Press the red button', () => state.pressed, () => redBtn.onUse());
      // ---------------- the resonance breach
      game.hud.setPrompt('');
      s.sayNoWait('varga_c4_3');
      game.audio.play('suit_charge_loop', { vol: 0.5, pitch: 1.5 });
      beam.material.opacity = 0.0;
      await s.tween(3.6, (t) => { state.pulse = t; beam.material.opacity = Math.min(0.85, t * 3) * (0.8 + 0.2 * Math.sin(game.time * 50)); game.rumble = t * 0.8; game.player.shake(0.01 + t * 0.03, 0.2); });
      game.audio.play('explosion_2', { vol: 0.8, pitch: 0.6 });
      await game.fader.to('white', 0.18);
      // lights die, red emergency lighting
      for (const sp of lampSpots) sp.enabled = false;
      coreSpot.color.setHex(0xff4422);
      beacons.forEach((bc) => { bc.on = true; bc.spot.enabled = true; });
      game.setAtmosphere({ fog: [0x180505, 8, 40], bg: 0x080202, ambient: [0xaa4444, 0.18], hemi: [0x883333, 0x110000, 0.2], exposure: 1.0, bloom: 0.7, bloomThreshold: 0.8, far: 200 });
      game.flickerFixtures.forEach((f) => { f.mesh.visible = false; });
      beam.material.opacity = 0; state.pulse = 0; core.scale.setScalar(1.7);
      game.rumble = 0.5;
      game.player.shake(0.25, 1.5);
      game.audio.play('glass_break', { vol: 1 });
      game.audio.music('breach_action', { fade: 0.5 });
      game.loopSound('alarm_loop', { vol: 0.35 });
      game.fader.clear(1.8);
      // the chamber window shatters
      for (let i = 0; i < 40; i++) game.fx.emit({ pos: { x: 18.5 + Math.random() * 8, y: 1 + Math.random() * 2.4, z: 13.15 }, vel: { x: (Math.random() - 0.5) * 3, y: Math.random() * 3, z: 2 + Math.random() * 4 }, life: 1.2, size0: 0.15, size1: 0.05, color0: [0.7, 0.9, 1], alpha: 0.9, gravity: 9 });
      for (const o of [...game.levelRoot.children]) if (o.geometry && o.material && o.material.opacity < 0.3 && o.material.transparent && o.position.z > 13 && o.position.z < 13.3) o.visible = false;
      await s.wait(0.6);
      game.rumble = 0.0;
      s.sayNoWait('pa_breach');
      // the glass slab collider removal: find tagged collider
      for (const bx of game.statics.boxes) if (!bx.blocksSight && bx.minZ > 13.0 && bx.minZ < 13.2 && bx.minX > 18) bx.enabled = false;
      chamberDoor.setLocked(false);
      spawnCrawlers(3, [3, 4, 0]);
      await s.wait(1.5);
      // the Overseer, glimpsed in the chamber
      const ov = game.add(new NPC(game, 'overseer', 25.5, 0, 10.2, { yaw: Math.PI, vanish: true }));
      s.sayNoWait('varga_c4_4');
      game.add(new Pickup(game, 'wrench', 12, 1.0, 18.5, { range: 2.1 }));
      await s.step('Grab the hydraulic wrench from the workbench', () => game.player.has.wrench, () => game.player.giveWeapon('wrench'));
      game.hud.toast('LEFT MOUSE: SWING THE WRENCH', 4);
      spawnCrawlers(4, [1, 2, 3, 5]);
      await s.step('Survive: destroy the Cells', () => state.wave.length >= 7 && state.wave.every((c) => c.isDead), () => state.wave.forEach((c) => c.isDead || c.takeDamage(999, {})));
      s.sayNoWait('varga_c4_5');
      exitDoor.setLocked(false); exitDoor.openDoor();
      let out = false;
      game.add(new Trigger(game, [6, -1, -11], [10, 4, -5], { onEnter: () => { out = true; } }));
      await s.step('Leave through the north door', () => out, () => game.teleport(8, 0, -7));
      await game.completeChapter();
    },
  };
  return level;
}
