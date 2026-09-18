import { _trackTimerDelta, updTimer } from '../timer.js';

//------------------------------------------------------------------------
//-------------------SHARED - TIMER ADJUST---------------------------------
//------------------------------------------------------------------------

// Single primitive for every change to the game timer. All systems that
// add, subtract or hard-set timerSecs route through these helpers so the
// zero floor / 1-hour cap, the level time-added/lost bookkeeping
// (_trackTimerDelta) and the HUD refresh are applied identically
// everywhere. Pure plumbing only - passives, keystones and map
// multipliers stay at the call sites.

// Shared impl: applies a signed delta to the timer, records the real
// before/after change and refreshes the HUD. Returns the new timer value.
function _applyTimerDelta(deltaSecs, opts) {
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
// starts at 0 and the exact value matters.
export function addTimeSecs(deltaSecs, opts = {}) {
    const o = { floor0: true, capSecs: null, ...opts };
    return _applyTimerDelta(deltaSecs, o);
}

// Subtracts seconds from the timer. Always clamps at zero (a penalty can
// never leave the timer negative); pass capSecs to also cap the total.
export function subtractTimeSecs(deltaSecs, opts = {}) {
    const o = { floor0: true, capSecs: null, ...opts };
    return _applyTimerDelta(-Math.abs(deltaSecs), o);
}

// Hard-sets the timer to an absolute value (Shadow Seal's fixed 5-minute
// timer, level-start setup). Clamps like addTimeSecs.
export function setTimeSecs(targetSecs, opts = {}) {
    const o = { floor0: true, capSecs: null, ...opts };
    return _applyTimerSet(targetSecs, o);
}
