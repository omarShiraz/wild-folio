import * as THREE from 'three';
import { Building } from '../Building.js';
import { audioManager } from '../../core/AudioManager.js';

// ── Canvas dimensions ────────────────────────────────────────────────────────
const BOARD_PX_W = 960;
const BOARD_PX_H = 400;

// ── Colors ───────────────────────────────────────────────────────────────────
const COLOR_BAR     = 0x5c3010;
const COLOR_STOOL   = 0x7a4e1e;
const COLOR_PIANO   = 0x1a0e06;
const COLOR_KEYS_W  = 0xf5f0e0;
const COLOR_KEYS_B  = 0x1a0e06;

/**
 * Canvas 2D helper — wraps text to fit maxWidth, returns final y after last line.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} maxWidth
 * @param {number} lineHeight
 * @returns {number}
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trimEnd(), x, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line.trim()) ctx.fillText(line.trimEnd(), x, y);
  return y;
}

/**
 * Builds the chalkboard CanvasTexture.
 * @param {Object} data — portfolio.json root
 * @returns {THREE.CanvasTexture}
 */
function makeChalkboardTexture(data) {
  const canvas = document.createElement('canvas');
  canvas.width  = BOARD_PX_W;
  canvas.height = BOARD_PX_H;
  const ctx = canvas.getContext('2d');

  // Dark green chalk board base
  ctx.fillStyle = '#1c2e1c';
  ctx.fillRect(0, 0, BOARD_PX_W, BOARD_PX_H);

  // Vignette — darker toward edges, lighter in centre (like a real board under a lamp)
  const vg = ctx.createRadialGradient(
    BOARD_PX_W / 2, BOARD_PX_H / 2, BOARD_PX_H * 0.1,
    BOARD_PX_W / 2, BOARD_PX_H / 2, BOARD_PX_H * 0.85,
  );
  vg.addColorStop(0,   'rgba(0,0,0,0)');
  vg.addColorStop(0.6, 'rgba(0,0,0,0.08)');
  vg.addColorStop(1.0, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, BOARD_PX_W, BOARD_PX_H);

  // Chalk frame line
  ctx.strokeStyle = 'rgba(200,200,170,0.25)';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, BOARD_PX_W - 32, BOARD_PX_H - 32);

  // Chalk text settings — slight shadow gives the "dusty" look
  ctx.shadowColor  = 'rgba(180,180,150,0.25)';
  ctx.shadowBlur   = 3;
  ctx.textAlign    = 'center';
  ctx.fillStyle    = 'rgba(230,228,210,0.92)';

  const name = data?.name ?? null;
  const title = data?.title ?? null;
  const bio   = data?.bio  ?? null;

  if (!name && !bio) {
    // Null-state fallback
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText('THE STORY OF THIS COWBOY', BOARD_PX_W / 2, 160);
    ctx.font = '36px Georgia, serif';
    ctx.fillText('IS STILL BEING WRITTEN', BOARD_PX_W / 2, 230);
    return new THREE.CanvasTexture(canvas);
  }

  let y = 72;

  if (name) {
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText(name, BOARD_PX_W / 2, y);
    y += 72;
  }

  if (title) {
    ctx.font = 'italic 32px Georgia, serif';
    ctx.fillStyle = 'rgba(200,210,180,0.85)';
    ctx.fillText(title, BOARD_PX_W / 2, y);
    y += 46;
  }

  // Horizontal chalk line separator
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(200,200,170,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, y + 8); ctx.lineTo(BOARD_PX_W - 60, y + 8);
  ctx.stroke();
  y += 28;

  if (bio) {
    ctx.shadowColor = 'rgba(180,180,150,0.2)';
    ctx.shadowBlur  = 2;
    ctx.font        = '22px Georgia, serif';
    ctx.fillStyle   = 'rgba(210,210,190,0.82)';
    ctx.textAlign   = 'center';
    wrapText(ctx, bio, BOARD_PX_W / 2, y, BOARD_PX_W - 120, 32);
  }

  return new THREE.CanvasTexture(canvas);
}

export class Saloon extends Building {
  buildInterior(scene, portfolioData, camera) {
    this._clickables = [];
    this._camera = camera;
    this._buildChalkboard(scene, portfolioData);
    this._buildBar(scene);
    this._buildStools(scene);
    this._buildPiano(scene);
    this._buildBartender(scene);
    this._buildBarLanterns(scene);
    this._attachClickHandler();
  }

  _buildChalkboard(scene, portfolioData) {
    const texture = makeChalkboardTexture(portfolioData);
    const geo = new THREE.PlaneGeometry(6.0, 2.5);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      color: 0xddddcc,
    });
    const board = new THREE.Mesh(geo, mat);
    // Lowered from y=3.5 so the board centre is at eye+shoulder height, not way above
    const BY = 2.4;
    board.position.set(0, BY, -this.depth / 2 + 0.02);
    scene.add(board);

    // Wooden frame around the board
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a2808, roughness: 0.95 });
    const frameThick = 0.08;
    const fW = 6.0 + frameThick * 2;
    const fH = 2.5 + frameThick * 2;
    const frameTop    = new THREE.Mesh(new THREE.BoxGeometry(fW, frameThick, 0.06), frameMat);
    const frameBottom = frameTop.clone();
    const frameLeft   = new THREE.Mesh(new THREE.BoxGeometry(frameThick, fH, 0.06), frameMat.clone());
    const frameRight  = frameLeft.clone();
    const bz = -this.depth / 2 + 0.04;
    frameTop.position.set(0,    BY + 1.25 + frameThick / 2, bz);
    frameBottom.position.set(0, BY - 1.25 - frameThick / 2, bz);
    frameLeft.position.set(-3.0 - frameThick / 2, BY, bz);
    frameRight.position.set( 3.0 + frameThick / 2, BY, bz);
    for (const m of [frameTop, frameBottom, frameLeft, frameRight]) scene.add(m);
  }

  _buildBar(scene) {
    const wood = new THREE.MeshStandardMaterial({ color: COLOR_BAR, roughness: 0.9 });
    // Bar body
    const body = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.9, 0.6), wood);
    body.position.set(0, 0.45, -3.5);
    scene.add(body);
    // Bar top (lighter, polished)
    const topMat = new THREE.MeshStandardMaterial({ color: 0x6b3c14, roughness: 0.55, metalness: 0.05 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(7.1, 0.06, 0.7), topMat);
    top.position.set(0, 0.92, -3.5);
    scene.add(top);
    // Foot rail
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.5, metalness: 0.4 });
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 7.1, 8), railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 0.18, -3.2);
    scene.add(rail);
  }

  _buildStools(scene) {
    const seatMat = new THREE.MeshStandardMaterial({ color: COLOR_STOOL, roughness: 0.85 });
    const legMat  = new THREE.MeshStandardMaterial({ color: 0x5c3010, roughness: 0.9 });
    const xs = [-2.0, 0.0, 2.0];
    for (const sx of xs) {
      // Seat
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.1, 12), seatMat.clone());
      seat.position.set(sx, 0.6, -2.5);
      scene.add(seat);
      // Single centre leg
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.52, 8), legMat.clone());
      leg.position.set(sx, 0.28, -2.5);
      scene.add(leg);
      // Foot ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 12), legMat.clone());
      ring.rotation.x = Math.PI / 2;
      ring.position.set(sx, 0.16, -2.5);
      scene.add(ring);
    }
  }

  _buildPiano(scene) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: COLOR_PIANO, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.6), bodyMat);
    body.position.set(-this.width / 2 + 0.9, 0.5, -3.5);
    scene.add(body);

    // Keys strip — clickable to play notes
    const keysMat = new THREE.MeshStandardMaterial({ color: COLOR_KEYS_W, roughness: 0.5 });
    const keyStrip = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.06, 0.25), keysMat);
    keyStrip.position.set(-this.width / 2 + 0.9, 1.03, -3.28);
    scene.add(keyStrip);

    // Register the key strip as a clickable that plays a random note (no popup — keep it playable)
    const NOTES = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
    this._clickables.push({
      mesh: keyStrip,
      action: () => audioManager.playNote(NOTES[Math.floor(Math.random() * NOTES.length)]),
    });

    // Black key dabs
    const blackMat = new THREE.MeshStandardMaterial({ color: COLOR_KEYS_B, roughness: 0.4 });
    const blackOffsets = [-0.35, -0.17, 0.08, 0.24, 0.40];
    for (const bx of blackOffsets) {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.14), blackMat.clone());
      bk.position.set(-this.width / 2 + 0.9 + bx, 1.07, -3.27);
      scene.add(bk);
    }

    // Stool in front of piano
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x3e2210, roughness: 0.9 });
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.08, 12), stoolMat);
    stool.position.set(-this.width / 2 + 0.9, 0.52, -2.85);
    scene.add(stool);
    const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.48, 8), stoolMat.clone());
    stoolLeg.position.set(-this.width / 2 + 0.9, 0.26, -2.85);
    scene.add(stoolLeg);
  }

  _buildBartender(scene) {
    const skinMat   = new THREE.MeshStandardMaterial({ color: 0xc8a07a, roughness: 0.9 });
    const shirtMat  = new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.95 });
    const vestMat   = new THREE.MeshStandardMaterial({ color: 0x3e1f0a, roughness: 0.9 });
    const pantsMat  = new THREE.MeshStandardMaterial({ color: 0x2a1a08, roughness: 0.95 });
    const hairMat   = new THREE.MeshStandardMaterial({ color: 0x1a0d04, roughness: 1.0 });

    const bx = 0;
    const bz = -3.9; // behind the bar

    // Torso (shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.26), shirtMat);
    torso.position.set(bx, 1.12, bz);
    scene.add(torso);

    // Vest over shirt
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.06), vestMat);
    vest.position.set(bx, 1.12, bz + 0.11);
    scene.add(vest);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.26), skinMat);
    head.position.set(bx, 1.56, bz);
    scene.add(head);

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.28), hairMat);
    hair.position.set(bx, 1.74, bz);
    scene.add(hair);

    // Moustache
    const moustache = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), hairMat.clone());
    moustache.position.set(bx, 1.46, bz + 0.13);
    scene.add(moustache);

    // Arms (slightly out to sides, leaning on bar)
    const armGeo = new THREE.BoxGeometry(0.12, 0.12, 0.44);
    const leftArm = new THREE.Mesh(armGeo, shirtMat.clone());
    leftArm.rotation.x = -0.3;
    leftArm.position.set(bx - 0.28, 0.94, bz + 0.12);
    scene.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, shirtMat.clone());
    rightArm.rotation.x = -0.3;
    rightArm.position.set(bx + 0.28, 0.94, bz + 0.12);
    scene.add(rightArm);

    // Hands
    const handGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const lHand = new THREE.Mesh(handGeo, skinMat.clone());
    lHand.position.set(bx - 0.28, 0.88, bz + 0.32);
    scene.add(lHand);
    const rHand = new THREE.Mesh(handGeo, skinMat.clone());
    rHand.position.set(bx + 0.28, 0.88, bz + 0.32);
    scene.add(rHand);

    // Legs (lower half hidden behind bar body)
    const legGeo = new THREE.BoxGeometry(0.18, 0.55, 0.22);
    const lLeg = new THREE.Mesh(legGeo, pantsMat.clone());
    lLeg.position.set(bx - 0.13, 0.56, bz);
    scene.add(lLeg);
    const rLeg = new THREE.Mesh(legGeo, pantsMat.clone());
    rLeg.position.set(bx + 0.13, 0.56, bz);
    scene.add(rLeg);
  }

  _attachClickHandler() {
    const raycaster  = new THREE.Raycaster();
    const ptr        = new THREE.Vector2();
    const camera     = this._camera;
    const clickables = this._clickables;

    this._clickHandler = (e) => {
      const canvas = e.currentTarget;
      const rect   = canvas.getBoundingClientRect();
      ptr.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      ptr.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(ptr, camera);
      const hits = raycaster.intersectObjects(clickables.map((c) => c.mesh), false);
      if (hits.length > 0) {
        clickables.find((c) => c.mesh === hits[0].object)?.action();
      }
    };

    this._canvas = document.querySelector('canvas');
    this._canvas?.addEventListener('click', this._clickHandler);
  }

  _buildBarLanterns(scene) {
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffcc55, roughness: 0.2, transparent: true, opacity: 0.65 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2010, roughness: 0.55, metalness: 0.5 });

    const positions = [-2.5, 0, 2.5];
    for (const lx of positions) {
      // Short hanging chain stub
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), metalMat.clone());
      chain.position.set(lx, this.height - 0.55, -3.5);
      scene.add(chain);

      // Lamp body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.15, 8), metalMat.clone());
      body.position.set(lx, this.height - 0.85, -3.5);
      scene.add(body);

      // Glass globe
      const globe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.25, 8), glassMat.clone());
      globe.position.set(lx, this.height - 1.05, -3.5);
      scene.add(globe);

      // Warm point light from each lantern
      const light = new THREE.PointLight(0xffaa33, 8, 6);
      light.position.set(lx, this.height - 1.1, -3.5);
      scene.add(light);
    }
  }

  disposeInterior() {
    if (this._clickHandler) {
      this._canvas?.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    this._clickables = [];
  }
}
