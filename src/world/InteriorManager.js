import * as THREE from 'three';

const FADE_MS = 350;

const CSS = `
  #interior-fade {
    position: fixed;
    inset: 0;
    background: #000;
    pointer-events: none;
    opacity: 0;
    transition: opacity ${FADE_MS}ms ease;
    z-index: 200;
  }
  #interior-exit-prompt {
    position: fixed;
    bottom: 140px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 110;
    opacity: 0;
    transition: opacity 0.2s;
  }
  #interior-exit-prompt.visible { opacity: 1; }
  #interior-exit-prompt .prompt-box {
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

export class InteriorManager {
  constructor() {
    this._scene  = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this._scene.background = new THREE.Color(0x1a0a02);

    /** @type {import('./Building.js').Building|null} */
    this._currentBuilding = null;
    this._isInside = false;
    /** True while a fade-in or fade-out transition is in progress. */
    this._isTransitioning = false;
    /** Set by Game.js after portfolio.json is loaded. */
    this.portfolioData = {};

    this._mountDOM();

    window.addEventListener('resize', () => {
      this._camera.aspect = window.innerWidth / window.innerHeight;
      this._camera.updateProjectionMatrix();
    });
  }

  get isInside() { return this._isInside; }

  _mountDOM() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this._fadeEl = document.createElement('div');
    this._fadeEl.id = 'interior-fade';
    document.body.appendChild(this._fadeEl);

    this._exitEl = document.createElement('div');
    this._exitEl.id = 'interior-exit-prompt';
    this._exitEl.innerHTML = '<div class="prompt-box">Press E or Esc to exit</div>';
    this._exitEl.style.display = 'none';
    document.body.appendChild(this._exitEl);
  }

  /**
   * Fade to black → build room → fade in.
   * No-ops if a transition is already in progress.
   * @param {import('./Building.js').Building} building
   * @param {() => void} [onEntered] — called once fully faded in
   */
  enter(building, onEntered) {
    if (this._isTransitioning || this._isInside) return;
    this._isTransitioning = true;
    this._isInside = true;
    this._fadeEl.style.opacity = '1';
    setTimeout(() => {
      this._currentBuilding = building;
      this._buildRoom(building);
      this._fadeEl.style.opacity = '0';
      setTimeout(() => {
        this._isTransitioning = false;
        this._exitEl.style.display = 'block';
        this._exitEl.style.opacity = '1';
        onEntered?.();
      }, FADE_MS);
    }, FADE_MS);
  }

  /**
   * Fade to black → dispose scene → signal done → fade in.
   * No-ops if a transition is already in progress.
   * @param {() => void} [onExited] — called once fully faded back in
   */
  exit(onExited) {
    if (this._isTransitioning || !this._isInside) return;
    this._isTransitioning = true;
    this._exitEl.style.display = 'none';
    // Tear down click handlers before the fade so they can't fire during the overlay
    this._currentBuilding?.disposeInterior?.();
    this._fadeEl.style.opacity = '1';
    setTimeout(() => {
      // Screen is fully black — safe to release GPU resources and stop rendering interior
      this._disposeSceneContent();
      this._isInside = false;
      this._currentBuilding = null;
      this._fadeEl.style.opacity = '0';
      setTimeout(() => {
        this._isTransitioning = false;
        onExited?.();
      }, FADE_MS);
    }, FADE_MS);
  }

  /**
   * Traverse the interior scene, dispose all mesh geometry/materials/textures,
   * then clear the scene. Safe to call on an already-empty scene.
   */
  _disposeSceneContent() {
    this._scene.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        // Dispose any texture maps bound to this material
        for (const slot of ['map', 'alphaMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'emissiveMap', 'aoMap']) {
          m[slot]?.dispose();
        }
        m.dispose();
      }
    });
    this._scene.clear();
  }

  /** @param {import('./Building.js').Building} building */
  _buildRoom(building) {
    // Dispose any leftover content from a previous session before rebuilding
    this._disposeSceneContent();

    const w = building.width;
    const h = building.height;
    const d = building.depth;

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x5c3310, roughness: 0.95 });
    const wallMat  = new THREE.MeshStandardMaterial({ color: 0x7a4e28, roughness: 0.9 });
    const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.9 });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this._scene.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = h;
    this._scene.add(ceil);

    // Back wall (content will be mounted here in Tasks 4–8)
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    back.position.set(0, h / 2, -d / 2);
    this._scene.add(back);

    // Front wall (behind player, for enclosure)
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat.clone());
    front.position.set(0, h / 2, d / 2);
    front.rotation.y = Math.PI;
    this._scene.add(front);

    // Left wall
    const left = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat.clone());
    left.position.set(-w / 2, h / 2, 0);
    left.rotation.y = Math.PI / 2;
    this._scene.add(left);

    // Right wall
    const right = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat.clone());
    right.position.set(w / 2, h / 2, 0);
    right.rotation.y = -Math.PI / 2;
    this._scene.add(right);

    // Ceiling lantern — warm point light
    const lantern = new THREE.PointLight(0xff9944, 18, d * 3.5);
    lantern.position.set(0, h - 0.3, 0);
    this._scene.add(lantern);

    // Low fill light so floor and lower props aren't pitch black
    const fill = new THREE.PointLight(0xffaa44, 6, d * 2.5);
    fill.position.set(0, 0.9, 0);
    this._scene.add(fill);

    // Warm ambient — enough to see walls clearly while keeping the saloon mood
    this._scene.add(new THREE.AmbientLight(0x7a4a18, 5));

    // Camera at the doorway end, looking toward the back wall
    this._camera.position.set(0, 1.6, d / 2 - 1);
    this._camera.lookAt(0, 1.6, -d / 2 + 1);

    // Let the building subclass populate its own props / content
    if (typeof building.buildInterior === 'function') {
      building.buildInterior(this._scene, this.portfolioData, this._camera);
    }
  }

  /**
   * Call every frame while inside. Returns true if the player pressed the exit key.
   * @param {number} _dt
   * @param {import('../core/Input.js').Input} input
   * @returns {boolean}
   */
  update(_dt, input) {
    if (!this._isInside) return false;
    return input.isPressed('KeyE') || input.isPressed('Escape');
  }

  /** @param {THREE.WebGLRenderer} renderer */
  render(renderer) {
    renderer.render(this._scene, this._camera);
  }

  dispose() {
    this._fadeEl?.remove();
    this._exitEl?.remove();
  }
}
