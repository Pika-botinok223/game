// Tiny async scripting layer driven by game time (so it freezes while paused).
// Level scripts are written as `async (s) => { await s.wait(2); await s.say('x'); }`.
export class CancelError extends Error {}

export class Scheduler {
  constructor() { this.waiters = []; this.scripts = new Set(); }

  /** Run an async script. Returns its context (call ctx.cancel() to stop it). */
  run(fn, game) {
    const ctx = new ScriptContext(this, game);
    this.scripts.add(ctx);
    Promise.resolve()
      .then(() => fn(ctx))
      .catch((e) => { if (!(e instanceof CancelError)) console.error('[script]', e); })
      .finally(() => this.scripts.delete(ctx));
    return ctx;
  }

  tick(dt) {
    if (!this.waiters.length) return;
    const list = this.waiters;
    this.waiters = [];
    for (const w of list) {
      if (w.ctx.cancelled) { w.reject(new CancelError()); continue; }
      let done = false;
      if (w.kind === 'time') { w.t -= dt; done = w.t <= 0; }
      else { try { done = !!w.fn(); } catch (e) { console.error(e); done = true; } }
      if (done) w.resolve(); else this.waiters.push(w);
    }
  }

  cancelAll() {
    for (const c of this.scripts) c.cancelled = true;
    const list = this.waiters; this.waiters = [];
    for (const w of list) w.reject(new CancelError());
    this.scripts.clear();
  }
}

class ScriptContext {
  constructor(sched, game) { this.sched = sched; this.game = game; this.cancelled = false; }
  cancel() { this.cancelled = true; }
  _check() { if (this.cancelled) throw new CancelError(); }
  wait(sec) {
    this._check();
    return new Promise((resolve, reject) => this.sched.waiters.push({ ctx: this, kind: 'time', t: sec, resolve, reject }));
  }
  until(fn) {
    this._check();
    return new Promise((resolve, reject) => this.sched.waiters.push({ ctx: this, kind: 'cond', fn, resolve, reject }));
  }
  /** Run fn(t01) each frame for `sec` seconds. */
  async tween(sec, fn) {
    let t = 0;
    await this.until(() => { t += this.game.dt; fn(Math.min(1, t / sec)); return t >= sec; });
  }
  /** Queue a dialogue line; resolves when it has finished. */
  async say(key, opts) { this._check(); await this.game.dialogue.say(key, opts); this._check(); }
  /** Queue a dialogue line without waiting for it. */
  sayNoWait(key, opts) { this._check(); return this.game.dialogue.say(key, opts); }
  /** Set an objective and wait for `cond`. `skip` is invoked by the debug helper completeObjective(). */
  async step(text, cond, skip) {
    this._check();
    this.game.setObjective(text, skip);
    await this.until(cond);
    this.game.setObjective(null);
  }
}
