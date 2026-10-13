// The Pad 39 environment, shared by the menu background and chapter 4.
import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { createRocket } from '../render/Rocket.js';
import { makeSky } from '../render/Sky.js';
import { cylinder, sign } from './kit.js';

export const MOUNT_TOP = 3.6;
export const TOP_Y = 37.35;        // crew-arm / cockpit floor height
export const TOWER = { x0: 8, x1: 12, z0: -2, z1: 2 };

function brace(game, a, b, r = 0.07, mat) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(r * 2, r * 2, len), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.lookAt(b);
  game.levelRoot.add(m);
}

export function buildPad(game, b, o = {}) {
  const steel = assets.material('metal_plate', { metalness: 0.6, roughness: 0.5, color: 0xb04a2a });
  const dark = assets.material(null, { color: 0x2a2f35, metalness: 0.6, roughness: 0.5 });

  game.setAtmosphere({ fog: [0x0b1226, 40, 330], bg: null, ambient: [0x6677aa, 0.45], hemi: [0x8899cc, 0x222233, 0.55], exposure: 1.0, bloom: 0.45, bloomThreshold: 0.95, far: 3000, env: 0.18 });
  const sky = makeSky({ useTexture: false, top: 0x03050d, horizon: 0x1b2748, bottom: 0x05060a, stars: 1, sunDir: [-0.5, 0.35, -0.7], sunColor: 0x4a5a8a, sunSize: 1800 });
  game.levelRoot.add(sky);
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0.9); moon.position.set(-30, 60, 40);
  game.levelRoot.add(moon);

  // ground + pad
  b.box(-400, -3, -400, 400, 0, 400, 'sand_ground', { tile: 8, surface: 'concrete' });
  const farGround = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000), assets.material(null, { color: 0x4a3c2a, roughness: 1 }));
  farGround.rotation.x = -Math.PI / 2; farGround.position.y = -0.6; game.levelRoot.add(farGround);
  b.box(-34, -1, -34, 34, 0.25, 34, 'concrete_floor', { tile: 3 });
  for (const [x0, z0, x1, z1] of [[-34, -34, 34, -33.4], [-34, 33.4, 34, 34], [-34, -34, -33.4, 34], [33.4, -34, 34, 34]]) b.box(x0, 0.25, z0, x1, 0.27, z1, 'hazard_stripes', { tile: 1, collide: false });
  // launch mount
  b.box(-6, 0.25, -6, 6, MOUNT_TOP, 6, 'concrete_wall', { tile: 3 });
  b.box(-6.3, 2.2, -6.3, 6.3, 2.5, 6.3, 'hazard_stripes', { tile: 1 });
  const blast = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.05, 32), assets.material(null, { color: 0x0a0a0a, roughness: 1 }));
  blast.position.y = MOUNT_TOP + 0.02; game.levelRoot.add(blast);
  // hold-down arms
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 1.6), dark);
    arm.position.set(Math.cos(a) * 2.5, MOUNT_TOP + 0.6, Math.sin(a) * 2.5); arm.rotation.y = -a;
    game.levelRoot.add(arm);
  }

  // rocket
  const rocket = createRocket();
  rocket.group.position.set(0, MOUNT_TOP, 0);
  game.levelRoot.add(rocket.group);
  rocket.hideHatch(false);
  b.box(-1.7, MOUNT_TOP, -1.7, 1.7, MOUNT_TOP + 2, 1.7, null, { visible: false });

  // service tower (lattice)
  const T = TOWER, H = 44;
  for (const x of [T.x0, T.x1 - 0.5]) for (const z of [T.z0, T.z1 - 0.5]) b.box(x, 0.25, z, x + 0.5, H, z + 0.5, 'rust_metal', { tile: 2 });
  for (let y = 5; y <= H; y += 6) {
    b.box(T.x0, y, T.z0, T.x1, y + 0.25, T.z0 + 0.3, 'metal_plate', { collide: false, tile: 2 });
    b.box(T.x0, y, T.z1 - 0.3, T.x1, y + 0.25, T.z1, 'metal_plate', { collide: false, tile: 2 });
    b.box(T.x0, y, T.z0, T.x0 + 0.3, y + 0.25, T.z1, 'metal_plate', { collide: false, tile: 2 });
    b.box(T.x1 - 0.3, y, T.z0, T.x1, y + 0.25, T.z1, 'metal_plate', { collide: false, tile: 2 });
    if (y + 6 <= H) {
      brace(game, new THREE.Vector3(T.x0 + 0.25, y, T.z0 + 0.15), new THREE.Vector3(T.x1 - 0.25, y + 6, T.z0 + 0.15), 0.07, steel);
      brace(game, new THREE.Vector3(T.x1 - 0.25, y, T.z1 - 0.15), new THREE.Vector3(T.x0 + 0.25, y + 6, T.z1 - 0.15), 0.07, steel);
      brace(game, new THREE.Vector3(T.x0 + 0.15, y, T.z1 - 0.25), new THREE.Vector3(T.x0 + 0.15, y + 6, T.z0 + 0.25), 0.07, steel);
      brace(game, new THREE.Vector3(T.x1 - 0.15, y, T.z0 + 0.25), new THREE.Vector3(T.x1 - 0.15, y + 6, T.z1 - 0.25), 0.07, steel);
    }
  }
  // tower top lights + beacon mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 6, 6), dark); mast.position.set(10, H + 3, 0); game.levelRoot.add(mast);
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2020 })); red.position.set(10, H + 6, 0); game.levelRoot.add(red);

  // crew access arm
  b.box(1.5, TOP_Y - 0.3, -1.1, T.x0 + 0.4, TOP_Y, 1.1, 'metal_floor', { tile: 1.5 });
  b.box(1.5, TOP_Y, -1.2, T.x0, TOP_Y + 1.15, -1.1, 'metal_plate', { tile: 1.5 });
  b.box(1.5, TOP_Y, 1.1, T.x0, TOP_Y + 1.15, 1.2, 'metal_plate', { tile: 1.5 });
  b.box(1.5, TOP_Y + 2.4, -1.2, T.x0, TOP_Y + 2.5, 1.2, 'metal_plate', { collide: false });
  // under-arm trusses
  brace(game, new THREE.Vector3(T.x0, TOP_Y - 0.3, 0.9), new THREE.Vector3(3.5, TOP_Y - 0.3, 0.9), 0.1, steel);
  brace(game, new THREE.Vector3(T.x0, TOP_Y - 6, 0), new THREE.Vector3(3.2, TOP_Y - 0.3, 0), 0.12, steel);

  // propellant tanks + pipes around the pad
  const tankMat = { metalness: 0.4, roughness: 0.5 };
  cylinder(b, -30, 2.4, 0, 2.4, 14, 'z', 'metal_wall', { collide: true, color: 0xdfe3e6 });
  cylinder(b, 0, 2.4, -31, 2.4, 14, 'x', 'metal_wall', { collide: true, color: 0xdfe3e6 });
  cylinder(b, 29.5, 2.4, 16, 2.4, 14, 'z', 'metal_wall', { collide: true, color: 0xe6ddd0 });
  for (const [x, z, ax, len] of [[-18, 0, 'x', 24], [0, -18, 'z', 24]]) cylinder(b, x, 0.6, z, 0.35, len, ax, 'rust_metal', { collide: false });
  cylinder(b, 17, 0.6, 14, 0.35, 24, 'x', 'rust_metal');
  cylinder(b, 6, 0.6, 12, 0.35, 12, 'z', 'rust_metal');
  sign(game, ['LOX', 'CRYOGENIC'], -27.6, 3.4, -8.1, 2.4, 1.0, 0, { bg: '#d0d4d8', fg: '#c0201a', border: null, pw: 512 });

  // floodlight poles
  const flood = (x, z) => {
    cylinder(b, x, 8, z, 0.18, 16, 'y', 'metal_plate', { collide: true, color: 0x8a9096 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4e0).multiplyScalar(2.2) }));
    head.position.set(x, 16.2, z); head.lookAt(0, 8, 0); game.levelRoot.add(head);
    b.lamp(x * 0.85, 15, z * 0.85, { color: 0xfff0dc, intensity: 420, distance: 80, fixture: false });
  };
  flood(-30, -30); flood(30, -30); flood(-30, 30); flood(30, 30); flood(0, 30); flood(0, -33);
  b.lamp(7, 30, 7, { color: 0xffe8c8, intensity: 160, distance: 50, fixture: false });
  b.lamp(-7, 20, 8, { color: 0xfff0dc, intensity: 140, distance: 40, fixture: false });

  // cover: containers + barriers
  const cont = (x, z, rot, c) => {
    const w = 6, d = 2.4, h = 2.6;
    const ax = rot ? [x - d / 2, z - w / 2, x + d / 2, z + w / 2] : [x - w / 2, z - d / 2, x + w / 2, z + d / 2];
    b.box(ax[0], 0.25, ax[1], ax[2], 0.25 + h, ax[3], 'rust_metal', { tile: 2, matOpts: { color: c } });
  };
  cont(-16, 18, 0, 0x7a8fa0); cont(20, -14, 1, 0xa0643c); cont(-20, -20, 1, 0x5f8a6a); cont(22, 6, 0, 0x8a8f95); cont(-8, -22, 0, 0xa38452);
  for (const [x, z, r] of [[-8, 10, 0], [10, 20, 0], [-14, -8, 1], [14, -6, 1], [4, 24, 0], [-24, 10, 1], [26, -24, 0]]) {
    if (r) b.box(x - 0.35, 0.25, z - 1.5, x + 0.35, 1.25, z + 1.5, 'concrete_wall', { tile: 1 }); else b.box(x - 1.5, 0.25, z - 0.35, x + 1.5, 1.25, z + 0.35, 'concrete_wall', { tile: 1 });
  }
  // utility shed with chargers (north face at z=12)
  b.box(-12, 0.25, 12, -6, 3.2, 17, 'metal_wall', { tile: 2 });
  b.box(-12.2, 3.2, 11.8, -5.8, 3.4, 17.2, 'metal_plate', { tile: 2 });

  // perimeter: low fence posts + clip
  for (let i = -40; i <= 40; i += 4) for (const [x, z] of [[i, -42], [i, 42], [-42, i], [42, i]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), dark); p.position.set(x, 1.2, z); game.levelRoot.add(p);
  }
  for (const [x0, z0, x1, z1] of [[-42, -42, 42, -42], [-42, 42, 42, 42], [-42, -42, -42, 42], [42, -42, 42, 42]]) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const wire = new THREE.Mesh(new THREE.BoxGeometry(x1 === x0 ? 0.03 : len, 2, z1 === z0 ? 0.03 : len), assets.material('gen_grate', { transparent: true, side: THREE.DoubleSide, color: 0x888888 }));
    wire.position.set((x0 + x1) / 2, 1.2, (z0 + z1) / 2);
    // texture repeat for the fence
    game.levelRoot.add(wire);
  }
  b.clip(-43, 0, -43, 43, 6, -42); b.clip(-43, 0, 42, 43, 6, 43); b.clip(-43, 0, -43, -42, 6, 43); b.clip(42, 0, -43, 43, 6, 43);

  // distant mountains
  const mm = assets.material(null, { color: 0x10141d, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + Math.random() * 0.1, r = 480 + Math.random() * 120, h = 40 + Math.random() * 90;
    const m = new THREE.Mesh(new THREE.ConeGeometry(70 + Math.random() * 80, h, 5), mm);
    m.position.set(Math.cos(a) * r, h / 2 - 3, Math.sin(a) * r);
    game.levelRoot.add(m);
  }
  // scattered rocks
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2, r = 46 + Math.random() * 160;
    const s = 0.6 + Math.random() * 2.6;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), assets.material('rust_metal', { color: 0x6a5a48, roughness: 1, metalness: 0 }));
    m.position.set(Math.cos(a) * r, s * 0.3, Math.sin(a) * r); m.rotation.set(Math.random(), Math.random(), Math.random());
    game.levelRoot.add(m);
  }
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: assets.texture('logo_avemaria'), transparent: true, opacity: 0.9 }));
  logo.rotation.x = -Math.PI / 2; logo.position.set(0, 0.29, 22); game.levelRoot.add(logo);

  return { rocket, sky };
}

/** cryogenic vapour venting from the stack */
export function ventVapor(game, rocket, dt, acc) {
  acc.t = (acc.t || 0) + dt;
  while (acc.t > 0.07) {
    acc.t -= 0.07;
    for (const [y, s] of [[20, 1], [33, -1], [8, -1]]) {
      const p = { x: s * 2.1, y: MOUNT_TOP + y, z: (Math.random() - 0.5) * 0.4 };
      game.smoke.emit({ pos: p, vel: { x: s * (1 + Math.random()), y: -2.5 - Math.random() * 2, z: (Math.random() - 0.5) * 0.8 }, life: 2.2, size0: 0.4, size1: 2.4, color0: [0.85, 0.9, 1], color1: [0.6, 0.65, 0.75], alpha: 0.22, drag: 0.6 });
    }
  }
}
