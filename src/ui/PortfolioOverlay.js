import { escapeHtml, isSafeUrl } from '../utils/math.js';

/** @param {string} month — "YYYY-MM" */
function fmtDate(month) {
  if (!month) return '?';
  const [y, m] = month.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[(parseInt(m, 10) - 1) % 12]} ${y}`;
}

const CSS = `
  #portfolio-skip-btn {
    position: fixed;
    bottom: 90px;
    right: 20px;
    z-index: 600;
    background: rgba(14, 6, 0, 0.88);
    border: 1px solid rgba(212, 169, 106, 0.45);
    color: #d4a96a;
    font-family: Georgia, serif;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 9px 15px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    user-select: none;
  }
  #portfolio-skip-btn:hover {
    background: rgba(60, 30, 5, 0.92);
    border-color: rgba(212, 169, 106, 0.75);
  }

  #portfolio-overlay {
    position: fixed;
    inset: 0;
    background: rgba(8, 3, 0, 0.96);
    z-index: 800;
    display: none;
    overflow-y: auto;
    padding: 48px 24px 60px;
    box-sizing: border-box;
    cursor: default;
  }
  #portfolio-overlay.po-visible { display: block; }

  #po-close {
    position: fixed;
    top: 14px;
    right: 18px;
    background: none;
    border: 1px solid #7a4e1e;
    color: #d4a96a;
    font-family: Georgia, serif;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 5px 11px;
    z-index: 801;
  }
  #po-close:hover { background: rgba(60,30,5,0.6); }

  .po-inner {
    max-width: 700px;
    margin: 0 auto;
    font-family: Georgia, 'Times New Roman', serif;
    color: #e0d0a8;
  }

  .po-header {
    text-align: center;
    border-bottom: 1px solid #5a3010;
    padding-bottom: 30px;
    margin-bottom: 36px;
  }
  .po-name  { font-size: 34px; font-weight: bold; color: #f0e0b0; margin: 0 0 6px; }
  .po-title { font-size: 17px; font-style: italic; color: #c4a878; margin: 0 0 14px; }
  .po-bio   { font-size: 15px; line-height: 1.75; color: #cfc090; max-width: 560px; margin: 0 auto 22px; }
  .po-resume-btn {
    display: inline-block;
    background: #7a4e1e;
    color: #f7e9cc;
    text-decoration: none;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 11px 22px;
    border: 1px solid #c4a87a;
  }
  .po-resume-btn:hover { background: #5c3310; }

  .po-section { margin-bottom: 38px; }
  .po-section-title {
    font-size: 10px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #8b5e28;
    border-bottom: 1px solid #3a2010;
    padding-bottom: 8px;
    margin-bottom: 22px;
  }

  /* Experience */
  .po-exp { margin-bottom: 26px; }
  .po-exp-company { font-size: 20px; font-weight: bold; color: #f0e0b0; margin: 0 0 2px; }
  .po-exp-title   { font-size: 15px; font-style: italic; color: #c4a878; margin: 0 0 4px; }
  .po-exp-meta    { font-size: 12px; color: #8b5e28; margin-bottom: 10px; letter-spacing: 0.04em; }
  .po-bullets     { list-style: none; padding: 0; margin: 0; }
  .po-bullets li  {
    font-size: 14px; line-height: 1.7; padding-left: 18px;
    position: relative; color: #cfc090;
  }
  .po-bullets li::before { content: '•'; position: absolute; left: 4px; color: #7a4e1e; }

  /* Projects */
  .po-proj {
    margin-bottom: 18px; padding: 16px 20px;
    background: rgba(50, 25, 8, 0.35);
    border-left: 2px solid #7a4e1e;
  }
  .po-proj-name { font-size: 18px; font-weight: bold; color: #f0e0b0; margin: 0 0 8px; }
  .po-proj-desc { font-size: 14px; line-height: 1.65; color: #cfc090; margin: 0 0 10px; }
  .po-stack-wrap { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .po-stack-tag  {
    background: #4a2c0e; color: #d4a96a; font-size: 10px;
    padding: 2px 8px; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .po-proj-link  {
    color: #c4a87a; font-size: 11px; text-decoration: none;
    letter-spacing: 0.1em; text-transform: uppercase;
  }
  .po-proj-link:hover { color: #f0d898; }

  /* Skills */
  .po-skill      { margin-bottom: 18px; }
  .po-skill-cat  {
    font-size: 13px; font-weight: bold; color: #d4a96a;
    text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;
  }
  .po-skill-items { display: flex; flex-wrap: wrap; gap: 5px; }
  .po-skill-item  {
    background: rgba(100, 60, 20, 0.35); border: 1px solid #4a2c0e;
    color: #cfc090; font-size: 13px; padding: 4px 10px;
  }

  /* Contacts */
  .po-contact { margin-bottom: 14px; }
  .po-contact-label {
    font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.12em; color: #8b5e28; margin-bottom: 2px;
  }
  .po-contact-value { font-size: 15px; font-family: 'Courier New', monospace; }
  .po-contact-link  { color: #c4a87a; text-decoration: none; }
  .po-contact-link:hover { color: #f0d898; }
`;

/**
 * Always-visible "Skip to Résumé" corner button + full-screen portfolio overlay.
 * Must be mounted after portfolio.json is loaded.
 */
export class PortfolioOverlay {
  constructor() {
    this._el  = null;
    this._btn = null;
    this._open = false;
    this._onOpen  = null;
    this._onClose = null;
    this._data = null;
  }

  /**
   * Inject the button and overlay into the DOM.
   * @param {Object} portfolioData — parsed portfolio.json
   * @param {{ onOpen?: () => void, onClose?: () => void }} [callbacks]
   */
  mount(portfolioData, { onOpen, onClose } = {}) {
    this._data    = portfolioData ?? {};
    this._onOpen  = onOpen;
    this._onClose = onClose;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Corner button — always on top
    this._btn = document.createElement('button');
    this._btn.id = 'portfolio-skip-btn';
    this._btn.textContent = '⦿ CV';
    this._btn.addEventListener('click', () => this.show());
    document.body.appendChild(this._btn);

    // Full overlay
    this._el = document.createElement('div');
    this._el.id = 'portfolio-overlay';
    this._el.innerHTML = this._buildHTML();
    document.body.appendChild(this._el);

    this._el.querySelector('#po-close').addEventListener('click', () => this.hide());
    this._el.addEventListener('click', (e) => { if (e.target === this._el) this.hide(); });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this._open) {
        e.stopImmediatePropagation();
        this.hide();
      }
    }, true);
  }

  show() {
    this._open = true;
    this._el.classList.add('po-visible');
    this._onOpen?.();
  }

  hide() {
    this._open = false;
    this._el.classList.remove('po-visible');
    this._onClose?.();
  }

  get isOpen() { return this._open; }

  // ── HTML builder ─────────────────────────────────────────────────────────

  _buildHTML() {
    const d = this._data;

    const resumeUrl = isSafeUrl(d.resume) ? d.resume : null;
    const resumeLink = resumeUrl
      ? `<a class="po-resume-btn" href="${resumeUrl}" download>↓ Download Résumé</a>`
      : '';

    const expHTML = (d.experience ?? []).map((e) => {
      const bullets = (e.bullets ?? []).map((b) => `<li>${escapeHtml(b)}</li>`).join('');
      return `
        <div class="po-exp">
          <div class="po-exp-company">${escapeHtml(e.company ?? '')}</div>
          <div class="po-exp-title">${escapeHtml(e.title ?? '')}</div>
          <div class="po-exp-meta">${fmtDate(e.start)} – ${e.end ? fmtDate(e.end) : 'Present'}${e.location ? ' · ' + escapeHtml(e.location) : ''}</div>
          <ul class="po-bullets">${bullets}</ul>
        </div>`;
    }).join('');

    const projHTML = (d.projects ?? []).map((p) => {
      const safeUrl = isSafeUrl(p.url) ? p.url : null;
      const link    = safeUrl ? `<a class="po-proj-link" href="${safeUrl}" target="_blank" rel="noopener">VISIT →</a>` : '';
      const stack   = (p.stack ?? []).map((s) => `<span class="po-stack-tag">${escapeHtml(s)}</span>`).join('');
      return `
        <div class="po-proj">
          <div class="po-proj-name">${escapeHtml(p.name ?? '')}</div>
          <div class="po-proj-desc">${escapeHtml(p.description ?? '')}</div>
          <div class="po-stack-wrap">${stack}</div>
          ${link}
        </div>`;
    }).join('');

    const skillHTML = (d.skills ?? []).map((s) => {
      const items = (s.items ?? []).map((i) => `<span class="po-skill-item">${escapeHtml(i)}</span>`).join('');
      return `
        <div class="po-skill">
          <div class="po-skill-cat">${escapeHtml(s.category ?? '')}</div>
          <div class="po-skill-items">${items}</div>
        </div>`;
    }).join('');

    const contactHTML = (d.contacts ?? []).map((c) => {
      const safeUrl = isSafeUrl(c.url) ? c.url : null;
      const val     = safeUrl
        ? `<a class="po-contact-link" href="${safeUrl}" target="_blank" rel="noopener">${escapeHtml(c.value ?? '')}</a>`
        : escapeHtml(c.value ?? '');
      return `
        <div class="po-contact">
          <div class="po-contact-label">${escapeHtml(c.label ?? '')}</div>
          <div class="po-contact-value">${val}</div>
        </div>`;
    }).join('');

    return `
      <button id="po-close" aria-label="Close">✕</button>
      <div class="po-inner">
        <div class="po-header">
          <h1 class="po-name">${escapeHtml(d.name ?? '')}</h1>
          ${d.title ? `<p class="po-title">${escapeHtml(d.title)}</p>` : ''}
          ${d.bio   ? `<p class="po-bio">${escapeHtml(d.bio)}</p>`     : ''}
          ${resumeLink}
        </div>
        ${expHTML     ? `<div class="po-section"><div class="po-section-title">Experience</div>${expHTML}</div>`     : ''}
        ${projHTML    ? `<div class="po-section"><div class="po-section-title">Projects</div>${projHTML}</div>`      : ''}
        ${skillHTML   ? `<div class="po-section"><div class="po-section-title">Skills</div>${skillHTML}</div>`       : ''}
        ${contactHTML ? `<div class="po-section"><div class="po-section-title">Contact</div>${contactHTML}</div>`    : ''}
      </div>`;
  }
}
