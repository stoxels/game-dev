import { playFreezeCountdownOverlay } from './fx-helpers.js';

//------------------------------------------------------------------------
//-------------------SHARED - TIMER FREEZE---------------------------------
//------------------------------------------------------------------------

// Single primitive for every time-freeze effect (Freeze item, Absolute
// Zero, Timed Stasis, passive-tree freezes). Owns the timerFrozen flag
// (stops the timer tick loop), the optional icy countdown overlay and the
// Clock-guarded release: the Clock boss's Time Freeze pins the timer for
// its whole 30 s window, so a shorter freeze must never cut it short.
// The freezeActive flag is NOT owned here by default - it gates
// Mathmagician-specific fill/penalty intercepts, so only callers that
// carry that meaning pass freezeActive:true. Overlapping freezes: each
// new start cancels the previous release timer, so the latest freeze
// always runs its full duration (last-writer-wins). Reads updTimer via
// the globalThis bridge: timer.js calls into this module for Timed
// Stasis, so a static import back would create a cycle.

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
//   onEnd       - called once when the scheduled release fires (caller
//                 extras like shield clears or end toasts live here)
export function startTimerFreeze(durationMs, opts = {}) {
    const o = { overlay: true, freezeActive: false, onEnd: null, ...opts };

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

    _freezeReleaseTimer = setTimeout(() => {
        _freezeReleaseTimer = null;
        const onEnd = o.onEnd;
        endTimerFreeze();
        if (typeof onEnd === 'function') onEnd();
    }, durationMs);
}

// Ends the active freeze early (e.g. the Mathmagician's explicit cleanup).
// Clock-guarded: leaves timerFrozen pinned while the Clock's Time Freeze
// runs, but always drops freezeActive ownership so fill intercepts release.
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
