// Chapter-checkpoint save (autosaved at each chapter start).
const KEY = 'avemaria.save.v1';
const DEV_KEY = 'avemaria.devunlock.v1';

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
  /** Konami code: every chapter unlocked in CHAPTER SELECT (persisted). */
  unlockAll() { try { localStorage.setItem(DEV_KEY, '1'); } catch (e) { /* ignore */ } this._dev = true; },
  allUnlocked() {
    if (this._dev) return true;
    try { return localStorage.getItem(DEV_KEY) === '1'; } catch (e) { return false; }
  },
  clear() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
};
