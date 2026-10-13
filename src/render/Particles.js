import * as THREE from 'three';

const VERT = /* glsl */`
attribute float size;
attribute vec4 pcolor;
varying vec4 vColor;
uniform float uScale;
void main() {
  vColor = pcolor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size * uScale / max(0.1, -mv.z);
}`;
const FRAG = /* glsl */`
varying vec4 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float a = smoothstep(1.0, 0.0, r);
  a *= a;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
  if (gl_FragColor.a < 0.003) discard;
}`;

/** CPU particle pool rendered as soft additive (or normal-blended) point sprites. World-space. */
export class ParticleSystem {
  constructor(scene, { max = 1500, additive = true } = {}) {
    this.max = max;
    this.n = 0;
    this.cursor = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);       // remaining
    this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 3); this.c1 = new Float32Array(max * 3);
    this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.outColor = new Float32Array(max * 4);
    this.outSize = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pcolor', new THREE.BufferAttribute(this.outColor, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.outSize, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uScale: { value: 800 } },
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    scene.add(this.points);
    this.geo = geo;
  }

  setScale(heightPx, fovDeg) { this.material.uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2)); }

  /** o: {pos:{x,y,z}, vel:{x,y,z}, life, size0, size1, color0:[r,g,b], color1, alpha, gravity, drag, spread} */
  emit(o) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    const p = o.pos, v = o.vel || { x: 0, y: 0, z: 0 };
    const sp = o.spread || 0;
    this.pos[i * 3] = p.x + (sp ? (Math.random() - 0.5) * sp : 0);
    this.pos[i * 3 + 1] = p.y + (sp ? (Math.random() - 0.5) * sp : 0);
    this.pos[i * 3 + 2] = p.z + (sp ? (Math.random() - 0.5) * sp : 0);
    this.vel[i * 3] = v.x; this.vel[i * 3 + 1] = v.y; this.vel[i * 3 + 2] = v.z;
    this.life[i] = this.maxLife[i] = o.life || 1;
    this.s0[i] = o.size0 !== undefined ? o.size0 : 0.3; this.s1[i] = o.size1 !== undefined ? o.size1 : this.s0[i];
    const c0 = o.color0 || [1, 1, 1], c1 = o.color1 || c0;
    this.c0.set(c0, i * 3); this.c1.set(c1, i * 3);
    this.a0[i] = o.alpha !== undefined ? o.alpha : 1;
    this.grav[i] = o.gravity || 0;
    this.drag[i] = o.drag || 0;
  }

  update(dt) {
    const { pos, vel, life, maxLife, outColor, outSize } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) { outSize[i] = 0; outColor[i * 4 + 3] = 0; continue; }
      life[i] -= dt;
      if (life[i] <= 0) { outSize[i] = 0; outColor[i * 4 + 3] = 0; continue; }
      const k = 1 - life[i] / maxLife[i];
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      vel[i * 3] *= dr; vel[i * 3 + 1] = vel[i * 3 + 1] * dr - this.grav[i] * dt; vel[i * 3 + 2] *= dr;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      outSize[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      outColor[i * 4] = this.c0[i * 3] + (this.c1[i * 3] - this.c0[i * 3]) * k;
      outColor[i * 4 + 1] = this.c0[i * 3 + 1] + (this.c1[i * 3 + 1] - this.c0[i * 3 + 1]) * k;
      outColor[i * 4 + 2] = this.c0[i * 3 + 2] + (this.c1[i * 3 + 2] - this.c0[i * 3 + 2]) * k;
      outColor[i * 4 + 3] = this.a0[i] * (k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.pcolor.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }

  clear() { this.life.fill(0); }
  dispose() { this.points.parent && this.points.parent.remove(this.points); this.geo.dispose(); this.material.dispose(); }
}
