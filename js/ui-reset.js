import { _egLoadLevelingState } from './endgame/endgame-leveling.js';
import { showToast } from './puzzle-items/toasts-and-popups.js';
import { renderSaveSlotScreen } from './screens/screens-save-slots.js';
import { hideModal, showTitle } from './screens/screens.js';
import { buildFreshState, getActiveSlot, save, wipeSlot } from './state.js';
import { resetAllBeats } from './storyline/storyline-engine.js';
import { t } from './translation/translations.js';

//------------------------------------------------------------------------
//-------------------SAVE WIPE HELPER--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Removes the persisted save from localStorage - targets ONLY the
// currently active save slot. Achievements (ACH_SAVE_KEY, achievements.js)
// and all other save slots are untouched.
export function wipeSaveData() {
    const slot = (typeof getActiveSlot === 'function' ? getActiveSlot() : null) || 1;
    if (typeof wipeSlot === 'function') wipeSlot(slot);
}

//------------------------------------------------------------------------
//-------------------RESET FLOWS--------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Wipes a single, specific save slot (not necessarily the active one) and
// returns to the save-slot select screen so the grid reflects the deletion.
export function confirmSlotDelete(slotNum) {
    hideModal('reset-modal');
    window._pendingResetSlot = null;
    wipeSlot(slotNum);
    renderSaveSlotScreen();
    showToast(t('toast_reset'));
}

// Full reset of the currently active slot - closes the modal, wipes the
// active slot's save, rebuilds a blank STATE using the same fresh-state
// shape as a brand-new save file, persists it back into that slot, then
// returns to the title screen with a confirmation toast.
export function confirmFullReset() {
    hideModal('reset-modal');
    wipeSaveData();
    resetAllBeats();
    globalThis.STATE = buildFreshState();
    if (typeof _egLoadLevelingState === 'function') _egLoadLevelingState(); // re-sync endgame leveling
    save(); // writes the blank state back into the active slot
    showTitle();
    showToast(t('toast_reset'));
}

//------------------------------------------------------------------------
//-------------------MAIN ENTRY POINT---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Triggered when the player confirms the #reset-modal. Dispatches to one of
// two flows depending on how the modal was opened:
//  - From the save-slot grid's per-card delete button → wipe ONLY that slot
//    and stay on the save-slot screen (see showDeleteSlotConfirm(), in
//    screens-save-slots.js, which sets window._pendingResetSlot).
//  - From the title screen's Reset button → full reset of the active slot,
//    same behaviour as before.
export function confirmReset() {
    if (window._pendingResetSlot) {
        confirmSlotDelete(window._pendingResetSlot);
        return;
    }
    confirmFullReset();
}