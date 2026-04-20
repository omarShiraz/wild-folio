import * as THREE from 'three';
import { Building } from '../Building.js';
import { show as showOverlay } from '../../ui/InteriorOverlay.js';
import { escapeHtml } from '../../utils/math.js';

// ── Canvas plaque dimensions ──────────────────────────────────────────────────
const PX_W = 256;
const PX_H = 410;

// ── World plaque dimensions ───────────────────────────────────────────────────
const PLAQUE_W = 1.0;
const PLAQUE_H = 1.6;

/** Draw a revolver silhouette centred on (cx, cy). */
function drawRevolver(ctx, cx, cy, col) {
  ctx.fillStyle = col;
  // Cylinder drum
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();
  // Frame body
  ctx.fillRect(cx - 52, cy - 13, 100, 26);
  // Barrel (right)
  ctx.fillRect(cx + 42, cy - 6, 68, 13);
  // Handle (angled down-left)
  ctx.save();
  ctx.translate(cx - 42, cy + 13);
  ctx.rotate(0.18);
  ctx.fillRect(-11, 0, 22, 52);
  ctx.restore();
  // Trigger guard arc
  ctx.beginPath();
  ctx.arc(cx - 8, cy + 26, 13, 0, Math.PI, false);
  ctx.fill();
}

/** Draw a rifle silhouette. */
function drawRifle(ctx, cx, cy, col) {
  // Stock (warm wood tone)
  ctx.fillStyle = '#5a3010';
  ctx.fillRect(cx - 105, cy - 14, 65, 28);
  ctx.fillStyle = col;
  // Action / receiver
  ctx.fillRect(cx - 46, cy - 15, 58, 30);
  // Long barrel
  ctx.fillRect(cx + 8, cy - 6, 100, 12);
  // Muzzle
  ctx.fillRect(cx + 98, cy - 8, 10, 16);
}

/** Draw a shotgun silhouette. */
function drawShotgun(ctx, cx, cy, col) {
  ctx.fillStyle = col;
  // Double barrels
  ctx.fillRect(cx - 20, cy - 16, 120, 13);
  ctx.fillRect(cx - 20, cy + 3, 120, 13);
  // Barrel join
  ctx.fillRect(cx - 26, cy - 16, 10, 32);
  // Action
  ctx.fillRect(cx - 50, cy - 18, 38, 36);
  // Stock (wood)
  ctx.fillStyle = '#5a3010';
  ctx.fillRect(cx - 100, cy - 17, 55, 34);
}

/** Draw a knife silhouette. */
function drawKnife(ctx, cx, cy, col) {
  ctx.fillStyle = col;
  // Blade (tapered, vertical)
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy + 8);
  ctx.lineTo(cx + 16, cy + 8);
  ctx.lineTo(cx + 3,  cy - 72);
  ctx.lineTo(cx - 3,  cy - 72);
  ctx.closePath();
  ctx.fill();
  // Guard
  ctx.fillRect(cx - 22, cy + 4, 44, 10);
  // Handle (wood)
  ctx.fillStyle = '#5a3010';
  ctx.fillRect(cx - 12, cy + 14, 24, 58);
  // Grip wraps
  ctx.fillStyle = col;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(cx - 12, cy + 17 + i * 13, 24, 4);
  }
}

/**
 * Build a canvas texture for one skill category's weapon plaque.
 * @param {Object|null} skill
 * @returns {THREE.CanvasTexture}
 */
function makePlaqueTex(skill) {
  const canvas = document.createElement('canvas');
  canvas.width  = PX_W;
  canvas.height = PX_H;
  const ctx = canvas.getContext('2d');

  // Dark wood background
  const bg = ctx.createLinearGradient(0, 0, 0, PX_H);
  bg.addColorStop(0, '#1c0f04');
  bg.addColorStop(1, '#0d0701');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PX_W, PX_H);

  // Brass border
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, PX_W - 12, PX_H - 12);
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, PX_W - 24, PX_H - 24);

  if (!skill) {
    ctx.fillStyle = '#4a2c0e';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('???', PX_W / 2, PX_H / 2);
    return new THREE.CanvasTexture(canvas);
  }

  // Weapon silhouette (silver-grey)
  const SIL = '#b8b8a8';
  const cx = PX_W / 2;
  const cy = skill.weapon === 'knife' ? 90 : 82;
  switch (skill.weapon) {
    case 'revolver': drawRevolver(ctx, cx, cy, SIL); break;
    case 'rifle':    drawRifle(ctx, cx, cy, SIL);    break;
    case 'shotgun':  drawShotgun(ctx, cx, cy, SIL);  break;
    default:         drawKnife(ctx, cx, cy, SIL);    break;
  }

  // Divider
  ctx.strokeStyle = '#6b4a0e';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(18, 170); ctx.lineTo(PX_W - 18, 170); ctx.stroke();

  // Category name
  ctx.fillStyle = '#d4a96a';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((skill.category ?? 'SKILLS').toUpperCase(), cx, 196);

  // Weapon type (italic)
  ctx.font = 'italic 13px Georgia, serif';
  ctx.fillStyle = '#8b6630';
  ctx.fillText((skill.weapon ?? '').toUpperCase(), cx, 220);

  // Divider
  ctx.strokeStyle = '#6b4a0e';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(18, 238); ctx.lineTo(PX_W - 18, 238); ctx.stroke();

  // Skill items
  ctx.fillStyle = '#c0a070';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let itemY = 260;
  for (const item of (skill.items ?? []).slice(0, 6)) {
    ctx.fillText(`• ${item}`, 26, itemY);
    itemY += 22;
    if (itemY > PX_H - 20) break;
  }

  return new THREE.CanvasTexture(canvas);
}

/** Parchment overlay listing skill items for one category. */
function skillOverlayHtml(skill) {
  if (!skill) return `<p class="io-wanted-banner">★ UNKNOWN TRADE ★</p><p class="io-wanted-meta">Details forthcoming.</p>`;
  const weapon = escapeHtml((skill.weapon ?? 'weapon').toUpperCase());
  const cat    = escapeHtml((skill.category ?? 'Skills').toUpperCase());
  const items  = (skill.items ?? []).map((i) => `<li>${escapeHtml(i)}</li>`).join('');
  return `
    <p class="io-wanted-banner">★ ${weapon} — ${cat} ★</p>
    <p class="io-crimes-heading">Known Arsenal</p>
    <ul class="io-crimes-list">${items}</ul>
  `;
}

export class Gunsmith extends Building {
  buildInterior(scene, portfolioData, camera) {
    this._clickables = [];
    this._camera = camera;

    const skills = Array.isArray(portfolioData?.skills) ? portfolioData.skills : [];

    this._buildWeaponRack(scene, skills);
    this._buildWorkbench(scene);
    this._buildLamp(scene);
    this._attachClickHandler();
  }

  _buildWeaponRack(scene, skills) {
    const bz   = -this.depth / 2 + 0.01; // back wall Z
    const count = Math.max(skills.length, 1);
    // Evenly space up to 4 plaques across the back wall
    const displayCount = Math.min(count, 4);
    const spacing = this.width / (displayCount + 1);

    for (let i = 0; i < displayCount; i++) {
      const skill   = skills[i] ?? null;
      const tex     = makePlaqueTex(skill);
      const plaqX   = spacing * (i + 1) - this.width / 2;

      // Dark wooden backing plaque
      const woodMat  = new THREE.MeshStandardMaterial({ color: 0x1c0f04, roughness: 0.95 });
      const plaque   = new THREE.Mesh(new THREE.BoxGeometry(PLAQUE_W + 0.1, PLAQUE_H + 0.12, 0.06), woodMat);
      plaque.position.set(plaqX, 2.5, bz);
      scene.add(plaque);

      // Canvas art plane (sits in front of plaque)
      const mat  = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLAQUE_W, PLAQUE_H), mat);
      mesh.position.set(plaqX, 2.5, bz + 0.04);
      scene.add(mesh);

      // Mounting screws — small brass dots
      const screwMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.4, metalness: 0.6 });
      const screwGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 6);
      const corners  = [[-0.42, 0.72], [0.42, 0.72], [-0.42, -0.72], [0.42, -0.72]];
      for (const [sx, sy] of corners) {
        const screw = new THREE.Mesh(screwGeo, screwMat.clone());
        screw.rotation.x = Math.PI / 2;
        screw.position.set(plaqX + sx, 2.5 + sy, bz + 0.065);
        scene.add(screw);
      }

      const captured = skill;
      this._clickables.push({ mesh, action: () => showOverlay(skillOverlayHtml(captured)) });
    }
  }

  _buildWorkbench(scene) {
    const wood  = new THREE.MeshStandardMaterial({ color: 0x3e2010, roughness: 0.92 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.5 });

    // Bench surface — right wall
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, this.depth - 1.0), wood);
    bench.position.set(this.width / 2 - 0.35, 0.9, 0);
    scene.add(bench);

    // Bench body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.85, this.depth - 1.0), wood.clone());
    body.position.set(this.width / 2 - 0.34, 0.46, 0);
    scene.add(body);

    // Vice on bench top
    const viceBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.28), metal);
    viceBody.position.set(this.width / 2 - 0.3, 1.07, 1.0);
    scene.add(viceBody);

    const viceJaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.06), metal.clone());
    viceJaw.position.set(this.width / 2 - 0.3, 1.07, 0.71);
    scene.add(viceJaw);

    const viceHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), metal.clone());
    viceHandle.rotation.z = Math.PI / 2;
    viceHandle.position.set(this.width / 2 - 0.3, 1.16, 0.82);
    scene.add(viceHandle);
  }

  _buildLamp(scene) {
    const metal = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.55, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xffcc55, roughness: 0.2, transparent: true, opacity: 0.7 });

    // Hanging lamp over workbench
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), metal);
    chain.position.set(this.width / 2 - 0.35, this.height - 0.58, 1.0);
    scene.add(chain);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.09, 8), metal.clone());
    cap.position.set(this.width / 2 - 0.35, this.height - 0.98, 1.0);
    scene.add(cap);

    const globe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.06, 0.24, 8), glass);
    globe.position.set(this.width / 2 - 0.35, this.height - 1.2, 1.0);
    scene.add(globe);

    const light = new THREE.PointLight(0xffaa33, 10, 6);
    light.position.set(this.width / 2 - 0.35, this.height - 1.3, 1.0);
    scene.add(light);

    // Second lamp over weapon rack (centred)
    const chain2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), metal.clone());
    chain2.position.set(0, this.height - 0.58, -this.depth / 2 + 1.5);
    scene.add(chain2);

    const globe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.22, 8), glass.clone());
    globe2.position.set(0, this.height - 1.18, -this.depth / 2 + 1.5);
    scene.add(globe2);

    const light2 = new THREE.PointLight(0xffaa33, 12, 7);
    light2.position.set(0, this.height - 1.3, -this.depth / 2 + 1.5);
    scene.add(light2);
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

  disposeInterior() {
    if (this._clickHandler) {
      this._canvas?.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    this._clickables = [];
  }
}
