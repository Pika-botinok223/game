// Procedural WebAudio-buffer synthesis: every SFX / music key in PLAN.md section 6 has a recipe here,
// so the game is fully audible with zero asset files.
const TAU = Math.PI * 2;
let seedState = 1;
function rnd() { seedState = (seedState * 1664525 + 1013904223) >>> 0; return seedState / 4294967296; }
function seedFrom(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } seedState = h >>> 0 || 1; }
const noise = () => rnd() * 2 - 1;

class Rec {
  constructor(ctx, dur, sr = 32000) {
    this.sr = sr; this.n = Math.floor(dur * sr); this.d = new Float32Array(this.n); this.ctx = ctx;
  }
  /** fn(t, i) -> sample value, added into the buffer. */
  add(fn, start = 0, dur = null) {
    const s0 = Math.floor(start * this.sr), s1 = dur === null ? this.n : Math.min(this.n, s0 + Math.floor(dur * this.sr));
    for (let i = s0; i < s1; i++) this.d[i] += fn((i - s0) / this.sr, i - s0);
    return this;
  }
  lp(cut) { // one-pole lowpass over whole buffer
    const a = 1 - Math.exp(-TAU * cut / this.sr); let y = 0;
    for (let i = 0; i < this.n; i++) { y += a * (this.d[i] - y); this.d[i] = y; }
    return this;
  }
  hp(cut) {
    const a = 1 - Math.exp(-TAU * cut / this.sr); let y = 0;
    for (let i = 0; i < this.n; i++) { y += a * (this.d[i] - y); this.d[i] -= y; }
    return this;
  }
  gain(g) { for (let i = 0; i < this.n; i++) this.d[i] *= g; return this; }
  fade(inS = 0.003, outS = 0.01) {
    const a = Math.floor(inS * this.sr), b = Math.floor(outS * this.sr);
    for (let i = 0; i < Math.min(a, this.n); i++) this.d[i] *= i / a;
    for (let i = 0; i < Math.min(b, this.n); i++) this.d[this.n - 1 - i] *= i / b;
    return this;
  }
  norm(peak = 0.9) {
    let m = 0; for (let i = 0; i < this.n; i++) m = Math.max(m, Math.abs(this.d[i]));
    if (m > 0) this.gain(peak / m);
    return this;
  }
  buffer() {
    const b = this.ctx.createBuffer(1, this.n, this.sr);
    b.copyToChannel(this.d, 0);
    return b;
  }
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) * d));
const sine = (f, t) => Math.sin(TAU * f * t);
const saw = (f, t) => 2 * ((f * t) % 1) - 1;
const square = (f, t) => ((f * t) % 1 < 0.5 ? 1 : -1);
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function thump(r, f0, f1, dur, amp, start = 0) {
  let ph = 0;
  r.add((t) => { const f = f1 + (f0 - f1) * Math.exp(-t * 18); ph += TAU * f / r.sr; return Math.sin(ph) * amp * Math.exp(-t / (dur * 0.35)); }, start, dur);
}
function nburst(r, dur, decay, amp, start = 0) { r.add((t) => noise() * amp * Math.exp(-t * decay), start, dur); }
function ring(r, f, dur, amp, decay, start = 0) { r.add((t) => sine(f, t) * amp * Math.exp(-t * decay), start, dur); }

const RECIPES = {
  footstep_concrete(ctx, v) {
    const r = new Rec(ctx, 0.22);
    nburst(r, 0.2, 28 + v * 3, 1);
    r.lp(900 + v * 150);
    thump(r, 110 + v * 8, 60, 0.12, 0.9);
    return r.fade().norm(0.55).buffer();
  },
  footstep_metal(ctx, v) {
    const r = new Rec(ctx, 0.35);
    nburst(r, 0.12, 40, 0.8); r.hp(500);
    const f = 380 + v * 71;
    ring(r, f, 0.3, 0.5, 14); ring(r, f * 2.41, 0.25, 0.3, 20); ring(r, f * 3.77, 0.2, 0.15, 26);
    thump(r, 90, 55, 0.1, 0.5);
    return r.fade().norm(0.5).buffer();
  },
  jump_land(ctx) {
    const r = new Rec(ctx, 0.35);
    nburst(r, 0.3, 14, 0.8); r.lp(700); thump(r, 90, 45, 0.25, 1.2);
    return r.fade().norm(0.7).buffer();
  },
  wrench_swing(ctx) {
    const r = new Rec(ctx, 0.35);
    r.add((t) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.3)) * 0.8, 0, 0.3);
    r.hp(300).lp(2500);
    return r.fade(0.02, 0.05).norm(0.4).buffer();
  },
  wrench_hit_flesh(ctx) {
    const r = new Rec(ctx, 0.3);
    nburst(r, 0.2, 22, 1); r.lp(1300); thump(r, 150, 70, 0.2, 1.2);
    return r.fade().norm(0.75).buffer();
  },
  wrench_hit_metal(ctx) {
    const r = new Rec(ctx, 0.7);
    nburst(r, 0.04, 80, 1);
    ring(r, 520, 0.6, 0.6, 7); ring(r, 1337, 0.5, 0.45, 9); ring(r, 2113, 0.4, 0.3, 12); ring(r, 3170, 0.3, 0.15, 16);
    return r.fade().norm(0.7).buffer();
  },
  manipulator_punt(ctx) {
    const r = new Rec(ctx, 0.7);
    thump(r, 260, 40, 0.6, 1.3); nburst(r, 0.25, 12, 0.7); r.lp(2200);
    r.add((t) => sine(900 - t * 1400, t) * 0.2 * Math.exp(-t * 8), 0, 0.3);
    return r.fade().norm(0.85).buffer();
  },
  manipulator_grab(ctx) {
    const r = new Rec(ctx, 0.45);
    let ph = 0;
    r.add((t) => { ph += TAU * (160 + t * 700) / r.sr; return (Math.sin(ph) + 0.4 * Math.sin(ph * 2.01)) * 0.5 * Math.min(1, t / 0.05) * Math.exp(-t * 3); });
    return r.fade().norm(0.55).buffer();
  },
  manipulator_drop(ctx) {
    const r = new Rec(ctx, 0.4);
    let ph = 0;
    r.add((t) => { ph += TAU * (520 - t * 800) / r.sr; return Math.sin(ph) * 0.5 * Math.exp(-t * 7); });
    thump(r, 120, 60, 0.2, 0.5);
    return r.fade().norm(0.5).buffer();
  },
  manipulator_dryfire(ctx) {
    const r = new Rec(ctx, 0.15);
    nburst(r, 0.03, 120, 1); r.hp(1500); ring(r, 1900, 0.1, 0.3, 50);
    return r.fade().norm(0.4).buffer();
  },
  door_open(ctx) {
    const r = new Rec(ctx, 1.1);
    let ph = 0;
    r.add((t) => { ph += TAU * (180 + 90 * Math.sin(Math.min(t, 0.9) * 3.4)) / r.sr; return saw(ph / TAU, 0) * 0 + Math.sin(ph) * 0.3 * Math.min(1, t / 0.1) * (t < 0.95 ? 1 : 0); });
    nburst(r, 0.9, 1, 0.12); r.lp(1800);
    thump(r, 100, 50, 0.15, 0.9, 0.0); thump(r, 90, 45, 0.15, 0.7, 0.93);
    return r.fade().norm(0.55).buffer();
  },
  door_close(ctx) {
    const r = new Rec(ctx, 0.9);
    let ph = 0;
    r.add((t) => { ph += TAU * (260 - 80 * t) / r.sr; return Math.sin(ph) * 0.3 * (t < 0.6 ? 1 : 0); });
    thump(r, 110, 45, 0.25, 1.2, 0.6); nburst(r, 0.2, 18, 0.5, 0.6);
    return r.lp(3000).fade().norm(0.6).buffer();
  },
  button_press(ctx) {
    const r = new Rec(ctx, 0.3);
    nburst(r, 0.03, 100, 1); r.hp(800); ring(r, 1100, 0.25, 0.5, 18); ring(r, 1650, 0.2, 0.35, 22, 0.05);
    return r.fade().norm(0.5).buffer();
  },
  button_denied(ctx) {
    const r = new Rec(ctx, 0.5);
    r.add((t) => square(120, t) * 0.4 * ((t % 0.22) < 0.14 ? 1 : 0), 0, 0.45);
    r.lp(900);
    return r.fade().norm(0.5).buffer();
  },
  alarm_loop(ctx) {
    const r = new Rec(ctx, 2.0);
    let ph = 0;
    r.add((t) => { const f = 640 + 260 * (0.5 + 0.5 * Math.sin(TAU * t / 1.0 - Math.PI / 2)); ph += TAU * f / r.sr; return (Math.sin(ph) + 0.35 * Math.sin(ph * 2)) * 0.5; });
    return r.lp(3000).norm(0.45).buffer();
  },
  explosion(ctx, v) {
    const r = new Rec(ctx, 1.8);
    nburst(r, 1.7, 2.8 + v, 1); r.lp(1100 + v * 300);
    thump(r, 180, 32, 1.5, 1.8);
    const r2 = new Rec(ctx, 1.8); nburst(r2, 0.12, 40, 1);
    for (let i = 0; i < r.n; i++) r.d[i] += r2.d[i] * 0.7;
    return r.fade(0.002, 0.2).norm(0.95).buffer();
  },
  glass_break(ctx) {
    const r = new Rec(ctx, 1.0);
    nburst(r, 0.15, 25, 1); r.hp(2500);
    for (let i = 0; i < 24; i++) ring(r, 2500 + rnd() * 5000, 0.2, 0.18, 22, 0.02 + rnd() * 0.6);
    return r.fade().norm(0.6).buffer();
  },
  metal_impact(ctx, v) {
    const r = new Rec(ctx, 0.6);
    const f = 260 + v * 140;
    nburst(r, 0.03, 90, 1); thump(r, 140, 70, 0.1, 0.8);
    ring(r, f, 0.5, 0.5, 9); ring(r, f * 2.7, 0.4, 0.3, 13); ring(r, f * 4.1, 0.3, 0.15, 18);
    return r.fade().norm(0.6).buffer();
  },
  crawler_idle(ctx) {
    const r = new Rec(ctx, 0.5);
    let ph = 0;
    r.add((t) => { ph += TAU * (420 + 250 * Math.sin(t * 28) + t * 200) / r.sr; return Math.sin(ph) * 0.4 * Math.sin(Math.PI * Math.min(1, t / 0.4)); }, 0, 0.4);
    nburst(r, 0.4, 5, 0.1); r.lp(2500);
    return r.fade().norm(0.4).buffer();
  },
  crawler_attack(ctx) {
    const r = new Rec(ctx, 0.5);
    let ph = 0;
    r.add((t) => { ph += TAU * (900 - t * 500 + 120 * Math.sin(t * 60)) / r.sr; return (saw(ph / TAU, 0) * 0 + Math.sin(ph) + 0.5 * Math.sin(ph * 2.5)) * 0.5 * Math.exp(-t * 4); });
    nburst(r, 0.45, 6, 0.25); r.hp(600).lp(4500);
    return r.fade().norm(0.6).buffer();
  },
  crawler_die(ctx) {
    const r = new Rec(ctx, 0.7);
    let ph = 0;
    r.add((t) => { ph += TAU * (600 * Math.exp(-t * 3) + 80) / r.sr; return (Math.sin(ph) + 0.5 * Math.sin(ph * 1.51)) * 0.5 * Math.exp(-t * 4.5); });
    nburst(r, 0.4, 8, 0.3); r.lp(2200);
    return r.fade().norm(0.55).buffer();
  },
  spitter_spit(ctx) {
    const r = new Rec(ctx, 0.5);
    nburst(r, 0.3, 9, 1); r.lp(1800);
    let ph = 0; r.add((t) => { ph += TAU * (300 + t * 900) / r.sr; return Math.sin(ph) * 0.4 * Math.exp(-t * 7); });
    return r.fade().norm(0.55).buffer();
  },
  spitter_die(ctx) {
    const r = new Rec(ctx, 1.0);
    let ph = 0; r.add((t) => { ph += TAU * (160 + 40 * Math.sin(t * 40) - t * 80) / r.sr; return Math.sin(ph) * 0.6 * Math.exp(-t * 3); });
    nburst(r, 0.8, 4, 0.35); r.lp(900);
    return r.fade().norm(0.6).buffer();
  },
  acid_hit(ctx) {
    const r = new Rec(ctx, 0.7);
    nburst(r, 0.65, 4, 0.8); r.hp(3000);
    for (let i = 0; i < 18; i++) ring(r, 3000 + rnd() * 3000, 0.04, 0.15, 60, rnd() * 0.5);
    return r.fade().norm(0.5).buffer();
  },
  player_hurt(ctx, v) {
    const r = new Rec(ctx, 0.35);
    let ph = 0;
    r.add((t) => { ph += TAU * (210 - v * 25 - t * 120) / r.sr; return saw(ph / TAU, 0) * 0 + (Math.sin(ph) + 0.5 * Math.sin(ph * 2) + 0.25 * Math.sin(ph * 3)) * 0.5 * env(t, 0.01, 7); });
    nburst(r, 0.12, 30, 0.35);
    return r.lp(1800).fade().norm(0.6).buffer();
  },
  suit_beep(ctx) {
    const r = new Rec(ctx, 0.5);
    ring(r, 880, 0.2, 0.5, 7); ring(r, 1320, 0.3, 0.45, 8, 0.12);
    return r.fade().norm(0.45).buffer();
  },
  suit_charge_loop(ctx) {
    const r = new Rec(ctx, 1.0);
    r.add((t) => sine(220, t) * 0.4 + sine(330, t) * 0.25 + sine(440, t) * 0.12 * (0.5 + 0.5 * sine(4, t)));
    r.add((t) => ((t % 0.5) < 0.04 ? sine(1760, t) * 0.25 : 0));
    return r.norm(0.4).buffer();
  },
  health_charge_loop(ctx) {
    const r = new Rec(ctx, 1.0);
    r.add((t) => sine(261.63, t) * 0.35 + sine(392, t) * 0.25 + sine(523.25, t) * 0.18 * (0.5 + 0.5 * sine(3, t)));
    r.add((t) => ((t % 0.25) < 0.03 ? sine(1568, t) * 0.2 : 0));
    return r.norm(0.4).buffer();
  },
  pickup_item(ctx) {
    const r = new Rec(ctx, 0.5);
    ring(r, 660, 0.2, 0.5, 9); ring(r, 990, 0.35, 0.5, 8, 0.07); ring(r, 1320, 0.3, 0.2, 9, 0.07);
    return r.fade().norm(0.5).buffer();
  },
  valve_turn(ctx) {
    const r = new Rec(ctx, 1.0);
    r.add((t) => { const g = (t * 5.5) % 1; return noise() * 0.5 * Math.pow(Math.sin(Math.PI * g), 0.7) + sine(150 + 30 * Math.sin(t * 20), t) * 0.4; });
    r.lp(1300);
    return r.fade(0.02, 0.05).norm(0.5).buffer();
  },
  tram_loop(ctx) {
    const r = new Rec(ctx, 4.0);
    r.add(() => noise() * 0.5); r.lp(280);
    for (let k = 0; k < 16; k++) { const t0 = k * 0.25; thump(r, 110, 60, 0.12, 0.45, t0); thump(r, 100, 55, 0.12, 0.35, t0 + 0.07); }
    r.add((t) => sine(55, t) * 0.5 + sine(110, t) * 0.2);
    return r.norm(0.55).buffer();
  },
  tram_brake(ctx) {
    const r = new Rec(ctx, 3.0);
    r.add((t) => { const f = 2400 - t * 520; return (saw(f, t) * 0.25 + noise() * 0.25) * Math.min(1, t / 0.3) * Math.exp(-t * 0.6); });
    r.hp(900).lp(5000);
    thump(r, 70, 40, 0.6, 0.6, 2.4);
    return r.fade(0.05, 0.4).norm(0.5).buffer();
  },
  elevator_loop(ctx) {
    const r = new Rec(ctx, 2.0);
    r.add((t) => sine(70, t) * 0.5 + sine(140, t) * 0.25 + sine(210, t) * 0.1 * sine(2, t));
    r.add(() => noise() * 0.08); r.lp(900);
    return r.norm(0.5).buffer();
  },
  rumble_loop(ctx) {
    const r = new Rec(ctx, 2.0);
    r.add(() => noise()); r.lp(70); r.gain(18);
    r.add((t) => sine(34, t) * 0.4 + sine(51, t) * 0.25);
    return r.norm(0.9).buffer();
  },
  rocket_launch_loop(ctx) {
    const r = new Rec(ctx, 3.0);
    r.add(() => noise()); r.lp(1400); r.gain(2);
    const r2 = new Rec(ctx, 3.0); r2.add(() => noise()); r2.lp(180); r2.gain(5);
    for (let i = 0; i < r.n; i++) r.d[i] += r2.d[i];
    r.add((t) => sine(46, t) * 0.5);
    return r.norm(0.95).buffer();
  },
  stage_separation(ctx) {
    const r = new Rec(ctx, 1.6);
    thump(r, 220, 40, 0.5, 1.2); nburst(r, 0.06, 60, 1);
    nburst(r, 1.4, 2.5, 0.6, 0.05); r.hp(1500);
    ring(r, 300, 0.3, 0.4, 10);
    return r.fade().norm(0.8).buffer();
  },
  pa_chime(ctx) {
    const r = new Rec(ctx, 1.6);
    const notes = [659.25, 523.25, 587.33];
    notes.forEach((f, i) => { ring(r, f, 0.8, 0.5, 4.5, i * 0.38); ring(r, f * 2, 0.5, 0.15, 7, i * 0.38); });
    return r.fade().norm(0.55).buffer();
  },
  ui_hover(ctx) {
    const r = new Rec(ctx, 0.08);
    ring(r, 1400, 0.06, 0.5, 60);
    return r.fade(0.002, 0.02).norm(0.3).buffer();
  },
  ui_click(ctx) {
    const r = new Rec(ctx, 0.2);
    nburst(r, 0.02, 120, 0.6); ring(r, 700, 0.15, 0.5, 25); ring(r, 1050, 0.12, 0.3, 30, 0.02);
    return r.fade().norm(0.45).buffer();
  },
  fluorescent_hum_loop(ctx) {
    const r = new Rec(ctx, 1.0);
    r.add((t) => sine(100, t) * 0.5 + sine(200, t) * 0.3 + sine(300, t) * 0.18 + sine(500, t) * 0.05);
    r.add(() => noise() * 0.015);
    return r.norm(0.2).buffer();
  },
  spark(ctx) {
    const r = new Rec(ctx, 0.4);
    for (let i = 0; i < 14; i++) nburst(r, 0.02, 120, 0.4 + rnd() * 0.6, rnd() * 0.3);
    r.hp(1800);
    ring(r, 2400, 0.1, 0.1, 40);
    return r.fade().norm(0.5).buffer();
  },
};

const MAP = [
  [/^footstep_concrete_(\d)$/, 'footstep_concrete'], [/^footstep_metal_(\d)$/, 'footstep_metal'],
  [/^explosion_(\d)$/, 'explosion'], [/^metal_impact_(\d)$/, 'metal_impact'], [/^player_hurt_(\d)$/, 'player_hurt'],
  [/^spark_(\d)$/, 'spark'],
];

export function synthSfx(ctx, key) {
  seedFrom(key);
  let name = key, v = 0;
  for (const [re, base] of MAP) { const m = re.exec(key); if (m) { name = base; v = parseInt(m[1], 10); break; } }
  const fn = RECIPES[name];
  if (!fn) return null;
  return fn(ctx, v);
}

// ---------------------------------------------------------------- music
const SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10];

const MUSIC = {
  // key: { bpm, bars, root, prog (semitone offsets of chord roots per bar), pad, bass, arp, drums, lead }
  menu_theme: { bpm: 60, bars: 8, root: 45, prog: [0, 0, -4, -4, -2, -2, -5, -5], pad: 0.5, bass: 0.35, arp: 0.0, drums: 0, bell: 0.35 },
  inbound_ambient: { bpm: 72, bars: 8, root: 50, prog: [0, 0, 5, 5, 3, 3, 7, 7], pad: 0.5, bass: 0.2, arp: 0.18, drums: 0, bell: 0.2 },
  breach_action: { bpm: 126, bars: 8, root: 40, prog: [0, 0, 0, 3, 0, 0, 5, 3], pad: 0.22, bass: 0.55, arp: 0.28, drums: 1 },
  combat_loop: { bpm: 140, bars: 8, root: 38, prog: [0, 0, 3, 3, 0, 0, 5, 7], pad: 0.2, bass: 0.6, arp: 0.3, drums: 2 },
  pad39_finale: { bpm: 112, bars: 8, root: 43, prog: [0, 3, 5, 7, 0, 3, 5, 2], pad: 0.4, bass: 0.5, arp: 0.35, drums: 1, lead: 0.28 },
  credits_theme: { bpm: 70, bars: 8, root: 48, prog: [0, 5, 3, 7, 0, 5, 7, 0], pad: 0.5, bass: 0.25, arp: 0.15, drums: 0, bell: 0.3, lead: 0.2 },
};

export function synthMusic(ctx, key) {
  const m = MUSIC[key];
  if (!m) return null;
  seedFrom(key);
  const sr = 22050;
  const beat = 60 / m.bpm, bar = beat * 4, dur = bar * m.bars;
  const r = new Rec(ctx, dur, sr);
  const phases = new Float32Array(64);
  for (let b = 0; b < m.bars; b++) {
    const t0 = b * bar, root = m.root + m.prog[b];
    // pad: detuned saws on a minor triad
    const tri = [0, 3, 7, 12];
    if (m.pad) for (let k = 0; k < tri.length; k++) {
      const f = midi(root + 12 + tri[k]);
      r.add((t) => {
        const e = Math.min(1, t / (bar * 0.4)) * Math.min(1, (bar - t) / (bar * 0.3));
        return (saw(f * 0.997, t) + saw(f * 1.004, t)) * 0.5 * e * m.pad * 0.16;
      }, t0, bar);
    }
    if (m.bass) {
      const f = midi(root - 12);
      const steps = m.drums ? 8 : 2;
      for (let s = 0; s < steps; s++) {
        const st = t0 + s * bar / steps, d = bar / steps;
        r.add((t) => (sine(f, t) + 0.35 * saw(f, t) * Math.exp(-t * 6)) * m.bass * 0.5 * env(t, 0.01, m.drums ? 7 : 1.4), st, d);
      }
    }
    if (m.arp) {
      for (let s = 0; s < 16; s++) {
        const note = root + 24 + SCALE_MINOR[(s * 3 + b) % 7];
        const f = midi(note);
        const st = t0 + s * bar / 16;
        r.add((t) => square(f, t) * m.arp * 0.12 * env(t, 0.004, 14), st, 0.3);
      }
    }
    if (m.bell && b % 2 === 0) {
      for (let s = 0; s < 3; s++) {
        const f = midi(root + 36 + SCALE_MINOR[Math.floor(rnd() * 7)]);
        const st = t0 + (s * 2 + rnd()) * beat;
        r.add((t) => (sine(f, t) + 0.3 * sine(f * 2.76, t)) * m.bell * 0.22 * Math.exp(-t * 2.2), st, 3);
      }
    }
    if (m.lead) {
      for (let s = 0; s < 4; s++) {
        const f = midi(root + 24 + SCALE_MINOR[(s * 2 + b * 2) % 7]);
        const st = t0 + s * beat;
        r.add((t) => (saw(f, t) * 0.5 + sine(f, t) * 0.5) * m.lead * 0.2 * env(t, 0.05, 1.8), st, beat * 1.5);
      }
    }
    if (m.drums) {
      for (let s = 0; s < 16; s++) {
        const st = t0 + s * bar / 16;
        if (s % 4 === 0 || (m.drums === 2 && s % 4 === 3 && b % 2)) {
          let ph = 0;
          r.add((t) => { ph += TAU * (45 + 90 * Math.exp(-t * 30)) / sr; return Math.sin(ph) * 0.9 * Math.exp(-t * 9); }, st, 0.3);
        }
        if (s % 8 === 4) r.add((t) => (noise() * 0.5 + sine(190, t) * 0.4) * 0.5 * Math.exp(-t * 18), st, 0.25);
        if (s % 2 === 1 || m.drums === 2) r.add((t) => noise() * 0.12 * Math.exp(-t * 60), st, 0.06);
      }
    }
  }
  r.lp(m.drums ? 7000 : 3500);
  // gentle crossfade-free loop: fade edges very slightly
  r.fade(0.01, 0.01);
  return r.norm(0.6).buffer();
}

export const MUSIC_KEYS = Object.keys(MUSIC);
