// Procedural DX-90 spacecraft on the Gabriel reusable booster. All primitives + canvas textures.
import * as THREE from 'three';

const R = 1.9;               // vehicle radius
export const BOOSTER_H = 32; // booster height (base y=0 .. interstage top)
export const DX_H = 17.5;    // DX-90 height above the booster

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function dirt(ctx, w, h, n = 400, a = 0.05) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(30,25,20,${Math.random() * a})`;
    const x = Math.random() * w, y = Math.random() * h;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 6 + Math.random() * 40);
  }
}

let cache = null;
function textures() {
  if (cache) return cache;
  const boosterTex = canvasTex(512, 1280, (ctx, w, h) => {
    ctx.fillStyle = '#eeeeea'; ctx.fillRect(0, 0, w, h);
    // panel seams
    ctx.strokeStyle = 'rgba(80,80,90,0.35)'; ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 142) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let x = 0; x < w; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    dirt(ctx, w, h, 700, 0.07);
    // soot toward the bottom
    const g = ctx.createLinearGradient(0, h * 0.78, 0, h); g.addColorStop(0, 'rgba(30,25,20,0)'); g.addColorStop(1, 'rgba(30,25,20,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, h * 0.78, w, h * 0.22);
    // red stripe + lettering (v: top of canvas = top of rocket)
    ctx.fillStyle = '#c4281c'; ctx.fillRect(0, h * 0.20, w, 18);
    for (const x0 of [w * 0.25, w * 0.75]) {
      ctx.save(); ctx.translate(x0, h * 0.58); ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#16181c'; ctx.font = '900 92px Arial, Helvetica, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GABRIEL', 0, 0);
      ctx.font = '700 28px Arial'; ctx.fillStyle = '#c4281c'; ctx.fillText('REUSABLE LAUNCH VEHICLE', 0, 62);
      ctx.restore();
    }
    // logo ring
    ctx.strokeStyle = '#16181c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.34, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#16181c'; ctx.font = '900 44px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AM', w * 0.5, h * 0.34 + 3);
  });
  const dxTex = canvasTex(512, 640, (ctx, w, h) => {
    ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(80,80,90,0.3)'; ctx.lineWidth = 2;
    for (let y = 0; y < h; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for (let x = 0; x < w; x += 85) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    dirt(ctx, w, h, 300, 0.05);
    ctx.save(); ctx.translate(w * 0.5, h * 0.55); ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#16181c'; ctx.font = '900 110px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DX-90', 0, 0);
    ctx.restore();
    ctx.fillStyle = '#1a3f8f'; ctx.fillRect(0, h * 0.2, w, 14);
    ctx.fillStyle = '#c4281c'; ctx.fillRect(0, h * 0.2 + 14, w, 6);
  });
  const tileTex = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#17191d'; ctx.fillRect(0, 0, w, h);
    const n = 8, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 22 + Math.random() * 14;
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 4})`; ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
    }
  }, [3, 3]);
  const haloTex = canvasTex(256, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#b8892a'); g.addColorStop(1, '#f0d27a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(40,25,5,0.7)'; ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  });
  cache = { boosterTex, dxTex, tileTex, haloTex };
  return cache;
}

const mat = (o) => new THREE.MeshStandardMaterial(o);

export function createRocket() {
  const T = textures();
  const stack = new THREE.Group();
  const matWhiteB = mat({ map: T.boosterTex, roughness: 0.55, metalness: 0.15 });
  const matWhiteD = mat({ map: T.dxTex, roughness: 0.5, metalness: 0.15 });
  const matTile = mat({ map: T.tileTex, roughness: 0.85, metalness: 0.05, color: 0xbbbbbb });
  const matBlack = mat({ color: 0x15171a, roughness: 0.7, metalness: 0.5 });
  const matSteel = mat({ color: 0x8a9096, roughness: 0.4, metalness: 0.85 });
  const matDark = mat({ color: 0x2a2e33, roughness: 0.5, metalness: 0.8 });
  const matGlass = mat({ color: 0x0a1018, roughness: 0.05, metalness: 0.9, emissive: 0x2a4a66, emissiveIntensity: 0.6 });

  // ------------------------------------------------------------------ booster (Gabriel)
  const booster = new THREE.Group(); booster.name = 'booster';
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2.2, 40), matBlack); skirt.position.y = 1.1; booster.add(skirt);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 27.8, 48), matWhiteB); tank.position.y = 2.2 + 13.9; booster.add(tank);
  const inter = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2.0, 40), matBlack); inter.position.y = 30 + 1.0; booster.add(inter);
  // nozzle cluster (octaweb)
  const bell = new THREE.CylinderGeometry(0.2, 0.42, 1.1, 14, 1, true);
  const bellMat = mat({ color: 0x555a60, roughness: 0.35, metalness: 0.9, side: THREE.DoubleSide });
  const nozzles = [];
  const addBell = (x, z) => { const b = new THREE.Mesh(bell, bellMat); b.position.set(x, -0.1, z); booster.add(b); nozzles.push(b); };
  addBell(0, 0);
  for (let i = 0; i < 8; i++) addBell(Math.cos(i * Math.PI / 4) * 1.15, Math.sin(i * Math.PI / 4) * 1.15);
  // legs
  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.28, 9.8, 0.34);
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2 + Math.PI / 4;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(ang) * (R + 0.15), 9.5, Math.sin(ang) * (R + 0.15));
    pivot.rotation.y = -ang + Math.PI / 2;   // local +Z = outward after this
    const hinge = new THREE.Group();          // rotates about local X to swing the leg out
    const strut = new THREE.Mesh(legGeo, matSteel); strut.position.y = -4.9;
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.2, 0.16), matDark); brace.position.set(0, -3.1, -0.45); brace.rotation.x = 0.0;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.18, 14), matDark); foot.position.y = -9.85;
    hinge.add(strut, foot);
    pivot.add(hinge); booster.add(pivot);
    legs.push(hinge);
  }
  // grid fins
  const fins = [];
  const barMat = matDark;
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(ang) * (R + 0.1), 29.2, Math.sin(ang) * (R + 0.1));
    pivot.rotation.y = -ang + Math.PI / 2;
    const fin = new THREE.Group();
    const w = 1.8, h = 1.4;
    fin.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.08), barMat));
    for (let k = 0; k <= 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, h), barMat); b.position.set(-w / 2 + (k / 4) * w, 0, h / 2); fin.add(b); }
    for (let k = 1; k <= 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.05), barMat); b.position.set(0, 0, (k / 4) * h); fin.add(b); }
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.08), barMat); edge.position.z = h; fin.add(edge);
    fin.position.set(0, 0, 0.1);
    fin.rotation.y = Math.PI / 2;     // stowed (swept flat along the hull)
    pivot.add(fin); booster.add(pivot);
    fins.push(fin);
  }

  // ------------------------------------------------------------------ DX-90
  const upper = new THREE.Group(); upper.name = 'dx90';
  upper.position.y = BOOSTER_H + 0.05;
  const dBase = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.1, 40), matBlack); dBase.position.y = 0.55; upper.add(dBase);
  const GAP = 0.8; // radians cut out of the hull on the +X side (crew hatch)
  const dBody = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 8.0, 48, 1, false, Math.PI / 2 + GAP / 2, Math.PI * 2 - GAP), matWhiteD); dBody.position.y = 1.1 + 4.0; upper.add(dBody);
  // ogive nose
  const pts = [];
  const nH = DX_H - 9.1;
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(new THREE.Vector2(R * Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.7))) + 0.0001, 9.1 + t * nH));
  }
  const nose = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), matWhiteD); upper.add(nose);
  const noseCap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), matTile); noseCap.position.y = DX_H - 0.35; upper.add(noseCap);
  // belly heat shield (black tiles) on the -X side
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 8.0, 32, 1, true, Math.PI * 0.55, Math.PI * 0.9), matTile);
  belly.position.y = 5.1; belly.rotation.y = 0; upper.add(belly);
  // cockpit windows on the -X side (single-sided planes so they vanish when seen from inside the cabin)
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.7), matGlass);
    const a = Math.PI + (i - 1) * 0.24;
    w.position.set(Math.cos(a) * (R + 0.01), 3.2, Math.sin(a) * (R + 0.01));
    w.rotation.y = Math.PI / 2 - a;   // plane normal (+Z) -> points outward along the radius
    upper.add(w);
  }
  // fillers above / below the hatch opening
  for (const [y0, y1] of [[1.1, 1.7], [3.9, 9.1]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.12, y1 - y0, 1.5), matWhiteD); f.position.set(R - 0.07, (y0 + y1) / 2, 0); upper.add(f);
  }
  // crew hatch (+X)
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 1.5), matDark); hatch.position.set(R - 0.02, 2.8, 0); upper.add(hatch);
  const hatchLight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 0.15), new THREE.MeshBasicMaterial({ color: 0x66ff88 })); hatchLight.position.set(R + 0.02, 4.1, 0.9); upper.add(hatchLight);
  // delta fins
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(3.4, -0.4); finShape.lineTo(3.0, 0.2); finShape.lineTo(0.6, 5.2); finShape.lineTo(0, 5.2); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.14, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(finGeo, matWhiteD);
    f.position.set(0, 0.6, s > 0 ? R - 0.1 : -R + 0.1);
    f.rotation.y = Math.PI / 2;
    f.scale.set(1, 1, 1);
    // orient the fin so it sticks out along +/-Z
    const holder = new THREE.Group();
    holder.add(f);
    f.rotation.set(0, 0, 0); f.position.set(0, 0, 0);
    holder.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    holder.position.set(0, 0.6, s * (R - 0.1));
    upper.add(holder);
  }
  // vacuum engine bell
  const vac = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.95, 1.5, 18, 1, true), bellMat); vac.position.y = -0.25; upper.add(vac);

  // HALO array: petals hinged around the body, hanging down against the hull when stowed
  const halo = new THREE.Group(); halo.position.y = 9.0; upper.add(halo);
  const PL = 4.0;
  const petals = [];
  const petalMat = mat({ map: T.haloTex, roughness: 0.35, metalness: 0.7, emissive: 0x442200, emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const N = 8;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    const hinge = new THREE.Group();
    hinge.position.set(Math.cos(a) * (R + 0.05), 0, Math.sin(a) * (R + 0.05));
    hinge.rotation.y = -a + Math.PI / 2;
    const arm = new THREE.Group();             // rotates about local X
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.1, PL, 0.06), petalMat);
    panel.position.y = -PL / 2;
    const ext = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.2, 0.05), petalMat);
    ext.position.set(0, -PL - 1.6, 0); ext.name = 'ext'; ext.scale.y = 0.001; ext.visible = false;
    arm.add(panel, ext);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.08, 0.09), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    glow.position.y = -PL; arm.add(glow);
    hinge.add(arm); halo.add(hinge);
    petals.push({ arm, ext, glow });
  }
  // central emitter dish on the nose
  const dishGeo = new THREE.SphereGeometry(1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45);
  const dish = new THREE.Mesh(dishGeo, mat({ color: 0xd9c06a, metalness: 0.9, roughness: 0.25, emissive: 0xaa7a10, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
  dish.position.y = DX_H - 1.6; dish.scale.setScalar(0.001); dish.visible = false; upper.add(dish);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }));
  beacon.position.y = DX_H + 0.2; beacon.visible = false; upper.add(beacon);

  // ------------------------------------------------------------------ flames
  function makeFlame(radius, length) {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7a22, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const inner = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.55, length * 0.7, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    outer.rotation.x = Math.PI; outer.position.y = -length / 2;
    inner.rotation.x = Math.PI; inner.position.y = -length * 0.35;
    g.add(outer, inner);
    g.userData = { outer, inner, len: length };
    g.visible = false;
    return g;
  }
  const flameB = makeFlame(1.7, 22); flameB.position.y = -0.3; booster.add(flameB);
  const flameD = makeFlame(0.85, 11); flameD.position.y = -0.9; upper.add(flameD);

  stack.add(booster, upper);

  const api = {
    group: stack, booster, upper, flameB, flameD, legs, fins, petals, dish, beacon, hatch, hatchLight,
    boosterThrottle: 0, upperThrottle: 0,
    /** 0 = stowed, 1 = deployed */
    setLegs(t) { for (const h of legs) h.rotation.x = -0.52 * t; },
    setFins(t) { for (const f of fins) f.rotation.y = Math.PI / 2 * (1 - t); },
    setHalo(t) {
      // t 0..1: petals swing from hanging to outward-and-up dish; extension panels after 0.6
      const open = Math.min(1, t / 0.7);
      for (const p of petals) {
        p.arm.rotation.x = open * 2.5 * 1.0;     // 0 .. ~143deg => lifts up into a dish shape
        const e = Math.max(0, (t - 0.6) / 0.4);
        p.ext.visible = e > 0.01; p.ext.scale.y = Math.max(0.001, e);
        p.ext.position.y = -4.0 - 1.6 * e;
      }
      dish.visible = t > 0.2; dish.scale.setScalar(Math.max(0.001, Math.min(1, (t - 0.2) / 0.6)));
      beacon.visible = t > 0.8;
    },
    setBoosterThrottle(k, time = 0) {
      api.boosterThrottle = k;
      flameB.visible = k > 0.01;
      const f = k * (0.92 + 0.08 * Math.sin(time * 60) + 0.05 * Math.sin(time * 37));
      flameB.scale.set(0.5 + k * 0.5, f, 0.5 + k * 0.5);
    },
    setUpperThrottle(k, time = 0) {
      api.upperThrottle = k;
      flameD.visible = k > 0.01;
      const f = k * (0.92 + 0.08 * Math.sin(time * 60 + 1));
      flameD.scale.set(0.5 + k * 0.5, f, 0.5 + k * 0.5);
    },
    /** world position of the engine exit of the booster / upper stage */
    boosterNozzle(out = new THREE.Vector3()) { return booster.localToWorld(out.set(0, -0.5, 0)); },
    upperNozzle(out = new THREE.Vector3()) { return upper.localToWorld(out.set(0, -1.0, 0)); },
    hideHatch(open) { hatch.visible = !open; },
  };
  api.setLegs(0); api.setFins(0); api.setHalo(0);
  return api;
}
