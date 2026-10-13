// Procedural (canvas) fallbacks for every texture key in PLAN.md section 6.
import * as THREE from 'three';

function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}
function smooth(t) { return t * t * (3 - 2 * t); }
// tileable value noise: period P (integer lattice cells across the texture)
function vnoise(u, v, P, s) {
  const x = u * P, y = v * P;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = smooth(x - x0), fy = smooth(y - y0);
  const w = (a) => ((a % P) + P) % P;
  const a = hash(w(x0), w(y0), s), b = hash(w(x0 + 1), w(y0), s);
  const c = hash(w(x0), w(y0 + 1), s), d = hash(w(x0 + 1), w(y0 + 1), s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(u, v, base, oct, s) {
  let amp = 0.5, sum = 0, norm = 0, P = base;
  for (let i = 0; i < oct; i++) { sum += amp * vnoise(u, v, P, s + i * 17); norm += amp; amp *= 0.5; P *= 2; }
  return sum / norm;
}
const clamp = (x, a = 0, b = 255) => (x < a ? a : x > b ? b : x);

function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}
function fillPixels(size, fn) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4;
      const col = fn(x, y, x / size, y / size);
      d[o] = clamp(col[0]); d[o + 1] = clamp(col[1]); d[o + 2] = clamp(col[2]); d[o + 3] = col[3] === undefined ? 255 : col[3];
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
const mix = (a, b, t) => a + (b - a) * t;

const GEN = {
  concrete_wall(size) {
    return fillPixels(size, (x, y, u, v) => {
      const n = fbm(u, v, 6, 5, 1), m = fbm(u, v, 3, 3, 9);
      let g = 118 + n * 70 - 20 + (m - 0.5) * 30;
      // panel seams
      const sx = Math.abs(((u * 2) % 1) - 0.0), sy = Math.abs(((v * 2) % 1) - 0.0);
      if (sx < 0.006 || sy < 0.006) g -= 38;
      const stain = Math.pow(fbm(u, v, 2, 3, 77), 3) * 40 * (1 - v);
      g -= stain;
      return [g, g * 0.99, g * 0.96];
    });
  },
  concrete_floor(size) {
    return fillPixels(size, (x, y, u, v) => {
      const n = fbm(u, v, 8, 4, 3);
      let g = 88 + n * 55;
      const jx = Math.abs(((u * 2) % 1)), jy = Math.abs(((v * 2) % 1));
      if (jx < 0.005 || jy < 0.005) g -= 40;
      if (hash(x, y, 5) > 0.97) g -= 16;
      return [g, g, g * 0.97];
    });
  },
  metal_floor(size) {
    return fillPixels(size, (x, y, u, v) => {
      // diamond plate
      const cells = 8;
      const cu = (u * cells) % 1, cv = (v * cells) % 1;
      const odd = (Math.floor(u * cells) + Math.floor(v * cells)) % 2;
      const a = odd ? 0.7 : -0.7;
      const px = cu - 0.5, py = cv - 0.5;
      const along = (px * 1 + py * a);
      const across = (px * -a + py * 1);
      const bump = Math.max(0, 1 - Math.abs(along) / 0.34) * Math.max(0, 1 - Math.abs(across) / 0.09);
      const n = fbm(u, v, 8, 3, 21);
      let g = 70 + n * 30 + bump * 55;
      return [g * 0.92, g * 0.97, g * 1.05];
    });
  },
  metal_wall(size) {
    return fillPixels(size, (x, y, u, v) => {
      const n = fbm(u, v, 10, 3, 4);
      let g = 92 + n * 36;
      const pu = (u * 2) % 1, pv = (v * 2) % 1;
      if (pu < 0.012 || pv < 0.012) g -= 44;
      if (pu > 0.988 || pv > 0.988) g += 14;
      // rivets
      const ru = ((pu * 8) % 1) - 0.5, rv = ((pv * 8) % 1) - 0.5;
      const edge = Math.min(pu, 1 - pu, pv, 1 - pv);
      if (edge < 0.08 && ru * ru + rv * rv < 0.03) g += 28;
      const streak = fbm(u * 0.2 + 0.5, v, 2, 3, 99);
      g -= Math.pow(streak, 2) * 30 * v;
      return [g * 0.85, g * 0.95, g * 1.08];
    });
  },
  metal_plate(size) {
    return fillPixels(size, (x, y, u, v) => {
      const n = fbm(u, v, 12, 3, 8);
      let g = 130 + n * 40;
      const pu = (u * 2) % 1, pv = (v * 2) % 1;
      if (pu < 0.01 || pv < 0.01) g -= 55;
      const bolt = Math.hypot(((pu * 4) % 1) - 0.5, ((pv * 4) % 1) - 0.5);
      if (Math.min(pu, 1 - pu, pv, 1 - pv) < 0.1 && bolt < 0.14) g -= 30;
      return [g, g * 1.02, g * 1.05];
    });
  },
  tile_white(size) {
    return fillPixels(size, (x, y, u, v) => {
      const T = 4;
      const tu = (u * T) % 1, tv = (v * T) % 1;
      let g = 225 + fbm(u, v, 16, 2, 6) * 18 - 9;
      const grout = Math.min(tu, 1 - tu, tv, 1 - tv);
      if (grout < 0.018) g = 150;
      g -= Math.pow(fbm(u, v, 3, 3, 61), 4) * 70;
      return [g, g, g * 0.98];
    });
  },
  tile_floor(size) {
    return fillPixels(size, (x, y, u, v) => {
      const T = 4;
      const iu = Math.floor(u * T), iv = Math.floor(v * T);
      const tu = (u * T) % 1, tv = (v * T) % 1;
      let g = 120 + ((iu + iv) % 2) * 22 + (hash(iu, iv, 2) - 0.5) * 14 + fbm(u, v, 16, 2, 7) * 18;
      if (Math.min(tu, 1 - tu, tv, 1 - tv) < 0.02) g = 62;
      return [g * 0.88, g * 0.97, g * 1.05];
    });
  },
  hazard_stripes(size) {
    return fillPixels(size, (x, y, u, v) => {
      const s = ((u + v) * 4) % 1;
      const yellow = s < 0.5;
      const n = fbm(u, v, 10, 3, 12);
      const wear = n > 0.68 ? 0.55 : 1;
      return yellow ? [236 * wear, 176 * wear, 18 * wear] : [28 * wear + 8, 28 * wear + 8, 30 * wear + 8];
    });
  },
  ceiling_panel(size) {
    return fillPixels(size, (x, y, u, v) => {
      const T = 2;
      const tu = (u * T) % 1, tv = (v * T) % 1;
      let g = 178 + fbm(u, v, 24, 2, 3) * 30;
      if (Math.min(tu, 1 - tu, tv, 1 - tv) < 0.02) g = 60;
      if (hash(Math.floor(x / 3), Math.floor(y / 3), 8) > 0.9) g -= 22;
      return [g, g, g * 0.97];
    });
  },
  rust_metal(size) {
    return fillPixels(size, (x, y, u, v) => {
      const n = fbm(u, v, 6, 5, 33);
      const r = fbm(u, v, 3, 4, 44);
      const rustAmt = clamp((r - 0.35) * 3, 0, 1);
      const base = 80 + n * 40;
      const rr = mix(base, 150 + n * 70, rustAmt), gg = mix(base * 1.02, 70 + n * 35, rustAmt), bb = mix(base * 1.08, 30 + n * 18, rustAmt);
      const pu = (u * 2) % 1;
      const seam = pu < 0.01 ? -35 : 0;
      return [rr + seam, gg + seam, bb + seam];
    });
  },
  asphalt(size) {
    return fillPixels(size, (x, y, u, v) => {
      let g = 48 + fbm(u, v, 12, 4, 15) * 28;
      if (hash(x, y, 4) > 0.93) g += 28;
      if (hash(x, y, 5) > 0.97) g -= 14;
      return [g, g, g * 1.04];
    });
  },
  sand_ground(size) {
    return fillPixels(size, (x, y, u, v) => {
      const n = fbm(u, v, 5, 5, 71);
      const ripple = Math.sin((u * 14 + n * 6) * Math.PI * 2) * 0.5 + 0.5;
      const g = 0.8 + n * 0.35 + ripple * 0.06 + (hash(x, y, 6) - 0.5) * 0.05;
      return [186 * g, 152 * g, 104 * g];
    });
  },
  cell_flesh(size) {
    // darkly glowing veined tissue
    const pts = [];
    for (let i = 0; i < 24; i++) pts.push([hash(i, 0, 91), hash(i, 1, 91)]);
    return fillPixels(size, (x, y, u, v) => {
      let d1 = 9, d2 = 9;
      for (const p of pts) {
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const dx = u - (p[0] + ox), dy = v - (p[1] + oy);
          const d = Math.hypot(dx, dy);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
      }
      const vein = clamp(1 - (d2 - d1) * 26, 0, 1);
      const n = fbm(u, v, 8, 4, 52);
      const pulse = Math.pow(fbm(u, v, 4, 3, 53), 2);
      const r = 70 + n * 70 + vein * 70, g = 18 + n * 20 + pulse * 120 * vein, b = 40 + n * 40 + vein * 50;
      return [r, g, b];
    });
  },
  crate_wood(size) {
    return fillPixels(size, (x, y, u, v) => {
      // frame boards around a field of planks
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const inFrame = edge < 0.12;
      const diag = Math.abs(u - v) < 0.06 || Math.abs(u + v - 1) < 0.06;
      let grain = fbm(u * 0.35, v * 6, 3, 4, 14);
      if (inFrame) grain = fbm(v * 0.35, u * 6, 3, 4, 15);
      let c = 0.55 + grain * 0.6;
      if (inFrame || diag) c += 0.12;
      if (Math.abs(edge - 0.12) < 0.008) c -= 0.4;
      if (!inFrame && !diag) { const pl = (v * 5) % 1; if (pl < 0.02) c -= 0.35; }
      return [155 * c, 108 * c, 60 * c];
    });
  },
  crate_metal(size) {
    return fillPixels(size, (x, y, u, v) => {
      const n = fbm(u, v, 8, 3, 18);
      let g = 84 + n * 30;
      const edge = Math.min(u, 1 - u, v, 1 - v);
      if (edge < 0.05) g += 24;
      if (Math.abs(edge - 0.05) < 0.008) g -= 38;
      if (edge > 0.2 && edge < 0.26) g -= 12;
      const rib = (u * 6) % 1;
      if (edge > 0.26 && rib < 0.08) g -= 18;
      return [g * 0.7, g * 0.95, g * 0.78];
    });
  },
  glass_dirty(size) {
    return fillPixels(size, (x, y, u, v) => {
      const n = fbm(u, v, 4, 4, 28);
      const sc = Math.abs(Math.sin((u * 3 + v * 7) * Math.PI * 2)) > 0.995 ? 70 : 0;
      return [150 + sc, 195 + sc, 215 + sc, clamp(46 + n * 70 + sc * 0.6)];
    });
  },
  sky_night(size) {
    const w = size * 2, h = size;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#02030a');
    g.addColorStop(0.45, '#0a1428');
    g.addColorStop(0.5, '#1c2240');
    g.addColorStop(0.56, '#2b2236');
    g.addColorStop(1, '#0c0a10');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const sx = hash(i, 1, 3) * w, sy = Math.pow(hash(i, 2, 3), 1.6) * h * 0.5;
      const b = 0.3 + hash(i, 3, 3) * 0.7;
      ctx.fillStyle = `rgba(255,255,${230 + Math.floor(hash(i, 4, 3) * 25)},${b})`;
      ctx.fillRect(sx, sy, hash(i, 5, 3) > 0.93 ? 2 : 1, hash(i, 5, 3) > 0.93 ? 2 : 1);
    }
    // faint milky way band
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#9fb4ff';
    ctx.save(); ctx.translate(w * 0.5, h * 0.2); ctx.rotate(-0.4);
    ctx.fillRect(-w, -h * 0.06, w * 2, h * 0.12);
    ctx.restore();
    return c;
  },
  logo_avemaria(size) {
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const s = size;
    ctx.fillStyle = '#0b1830'; ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#f4e9c8'; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.38, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ffb22e'; ctx.lineWidth = s * 0.012;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f4e9c8'; ctx.font = `900 ${s * 0.36}px Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('AM', s / 2, s / 2 + s * 0.02);
    return c;
  },
  // ---- internal helpers (not in the contract) ----
  gen_dev(size) {
    const c = canvas(size); const ctx = c.getContext('2d');
    ctx.fillStyle = '#d9731b'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#7a3a0a'; ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(0, i * size / 8); ctx.lineTo(size, i * size / 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * size / 8, 0); ctx.lineTo(i * size / 8, size); ctx.stroke(); }
    return c;
  },
  gen_grate(size) {
    return fillPixels(size, (x, y, u, v) => {
      const bar = ((u * 8) % 1) < 0.35 || ((v * 2) % 1) < 0.08;
      return bar ? [80, 84, 90, 255] : [0, 0, 0, 0];
    });
  },
};

const SIZES = { sky_night: 512, logo_avemaria: 512, crate_wood: 256, crate_metal: 256 };

export function hasProcTexture(key) { return Object.prototype.hasOwnProperty.call(GEN, key); }

export function makeProcTexture(key) {
  const gen = GEN[key] || GEN.gen_dev;
  const c = gen(SIZES[key] || 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = key === 'sky_night' || key === 'logo_avemaria' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.userData = { procedural: true };
  return tex;
}

/** Utility for UI / other modules: draw text on a canvas texture (signs, screens). */
export function makeTextTexture(lines, { w = 512, h = 128, bg = '#101820', fg = '#ffb22e', font = 'bold 56px "Courier New", monospace', border = null, align = 'center' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12); }
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle';
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((ln, i) => ctx.fillText(ln, align === 'center' ? w / 2 : 20, h * ((i + 1) / (arr.length + 1))));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
