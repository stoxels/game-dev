//------------------------------------------------------------------------
//-------------------SHARED AILMENT STATE-------------------------------
//------------------------------------------------------------------------
// Mutable encounter state shared by the combat and puzzle helpers.

export let _egPlayerStatuses = {};
export let _egPuzzleEffects = [];
export let _egIceRedirectDepth = 0;
export let _egSparkFollowerEl = null;
export let _egSparkMoveHandler = null;
export let _egSparkSpawnTimer = null;
export let _egSparkLastX = 0;
export let _egSparkLastY = 0;
export const EG_SPARK_GLYPHS = ['⚡', '✦', '✧', '＊'];
export let _egGroundFireAcc = 0;
export let _egPlayerStatusBarTicker = null;

// Replaces the active puzzle list while keeping the owner binding writable
// from focused sibling modules.
export function _egReplacePuzzleEffects(nextEffects) {
    _egPuzzleEffects = nextEffects;
}

// Replaces the status-bar timer handle without exposing the owner binding
// to sibling modules that only need to stop or start the ticker.
export function _egSetPlayerStatusBarTicker(nextTimer) {
    _egPlayerStatusBarTicker = nextTimer;
}

export function _egAddGroundFireAcc(delta) {
    _egGroundFireAcc += delta;
}

export function _egSetIceRedirectDepth(value) {
    _egIceRedirectDepth = value;
}

export function _egSetSparkFollowerEl(value) {
    _egSparkFollowerEl = value;
}

export function _egSetSparkMoveHandler(value) {
    _egSparkMoveHandler = value;
}

export function _egSetSparkSpawnTimer(value) {
    _egSparkSpawnTimer = value;
}

export function _egSetSparkLastPosition(x, y) {
    _egSparkLastX = x;
    _egSparkLastY = y;
}

// Resets only the player status map at the start of the lifecycle sequence.
export function _egResetPlayerStatuses() {
    _egResetEnduranceCharges();
    _egResetFrenzyCharges();
    _egResetRage();
    _egPlayerStatuses = {};
}

// Resets counters that are cleared after puzzle effects are removed.
export function _egResetAilmentCounters() {
    _egIceRedirectDepth = 0;
    _egGroundFireAcc = 0;
}

//------------------------------------------------------------------------
//-------------------ENDURANCE CHARGES------------------------------------
//------------------------------------------------------------------------
// Passive-tree defensive charges (shield batch, e.g. reworked node 285).
// Each active charge grants EG_ENDURANCE_ARMOUR_PER_CHARGE flat Armour and
// EG_ENDURANCE_ELEM_RES_PER_CHARGE % to all elemental resistances (folded
// into the stats in _egComputePlayerStats). Gaining a charge refreshes the
// shared expiry of ALL charges; when it lapses they all drop together.
// The count is read lazily against the clock, so no expiry timer exists -
// the orb visual in combat-ailments-core.js merely mirrors this state.
export const EG_ENDURANCE_DURATION_MS = 10000;
export const EG_ENDURANCE_BASE_MAX = 3;
export const EG_ENDURANCE_ARMOUR_PER_CHARGE = 100;
export const EG_ENDURANCE_ELEM_RES_PER_CHARGE = 4;

let _egEnduranceCharges = 0;
let _egEnduranceUntil = 0;

// Live charge count (0 once the shared timer has run out).
export function _egGetEnduranceCharges() {
    if (_egEnduranceCharges > 0 && Date.now() >= _egEnduranceUntil) _egEnduranceCharges = 0;
    return _egEnduranceCharges;
}

// Adds one charge up to `max` and restarts the shared timer (lengthened by
// `durationPct` % increased Endurance Charge Duration). Returns the new count.
export function _egGainEnduranceCharge(max, durationPct = 0) {
    const cap = Math.max(1, Math.floor(Number(max) || EG_ENDURANCE_BASE_MAX));
    const durationMult = 1 + Math.max(0, Number(durationPct) || 0) / 100;
    _egEnduranceCharges = Math.min(cap, _egGetEnduranceCharges() + 1);
    _egEnduranceUntil = Date.now() + EG_ENDURANCE_DURATION_MS * durationMult;
    _egStartEnduranceOrbs();
    return _egEnduranceCharges;
}

//------------------------------------------------------------------------
//-------------------FRENZY CHARGES---------------------------------------
//------------------------------------------------------------------------
// Offensive charge resource (like Path of Exile's Frenzy Charges). Each
// active charge grants EG_FRENZY_MELEE_SPEED_PER_CHARGE % increased melee
// charge-up speed and EG_FRENZY_DAMAGE_PER_CHARGE % more projectile damage
// (folded in _egComputePlayerStats). Charges share one timer: gaining a
// charge refreshes it, and when it lapses they all expire. Resolved lazily
// against the clock like Endurance Charges, so no timer exists.
// Nothing GRANTS charges yet - _egGainFrenzyCharge is the hook for future
// sources (nodes, gear, skills).
export const EG_FRENZY_DURATION_MS = 10000;
export const EG_FRENZY_BASE_MAX = 3;
export const EG_FRENZY_MELEE_SPEED_PER_CHARGE = 4;
export const EG_FRENZY_DAMAGE_PER_CHARGE = 4;

let _egFrenzyCharges = 0;
let _egFrenzyUntil = 0;

export function _egGetFrenzyCharges() {
    if (_egFrenzyCharges > 0 && Date.now() >= _egFrenzyUntil) _egFrenzyCharges = 0;
    return _egFrenzyCharges;
}

// Adds one charge up to `max` and restarts the shared timer (scaled by
// `durationPct` % increased Frenzy Charge Duration). Returns the new count.
export function _egGainFrenzyCharge(max, durationPct = 0) {
    const cap = Math.max(1, Math.floor(Number(max) || EG_FRENZY_BASE_MAX));
    const durationMult = 1 + Math.max(0, Number(durationPct) || 0) / 100;
    _egFrenzyCharges = Math.min(cap, _egGetFrenzyCharges() + 1);
    _egFrenzyUntil = Date.now() + EG_FRENZY_DURATION_MS * durationMult;
    return _egFrenzyCharges;
}

export function _egResetFrenzyCharges() {
    _egFrenzyCharges = 0;
    _egFrenzyUntil = 0;
}

//------------------------------------------------------------------------
//-------------------RAGE-------------------------------------------------
//------------------------------------------------------------------------
// Axe resource (notable 369). Each Rage is a multiplicative melee-damage
// step (applied in _egCalcPlayerMeleeDamage). Gaining Rage or being hit
// restarts a 5s grace timer; once it lapses one Rage fades per second.
// Like the endurance charges the count is resolved lazily against the
// clock, so no timer exists.
export const EG_RAGE_DECAY_GRACE_MS = 5000;
export const EG_RAGE_DECAY_STEP_MS = 1000;

let _egRage = 0;
let _egRageDecayAt = 0;

export function _egGetRage() {
    const now = Date.now();
    while (_egRage > 0 && now >= _egRageDecayAt) {
        _egRage -= 1;
        _egRageDecayAt += EG_RAGE_DECAY_STEP_MS;
    }
    return _egRage;
}

// Adds `amount` Rage up to `max` and restarts the grace timer. Returns the
// new count. Nothing is gained without a maximum (node not allocated).
export function _egGainRage(amount, max) {
    const cap = Math.max(0, Math.floor(Number(max) || 0));
    if (cap <= 0) return _egGetRage();
    _egRage = Math.min(cap, _egGetRage() + Math.max(0, Number(amount) || 0));
    _egRageDecayAt = Date.now() + EG_RAGE_DECAY_GRACE_MS;
    return _egRage;
}

// The player being hit also restarts the grace timer (no gain).
export function _egRageOnPlayerHit() {
    if (_egGetRage() > 0) _egRageDecayAt = Date.now() + EG_RAGE_DECAY_GRACE_MS;
}

export function _egResetRage() {
    _egRage = 0;
    _egRageDecayAt = 0;
}

export function _egResetEnduranceCharges() {
    _egEnduranceCharges = 0;
    _egEnduranceUntil = 0;
}

//------------------------------------------------------------------------
// Orb visual: one glowing orange ball per active charge, orbiting the
// player sprite. A single fixed overlay layer on <body> follows whichever
// avatar sprite is currently on screen (full or simple); a requestAnimation-
// Frame loop runs only while charges exist and removes the layer the frame
// after the last charge lapses. Purely cosmetic - it never writes state.
let _egEnduranceRaf = null;
let _egEnduranceLayer = null;

function _egEnduranceSpriteRect() {
    const ids = ['avatar-sprite-img', 'avatar-sprite-img-simple'];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r;
    }
    return null;
}

function _egEnduranceFrame(now) {
    _egEnduranceRaf = null;
    const count = _egGetEnduranceCharges();
    if (count <= 0) {
        if (_egEnduranceLayer) { _egEnduranceLayer.remove(); _egEnduranceLayer = null; }
        return;
    }
    if (!_egEnduranceLayer || !_egEnduranceLayer.isConnected) {
        _egEnduranceLayer = document.createElement('div');
        _egEnduranceLayer.id = 'eg-endurance-orbs';
        _egEnduranceLayer.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:1001;pointer-events:none;';
        document.body.appendChild(_egEnduranceLayer);
    }
    while (_egEnduranceLayer.children.length < count) {
        const orb = document.createElement('div');
        orb.className = 'eg-endurance-orb';
        orb.style.cssText = 'position:absolute;width:16px;height:16px;border-radius:50%;'
            + 'background:radial-gradient(circle at 35% 30%,#ffe2a8 0%,#ff9b2f 45%,#c85a00 100%);'
            + 'box-shadow:0 0 8px 2px rgba(255,150,40,0.85);';
        _egEnduranceLayer.appendChild(orb);
    }
    while (_egEnduranceLayer.children.length > count) _egEnduranceLayer.lastElementChild.remove();

    const rect = _egEnduranceSpriteRect();
    const orbs = _egEnduranceLayer.children;
    for (let i = 0; i < orbs.length; i++) {
        if (!rect) { orbs[i].style.display = 'none'; continue; }
        const angle = now * 0.0022 + (i * 2 * Math.PI) / count;
        const rx = rect.width * 0.42;
        const ry = rect.height * 0.18;
        orbs[i].style.display = 'block';
        orbs[i].style.left = `${rect.left + rect.width / 2 + Math.cos(angle) * rx - 8}px`;
        orbs[i].style.top = `${rect.top + rect.height * 0.55 + Math.sin(angle) * ry - 8}px`;
    }
    _egEnduranceRaf = requestAnimationFrame(_egEnduranceFrame);
}

function _egStartEnduranceOrbs() {
    if (_egEnduranceRaf != null || typeof document === 'undefined'
        || typeof requestAnimationFrame !== 'function') return;
    _egEnduranceRaf = requestAnimationFrame(_egEnduranceFrame);
}
