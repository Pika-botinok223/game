import * as THREE from 'three';
import { assets } from '../core/Assets.js';

const VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`;
const FRAG = `
  varying vec3 vDir;
  uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor;
  uniform float uStars, uSunSize;
  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  void main(){
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, pow(clamp(-h * 3.0, 0.0, 1.0), 0.6));
    if (uStars > 0.0 && h > -0.05) {
      vec3 sp = floor(d * 260.0);
      float s = hash(sp);
      float star = smoothstep(0.9965, 1.0, s) * smoothstep(0.0, 0.25, h);
      col += vec3(star) * uStars * (0.6 + 0.4 * hash(sp + 3.0));
    }
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunColor * (pow(sd, uSunSize) * 1.4 + pow(sd, 6.0) * 0.18);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function makeSky(o = {}) {
  const useTex = o.useTexture && assets.textures.get('sky_night') && assets.textures.get('sky_night').userData.fromFile;
  let mat;
  if (useTex) {
    const t = assets.textures.get('sky_night');
    t.mapping = THREE.EquirectangularReflectionMapping;
    mat = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, fog: false });
  } else {
    mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(o.top || 0x04060f) }, uHorizon: { value: new THREE.Color(o.horizon || 0x1b2540) }, uBottom: { value: new THREE.Color(o.bottom || 0x07080c) },
        uSunDir: { value: new THREE.Vector3(...(o.sunDir || [0.3, 0.5, -0.8])) }, uSunColor: { value: new THREE.Color(o.sunColor || 0x000000) },
        uStars: { value: o.stars !== undefined ? o.stars : 1 }, uSunSize: { value: o.sunSize || 600 },
      },
    });
  }
  const m = new THREE.Mesh(new THREE.SphereGeometry(1400, 24, 16), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  m.userData.isSky = true;
  return m;
}
