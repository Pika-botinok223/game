import * as THREE from 'three';

/**
 * Forward rendering gets expensive with many point lights, so levels declare many logical "light spots"
 * and a fixed pool of real PointLights is assigned to the ones nearest the camera (with fading, no popping).
 */
export class LightPool {
  constructor(scene, count = 7) {
    this.spots = [];
    this.lights = [];
    this.time = 0;
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 1.6);
      l.userData = { spot: null, cur: 0 };
      scene.add(l);
      this.lights.push(l);
    }
  }

  /** spot: {pos:Vector3, color, intensity, distance, flicker:0..1, speed, enabled:true} */
  add(spot) {
    const s = Object.assign({ color: 0xffffff, intensity: 1, distance: 10, flicker: 0, speed: 1, enabled: true, scale: 1, phase: Math.random() * 100 }, spot);
    s.pos = s.pos.clone ? s.pos.clone() : new THREE.Vector3(s.pos.x, s.pos.y, s.pos.z);
    s.color = new THREE.Color(s.color);
    this.spots.push(s);
    return s;
  }
  remove(s) { const i = this.spots.indexOf(s); if (i >= 0) this.spots.splice(i, 1); }

  spotIntensity(s) {
    if (!s.enabled) return 0;
    let k = s.intensity * s.scale;
    if (s.flicker > 0) {
      const t = this.time * s.speed + s.phase;
      // fluorescent style stutter
      const n = Math.sin(t * 37.0) * Math.sin(t * 13.1) + Math.sin(t * 5.3);
      const off = n > 1.35 ? 1 : 0;
      k *= 1 - s.flicker * (off * 0.85 + 0.1 * Math.sin(t * 90));
    }
    return Math.max(0, k);
  }

  update(dt, camPos) {
    this.time += dt;
    // rank spots by score = distance relative to range, brightest first
    const cand = [];
    for (const s of this.spots) {
      if (!s.enabled && !(s.light)) continue;
      const d = s.pos.distanceTo(camPos);
      if (d > s.distance + 40) continue;
      cand.push({ s, score: d / (s.distance + 2) });
    }
    cand.sort((a, b) => a.score - b.score);
    const wanted = new Set(cand.slice(0, this.lights.length).map((c) => c.s));
    // release lights whose spot is no longer wanted; fade them out
    for (const l of this.lights) {
      const u = l.userData;
      if (u.spot && !wanted.has(u.spot)) {
        u.cur = Math.max(0, u.cur - dt * 6);
        if (u.cur <= 0.001) { u.spot.light = null; u.spot = null; l.intensity = 0; }
        else l.intensity = u.cur;
      }
    }
    // assign free lights
    for (const s of wanted) {
      if (s.light) continue;
      const free = this.lights.find((l) => !l.userData.spot);
      if (!free) break;
      free.userData.spot = s; free.userData.cur = 0; s.light = free;
    }
    for (const l of this.lights) {
      const u = l.userData;
      if (!u.spot || !wanted.has(u.spot)) continue;
      const s = u.spot;
      const target = this.spotIntensity(s);
      u.cur += (target - u.cur) * Math.min(1, dt * 12);
      l.position.copy(s.pos); l.color.copy(s.color); l.distance = s.distance; l.intensity = u.cur;
    }
  }

  clear(scene) {
    for (const l of this.lights) scene.remove(l);
    this.spots.length = 0;
  }
}
