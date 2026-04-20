const CSS = `
  #interior-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease;
  }
  #interior-overlay.io-open {
    opacity: 1;
    pointer-events: all;
  }
  .io-parchment {
    position: relative;
    background: linear-gradient(160deg, #f7e9cc 0%, #edd9a3 100%);
    border: 3px solid #7a4e1e;
    border-radius: 2px;
    padding: 48px 44px 40px;
    max-width: 620px;
    width: 90vw;
    max-height: 82vh;
    overflow-y: auto;
    font-family: Georgia, 'Times New Roman', serif;
    color: #2a1505;
    box-shadow: 0 10px 40px rgba(0,0,0,0.65),
                inset 0 0 60px rgba(160,110,40,0.08);
    scrollbar-width: thin;
    scrollbar-color: #7a4e1e #edd9a3;
  }
  .io-close {
    position: absolute;
    top: 10px;
    right: 14px;
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    color: #7a4e1e;
    font-family: Georgia, serif;
    padding: 4px 8px;
  }
  .io-close:hover { color: #2a1505; }

  /* ── Sheriff / wanted poster detail ─────────────────────────── */
  .io-wanted-banner {
    text-align: center;
    font-size: 11px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: #8b1a1a;
    margin-bottom: 6px;
  }
  .io-wanted-company {
    text-align: center;
    font-size: 28px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 4px;
    line-height: 1.1;
  }
  .io-wanted-title {
    text-align: center;
    font-size: 17px;
    font-style: italic;
    margin: 0 0 6px;
  }
  .io-wanted-meta {
    text-align: center;
    font-size: 12px;
    color: #7a4e1e;
    letter-spacing: 0.06em;
    border-bottom: 1px solid #c4a87a;
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .io-crimes-heading {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #7a4e1e;
    margin: 0 0 10px;
  }
  .io-crimes-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .io-crimes-list li {
    font-size: 14px;
    line-height: 1.75;
    padding-left: 18px;
    position: relative;
  }
  .io-crimes-list li::before {
    content: '•';
    position: absolute;
    left: 4px;
    color: #7a4e1e;
  }

  /* ── General Store / project detail ─────────────────────────── */
  .io-proj-title {
    font-size: 26px;
    font-weight: bold;
    margin: 0 0 14px;
  }
  .io-proj-thumb {
    width: 100%;
    height: 160px;
    object-fit: cover;
    border: 2px solid #c4a87a;
    display: block;
    margin-bottom: 14px;
  }
  .io-proj-thumb-placeholder {
    width: 100%;
    height: 120px;
    background: linear-gradient(135deg, #7a4e1e 0%, #3e2210 100%);
    border: 2px solid #c4a87a;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d4a96a;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .io-proj-desc {
    font-size: 15px;
    line-height: 1.65;
    margin: 0 0 16px;
  }
  .io-stack-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 20px;
  }
  .io-stack-tag {
    background: #7a4e1e;
    color: #f7e9cc;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 2px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: Georgia, serif;
  }
  .io-visit-link {
    display: inline-block;
    background: #7a4e1e;
    color: #f7e9cc;
    text-decoration: none;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 10px 22px;
    border: 1px solid #c4a87a;
  }
  .io-visit-link:hover { background: #5c3310; }

  /* ── Post Office / telegram detail ──────────────────────────── */
  .io-telegram-head {
    text-align: center;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #7a4e1e;
    border-bottom: 1px solid #c4a87a;
    padding-bottom: 12px;
    margin-bottom: 18px;
  }
  .io-telegram-label {
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7a4e1e;
    margin-bottom: 6px;
  }
  .io-telegram-value {
    font-family: 'Courier New', monospace;
    font-size: 18px;
    word-break: break-all;
    margin-bottom: 4px;
  }
`;

let _open = false;
let _el = null;
let _contentEl = null;

function _mount() {
  if (_el) return;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  _el = document.createElement('div');
  _el.id = 'interior-overlay';
  _el.innerHTML = `
    <div class="io-parchment">
      <button class="io-close" aria-label="Close">✕</button>
      <div class="io-content"></div>
    </div>
  `;
  document.body.appendChild(_el);

  _contentEl = _el.querySelector('.io-content');
  _el.querySelector('.io-close').addEventListener('click', hide);

  // Backdrop click
  _el.addEventListener('click', (e) => { if (e.target === _el) hide(); });

  // Escape key — must use capture so it fires before InteriorManager's poll
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && _open) {
      e.stopImmediatePropagation();
      hide();
    }
  }, true);
}

/** Show the overlay with arbitrary HTML content. */
export function show(html) {
  _mount();
  _contentEl.innerHTML = html;
  _el.classList.add('io-open');
  _open = true;
}

/** Hide the overlay. */
export function hide() {
  if (!_el) return;
  _el.classList.remove('io-open');
  _open = false;
}

/** Returns true while the overlay is visible. */
export function isOpen() { return _open; }
