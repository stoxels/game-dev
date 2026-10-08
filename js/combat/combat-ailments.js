//------------------------------------------------------------------------
//-------------------COMBAT AILMENTS LIFECYCLE FACADE--------------------
//------------------------------------------------------------------------
// Combat status, puzzle ailments, and shared state now live in focused
// sibling modules; this path keeps the encounter reset/cleanup API.

import { _egHideBlockLockoutOverlay } from './encounter-monster-attack-feedback.js';
import { _egResetAilmentCounters, _egResetPlayerStatuses } from './combat-ailments-state.js';
import { _egStopPlayerStatusBarTicker } from './combat-ailments-core.js';
import { _egClearAllPuzzleEffects, _egStopShockedCursor } from './combat-ailments-puzzle.js';

// Full reset - called when a fresh encounter starts.
export function _egAilmentsReset() {
    _egResetPlayerStatuses();
    _egClearAllPuzzleEffects();
    _egResetAilmentCounters();
    _egStopShockedCursor();
    _egStopPlayerStatusBarTicker();
    _egHideBlockLockoutOverlay();
    const strip = document.getElementById('eg-player-status-strip');
    if (strip) strip.remove();
}

// Cleanup - called when the encounter stops (also covers game over).
export function _egAilmentsCleanup() {
    _egResetPlayerStatuses();
    _egClearAllPuzzleEffects();
    _egResetAilmentCounters();
    _egStopShockedCursor();
    _egStopPlayerStatusBarTicker();
    _egHideBlockLockoutOverlay();
    const strip = document.getElementById('eg-player-status-strip');
    if (strip) strip.remove();
}
