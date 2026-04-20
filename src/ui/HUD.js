const CSS = `
  #hud {
    position: fixed;
    inset: 0;
    pointer-events: none;
    font-family: Georgia, 'Times New Roman', serif;
    z-index: 100;
    user-select: none;
  }

  /* ── shared panel style ── */
  .hud-panel {
    position: absolute;
    background: rgba(20, 8, 0, 0.68);
    border: 1px solid rgba(212, 169, 106, 0.30);
    padding: 8px 14px;
    color: #d4a96a;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 10px;
  }

  .hud-label {
    display: block;
    margin-bottom: 5px;
    opacity: 0.7;
    font-size: 9px;
  }

  /* ── wanted stars (top-right) ── */
  .hud-wanted {
    top: 20px;
    right: 20px;
    text-align: center;
    min-width: 90px;
  }

  .hud-stars {
    font-size: 22px;
    letter-spacing: 5px;
    display: flex;
    gap: 2px;
    justify-content: center;
  }

  .hud-stars .star { color: #3a2010; transition: color 0.2s; }
  .hud-stars .star.lit { color: #ffb347; }

  @keyframes wantedPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }
  .hud-stars .star.pulse { animation: wantedPulse 0.5s ease-in-out infinite; }

  /* ── health (bottom-left) ── */
  .hud-health { bottom: 24px; left: 24px; }

  .hud-pips {
    display: flex;
    gap: 3px;
    margin-top: 4px;
  }

  .pip {
    width: 13px;
    height: 18px;
    background: #7a1a1a;
    border: 1px solid rgba(212, 169, 106, 0.25);
    transition: background 0.15s;
  }

  .pip.empty { background: rgba(26, 10, 0, 0.5); }

  /* ── ammo (bottom-right) ── */
  .hud-ammo { bottom: 24px; right: 24px; text-align: right; }

  .hud-chambers {
    display: flex;
    gap: 4px;
    margin-top: 5px;
    justify-content: flex-end;
  }

  .chamber {
    font-size: 16px;
    line-height: 1;
    color: #d4a96a;
    transition: color 0.1s;
  }

  .chamber.empty { color: #2a1a0a; }

  /* ── pointer-lock prompt (centred) ── */
  #hud-prompt {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .hud-prompt-box {
    background: rgba(20, 8, 0, 0.72);
    border: 1px solid rgba(212, 169, 106, 0.40);
    color: #d4a96a;
    font-family: Georgia, serif;
    font-size: 15px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 14px 28px;
    text-align: center;
  }

  .hud-prompt-sub {
    font-size: 10px;
    opacity: 0.6;
    margin-top: 6px;
    letter-spacing: 0.08em;
  }
`;

const MAX_HEALTH  = 10;
const MAX_AMMO    = 6;
const MAX_STARS   = 3;

export class HUD {
  constructor() {
    /** @type {HTMLElement} */
    this._el = null;
  }

  mount() {
    // Inject styles once
    if (!document.getElementById('hud-styles')) {
      const style   = document.createElement('style');
      style.id      = 'hud-styles';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    this._el = document.createElement('div');
    this._el.id = 'hud';
    this._el.innerHTML = this._template();
    document.body.appendChild(this._el);

    this._interiorMode = false;

    // Auto-hide the click prompt when pointer lock is acquired
    document.addEventListener('pointerlockchange', () => {
      if (this._interiorMode) return;
      const locked = document.pointerLockElement === document.body;
      this._el.querySelector('#hud-prompt').style.display = locked ? 'none' : 'flex';
    });
  }

  /**
   * Call with true when entering a building interior, false on exit.
   * Hides the click-to-play prompt while inside so it doesn't flash on screen.
   * @param {boolean} inside
   */
  setInteriorMode(inside) {
    this._interiorMode = inside;
    if (!this._el) return;
    this._el.querySelector('#hud-prompt').style.display = inside ? 'none' : 'flex';
  }

  unmount() {
    this._el?.remove();
    this._el = null;
  }

  /**
   * Update HUD state. All params optional — only pass what changed.
   * @param {{ health?: number, ammo?: number, wantedLevel?: number, wantedRising?: boolean }} state
   */
  update({ health, ammo, wantedLevel, wantedRising } = {}) {
    if (!this._el) return;

    if (health !== undefined) {
      this._el.querySelectorAll('.pip').forEach((pip, i) => {
        pip.classList.toggle('empty', i >= health);
      });
    }

    if (ammo !== undefined) {
      this._el.querySelectorAll('.chamber').forEach((c, i) => {
        c.classList.toggle('empty', i >= ammo);
      });
    }

    if (wantedLevel !== undefined) {
      this._el.querySelectorAll('.star').forEach((s, i) => {
        s.classList.toggle('lit',   i < wantedLevel);
        s.classList.toggle('pulse', wantedRising && i === wantedLevel - 1);
      });
    }
  }

  _template() {
    const pips = Array.from({ length: MAX_HEALTH }, (_, i) =>
      `<div class="pip" data-i="${i}"></div>`,
    ).join('');

    const chambers = Array.from({ length: MAX_AMMO }, (_, i) =>
      `<span class="chamber" data-i="${i}">&#9679;</span>`,
    ).join('');

    const stars = Array.from({ length: MAX_STARS }, (_, i) =>
      `<span class="star" data-i="${i}">&#9733;</span>`,
    ).join('');

    return `
      <div class="hud-panel hud-wanted">
        <span class="hud-label">Wanted</span>
        <div class="hud-stars">${stars}</div>
      </div>

      <div class="hud-panel hud-health">
        <span class="hud-label">Health</span>
        <div class="hud-pips">${pips}</div>
      </div>

      <div class="hud-panel hud-ammo">
        <span class="hud-label">Revolver</span>
        <div class="hud-chambers">${chambers}</div>
      </div>

      <div id="hud-prompt">
        <div class="hud-prompt-box">
          Click to play
          <div class="hud-prompt-sub">WASD &nbsp;|&nbsp; Mouse look &nbsp;|&nbsp; Shift sprint &nbsp;|&nbsp; Space jump &nbsp;|&nbsp; F mount/dismount &nbsp;|&nbsp; H whistle</div>
        </div>
      </div>
    `;
  }
}
