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
function _romanRegionNumber(beatId) {
    const m = /^region_(\d+)$/.exec(beatId || '');
    if (!m) return '';
    const n = parseInt(m[1], 10);
    const table = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
    return table[n] || String(n);
}

function _buildReplayRow(entry, unlocked, titleText) {
    const row = document.createElement('div');
    row.className = 'replay-track' + (unlocked ? '' : ' replay-track-locked');

    // Thumbnail — artwork, character sprite, or a placeholder numeral tile
    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'replay-track-thumb';
    if (entry.thumb) {
        const img = document.createElement('img');
        img.className = 'replay-track-thumb-img';
        img.src = entry.thumb;
        img.alt = titleText;
        img.loading = 'lazy';
        thumbWrap.appendChild(img);
    } else {
        const num = document.createElement('span');
        num.className = 'replay-track-thumb-num';
        num.textContent = _romanRegionNumber(entry.beatId);
        thumbWrap.appendChild(num);
    }

    // Title + subtitle
    const text = document.createElement('div');
    text.className = 'replay-track-text';
    const title = document.createElement('div');
    title.className = 'replay-track-title';
    title.textContent = titleText;
    const desc = document.createElement('div');
    desc.className = 'replay-track-desc';
    desc.textContent = t(entry.descKey);
    text.appendChild(title);
    text.appendChild(desc);

    // Per-track play button
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'replay-track-play';
    play.setAttribute('aria-label', titleText);
    if (unlocked) {
        play.addEventListener('click', () => {
            hideModal('replay-modal');
            hideGameTooltip(); // hide the custom tooltip immediately (replay modal is gone)
            if (entry.isTutorial) {
                replayTutorialFromTitle();
            } else {
                showBeat(entry.beatId, { ...(entry.options || {}), force: true });
            }
        });
    } else {
        play.classList.add('replay-track-play-locked');
        play.disabled = true;
        const lock = document.createElement('span');
        lock.className = 'replay-track-lock';
        lock.textContent = '🔒';
        play.appendChild(lock);
    }

    row.appendChild(thumbWrap);
    row.appendChild(text);
    row.appendChild(play);
    return row;
}

function renderReplayModal() {
    const container = document.getElementById('replay-content');
    container.innerHTML = '';

    let anyUnlocked = false;

    const entries = (typeof REPLAY_GALLERY_ENTRIES !== 'undefined') ? REPLAY_GALLERY_ENTRIES : [];
    entries.forEach(entry => {
        const unlocked = isReplayEntryUnlocked(entry);
        if (unlocked) anyUnlocked = true;
        container.appendChild(_buildReplayRow(entry, unlocked, entry.label));
    });

    // Tutorial replays only once it has been completed (per-save STATE flag).
    if (STATE.tutorialDone) {
        anyUnlocked = true;
        container.appendChild(_buildReplayRow({
            id: 'tutorial',
            label: t('scr_replay_tutorial'),
            thumb: 'images/Replay_Cutscene_Screen/Replay_Tutorial_Background.png',
            descKey: 'scr_replay_desc_tutorial',
            isTutorial: true
        }, true, t('scr_replay_tutorial')));
    }

    if (!anyUnlocked) {
        const empty = document.createElement('p');
        empty.className = 'replay-empty';
        empty.textContent = t('scr_nothing_to_replay');
        container.appendChild(empty);
    }
}


//------------------------------------------------------------------------
//-------------------REPLAY PLAY-BUTTON TOOLTIPS--------------------------
//------------------------------------------------------------------------

// Custom floating tooltip for the replay gallery's per-track play buttons
// (replaces the native browser title tooltips). Delegated on a document-level
// mousemove because the rows are rebuilt on every modal open. The locked
// play buttons are `disabled` and therefore emit no mouse events of their
// own, so the hovered button is resolved manually via elementFromPoint.
// showGameTooltip/moveGameTooltip/hideGameTooltip live in tooltips-hud.js,
// which loads after this file — they are referenced lazily inside the
// handler (at interaction time), never at wiring time.
let _replayTipBtn = null;

document.addEventListener('mousemove', (e) => {
    // Only active while the replay modal is open; also hides the tooltip
    // after the modal was closed by any path (close button, track click…).
    const modal = document.getElementById('replay-modal');
    if (!modal || !modal.classList.contains('show')) {
        if (_replayTipBtn) {
            _replayTipBtn = null;
            hideGameTooltip();
        }
        return;
    }

    const topEl = document.elementFromPoint(e.clientX, e.clientY);
    const btn = (topEl && topEl.closest) ? topEl.closest('.replay-track-play') : null;
    if (btn) {
        if (_replayTipBtn !== btn) {
            _replayTipBtn = btn;
            const isLocked = btn.classList.contains('replay-track-play-locked');
            const text = isLocked ? t('scr_replay_locked') : (btn.getAttribute('aria-label') || '');
            showGameTooltip(text, e);
        } else {
            moveGameTooltip(e);
        }
    } else if (_replayTipBtn) {
        _replayTipBtn = null;
        hideGameTooltip();
    }
});


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

    // Keybinds modal (title screen). openKeybindsModal/closeKeybindsModal and
    // resetKeybinds live in js/keybinds.js; the capture flow is driven from
    // the central dispatcher there.
    onClick('btn-keybinds', () => {
        if (typeof openKeybindsModal === 'function') openKeybindsModal();
    });
    onClick('btn-keybinds-close', () => {
        if (typeof closeKeybindsModal === 'function') closeKeybindsModal();
    });
    onClick('btn-keybinds-reset', () => {
        if (typeof resetKeybinds === 'function') resetKeybinds();
    });


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

    onClick('btn-mode-select-back', () => goToPreviousScreen());
    onClick('btn-mode-select-back', () => goToPreviousScreen());
    onClick('btn-mode-select-back', () => goToPreviousScreen());
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
     * "Replay again, decide later": keeps the snapshot pending so the
     * keep-modal reappears after the next win/fail, and immediately
     * restarts the current level with the new setup still applied.
     */
    function onRetryAgainDecideLater() {
        retrySetupDefer();
        cleanupActiveGameSystems();
        safeCall('_hidePlayerAvatarSimple');
        safeCall('_hidePlayerAvatar');
        replayLevel();
    }

    onClick('btn-retry-again', onRetryAgainDecideLater);

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
        if (winShown || loseShown) {
            if (typeof updateRetryKeepModal === 'function') updateRetryKeepModal();
            showModal('retry-keep-modal');
        }
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
    onClick('quiz-close-x', () => skipQuiz());


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

    onClick('mg-close-x', () => mgCloseToLevelSelect());
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

    // Achievements modal — the stone close button hides it. Category-level
    // back-navigation lives in the delegated handlers in achievements-ui.js.
    onClick('btn-ach-close', () => hideModal('achievements-modal'));
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
            // Same stone/parchment shell as the settings / how-to-play /
            // achievements-reset modals (see css/modals.css §4).
            modal.className = 'modal-bg safe-center';
            modal.innerHTML = `
            <div class="modal-box modal-box-danger">
                <button class="modal-close" id="pt-refund-close">✕ CLOSE</button>
                <div class="modal-title text-red">${t('pt_refund_all_title')}</div>
                <div class="modal-section">
                    <p class="reset-body-text">
                        ${t('pt_refund_all_body')}
                    </p>
                </div>
                <div class="modal-actions">
                    <button class="title-btn back-btn" id="pt-refund-confirm">${t('pt_refund_all_confirm')}</button>
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
        document.getElementById('pt-refund-close').onclick = () => {
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