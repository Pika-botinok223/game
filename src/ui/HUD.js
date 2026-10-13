// HL-style HUD: HEALTH / SUIT bottom-left (amber), tool bottom-right, crosshair, damage arcs, objective text.
export class HUD {
  constructor(root) {
    this.root = document.createElement('div');
    this.root.className = 'hud off';
    this.root.innerHTML = `
      <div class="hud-box hud-left">
        <div class="hud-stat" id="hud-health"><span class="lbl">HEALTH</span><span class="num">100</span></div>
        <div class="hud-stat" id="hud-suit"><span class="lbl">SUIT</span><span class="num">0</span></div>
      </div>
      <div class="hud-box hud-right hidden" id="hud-weapon"><div class="hud-weapon"><div class="wname"></div><div class="slots"></div></div></div>
      <div class="crosshair" id="hud-cross"><span class="brk l"></span><span class="brk r"></span></div>
      <div class="dmg-wrap" id="hud-dmg"></div>
      <div class="dmg-flash" id="hud-flash"></div>
      <div class="use-prompt" id="hud-use"></div>
      <div class="use-bar" id="hud-usebar"><div></div></div>
      <div class="objective" id="hud-obj"></div>
      <div class="counter" id="hud-counter"></div>
      <div class="pickup-msg" id="hud-pick"></div>
      <div class="toast" id="hud-toast"></div>
      <div class="cam-label" id="hud-cam"></div>
    `;
    root.appendChild(this.root);
    const $ = (id) => this.root.querySelector('#' + id);
    this.el = {
      health: $('hud-health'), suit: $('hud-suit'), weapon: $('hud-weapon'), cross: $('hud-cross'), dmg: $('hud-dmg'), flash: $('hud-flash'),
      use: $('hud-use'), usebar: $('hud-usebar'), obj: $('hud-obj'), counter: $('hud-counter'), pick: $('hud-pick'), toast: $('hud-toast'), cam: $('hud-cam'),
    };
    this.arcs = [];
    for (let i = 0; i < 5; i++) {
      const a = document.createElement('div'); a.className = 'dmg-arc'; this.el.dmg.appendChild(a);
      this.arcs.push({ el: a, t: 0, ang: 0 });
    }
    this.arcIdx = 0;
    this.flash = 0;
    this.lastH = -1; this.lastS = -1;
    this.pickT = 0; this.toastT = 0;
    this.weaponsHave = {};
    this.shown = true;
    this.visible = false;
  }

  setVisible(v) { this.visible = v; this.root.classList.toggle('off', !v); }
  setSuitHud(v) { this.setVisible(v); }
  showAll(v) { this.root.style.display = v ? '' : 'none'; }

  setWeaponsAvailable(have) { this.weaponsHave = { ...have }; this._renderWeapon(); }
  setWeapon(name) { this.cur = name; this._renderWeapon(); }
  _renderWeapon() {
    const w = this.el.weapon;
    const any = this.weaponsHave.wrench || this.weaponsHave.manipulator;
    w.classList.toggle('hidden', !any);
    if (!any) return;
    const label = this.cur === 'manipulator' ? 'M-7 FIELD MANIPULATOR' : 'HYDRAULIC WRENCH';
    w.querySelector('.wname').textContent = label;
    const slot = (n, k, name) => `<span class="${this.cur === name ? 'cur' : (this.weaponsHave[name] ? '' : 'none')}">${n}</span>`;
    w.querySelector('.slots').innerHTML = slot('1', 0, 'wrench') + ' ' + slot('2', 0, 'manipulator');
  }

  setCrosshair(kind) {
    if (this._cross === kind) return;
    this._cross = kind;
    this.el.cross.className = 'crosshair ' + (kind === 'normal' ? '' : kind);
  }
  showCrosshair(v) { this.el.cross.style.display = v ? '' : 'none'; }

  setStats(health, suit) {
    health = Math.ceil(health); suit = Math.ceil(suit);
    if (health !== this.lastH) {
      const n = this.el.health.querySelector('.num'); n.textContent = health;
      this.el.health.classList.toggle('low', health <= 25);
      if (this.lastH >= 0 && health > this.lastH) { this.el.health.classList.remove('flash'); void this.el.health.offsetWidth; this.el.health.classList.add('flash'); }
      this.lastH = health;
    }
    if (suit !== this.lastS) {
      this.el.suit.querySelector('.num').textContent = suit;
      this.el.suit.classList.toggle('low', suit <= 0 && false);
      if (this.lastS >= 0 && suit > this.lastS) { this.el.suit.classList.remove('flash'); void this.el.suit.offsetWidth; this.el.suit.classList.add('flash'); }
      this.lastS = suit;
    }
  }

  damageFlash(amount) { this.flash = Math.max(this.flash, amount); }
  damageIndicator(angle) {
    const a = this.arcs[this.arcIdx++ % this.arcs.length];
    a.t = 1.4; a.ang = angle;
  }

  setObjective(text) {
    const o = this.el.obj;
    if (!text) { o.classList.remove('show'); return; }
    o.textContent = 'OBJECTIVE: ' + text;
    o.classList.add('show');
    o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash');
  }
  setCounter(label, value, max) {
    const c = this.el.counter;
    if (label === null) { c.classList.remove('show'); return; }
    c.innerHTML = `${label}<span class="big">${value} / ${max}</span>`;
    c.classList.add('show');
  }
  setPrompt(text, progress = -1) {
    this.el.use.innerHTML = text ? text : '';
    this.el.use.style.opacity = text ? 1 : 0;
    this.el.usebar.style.opacity = progress >= 0 ? 1 : 0;
    if (progress >= 0) this.el.usebar.firstElementChild.style.width = Math.round(progress * 100) + '%';
  }
  pickupMessage(t) { this.el.pick.textContent = t; this.el.pick.classList.add('show'); this.pickT = 2.4; }
  toast(t, dur = 3) { this.el.toast.textContent = t; this.el.toast.classList.add('show'); this.toastT = dur; }
  setCamLabel(t) { this.el.cam.textContent = t || ''; this.el.cam.classList.toggle('show', !!t); }

  update(dt, player) {
    this.setStats(player.health, player.suit);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.el.flash.style.opacity = this.flash.toFixed(3);
    for (const a of this.arcs) {
      if (a.t > 0) { a.t -= dt; a.el.style.opacity = Math.max(0, Math.min(1, a.t)).toFixed(2); a.el.style.transform = `rotate(${a.ang}rad)`; }
      else if (a.el.style.opacity !== '0') a.el.style.opacity = 0;
    }
    if (this.pickT > 0) { this.pickT -= dt; if (this.pickT <= 0) this.el.pick.classList.remove('show'); }
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.el.toast.classList.remove('show'); }
  }
}
