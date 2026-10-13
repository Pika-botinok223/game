// Persistent options (localStorage). Everything is wrapped in try/catch so the
// game still runs when storage is blocked (private windows, tests, ...).
const KEY = 'avemaria.settings.v1';

export const DEFAULTS = {
  sensitivity: 1.0,
  invertY: false,
  master: 0.8,
  music: 0.5,
  sfx: 0.9,
  voice: 1.0,
  fov: 90,
  subtitles: true,
  effects: true, // bloom + vignette + grain
};

class SettingsStore {
  constructor() {
    this.values = { ...DEFAULTS };
    this.listeners = new Set();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(this.values, JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }
  get(k) { return this.values[k]; }
  set(k, v) {
    this.values[k] = v;
    this.save();
    for (const fn of this.listeners) fn(k, v);
  }
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.values)); } catch (e) { /* ignore */ }
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  reset() {
    this.values = { ...DEFAULTS };
    this.save();
    for (const k of Object.keys(DEFAULTS)) for (const fn of this.listeners) fn(k, this.values[k]);
  }
}

export const Settings = new SettingsStore();
