import * as CANNON from 'cannon-es';

/** Thin wrapper around cannon-es for dynamic props. Static level geometry is mirrored as static boxes. */
export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.solver.iterations = 16;
    this.world.solver.tolerance = 0.0005;
    const mat = new CANNON.Material('default');
    this.material = mat;
    this.world.defaultMaterial = mat;
    this.world.defaultContactMaterial = new CANNON.ContactMaterial(mat, mat, {
      friction: 0.6, restitution: 0.04, contactEquationStiffness: 8e6, contactEquationRelaxation: 4,
      frictionEquationStiffness: 8e6, frictionEquationRelaxation: 4,
    });
    this.props = [];
    this.colliders = [];
    this.accum = 0;
  }

  addStaticBox(x0, y0, z0, x1, y1, z1) {
    const hx = Math.abs(x1 - x0) / 2, hy = Math.abs(y1 - y0) / 2, hz = Math.abs(z1 - z0) / 2;
    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)), material: this.material });
    body.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.world.addBody(body);
    return body;
  }
  addDynamicBox({ x, y, z, hx, hy, hz, mass, rotY = 0 }) {
    const body = new CANNON.Body({ mass, shape: new CANNON.Box(new CANNON.Vec3(hx, hy, hz)), material: this.material });
    body.position.set(x, y, z);
    body.quaternion.setFromEuler(0, rotY, 0);
    body.linearDamping = 0.04; body.angularDamping = 0.25;
    body.allowSleep = true; body.sleepSpeedLimit = 0.15; body.sleepTimeLimit = 0.6;
    this.world.addBody(body);
    return body;
  }
  removeBody(b) { this.world.removeBody(b); }

  step(dt) {
    this.accum += Math.min(dt, 0.05);
    const fixed = 1 / 60;
    let n = 0;
    while (this.accum >= fixed && n < 3) { this.world.step(fixed); this.accum -= fixed; n++; }
    if (n === 3) this.accum = 0;
  }

  /** Rebuild the AABB collider list the player/enemies collide with. */
  refreshColliders() {
    const out = this.colliders;
    out.length = 0;
    for (const p of this.props) {
      if (!p.alive || p.noCollide) continue;
      const b = p.body;
      b.updateAABB();
      const a = b.aabb;
      // use an axis-aligned box that is tighter for upright props
      let c = p.collider;
      if (!c) c = p.collider = { prop: p };
      c.minX = a.lowerBound.x; c.minY = a.lowerBound.y; c.minZ = a.lowerBound.z;
      c.maxX = a.upperBound.x; c.maxY = a.upperBound.y; c.maxZ = a.upperBound.z;
      out.push(c);
    }
    return out;
  }
}
