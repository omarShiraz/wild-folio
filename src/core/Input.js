/**
 * Keyboard + mouse input state.
 * Tracks which keys are held, which were pressed this frame, and accumulated
 * mouse delta since the last call to flush(). Pointer-lock is managed here.
 */
export class Input {
  constructor() {
    /** @type {Set<string>} keys currently held */
    this._held = new Set();
    /** @type {Set<string>} keys pressed this frame (cleared on flush) */
    this._pressed = new Set();

    this.mouseDX = 0;
    this.mouseDY = 0;
    this.isPointerLocked = false;
    /** Set to true while inside a building interior to prevent click-to-lock. */
    this.suppressPointerLock = false;
    /** Set from Game.js after the renderer is created; only canvas clicks request pointer lock. */
    this.canvas = null;
    /** Set to true to freeze all keyboard/mouse input (e.g. portfolio overlay open). */
    this.suppressInput = false;

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this._held.has(e.code)) this._pressed.add(e.code);
      this._held.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this._held.delete(e.code);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === document.body;
    });

    // Only request pointer lock when the renderer canvas itself is clicked.
    // Keeps overlay buttons and lil-gui from accidentally locking the pointer.
    document.addEventListener('click', (e) => {
      if (
        this.canvas &&
        !this.isPointerLocked &&
        !this.suppressPointerLock &&
        !e.target.closest('.lil-gui') &&
        e.composedPath().includes(this.canvas)
      ) {
        document.body.requestPointerLock();
      }
    });
  }

  /** @param {string} code — e.g. 'KeyW', 'ShiftLeft', 'Space' */
  isDown(code) { return this.suppressInput ? false : this._held.has(code); }

  /** True only the first frame the key is held. */
  isPressed(code) { return this.suppressInput ? false : this._pressed.has(code); }

  /** Call once per frame after consuming input state. */
  flush() {
    this._pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
