import * as THREE from 'three';
import { Building } from '../Building.js';
import { show as showOverlay } from '../../ui/InteriorOverlay.js';
import { escapeHtml } from '../../utils/math.js';

const ICON_GLYPHS = {
  envelope: '✉',
  github:   'GH',
  linkedin: 'in',
  globe:    '⊕',
};

/** @param {Object|null} contact */
function makeEnvelopeTexture(contact) {
  const canvas = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  // Aged cream base
  ctx.fillStyle = '#e8d9a8';
  ctx.fillRect(0, 0, 256, 192);

  // Border
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 188);

  if (!contact) {
    // Wax seal
    ctx.fillStyle = '#6b1010';
    ctx.beginPath(); ctx.arc(128, 70, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a01818';
    ctx.beginPath(); ctx.arc(128, 70, 17, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#7a4e1e';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('ADDRESSEE UNKNOWN', 128, 112);
    return new THREE.CanvasTexture(canvas);
  }

  // Icon glyph
  const glyph = ICON_GLYPHS[contact.icon] ?? contact.icon ?? '?';
  ctx.fillStyle = '#3e1a08';
  ctx.font = 'bold 38px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 128, 58);

  // Divider
  ctx.strokeStyle = '#c4a87a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(18, 96); ctx.lineTo(238, 96); ctx.stroke();

  // Label
  ctx.fillStyle = '#7a4e1e';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textBaseline = 'top';
  ctx.fillText((contact.label ?? '').toUpperCase(), 128, 104);

  // Value — truncate to fit
  ctx.fillStyle = '#2a1505';
  ctx.font = '11px Courier New, monospace';
  ctx.fillText((contact.value ?? '').slice(0, 30), 128, 124);

  return new THREE.CanvasTexture(canvas);
}

/** @param {Object} contact */
function telegramOverlayHtml(contact) {
  return `
    <div class="io-telegram-head">★ Western Union Telegram ★</div>
    <div class="io-telegram-label">${escapeHtml(contact.label ?? '')}</div>
    <div class="io-telegram-value">${escapeHtml(contact.value ?? '')}</div>
  `;
}

export class PostOffice extends Building {
  /**
   * @param {THREE.Scene} scene
   * @param {Object} portfolioData
   * @param {THREE.Camera} camera
   */
  buildInterior(scene, portfolioData, camera) {
    this._clickables = [];
    this._camera = camera;

    const contacts = Array.isArray(portfolioData?.contacts) ? portfolioData.contacts : [];

    this._buildCounter(scene);
    this._buildEnvelopes(scene, contacts);
    this._buildPigeonholes(scene);
    this._buildCounterLamp(scene);
    this._attachClickHandler();
  }

  _buildCounter(scene) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x5c3010, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.9, 0.5), wood);
    body.position.set(0, 0.45, -3.0);
    scene.add(body);

    const topMat = new THREE.MeshStandardMaterial({ color: 0x6b3c14, roughness: 0.55 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.05, 0.55), topMat);
    top.position.set(0, 0.925, -3.0);
    scene.add(top);

    // Vertical service divider at counter centre
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.5), wood.clone());
    divider.position.set(0, 0.75, -3.0);
    scene.add(divider);
  }

  _buildEnvelopes(scene, contacts) {
    const count = Math.max(contacts.length, 1);
    // Spread across 4 units centred on the 5-wide counter
    const spacing = 4.0 / (count + 1);
    // Envelope sits on counter top (y=0.925 + half envelope height 0.025)
    const ey = 0.95;

    for (let i = 0; i < count; i++) {
      const contact = contacts[i] ?? null;
      const tex = makeEnvelopeTexture(contact);

      const cream = new THREE.MeshStandardMaterial({ color: 0xe8d9a8, roughness: 0.8 });
      const labelMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });

      // Face order: +X, -X, +Y(top/visible from above), -Y, +Z, -Z
      // Label placed on +Y (index 2) so player can see it from standing height
      const mats = [
        cream, cream.clone(), labelMat, cream.clone(), cream.clone(), cream.clone(),
      ];
      const env = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.35), mats);
      env.position.set(-2.0 + spacing * (i + 1), ey, -3.0);
      scene.add(env);

      const captured = contact;
      this._clickables.push({
        mesh: env,
        action: () => {
          if (!captured) {
            showOverlay(`<div class="io-telegram-head">★ Western Union ★</div>
                         <div class="io-telegram-value">ADDRESSEE UNKNOWN</div>`);
            return;
          }
          if (captured.icon === 'envelope') {
            showOverlay(telegramOverlayHtml(captured));
          } else if (captured.url) {
            window.open(captured.url, '_blank', 'noopener noreferrer');
          } else {
            showOverlay(telegramOverlayHtml(captured));
          }
        },
      });
    }
  }

  _buildPigeonholes(scene) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a2808, roughness: 0.92 });
    // Place against left wall: BoxGeometry(depth=0.3, height=2.5, width=1.0)
    // oriented so depth sticks into room along X axis
    const px = -this.width / 2 + 0.15;

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.5, 1.0), wood);
    box.position.set(px, 1.25, -1.0);
    scene.add(box);

    // 3 horizontal dividers
    const hGeo = new THREE.BoxGeometry(0.28, 0.06, 0.96);
    const divYs = [0.3, 1.25, 2.2];
    for (const dy of divYs) {
      const div = new THREE.Mesh(hGeo, wood.clone());
      div.position.set(px, dy, -1.0);
      scene.add(div);
    }

    // Vertical centre divider
    const vDiv = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.44, 0.06), wood.clone());
    vDiv.position.set(px, 1.25, -1.0);
    scene.add(vDiv);
  }

  _buildCounterLamp(scene) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a1a06, roughness: 0.55, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffcc55, roughness: 0.2, transparent: true, opacity: 0.7 });

    // Desk oil lamp sitting on the counter, left of centre
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.09, 8), metalMat);
    base.position.set(-1.5, 0.97, -3.0);
    scene.add(base);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.18, 8), metalMat.clone());
    neck.position.set(-1.5, 1.11, -3.0);
    scene.add(neck);

    const globe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.05, 0.2, 8), glassMat);
    globe.position.set(-1.5, 1.25, -3.0);
    scene.add(globe);

    const light = new THREE.PointLight(0xffaa33, 10, 6);
    light.position.set(-1.5, 1.4, -3.0);
    scene.add(light);

    // Hanging lantern above the counter centre
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), metalMat.clone());
    chain.position.set(0, this.height - 0.55, -3.0);
    scene.add(chain);

    const hanGlobe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.22, 8), glassMat.clone());
    hanGlobe.position.set(0, this.height - 0.95, -3.0);
    scene.add(hanGlobe);

    const hanLight = new THREE.PointLight(0xffaa33, 10, 7);
    hanLight.position.set(0, this.height - 1.0, -3.0);
    scene.add(hanLight);
  }

  _attachClickHandler() {
    const raycaster  = new THREE.Raycaster();
    const ptr        = new THREE.Vector2();
    const camera     = this._camera;
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
