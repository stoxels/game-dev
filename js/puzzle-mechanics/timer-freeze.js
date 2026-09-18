import { playFreezeCountdownOverlay } from './fx-helpers.js';

//------------------------------------------------------------------------
//-------------------SHARED - TIMER FREEZE---------------------------------
//------------------------------------------------------------------------

// Single primitive for every time-freeze effect (Freeze item, Absolute
// Zero, Timed Stasis, passive-tree freezes, the Clock boss's Time Freeze).
// Owns the timerFrozen flag (stops the timer tick loop), the optional icy
// countdown overlay and the Clock-guarded release: the Clock boss's Time
// Freeze pins the timer for its whole 30 s window, so a shorter freeze
// must never cut it short. The freezeActive flag is NOT owned here by
// default - it gates Mathmagician-specific fill/penalty intercepts, so
// only callers that carry that meaning pass freezeActive:true.
// Overlapping freezes: each new start cancels the previous release timer,
// so the latest freeze always runs its full duration (last-writer-wins).
// The Clock boss passes hold:true: it sets the flags through this
// primitive but releases them itself via endTimerFreeze() when its own
// pause-aware boss-loop countdown expires - a real-time setTimeout here
// would wrongly keep ticking through Escape-pause and mid-freeze arena
// transitions. It drops its _egClockTimeFreezeActive guard flag BEFORE
// calling endTimerFreeze, which is what lets the guard below release.
// Reads updTimer via the globalThis bridge: timer.js calls into this
// module for Timed Stasis, so a static import back would create a cycle.

// Release timer handle for the currently running freeze.
let _freezeReleaseTimer = null;

// Whether the running freeze set the freezeActive flag (only then does
// the release clear it, so caller-owned flags are never stomped).
let _ownsFreezeActive = false;

// Starts a freeze: sets timerFrozen (and optionally freezeActive), shows
// the icy countdown overlay on the puzzle grid, and schedules the
// Clock-guarded release after durationMs. opts:
//   overlay     - show the shared freeze countdown overlay (default true)
//   freezeActive- also set window._freezeActive (item / Mathmagician only)
//   hold        - no scheduled release; the caller (Clock boss) ends the
//                 freeze itself via endTimerFreeze() on its pause-aware loop
//   onEnd       - called once when the scheduled release fires (caller
//                 extras like shield clears or end toasts live here)
export function startTimerFreeze(durationMs, opts = {}) {
    const o = { overlay: true, freezeActive: false, hold: false, onEnd: null, ...opts };

    if (_freezeReleaseTimer) {
        clearTimeout(_freezeReleaseTimer);
        _freezeReleaseTimer = null;
    }

    globalThis.timerFrozen = true;
    _ownsFreezeActive = o.freezeActive;
    if (o.freezeActive) window._freezeActive = true;

    if (o.overlay && typeof playFreezeCountdownOverlay === 'function') {
        playFreezeCountdownOverlay(durationMs);
    }
    if (typeof globalThis.updTimer === 'function') globalThis.updTimer();

    // Hold mode: the caller owns the release clock (Clock boss runs its
    // countdown on the pause-aware nk loop) - just leave the flags pinned.
    if (o.hold) return;

    _freezeReleaseTimer = setTimeout(() => {
        _freezeReleaseTimer = null;
        const onEnd = o.onEnd;
        endTimerFreeze();
        if (typeof onEnd === 'function') onEnd();
    }, durationMs);
}

// Ends the active freeze early (e.g. the Mathmagician's explicit cleanup,
// or the Clock boss releasing its hold when its countdown expires).
// Clock-guarded: leaves timerFrozen pinned while the Clock's Time Freeze
// runs (the boss drops its guard flag before calling this), but always
// drops freezeActive ownership so fill intercepts release.
export function endTimerFreeze() {
    if (_freezeReleaseTimer) {
        clearTimeout(_freezeReleaseTimer);
        _freezeReleaseTimer = null;
    }
    if (typeof window === 'undefined' || !window._egClockTimeFreezeActive) {
        globalThis.timerFrozen = false;
    }
    if (_ownsFreezeActive) {
        window._freezeActive = false;
        _ownsFreezeActive = false;
    }
    if (typeof globalThis.updTimer === 'function') globalThis.updTimer();
}
