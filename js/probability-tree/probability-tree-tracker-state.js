//------------------------------------------------------------------------
//-------------------TRACKER STATE & HELPERS------------------------------
//------------------------------------------------------------------------
// Constants, the per-level counters and small formatting helpers shared by the
// tracker panel and its row definitions.
//------------------------------------------------------------------------

import { ptHasSkill } from './probability-tree-state-points.js';

//------------------------------------------------------------------------
//-------------------CONSTANTS & CONFIGURATION----------------------------
//------------------------------------------------------------------------

// Default intervals (in seconds) used to initialise timers at level start.
// These match the values defined in the passive skill tree.
export const INTERVAL_RANDOM_WALK = 30;
const INTERVAL_POISSON_SLOW = 120;   // poisson_process_1 only
const INTERVAL_POISSON_MED = 90;    // poisson_process_2
const INTERVAL_POISSON_FAST = 60;    // poisson_process_3
export const INTERVAL_TIMED_STASIS = 600;   // 10 minutes
export const INTERVAL_LOLN = 300;   // Law of Large Numbers, 5 minutes

// Panel default spawn position (pixels from top-left).
// The panel will be placed higher than the very bottom edge.
export const PANEL_DEFAULT_LEFT = 20;
export const PANEL_DEFAULT_BOTTOM_OFFSET = 400;  // window.innerHeight - this value

// localStorage key used to persist the panel's drag position.
export const STORAGE_KEY_POS = 'pt_tracker_pos';

// Minimum panel size assumed when clamping saved position to viewport.
export const PANEL_MIN_WIDTH = 240;
export const PANEL_MIN_HEIGHT = 80;

//------------------------------------------------------------------------
//-------------------MODULE STATE-----------------------------------------
//------------------------------------------------------------------------

// Per-level runtime counters. These are reset on each call to init() and
// updated by the public event hooks (onCorrectFill, onMistake, etc.).
export const _state = {
    // Countdown timers - seconds remaining until the next automatic trigger.
    randomWalkTimer: 0,
    poissonTimer: 0,
    timedStasisTimer: 0,
    lawOfLargeNumbersTimer: 0,

    // Fill counters - cumulative or streak counts that drive passive effects.
    binomialBurstFills: 0,   // total correct fills; checked mod 10 for burst
    streakBonusFills: 0,   // consecutive correct fills; resets on mistake
    sampleEffFills: 0,   // consecutive correct fills; resets on mistake
    gamblersFills: 0,   // total correct fills since level start
    errorFeedbackMistakes: 0, // total mistakes; checked mod threshold

    // Stacked bonuses - accumulate over time and reset when they trigger.
    bayesianBonus: 0,   // current stacked bayesian bonus percentage
    asymptoticReductions: 0,  // completed lines count (synced from window global)

    // Cached interval for poisson, computed from which tier is active.
    poissonInterval: INTERVAL_POISSON_SLOW,
};

//------------------------------------------------------------------------
//-------------------UTILITY HELPERS--------------------------------------
//------------------------------------------------------------------------

// Formats a raw second count into a human-readable string.
// Values under 60 seconds: "42s". Values 60+: "1:05".
export function _formatSeconds(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return minutes > 0
        ? `${minutes}:${String(seconds).padStart(2, '0')}`
        : `${seconds}s`;
}

// Clamps a number between min and max (inclusive).
export function _clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

// Converts a current/max pair to a 0–100 percentage, safe against max=0.
export function _toPercent(current, max) {
    return max > 0 ? _clamp((current / max) * 100, 0, 100) : 0;
}

// Returns the correct Poisson interval based on which tier is unlocked.
export function _getPoissonInterval() {
    if (ptHasSkill('poisson_process_3')) return INTERVAL_POISSON_FAST;
    if (ptHasSkill('poisson_process_2')) return INTERVAL_POISSON_MED;
    return INTERVAL_POISSON_SLOW;
}

