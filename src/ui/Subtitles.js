export class Subtitles {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'subtitles';
    root.appendChild(this.el);
    this.enabled = true;
  }
  show(who, color, text) {
    if (!this.enabled) { this.el.classList.remove('show'); return; }
    this.el.innerHTML = '';
    const w = document.createElement('span'); w.className = 'who'; w.style.color = color; w.textContent = who + ':';
    const t = document.createElement('span'); t.textContent = ' ' + text;
    this.el.append(w, t);
    this.el.classList.add('show');
  }
  hide() { this.el.classList.remove('show'); }
}
