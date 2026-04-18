import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  PLAYER_RADIUS, PLAYER_HEIGHT, PLAYER_MASS,
  PLAYER_WALK_SPEED, PLAYER_SPRINT_SPEED, PLAYER_JUMP_IMPULSE,
  PLAYER_START_Z,
  CAM_DISTANCE, CAM_HEIGHT_OFFSET, CAM_LERP_FACTOR,
  CAM_PITCH_MIN, CAM_PITCH_MAX, CAM_CLIP_BUFFER,
  MOUSE_SENSITIVITY,
  COLOR_PLAYER_BODY, COLOR_PLAYER_HAT,
  HORSE_CAM_DISTANCE, HORSE_CAM_HEIGHT_OFFSET, HORSE_CAM_LERP_FACTOR,
  HORSE_BODY_H, HORSE_LEG_H,
} from '../utils/constants.js';

export class Player {
  /**
   * @param {THREE.Scene} scene
   * @param {import('../core/Physics.js').Physics} physics
   * @param {THREE.PerspectiveCamera} camera
   * @param {import('../core/Input.js').Input} input
   */
  constructor(scene, physics, camera, input) {
    this._scene   = scene;
    this._physics = physics;
    this._camera  = camera;
    this._input   = input;

    this._yaw        = 0;     // horizontal look (radians)
    this._pitch      = 0;     // vertical look (radians)
    this._isGrounded = false;

    // ── Mount state ──
    /** @type {import('./Horse.js').Horse|null} */
    this.mountedHorse = null;
    /** @type {import('./Horse.js').Horse|null} horse assigned to this player */
    this.ownedHorse = null;
    this._mountCooldown = 0; // seconds — prevents mount+dismount on same frame

    // Reusable objects — allocated once to avoid GC pressure in the loop
    this._yAxis    = new THREE.Vector3(0, 1, 0);
    this._forward  = new THREE.Vector3();
    this._right    = new THREE.Vector3();
    this._moveDir  = new THREE.Vector3();
    this._pivot    = new THREE.Vector3();
    this._camEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._camOffset= new THREE.Vector3();
    this._camTarget= new THREE.Vector3();
    this._cannonFrom = new CANNON.Vec3();
    this._cannonTo   = new CANNON.Vec3();
    this._rayResult  = new CANNON.RaycastResult();

    this._buildBody(physics);
    this._buildMesh(scene);

    // Seed camera behind the player so it doesn't snap on first frame
    camera.position.set(0, CAM_HEIGHT_OFFSET, CAM_DISTANCE);
    camera.lookAt(0, CAM_HEIGHT_OFFSET, 0);
  }

  // ─── Physics body (capsule approximation) ─────────────────────────────────

  _buildBody(physics) {
    // cannon-es has no native capsule; compound cylinder + 2 spheres approximates one.
    const cylH = PLAYER_HEIGHT - 2 * PLAYER_RADIUS;

    this.body = new CANNON.Body({
      mass: PLAYER_MASS,
      linearDamping:  0,    // zero — we set velocity directly, no physics interference
      angularDamping: 1.0,   // never tip over
      fixedRotation:  true,
      allowSleep:     false,  // player body must never sleep — we set velocity directly
    });
    this.body.addShape(new CANNON.Cylinder(PLAYER_RADIUS, PLAYER_RADIUS, cylH, 8));
    this.body.addShape(new CANNON.Sphere(PLAYER_RADIUS), new CANNON.Vec3(0,  cylH / 2, 0));
    this.body.addShape(new CANNON.Sphere(PLAYER_RADIUS), new CANNON.Vec3(0, -cylH / 2, 0));

    this.body.position.set(0, PLAYER_HEIGHT / 2 + 0.05, PLAYER_START_Z);
    physics.addBody(this.body);
  }

  // ─── Visual proxy (replaced by rigged mesh in Phase 2+) ───────────────────

  _buildMesh(scene) {
    this.mesh = new THREE.Group();

    // Body — CapsuleGeometry matches the physics shape visually
    const visR = PLAYER_RADIUS * 0.85;
    const visL = PLAYER_HEIGHT - 2 * visR;
    const bodyGeo = new THREE.CapsuleGeometry(visR, visL, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: COLOR_PLAYER_BODY, roughness: 0.8 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    // CapsuleGeometry is centered; shift so its bottom aligns with the capsule's bottom
    bodyMesh.position.y = 0; // body center = physics body center ✓
    bodyMesh.castShadow = true;
    this.mesh.add(bodyMesh);

    // Hat brim
    const brimGeo = new THREE.CylinderGeometry(visR * 1.4, visR * 1.5, 0.07, 10);
    const hatMat  = new THREE.MeshStandardMaterial({ color: COLOR_PLAYER_HAT, roughness: 0.9 });
    const brim    = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = PLAYER_HEIGHT / 2 - PLAYER_RADIUS * 0.1; // just above top of capsule
    brim.castShadow = true;
    this.mesh.add(brim);

    // Hat crown
    const crownGeo = new THREE.CylinderGeometry(visR * 0.85, visR * 0.9, visR * 1.1, 10);
    const crown    = new THREE.Mesh(crownGeo, hatMat);
    crown.position.y = brim.position.y + 0.07 / 2 + visR * 0.55;
    crown.castShadow = true;
    this.mesh.add(crown);

    scene.add(this.mesh);
  }

  // ─── Per-frame update ─────────────────────────────────────────────────────

  /** @param {number} dt — seconds since last frame */
  update(dt) {
    if (this._mountCooldown > 0) this._mountCooldown -= dt;

    this._updateLook();

    if (this.mountedHorse) {
      this._updateMountedMovement(dt);
      this._syncMeshMounted();
      this._updateMountedCamera();
    } else {
      this._updateGrounded();
      this._updateMovement();
      this._syncMesh();
      this._updateCamera();
    }
  }

  _updateLook() {
    this._yaw   -= this._input.mouseDX * MOUSE_SENSITIVITY;
    this._pitch -= this._input.mouseDY * MOUSE_SENSITIVITY;
    this._pitch  = THREE.MathUtils.clamp(
      this._pitch,
      THREE.MathUtils.degToRad(CAM_PITCH_MIN),
      THREE.MathUtils.degToRad(CAM_PITCH_MAX),
    );
  }

  _updateGrounded() {
    const p = this.body.position;
    this._cannonFrom.set(p.x, p.y, p.z);
    // Ray to just below the bottom sphere
    this._cannonTo.set(p.x, p.y - (PLAYER_HEIGHT / 2 + 0.15), p.z);
    this._rayResult.reset();
    this._physics.world.raycastClosest(this._cannonFrom, this._cannonTo, {}, this._rayResult);
    this._isGrounded = this._rayResult.hasHit;
  }

  _updateMovement() {
    const input = this._input;
    const speed = (input.isDown('ShiftLeft') || input.isDown('ShiftRight'))
      ? PLAYER_SPRINT_SPEED
      : PLAYER_WALK_SPEED;

    // Movement axes relative to camera yaw
    this._forward.set(0, 0, -1).applyAxisAngle(this._yAxis, this._yaw);
    this._right.crossVectors(this._forward, this._yAxis);

    this._moveDir.set(0, 0, 0);
    if (input.isDown('KeyW')) this._moveDir.add(this._forward);
    if (input.isDown('KeyS')) this._moveDir.sub(this._forward);
    if (input.isDown('KeyD')) this._moveDir.add(this._right);
    if (input.isDown('KeyA')) this._moveDir.sub(this._right);

    if (this._moveDir.lengthSq() > 0) {
      this._moveDir.normalize();
      this.body.velocity.x = this._moveDir.x * speed;
      this.body.velocity.z = this._moveDir.z * speed;
    } else {
      // Bleed off horizontal velocity while no input (supplements linear damping)
      this.body.velocity.x *= 0.8;
      this.body.velocity.z *= 0.8;
    }

    if (this._isGrounded && input.isPressed('Space')) {
      this.body.velocity.y = PLAYER_JUMP_IMPULSE;
    }
  }

  _syncMesh() {
    const p = this.body.position;
    this.mesh.position.set(p.x, p.y, p.z);
    this.mesh.rotation.y = this._yaw;
  }

  // ─── Spring-arm camera ────────────────────────────────────────────────────

  _updateCamera() {
    const p = this.body.position;

    // Pivot at shoulder/neck height above player's feet
    const feetY = p.y - PLAYER_HEIGHT / 2;
    this._pivot.set(p.x, feetY + CAM_HEIGHT_OFFSET, p.z);

    // Ideal camera position: start CAM_DISTANCE behind the player and apply
    // pitch (X) + yaw (Y) in YXZ order so yaw always stays on world Y.
    this._camEuler.set(this._pitch, this._yaw, 0);
    this._camOffset.set(0, 0, CAM_DISTANCE).applyEuler(this._camEuler);
    this._camTarget.addVectors(this._pivot, this._camOffset);

    // Pull camera toward pivot if a building is between them
    const final = this._clipCamera(this._pivot, this._camTarget);

    this._camera.position.lerp(final, CAM_LERP_FACTOR);
    this._camera.lookAt(this._pivot);
  }

  /**
   * Raycasts from pivot toward the ideal camera position; if something is hit,
   * returns a safe position just in front of the surface.
   * @param {THREE.Vector3} pivot
   * @param {THREE.Vector3} target
   * @param {number} maxDist — spring-arm length for current mode
   * @returns {THREE.Vector3}
   */
  _clipCamera(pivot, target, maxDist = CAM_DISTANCE) {
    this._cannonFrom.set(pivot.x, pivot.y, pivot.z);
    this._cannonTo.set(target.x, target.y, target.z);
    this._rayResult.reset();
    this._physics.world.raycastClosest(
      this._cannonFrom, this._cannonTo,
      { skipBackfaces: true },
      this._rayResult,
    );

    if (
      this._rayResult.hasHit &&
      this._rayResult.body !== this.body &&       // ignore own capsule
      (!this.mountedHorse || this._rayResult.body !== this.mountedHorse.body) &&
      this._rayResult.distance < maxDist
    ) {
      const safeDist = Math.max(0, this._rayResult.distance - CAM_CLIP_BUFFER);
      return pivot.clone()
        .addScaledVector(
          this._camOffset.clone().normalize(),
          safeDist,
        );
    }
    return target;
  }

  // ─── Mounted movement ─────────────────────────────────────────────────────

  /** @param {number} dt */
  _updateMountedMovement(dt) {
    const input = this._input;
    const horse = this.mountedHorse;

    let throttle = 0;
    if (input.isDown('KeyW')) throttle = 1;
    else if (input.isDown('KeyS')) throttle = -1;

    const spaceHeld = input.isDown('Space');
    const spaceTapped = input.isPressed('Space');

    // Horse steers toward camera yaw; camera moves freely via mouse
    horse.applyRiderInput(dt, throttle, this._yaw, spaceHeld, spaceTapped);
  }

  _syncMeshMounted() {
    const hp = this.mountedHorse.body.position;
    // Body center is at (LEG_H + BODY_H)/2 above ground
    // Model at 0.25 scale is 3.2m tall; saddle ~65% up from ground
    const groundY = hp.y - (HORSE_LEG_H + HORSE_BODY_H) / 2;
    const seatY = groundY + 12.8 * 0.25 * 0.65;
    this.mesh.position.set(hp.x, seatY, hp.z);
    this.mesh.rotation.y = this.mountedHorse.yaw;
  }

  _updateMountedCamera() {
    const hp = this.mountedHorse.body.position;
    this._pivot.set(hp.x, hp.y + HORSE_CAM_HEIGHT_OFFSET, hp.z);

    // Camera orbits freely with mouse yaw/pitch (not locked to horse facing)
    this._camEuler.set(this._pitch, this._yaw, 0);
    this._camOffset.set(0, 0, HORSE_CAM_DISTANCE).applyEuler(this._camEuler);
    this._camTarget.addVectors(this._pivot, this._camOffset);

    const final = this._clipCamera(this._pivot, this._camTarget, HORSE_CAM_DISTANCE);

    this._camera.position.lerp(final, HORSE_CAM_LERP_FACTOR);
    this._camera.lookAt(this._pivot);
  }

  // ─── Mount / Dismount ─────────────────────────────────────────────────────

  /**
   * Mount a horse. Called by InteractionSystem callback.
   * @param {import('./Horse.js').Horse} horse
   */
  mount(horse) {
    if (this.mountedHorse) return; // already mounted
    if (!this._isGrounded) return; // can't mount mid-air
    this._mountInternal(horse);
  }

  /**
   * Force-mount without grounded check (used for initial spawn).
   * @param {import('./Horse.js').Horse} horse
   */
  mountImmediate(horse) {
    if (this.mountedHorse) return;
    this._mountInternal(horse);
  }

  /** @param {import('./Horse.js').Horse} horse */
  _mountInternal(horse) {
    this.mountedHorse = horse;
    this._mountCooldown = 0.4;
    horse.onMount('player');

    this._yaw = horse.yaw;

    // Disable player physics body while riding
    this.body.velocity.set(0, 0, 0);
    this._physics.removeBody(this.body);

    this.mesh.visible = true;
  }

  dismount() {
    if (!this.mountedHorse) return;
    if (this._mountCooldown > 0) return; // don't dismount during cooldown

    const horse = this.mountedHorse;
    horse.onDismount();

    // Find dismount position (left side of horse, on ground)
    const dismountPos = horse.getDismountPosition();

    // Re-add player body and place it at dismount position
    this.body.position.set(dismountPos.x, PLAYER_HEIGHT / 2 + 0.1, dismountPos.z);
    this.body.velocity.set(0, 0, 0);
    this._physics.addBody(this.body);

    // Face same direction as horse
    this._yaw = horse.yaw;

    this.mountedHorse = null;
    this.mesh.visible = true;
  }

  /** @returns {boolean} */
  get isMounted() {
    return this.mountedHorse !== null;
  }

  // ─── Whistle ──────────────────────────────────────────────────────────────

  /**
   * Call owned horse to player. If no horse is owned or horse is too far, spawn nearby.
   * @param {import('./Horse.js').Horse[]} allHorses — all horses in the world
   */
  whistle(allHorses) {
    if (this.mountedHorse) return; // can't whistle while mounted

    const playerPos = this.position;

    if (this.ownedHorse) {
      this.ownedHorse.callToPlayer(playerPos);
    }
  }

  /** World-space position of the player's feet (useful for other systems). */
  get position() {
    if (this.mountedHorse) {
      const hp = this.mountedHorse.body.position;
      return new THREE.Vector3(hp.x, 0, hp.z);
    }
    const p = this.body.position;
    return new THREE.Vector3(p.x, p.y - PLAYER_HEIGHT / 2, p.z);
  }
}
