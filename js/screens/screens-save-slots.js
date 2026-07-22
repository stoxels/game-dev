//------------------------------------------------------------------------
//------------------------SAVE SLOT SELECT SCREEN--------------------------
//------------------------------------------------------------------------

// Shows the save-slot select screen. `onSlotChosen` runs once the player
// picks (or creates) a slot — this is where you resume the normal
// intro/tutorial/character-select flow.
function showSaveSlotSelect(onSlotChosen) {
    window._pendingSaveSlotCallback = onSlotChosen;
    renderSaveSlotScreen();
    screenHistory.push('screen-title');
    switchScreen('screen-save-slots');
}

function renderSaveSlotScreen() {
    const grid = document.getElementById('save-slots-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
        grid.appendChild(buildSaveSlotCard(i));
    }
}

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

function getCharPortraitSrc(character) {
    if (!character) return '';
    return CHAR_PORTRAIT_SRC[character.toLowerCase()] || '';
}

function buildSaveSlotCard(slotNum) {
    const summary = getSlotSummary(slotNum);
    const card = document.createElement('div');
    card.className = 'save-slot-card' + (summary.empty ? ' empty' : '');

    const portraitSrc = getCharPortraitSrc(summary.playerCharacter);
    const portraitHtml = portraitSrc
        ? `<img class="ssc-portrait" src="${portraitSrc}" alt="${summary.playerCharacter}">`
        : '';

    card.innerHTML = summary.empty
        ? `<div class="ssc-num">SLOT ${slotNum}</div>
           <div class="ssc-empty">+ NEW GAME</div>`
        : `<div class="ssc-num">SLOT ${slotNum}</div>
           ${portraitHtml}
           <div class="ssc-score">SCORE: ${summary.totalScore}</div>
           <div class="ssc-levels">${summary.levelsDone} STOXELS DONE</div>
           <button class="ssc-delete-btn" data-slot="${slotNum}" title="Delete save">❌</button>`;

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

    return card;
}

function onSaveSlotChosen(slotNum) {
    loadStateFromSlot(slotNum);
    const cb = window._pendingSaveSlotCallback;
    window._pendingSaveSlotCallback = null;
    if (typeof cb === 'function') cb();
}

//------------------------------------------------------------------------
//------------------------DELETE SLOT CONFIRM------------------------------
//------------------------------------------------------------------------

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