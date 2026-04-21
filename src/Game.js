import * as THREE from 'three';
import {
  MAX_FRAME_DELTA, TONE_MAPPING_EXPOSURE, SKY_TURBIDITY, SKY_RAYLEIGH,
  HORSE_MOUNT_RANGE, DOOR_TRIGGER_RADIUS,
  STREET_WIDTH, BUILDING_CONFIGS,
  NPC_CIVILIAN_SPAWNS,
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
import { NPCManager } from './systems/NPCManager.js';
import { CivilianNPC } from './entities/CivilianNPC.js';
import { InteriorManager } from './world/InteriorManager.js';
import { PortfolioOverlay } from './ui/PortfolioOverlay.js';
import { audioManager } from './core/AudioManager.js';
import { Debug } from './utils/debug.js';
import { sounds } from './core/SoundSynth.js';

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
    /** @type {NPCManager} */
    this.npcManager = new NPCManager();
    /** @type {InteriorManager} */
    this.interiorManager = new InteriorManager();
    /** @type {PortfolioOverlay} */
    this.portfolioOverlay = new PortfolioOverlay();
    /** @type {Debug|null} */
    this.debug   = null;

    // ── Shooting state ──
    this._ammo        = 6;
    this._reloading   = false;
    this._reloadTimer = 0;
    this._shootFwd    = new THREE.Vector3(); // reused to avoid per-shot alloc
    this._shootRay    = new THREE.Raycaster();
  }

  async start() {
    // Bail out before touching WebGL if we're on a touch device
    const isMobile = await MobileBlock.mount();
    if (isMobile) return;

    // Load portfolio data once; buildings read from it when entered
    this.portfolioData = await fetch('/content/portfolio.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
        return r.json();
      })
      .catch((err) => {
        console.error('[Game] Failed to load portfolio.json:', err.message ?? err);
        return {};
      });
    this.interiorManager.portfolioData = this.portfolioData;

    this.portfolioOverlay.mount(this.portfolioData, {
      onOpen: () => {
        this.input.suppressInput = true;
        document.exitPointerLock();
      },
      onClose: () => {
        this.input.suppressInput = false;
        if (!this.interiorManager.isInside) {
          document.body.requestPointerLock();
        }
      },
    });

    this._initRenderer();
    this.input.canvas = this.renderer.domElement;
    this._initCamera();

    // Town must go first: ground physics body must exist before the player spawns
    this.town.init(this.scene, this.renderer, this.physics);
    this.player = new Player(this.scene, this.physics, this.camera, this.input);

    this._spawnHorses();
    this._spawnCivilians();

    this.hud.mount();
    this._ammo = 6;
    this.hud.update({ health: 10, ammo: this._ammo, wantedLevel: 0 });
    this.interactions = new InteractionSystem(this.input);
    this.wantedSystem = new WantedSystem(this.hud);
    this._registerHorseInteractions();
    this._registerBuildingInteractions();
    this._bindHorseKeys();

    bus.on('building:enter', ({ building }) => this._enterBuilding(building));

    // Start outdoor ambient on first pointer lock (guarantees a user gesture has fired)
    const onFirstLock = () => {
      if (document.pointerLockElement === document.body) {
        audioManager.playOutdoorAmbient();
        document.removeEventListener('pointerlockchange', onFirstLock);
      }
    };
    document.addEventListener('pointerlockchange', onFirstLock);

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

  _spawnCivilians() {
    for (const { x, z } of NPC_CIVILIAN_SPAWNS) {
      const npc = new CivilianNPC(
        { position: new THREE.Vector3(x, 0, z) },
        this.scene,
      );
      this.npcManager.register(npc);
    }
  }

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
    this.hud.setInteractionPromptVisible(false);
    this.input.suppressPointerLock = true;
    this.hud.setInteriorMode(true);
    document.exitPointerLock();
    audioManager.playBuildingAmbient(building.name);
    this.interiorManager.enter(building);
  }

  _exitBuilding() {
    audioManager.stopAmbient();
    this.interiorManager.exit(() => {
      this.input.suppressPointerLock = false;
      this.hud.setInteriorMode(false);
      this.hud.setInteractionPromptVisible(true);
      audioManager.playOutdoorAmbient();
      // Pointer lock is re-acquired on the next canvas click via Input's click handler,
      // which runs with proper user activation (avoids the lost-activation issue in async callbacks).
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

  // ─── Shooting ───────────────────────────────────────────────────────────

  /** Tick the reload countdown; call once per outdoor frame. */
  _tickReload(dt) {
    if (!this._reloading) return;
    this._reloadTimer -= dt;
    if (this._reloadTimer <= 0) {
      this._reloading = false;
      this._ammo = 6;
      this.hud.update({ ammo: this._ammo });
      this.hud.setReloading(false);
      sounds.reloadSnap();
    }
  }

  _startReload() {
    if (this._reloading) return;
    this._reloading   = true;
    this._reloadTimer = 2.0;
    this.hud.setReloading(true);
  }

  _handleShooting() {
    // Manual reload via R (only when not already reloading)
    if (this.input.isPressed('KeyR') && !this.input.suppressInput && !this._reloading) {
      this._startReload();
      return;
    }

    if (!this.input.lmbPressed) return;
    if (!this.input.isPointerLocked) return;
    if (this.input.suppressInput) return;

    // Can't fire while reloading
    if (this._reloading) return;

    // Empty cylinder click
    if (this._ammo <= 0) {
      sounds.emptyClick();
      return;
    }

    // Fire
    this._ammo--;
    this.hud.update({ ammo: this._ammo });
    sounds.gunshot();

    this._shootRay.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hitboxes = this.npcManager.getAlive().map((n) => n.hitbox);
    const hits     = this._shootRay.intersectObjects(hitboxes, false);

    let hitPoint = null;
    if (hits.length > 0) {
      hitPoint = hits[0].point;
      const npc = this.npcManager.getByMesh(hits[0].object);
      if (npc) {
        const killed = npc.takeDamage(50);
        if (killed) sounds.npcDeath();
        else        sounds.npcHit();
      }
    }

    this._spawnMuzzleFlash(hitPoint);

    // Auto-reload on last round
    if (this._ammo === 0) this._startReload();
  }

  /**
   * Spawn a brief muzzle-flash point light + tracer line, then dispose.
   * @param {THREE.Vector3|null} hitPoint — world-space impact, or null for a miss
   */
  _spawnMuzzleFlash(hitPoint) {
    this.camera.getWorldDirection(this._shootFwd);

    // Muzzle position: 1.2 m ahead of camera (roughly at gun barrel)
    const muzzle = this.camera.position.clone()
      .addScaledVector(this._shootFwd, 1.2);

    // Brief warm flash light
    const flash = new THREE.PointLight(0xffcc55, 10, 7);
    flash.position.copy(muzzle);
    this.scene.add(flash);

    // Tracer from muzzle to impact (or 80 m miss distance)
    const end = hitPoint
      ? hitPoint.clone()
      : muzzle.clone().addScaledVector(this._shootFwd, 80);

    const geo = new THREE.BufferGeometry().setFromPoints([muzzle, end]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffee77, transparent: true, opacity: 0.65 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    // Clean up after 80 ms
    setTimeout(() => {
      this.scene.remove(flash);
      flash.dispose();
      this.scene.remove(line);
      geo.dispose();
      mat.dispose();
    }, 80);
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
      this.hud.setAiming(this.player?.isAiming ?? false);
      this._tickReload(dt);
      this._handleShooting();
      this.npcManager.update(dt);
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
