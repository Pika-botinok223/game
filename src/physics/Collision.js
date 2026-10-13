// Static world: axis-aligned boxes used for player / enemy collision, ray tests and line of sight.
// (Dynamic props live in cannon-es; they expose their AABBs here through `dynamicProvider`.)

let boxId = 1;

export class StaticWorld {
  constructor() {
    this.boxes = [];
    this.dynamicProvider = null; // () => array of {minX..maxZ, prop}
  }

  add(x0, y0, z0, x1, y1, z1, opts = {}) {
    const b = {
      id: boxId++,
      minX: Math.min(x0, x1), minY: Math.min(y0, y1), minZ: Math.min(z0, z1),
      maxX: Math.max(x0, x1), maxY: Math.max(y0, y1), maxZ: Math.max(z0, z1),
      surface: opts.surface || 'concrete',
      enabled: true,
      solid: opts.solid !== false,   // false: blocks only the player (invisible walls)
      blocksSight: opts.blocksSight !== false,
      tag: opts.tag || null,
      kill: opts.kill || null,
    };
    this.boxes.push(b);
    return b;
  }
  remove(b) { const i = this.boxes.indexOf(b); if (i >= 0) this.boxes.splice(i, 1); }

  /** ray vs AABB list (statics only). Returns {t, box} or null. */
  raycast(ox, oy, oz, dx, dy, dz, maxDist = 100, sightOnly = false) {
    let best = maxDist, hit = null;
    for (const b of this.boxes) {
      if (!b.enabled) continue;
      if (sightOnly && !b.blocksSight) continue;
      const t = rayBox(ox, oy, oz, dx, dy, dz, b, best);
      if (t !== null && t < best) { best = t; hit = b; }
    }
    return hit ? { t: best, box: hit } : null;
  }

  /** true when nothing opaque is between a and b */
  lineOfSight(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) return true;
    return !this.raycast(a.x, a.y, a.z, dx / len, dy / len, dz / len, len - 0.05, true);
  }

  colliders() {
    const dyn = this.dynamicProvider ? this.dynamicProvider() : null;
    return dyn;
  }
}

export function rayBox(ox, oy, oz, dx, dy, dz, b, maxT) {
  let tmin = 0, tmax = maxT;
  // x
  if (Math.abs(dx) < 1e-9) { if (ox < b.minX || ox > b.maxX) return null; }
  else {
    let t1 = (b.minX - ox) / dx, t2 = (b.maxX - ox) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return null;
  }
  if (Math.abs(dy) < 1e-9) { if (oy < b.minY || oy > b.maxY) return null; }
  else {
    let t1 = (b.minY - oy) / dy, t2 = (b.maxY - oy) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return null;
  }
  if (Math.abs(dz) < 1e-9) { if (oz < b.minZ || oz > b.maxZ) return null; }
  else {
    let t1 = (b.minZ - oz) / dz, t2 = (b.maxZ - oz) / dz;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return null;
  }
  return tmin;
}

const EPS = 1e-4;

/**
 * Move an upright AABB body (feet position `pos`, half-width `r`, `height`) through the world.
 * body: {pos:{x,y,z}, vel:{x,y,z}, r, height, step, onGround, groundBox, ceiling}
 * hooks: {dynamic: array|null, onPush(propCollider, nx, nz), ignore(collider)}
 */
export function moveBody(body, dt, world, hooks = {}) {
  const dyn = hooks.dynamic || null;
  const all = world.boxes;
  const p = body.pos, v = body.vel, r = body.r;
  const overlaps = (b, x, y, z, h) =>
    b.enabled && b.solid !== false && x - r < b.maxX - EPS && x + r > b.minX + EPS && y < b.maxY - EPS && y + h > b.minY + EPS && z - r < b.maxZ - EPS && z + r > b.minZ + EPS;
  const overlapsDyn = (b, x, y, z, h) =>
    x - r < b.maxX - EPS && x + r > b.minX + EPS && y < b.maxY - EPS && y + h > b.minY + EPS && z - r < b.maxZ - EPS && z + r > b.minZ + EPS;
  const anyOverlap = (x, y, z, h) => {
    for (let i = 0; i < all.length; i++) if (overlaps(all[i], x, y, z, h)) return true;
    if (dyn) for (let i = 0; i < dyn.length; i++) { if (hooks.ignore && hooks.ignore(dyn[i])) continue; if (overlapsDyn(dyn[i], x, y, z, h)) return true; }
    return false;
  };
  body.anyOverlap = anyOverlap;

  for (const axis of ['x', 'z']) {
    const d = v[axis] * dt;
    if (d === 0) continue;
    p[axis] += d;
    const resolve = (b, isDyn) => {
      if (isDyn ? !overlapsDyn(b, p.x, p.y, p.z, body.height) : !overlaps(b, p.x, p.y, p.z, body.height)) return;
      // try stepping up
      const rise = b.maxY - p.y;
      if (body.step > 0 && rise > 0 && rise <= body.step && (body.onGround || body.stepInAir)) {
        const oldY = p.y;
        p.y = b.maxY + EPS * 2;
        if (!anyOverlap(p.x, p.y, p.z, body.height)) { if (v.y < 0) v.y = 0; return; }
        p.y = oldY;
      }
      if (isDyn && hooks.onPush) hooks.onPush(b, axis === 'x' ? Math.sign(d) : 0, axis === 'z' ? Math.sign(d) : 0);
      if (axis === 'x') { p.x = d > 0 ? b.minX - r - EPS : b.maxX + r + EPS; v.x = 0; }
      else { p.z = d > 0 ? b.minZ - r - EPS : b.maxZ + r + EPS; v.z = 0; }
      body.hitWall = true;
    };
    for (let i = 0; i < all.length; i++) resolve(all[i], false);
    if (dyn) for (let i = 0; i < dyn.length; i++) { if (hooks.ignore && hooks.ignore(dyn[i])) continue; resolve(dyn[i], true); }
  }

  // vertical
  body.onGround = false; body.groundBox = null; body.hitCeiling = false;
  p.y += v.y * dt;
  const vert = (b, isDyn) => {
    if (isDyn ? !overlapsDyn(b, p.x, p.y, p.z, body.height) : !overlaps(b, p.x, p.y, p.z, body.height)) return;
    if (v.y <= 0 && p.y - v.y * dt >= b.maxY - 0.12) {
      p.y = b.maxY; v.y = 0; body.onGround = true; body.groundBox = b;
    } else if (v.y > 0) {
      p.y = b.minY - body.height - EPS; v.y = 0; body.hitCeiling = true;
    } else {
      // started inside: nudge out sideways-agnostic by lifting if it is a low obstacle
      if (b.maxY - p.y < 0.5) { p.y = b.maxY; body.onGround = true; body.groundBox = b; v.y = 0; }
    }
  };
  for (let i = 0; i < all.length; i++) vert(all[i], false);
  if (dyn) for (let i = 0; i < dyn.length; i++) { if (hooks.ignore && hooks.ignore(dyn[i])) continue; vert(dyn[i], true); }
}
