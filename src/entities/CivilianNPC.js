import * as THREE from 'three';
import { NPC } from './NPC.js';
import {
  NPC_WANDER_SPEED,
  NPC_WANDER_RADIUS,
  NPC_WANDER_PAUSE_MIN,
  NPC_WANDER_PAUSE_MAX,
  NPC_WANDER_ARRIVE_DIST,
  NPC_WANDER_ZONE_HALF_X,
  NPC_WANDER_ZONE_HALF_Z,
  NPC_FLEE_SPEED,
} from '../utils/constants.js';
import { bus } from '../core/EventBus.js';

export class CivilianNPC extends NPC {
  /**
   * @param {{ position: THREE.Vector3Like }} opts
   * @param {THREE.Scene} scene
   */
  constructor(opts, scene) {
    super({ ...opts, type: 'civilian' }, scene);

    this._wanderTarget = new THREE.Vector3();
    // Stagger initial pause so all civilians don't step off simultaneously on load
    this._pauseTimer = Math.random() * NPC_WANDER_PAUSE_MAX;
  }

  // ── State machine ────────────────────────────────────────────────────────

  /** @param {number} dt seconds */
  update(dt) {
    if (this.state === 'dead') return;

    if (this.state === 'fleeing') {
      this._stepFlee(dt);
      return;
    }

    if (this.state === 'idle') {
      this._pauseTimer -= dt;
      if (this._pauseTimer <= 0) this._pickWanderTarget();
    } else if (this.state === 'walking') {
      this._stepTowardTarget(dt);
    }
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  _pickWanderTarget() {
    const pos   = this.group.position;
    const angle = Math.random() * Math.PI * 2;
    const dist  = (0.3 + Math.random() * 0.7) * NPC_WANDER_RADIUS;

    let tx = pos.x + Math.cos(angle) * dist;
    let tz = pos.z + Math.sin(angle) * dist;

    // Clamp to the safe wander zone so NPCs can't drift behind buildings
    tx = Math.max(-NPC_WANDER_ZONE_HALF_X, Math.min(NPC_WANDER_ZONE_HALF_X, tx));
    tz = Math.max(-NPC_WANDER_ZONE_HALF_Z, Math.min(NPC_WANDER_ZONE_HALF_Z, tz));

    // If the clamped point is effectively where we already are (NPC pressed against
    // a boundary), steer back toward the centre instead of standing still forever.
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    if (Math.sqrt(dx * dx + dz * dz) < NPC_WANDER_ARRIVE_DIST) {
      tx = pos.x * 0.5;
      tz = pos.z * 0.5;
    }

    this._wanderTarget.set(tx, 0, tz);
    this.state = 'walking';
  }

  _onHit() {
    this.state = 'fleeing';
    // Flee directly away from the scene origin (a good-enough heuristic)
    const pos = this.group.position;
    const len = Math.sqrt(pos.x * pos.x + pos.z * pos.z) || 1;
    this._fleeDir = { x: pos.x / len, z: pos.z / len };
    bus.emit('crime:witnessed', { npc: this });
  }

  _stepFlee(dt) {
    const pos  = this.group.position;
    const step = NPC_FLEE_SPEED * dt;
    pos.x += this._fleeDir.x * step;
    pos.z += this._fleeDir.z * step;
    this.group.rotation.y = Math.atan2(this._fleeDir.x, this._fleeDir.z);

    // Despawn once well outside the play area — prevents unbounded drift
    if (Math.abs(pos.x) > NPC_WANDER_ZONE_HALF_X + 20 || Math.abs(pos.z) > NPC_WANDER_ZONE_HALF_Z + 20) {
      this.state = 'dead';
      this.dispose();
    }
  }

  _stepTowardTarget(dt) {
    const pos = this.group.position;
    const dx  = this._wanderTarget.x - pos.x;
    const dz  = this._wanderTarget.z - pos.z;
    const d   = Math.sqrt(dx * dx + dz * dz);

    if (d < NPC_WANDER_ARRIVE_DIST) {
      this.state = 'idle';
      this._pauseTimer = NPC_WANDER_PAUSE_MIN +
        Math.random() * (NPC_WANDER_PAUSE_MAX - NPC_WANDER_PAUSE_MIN);
      return;
    }

    const step = NPC_WANDER_SPEED * dt;
    const nx   = dx / d;
    const nz   = dz / d;
    pos.x += nx * step;
    pos.z += nz * step;

    // Face the direction of travel (NPC front is +Z when rotation.y = 0)
    this.group.rotation.y = Math.atan2(nx, nz);
  }
}
