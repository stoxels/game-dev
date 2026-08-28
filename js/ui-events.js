//------------------------------------------------------------------------
//-------------------REPLAY GALLERY (GLOBAL HELPER)-----------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Kept at file scope (not nested inside the DOMContentLoaded closure below)
// because it's a public, non-underscore function that other files may call.

/**
 * Populates #replay-content with a button per unlocked (already-seen)
 * storyline beat, plus a Tutorial entry if the tutorial has been completed.
 * Called from the "REPLAY" button binding inside the title-screen section.
 */
function renderReplayModal() {
    const container = document.getElementById('replay-content');
    container.innerHTML = '';

    const entries = getUnlockedReplayEntries(); // storyline-engine.js

    entries.forEach(entry => {
        const btn = document.createElement('button');
        btn.className = 'title-btn back-btn';
        btn.style.display = 'block';
        btn.style.margin = '8px auto';
        btn.textContent = `▶ ${entry.label}`;
        btn.addEventListener('click', () => {
            hideModal('replay-modal');
            showBeat(entry.beatId, { ...(entry.options || {}), force: true });
        });
        container.appendChild(btn);
    });

    if (STATE.tutorialDone) {
        const btn = document.createElement('button');
        btn.className = 'title-btn back-btn';
        btn.style.display = 'block';
        btn.style.margin = '8px auto';
        btn.textContent = `▶ ${t('scr_replay_tutorial')}`;
        btn.addEventListener('click', () => {
            hideModal('replay-modal');
            replayTutorialFromTitle();
        });
        container.appendChild(btn);
    }

    if (entries.length === 0 && !STATE.tutorialDone) {
        container.innerHTML = `<p style="text-align:center;opacity:.7;">${t('scr_nothing_to_replay')}</p>`;
    }
}


document.addEventListener('DOMContentLoaded', () => {

    //------------------------------------------------------------------------
    //-------------------CONSTANTS & ELEMENT REFERENCES-----------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Cached DOM elements used across multiple sections.
    // Grabbed once here at the top rather than querying the DOM repeatedly.
    const puzzleTable = document.getElementById('ptable');
    const mathGateInput = document.getElementById('mg-answer-input');
    const changelogBtn = document.getElementById('btn-changelog');


    //------------------------------------------------------------------------
    //-------------------GENERIC HELPER FUNCTIONS-----------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    /**
     * Attaches a click listener to an element by its id.
     * Logs a warning if the element doesn't exist in the DOM,
     * so missing buttons are easy to spot during development.
     *
     * @param {string}   id  - The element's id attribute
     * @param {Function} fn  - The callback to run on click
     */
    function onClick(id, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
        else console.warn(`ui-events: element #${id} not found`);
    }

    /**
     * Calls a function by name only if it actually exists on the window.
     * Used for optional game-system cleanup functions that may or may not
     * be loaded depending on the active level/module.
     *
     * @param {string} fnName - Global function name to check and call
     * @param {...*}   args   - Arguments forwarded to the function
     */
    function safeCall(fnName, ...args) {
        if (typeof window[fnName] === 'function') window[fnName](...args);
    }


    //------------------------------------------------------------------------
    //-------------------MODAL HELPER FUNCTIONS-------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    /**
     * Finds all elements with [data-modal-close] and wires them up so
     * clicking them closes the modal whose id matches their data attribute.
     * This covers every generic close button without needing individual bindings.
     */
    function bindModalCloseButtons() {
        document.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => hideModal(btn.dataset.modalClose));
        });
    }

    // Run once on load to register all close buttons present in the HTML.
    bindModalCloseButtons();

    onClick('btn-pause-settings', () => { loadSettingsUI(); showModal('settings-modal'); });

    //------------------------------------------------------------------------
    //-------------------TITLE SCREEN-----------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    /**
     * Switches the active language and updates the visual state of all
     * language toggle buttons so only the selected one appears active.
     *
     * @param {HTMLElement} selectedBtn - The button that was clicked
     */
    function onLanguageButtonClick(selectedBtn) {
        setLang(selectedBtn.dataset.lang);
        // Persist the choice so the language survives page reloads
        SETTINGS.lang = selectedBtn.dataset.lang;
        saveSettings(SETTINGS);
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        selectedBtn.classList.add('active');
    }

    // Main menu navigation buttons.
    onClick('btn-play', () => {
        showSaveSlotSelect(() => {
            const proceed = () => maybeShowCharacterSelect(() => showTutorial());
            if (!hasSeen('intro_cinematic')) {
                showBeat('intro_cinematic', { onComplete: proceed });
            } else {
                proceed();
            }
        });
    });

    onClick('btn-save-slots-back', () => showTitle());

    onClick('btn-how-to-play', () => showModal('tut-modal'));
    onClick('btn-highscores', () => showHS());
    onClick('btn-codes', () => showCodes());
    onClick('btn-achievements', () => showAchievements());

    onClick('btn-settings', () => { loadSettingsUI(); showModal('settings-modal'); });

    // Language switcher buttons (class-based, not id-based).
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => onLanguageButtonClick(btn));
    });

    onClick('btn-replay', () => { renderReplayModal(); showModal('replay-modal'); });


    //------------------------------------------------------------------------
    //-------------------GAME SETUP SCREEN------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Difficulty selection buttons — each carries a [data-diff] attribute.
    document.querySelectorAll('[data-diff]').forEach(btn => {
        btn.addEventListener('click', () => selDiff(btn));
    });

    // Modifier toggle buttons — each carries a [data-mod] attribute.
    document.querySelectorAll('[data-mod]').forEach(btn => {
        btn.addEventListener('click', () => togMod(btn));
    });

    onClick('btn-start-setup', () => confirmSetup());
    onClick('btn-setup-back', () => showTitle());


    //------------------------------------------------------------------------
    //-------------------DEV MODE SELECT SCREEN (TEMP)------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-mode-existing', () => launchExistingGame());
    onClick('btn-mode-adventure', () => launchAdventureMode());
    onClick('btn-mode-endgame-test', () => launchEndgameTestMode());


    //------------------------------------------------------------------------
    //-------------------ADVENTURE MODE SANDBOX (TEMP STUB)--------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-adventure-back', () => goToPreviousScreen());


    //------------------------------------------------------------------------
    //-------------------RESET MODAL------------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Confirmation button inside the reset modal.
    onClick('btn-confirm-reset', () => confirmReset());


    //------------------------------------------------------------------------
    //-------------------LEVEL SELECT SCREEN----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-levels-back', () => showSetup());
    onClick('btn-go-passive-tree', () => showPassiveTree());
    onClick('btn-quest-log', () => showQuestLog());


    //------------------------------------------------------------------------
    //-------------------IN-GAME CONTROLS-------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-zoom-in', () => zoomInBtn());
    onClick('btn-zoom-out', () => zoomOutBtn());


    /**
     * Cleans up any active game systems that may be running in the background.
     * Called whenever the player exits the current level mid-session, to prevent
     * leftover walkers, traps, or events from persisting after navigation.
     */
    function cleanupActiveGameSystems() {
        safeCall('clearActiveRandomWalkers');
        safeCall('_bayesTrapsCleanup', false);
        safeCall('_endBlackSwan', false);
        safeCall('_fxShieldBorderRemove');

        safeCall('_varianceShield_removeBubble');
        safeCall('_arcaneFreeze_clearAllFrostAndStalagmites');

        _clearBlackoutCountdown('row');
        _clearBlackoutCountdown('col');
    }

    /**
     * Shows a "leave map?" confirmation modal for endgame monster levels,
     * warning the player that run items/objective progress will be lost.
     * Builds the modal DOM once and reuses it on subsequent calls.
     *
     * @param {Function} onConfirm - Called if the player confirms leaving
     */
    function showEgForfeitConfirm(onConfirm) {
        // Reuse existing modal infrastructure — build a one-off modal overlay.
        let modal = document.getElementById('eg-forfeit-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'eg-forfeit-modal';
            modal.className = 'modal-bg';
            modal.innerHTML = `
            <div class="modal-box modal-box-danger">
                <div class="modal-title text-red">${t('scr_leave_map')}</div>
                <div class="modal-section">
                    <p class="reset-body-text">
                        ${t('scr_leave_map_body')}
                    </p>
                </div>
                <div class="modal-actions">
                    <button class="title-btn back-btn btn-danger" id="eg-forfeit-confirm">${t('scr_leave_map_confirm')}</button>
                    <button class="title-btn back-btn" id="eg-forfeit-cancel">${t('scr_stay_in_map')}</button>
                </div>
            </div>`;
            document.body.appendChild(modal);
        }

        modal.classList.add('show');

        document.getElementById('eg-forfeit-confirm').onclick = () => {
            modal.classList.remove('show');
            onConfirm();
        };
        document.getElementById('eg-forfeit-cancel').onclick = () => {
            modal.classList.remove('show');
        };
    }

    /**
     * Handles the "go to level select" button press from inside a level.
     * If an endgame monster encounter is active, asks for confirmation first
     * (forfeiting the run) before unpausing, cleaning up, and navigating away.
     * Otherwise unpauses first so the game state is clean, then runs all
     * system cleanup before navigating.
     */
    function onGoToLevelsFromGame() {
        if (cur && cur.isMonsterLevel && typeof _egIsActive === 'function' && _egIsActive()) {
            showEgForfeitConfirm(() => {
                unpauseGame();
                cleanupActiveGameSystems();
                stopTimer();
                // Keep the run's collected loot even on a forfeit — the
                // consumed map is penalty enough (mirrors _egEndMapDefeated).
                if (typeof _egFlushRunLootToStash === 'function') _egFlushRunLootToStash();
                if (typeof _egBankUnclaimedMapDrops === 'function') _egBankUnclaimedMapDrops();
                if (typeof egSaveHubState === 'function') egSaveHubState();
                if (typeof _egStopEncounter === 'function') _egStopEncounter();
                if (typeof _egResetQuizDamageBuff === 'function') _egResetQuizDamageBuff();
                safeCall('_hidePlayerAvatarSimple');
                safeCall('_hidePlayerAvatar');
                goToLevelSelect();
            });
            return;
        }

        unpauseGame();
        cleanupActiveGameSystems();
        stopTimer();
        safeCall('_hidePlayerAvatarSimple');
        safeCall('_hidePlayerAvatar');
        goToLevelSelect();
    }

    onClick('btn-go-levels', onGoToLevelsFromGame);
    onClick('btn-hud-levels', onGoToLevelsFromGame);

    /**
     * Handles the "return to nexus" button press from inside an endgame map.
     * Mirrors onGoToLevelsFromGame() but navigates back to the Nexus of
     * Worlds screen (the parent of all endgame screens) instead of the
     * level select screen.
     */
    function onReturnToNexusFromGame() {
        if (cur && cur.isMonsterLevel && typeof _egIsActive === 'function' && _egIsActive()) {
            showEgForfeitConfirm(() => {
                unpauseGame();
                cleanupActiveGameSystems();
                stopTimer();
                // Keep the run's collected loot even on a forfeit — the
                // consumed map is penalty enough (mirrors _egEndMapDefeated).
                if (typeof _egFlushRunLootToStash === 'function') _egFlushRunLootToStash();
                if (typeof _egBankUnclaimedMapDrops === 'function') _egBankUnclaimedMapDrops();
                if (typeof egSaveHubState === 'function') egSaveHubState();
                if (typeof _egStopEncounter === 'function') _egStopEncounter();
                if (typeof _egResetQuizDamageBuff === 'function') _egResetQuizDamageBuff();
                safeCall('_hidePlayerAvatarSimple');
                safeCall('_hidePlayerAvatar');
                showEndgameNexus();
            });
            return;
        }

        unpauseGame();
        cleanupActiveGameSystems();
        stopTimer();
        safeCall('_hidePlayerAvatarSimple');
        safeCall('_hidePlayerAvatar');
        showEndgameNexus();
    }

    onClick('btn-go-nexus', onReturnToNexusFromGame);

    // Puzzle table — suppresses the right-click context menu (would interfere
    // with game input) and resets hover state when the cursor leaves the grid.
    if (puzzleTable) {
        puzzleTable.addEventListener('contextmenu', e => e.preventDefault());

        puzzleTable.addEventListener('mouseleave', () => {
            clearHover();
            hoverRow = -1;
            hoverCol = -1;
        });
    }


    //------------------------------------------------------------------------
    //-------------------WIN / LOSE OVERLAYS----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    /**
     * Shared handler for any "go to level select" button shown on
     * win or lose overlays. Cleans up game systems before navigating.
     */
    function onGoToLevelsFromOverlay() {
        cleanupActiveGameSystems();
        safeCall('_hidePlayerAvatarSimple');
        safeCall('_hidePlayerAvatar');
        goToLevelSelect();
    }

    /**
     * Shared handler for any "retry level" button shown on
     * win or lose overlays. Cleans up game systems before replaying.
     */
    function onRetryLevelFromOverlay() {
        cleanupActiveGameSystems();
        safeCall('_hidePlayerAvatarSimple');
        safeCall('_hidePlayerAvatar');
        replayLevel();
    }

    onClick('btn-next-lvl', () => goToNextLevel());

    onClick('btn-win-levels', onGoToLevelsFromOverlay);
    onClick('btn-win-retry', onRetryLevelFromOverlay);

    // "Retry with other difficulty/modifier" — opens the settings modal;
    // the actual replay only starts once the player hits START RETRY.
    onClick('btn-win-retry-setup', openRetrySetupModal);

    onClick('btn-lose-levels', onGoToLevelsFromOverlay);
    onClick('btn-lose-retry', onRetryLevelFromOverlay);


    //------------------------------------------------------------------------
    //-------------------RETRY WITH OTHER DIFFICULTY / MODIFIERS--------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    /**
     * Starts the retried level with the difficulty/modifiers the player
     * just picked in #retry-setup-modal. Mirrors onRetryLevelFromOverlay's
     * cleanup, then replays the current level via the standard path.
     */
    function onStartRetryWithSetup() {
        beginRetrySetupRun();
        hideModal('retry-setup-modal');
        cleanupActiveGameSystems();
        safeCall('_hidePlayerAvatarSimple');
        safeCall('_hidePlayerAvatar');
        replayLevel();
    }

    onClick('btn-retry-setup-start', onStartRetryWithSetup);
    onClick('btn-retry-setup-cancel', cancelRetrySetupModal);
    onClick('btn-retry-keep', () => retrySetupResolve(true));
    onClick('btn-retry-revert', () => retrySetupResolve(false));

    /**
     * Shows the keep-or-revert prompt whenever a result overlay (win or
     * lose) becomes visible during an active retry-with-other-settings run.
     * A single MutationObserver on both overlays covers every code path
     * that can end a level (scoring, timer expiry, hardcore fail, quiz flow).
     */
    const _retryResultObserver = new MutationObserver(() => {
        if (!retrySetupIsActive()) return;
        const winShown = document.getElementById('ov-win').classList.contains('show');
        const loseShown = document.getElementById('ov-lose').classList.contains('show');
        if (winShown || loseShown) showModal('retry-keep-modal');
    });
    _retryResultObserver.observe(document.getElementById('ov-win'),
        { attributes: true, attributeFilter: ['class'] });
    _retryResultObserver.observe(document.getElementById('ov-lose'),
        { attributes: true, attributeFilter: ['class'] });


    //------------------------------------------------------------------------
    //-------------------QUIZ OVERLAY-----------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('quiz-input-submit', () => answerQuizInput());
    onClick('quiz-tutor-btn', () => quizUseTutor());
    onClick('quiz-continue', () => finishQuiz());
    onClick('btn-skip-quiz', () => skipQuiz());


    //------------------------------------------------------------------------
    //-------------------TUTORIAL SCREEN--------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-skip-tutorial', () => finishTutorial());
    onClick('tut-prev-btn', () => prevTutStep());
    onClick('tut-next-btn', () => advanceTutStep());


    //------------------------------------------------------------------------
    //-------------------MATH GATE MODAL--------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-mg-close', () => mgCloseToLevelSelect());
    onClick('mg-submit-btn', () => submitMathGate());
    onClick('mg-tutor-btn', () => mgUseTutor());
    onClick('mg-new-q-btn', () => mgNewQuestion());
    onClick('mg-continue-btn', () => mgContinueToLevel());

    // Allow the player to submit their math gate answer by pressing Enter,
    // in addition to clicking the submit button.
    if (mathGateInput) {
        mathGateInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') submitMathGate();
        });
    }


    //------------------------------------------------------------------------
    //-------------------HIGHSCORES & CODES SCREENS---------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-hs-back', () => showTitle());


    //------------------------------------------------------------------------
    //-------------------ACHIEVEMENTS SCREEN----------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-ach-back', () => goToPreviousScreen());
    onClick('btn-reset-achievements', () => showResetAchievementsModal());


    //------------------------------------------------------------------------
    //-------------------PROBABILITY TREE SCREEN------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    onClick('btn-pt-back', () => ptGoBack());

    /**
     * Shows an "are you sure?" confirmation modal for the passive tree's
     * "Refund All" button, warning that all allocated nodes will be
     * de-allocated. Builds the modal DOM once and reuses it afterwards.
     *
     * @param {Function} onConfirm - Called if the player confirms the respec
     */
    function showPtRefundConfirm(onConfirm) {
        let modal = document.getElementById('pt-refund-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'pt-refund-modal';
            modal.className = 'modal-bg';
            modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-title">${t('pt_refund_all_title')}</div>
                <div class="modal-section">
                    <p class="reset-body-text">
                        ${t('pt_refund_all_body')}
                    </p>
                </div>
                <div class="modal-actions">
                    <button class="title-btn back-btn btn-danger" id="pt-refund-confirm">${t('pt_refund_all_confirm')}</button>
                    <button class="title-btn back-btn" id="pt-refund-cancel">${t('pt_refund_all_cancel')}</button>
                </div>
            </div>`;
            document.body.appendChild(modal);
        }

        modal.classList.add('show');

        document.getElementById('pt-refund-confirm').onclick = () => {
            modal.classList.remove('show');
            onConfirm();
        };
        document.getElementById('pt-refund-cancel').onclick = () => {
            modal.classList.remove('show');
        };
    }

    onClick('btn-pt-refund-all', () => showPtRefundConfirm(() => _ptRefundAllPoints()));


    //------------------------------------------------------------------------
    //-------------------CHANGELOG--------------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Changelog button may or may not be present depending on the build,
    // so we guard the binding rather than using onClick() which only warns.
    if (changelogBtn) {
        changelogBtn.addEventListener('click', openChangelog);
    }

});


//------------------------------------------------------------------------
//-------------------TOUCHPAD MODE BUTTON (OUTSIDE DOMContentLoaded)------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Left outside the DOMContentLoaded closure exactly as in the original —
// the script tag loads after this button already exists in the DOM, so the
// binding works immediately. Not moved into the closure to avoid any change
// in execution timing relative to the rest of the file's bindings.
document.getElementById('btn-touchpad-mode')?.addEventListener('click', toggleTouchpadMarkMode);