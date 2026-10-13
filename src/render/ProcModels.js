// Procedural primitive models used when no glTF asset is available (or as fit targets for glTF).
// Conventions: origin at the centre of the base (y = 0 is the bottom), character models face +Z.
import * as THREE from 'three';

const M = (a, tex, o) => a.material(tex, o);
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);

export const PROC_MODELS = {
  crate(a, o = {}) {
    const g = new THREE.Group();
    const s = o.size || 0.9;
    const m = mesh(box(s, s, s), M(a, o.metal ? 'crate_metal' : 'crate_wood'), 0, s / 2, 0);
    g.add(m);
    return g;
  },
  barrel(a, o = {}) {
    const g = new THREE.Group();
    const body = M(a, null, { color: o.color || 0x3b5a73, metalness: 0.6, roughness: 0.5 });
    const band = M(a, null, { color: 0x222a30, metalness: 0.7, roughness: 0.4 });
    g.add(mesh(cyl(0.3, 0.3, 0.9, 18), body, 0, 0.45, 0));
    for (const y of [0.2, 0.45, 0.7]) g.add(mesh(cyl(0.312, 0.312, 0.035, 18), band, 0, y, 0));
    g.add(mesh(cyl(0.27, 0.27, 0.02, 18), band, 0, 0.9, 0));
    return g;
  },
  barrel_explosive(a) {
    const g = PROC_MODELS.barrel(a, { color: 0xb3261e });
    const stripe = M(a, 'hazard_stripes', {});
    const lbl = mesh(cyl(0.306, 0.306, 0.2, 18), stripe, 0, 0.45, 0);
    g.add(lbl);
    // little flame pictogram
    const fl = mesh(new THREE.ConeGeometry(0.07, 0.16, 8), M(a, null, { color: 0xffcc22, emissive: 0xff6600, emissiveIntensity: 0.8 }), 0, 0.45, 0.31);
    fl.rotation.x = Math.PI / 2 * 0; g.add(fl);
    return g;
  },
  cart(a) {
    const g = new THREE.Group();
    const steel = M(a, 'metal_plate', { metalness: 0.5, roughness: 0.5 });
    const dark = M(a, null, { color: 0x20262b, metalness: 0.6, roughness: 0.5 });
    g.add(mesh(box(1.5, 0.08, 0.9), steel, 0, 0.55, 0));
    g.add(mesh(box(1.5, 0.05, 0.9), steel, 0, 0.18, 0));
    for (const [x, z] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) {
      g.add(mesh(cyl(0.03, 0.03, 0.4, 8), dark, x, 0.38, z));
      const w = mesh(cyl(0.1, 0.1, 0.06, 12), dark, x, 0.1, z); w.rotation.x = Math.PI / 2; g.add(w);
    }
    // handlebar
    g.add(mesh(box(0.05, 0.5, 0.05), dark, -0.72, 0.85, -0.3));
    g.add(mesh(box(0.05, 0.5, 0.05), dark, -0.72, 0.85, 0.3));
    const hb = mesh(box(0.05, 0.05, 0.7), dark, -0.72, 1.1, 0); g.add(hb);
    // sample containment cylinder with glowing core
    const glass = M(a, null, { color: 0x9fe8ff, transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0.2 });
    g.add(mesh(cyl(0.26, 0.26, 0.6, 20), glass, 0.15, 0.89, 0));
    g.add(mesh(cyl(0.28, 0.28, 0.05, 20), dark, 0.15, 0.6, 0));
    g.add(mesh(cyl(0.28, 0.28, 0.05, 20), dark, 0.15, 1.2, 0));
    const core = mesh(new THREE.IcosahedronGeometry(0.13, 1), M(a, 'cell_flesh', { emissive: 0x33ff88, emissiveIntensity: 1.4, color: 0x6a2a55 }), 0.15, 0.9, 0);
    core.name = 'core'; g.add(core);
    return g;
  },
  computer_console(a) {
    const g = new THREE.Group();
    const body = M(a, 'metal_wall', { metalness: 0.4 });
    g.add(mesh(box(1.4, 0.9, 0.7), body, 0, 0.45, 0));
    const top = mesh(box(1.4, 0.06, 0.8), M(a, null, { color: 0x1c2228, metalness: 0.5 }), 0, 0.93, 0.02); g.add(top);
    const scr = mesh(box(1.1, 0.5, 0.05), M(a, null, { color: 0x112233, emissive: 0x2288ff, emissiveIntensity: 0.9 }), 0, 1.25, -0.2);
    scr.rotation.x = -0.25; scr.name = 'screen'; g.add(scr);
    g.add(mesh(box(0.1, 0.35, 0.1), body, 0, 1.08, -0.25));
    for (let i = 0; i < 5; i++) g.add(mesh(box(0.08, 0.02, 0.08), M(a, null, { color: 0xffffff, emissive: i % 2 ? 0x44ff66 : 0xff9922, emissiveIntensity: 1 }), -0.5 + i * 0.25, 0.97, 0.25));
    return g;
  },
  chair(a) {
    const g = new THREE.Group();
    const dark = M(a, null, { color: 0x23272c, metalness: 0.4, roughness: 0.6 });
    g.add(mesh(box(0.5, 0.08, 0.5), dark, 0, 0.5, 0));
    g.add(mesh(box(0.5, 0.55, 0.07), dark, 0, 0.82, -0.24));
    g.add(mesh(cyl(0.03, 0.03, 0.45, 8), dark, 0, 0.25, 0));
    for (let i = 0; i < 5; i++) { const l = mesh(box(0.3, 0.03, 0.04), dark, 0, 0.04, 0); l.rotation.y = i * Math.PI * 2 / 5; l.position.set(Math.cos(l.rotation.y) * 0.15, 0.04, -Math.sin(l.rotation.y) * 0.15); g.add(l); }
    return g;
  },
  desk(a) {
    const g = new THREE.Group();
    g.add(mesh(box(1.6, 0.06, 0.8), M(a, 'tile_white', { roughness: 0.5 }), 0, 0.75, 0));
    const leg = M(a, null, { color: 0x30363c, metalness: 0.5 });
    for (const [x, z] of [[-0.75, -0.35], [0.75, -0.35], [-0.75, 0.35], [0.75, 0.35]]) g.add(mesh(box(0.06, 0.75, 0.06), leg, x, 0.375, z));
    return g;
  },
  locker(a) {
    const g = new THREE.Group();
    const body = M(a, 'metal_wall', { color: 0x7e9cb8, metalness: 0.5, roughness: 0.55 });
    g.add(mesh(box(0.5, 1.9, 0.5), body, 0, 0.95, 0));
    const dark = M(a, null, { color: 0x1b2025 });
    for (let i = 0; i < 4; i++) g.add(mesh(box(0.3, 0.02, 0.01), dark, 0, 1.6 - i * 0.05, 0.255));
    g.add(mesh(box(0.04, 0.12, 0.03), M(a, null, { color: 0xd0d0d0, metalness: 0.8 }), 0.15, 1.0, 0.27));
    return g;
  },
  pipe_straight(a) {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.12, 0.12, 2, 12), M(a, 'rust_metal', { metalness: 0.6 }), 0, 1, 0));
    for (const y of [0.05, 1.95]) g.add(mesh(cyl(0.16, 0.16, 0.1, 12), M(a, null, { color: 0x333a40, metalness: 0.7 }), 0, y, 0));
    return g;
  },
  valve_wheel(a) {
    const g = new THREE.Group();
    const red = M(a, null, { color: 0xc42a1a, metalness: 0.5, roughness: 0.4 });
    const wheel = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), red);
    wheel.add(ring);
    for (let i = 0; i < 3; i++) { const sp = mesh(box(0.44, 0.03, 0.03), red); sp.rotation.z = i * Math.PI / 3; wheel.add(sp); }
    wheel.add(mesh(cyl(0.05, 0.05, 0.08, 8), red).rotateX(Math.PI / 2));
    wheel.name = 'wheel';
    wheel.position.set(0, 0.35, 0.12);
    g.add(wheel);
    g.add(mesh(cyl(0.04, 0.04, 0.25, 8), M(a, null, { color: 0x555d63, metalness: 0.7 }), 0, 0.35, 0.0).rotateX(Math.PI / 2));
    return g;
  },
  fuse_cell(a) {
    const g = new THREE.Group();
    const cap = M(a, null, { color: 0x30363c, metalness: 0.7, roughness: 0.4 });
    g.add(mesh(cyl(0.11, 0.11, 0.05, 12), cap, 0, 0.025, 0));
    g.add(mesh(cyl(0.11, 0.11, 0.05, 12), cap, 0, 0.375, 0));
    const core = mesh(cyl(0.08, 0.08, 0.3, 12), M(a, null, { color: 0x66ffff, emissive: 0x22ddff, emissiveIntensity: 1.6, transparent: true, opacity: 0.9 }), 0, 0.2, 0);
    core.name = 'core'; g.add(core);
    for (let i = 0; i < 3; i++) { const b = mesh(box(0.02, 0.32, 0.02), cap, Math.cos(i * 2.094) * 0.1, 0.2, Math.sin(i * 2.094) * 0.1); g.add(b); }
    return g;
  },
  medkit(a) {
    const g = new THREE.Group();
    g.add(mesh(box(0.38, 0.2, 0.26), M(a, null, { color: 0xeeeeee, roughness: 0.5 }), 0, 0.1, 0));
    const red = M(a, null, { color: 0xd2181b, emissive: 0x550000, emissiveIntensity: 0.4 });
    g.add(mesh(box(0.2, 0.012, 0.06), red, 0, 0.206, 0));
    g.add(mesh(box(0.06, 0.012, 0.2), red, 0, 0.206, 0));
    return g;
  },
  battery(a) {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.1, 0.1, 0.26, 12), M(a, null, { color: 0xe8b21a, metalness: 0.4, roughness: 0.4 }), 0, 0.13, 0));
    g.add(mesh(cyl(0.11, 0.11, 0.04, 12), M(a, null, { color: 0x2a2f33, metalness: 0.7 }), 0, 0.27, 0));
    g.add(mesh(cyl(0.101, 0.101, 0.06, 12), M(a, null, { color: 0x44e0ff, emissive: 0x22bbff, emissiveIntensity: 1.5 }), 0, 0.14, 0));
    return g;
  },
  wrench(a) {
    const g = new THREE.Group();
    const steel = M(a, null, { color: 0xb9c0c6, metalness: 0.85, roughness: 0.3 });
    const grip = M(a, null, { color: 0xd8381c, roughness: 0.6 });
    const h = mesh(cyl(0.025, 0.025, 0.55, 10), steel, 0, 0.0, 0); h.rotation.z = Math.PI / 2; g.add(h);
    const gr = mesh(cyl(0.032, 0.032, 0.22, 10), grip, -0.12, 0, 0); gr.rotation.z = Math.PI / 2; g.add(gr);
    g.add(mesh(box(0.12, 0.1, 0.035), steel, 0.3, 0, 0));
    g.add(mesh(box(0.06, 0.04, 0.036), M(a, null, { color: 0x111418 }), 0.345, 0.03, 0));
    g.position.y = 0.05;
    const wrap = new THREE.Group(); wrap.add(g);
    return wrap;
  },
  manipulator(a) {
    const g = new THREE.Group();
    const body = M(a, null, { color: 0xd9d9d6, metalness: 0.5, roughness: 0.35 });
    const dark = M(a, null, { color: 0x20252a, metalness: 0.6, roughness: 0.4 });
    const glow = M(a, null, { color: 0xffa31a, emissive: 0xff8800, emissiveIntensity: 1.6 });
    const core = mesh(box(0.12, 0.14, 0.5), body, 0, 0, 0); g.add(core);
    for (const s of [-1, 1]) { const prong = mesh(box(0.025, 0.05, 0.5), dark, 0.075 * s, 0.0, -0.3); g.add(prong); const gl = mesh(box(0.012, 0.012, 0.4), glow, 0.075 * s, 0.0, -0.3); g.add(gl); }
    const orb = mesh(new THREE.SphereGeometry(0.045, 12, 12), glow, 0, 0, -0.2); orb.name = 'orb'; g.add(orb);
    g.add(mesh(box(0.1, 0.18, 0.1), dark, 0, -0.14, 0.12));
    g.add(mesh(cyl(0.05, 0.05, 0.3, 10), dark, 0, 0.0, 0.25).rotateX(Math.PI / 2));
    return g;
  },
  npc_scientist(a) { return human(a, { shirt: 0xf1f1ee, pants: 0x3a3f47, skin: 0xd7a785, hair: 0x2a1c14, coat: true, glasses: true, long: true }); },
  npc_guard(a) { return human(a, { shirt: 0x2b3f63, pants: 0x20293a, skin: 0xb98363, hair: 0x15110d, cap: 0x1d2a45, vest: true }); },
  npc_overseer(a) { return human(a, { shirt: 0x6a6f78, pants: 0x575c65, skin: 0xcdb09a, hair: 0x30302f, suit: true }); },
  crawler(a) {
    const g = new THREE.Group();
    const flesh = M(a, 'cell_flesh', { roughness: 0.55, color: 0xd9a0b0 });
    const body = mesh(new THREE.SphereGeometry(0.26, 14, 10), flesh, 0, 0.26, 0);
    body.scale.set(1, 0.72, 1.35); g.add(body);
    const legs = [];
    const legMat = M(a, null, { color: 0x4a1d2a, roughness: 0.5 });
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2) - 1;
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.18, 0.22, row * 0.2);
      const upper = mesh(cyl(0.025, 0.018, 0.3, 6), legMat, side * 0.12, -0.02, 0);
      upper.rotation.z = side * 1.1;
      pivot.add(upper);
      const lower = mesh(cyl(0.018, 0.01, 0.28, 6), legMat, side * 0.27, -0.14, 0);
      lower.rotation.z = -side * 0.35;
      pivot.add(lower);
      g.add(pivot); legs.push(pivot);
    }
    const eyeMat = M(a, null, { color: 0xffee88, emissive: 0xff5522, emissiveIntensity: 2 });
    for (const s of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat, s * 0.1, 0.36, 0.3));
    const jaw = mesh(box(0.2, 0.04, 0.12), M(a, null, { color: 0x2a0d15 }), 0, 0.2, 0.4);
    jaw.name = 'jaw'; g.add(jaw);
    g.userData.legs = legs;
    return g;
  },
  spitter(a) {
    const g = new THREE.Group();
    const flesh = M(a, 'cell_flesh', { roughness: 0.5, color: 0xc89aa8 });
    const base = mesh(new THREE.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), flesh, 0, 0, 0);
    base.scale.set(1, 0.7, 1); g.add(base);
    const neck = new THREE.Group(); neck.position.set(0, 0.3, 0); neck.name = 'neck';
    const stalk = mesh(cyl(0.12, 0.2, 0.7, 10), flesh, 0, 0.35, 0); neck.add(stalk);
    const head = mesh(new THREE.SphereGeometry(0.28, 14, 12), flesh, 0, 0.8, 0.08); head.scale.set(1, 0.9, 1.25); neck.add(head);
    const sac = mesh(new THREE.SphereGeometry(0.17, 12, 10), M(a, null, { color: 0x99ff44, emissive: 0x55dd11, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 }), 0, 0.88, 0.32);
    sac.name = 'sac'; neck.add(sac);
    const eyeMat = M(a, null, { color: 0xffee88, emissive: 0xff5522, emissiveIntensity: 2 });
    for (const s of [-1, 1]) neck.add(mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat, s * 0.14, 0.95, 0.25));
    g.add(neck);
    const tmat = M(a, null, { color: 0x4a1d2a });
    for (let i = 0; i < 6; i++) {
      const t = mesh(cyl(0.035, 0.01, 0.8, 6), tmat, 0, 0.18, 0);
      const ang = i * Math.PI / 3 + 0.3;
      t.position.set(Math.cos(ang) * 0.5, 0.15, Math.sin(ang) * 0.5);
      t.rotation.set(Math.sin(ang) * 1.2, 0, -Math.cos(ang) * 1.2);
      g.add(t);
    }
    g.userData.neck = neck; g.userData.sac = sac;
    return g;
  },
  cell_nest(a) {
    const g = new THREE.Group();
    const flesh = M(a, 'cell_flesh', { roughness: 0.45, color: 0xe0a0b8 });
    const main = mesh(new THREE.SphereGeometry(0.9, 16, 12), flesh, 0, 0.8, 0); main.scale.set(1, 0.9, 1); g.add(main);
    for (let i = 0; i < 7; i++) {
      const s = 0.25 + (i % 3) * 0.12; const ang = i * 0.9;
      const b = mesh(new THREE.SphereGeometry(s, 10, 8), flesh, Math.cos(ang) * 0.9, 0.3 + (i % 3) * 0.25, Math.sin(ang) * 0.9);
      g.add(b);
    }
    const eggMat = M(a, null, { color: 0xbbff77, emissive: 0x66dd22, emissiveIntensity: 1.3, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 4; i++) {
      const e = mesh(new THREE.SphereGeometry(0.16, 10, 8), eggMat, Math.cos(i * 1.7 + 0.5) * 0.55, 1.4 + (i % 2) * 0.1, Math.sin(i * 1.7 + 0.5) * 0.55);
      e.scale.y = 1.3; e.name = 'egg'; g.add(e);
    }
    return g;
  },
};

function human(a, o) {
  const g = new THREE.Group();
  const skin = M(a, null, { color: o.skin, roughness: 0.7 });
  const shirt = M(a, null, { color: o.shirt, roughness: 0.8 });
  const pants = M(a, null, { color: o.pants, roughness: 0.8 });
  const dark = M(a, null, { color: 0x15171a, roughness: 0.6 });
  // legs
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.position.set(-0.11, 0.9, 0); legR.position.set(0.11, 0.9, 0);
  for (const [leg, x] of [[legL, 0], [legR, 0]]) {
    leg.add(mesh(box(0.16, 0.8, 0.18), pants, x, -0.4, 0));
    leg.add(mesh(box(0.17, 0.08, 0.28), dark, x, -0.86, 0.04));
  }
  g.add(legL, legR);
  // torso
  const torsoMat = o.suit ? M(a, null, { color: 0x4d5158, roughness: 0.7 }) : shirt;
  g.add(mesh(box(0.46, 0.62, 0.26), torsoMat, 0, 1.2, 0));
  if (o.coat) g.add(mesh(box(0.5, 0.95, 0.3), M(a, null, { color: 0xf4f4f2, roughness: 0.9 }), 0, 1.0, 0));
  if (o.vest) g.add(mesh(box(0.5, 0.45, 0.3), M(a, null, { color: 0x1a1d22, roughness: 0.9 }), 0, 1.25, 0));
  if (o.suit) { g.add(mesh(box(0.06, 0.55, 0.01), M(a, null, { color: 0x1a1a1c }), 0, 1.22, 0.135)); }
  // arms
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.3, 1.46, 0); armR.position.set(0.3, 1.46, 0);
  for (const arm of [armL, armR]) {
    arm.add(mesh(box(0.12, 0.6, 0.14), o.suit ? torsoMat : (o.coat ? M(a, null, { color: 0xf4f4f2 }) : shirt), 0, -0.3, 0));
    arm.add(mesh(box(0.1, 0.1, 0.12), skin, 0, -0.65, 0));
  }
  g.add(armL, armR);
  // head
  const head = new THREE.Group(); head.position.set(0, 1.62, 0);
  head.add(mesh(new THREE.SphereGeometry(0.13, 14, 12), skin, 0, 0.12, 0));
  const hair = mesh(new THREE.SphereGeometry(0.138, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M(a, null, { color: o.hair }), 0, 0.14, -0.012);
  head.add(hair);
  head.add(mesh(cyl(0.05, 0.06, 0.1, 8), skin, 0, -0.02, 0));
  if (o.cap) head.add(mesh(cyl(0.145, 0.15, 0.08, 14), M(a, null, { color: o.cap }), 0, 0.23, 0));
  if (o.glasses) { head.add(mesh(box(0.2, 0.035, 0.02), dark, 0, 0.14, 0.125)); }
  g.add(head);
  g.userData = { armL, armR, legL, legR, head };
  return g;
}
