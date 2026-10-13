export class ChapterCard {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'chapter-card';
    root.appendChild(this.el);
  }
  async show(num, title, hold = 3.2) {
    this.el.innerHTML = `<div class="num">CHAPTER ${num}</div><div class="title">${title}</div>`;
    void this.el.offsetWidth;
    this.el.classList.add('show');
    await new Promise((r) => setTimeout(r, hold * 1000));
    this.el.classList.remove('show');
    await new Promise((r) => setTimeout(r, 1400));
  }
}
