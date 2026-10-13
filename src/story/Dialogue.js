import { LINES, SPEAKERS } from './dialogue.js';
import { Settings } from '../core/Settings.js';

/** Subtitle + speechSynthesis voice queue. Driven by game time (update(dt)) so it pauses with the game. */
export class Dialogue {
  constructor(game, subtitles) {
    this.game = game;
    this.subs = subtitles;
    this.queue = [];
    this.current = null;
    this.synth = (typeof window !== 'undefined' && 'speechSynthesis' in window) ? window.speechSynthesis : null;
    this.voices = [];
    if (this.synth) {
      const load = () => { try { this.voices = this.synth.getVoices() || []; } catch (e) { this.voices = []; } };
      load();
      try { this.synth.addEventListener('voiceschanged', load); } catch (e) { /* ignore */ }
    }
    this.voiceCache = {};
    Settings.onChange((k, v) => { if (k === 'subtitles') { this.subs.enabled = v; if (!v) this.subs.hide(); } });
    this.subs.enabled = Settings.get('subtitles');
  }

  pickVoice(speaker) {
    if (this.voiceCache[speaker.name] !== undefined) return this.voiceCache[speaker.name];
    const en = this.voices.filter((v) => /^en/i.test(v.lang));
    const pool = en.length ? en : this.voices;
    const rx = {
      f: /samantha|karen|victoria|moira|tessa|fiona|susan|zira|female|serena|allison|ava|kate/i,
      m: /daniel|alex|fred|oliver|tom|david|mark|male|aaron|arthur|rishi|gordon|lee/i,
      robot: /fred|zarvox|trinoids|ralph|bad news|junior|google us english|microsoft/i,
    }[speaker.gender];
    let v = rx ? pool.find((x) => rx.test(x.name)) : null;
    if (!v) v = pool.find((x) => x.default) || pool[0] || null;
    this.voiceCache[speaker.name] = v;
    return v;
  }

  speak(speaker, text) {
    if (!this.synth || !this.voices.length) return false;
    const vol = Settings.get('voice') * Settings.get('master');
    if (vol <= 0.001) return false;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const v = this.pickVoice(speaker);
      if (v) u.voice = v;
      u.pitch = speaker.pitch; u.rate = speaker.rate; u.volume = Math.min(1, vol);
      u.lang = (v && v.lang) || 'en-US';
      u.onend = u.onerror = () => { if (this.current && this.current.utt === u) this.current.speaking = false; };
      this.synth.speak(u);
      return u;
    } catch (e) { return false; }
  }

  /** Queue a line by key (or an inline {who,text}). Resolves when it has finished. */
  say(keyOrLine, opts = {}) {
    const line = typeof keyOrLine === 'string' ? LINES[keyOrLine] : keyOrLine;
    if (!line) { console.warn('missing line', keyOrLine); return Promise.resolve(); }
    return new Promise((resolve) => this.queue.push({ line, resolve, gap: opts.gap !== undefined ? opts.gap : 0.35 }));
  }

  /** Play immediately, interrupting the queue (countdown callouts etc.). */
  announce(who, text, dur = 1.2) {
    const sp = SPEAKERS[who];
    this.subs.show(sp.name, sp.color, text);
    this.speak(sp, text);
    this.hideAt = this.game.time + dur;
  }

  clear() {
    this.queue.length = 0;
    if (this.current) { this.current.resolve(); this.current = null; }
    this.subs.hide();
    if (this.synth) try { this.synth.cancel(); } catch (e) { /* ignore */ }
  }
  pause() { if (this.synth) try { this.synth.pause(); } catch (e) { /* ignore */ } }
  resume() { if (this.synth) try { this.synth.resume(); } catch (e) { /* ignore */ } }

  update(dt) {
    if (this.hideAt && this.game.time > this.hideAt && !this.current) { this.subs.hide(); this.hideAt = 0; }
    if (!this.current) {
      if (this.gapT > 0) { this.gapT -= dt; return; }
      const next = this.queue.shift();
      if (!next) return;
      const { line } = next;
      const sp = SPEAKERS[line.who];
      this.hideAt = 0;
      this.current = { ...next, t: 0, speaking: false, started: false, sp };
      const est = Math.max(1.8, (line.text.length * 0.058 + 0.7) / sp.rate);
      this.current.dur = this.game.testMode ? Math.min(est, 0.4) : est;
      if (line.chime) { this.game.audio.play('pa_chime', { vol: 0.8 }); this.current.delay = this.game.testMode ? 0.2 : 1.3; this.current.dur += this.current.delay; }
      else this.current.delay = 0;
      return;
    }
    const c = this.current;
    c.t += dt;
    if (!c.started && c.t >= c.delay) {
      c.started = true;
      this.subs.show(c.sp.name, c.sp.color, c.line.text);
      c.utt = this.speak(c.sp, c.line.text);
      c.speaking = !!c.utt;
      if (c.line.onStart) c.line.onStart();
    }
    if (c.started && c.t >= c.dur && (!c.speaking || c.t >= c.dur + 5)) {
      this.subs.hide();
      this.gapT = c.gap;
      c.resolve();
      this.current = null;
    }
  }
}
