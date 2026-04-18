# CLAUDE.md — RDR Portfolio Project

> **Read this file at the start of every session.** It defines the vision, architecture, and rules you must follow. When in doubt, re-read. Do not deviate from the decisions here without asking the user first.

---

## 1. Project Vision

A **Red Dead Redemption–inspired 3D portfolio website**, built with Three.js, where visitors explore a small Western town on foot or horseback. Each building contains one section of the owner's portfolio. Antagonizing NPCs triggers a wanted system that spawns sheriffs, which kicks off an infinite wave-based shooter mini-game. The experience is equal parts portfolio and playable prototype — it must feel like a *game*, not a gimmicky scroll-site with a cowboy hat on.

**The one-line pitch:** *"A portfolio you play, not scroll."*

**Non-negotiable vibes:** dusty, golden-hour lighting; wooden planks; stylized low-poly; confident weight to movement; diegetic UI (signs, wanted posters) wherever possible instead of floating HTML panels.

---

## 2. Tech Stack (Locked)

| Layer | Choice | Reason |
|---|---|---|
| Rendering | **Three.js** (latest stable, via npm) | User's choice, strong ecosystem |
| Build | **Vite** | Fast HMR, trivial Three.js setup |
| Language | **JavaScript (ESM)** — add JSDoc types | Lower friction than TS for prototype |
| Physics | **cannon-es** OR **rapier** | Start with cannon-es; swap only if perf demands |
| Assets | **Kenney, Quaternius, Poly Pizza, Sketchfab CC0** | Free, consistent low-poly style |
| Audio | **Howler.js** | Sprite support, reliable cross-browser |
| State | **Zustand** (vanilla) or plain event bus | No React — keep it lean |
| Deployment | **Vercel** or **Netlify** (static) | Zero-config for Vite builds |

**Forbidden without asking first:** React, Next.js, a full game engine (Babylon, PlayCanvas), paid assets, backend servers, databases.

---

## 3. Project Scope & Features

### Core world
- A single small town modeled on Valentine from RDR2: one main dirt street, maybe one side alley, ~5 enterable buildings, surrounding fence/terrain so the world feels bounded but not walled.
- **Player** can walk (WASD), sprint (Shift), jump (Space), interact (E), shoot (LMB), aim (RMB), reload (R), whistle for horse (H), mount/dismount (F).
- **Horse** can be ridden, tied, stolen from hitching posts. Hijacking another NPC's horse is a valid (and slightly criminal) action.
- **Day/night cycle** is optional polish — default to permanent golden hour.

### Building → Portfolio mapping (locked)
| Building | Section |
|---|---|
| Sheriff's Office | Resume / Work experience |
| Saloon | About Me |
| General Store | Projects |
| Post Office | Contact / Social links |
| Gunsmith | Skills / Tech stack |

When the player walks inside a building, trigger a diegetic reveal of the content (e.g. a pinned poster on the wall, a ledger on the bar, wanted posters for each project). Content must be legible — do not sacrifice readability for atmosphere. If diegetic rendering gets too hard, fall back to a styled HTML overlay themed as a parchment/telegram, but prefer in-world 3D text (TextGeometry or pre-baked textures).

### Crime & wanted system
- Shooting/attacking NPCs builds a **wanted level** (0 → 3 stars).
- 1–2 civilian hits = witness flees, wanted posted as ★.
- 3+ hits OR shooting a lawman = **Sheriffs spawn → Wave Shooter mini-game starts**.
- Pressing `Esc` during chaos pauses; dying returns player to town with a "wanted cleared" message and score posted to a leaderboard (local-storage only for v1).

### Mini-games (phased)
1. **Phase 1 — Wave Shooter** (required): infinite waves of sheriffs spawn, difficulty ramps, score = kills × wave-multiplier. Ends on death.
2. **Phase 2 — Horse Chase**: posse chases you out of town; dodge obstacles, return fire, survive N seconds.
3. **Phase 3 — Saloon Poker**: 5-card draw vs. NPCs, simple AI, bet chips for cosmetic unlocks.
4. **Phase 4+ — Stretch**: showdown duel (QTE), bounty hunting board, horse racing.

### Recruiter escape hatch
- A **subtle corner button** labeled "Skip to Résumé" (or a tiny telegram icon). Clicking pauses the game and opens a clean HTML overlay with all portfolio content in a normal readable format, plus direct download link for the PDF résumé. This button must always be visible and accessible.

### Platform
- **Desktop only** (WASD + mouse). On load, detect mobile/touch → show a static fallback page with the portfolio content and a note: *"This experience is built for desktop. Grab your horse there."*

---

## 4. Architecture

```
/
├── CLAUDE.md              # You are here
├── PLAN.md                # Phased task breakdown — consult before each phase
├── RESOURCES.md           # Asset pack links, references
├── package.json
├── vite.config.js
├── index.html             # Single-page entry
├── public/
│   ├── assets/
│   │   ├── models/        # .glb/.gltf from Kenney/Quaternius
│   │   ├── textures/
│   │   ├── audio/         # Howler sprites
│   │   └── fonts/
│   └── content/
│       └── portfolio.json # ALL portfolio data lives here (single source of truth)
└── src/
    ├── main.js            # Entry: boots Game
    ├── Game.js            # Top-level controller, scene graph, loop
    ├── core/
    │   ├── Loader.js      # Wraps GLTFLoader, TextureLoader, audio
    │   ├── Input.js       # Keyboard + mouse state
    │   ├── Physics.js     # cannon-es wrapper
    │   ├── EventBus.js    # Global events: 'player:shot', 'wanted:raised', etc.
    │   └── State.js       # Zustand or custom store
    ├── world/
    │   ├── Town.js        # Builds streets, terrain, skybox
    │   ├── Building.js    # Base class; subclasses per building
    │   ├── buildings/     # Sheriff.js, Saloon.js, Store.js, etc.
    │   └── Props.js       # Hitching posts, barrels, lanterns
    ├── entities/
    │   ├── Player.js
    │   ├── Horse.js
    │   ├── NPC.js         # Base NPC
    │   ├── Sheriff.js     # extends NPC, aggressive AI
    │   └── Bullet.js
    ├── systems/
    │   ├── WantedSystem.js
    │   ├── CombatSystem.js
    │   ├── InteractionSystem.js  # E-to-enter triggers
    │   └── DialogueSystem.js     # Optional for later
    ├── minigames/
    │   ├── WaveShooter.js
    │   ├── HorseChase.js    # Phase 2
    │   └── Poker.js         # Phase 3
    ├── ui/
    │   ├── HUD.js           # Wanted stars, ammo, health
    │   ├── PortfolioOverlay.js  # The skip-button fallback
    │   ├── MinigameUI.js    # Score, wave counter
    │   └── MobileBlock.js   # Shown on touch devices
    └── utils/
        ├── math.js
        └── debug.js        # Axes helper, FPS counter (toggle with `)
```

### Rules of the road
1. **No god objects.** `Game.js` orchestrates; it does not contain gameplay logic. Each system owns its state and exposes an `update(dt)` method.
2. **Event bus for cross-cutting concerns.** Don't thread references through 4 layers; emit events.
3. **Everything loads through `Loader.js`.** Never call `new GLTFLoader()` ad-hoc in a gameplay file.
4. **Portfolio content is data, not code.** `public/content/portfolio.json` holds all user-facing text. You may edit it, but never hardcode strings in entity files.
5. **Fixed timestep for physics, variable render loop.** Accumulator pattern. Don't tie gameplay to frame rate.
6. **Dispose what you create.** Geometries, materials, textures → dispose on mini-game end to avoid leaks.
7. **Debug helpers live behind a key.** `` ` `` (backtick) toggles FPS, axes, collider wireframes. Never leave them on in committed main branch.

---

## 5. Coding Conventions

- **ESM imports only.** Relative paths with extensions: `import { Player } from './entities/Player.js'`.
- **Class-based for entities and systems**, function-based for utilities. Name classes in `PascalCase`, instances in `camelCase`.
- **JSDoc on public methods.** Especially params/return types — this is the only type safety we have.
- **No magic numbers.** Constants at the top of the file or in `src/utils/constants.js`.
- **Comments explain *why*, not *what*.** The code already says what.
- **Commit in vertical slices.** "Add Sheriff NPC with patrol AI" — not "Add Sheriff.js".
- **One feature per branch** if using git. `feat/wave-shooter`, `feat/horse-mount`.

---

## 6. Performance Budget (aim, don't obsess)

- Target: **60 fps on a 2020 MacBook Air (integrated GPU)**.
- ≤ 150k triangles in the main town scene.
- ≤ 20 real-time lights (prefer baked where possible).
- Textures: 1024×1024 max for hero assets, 512 for props.
- Draw calls under 200 in the town; merge static geometry aggressively.
- Lazy-load mini-game assets; don't pay for the poker deck until the saloon is entered.

---

## 7. Decision Log

When making a meaningful architectural choice, append a one-line entry below with date and reasoning. If an earlier decision is reversed, don't delete it — add a new line noting the reversal.

- *(add entries here as the project evolves)*

---

## 8. What to Do When Stuck

If a task is ambiguous, the scope is unclear, or two decisions here seem to conflict: **stop and ask the user.** Do not silently pick a direction. A 30-second question beats a 2-hour rewrite.

If performance is bad, profile before optimizing. Chrome DevTools Performance tab + Three.js Inspector extension.

If an asset is missing, check `RESOURCES.md` first. If it's not listed there, ask the user to source it — do not invent placeholder art beyond simple primitives.

---

## 9. Definition of Done (per phase)

A phase is "done" when:
1. All tasks in that phase of `PLAN.md` are checked off.
2. The build runs with zero console errors.
3. Frame rate holds 60 fps in the normal town with nothing happening.
4. A fresh visitor can reach every portfolio section via either the game OR the skip button.
5. The README has a one-paragraph changelog entry for the phase.
