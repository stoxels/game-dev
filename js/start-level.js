//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps world number (1-based) to its background image path.
// Place your background images in images/backgrounds/
const WORLD_BACKGROUNDS = {
    1: 'images/backgrounds/Probability-Peaks-Background.jpeg',
    2: 'images/backgrounds/Distribution-Den-Background.jpeg',
    3: 'images/backgrounds/Sampling-Savanna-Background.jpeg',
    4: 'images/backgrounds/Vortex-of-Possibilities-Background.jpeg',
    5: 'images/backgrounds/Regression-Rift-Background.jpeg',
    6: 'images/backgrounds/Frequency-Forest-Background.jpeg',
    7: 'images/backgrounds/Stochapolis-Background.jpeg',
    8: 'images/backgrounds/Hypothesis-Hinterlands-Background.jpeg',
    9: 'images/backgrounds/Data-Delta-Background.jpeg',
    10: 'images/backgrounds/Parameter-Plains-Background.jpeg',
    11: 'images/backgrounds/Null-Hypothesis-Void.jpeg',
    12: 'images/backgrounds/Bayesian-Bay-Background.jpeg',
    13: 'images/backgrounds/Expectation-Plateau-Background.jpeg',
    14: 'images/backgrounds/The-Nexus-Background.jpeg',
};


//------------------------------------------------------------------------
//-------------------LEVEL INITIALISATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Sets cur to the puzzle object for the given index.
// Tracks the replay achievement stat if this level has already been completed.
function _initLevelData(gi) {
    cur = ALL[gi];

    if (STATE.done.includes(gi)) {
        trackAchStat('levelsReplayed');
    }
}

// Creates fresh userGrid, wrongGrid, and revealedGrid sized to the current puzzle dimensions.
// All cells start empty/false — no carry-over from a previous level.
function _initGrids() {
    const rows = cur.grid.length;
    const cols = cur.grid[0].length;

    userGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
    wrongGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
    revealedGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
    systemMarkedGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
}


//------------------------------------------------------------------------
//-------------------LEVEL STATE RESET---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resets all simple gameplay flags and numeric counters to their default values.
function _resetGameplayFlags() {
    const isChainTransition = !!window._egSuppressEncounterStop;

    _gamePaused = false;
    if (!isChainTransition) mistakeCount = 0;
    if (!isChainTransition) absorbedMistakes = 0;
    if (!isChainTransition) _levelTimeAdded = 0;
    if (!isChainTransition) _levelTimeLost = 0;
    if (!isChainTransition) _levelMistakesErased = 0;
    levelStartTime = Date.now();
    itemsUsedThisLevel = 0;
    dead = false;
    painting = false;
    hoverRow = -1;
    hoverCol = -1;
    shieldActive = false;
    timerFrozen = false;
    quizAnsweredCorrectly = false;
    consecutiveCorrectFills = 0;
    _lawOfLargeNumbersNext = null;
    _confidenceIntervalActive = false;
    _streakBonusFills = 0;

    window._veiled_cursedUsed = false;
    window._asymptoticLinesCompleted = 0;
    window._stochasticLastFired = false;
    window._deadReckoningActive = false;
    window._deadReckoningUnlocked = false;

    if (typeof resetBanterState === 'function') resetBanterState();
}

// Resets all per-level tracking Sets, logs, and boolean flags used by
// passive nodes and achievement systems.
function _resetLevelTrackers() {
    window._mistakeLog = [];
    window._sigThresholdProtected = new Set();
    window._dofRevertedCells = new Set();
    window._regressionRewardedLines = new Set();
    window._sigThreshArmed = false;
    window._sigThreshLines = null;
    window._hadPenaltyClutch = false;
    window._maxInventoryTrackedThisLevel = false;
    window._collectorTrackedThisLevel = false;
    window._threeItemsTrackedThisLevel = false;
}

// Resets player HP to full, based on base HP plus any gear health bonus.
// Reduced by the active map's "% reduced maximum Life" mod during device runs.
function _resetPlayerHP() {
    const baseHP = (typeof EG_PLAYER_STATS !== 'undefined') ? EG_PLAYER_STATS.baseHP : 100;
    const gearHealthBonus = (typeof _egComputePlayerStats === 'function')
        ? _egComputePlayerStats().health : 0;
    let maxHP = baseHP + gearHealthBonus;
    if (typeof _egMapPlayerLifeMult === 'function') maxHP = Math.round(maxHP * _egMapPlayerLifeMult());
    playerMaxHP = Math.max(1, maxHP);
    playerCurrentHP = playerMaxHP;
}

// Cleans up any UI or system state left over from the previous level:
// toast queue, node state, witch immunity, quest counters, overfitting tracker,
// endgame encounter, completion glimpse bar, and player HP.
function _cleanupPreviousLevel() {
    resetToastQueue();
    _resetNewNodeState();
    resetWitchImmunityLevelCounter();
    resetQuestLevelCounters();
    resetOverfittingTracker();

    // Stop any active endgame encounter from the previous level
    if (typeof _egStopEncounter === 'function') _egStopEncounter();

    if (typeof _fxShieldBorderRemove === 'function') _fxShieldBorderRemove();

    // Hide the completion glimpse bar if it was still visible
    // (defined in start-level-passives.js, loaded before this file)
    _hideCompletionGlimpseBar();

    if (typeof _varianceShield_removeBubble === 'function') _varianceShield_removeBubble();

    // Clear any low-time vignette tier left over from the previous level,
    // so a fresh level with a full timer doesn't flash red for a frame.
    document.getElementById('low-time-vignette')
        ?.classList.remove('ltv-tier1', 'ltv-tier2', 'ltv-tier3');

    // Only reset HP/mana if this is a fresh start, not a chained puzzle transition
    const isChainTransition = !!window._egSuppressEncounterStop;
    if (!isChainTransition) {
        _resetPlayerHP();
        if (typeof _resetPlayerMana === 'function') _resetPlayerMana();
    }
}

// Full level state reset — runs all three reset helpers in order.
function _resetLevelState() {
    _resetGameplayFlags();
    _resetLevelTrackers();
    _cleanupPreviousLevel();
}


//------------------------------------------------------------------------
//-------------------TIMER INITIALISATION-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the base timer value for the current level, halved in Time Trial mode.
function _calcBaseTime() {
    const cfg = DIFF_CFG[curDiff];
    let baseTimer;

    if (cur.isMonsterLevel && cur.egTimeLimit != null) {
        let gearBonus = (typeof _egComputePlayerStats === 'function')
            ? (_egComputePlayerStats().timeAdded || 0) : 0;
        // Active map run: "% less Time gained from Item and Ability effects"
        // also scales the time_added bonus from equipped gear (an item effect).
        if (typeof _egMapTimeGainMult === 'function') gearBonus = Math.round(gearBonus * _egMapTimeGainMult());
        baseTimer = cur.egTimeLimit + gearBonus;
    } else {
        baseTimer = cur.timer || cfg.timerStart;
    }

    return curMods.timetrial ? Math.round(baseTimer * 0.5) : baseTimer;
}

// extended_session (174-176): adds flat bonus seconds at level start.
// Node 1: +60s | Node 2: +120s | Node 3: +180s (cumulative).
// Blocked entirely by keystone_gamblers_ruin.
function _applyExtendedSessionBonus() {
    if (ptHasSkill('keystone_gamblers_ruin')) return 0;
    let bonus = 0;
    if (ptHasSkill('extended_session_1')) bonus += 60;
    if (ptHasSkill('extended_session_2')) bonus += 120;
    if (ptHasSkill('extended_session_3')) bonus += 180;
    return bonus;
}

// expected_value (nodes vary): adds seconds proportional to total cell count.
// Contributes 5/2/3 seconds per 10 cells for nodes 1/2/3 respectively.
// Blocked entirely by keystone_gamblers_ruin.
function _applyExpectedValueBonus() {
    if (ptHasSkill('keystone_gamblers_ruin')) return 0;
    if (!ptHasSkill('expected_value_1') && !ptHasSkill('expected_value_2') && !ptHasSkill('expected_value_3')) return 0;

    const totalCells = cur.grid.length * cur.grid[0].length;
    let secsPerTen = 0;
    if (ptHasSkill('expected_value_1')) secsPerTen += 5;
    if (ptHasSkill('expected_value_2')) secsPerTen += 2;
    if (ptHasSkill('expected_value_3')) secsPerTen += 3;
    return Math.floor(totalCells / 10) * secsPerTen;
}

// Calculates and sets timerSecs from the base time plus all passive bonuses.
// keystone_dead_reckoning (264) grants +10 minutes (600s), also blocked by gamblers_ruin.
function _initTimer() {
    if (window._egSuppressEncounterStop) return; // preserve timer across chain puzzles

    const cfg = DIFF_CFG[curDiff];
    const fullBaseTimer = cur.timer || cfg.timerStart;
    const base = _calcBaseTime();

    // Remember exactly how many seconds Time Trial shaved off the base timer,
    // so scoring.js can add it back when computing the time bonus.
    window._timetrialTimeCut = curMods.timetrial ? (fullBaseTimer - base) : 0;

    timerSecs = base;

    const extSessionBonus = _applyExtendedSessionBonus();
    const expValueBonus = _applyExpectedValueBonus();
    timerSecs += extSessionBonus;
    timerSecs += expValueBonus;
    _levelTimeAdded += extSessionBonus + expValueBonus;

    if (ptHasSkill('keystone_dead_reckoning') && !ptHasSkill('keystone_gamblers_ruin')) {
        timerSecs += 600;
        _levelTimeAdded += 600;
    }
}


//------------------------------------------------------------------------
//-------------------HUD INITIALISATION---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates the bonus sidebar hint text from the current level's data.
function _updateBonusSidebar() {
    const el = document.getElementById('bonus-sidebar-hint');
    el.textContent = (lvText(cur, 'bonusHint') || '');
}

// Renders the active modifier and difficulty tags below the timer display.
function _updateModTags() {
    const mt = document.getElementById('mod-tags');
    mt.innerHTML = '';
    if (curMods.timetrial) mt.innerHTML += `<span class="mod-tag tt">${t('mod_tt')}</span>`;
    if (curMods.hardcore) mt.innerHTML += `<span class="mod-tag hc">${t('mod_hc')}</span>`;
    if (curMods.ironman) mt.innerHTML += `<span class="mod-tag im">${t('mod_im')}</span>`;
    if (curMods.classless) mt.innerHTML += `<span class="mod-tag cl">${t('mod_cl')}</span>`;
    if (curMods.treeless) mt.innerHTML += `<span class="mod-tag tl">${t('mod_tl')}</span>`;
    mt.innerHTML += `<span class="mod-tag diff">${t('diff_' + curDiff)}</span>`;
}


// Writes the mistake counter text in the one canonical format, so every
// caller (HUD refresh, mistake eraser, golden clock) stays in sync.
// On endgame maps with a mistake limit the format is "x / y" (done / allowed);
// regular campaign levels only ever show the raw count.
function _setMistakeCounterText(suffix = '') {
    const mc = document.getElementById('mistake-counter');
    if (!mc) return;

    let maxMistakes = null;
    if (typeof _egIsActive === 'function' && typeof _egGetMaxAllowedMistakes === 'function' && _egIsActive()) {
        maxMistakes = _egGetMaxAllowedMistakes();
    }

    mc.textContent = (maxMistakes != null)
        ? `${t('cg_mistakes_lbl')}: ${mistakeCount} / ${maxMistakes}${suffix}`
        : `${t('cg_mistakes_lbl')}: ${mistakeCount}${suffix}`;
}


// Updates all HUD elements: level id, hint text, score display, penalty info,
// mistake counter, bonus sidebar, and modifier tags.
function _updateHUD() {
    document.getElementById('top-id').textContent = `${t('lvl_prefix')} ${cur.world}-${cur.li}`;
    document.getElementById('top-hint').textContent = lvText(cur, 'hint');
    document.getElementById('sc-disp').textContent = STATE.totalScore;
    document.getElementById('pen-info').textContent = '';

    _setMistakeCounterText();

    _updateBonusSidebar();
    _updateModTags();

    // Corner HUD (right): level number + name, mirrors top-id/top-hint above
    const nameEl = document.getElementById('hud-level-name');
    if (nameEl) {
        nameEl.textContent = `${lvText(cur, 'hint')}`;
        const { isAscension, isConvergence } = _getLevelSpecialStatus(cur);
        nameEl.style.color = isAscension ? '#c080ff' : isConvergence ? '#6dbf40' : '';
    }
}


//------------------------------------------------------------------------
//-------------------SCREEN AND SYSTEM STARTUP--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Hides any win/lose overlays and closes the quiz modal left over from a previous level.
function _closeLeftoverOverlays() {
    hideResultOverlays();
    closeQuiz();
}

// Starts the timer, renders the puzzle grid, and builds the inventory panel.
// Also clears the bounceback flag if we have moved on to a different level.
function _startSystems() {
    updTimer();
    startTimer();
    buildGrid();
    buildInventoryPanel();

    // sync the touchpad mode button to current settings each level start
    if (typeof updateTouchpadModeButtonVisibility === 'function') {
        updateTouchpadModeButtonVisibility();
        touchpadMarkModeActive = false;       // always reset to default (Fill) on level start
        if (typeof _refreshTouchpadModeButtonLabel === 'function') _refreshTouchpadModeButtonLabel();
    }

    if (window._lastFailedGi !== undefined && cur && cur.gIdx !== window._lastFailedGi) {
        window._lastFailedGi = null;
    }
}

// Resets class cooldown, applies passive class effects, and rebuilds the class HUD panel.
function _initClassSystems() {
    // Chained endgame puzzles continue the encounter — keep ability cooldowns running
    if (!(cur && cur.isChainedPuzzle)) {
        resetActiveCooldown();
    }
    applyClassPassiveOnLevelStart();
    buildClassHUD();
}

// Pushes the level-select screen onto navigation history and switches to the game screen.
function _navigateToGameScreen() {
    screenHistory.push('screen-levels');
    switchScreen('screen-game');
}

// If a Scout's Primer item was activated during the previous level,
// consumes the pending flag and opens the primer question modal now.
function _checkPrimerPending() {
    if (!STATE.primerPending) return;
    STATE.primerPending = false;
    save();
    showPrimerModal();
}


//------------------------------------------------------------------------
//-------------------WORLD BACKGROUND------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Applies the background image for the given world number to the game screen.
function _applyWorldBackground(worldNum) {
    const screen = document.getElementById('screen-game');
    const bg = WORLD_BACKGROUNDS[worldNum];
    if (bg) {
        screen.style.backgroundImage = `url('${bg}')`;
        screen.style.backgroundSize = 'cover';
        screen.style.backgroundPosition = 'center';
        screen.style.backgroundRepeat = 'no-repeat';
    } else {
        screen.style.backgroundImage = '';
    }
}


//------------------------------------------------------------------------
//-------------------MAIN LEVEL START SEQUENCE---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Core level startup — runs every subsystem in the correct order.
// Called directly for ungated levels, or as a callback after the gate check passes.
function _doStartLevel(gi) {
    // 1. Data and grid setup
    _initLevelData(gi);
    _initGrids();
    _resetLevelState();
    _initLuckyTiles();

    // 2. Timer and HUD
    _initTimer();
    _closeLeftoverOverlays();
    _updateHUD();

    // 3. Render systems (timer display, grid, inventory)
    _startSystems();
    _entropyDrainInit();

    // 4. Passive node effects — oracle flag must be set before passives run
    if (ptHasSkill('keystone_the_oracle') && cur.grid.length * cur.grid[0].length >= 200) {
        window._oracleActive = true;
    }
    _applyPassiveStartEffects();
    _applySylaForestAffinity();

    // 5. Deferred overlay effects (needs grid DOM to exist)
    // adjacency_matrix (302): populate neighbour-count overlays after passives are applied
    if (ptHasSkill('adjacency_matrix')) setTimeout(_adjacencyMatrixRefreshAll, 100);
    _applyCompletionGlimpse();

    // 6. Class systems and screen transition
    _checkPrimerPending();
    _initClassSystems();
    _navigateToGameScreen();

    _applyWorldBackground(cur.world);

    // Show the player's character sprite in the top-left for non-monster levels
    if (!cur.isMonsterLevel) {
        _renderPlayerAvatarSimple();
        _showPlayerAvatarSimple();
        _showPlayerAvatar();
    } else {
        _showPlayerAvatar();   // don't rely solely on the tick loop's first tick
    }

    // Character banter — fire the level-start line once the avatar exists.
    if (typeof triggerBanter === 'function') {
        setTimeout(() => triggerBanter('level_start'), 600);
    }

    // Remind the player about unspent Convergence Points (delayed so it
    // appears after the toast queue reset and screen transition).
    if ((STATE.passiveTreePoints || 0) > 0 && typeof showToast === 'function') {
        setTimeout(() => {
            showToast(`🌿 ${t('toast_unspent_convergence').replace('{n}', STATE.passiveTreePoints)}`);
        }, 900);
    }

    // 7. Additional passive systems that run after screen transition
    PassiveTracker.init();
    _applySparsePrior();
    _applyFrequentistsBurden();
    _applySignalToNoise();
    _applyDegreesOfFreedom();
    _applyTheOracle();

    // Step 8 — Endgame encounter (sandbox and monster levels only)
    if (cur && cur.isMonsterLevel
        && typeof _egStartEncounter === 'function'
        && !window._egSuppressEncounterStart) {
        _egStartEncounter();
        _egUpdateObjectivesHUD();
        _renderPlayerHealth();
    }

    // 9. Background music
    Audio_Manager.playBGM(Audio_Manager.trackForLevel(cur.world, cur.li));
}

// Public entry point for starting a level.
// If the level is math-gated and the gate has not been passed, opens the gate
// check flow and defers the actual start to its success callback.
function startLevel(gi) {
    if (isGatedLevel(gi) && !isMathGatePassed(gi)) {
        tryStartGatedLevel(gi, () => _doStartLevel(gi));
        return;
    }
    _doStartLevel(gi);
}