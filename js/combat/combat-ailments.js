//------------------------------------------------------------------------
//-------------------COMBAT AILMENTS LIFECYCLE FACADE--------------------
//------------------------------------------------------------------------
// Combat status, puzzle ailments, and shared state now live in focused
// sibling modules; this path keeps the encounter reset/cleanup API.

import { _hideBlockLockoutOverlay } from './encounter-monster-attack-feedback.js';
import { _resetAilmentCounters, _resetPlayerStatuses } from './combat-ailments-state.js';
import { _stopPlayerStatusBarTicker } from './combat-ailments-core.js';
import { _clearAllPuzzleEffects, _stopShockedCursor } from './combat-ailments-puzzle.js';

// Full reset - called when a fresh encounter starts.
export function _ailmentsReset() {
    _resetPlayerStatuses();
    _clearAllPuzzleEffects();
    _resetAilmentCounters();
    _stopShockedCursor();
    _stopPlayerStatusBarTicker();
    _hideBlockLockoutOverlay();
    const strip = document.getElementById('eg-player-status-strip');
    if (strip) strip.remove();
}

// Cleanup - called when the encounter stops (also covers game over).
export function _ailmentsCleanup() {
    _resetPlayerStatuses();
    _clearAllPuzzleEffects();
    _resetAilmentCounters();
    _stopShockedCursor();
    _stopPlayerStatusBarTicker();
    _hideBlockLockoutOverlay();
    const strip = document.getElementById('eg-player-status-strip');
    if (strip) strip.remove();
}
