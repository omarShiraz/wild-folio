import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

/** @type {Map<string, Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>>} */
const _cache = new Map();

/**
 * Central asset loader. All model/texture loading must go through here
 * (CLAUDE.md §4 rule 3).
 */
export const Loader = {
  /**
   * Load a GLTF/GLB file. Results are cached by path.
   * @param {string} path — relative to /public, e.g. '/assets/models/Horse.glb'
   * @returns {Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>}
   */
  loadGLTF(path) {
    if (!_cache.has(path)) {
      _cache.set(path, new Promise((resolve, reject) => {
        gltfLoader.load(path, resolve, undefined, reject);
      }));
    }
    return _cache.get(path);
  },
};
