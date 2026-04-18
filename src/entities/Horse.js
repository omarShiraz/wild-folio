import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  HORSE_BODY_W, HORSE_BODY_H, HORSE_BODY_L,
  HORSE_LEG_RADIUS, HORSE_LEG_H,
  HORSE_HEAD_W, HORSE_HEAD_H, HORSE_HEAD_L, HORSE_NECK_L,
  HORSE_MASS,
  HORSE_WALK_SPEED, HORSE_TROT_SPEED, HORSE_CANTER_SPEED, HORSE_GALLOP_SPEED,
  HORSE_ACCEL, HORSE_DECEL, HORSE_GALLOP_ACCEL, HORSE_TAP_KICK, HORSE_TURN_SPEED,
  HORSE_WHISTLE_SPEED, HORSE_ARRIVE_DIST,
  COLOR_HORSE_BODY, COLOR_HORSE_DARK, COLOR_HORSE_LIGHT,
} from '../utils/constants.js';
import { Loader } from '../core/Loader.js';
import { bus } from '../core/EventBus.js';

const HORSE_GLB_PATH = '/assets/models/Horse.glb';
// Model bounding box: Y 0..12.8, X ±1.75, Z -6.2..8.4
// Model faces +Z natively; our forward is -Z, so rotate PI on load
const HORSE_MODEL_SCALE = 0.25;
// Body center is now at (HORSE_LEG_H + HORSE_BODY_H) / 2 above ground.
// Model feet at Y=0 local need to reach world ground.
const HORSE_MODEL_Y_OFFSET = -(HORSE_LEG_H + HORSE_BODY_H) / 2;

/**
 * @typedef {'idle'|'mounted'|'whistle'} HorseState
 */

export class Horse {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../core/Physics.js').Physics} physics
   * @param {THREE.Vector3} spawnPos — world position (feet on ground)
   * @param {number} [yaw=0] — initial facing direction in radians
   * @param {'player'|'npc'|null} [owner=null]
   */
  constructor(scene, physics, spawnPos, yaw = 0, owner = null) {
    this._scene   = scene;
    this._physics = physics;

    /** @type {'player'|'npc'|null} */
    this.owner = owner;
    /** @type {boolean} */
    this.stolen = false;

    /** @type {HorseState} */
    this.state  = 'idle';
    this.yaw    = yaw;
    this.speed  = 0;            // current forward speed (units/s)

    // Whistle target — set when player whistles
    /** @type {THREE.Vector3|null} */
    this._whistleTarget = null;

    this._buildBody(physics, spawnPos);
    this._buildPlaceholder(scene);
    this._loadModel(scene);
    this._syncMesh();
  }

  // ─── Physics body ───────────────────────────────────────────────────────

  _buildBody(physics, spawnPos) {
    const halfW = HORSE_BODY_W / 2;
    const halfL = HORSE_BODY_L / 2;
    // Full height includes legs so the horse doesn't sink through the ground
    const totalH = HORSE_LEG_H + HORSE_BODY_H;
    const halfH = totalH / 2;

    this.body = new CANNON.Body({
      mass: HORSE_MASS,
      linearDamping:  0.0,
      angularDamping: 1.0,
      fixedRotation:  true,
      allowSleep:     false,
    });

    // Single box from hooves to back — simpler and prevents sinking
    this.body.addShape(
      new CANNON.Box(new CANNON.Vec3(halfW, halfH, halfL)),
    );

    // Body centre Y = half total height above ground
    this.body.position.set(spawnPos.x, halfH + 0.05, spawnPos.z);
    physics.addBody(this.body);
  }

  // ─── Visual — placeholder until GLB loads ──────────────────────────────

  _buildPlaceholder(scene) {
    this.mesh = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: COLOR_HORSE_BODY, roughness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: COLOR_HORSE_DARK, roughness: 0.9 });

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(HORSE_BODY_W, HORSE_BODY_H, HORSE_BODY_L),
      bodyMat,
    );
    torso.castShadow = true;
    this.mesh.add(torso);

    const legGeo = new THREE.CylinderGeometry(HORSE_LEG_RADIUS, HORSE_LEG_RADIUS, HORSE_LEG_H, 6);
    for (const off of [
      { x: -HORSE_BODY_W * 0.35, z: -HORSE_BODY_L * 0.35 },
      { x:  HORSE_BODY_W * 0.35, z: -HORSE_BODY_L * 0.35 },
      { x: -HORSE_BODY_W * 0.35, z:  HORSE_BODY_L * 0.35 },
      { x:  HORSE_BODY_W * 0.35, z:  HORSE_BODY_L * 0.35 },
    ]) {
      const leg = new THREE.Mesh(legGeo, darkMat);
      leg.position.set(off.x, -(HORSE_BODY_H / 2 + HORSE_LEG_H / 2), off.z);
      leg.castShadow = true;
      this.mesh.add(leg);
    }

    scene.add(this.mesh);
  }

  // ─── GLB model — replaces placeholder once loaded ───────────────────────

  async _loadModel(scene) {
    try {
      const gltf = await Loader.loadGLTF(HORSE_GLB_PATH);
      const model = gltf.scene.clone();
      model.scale.setScalar(HORSE_MODEL_SCALE);
      model.position.y = HORSE_MODEL_Y_OFFSET;
      model.rotation.y = Math.PI; // model faces +Z natively; flip to face -Z (our forward)
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Remove placeholder children and add GLB
      while (this.mesh.children.length) {
        const child = this.mesh.children[0];
        this.mesh.remove(child);
        if (child.isMesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const m of mats) { if (m && m.dispose) m.dispose(); }
        }
      }
      this.mesh.add(model);
    } catch (err) {
      // Keep placeholder if GLB fails to load
      console.warn('Horse GLB failed to load, keeping placeholder:', err);
    }
  }

  // ─── Sync visual to physics ─────────────────────────────────────────────

  _syncMesh() {
    const p = this.body.position;
    this.mesh.position.set(p.x, p.y, p.z);
    this.mesh.rotation.y = this.yaw;
  }

  // ─── Update ─────────────────────────────────────────────────────────────

  /**
   * @param {number} dt — seconds
   */
  update(dt) {
    if (this.state === 'whistle') {
      this._updateWhistle(dt);
    } else if (this.state === 'idle') {
      // Bleed off any residual velocity
      this.body.velocity.x *= 0.9;
      this.body.velocity.z *= 0.9;
      this.speed = 0;
    }
    // 'mounted' state: movement handled by Player

    this._syncMesh();
  }

  // ─── Mounted movement (called by Player when mounted) ──────────────────

  /**
   * Apply rider input to the horse. Called from Player._updateMountedMovement().
   * @param {number} dt
   * @param {number} throttle — -1 (brake) to +1 (accelerate)
   * @param {number} targetYaw — camera yaw; horse turns toward this
   * @param {boolean} spaceHeld — Space is held down (canter)
   * @param {boolean} spaceTapped — Space was just pressed this frame (gallop kick)
   * @param {number} steer — -1 (left) to +1 (right) from A/D keys
   */
  applyRiderInput(dt, throttle, targetYaw, spaceHeld, spaceTapped, steer = 0) {
    let targetSpeed = 0;
    let accel = HORSE_ACCEL;

    if (throttle > 0) {
      if (spaceTapped) {
        // Tap Space: instant speed kick, capped at gallop max
        this.speed = Math.min(this.speed + HORSE_TAP_KICK, HORSE_GALLOP_SPEED);
        accel = HORSE_GALLOP_ACCEL;
        targetSpeed = this.speed; // maintain the kicked speed
      } else if (spaceHeld) {
        // Hold Space: canter — use normal accel so it builds up gradually
        targetSpeed = HORSE_CANTER_SPEED;
        accel = HORSE_ACCEL;
      } else {
        // W only: trot
        targetSpeed = HORSE_TROT_SPEED;
      }
    } else if (throttle < 0) {
      targetSpeed = -HORSE_WALK_SPEED * 0.5; // slow reverse
    }

    // Accelerate / decelerate toward target
    if (this.speed < targetSpeed) {
      this.speed = Math.min(this.speed + accel * dt, targetSpeed);
    } else if (this.speed > targetSpeed) {
      this.speed = Math.max(this.speed - HORSE_DECEL * dt, targetSpeed);
    }

    // Hard cap
    this.speed = Math.min(this.speed, HORSE_GALLOP_SPEED);

    // Steer toward camera direction when moving forward
    if (throttle > 0 && Math.abs(this.speed) > 0.5) {
      let diff = targetYaw - this.yaw;
      // Normalize to [-PI, PI]
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      const speedFrac = Math.abs(this.speed) / HORSE_GALLOP_SPEED;
      const turnRate  = HORSE_TURN_SPEED * (1.0 - speedFrac * 0.4);
      const maxTurn = turnRate * dt;

      if (Math.abs(diff) > 0.01) {
        this.yaw += Math.sign(diff) * Math.min(Math.abs(diff), maxTurn);
      }
    }

    // A/D direct yaw adjustment — works at any speed (also when stationary or reversing)
    if (steer !== 0) {
      this.yaw -= steer * HORSE_TURN_SPEED * dt;
    }

    // Apply velocity in facing direction
    const vx = -Math.sin(this.yaw) * this.speed;
    const vz = -Math.cos(this.yaw) * this.speed;
    this.body.velocity.x = vx;
    this.body.velocity.z = vz;
  }

  // ─── Whistle — horse runs to player ─────────────────────────────────────

  /**
   * @param {THREE.Vector3} targetPos — player world position
   */
  callToPlayer(targetPos) {
    this._whistleTarget = targetPos.clone();
    this.state = 'whistle';
    this.speed = 0; // start from zero, accelerate gradually
  }

  _updateWhistle(dt) {
    if (!this._whistleTarget) {
      this.state = 'idle';
      return;
    }

    const p = this.body.position;
    const dx = this._whistleTarget.x - p.x;
    const dz = this._whistleTarget.z - p.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < HORSE_ARRIVE_DIST) {
      // Arrived — stop
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
      this.speed = 0;
      this.state = 'idle';
      this._whistleTarget = null;
      return;
    }

    // Face toward player — smooth turn, not instant snap
    const desiredYaw = Math.atan2(-dx, -dz);
    let yawDiff = desiredYaw - this.yaw;
    while (yawDiff >  Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    const whistleTurnRate = 4.0; // radians/s
    const maxYawStep = whistleTurnRate * dt;
    if (Math.abs(yawDiff) > 0.01) {
      this.yaw += Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), maxYawStep);
    }

    // Gradually accelerate up to whistle speed, then ease down when close
    const slowDownDist = 15;
    let targetSpeed;
    if (dist < slowDownDist) {
      const t = dist / slowDownDist;
      targetSpeed = HORSE_WALK_SPEED + (HORSE_WHISTLE_SPEED - HORSE_WALK_SPEED) * t;
    } else {
      targetSpeed = HORSE_WHISTLE_SPEED;
    }

    // Accelerate / decelerate toward target
    if (this.speed < targetSpeed) {
      this.speed = Math.min(this.speed + HORSE_ACCEL * dt, targetSpeed);
    } else {
      this.speed = Math.max(this.speed - HORSE_DECEL * dt, targetSpeed);
    }

    // Move in the direction the horse is facing (not straight at player)
    const vx = -Math.sin(this.yaw) * this.speed;
    const vz = -Math.cos(this.yaw) * this.speed;
    this.body.velocity.x = vx;
    this.body.velocity.z = vz;
  }

  // ─── Mount / dismount ───────────────────────────────────────────────────

  /**
   * Called when a rider mounts this horse.
   * @param {'player'|'npc'} riderType
   */
  onMount(riderType) {
    this.state = 'mounted';
    this.speed = 0;
    this.body.velocity.set(0, 0, 0);

    // If riderType is player and horse belongs to NPC → stolen
    if (riderType === 'player' && this.owner === 'npc' && !this.stolen) {
      this.stolen = true;
      bus.emit('crime:horse_stolen', { horse: this });
    }
  }

  onDismount() {
    this.state = 'idle';
    this.speed = 0;
    this.body.velocity.set(0, 0, 0);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  /** @returns {THREE.Vector3} world position of the horse (centre of body) */
  get position() {
    const p = this.body.position;
    return new THREE.Vector3(p.x, p.y, p.z);
  }

  /** @returns {THREE.Vector3} position to the left where the player dismounts */
  getDismountPosition() {
    // Left side of the horse, on the ground
    const left = new THREE.Vector3(
      Math.cos(this.yaw) * 1.5,
      0,
      -Math.sin(this.yaw) * 1.5,
    );
    const p = this.body.position;
    return new THREE.Vector3(p.x + left.x, 0, p.z + left.z);
  }

  dispose() {
    this._physics.removeBody(this.body);
    this._scene.remove(this.mesh);
    // Dispose geometries and materials
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) { if (m && m.dispose) m.dispose(); }
      }
    });
  }
}
