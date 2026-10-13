import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Settings } from '../core/Settings.js';

const FxShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.045 },
    uDamage: { value: 0 },
    uAberration: { value: 0 },
    uTint: { value: new THREE.Vector3(0, 0, 0) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uDamage, uAberration; uniform vec3 uTint;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * uAberration * r2 * 0.05;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - off).b;
      col *= 1.0 - uVignette * smoothstep(0.25, 0.8, length(c) * 1.35);
      col += (hash(vUv * vec2(1920.0, 1080.0)) - 0.5) * uGrain;
      col = mix(col, vec3(0.7, 0.02, 0.02) * (0.4 + 0.6 * smoothstep(0.0, 0.5, length(c))), uDamage * 0.55);
      col += uTint;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.0;
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.autoClear = true;
    this.camera = new THREE.PerspectiveCamera(Settings.get('fov'), 16 / 9, 0.05, 3000);
    this.camera.rotation.order = 'YXZ';
    this.viewScene = new THREE.Scene();
    this.viewCamera = new THREE.PerspectiveCamera(55, 16 / 9, 0.01, 20);
    const vl = new THREE.HemisphereLight(0xffffff, 0x445566, 1.4);
    const vd = new THREE.DirectionalLight(0xfff2dd, 1.8); vd.position.set(0.5, 1, 0.8);
    this.viewScene.add(vl, vd);
    this.scene = new THREE.Scene();
    this.fx = FxShader.uniforms;
    this.effectsOn = Settings.get('effects');
    this.renderViewmodel = false;
    this._buildComposer();
    window.addEventListener('resize', () => this.resize());
    Settings.onChange((k, v) => {
      if (k === 'fov') { this.camera.fov = v; this.camera.updateProjectionMatrix(); }
      if (k === 'effects') this.effectsOn = v;
    });
    this.resize();
  }

  _buildComposer() {
    const size = this.gl.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x || 800, size.y || 600, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.gl, rt);
    this.mainPass = new RenderPass(this.scene, this.camera);
    this.viewPass = new RenderPass(this.viewScene, this.viewCamera);
    this.viewPass.clear = false; this.viewPass.clearDepth = true;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x || 800, size.y || 600), 0.45, 0.6, 0.85);
    this.fxPass = new ShaderPass(FxShader);
    this.outPass = new OutputPass();
    this.composer.addPass(this.mainPass);
    this.composer.addPass(this.viewPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.fxPass);
    this.composer.addPass(this.outPass);
  }

  setScene(scene) { this.scene = scene; this.mainPass.scene = scene; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.gl.setPixelRatio(dpr);
    this.gl.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = w / h; this.viewCamera.updateProjectionMatrix();
    this.heightPx = h * dpr;
  }

  render(time) {
    this.fx.uTime.value = (time % 100);
    this.fx.uVignette.value = this.effectsOn ? 0.32 : 0.0;
    this.fx.uGrain.value = this.effectsOn ? 0.04 : 0.0;
    if (this.effectsOn) {
      this.viewPass.enabled = this.renderViewmodel;
      this.composer.render();
    } else {
      this.gl.autoClear = true;
      this.gl.render(this.scene, this.camera);
      if (this.renderViewmodel) {
        this.gl.autoClear = false;
        this.gl.clearDepth();
        this.gl.render(this.viewScene, this.viewCamera);
        this.gl.autoClear = true;
      }
    }
  }
}
