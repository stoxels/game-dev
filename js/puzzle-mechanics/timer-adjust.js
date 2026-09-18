import { _trackTimerDelta, updTimer } from '../timer.js';

//------------------------------------------------------------------------
//-------------------SHARED - TIMER ADJUST---------------------------------
//------------------------------------------------------------------------

// Single primitive for every change to the game timer. All systems that
// add, subtract or hard-set timerSecs route through these helpers so the
// zero floor / 1-hour cap, the level time-added/lost bookkeeping
// (_trackTimerDelta) and the HUD refresh are applied identically
// everywhere. Passives and keystones stay at the call sites - but the
// active map-run modifier "% less Time gained" is applied HERE, once, to
// every gain (positive addTimeSecs delta), so no gain site can forget it
// or double-apply it. Subtractions (penalties) and hard sets (Shadow
// Seal's fixed timer contract) are never scaled.

// Reads the active map run's "% less Time gained from Item and Ability
// effects" multiplier via the globalThis bridge - a static import of
// endgame-map-launch.js from puzzle-mechanics would drag the whole
// endgame graph onto the main game path. Returns 1 when no run is active
// or the bridge is absent, so non-map play is untouched.
function _mapGainMult() {
    if (typeof globalThis._egMapTimeGainMult !== 'function') return 1;
    const m = globalThis._egMapTimeGainMult();
    return (typeof m === 'number' && isFinite(m) && m > 0) ? m : 1;
}

// Preview: the scaled amount a positive gain would actually land as.
// For call sites that DISPLAY the gain (toasts, floating +Xs) or feed
// achievement stats - pass the base, show the scaled value, then hand
// the same base to addTimeSecs so the scaling happens exactly once.
export function previewGainSecs(deltaSecs) {
    return deltaSecs > 0 ? Math.round(deltaSecs * _mapGainMult()) : deltaSecs;
}

// Shared impl: applies a signed delta to the timer, records the real
// before/after change and refreshes the HUD. Gains (positive deltas) are
// scaled by the map modifier here - the single place it exists. Returns
// the new timer value.
function _applyTimerDelta(deltaSecs, opts) {
    if (deltaSecs > 0) deltaSecs = Math.round(deltaSecs * _mapGainMult());
    const current = globalThis.timerSecs;
    let next = current + deltaSecs;
    if (opts.capSecs !== null) next = Math.min(next, opts.capSecs);
    if (opts.floor0) next = Math.max(0, next);
    globalThis.timerSecs = next;
    _trackTimerDelta(current, next);
    updTimer();
    return next;
}

// Shared impl: hard-sets the timer to an absolute value, records the real
// before/after change and refreshes the HUD. Returns the new timer value.
function _applyTimerSet(targetSecs, opts) {
    let next = targetSecs;
    if (opts.capSecs !== null) next = Math.min(next, opts.capSecs);
    if (opts.floor0) next = Math.max(0, next);
    const current = globalThis.timerSecs;
    globalThis.timerSecs = next;
    _trackTimerDelta(current, next);
    updTimer();
    return next;
}

// Adds seconds to the timer. Default behaviour clamps at zero from below
// (floor0) - pass capSecs to also cap the total (e.g. the class-ability
// 3600 cap); pass floor0:false for level-start plumbing where the timer
// starts at 0 and the exact value matters. Gains are scaled by the
// active map's "% less Time gained" modifier here (see header); pass
// raw:true for bookkeeping-shaped adds that must not scale (level-start
// bonuses, gear time_added).
export function addTimeSecs(deltaSecs, opts = {}) {
    const o = { floor0: true, capSecs: null, raw: false, ...opts };
    if (o.raw) {
        const current = globalThis.timerSecs;
        let next = current + deltaSecs;
        if (o.capSecs !== null) next = Math.min(next, o.capSecs);
        if (o.floor0) next = Math.max(0, next);
        globalThis.timerSecs = next;
        _trackTimerDelta(current, next);
        updTimer();
        return next;
    }
    return _applyTimerDelta(deltaSecs, o);
}

// Subtracts seconds from the timer. Always clamps at zero (a penalty can
// never leave the timer negative); pass capSecs to also cap the total.
export function subtractTimeSecs(deltaSecs, opts = {}) {
    const o = { floor0: true, capSecs: null, ...opts };
    return _applyTimerDelta(-Math.abs(deltaSecs), o);
}

// Hard-sets the timer to an absolute value (Shadow Seal's fixed 5-minute
// timer, level-start setup). Clamps like addTimeSecs. Never scaled by the
// map gain modifier - a hard set is a contract ("this timer IS 300s"),
// not a gain.
export function setTimeSecs(targetSecs, opts = {}) {
    const o = { floor0: true, capSecs: null, ...opts };
    return _applyTimerSet(targetSecs, o);
}
