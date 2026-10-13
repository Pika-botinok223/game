// Cockpit interior + the final launch cinematic (countdown, liftoff, stage separation, booster return, orbit, HALO).
import * as THREE from 'three';
import { assets } from '../core/Assets.js';
import { makeTextTexture } from '../render/ProcTextures.js';
import { Button } from '../entities/Button.js';
import { createSpace } from '../render/Space.js';
import { Entity } from '../entities/Entity.js';
import { MOUNT_TOP, TOP_Y } from '../levels/pad.js';
import { glass } from '../levels/kit.js';

const UPPER_BASE = 32.05;            // upper stage origin above the booster base (stack-local)
const CAB = { x0: -1.5, x1: 1.5, z0: -1.1, z1: 1.1, h: 2.3 };

/** Builds the cabin inside the DX-90 hull (visuals parented to rocket.upper; colliders in world space). */
export function buildCockpit(game, b, rocket) {
  const up = rocket.upper;
  const baseY = MOUNT_TOP + UPPER_BASE;               // world y of the upper stage origin
  const grp = new THREE.Group(); up.add(grp);
  const wall = assets.material('metal_wall', { color: 0x9aa4ae, metalness: 0.5, roughness: 0.55 });
  const floorM = assets.material('metal_floor', { color: 0x889099 });
  const dark = assets.material(null, { color: 0x1c2126, metalness: 0.5, roughness: 0.6 });
  const mk = (x0, y0, z0, x1, y1, z1, mat, collide = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2 - baseY, (z0 + z1) / 2);
    grp.add(m);
    if (collide) b.box(x0, y0, z0, x1, y1, z1, null, { visible: false, surface: 'metal' });
    return m;
  };
  const Y0 = TOP_Y, Y1 = TOP_Y + CAB.h;
  mk(CAB.x0 - 0.2, Y0 - 0.3, CAB.z0 - 0.2, CAB.x1 + 0.4, Y0, CAB.z1 + 0.2, floorM);
  mk(CAB.x0 - 0.2, Y1, CAB.z0 - 0.2, CAB.x1 + 0.4, Y1 + 0.2, CAB.z1 + 0.2, wall);
  mk(CAB.x0 - 0.2, Y0, CAB.z0 - 0.2, CAB.x1 + 0.4, Y1, CAB.z0, wall);          // -Z wall
  mk(CAB.x0 - 0.2, Y0, CAB.z1, CAB.x1 + 0.4, Y1, CAB.z1 + 0.2, wall);          // +Z wall
  // +X wall with hatch opening (z in -0.65..0.65, full cabin height to 2.2)
  mk(CAB.x1, Y0, CAB.z0, CAB.x1 + 0.2, Y1, -0.65, wall);
  mk(CAB.x1, Y0, 0.65, CAB.x1 + 0.2, Y1, CAB.z1, wall);
  mk(CAB.x1, Y0 + 2.1, -0.65, CAB.x1 + 0.2, Y1, 0.65, wall);
  // -X wall: window band
  mk(CAB.x0 - 0.2, Y0, CAB.z0, CAB.x0, Y0 + 0.9, CAB.z1, wall);
  mk(CAB.x0 - 0.2, Y0 + 1.95, CAB.z0, CAB.x0, Y1, CAB.z1, wall);
  mk(CAB.x0 - 0.2, Y0 + 0.9, CAB.z0, CAB.x0, Y0 + 1.95, -0.95, wall);
  mk(CAB.x0 - 0.2, Y0 + 0.9, 0.95, CAB.x0, Y0 + 1.95, CAB.z1, wall);
  // window glass
  const gm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 1.9), assets.material(null, { color: 0xaaccee, transparent: true, opacity: 0.12, roughness: 0.05 }));
  gm.position.set(CAB.x0 - 0.05, Y0 + 1.425 - baseY, 0); grp.add(gm);
  b.box(CAB.x0 - 0.1, Y0 + 0.9, -0.95, CAB.x0, Y0 + 1.95, 0.95, null, { visible: false, sight: false });
  // console under the window
  mk(CAB.x0, Y0, -0.95, CAB.x0 + 0.8, Y0 + 0.9, 0.95, dark);
  const scr = (z, w, txt) => {
    const t = makeTextTexture(txt, { w: 256, h: 128, bg: '#06121c', fg: '#44ddff', font: 'bold 20px "Courier New", monospace', border: '#44ddff', align: 'left' });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(CAB.x0 + 0.5, Y0 + 0.95 - baseY, z); m.rotation.set(-1.0, Math.PI / 2, 0, 'YXZ');
    grp.add(m);
  };
  scr(-0.6, 0.5, ['ATT  OK', 'FUEL 100%', 'HALO ARMED']); scr(0.6, 0.5, ['T-00:04:00', 'GABRIEL: GO', 'DX-90: GO']);
  // seats
  for (const z of [-0.45, 0.45]) {
    const seat = new THREE.Group();
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.55), dark); s1.position.y = 0.45;
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.55), dark); s2.position.set(0.3, 0.8, 0);
    const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.4), dark); s3.position.y = 0.22;
    seat.add(s1, s2, s3); seat.position.set(0.55, Y0 - baseY, z); grp.add(seat);
  }
  // cabin light (blue-white)
  game.lights.add({ pos: new THREE.Vector3(0, Y0 + 2.0, 0), color: 0xbfd8ff, intensity: 30, distance: 6 });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfd8ff).multiplyScalar(1.8) }));
  strip.position.set(0, Y1 - 0.03 - baseY, 0); grp.add(strip);
  // trigger button on the console's face
  const launch = new Button(game, { x: CAB.x0 + 0.84, y: Y0 + 0.62, z: 0, rotY: Math.PI / 2, big: true, color: 0xff2a1a, prompt: 'LAUNCH' });
  launch.setDisabled(true);
  game.add(launch);
  const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ map: makeTextTexture('LAUNCH', { w: 256, h: 64, bg: '#1a0a0a', fg: '#ff5a44', font: 'bold 40px Arial', border: '#ff5a44' }) }));
  lbl.position.set(CAB.x0 + 0.805, Y0 + 0.86 - baseY, 0); lbl.rotation.y = Math.PI / 2; grp.add(lbl);
  return { launch, group: grp };
}

// ---------------------------------------------------------------------------------------------
function spline(keys, t) {
  // 1D Catmull-Rom through [t, v] keys (t ascending)
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const p0 = keys[Math.max(0, i - 1)][1], p1 = keys[i][1], p2 = keys[i + 1][1], p3 = keys[Math.min(n - 1, i + 2)][1];
  const u = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
  return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}
const ease = (t) => t * t * (3 - 2 * t);

export async function runLaunch(s, game, rocket, ctx) {
  const { booster, upper } = rocket;
  const stack = rocket.group;
  const cam = game.camera;
  const pl = game.player;
  const hud = game.hud;
  const T0 = performance.now();
  const dlg = game.dialogue;
  let wf = document.querySelector('.window-frame');
  if (!wf) { wf = document.createElement('div'); wf.className = 'window-frame'; game.uiRoot.appendChild(wf); }

  // --- take control ---
  game.cutscene = true; pl.frozen = true; pl.lookFrozen = true;
  game.setObjective(null);
  hud.setVisible(false); hud.setPrompt('');
  game.renderer.renderViewmodel = false;
  pl.holsterAll();
  const localPos = upper.worldToLocal(cam.position.clone());
  const qUpperInv = upper.getWorldQuaternion(new THREE.Quaternion()).invert();
  const localQuat = qUpperInv.multiply(cam.getWorldQuaternion(new THREE.Quaternion()));
  let mode = 'cockpit';
  let rumble = 0;
  const wq = new THREE.Quaternion(), wp = new THREE.Vector3();
  const flameLight = game.lights.add({ pos: new THREE.Vector3(0, MOUNT_TOP, 0), color: 0xff9a40, intensity: 0, distance: 120 });
  let windowTarget = null, windowOffset = new THREE.Vector3(-3.0, 0.8, 0.0), autoFov = true;
  const tmp = new THREE.Vector3();

  game.camControl = (dt) => {
    const sh = rumble;
    if (mode === 'cockpit') {
      upper.updateMatrixWorld(true);
      upper.localToWorld(cam.position.copy(localPos));
      upper.getWorldQuaternion(wq);
      cam.quaternion.copy(wq).multiply(localQuat);
      cam.position.x += (Math.random() - 0.5) * 0.02 * sh; cam.position.y += (Math.random() - 0.5) * 0.02 * sh;
      cam.rotateZ((Math.random() - 0.5) * 0.006 * sh);
    } else if (mode === 'window') {
      upper.updateMatrixWorld(true);
      upper.localToWorld(cam.position.copy(windowOffset));
      const target = windowTarget || tmp.set(0, 0, 0);
      cam.lookAt(target);
      if (autoFov) {
        const d = cam.position.distanceTo(target);
        const fov = THREE.MathUtils.clamp(2 * Math.atan(32 * 1.7 / 2 / d) * 180 / Math.PI, 3.2, 62);
        cam.fov += (fov - cam.fov) * Math.min(1, dt * 4);
        cam.updateProjectionMatrix();
      }
      cam.rotateZ((Math.random() - 0.5) * 0.004 * sh);
    }
    cam.updateMatrixWorld();
  };
  game.rumble = 0;
  const loopRumble = game.loopSound('rumble_loop', { vol: 0.0 });
  const loopRocket = game.loopSound('rocket_launch_loop', { vol: 0.0 });
  const setRumble = (r) => { rumble = r; game.rumble = r * 0.6; if (loopRumble) loopRumble.setVolume(Math.min(1, r * 0.9), 0.1); };

  await s.wait(1.0);
  dlg.say('pa_launch');
  await s.wait(2.2);
  // --- countdown ---
  const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const smokeAt = (pos, n, spread = 6, up = 4, size = 5) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (0.4 + Math.random()) * spread;
      game.smoke.emit({ pos: { x: pos.x, y: pos.y, z: pos.z }, vel: { x: Math.cos(a) * sp, y: Math.random() * up, z: Math.sin(a) * sp }, life: 3 + Math.random() * 2, size0: size * 0.5, size1: size * 1.7, color0: [0.9, 0.9, 0.92], color1: [0.5, 0.5, 0.55], alpha: 0.5, drag: 1.1 });
    }
  };
  const nozzle = new THREE.Vector3();
  let ignited = false;
  let ignT = 0;
  const burnFx = (dt, k) => {
    rocket.boosterNozzle(nozzle);
    flameLight.pos.copy(nozzle).y -= 4; flameLight.intensity = 3000 * k;
    const dir = new THREE.Vector3(0, -1, 0);
    for (let i = 0; i < Math.floor(14 * k) + 1; i++) {
      game.fx.emit({ pos: { x: nozzle.x + (Math.random() - 0.5) * 2.4, y: nozzle.y - Math.random() * 4, z: nozzle.z + (Math.random() - 0.5) * 2.4 }, vel: { x: (Math.random() - 0.5) * 3, y: -22 - Math.random() * 18, z: (Math.random() - 0.5) * 3 }, life: 0.5 + Math.random() * 0.4, size0: 2.6 * k + 0.5, size1: 0.6, color0: [1, 0.85, 0.5], color1: [1, 0.3, 0.05], alpha: 0.55, drag: 0.3 });
    }
  };
  for (let n = 10; n >= 1; n--) {
    dlg.announce('pa', `T-minus ${n}`, 1.0);
    if (n === 6) setRumble(0.25);
    if (n === 4) { setRumble(0.45); rocket.setUpperThrottle(0); }
    if (n === 3) { ignited = true; game.audio.play('stage_separation', { vol: 0.5, pitch: 0.5 }); if (loopRocket) loopRocket.setVolume(0.35, 1.0); }
    if (n === 3) { /* ignition: pad fills with smoke */ }
    const t0 = game.time;
    await s.until(() => {
      const t = game.time - t0;
      if (ignited) {
        const k = Math.min(0.35, 0.12 * (n === 3 ? t : 1 + (3 - n) * 0.9 + t));
        rocket.setBoosterThrottle(k, game.time);
        burnFx(game.dt, k);
        smokeAt({ x: 0, y: MOUNT_TOP + 0.5, z: 0 }, 3, 8, 2, 4);
        setRumble(0.5 + (3 - n) * 0.12 + t * 0.1);
      } else {
        setRumble(0.25 + (10 - n) * 0.03);
      }
      return t >= 1.0;
    });
  }
  // --- liftoff ---
  dlg.announce('pa', 'Liftoff.', 1.5);
  s.sayNoWait('varga_lift_off');
  if (loopRocket) loopRocket.setVolume(1.0, 1.5);
  hud.toast('LIFTOFF', 3);
  game.audio.music('pad39_finale', { fade: 0.5 });
  rocket.hideHatch(false);
  let tLift = 0, alt = 0, vel = 0;
  const SEP_T = 10.5;
  while (tLift < SEP_T) {
    await s.until(() => true);
    const dt = game.dt;
    tLift += dt;
    const acc = 4 + 1.7 * tLift;
    vel += acc * dt; alt += vel * dt;
    const thr = Math.min(1, 0.4 + tLift * 0.3);
    rocket.setBoosterThrottle(thr, game.time);
    burnFx(dt, thr);
    stack.position.y = MOUNT_TOP + alt;
    setRumble(1.0 - Math.min(0.35, tLift * 0.05));
    if (alt < 80) smokeAt({ x: 0, y: MOUNT_TOP + 0.5, z: 0 }, 6, 14, 3, 6);
    // trail
    game.smoke.emit({ pos: { x: nozzle.x, y: nozzle.y - 2, z: nozzle.z }, vel: { x: 0, y: -4, z: 0 }, life: 6, size0: 3, size1: 14, color0: [0.85, 0.85, 0.9], color1: [0.4, 0.4, 0.5], alpha: 0.35, drag: 0.4 });
    if (tLift > 6) game.scene.fog && (game.scene.fog.far = 330 + (tLift - 6) * 900);
    if (loopRocket) loopRocket.setPitch(1 + tLift * 0.01);
    if (alt > 150) { flameLight.intensity *= 0.9; }
  }
  // --- stage separation ---
  const vSep = vel;
  s.sayNoWait('varga_sep');
  game.audio.play('stage_separation', { vol: 1.0 });
  rocket.setBoosterThrottle(0);
  const baseAlt = alt;
  booster.position.y = baseAlt; upper.position.y = UPPER_BASE + baseAlt; stack.position.y = MOUNT_TOP;
  game.flashLight(new THREE.Vector3(0, MOUNT_TOP + baseAlt + 32, 0), 0xffffff, 3000, 140, 0.5);
  for (let i = 0; i < 40; i++) game.fx.emit({ pos: { x: (Math.random() - 0.5) * 3, y: MOUNT_TOP + baseAlt + 32, z: (Math.random() - 0.5) * 3 }, vel: { x: (Math.random() - 0.5) * 30, y: Math.random() * 10, z: (Math.random() - 0.5) * 30 }, life: 0.7, size0: 3, size1: 0.5, color0: [1, 1, 1], color1: [1, 0.6, 0.3], alpha: 0.8 });
  upper.updateMatrixWorld(true);
  // camera cut to the window cam
  game.scene.fog = null;
  cam.near = 0.4; cam.far = 14000; cam.fov = 40; cam.updateProjectionMatrix();
  mode = 'window'; windowTarget = booster.position.clone();
  wf.classList.add('show'); hud.setCamLabel('WINDOW CAM  DX-90');
  rocket.setUpperThrottle(1, game.time);
  setRumble(0.5);
  if (loopRocket) loopRocket.setVolume(0.45, 1.0);
  rocket.hideHatch(false);

  // booster return trajectory (relative to the separation moment)
  const by = [[0, baseAlt], [3, baseAlt + vSep * 3 * 0.8], [7, baseAlt + vSep * 4.2], [12, baseAlt + vSep * 3.4], [18, baseAlt + vSep * 1.9], [24, 420], [28, 70], [30.5, 0.5], [31.5, 0.5]];
  by.forEach((k, i) => { if (i > 0 && i < 6) k[1] = Math.max(k[1], 100); });
  const bx = [[0, 0], [4, 160], [9, 260], [15, 160], [22, 40], [27, 6], [30.5, 0], [31.5, 0]];
  let tau = 0, uy = 0, uv = vSep * 0.75;
  let landed = false, touch = 0;
  const flipRot = (t) => { // rotation about Z: 0 -> pi (flip) -> back to 0 (entry) 
    if (t < 1.2) return 0;
    if (t < 5.0) return Math.PI * ease((t - 1.2) / 3.8);
    if (t < 13) return Math.PI;
    if (t < 17) return Math.PI * (1 - ease((t - 13) / 4));
    return 0;
  };
  while (tau < 33) {
    await s.until(() => true);
    const dt = game.dt; tau += dt;
    // upper stage
    uv += 6 * dt; uy += uv * dt * 0.8;
    upper.position.y = UPPER_BASE + baseAlt + uy;
    upper.position.x = -uy * 0.55;        // downrange, so the window cam looks back at the pad at an angle
    upper.rotation.z = Math.min(0.35, uy / 6000);
    rocket.setUpperThrottle(1, game.time);
    rocket.upperNozzle(nozzle);
    game.fx.emit({ pos: nozzle, vel: { x: 0, y: -30, z: 0 }, life: 0.5, size0: 1.6, size1: 0.3, color0: [1, 0.9, 0.7], color1: [1, 0.4, 0.1], alpha: 0.5 });
    // booster
    const prevY = booster.position.y;
    const y = spline(by, tau), x = spline(bx, tau);
    booster.position.set(x, Math.max(0.45, y), 0);
    const rz = flipRot(tau);
    booster.rotation.z = rz + (tau > 1.2 && tau < 5 ? 0 : 0);
    booster.rotation.x = (tau > 7 && tau < 24) ? Math.sin(tau * 0.7) * 0.03 : 0;
    // direction of travel tilt for the boostback (small lean)
    const burnBack = tau > 5.0 && tau < 8.5;
    const burnLand = tau > 24 && tau < 30.3;
    let thr = 0;
    if (burnBack) thr = 0.7 * Math.min(1, (tau - 5) * 2) * Math.min(1, (8.5 - tau) * 2);
    if (burnLand) thr = 0.35 + 0.5 * Math.min(1, (tau - 24) / 3) * (1 - 0.5 * ease(Math.max(0, (tau - 29) / 1.3)));
    if (tau > 14.5 && tau < 16) thr = 0.25; // entry burn
    rocket.setBoosterThrottle(thr, game.time);
    if (thr > 0.05) {
      booster.updateMatrixWorld(true);
      rocket.boosterNozzle(nozzle);
      const dirY = rz > 1.5 ? 1 : -1;
      for (let i = 0; i < 3; i++) game.fx.emit({ pos: { x: nozzle.x, y: nozzle.y + dirY * Math.random() * 3, z: nozzle.z }, vel: { x: 0, y: dirY * 15, z: 0 }, life: 0.5, size0: 2.2 * thr + 0.4, size1: 0.5, color0: [1, 0.85, 0.5], color1: [1, 0.3, 0.05], alpha: 0.5 });
      flameLight.pos.copy(nozzle); flameLight.intensity = 2200 * thr;
    } else flameLight.intensity *= 0.8;
    // RCS puffs during flips
    if ((tau > 1.2 && tau < 5) || (tau > 13 && tau < 17)) {
      booster.updateMatrixWorld(true);
      const side = (tau > 13) ? -1 : 1;
      for (const yy of [30, 4]) {
        const p = booster.localToWorld(new THREE.Vector3(1.9, yy, 0));
        game.fx.emit({ pos: p, vel: { x: 12 * side, y: 0, z: 0 }, life: 0.35, size0: 1.2, size1: 0.2, color0: [1, 1, 1], alpha: 0.7 });
      }
    }
    rocket.setFins(ease(Math.min(1, Math.max(0, (tau - 15) / 2.0))));
    rocket.setLegs(ease(Math.min(1, Math.max(0, (tau - 23) / 3.0))));
    booster.updateMatrixWorld(true);
    booster.localToWorld(windowTarget.set(0, 16, 0));
    if (tau > 30.5 && !landed) {
      landed = true;
      s.sayNoWait('varga_land');
      game.audio.play('metal_impact_3', { vol: 0.8, pitch: 0.4 });
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2, sp = 10 + Math.random() * 22;
        game.smoke.emit({ pos: { x: Math.cos(a) * 3, y: MOUNT_TOP + 1, z: Math.sin(a) * 3 }, vel: { x: Math.cos(a) * sp, y: 1 + Math.random() * 4, z: Math.sin(a) * sp }, life: 4, size0: 4, size1: 16, color0: [0.85, 0.82, 0.78], color1: [0.5, 0.48, 0.45], alpha: 0.55, drag: 1.4 });
      }
      game.flashLight(new THREE.Vector3(0, MOUNT_TOP + 4, 0), 0xffb060, 3000, 140, 1.2);
    }
    if (tau > 31 && booster.position.y <= 0.5) setRumble(0.1);
    if (loopRocket) loopRocket.setVolume(Math.max(0.2, 0.45 - tau * 0.01), 0.2);
  }
  rocket.setBoosterThrottle(0);
  await s.wait(1.2);

  // --- orbit ---
  await game.fader.to('white', 0.45);
  wf.classList.remove('show'); hud.setCamLabel(null);
  game.loopsStop();
  game.audio.play('stage_separation', { vol: 0.5, pitch: 0.7 });
  mode = 'none';
  game.levelRoot.visible = false;
  game.lights.spots.length = 0;
  const space = createSpace();
  game.scene.add(space);
  const orbitRoot = new THREE.Group();
  game.scene.add(orbitRoot);
  const hold = upper.parent;
  orbitRoot.add(upper);
  upper.position.set(0, -8, 0); upper.rotation.set(0, 0, 0);
  rocket.setUpperThrottle(0);
  rocket.setHalo(0);
  rocket.booster.visible = false;
  game.setAtmosphere({ fog: null, bg: 0x000004, ambient: [0x334466, 0.5], hemi: [0x6688bb, 0x112233, 0.35], exposure: 1.0, bloom: 0.6, bloomThreshold: 0.92, far: 20000 });
  cam.near = 0.3; cam.far = 20000; cam.fov = 48; cam.updateProjectionMatrix();
  const sun = game.lights.add({ pos: new THREE.Vector3(60, 30, 40), color: 0xfff4e0, intensity: 2600, distance: 400 });
  game.lights.add({ pos: new THREE.Vector3(-30, -40, -30), color: 0x6699ff, intensity: 500, distance: 200 });
  let orbitAng = 0.9, orbitR = 34;
  mode = 'orbit';
  game.camControl = (dt) => {
    orbitAng += dt * 0.16;
    orbitR = Math.max(24, orbitR - dt * 0.4);
    cam.position.set(Math.cos(orbitAng) * orbitR, 4 + Math.sin(orbitAng * 0.7) * 2, Math.sin(orbitAng) * orbitR);
    cam.lookAt(0, upper.position.y + 9, 0);
    cam.updateMatrixWorld();
    space.userData.earth.rotation.y += dt * 0.004;
  };
  rocket.beacon.visible = false;
  await game.fader.clear(1.0);
  s.sayNoWait('varga_orbit');
  await s.wait(2.0);
  game.audio.music('credits_theme', { fade: 2 });
  await s.tween(7.0, (t) => rocket.setHalo(ease(t)));
  await s.wait(0.8);
  // resonance pulse rings toward Earth
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
    r.rotation.x = Math.PI / 2; r.position.set(0, upper.position.y + 16, 0); orbitRoot.add(r); rings.push(r);
  }
  game.audio.play('manipulator_punt', { vol: 1.0, pitch: 0.4 });
  const ringStart = game.time;
  game.scheduler.run(async (s2) => {
    await s2.tween(6.0, (t) => {
      rings.forEach((r, i) => {
        const tt = Math.max(0, t * 1.4 - i * 0.18);
        r.scale.setScalar(1 + tt * 380); r.position.y = upper.position.y + 16 - tt * 700;
        r.material.opacity = tt > 0 && tt < 1 ? 0.9 * (1 - tt) : 0;
      });
    });
  }, game);
  await s.wait(2.4);
  game.loopSound('rumble_loop', { vol: 0.9, pitch: 1.5 });
  await game.fader.to('white', 3.0);
  game.loopsStop();
  await s.wait(1.0);
  // --- black, the Overseer ---
  game.audio.music(null, { fade: 1.0 });
  game.fader.set(1, 'black');
  game.levelRoot.visible = false; space.visible = false; orbitRoot.visible = false;
  await s.wait(3.0);
  await s.say('overseer_end');
  await s.wait(3.0);
  game.audio.music('credits_theme', { fade: 2 });
  game.camControl = null;
  game.scene.remove(space); game.scene.remove(orbitRoot);
  game.levelRoot.visible = true;
  await game.credits.play();
  game.audio.music(null, { fade: 1 });
  await game.toMenu();
}
