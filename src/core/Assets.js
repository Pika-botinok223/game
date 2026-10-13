// Asset loader: reads public/assets/manifest.json (if present) and falls back procedurally for every key.
// Nothing here is ever fatal: a missing manifest, file, or decode error just means the procedural version is used.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { makeProcTexture } from '../render/ProcTextures.js';
import { PROC_MODELS } from '../render/ProcModels.js';
import { synthSfx, synthMusic } from './synth.js';

const BASE = 'assets/';
const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const NO_ASSETS = params.has('noassets');
const NO_GLB = params.has('noglb') || NO_ASSETS;

// Models that are always built procedurally (animated / bespoke rigs / viewmodels).
const ALWAYS_PROC = new Set(['rocket_booster', 'spaceship_dx90', 'tram', 'manipulator']);

function xhr(url, type) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.responseType = type;
    x.timeout = 20000;
    x.onload = () => ((x.status >= 200 && x.status < 300) || (x.status === 0 && x.response) ? resolve(x.response) : reject(new Error(url + ' ' + x.status)));
    x.onerror = () => reject(new Error('network ' + url));
    x.ontimeout = () => reject(new Error('timeout ' + url));
    x.send();
  });
}

class AssetsClass {
  constructor() {
    this.manifest = { textures: {}, models: {}, sfx: {}, music: {} };
    this.hasManifest = false;
    this.textures = new Map();
    this.materials = new Map();
    this.buffers = new Map();     // loaded from files
    this.synthCache = new Map();  // procedural audio
    this.glbs = new Map();
    this.ctx = null;
    this.loadReport = { textures: 0, models: 0, sfx: 0, music: 0, failed: [] };
  }

  async init(audioCtx, onProgress = () => {}) {
    this.ctx = audioCtx;
    if (!NO_ASSETS) {
      try {
        const m = await xhr(BASE + 'manifest.json', 'json');
        if (m && typeof m === 'object') {
          this.manifest = { textures: m.textures || {}, models: m.models || {}, sfx: m.sfx || {}, music: m.music || {} };
          this.hasManifest = true;
        }
      } catch (e) { /* no manifest: fully procedural */ }
    }
    const jobs = [];
    const add = (fn) => jobs.push(fn);
    for (const [k, v] of Object.entries(this.manifest.textures)) add(() => this._loadTexture(k, v));
    for (const [k, v] of Object.entries(this.manifest.sfx)) add(() => this._loadAudio('sfx', k, v));
    if (!NO_GLB) for (const [k, v] of Object.entries(this.manifest.models)) { if (!ALWAYS_PROC.has(k)) add(() => this._loadGLB(k, v)); }
    let done = 0;
    const total = jobs.length || 1;
    // modest concurrency
    let idx = 0;
    const worker = async () => {
      while (idx < jobs.length) {
        const j = jobs[idx++];
        try { await j(); } catch (e) { /* individual failure ignored */ }
        done++; onProgress(done / total);
      }
    };
    await Promise.race([
      Promise.all(Array.from({ length: 8 }, worker)),
      new Promise((r) => setTimeout(r, 25000)),
    ]);
    onProgress(1);
  }

  _loadTexture(key, entry) {
    return new Promise((resolve) => {
      const path = typeof entry === 'string' ? entry : entry.path;
      if (!path) return resolve();
      const loader = new THREE.TextureLoader();
      loader.load(BASE + path, (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        if (!key.endsWith('_normal')) tex.colorSpace = THREE.SRGBColorSpace;
        if (key === 'sky_night' || key === 'logo_avemaria') tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.userData = { fromFile: true, entry };
        this.textures.set(key, tex);
        this.loadReport.textures++;
        resolve();
      }, undefined, () => { this.loadReport.failed.push('texture:' + key); resolve(); });
    });
  }

  async _loadAudio(kind, key, entry) {
    const path = typeof entry === 'string' ? entry : entry.path;
    if (!path || !this.ctx) return;
    try {
      const ab = await xhr(BASE + path, 'arraybuffer');
      const buf = await new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej));
      this.buffers.set(key, buf);
      this.loadReport[kind]++;
    } catch (e) { this.loadReport.failed.push(kind + ':' + key); }
  }

  /** Load a (large) music track on demand. Resolves with a buffer or null. */
  async loadMusic(key) {
    if (this.buffers.has(key)) return this.buffers.get(key);
    const entry = this.manifest.music[key];
    if (entry) {
      if (!this._musicLoading) this._musicLoading = new Map();
      if (!this._musicLoading.has(key)) this._musicLoading.set(key, this._loadAudio('music', key, entry).then(() => this.buffers.get(key) || null));
      const b = await this._musicLoading.get(key);
      if (b) return b;
    }
    return this.audioBuffer(key);
  }

  async _loadGLB(key, entry) {
    const path = typeof entry === 'string' ? entry : entry.path;
    if (!path) return;
    try {
      const ab = await xhr(BASE + path, 'arraybuffer');
      const loader = new GLTFLoader();
      const gltf = await new Promise((res, rej) => loader.parse(ab, BASE + path.replace(/[^/]*$/, ''), res, rej));
      this.glbs.set(key, { scene: gltf.scene, animations: gltf.animations || [], scale: (typeof entry === 'object' && entry.scale) || 1 });
      this.loadReport.models++;
    } catch (e) { this.loadReport.failed.push('model:' + key); }
  }

  // ---------------------------------------------------------------- textures / materials
  texture(key) {
    let t = this.textures.get(key);
    if (!t) {
      t = makeProcTexture(key);
      this.textures.set(key, t);
    }
    return t;
  }

  /** Cached MeshStandardMaterial. `tex` may be null for flat colours. */
  material(tex, o = {}) {
    const id = tex + '|' + JSON.stringify(o);
    let m = this.materials.get(id);
    if (m) return m;
    const params = {
      color: o.color !== undefined ? o.color : 0xffffff,
      roughness: o.roughness !== undefined ? o.roughness : 0.85,
      metalness: o.metalness !== undefined ? o.metalness : 0.05,
      side: o.side || THREE.FrontSide,
      transparent: !!o.transparent,
      opacity: o.opacity !== undefined ? o.opacity : 1,
      depthWrite: o.depthWrite !== undefined ? o.depthWrite : !o.transparent,
    };
    if (o.emissive !== undefined) { params.emissive = o.emissive; params.emissiveIntensity = o.emissiveIntensity !== undefined ? o.emissiveIntensity : 1; }
    if (tex) {
      params.map = this.texture(tex);
      const n = this.textures.get(tex + '_normal');
      if (n && n.userData && n.userData.fromFile) params.normalMap = n;
    }
    if (o.basic) { m = new THREE.MeshBasicMaterial({ color: params.color, map: params.map, transparent: params.transparent, opacity: params.opacity, side: params.side, depthWrite: params.depthWrite }); }
    else m = new THREE.MeshStandardMaterial(params);
    if (o.fog === false) m.fog = false;
    this.materials.set(id, m);
    return m;
  }

  // ---------------------------------------------------------------- models
  /** Returns a fresh Group. Uses the GLB if one loaded, fitted to the procedural variant's bounds. */
  model(key, opts = {}) {
    const builder = PROC_MODELS[key];
    const proc = builder ? builder(this, opts) : this._fallbackBox(key);
    const g = this.glbs.get(key);
    if (!g || ALWAYS_PROC.has(key) || opts.procedural) return proc;
    try {
      const target = new THREE.Box3().setFromObject(proc);
      const ts = target.getSize(new THREE.Vector3());
      const obj = SkeletonUtils.clone(g.scene);
      const wrapper = new THREE.Group();
      wrapper.add(obj);
      const bb = new THREE.Box3().setFromObject(obj);
      const sz = bb.getSize(new THREE.Vector3());
      if (!isFinite(sz.y) || sz.y < 1e-4) return proc;
      let s;
      if (opts.fit === 'height' || /^npc_|crawler|spitter/.test(key)) s = ts.y / sz.y;
      else s = Math.min(ts.x / Math.max(sz.x, 1e-3), ts.y / Math.max(sz.y, 1e-3), ts.z / Math.max(sz.z, 1e-3));
      s *= opts.scale || 1;
      obj.scale.multiplyScalar(s);
      const bb2 = new THREE.Box3().setFromObject(obj);
      const c = bb2.getCenter(new THREE.Vector3());
      obj.position.set(-c.x, -bb2.min.y, -c.z);
      wrapper.userData.clips = g.animations;
      wrapper.userData.glb = true;
      wrapper.userData.size = ts;
      wrapper.traverse((n) => { if (n.isMesh) { n.frustumCulled = false; } });
      return wrapper;
    } catch (e) {
      return proc;
    }
  }

  _fallbackBox(key) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.material('gen_dev')));
    g.children[0].position.y = 0.25;
    g.name = key;
    return g;
  }

  // ---------------------------------------------------------------- audio buffers
  /** AudioBuffer from file, else procedural. Never throws; returns null if nothing exists. */
  audioBuffer(key) {
    const b = this.buffers.get(key);
    if (b) return b;
    if (!this.ctx) return null;
    if (this.synthCache.has(key)) return this.synthCache.get(key);
    let buf = null;
    try { buf = synthSfx(this.ctx, key) || synthMusic(this.ctx, key); } catch (e) { console.warn('synth failed', key, e); }
    this.synthCache.set(key, buf);
    return buf;
  }

  /** Collect author credits from the manifest (used by the in-game credits roll). */
  credits() {
    const out = [];
    const seen = new Set();
    for (const kind of ['textures', 'models', 'sfx', 'music']) {
      for (const [key, e] of Object.entries(this.manifest[kind] || {})) {
        if (!e || typeof e !== 'object') continue;
        let author = e.author || e.creator || '';
        if (!author && e.source) {
          const m = /github\.com\/([^/]+)/.exec(e.source) || /https?:\/\/([^/]+)/.exec(e.source);
          if (m) author = m[1];
        }
        const license = e.license || '';
        const id = author + '|' + license;
        if (author && !seen.has(id)) { seen.add(id); out.push({ author, license, source: e.source || '', kind, key }); }
      }
    }
    return out;
  }
}

export const assets = new AssetsClass();
