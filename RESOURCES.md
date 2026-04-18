# RESOURCES.md — Everything You'll Need

> All licenses checked as Creative Commons Zero (CC0) or equivalent at the time of writing. Always re-verify the license on the asset page before shipping — licenses change.

---

## 3D Models (CC0 / free commercial use)

### Kenney — the backbone of this project
- **Western Kit** — https://kenney.nl/assets/western-kit — buildings, fences, barrels, wagons, cacti. This alone gets you 80% of the town.
- **Graveyard Kit** — https://kenney.nl/assets/graveyard-kit — useful if you ever do the undertaker / cemetery outskirts
- **Character Pack** (Adventurers, Animated Characters) — https://kenney.nl/assets — swap/reskin for cowboys and sheriffs
- **Weapon Pack** — https://kenney.nl/assets/weapon-pack — revolvers, rifles, lever-actions
- **Animated Horse** — Kenney has an animated horse; otherwise see Quaternius

### Quaternius — stylized low-poly
- Main site: https://quaternius.com/
- **Ultimate Animated Animals** — includes a rideable horse with gallop/walk/idle anims
- **Modular Western** — alternate building kit if Kenney's is too blocky
- **Ultimate NPC Pack** — civilians for crowd-filling

### Poly Pizza — aggregator, sortable by license
- https://poly.pizza — filter by "CC0". Search "saloon", "revolver", "hitching post", "wagon wheel", "tumbleweed".

### Sketchfab — filter by "Downloadable + CC0"
- https://sketchfab.com/features/free-3d-models — set license filter to CC0. Great for one-off hero props (a specific pistol, a dynamite crate).

### Poly Haven — HDRIs and textures
- https://polyhaven.com/hdris — search "sunset", "desert", "golden hour"
- https://polyhaven.com/textures — dirt, wood planks, cobblestone

---

## Audio (CC0 / CC-BY)

- **Freesound** — https://freesound.org — gunshots, horse gallops, saloon ambience, piano. Filter by CC0. Credit CC-BY sounds in your README.
- **Pixabay Sound Effects** — https://pixabay.com/sound-effects/ — royalty-free, no attribution required
- **OpenGameArt Music** — https://opengameart.org/art-search?keys=western — some genuinely good Western loops
- **Kenney Sound Packs** — https://kenney.nl/assets/category:Audio — impact, interface, voiceover

What you actually need (build a checklist):
- 1× revolver shot, 1× revolver reload cycle, 1× rifle shot
- 1× empty-chamber click
- 1× horse whinny, 1× gallop loop, 1× walk loop
- 1× footstep (wood), 1× footstep (dirt)
- 1× saloon piano loop, 1× wind ambience, 1× coyote howl
- 1× "wanted" sting, 1× wave-shooter tension loop, 1× death sting
- 1× door creak, 1× coin jingle, 1× UI click

---

## Libraries (npm)

Install all in one go once you've done Phase 0 setup:

```bash
npm install three cannon-es howler zustand lil-gui stats.js
npm install --save-dev vite
```

| Library | Purpose | Docs |
|---|---|---|
| `three` | Rendering | https://threejs.org/docs/ |
| `cannon-es` | Physics (maintained fork of cannon.js) | https://pmndrs.github.io/cannon-es/ |
| `howler` | Audio with sprite support | https://howlerjs.com/ |
| `zustand` | Tiny state store (works outside React via `createStore`) | https://github.com/pmndrs/zustand |
| `lil-gui` | Debug sliders for tweaking gameplay values | https://lil-gui.georgealways.com/ |
| `stats.js` | FPS / ms / MB monitor panel | https://github.com/mrdoob/stats.js |

Optional, consider later:
- `three-mesh-bvh` — much faster raycasts against complex meshes (useful for bullet hits)
- `troika-three-text` — nicer SDF text rendering than built-in TextGeometry
- `postprocessing` — by pmndrs, for bloom, vignette, film grain (great for Western vibe)

---

## Learning resources (in the order you should consume them)

1. **Three.js Journey** (paid, ~$95 but legitimately the best Three.js course) — https://threejs-journey.com/ — if you can spend money on one thing, this.
2. **Three.js official examples** — https://threejs.org/examples/ — read the source of the ones that look like what you need. The `webgl_animation_skinning_blending` example is the one for character animation.
3. **Bruno Simon's YouTube** — free snippets from the course above
4. **SimonDev YouTube** — https://www.youtube.com/@simondev758 — game-dev fundamentals in Three.js (AI, steering behaviors, rendering tricks)
5. **Red Blob Games** — https://www.redblobgames.com/ — the bible for pathfinding, grids, hex math. You'll want this for sheriff AI.
6. **Game Programming Patterns (Bob Nystrom, free online)** — https://gameprogrammingpatterns.com/ — read "Game Loop", "Update Method", "Component", "Event Queue" before Phase 4.

---

## References & inspiration

- **RDR2 Valentine reference photos** — Google Images, "RDR2 Valentine town layout". Study the street layout, building spacing, signage.
- **Low-poly Western inspiration on Sketchfab** — search "low poly western town" for how others styled this
- **Tiny Glade / A Short Hike** — stylistic reference for how Three.js-scale games can feel cozy and polished
- **The Good, The Bad and The Ugly soundtrack** — put this on while coding. Sets the mood. (For your site, use CC-licensed Western music, not Morricone.)

---

## Tools

- **Blender** (free) — https://www.blender.org/ — to retouch, retopologize, or combine downloaded GLBs. At minimum learn: import, scale, export as glTF 2.0.
- **glTF Viewer** — https://gltf-viewer.donmccurdy.com/ — inspect a model before you load it into code
- **Three.js Editor** — https://threejs.org/editor/ — visual scene previewing
- **gltf-pipeline** — CLI tool to Draco-compress your GLBs (big file-size wins) — https://github.com/CesiumGS/gltf-pipeline
- **TinyPNG** — https://tinypng.com/ — squash texture file sizes

---

## Deployment

- **Vercel** — `vercel` CLI, zero-config with Vite. Best DX.
- **Netlify** — drag-and-drop the `dist/` folder, also great.
- **Cloudflare Pages** — generous free tier, good for heavy asset sites.

Whichever you pick, enable Brotli compression and set long cache headers on `/assets/*` (hashed filenames from Vite make this safe).

---

## When assets are missing

If you can't find what you need:
1. Check Poly Pizza first — it aggregates 6+ sources
2. Substitute with a primitive (a revolver can be a cylinder + two boxes for a weekend)
3. Ask in the Three.js Discord — https://discord.gg/3PKYf3eXKR — very active, helpful community
4. AI generation is allowed for **textures** (Stable Diffusion, Midjourney) — *not* for 3D meshes, which are still unreliable. Always check the AI tool's license terms.
