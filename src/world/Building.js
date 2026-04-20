import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  STREET_WIDTH, BUILDING_SETBACK,
  BUILDING_ROUGHNESS,
  SIGN_HEIGHT_FRAC, SIGN_WIDTH_FRAC, SIGN_MAX_WIDTH,
} from '../utils/constants.js';

export class Building {
  /**
   * @param {{ name: string, w: number, h: number, d: number,
   *           x: number, side: 'north'|'south', color: number }} config
   * @param {THREE.Scene} scene
   * @param {import('../core/Physics.js').Physics} physics
   */
  constructor(config, scene, physics) {
    const { name, w, h, d, x: streetX, side, color } = config;

    // Street runs along X. North side = −Z, south side = +Z.
    const sideSign = side === 'north' ? -1 : 1;
    const faceZ    = (STREET_WIDTH / 2 + BUILDING_SETBACK) * sideSign;
    const centerZ  = faceZ + (d / 2) * sideSign;

    /** @type {THREE.Vector3} world-space centre of this building */
    this.position = new THREE.Vector3(streetX, h / 2, centerZ);
    /** @type {THREE.Vector3} centre of the street-facing door at ground level */
    this.doorPosition = new THREE.Vector3(streetX, 0, faceZ);
    this.name   = name;
    this.width  = w;
    this.height = h;
    this.depth  = d;

    this._buildMesh(scene, w, h, d, color);
    this._buildSign(scene, name, w, h, d, sideSign);
    this._buildBody(physics, w, h, d);
  }

  _buildMesh(scene, w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: BUILDING_ROUGHNESS,
      metalness: 0.0,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  _buildSign(scene, name, w, h, d, sideSign) {
    const canvas  = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 128;
    const ctx     = canvas.getContext('2d');

    // Parchment background
    ctx.fillStyle = '#d4a96a';
    ctx.fillRect(0, 0, 512, 128);
    // Ink border
    ctx.strokeStyle = '#5c3310';
    ctx.lineWidth   = 8;
    ctx.strokeRect(4, 4, 504, 120);
    // Building name
    ctx.fillStyle      = '#2a1a0a';
    ctx.font           = 'bold 48px Georgia, serif';
    ctx.textAlign      = 'center';
    ctx.textBaseline   = 'middle';
    ctx.fillText(name, 256, 64);

    const signW   = Math.min(w * SIGN_WIDTH_FRAC, SIGN_MAX_WIDTH);
    const signGeo = new THREE.PlaneGeometry(signW, 0.9);
    const signMat = new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(canvas),
      roughness: 0.8,
    });
    const sign = new THREE.Mesh(signGeo, signMat);

    // Place sign on the street-facing wall, near the roofline
    const GAP = 0.06; // prevents z-fighting with the wall
    sign.position.set(
      this.position.x,
      h * SIGN_HEIGHT_FRAC,
      this.position.z - sideSign * (d / 2 + GAP),
    );

    // North buildings (sideSign=-1): wall faces +Z → PlaneGeometry default, no rotation
    // South buildings (sideSign=+1): wall faces -Z → rotate π
    if (sideSign === 1) sign.rotation.y = Math.PI;

    scene.add(sign);
    this.sign = sign;
  }

  _buildBody(physics, w, h, d) {
    this.body = new CANNON.Body({ mass: 0 });
    this.body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
    this.body.position.copy(this.position);
    physics.addBody(this.body);
  }
}
