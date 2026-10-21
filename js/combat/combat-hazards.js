import { _applyPlayerAilment } from './combat-ailments-core.js';
import { _playerTakeDamage } from './encounter.js';
import { _egActiveMapItem, _egGetActiveMapModValue } from '../endgame/endgame-map-launch.js';
import { EG_MAX_MAP_TIER } from '../loot/loot-map-config.js';
import { _isActive } from './combat-state.js';

//------------------------------------------------------------------------
//-------------------ENDGAME MAP ELEMENTAL HAZARDS------------------------
//------------------------------------------------------------------------
// Screen-space environmental hazards driven by map modifier families:
//   map_hazard_lava      - drifting lava balls around the puzzle grid; on player collision
//                          the ball fuses for 0.5 s then explodes for heavy fire damage
//                          (blast radius 140 px, may ignite), despawns for 3 min, then respawns
//   map_hazard_lightning - telegraphed lightning strikes (shock on hit)
//   map_hazard_blizzard  - snow overlay + falling icicles (chill on hit)
//   map_hazard_darkness  - drifting dark clouds obscuring parts of the UI
//   map_hazard_arcane    - charged arcane beams sweeping right → left
//   map_hazard_meteor    - telegraphed meteor volleys (ignite on hit)
//   map_hazard_volatile  - wisps that hunt the player and detonate (shadow burn)
//   map_hazard_frostnova - freezing novas erupting near the player (chill/freeze)
//   map_hazard_firewall  - telegraphed fire walls sweeping top → bottom (ignite)
//   map_hazard_cyclone   - fast-drifting cyclones with continuous wind damage
//   map_hazard_delirium  - periodic delirium mist that may polymorph the player
//
// Hazards ONLY affect the player - monsters never interact with them.
// All damage flows through _playerTakeDamage(amount, true, element) so
// the player's elemental resistances / flat Arcane Resistance mitigate it,
// giving a direct incentive to stack resistances on hazard maps.
//
// The rolled mod value acts as the hazard INTENSITY (%): it scales damage,
// spawn counts and frequency. Damage additionally scales with the map's
// tier (see _hzTierMult) so higher-tier maps stay challenging. All
// timing is driven from the encounter's 10Hz tick loop (_hazardsTick),
// so pausing the game freezes hazards.
//
// Dependencies (loaded before this file):
//   endgame-map-launch.js - _egGetActiveMapModValue
//   encounter.js  - _playerTakeDamage, _isActive
//   endgame-ailments.js   - _applyPlayerAilment
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------TUNING CONSTANTS------------------------------------
//------------------------------------------------------------------------

export const HZ_LAVA_BASE_DMG_PCT = 2;        // legacy tick (kept for reference; lava now uses explosion)
export const HZ_LAVA_TICK_MS = 600;           // (unused after fuse redesign, kept for compat)
export const HZ_LAVA_MIN_R = 55;              // pool radius range (px)
export const HZ_LAVA_MAX_R = 85;
export const HZ_LAVA_SPEED_MIN = 20;          // drift speed range (px/s)
export const HZ_LAVA_SPEED_MAX = 48;
export const HZ_LAVA_EXPLOSION_BASE_DMG_PCT = 20; // % of playerMaxHP dealt when a lava ball explodes (heavy fire)
export const HZ_LAVA_FUSE_MS = 500;           // delay between collision and detonation
export const HZ_LAVA_RESPAWN_MS = 180000;     // 3 minutes until the same ball respawns (gameplay time, paused while game is paused)
export const HZ_LAVA_BLAST_R = 140;           // explosion radius (px) - must evade after the 0.5s fuse
export const HZ_LAVA_IGNITE_CHANCE_PCT = 55;  // chance to ignite the player if the blast hits

export const HZ_LIGHTNING_BASE_DMG_PCT = 8;   // % of playerMaxHP per strike
export const HZ_LIGHTNING_WARNING_MS = 5000;  // telegraph time before impact
export const HZ_LIGHTNING_RADIUS = 80;        // impact radius (px)
export const HZ_LIGHTNING_INTERVAL_MIN_MS = 9000;
export const HZ_LIGHTNING_INTERVAL_MAX_MS = 14000;

export const HZ_ICICLE_BASE_DMG_PCT = 5;      // % of playerMaxHP per icicle hit
export const HZ_ICICLE_FALL_SPEED = 1400;     // px/s while dropping
export const HZ_ICICLE_SHAKE_MS = 750;
export const HZ_ICICLE_SPAWN_MIN_MS = 3000;
export const HZ_ICICLE_SPAWN_MAX_MS = 6000;

export const HZ_ARCANE_BASE_DMG_PCT = 7;      // % of playerMaxHP per beam hit
export const HZ_ARCANE_CHARGE_MIN_MS = 8000;
export const HZ_ARCANE_CHARGE_MAX_MS = 10000;
export const HZ_ARCANE_BEAM_TRAVEL_MS = 450;  // right → left sweep duration
export const HZ_ARCANE_BEAM_HEIGHT = 64;
export const HZ_ARCANE_POLYMORPH_CHANCE_PCT = 40;
export const HZ_ARCANE_INTERVAL_MIN_MS = 13000;
export const HZ_ARCANE_INTERVAL_MAX_MS = 18000;

export const HZ_METEOR_BASE_DMG_PCT = 6;       // % of playerMaxHP per meteor impact
export const HZ_METEOR_WARNING_MS = 1400;      // telegraph time per meteor
export const HZ_METEOR_FALL_MS = 420;          // descent duration once fired
export const HZ_METEOR_RADIUS = 70;            // impact radius (px)
export const HZ_METEOR_VOLLEY_MIN = 3;
export const HZ_METEOR_VOLLEY_MAX = 6;
export const HZ_METEOR_IGNITE_CHANCE_PCT = 40;
export const HZ_METEOR_INTERVAL_MIN_MS = 7000;
export const HZ_METEOR_INTERVAL_MAX_MS = 11000;

export const HZ_VOLATILE_BASE_DMG_PCT = 9;     // % of playerMaxHP per detonation
export const HZ_VOLATILE_SPEED_MIN = 26;       // homing speed range (px/s)
export const HZ_VOLATILE_SPEED_MAX = 60;
export const HZ_VOLATILE_TRIGGER_R = 90;       // starts fusing when this close
export const HZ_VOLATILE_FUSE_MS = 1100;       // flashing fuse before detonation
export const HZ_VOLATILE_BLAST_R = 110;        // detonation radius (px)
export const HZ_VOLATILE_LIFETIME_MS = 16000;  // fuses anyway so it can't stall
export const HZ_VOLATILE_SHADOWBURN_CHANCE_PCT = 60;
export const HZ_VOLATILE_RESPAWN_MIN_MS = 4000;
export const HZ_VOLATILE_RESPAWN_MAX_MS = 8000;

export const HZ_FROSTNOVA_BASE_DMG_PCT = 7;    // % of playerMaxHP per nova hit
export const HZ_FROSTNOVA_EXPAND_MS = 1600;    // ring expansion duration
export const HZ_FROSTNOVA_MAX_R = 170;         // final ring radius (px)
export const HZ_FROSTNOVA_BAND = 26;           // damaging band thickness (px)
export const HZ_FROSTNOVA_FREEZE_CHANCE_PCT = 30;
export const HZ_FROSTNOVA_INTERVAL_MIN_MS = 6000;
export const HZ_FROSTNOVA_INTERVAL_MAX_MS = 10000;

export const HZ_FIREWALL_BASE_DMG_PCT = 18;    // % of playerMaxHP per wall hit - significant fire wave (was 8, too low)
export const HZ_FIREWALL_HEIGHT = 150;         // flame wave thickness (px)
export const HZ_FIREWALL_WARNING_MS = 5000;    // telegraph before ignition
export const HZ_FIREWALL_SWEEP_MS = 2600;      // sweep duration (direction depends on variant)
export const HZ_FIREWALL_IGNITE_CHANCE_PCT = 50;
export const HZ_FIREWALL_INTERVAL_MIN_MS = 8000;
export const HZ_FIREWALL_INTERVAL_MAX_MS = 12000;
// Outplay tuning - safe-zone insets and gap geometry for firewall variations
// Top safe-zone must clear the avatar HUD (wrapper at top:4px + ~150px tall incl.
// HP/charge bars).  Bottom safe-zone is less constrained so it stays smaller.
export const HZ_FIREWALL_SAFE_MIN = 90;        // legacy generic (kept for compat)
export const HZ_FIREWALL_SAFE_MAX = 160;
export const HZ_FIREWALL_TOP_SAFE_MIN = 185;   // offsetTop: safe strip at very top (px)
export const HZ_FIREWALL_TOP_SAFE_MAX = 260;
export const HZ_FIREWALL_BOTTOM_SAFE_MIN = 90; // offsetBottom: safe strip at very bottom (px)
export const HZ_FIREWALL_BOTTOM_SAFE_MAX = 165;
export const HZ_FIREWALL_GAP_MIN_W = 180;      // minimum gap width for gap variants (px)
export const HZ_FIREWALL_GAP_MAX_W = 280;      // maximum gap width (px)
export const HZ_FIREWALL_GAP_MARGIN = 70;      // keep gap at least this far from screen edges (px)

export const HZ_CYCLONE_BASE_DMG_PCT = 1.6;    // % of playerMaxHP per wind tick
export const HZ_CYCLONE_TICK_MS = 500;         // damage tick rate inside a cyclone
export const HZ_CYCLONE_R_MIN = 40;            // funnel radius range (px)
export const HZ_CYCLONE_R_MAX = 62;
export const HZ_CYCLONE_SPEED_MIN = 90;        // drift speed range (px/s)
export const HZ_CYCLONE_SPEED_MAX = 170;

export const HZ_DELIRIUM_INTERVAL_MIN_MS = 18000;
export const HZ_DELIRIUM_INTERVAL_MAX_MS = 26000;
export const HZ_DELIRIUM_FADE_IN_MS = 2500;
export const HZ_DELIRIUM_HOLD_MS = 4000;
export const HZ_DELIRIUM_FADE_OUT_MS = 2000;
export const HZ_DELIRIUM_POLYMORPH_CHANCE_PCT = 45;

export const HZ_LAYER_Z = 850;                // below player avatar (z:1000)


//------------------------------------------------------------------------
//-------------------SHARED HAZARD STATE-------------------------------
//------------------------------------------------------------------------

export let _hzActive = false;
export let _hzLayer = null;
export let _hzPausedForQuiz = false;

export let _hzLava = null;       // { pools: [{x,y,r,vx,vy,el,dmgAcc}], dmgMult }
export let _hzLightning = null;  // { pending: [{x,y,t,el}], nextIn }
export let _hzBlizzard = null;   // { icicles: [], spawnIn, maxIcicles }
export let _hzDarkness = null;   // { clouds: [] }
export let _hzArcane = null;     // { charge: null | {...}, beam: null | {...}, nextIn }
export let _hzMeteor = null;     // { pending: [{x,y,t,warnEl,state,el,y}], nextIn, intervalScale, dmgMult }
export let _hzVolatile = null;   // { wisps: [], respawnIn, maxWisps, dmgMult }
export let _hzFrostNova = null;  // { novas: [], nextIn, intervalScale, dmgMult }
export let _hzFirewall = null;   // { pending: [{t,y,dir,totalDist,endY,variant,gapX,gapW,wallEls,warningEls,hitDone}], nextIn, intervalScale, dmgMult }
export let _hzCyclone = null;    // { vortices: [{x,y,r,vx,vy,dmgAcc,el}], dmgMult }
export let _hzDelirium = null;   // { phase, nextIn, t, el, rolled }

export function _setHzActive(value) {
    _hzActive = value;
}

export function _setHzLayer(value) {
    _hzLayer = value;
}

export function _setHzPausedForQuiz(value) {
    _hzPausedForQuiz = value;
}

export function _setHzLava(value) {
    _hzLava = value;
}

export function _setHzLightning(value) {
    _hzLightning = value;
}

export function _setHzBlizzard(value) {
    _hzBlizzard = value;
}

export function _setHzDarkness(value) {
    _hzDarkness = value;
}

export function _setHzArcane(value) {
    _hzArcane = value;
}

export function _setHzMeteor(value) {
    _hzMeteor = value;
}

export function _setHzVolatile(value) {
    _hzVolatile = value;
}

export function _setHzFrostNova(value) {
    _hzFrostNova = value;
}

export function _setHzFirewall(value) {
    _hzFirewall = value;
}

export function _setHzCyclone(value) {
    _hzCyclone = value;
}

export function _setHzDelirium(value) {
    _hzDelirium = value;
}

//------------------------------------------------------------------------
//-------------------SMALL HELPERS---------------------------------------
//------------------------------------------------------------------------

export function _hzIntensity(familyId) {
    if (typeof _egGetActiveMapModValue !== 'function') return 0;
    return _egGetActiveMapModValue(familyId);
}

// Damage multiplier from the rolled intensity value (e.g. 60 → ×1.6).
export function _hzMult(intensity) {
    return 1 + Math.max(0, intensity) / 100;
}

// Map-tier scaling for elemental hazards: higher tiers deal significantly
// more hazard damage so hazards stay challenging in late endgame. Tier 1
// is 1.0×, each additional tier adds ~7% (T16 ≈ 2.05×).
export function _hzTierMult() {
    let tier = 1;
    try {
        if (typeof _egActiveMapItem !== 'undefined' && _egActiveMapItem && _egActiveMapItem.mapTier != null) {
            tier = _egActiveMapItem.mapTier;
        }
    } catch (e) {}
    tier = Math.max(1, Math.min(16, Number(tier) || 1));
    // Allow EG_MAX_MAP_TIER override if defined.
    if (typeof EG_MAX_MAP_TIER !== 'undefined' && EG_MAX_MAP_TIER > 16) {
        tier = Math.max(1, Math.min(EG_MAX_MAP_TIER, Number(tier) || 1));
    }
    return 1 + (tier - 1) * 0.07;
}

export function _hzRand(min, max) {
    return min + Math.random() * (max - min);
}

export function _hzPlayerEl() {
    return document.getElementById('player-avatar-wrapper') ||
           document.getElementById('player-avatar-simple');
}

// Tight hitbox derived from the visible sprite image, not the wrapper.
// The wrapper (#player-avatar-wrapper 128px + HP/charge bars, or
// #player-avatar-simple 128px) is taller than the artwork, so using its
// center/bounds misaligns collision by ~30–40px and makes lava/volatile
// feel "off" while blizzard walls hit the bars.
export function _hzPlayerSpriteRect() {
    let img = document.getElementById('avatar-sprite-img');
    if (!img || !img.getBoundingClientRect) img = null;
    let r = img ? img.getBoundingClientRect() : null;
    if (!r || (!r.width && !r.height)) {
        img = document.getElementById('avatar-sprite-img-simple');
        r = img ? img.getBoundingClientRect() : null;
    }
    if (r && r.width && r.height) return r;
    return null;
}

export function _hzPlayerRect() {
    // Primary: tight box around the sprite image with insets for
    // transparent padding (cape/shoulders/feet). Fallback: wrapper rect
    // with top cropped where HP/charge bars live.
    let r = _hzPlayerSpriteRect();
    let base = r;
    if (!base) {
        const el = _hzPlayerEl();
        if (!el) return null;
        const wr = el.getBoundingClientRect();
        if (!wr.width && !wr.height) return null;
        // Estimate sprite area: bottom ~62% of wrapper (bars ~38% on top)
        const barH = wr.height * 0.38;
        base = {
            left: wr.left, right: wr.right,
            top: wr.top + barH, bottom: wr.bottom,
            width: wr.width, height: wr.height - barH
        };
    }
    // Inset so transparent edges don't count. Keep at least ~56x56 hitbox.
    const insetX = Math.min(16, base.width * 0.18);
    const insetY = Math.min(12, base.height * 0.14);
    const insetB = Math.min(8, base.height * 0.08);
    const left = base.left + insetX;
    const right = base.right - insetX;
    const top = base.top + insetY;
    const bottom = base.bottom - insetB;
    if (right <= left || bottom <= top) return base;
    return {
        left, right, top, bottom,
        width: right - left, height: bottom - top
    };
}

// Alias used at call-sites for clarity - identical to _hzPlayerRect().
export function _hzPlayerHitbox() {
    return _hzPlayerRect();
}

// Bounding box of the puzzle grid INCLUDING row/col clue number cells -
// #ptable is one table containing both, so its rect already covers them.
export function _hzGridRect(pad) {
    const g = document.getElementById('ptable');
    if (!g) return null;
    const r = g.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    const p = pad || 0;
    return {
        left: r.left - p, top: r.top - p,
        right: r.right + p, bottom: r.bottom + p,
        width: r.width + p * 2, height: r.height + p * 2,
    };
}

export function _hzRectsOverlap(a, b) {
    return !!a && !!b &&
        a.left < b.right && a.right > b.left &&
        a.top < b.bottom && a.bottom > b.top;
}

export function _hzCircleRectOverlap(x, y, r, rect) {
    if (!rect) return false;
    const cx = Math.max(rect.left, Math.min(x, rect.right));
    const cy = Math.max(rect.top, Math.min(y, rect.bottom));
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= r * r;
}

// Shared hazard hit resolution: use the same overlap rule for every circular
// impact and apply the ailment only when the hit actually dealt damage.
export function _hzApplyCircleHit(x, y, radius, pr, damagePct, element, color, ailment, ailmentDps) {
    if (!pr || !_hzCircleRectOverlap(x, y, radius, pr)) return false;
    const dealt = _hzDamage(damagePct, element, color);
    if (dealt > 0 && ailment && typeof _applyPlayerAilment === 'function') {
        _applyPlayerAilment(ailment, ailmentDps);
    }
    return true;
}

export function _hzRectInsideCircle(rect, cx, cy, r) {
    if (!rect) return false;
    const r2 = r * r;
    const corners = [
        [rect.left, rect.top], [rect.right, rect.top],
        [rect.left, rect.bottom], [rect.right, rect.bottom]
    ];
    for (let i = 0; i < 4; i++) {
        const dx = corners[i][0] - cx, dy = corners[i][1] - cy;
        if (dx * dx + dy * dy > r2) return false;
    }
    return true;
}

export function _hzRingRectOverlap(x, y, radius, band, rect) {
    if (!rect) return false;
    const outer = radius + band;
    if (!_hzCircleRectOverlap(x, y, outer, rect)) return false;
    const inner = Math.max(0, radius - band);
    if (inner <= 0) return true;
    // If rect is fully inside the hole, no hit.
    if (_hzRectInsideCircle(rect, x, y, inner)) return false;
    // Otherwise outer hits but not fully inside hole => band overlaps rect.
    // For thin bands, also accept case where rect straddles inner edge
    // even if outer check passed but inner disc still overlaps.
    return true;
}

export function _hzSweptCircleRectOverlap(x0, y0, x1, y1, r, rect) {
    if (!rect) return false;
    if (_hzCircleRectOverlap(x0, y0, r, rect)) return true;
    if (_hzCircleRectOverlap(x1, y1, r, rect)) return true;
    // Sample midpoint and check expanded rect fallback - cheap 3-point
    // check catches most tunneling without segment math.
    const mx = (x0 + x1) * 0.5, my = (y0 + y1) * 0.5;
    if (_hzCircleRectOverlap(mx, my, r, rect)) return true;
    // For long sweeps (icicles 140px, arcane 240px per 100ms tick)
    // also test bounding box of the sweep expanded by radius.
    if (Math.hypot(x1 - x0, y1 - y0) > r) {
        const sx0 = Math.min(x0, x1) - r, sx1 = Math.max(x0, x1) + r;
        const sy0 = Math.min(y0, y1) - r, sy1 = Math.max(y0, y1) + r;
        const sweep = { left: sx0, right: sx1, top: sy0, bottom: sy1 };
        if (_hzRectsOverlap(sweep, rect)) {
            // Sweep box overlaps - do denser sampling along segment
            for (let t = 0.25; t < 1; t += 0.25) {
                const sx = x0 + (x1 - x0) * t;
                const sy = y0 + (y1 - y0) * t;
                if (_hzCircleRectOverlap(sx, sy, r, rect)) return true;
            }
        }
    }
    return false;
}

// Samples a random viewport point that lies OUTSIDE the puzzle-grid rect
// (inflated by `pad`). Falls back to any viewport point after 40 tries.
export function _hzPointOutsideGrid(pad) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const grid = _hzGridRect(pad || 0);
    for (let i = 0; i < 40; i++) {
        const x = _hzRand(30, vw - 30);
        const y = _hzRand(30, vh - 30);
        if (!grid ||
            x < grid.left || x > grid.right ||
            y < grid.top || y > grid.bottom) {
            return { x, y };
        }
    }
    return { x: vw * 0.5, y: vh - 60 };
}

// Applies an elemental hazard hit to the player (% of max life) through the
// normal intake pipeline → resistances / dodge / block / shock amp apply.
// Scales with both intensity (via caller) and map tier (here) so high-tier
// maps remain challenging even when hazard intensity is moderate.
export function _hzDamage(pctOfMaxHP, element, colorHex) {
    if (!_isActive()) return 0;
    const maxHP = (typeof playerMaxHP !== 'undefined' && globalThis.playerMaxHP > 0) ? globalThis.playerMaxHP : 100;
    const tierMult = _hzTierMult();
    const amount = Math.max(1, Math.round(maxHP * pctOfMaxHP * tierMult / 100));
    const dealt = _playerTakeDamage(amount, true, element);
    _hzShowHitText(dealt, colorHex);
    return dealt;
}

// Small floating damage label on the player avatar.
export function _hzShowHitText(amount, colorHex) {
    if (!(amount > 0)) return;
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'sx-hz-hit-text';
    label.style.color = colorHex || '#ff6b4a';
    label.textContent = '-' + amount;
    hud.appendChild(label);
    setTimeout(() => label.remove(), 900);
}
