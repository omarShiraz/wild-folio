# RDR Portfolio

> A portfolio you play, not scroll.

A Red Dead Redemption–inspired 3D portfolio website built with Three.js. Explore a small Western town, enter buildings to discover portfolio content, and try not to cause too much trouble.

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm run preview  # preview the production build locally
```

## Controls (Phase 1+)

| Key | Action |
|---|---|
| WASD | Move |
| Shift | Sprint |
| Space | Jump |
| E | Interact |
| F | Mount / Dismount horse |
| H | Whistle for horse |
| LMB | Shoot |
| RMB | Aim |
| R | Reload |
| `` ` `` | Toggle debug overlay (FPS + GUI) |

## Buildings → Portfolio

| Building | Content |
|---|---|
| Sheriff's Office | Résumé / Work experience |
| Saloon | About Me |
| General Store | Projects |
| Post Office | Contact / Social links |
| Gunsmith | Skills / Tech stack |

## Portfolio content

All user-facing text lives in `public/content/portfolio.json` — edit that file, never entity files.

---

## Changelog

### Phase 0 — Project Setup

- Vite + Three.js pipeline scaffolded; spinning lit cube at 60 fps confirmed
- Full directory structure from CLAUDE.md §4 in place
- Stats.js + lil-gui debug overlay wired up (backtick key, off by default)
- `public/content/portfolio.json` established as single source of truth
