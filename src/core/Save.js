// Chapter-checkpoint save (autosaved at each chapter start).
const KEY = 'avemaria.save.v1';

export const Save = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (d && Number.isInteger(d.chapter) && d.chapter >= 1 && d.chapter <= 4) return d;
    } catch (e) { /* ignore */ }
    return null;
  },
  write(chapter) {
    try {
      const prev = this.load();
      const best = Math.max(chapter, prev ? prev.best || 0 : 0);
      localStorage.setItem(KEY, JSON.stringify({ chapter, best, time: Date.now() }));
    } catch (e) { /* ignore */ }
  },
  clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
};
