//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps a saved playerCharacter id to its portrait image, mirroring whatever
// mapping is used to populate #setup-char-portrait on the Game Setup screen.
// NOTE: adjust these paths/ids if your character-select code uses different
// keys or a different image folder — this is a best-effort match based on
// the naming convention seen elsewhere (images/Game_Setup/...).
const CHAR_PORTRAIT_SRC = {
    stox: 'images/sprites/Stox_noclass.png',
    trix: 'images/sprites/Trix_noclass.png',
    syla: 'images/sprites/Syla_noclass.png',
};

// window._pendingSaveSlotCallback — callback to resume the normal
// intro/tutorial/character-select flow once a slot is chosen. Set in
// showSaveSlotSelect(), consumed and cleared in onSaveSlotChosen().
//
// window._pendingResetSlot — slot number awaiting delete confirmation. Set
// in showDeleteSlotConfirm(), read by confirmReset() in ui-reset.js to
// decide whether to wipe just this slot or perform a full reset.

//------------------------------------------------------------------------
//-------------------PORTRAIT / CARD HELPERS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------



// Looks up the portrait image for a saved character, factoring in class/ascendency.
function getCharPortraitSrc(summary) {
    if (!summary || !summary.playerCharacter) return '';

    const char = summary.playerCharacter;

    // Ascendency takes priority over base class, just like _getPlayerCharacterImage
    const classKey = summary.playerAscendency
        ? summary.playerAscendency
        : (summary.playerClass ? summary.playerClass : 'noclass');

    const charCap = char.charAt(0).toUpperCase() + char.slice(1);
    return `images/sprites/${charCap}_${classKey}.png`;
}

// Builds the inner markup for a save-slot card, empty or filled.
function _buildSlotCardHtml(slotNum, summary) {
    if (summary.empty) {
        return `<div class="ssc-num">SLOT ${slotNum}</div>
                <div class="ssc-empty">+ NEW GAME</div>`;
    }

    // UPDATE HERE: Pass the full summary object instead of just the character ID
    const portraitSrc = getCharPortraitSrc(summary);

    const portraitHtml = portraitSrc
        ? `<img class="ssc-portrait" src="${portraitSrc}" alt="${summary.playerCharacter}">`
        : '';

    return `<div class="ssc-num">SLOT ${slotNum}</div>
             ${portraitHtml}
             <div class="ssc-score">SCORE: ${summary.totalScore}</div>
             <div class="ssc-levels">${summary.levelsDone} STOXELS DONE</div>
             <button class="ssc-delete-btn" data-slot="${slotNum}" title="Delete save">❌</button>`;
}



// Wires up click-to-select and delete-button behavior on a slot card.
function _attachSlotCardListeners(card, slotNum) {
    card.addEventListener('click', (e) => {
        if (e.target.classList.contains('ssc-delete-btn')) return;
        onSaveSlotChosen(slotNum);
    });

    const delBtn = card.querySelector('.ssc-delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDeleteSlotConfirm(slotNum);
        });
    }
}

//------------------------------------------------------------------------
//-------------------SLOT ACTIONS------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Loads the chosen slot's save data and resumes whatever flow was waiting
// on a slot pick (set up by showSaveSlotSelect).
function onSaveSlotChosen(slotNum) {
    loadStateFromSlot(slotNum);
    const cb = window._pendingSaveSlotCallback;
    window._pendingSaveSlotCallback = null;
    if (typeof cb === 'function') cb();
}

//------------------------------------------------------------------------
//-------------------SAVE SLOT SELECT SCREEN--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Builds a single save-slot card element, populated from its saved summary.
function buildSaveSlotCard(slotNum) {
    const summary = getSlotSummary(slotNum);
    const card = document.createElement('div');
    card.className = 'save-slot-card' + (summary.empty ? ' empty' : '');
    card.innerHTML = _buildSlotCardHtml(slotNum, summary);
    _attachSlotCardListeners(card, slotNum);
    return card;
}

// Rebuilds the save-slot grid from current save data.
function renderSaveSlotScreen() {
    const grid = document.getElementById('save-slots-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
        grid.appendChild(buildSaveSlotCard(i));
    }
}

// Shows the save-slot select screen. `onSlotChosen` runs once the player
// picks (or creates) a slot — this is where you resume the normal
// intro/tutorial/character-select flow.
function showSaveSlotSelect(onSlotChosen) {
    window._pendingSaveSlotCallback = onSlotChosen;
    renderSaveSlotScreen();
    screenHistory.push('screen-title');
    switchScreen('screen-save-slots');
}

//------------------------------------------------------------------------
//-------------------DELETE SLOT CONFIRM------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

/*

// Swaps the reset modal's copy to reference a single save slot.
// Strips any data-t attributes on the elements it touches so a later
// translation re-render doesn't overwrite this slot-specific text; the
// original wording is restored by _restoreResetModalTextForFullReset()
// whenever the modal is opened for the title-screen "reset everything" flow.
function _setResetModalTextForSlot(slotNum) {
    const modal = document.getElementById('reset-modal');
    if (!modal) return;

    const title = modal.querySelector('.reset-title');
    if (title) { title.removeAttribute('data-t'); title.textContent = `DELETE SAVE — SLOT ${slotNum}`; }

    const note1 = modal.querySelector('[data-t="reset_note_1"]');
    if (note1) { note1.removeAttribute('data-t'); note1.textContent = `This will permanently erase Slot ${slotNum} only.`; }

    const note2 = modal.querySelector('[data-t="reset_note_2"]');
    if (note2) { note2.removeAttribute('data-t'); note2.textContent = 'This cannot be undone.'; }

    const confirmBtn = modal.querySelector('#btn-confirm-reset');
    if (confirmBtn) { confirmBtn.removeAttribute('data-t'); confirmBtn.textContent = 'YES, DELETE THIS SAVE'; }
}

*/

// Swaps the reset modal's copy to reference a single save slot.
// Strips any data-t attributes on the elements it touches so a later
// translation re-render doesn't overwrite this slot-specific text; the
// original wording is restored by _restoreResetModalTextForFullReset()
// whenever the modal is opened for the title-screen "reset everything" flow.
function _setResetModalTextForSlot(slotNum) {
    const modal = document.getElementById('reset-modal');
    if (!modal) return;

    const title = modal.querySelector('.reset-title');
    if (title) { title.removeAttribute('data-t'); title.textContent = `DELETE SAVE - SLOT ${slotNum}`; }

    // Target by class and DOM structure instead of [data-t="..."]
    const note1 = modal.querySelector('.reset-note-text span:first-child');
    if (note1) { note1.removeAttribute('data-t'); note1.textContent = `This will permanently erase Save Slot ${slotNum}.`; }

    // Target by class and DOM structure instead of [data-t="..."]
    const note2 = modal.querySelector('.reset-note-text span:last-child');
    if (note2) { note2.removeAttribute('data-t'); note2.textContent = 'This cannot be undone.'; }

    const confirmBtn = modal.querySelector('#btn-confirm-reset');
    if (confirmBtn) { confirmBtn.removeAttribute('data-t'); confirmBtn.textContent = 'YES, DELETE THIS SAVE'; }
}


// Reuses the shared #reset-modal (styled via reset-game.css) instead of a
// one-off modal, so per-slot deletion looks identical to the title-screen
// "reset everything" flow. Text is swapped to reference this specific slot;
// confirmReset() (ui-reset.js) checks window._pendingResetSlot to decide
// whether to wipe just this slot or perform a full reset.
function showDeleteSlotConfirm(slotNum) {
    window._pendingResetSlot = slotNum;
    _setResetModalTextForSlot(slotNum);
    showModal('reset-modal');
}

// Restores the modal's original "reset everything" copy. Called whenever
// the title-screen Reset button opens the modal, so slot-delete wording
// never leaks into the full-reset flow.
function _restoreResetModalTextForFullReset() {
    const modal = document.getElementById('reset-modal');
    if (!modal) return;

    const title = modal.querySelector('.reset-title');
    if (title) { title.setAttribute('data-t', 'reset_title'); title.textContent = t('reset_title'); }

    const note1 = modal.querySelector('.reset-note-text span:first-child');
    if (note1) { note1.setAttribute('data-t', 'reset_note_1'); note1.textContent = t('reset_note_1'); }

    const note2 = modal.querySelector('.reset-note-text span:last-child');
    if (note2) { note2.setAttribute('data-t', 'reset_note_2'); note2.textContent = t('reset_note_2'); }

    const confirmBtn = modal.querySelector('#btn-confirm-reset');
    if (confirmBtn) { confirmBtn.setAttribute('data-t', 'reset_confirm'); confirmBtn.textContent = t('reset_confirm'); }
}