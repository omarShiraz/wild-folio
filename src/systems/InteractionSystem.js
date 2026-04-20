import { INTERACTION_POLL_RATE } from '../utils/constants.js';

/**
 * @typedef {{ mesh: { position: THREE.Vector3 }, body: { position: {x:number,y:number,z:number} } }} Interactable
 */

/**
 * @typedef {Object} InteractionDef
 * @property {Interactable} [target]    — entity whose body/mesh position is the trigger centre.
 *                                        Ignored when `position` is set.
 * @property {THREE.Vector3} [position] — fixed world-space trigger centre (takes priority over target)
 * @property {number} range             — trigger radius in world units
 * @property {string} prompt            — e.g. "Press F to mount"
 * @property {string} key               — Input code, e.g. 'KeyF'
 * @property {() => void} onInteract    — callback when key pressed in range
 * @property {() => boolean} [enabled]  — optional guard; default true
 */

const CSS = `
  #interaction-prompt {
    position: fixed;
    bottom: 180px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 110;
    opacity: 0;
    transition: opacity 0.15s;
  }

  #interaction-prompt.visible { opacity: 1; }

  #interaction-prompt .prompt-box {
    background: rgba(20, 8, 0, 0.75);
    border: 1px solid rgba(212, 169, 106, 0.4);
    color: #d4a96a;
    font-family: Georgia, serif;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 10px 22px;
    text-align: center;
    white-space: nowrap;
  }
`;

/**
 * Checks player proximity to registered interactable entities each frame.
 * Shows a prompt and fires a callback when the player presses the right key.
 */
export class InteractionSystem {
  /**
   * @param {import('../core/Input.js').Input} input
   */
  constructor(input) {
    this._input = input;
    /** @type {InteractionDef[]} */
    this._defs = [];
    /** @type {InteractionDef|null} */
    this._active = null;
    this._timer = 0;

    this._mountDOM();
  }

  _mountDOM() {
    if (!document.getElementById('interaction-styles')) {
      const style = document.createElement('style');
      style.id = 'interaction-styles';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    this._el = document.createElement('div');
    this._el.id = 'interaction-prompt';
    this._el.innerHTML = '<div class="prompt-box"></div>';
    document.body.appendChild(this._el);
    this._textEl = this._el.querySelector('.prompt-box');
  }

  /**
   * Register an interactable.
   * @param {InteractionDef} def
   */
  register(def) {
    this._defs.push(def);
  }

  /**
   * Remove all interactions for a given target entity.
   * @param {Interactable} target
   */
  unregister(target) {
    this._defs = this._defs.filter((d) => d.target !== target);
    if (this._active?.target === target) {
      this._active = null;
      this._hidePrompt();
    }
  }

  /**
   * @param {number} dt — seconds
   * @param {THREE.Vector3} playerPos — player world position
   */
  update(dt, playerPos) {
    this._timer += dt;

    // Throttle proximity checks — no need every frame
    if (this._timer >= INTERACTION_POLL_RATE) {
      this._timer = 0;
      this._findClosest(playerPos);
    }

    // Key press check runs every frame for responsiveness
    if (this._active && this._input.isPressed(this._active.key)) {
      this._active.onInteract();
      // Re-evaluate immediately in case the interaction changed state
      this._findClosest(playerPos);
    }
  }

  /**
   * Find the closest in-range interactable and show/hide the prompt.
   * @param {THREE.Vector3} playerPos
   */
  _findClosest(playerPos) {
    let best = null;
    let bestDist = Infinity;

    for (const def of this._defs) {
      if (def.enabled && !def.enabled()) continue;

      // Fixed position takes priority; fall back to entity body/mesh position
      const tp = def.position
        ?? (def.target.body ? def.target.body.position : def.target.mesh.position);
      const dx = playerPos.x - tp.x;
      const dz = playerPos.z - tp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < def.range && dist < bestDist) {
        bestDist = dist;
        best = def;
      }
    }

    if (best !== this._active) {
      this._active = best;
      if (best) {
        this._showPrompt(best.prompt);
      } else {
        this._hidePrompt();
      }
    }
  }

  /** @param {string} text */
  _showPrompt(text) {
    this._textEl.textContent = text;
    this._el.classList.add('visible');
  }

  _hidePrompt() {
    this._el.classList.remove('visible');
  }

  /** Force-hide the prompt and clear active interaction (e.g. when entering a building). */
  clear() {
    this._active = null;
    this._hidePrompt();
  }

  dispose() {
    this._el?.remove();
    this._defs = [];
    this._active = null;
  }
}
