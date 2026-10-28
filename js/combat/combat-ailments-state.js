import { t } from '../translation/translations.js';

//------------------------------------------------------------------------
//-------------------SHARED AILMENT STATE-------------------------------
//------------------------------------------------------------------------
// Mutable encounter state shared by the combat and puzzle helpers.

export let _playerStatuses = {};
export let _puzzleEffects = [];
export let _iceRedirectDepth = 0;
export let _sparkFollowerEl = null;
export let _sparkMoveHandler = null;
export let _sparkSpawnTimer = null;
export let _sparkLastX = 0;
export let _sparkLastY = 0;
export const SPARK_GLYPHS = ['⚡', '✦', '✧', '＊'];
export let _groundFireAcc = 0;
export let _playerStatusBarTicker = null;

// Replaces the active puzzle list while keeping the owner binding writable
// from focused sibling modules.
export function _replacePuzzleEffects(nextEffects) {
    _puzzleEffects = nextEffects;
}

// Replaces the status-bar timer handle without exposing the owner binding
// to sibling modules that only need to stop or start the ticker.
export function _setPlayerStatusBarTicker(nextTimer) {
    _playerStatusBarTicker = nextTimer;
}

// Adds to the ground-fire damage accumulator.
export function _addGroundFireAcc(delta) {
    _groundFireAcc += delta;
}

// Sets the ice-redirect recursion depth.
export function _setIceRedirectDepth(value) {
    _iceRedirectDepth = value;
}

// Stores the spark element that follows the cursor.
export function _setSparkFollowerEl(value) {
    _sparkFollowerEl = value;
}

// Stores the mousemove handler used by the shocked-cursor effect.
export function _setSparkMoveHandler(value) {
    _sparkMoveHandler = value;
}

// Stores the interval that spawns cursor sparks.
export function _setSparkSpawnTimer(value) {
    _sparkSpawnTimer = value;
}

// Remembers the last cursor position used for sparks.
export function _setSparkLastPosition(x, y) {
    _sparkLastX = x;
    _sparkLastY = y;
}

// Resets only the player status map at the start of the lifecycle sequence.
export function _resetPlayerStatuses() {
    _resetEnduranceCharges();
    _resetFrenzyCharges();
    _resetOnslaught();
    _resetGhostShrouds();
    _resetPowerCharges();
    _resetFortify();
    _resetRiposte();
    _resetRage();
    _playerStatuses = {};
}

// Resets counters that are cleared after puzzle effects are removed.
export function _resetAilmentCounters() {
    _iceRedirectDepth = 0;
    _groundFireAcc = 0;
}

//------------------------------------------------------------------------
//-------------------ENDURANCE CHARGES------------------------------------
//------------------------------------------------------------------------
// Passive-tree defensive charges (shield batch, e.g. reworked node 285).
// Each active charge grants ENDURANCE_ARMOUR_PER_CHARGE flat Armour and
// ENDURANCE_ELEM_RES_PER_CHARGE % to all elemental resistances (folded
// into the stats in _computePlayerStats). Gaining a charge refreshes the
// shared expiry of ALL charges; when it lapses they all drop together.
// The count is read lazily against the clock, so no expiry timer exists -
// the orb visual in combat-ailments-core.js merely mirrors this state.
export const ENDURANCE_DURATION_MS = 10000;
export const ENDURANCE_BASE_MAX = 3;
export const ENDURANCE_ARMOUR_PER_CHARGE = 100;
export const ENDURANCE_ELEM_RES_PER_CHARGE = 4;

let _enduranceCharges = 0;
let _enduranceUntil = 0;

// Live charge count (0 once the shared timer has run out).
export function _getEnduranceCharges() {
    if (_enduranceCharges > 0 && Date.now() >= _enduranceUntil) _enduranceCharges = 0;
    return _enduranceCharges;
}

// Adds one charge up to `max` and restarts the shared timer (lengthened by
// `durationPct` % increased Endurance Charge Duration). Returns the new count.
export function _gainEnduranceCharge(max, durationPct = 0) {
    const cap = Math.max(1, Math.floor(Number(max) || ENDURANCE_BASE_MAX));
    const durationMult = 1 + Math.max(0, Number(durationPct) || 0) / 100;
    _enduranceCharges = Math.min(cap, _getEnduranceCharges() + 1);
    _enduranceUntil = Date.now() + ENDURANCE_DURATION_MS * durationMult;
    _startEnduranceOrbs();
    return _enduranceCharges;
}

//------------------------------------------------------------------------
//-------------------FRENZY CHARGES---------------------------------------
//------------------------------------------------------------------------
// Offensive charge resource (Frenzy Charges). Each active charge grants
// FRENZY_MELEE_SPEED_PER_CHARGE % increased melee charge-up speed and
// FRENZY_DAMAGE_PER_CHARGE % more projectile damage (folded in
// _computePlayerStats). Charges share one timer: gaining a charge
// refreshes it, and when it lapses they all expire. Resolved lazily
// against the clock like Endurance Charges, so no timer exists.
// Granted by the tree's frenzy_on_kill / frenzy_on_block / frenzy_on_line
// lines (see encounter-kills.js, encounter-damage.js and
// combat-grid-pickups-claims.js).
const FRENZY_DURATION_MS = 10000;
export const FRENZY_BASE_MAX = 3;
export const FRENZY_MELEE_SPEED_PER_CHARGE = 4;
export const FRENZY_DAMAGE_PER_CHARGE = 4;

let _frenzyCharges = 0;
let _frenzyUntil = 0;

// Current Frenzy charges (they drop to 0 once the timer has run out).
export function _getFrenzyCharges() {
    if (_frenzyCharges > 0 && Date.now() >= _frenzyUntil) _frenzyCharges = 0;
    return _frenzyCharges;
}

// Adds one charge up to `max` and restarts the shared timer (scaled by
// `durationPct` % increased Frenzy Charge Duration). Returns the new count.
export function _gainFrenzyCharge(max, durationPct = 0) {
    const cap = Math.max(1, Math.floor(Number(max) || FRENZY_BASE_MAX));
    const durationMult = 1 + Math.max(0, Number(durationPct) || 0) / 100;
    _frenzyCharges = Math.min(cap, _getFrenzyCharges() + 1);
    _frenzyUntil = Date.now() + FRENZY_DURATION_MS * durationMult;
    _startFrenzyOrbs();
    return _frenzyCharges;
}

// Clears Frenzy charges.
function _resetFrenzyCharges() {
    _frenzyCharges = 0;
    _frenzyUntil = 0;
}

//------------------------------------------------------------------------
//-------------------ONSLAUGHT--------------------------------------------
//------------------------------------------------------------------------
// Timed speed buff (Onslaught): while active, melee charge-up, cast and
// movement speed rise by ONSLAUGHT_SPEED_PCT (scaled by the effect line).
// Gained on kill through the tree; every gain refreshes the timer.
const ONSLAUGHT_DURATION_MS = 4000;
export const ONSLAUGHT_SPEED_PCT = 20;

let _onslaughtUntil = 0;

// True while Onslaught is active.
export function _onslaughtActive() {
    return Date.now() < _onslaughtUntil;
}

// Starts (or extends) Onslaught.
export function _gainOnslaught() {
    _onslaughtUntil = Date.now() + ONSLAUGHT_DURATION_MS;
}

// Ends Onslaught.
export function _resetOnslaught() {
    _onslaughtUntil = 0;
}

//------------------------------------------------------------------------
//-------------------GHOST SHROUDS (Ghost Dance keystone)------------------
//------------------------------------------------------------------------
// One shroud every GHOST_SHROUD_INTERVAL_MS up to the keystone's maximum.
// Lazy clock: the count is brought up to date whenever it is read or spent.
export const GHOST_SHROUD_INTERVAL_MS = 2000;
let _ghostShrouds = 0;
let _ghostShroudClock = 0;

// Adds the Ghost Shrouds earned since the last check (one per interval, up to
// the cap).
function _syncGhostShrouds(max) {
    const now = Date.now();
    const cap = Math.max(0, Math.floor(Number(max) || 0));
    if (!_ghostShroudClock || _ghostShrouds >= cap) _ghostShroudClock = now;
    const gained = Math.floor((now - _ghostShroudClock) / GHOST_SHROUD_INTERVAL_MS);
    if (gained > 0) {
        _ghostShrouds = Math.min(cap, _ghostShrouds + gained);
        _ghostShroudClock += gained * GHOST_SHROUD_INTERVAL_MS;
    }
    if (_ghostShrouds > cap) _ghostShrouds = cap;
}

// Current Ghost Shrouds for the given maximum.
export function _getGhostShrouds(max) {
    _syncGhostShrouds(max);
    return _ghostShrouds;
}

// Spends one shroud; returns true when one was available.
export function _consumeGhostShroud(max) {
    _syncGhostShrouds(max);
    if (_ghostShrouds <= 0) return false;
    _ghostShrouds -= 1;
    return true;
}

// Clears Ghost Shrouds and restarts their clock.
export function _resetGhostShrouds() {
    _ghostShrouds = 0;
    _ghostShroudClock = Date.now();
}

//------------------------------------------------------------------------
//-------------------POWER CHARGES----------------------------------------
//------------------------------------------------------------------------
// Critical-strike charge resource (Power Charges). Each live charge adds
// POWER_CRIT_PER_CHARGE % crit chance (attacks and spells) and feeds the
// tree's damage-per-charge line (folded in _computePlayerStats). Shared
// timer like Frenzy/Endurance; resolved lazily against the clock. The base
// duration is 30 seconds so charges survive most of a level.
const POWER_DURATION_MS = 30000;
export const POWER_BASE_MAX = 3;
export const POWER_CRIT_PER_CHARGE = 1.5;

let _powerCharges = 0;
let _powerUntil = 0;

// Current Power charges (they drop to 0 once the timer has run out).
export function _getPowerCharges() {
    if (_powerCharges > 0 && Date.now() >= _powerUntil) _powerCharges = 0;
    return _powerCharges;
}

// Adds one charge up to `max` and restarts the shared timer (scaled by
// `durationPct` % increased Power Charge Duration). Returns the new count.
export function _gainPowerCharge(max, durationPct = 0) {
    const cap = Math.max(1, Math.floor(Number(max) || POWER_BASE_MAX));
    const durationMult = 1 + Math.max(0, Number(durationPct) || 0) / 100;
    _powerCharges = Math.min(cap, _getPowerCharges() + 1);
    _powerUntil = Date.now() + POWER_DURATION_MS * durationMult;
    _startPowerOrbs();
    return _powerCharges;
}

// Clears Power charges.
export function _resetPowerCharges() {
    _powerCharges = 0;
    _powerUntil = 0;
}

//------------------------------------------------------------------------
//-------------------FORTIFICATION----------------------------------------
//------------------------------------------------------------------------
// Defensive stacks (Fortify, stack form): each stack takes
// FORTIFY_DR_PER_STACK % less damage from hits (scaled by the effect line).
// Gaining a stack refreshes the shared timer; all stacks expire together.
const FORTIFY_DURATION_MS = 4000;
export const FORTIFY_BASE_MAX = 10;
export const FORTIFY_DR_PER_STACK = 1;

let _fortifyStacks = 0;
let _fortifyUntil = 0;

// Current Fortification stacks (0 once expired).
export function _getFortifyStacks() {
    if (_fortifyStacks > 0 && Date.now() >= _fortifyUntil) _fortifyStacks = 0;
    return _fortifyStacks;
}

// Adds a Fortification stack up to the cap and refreshes its duration;
// returns the new count.
export function _gainFortify(max, durationPct = 0) {
    const cap = Math.max(1, Math.floor(Number(max) || FORTIFY_BASE_MAX));
    const durationMult = 1 + Math.max(0, Number(durationPct) || 0) / 100;
    _fortifyStacks = Math.min(cap, _getFortifyStacks() + 1);
    _fortifyUntil = Date.now() + FORTIFY_DURATION_MS * durationMult;
    return _fortifyStacks;
}

// Clears Fortification.
export function _resetFortify() {
    _fortifyStacks = 0;
    _fortifyUntil = 0;
}

//------------------------------------------------------------------------
//-------------------RIPOSTE (SWORD IDENTITY)-----------------------------
//------------------------------------------------------------------------
// A successful Parry with a sword readies a riposte: the next melee strike
// deals RIPOSTE_BASE_MORE_PCT (+ tree) % more damage and consumes it.
const RIPOSTE_DURATION_MS = 4000;
export const RIPOSTE_BASE_MORE_PCT = 25;

let _riposteUntil = 0;

// Arms the Riposte bonus for its duration (extended by a duration percent).
export function _armRiposte(durationPct = 0) {
    _riposteUntil = Date.now() + RIPOSTE_DURATION_MS * (1 + Math.max(0, Number(durationPct) || 0) / 100);
}

// True while the Riposte bonus is armed.
export function _riposteReady() {
    return Date.now() < _riposteUntil;
}

// Spends the riposte; returns true when one was ready.
export function _consumeRiposte() {
    const ready = _riposteReady();
    _riposteUntil = 0;
    return ready;
}

// Disarms Riposte.
export function _resetRiposte() {
    _riposteUntil = 0;
}

//------------------------------------------------------------------------
//-------------------RAGE-------------------------------------------------
//------------------------------------------------------------------------
// Axe resource (notable 369). Each Rage is a multiplicative melee-damage
// step (applied in _calcPlayerMeleeDamage). Gaining Rage or being hit
// restarts a 5s grace timer; once it lapses one Rage fades per second.
// Like the endurance charges the count is resolved lazily against the
// clock, so no timer exists.
const RAGE_DECAY_GRACE_MS = 5000;
const RAGE_DECAY_STEP_MS = 1000;

let _rage = 0;
let _rageDecayAt = 0;
// Tree line "Inherent loss of Rage is X% slower": stretches the 1s fade step.
let _rageDecayMult = 1;
// Sets how much slower Rage fades (1 or more).
export function _setRageDecayMult(mult) {
    _rageDecayMult = Math.max(1, Number(mult) || 1);
}

// Current Rage; one point fades per decay step.
export function _getRage() {
    const now = Date.now();
    while (_rage > 0 && now >= _rageDecayAt) {
        _rage -= 1;
        _rageDecayAt += RAGE_DECAY_STEP_MS * _rageDecayMult;
    }
    return _rage;
}

// Adds `amount` Rage up to `max` and restarts the grace timer. Returns the
// new count. Nothing is gained without a maximum (node not allocated).
export function _gainRage(amount, max) {
    const cap = Math.max(0, Math.floor(Number(max) || 0));
    if (cap <= 0) return _getRage();
    _rage = Math.min(cap, _getRage() + Math.max(0, Number(amount) || 0));
    _rageDecayAt = Date.now() + RAGE_DECAY_GRACE_MS;
    return _rage;
}

// The player being hit also restarts the grace timer (no gain).
export function _rageOnPlayerHit(gain = 0, max = 0) {
    if (gain > 0 && max > 0) _gainRage(gain, max);
    else if (_getRage() > 0) _rageDecayAt = Date.now() + RAGE_DECAY_GRACE_MS;
}

// Clears Rage.
export function _resetRage() {
    _rage = 0;
    _rageDecayAt = 0;
}

// Clears Endurance charges.
export function _resetEnduranceCharges() {
    _enduranceCharges = 0;
    _enduranceUntil = 0;
}

//------------------------------------------------------------------------
// Orb visual: one glowing orange ball per active charge, orbiting the
// player sprite. A single fixed overlay layer on <body> follows whichever
// avatar sprite is currently on screen (full or simple); a requestAnimation-
// Frame loop runs only while charges exist and removes the layer the frame
// after the last charge lapses. Purely cosmetic - it never writes state.
let _enduranceRaf = null;
let _enduranceLayer = null;

// Screen rectangle of the player sprite, used to place the Endurance orbs.
function _enduranceSpriteRect() {
    const ids = ['avatar-sprite-img', 'avatar-sprite-img-simple'];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return r;
    }
    return null;
}

// One animation frame of the Endurance orbs circling the player; removes them
// when there are no charges.
function _enduranceFrame(now) {
    _enduranceRaf = null;
    const count = _getEnduranceCharges();
    _syncChargeBuffChip('endurance', count, _enduranceMsLeft());
    if (count <= 0) {
        if (_enduranceLayer) { _enduranceLayer.remove(); _enduranceLayer = null; }
        return;
    }
    if (!_enduranceLayer || !_enduranceLayer.isConnected) {
        _enduranceLayer = document.createElement('div');
        _enduranceLayer.id = 'sx-endurance-orbs';
        _enduranceLayer.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:1001;pointer-events:none;';
        document.body.appendChild(_enduranceLayer);
    }
    while (_enduranceLayer.children.length < count) {
        const orb = document.createElement('div');
        orb.className = 'sx-endurance-orb';
        orb.style.cssText = 'position:absolute;width:16px;height:16px;border-radius:50%;'
            + 'background:radial-gradient(circle at 35% 30%,#ffe2a8 0%,#ff9b2f 45%,#c85a00 100%);'
            + 'box-shadow:0 0 8px 2px rgba(255,150,40,0.85);';
        _enduranceLayer.appendChild(orb);
    }
    while (_enduranceLayer.children.length > count) _enduranceLayer.lastElementChild.remove();

    const rect = _enduranceSpriteRect();
    const orbs = _enduranceLayer.children;
    for (let i = 0; i < orbs.length; i++) {
        if (!rect) { orbs[i].style.display = 'none'; continue; }
        const angle = now * 0.0022 + (i * 2 * Math.PI) / count;
        const rx = rect.width * 0.42;
        const ry = rect.height * 0.18;
        orbs[i].style.display = 'block';
        orbs[i].style.left = `${rect.left + rect.width / 2 + Math.cos(angle) * rx - 8}px`;
        orbs[i].style.top = `${rect.top + rect.height * 0.55 + Math.sin(angle) * ry - 8}px`;
    }
    _enduranceRaf = requestAnimationFrame(_enduranceFrame);
}

// Starts the orb animation loop if it is not running.
function _startEnduranceOrbs() {
    if (_enduranceRaf != null || typeof document === 'undefined'
        || typeof requestAnimationFrame !== 'function') return;
    _enduranceRaf = requestAnimationFrame(_enduranceFrame);
}

//------------------------------------------------------------------------
//-------------------POWER CHARGE ORBS------------------------------------
//------------------------------------------------------------------------
// Blue crackling orbs circling the player, one per live Power charge -
// the Endurance visual mirrored so a gained charge is actually visible.
// Wider orbit and opposite spin so both charge kinds read side by side.
// Frame loop runs only while charges exist and removes the layer the frame
// after the last charge lapses. Purely cosmetic - it never writes state.
let _powerRaf = null;
let _powerLayer = null;

// One animation frame of the Power orbs circling the player; removes them
// when there are no charges.
function _powerFrame(now) {
    _powerRaf = null;
    const count = _getPowerCharges();
    _syncChargeBuffChip('power', count, _powerMsLeft());
    if (count <= 0) {
        if (_powerLayer) { _powerLayer.remove(); _powerLayer = null; }
        return;
    }
    if (!_powerLayer || !_powerLayer.isConnected) {
        _powerLayer = document.createElement('div');
        _powerLayer.id = 'sx-power-orbs';
        _powerLayer.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:1001;pointer-events:none;';
        document.body.appendChild(_powerLayer);
    }
    while (_powerLayer.children.length < count) {
        const orb = document.createElement('div');
        orb.className = 'sx-power-orb';
        orb.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;'
            + 'background:radial-gradient(circle at 35% 30%,#e8f4ff 0%,#5aa2ff 45%,#1e40af 100%);'
            + 'box-shadow:0 0 8px 2px rgba(90,162,255,0.9);';
        _powerLayer.appendChild(orb);
    }
    while (_powerLayer.children.length > count) _powerLayer.lastElementChild.remove();

    const rect = _enduranceSpriteRect();
    const orbs = _powerLayer.children;
    for (let i = 0; i < orbs.length; i++) {
        if (!rect) { orbs[i].style.display = 'none'; continue; }
        const angle = -now * 0.0028 + (i * 2 * Math.PI) / count;
        const rx = rect.width * 0.55;
        const ry = rect.height * 0.28;
        orbs[i].style.display = 'block';
        orbs[i].style.left = `${rect.left + rect.width / 2 + Math.cos(angle) * rx - 7}px`;
        orbs[i].style.top = `${rect.top + rect.height * 0.5 + Math.sin(angle) * ry - 7}px`;
    }
    _powerRaf = requestAnimationFrame(_powerFrame);
}

// Starts the orb animation loop if it is not running.
function _startPowerOrbs() {
    if (_powerRaf != null || typeof document === 'undefined'
        || typeof requestAnimationFrame !== 'function') return;
    _powerRaf = requestAnimationFrame(_powerFrame);
}

//------------------------------------------------------------------------
//-------------------FRENZY CHARGE ORBS-----------------------------------
//------------------------------------------------------------------------
// Green crackling orbs circling the player, one per live Frenzy charge -
// the same mirror as Power and Endurance so a gained charge is visible.
// Tightest orbit and fastest spin so all three charge kinds read apart.
// Frame loop runs only while charges exist and removes the layer the frame
// after the last charge lapses. Purely cosmetic - it never writes state.
let _frenzyRaf = null;
let _frenzyLayer = null;

// One animation frame of the Frenzy orbs circling the player; removes them
// when there are no charges.
function _frenzyFrame(now) {
    _frenzyRaf = null;
    const count = _getFrenzyCharges();
    _syncChargeBuffChip('frenzy', count, _frenzyMsLeft());
    if (count <= 0) {
        if (_frenzyLayer) { _frenzyLayer.remove(); _frenzyLayer = null; }
        return;
    }
    if (!_frenzyLayer || !_frenzyLayer.isConnected) {
        _frenzyLayer = document.createElement('div');
        _frenzyLayer.id = 'sx-frenzy-orbs';
        _frenzyLayer.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;z-index:1001;pointer-events:none;';
        document.body.appendChild(_frenzyLayer);
    }
    while (_frenzyLayer.children.length < count) {
        const orb = document.createElement('div');
        orb.className = 'sx-frenzy-orb';
        orb.style.cssText = 'position:absolute;width:12px;height:12px;border-radius:50%;'
            + 'background:radial-gradient(circle at 35% 30%,#ecfdf5 0%,#4ade80 45%,#166534 100%);'
            + 'box-shadow:0 0 8px 2px rgba(74,222,128,0.9);';
        _frenzyLayer.appendChild(orb);
    }
    while (_frenzyLayer.children.length > count) _frenzyLayer.lastElementChild.remove();

    const rect = _enduranceSpriteRect();
    const orbs = _frenzyLayer.children;
    for (let i = 0; i < orbs.length; i++) {
        if (!rect) { orbs[i].style.display = 'none'; continue; }
        const angle = now * 0.0035 + Math.PI / 3 + (i * 2 * Math.PI) / count;
        const rx = rect.width * 0.34;
        const ry = rect.height * 0.38;
        orbs[i].style.display = 'block';
        orbs[i].style.left = `${rect.left + rect.width / 2 + Math.cos(angle) * rx - 6}px`;
        orbs[i].style.top = `${rect.top + rect.height * 0.45 + Math.sin(angle) * ry - 6}px`;
    }
    _frenzyRaf = requestAnimationFrame(_frenzyFrame);
}

// Starts the orb animation loop if it is not running.
function _startFrenzyOrbs() {
    if (_frenzyRaf != null || typeof document === 'undefined'
        || typeof requestAnimationFrame !== 'function') return;
    _frenzyRaf = requestAnimationFrame(_frenzyFrame);
}

//------------------------------------------------------------------------
//-------------------CHARGE BUFF BAR--------------------------------------
//------------------------------------------------------------------------
// WoW-style buff chips above the spell hotbar: one chip per live charge
// kind (Endurance / Power / Frenzy) showing the stack count and a live
// seconds countdown. Each orb frame loop above syncs its own kind's chip,
// so chips appear and vanish together with the charges and need no ticker
// of their own. The bar is a child of #skill-hotbar, so it follows the bar
// when the bar re-homes (spell book, passive tree) and hides with it under
// question modals. Purely cosmetic - it never writes state.
const _BUFF_CHIP_DEFS = {
    endurance: { nameKey: 'eg_stat_endurance_charges', descKey: 'eg_statdesc_enduranceCharges' },
    power: { nameKey: 'eg_stat_power_charges', descKey: 'eg_statdesc_powerCharges' },
    frenzy: { nameKey: 'eg_stat_frenzy_charges', descKey: 'eg_statdesc_frenzyCharges' },
};
const _buffChipShown = {};

// Remaining shared-timer milliseconds for a charge kind (0 when none live).
function _enduranceMsLeft() {
    return _getEnduranceCharges() > 0 ? Math.max(0, _enduranceUntil - Date.now()) : 0;
}

// Remaining shared-timer milliseconds for a charge kind (0 when none live).
function _frenzyMsLeft() {
    return _getFrenzyCharges() > 0 ? Math.max(0, _frenzyUntil - Date.now()) : 0;
}

// Remaining shared-timer milliseconds for a charge kind (0 when none live).
function _powerMsLeft() {
    return _getPowerCharges() > 0 ? Math.max(0, _powerUntil - Date.now()) : 0;
}

// Syncs one buff chip with the live count and countdown. Called every orb
// frame; only touches the DOM when the displayed second or count changed.
function _syncChargeBuffChip(kind, count, msLeft) {
    const def = _BUFF_CHIP_DEFS[kind];
    const tip = `<div class="sx-ttl-tip sx-hud-tip"><div class="sx-ttl-tip-title">${t(def.nameKey)} x${count}</div>${t(def.descKey)}</div>`;
    _syncBuffBarChip(`sx-buff-${kind}`, {
        chipClass: `sx-buff-chip sx-buff-${kind}`,
        iconHtml: '<span class="sx-buff-dot"></span>',
        labelText: t(def.nameKey),
        stacksText: count > 0 ? `x${count}` : '',
        msLeft: count > 0 ? msLeft : 0,
        tipHtml: tip,
    });
}

// Generic buff-bar chip behind the charge wrapper above and the support
// spell buffs (synced from the universal-spell sweep). `id` is the chip's
// DOM id; `opts` carries the chip class, the leading icon/dot markup, the
// stack count text, the remaining milliseconds (drives the countdown and
// removes the chip at zero), and the already-translated tooltip HTML.
// No-ops without a DOM or a hotbar; only touches the DOM when the
// displayed content changed or its node went missing. Exported so the
// spell buff registry in
// universal-spells.js can share the one buff bar.
export function _syncBuffBarChip(id, opts) {
    if (typeof document === 'undefined') return;
    const o = opts || {};
    const msLeft = Math.max(0, Number(o.msLeft) || 0);
    const secs = msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
    const sig = `${o.iconHtml || ''}|${o.labelText || ''}|${o.stacksText || ''}|${secs}|${o.tipHtml || ''}`;
    // A matching signature alone is not enough: the hotbar rebuild wipes its
    // children (see renderSkillHotbar), dropping the node while the cache
    // still matches. The chip must exist too, or it is rebuilt here.
    let chip = document.getElementById(id);
    if (_buffChipShown[id] === sig && chip) return;
    _buffChipShown[id] = sig;
    if (msLeft <= 0) {
        if (chip) chip.remove();
        return;
    }
    if (!chip) {
        let bar = document.getElementById('sx-buff-bar');
        if (!bar) {
            const hotbar = document.getElementById('skill-hotbar');
            if (!hotbar) return;
            bar = document.createElement('div');
            bar.id = 'sx-buff-bar';
            hotbar.insertBefore(bar, hotbar.firstChild);
        }
        chip = document.createElement('div');
        chip.id = id;
        chip.className = o.chipClass || 'sx-buff-chip';
        chip.innerHTML = '<span class="sx-buff-icon"></span>'
            + '<span class="sx-buff-stacks"></span>'
            + '<span class="sx-buff-secs"></span>'
            + '<span class="sx-buff-label"></span>';
        bar.appendChild(chip);
    }
    // data-tip holds ready-made HTML (rendered via innerHTML by the tooltip
    // engine); setAttribute needs no quote escaping, so store it raw.
    chip.setAttribute('data-tip', o.tipHtml || '');
    chip.children[0].innerHTML = o.iconHtml || '';
    chip.children[1].textContent = o.stacksText || '';
    chip.children[2].textContent = `${secs}s`;
    chip.children[3].textContent = o.labelText || '';
}

// Removes one buff-bar chip by id (spell buff expiry / encounter cleanup).
// No-ops without a DOM.
export function _removeBuffBarChip(id) {
    if (typeof document === 'undefined') return;
    delete _buffChipShown[id];
    const chip = document.getElementById(id);
    if (chip) chip.remove();
}
