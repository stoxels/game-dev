//-----------------------------------------------------------------------------
// storyline-progress.js - per-save "already seen" state, replay-gallery
// unlocks, and reset helpers for the storyline family.
//
// Split out of storyline-engine.js (2026-09-17): persistence/progress is a
// separate responsibility from playback machinery. showBeat() (in the
// engine) consults hasSeen()/markSeen() here; save-reset.js, dev-testing.js
// and character-select.js call the reset/unlock helpers directly.
//-----------------------------------------------------------------------------

import { getActiveSlot } from '../state.js';
import { REPLAY_GALLERY_ENTRIES } from './storyline-beats.js';

// ---------------------------------------------------------------------------
// SEEN-STATE - uses localStorage so beats only show once per save
// ---------------------------------------------------------------------------

export function _seenKey(beatId, options = {}) {
    const suffix = options.character ? `_${options.character}`
        : options.className ? `_${options.className}`
            : options.ascendencyClass ? `_${options.ascendencyClass}` : '';
    const slot = (typeof getActiveSlot === 'function' ? getActiveSlot() : null) || 1;
    return `storyline_seen_slot${slot}_${beatId}${suffix}`;
}

export function hasSeen(beatId, options = {}) {
    try {
        return localStorage.getItem(_seenKey(beatId, options)) === '1';
    } catch (e) {
        return false;
    }
}

export function markSeen(beatId, options = {}) {
    try {
        localStorage.setItem(_seenKey(beatId, options), '1');
    } catch (e) { /* storage unavailable */ }
}

// ---------------------------------------------------------------------------
// GLOBAL REPLAY UNLOCKS - persist independently of the save slots. Intro
// cutscenes unlock forever once the player starts a game with any character;
// keys use the `replay_unlocked_` prefix (not `storyline_seen_`) so resets
// never touch them. Region beats stay tied to per-save seen-state.
// ---------------------------------------------------------------------------

export function _replayGlobalKey(entryId) {
    return `replay_unlocked_${entryId}`;
}

export function _isReplayGloballyUnlocked(entryId) {
    try {
        return localStorage.getItem(_replayGlobalKey(entryId)) === '1';
    } catch (e) {
        return false;
    }
}

export function _setReplayGloballyUnlocked(entryId) {
    try {
        localStorage.setItem(_replayGlobalKey(entryId), '1');
    } catch (e) { /* storage unavailable */ }
}

// isReplayEntryUnlocked - replayable when flagged globalUnlock (always
// available), OR carrying a persisted global unlock flag, OR seen in the
// current save. Intro cutscenes short-circuit to true (meant to be forever).
export function isReplayEntryUnlocked(entry) {
    if (!entry) return false;
    if (entry.globalUnlock) return true;
    if (entry.id && _isReplayGloballyUnlocked(entry.id)) return true;
    return hasSeen(entry.beatId, entry.options || {});
}

// unlockReplayIntroBundle - called when the player confirms any character on
// the start-of-game character select. Unlocks every gallery entry flagged
// `globalUnlock` (the opening cinematic + the three character intros) for
// good, across all save slots.
export function unlockReplayIntroBundle() {
    if (typeof REPLAY_GALLERY_ENTRIES === 'undefined') return;
    REPLAY_GALLERY_ENTRIES
        .filter(entry => entry.globalUnlock && entry.id)
        .forEach(entry => _setReplayGloballyUnlocked(entry.id));
}

// getUnlockedReplayEntries - subset of REPLAY_GALLERY_ENTRIES (storyline-beats.js)
// the player can replay. Used by the title screen's Replay panel.
export function getUnlockedReplayEntries() {
    if (typeof REPLAY_GALLERY_ENTRIES === 'undefined') return [];
    return REPLAY_GALLERY_ENTRIES.filter(entry => isReplayEntryUnlocked(entry));
}



// Allow resetting a specific beat (useful for testing)
export function resetBeat(beatId, options = {}) {
    try {
        localStorage.removeItem(_seenKey(beatId, options));
    } catch (e) { /* noop */ }
}

// Reset all story beats at once (e.g. new game)
export function resetAllBeats() {
    try {
        Object.keys(localStorage)
            .filter(k => k.startsWith('storyline_seen_'))
            .forEach(k => localStorage.removeItem(k));
    } catch (e) { /* noop */ }
}

export function resetAllBeatsForSlot(slotNum) {
    try {
        Object.keys(localStorage)
            .filter(k => k.startsWith(`storyline_seen_slot${slotNum}_`))
            .forEach(k => localStorage.removeItem(k));
    } catch (e) { }
}
