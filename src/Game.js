import * as THREE from 'three';
import { MAX_FRAME_DELTA, TONE_MAPPING_EXPOSURE, SKY_TURBIDITY, SKY_RAYLEIGH } from './utils/constants.js';
import { Physics } from './core/Physics.js';
import { Input } from './core/Input.js';
import { Town } from './world/Town.js';
import { Player } from './entities/Player.js';
import { HUD } from './ui/HUD.js';
import { MobileBlock } from './ui/MobileBlock.js';
import { Debug } from './utils/debug.js';

export class Game {
  constructor() {
    this.scene     = new THREE.Scene();
    this.renderer  = null;
    this.camera    = null;
    this._lastTime = 0;

    // Systems instantiated here; initialised in start() after mobile check
    this.physics = new Physics();
    this.input   = new Input();
    this.town    = new Town();
    this.hud     = new HUD();
    /** @type {Player|null} */
    this.player  = null;
    /** @type {Debug|null} */
    this.debug   = null;
  }

  async start() {
    // Bail out before touching WebGL if we're on a touch device
    const isMobile = await MobileBlock.mount();
    if (isMobile) return;

    this._initRenderer();
    this._initCamera();

    // Town must go first: ground physics body must exist before the player spawns
    this.town.init(this.scene, this.renderer, this.physics);
    this.player = new Player(this.scene, this.physics, this.camera, this.input);

    this.hud.mount();

    this.debug = new Debug();
    this._wireDebugGUI();

    requestAnimationFrame((t) => this._loop(t));
  }

  // ─── Renderer / camera ──────────────────────────────────────────────────

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
  }

  // ─── Debug GUI ──────────────────────────────────────────────────────────

  _wireDebugGUI() {
    const gui = this.debug.gui;

    // Fog — properties are plain numbers, GUI mutates them directly
    if (this.scene.fog) {
      const f = gui.addFolder('Fog');
      f.add(this.scene.fog, 'near',  10, 150, 1).name('Near');
      f.add(this.scene.fog, 'far',  50, 300, 1).name('Far');
      f.close();
    }

    // Sky — Three.js uniforms need a proxy object
    const skyU = this.town.getSkyUniforms();
    if (skyU.turbidity) {
      const proxy = { turbidity: SKY_TURBIDITY, rayleigh: SKY_RAYLEIGH };
      const s = gui.addFolder('Sky');
      s.add(proxy, 'turbidity', 0, 20, 0.1).name('Turbidity')
       .onChange((v) => { skyU.turbidity.value = v; });
      s.add(proxy, 'rayleigh',  0,  4, 0.1).name('Rayleigh')
       .onChange((v) => { skyU.rayleigh.value  = v; });
      s.close();
    }

    // Renderer
    const r = gui.addFolder('Renderer');
    r.add(this.renderer, 'toneMappingExposure', 0.5, 3, 0.05).name('Exposure');
    r.close();
  }

  // ─── Game loop ──────────────────────────────────────────────────────────

  /** @param {number} timestamp — ms from requestAnimationFrame */
  _loop(timestamp) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, MAX_FRAME_DELTA);
    this._lastTime = timestamp;

    // Physics runs its own fixed-timestep accumulator inside update()
    this.physics.update(dt);
    this.player?.update(dt);

    // Flush pressed-keys + mouse delta after all systems have consumed them
    this.input.flush();

    this.debug.begin();
    this.renderer.render(this.scene, this.camera);
    this.debug.end();

    requestAnimationFrame((t) => this._loop(t));
  }
}
