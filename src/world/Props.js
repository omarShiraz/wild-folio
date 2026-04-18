import * as THREE from 'three';
import {
  BARREL_RADIUS, BARREL_HEIGHT,
  FENCE_POST_W, FENCE_POST_H, FENCE_RAIL_H, FENCE_SPACING,
  HITCHING_POST_H, HITCHING_RAIL_W,
  COLOR_BARREL, COLOR_FENCE_POST, COLOR_FENCE_RAIL, COLOR_HITCHING,
  STREET_WIDTH, BUILDING_SETBACK, BUILDING_CONFIGS,
} from '../utils/constants.js';

// Props are visual dressing in Phase 1 — no physics bodies yet.
// Add collision shapes here in a later polish pass if needed.

export class Props {
  constructor() {
    /** @type {THREE.Mesh[]} */
    this._meshes = [];
  }

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    for (const cfg of BUILDING_CONFIGS) {
      const sideSign = cfg.side === 'north' ? -1 : 1;
      const faceZ    = (STREET_WIDTH / 2 + BUILDING_SETBACK) * sideSign;
      // Barrels sit just in front of the building face, offset sideways
      const barrelZ  = faceZ + sideSign * 0.5;
      this._addBarrel(scene, cfg.x - cfg.w * 0.35, barrelZ);
      this._addBarrel(scene, cfg.x + cfg.w * 0.35, barrelZ);

      // Fence sections flanking the building
      const leftStart  = cfg.x - cfg.w / 2 - FENCE_SPACING * 1.5;
      const rightStart = cfg.x + cfg.w / 2 + FENCE_SPACING * 0.5;
      const fenceZ     = faceZ + sideSign * 1.5;
      this._addFenceSection(scene, leftStart,  fenceZ, 2);
      this._addFenceSection(scene, rightStart, fenceZ, 2);
    }

    // Hitching posts in front of the Saloon and Sheriff's Office
    const hitchZ = (STREET_WIDTH / 2 + 2);
    const saloon   = BUILDING_CONFIGS.find((c) => c.name === 'Saloon');
    const sheriffs = BUILDING_CONFIGS.find((c) => c.name === "Sheriff's Office");
    if (saloon)   this._addHitchingPost(scene, saloon.x,   -hitchZ);
    if (sheriffs) this._addHitchingPost(scene, sheriffs.x,  hitchZ);
  }

  _addBarrel(scene, x, z) {
    const geo  = new THREE.CylinderGeometry(BARREL_RADIUS, BARREL_RADIUS, BARREL_HEIGHT, 10);
    const mat  = new THREE.MeshStandardMaterial({ color: COLOR_BARREL, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, BARREL_HEIGHT / 2, z);
    mesh.castShadow = true;
    scene.add(mesh);
    this._meshes.push(mesh);
  }

  /** @param {number} count — number of posts in the section */
  _addFenceSection(scene, startX, z, count) {
    const postMat = new THREE.MeshStandardMaterial({ color: COLOR_FENCE_POST, roughness: 0.95 });
    const railMat = new THREE.MeshStandardMaterial({ color: COLOR_FENCE_RAIL, roughness: 0.95 });

    for (let i = 0; i < count; i++) {
      const postGeo = new THREE.BoxGeometry(FENCE_POST_W, FENCE_POST_H, FENCE_POST_W);
      const post    = new THREE.Mesh(postGeo, postMat);
      post.position.set(startX + i * FENCE_SPACING, FENCE_POST_H / 2, z);
      post.castShadow = true;
      scene.add(post);
      this._meshes.push(post);
    }

    if (count < 2) return;
    const railLen = (count - 1) * FENCE_SPACING;
    const centerX = startX + railLen / 2;
    const railGeo = new THREE.BoxGeometry(railLen, FENCE_RAIL_H, FENCE_RAIL_H);

    for (const yFrac of [0.65, 0.35]) {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(centerX, FENCE_POST_H * yFrac, z);
      rail.castShadow = true;
      scene.add(rail);
      this._meshes.push(rail);
    }
  }

  _addHitchingPost(scene, x, z) {
    const postMat = new THREE.MeshStandardMaterial({ color: COLOR_HITCHING, roughness: 0.9 });
    const railMat = postMat; // same material, shared

    const postGeo = new THREE.BoxGeometry(FENCE_POST_W * 1.5, HITCHING_POST_H, FENCE_POST_W * 1.5);
    for (const dx of [-HITCHING_RAIL_W / 2, HITCHING_RAIL_W / 2]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x + dx, HITCHING_POST_H / 2, z);
      post.castShadow = true;
      scene.add(post);
      this._meshes.push(post);
    }

    const railGeo = new THREE.BoxGeometry(HITCHING_RAIL_W, FENCE_RAIL_H * 2, FENCE_RAIL_H * 2);
    const rail    = new THREE.Mesh(railGeo, railMat);
    rail.position.set(x, HITCHING_POST_H * 0.85, z);
    rail.castShadow = true;
    scene.add(rail);
    this._meshes.push(rail);
  }
}
