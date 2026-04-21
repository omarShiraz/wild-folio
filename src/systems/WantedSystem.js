import { bus } from '../core/EventBus.js';

const MAX_WANTED = 3;

/**
 * Tracks the player's wanted level based on crime events.
 * Listens on the event bus and updates the HUD.
 */
export class WantedSystem {
  /**
   * @param {import('../ui/HUD.js').HUD} hud
   */
  constructor(hud) {
    this._hud = hud;
    this._level = 0;
    this._rising = false;
    this._riseCooldown = 0; // seconds remaining for pulse effect

    this._bindEvents();
    this._syncHUD();
  }

  _bindEvents() {
    bus.on('crime:horse_stolen', () => this._raise(1));
    bus.on('crime:witnessed',    () => this._raise(1));
  }

  /**
   * @param {number} amount — stars to add
   */
  _raise(amount) {
    const prev = this._level;
    this._level = Math.min(this._level + amount, MAX_WANTED);
    if (this._level > prev) {
      this._rising = true;
      this._riseCooldown = 1.5; // pulse for 1.5 seconds
      bus.emit('wanted:raised', { level: this._level });
    }
    this._syncHUD();
  }

  /**
   * @param {number} dt — seconds
   */
  update(dt) {
    if (this._riseCooldown > 0) {
      this._riseCooldown -= dt;
      if (this._riseCooldown <= 0) {
        this._rising = false;
        this._syncHUD();
      }
    }
  }

  _syncHUD() {
    this._hud.update({
      wantedLevel: this._level,
      wantedRising: this._rising,
    });
  }

  /** @returns {number} current wanted level (0–3) */
  get level() {
    return this._level;
  }

  /** Reset wanted to 0 (e.g. after death in wave shooter). */
  clear() {
    this._level = 0;
    this._rising = false;
    this._riseCooldown = 0;
    this._syncHUD();
    bus.emit('wanted:cleared');
  }
}
