import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import * as CANNON from 'cannon-es';
import {
  GROUND_SIZE,
  SUN_COLOR, SUN_INTENSITY,
  AMBIENT_COLOR, AMBIENT_INTENSITY,
  SHADOW_MAP_SIZE,
  SKY_TURBIDITY, SKY_RAYLEIGH, SKY_MIE_COEFF, SKY_MIE_DIR,
  SKY_SUN_ELEVATION, SKY_SUN_AZIMUTH,
  FOG_COLOR, FOG_NEAR, FOG_FAR,
  BUILDING_CONFIGS,
} from '../utils/constants.js';
import { Building } from './Building.js';
import { SheriffsOffice } from './buildings/SheriffsOffice.js';
import { Saloon } from './buildings/Saloon.js';
import { GeneralStore } from './buildings/GeneralStore.js';
import { PostOffice } from './buildings/PostOffice.js';
import { Gunsmith } from './buildings/Gunsmith.js';
import { Props } from './Props.js';

const BUILDING_CLASS_MAP = {
  "Sheriff's Office": SheriffsOffice,
  'Saloon':           Saloon,
  'General Store':    GeneralStore,
  'Post Office':      PostOffice,
  'Gunsmith':         Gunsmith,
};

export class Town {
  constructor() {
    /** @type {Sky} */
    this._sky = null;
    /** @type {THREE.DirectionalLight} */
    this._sunLight = null;
    /** Unit vector toward the sun — shared so lights and sky stay in sync */
    this._sunDir = new THREE.Vector3();
    /** @type {Building[]} */
    this.buildings = [];
    /** @type {Props} */
    this.props = null;
  }

  /**
   * @param {THREE.Scene} scene
   * @param {THREE.WebGLRenderer} renderer
   * @param {import('../core/Physics.js').Physics} physics
   */
  init(scene, renderer, physics) {
    this._initGround(scene, physics);
    this._initSky(scene);          // sets _sunDir
    this._initLights(scene);       // reads _sunDir
    this._initFog(scene);
    this._initBuildings(scene, physics);
    this._initProps(scene);
  }

  _initBuildings(scene, physics) {
    this.buildings = BUILDING_CONFIGS.map((cfg) => {
      const Cls = BUILDING_CLASS_MAP[cfg.name] ?? Building;
      return new Cls(cfg, scene, physics);
    });
  }

  _initProps(scene) {
    this.props = new Props();
    this.props.init(scene);
  }

  _initGround(scene, physics) {
    const geo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      roughness: 0.95,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Infinite static plane — no need for a finite box; cannon Plane handles it
    const body = new CANNON.Body({ mass: 0 });
    body.addShape(new CANNON.Plane());
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    physics.addBody(body);
  }

  _initSky(scene) {
    this._sky = new Sky();
    this._sky.scale.setScalar(450000);
    scene.add(this._sky);

    const u = this._sky.material.uniforms;
    u['turbidity'].value       = SKY_TURBIDITY;
    u['rayleigh'].value        = SKY_RAYLEIGH;
    u['mieCoefficient'].value  = SKY_MIE_COEFF;
    u['mieDirectionalG'].value = SKY_MIE_DIR;

    this._applySunPosition();
  }

  _initLights(scene) {
    scene.add(new THREE.AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY));

    this._sunLight = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);

    // Shadow frustum sized to cover the full town street
    const sc = this._sunLight.shadow.camera;
    sc.near = 0.5; sc.far = 300;
    sc.left = -70; sc.right = 70;
    sc.top  =  70; sc.bottom = -70;

    this._sunLight.position.copy(this._sunDir).multiplyScalar(100);
    scene.add(this._sunLight);
    scene.add(this._sunLight.target); // target stays at origin
  }

  _initFog(scene) {
    scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
    scene.background = new THREE.Color(FOG_COLOR);
  }

  /** Syncs sky shader + directional light to the configured sun angle. */
  _applySunPosition() {
    const phi   = THREE.MathUtils.degToRad(90 - SKY_SUN_ELEVATION);
    const theta = THREE.MathUtils.degToRad(SKY_SUN_AZIMUTH);
    this._sunDir.setFromSphericalCoords(1, phi, theta);
    this._sky.material.uniforms['sunPosition'].value.copy(this._sunDir);
    // If lights are already created (e.g. after a GUI-driven update), reposition
    if (this._sunLight) this._sunLight.position.copy(this._sunDir).multiplyScalar(100);
  }

  /**
   * Exposes sky uniforms for the debug GUI so artists can tweak the look
   * without touching code.
   * @returns {Record<string, THREE.IUniform>}
   */
  getSkyUniforms() {
    return this._sky?.material.uniforms ?? {};
  }
}
