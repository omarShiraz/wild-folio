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

    // Click canvas to request pointer lock (skip if clicking debug GUI)
    document.addEventListener('click', (e) => {
      if (!this.isPointerLocked && !e.target.closest('.lil-gui')) {
        document.body.requestPointerLock();
      }
    });
  }

  /** @param {string} code — e.g. 'KeyW', 'ShiftLeft', 'Space' */
  isDown(code) { return this._held.has(code); }

  /** True only the first frame the key is held. */
  isPressed(code) { return this._pressed.has(code); }

  /** Call once per frame after consuming input state. */
  flush() {
    this._pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
