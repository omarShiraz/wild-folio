import * as THREE from 'three';
import { Building } from '../Building.js';
import { show as showOverlay } from '../../ui/InteriorOverlay.js';
import { escapeHtml } from '../../utils/math.js';

// ── Canvas dimensions ────────────────────────────────────────────────────────
const POSTER_W = 512;
const POSTER_H = 768;

// ── Geometry ─────────────────────────────────────────────────────────────────
const POSTER_WORLD_W = 1.4;
const POSTER_WORLD_H = 2.0;
const DESK_COLOR     = 0x5c3010;
const CHAIR_COLOR    = 0x4a2808;

/** @param {string} month — "YYYY-MM" (e.g. "2022-01") */
function fmtDate(month) {
  if (!month) return '?';
  const [y, m] = month.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[(parseInt(m, 10) - 1) % 12]} ${y}`;
}

/**
 * Draws a wanted-poster CanvasTexture for one experience entry.
 * @param {Object|null} entry
 * @returns {THREE.CanvasTexture}
 */
function makePosterTexture(entry) {
  const canvas = document.createElement('canvas');
  canvas.width  = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext('2d');

  // Parchment background
  const bg = ctx.createLinearGradient(0, 0, POSTER_W, POSTER_H);
  bg.addColorStop(0, '#e8d59a');
  bg.addColorStop(1, '#d4b87a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // Aged edge vignette
  const vg = ctx.createRadialGradient(POSTER_W / 2, POSTER_H / 2, POSTER_H * 0.25,
                                      POSTER_W / 2, POSTER_H / 2, POSTER_H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,15,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // Outer border
  ctx.strokeStyle = '#5c3310';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, POSTER_W - 16, POSTER_H - 16);
  // Inner border
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, POSTER_W - 36, POSTER_H - 36);

  if (!entry) {
    // Blank / unknown poster
    ctx.fillStyle = 'rgba(100,60,20,0.18)';
    ctx.font = 'bold 180px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', POSTER_W / 2, POSTER_H / 2);

    ctx.fillStyle = '#7a4e1e';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UNKNOWN OUTLAW', POSTER_W / 2, POSTER_H - 80);
    return new THREE.CanvasTexture(canvas);
  }

  let y = 52;

  // "WANTED" banner
  ctx.fillStyle = '#8b1a1a';
  ctx.font = 'bold 82px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('WANTED', POSTER_W / 2, y + 70);
  y += 88;

  // "DEAD OR ALIVE"
  ctx.font = '26px Georgia, serif';
  ctx.fillStyle = '#8b1a1a';
  ctx.fillText('DEAD  OR  ALIVE', POSTER_W / 2, y + 24);
  y += 40;

  // Divider
  ctx.strokeStyle = '#7a4e1e';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(POSTER_W - 40, y); ctx.stroke();
  y += 20;

  // Company name
  ctx.fillStyle = '#1a0a00';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.textAlign = 'center';
  const company = entry.company ?? 'Unknown';
  ctx.fillText(company, POSTER_W / 2, y + 48);
  y += 66;

  // Job title
  ctx.font = 'italic 32px Georgia, serif';
  ctx.fillStyle = '#2a1505';
  ctx.fillText(entry.title ?? '', POSTER_W / 2, y + 30);
  y += 46;

  // Dates + location
  const start = fmtDate(entry.start);
  const end   = entry.end ? fmtDate(entry.end) : 'Present';
  const loc   = entry.location ?? '';
  ctx.font = '20px Georgia, serif';
  ctx.fillStyle = '#5c3310';
  ctx.fillText(`${start} – ${end}`, POSTER_W / 2, y + 20);
  y += 28;
  if (loc) {
    ctx.fillText(loc, POSTER_W / 2, y + 18);
    y += 26;
  }

  // Divider
  ctx.strokeStyle = '#7a4e1e';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40, y + 8); ctx.lineTo(POSTER_W - 40, y + 8); ctx.stroke();
  y += 24;

  // "KNOWN CRIMES"
  ctx.fillStyle = '#7a4e1e';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('KNOWN CRIMES:', 40, y + 18);
  y += 32;

  // Bullet list
  ctx.fillStyle = '#1a0a00';
  ctx.font = '17px Georgia, serif';
  const bullets = entry.bullets ?? [];
  const maxWidth = POSTER_W - 90;
  for (const bullet of bullets) {
    ctx.fillText('•', 44, y + 16);
    const words = bullet.split(' ');
    let line = ''; let bx = 62;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trimEnd(), bx, y + 16);
        line = word + ' ';
        y += 20;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line.trimEnd(), bx, y + 16);
    y += 24;
    if (y > POSTER_H - 60) break;
  }

  return new THREE.CanvasTexture(canvas);
}

/** HTML shown in the parchment overlay when a poster is clicked. */
function posterOverlayHtml(entry) {
  if (!entry) {
    return `<p class="io-wanted-banner">★ WANTED DEAD OR ALIVE ★</p>
            <p class="io-wanted-company">UNKNOWN OUTLAW</p>
            <p class="io-wanted-meta">Whereabouts unknown</p>`;
  }
  const start = fmtDate(entry.start);
  const end   = entry.end ? fmtDate(entry.end) : 'Present';
  const bullets = (entry.bullets ?? []).map(b => `<li>${escapeHtml(b)}</li>`).join('');
  return `
    <p class="io-wanted-banner">★ WANTED DEAD OR ALIVE ★</p>
    <p class="io-wanted-company">${escapeHtml(entry.company ?? '')}</p>
    <p class="io-wanted-title">${escapeHtml(entry.title ?? '')}</p>
    <p class="io-wanted-meta">${start} – ${end}${entry.location ? ' · ' + escapeHtml(entry.location) : ''}</p>
    <p class="io-crimes-heading">Known Crimes Against Legacy Code</p>
    <ul class="io-crimes-list">${bullets}</ul>
  `;
}

export class SheriffsOffice extends Building {
  buildInterior(scene, portfolioData, camera) {
    this._clickables = [];
    this._camera = camera;

    const data = portfolioData ?? {};
    const experience = Array.isArray(data.experience) ? data.experience : [];

    this._buildPosters(scene, experience);
    this._buildDesk(scene);
    this._buildChair(scene);
    this._buildOilLamp(scene);

    this._attachClickHandler();
  }

  /** @param {THREE.Scene} scene @param {Object[]} experience */
  _buildPosters(scene, experience) {
    const d = this.depth;    // 9
    const backZ = -d / 2 + 0.01;

    // Up to 3 on back wall, remainder on right wall
    const backEntries  = experience.slice(0, 3);
    const rightEntries = experience.slice(3);

    // Fill to show blank posters if fewer than data — show what exists, no extras
    const backCount = Math.max(backEntries.length, 1); // at least 1 slot
    const spacing   = this.width / (backCount + 1);

    for (let i = 0; i < backCount; i++) {
      const entry   = backEntries[i] ?? null;
      const texture = makePosterTexture(entry);
      const geo = new THREE.PlaneGeometry(POSTER_WORLD_W, POSTER_WORLD_H);
      const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(spacing * (i + 1) - this.width / 2, 2.8, backZ);
      scene.add(mesh);

      const captured = entry;
      this._clickables.push({
        mesh,
        action: () => showOverlay(posterOverlayHtml(captured)),
      });
    }

    // Overflow on right wall (x = +w/2, faces inward = -X)
    for (let i = 0; i < rightEntries.length; i++) {
      const entry   = rightEntries[i];
      const texture = makePosterTexture(entry);
      const geo = new THREE.PlaneGeometry(POSTER_WORLD_W, POSTER_WORLD_H);
      const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(this.width / 2 - 0.01, 2.8, -2.0 + i * 2.2);
      mesh.rotation.y = Math.PI / 2; // face inward (-X)
      scene.add(mesh);

      const captured = entry;
      this._clickables.push({
        mesh,
        action: () => showOverlay(posterOverlayHtml(captured)),
      });
    }
  }

  /** Long desk along left wall. */
  _buildDesk(scene) {
    const woodMat = new THREE.MeshStandardMaterial({ color: DESK_COLOR, roughness: 0.9 });
    // Desk top surface
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, this.depth - 1.5), woodMat);
    top.position.set(-this.width / 2 + 0.55, 0.62, 0);
    scene.add(top);

    // Desk body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, this.depth - 1.5), woodMat.clone());
    body.position.set(-this.width / 2 + 0.54, 0.32, 0);
    scene.add(body);
  }

  _buildChair(scene) {
    const mat = new THREE.MeshStandardMaterial({ color: CHAIR_COLOR, roughness: 0.95 });
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.42), mat);
    seat.position.set(-2.8, 0.46, -2.0);
    scene.add(seat);
    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.06), mat.clone());
    back.position.set(-2.8, 0.73, -2.22);
    scene.add(back);
    // Legs (4)
    const legGeo = new THREE.BoxGeometry(0.06, 0.44, 0.06);
    const offsets = [[-0.18, -0.16], [-0.18, 0.16], [0.18, -0.16], [0.18, 0.16]];
    for (const [lx, lz] of offsets) {
      const leg = new THREE.Mesh(legGeo, mat.clone());
      leg.position.set(-2.8 + lx, 0.22, -2.0 + lz);
      scene.add(leg);
    }
  }

  _buildOilLamp(scene) {
    const lampMat  = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffcc66, roughness: 0.2, transparent: true, opacity: 0.7 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8), lampMat);
    base.position.set(-2.8, 0.67, -2.0);
    scene.add(base);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8), lampMat.clone());
    neck.position.set(-2.8, 0.82, -2.0);
    scene.add(neck);

    const globe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.06, 0.22, 8), glassMat);
    globe.position.set(-2.8, 0.97, -2.0);
    scene.add(globe);

    // Warm glow
    const glow = new THREE.PointLight(0xff9933, 6, 8);
    glow.position.set(-2.8, 1.05, -2.0);
    scene.add(glow);
  }

  _attachClickHandler() {
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const camera = this._camera;
    const clickables = this._clickables;

    this._clickHandler = (e) => {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      ptr.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      ptr.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(ptr, camera);
      const meshes = clickables.map((c) => c.mesh);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const item = clickables.find((c) => c.mesh === hits[0].object);
        item?.action();
      }
    };

    const canvas = document.querySelector('canvas');
    canvas?.addEventListener('click', this._clickHandler);
    this._canvas = canvas;
  }

  disposeInterior() {
    if (this._clickHandler) {
      this._canvas?.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
    this._clickables = [];
  }
}
