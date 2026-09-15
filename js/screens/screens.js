//------------------------------------------------------------------------
//------------------------SCREEN SWITCH UTILITY---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Deactivates all screens, then activates the one with the given id.
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}



//------------------------------------------------------------------------
//-------------------MODAL HELPER FUNCTIONS-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Shows a modal overlay by its element ID
function showModal(id) {
    document.getElementById(id).classList.add('show');
}

// Hides a modal overlay by its element ID
function hideModal(id) {
    document.getElementById(id).classList.remove('show');
}


// Body flag: a QUESTION modal (quiz overlay, math gate, scouts primer -
// the input or multiple-choice surfaces) is on screen. While it is set the
// controllable player avatar sprite is hidden via CSS; the character
// portrait baked into the background (boss card / top-centre sprite) is
// untouched. Call after any open/close state change of those modals.
function _refreshQuestionModalFlag() {
    const qz = document.getElementById('quiz-overlay');
    const mg = document.getElementById('mg-modal');
    const open = !!(
        document.getElementById('primer-overlay') ||
        (qz && qz.classList.contains('show')) ||
        (mg && mg.classList.contains('show'))
    );
    document.body.classList.toggle('question-modal-open', open);
}



//------------------------------------------------------------------------
//------------------------OVERLAY UTILITIES-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Hides both the win and lose result overlays.
function hideResultOverlays() {
    hideModal('ov-win');
    hideModal('ov-lose');
}



//------------------------------------------------------------------------
//------------------------CONVERGENCE MODAL-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

let _convResizeBound = null;
let _convCloseTimer = null;
let _convSfxTimer = null;

// Scales the book modal up to fill the viewport (capped) so it reads large.
function _fitConvergenceModal(modal) {
    modal = modal || document.getElementById('convergence-modal');
    const box = modal && modal.querySelector('.convm');
    if (!box) return;
    const s = Math.min(1.8, (window.innerHeight - 70) / 370, (window.innerWidth - 60) / 690);
    box.style.transform = 'scale(' + Math.max(0.5, s) + ')';
}

// Shows the convergence modal and plays its sound effect.
function showConvergenceModal() {
    const modal = document.getElementById('convergence-modal');
    if (modal) {
        if (_convCloseTimer) { clearTimeout(_convCloseTimer); _convCloseTimer = null; }
        modal.classList.remove('closing');
        // restart the enter animation even if we're re-opening mid-close
        modal.classList.remove('show');
        void modal.offsetWidth;
        modal.classList.add('show');
    }
    // Land the SFX right as the entrance animation completes, like a reveal.
    if (_convSfxTimer) { clearTimeout(_convSfxTimer); }
    _convSfxTimer = setTimeout(() => { Audio_Manager.playSFX('convergence'); _convSfxTimer = null; }, 680);
    _hidePlayerAvatarSimple();
    _hidePlayerAvatar();
    _updateConvergenceModalPoints(modal);
    _fitConvergenceModal(modal);
    if (!_convResizeBound) {
        _convResizeBound = () => _fitConvergenceModal();
        window.addEventListener('resize', _convResizeBound);
    }
}

//------------------------------------------------------------------------
// Convergence-modal buttons. Were inline onclick= attributes in index.html
// (moved into JS 2026-09-15 so index.html carries no executable code).
//------------------------------------------------------------------------
(function _bindConvergenceModalButtons() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('convm-btn-open', () => { hideConvergenceModal(); hideResultOverlays(); showPassiveTree(); });
    on('convm-btn-next', () => { hideConvergenceModal(); goToNextLevel(); });
    on('convm-btn-select', () => { hideConvergenceModal(); goToLevelSelect(); });
})();

// Total number of Convergence Trials across all worlds - the "X" in the
// "earned / total" readout. Leveling Rework: milestones moved from puzzle
// levels (isLevelConvergence is always false now) to trials.
let _convTotalCache = null;
function _convergenceTotalMilestones() {
    if (_convTotalCache != null) return _convTotalCache;
    if (typeof _egTrialCount === 'function') {
        _convTotalCache = _egTrialCount();
        return _convTotalCache;
    }
    if (typeof WORLDS === 'undefined' || typeof isLevelConvergence !== 'function') return 0;
    let total = 0;
    WORLDS.forEach((w) => {
        const data = (w && w.data) || [];
        data.forEach((_, li) => {
            if (isLevelConvergence(li, w, li === data.length - 1)) total++;
        });
    });
    _convTotalCache = total;
    return total;
}

// Fills the convergence modal's total-points chip with the current pool and
// plays a short count-up from 0 so the reward reveal feels earned.
function _updateConvergenceModalPoints(modal) {
    modal = modal || document.getElementById('convergence-modal');
    const plate = modal && modal.querySelector('.convm-total-plate span');
    if (!plate) return;
    const total = ((typeof STATE !== 'undefined' && STATE.convergenceDone && STATE.convergenceDone.length) || 0)
        + ((typeof STATE !== 'undefined' && STATE.trialsDone && STATE.trialsDone.length) || 0);
    const cap = _convergenceTotalMilestones();
    const label = t('convergence_total');
    const tmpl = (label && label !== 'convergence_total') ? label : 'TOTAL: {n} / {total}';
    const render = (val) => { plate.textContent = tmpl.replace('{n}', val).replace('{total}', cap); };
    render(0);
    const start = performance.now();
    const dur = 650;
    const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        render(Math.round(total * eased));
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

// Hides the convergence modal.
function hideConvergenceModal() {
    if (_convResizeBound) {
        window.removeEventListener('resize', _convResizeBound);
        _convResizeBound = null;
    }
    const modal = document.getElementById('convergence-modal');
    if (modal && modal.classList.contains('show')) {
        modal.classList.add('closing');
        // finish the close animation, then actually hide
        if (_convCloseTimer) clearTimeout(_convCloseTimer);
        if (_convSfxTimer) { clearTimeout(_convSfxTimer); _convSfxTimer = null; }
        _convCloseTimer = setTimeout(() => {
            modal.classList.remove('show');
            modal.classList.remove('closing');
            _convCloseTimer = null;
        }, 420);
    } else {
        hideModal('convergence-modal');
    }
}

// Builds a button handler that closes the convergence modal,
// then optionally runs an extra action. If no extra action is given,
// it falls through to the intended navigation callback (proceed).
function _buildConvergenceButtonHandler(proceed, extraAction) {
    return () => {
        hideConvergenceModal();
        if (extraAction) extraAction();
        else proceed();
    };
}

// Wires up all three buttons inside the convergence modal to close it
// and route correctly: tree opens the passive tree, the other two
// continue with the intended navigation.
function _wireConvergenceModalButtons(modal, proceed) {
    const treeBtn = modal.querySelector('.convm-btn.open');
    const nextBtn = modal.querySelector('.convm-btn.next');
    const levelsBtn = modal.querySelector('.convm-btn.select');

    // Tree button opens the passive tree; navigation continues from there.
    treeBtn.onclick = _buildConvergenceButtonHandler(proceed, () => { hideResultOverlays(); showPassiveTree(); });
    nextBtn.onclick = _buildConvergenceButtonHandler(proceed);
    levelsBtn.onclick = _buildConvergenceButtonHandler(proceed, () => { goToLevelSelect(); });
}

// If a convergence point is pending, interrupts navigation to show the
// convergence modal first. Once the player dismisses it, the intended
// navigation callback (proceed) is executed.
// If no convergence point is pending, proceed is called immediately.
function _maybeShowConvergenceModal(proceed) {
    if (!window._pendingConvergenceModal) {
        proceed();
        return;
    }

    window._pendingConvergenceModal = false;

    const modal = document.getElementById('convergence-modal');
    _wireConvergenceModalButtons(modal, proceed);
    showConvergenceModal();
}

// Builds a callback that first checks for a pending class event,
// then runs the intended navigation. Used as the post-convergence
// step in level transitions (next level, replay).
function _buildPostConvergenceCallback(proceed) {
    return () => {
        if (triggerClassEventIfPending(proceed)) return;
        proceed();
    };
}



//------------------------------------------------------------------------
//------------------------SCREEN NAVIGATION-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Navigates to the title screen and resets screen history and BGM.
function showTitle() {
    Audio_Manager.playBGM('title');
    stopTimer();
    screenHistory = [];
    switchScreen('screen-title');
}

// Scales the setup book (fixed 1376x768 design box) to fit the current
// viewport so the screen looks right on any window size. Called on show and
// on window resize (only while the setup screen is active).
let _setupResizeBound = false;
function _fitSetupBook() {
    const book = document.querySelector('#screen-setup .setup-book');
    if (!book) return;
    const designW = 1376;
    const designH = 768;
    const pad = 40;                       // leave room for the action buttons
    const fit = Math.min(
        (window.innerWidth - 12) / designW,
        (window.innerHeight - pad) / designH,
        2.2                                // cap so it doesn't get huge on 4K
    );
    const scale = Math.max(0.32, fit);
    book.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
}

// Refreshes the setup-screen Nexus button: visible only once the player
// has completed the Nexus Point. Kept separate so win-overlay and load
// flows can refresh it without re-entering the whole setup screen.
function refreshSetupNexusButton() {
    const btn = document.getElementById('btn-enter-nexus-setup');
    if (!btn) return;
    const unlocked = typeof isNexusUnlocked === 'function' ? isNexusUnlocked() : false;
    btn.style.display = unlocked ? '' : 'none';
}

// Enters the endgame Nexus directly from the setup screen.
// Only reachable when the Nexus Point has been completed.
function enterNexusFromSetup() {
    if (typeof isNexusUnlocked === 'function' && !isNexusUnlocked()) return;
    screenHistory.push('screen-setup');
    if (typeof showEndgameNexus === 'function') showEndgameNexus();
}

// Navigates to the setup screen and refreshes difficulty/mod descriptions.
function showSetup() {
    stopTimer();
    // Clear any leftover WASD avatar from a finished level or tutorial: the
    // sprite is position:fixed at body level, so without an explicit hide it
    // floats over the setup screen and stays steerable. Every other screen
    // switch (level select, convergence modal, ...) hides it; this one simply
    // never did because the old setup flow never rendered an avatar.
    if (typeof _hidePlayerAvatarSimple === 'function') _hidePlayerAvatarSimple();
    if (typeof _hidePlayerAvatar === 'function') _hidePlayerAvatar();
    // BETA TEST ONLY: Super Tutor is temporary and will be removed after the beta period.
    if (typeof syncDiffModButtons === 'function') syncDiffModButtons();
    screenHistory.push('screen-title');
    updDiffDesc();
    updModDesc();
    _updateSetupScreenCharacter();
    switchScreen('screen-setup');
    refreshSetupNexusButton();
    _fitSetupBook();
    if (!_setupResizeBound) {
        _setupResizeBound = true;
        window.addEventListener('resize', () => {
            if (document.getElementById('screen-setup') &&
                document.getElementById('screen-setup').classList.contains('active')) {
                _fitSetupBook();
            }
        });
    }
}

// Confirms setup and navigates to the temporary dev mode-select screen.
// TEMP: once Adventure Mode replaces the world map, this should go straight
// back to calling launchExistingGame()'s body (or launchAdventureMode()'s),
// and screen-mode-select / this function's redirect can be deleted.
function confirmSetup() {
    screenHistory.push('screen-setup');
    switchScreen('screen-mode-select');
}

// Launches the existing world-map implementation.
// This is the exact logic that used to run at the end of confirmSetup() -
// unchanged, just moved behind the dev mode-select screen.
function launchExistingGame() {
    screenHistory.push('screen-mode-select');
    STATE.mapViewEnabled = true;
    if (typeof save === 'function') save();

    if (typeof checkLockedCodesOnSetup === 'function') checkLockedCodesOnSetup();

    if (typeof showMapView === 'function') {
        showMapView();
    } else {
        // Classic level select fallback: same overworld music as map view.
        if (typeof Audio_Manager !== 'undefined') Audio_Manager.playBGM('overworld');
        renderLevelSelect();
        switchScreen('screen-levels');
    }
}

// Launches the new Adventure Mode sandbox (see js/adventure-mode.js).
function launchAdventureMode() {
    screenHistory.push('screen-mode-select');
    if (typeof showAdventureMode === 'function') {
        showAdventureMode();
    }
}

// Launches the endgame Nexus of Worlds screen (see endgame-nexus.js).
function launchEndgameTestMode() {
    screenHistory.push('screen-mode-select');
    if (typeof showEndgameNexus === 'function') showEndgameNexus();
}

// Closes any overlays and active quiz, then navigates to the level select screen.
// Respects convergence modal and pending class events before transitioning.
function goToLevelSelect() {
    hideResultOverlays();
    closeQuiz();

    // Clear any leftover character sprite from a finished (ascension) level
    if (typeof _hidePlayerAvatarSimple === 'function') _hidePlayerAvatarSimple();
    if (typeof _hidePlayerAvatar === 'function') _hidePlayerAvatar();

    const _goToCorrectLevelView = () => {
        // Route back to the Probability Gate if this run was launched from the map device
        if (window._egIsMapDeviceRun) {
            window._egIsMapDeviceRun = false;
            if (typeof showEndgameGate === 'function') {
                showEndgameGate();
                return;
            }
        }

        // Route back to the boss testing screen if this run was a
        // single-boss test fight (forfeit via the pause menu).
        if (window._egIsBossTestRun) {
            window._egIsBossTestRun = false;
            if (typeof showEndgameBossTest === 'function') {
                showEndgameBossTest();
                return;
            }
        }

        // Route back to the endgame test hub if this run was launched from there
        if (window._egIsTestRun) {
            window._egIsTestRun = false;
            if (typeof showEndgameTestHub === 'function') {
                showEndgameTestHub();
                return;
            }
        }

        if (STATE && STATE.mapViewEnabled) {
            if (typeof _wdCurrentWi !== 'undefined' && _wdCurrentWi !== null
                && typeof showWorldDetail === 'function') {
                showWorldDetail(_wdCurrentWi);
            } else if (typeof showMapView === 'function') {
                showMapView();
            }
        } else {
            // Classic level select fallback: same overworld music as map view.
            if (typeof Audio_Manager !== 'undefined') Audio_Manager.playBGM('overworld');
            renderLevelSelect();
            switchScreen('screen-levels');
        }
    };

    const proceed = () => {
        if (typeof triggerClassEventIfPending === 'function') {
            if (triggerClassEventIfPending(_goToCorrectLevelView)) return;
        }
        _goToCorrectLevelView();
    };

    _maybeShowConvergenceModal(proceed);
}

// Navigates back to the previous screen in history.
// If an open modal is detected, closes it instead of navigating.
// If history is empty, falls back to the title screen.
function goToPreviousScreen() {
    const openModal = document.querySelector('.modal-bg.show');
    if (openModal) {
        // The Degrees of Freedom choice is mandatory - never dismiss it via back navigation.
        if (openModal.id === 'dof-modal') {
            if (typeof _dofNudge === 'function') _dofNudge();
            return;
        }
        openModal.classList.remove('show');
        if (typeof _refreshQuestionModalFlag === 'function') _refreshQuestionModalFlag();
        return;
    }

    if (screenHistory.length) {
        const prev = screenHistory.pop();

        // The game screen is not directly re-enterable; go to level select instead.
        if (prev === 'screen-game') {
            goToLevelSelect();
            return;
        }

        stopTimer();

        // Rebuild the level select so completion state is up to date.
        if (prev === 'screen-levels') {
            if (STATE && STATE.mapViewEnabled && typeof showMapView === 'function') {
                showMapView();
                return;
            }
            renderLevelSelect();
        }

        switchScreen(prev);
    } else {
        showTitle();
    }
}

// Snapshots every unclaimed (still on the grid, i.e. unexpired) drop so the
// NEXT-level path can carry it forward. Mirrors the endgame encounter chain
// (_egTransitionToChainPuzzle): loot / currency (incl. essences) / regular
// items / maps / charms ride along, instant-effect pickups (hearts, mana,
// mistake erasers, cooldown surges) are intentionally left behind. Values are
// captured by reference; the subsequent startLevel's encounter teardown
// cancels their old expiry timers, and the restore step below re-places them
// with fresh lifetimes via the shared _egReplaceCarried* helpers.
function _campaignSnapshotCarriedDrops() {
    const carried = { loot: [], currency: [], items: [], maps: [], charms: [] };
    try {
        if (typeof _egLootDrops !== 'undefined' && _egLootDrops instanceof Map) {
            carried.loot = Array.from(_egLootDrops.values());
        }
    } catch (e) {}
    try {
        if (typeof _egCurrencyDrops !== 'undefined' && _egCurrencyDrops instanceof Map) {
            carried.currency = Array.from(_egCurrencyDrops.values());
        }
    } catch (e) {}
    try {
        if (typeof _egItemDrops !== 'undefined' && _egItemDrops instanceof Map) {
            carried.items = Array.from(_egItemDrops.values());
        }
    } catch (e) {}
    try {
        if (typeof _egMapDrops !== 'undefined' && _egMapDrops instanceof Map) {
            carried.maps = Array.from(_egMapDrops.values());
        }
    } catch (e) {}
    try {
        if (typeof _egCharmDrops !== 'undefined' && _egCharmDrops instanceof Map) {
            carried.charms = Array.from(_egCharmDrops.values());
        }
    } catch (e) {}
    return carried;
}

// Re-places a snapshot taken by _campaignSnapshotCarriedDrops onto the fresh
// grid. Polls briefly for the new puzzle's grid DOM so math-gated levels
// (startLevel defers _doStartLevel until the gate passes) don't place drops
// onto the stale grid just to have them wiped. Restores exactly once.
function _campaignRestoreCarriedDrops(carried, nextIndex) {
    if (!carried) return;
    const total = (carried.loot?.length || 0) + (carried.currency?.length || 0)
        + (carried.items?.length || 0) + (carried.maps?.length || 0)
        + (carried.charms?.length || 0);
    if (total === 0) return;

    let attempts = 0;
    const doRestore = () => {
        if (carried.loot.length > 0 && typeof _egReplaceCarriedLootDrops === 'function') {
            try { _egReplaceCarriedLootDrops(carried.loot); } catch (e) {}
        }
        if (carried.currency.length > 0 && typeof _egReplaceCarriedCurrencyDrops === 'function') {
            try { _egReplaceCarriedCurrencyDrops(carried.currency); } catch (e) {}
        }
        if (carried.items.length > 0 && typeof _egReplaceCarriedItemDrops === 'function') {
            try { _egReplaceCarriedItemDrops(carried.items); } catch (e) {}
        }
        if (carried.maps.length > 0 && typeof _egReplaceCarriedMapDrops === 'function') {
            try { _egReplaceCarriedMapDrops(carried.maps); } catch (e) {}
        }
        if (carried.charms.length > 0 && typeof _charmReplaceCarriedDrops === 'function') {
            try { _charmReplaceCarriedDrops(carried.charms); } catch (e) {}
        }
    };
    const poll = () => {
        attempts++;
        const gridReady = !!(typeof cur !== 'undefined' && cur && cur.grid
            && document.getElementById('g-0-0'));
        const onTarget = (typeof cur !== 'undefined' && cur && cur.gIdx === nextIndex)
            // Ascension-trial hijack launches a chain instead of the plain
            // puzzle - still a valid "next puzzle", so accept any fresh grid
            // after a few polls rather than dropping the items.
            || attempts >= 6;
        if ((gridReady && onTarget) || attempts >= 20) {
            // One extra tick so buildGrid's DOM settles (same 400ms beat the
            // encounter chain uses for its own re-placement).
            setTimeout(doRestore, 400);
            return;
        }
        setTimeout(poll, 250);
    };
    poll();
}

// Advances to the next level. If there is no next level, goes to level select.
// Respects convergence modal and pending class events before transitioning.
// NEXT carries unclaimed grid drops forward (see helpers above); the LEVELS
// path (onGoToLevelsFromOverlay → goToLevelSelect) intentionally carries
// nothing, so those drops are lost on encounter teardown.
function goToNextLevel() {
    hideResultOverlays();

    const nextIndex = cur.gIdx + 1;
    const proceed = () => {
        if (nextIndex >= ALL.length) {
            goToLevelSelect();
            return;
        }
        // Snapshot inside the innermost proceed so drops that expire while a
        // convergence / class-event / math-gate modal sits open are NOT
        // carried - only what is still unclaimed on the grid counts.
        // Skipped for real endgame map runs: the encounter chain owns that
        // transition (_egTransitionToChainPuzzle) and would double-place.
        const isMapRun = (typeof _egIsMapRun === 'function') && _egIsMapRun();
        const carried = isMapRun ? null : _campaignSnapshotCarriedDrops();
        startLevel(nextIndex);
        if (carried) _campaignRestoreCarriedDrops(carried, nextIndex);
    };

    _maybeShowConvergenceModal(_buildPostConvergenceCallback(proceed));
}

// Replays the current level from the beginning.
// Respects convergence modal and pending class events before transitioning.
function replayLevel() {
    hideResultOverlays();
    // "Restarting the game" should clear any stacked quiz damage buff -
    // this covers the win/lose retry buttons. Chain transitions preserve
    // the buff via _egSuppressEncounterStop, but a manual retry is a map
    // exit and must wipe it.
    if (typeof _egResetQuizDamageBuff === 'function') _egResetQuizDamageBuff();

    const currentIndex = cur.gIdx;
    const proceed = () => startLevel(currentIndex);

    _maybeShowConvergenceModal(_buildPostConvergenceCallback(proceed));
}