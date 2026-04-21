/**
 * Central registry for all NPC entities.
 *
 * Combat raycasting asks getByMesh() rather than iterating the scene graph,
 * so building interior props (bartender, etc.) are never accidentally treated
 * as shootable — only explicitly registered NPCs appear here.
 */
export class NPCManager {
  constructor() {
    /** @type {Map<string, import('../entities/NPC.js').NPC>} */
    this._npcs = new Map();
  }

  /**
   * Add an NPC to the registry. Call immediately after constructing the NPC.
   * @param {import('../entities/NPC.js').NPC} npc
   */
  register(npc) {
    this._npcs.set(npc.id, npc);
  }

  /**
   * Remove an NPC from the registry. Does NOT call npc.dispose() — caller decides.
   * @param {import('../entities/NPC.js').NPC} npc
   */
  deregister(npc) {
    this._npcs.delete(npc.id);
  }

  /**
   * Reverse-look up an NPC from any Three.js object returned by a raycaster.
   * Only works for the hitbox mesh (which carries userData.npcId); visual body
   * meshes intentionally have no npcId and will return null.
   * @param {import('three').Object3D} obj
   * @returns {import('../entities/NPC.js').NPC|null}
   */
  getByMesh(obj) {
    const id = obj?.userData?.npcId;
    if (!id) return null;
    return this._npcs.get(id) ?? null;
  }

  /**
   * All currently registered NPCs (including dead ones — callers filter by state).
   * @returns {import('../entities/NPC.js').NPC[]}
   */
  getAll() {
    return [...this._npcs.values()];
  }

  /**
   * All registered NPCs that are NOT in the dead state.
   * Convenience for proximity / witness checks.
   * @returns {import('../entities/NPC.js').NPC[]}
   */
  getAlive() {
    return [...this._npcs.values()].filter((n) => n.state !== 'dead');
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    for (const npc of this._npcs.values()) {
      npc.update(dt);
    }
  }
}
