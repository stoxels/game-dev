//------------------------------------------------------------------------
//----------------------------RESET---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Removes the persisted save from localStorage � targets ONLY the
// currently active save slot. Achievements (ACH_SAVE_KEY, achievements.js)
// and all other save slots are untouched.
function wipeSaveData() {
    const slot = (typeof getActiveSlot === 'function' ? getActiveSlot() : null) || 1;
    if (typeof wipeSlot === 'function') wipeSlot(slot);
}

// Triggered when the player confirms the #reset-modal. Dispatches to one of
// two flows depending on how the modal was opened:
//  - From the save-slot grid's per-card delete button → wipe ONLY that slot
//    and stay on the save-slot screen (see showDeleteSlotConfirm(), in
//    screens-save-slots.js, which sets window._pendingResetSlot).
//  - From the title screen's Reset button → full reset of the active slot,
//    same behaviour as before.
function confirmReset() {
    if (window._pendingResetSlot) {
        confirmSlotDelete(window._pendingResetSlot);
        return;
    }
    confirmFullReset();
}

// Wipes a single, specific save slot (not necessarily the active one) and
// returns to the save-slot select screen so the grid reflects the deletion.
function confirmSlotDelete(slotNum) {
    hideModal('reset-modal');
    window._pendingResetSlot = null;
    wipeSlot(slotNum);
    renderSaveSlotScreen();
    showToast(t('toast_reset'));
}

// Full reset of the currently active slot — closes the modal, wipes the
// active slot's save, rebuilds a blank STATE using the same fresh-state
// shape as a brand-new save file, persists it back into that slot, then
// returns to the title screen with a confirmation toast.
function confirmFullReset() {
    hideModal('reset-modal');
    wipeSaveData();
    resetAllBeats();
    STATE = buildFreshState();
    save(); // writes the blank state back into the active slot
    showTitle();
    showToast(t('toast_reset'));
}