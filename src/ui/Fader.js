export class Fader {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'fader';
    root.appendChild(this.el);
  }
  /** Fade TO a colour ('black' | 'white'); resolves when done. */
  to(color = 'black', sec = 1) {
    this.el.classList.toggle('white', color === 'white');
    this.el.style.transition = `opacity ${sec}s linear`;
    void this.el.offsetWidth;
    this.el.style.opacity = 1;
    return new Promise((r) => setTimeout(r, sec * 1000));
  }
  /** Fade FROM the current colour to clear. */
  clear(sec = 1) {
    this.el.style.transition = `opacity ${sec}s linear`;
    void this.el.offsetWidth;
    this.el.style.opacity = 0;
    return new Promise((r) => setTimeout(r, sec * 1000));
  }
  set(opacity, color = 'black') { this.el.classList.toggle('white', color === 'white'); this.el.style.transition = 'none'; this.el.style.opacity = opacity; }
}
