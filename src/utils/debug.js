import Stats from 'stats.js';
import GUI from 'lil-gui';

export class Debug {
  constructor() {
    this._active = false;

    this.stats = new Stats();
    this.stats.showPanel(0); // 0 = FPS
    this.stats.dom.style.display = 'none';
    document.body.appendChild(this.stats.dom);

    this.gui = new GUI({ title: 'Debug' });
    this.gui.hide();

    // Backtick toggles all debug overlays — never ship with them on
    window.addEventListener('keydown', (e) => {
      if (e.key === '`') this._toggle();
    });
  }

  _toggle() {
    this._active = !this._active;
    this.stats.dom.style.display = this._active ? 'block' : 'none';
    if (this._active) {
      this.gui.show();
      document.exitPointerLock();
    } else {
      this.gui.hide();
    }
  }

  begin() { this.stats.begin(); }
  end() { this.stats.end(); }
}
