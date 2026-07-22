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
     * @param {string} fnName     - Global function name to check and call
     * @param {...*}   args       - Arguments forwarded to the function
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
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        selectedBtn.classList.add('active');
    }

    // Main menu navigation buttons
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
    onClick('btn-reset', () => {
        window._pendingResetSlot = null;
        safeCall('_restoreResetModalTextForFullReset');
        showModal('reset-modal');
    });
    onClick('btn-settings', () => { loadSettingsUI(); showModal('settings-modal'); });

    // Language switcher buttons (class-based, not id-based)
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => onLanguageButtonClick(btn));
    });

    onClick('btn-replay', () => { renderReplayModal(); showModal('replay-modal'); });


    //------------------------------------------------------------------------
    //-------------------GAME SETUP SCREEN------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Difficulty selection buttons — each carries a [data-diff] attribute
    document.querySelectorAll('[data-diff]').forEach(btn => {
        btn.addEventListener('click', () => selDiff(btn));
    });

    // Modifier toggle buttons — each carries a [data-mod] attribute
    document.querySelectorAll('[data-mod]').forEach(btn => {
        btn.addEventListener('click', () => togMod(btn));
    });

    onClick('btn-start-setup', () => confirmSetup());
    onClick('btn-setup-back', () => showTitle());


    //------------------------------------------------------------------------
    //-------------------RESET MODAL------------------------------------------
    //------------------------------------------------------------------------
    //------------------------------------------------------------------------

    // Confirmation button inside the reset modal
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
    }

    /**
     * Handles the "go to level select" button press from inside a level.
     * Unpauses first so the game state is clean, then runs all system cleanup
     * before navigating away.
     */
    function onGoToLevelsFromGame() {
        if (cur && cur.isMonsterLevel && typeof _egIsActive === 'function' && _egIsActive()) {
            showEgForfeitConfirm(() => {
                unpauseGame();
                cleanupActiveGameSystems();
                stopTimer();
                if (typeof _egStopEncounter === 'function') _egStopEncounter();
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

    function showEgForfeitConfirm(onConfirm) {
        // Reuse existing modal infrastructure — build a one-off modal overlay.
        let modal = document.getElementById('eg-forfeit-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'eg-forfeit-modal';
            modal.className = 'modal-bg';
            modal.innerHTML = `
            <div class="modal-box modal-box-danger">
                <div class="modal-title text-red">⚠ LEAVE MAP?</div>
                <div class="modal-section">
                    <p class="reset-body-text">
                        Are you sure you want to leave this Map?<br><br>
                        <strong class="text-accent2">
                            · All items collected on this run will be lost<br>
                            · Your Map entry item will be consumed<br>
                            · Progress towards objectives will be lost
                        </strong>
                    </p>
                </div>
                <div class="modal-actions">
                    <button class="title-btn btn-danger" id="eg-forfeit-confirm">🚪 YES, LEAVE MAP</button>
                    <button class="title-btn sec" id="eg-forfeit-cancel">STAY IN MAP</button>
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

    onClick('btn-go-levels', onGoToLevelsFromGame);

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

    onClick('btn-lose-levels', onGoToLevelsFromOverlay);
    onClick('btn-lose-retry', onRetryLevelFromOverlay);


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

    onClick('btn-mg-close', () => hideMathGate());
    onClick('mg-submit-btn', () => submitMathGate());
    onClick('mg-tutor-btn', () => mgUseTutor());
    onClick('mg-new-q-btn', () => mgNewQuestion());

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



document.getElementById('btn-touchpad-mode')?.addEventListener('click', toggleTouchpadMarkMode);

// renderReplayModal — populates #replay-content with a button per unlocked
// (already-seen) storyline beat, plus a Tutorial entry if it's been completed.
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
        btn.textContent = '▶ Tutorial';
        btn.addEventListener('click', () => {
            hideModal('replay-modal');
            replayTutorialFromTitle();
        });
        container.appendChild(btn);
    }

    if (entries.length === 0 && !STATE.tutorialDone) {
        container.innerHTML = '<p style="text-align:center;opacity:.7;">Nothing unlocked to replay yet.</p>';
    }
}