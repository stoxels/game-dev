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

// Shows the convergence modal and plays its sound effect.
function showConvergenceModal() {
    const modal = document.getElementById('convergence-modal');
    if (modal) modal.classList.add('show');
    Audio_Manager.playSFX('convergence');
    _hidePlayerAvatarSimple();
    _hidePlayerAvatar();
}

// Hides the convergence modal.
function hideConvergenceModal() {
    hideModal('convergence-modal');
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
    const treeBtn = modal.querySelector('.convergence-btn-tree');
    const nextBtn = modal.querySelector('.convergence-btn-next');
    const levelsBtn = modal.querySelector('.convergence-btn-levels');

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

// Navigates to the setup screen and refreshes difficulty/mod descriptions.
function showSetup() {
    stopTimer();
    // BETA TEST ONLY: Super Tutor is temporary and will be removed after the beta period.
    if (typeof syncDiffModButtons === 'function') syncDiffModButtons();
    screenHistory.push('screen-title');
    updDiffDesc();
    updModDesc();
    _updateSetupScreenCharacter();
    switchScreen('screen-setup');
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
// This is the exact logic that used to run at the end of confirmSetup() —
// unchanged, just moved behind the dev mode-select screen.
function launchExistingGame() {
    screenHistory.push('screen-mode-select');
    STATE.mapViewEnabled = true;
    if (typeof save === 'function') save();

    if (typeof checkLockedCodesOnSetup === 'function') checkLockedCodesOnSetup();

    if (typeof showMapView === 'function') {
        showMapView();
    } else {
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
        openModal.classList.remove('show');
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

// Advances to the next level. If there is no next level, goes to level select.
// Respects convergence modal and pending class events before transitioning.
function goToNextLevel() {
    hideResultOverlays();

    const nextIndex = cur.gIdx + 1;
    const proceed = () => {
        if (nextIndex < ALL.length) startLevel(nextIndex);
        else goToLevelSelect();
    };

    _maybeShowConvergenceModal(_buildPostConvergenceCallback(proceed));
}

// Replays the current level from the beginning.
// Respects convergence modal and pending class events before transitioning.
function replayLevel() {
    hideResultOverlays();
    // "Restarting the game" should clear any stacked quiz damage buff —
    // this covers the win/lose retry buttons. Chain transitions preserve
    // the buff via _egSuppressEncounterStop, but a manual retry is a map
    // exit and must wipe it.
    if (typeof _egResetQuizDamageBuff === 'function') _egResetQuizDamageBuff();

    const currentIndex = cur.gIdx;
    const proceed = () => startLevel(currentIndex);

    _maybeShowConvergenceModal(_buildPostConvergenceCallback(proceed));
}