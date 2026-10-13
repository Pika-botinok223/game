import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import { Crawler } from './Crawler.js';
import { assets } from '../core/Assets.js';

/** Cell nest: spawns Crawlers until destroyed by an explosion (the wrench barely scratches it). */
export class Nest extends Enemy {
  constructor(game, x, y, z, o = {}) {
    super(game);
    this.hp = o.hp || 90;
    this.pos = new THREE.Vector3(x, y, z);
    this.hitRadius = 1.1;
    this.center = new THREE.Vector3(x, y + 0.9, z);
    this.max = o.maxAlive || 3;
    this.interval = o.interval || 5;
    this.spawnT = 2;
    this.onDestroyed = o.onDestroyed || null;
    this.kids = [];
    this.group = new THREE.Group();
    this.model = assets.model('cell_nest');
    this.group.add(this.model);
    this.group.position.copy(this.pos);
    this.group.scale.setScalar(o.scale || 1.2);
    game.levelRoot.add(this.group);
    this.eggs = [];
    this.model.traverse((n) => { if (n.name === 'egg') this.eggs.push(n); });
    this.spot = game.lights.add({ pos: new THREE.Vector3(x, y + 1.2, z), color: 0x88ff44, intensity: 1.1, distance: 7, flicker: 0.3, speed: 0.3 });
    this.t = Math.random() * 10;
  }
  shove() {}
  takeDamage(n, info = {}) {
    if (this.isDead) return;
    if (info.type === 'explosion') this.hp -= n;
    else {
      this.hp -= n * 0.04; // wrench & friends only scratch it
      this.game.audio.playAt('wrench_hit_flesh', this.pos, 0.5, { pitch: 0.6 });
    }
    if (this.hp <= 0) this.die();
  }
  die() {
    this.isDead = true;
    const g = this.game;
    g.audio.playAt('explosion_2', this.pos, 0.8, { pitch: 0.8 });
    g.splat(this.center, 50);
    g.lights.remove(this.spot);
    this.group.parent && this.group.parent.remove(this.group);
    this.alive = false;
    for (const k of this.kids) if (!k.isDead) k.takeDamage(999, { type: 'explosion' });
    if (this.onDestroyed) this.onDestroyed(this);
  }
  update(dt) {
    if (this.isDead) return;
    this.t += dt;
    const s = 1 + Math.sin(this.t * 2) * 0.025;
    this.model.scale.set(s, 1 + Math.sin(this.t * 2 + 1) * 0.03, s);
    for (let i = 0; i < this.eggs.length; i++) this.eggs[i].scale.setScalar(1 + Math.sin(this.t * 3 + i) * 0.1);
    const g = this.game;
    this.kids = this.kids.filter((k) => !k.isDead);
    if (this.playerDist() < 26) {
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.kids.length < this.max) {
        this.spawnT = this.interval;
        const a = Math.random() * Math.PI * 2;
        const c = new Crawler(g, this.pos.x + Math.cos(a) * 1.4, this.pos.y + 0.3, this.pos.z + Math.sin(a) * 1.4, { aggro: true });
        g.add(c);
        this.kids.push(c);
        g.audio.playAt('crawler_idle', this.pos, 1, { pitch: 0.8 });
        g.splat(this.center, 5);
      }
    }
  }
}
