import * as CANNON from 'cannon-es';
import { FIXED_TIMESTEP, MAX_FRAME_DELTA, GRAVITY } from '../utils/constants.js';

/**
 * cannon-es world wrapper.
 * Runs a fixed-timestep accumulator so gameplay is frame-rate independent.
 * All other systems add/remove bodies through this class, never touching
 * the cannon world directly.
 */
export class Physics {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, GRAVITY, 0),
    });

    // Broadphase tuned for a mid-size open world
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    this._accumulator = 0;
  }

  /**
   * @param {import('cannon-es').Body} body
   */
  addBody(body) {
    this.world.addBody(body);
  }

  /**
   * @param {import('cannon-es').Body} body
   */
  removeBody(body) {
    this.world.removeBody(body);
  }

  /**
   * Step the simulation. Called every render frame with the variable dt;
   * internally sub-steps at the fixed rate.
   * @param {number} dt — seconds since last frame (already capped at MAX_FRAME_DELTA)
   */
  update(dt) {
    this._accumulator += dt;
    while (this._accumulator >= FIXED_TIMESTEP) {
      this.world.step(FIXED_TIMESTEP);
      this._accumulator -= FIXED_TIMESTEP;
    }
  }
}
