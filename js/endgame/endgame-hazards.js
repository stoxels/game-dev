//------------------------------------------------------------------------
//-------------------ENDGAME MAP ELEMENTAL HAZARDS------------------------
//------------------------------------------------------------------------
// Screen-space environmental hazards driven by map modifier families:
//   map_hazard_lava      — drifting lava balls around the puzzle grid; on player collision
//                          the ball fuses for 0.5 s then explodes for heavy fire damage
//                          (blast radius 140 px, may ignite), despawns for 3 min, then respawns
//   map_hazard_lightning — telegraphed lightning strikes (shock on hit)
//   map_hazard_blizzard  — snow overlay + falling icicles (chill on hit)
//   map_hazard_darkness  — drifting dark clouds obscuring parts of the UI
//   map_hazard_arcane    — charged arcane beams sweeping right → left
//   map_hazard_meteor    — telegraphed meteor volleys (ignite on hit)
//   map_hazard_volatile  — wisps that hunt the player and detonate (shadow burn)
//   map_hazard_frostnova — freezing novas erupting near the player (chill/freeze)
//   map_hazard_firewall  — telegraphed fire walls sweeping top → bottom (ignite)
//   map_hazard_cyclone   — fast-drifting cyclones with continuous wind damage
//   map_hazard_delirium  — periodic delirium mist that may polymorph the player
//
// Hazards ONLY affect the player — monsters never interact with them.
// All damage flows through _egPlayerTakeDamage(amount, true, element) so
// the player's elemental resistances / flat Arcane Resistance mitigate it,
// giving a direct incentive to stack resistances on hazard maps.
//
// The rolled mod value acts as the hazard INTENSITY (%): it scales damage,
// spawn counts and frequency. Damage additionally scales with the map's
// tier (see _egHzTierMult) so higher-tier maps stay challenging. All
// timing is driven from the encounter's 10Hz tick loop (_egHazardsTick),
// so pausing the game freezes hazards.
//
// Dependencies (loaded before this file):
//   endgame-map-launch.js — _egGetActiveMapModValue
//   endgame-encounter.js  — _egPlayerTakeDamage, _egIsActive
//   endgame-ailments.js   — _egApplyPlayerAilment
//------------------------------------------------------------------------


//------------------------------------------------------------------------
//-------------------TUNING CONSTANTS------------------------------------
//------------------------------------------------------------------------

const EG_HZ_LAVA_BASE_DMG_PCT = 2;        // legacy tick (kept for reference; lava now uses explosion)
const EG_HZ_LAVA_TICK_MS = 600;           // (unused after fuse redesign, kept for compat)
const EG_HZ_LAVA_MIN_R = 55;              // pool radius range (px)
const EG_HZ_LAVA_MAX_R = 85;
const EG_HZ_LAVA_SPEED_MIN = 20;          // drift speed range (px/s)
const EG_HZ_LAVA_SPEED_MAX = 48;
const EG_HZ_LAVA_EXPLOSION_BASE_DMG_PCT = 20; // % of playerMaxHP dealt when a lava ball explodes (heavy fire)
const EG_HZ_LAVA_FUSE_MS = 500;           // delay between collision and detonation
const EG_HZ_LAVA_RESPAWN_MS = 180000;     // 3 minutes until the same ball respawns (gameplay time, paused while game is paused)
const EG_HZ_LAVA_BLAST_R = 140;           // explosion radius (px) — must evade after the 0.5s fuse
const EG_HZ_LAVA_IGNITE_CHANCE_PCT = 55;  // chance to ignite the player if the blast hits

const EG_HZ_LIGHTNING_BASE_DMG_PCT = 8;   // % of playerMaxHP per strike
const EG_HZ_LIGHTNING_WARNING_MS = 5000;  // telegraph time before impact
const EG_HZ_LIGHTNING_RADIUS = 80;        // impact radius (px)
const EG_HZ_LIGHTNING_INTERVAL_MIN_MS = 9000;
const EG_HZ_LIGHTNING_INTERVAL_MAX_MS = 14000;

const EG_HZ_ICICLE_BASE_DMG_PCT = 5;      // % of playerMaxHP per icicle hit
const EG_HZ_ICICLE_FALL_SPEED = 1400;     // px/s while dropping
const EG_HZ_ICICLE_SHAKE_MS = 750;
const EG_HZ_ICICLE_SPAWN_MIN_MS = 3000;
const EG_HZ_ICICLE_SPAWN_MAX_MS = 6000;

const EG_HZ_ARCANE_BASE_DMG_PCT = 7;      // % of playerMaxHP per beam hit
const EG_HZ_ARCANE_CHARGE_MIN_MS = 8000;
const EG_HZ_ARCANE_CHARGE_MAX_MS = 10000;
const EG_HZ_ARCANE_BEAM_TRAVEL_MS = 450;  // right → left sweep duration
const EG_HZ_ARCANE_BEAM_HEIGHT = 64;
const EG_HZ_ARCANE_POLYMORPH_CHANCE_PCT = 40;
const EG_HZ_ARCANE_INTERVAL_MIN_MS = 13000;
const EG_HZ_ARCANE_INTERVAL_MAX_MS = 18000;

const EG_HZ_METEOR_BASE_DMG_PCT = 6;       // % of playerMaxHP per meteor impact
const EG_HZ_METEOR_WARNING_MS = 1400;      // telegraph time per meteor
const EG_HZ_METEOR_FALL_MS = 420;          // descent duration once fired
const EG_HZ_METEOR_RADIUS = 70;            // impact radius (px)
const EG_HZ_METEOR_VOLLEY_MIN = 3;
const EG_HZ_METEOR_VOLLEY_MAX = 6;
const EG_HZ_METEOR_IGNITE_CHANCE_PCT = 40;
const EG_HZ_METEOR_INTERVAL_MIN_MS = 7000;
const EG_HZ_METEOR_INTERVAL_MAX_MS = 11000;

const EG_HZ_VOLATILE_BASE_DMG_PCT = 9;     // % of playerMaxHP per detonation
const EG_HZ_VOLATILE_SPEED_MIN = 26;       // homing speed range (px/s)
const EG_HZ_VOLATILE_SPEED_MAX = 60;
const EG_HZ_VOLATILE_TRIGGER_R = 90;       // starts fusing when this close
const EG_HZ_VOLATILE_FUSE_MS = 1100;       // flashing fuse before detonation
const EG_HZ_VOLATILE_BLAST_R = 110;        // detonation radius (px)
const EG_HZ_VOLATILE_LIFETIME_MS = 16000;  // fuses anyway so it can't stall
const EG_HZ_VOLATILE_SHADOWBURN_CHANCE_PCT = 60;
const EG_HZ_VOLATILE_RESPAWN_MIN_MS = 4000;
const EG_HZ_VOLATILE_RESPAWN_MAX_MS = 8000;

const EG_HZ_FROSTNOVA_BASE_DMG_PCT = 7;    // % of playerMaxHP per nova hit
const EG_HZ_FROSTNOVA_EXPAND_MS = 1600;    // ring expansion duration
const EG_HZ_FROSTNOVA_MAX_R = 170;         // final ring radius (px)
const EG_HZ_FROSTNOVA_BAND = 26;           // damaging band thickness (px)
const EG_HZ_FROSTNOVA_FREEZE_CHANCE_PCT = 30;
const EG_HZ_FROSTNOVA_INTERVAL_MIN_MS = 6000;
const EG_HZ_FROSTNOVA_INTERVAL_MAX_MS = 10000;

const EG_HZ_FIREWALL_BASE_DMG_PCT = 18;    // % of playerMaxHP per wall hit — significant fire wave (was 8, too low)
const EG_HZ_FIREWALL_HEIGHT = 150;         // flame wave thickness (px)
const EG_HZ_FIREWALL_WARNING_MS = 5000;    // telegraph before ignition
const EG_HZ_FIREWALL_SWEEP_MS = 2600;      // sweep duration (direction depends on variant)
const EG_HZ_FIREWALL_IGNITE_CHANCE_PCT = 50;
const EG_HZ_FIREWALL_INTERVAL_MIN_MS = 8000;
const EG_HZ_FIREWALL_INTERVAL_MAX_MS = 12000;
// Outplay tuning — safe-zone insets and gap geometry for firewall variations
// Top safe-zone must clear the avatar HUD (wrapper at top:4px + ~150px tall incl.
// HP/charge bars).  Bottom safe-zone is less constrained so it stays smaller.
const EG_HZ_FIREWALL_SAFE_MIN = 90;        // legacy generic (kept for compat)
const EG_HZ_FIREWALL_SAFE_MAX = 160;
const EG_HZ_FIREWALL_TOP_SAFE_MIN = 185;   // offsetTop: safe strip at very top (px)
const EG_HZ_FIREWALL_TOP_SAFE_MAX = 260;
const EG_HZ_FIREWALL_BOTTOM_SAFE_MIN = 90; // offsetBottom: safe strip at very bottom (px)
const EG_HZ_FIREWALL_BOTTOM_SAFE_MAX = 165;
const EG_HZ_FIREWALL_GAP_MIN_W = 180;      // minimum gap width for gap variants (px)
const EG_HZ_FIREWALL_GAP_MAX_W = 280;      // maximum gap width (px)
const EG_HZ_FIREWALL_GAP_MARGIN = 70;      // keep gap at least this far from screen edges (px)

const EG_HZ_CYCLONE_BASE_DMG_PCT = 1.6;    // % of playerMaxHP per wind tick
const EG_HZ_CYCLONE_TICK_MS = 500;         // damage tick rate inside a cyclone
const EG_HZ_CYCLONE_R_MIN = 40;            // funnel radius range (px)
const EG_HZ_CYCLONE_R_MAX = 62;
const EG_HZ_CYCLONE_SPEED_MIN = 90;        // drift speed range (px/s)
const EG_HZ_CYCLONE_SPEED_MAX = 170;

const EG_HZ_DELIRIUM_INTERVAL_MIN_MS = 18000;
const EG_HZ_DELIRIUM_INTERVAL_MAX_MS = 26000;
const EG_HZ_DELIRIUM_FADE_IN_MS = 2500;
const EG_HZ_DELIRIUM_HOLD_MS = 4000;
const EG_HZ_DELIRIUM_FADE_OUT_MS = 2000;
const EG_HZ_DELIRIUM_POLYMORPH_CHANCE_PCT = 45;

const EG_HZ_LAYER_Z = 850;                // below player avatar (z:1000)


//------------------------------------------------------------------------
//-------------------RUNTIME STATE---------------------------------------
//------------------------------------------------------------------------

let _egHzActive = false;
let _egHzLayer = null;
let _egHzPausedForQuiz = false;

let _egHzLava = null;       // { pools: [{x,y,r,vx,vy,el,dmgAcc}], dmgMult }
let _egHzLightning = null;  // { pending: [{x,y,t,el}], nextIn }
let _egHzBlizzard = null;   // { icicles: [], spawnIn, maxIcicles }
let _egHzDarkness = null;   // { clouds: [] }
let _egHzArcane = null;     // { charge: null | {...}, beam: null | {...}, nextIn }
let _egHzMeteor = null;     // { pending: [{x,y,t,warnEl,state,el,y}], nextIn, intervalScale, dmgMult }
let _egHzVolatile = null;   // { wisps: [], respawnIn, maxWisps, dmgMult }
let _egHzFrostNova = null;  // { novas: [], nextIn, intervalScale, dmgMult }
let _egHzFirewall = null;   // { pending: [{t,y,dir,totalDist,endY,variant,gapX,gapW,wallEls,warningEls,hitDone}], nextIn, intervalScale, dmgMult }
let _egHzCyclone = null;    // { vortices: [{x,y,r,vx,vy,dmgAcc,el}], dmgMult }
let _egHzDelirium = null;   // { phase, nextIn, t, el, rolled }


//------------------------------------------------------------------------
//-------------------SMALL HELPERS---------------------------------------
//------------------------------------------------------------------------

function _egHzIntensity(familyId) {
    if (typeof _egGetActiveMapModValue !== 'function') return 0;
    return _egGetActiveMapModValue(familyId);
}

// Damage multiplier from the rolled intensity value (e.g. 60 → ×1.6).
function _egHzMult(intensity) {
    return 1 + Math.max(0, intensity) / 100;
}

// Map-tier scaling for elemental hazards: higher tiers deal significantly
// more hazard damage so hazards stay challenging in late endgame. Tier 1
// is 1.0×, each additional tier adds ~7% (T16 ≈ 2.05×).
function _egHzTierMult() {
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

function _egHzRand(min, max) {
    return min + Math.random() * (max - min);
}

function _egHzPlayerEl() {
    return document.getElementById('player-avatar-wrapper') ||
           document.getElementById('player-avatar-simple');
}

// Tight hitbox derived from the visible sprite image, not the wrapper.
// The wrapper (#player-avatar-wrapper 100px + HP/charge bars, or
// #player-avatar-simple 128px) is taller than the artwork, so using its
// center/bounds misaligns collision by ~30–40px and makes lava/volatile
// feel "off" while blizzard walls hit the bars.
function _egHzPlayerSpriteRect() {
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

function _egHzPlayerRect() {
    // Primary: tight box around the sprite image with insets for
    // transparent padding (cape/shoulders/feet). Fallback: wrapper rect
    // with top cropped where HP/charge bars live.
    let r = _egHzPlayerSpriteRect();
    let base = r;
    if (!base) {
        const el = _egHzPlayerEl();
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

// Alias used at call-sites for clarity — identical to _egHzPlayerRect().
function _egHzPlayerHitbox() {
    return _egHzPlayerRect();
}

// Bounding box of the puzzle grid INCLUDING row/col clue number cells —
// #ptable is one table containing both, so its rect already covers them.
function _egHzGridRect(pad) {
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

function _egHzRectsOverlap(a, b) {
    return !!a && !!b &&
        a.left < b.right && a.right > b.left &&
        a.top < b.bottom && a.bottom > b.top;
}

function _egHzCircleRectOverlap(x, y, r, rect) {
    if (!rect) return false;
    const cx = Math.max(rect.left, Math.min(x, rect.right));
    const cy = Math.max(rect.top, Math.min(y, rect.bottom));
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy <= r * r;
}

// Shared hazard hit resolution: use the same overlap rule for every circular
// impact and apply the ailment only when the hit actually dealt damage.
function _egHzApplyCircleHit(x, y, radius, pr, damagePct, element, color, ailment, ailmentDps) {
    if (!pr || !_egHzCircleRectOverlap(x, y, radius, pr)) return false;
    const dealt = _egHzDamage(damagePct, element, color);
    if (dealt > 0 && ailment && typeof _egApplyPlayerAilment === 'function') {
        _egApplyPlayerAilment(ailment, ailmentDps);
    }
    return true;
}

function _egHzRectInsideCircle(rect, cx, cy, r) {
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

function _egHzRingRectOverlap(x, y, radius, band, rect) {
    if (!rect) return false;
    const outer = radius + band;
    if (!_egHzCircleRectOverlap(x, y, outer, rect)) return false;
    const inner = Math.max(0, radius - band);
    if (inner <= 0) return true;
    // If rect is fully inside the hole, no hit.
    if (_egHzRectInsideCircle(rect, x, y, inner)) return false;
    // Otherwise outer hits but not fully inside hole => band overlaps rect.
    // For thin bands, also accept case where rect straddles inner edge
    // even if outer check passed but inner disc still overlaps.
    return true;
}

function _egHzSweptCircleRectOverlap(x0, y0, x1, y1, r, rect) {
    if (!rect) return false;
    if (_egHzCircleRectOverlap(x0, y0, r, rect)) return true;
    if (_egHzCircleRectOverlap(x1, y1, r, rect)) return true;
    // Sample midpoint and check expanded rect fallback — cheap 3-point
    // check catches most tunneling without segment math.
    const mx = (x0 + x1) * 0.5, my = (y0 + y1) * 0.5;
    if (_egHzCircleRectOverlap(mx, my, r, rect)) return true;
    // For long sweeps (icicles 140px, arcane 240px per 100ms tick)
    // also test bounding box of the sweep expanded by radius.
    if (Math.hypot(x1 - x0, y1 - y0) > r) {
        const sx0 = Math.min(x0, x1) - r, sx1 = Math.max(x0, x1) + r;
        const sy0 = Math.min(y0, y1) - r, sy1 = Math.max(y0, y1) + r;
        const sweep = { left: sx0, right: sx1, top: sy0, bottom: sy1 };
        if (_egHzRectsOverlap(sweep, rect)) {
            // Sweep box overlaps — do denser sampling along segment
            for (let t = 0.25; t < 1; t += 0.25) {
                const sx = x0 + (x1 - x0) * t;
                const sy = y0 + (y1 - y0) * t;
                if (_egHzCircleRectOverlap(sx, sy, r, rect)) return true;
            }
        }
    }
    return false;
}

// Samples a random viewport point that lies OUTSIDE the puzzle-grid rect
// (inflated by `pad`). Falls back to any viewport point after 40 tries.
function _egHzPointOutsideGrid(pad) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const grid = _egHzGridRect(pad || 0);
    for (let i = 0; i < 40; i++) {
        const x = _egHzRand(30, vw - 30);
        const y = _egHzRand(30, vh - 30);
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
function _egHzDamage(pctOfMaxHP, element, colorHex) {
    if (!_egIsActive()) return 0;
    const maxHP = (typeof playerMaxHP !== 'undefined' && playerMaxHP > 0) ? playerMaxHP : 100;
    const tierMult = _egHzTierMult();
    const amount = Math.max(1, Math.round(maxHP * pctOfMaxHP * tierMult / 100));
    const dealt = _egPlayerTakeDamage(amount, true, element);
    _egHzShowHitText(dealt, colorHex);
    return dealt;
}

// Small floating damage label on the player avatar.
function _egHzShowHitText(amount, colorHex) {
    if (!(amount > 0)) return;
    const hud = document.getElementById('player-avatar-wrapper');
    if (!hud) return;
    const label = document.createElement('div');
    label.className = 'eg-hz-hit-text';
    label.style.color = colorHex || '#ff6b4a';
    label.textContent = '-' + amount;
    hud.appendChild(label);
    setTimeout(() => label.remove(), 900);
}


//------------------------------------------------------------------------
//-------------------LIFECYCLE-------------------------------------------
//------------------------------------------------------------------------

// Starts all hazards present on the active map. Called from
// _egResetEncounterState when an encounter begins.
function _egHazardsReset() {
    _egHazardsCleanup();
    if (!_egIsActive()) return;

    const lavaI = _egHzIntensity('map_hazard_lava');
    const lightningI = _egHzIntensity('map_hazard_lightning');
    const blizzardI = _egHzIntensity('map_hazard_blizzard');
    const darknessI = _egHzIntensity('map_hazard_darkness');
    const arcaneI = _egHzIntensity('map_hazard_arcane');
    const meteorI = _egHzIntensity('map_hazard_meteor');
    const volatileI = _egHzIntensity('map_hazard_volatile');
    const frostNovaI = _egHzIntensity('map_hazard_frostnova');
    const firewallI = _egHzIntensity('map_hazard_firewall');
    const cycloneI = _egHzIntensity('map_hazard_cyclone');
    const deliriumI = _egHzIntensity('map_hazard_delirium');

    const active = [];
    if (lavaI > 0) active.push('🌋');
    if (lightningI > 0) active.push('⚡');
    if (blizzardI > 0) active.push('❄️');
    if (darknessI > 0) active.push('🌑');
    if (arcaneI > 0) active.push('🔮');
    if (meteorI > 0) active.push('☄️');
    if (volatileI > 0) active.push('👻');
    if (frostNovaI > 0) active.push('🧊');
    if (firewallI > 0) active.push('🔥');
    if (cycloneI > 0) active.push('🌪️');
    if (deliriumI > 0) active.push('🌫️');
    if (active.length === 0) return;

    _egHzLayer = document.createElement('div');
    _egHzLayer.id = 'eg-hazards-layer';
    _egHzLayer.style.zIndex = String(EG_HZ_LAYER_Z);
    document.body.appendChild(_egHzLayer);

    if (lavaI > 0) _egHzInitLava(lavaI);
    if (lightningI > 0) _egHzInitLightning(lightningI);
    if (blizzardI > 0) _egHzInitBlizzard(blizzardI);
    if (darknessI > 0) _egHzInitDarkness(darknessI);
    if (arcaneI > 0) _egHzInitArcane(arcaneI);
    if (meteorI > 0) _egHzInitMeteor(meteorI);
    if (volatileI > 0) _egHzInitVolatile(volatileI);
    if (frostNovaI > 0) _egHzInitFrostNova(frostNovaI);
    if (firewallI > 0) _egHzInitFirewall(firewallI);
    if (cycloneI > 0) _egHzInitCyclone(cycloneI);
    if (deliriumI > 0) _egHzInitDelirium(deliriumI);

    _egHzActive = true;
    _egHzPausedForQuiz = false;
    if (_egHzLayer) _egHzLayer.style.display = '';
    showToast(`☠️ Elemental Hazards active: ${active.join(' ')}`);
}

// Tears down every hazard DOM node and state. Safe to call anytime.
function _egHazardsCleanup() {
    _egHzActive = false;
    _egHzPausedForQuiz = false;
    _egHzLava = null;
    _egHzLightning = null;
    _egHzBlizzard = null;
    _egHzDarkness = null;
    _egHzArcane = null;
    _egHzMeteor = null;
    _egHzVolatile = null;
    _egHzFrostNova = null;
    _egHzFirewall = null;
    _egHzCyclone = null;
    _egHzDelirium = null;
    if (_egHzLayer) {
        _egHzLayer.remove();
        _egHzLayer = null;
    }
    // Darkness clouds live outside the main layer (higher z-index).
    document.querySelectorAll('.eg-hz-darkness-layer').forEach(el => el.remove());
    // Delirium mist likewise covers the whole screen from body level.
    document.querySelectorAll('.eg-hz-delirium').forEach(el => el.remove());
}

// Hides all hazard visuals and pauses hazard ticks while a quiz modal
// is visible so the question remains readable and the player is not
// damaged by invisible hazards.
function _egHazardsHideForQuiz() {
    if (!_egHzActive || _egHzPausedForQuiz) return;
    _egHzPausedForQuiz = true;
    if (_egHzLayer) _egHzLayer.style.display = 'none';
    document.querySelectorAll('.eg-hz-darkness-layer, .eg-hz-delirium').forEach(el => { el.style.display = 'none'; });
}

// Re-shows hazard visuals and resumes ticking when the next puzzle launches
// (or after a standalone interstitial question is dismissed).
function _egHazardsShowAfterQuiz() {
    if (!_egHzPausedForQuiz) return;
    _egHzPausedForQuiz = false;
    if (_egHzLayer) _egHzLayer.style.display = '';
    document.querySelectorAll('.eg-hz-darkness-layer, .eg-hz-delirium').forEach(el => { el.style.display = ''; });
}

// Per-tick driver — called at 10Hz from _egTickLoop.
function _egHazardsTick() {
    if (!_egHzActive) return;
    if (_egHzPausedForQuiz) return;
    if (typeof dead !== 'undefined' && dead) return;
    const dtMs = 100;

    if (_egHzLava) _egHzTickLava(dtMs);
    if (_egHzLightning) _egHzTickLightning(dtMs);
    if (_egHzBlizzard) _egHzTickBlizzard(dtMs);
    if (_egHzDarkness) _egHzTickDarkness(dtMs);
    if (_egHzArcane) _egHzTickArcane(dtMs);
    if (_egHzMeteor) _egHzTickMeteor(dtMs);
    if (_egHzVolatile) _egHzTickVolatile(dtMs);
    if (_egHzFrostNova) _egHzTickFrostNova(dtMs);
    if (_egHzFirewall) _egHzTickFirewall(dtMs);
    if (_egHzCyclone) _egHzTickCyclone(dtMs);
    if (_egHzDelirium) _egHzTickDelirium(dtMs);
}


//------------------------------------------------------------------------
//-------------------LAVA BALLS-------------------------------------------
//------------------------------------------------------------------------

function _egHzCreateLavaPool() {
    const r = _egHzRand(EG_HZ_LAVA_MIN_R, EG_HZ_LAVA_MAX_R);
    const pos = _egHzPointOutsideGrid(r + 24);
    const speed = _egHzRand(EG_HZ_LAVA_SPEED_MIN, EG_HZ_LAVA_SPEED_MAX);
    const angle = Math.random() * Math.PI * 2;
    const el = document.createElement('div');
    el.className = 'eg-hz-lava';
    const size = r * 2;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.animationDelay = (-Math.random() * 3) + 's';
    if (_egHzLayer) _egHzLayer.appendChild(el);
    el.style.transform = `translate(${Math.round(pos.x - r)}px, ${Math.round(pos.y - r)}px)`;
    return {
        x: pos.x, y: pos.y, r,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        el,
        state: 'active', // 'active' | 'fusing' | 'respawning'
        fuseT: 0,
        respawnIn: 0,
    };
}

function _egHzTriggerLavaFuse(pool) {
    if (!pool || pool.state !== 'active') return;
    pool.state = 'fusing';
    pool.fuseT = EG_HZ_LAVA_FUSE_MS;
    if (pool.el) pool.el.classList.add('eg-hz-lava-fuse');
}

function _egHzDetonateLava(pool) {
    if (!pool) return;
    const bx = pool.x;
    const by = pool.y;
    const br = pool.r;
    // Visual explosion: remove the lava ball element and spawn a dedicated blast copy
    // at the exact world position (left/top based) so the scale animation does not
    // fight the translate() used for drift positioning.
    if (pool.el) {
        try { pool.el.remove(); } catch (e) {}
        pool.el = null;
    }
    if (_egHzLayer) {
        // Fiery core that puffs up and fades
        const boom = document.createElement('div');
        boom.className = 'eg-hz-lava eg-hz-lava-blast';
        const size = br * 2;
        boom.style.width = size + 'px';
        boom.style.height = size + 'px';
        boom.style.left = (bx - br) + 'px';
        boom.style.top = (by - br) + 'px';
        // blast elements are positioned via left/top, not translate()
        boom.style.transform = 'none';
        _egHzLayer.appendChild(boom);
        setTimeout(() => boom.remove(), 500);

        // Expanding ring so the 140 px blast radius is readable
        const ring = document.createElement('div');
        ring.className = 'eg-hz-lava-explosion';
        const d = EG_HZ_LAVA_BLAST_R * 2;
        ring.style.width = d + 'px';
        ring.style.height = d + 'px';
        ring.style.left = (bx - EG_HZ_LAVA_BLAST_R) + 'px';
        ring.style.top = (by - EG_HZ_LAVA_BLAST_R) + 'px';
        _egHzLayer.appendChild(ring);
        setTimeout(() => ring.remove(), 550);
    }

    // Heavy fire damage if the player is still inside the blast radius at detonation time
    // Uses tight hitbox vs blast disc so footing/edges respect the sprite.
    const pr = _egHzPlayerHitbox();
    if (_egHzApplyCircleHit(bx, by, EG_HZ_LAVA_BLAST_R, pr,
        EG_HZ_LAVA_EXPLOSION_BASE_DMG_PCT * _egHzLava.dmgMult,
        'fire', '#ff6b4a',
        Math.random() * 100 < EG_HZ_LAVA_IGNITE_CHANCE_PCT ? 'ignite' : null,
        Math.max(EG_AIL_MIN_DOT_DAMAGE, (playerMaxHP || 100) * EG_AIL_IGNITE_DMG_SHARE / 100))) {
        // Damage and ailment application are handled consistently above.
    }

    // Despawn for 3 minutes (gameplay time)
    pool.state = 'respawning';
    pool.respawnIn = EG_HZ_LAVA_RESPAWN_MS;
    pool.fuseT = 0;
}

function _egHzRespawnLavaPool(pool) {
    const fresh = _egHzCreateLavaPool();
    // Reuse the same object identity so the pools array stays stable
    pool.x = fresh.x; pool.y = fresh.y; pool.r = fresh.r;
    pool.vx = fresh.vx; pool.vy = fresh.vy;
    // fresh already appended its element; steal it
    pool.el = fresh.el;
    // fresh's element is already in the DOM — no extra append needed
    pool.state = 'active';
    pool.fuseT = 0;
    pool.respawnIn = 0;
    // Ensure blast/fuse classes are clean (fresh element is clean by construction)
}

function _egHzInitLava(intensity) {
    // ~8 balls at low intensity (tier 3), scaling up to a cap of 14 at high
    // intensity (tier 1):  25 → 7 | 45 → 8 | 50 → 9 | 75 → 10 | 80 → 11 | 100 → 12
    const count = Math.min(14, 5 + Math.round(intensity / 16));
    const pools = [];
    for (let i = 0; i < count; i++) {
        pools.push(_egHzCreateLavaPool());
    }
    _egHzLava = { pools, dmgMult: _egHzMult(intensity), intensity };
}

function _egHzTickLava(dtMs) {
    const dtS = dtMs / 1000;
    const grid = _egHzGridRect(10);
    const pr = _egHzPlayerHitbox();

    _egHzLava.pools.forEach(p => {
        // ── Respawning (despawned) ──────────────────────────────────
        if (p.state === 'respawning') {
            p.respawnIn -= dtMs;
            if (p.respawnIn <= 0) {
                _egHzRespawnLavaPool(p);
            }
            return;
        }

        // ── Fusing (about to explode) — frozen in place ─────────────
        if (p.state === 'fusing') {
            p.fuseT -= dtMs;
            if (p.fuseT <= 0) _egHzDetonateLava(p);
            return;
        }

        // ── Active: slow drift + collision detection ────────────────
        if (!p.el || !p.el.isConnected) return;

        // Slow drift; bounce off viewport edges and steer around the grid.
        let nx = p.x + p.vx * dtS;
        let ny = p.y + p.vy * dtS;
        const half = p.r;
        if (_egHzCircleRectOverlap(nx, ny, half * 0.7, grid)) {
            // Reflect away from the grid without entering it.
            if (nx > grid.left - half && nx < grid.right + half) p.vx *= -1;
            if (ny > grid.top - half && ny < grid.bottom + half) p.vy *= -1;
            nx = p.x; ny = p.y;
        }
        if (nx < half || nx > window.innerWidth - half) { p.vx *= -1; nx = p.x; }
        if (ny < half || ny > window.innerHeight - half) { p.vy *= -1; ny = p.y; }
        p.x = nx; p.y = ny;
        p.el.style.transform = `translate(${Math.round(p.x - p.r)}px, ${Math.round(p.y - p.r)}px)`;

        // Collision → start 0.5 s fuse, then heavy fire explosion
        // Tight sprite hitbox vs lava disc (r * 0.88 keeps leniency for shoulders)
        if (pr && _egHzCircleRectOverlap(p.x, p.y, p.r * 0.88, pr)) {
            _egHzTriggerLavaFuse(p);
        }
    });
}


//------------------------------------------------------------------------
//-------------------LIGHTNING STORM--------------------------------------
//------------------------------------------------------------------------

function _egHzInitLightning(intensity) {
    _egHzLightning = {
        pending: [],
        nextIn: _egHzRand(2500, 5000),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzTickLightning(dtMs) {
    const st = _egHzLightning;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        st.nextIn = _egHzRand(
            EG_HZ_LIGHTNING_INTERVAL_MIN_MS,
            EG_HZ_LIGHTNING_INTERVAL_MAX_MS
        ) * st.intervalScale;

        const pos = _egHzPointOutsideGrid(EG_HZ_LIGHTNING_RADIUS * 0.6);
        const el = document.createElement('div');
        el.className = 'eg-hz-lightning-warning';
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
        _egHzLayer.appendChild(el);
        st.pending.push({ x: pos.x, y: pos.y, t: EG_HZ_LIGHTNING_WARNING_MS, el });
    }

    for (let i = st.pending.length - 1; i >= 0; i--) {
        const strike = st.pending[i];
        if (!strike.el.isConnected) { st.pending.splice(i, 1); continue; }

        strike.t -= dtMs;
        if (strike.t > 0) continue;

        // Impact: bolt flash, then remove the warning ring.
        strike.el.classList.add('eg-hz-lightning-bolt');
        const warnEl = strike.el;
        setTimeout(() => warnEl.remove(), 350);
        st.pending.splice(i, 1);

        const pr = _egHzPlayerHitbox();
        _egHzApplyCircleHit(strike.x, strike.y, EG_HZ_LIGHTNING_RADIUS, pr,
            EG_HZ_LIGHTNING_BASE_DMG_PCT * st.dmgMult, 'lightning', '#ffe66b', 'shocked');
    }
}


//------------------------------------------------------------------------
//-------------------BLIZZARD---------------------------------------------
//------------------------------------------------------------------------

function _egHzInitBlizzard(intensity) {
    // Full-screen snow layer (visual only — never blocks clicks).
    const overlay = document.createElement('div');
    overlay.className = 'eg-hz-blizzard';
    const flakes = 26;
    for (let i = 0; i < flakes; i++) {
        const flake = document.createElement('span');
        flake.className = 'eg-hz-snowflake';
        flake.textContent = '❄';
        flake.style.left = _egHzRand(0, 100) + '%';
        flake.style.fontSize = _egHzRand(8, 18) + 'px';
        flake.style.opacity = _egHzRand(0.35, 0.85).toFixed(2);
        flake.style.animationDuration = _egHzRand(5, 11) + 's';
        flake.style.animationDelay = (-_egHzRand(0, 10)) + 's';
        overlay.appendChild(flake);
    }
    _egHzLayer.appendChild(overlay);

    const maxIcicles = Math.min(6, 3 + Math.round(intensity / 40));
    _egHzBlizzard = {
        overlay,
        icicles: [],
        spawnIn: _egHzRand(1500, 3000),
        maxIcicles,
        spawnScale: 1 - Math.min(0.5, intensity / 200),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzSpawnIcicle() {
    const w = _egHzRand(28, 44);
    const h = _egHzRand(60, 115);
    const x = _egHzRand(20, window.innerWidth - w - 20);
    const el = document.createElement('div');
    el.className = 'eg-hz-icicle eg-hz-icicle-hang';
    el.style.left = x + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    _egHzLayer.appendChild(el);
    return {
        x, w, h, el,
        state: 'hang',
        t: _egHzRand(3500, 9000),
        y: 0,
        hitDone: false,
    };
}

function _egHzTickBlizzard(dtMs) {
    const st = _egHzBlizzard;

    st.spawnIn -= dtMs;
    if (st.spawnIn <= 0) {
        st.spawnIn = _egHzRand(EG_HZ_ICICLE_SPAWN_MIN_MS, EG_HZ_ICICLE_SPAWN_MAX_MS)
            * st.spawnScale;
        if (st.icicles.length < st.maxIcicles) st.icicles.push(_egHzSpawnIcicle());
    }

    const dtS = dtMs / 1000;
    const pr = _egHzPlayerHitbox();

    for (let i = st.icicles.length - 1; i >= 0; i--) {
        const ic = st.icicles[i];
        if (!ic.el.isConnected) { st.icicles.splice(i, 1); continue; }

        if (ic.state === 'hang') {
            ic.t -= dtMs;
            if (ic.t <= 0) {
                ic.state = 'shake';
                ic.t = EG_HZ_ICICLE_SHAKE_MS;
                ic.el.classList.remove('eg-hz-icicle-hang');
                ic.el.classList.add('eg-hz-icicle-shake');
            }
        } else if (ic.state === 'shake') {
            ic.t -= dtMs;
            if (ic.t <= 0) {
                ic.state = 'fall';
                ic.el.classList.remove('eg-hz-icicle-shake');
                ic.el.classList.add('eg-hz-icicle-fall');
            }
        } else {
            const prevY = ic.y;
            ic.y += EG_HZ_ICICLE_FALL_SPEED * dtS;
            ic.el.style.transform = `translateY(${Math.round(ic.y)}px)`;

            if (pr && !ic.hitDone) {
                // Swept rect so 140px/tick tunneling can't skip the sprite
                const swept = {
                    left: ic.x, right: ic.x + ic.w,
                    top: Math.min(prevY, ic.y), bottom: Math.max(prevY + ic.h, ic.y + ic.h),
                };
                if (_egHzRectsOverlap(swept, pr)) {
                    ic.hitDone = true;
                    const dealt = _egHzDamage(
                        EG_HZ_ICICLE_BASE_DMG_PCT * st.dmgMult, 'cold', '#8fd8ff'
                    );
                    if (dealt > 0 && typeof _egApplyPlayerAilment === 'function') {
                        _egApplyPlayerAilment('chill');
                    }
                }
            }

            if (ic.y > window.innerHeight + ic.h) {
                ic.el.remove();
                st.icicles.splice(i, 1);
            }
        }
    }
}


//------------------------------------------------------------------------
//-------------------DARKNESS CLOUDS--------------------------------------
//------------------------------------------------------------------------

function _egHzInitDarkness(intensity) {
    // Shadow Resistance thins the clouds (min opacity floor keeps them fair).
    let shadowResist = 0;
    try {
        shadowResist = Math.max(0, _egComputePlayerStats().shadowResist || 0);
    } catch (e) { /* stats unavailable → ignore */ }
    const opacity = Math.max(0.55,
        Math.min(0.95, 0.7 + intensity * 0.004 - (shadowResist / 100) * 0.15));

    const count = Math.min(5, 2 + Math.round(intensity / 33));

    // Own layer above the player HUD so clouds genuinely obscure the screen.
    const darkLayer = document.createElement('div');
    darkLayer.className = 'eg-hz-darkness-layer';

    const clouds = [];
    for (let i = 0; i < count; i++) {
        const scale = _egHzRand(0.8, 1.5);
        const el = document.createElement('div');
        el.className = 'eg-hz-cloud';
        el.style.opacity = opacity.toFixed(2);
        el.style.setProperty('--hz-cloud-scale', scale.toFixed(2));
        darkLayer.appendChild(el);
        const cloud = {
            x: _egHzRand(-100, window.innerWidth),
            y: _egHzRand(0, Math.max(1, window.innerHeight - 160)),
            vx: (i % 2 === 0 ? 1 : -1) * _egHzRand(6, 14), // gentle drift
            el,
        };
        // Place immediately so clouds never flash at the top-left corner
        // before the first tick positions them.
        el.style.transform =
            `translate(${Math.round(cloud.x)}px, ${Math.round(cloud.y)}px) scale(var(--hz-cloud-scale, 1))`;
        clouds.push(cloud);
    }
    document.body.appendChild(darkLayer);
    _egHzDarkness = { clouds, layer: darkLayer, blinded: false };
}

function _egHzTickDarkness(dtMs) {
    const dtS = dtMs / 1000;
    const vw = window.innerWidth;
    const pr = _egHzPlayerHitbox();
    _egHzDarkness.clouds.forEach(c => {
        c.x += c.vx * dtS;
        // Wrap around the screen edges so clouds keep circulating slowly.
        if (c.vx > 0 && c.x > vw + 120) c.x = -260;
        if (c.vx < 0 && c.x < -260) c.x = vw + 120;
        c.el.style.transform =
            `translate(${Math.round(c.x)}px, ${Math.round(c.y)}px) scale(var(--hz-cloud-scale, 1))`;
    });

    // A cloud's visual box is the same collision shape used for gameplay.
    // Test the sprite hitbox against every cloud so standing in any part of a
    // cloud reliably applies the blindness effect to player attacks.
    if (pr) {
        _egHzDarkness.blinded = _egHzDarkness.clouds.some(c => {
            const scale = Number(c.el.style.getPropertyValue('--hz-cloud-scale')) || 1;
            const cloudRect = {
                left: c.x,
                top: c.y,
                right: c.x + 260 * scale,
                bottom: c.y + 110 * scale,
            };
            return _egHzRectsOverlap(pr, cloudRect);
        });
    } else {
        _egHzDarkness.blinded = false;
    }
}

function _egIsPlayerInDarknessCloud() {
    return !!(_egHzActive && _egHzDarkness && _egHzDarkness.blinded);
}


//------------------------------------------------------------------------
//-------------------ARCANE STORM-----------------------------------------
//------------------------------------------------------------------------

function _egHzInitArcane(intensity) {
    _egHzArcane = {
        charge: null,
        beam: null,
        nextIn: _egHzRand(4000, 7000),
        intervalScale: 1 - Math.min(0.4, intensity / 250),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzStartArcaneCharge() {
    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        Audio_Manager.playSFX('hazard_spawn');
    }
    const y = _egHzRand(120, Math.max(140, window.innerHeight - 180));
    const chargeMs = _egHzRand(EG_HZ_ARCANE_CHARGE_MIN_MS, EG_HZ_ARCANE_CHARGE_MAX_MS);
    const size = 46;

    const orb = document.createElement('div');
    orb.className = 'eg-hz-arcane-orb';
    orb.style.transition = `width ${chargeMs}ms linear, height ${chargeMs}ms linear`;
    orb.style.top = y + 'px';
    _egHzLayer.appendChild(orb);
    // Start small, then grow to full charge size over the charge duration.
    requestAnimationFrame(() => {
        orb.style.width = '90px';
        orb.style.height = '90px';
    });

    _egHzArcane.charge = { y, t: chargeMs, total: chargeMs, orb, size };
}

function _egHzTickArcane(dtMs) {
    const st = _egHzArcane;

    // ── Charging phase ────────────────────────────────────────────────
    if (st.charge) {
        st.charge.t -= dtMs;
        if (st.charge.t <= 0) _egHzFireArcaneBeam();
    } else {
        st.nextIn -= dtMs;
        if (st.nextIn <= 0) {
            st.nextIn = _egHzRand(
                EG_HZ_ARCANE_INTERVAL_MIN_MS, EG_HZ_ARCANE_INTERVAL_MAX_MS
            ) * st.intervalScale;
            _egHzStartArcaneCharge();
        }
    }

    // ── Beam sweep phase ──────────────────────────────────────────────
    if (st.beam) {
        const b = st.beam;
        const prevX = b.x;
        b.x -= b.speed * (dtMs / 1000);
        b.el.style.transform = `translateX(${Math.round(b.x)}px)`;

        const pr = _egHzPlayerHitbox();
        if (pr && !b.hitDone) {
            // Swept horizontal interval so 240px/tick doesn't tunnel over 70px hitbox
            const sweptLeft = Math.min(b.x, prevX);
            const sweptRight = Math.max(b.x + b.w, prevX + b.w);
            if (sweptRight >= pr.left && sweptLeft <= pr.right) {
                const bandTop = b.y - EG_HZ_ARCANE_BEAM_HEIGHT / 2;
                const bandBottom = b.y + EG_HZ_ARCANE_BEAM_HEIGHT / 2;
                if (pr.bottom > bandTop && pr.top < bandBottom) {
                    b.hitDone = true;
                    const dealt = _egHzDamage(
                        EG_HZ_ARCANE_BASE_DMG_PCT * st.dmgMult, 'arcane', '#c77dff'
                    );
                    if (dealt > 0 && typeof _egApplyPlayerAilment === 'function'
                        && Math.random() * 100 < EG_HZ_ARCANE_POLYMORPH_CHANCE_PCT) {
                        _egApplyPlayerAilment('polymorph');
                    }
                }
            }
        }

        if (b.x + b.w < -40) {
            b.el.remove();
            st.beam = null;
        }
    }
}

function _egHzFireArcaneBeam() {
    const st = _egHzArcane;
    if (!st.charge) return;
    const y = st.charge.y;
    if (st.charge.orb) st.charge.orb.remove();
    st.charge = null;

    const w = window.innerWidth + 80;
    const el = document.createElement('div');
    el.className = 'eg-hz-arcane-beam';
    el.style.width = w + 'px';
    el.style.height = EG_HZ_ARCANE_BEAM_HEIGHT + 'px';
    el.style.top = (y - EG_HZ_ARCANE_BEAM_HEIGHT / 2) + 'px';
    _egHzLayer.appendChild(el);

    st.beam = {
        el, w, y,
        x: window.innerWidth - 20,
        speed: (window.innerWidth + 100) / (EG_HZ_ARCANE_BEAM_TRAVEL_MS / 1000),
        hitDone: false,
    };
}


//------------------------------------------------------------------------
//-------------------METEOR BARRAGE---------------------------------------
//------------------------------------------------------------------------
// PoE-style meteor volleys: every interval a salvo of meteors telegraphs
// impact circles, then slams down from above. Fire damage, may ignite.

function _egHzInitMeteor(intensity) {
    _egHzMeteor = {
        pending: [],
        nextIn: _egHzRand(3000, 6000),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzSpawnMeteor(delayMs) {
    if (typeof Audio_Manager !== 'undefined' && Audio_Manager.playSFX) {
        Audio_Manager.playSFX('hazard_spawn');
    }
    const pos = _egHzPointOutsideGrid(EG_HZ_METEOR_RADIUS * 0.6);
    const el = document.createElement('div');
    el.className = 'eg-hz-meteor-warning';
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    _egHzLayer.appendChild(el);
    _egHzMeteor.pending.push({
        x: pos.x, ty: pos.y,
        t: EG_HZ_METEOR_WARNING_MS + delayMs,
        warnEl: el,
        state: 'warn',
        fallEl: null,
        fallDist: 0,
        y: 0,
    });
}

function _egHzTickMeteor(dtMs) {
    const st = _egHzMeteor;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        st.nextIn = _egHzRand(
            EG_HZ_METEOR_INTERVAL_MIN_MS,
            EG_HZ_METEOR_INTERVAL_MAX_MS
        ) * st.intervalScale;

        // One salvo: several meteors with slightly staggered impacts.
        const count = EG_HZ_METEOR_VOLLEY_MIN +
            Math.floor(Math.random() * (EG_HZ_METEOR_VOLLEY_MAX - EG_HZ_METEOR_VOLLEY_MIN + 1));
        for (let i = 0; i < count; i++) _egHzSpawnMeteor(i * 160);
    }

    const dtS = dtMs / 1000;
    const pr = _egHzPlayerHitbox();

    for (let i = st.pending.length - 1; i >= 0; i--) {
        const m = st.pending[i];

        if (m.state === 'warn') {
            if (!m.warnEl.isConnected) { st.pending.splice(i, 1); continue; }
            m.t -= dtMs;
            if (m.t <= 0) {
                m.state = 'fall';
                // Start well above the screen, fall down onto the telegraph.
                m.fallDist = window.innerHeight * 0.6;
                m.y = m.ty - m.fallDist;
                const size = 46;
                const fallEl = document.createElement('div');
                fallEl.className = 'eg-hz-meteor-fall';
                fallEl.style.width = size + 'px';
                fallEl.style.height = size + 'px';
                fallEl.style.left = (m.x - size / 2) + 'px';
                fallEl.style.top = (m.y - size / 2) + 'px';
                _egHzLayer.appendChild(fallEl);
                m.fallEl = fallEl;
            }
        } else {
            // Falling phase — descend towards the target, then detonate.
            if (!m.fallEl || !m.fallEl.isConnected) { st.pending.splice(i, 1); continue; }
            m.y += (m.fallDist / (EG_HZ_METEOR_FALL_MS / 1000)) * dtS;
            m.fallEl.style.top = (m.y - 23) + 'px';

            if (m.y >= m.ty) {
                // Impact: flash ring, remove warning + meteor.
                m.fallEl.remove();
                if (m.warnEl && m.warnEl.isConnected) {
                    m.warnEl.classList.add('eg-hz-meteor-impact');
                    const impactEl = m.warnEl;
                    setTimeout(() => impactEl.remove(), 350);
                }
                st.pending.splice(i, 1);

                _egHzApplyCircleHit(m.x, m.y, EG_HZ_METEOR_RADIUS, pr,
                    EG_HZ_METEOR_BASE_DMG_PCT * st.dmgMult, 'fire', '#ff8c42',
                    Math.random() * 100 < EG_HZ_METEOR_IGNITE_CHANCE_PCT ? 'ignite' : null);
            }
        }
    }
}


//------------------------------------------------------------------------
//-------------------VOLATILE WISPS---------------------------------------
//------------------------------------------------------------------------
// PoE-style Volatiles: unstable wisps spawn off-screen-ish and slowly home
// in on the player. When close (or after a lifetime) they flash briefly,
// then detonate — shadow damage in a blast radius, may inflict Shadow Burn.

function _egHzInitVolatile(intensity) {
    const maxWisps = Math.min(6, 1 + Math.round(intensity / 22));
    _egHzVolatile = {
        wisps: [],
        respawnIn: 0,
        maxWisps,
        speedScale: Math.max(0.65, 1 - intensity / 300),
        dmgMult: _egHzMult(intensity),
    };
    // Stagger the initial wave so wisps don't all arrive simultaneously.
    for (let i = 0; i < maxWisps; i++) {
        const wisp = {
            x: -200, y: -200,
            speed: _egHzRand(EG_HZ_VOLATILE_SPEED_MIN, EG_HZ_VOLATILE_SPEED_MAX),
            state: 'delay',
            t: 800 + i * _egHzRand(1500, 3500),
            life: EG_HZ_VOLATILE_LIFETIME_MS,
            el: null,
        };
        wisp.speed /= _egHzVolatile.speedScale;
        _egHzVolatile.wisps.push(wisp);
    }
}

function _egHzActivateVolatileWisp(wisp) {
    const pos = _egHzPointOutsideGrid(40);
    wisp.x = pos.x;
    wisp.y = pos.y;
    wisp.life = EG_HZ_VOLATILE_LIFETIME_MS;
    wisp.state = 'hunt';
    const el = document.createElement('div');
    el.className = 'eg-hz-volatile';
    _egHzLayer.appendChild(el);
    wisp.el = el;
}

function _egHzDetonateVolatile(wisp) {
    const st = _egHzVolatile;
    wisp.state = 'dead';
    if (wisp.el) {
        wisp.el.classList.add('eg-hz-volatile-blast');
        const el = wisp.el;
        setTimeout(() => el.remove(), 400);
        wisp.el = null;
    }

    const pr = _egHzPlayerHitbox();
    _egHzApplyCircleHit(wisp.x, wisp.y, EG_HZ_VOLATILE_BLAST_R, pr,
        EG_HZ_VOLATILE_BASE_DMG_PCT * st.dmgMult, 'shadow', '#b39ddb',
        Math.random() * 100 < EG_HZ_VOLATILE_SHADOWBURN_CHANCE_PCT ? 'shadowburn' : null);

    // Queue a replacement so the pressure never runs dry.
    if (!(st.respawnIn > 0)) {
        st.respawnIn = _egHzRand(
            EG_HZ_VOLATILE_RESPAWN_MIN_MS, EG_HZ_VOLATILE_RESPAWN_MAX_MS);
    }
}

function _egHzTickVolatile(dtMs) {
    const st = _egHzVolatile;
    const dtS = dtMs / 1000;
    const pr = _egHzPlayerHitbox();

    // Respawn timer for detonated wisps.
    if (st.respawnIn > 0) {
        st.respawnIn -= dtMs;
        if (st.respawnIn <= 0) {
            st.respawnIn = 0;
            const idle = st.wisps.find(w => w.state === 'dead');
            if (idle) _egHzActivateVolatileWisp(idle);
            else st.respawnIn = _egHzRand(1000, 2500);
        }
    }

    st.wisps.forEach(w => {
        if (w.state === 'dead') return;

        if (w.state === 'delay') {
            w.t -= dtMs;
            if (w.t <= 0) _egHzActivateVolatileWisp(w);
            return;
        }

        if (!w.el || !w.el.isConnected) { w.state = 'dead'; return; }

        if (w.state === 'hunt') {
            w.life -= dtMs;
            if (pr) {
                // Use hitbox center for homing; trigger when wisp disc overlaps trigger radius vs hitbox
                const cx = pr.left + pr.width / 2;
                const cy = pr.top + pr.height / 2;
                const dx = cx - w.x, dy = cy - w.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                if (_egHzCircleRectOverlap(w.x, w.y, EG_HZ_VOLATILE_TRIGGER_R, pr) || w.life <= 0) {
                    w.state = 'fuse';
                    w.t = EG_HZ_VOLATILE_FUSE_MS;
                    w.el.classList.add('eg-hz-volatile-fuse');
                    return;
                }
                w.x += (dx / dist) * w.speed * dtS;
                w.y += (dy / dist) * w.speed * dtS;
            } else {
                // Player rect unavailable — drift gently instead of stalling.
                w.x += w.speed * 0.2 * dtS;
            }
            w.el.style.transform =
                `translate(${Math.round(w.x)}px, ${Math.round(w.y)}px)`;
        } else if (w.state === 'fuse') {
            w.t -= dtMs;
            if (w.t <= 0) _egHzDetonateVolatile(w);
        }
    });
}


//------------------------------------------------------------------------
//-------------------FROST NOVAS------------------------------------------
//------------------------------------------------------------------------
// PoE-style freezing novas: a frosty core erupts near the player and the
// expanding ring damages anything it passes through once (chill + freeze
// chance). Cold Resistance mitigates; dodging out of the ring radius works.

function _egHzInitFrostNova(intensity) {
    _egHzFrostNova = {
        novas: [],
        nextIn: _egHzRand(2500, 5000),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzSpawnFrostNova() {
    // Erupt close to the player so the expanding ring must be reacted to.
    let x = window.innerWidth * 0.5;
    let y = window.innerHeight * 0.5;
    const pr = _egHzPlayerHitbox();
    if (pr) {
        x = pr.left + pr.width / 2 + _egHzRand(-240, 240);
        y = pr.top + pr.height / 2 + _egHzRand(-240, 240);
    }
    x = Math.max(20, Math.min(window.innerWidth - 20, x));
    y = Math.max(20, Math.min(window.innerHeight - 20, y));

    const el = document.createElement('div');
    el.className = 'eg-hz-frostnova';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    _egHzLayer.appendChild(el);

    _egHzFrostNova.novas.push({ x, y, t: EG_HZ_FROSTNOVA_EXPAND_MS, r: 0, el, hitDone: false });
}

function _egHzTickFrostNova(dtMs) {
    const st = _egHzFrostNova;
    const dtS = dtMs / 1000;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        st.nextIn = _egHzRand(
            EG_HZ_FROSTNOVA_INTERVAL_MIN_MS,
            EG_HZ_FROSTNOVA_INTERVAL_MAX_MS
        ) * st.intervalScale;
        _egHzSpawnFrostNova();
    }

    const pr = _egHzPlayerHitbox();

    for (let i = st.novas.length - 1; i >= 0; i--) {
        const nova = st.novas[i];
        if (!nova.el.isConnected) { st.novas.splice(i, 1); continue; }

        nova.prevR = nova.r;
        nova.t -= dtMs;
        nova.r = EG_HZ_FROSTNOVA_MAX_R *
            Math.min(1, 1 - nova.t / EG_HZ_FROSTNOVA_EXPAND_MS);

        const size = nova.r * 2;
        nova.el.style.width = size + 'px';
        nova.el.style.height = size + 'px';
        nova.el.style.marginLeft = (-nova.r) + 'px';
        nova.el.style.marginTop = (-nova.r) + 'px';

        // The ring band damages the player exactly once as it sweeps past.
        // Swept so 10px/tick + 26px band can't be missed; tight hitbox vs ring.
        if (pr && !nova.hitDone) {
            const prevR = (typeof nova.prevR === 'number') ? nova.prevR : nova.r;
            const hitNow = _egHzRingRectOverlap(nova.x, nova.y, nova.r, EG_HZ_FROSTNOVA_BAND, pr);
            const hitPrev = _egHzRingRectOverlap(nova.x, nova.y, prevR, EG_HZ_FROSTNOVA_BAND, pr);
            if (hitNow || hitPrev) {
                nova.hitDone = true;
                const dealt = _egHzDamage(
                    EG_HZ_FROSTNOVA_BASE_DMG_PCT * st.dmgMult, 'cold', '#a8e6ff'
                );
                if (dealt > 0 && typeof _egApplyPlayerAilment === 'function') {
                    _egApplyPlayerAilment('chill');
                    if (Math.random() * 100 < EG_HZ_FROSTNOVA_FREEZE_CHANCE_PCT) {
                        _egApplyPlayerAilment('frozen');
                    }
                }
            }
        }

        if (nova.t <= 0) {
            nova.el.remove();
            st.novas.splice(i, 1);
        }
    }
}


//------------------------------------------------------------------------
//-------------------FIRE WALLS-------------------------------------------
//------------------------------------------------------------------------
// Telegraphed horizontal flame walls. Randomly picks one of several
// outplay-able variations each spawn so the mechanic is never an
// unavoidable full-screen hit:
//
//   offsetTop  — wall starts inset from the TOP (185–260 px safe strip
//                at the very top, clears the avatar+HP/charge HUD). Sweeps
//                TOP → BOTTOM. Dodge by hugging the top edge.
//   offsetBottom— wall starts inset from the BOTTOM (90–165 px safe strip
//                at the very bottom). Sweeps BOTTOM → TOP. Dodge by
//                hugging the bottom edge.
//   gapDown    — full-width wall with a horizontal GAP (180–280 px) that
//                spans the wall's thickness. Starts at the TOP, sweeps
//                TOP → BOTTOM. Stand in the gap.
//   gapUp      — same gap wall but mirrored: starts at the BOTTOM and
//                sweeps BOTTOM → TOP.
//
// Telegraph (warning) mirrors the wall geometry so the player can read
// the safe zone / gap position during the 5 s wind-up. Damage is
// dealt once when the flame band (including swept interval) overlaps
// the player's tight sprite hitbox; for gap variants the hit is
// suppressed when the hitbox is fully inside the gap.

function _egHzInitFirewall(intensity) {
    _egHzFirewall = {
        pending: [],
        nextIn: _egHzRand(3500, 6500),
        intervalScale: 1 - Math.min(0.45, intensity / 220),
        dmgMult: _egHzMult(intensity),
    };
}

function _egHzCreateFirewallWallEls(variant, gapX, gapW, startY) {
    const h = EG_HZ_FIREWALL_HEIGHT;
    const hasGap = variant === 'gapDown' || variant === 'gapUp';
    const els = [];
    if (!hasGap) {
        const el = document.createElement('div');
        el.className = 'eg-hz-firewall';
        el.style.height = h + 'px';
        el.style.transform = `translateY(${Math.round(startY)}px)`;
        el.style.display = 'none';
        if (_egHzLayer) _egHzLayer.appendChild(el);
        els.push(el);
    } else {
        const vw = window.innerWidth;
        // Clamp gap to viewport
        const gx = Math.max(EG_HZ_FIREWALL_GAP_MARGIN,
            Math.min(gapX, vw - gapW - EG_HZ_FIREWALL_GAP_MARGIN));
        const leftW = gx;
        const rightX = gx + gapW;
        const rightW = Math.max(0, vw - rightX);
        const mkSeg = (left, width) => {
            const seg = document.createElement('div');
            seg.className = 'eg-hz-firewall eg-hz-firewall--gap-seg';
            seg.style.height = h + 'px';
            seg.style.left = left + 'px';
            seg.style.right = 'auto';
            seg.style.width = width + 'px';
            seg.style.transform = `translateY(${Math.round(startY)}px)`;
            seg.style.display = 'none';
            if (_egHzLayer) _egHzLayer.appendChild(seg);
            return seg;
        };
        if (leftW > 2) els.push(mkSeg(0, leftW));
        if (rightW > 2) els.push(mkSeg(rightX, rightW));
        // Edge case: if one side is degenerate (gap at very edge) at least one seg will exist.
        // If both degenerate (should not happen), fallback to single full wall.
        if (els.length === 0) {
            const el = document.createElement('div');
            el.className = 'eg-hz-firewall';
            el.style.height = h + 'px';
            el.style.transform = `translateY(${Math.round(startY)}px)`;
            el.style.display = 'none';
            if (_egHzLayer) _egHzLayer.appendChild(el);
            els.push(el);
        }
    }
    return els;
}

function _egHzCreateFirewallWarningEls(variant, gapX, gapW, startY) {
    const h = EG_HZ_FIREWALL_HEIGHT;
    const hasGap = variant === 'gapDown' || variant === 'gapUp';
    const els = [];
    if (!hasGap) {
        const warn = document.createElement('div');
        warn.className = 'eg-hz-firewall-warning';
        // Position at the wall's start location so the safe strip is visible.
        warn.style.top = Math.round(startY) + 'px';
        warn.style.height = h + 'px';
        if (_egHzLayer) _egHzLayer.appendChild(warn);
        els.push(warn);
    } else {
        const vw = window.innerWidth;
        const gx = Math.max(EG_HZ_FIREWALL_GAP_MARGIN,
            Math.min(gapX, vw - gapW - EG_HZ_FIREWALL_GAP_MARGIN));
        const leftW = gx;
        const rightX = gx + gapW;
        const rightW = Math.max(0, vw - rightX);
        const mkWarnSeg = (left, width) => {
            const seg = document.createElement('div');
            seg.className = 'eg-hz-firewall-warning eg-hz-firewall-warning--gap-seg';
            seg.style.top = Math.round(startY) + 'px';
            seg.style.height = h + 'px';
            seg.style.left = left + 'px';
            seg.style.right = 'auto';
            seg.style.width = width + 'px';
            if (_egHzLayer) _egHzLayer.appendChild(seg);
            return seg;
        };
        if (leftW > 2) els.push(mkWarnSeg(0, leftW));
        if (rightW > 2) els.push(mkWarnSeg(rightX, rightW));
        if (els.length === 0) {
            const warn = document.createElement('div');
            warn.className = 'eg-hz-firewall-warning';
            warn.style.top = Math.round(startY) + 'px';
            warn.style.height = h + 'px';
            if (_egHzLayer) _egHzLayer.appendChild(warn);
            els.push(warn);
        }
    }
    return els;
}

function _egHzTickFirewall(dtMs) {
    const st = _egHzFirewall;
    const dtS = dtMs / 1000;

    st.nextIn -= dtMs;
    if (st.nextIn <= 0) {
        // Never queue a second firewall while any existing firewall is still
        // telegraphing, lingering, or sweeping. In particular, this keeps a
        // gap wall from overlapping an offset wall (and vice versa).
        if (st.pending.length > 0) {
            st.nextIn = 250;
        } else {
            st.nextIn = _egHzRand(
                EG_HZ_FIREWALL_INTERVAL_MIN_MS,
                EG_HZ_FIREWALL_INTERVAL_MAX_MS
            ) * st.intervalScale;

            // ── Pick a random outplay variation ───────────────────────────
            const variants = ['offsetTop', 'offsetBottom', 'gapDown', 'gapUp'];
            const variant = variants[Math.floor(Math.random() * variants.length)];
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const h = EG_HZ_FIREWALL_HEIGHT;
            let startY, endY, dir, gapX = 0, gapW = 0;

            if (variant === 'offsetTop') {
                const safeTop = _egHzRand(EG_HZ_FIREWALL_TOP_SAFE_MIN, EG_HZ_FIREWALL_TOP_SAFE_MAX);
                startY = safeTop;
                endY = vh;
                dir = 1;
            } else if (variant === 'offsetBottom') {
                const safeBottom = _egHzRand(EG_HZ_FIREWALL_BOTTOM_SAFE_MIN, EG_HZ_FIREWALL_BOTTOM_SAFE_MAX);
                startY = vh - h - safeBottom;
                endY = -h;
                dir = -1;
            } else if (variant === 'gapDown') {
                gapW = _egHzRand(EG_HZ_FIREWALL_GAP_MIN_W, EG_HZ_FIREWALL_GAP_MAX_W);
                gapX = _egHzRand(EG_HZ_FIREWALL_GAP_MARGIN, Math.max(EG_HZ_FIREWALL_GAP_MARGIN, vw - gapW - EG_HZ_FIREWALL_GAP_MARGIN));
                startY = -h;
                endY = vh;
                dir = 1;
            } else { // gapUp
                gapW = _egHzRand(EG_HZ_FIREWALL_GAP_MIN_W, EG_HZ_FIREWALL_GAP_MAX_W);
                gapX = _egHzRand(EG_HZ_FIREWALL_GAP_MARGIN, Math.max(EG_HZ_FIREWALL_GAP_MARGIN, vw - gapW - EG_HZ_FIREWALL_GAP_MARGIN));
                startY = vh;
                endY = -h;
                dir = -1;
            }

            const totalDist = Math.abs(endY - startY);
            const wallEls = _egHzCreateFirewallWallEls(variant, gapX, gapW, startY);
            const warningEls = _egHzCreateFirewallWarningEls(variant, gapX, gapW, startY);
            // Remove telegraph after wind-up; wall becomes visible then.
            const warnElsSnapshot = warningEls.slice();
            setTimeout(() => warnElsSnapshot.forEach(el => { try { el.remove(); } catch(e){} }), EG_HZ_FIREWALL_WARNING_MS);

            const isGapVariant = variant === 'gapDown' || variant === 'gapUp';
            st.pending.push({
                t: EG_HZ_FIREWALL_WARNING_MS,
                lingerT: isGapVariant ? EG_HZ_FIREWALL_WARNING_MS : 0,
                y: startY,
                dir: dir,
                totalDist: totalDist,
                endY: endY,
                variant: variant,
                gapX: gapX,
                gapW: gapW,
                wallEls: wallEls,
                warningEls: warningEls,
                hitDone: false,
            });
        }
    }

    const pr = _egHzPlayerHitbox();

    for (let i = st.pending.length - 1; i >= 0; i--) {
        const w = st.pending[i];
        // If all wall segments have been removed externally, drop entry.
        const anyConnected = w.wallEls.some(el => el.isConnected);
        if (!anyConnected && w.t <= 0 && (w.lingerT || 0) <= 0) { st.pending.splice(i, 1); continue; }
        if (w.wallEls.length === 0) { st.pending.splice(i, 1); continue; }

        // Warning phase — telegraph visible, wall hidden.
        if (w.t > 0) {
            w.t -= dtMs;
            if (w.t <= 0) {
                w.wallEls.forEach(el => { el.style.display = 'block'; });
            }
            continue;
        }

        // Linger phase (gap variants only) — wall visible at start edge, not sweeping yet.
        const isGap = w.variant === 'gapDown' || w.variant === 'gapUp';
        if (isGap && w.lingerT > 0) {
            w.lingerT -= dtMs;
            if (w.lingerT <= 0) {
                // Linger done, sweep will start on next tick.
            }

            // Hit detection during linger — wall is stationary at startY.
            const wallTop = w.y;
            const wallBottom = w.y + EG_HZ_FIREWALL_HEIGHT;
            const verticalOverlap = pr && pr.bottom > wallTop && pr.top < wallBottom;
            if (!w.hitDone && verticalOverlap) {
                let shouldHit = true;
                if (w.variant === 'gapDown' || w.variant === 'gapUp') {
                    const vw = window.innerWidth;
                    const gx = Math.max(EG_HZ_FIREWALL_GAP_MARGIN,
                        Math.min(w.gapX, vw - w.gapW - EG_HZ_FIREWALL_GAP_MARGIN));
                    const gapLeft = gx;
                    const gapRight = gx + w.gapW;
                    const inset = 6;
                    const safeLeft = gapLeft + inset;
                    const safeRight = gapRight - inset;
                    if (pr.left >= safeLeft && pr.right <= safeRight) {
                        shouldHit = false;
                    } else {
                        if (w.wallEls.length === 1 && w.gapW <= 0) shouldHit = true;
                    }
                }
                if (shouldHit) {
                    w.hitDone = true;
                    const dealt = _egHzDamage(
                        EG_HZ_FIREWALL_BASE_DMG_PCT * st.dmgMult, 'fire', '#ff8c42'
                    );
                    if (dealt > 0 && typeof _egApplyPlayerAilment === 'function') {
                        _egApplyPlayerAilment('ignite',
                            Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_IGNITE_DMG_SHARE));
                    }
                }
            }
            continue;
        }

        // Sweeping phase — the wave moves in its variant direction.
        const prevY = w.y;
        const speed = w.totalDist / (EG_HZ_FIREWALL_SWEEP_MS / 1000);
        w.y += w.dir * speed * dtS;
        w.wallEls.forEach(el => { el.style.transform = `translateY(${Math.round(w.y)}px)`; });

        // Swept vertical interval so high speed cannot skip hitbox.
        const wallTop = Math.min(prevY, w.y);
        const wallBottom = Math.max(prevY + EG_HZ_FIREWALL_HEIGHT, w.y + EG_HZ_FIREWALL_HEIGHT);
        const verticalOverlap = pr && pr.bottom > wallTop && pr.top < wallBottom;

        if (!w.hitDone && verticalOverlap) {
            let shouldHit = true;
            // Gap variants: player fully inside the gap is safe.
            if (w.variant === 'gapDown' || w.variant === 'gapUp') {
                const vw = window.innerWidth;
                const gx = Math.max(EG_HZ_FIREWALL_GAP_MARGIN,
                    Math.min(w.gapX, vw - w.gapW - EG_HZ_FIREWALL_GAP_MARGIN));
                const gapLeft = gx;
                const gapRight = gx + w.gapW;
                // Small forgiveness inset so touching the flame edge still burns.
                const inset = 6;
                const safeLeft = gapLeft + inset;
                const safeRight = gapRight - inset;
                // Player rect must be fully inside the inset gap to be safe.
                if (pr.left >= safeLeft && pr.right <= safeRight) {
                    shouldHit = false;
                } else {
                    // Also consider case where gap is degenerate (no segments):
                    // if wallEls covers full width there is no safe gap — must hit.
                    if (w.wallEls.length === 1 && w.gapW <= 0) shouldHit = true;
                }
            }
            // Offset variants use pure vertical check — the top/bottom safe strip
            // is naturally safe because the wall band never covers it.

            if (shouldHit) {
                w.hitDone = true;
                const dealt = _egHzDamage(
                    EG_HZ_FIREWALL_BASE_DMG_PCT * st.dmgMult, 'fire', '#ff8c42'
                );
                if (dealt > 0 && typeof _egApplyPlayerAilment === 'function'
                    && Math.random() * 100 < EG_HZ_FIREWALL_IGNITE_CHANCE_PCT) {
                    _egApplyPlayerAilment('ignite',
                        Math.max(EG_AIL_MIN_DOT_DAMAGE, dealt * EG_AIL_IGNITE_DMG_SHARE));
                }
            }
        }

        // Remove when the wall has fully exited the screen in its direction.
        const exited = (w.dir === 1 && w.y >= window.innerHeight) ||
                       (w.dir === -1 && w.y <= -EG_HZ_FIREWALL_HEIGHT);
        if (exited) {
            w.wallEls.forEach(el => { try { el.remove(); } catch(e){} });
            // Warning already removed via timeout, but ensure cleanup.
            if (w.warningEls) w.warningEls.forEach(el => { try { el.remove(); } catch(e){} });
            st.pending.splice(i, 1);
        }
    }
}


//------------------------------------------------------------------------
//-------------------CYCLONES---------------------------------------------
//------------------------------------------------------------------------
// Fast wind vortices that race across the whole screen (grid included),
// damaging the player continuously while they stand inside one.

function _egHzInitCyclone(intensity) {
    const count = Math.min(5, 2 + Math.round(intensity / 33));
    const vortices = [];
    for (let i = 0; i < count; i++) {
        const r = _egHzRand(EG_HZ_CYCLONE_R_MIN, EG_HZ_CYCLONE_R_MAX);
        const speed = _egHzRand(EG_HZ_CYCLONE_SPEED_MIN, EG_HZ_CYCLONE_SPEED_MAX)
            * (1 + intensity / 200);
        const angle = Math.random() * Math.PI * 2;

        const el = document.createElement('div');
        el.className = 'eg-hz-cyclone';
        const size = r * 2;
        el.style.width = size + 'px';
        el.style.height = size * 1.6 + 'px';
        _egHzLayer.appendChild(el);

        vortices.push({
            x: _egHzRand(r, window.innerWidth - r),
            y: _egHzRand(r, window.innerHeight - r),
            r,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            dmgAcc: 0, el,
        });
    }
    _egHzCyclone = { vortices, dmgMult: _egHzMult(intensity) };
}

function _egHzTickCyclone(dtMs) {
    const st = _egHzCyclone;
    const dtS = dtMs / 1000;
    const pr = _egHzPlayerHitbox();

    st.vortices.forEach(v => {
        if (!v.el.isConnected) return;

        const prevX = v.x, prevY = v.y;
        let nx = v.x + v.vx * dtS;
        let ny = v.y + v.vy * dtS;
        if (nx < v.r || nx > window.innerWidth - v.r) { v.vx *= -1; nx = v.x; }
        if (ny < v.r || ny > window.innerHeight - v.r) { v.vy *= -1; ny = v.y; }
        v.x = nx; v.y = ny;
        v.el.style.transform =
            `translate(${Math.round(v.x - v.r)}px, ${Math.round(v.y - v.r * 1.6)}px) rotate(${(v.x + v.y) % 360}deg)`;

        // Continuous cold damage while the player stands in the funnel.
        v.dmgAcc += dtMs;
        if (v.dmgAcc >= EG_HZ_CYCLONE_TICK_MS) {
            v.dmgAcc = 0;
            if (pr && _egHzSweptCircleRectOverlap(prevX, prevY, v.x, v.y, v.r * 0.9, pr)) {
                _egHzApplyCircleHit(v.x, v.y, v.r * 0.9, pr,
                    EG_HZ_CYCLONE_BASE_DMG_PCT * st.dmgMult, 'cold', '#a8e6ff');
            }
        }
    });
}


//------------------------------------------------------------------------
//-------------------DELIRIUM MIST----------------------------------------
//------------------------------------------------------------------------
// PoE Delirium: a purple mist periodically floods the screen. While it holds,
// there is one chance roll to polymorph the player into chaos.

function _egHzInitDelirium(intensity) {
    _egHzDelirium = {
        phase: 'idle',
        nextIn: _egHzRand(8000, 14000),
        t: 0,
        el: null,
        rolled: false,
        polyChance: Math.min(80, EG_HZ_DELIRIUM_POLYMORPH_CHANCE_PCT * _egHzMult(intensity)),
    };
}

function _egHzTickDelirium(dtMs) {
    const st = _egHzDelirium;

    if (st.phase === 'idle') {
        st.nextIn -= dtMs;
        if (st.nextIn <= 0) {
            const mist = document.createElement('div');
            mist.className = 'eg-hz-delirium';
            mist.style.animationDuration =
                `${EG_HZ_DELIRIUM_FADE_IN_MS}ms, ${EG_HZ_DELIRIUM_FADE_OUT_MS}ms`;
            mist.style.animationDelay = `0ms, ${EG_HZ_DELIRIUM_FADE_IN_MS + EG_HZ_DELIRIUM_HOLD_MS}ms`;
            document.body.appendChild(mist);
            st.el = mist;
            st.phase = 'mist';
            st.t = EG_HZ_DELIRIUM_FADE_IN_MS + EG_HZ_DELIRIUM_HOLD_MS;
            st.rolled = false;
        }
        return;
    }

    // Mist phase
    st.t -= dtMs;
    if (!st.rolled && st.t <= EG_HZ_DELIRIUM_HOLD_MS) {
        st.rolled = true;
        if (typeof _egApplyPlayerAilment === 'function'
            && Math.random() * 100 < st.polyChance) {
            _egApplyPlayerAilment('polymorph');
        }
    }
    if (st.t <= 0) {
        if (st.el) { st.el.remove(); st.el = null; }
        st.phase = 'idle';
        st.nextIn = _egHzRand(
            EG_HZ_DELIRIUM_INTERVAL_MIN_MS,
            EG_HZ_DELIRIUM_INTERVAL_MAX_MS
        );
    }
}
