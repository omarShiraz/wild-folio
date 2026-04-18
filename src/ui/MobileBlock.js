const CSS = `
  #mobile-block {
    position: fixed;
    inset: 0;
    background: #1a0a00;
    color: #d4a96a;
    font-family: Georgia, 'Times New Roman', serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    z-index: 9999;
    overflow-y: auto;
  }

  .mb-inner {
    max-width: 520px;
    width: 100%;
    text-align: center;
  }

  .mb-name {
    font-size: 28px;
    letter-spacing: 0.08em;
    margin: 0 0 4px;
    color: #ffb347;
  }

  .mb-title {
    font-size: 13px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    opacity: 0.7;
    margin: 0 0 20px;
  }

  .mb-bio {
    font-size: 14px;
    line-height: 1.7;
    opacity: 0.85;
    margin: 0 0 28px;
  }

  .mb-notice {
    border: 1px solid rgba(212, 169, 106, 0.35);
    padding: 16px 20px;
    margin-bottom: 28px;
    font-size: 13px;
    line-height: 1.7;
    letter-spacing: 0.04em;
  }

  .mb-notice strong {
    display: block;
    font-size: 15px;
    color: #ffb347;
    margin-bottom: 6px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .mb-links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }

  .mb-link {
    display: inline-block;
    padding: 8px 18px;
    border: 1px solid rgba(212, 169, 106, 0.5);
    color: #d4a96a;
    text-decoration: none;
    font-size: 12px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    transition: background 0.15s, color 0.15s;
  }

  .mb-link:hover {
    background: rgba(212, 169, 106, 0.15);
    color: #ffb347;
  }
`;

export class MobileBlock {
  /** Returns true if the current device appears to be touch/mobile. */
  static isMobile() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Mounts the block if on a mobile device; otherwise does nothing.
   * @returns {Promise<boolean>} — true if mounted (mobile detected)
   */
  static async mount() {
    if (!MobileBlock.isMobile()) return false;

    let portfolio = {};
    try {
      portfolio = await fetch('/content/portfolio.json').then((r) => r.json());
    } catch (_) {
      // Gracefully degrade if JSON isn't available yet
    }

    // Inject styles
    if (!document.getElementById('mb-styles')) {
      const style       = document.createElement('style');
      style.id          = 'mb-styles';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    const el   = document.createElement('div');
    el.id      = 'mobile-block';
    el.innerHTML = MobileBlock._template(portfolio);
    document.body.appendChild(el);

    return true;
  }

  static _template(p) {
    const name    = p.name    ?? 'Portfolio';
    const title   = p.title   ?? 'Software Engineer';
    const bio     = p.bio     ?? '';
    const contacts = (p.contacts ?? []).filter((c) => c.url);

    const links = contacts.map((c) =>
      `<a class="mb-link" href="${c.url}">${c.label}</a>`,
    ).join('');

    return `
      <div class="mb-inner">
        <h1 class="mb-name">${name}</h1>
        <p  class="mb-title">${title}</p>
        <p  class="mb-bio">${bio}</p>

        <div class="mb-notice">
          <strong>Desktop required</strong>
          This portfolio is a playable 3D Western town built for desktop.<br>
          Saddle up on a device with a keyboard and mouse.
        </div>

        ${links ? `<div class="mb-links">${links}</div>` : ''}
      </div>
    `;
  }
}
