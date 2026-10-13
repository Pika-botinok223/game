import * as THREE from 'three';

/** Minimal skeletal-animation helper for glTF models. Does nothing for procedural models. */
export class Animator {
  constructor(model) {
    this.mixer = null; this.actions = {}; this.current = null;
    const clips = model.userData && model.userData.clips;
    if (clips && clips.length) {
      this.mixer = new THREE.AnimationMixer(model);
      for (const c of clips) this.actions[c.name.toLowerCase()] = this.mixer.clipAction(c);
    }
  }
  get active() { return !!this.mixer; }
  play(re, { loop = true, fade = 0.2, speed = 1 } = {}) {
    if (!this.mixer) return false;
    const name = Object.keys(this.actions).find((n) => re.test(n));
    if (!name) return false;
    const a = this.actions[name];
    if (this.current === a) return true;
    a.reset(); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop; a.timeScale = speed;
    if (this.current) this.current.crossFadeTo(a, fade, false);
    a.play();
    this.current = a;
    return true;
  }
  update(dt) { if (this.mixer) this.mixer.update(dt); }
}
