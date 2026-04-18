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
