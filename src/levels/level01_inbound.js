import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { Entity } from '../entities/Entity.js';
import { Door } from '../entities/Door.js';
import { NPC } from '../entities/NPC.js';
import { Trigger } from '../entities/Trigger.js';
import { Charger } from '../entities/Charger.js';
import { Pickup } from '../entities/Pickup.js';
import { LevelBuilder } from './LevelBuilder.js';
import { makeSky } from '../render/Sky.js';
import { createRocket } from '../render/Rocket.js';
import { sign, glass, cylinder } from './kit.js';

const D = 2500;               // tram route length (m)
const V_MAX = 31, ACC = 3.0, BRAKE = 2.4;

class SuitLocker extends Entity {
  constructor(game, x, z, rotY, onTake) {
    super(game);
    this.usable = true; this.prompt = 'TAKE EVA SUIT';
    this.pos = new THREE.Vector3(x, 1.2, z);
    this.onTake = onTake; this.taken = false; this.useRange = 2.6;
    this.t = 0;
  }
  usePos() { return this.pos; }
  canUse() { return !this.taken; }
  onUse() { this.taken = true; this.usable = false; this.onTake(); }
}

function instanced(geo, mat, matrices) {
  const m = new THREE.InstancedMesh(geo, mat, matrices.length);
  const o = new THREE.Object3D();
  matrices.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, p[3] || 0, 0); o.scale.set(p[4] || 1, p[5] || 1, p[6] || 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.frustumCulled = false;
  return m;
}

function windowWall(b, axis, c, a0, a1, y0, h, sill, top, wins, tex, thick = 0.2) {
  // wall along `axis` ('x') at coordinate c (z), with window openings [centre,width] ; solid below sill & above top
  const L = (lo, hi, ylo, yhi) => { if (axis === 'x') b.box(lo, ylo, c, hi, yhi, c + thick, tex, { tile: 2 }); };
  L(a0, a1, y0, y0 + sill); L(a0, a1, y0 + top, y0 + h);
  let cur = a0;
  const sorted = wins.slice().sort((p, q) => p[0] - q[0]);
  for (const [wc, ww] of sorted) { L(cur, wc - ww / 2, y0 + sill, y0 + top); cur = wc + ww / 2; }
  L(cur, a1, y0 + sill, y0 + top);
}

export function build(game, b) {
  game.setAtmosphere({ fog: [0xe6c4a0, 120, 1100], bg: null, ambient: [0xffe8d0, 0.55], hemi: [0xbcd4ff, 0x8a6a4a, 0.75], exposure: 1.0, bloom: 0.35, bloomThreshold: 0.9, far: 4000 });
  const sky = makeSky({ top: 0x3f6fc4, horizon: 0xffc690, bottom: 0x6a5238, stars: 0, sunDir: [0.85, 0.16, 0.5], sunColor: 0xffc080, sunSize: 400 });
  game.levelRoot.add(sky);
  const sun = new THREE.DirectionalLight(0xffd2a0, 2.6); sun.position.set(80, 40, 50); game.levelRoot.add(sun);

  // ============================================================ scenery (scrolls past the stationary tram)
  const scenery = new THREE.Group(); game.levelRoot.add(scenery);
  const bs = new LevelBuilder(game, { parent: scenery });
  bs.defaultTile = 8;
  const gy = -1.4;
  bs.box(-D - 400, gy - 3, -900, 600, gy, 900, 'sand_ground', { collide: false, tile: 12 });
  // rails + bed
  bs.box(-D - 300, gy, -1.2, 400, gy + 0.4, 1.2, 'asphalt', { collide: false, tile: 3 });
  bs.box(-D - 300, gy + 0.4, -0.75, 400, gy + 0.6, -0.65, 'metal_plate', { collide: false });
  bs.box(-D - 300, gy + 0.4, 0.65, 400, gy + 0.6, 0.75, 'metal_plate', { collide: false });
  // sleepers
  const sl = []; for (let x = -D - 280; x < 380; x += 1.6) sl.push([x, gy + 0.45, 0]);
  scenery.add(instanced(new THREE.BoxGeometry(0.4, 0.12, 2.1), assets.material(null, { color: 0x4a3c2e }), sl));
  // catenary poles + lamps both sides
  const poles = [];
  for (let x = -D - 280; x < 380; x += 36) { poles.push([x, gy + 4, -3.4]); poles.push([x, gy + 4, 3.4]); }
  scenery.add(instanced(new THREE.CylinderGeometry(0.12, 0.16, 8.4, 8), assets.material('metal_plate', { color: 0x8a949c, metalness: 0.6 }), poles));
  const arms = []; for (let x = -D - 280; x < 380; x += 36) { arms.push([x, gy + 8.2, -2.2]); arms.push([x, gy + 8.2, 2.2]); }
  scenery.add(instanced(new THREE.BoxGeometry(0.15, 0.15, 4.4), assets.material(null, { color: 0x555d64 }), arms));
  // fence along the north side
  const fp = []; for (let x = -D - 280; x < 380; x += 6) fp.push([x, gy + 1.1, -9]);
  scenery.add(instanced(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), assets.material(null, { color: 0x666d73 }), fp));
  for (const yy of [0.5, 1.5]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(D + 700, 0.05, 0.05), assets.material(null, { color: 0x666d73 })); rail.position.set(-D / 2 + 50, gy + yy, -9); scenery.add(rail); }
  // power pylons (far, south)
  const py = []; for (let x = -D - 200; x < 300; x += 180) py.push([x, gy + 14, 40]);
  scenery.add(instanced(new THREE.CylinderGeometry(0.4, 1.2, 28, 6), assets.material('rust_metal', { color: 0xbbbbbb }), py));
  // scattered rocks & brush
  const rk = []; for (let i = 0; i < 400; i++) { const z = (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 320); rk.push([-Math.random() * (D + 200), gy + 0.4, z, Math.random() * 6, 1 + Math.random() * 3, 0.5 + Math.random() * 1.5, 1 + Math.random() * 3]); }
  scenery.add(instanced(new THREE.DodecahedronGeometry(1, 0), assets.material(null, { color: 0x8a6c4c, roughness: 1 }), rk));

  // containment silos (north, with glowing slits)
  const siloMat = assets.material('metal_wall', { color: 0xcfd6db, metalness: 0.4 });
  const glowMat = assets.material('cell_flesh', { emissive: 0x44ff77, emissiveIntensity: 0.9, color: 0x99ffbb });
  for (let i = 0; i < 9; i++) {
    const x = -D + 700 + i * 24, z = -42;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 26, 24), siloMat); s.position.set(x, gy + 13, z); scenery.add(s);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.4, 1.2, 24), assets.material(null, { color: 0x2b3238, metalness: 0.6 })); cap.position.set(x, gy + 26.4, z); scenery.add(cap);
    for (const yy of [8, 16]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(8.06, 8.06, 0.9, 24, 1, true), glowMat); band.position.set(x, gy + yy, z); scenery.add(band); }
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 30, 8), assets.material('rust_metal', {})); pipe.rotation.x = Math.PI / 2; pipe.position.set(x, gy + 3, -24); scenery.add(pipe);
  }
  const sg = sign(game, ['CELL', 'CONTAINMENT', 'SECTOR B'], -D + 700 + 4 * 24, gy + 21, -33.8, 12, 5, 0, { pw: 512, bg: '#e8e0d0', fg: '#b01818', border: null }); scenery.add(sg);
  // VAB
  const vab = new THREE.Mesh(new THREE.BoxGeometry(120, 80, 70), assets.material('concrete_wall', { color: 0xe9eef2 })); vab.position.set(-D + 1500, gy + 40, -80); scenery.add(vab);
  const vabStripe = new THREE.Mesh(new THREE.BoxGeometry(120.5, 8, 70.5), assets.material(null, { color: 0x1d2a4d })); vabStripe.position.set(-D + 1500, gy + 60, -80); scenery.add(vabStripe);
  const vabDoor = new THREE.Mesh(new THREE.BoxGeometry(34, 62, 1), assets.material(null, { color: 0x2a3036, metalness: 0.5 })); vabDoor.position.set(-D + 1500, gy + 31, -44.6); scenery.add(vabDoor);
  const flag = sign(game, ['AVE MARIA', 'PROGRAM'], -D + 1500, gy + 72, -44.6, 40, 8, 0, { pw: 512, bg: '#e9eef2', fg: '#1d2a4d', border: null }); scenery.add(flag);
  const vabSign = sign(game, ['VEHICLE ASSEMBLY BUILDING'], -D + 1500, gy + 4, -44, 30, 3, 0, { pw: 512, bg: '#1d2a4d', fg: '#ffffff', border: null }); scenery.add(vabSign);
  // Pad 39 with the DX-90 / Gabriel, seen across the desert
  const padGroup = new THREE.Group(); padGroup.position.set(-D + 2050, gy, 70); scenery.add(padGroup);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(80, 0.6, 80), assets.material('concrete_floor', { color: 0xdddddd })); slab.position.y = 0.3; padGroup.add(slab);
  const mount = new THREE.Mesh(new THREE.BoxGeometry(12, 3.6, 12), assets.material('concrete_wall', {})); mount.position.y = 2.4; padGroup.add(mount);
  const rk1 = createRocket(); rk1.group.position.y = 4.2; padGroup.add(rk1.group);
  const tw = new THREE.Mesh(new THREE.BoxGeometry(4, 44, 4), assets.material('rust_metal', { color: 0xcc7755 })); tw.position.set(10, 22, 0); padGroup.add(tw);
  for (const x of [-30, 30]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 28, 6), assets.material(null, { color: 0x777 })); p.position.set(x, 14, 30); padGroup.add(p); }
  const padSign = sign(game, ['PAD 39'], -D + 2050, gy + 6, 70 + 41, 16, 4, Math.PI, { pw: 512, bg: '#101820', fg: '#ffb22e' }); scenery.add(padSign);
  // distant mountains (barely parallax)
  const mm = assets.material(null, { color: 0x8a6a62, roughness: 1 });
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(120 + Math.random() * 160, 90 + Math.random() * 140, 5), mm);
    m.position.set(-Math.random() * (D + 1200) + 300, gy + 40, (Math.random() < 0.5 ? -1 : 1) * (700 + Math.random() * 500));
    scenery.add(m);
  }

  // ============================================================ tram (fixed at origin)
  const TF = 0.0; // tram floor
  const tramMat = 'metal_wall';
  const tcol = { matOpts: { color: 0xdfe6ec } };
  b.box(-4.2, -0.4, -1.5, 4.2, TF, 1.5, 'metal_floor', { tile: 1.5 });
  b.box(-4.2, 3.0, -1.5, 4.2, 3.3, 1.5, 'ceiling_panel', { tile: 2 });
  b.box(-4.2, TF, -1.5, -4.0, 3.0, 1.5, tramMat, { ...tcol, tile: 2 });
  b.box(4.0, TF, -1.5, 4.2, 3.0, 1.5, tramMat, { ...tcol, tile: 2 });
  // body skirt / undercarriage (visual)
  b.box(-4.1, -0.9, -1.4, 4.1, -0.4, 1.4, null, { visible: false });
  const under = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.7, 2.6), assets.material(null, { color: 0x2a2f35, metalness: 0.6 })); under.position.y = -0.75; game.levelRoot.add(under);
  for (const x of [-2.6, 2.6]) { const bog = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), assets.material(null, { color: 0x1a1d21 })); bog.position.set(x, -1.0, 0); game.levelRoot.add(bog); }
  const winN = [[-2.7, 1.9], [0, 1.9], [2.7, 1.9]];
  windowWall(b, 'x', -1.5, -4.2, 4.2, TF, 3.0, 0.95, 2.3, winN, tramMat);
  // south wall with a door opening at x=0 (door entity) and windows at +-2.9
  const winS = [[-2.9, 1.6], [2.9, 1.6]];
  const south = (lo, hi, y0, y1) => b.box(lo, y0, 1.3, hi, y1, 1.5, tramMat, { ...tcol, tile: 2 });
  south(-4.2, 4.2, 2.3, 3.0); south(-4.2, 4.2, TF, 0.95);
  south(-4.2, -3.7, 0.95, 2.3); south(-2.1, -1.1, 0.95, 2.3); south(1.1, 2.1, 0.95, 2.3); south(3.7, 4.2, 0.95, 2.3);
  glass(b, -3.7, 0.95, 1.38, -2.1, 2.3, 1.42); glass(b, 2.1, 0.95, 1.38, 3.7, 2.3, 1.42);
  for (const [wc, ww] of winN) glass(b, wc - ww / 2, 0.95, -1.42, wc + ww / 2, 2.3, -1.38);
  // doors to the next car (decor)
  b.box(-4.0, TF, -0.7, -3.98, 2.4, 0.7, 'metal_plate', { collide: false });
  b.box(3.98, TF, -0.7, 4.0, 2.4, 0.7, 'metal_plate', { collide: false });
  // seats (benches along the north wall)
  for (const x of [-3.2, -1.7, 1.7, 3.2]) b.box(x - 0.55, TF, -1.35, x + 0.55, 0.5, -0.8, 'tile_floor', { tile: 1, matOpts: { color: 0x3a5a8a } });
  for (const x of [-3.2, -1.7, 1.7, 3.2]) b.box(x - 0.55, 0.5, -1.4, x + 0.55, 1.1, -1.28, 'tile_floor', { tile: 1, collide: false, matOpts: { color: 0x3a5a8a } });
  // seats on the south wall, between windows
  // grab poles
  for (const x of [-2.3, 0, 2.3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 8), assets.material('metal_plate', { color: 0xffd23a, metalness: 0.7 })); p.position.set(x, 1.5, 0.2); game.levelRoot.add(p); }
  b.lamp(-2.3, 2.95, 0, { color: 0xf4f8ff, intensity: 22, distance: 8, w: 1.4, flicker: 0.12 });
  b.lamp(2.3, 2.95, 0, { color: 0xf4f8ff, intensity: 22, distance: 8, w: 1.4, flicker: 0.1 });
  sign(game, ['AVE MARIA', 'LAUNCH DAY'], -1.0, 2.2, -1.46, 1.6, 0.45, 0, { pw: 512, bg: '#0f1a2a', fg: '#ffffff', border: '#ffb22e' });
  sign(game, ['NEXT: SECTOR C'], 1.6, 2.8, -1.46, 1.2, 0.3, 0, { pw: 512, bg: '#0f1a24', fg: '#44ddff', border: null });
  sign(game, ['DX-90', 'T - 4 HOURS'], -3.9, 2.55, -0.9, 1.0, 0.4, Math.PI / 2, { pw: 512, bg: '#101010', fg: '#ff4422' });
  const tramDoor = game.add(new Door(game, { x: 0, y: TF, z: 1.4, w: 2.2, h: 2.3, d: 0.2, axis: 'x', tex: 'metal_plate', speed: 1.6, silent: true }));
  tramDoor.group.visible = true;

  // ============================================================ station + Sector C (arrives with the tram)
  const stationGroup = new THREE.Group(); scenery.add(stationGroup);
  stationGroup.position.x = 0;
  const bst = new LevelBuilder(game, { parent: stationGroup });
  const n0 = game.lights.spots.length;
  const ssign = (...args) => { const m = sign(game, ...args); stationGroup.add(m); return m; };
  const PL = { x0: -14, x1: 28, z0: 1.5, z1: 9 };
  // platform slab (flush with tram floor) + canopy
  bst.box(PL.x0, -0.5, PL.z0, PL.x1, TF, 9.3, 'concrete_floor', { tile: 2.5 });
  bst.clip(4.2, 0, 1.3, PL.x1 + 0.3, 3, 1.5); bst.clip(PL.x0, 0, 1.3, -4.2, 3, 1.5); bst.clip(PL.x1, 0, 1.5, PL.x1 + 0.3, 3, 9.3);
  bst.box(PL.x0 - 1, -1.8, PL.z0 - 1, PL.x1 + 1, -0.5, 1.5, 'concrete_wall', { collide: false });
  bst.box(PL.x0, 4.4, PL.z0, PL.x1, 4.7, PL.z1, 'metal_plate', { tile: 3 });
  for (const x of [-12, -2, 8, 18, 27]) bst.box(x, TF, 8.2, x + 0.35, 4.4, 8.55, 'metal_plate', { tile: 2 });
  bst.box(PL.x0, 0.0, PL.z0 - 0.0, PL.x1, 0.12, PL.z0 + 0.25, 'hazard_stripes', { collide: false, tile: 0.6 });
  for (const x of [-9, 4, 12, 21]) bst.lamp(x, 4.3, 5, { color: 0xfff0dc, intensity: 28, distance: 14, w: 1.8, flicker: x === 12 ? 0.4 : 0 });
  // jump barrier: crate row across the platform between the tram door and the locker-room door
  for (let z = 1.9; z < 8.8; z += 0.9) bst.box(-4.2, TF, z, -3.3, 0.9, z + 0.9 > 9 ? 9 : z + 0.9, 'crate_wood', { tile: 0.9 });
  ssign(['CAUTION', 'LUGGAGE'], -3.25, 1.4, 5.0, 1.6, 0.5, Math.PI / 2, { pw: 512, bg: '#f2c200', fg: '#101010', border: null });
  // main building wall at z=9 with two doorways (locker room x=-8, lobby x=15)
  const BZ = 9.0, BH = 4.2;
  bst.wall(PL.x0 - 0.3, BZ, PL.x1 + 0.3, BZ, BH, 'concrete_wall', { thick: 0.3, gaps: [{ at: -8, w: 2.2, h: 2.7 }, { at: 15, w: 2.4, h: 2.8 }] });
  bst.box(PL.x0 - 0.3, 0, 1.5, PL.x0, BH, BZ + 16.3, 'concrete_wall');
  bst.box(PL.x1, 0, 1.5, PL.x1 + 0.3, BH, 1.5 + 0.01, 'concrete_wall', { collide: false });
  // --- locker room (x -14..4, z 9.3..24)
  const LR = { x0: -14, x1: 4, z0: 9.3, z1: 24 };
  bst.box(LR.x0, -0.5, LR.z0, LR.x1 + 0.3, 0, LR.z1, 'tile_floor', { tile: 2 });
  bst.ceiling(LR.x0, LR.z0, LR.x1, LR.z1, BH, 'ceiling_panel');
  bst.box(LR.x0, 0, LR.z1, LR.x1 + 0.3, BH, LR.z1 + 0.3, 'tile_white', { tile: 2 });
  // low-header doorway into the lobby (crouch tutorial)
  bst.wall(4, LR.z0, 4, LR.z1, BH, 'concrete_wall', { thick: 0.3, gaps: [{ at: 16, w: 1.7, h: 1.35 }] });
  bst.box(3.9, 1.2, 15.0, 4.4, 1.36, 17.0, 'hazard_stripes', { collide: false, tile: 0.4 });
  ssign(['LOW CLEARANCE', 'DUCK  [CTRL / C]'], 3.7, 1.75, 16, 1.4, 0.55, -Math.PI / 2, { pw: 512, bg: '#f2c200', fg: '#101010', border: null });
  for (const x of [-10, -2.5]) bst.lamp(x, BH - 0.1, 14, { color: 0xeef6ff, intensity: 30, distance: 12, w: 1.6, flicker: x < -5 ? 0.25 : 0 });
  bst.lamp(-6, BH - 0.1, 21, { color: 0xeef6ff, intensity: 26, distance: 10, w: 1.6 });
  // lockers along the west + north walls
  let lockerNum = 0, lockerPos = null;
  for (let z = 11.2; z <= 22.8; z += 0.55) {
    const m = assets.model('locker'); m.position.set(LR.x0 + 0.3, 0, z); m.rotation.y = Math.PI / 2; stationGroup.add(m); lockerNum++;
  }
  bst.box(LR.x0, 0, 11, LR.x0 + 0.6, 1.9, 23, null, { visible: false });
  for (let x = -12; x <= 2.4; x += 0.55) {
    if (x > -8.8 && x < -6.5 && false) continue;
    const m = assets.model('locker'); m.position.set(x, 0, LR.z1 - 0.3); m.rotation.y = Math.PI; stationGroup.add(m);
  }
  bst.box(LR.x0, 0, LR.z1 - 0.65, LR.x1, 1.9, LR.z1, null, { visible: false });
  // locker 13 stands out
  const L13 = { x: -6.0, z: LR.z1 - 0.35 };
  const l13 = assets.model('locker'); l13.position.set(L13.x, 0, L13.z - 0.0); l13.rotation.y = Math.PI; l13.scale.setScalar(1.001); stationGroup.add(l13);
  const l13glow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.02), new THREE.MeshBasicMaterial({ color: 0xffb22e })); l13glow.position.set(L13.x, 1.7, L13.z - 0.3); stationGroup.add(l13glow);
  ssign(['13'], L13.x, 1.82, L13.z - 0.3, 0.22, 0.14, Math.PI, { pw: 128, bg: '#1a1a1a', fg: '#ffb22e', border: null, font: 'bold 70px Arial' });
  const lockerLight = game.lights.add({ pos: new THREE.Vector3(L13.x, 2.0, L13.z - 1.0), color: 0xffb040, intensity: 14, distance: 5 });
  // benches
  bst.box(-12, 0, 16, -11.4, 0.45, 20, 'metal_plate', { tile: 1 });
  bst.box(-9, 0, 15, -3, 0.45, 15.5, 'metal_plate', { tile: 1 });
  // --- lobby / security (x 4.3..28, z 9.3..24)
  const LB = { x0: 4.3, x1: 28, z0: 9.3, z1: 24 };
  bst.box(LB.x0, -0.5, LB.z0, LB.x1, 0.0, LB.z1, 'tile_floor', { tile: 2 });
  bst.ceiling(LB.x0, LB.z0, LB.x1, LB.z1, BH, 'ceiling_panel');
  bst.box(LB.x0, 0, LB.z1, LB.x1 + 0.3, BH, LB.z1 + 0.3, 'concrete_wall');
  for (const x of [9, 16, 23]) bst.lamp(x, BH - 0.1, 16, { color: 0xeef6ff, intensity: 30, distance: 13, w: 1.8 });
  // east wall with the Lab C-4 door (z=17)
  bst.wall(LB.x1, LB.z0, LB.x1, LB.z1, BH, 'metal_wall', { thick: 0.3, gaps: [{ at: 17, w: 2.4, h: 2.8 }] });
  // corridor beyond
  bst.box(LB.x1 + 0.3, -0.5, 15.4, LB.x1 + 12, 0, 18.6, 'metal_floor', { tile: 1.5 });
  bst.box(LB.x1 + 0.3, 0, 15.2, LB.x1 + 12, BH, 15.4, 'metal_wall', { tile: 2 });
  bst.box(LB.x1 + 0.3, 0, 18.6, LB.x1 + 12, BH, 18.8, 'metal_wall', { tile: 2 });
  bst.box(LB.x1 + 0.3, BH - 0.4, 15.4, LB.x1 + 12, BH, 18.6, 'ceiling_panel', { tile: 2 });
  bst.box(LB.x1 + 12, 0, 15.2, LB.x1 + 12.3, BH, 18.8, 'hazard_stripes', { tile: 1 });
  bst.lamp(LB.x1 + 5, BH - 0.45, 17, { color: 0xeef6ff, intensity: 24, distance: 10, w: 1.4 });
  ssign(['LAB C-4', 'RESONANCE RESEARCH'], LB.x1 + 0.2, 3.4, 17, 2.8, 0.7, Math.PI / 2, { pw: 512, bg: '#0f1a24', fg: '#44ddff' });
  ssign(['SECTOR C', 'SECURITY'], 16, 3.3, LB.z1 - 0.05, 3, 0.8, Math.PI, { pw: 512, bg: '#0f1a24', fg: '#ffb22e' });
  // security desk + Brooks
  bst.box(11.5, 0, 17.2, 15.5, 1.0, 18.2, 'metal_plate', { tile: 1.5, matOpts: { color: 0x7d8c9c } });
  bst.box(11.5, 1.0, 17.1, 15.5, 1.08, 18.3, 'tile_white', { tile: 1.5, collide: false });
  const mon = assets.model('computer_console'); mon.scale.setScalar(0.5); mon.position.set(13.5, 1.08, 17.55); mon.rotation.y = Math.PI; stationGroup.add(mon);
  const chairM = assets.model('chair'); chairM.position.set(13.5, 0, 18.9); chairM.rotation.y = Math.PI; chairM.scale.setScalar(1.4); stationGroup.add(chairM);
  // benches, posters
  bst.box(6, 0, 20, 10, 0.45, 20.6, 'metal_plate', { tile: 1 });
  ssign(['SAFETY FIRST', 'THE CELLS ARE FINE'], 7, 2.2, LB.z1 - 0.05, 2.4, 0.9, Math.PI, { pw: 512, bg: '#e8e0d0', fg: '#b01818', border: null });
  const stationSpots = game.lights.spots.slice(n0);
  stationSpots.forEach((sp) => { sp.enabled = false; });
  bst.finish();
  const labDoor = game.add(new Door(game, { x: LB.x1 + 0.15, y: 0, z: 17, w: 2.4, h: 2.8, d: 0.3, axis: 'z', locked: true, tex: 'metal_plate' }));
  scenery.add(labDoor.group); labDoor.group.position.x -= 0; // keep world position (scenery at x=0 on arrival)
  // reparenting changes nothing visually at gx=0; during the ride it simply slides in with the station
  const brooks = game.add(new NPC(game, 'brooks', 13.5, 0, 18.4, { yaw: Math.PI, onUse: null }));
  scenery.add(brooks.group);
  const suitLocker = game.add(new SuitLocker(game, L13.x, L13.z - 0.7, Math.PI, () => takeSuit()));
  suitLocker.pos.set(L13.x, 1.2, L13.z - 0.6);
  suitLocker.usable = false;
  // chargers outside the lab door (flavour; health only after the suit)

  let state = { arrived: false, suit: false, talked: false, brooksStage: 0 };
  function takeSuit() {
    state.suit = true;
    const p = game.player;
    p.hasSuit = true; p.suit = 0; p.addSuit(25);
    game.audio.play('suit_beep', { vol: 1 });
    l13glow.material.color.setHex(0x333333); lockerLight.enabled = false;
    game.hud.setVisible(true);
    game.hud.pickupMessage('EVA SUIT EQUIPPED');
    game.hud.toast('HUD ONLINE', 2.5);
  }

  // scenery motion state
  const motion = { remaining: D, v: 0, phase: 'accel', t: 0 };
  scenery.position.x = D;
  let tramSound = null;

  const level = {
    spawn: { x: -2.4, y: 0, z: -0.5, yaw: 0 },
    music: 'inbound_ambient',
    hasSuit: false,
    update(dt) {
      if (motion.phase === 'done') return;
      motion.t += dt;
      const m = motion;
      if (m.phase === 'accel') { m.v = Math.min(V_MAX, m.v + ACC * dt); if (m.v >= V_MAX) m.phase = 'cruise'; }
      if (m.phase !== 'accel' && m.remaining <= (m.v * m.v) / (2 * BRAKE) + 1 && m.phase !== 'brake') { m.phase = 'brake'; game.audio.play('tram_brake', { vol: 0.9 }); level.braking = true; }
      if (m.phase === 'brake') { m.v = Math.max(0.0, Math.min(m.v, Math.sqrt(2 * BRAKE * Math.max(0, m.remaining)) + 0.02)); if (m.remaining < 0.15 || m.v < 0.03) { m.v = 0; m.remaining = 0; m.phase = 'done'; level.stopped = true; } }
      m.remaining = Math.max(0, m.remaining - m.v * dt);
      scenery.position.x = m.remaining;
      if (tramSound) tramSound.setVolume(Math.min(0.55, 0.05 + m.v / V_MAX * 0.5), 0.2);
      // gentle sway
      const sway = Math.min(1, m.v / 10);
      game.player.shake(0.0006 * sway, 0.05);
    },
    async run(s) {
      tramSound = game.loopSound('tram_loop', { vol: 0.05 });
      game.hud.toast('WASD  MOVE   ·   MOUSE  LOOK   ·   SPACE  JUMP', 5);
      await s.wait(4);
      s.sayNoWait('pa_welcome');
      await s.wait(2);
      game.setObjective('Enjoy the ride (look around)', () => { motion.remaining = Math.min(motion.remaining, 30); motion.v = Math.min(motion.v, 8); });
      s.sayNoWait('pa_tram1');
      // distance-triggered PA announcements
      const at = (km, key) => s.until(() => D - motion.remaining > km).then(() => s.sayNoWait(key));
      at(500, 'pa_silo'); at(1100, 'pa_lore'); at(1450, 'pa_vab'); at(1900, 'pa_pad');
      await s.until(() => D - motion.remaining > 2100 || motion.phase === 'done');
      s.sayNoWait('pa_arrive');
      await s.until(() => motion.phase === 'done');
      if (tramSound) { tramSound.stop(1.0); tramSound = null; }
      game.setObjective(null);
      // arrive
      stationSpots.forEach((sp) => { sp.enabled = true; });
      await s.wait(1.0);
      game.audio.playAt('door_open', { x: 0, y: 1, z: 1.4 }, 1, { throttle: 0 });
      tramDoor.openDoor();
      s.sayNoWait('varga_welcome');
      await s.step('Exit the tram', () => game.player.pos.z > 2.3, () => { game.teleport(0, 0, 3.5); });
      game.hud.toast('Cross the platform: SPACE to jump the crates', 5);
      await s.step('Find your locker (13) in the locker room', () => game.player.pos.z > 10.5 && game.player.pos.x < 4, () => game.teleport(-6, 0, 12));
      suitLocker.usable = true;
      game.hud.toast('Use things with  E', 4);
      await s.step('Take your EVA suit from locker 13', () => state.suit, () => takeSuit() || (suitLocker.taken = true, suitLocker.usable = false));
      s.sayNoWait('varga_suit');
      game.hud.toast('Duck under the low doorway: hold CTRL or C', 5);
      brooks.setOnUse(() => {
        state.brooksStage++;
        if (state.brooksStage === 1) {
          game.scheduler.run(async (s2) => { brooks.talking = true; await s2.say('brooks_1'); await s2.say('brooks_2'); await s2.say('brooks_3'); brooks.talking = false; state.talked = true; labDoor.setLocked(false); labDoor.openDoor(); }, game);
        } else game.dialogue.say('brooks_again');
      });
      await s.step('Talk to Officer Brooks at the security desk', () => state.talked, () => { state.talked = true; labDoor.setLocked(false); labDoor.openDoor(); });
      let reached = false;
      game.add(new Trigger(game, [LB.x1 + 7, -1, 15.2], [LB.x1 + 12, 4, 18.6], { onEnter: () => { reached = true; } }));
      await s.step('Proceed to Lab C-4', () => reached, () => game.teleport(LB.x1 + 8, 0, 17));
      await game.completeChapter();
    },
  };
  return level;
}
