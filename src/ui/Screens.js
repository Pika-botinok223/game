import { Settings, DEFAULTS } from '../core/Settings.js';
import { Save } from '../core/Save.js';
import { CHAPTERS } from '../story/lines.js';

const OPTIONS = [
  { key: 'sensitivity', label: 'MOUSE SENSITIVITY', type: 'range', min: 0.2, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) },
  { key: 'invertY', label: 'INVERT Y AXIS', type: 'check' },
  { key: 'fov', label: 'FIELD OF VIEW', type: 'range', min: 60, max: 110, step: 1, fmt: (v) => Math.round(v) },
  { key: 'master', label: 'MASTER VOLUME', type: 'range', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) },
  { key: 'music', label: 'MUSIC VOLUME', type: 'range', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) },
  { key: 'sfx', label: 'EFFECTS VOLUME', type: 'range', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) },
  { key: 'voice', label: 'VOICE VOLUME', type: 'range', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) },
  { key: 'subtitles', label: 'SUBTITLES', type: 'check' },
  { key: 'effects', label: 'BLOOM / GRAIN / VIGNETTE', type: 'check' },
];

/** Main menu, options, chapter select, pause and death screens (DOM). */
export class Screens {
  constructor(root, game) {
    this.game = game;
    this.root = root;
    this.layer = document.createElement('div');
    root.appendChild(this.layer);
    this.current = null;
    this.optionsReturn = 'main';
  }

  sfx(k) { this.game.audio.play(k, { vol: 0.5, throttle: 50 }); }

  hide() { this.layer.innerHTML = ''; this.current = null; }

  _el(html, cls) {
    const d = document.createElement('div');
    d.className = 'screen ' + (cls || '');
    d.innerHTML = html;
    this.layer.innerHTML = '';
    this.layer.appendChild(d);
    d.querySelectorAll('.menu-item,.btn,.chapter-btn').forEach((e) => e.addEventListener('mouseenter', () => this.sfx('ui_hover')));
    return d;
  }
  _on(d, sel, fn) {
    d.querySelectorAll(sel).forEach((e) => e.addEventListener('click', (ev) => { if (e.classList.contains('disabled')) return; this.sfx('ui_click'); fn(e, ev); }));
  }

  main() {
    this.current = 'main';
    const save = Save.load();
    const d = this._el(`
      <div class="menu-main">
        <div class="logo">AVE <span>MARIA</span></div>
        <div class="tagline">A launch day like any other</div>
        <div class="menu-items">
          <div class="menu-item" data-a="new">NEW GAME</div>
          <div class="menu-item ${save ? '' : 'disabled'}" data-a="continue">CONTINUE${save ? ` <small style="opacity:.5;font-size:14px">CHAPTER ${save.chapter}</small>` : ''}</div>
          <div class="menu-item" data-a="chapters">CHAPTER SELECT</div>
          <div class="menu-item" data-a="options">OPTIONS</div>
          <div class="menu-item" data-a="quit">QUIT</div>
        </div>
        <div class="menu-foot">DX-90 / GABRIEL RLV &nbsp;·&nbsp; PAD 39 &nbsp;·&nbsp; F11 FULLSCREEN</div>
      </div>`);
    d.style.justifyContent = 'center';
    this._on(d, '[data-a]', (e) => {
      const a = e.dataset.a;
      if (a === 'new') this.game.newGame();
      if (a === 'continue') this.game.continueGame();
      if (a === 'chapters') this.chapters('main');
      if (a === 'options') this.options('main');
      if (a === 'quit') this.game.quit();
    });
  }

  chapters(back) {
    this.current = 'chapters';
    const d = this._el(`
      <div class="panel"><h2>CHAPTER SELECT</h2>
        <div class="chapters">${CHAPTERS.map((c) => `<div class="chapter-btn" data-n="${c.num}"><span class="n">CHAPTER ${c.num}</span><span class="t">${c.title}</span></div>`).join('')}</div>
        <div class="btn" data-back>BACK</div>
      </div>`, back === 'pause' ? 'pause-bg' : '');
    this._on(d, '[data-n]', (e) => this.game.startChapter(parseInt(e.dataset.n, 10)));
    this._on(d, '[data-back]', () => (back === 'pause' ? this.pause() : this.main()));
  }

  options(back) {
    this.current = 'options';
    const v = Settings.values;
    const rows = OPTIONS.map((o) => o.type === 'range'
      ? `<div class="row"><span>${o.label}</span><span><input type="range" data-k="${o.key}" min="${o.min}" max="${o.max}" step="${o.step}" value="${v[o.key]}"><span class="val" data-v="${o.key}">${o.fmt(v[o.key])}</span></span></div>`
      : `<div class="row"><span>${o.label}</span><input type="checkbox" data-k="${o.key}" ${v[o.key] ? 'checked' : ''}></div>`).join('');
    const d = this._el(`<div class="panel"><h2>OPTIONS</h2>${rows}<div class="btn" data-back>BACK</div><div class="btn" data-reset>DEFAULTS</div></div>`, back === 'pause' ? 'pause-bg' : '');
    d.querySelectorAll('input').forEach((inp) => {
      const o = OPTIONS.find((x) => x.key === inp.dataset.k);
      inp.addEventListener('input', () => {
        if (o.type === 'range') { const val = parseFloat(inp.value); Settings.set(o.key, val); d.querySelector(`[data-v="${o.key}"]`).textContent = o.fmt(val); }
        else Settings.set(o.key, inp.checked);
      });
      inp.addEventListener('change', () => this.sfx('ui_click'));
    });
    this._on(d, '[data-back]', () => (back === 'pause' ? this.pause() : this.main()));
    this._on(d, '[data-reset]', () => { Settings.reset(); this.options(back); });
  }

  pause() {
    this.current = 'pause';
    const d = this._el(`
      <div class="menu-main" style="background:rgba(0,0,0,.62)">
        <div class="logo" style="font-size:64px">PAUSED</div>
        <div class="tagline">Game time is stopped</div>
        <div class="menu-items">
          <div class="menu-item" data-a="resume">RESUME</div>
          <div class="menu-item" data-a="restart">RESTART CHAPTER</div>
          <div class="menu-item" data-a="chapters">CHAPTER SELECT</div>
          <div class="menu-item" data-a="options">OPTIONS</div>
          <div class="menu-item" data-a="menu">MAIN MENU</div>
        </div>
      </div>`);
    this._on(d, '[data-a]', (e) => {
      const a = e.dataset.a;
      if (a === 'resume') this.game.resume();
      if (a === 'restart') this.game.startChapter(this.game.chapter);
      if (a === 'chapters') this.chapters('pause');
      if (a === 'options') this.options('pause');
      if (a === 'menu') this.game.toMenu();
    });
  }

  death(quote) {
    this.current = 'death';
    const d = this._el(`
      <h1>YOU DIED</h1>
      <p>${quote}</p>
      <div><div class="btn" data-a="reload">RELOAD CHECKPOINT</div><div class="btn" data-a="menu">MAIN MENU</div></div>`, 'death');
    this._on(d, '[data-a]', (e) => (e.dataset.a === 'reload' ? this.game.startChapter(this.game.chapter) : this.game.toMenu()));
  }

  clickToStart() {
    this.current = 'click';
    const d = this._el('<div class="click-start">CLICK TO CONTINUE</div>');
    d.style.background = 'rgba(0,0,0,.35)';
    d.addEventListener('click', () => { this.hide(); this.game.input.requestLock(); this.game.audio.resume(); });
  }
}
