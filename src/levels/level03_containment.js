import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { Door } from '../entities/Door.js';
import { Charger } from '../entities/Charger.js';
import { Pickup } from '../entities/Pickup.js';
import { Prop } from '../entities/Prop.js';
import { Crawler } from '../entities/Crawler.js';
import { Spitter } from '../entities/Spitter.js';
import { Nest } from '../entities/Nest.js';
import { Socket } from '../entities/Socket.js';
import { Trigger, HazardZone } from '../entities/Trigger.js';
import { Entity } from '../entities/Entity.js';
import { Vent, Beacon, sign, glass, cylinder, pipeRun } from './kit.js';

class FleshWall extends Entity {
  constructor(game, x0, y0, z0, x1, y1, z1) {
    super(game);
    this.box = game.statics.add(x0, y0, z0, x1, y1, z1, { surface: 'concrete' });
    this.body = game.physics.addStaticBox(x0, y0, z0, x1, y1, z1);
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), assets.material('cell_flesh', { emissive: 0x44ff66, emissiveIntensity: 0.55, color: 0xcc8899, roughness: 0.4 }));
    this.mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    game.levelRoot.add(this.mesh);
    this.c = this.mesh.position.clone();
    this.spot = game.lights.add({ pos: this.c.clone().add(new THREE.Vector3(-2, 0, 0)), color: 0x66ff88, intensity: 22, distance: 9, flicker: 0.3, speed: 0.4 });
    this.dissolving = 0;
  }
  dissolve() {
    if (this.dissolving) return;
    this.dissolving = 1;
    this.box.enabled = false; this.body.position.y = -500;
    this.game.audio.playAt('explosion_2', this.c, 0.6, { pitch: 0.7 });
    this.game.splat(this.c, 60);
  }
  update(dt) {
    this.mesh.scale.x = 1 + 0.01 * Math.sin(this.game.time * 3);
    if (this.dissolving) {
      this.dissolving -= dt * 0.7;
      this.mesh.scale.y = Math.max(0.001, this.dissolving);
      this.mesh.material.opacity = 1; 
      if (Math.random() < 0.6) this.game.splat({ x: this.c.x, y: this.c.y + (Math.random() - 0.5) * 3, z: this.c.z + (Math.random() - 0.5) * 3 }, 2);
      if (this.dissolving <= 0) { this.mesh.visible = false; this.game.lights.remove(this.spot); this.alive = false; }
    }
  }
}

export function build(game, b) {
  game.setAtmosphere({ fog: [0x07090c, 6, 46], bg: 0x040507, ambient: [0x8899aa, 0.38], hemi: [0x99aabb, 0x221111, 0.45], exposure: 1.15, bloom: 0.55, bloomThreshold: 0.85, far: 160, env: 0.3 });
  const wallA = 'metal_wall';
  // ======================================================== A: service corridor
  b.room(-2, -30, 2, 0, 3.4, { wall: wallA, floor: 'metal_floor', ceil: 'ceiling_panel', sides: { n: { skip: true } } });
  pipeRun(b, -1.6, 3.0, -1, -1.6, -29, 3, 0.25, 0.09);
  pipeRun(b, 1.6, 2.9, -1, 1.6, -29, 2, 0.25, 0.1, 'rust_metal');
  b.lamp(0, 3.3, -6, { color: 0xffe0b0, intensity: 20, distance: 9, w: 1.4, flicker: 0.5, speed: 1.3 });
  b.lamp(0, 3.3, -22, { color: 0xffe0b0, intensity: 22, distance: 9, w: 1.4, flicker: 0.2 });
  sign(game, ['SERVICE', 'CORRIDOR 3'], 0, 2.5, 0.0 - 0.05, 1.6, 0.5, Math.PI, { pw: 512, bg: '#0f1a24', fg: '#ffb22e' });
  // cell growth
  const flesh = (x0, y0, z0, x1, y1, z1) => b.box(x0, y0, z0, x1, y1, z1, 'cell_flesh', { tile: 1, collide: false, matOpts: { emissive: 0x225533, emissiveIntensity: 0.4 } });
  flesh(1.7, 0, -14, 2.0, 1.4, -11); flesh(-2.0, 0.6, -20, -1.7, 2.8, -17); flesh(1.75, 1.2, -26, 2.0, 3.0, -24);
  b.box(-0.5, 0, -15.0, 0.5, 0.05, -14.0, 'cell_flesh', { collide: false, tile: 0.5 });

  // ======================================================== B: maintenance bay  x -12..12, z -58..-30.3
  b.room(-12, -58, 12, -30.3, 7.2, { wall: 'concrete_wall', floor: 'metal_floor', ceil: 'ceiling_panel',
    sides: { s: { gaps: [{ at: 0, w: 4, h: 3.4 }] }, n: { gaps: [{ at: 8, w: 3.0, h: 3.0 }] } } });
  for (const x of [-6, 6]) b.lamp(x, 7.0, -36, { color: 0xffe9c8, intensity: 60, distance: 16, w: 2, flicker: x < 0 ? 0.5 : 0 });
  b.lamp(0, 7.0, -50, { color: 0xffe9c8, intensity: 60, distance: 16, w: 2 });
  // gantry crane
  b.box(-12, 6.1, -44.5, 12, 6.5, -43.9, 'metal_plate', { collide: false, tile: 2 });
  b.box(-2, 4.2, -44.4, -1.6, 6.1, -44.0, 'rust_metal', { collide: false });
  cylinder(b, 0, 4.4, -44.2, 0.5, 0.6, 'y', 'rust_metal');
  // workbench with the M-7
  b.box(-11.7, 0, -41, -9.4, 0.92, -37.5, 'metal_wall', { tile: 1.5, matOpts: { color: 0xa7b3bf } });
  b.box(-11.8, 0.92, -41.1, -9.3, 1.0, -37.4, 'tile_white', { tile: 1, collide: false });
  sign(game, ['M-7 FIELD', 'MANIPULATOR', 'CARGO TOOL'], -11.92, 2.2, -39.2, 1.8, 0.9, Math.PI / 2, { pw: 512, bg: '#101820', fg: '#ffb22e' });
  game.add(new Pickup(game, 'manipulator', -10.55, 1.12, -39.2, { range: 2.1 }));
  // racks, drums, junk
  for (const [x, z] of [[-10, -54], [-8.6, -54.4], [-10.4, -52.8]]) game.add(new Prop(game, 'barrel', x, 0.01, z));
  for (const [x, z] of [[-5, -55], [-4.1, -55.2]]) game.add(new Prop(game, 'crate', x, 0.01, z));
  b.box(4, 0, -40, 6, 1.2, -38, 'rust_metal', { tile: 1 });
  sign(game, ['MAINTENANCE', 'BAY 2'], 0, 5.2, -57.95, 3, 1, 0, { pw: 512, bg: '#0f1a24', fg: '#ffb22e' });
  flesh(-12.0, 0, -50, -11.6, 2.2, -46); flesh(11.6, 0, -34, 12, 3, -31);
  // barricade of crates in the doorway (dynamic)
  const barricade = [];
  for (let k = 0; k < 3; k++) for (const x of [7.05, 8.0, 8.95]) barricade.push(game.add(new Prop(game, 'crate', x, 0.01 + k * 0.92, -57.55)));
  for (const c of barricade) { c.body.sleepTimeLimit = 0.3; }
  sign(game, ['DEBRIS'], 8, 3.3, -57.9, 1.2, 0.4, 0, { pw: 256, bg: '#f2c200', fg: '#101010', border: null });
  // ======================================================== C: crate room x -4..20, z -84..-58.3
  b.room(-4, -84, 20, -58.3, 7.4, { wall: 'concrete_wall', floor: 'concrete_floor', ceil: 'ceiling_panel',
    sides: { s: { skip: true }, n: { gaps: [{ at: 8, w: 3.0, h: 5.0 }] } } });
  b.wall(12.3, -58.3, 20.3, -58.3, 7.4, 'concrete_wall', { thick: 0.3 });
  b.box(-4, 0, -84, 20, 2.4, -77, 'metal_floor', { tile: 2 });          // raised catwalk platform
  b.box(-4, 2.3, -77.2, 20, 2.45, -77, 'hazard_stripes', { tile: 0.5, collide: false });
  // railings on the catwalk edge
  for (let x = -3.6; x <= 19.6; x += 1.6) cylinder(b, x, 2.95, -77.1, 0.04, 1.1, 'y', 'metal_plate', { collide: false });
  b.box(-4, 3.4, -77.15, 20, 3.5, -77.05, 'metal_plate', { collide: false });
  b.lamp(4, 7.2, -66, { color: 0xffe9c8, intensity: 55, distance: 16, w: 2 });
  b.lamp(14, 7.2, -66, { color: 0xffe9c8, intensity: 50, distance: 16, w: 2, flicker: 0.4 });
  b.lamp(8, 6.6, -80, { color: 0xffd7a0, intensity: 40, distance: 14, w: 2 });
  sign(game, ['CATWALK', 'AUTHORISED ONLY'], 8, 4.6, -83.65, 2.4, 0.7, 0, { pw: 512, bg: '#f2c200', fg: '#101010', border: null });
  const crateSpots = [[-1.2, -62], [2, -70], [15, -66], [17.5, -62.5]];
  for (const [x, z] of crateSpots) game.add(new Prop(game, 'crate', x, 0.01, z));
  game.add(new Prop(game, 'crate_metal', 5, 0.01, -64));
  game.add(new Prop(game, 'barrel', 18.5, 0.01, -72));
  game.add(new Pickup(game, 'medkit', -2.4, 0.4, -73));
  game.add(new Pickup(game, 'battery', 18.6, 0.4, -60));
  const sp1 = game.add(new Spitter(game, 15.5, 2.4, -80.5, { yaw: 0.4 }));
  flesh(-4.0, 0, -74, -3.6, 2.3, -70);

  // stairs down on the north side of the catwalk into D
  b.stairs(8, -84.3 - 4.8, 3.0, 6, 0.4, 0.8, 'z+', 'metal_floor', 0);
  // ======================================================== D: pit room x -4..20, z -112..-84.3
  b.room(-4, -112, 20, -84.3, 7.4, { wall: 'concrete_wall', floor: null, ceil: 'ceiling_panel',
    sides: { s: { skip: true }, e: { gaps: [{ at: -90, w: 3.0, h: 3.2 }] } } });
  b.box(-4.3, -0.4, -92, 20.3, 0, -84.3, 'metal_floor', { tile: 2 });          // near strip (y=0)
  b.box(-4.3, -0.4, -112.3, 20.3, 0, -99, 'metal_floor', { tile: 2 });         // far platform
  b.box(-4.3, -2.6, -99, 20.3, -2, -92, 'cell_flesh', { tile: 2, matOpts: { emissive: 0x33ff55, emissiveIntensity: 0.6 } }); // pit floor
  b.box(-4.3, -2, -92.2, 20.3, 0, -92, 'concrete_wall', { collide: false });
  const sludge = new THREE.Mesh(new THREE.BoxGeometry(24.3, 0.05, 7), assets.material(null, { color: 0x3a8a22, emissive: 0x2aaa18, emissiveIntensity: 0.55, transparent: true, opacity: 0.8 }));
  sludge.position.set(8, -1.1, -95.5); game.levelRoot.add(sludge);
  game.add(new HazardZone(game, [-4, -2.4, -99], [20, -0.9, -92], 12));
  b.stairs(18.5, -96, 3.0, 5, 0.4, 0.8, 'z+', 'metal_floor', -2);  // escape stair inside the pit
  game.lights.add({ pos: new THREE.Vector3(8, -0.3, -95.5), color: 0x66ff44, intensity: 35, distance: 14, flicker: 0.2, speed: 0.5 });
  b.lamp(4, 7.2, -88, { color: 0xffe0b0, intensity: 50, distance: 16, w: 2, flicker: 0.3 });
  b.lamp(12, 7.2, -105, { color: 0xffe0b0, intensity: 50, distance: 16, w: 2 });
  b.lamp(2, 7.2, -105, { color: 0xffe0b0, intensity: 40, distance: 16, w: 2 });
  // far pedestal + fuse
  b.box(7, 0, -101.5, 9, 0.9, -99.5, 'metal_wall', { tile: 1, matOpts: { color: 0x8a96a2 } });
  const fuse = game.add(new Prop(game, 'fuse', 8, 0.91, -100.5));
  const fuseSpot = game.lights.add({ pos: new THREE.Vector3(8, 1.8, -100.5), color: 0x44ddff, intensity: 14, distance: 6 });
  const sp2 = game.add(new Spitter(game, 1, 0, -108, { yaw: 0 }));
  const sp3 = game.add(new Spitter(game, 15, 0, -108, { yaw: 0 }));
  sign(game, ['WARNING', 'CELL RUNOFF', 'DO NOT ENTER'], 8, 3.6, -111.95, 3.2, 1.2, 0, { pw: 512, bg: '#f2c200', fg: '#101010', border: null });
  game.add(new Pickup(game, 'battery', 0, 0.4, -90));
  game.add(new Pickup(game, 'medkit', 15, 0.4, -88));
  const socketDoor = game.add(new Door(game, { x: 20.15, y: 0, z: -90, w: 3.0, h: 3.2, d: 0.3, axis: 'z', locked: true, tex: 'metal_plate' }));
  const socket = game.add(new Socket(game, 19.88, 1.4, -87, -Math.PI / 2, () => { socketDoor.setLocked(false); socketDoor.openDoor(); game.hud.toast('DOOR POWERED', 2.5); }));
  game.add(new Charger(game, 'health', -3.88, 1.3, -88, Math.PI / 2));
  game.add(new Charger(game, 'suit', -3.88, 1.3, -86.4, Math.PI / 2));
  sign(game, ['FUSE', 'REQUIRED'], 19.84, 2.3, -87, 0.9, 0.5, -Math.PI / 2, { pw: 256, bg: '#1a0a0a', fg: '#ff5a44' });

  // ======================================================== E: nest cavern x 20.3..72, z -104..-76
  b.room(20.3, -104, 72, -76, 8, { wall: 'rust_metal', floor: 'concrete_floor', ceil: 'metal_plate', sides: { w: { skip: true }, e: { gaps: [{ at: -90, w: 4, h: 4 }] } } });
  for (const [x, z, c] of [[28, -96, 0x44ff88], [40, -84, 0x66ff55], [52, -92, 0x44ff88], [64, -98, 0x88ff44], [60, -80, 0x66ff55]]) b.lamp(x, 7.8, z, { color: c, intensity: 45, distance: 18, w: 1.6, flicker: 0.5, speed: 0.6 });
  // flesh coating on walls and ceiling
  for (let i = 0; i < 14; i++) { const x = 24 + i * 3.4; flesh(x, 0, -104.0 + 0.0, x + 2.2, 2.6 + (i % 3), -103.7); flesh(x, 0, -76.3, x + 2.2, 2.0 + (i % 4), -76.0); }
  // cover blocks
  for (const [x, z, w, d] of [[34, -90, 2.4, 1], [46, -80, 1, 3], [47, -97, 3, 1], [58, -90, 1, 3], [66, -84, 2, 2], [70, -98, 2, 2]]) b.box(x - w / 2, 0, z - d / 2, x + w / 2, 1.3, z + d / 2, 'concrete_wall', { tile: 1 });
  // barrels (explosive) - ammo for the manipulator
  const barrelSpots = [[26, -98], [27, -97.1], [26.2, -96.1], [36, -100.5], [36.9, -100.6], [38, -80.5], [50, -85], [51, -85.9], [60, -95], [61, -94.2], [62, -101], [66, -80]];
  for (const [x, z] of barrelSpots) game.add(new Prop(game, 'barrel_explosive', x, 0.01, z));
  for (const [x, z] of [[24, -80], [30, -82], [48, -102]]) game.add(new Prop(game, 'crate', x, 0.01, z));
  game.add(new Pickup(game, 'medkit', 30, 0.4, -102));
  game.add(new Pickup(game, 'medkit', 44, 0.4, -100));
  game.add(new Pickup(game, 'battery', 34, 0.4, -78.5));
  game.add(new Pickup(game, 'battery', 56, 0.4, -78.5));
  game.add(new Charger(game, 'health', 20.42, 1.3, -80, Math.PI / 2));
  game.add(new Charger(game, 'suit', 20.42, 1.3, -78.4, Math.PI / 2));
  // nests + spitters
  const flesh2 = new FleshWall(game, 71.4, 0, -92, 72.0, 4, -88);
  game.add(flesh2);
  const nestState = { left: 3 };
  const onNest = () => { nestState.left--; game.hud.setCounter('CELL NESTS', 3 - nestState.left, 3); if (nestState.left === 0) flesh2.dissolve(); };
  const nests = [[43, 0, -89], [54.5, 0, -99], [63.5, 0, -81]].map(([x, y, z]) => game.add(new Nest(game, x, y, z, { onDestroyed: onNest, interval: 6 })));
  const spitters = [[48, 0, -82, 3], [50.5, 0, -101.5, 0.2], [67, 0, -90, 4.7], [32, 0, -91, 1.5]].map(([x, y, z, yaw], i) => game.add(new Spitter(game, x, y, z, { yaw, mobile: i === 3 })));
  // exit tunnel behind the membrane
  b.box(72, -0.4, -92, 90, 0, -88, 'metal_floor', { tile: 2 });
  b.box(72, 3.8, -92, 90, 4.1, -88, 'ceiling_panel', { tile: 2 });
  b.box(72, 0, -92.3, 90, 4.1, -92, 'metal_wall', { tile: 2 }); b.box(72, 0, -88, 90, 4.1, -87.7, 'metal_wall', { tile: 2 });
  b.box(90, 0, -92.3, 90.3, 4.1, -87.7, 'hazard_stripes', { tile: 1 });
  b.lamp(80, 3.7, -90, { color: 0xeef6ff, intensity: 30, distance: 12, w: 1.5 });
  sign(game, ['SURFACE', 'ACCESS  >>>'], 89.65, 2.6, -90, 2.4, 0.8, Math.PI / 2, { pw: 512, bg: '#0f2418', fg: '#44ff88' });

  // emergency beacons
  for (const [x, y, z] of [[0, 3.2, -10], [0, 3.2, -26], [0, 6.8, -40], [8, 6.8, -48], [8, 7, -64], [0, 7, -96], [34, 7.8, -90], [58, 7.8, -90]]) game.add(new Beacon(game, x, y, z, 0xff2a10, 2.4 + Math.random(), 11));
  // vents for ambushes
  const vB = [[-4, -46], [5, -42], [0, -52]].map(([x, z]) => game.add(new Vent(game, x, 0, z)));
  const vA = [[0, -12], [0.5, -20]].map(([x, z]) => game.add(new Vent(game, x, 0, z)));
  const dormant = [];
  for (const [x, z] of [[0.6, -23], [-0.6, -26]]) { const c = game.add(new Crawler(game, x, 0.1, z)); dormant.push(c); }

  function ambush(vents, n) {
    game.scheduler.run(async (s) => {
      for (let i = 0; i < n; i++) {
        const v = vents[i % vents.length]; v.open();
        const c = new Crawler(game, v.pos.x, 0.2, v.pos.z, { aggro: true }); c.body.vel.y = 6; game.add(c);
        game.audio.playAt('crawler_attack', v.pos, 0.9, { pitch: 0.7 });
        await s.wait(0.6);
      }
    }, game);
  }

  let inBay = false, onCatwalk = false;
  const level = {
    spawn: { x: 0, y: 0, z: -1.5, yaw: 0 },
    music: 'combat_loop',
    update(dt) {
      if (fuse.alive && fuse.body.position.y < -1.7) { fuse.respawn(); game.hud.toast('FUSE CELL RECOVERED', 2); }
    },
    async run(s) {
      await s.wait(2);
      s.sayNoWait('varga_c3_1');
      game.add(new Trigger(game, [-2, -1, -33], [2, 4, -30], { onEnter: () => { inBay = true; } }));
      await s.step('Follow the service corridor', () => inBay, () => game.teleport(0, 0, -31.5));
      game.dialogue.say('varga_c3_2');
      await s.step('Find the M-7 Field Manipulator on the workbench', () => game.player.has.manipulator, () => game.player.giveWeapon('manipulator'));
      game.hud.toast('LMB: PUNT    RMB: GRAB / DROP', 5);
      ambush(vB, 3);
      s.sayNoWait('varga_c3_3');
      await s.wait(3);
      s.sayNoWait('varga_c3_4');
      const cleared = () => barricade.every((c) => !c.alive || Math.abs(c.body.position.x - 8) > 1.75 || c.body.position.z > -56.0 || c.body.position.y > 4 || c.held);
      await s.step('Clear the barricade: grab the crates with RIGHT MOUSE', cleared, () => barricade.forEach((c) => c.alive && c.removeFromWorld()));
      game.audio.play('door_open', { vol: 0.6 });
      game.add(new Trigger(game, [-4, -1, -75], [20, 4, -58.3], { onEnter: () => { s.sayNoWait('varga_c3_5'); } }));
      await s.step('Reach the catwalk: stack the crates', () => game.player.pos.y > 2.0 && game.player.pos.z < -78, () => game.teleport(8, 2.5, -80));
      game.audio.play('suit_beep', { vol: 0.6 });
      game.add(new Trigger(game, [-4, 1, -92], [20, 4, -85], { onEnter: () => { s.sayNoWait('varga_c3_6'); } }));
      await s.step('Pull the fuse cell across the pit and insert it into the socket', () => socket.filled, () => socket.fill(fuse));
      let inE = false;
      game.add(new Trigger(game, [20.5, -1, -104], [30, 4, -76], { onEnter: () => { inE = true; } }));
      await s.step('Go through the powered door', () => inE, () => game.teleport(24, 0, -90));
      s.sayNoWait('varga_c3_7');
      game.hud.setCounter('CELL NESTS', 0, 3);
      await s.step('Destroy the Cell nests: throw explosive barrels at them', () => nestState.left <= 0, () => nests.forEach((n) => !n.isDead && n.takeDamage(999, { type: 'explosion' })));
      s.sayNoWait('varga_c3_8');
      game.hud.setCounter(null);
      await s.wait(2);
      let up = false;
      game.add(new Trigger(game, [84, -1, -92], [90, 4, -88], { onEnter: () => { up = true; } }));
      await s.step('Take the surface access to Pad 39', () => up, () => game.teleport(86, 0, -90));
      await game.completeChapter();
    },
  };
  return level;
}
