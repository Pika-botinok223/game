// WebAudio manager: sfx (2D / positional), loops, music crossfades. All failure paths are silent.
import { assets } from './Assets.js';
import { Settings } from './Settings.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
    } catch (e) { this.ctx = null; }
    this.lastPlayed = new Map();
    this.musicKey = null;
    this.musicNode = null;
    this.musicToken = 0;
    if (!this.ctx) return;
    const c = this.ctx;
    this.master = c.createGain();
    this.sfxBus = c.createGain();
    this.musicBus = c.createGain();
    this.voiceBus = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.sfxBus.connect(comp); this.musicBus.connect(comp); comp.connect(this.master); this.master.connect(c.destination);
    this.applySettings();
    Settings.onChange(() => this.applySettings());
    // browsers keep the context suspended until a user gesture
    const unlock = () => { this.resume(); };
    for (const ev of ['pointerdown', 'keydown', 'mousedown']) window.addEventListener(ev, unlock, { passive: true });
  }

  applySettings() {
    if (!this.ctx) return;
    this.master.gain.value = Settings.get('master');
    this.musicBus.gain.value = Settings.get('music');
    this.sfxBus.gain.value = Settings.get('sfx');
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }

  /** variant-aware key: 'footstep_metal' -> footstep_metal_1..n */
  variant(base, n) { return `${base}_${1 + Math.floor(Math.random() * n)}`; }

  /**
   * Play a one-shot. opts: {vol, pitch, pos:{x,y,z}, loop, bus, throttle}
   * Returns a handle {stop(fadeSec), setVolume(v), source} or null.
   */
  play(key, opts = {}) {
    if (!this.ctx) return null;
    const now = performance.now();
    const throttle = opts.throttle !== undefined ? opts.throttle : 35;
    const last = this.lastPlayed.get(key) || 0;
    if (!opts.loop && now - last < throttle) return null;
    this.lastPlayed.set(key, now);
    const buf = assets.audioBuffer(key);
    if (!buf) return null;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = !!opts.loop;
    src.playbackRate.value = (opts.pitch || 1) * (opts.jitter ? 1 + (Math.random() - 0.5) * opts.jitter : 1);
    const g = c.createGain();
    g.gain.value = opts.vol !== undefined ? opts.vol : 1;
    src.connect(g);
    let out = g;
    if (opts.pos) {
      const p = c.createPanner();
      p.panningModel = 'equalpower';
      p.distanceModel = 'inverse';
      p.refDistance = opts.ref || 4;
      p.rolloffFactor = opts.rolloff || 1.3;
      p.maxDistance = 120;
      if (p.positionX) { p.positionX.value = opts.pos.x; p.positionY.value = opts.pos.y; p.positionZ.value = opts.pos.z; }
      else p.setPosition(opts.pos.x, opts.pos.y, opts.pos.z);
      g.connect(p); out = p;
    }
    out.connect(opts.bus || this.sfxBus);
    src.start(0, opts.offset || 0);
    const handle = {
      source: src, gain: g,
      stop: (fade = 0.05) => {
        try {
          const t = c.currentTime;
          g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
          src.stop(t + fade + 0.02);
        } catch (e) { /* already stopped */ }
      },
      setVolume: (v, ramp = 0.1) => { const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + ramp); },
      setPitch: (p) => { try { src.playbackRate.value = p; } catch (e) { /* ignore */ } },
    };
    return handle;
  }
  playAt(key, pos, vol = 1, opts = {}) { return this.play(key, { ...opts, pos, vol }); }
  playVar(base, n, opts = {}) { return this.play(this.variant(base, n), opts); }

  loop(key, opts = {}) { return this.play(key, { ...opts, loop: true, throttle: 0 }); }

  async music(key, { fade = 1.5, vol = 1 } = {}) {
    if (!this.ctx) return;
    if (this.musicKey === key) return;
    this.musicKey = key;
    const token = ++this.musicToken;
    this._fadeOutMusic(fade);
    if (!key) return;
    let buf = null;
    try { buf = await assets.loadMusic(key); } catch (e) { buf = null; }
    if (!buf || token !== this.musicToken) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = c.createGain();
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + fade);
    src.connect(g); g.connect(this.musicBus);
    src.start();
    this.musicNode = { src, g };
  }
  _fadeOutMusic(fade) {
    const n = this.musicNode;
    if (!n) return;
    this.musicNode = null;
    try {
      const t = this.ctx.currentTime;
      n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(0, t + fade);
      n.src.stop(t + fade + 0.1);
    } catch (e) { /* ignore */ }
  }
  setMusicVolume(v, ramp = 0.5) { if (this.musicNode) { const t = this.ctx.currentTime; this.musicNode.g.gain.cancelScheduledValues(t); this.musicNode.g.gain.setValueAtTime(this.musicNode.g.gain.value, t); this.musicNode.g.gain.linearRampToValueAtTime(v, t + ramp); } }

  updateListener(camera) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const p = camera.position;
    const e = camera.matrixWorld.elements;
    const fx = -e[8], fy = -e[9], fz = -e[10];
    const ux = e[4], uy = e[5], uz = e[6];
    if (l.positionX) {
      const t = this.ctx.currentTime;
      l.positionX.setValueAtTime(p.x, t); l.positionY.setValueAtTime(p.y, t); l.positionZ.setValueAtTime(p.z, t);
      l.forwardX.setValueAtTime(fx, t); l.forwardY.setValueAtTime(fy, t); l.forwardZ.setValueAtTime(fz, t);
      l.upX.setValueAtTime(ux, t); l.upY.setValueAtTime(uy, t); l.upZ.setValueAtTime(uz, t);
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(fx, fy, fz, ux, uy, uz); }
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  stopAllLoops() { /* loops are individually owned by their creators */ }
}
