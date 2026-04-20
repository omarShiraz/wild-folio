/**
 * Linear interpolation.
 * @param {number} a
 * @param {number} b
 * @param {number} t — 0..1
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Clamp a value between min and max.
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Escape a string for safe insertion into an HTML template.
 * Encodes &, <, >, ", and ' so user-controlled values can't inject markup.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns true when `url` is a safe link target (http, https, or mailto).
 * Rejects javascript: and other executable schemes.
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:';
  } catch {
    return false;
  }
}
