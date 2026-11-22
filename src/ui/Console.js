// Source-style developer console. Toggle with ` / ~ (Backquote) or F10.
// Works in-game (releases pointer lock, freezes the world, swallows every key) and in the menus.
import { Settings } from '../core/Settings.js';
import { createRegistry } from '../core/Commands.js';

const HIST_KEY = 'avemaria.console.history.v1';
const MAX_HISTORY = 30, MAX_LINES = 600;
const BANNER = "Ave Maria developer console. Type 'help' for commands. Cheats require sv_cheats 1.";

export class DevConsole {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.registry = createRegistry(game);
    this.history = this._loadHistory();
    this.histIdx = -1;
    this.draft = '';
    this.bannerShown = false;
    this.resumeLock = false;
    this.lines = 0;

    this.el = document.createElement('div');
    this.el.className = 'devcon';
    this.el.innerHTML = `
      <div class="devcon-log" tabindex="-1"></div>
      <div class="devcon-row"><span class="devcon-prompt">]</span><input class="devcon-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off"></div>
      <div class="devcon-suggest"></div>`;
    document.body.appendChild(this.el);
    this.logEl = this.el.querySelector('.devcon-log');
    this.inputEl = this.el.querySelector('.devcon-input');
    this.suggestEl = this.el.querySelector('.devcon-suggest');
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'dev-toast';
    document.body.appendChild(this.toastEl);

    this.inputEl.addEventListener('input', () => { this.histIdx = -1; this._suggest(); });
    this.el.addEventListener('mousedown', (e) => {
      if (e.target.closest('.devcon-suggest-item')) return;
      if (!window.getSelection || window.getSelection().isCollapsed) setTimeout(() => this.inputEl.focus(), 0);
    });
    this.suggestEl.addEventListener('mousedown', (e) => {
      const it = e.target.closest('.devcon-suggest-item');
      if (!it) return;
      e.preventDefault();
      this.inputEl.value = it.dataset.name + ' ';
      this.inputEl.focus();
      this._suggest();
    });
    // capture phase: the console sees every key first and keeps them away from the game
    window.addEventListener('keydown', (e) => this._onKey(e), true);
    window.addEventListener('keyup', (e) => { if (this.open) e.stopImmediatePropagation(); }, true);
    window.addEventListener('keypress', (e) => { if (this.open) e.stopPropagation(); }, true);
  }

  // ------------------------------------------------------------------ output
  print(text, cls = 'out') {
    for (const line of String(text).split('\n')) {
      const d = document.createElement('div');
      d.className = 'devcon-line ' + cls;
      d.textContent = line === '' ? ' ' : line;
      this.logEl.appendChild(d);
      this.lines++;
    }
    while (this.lines > MAX_LINES) { this.logEl.removeChild(this.logEl.firstChild); this.lines--; }
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
  error(t) { this.print(t, 'err'); }
  ok(t) { this.print(t, 'cheat'); }
  clear() { this.logEl.innerHTML = ''; this.lines = 0; }

  toast(text, dur = 4) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.remove('show'), dur * 1000);
  }

  // ------------------------------------------------------------------ open / close
  canToggle() {
    const g = this.game;
    if (this.open) return true;
    if (g.state === 'boot') return false;
    return Settings.get('devConsole') || g.state === 'menu';
  }
  toggle() { if (this.open) this.close(); else this.openConsole(); }

  openConsole() {
    if (this.open) return;
    const g = this.game;
    this.open = true;
    this.resumeLock = g.state === 'playing';
    g.input.blocked = true;
    g.input.clearAll();
    if (g.state === 'playing') g.dialogue.pause();
    g.input.exitLock();
    this.el.classList.add('open');
    if (!this.bannerShown) { this.bannerShown = true; this.print(BANNER); }
    this.inputEl.value = '';
    this.histIdx = -1;
    this._suggest();
    setTimeout(() => this.inputEl.focus(), 0);
    this.inputEl.focus();
  }

  /** opts.relock: re-lock the pointer when returning to the game (default true). */
  close(opts = {}) {
    if (!this.open) return;
    const g = this.game;
    this.open = false;
    this.el.classList.remove('open');
    this.inputEl.blur();
    this.suggestEl.innerHTML = '';
    g.input.blocked = false;
    g.input.clearAll();
    const relock = opts.relock !== false;
    if (g.state === 'playing' && this.resumeLock) g.dialogue.resume();
    if (relock && g.state === 'playing') {
      g.input.requestLock();
      if (!g.debug) {
        setTimeout(() => { if (g.state === 'playing' && !this.open && !g.input.locked && !g.screens.current) g.screens.clickToStart(); }, 400);
      }
    }
    g.audio.resume();
  }

  // ------------------------------------------------------------------ input
  _onKey(e) {
    if (e.code === 'Backquote' || e.code === 'F10') {
      if (!this.canToggle()) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) this.toggle();
      return;
    }
    if (!this.open) return;
    e.stopImmediatePropagation(); // nothing reaches the game keybinds
    switch (e.code) {
      case 'Escape': e.preventDefault(); this.close(); break;
      case 'Enter': case 'NumpadEnter': e.preventDefault(); this._submit(); break;
      case 'ArrowUp': e.preventDefault(); this._hist(-1); break;
      case 'ArrowDown': e.preventDefault(); this._hist(1); break;
      case 'Tab': e.preventDefault(); this._tab(); break;
      case 'PageUp': e.preventDefault(); this.logEl.scrollTop -= this.logEl.clientHeight * 0.85; break;
      case 'PageDown': e.preventDefault(); this.logEl.scrollTop += this.logEl.clientHeight * 0.85; break;
      default: break;
    }
    if (document.activeElement !== this.inputEl && e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) this.inputEl.focus();
  }

  _submit() {
    const line = this.inputEl.value.trim();
    this.inputEl.value = '';
    this.histIdx = -1;
    this.suggestEl.innerHTML = '';
    if (!line) return;
    this.print('] ' + line, 'echo');
    if (this.history[this.history.length - 1] !== line) this.history.push(line);
    if (this.history.length > MAX_HISTORY) this.history.splice(0, this.history.length - MAX_HISTORY);
    this._saveHistory();
    this.registry.execute(line, { game: this.game, console: this, print: (t) => this.print(t), error: (t) => this.error(t), ok: (t) => this.ok(t) });
  }

  _hist(dir) {
    if (!this.history.length) return;
    if (this.histIdx === -1) {
      if (dir > 0) return;
      this.draft = this.inputEl.value;
      this.histIdx = this.history.length - 1;
    } else {
      this.histIdx += dir;
      if (this.histIdx >= this.history.length) { this.histIdx = -1; this.inputEl.value = this.draft; this._suggest(); return; }
      if (this.histIdx < 0) this.histIdx = 0;
    }
    this.inputEl.value = this.history[this.histIdx];
    const n = this.inputEl.value.length;
    this.inputEl.setSelectionRange(n, n);
    this._suggest();
  }

  _tab() {
    const v = this.inputEl.value;
    if (/\s/.test(v.trimStart()) && v.trim().includes(' ')) return;
    const prefix = v.trim().toLowerCase();
    const m = this.registry.complete(prefix);
    if (!m.length) return;
    if (m.length === 1) { this.inputEl.value = m[0] + ' '; this._suggest(); return; }
    let common = m[0];
    for (const n of m) { while (!n.startsWith(common)) common = common.slice(0, -1); }
    if (common.length > prefix.length) this.inputEl.value = common;
    else { this.print('] ' + v, 'echo'); this.print(m.join('   ')); }
    this._suggest();
  }

  _suggest() {
    const v = this.inputEl.value;
    const t = v.trimStart();
    this.suggestEl.innerHTML = '';
    if (!t) return;
    const sp = t.indexOf(' ');
    if (sp >= 0) {
      const c = this.registry.find(t.slice(0, sp));
      if (c && c.usage) this._suggestRow(c.name, c.usage + (c.cheat ? '  [cheat]' : ''));
      this._showSuggest();
      return;
    }
    const m = this.registry.complete(t).slice(0, 8);
    for (const n of m) {
      const c = this.registry.find(n);
      this._suggestRow(n, c.help, c.cheat);
    }
    this._showSuggest();
  }
  _suggestRow(name, help, cheat) {
    const d = document.createElement('div');
    d.className = 'devcon-suggest-item' + (cheat ? ' cheat' : '');
    d.dataset.name = name;
    const n = document.createElement('span'); n.className = 'n'; n.textContent = name;
    const h = document.createElement('span'); h.className = 'h'; h.textContent = help;
    d.append(n, h);
    this.suggestEl.appendChild(d);
  }
  _showSuggest() { this.suggestEl.style.display = this.suggestEl.childElementCount ? 'block' : 'none'; }

  // ------------------------------------------------------------------ history persistence
  _loadHistory() {
    try {
      const a = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
      if (Array.isArray(a)) return a.filter((x) => typeof x === 'string').slice(-MAX_HISTORY);
    } catch (e) { /* ignore */ }
    return [];
  }
  _saveHistory() { try { localStorage.setItem(HIST_KEY, JSON.stringify(this.history.slice(-MAX_HISTORY))); } catch (e) { /* ignore */ } }
}
