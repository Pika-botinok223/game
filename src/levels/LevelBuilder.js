import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { assets } from '../core/Assets.js';

const METALISH = /metal|hazard|grate|plate|rust/;

/** Brush-style geometry helpers. All geometry is merged per material at finish() for performance. */
export class LevelBuilder {
  constructor(game) {
    this.game = game;
    this.groups = new Map();
    this.boxes = [];       // collider records created via box()
    this.count = 0;
    this.defaultTile = 2;
  }

  _surfaceFor(tex) { return tex && METALISH.test(tex) ? 'metal' : 'concrete'; }

  /**
   * Axis-aligned brush from (x0,y0,z0) to (x1,y1,z1) in metres.
   * o: {tile (metres per texture repeat), collide=true, visible=true, surface, matOpts, tint, noPhys, sight}
   */
  box(x0, y0, z0, x1, y1, z1, tex = 'concrete_wall', o = {}) {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1), minY = Math.min(y0, y1), maxY = Math.max(y0, y1), minZ = Math.min(z0, z1), maxZ = Math.max(z0, z1);
    const w = maxX - minX, h = maxY - minY, d = maxZ - minZ;
    if (w < 1e-4 || h < 1e-4 || d < 1e-4) return null;
    if (o.visible !== false) {
      const geo = new THREE.BoxGeometry(w, h, d);
      geo.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      const tile = o.tile || this.defaultTile;
      const pos = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
      const ox = o.uvOffset ? o.uvOffset[0] : 0, oy = o.uvOffset ? o.uvOffset[1] : 0;
      for (let i = 0; i < pos.count; i++) {
        const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        let u, v;
        if (nx > 0.5) { u = z; v = y; } else if (ny > 0.5) { u = x; v = z; } else { u = x; v = y; }
        uv.setXY(i, u / tile + ox, v / tile + oy);
      }
      const mo = o.matOpts || {};
      const key = tex + '|' + JSON.stringify(mo);
      let grp = this.groups.get(key);
      if (!grp) { grp = { tex, mo, geos: [] }; this.groups.set(key, grp); }
      grp.geos.push(geo);
    }
    let rec = null;
    if (o.collide !== false) {
      rec = this.game.statics.add(minX, minY, minZ, maxX, maxY, maxZ, { surface: o.surface || this._surfaceFor(tex), blocksSight: o.sight, solid: o.solid });
      if (!o.noPhys && o.solid !== false) this.game.physics.addStaticBox(minX, minY, minZ, maxX, maxY, maxZ);
    }
    this.count++;
    return rec;
  }

  /** Invisible collision-only brush (player clip). */
  clip(x0, y0, z0, x1, y1, z1, o = {}) { return this.box(x0, y0, z0, x1, y1, z1, null, { ...o, visible: false }); }

  floor(x0, z0, x1, z1, tex = 'concrete_floor', o = {}) { return this.box(x0, o.y0 !== undefined ? o.y0 : -0.4, z0, x1, o.y !== undefined ? o.y : 0, z1, tex, { tile: 2.5, ...o }); }
  ceiling(x0, z0, x1, z1, h, tex = 'ceiling_panel', o = {}) { return this.box(x0, h, z0, x1, h + 0.3, z1, tex, { tile: 2, ...o }); }

  /**
   * Axis-aligned wall segment from (x0,z0) to (x1,z1) (one of the coordinates must match). Thickness extends
   * to the +side by default (thick > 0) or -side (thick < 0). gaps: [{at, w, h}] (at = world coordinate of the gap centre along the wall).
   */
  wall(x0, z0, x1, z1, h, tex = 'concrete_wall', o = {}) {
    const thick = o.thick !== undefined ? o.thick : 0.3;
    const y0 = o.y0 || 0;
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
    const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
    const c = alongX ? z0 : x0;
    const lo = Math.min(c, c + thick), hi = Math.max(c, c + thick);
    const gaps = (o.gaps || []).map((g) => ({ s: g.at - g.w / 2, e: g.at + g.w / 2, h: g.h !== undefined ? g.h : 2.6 })).sort((p, q) => p.s - q.s);
    const emit = (s, e, yy0, yy1) => {
      if (e - s < 1e-3 || yy1 - yy0 < 1e-3) return;
      if (alongX) this.box(s, yy0, lo, e, yy1, hi, tex, o); else this.box(lo, yy0, s, hi, yy1, e, tex, o);
    };
    let cur = a0;
    for (const g of gaps) {
      emit(cur, g.s, y0, y0 + h);
      emit(g.s, g.e, y0 + g.h, y0 + h); // lintel
      cur = g.e;
    }
    emit(cur, a1, y0, y0 + h);
  }

  /**
   * Walled room. Interior bounds x0..x1, z0..z1 and height h. Walls are built OUTSIDE the interior bounds.
   * sides: {n,s,e,w: {gaps:[...], skip:true}}  (n = -z side, s = +z side, e = +x, w = -x)
   */
  room(x0, z0, x1, z1, h, o = {}) {
    const t = o.thick || 0.3;
    const wallTex = o.wall || 'concrete_wall';
    const sides = o.sides || {};
    const opt = (s) => ({ ...(o.wallOpts || {}), thick: t, gaps: (sides[s] && sides[s].gaps) || [] });
    if (o.floor !== null) this.floor(x0 - t, z0 - t, x1 + t, z1 + t, o.floor || 'concrete_floor', o.floorOpts || {});
    if (o.ceil !== null) this.ceiling(x0 - t, z0 - t, x1 + t, z1 + t, h, o.ceil || 'ceiling_panel');
    const tw = (s) => (sides[s] && sides[s].tex) || wallTex;
    if (!(sides.n && sides.n.skip)) this.wall(x0 - t, z0, x1 + t, z0, h, tw('n'), { ...opt('n'), thick: -t });
    if (!(sides.s && sides.s.skip)) this.wall(x0 - t, z1, x1 + t, z1, h, tw('s'), { ...opt('s'), thick: t });
    if (!(sides.w && sides.w.skip)) this.wall(x0, z0, x0, z1, h, tw('w'), { ...opt('w'), thick: -t });
    if (!(sides.e && sides.e.skip)) this.wall(x1, z0, x1, z1, h, tw('e'), { ...opt('e'), thick: t });
  }

  /** Stair run: n steps rising along +dir ('x+','x-','z+','z-'). */
  stairs(x, z, width, n, rise, run, dir, tex = 'metal_floor', y0 = 0) {
    for (let i = 0; i < n; i++) {
      const top = y0 + rise * (i + 1);
      let a, b, c, d;
      if (dir === 'x+') { a = x + run * i; b = z - width / 2; c = x + run * (i + 1); d = z + width / 2; }
      else if (dir === 'x-') { a = x - run * (i + 1); b = z - width / 2; c = x - run * i; d = z + width / 2; }
      else if (dir === 'z+') { a = x - width / 2; b = z + run * i; c = x + width / 2; d = z + run * (i + 1); }
      else { a = x - width / 2; b = z - run * (i + 1); c = x + width / 2; d = z - run * i; }
      this.box(a, y0, b, c, top, d, tex, { tile: 1 });
    }
  }

  /** Real light + glowing fixture. */
  lamp(x, y, z, o = {}) {
    const color = o.color !== undefined ? o.color : 0xfff2dd;
    const spot = this.game.lights.add({ pos: new THREE.Vector3(x, y - 0.15, z), color, intensity: o.intensity !== undefined ? o.intensity : 6, distance: o.distance || 12, flicker: o.flicker || 0, speed: o.speed || 1 });
    if (o.fixture !== false) {
      const w = o.w || 1.2, d = o.d || 0.25;
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6) });
      const m = new THREE.Mesh(new THREE.BoxGeometry(o.axis === 'z' ? d : w, 0.06, o.axis === 'z' ? w : d), mat);
      m.position.set(x, y, z);
      this.game.levelRoot.add(m);
      if (o.flicker) { spot.fixture = m; this.game.flickerFixtures.push({ spot, mesh: m, base: new THREE.Color(color).multiplyScalar(1.6) }); }
    }
    return spot;
  }

  /** Merge all accumulated geometry into meshes (call once at the end of a level's geometry). */
  finish() {
    for (const grp of this.groups.values()) {
      if (!grp.geos.length) continue;
      const merged = mergeGeometries(grp.geos, false);
      grp.geos.forEach((g) => g.dispose());
      const mat = assets.material(grp.tex, grp.mo);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      this.game.levelRoot.add(mesh);
    }
    this.groups.clear();
  }
}
