// Keyboard / mouse input with pointer-lock handling.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();   // pressed since last endFrame()
    this.released = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.locked = false;
    this.enabled = false;       // gameplay input accepted
    this.onLockChange = null;
    this.onEscape = null;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F5' || e.code === 'F12' || e.code === 'F11') return; // let the browser/electron have these
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); this.released.add(e.code); });
    window.addEventListener('blur', () => { this.down.clear(); });
    window.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      const k = 'Mouse' + e.button;
      this.pressed.add(k); this.down.add(k);
    });
    window.addEventListener('mouseup', (e) => {
      const k = 'Mouse' + e.button;
      this.down.delete(k); this.released.add(k);
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked || this.freeLook) { this.mouseDX += e.movementX || 0; this.mouseDY += e.movementY || 0; }
    });
    window.addEventListener('wheel', (e) => { if (this.enabled) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.onLockChange) this.onLockChange(this.locked);
    });
    document.addEventListener('pointerlockerror', () => { /* ignored: headless / denied */ });
  }

  requestLock() {
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* ignore */ }
  }
  exitLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ } }

  isDown(code) { return this.down.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  anyDown(...codes) { return codes.some((c) => this.down.has(c)); }

  consumeMouse() {
    const r = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0; this.mouseDY = 0;
    return r;
  }
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.wheel = 0;
  }
  clearAll() { this.down.clear(); this.pressed.clear(); this.released.clear(); this.mouseDX = 0; this.mouseDY = 0; }
}
