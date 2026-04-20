/**
 * Procedural ambient audio using the Web Audio API.
 * No audio files required — all sounds are synthesised.
 * Exported as a singleton so any module can call audioManager.playNote() etc.
 */

// Pentatonic minor (A3–C5) — Western feel on a triangle oscillator
const PIANO_HZ = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];

// Major chord (C5–C6) — warm and welcoming
const STORE_HZ = [523.25, 659.25, 783.99, 1046.5];

// D minor bass line (D3–C4) — audible range for brooding tone
const SHERIFF_HZ = [146.83, 174.61, 220, 261.63];

class AudioManager {
  constructor() {
    this._actx   = null;
    this._master = null;
    /** @type {Array<() => void>} */
    this._stops  = [];
  }

  _ctx() {
    if (!this._actx) {
      this._actx   = new AudioContext();
      this._master = this._actx.createGain();
      this._master.gain.value = 0.18;
      this._master.connect(this._actx.destination);
    }
    if (this._actx.state === 'suspended') this._actx.resume();
    return this._actx;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** @param {string} buildingName */
  playBuildingAmbient(buildingName) {
    this.stopAmbient();
    const ctx = this._ctx();
    switch (buildingName) {
      case 'Saloon':           this._saloon(ctx);   break;
      case 'General Store':    this._store(ctx);    break;
      case "Sheriff's Office": this._sheriff(ctx);  break;
      case 'Post Office':      this._post(ctx);     break;
      case 'Gunsmith':         this._gunsmith(ctx); break;
    }
  }

  /** Soothing outdoor wind + distant notes. */
  playOutdoorAmbient() {
    this.stopAmbient();
    this._outdoor(this._ctx());
  }

  stopAmbient() {
    for (const fn of this._stops) fn();
    this._stops = [];
  }

  /** @param {number} [freq=440] */
  playNote(freq = 440) {
    this._pianoNote(this._ctx(), freq, 0.16);
  }

  dispose() {
    this.stopAmbient();
    try { this._actx?.close(); } catch (_) {}
  }

  // ── Building ambients ────────────────────────────────────────────────────

  // Saloon — upbeat ragtime-style random pentatonic notes
  _saloon(ctx) {
    let live = true;
    const tick = () => {
      if (!live) return;
      const base = PIANO_HZ[Math.floor(Math.random() * PIANO_HZ.length)];
      this._pianoNote(ctx, Math.random() > 0.45 ? base * 2 : base, 0.07 + Math.random() * 0.04);
      setTimeout(tick, 320 + Math.random() * 850);
    };
    setTimeout(tick, 500);
    this._stops.push(() => { live = false; });
  }

  // General Store — warm major-chord chimes + door-bell double-ding
  _store(ctx) {
    let live = true;
    const chime = () => {
      if (!live) return;
      this._pianoNote(ctx, STORE_HZ[Math.floor(Math.random() * STORE_HZ.length)], 0.07 + Math.random() * 0.03);
      setTimeout(chime, 2200 + Math.random() * 3500);
    };
    setTimeout(chime, 800);
    const bell = () => {
      if (!live) return;
      this._pianoNote(ctx, 1760, 0.07);
      setTimeout(() => { if (live) this._pianoNote(ctx, 1320, 0.05); }, 160);
      setTimeout(bell, 11000 + Math.random() * 12000);
    };
    setTimeout(bell, 4500);
    this._stops.push(() => { live = false; });
  }

  // Sheriff's Office — slow D-minor bass walk + rare high sting
  // Uses D3/F3/A3/C4 (146–261 Hz) — clearly audible on any speaker
  _sheriff(ctx) {
    let live = true;
    let bi = 0;
    const bass = () => {
      if (!live) return;
      this._pianoNote(ctx, SHERIFF_HZ[bi % SHERIFF_HZ.length], 0.11);
      bi++;
      setTimeout(bass, 1100 + Math.random() * 900);
    };
    setTimeout(bass, 400);
    const sting = () => {
      if (!live) return;
      this._pianoNote(ctx, 587.33, 0.07); // D5 — dissonant tension
      setTimeout(sting, 6000 + Math.random() * 7000);
    };
    setTimeout(sting, 3500);
    this._stops.push(() => { live = false; });
  }

  // Post Office — steady ticking clock + occasional high writing notes
  _post(ctx) {
    let live = true;
    const tick = () => {
      if (!live) return;
      this._tickClick(ctx, 0.45);
      setTimeout(tick, 950 + Math.random() * 100);
    };
    setTimeout(tick, 250); // small delay so context is warm
    // Occasional pen-scratch: three quick high notes
    const WRITE_HZ = [783.99, 880, 987.77];
    const write = () => {
      if (!live) return;
      this._pianoNote(ctx, WRITE_HZ[Math.floor(Math.random() * WRITE_HZ.length)], 0.06);
      setTimeout(write, 7000 + Math.random() * 9000);
    };
    setTimeout(write, 5000);
    this._stops.push(() => { live = false; });
  }

  // Gunsmith — hammer bursts (2–3 hits) + file-scrape
  _gunsmith(ctx) {
    let live = true;
    const hammer = () => {
      if (!live) return;
      const hits = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < hits; i++) {
        setTimeout(() => { if (live) this._metalHit(ctx, 0.22); }, i * 260);
      }
      setTimeout(hammer, 2000 + Math.random() * 2800);
    };
    setTimeout(hammer, 500); // first hit quickly so user hears it immediately
    const scrape = () => {
      if (!live) return;
      for (let i = 0; i < 5; i++) {
        setTimeout(() => { if (live) this._tickClick(ctx, 0.18); }, i * 65);
      }
      setTimeout(scrape, 7000 + Math.random() * 8000);
    };
    setTimeout(scrape, 4000);
    this._stops.push(() => { live = false; });
  }

  // Outdoor — gentle low-pass wind noise + soft distant notes
  _outdoor(ctx) {
    const bufLen = ctx.sampleRate * 6;
    const buf  = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop   = true;

    const lp = ctx.createBiquadFilter();
    lp.type            = 'lowpass';
    lp.frequency.value = 160;
    lp.Q.value         = 0.7;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.24;

    src.connect(lp);
    lp.connect(windGain);
    windGain.connect(this._master);
    src.start();

    // Occasional distant ambient notes — very soft
    const OUTDOOR_HZ = [196, 220, 261.63, 293.66, 329.63];
    let live = true;
    const note = () => {
      if (!live) return;
      this._pianoNote(ctx, OUTDOOR_HZ[Math.floor(Math.random() * OUTDOOR_HZ.length)] * 2, 0.035);
      setTimeout(note, 5000 + Math.random() * 9000);
    };
    setTimeout(note, 3500);

    this._stops.push(() => {
      live = false;
      try { src.stop(); } catch (_) {}
    });
  }

  // ── Synthesis primitives ─────────────────────────────────────────────────

  _pianoNote(ctx, freq, vol) {
    try {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(env);
      env.connect(this._master);
      const t = ctx.currentTime;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vol, t + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
      osc.start(t);
      osc.stop(t + 2.0);
    } catch (_) {}
  }

  _tickClick(ctx, vol) {
    try {
      const len  = Math.ceil(ctx.sampleRate * 0.014);
      const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * ((1 - i / len) ** 10);
      }
      const src  = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer      = buf;
      gain.gain.value = vol;
      src.connect(gain);
      gain.connect(this._master);
      src.start();
    } catch (_) {}
  }

  // Bandpass-filtered noise burst — metallic clang for the gunsmith
  _metalHit(ctx, vol) {
    try {
      const len  = Math.ceil(ctx.sampleRate * 0.09);
      const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12));
      }
      const src    = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      filter.type            = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value         = 2.5;
      src.buffer      = buf;
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this._master);
      src.start();
    } catch (_) {}
  }
}

export const audioManager = new AudioManager();
