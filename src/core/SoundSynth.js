/**
 * Synthesised sound effects using the Web Audio API — no audio files required.
 * AudioContext is created lazily on first use to satisfy browser autoplay policy.
 */
class SoundSynth {
  constructor() {
    /** @type {AudioContext|null} */
    this._ctx = null;
  }

  /** @returns {AudioContext} */
  _ac() {
    if (!this._ctx) this._ctx = new AudioContext();
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Play a short noise burst through a bandpass filter.
   * @param {number} duration  seconds
   * @param {number} freq      bandpass center Hz
   * @param {number} q         bandpass Q
   * @param {number} gain      output gain
   * @param {number} decay     exponential decay rate (higher = sharper)
   */
  _noise(duration, freq, q, gain, decay) {
    const ctx  = this._ac();
    const rate = ctx.sampleRate;
    const len  = Math.ceil(rate * duration);
    const buf  = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-(i / rate) * decay);
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const flt = ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = freq;
    flt.Q.value = q;

    const gn = ctx.createGain();
    gn.gain.value = gain;

    src.connect(flt);
    flt.connect(gn);
    gn.connect(ctx.destination);
    src.start(0);
  }

  /**
   * Short oscillator blip.
   * @param {number} freq Hz
   * @param {number} duration seconds
   * @param {OscillatorType} type
   * @param {number} gain
   */
  _blip(freq, duration, type = 'square', gain = 0.3) {
    const ctx = this._ac();
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gn.gain.setValueAtTime(gain, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gn);
    gn.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // ── Public sounds ─────────────────────────────────────────────────────────

  gunshot() {
    const ctx  = this._ac();
    const rate = ctx.sampleRate;
    const dur  = 0.35;
    const len  = Math.ceil(rate * dur);
    const buf  = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / rate;
      // High-frequency crack + low-frequency thump
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 1.0
              + Math.sin(t * 80 * Math.PI * 2) * Math.exp(-t * 15) * 0.5;
    }

    const src  = ctx.createBufferSource();
    src.buffer = buf;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.ratio.value = 4;

    const gn = ctx.createGain();
    gn.gain.value = 1.0;

    src.connect(comp);
    comp.connect(gn);
    gn.connect(ctx.destination);
    src.start(0);
  }

  /** Dry click when pulling the trigger on an empty cylinder. */
  emptyClick() {
    this._blip(900, 0.05, 'square', 0.25);
  }

  /** Metallic snap when the cylinder locks after reload. */
  reloadSnap() {
    [0, 0.13].forEach((delay) => {
      const ctx = this._ac();
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 1400;
      gn.gain.setValueAtTime(0.28, ctx.currentTime + delay);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.06);
      osc.connect(gn);
      gn.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.07);
    });
  }

  /** Soft grunt on non-lethal hit. */
  npcHit() {
    this._noise(0.15, 350, 1.0, 0.45, 35);
  }

  /** Heavier impact + low thud on kill. */
  npcDeath() {
    // Impact crack
    this._noise(0.12, 500, 0.8, 0.55, 40);
    // Low body-fall thud delayed 80 ms
    setTimeout(() => this._noise(0.4, 90, 0.6, 0.7, 10), 80);
  }
}

export const sounds = new SoundSynth();
