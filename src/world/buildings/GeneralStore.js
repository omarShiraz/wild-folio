import * as THREE from 'three';
import { Building } from '../Building.js';
import { show as showOverlay } from '../../ui/InteriorOverlay.js';
import { escapeHtml, isSafeUrl } from '../../utils/math.js';

const CRATE_COLORS = [0x8b4513, 0x6b3310, 0x9c6b30, 0x7a4e28, 0xa0522d, 0x704214];

/** @param {Object|null} project */
function makeCrateLabel(project) {
  const canvas = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#9c6b30');
  grad.addColorStop(1, '#5c3010');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Plank lines
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (const py of [85, 170]) {
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(256, py); ctx.stroke();
  }

  ctx.strokeStyle = '#2a0e04';
  ctx.lineWidth = 7;
  ctx.strokeRect(4, 4, 248, 248);

  if (!project) {
    ctx.fillStyle = '#d4a96a';
    ctx.font = 'bold 80px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('???', 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  ctx.fillStyle = '#f7e9cc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 28px Georgia, serif';

  const name = project.name ?? 'Unnamed';
  const words = name.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > 218 && line) {
      lines.push(line.trimEnd());
      line = w + ' ';
    } else {
      line = test;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());

  let ty = 128 - (lines.length * 36) / 2 + 18;
  for (const l of lines) {
    ctx.fillText(l, 128, ty);
    ty += 36;
  }

  return new THREE.CanvasTexture(canvas);
}

/** @param {Object|null} project */
function projectOverlayHtml(project) {
  if (!project) {
    return `<p class="io-proj-title">COMING SOON</p>
            <p class="io-proj-desc">Details arriving by Pony Express.</p>`;
  }
  const safeThumbnail = isSafeUrl(project.thumbnail) ? project.thumbnail : null;
  const thumb = safeThumbnail
    ? `<img class="io-proj-thumb" src="${safeThumbnail}" alt="${escapeHtml(project.name ?? '')}">`
    : `<div class="io-proj-thumb-placeholder">[ No Image Available ]</div>`;
  const stack = (project.stack ?? []).map((s) => `<span class="io-stack-tag">${escapeHtml(s)}</span>`).join('');
  const safeUrl = isSafeUrl(project.url) ? project.url : null;
  const link = safeUrl
    ? `<a class="io-visit-link" href="${safeUrl}" target="_blank" rel="noopener">VISIT →</a>`
    : '';
  return `
    ${thumb}
    <p class="io-proj-title">${escapeHtml(project.name ?? 'Unnamed')}</p>
    <p class="io-proj-desc">${escapeHtml(project.description ?? '')}</p>
    <div class="io-stack-wrap">${stack}</div>
    ${link}
  `;
}

export class GeneralStore extends Building {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} portfolioData
   * @param {THREE.Camera} camera
   */
  buildInterior(scene, portfolioData, camera) {
    this._clickables = [];
    this._camera = camera;

    const projects = Array.isArray(portfolioData?.projects) ? portfolioData.projects : [];

    this._buildShelf(scene);
    this._buildCrates(scene, projects);
    this._buildRegister(scene);
    this._buildShelfLamp(scene);
    this._attachClickHandler();
  }

  _buildShelf(scene) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a2808, roughness: 0.9 });
    const bz = -this.depth / 2; // back-wall Z

    // Back panel
    const back = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.0, 0.08), wood);
    back.position.set(0, 1.5, bz + 0.06);
    scene.add(back);

    // Horizontal shelf boards at y=1.0 and y=2.5
    const shelfGeo = new THREE.BoxGeometry(7.0, 0.08, 0.38);
    for (const sy of [1.0, 2.5]) {
      const shelf = new THREE.Mesh(shelfGeo, wood.clone());
      shelf.position.set(0, sy, bz + 0.27);
      scene.add(shelf);
    }

    // Side uprights
    const sideGeo = new THREE.BoxGeometry(0.08, 3.0, 0.38);
    for (const sx of [-3.54, 3.54]) {
      const side = new THREE.Mesh(sideGeo, wood.clone());
      side.position.set(sx, 1.5, bz + 0.27);
      scene.add(side);
    }
  }

  _buildCrates(scene, projects) {
    const count = Math.min(Math.max(projects.length, 1), 6);
    const spacing = 6.2 / (count + 1);
    const bz = -this.depth / 2;

    // Crate sits on lower shelf (y=1.0). Shelf top ≈ 1.04, half-crate = 0.45 → center y = 1.49
    const cy = 1.49;
    // Crate front face just inside the shelf board front
    const cz = bz + 0.73;

    for (let i = 0; i < count; i++) {
      const project = projects[i] ?? null;
      const labelTex = makeCrateLabel(project);
      const crateColor = CRATE_COLORS[i % CRATE_COLORS.length];

      const wood  = new THREE.MeshStandardMaterial({ color: crateColor, roughness: 0.92 });
      const label = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.85 });

      // BoxGeometry face order: +X, -X, +Y, -Y, +Z(front=toward player), -Z(back)
      // Crates face player with their +Z face → label at index 4
      const mats = [
        wood, wood.clone(), wood.clone(), wood.clone(), label, wood.clone(),
      ];
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mats);
      crate.position.set(-3.1 + spacing * (i + 1), cy, cz);
      scene.add(crate);

      const captured = project;
      this._clickables.push({
        mesh: crate,
        action: () => showOverlay(projectOverlayHtml(captured)),
      });
    }
  }

  _buildRegister(scene) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x5c3010, roughness: 0.9 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.6), wood);
    counter.position.set(this.width / 2 - 0.6, 0.45, 1.0);
    scene.add(counter);

    // Cash register box on top
    const regMat = new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.5, metalness: 0.3 });
    const reg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.4), regMat);
    reg.position.set(this.width / 2 - 0.6, 1.125, 0.95);
    scene.add(reg);
  }

  _buildShelfLamp(scene) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.55, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffcc55, roughness: 0.2, transparent: true, opacity: 0.7 });

    // Hanging lantern centred above the crate shelf
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), metalMat);
    chain.position.set(0, this.height - 0.6, -this.depth / 2 + 0.8);
    scene.add(chain);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), metalMat.clone());
    cap.position.set(0, this.height - 1.0, -this.depth / 2 + 0.8);
    scene.add(cap);

    const globe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.07, 0.28, 8), glassMat);
    globe.position.set(0, this.height - 1.22, -this.depth / 2 + 0.8);
    scene.add(globe);

    const light = new THREE.PointLight(0xffaa33, 12, 8);
    light.position.set(0, this.height - 1.3, -this.depth / 2 + 0.8);
    scene.add(light);

    // Second lamp above the counter (right side)
    const chain2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), metalMat.clone());
    chain2.position.set(this.width / 2 - 0.6, this.height - 0.6, 1.0);
    scene.add(chain2);

    const globe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.22, 8), glassMat.clone());
    globe2.position.set(this.width / 2 - 0.6, this.height - 1.1, 1.0);
    scene.add(globe2);

    const light2 = new THREE.PointLight(0xffaa33, 8, 5);
    light2.position.set(this.width / 2 - 0.6, this.height - 1.2, 1.0);
    scene.add(light2);
  }

  _attachClickHandler() {
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const camera  = this._camera;
    const clickables = this._clickables;

    this._clickHandler = (e) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
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
