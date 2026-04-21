import * as THREE from 'three';
import {
  NPC_HEALTH_CIVILIAN, NPC_HEALTH_LAWMAN,
  NPC_HITBOX_W, NPC_HITBOX_H, NPC_HITBOX_D,
} from '../utils/constants.js';

// ── Visual colors ─────────────────────────────────────────────────────────────
const COL_SKIN_CIVILIAN    = 0xc4996a;
const COL_SHIRT_CIVILIAN   = 0x8b6340;
const COL_PANTS_CIVILIAN   = 0x4a3020;
const COL_HAT_CIVILIAN     = 0x2a1a0a;

const COL_SKIN_LAWMAN      = 0xd4aa80;
const COL_SHIRT_LAWMAN     = 0x2a3a4a;
const COL_PANTS_LAWMAN     = 0x1a2030;
const COL_HAT_LAWMAN       = 0x0d0d08;
const COL_BADGE            = 0xd4a800;

const COL_HAIR             = 0x1a0d04;

// Shared across all NPC instances — disposed on NPC.disposeShared() if needed
const _hitboxMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });

let _nextId = 0;

/**
 * Base NPC entity. Subclasses add movement AI.
 *
 * The invisible hitbox child mesh carries `userData.npcId` so NPCManager can
 * reverse-look up an NPC from any raycaster hit without registering the visual
 * body meshes.
 */
export class NPC {
  /**
   * @param {{ type?: 'civilian'|'lawman', position: THREE.Vector3Like }} opts
   * @param {THREE.Scene} scene
   */
  constructor({ type = 'civilian', position }, scene) {
    this.id     = `npc-${_nextId++}`;
    this.type   = type;
    /** @type {'idle'|'walking'|'fleeing'|'dead'} */
    this.state  = 'idle';
    this.health = type === 'lawman' ? NPC_HEALTH_LAWMAN : NPC_HEALTH_CIVILIAN;

    this._scene = scene;

    this.group = new THREE.Group();
    this.group.position.set(position.x, position.y, position.z);
    scene.add(this.group);

    this._buildBody();
    this._buildHitbox();
  }

  // ── Body construction ──────────────────────────────────────────────────────

  _buildBody() {
    const isLawman = this.type === 'lawman';

    const skin    = new THREE.MeshStandardMaterial({ color: isLawman ? COL_SKIN_LAWMAN  : COL_SKIN_CIVILIAN,  roughness: 0.9 });
    const shirt   = new THREE.MeshStandardMaterial({ color: isLawman ? COL_SHIRT_LAWMAN : COL_SHIRT_CIVILIAN, roughness: 0.95 });
    const pants   = new THREE.MeshStandardMaterial({ color: isLawman ? COL_PANTS_LAWMAN : COL_PANTS_CIVILIAN, roughness: 0.95 });
    const hatMat  = new THREE.MeshStandardMaterial({ color: isLawman ? COL_HAT_LAWMAN   : COL_HAT_CIVILIAN,   roughness: 1.0 });
    const hairMat = new THREE.MeshStandardMaterial({ color: COL_HAIR, roughness: 1.0 });

    // Proportions derived from hitbox so the figure scales with NPC_HITBOX_H/W
    const H = NPC_HITBOX_H;
    const W = NPC_HITBOX_W;

    const legH   = H * 0.378;   // 0.68
    const legW   = W * 0.300;   // 0.15 per leg
    const legD   = W * 0.440;   // 0.22
    const legSep = W * 0.200;   // 0.10 from centre to leg centre

    const torsoH = H * 0.278;   // 0.50
    const torsoW = W * 0.820;   // 0.41
    const torsoD = W * 0.500;   // 0.25

    const armH   = H * 0.244;   // 0.44
    const armW   = W * 0.230;   // 0.115
    const armD   = W * 0.280;   // 0.14
    const armSep = torsoW / 2 + armW / 2;

    const headH  = H * 0.167;   // 0.30
    const headW  = W * 0.540;   // 0.27
    const headD  = W * 0.540;   // 0.27

    const brimH  = H * 0.028;   // 0.05
    const brimW  = W * 0.680;   // 0.34
    const crownH = H * 0.083;   // 0.15
    const crownW = W * 0.400;   // 0.20

    const torsoY = legH + torsoH / 2;
    const headY  = legH + torsoH + 0.02 + headH / 2;
    const brimY  = legH + torsoH + 0.02 + headH + brimH / 2;
    const crownY = brimY + brimH / 2 + crownH / 2;

    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      this.group.add(m);
    };

    // Legs
    const legGeo = new THREE.BoxGeometry(legW, legH, legD);
    add(legGeo, pants.clone(), -legSep, legH / 2, 0);
    add(legGeo, pants.clone(),  legSep, legH / 2, 0);

    // Torso
    add(new THREE.BoxGeometry(torsoW, torsoH, torsoD), shirt, 0, torsoY, 0);

    // Arms
    const armGeo = new THREE.BoxGeometry(armW, armH, armD);
    add(armGeo, shirt.clone(), -armSep, torsoY, 0);
    add(armGeo, shirt.clone(),  armSep, torsoY, 0);

    // Head
    add(new THREE.BoxGeometry(headW, headH, headD), skin, 0, headY, 0);

    // Hair
    add(new THREE.BoxGeometry(headW + 0.02, headH * 0.35, headD + 0.02), hairMat, 0, headY + headH * 0.33, 0);

    // Hat brim
    add(new THREE.BoxGeometry(brimW, brimH, brimW), hatMat, 0, brimY, 0);

    // Hat crown
    add(new THREE.BoxGeometry(crownW, crownH, crownW), hatMat.clone(), 0, crownY, 0);

    // Lawman badge — small gold square on chest
    if (isLawman) {
      const badgeMat = new THREE.MeshStandardMaterial({ color: COL_BADGE, roughness: 0.4, metalness: 0.6 });
      add(new THREE.BoxGeometry(0.07, 0.07, 0.03), badgeMat, 0, torsoY + torsoH * 0.1, torsoD / 2 + 0.01);
    }
  }

  _buildHitbox() {
    const geo = new THREE.BoxGeometry(NPC_HITBOX_W, NPC_HITBOX_H, NPC_HITBOX_D);
    this.hitbox = new THREE.Mesh(geo, _hitboxMat);
    // Offset so the bottom of the hitbox sits at y=0 (ground level)
    this.hitbox.position.y = NPC_HITBOX_H / 2;
    this.hitbox.userData.npcId = this.id;
    this.group.add(this.hitbox);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Called every frame by NPCManager. Subclasses override to add movement AI.
   * @param {number} _dt seconds
   */
  update(_dt) {}

  /**
   * Apply damage. Returns true if this blow killed the NPC.
   * @param {number} amount
   * @returns {boolean}
   */
  takeDamage(amount) {
    if (this.state === 'dead') return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this._die();
      return true;
    }
    this._onHit();
    return false;
  }

  /** Called when hit but not killed. Subclasses override for reactions. */
  _onHit() {}

  _die() {
    this.state = 'dead';
    // Fall flat on back: rotate forward around the NPC's local X axis.
    // Preserve the current Y rotation so the body lands in the direction they
    // were facing rather than snapping to world axes.
    this.group.rotation.x = -Math.PI / 2;
    // Raise group origin so the body depth (now the vertical extent) clears the ground.
    this.group.position.y = NPC_HITBOX_D / 2;
  }

  /** Remove this NPC's group from the scene and free GPU resources. */
  dispose() {
    this._scene.remove(this.group);
    this.group.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m === _hitboxMat) continue; // module-scoped shared material — must not be disposed per-instance
        m?.dispose();
      }
    });
  }
}
