import { assets } from '../core/Assets.js';

export class Credits {
  constructor(root) {
    this.root = root;
    this.el = null;
    this.running = false;
  }

  /** Scrolls the credits (includes the asset authors found in manifest.json); resolves when done or skipped. */
  play(onSkipKey) {
    return new Promise((resolve) => {
      const authors = assets.credits();
      const rows = authors.map((a) => `<div>${esc(a.author)} <span class="small">${esc(a.license)}${a.source ? ' · ' + esc(shorten(a.source)) : ''}</span></div>`).join('');
      this.el = document.createElement('div');
      this.el.className = 'screen credits';
      this.el.innerHTML = `
        <div class="credits-roll">
          <div class="big">AVE MARIA</div>
          <div class="small">A SHORT STORY OF LAUNCH DAY</div>
          <h3>STARRING</h3><div>Alan Mercer</div><div class="small">(who says nothing, as usual)</div>
          <h3>VOICES</h3><div>Dr. Ilse Varga</div><div>Officer Dale Brooks</div><div>The PA Announcer</div><div>The Overseer</div><div class="small">performed by your operating system's speech synthesiser</div>
          <h3>DESIGN &amp; PROGRAMMING</h3><div>Built with three.js, cannon-es, Vite and Electron</div>
          <h3>ASSET CREDITS</h3>
          ${rows || '<div class="small">All art, sound and music in this build is procedurally generated.</div>'}
          <h3>SPECIAL THANKS</h3><div>Everyone who ever kept a Cell in a jar</div>
          <div style="margin-top:80px" class="big">THE END</div>
          <div class="small" style="margin-bottom:40vh">Thank you for playing</div>
        </div>
        <div class="credits-skip">PRESS ESC OR CLICK TO SKIP</div>`;
      this.root.appendChild(this.el);
      const roll = this.el.querySelector('.credits-roll');
      let y = window.innerHeight, last = performance.now();
      this.running = true;
      const done = () => { if (!this.running) return; this.running = false; this.el.remove(); window.removeEventListener('keydown', onKey); resolve(); };
      const onKey = (e) => { if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') done(); };
      window.addEventListener('keydown', onKey);
      this.el.addEventListener('click', done);
      const tick = (now) => {
        if (!this.running) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        y -= dt * 62;
        roll.style.top = y + 'px';
        if (y + roll.offsetHeight < 0) return done();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function shorten(u) { return u.replace(/^https?:\/\//, '').slice(0, 60); }
