import * as THREE from 'three';

function earthTexture() {
  const w = 1024, h = 512;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const hash = (x, y, s) => { let n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
  const noise = (u, v, P, s) => {
    const x = u * P, y = v * P, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sm = (t) => t * t * (3 - 2 * t);
    const w2 = (a) => ((a % P) + P) % P;
    const a = hash(w2(x0), y0, s), b = hash(w2(x0 + 1), y0, s), c2 = hash(w2(x0), y0 + 1, s), d = hash(w2(x0 + 1), y0 + 1, s);
    return a + (b - a) * sm(fx) + (c2 - a) * sm(fy) + (a - b - c2 + d) * sm(fx) * sm(fy);
  };
  const fbm = (u, v, s) => { let a = 0.5, sum = 0, P = 4; for (let i = 0; i < 6; i++) { sum += a * noise(u, v, P, s + i); a *= 0.5; P *= 2; } return sum; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h;
    const land = fbm(u, v, 3);
    const lat = Math.abs(v - 0.5) * 2;
    let r, g, b;
    if (land > 0.52) { const e = (land - 0.52) * 4; r = 60 + e * 90; g = 100 + e * 40 - e * e * 50; b = 50 + e * 20; if (lat > 0.8) { r = g = b = 235; } }
    else { const d = land / 0.52; r = 8 + d * 20; g = 30 + d * 55; b = 90 + d * 90; if (lat > 0.88) { r = g = b = 235; } }
    const cl = Math.max(0, fbm(u, v * 1.3, 40) - 0.52) * 3.2;
    r = r + (240 - r) * Math.min(1, cl); g = g + (244 - g) * Math.min(1, cl); b = b + (248 - b) * Math.min(1, cl);
    const o = (y * w + x) * 4; img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Orbital environment: big Earth + atmosphere glow + star field. Returns a Group (add to scene). */
export function createSpace() {
  const g = new THREE.Group();
  const R = 6000;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.9, metalness: 0, emissive: 0x0a1428, emissiveIntensity: 0.55 }));
  earth.position.set(0, -R - 400, 0);
  earth.rotation.set(1.25, 0.6, 0.2);   // keep the poles out of the camera's view
  g.add(earth);
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: new THREE.Color(0x4aa0ff) } },
    vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vP; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vP))), 3.0); gl_FragColor = vec4(c * f * 1.6, f); }',
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 64, 48), atmoMat);
  atmo.position.copy(earth.position);
  g.add(atmo);
  // thin lit rim from the front as well
  const atmo2 = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 64, 48), new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  atmo2.position.copy(earth.position);
  g.add(atmo2);
  // stars
  const N = 1800;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = 9000;
    pos[i * 3] = Math.cos(a) * s * r; pos[i * 3 + 1] = u * r; pos[i * 3 + 2] = Math.sin(a) * s * r;
    const b = 0.5 + Math.random() * 0.5; col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = b * (0.85 + Math.random() * 0.15);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, vertexColors: true, sizeAttenuation: false, fog: false, depthWrite: false }));
  stars.frustumCulled = false;
  g.add(stars);
  g.userData = { earth, atmo };
  return g;
}
