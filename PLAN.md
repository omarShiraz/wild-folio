# PLAN.md — Build Phases

> **How to use this file:** Work one phase at a time. Don't start Phase 2 until Phase 1's "Definition of Done" is genuinely met. For each phase, feed Claude Code the phase section as context and let it tackle tasks in the listed order.

---

## Phase 0 — Project Setup (½ day)

**Goal:** Empty Vite + Three.js app that renders a spinning cube, proving the pipeline works end-to-end.

- [ ] `npm create vite@latest rdr-portfolio -- --template vanilla`
- [ ] Install: `three`, `cannon-es`, `howler`, `zustand`, `lil-gui` (debug UI), `stats.js`
- [ ] Create folder structure exactly as specified in `CLAUDE.md` §4
- [ ] `src/main.js` — boots renderer, scene, camera, a lit spinning cube
- [ ] Add `Stats.js` panel and `lil-gui` debug toggle (backtick key)
- [ ] `.gitignore`, `README.md` stub, commit
- [ ] Deploy a preview to Vercel/Netlify to prove build works

**Done when:** `npm run dev` shows a cube, `npm run build` succeeds, deployed URL loads.

---

## Phase 1 — The Empty Town (2–4 days)

**Goal:** Walk a player character around a visibly-a-Western-town. No interactions yet, no NPCs — just vibes and navigation.

- [ ] Ground plane with dirt texture, simple terrain (heightmap or flat is fine)
- [ ] Skybox — warm dusty gradient or an HDRI from Poly Haven
- [ ] Directional "sun" light + ambient, golden-hour color palette (~3500K)
- [ ] Place 5 building shells (boxes are fine at this stage) along a main street with signs identifying each
- [ ] Wooden fences / props from Kenney Western pack to dress the scene
- [ ] **Player controller:** third-person camera, WASD movement, Shift sprint, Space jump (grounded check). Use `cannon-es` capsule body.
- [ ] Camera: spring-arm follow cam with mouse look, clamp pitch, collision-aware (raycast to prevent clipping through walls)
- [ ] Collision against buildings (static box bodies) and ground
- [ ] HUD shell: health bar, ammo counter, wanted stars (all cosmetic for now)
- [ ] Mobile/touch detection → show `MobileBlock` overlay

**Done when:** You can run around the town without falling through the world, colliding with buildings, at 60 fps.

---

## Phase 2 — Horses (2–3 days)

**Goal:** Summon, mount, ride, and steal horses.

- [ ] Load a horse GLB (Quaternius has free ones), place 2–3 at hitching posts
- [ ] **Horse entity:** idle/walk/gallop animations if available, simple physics body
- [ ] Proximity prompt ("Press F to mount") when player is near a horse
- [ ] Mounted state swaps camera rig, disables jump, remaps controls: W/S throttle, A/D steer, Space gallop
- [ ] Whistle (H key) calls player's own horse from wherever it was left — spawns it near the player if too far
- [ ] **Hijacking:** mounting an NPC-owned horse flags it stolen → raises wanted level by 1 star (hook this into the system even before NPCs exist)
- [ ] Dismount (F) returns to on-foot controls, horse remains where dropped

**Done when:** You can whistle, mount, gallop across town, dismount, and the horse stays put. Stolen horses flag wanted correctly.

---

## Phase 3 — Interiors & Portfolio Content (3–5 days)

**Goal:** The actual portfolio part.

- [ ] Write `public/content/portfolio.json` — user fills in: name, bio, experience[], projects[], skills[], contacts[], résumé PDF path
- [ ] Each of the 5 buildings gets an interior: trigger zone at the door, camera transition (fade or door-open animation) to an interior scene
- [ ] **Sheriff's Office:** wanted-poster wall where each poster = a job (title, company, dates, bullets). Clickable for detail card.
- [ ] **Saloon:** bartender NPC, bio text as a chalkboard menu behind the bar, "sit at the piano" easter egg
- [ ] **General Store:** projects as items on shelves; interact to open a 3D "crate" that reveals project card with live link + thumbnail
- [ ] **Post Office:** telegram machine, contact info + social links as stamped envelopes
- [ ] **Gunsmith:** skills as weapons on the wall — each weapon tagged with a stack item
- [ ] **Skip-to-résumé button:** subtle corner icon, always visible, opens a clean HTML overlay reading from the same `portfolio.json`
- [ ] Ambient interior audio per building (saloon piano, store bell, etc.)

**Done when:** Every portfolio section is reachable both via the game *and* the skip button, and the content all comes from one JSON file.

---

## Phase 4 — NPCs & Crime (2–4 days)

**Goal:** Populate the town and make it reactive.

- [ ] Load 3–4 civilian NPC models, scatter around town with simple waypoint wander AI
- [ ] NPC dialogue barks on proximity (text bubble)
- [ ] **Gun system:** equip revolver (Q), aim (RMB for ADS + slow-mo "dead eye" lite), shoot (LMB), reload (R), 6-shot cylinder + reload animation, bullet raycast + impact decals
- [ ] NPC reactions: panic-flee on gun drawn, ragdoll (or simple falling animation) on hit, witnesses broadcast `crime:witnessed` event
- [ ] **WantedSystem:** accumulates stars based on witnessed events, decays if the player leaves town and lays low
- [ ] HUD wanted stars pulse red when rising
- [ ] Sheriffs exist as NPCs but aren't aggressive yet — they just patrol the sheriff's office

**Done when:** You can draw, aim, shoot, hit NPCs, watch them react, and see wanted stars rise.

---

## Phase 5 — Wave Shooter Mini-Game (3–5 days)

**Goal:** 3-star wanted → infinite wave shooter until death.

- [ ] **Trigger:** wanted hits 3 → HUD message "★ ★ ★ WANTED DEAD OR ALIVE", spawn first wave of sheriffs at the edges of town
- [ ] **Sheriff AI:** pathfind toward player (nav mesh or simple A* on a grid, or just steering behaviors + obstacle avoidance), stop at preferred range, shoot with spread, take cover behind props occasionally
- [ ] **Wave manager:** wave N has `3 + N` sheriffs, every 3rd wave is an "elite" wave (faster, more HP), infinite
- [ ] Score = `kills × waveNumber`, multiplier for headshots and no-damage waves
- [ ] Health regen briefly between waves; ammo crates drop on wave clear
- [ ] Minigame HUD: wave number, score, kill streak
- [ ] **On death:** slow-mo, "YOU DIED" screen (Souls homage acceptable), post score to local-storage leaderboard, respawn at the saloon with wanted cleared
- [ ] Sounds: gunshots, hit markers, sheriff callouts, tension music loop

**Done when:** It's actually fun for 2 minutes. Have a non-dev friend play it.

---

## Phase 6 — Polish Pass (ongoing)

- [ ] Loading screen with a spinning revolver cylinder or wanted-poster reveal
- [ ] Title screen: black-and-white photo style, "PRESS ENTER" telegraph font
- [ ] Footstep sounds with surface detection (wood vs. dirt)
- [ ] Tumbleweeds, ambient birds, distant coyote howls on a loop
- [ ] Accessibility: rebindable keys, subtitle toggle, motion-reduce option (less camera shake)
- [ ] Analytics (Plausible, privacy-friendly) to see which buildings visitors actually enter
- [ ] SEO: real `<title>`, OG image, `robots.txt`, meta description — recruiters should still find this via Google

---

## Phase 7+ — Stretch Mini-Games

Unlock in this order, one at a time:

- [ ] **Horse Chase** — triggered at 5-star wanted OR as a cutscene exit from Phase 5; procedural obstacle course, shoot back while galloping
- [ ] **Saloon Poker** — 5-card draw, 3 NPC opponents with tells, in-game chip economy for cosmetics
- [ ] **Showdown Duel** — QTE-style: draw on a beat, press a button in a narrowing window
- [ ] **Bounty Board** — outside the sheriff's office; pick a bounty, track target, bring them in for cash

---

## How to run a phase with Claude Code

1. `cd rdr-portfolio && claude` (launch Claude Code in the project root)
2. Say: *"Read CLAUDE.md and PLAN.md. We're starting Phase X. Propose a task-by-task breakdown and wait for my approval before editing any files."*
3. Review its plan. Push back on anything vague.
4. Approve → it writes code in small batches. After each batch, run the app, smoke-test, commit.
5. End the session by saying: *"Append today's decisions to the Decision Log in CLAUDE.md and summarize what's left in this phase."*
