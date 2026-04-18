// ─── Renderer ────────────────────────────────────────────────────────────────
export const TONE_MAPPING_EXPOSURE = 1.2;

// ─── Physics ────────────────────────────────────────────────────────────────
export const FIXED_TIMESTEP  = 1 / 60;
export const MAX_FRAME_DELTA = 0.05;
export const GRAVITY         = -20;

// ─── Player ─────────────────────────────────────────────────────────────────
export const PLAYER_RADIUS          = 0.4;
export const PLAYER_HEIGHT          = 1.8;
export const PLAYER_WALK_SPEED      = 12;
export const PLAYER_SPRINT_SPEED    = 20;
export const PLAYER_JUMP_IMPULSE    = 8;
export const PLAYER_MASS            = 75;
export const PLAYER_LINEAR_DAMPING  = 0.99; // high — we set velocity directly, not forces
export const PLAYER_ANGULAR_DAMPING = 1.0;  // prevent any tip-over
export const PLAYER_VELOCITY_DECAY  = 0.8;  // per-frame bleed when no WASD held

// ─── Camera ─────────────────────────────────────────────────────────────────
export const CAM_DISTANCE       = 5;     // spring-arm rest length
export const CAM_HEIGHT_OFFSET  = 1.4;  // pivot height above player's feet
export const CAM_LERP_FACTOR    = 0.9;
export const CAM_PITCH_MIN      = -30;  // degrees — max look-down
export const CAM_PITCH_MAX      = 50;   // degrees — max look-up
export const CAM_CLIP_BUFFER    = 0.3;  // pull-back margin on wall hit
export const MOUSE_SENSITIVITY  = 0.002;

// ─── World / Town ───────────────────────────────────────────────────────────
export const GROUND_SIZE         = 200;
export const STREET_LENGTH       = 80;
export const STREET_WIDTH        = 10;
export const BUILDING_SETBACK    = 7;    // distance from street centre to building face

// ─── Lighting ───────────────────────────────────────────────────────────────
export const SUN_COLOR           = 0xffb347;
export const SUN_INTENSITY       = 3.0;
export const AMBIENT_COLOR       = 0x5c3d1e;
export const AMBIENT_INTENSITY   = 0.4;
export const SHADOW_MAP_SIZE     = 2048;

// ─── Sky ────────────────────────────────────────────────────────────────────
export const SKY_TURBIDITY       = 8;
export const SKY_RAYLEIGH        = 2;
export const SKY_MIE_COEFF       = 0.005;
export const SKY_MIE_DIR         = 0.7;
export const SKY_SUN_ELEVATION   = 12;   // degrees above horizon (warm but readable)
export const SKY_SUN_AZIMUTH     = 90;   // degrees — sun from the side, between buildings

// ─── Fog ────────────────────────────────────────────────────────────────────
export const FOG_COLOR  = 0xc47a3a;
export const FOG_NEAR   = 40;
export const FOG_FAR    = 180;

// ─── Buildings ──────────────────────────────────────────────────────────────
export const BUILDING_CONFIGS = [
  // name,            w,   h,   d,   x,    z,   side, color
  { name: 'Saloon',          w: 9,  h: 8,  d: 10, x: -20, side: 'north', color: 0xc8a46e },
  { name: 'General Store',   w: 8,  h: 6,  d: 9,  x:   0, side: 'north', color: 0xb8926a },
  { name: 'Post Office',     w: 6,  h: 5,  d: 7,  x:  18, side: 'north', color: 0xd4b483 },
  { name: "Sheriff's Office",w: 7,  h: 6,  d: 9,  x: -18, side: 'south', color: 0x8b7355 },
  { name: 'Gunsmith',        w: 6,  h: 5,  d: 8,  x:  16, side: 'south', color: 0x9c7a52 },
];

// ─── Props — geometry ────────────────────────────────────────────────────────
export const BARREL_RADIUS       = 0.3;
export const BARREL_HEIGHT       = 0.6;
export const FENCE_POST_W        = 0.12;
export const FENCE_POST_H        = 1.0;
export const FENCE_RAIL_H        = 0.08;
export const FENCE_SPACING       = 2.5;   // gap between fence posts
export const HITCHING_POST_H     = 1.2;
export const HITCHING_RAIL_W     = 3.0;

// ─── Props — colors ──────────────────────────────────────────────────────────
export const COLOR_BARREL        = 0x6b4226;
export const COLOR_FENCE_POST    = 0x8b6340;
export const COLOR_FENCE_RAIL    = 0x9c7a52;
export const COLOR_HITCHING      = 0x7a5230;

// ─── Horse ──────────────────────────────────────────────────────────────────
export const HORSE_BODY_W        = 0.8;   // width (side-to-side)
export const HORSE_BODY_H        = 1.0;   // body height (not counting legs)
export const HORSE_BODY_L        = 2.2;   // length (front-to-back)
export const HORSE_LEG_RADIUS    = 0.08;
export const HORSE_LEG_H         = 0.9;
export const HORSE_HEAD_W        = 0.35;
export const HORSE_HEAD_H        = 0.4;
export const HORSE_HEAD_L        = 0.7;
export const HORSE_NECK_L        = 0.6;
export const HORSE_MASS          = 400;
export const HORSE_WALK_SPEED    = 20;
export const HORSE_TROT_SPEED    = 32;
export const HORSE_CANTER_SPEED  = 42;    // W + holding Space (constant jog)
export const HORSE_GALLOP_SPEED  = 56;    // W + tapping Space (sprint cap)
export const HORSE_ACCEL         = 25;    // units/s² when accelerating
export const HORSE_DECEL         = 14;    // units/s² passive speed bleed
export const HORSE_GALLOP_ACCEL  = 40;    // burst acceleration per Space tap
export const HORSE_TAP_KICK      = 8;     // instant speed added per Space tap
export const HORSE_TURN_SPEED    = 3.5;   // radians/s at walk; scales down with speed
export const HORSE_MOUNT_RANGE   = 3.0;   // max distance to mount
export const HORSE_WHISTLE_RANGE = 50;    // within this range horse runs to player
export const HORSE_WHISTLE_SPEED = 38;    // speed of horse when responding to whistle
export const HORSE_ARRIVE_DIST   = 3.5;   // stop this far from player when whistled

// ─── Horse — colors ─────────────────────────────────────────────────────────
export const COLOR_HORSE_BODY    = 0x8b5a2b;  // warm brown
export const COLOR_HORSE_DARK    = 0x3e2415;  // mane, tail, hooves
export const COLOR_HORSE_LIGHT   = 0xc4956a;  // muzzle blaze

// ─── Horse — camera (mounted) ───────────────────────────────────────────────
export const HORSE_CAM_DISTANCE      = 10;
export const HORSE_CAM_HEIGHT_OFFSET = 4.0;
export const HORSE_CAM_LERP_FACTOR   = 0.85;

// ─── Interaction ────────────────────────────────────────────────────────────
export const INTERACTION_POLL_RATE = 0.1; // seconds between proximity checks

// ─── Player — colors & spawn ─────────────────────────────────────────────────
export const COLOR_PLAYER_BODY  = 0x4a3728;  // dark brown duster
export const COLOR_PLAYER_HAT   = 0x1a0e06;  // near-black felt
export const PLAYER_START_Z     = STREET_LENGTH / 2 + 5; // south end, looking north

// ─── Buildings — material ────────────────────────────────────────────────────
export const BUILDING_ROUGHNESS  = 0.9;
export const SIGN_HEIGHT_FRAC    = 0.82; // sign placed at this fraction of building height
export const SIGN_WIDTH_FRAC     = 0.75; // sign width relative to building width (capped)
export const SIGN_MAX_WIDTH      = 3.5;
