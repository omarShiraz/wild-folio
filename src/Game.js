import * as THREE from 'three';
import {
  MAX_FRAME_DELTA, TONE_MAPPING_EXPOSURE, SKY_TURBIDITY, SKY_RAYLEIGH,
  HORSE_MOUNT_RANGE, DOOR_TRIGGER_RADIUS,
  STREET_WIDTH, BUILDING_CONFIGS,
} from './utils/constants.js';
import { bus } from './core/EventBus.js';
import { Physics } from './core/Physics.js';
import { Input } from './core/Input.js';
import { Town } from './world/Town.js';
import { Player } from './entities/Player.js';
import { Horse } from './entities/Horse.js';
import { HUD } from './ui/HUD.js';
import { MobileBlock } from './ui/MobileBlock.js';
import { InteractionSystem } from './systems/InteractionSystem.js';
import { WantedSystem } from './systems/WantedSystem.js';
import { InteriorManager } from './world/InteriorManager.js';
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
    /** @type {Horse[]} */
    this.horses  = [];
    /** @type {InteractionSystem|null} */
    this.interactions = null;
    /** @type {WantedSystem|null} */
    this.wantedSystem = null;
    /** @type {InteriorManager} */
    this.interiorManager = new InteriorManager();
    /** @type {Debug|null} */
    this.debug   = null;
  }

  async start() {
    // Bail out before touching WebGL if we're on a touch device
    const isMobile = await MobileBlock.mount();
    if (isMobile) return;

    // Load portfolio data once; buildings read from it when entered
    this.portfolioData = await fetch('/content/portfolio.json')
      .then((r) => r.json())
      .catch(() => ({}));
    this.interiorManager.portfolioData = this.portfolioData;

    this._initRenderer();
    this._initCamera();

    // Town must go first: ground physics body must exist before the player spawns
    this.town.init(this.scene, this.renderer, this.physics);
    this.player = new Player(this.scene, this.physics, this.camera, this.input);

    this._spawnHorses();

    this.hud.mount();
    this.interactions = new InteractionSystem(this.input);
    this.wantedSystem = new WantedSystem(this.hud);
    this._registerHorseInteractions();
    this._registerBuildingInteractions();
    this._bindHorseKeys();

    bus.on('building:enter', ({ building }) => this._enterBuilding(building));

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

  // ─── Horses ─────────────────────────────────────────────────────────────

  _spawnHorses() {
    const hitchZ = STREET_WIDTH / 2 + 2;
    const saloon   = BUILDING_CONFIGS.find((c) => c.name === 'Saloon');
    const sheriffs = BUILDING_CONFIGS.find((c) => c.name === "Sheriff's Office");

    // Player's owned horse — spawns at player start position
    const playerStartZ = this.player.body.position.z;
    const playerHorse = new Horse(
      this.scene, this.physics,
      new THREE.Vector3(0, 0, playerStartZ),
      0, 'player',
    );
    this.horses.push(playerHorse);
    this.player.ownedHorse = playerHorse;

    // Auto-mount the player on their horse at start
    this.player.mountImmediate(playerHorse);

    // NPC horses at hitching posts
    const spawns = [];
    if (saloon)   spawns.push({ x: saloon.x + 2.5,  z: -hitchZ, yaw: Math.PI / 2,  owner: 'npc' });
    if (sheriffs) spawns.push({ x: sheriffs.x + 2.5, z:  hitchZ, yaw: -Math.PI / 2, owner: 'npc' });

    for (const s of spawns) {
      const pos = new THREE.Vector3(s.x, 0, s.z);
      const horse = new Horse(this.scene, this.physics, pos, s.yaw, s.owner);
      this.horses.push(horse);
    }
  }

  _registerHorseInteractions() {
    for (const horse of this.horses) {
      this.interactions.register({
        target: horse,
        range: HORSE_MOUNT_RANGE,
        prompt: 'Press F to mount',
        key: 'KeyF',
        onInteract: () => this._handleMount(horse),
        enabled: () => !this.player.isMounted,
      });
    }
  }

  /** @param {Horse} horse */
  _handleMount(horse) {
    this.player.mount(horse);
  }

  _registerBuildingInteractions() {
    for (const building of this.town.buildings) {
      this.interactions.register({
        position: building.doorPosition,
        range: DOOR_TRIGGER_RADIUS,
        prompt: `Press E to enter — ${building.name}`,
        key: 'KeyE',
        onInteract: () => bus.emit('building:enter', { building }),
        // Cannot enter while mounted
        enabled: () => !this.player.isMounted,
      });
    }
  }

  /** @param {import('./world/Building.js').Building} building */
  _enterBuilding(building) {
    document.getElementById('interaction-prompt').style.display = 'none';
    this.input.suppressPointerLock = true;
    this.hud.setInteriorMode(true);
    document.exitPointerLock();
    this.interiorManager.enter(building);
  }

  _exitBuilding() {
    this.interiorManager.exit(() => {
      this.input.suppressPointerLock = false;
      this.hud.setInteriorMode(false);
      document.getElementById('interaction-prompt').style.display = '';
      document.body.requestPointerLock();
    });
  }

  _bindHorseKeys() {
    // F key for dismount (handled outside InteractionSystem since player is mounted)
    // H key for whistle
    // We check these in the loop via input polling — but we need per-frame checks,
    // so hook into the loop by adding a pre-flush step.
    this._horseKeyHandler = () => {
      if (this.player.isMounted && this.input.isPressed('KeyF')) {
        this.player.dismount();
      }
      if (!this.player.isMounted && this.input.isPressed('KeyH')) {
        this.player.whistle(this.horses);
      }
    };
  }

  // ─── Game loop ──────────────────────────────────────────────────────────

  /** @param {number} timestamp — ms from requestAnimationFrame */
  _loop(timestamp) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, MAX_FRAME_DELTA);
    this._lastTime = timestamp;

    this.physics.update(dt);

    if (this.interiorManager.isInside) {
      // Interior: check for exit key, skip all outdoor simulation
      if (this.interiorManager.update(dt, this.input)) {
        this._exitBuilding();
      }
    } else {
      for (const horse of this.horses) horse.update(dt);
      this.player?.update(dt);
      this.interactions?.update(dt, this.player?.position ?? new THREE.Vector3());
      this.wantedSystem?.update(dt);
      this._horseKeyHandler?.();
    }

    this.input.flush();

    this.debug.begin();
    if (this.interiorManager.isInside) {
      this.interiorManager.render(this.renderer);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this.debug.end();

    requestAnimationFrame((t) => this._loop(t));
  }
}
