// Sons 100% procedurais via WebAudio — sem arquivos de áudio.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.humNodes = null;
    this.heartbeat = null;
    this._growlCd = 0;
  }

  // precisa ser chamado após um gesto do usuário
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  _osc(type, freq, dur, vol = 0.3, slideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  _noise(dur, vol = 0.3, filterFreq = 1000) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  // zumbido de fundo do nível (lâmpada fluorescente)
  startHum(freq = 118) {
    if (!this.ctx) return;
    this.stopHum();
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o1.type = 'sawtooth'; o1.frequency.value = freq;
    o2.type = 'sine'; o2.frequency.value = freq * 2.02;
    g.gain.value = 0.022;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    o1.connect(f); o2.connect(f);
    f.connect(g).connect(this.master);
    o1.start(); o2.start();
    this.humNodes = [o1, o2, g];
  }

  stopHum() {
    if (this.humNodes) {
      for (const n of this.humNodes) { try { n.stop?.(); } catch {} try { n.disconnect(); } catch {} }
      this.humNodes = null;
    }
  }

  swing() { this._noise(0.12, 0.18, 2400); }
  hitEnemy() { this._osc('square', 180, 0.1, 0.25, 90); this._noise(0.08, 0.2, 900); }
  hitBlock() { this._noise(0.06, 0.16, 1400); }
  breakBlock() { this._noise(0.22, 0.32, 700); this._osc('triangle', 150, 0.15, 0.2, 60); }
  place() { this._osc('triangle', 220, 0.09, 0.22, 160); }
  hurt() { this._osc('sawtooth', 140, 0.3, 0.35, 55); this._noise(0.2, 0.3, 500); }
  pickup() { this._osc('sine', 660, 0.12, 0.25, 880); this._osc('sine', 990, 0.18, 0.18, 1320); }
  drink() { this._osc('sine', 300, 0.25, 0.2, 180); this._noise(0.3, 0.12, 600); }
  portal() {
    this._osc('sine', 90, 1.2, 0.4, 30);
    this._osc('sawtooth', 220, 1.0, 0.12, 40);
    this._noise(1.0, 0.2, 300);
  }
  death() { this._osc('sawtooth', 200, 1.4, 0.4, 30); this._noise(1.2, 0.35, 400); }
  victory() {
    if (!this.ctx) return;
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => this._osc('triangle', f, 0.5, 0.3), i * 180));
  }
  enemyDie() { this._osc('sawtooth', 260, 0.5, 0.3, 40); this._noise(0.4, 0.25, 800); }
  step() { this._noise(0.05, 0.06, 500); }

  growl(kind) {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this._growlCd < 600) return; // não empilhar rosnados
    this._growlCd = now;
    switch (kind) {
      case 'smiler': this._osc('sawtooth', 70, 0.9, 0.22, 45); break;
      case 'hound': this._osc('sawtooth', 160, 0.35, 0.28, 90); this._noise(0.3, 0.2, 700); break;
      case 'skin': this._osc('sine', 500, 0.6, 0.15, 90); this._noise(0.4, 0.15, 1200); break;
      case 'faceling': this._osc('triangle', 100, 0.8, 0.25, 60); break;
      case 'boss': this._osc('sawtooth', 55, 1.4, 0.4, 30); this._noise(0.8, 0.3, 300); break;
      case 'bosscharge': this._osc('sawtooth', 90, 0.5, 0.4, 240); break;
    }
  }
}
