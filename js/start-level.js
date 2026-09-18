import { trackAchStat } from './achievements/achievements.js';
import { Audio_Manager } from './audio/audio.js';
import { _egMaybeLaunchAscensionTrial } from './campaign-trials.js';
import { applyClassPassiveOnLevelStart } from './classes/class-abilities.js';
import { buildClassHUD } from './classes/class-hud.js';
import { _resetPlayerMana } from './classes/class-mana.js';
import { _varianceShield_removeBubble } from './classes/class-mathmagician.js';
import { DIFF_CFG, curDiff, curMods } from './difficulty-modifiers.js';
import { _egOnPuzzleComplete, _egPuzzleCompleteFired, _egUpdateObjectivesHUD } from './combat/encounter-chain.js';
import { _egMaybeShowMistakesWarning } from './combat/encounter-overlays.js';
import { _egGetMaxAllowedMistakes } from './combat/encounter-tick.js';
import { _egPrepareCampaignEncounter, _egStartEncounter, _egStopEncounter } from './combat/encounter.js';
import { _egActiveMapItem, _egMapPlayerLifeMult, _egMapTimeGainMult } from './endgame/endgame-map-launch.js';
import { EG_PLAYER_STATS, _egComputePlayerStats } from './endgame/endgame-player-stats.js';
import { _egResetQuizDamageBuff } from './endgame/endgame-quiz-buffs.js';
import { _egIsActive, _egIsCampaignRun } from './combat/combat-state.js';
import { _egApplyUniqueZeroLineAutomark } from './loot/unique-items.js';
import { _adjacencyMatrixRefreshAll, buildGrid } from './grid.js';
import { keybindDisplayLabel, keybindKeyFor } from './keybinds.js';
import { ALL, lvText } from './levels/levels.js';
import { _refreshTouchpadModeButtonLabel, updateTouchpadModeButtonVisibility } from './mouse-button-handlers.js';
import { PassiveTracker } from './passive-tree/passive-tracker.js';
import { _applyDegreesOfFreedom, _applyFrequentistsBurden, _applySignalToNoise, _applySparsePrior, _applyTheOracle, _entropyDrainInit, _resetNewNodeState, resetOverfittingTracker } from './passive-tree/passive-tree-special-nodes-logic.js';
import { ptHasSkill } from './passive-tree/passive-tree-state-points.js';
import { buildInventoryPanel } from './puzzle-item-inventory/puzzle-item-inventory-panel.js';
import { rarityColors } from './puzzle-items/item-pool.js';
import { showPrimerModal } from './puzzle-items/scouts-primer/scouts-primer.js';
import { _fxShieldBorderRemove } from './puzzle-mechanics/fx-helpers.js';
import { resetToastQueue, showToast } from './puzzle-mechanics/toasts-and-popups.js';
import { resetQuestLevelCounters, resetWitchImmunityLevelCounter } from './quests/quests-stats.js';
import { isGatedLevel, isMathGatePassed, tryStartGatedLevel } from './quiz-excercise/mathgate.js';
import { closeQuiz } from './quiz-excercise/quiz.js';
import { _getLevelSpecialStatus, isPuzzleSolved } from './scoring.js';
import { hideResultOverlays, switchScreen } from './screens/screens.js';
import { _uspClearSupportBuffs } from './skills/universal-spells.js';
import { resetBanterState, triggerBanter } from './sprite/character-banter.js';
import { _renderPlayerAvatarSimple, _renderPlayerHealth, _showPlayerAvatar, _showPlayerAvatarSimple } from './sprite/player_sprite.js';
import { _applyCompletionGlimpse, _applyPassiveStartEffects, _applySylaForestAffinity, _hideCompletionGlimpseBar, _initLuckyTiles } from './start-level-passives.js';
import { save } from './state.js';
import { _applyLowHealthVignette, _resetLowTimeWarningState, startTimer, stopTimer, updTimer } from './timer.js';
import { addTimeSecs } from './puzzle-mechanics/timer-adjust.js';
import { t } from './translation/translations.js';

//------------------------------------------------------------------------
// Phase 3 step 10: live globalThis accessors for externally-mutated names.
// (derived from the step-10 write-site audit by dev/scratch/convert-step10.mjs)
//------------------------------------------------------------------------
try { Object.defineProperty(globalThis, 'startLevel', { get() { return startLevel; }, set(v) { startLevel = v; }, configurable: true }); } catch (e) {}
try { Object.defineProperty(globalThis, '_initTimer', { get() { return _initTimer; }, set(v) { _initTimer = v; }, configurable: true }); } catch (e) {}

//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Maps world number (1-based) to its background image path.
// Place your background images in images/backgrounds/
export const WORLD_BACKGROUNDS = {
    1: 'images/backgrounds/Probability-Peaks-Background.webp',
    2: 'images/backgrounds/Distribution-Den-Background.webp',
    3: 'images/backgrounds/Sampling-Savanna-Background.webp',
    4: 'images/backgrounds/Vortex-of-Possibilities-Background.webp',
    5: 'images/backgrounds/Regression-Rift-Background.webp',
    6: 'images/backgrounds/Frequency-Forest-Background.webp',
    7: 'images/backgrounds/Stochapolis-Background.webp',
    8: 'images/backgrounds/Hypothesis-Hinterlands-Background.webp',
    9: 'images/backgrounds/Data-Delta-Background.webp',
    10: 'images/backgrounds/Parameter-Plains-Background.webp',
    11: 'images/backgrounds/Null-Hypothesis-Void.webp',
    12: 'images/backgrounds/Bayesian-Bay-Background.webp',
    13: 'images/backgrounds/Expectation-Plateau-Background.webp',
    14: 'images/backgrounds/The-Nexus-Background.webp',
};


//------------------------------------------------------------------------
//-------------------LEVEL INITIALISATION-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Sets cur to the puzzle object for the given index.
// Tracks the replay achievement stat if this level has already been completed.
export function _initLevelData(gi) {
    globalThis.cur = ALL[gi];

    if (globalThis.STATE.done.includes(gi)) {
        trackAchStat('levelsReplayed');
    }
}

// Creates fresh userGrid, wrongGrid, and revealedGrid sized to the current puzzle dimensions.
// All cells start empty/false - no carry-over from a previous level.
export function _initGrids() {
    const rows = globalThis.cur.grid.length;
    const cols = globalThis.cur.grid[0].length;

    globalThis.userGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
    globalThis.wrongGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
    globalThis.revealedGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
    globalThis.systemMarkedGrid = Array.from({ length: rows }, () => Array(cols).fill(false));
}


//------------------------------------------------------------------------
//-------------------LEVEL STATE RESET---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Resets all simple gameplay flags and numeric counters to their default values.
export function _resetGameplayFlags() {
    const isChainTransition = !!window._egSuppressEncounterStop;

    globalThis._gamePaused = false;
    if (!isChainTransition) globalThis.mistakeCount = 0;
    if (!isChainTransition) globalThis.absorbedMistakes = 0;
    if (!isChainTransition) globalThis._levelTimeAdded = 0;
    if (!isChainTransition) globalThis._levelTimeLost = 0;
    if (!isChainTransition) globalThis._levelMistakesErased = 0;
    globalThis.levelStartTime = Date.now();
    globalThis.itemsUsedThisLevel = 0;
    globalThis.dead = false;
    globalThis.painting = false;
    globalThis.hoverRow = -1;
    globalThis.hoverCol = -1;
    globalThis.shieldActive = false;
    // The Clock's Time Freeze pins the map timer and must survive arena
    // puzzle transitions during the 30s window - only clear timerFrozen
    // when the freeze isn't running (or on a genuinely fresh level).
    globalThis.timerFrozen = isChainTransition
        && (typeof window !== 'undefined' && !!window._egClockTimeFreezeActive);
    globalThis.quizAnsweredCorrectly = false;
    globalThis.consecutiveCorrectFills = 0;
    globalThis._lawOfLargeNumbersNext = null;
    globalThis._confidenceIntervalActive = false;
    globalThis._streakBonusFills = 0;

    window.STOX_FLAGS.veiledCursedUsed = false;
    window._asymptoticLinesCompleted = 0;
    window._stochasticLastFired = false;
    window._deadReckoningActive = false;
    window._deadReckoningUnlocked = false;

    if (typeof resetBanterState === 'function') resetBanterState();
}

// Resets all per-level tracking Sets, logs, and boolean flags used by
// passive nodes and achievement systems.
export function _resetLevelTrackers() {
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
export function _resetPlayerHP() {
    const baseHP = (typeof EG_PLAYER_STATS !== 'undefined') ? EG_PLAYER_STATS.baseHP : 100;
    const gearHealthBonus = (typeof _egComputePlayerStats === 'function')
        ? _egComputePlayerStats().health : 0;
    let maxHP = baseHP + gearHealthBonus;
    if (typeof _egMapPlayerLifeMult === 'function') maxHP = Math.round(maxHP * _egMapPlayerLifeMult());
    globalThis.playerMaxHP = Math.max(1, maxHP);
    globalThis.playerCurrentHP = globalThis.playerMaxHP;
}

// Cleans up any UI or system state left over from the previous level:
// toast queue, node state, witch immunity, quest counters, overfitting tracker,
// endgame encounter, completion glimpse bar, and player HP.
export function _cleanupPreviousLevel() {
    resetToastQueue();
    _resetNewNodeState();
    resetWitchImmunityLevelCounter();
    resetQuestLevelCounters();
    resetOverfittingTracker();

    // Stop any active endgame encounter from the previous level
    if (typeof _egStopEncounter === 'function') _egStopEncounter();
    if (!window._egSuppressEncounterStop && typeof window.clearActiveRandomWalkers === 'function') window.clearActiveRandomWalkers();
    // Ensure quiz damage buff does not leak across maps when _egStopEncounter
    // was suppressed (chain transitions preserve it intentionally, but any
    // non-chain start must clear it: winning / losing / restarting a map).
    if (!window._egSuppressEncounterStop && typeof _egResetQuizDamageBuff === 'function') {
        _egResetQuizDamageBuff();
    }

    // Support-spell buffs (js/skills/universal-spells.js) do not carry across
    // puzzles. Cleared explicitly rather than relying on _egStopEncounter(),
    // which chain transitions intentionally suppress.
    if (typeof _uspClearSupportBuffs === 'function') _uspClearSupportBuffs();

    if (typeof _fxShieldBorderRemove === 'function') _fxShieldBorderRemove();

    // Hide the completion glimpse bar if it was still visible
    // (defined in start-level-passives.js, loaded before this file)
    _hideCompletionGlimpseBar();

    if (typeof _varianceShield_removeBubble === 'function') _varianceShield_removeBubble();

    // Clear any low-time / low-health vignette tier left over from the previous level,
    // so a fresh level with a full timer / full HP doesn't flash for a frame.
    document.getElementById('low-time-vignette')
        ?.classList.remove('ltv-tier1', 'ltv-tier2', 'ltv-tier3');
    document.getElementById('low-health-vignette')
        ?.classList.remove('lhv-active');
    if (typeof _applyLowHealthVignette === 'function') _applyLowHealthVignette();

    // Only reset HP/mana if this is a fresh start, not a chained puzzle transition
    const isChainTransition = !!window._egSuppressEncounterStop;
    if (!isChainTransition) {
        _resetPlayerHP();
        if (typeof _resetPlayerMana === 'function') _resetPlayerMana();
    }
}

// Full level state reset - runs all three reset helpers in order.
export function _resetLevelState() {
    _resetGameplayFlags();
    _resetLevelTrackers();
    _cleanupPreviousLevel();
}


//------------------------------------------------------------------------
//-------------------TIMER INITIALISATION-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the base timer value for the current level, halved in Time Trial mode.
export function _calcBaseTime() {
    const cfg = DIFF_CFG[curDiff];
    let baseTimer;

    if (globalThis.cur.isMonsterLevel && globalThis.cur.egTimeLimit != null) {
        let gearBonus = (typeof _egComputePlayerStats === 'function')
            ? (_egComputePlayerStats().timeAdded || 0) : 0;
        // Active map run: "% less Time gained from Item and Ability effects"
        // also scales the time_added bonus from equipped gear (an item effect).
        if (typeof _egMapTimeGainMult === 'function') gearBonus = Math.round(gearBonus * _egMapTimeGainMult());
        baseTimer = globalThis.cur.egTimeLimit + gearBonus;
    } else {
        baseTimer = globalThis.cur.timer || cfg.timerStart;
    }

    return curMods.timetrial ? Math.round(baseTimer * 0.5) : baseTimer;
}

// extended_session (174-176): adds flat bonus seconds at level start.
// Node 1: +60s | Node 2: +120s | Node 3: +180s (cumulative).
// Blocked entirely by keystone_gamblers_ruin.
export function _applyExtendedSessionBonus() {
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
export function _applyExpectedValueBonus() {
    if (ptHasSkill('keystone_gamblers_ruin')) return 0;
    if (!ptHasSkill('expected_value_1') && !ptHasSkill('expected_value_2') && !ptHasSkill('expected_value_3')) return 0;

    const totalCells = globalThis.cur.grid.length * globalThis.cur.grid[0].length;
    let secsPerTen = 0;
    if (ptHasSkill('expected_value_1')) secsPerTen += 5;
    if (ptHasSkill('expected_value_2')) secsPerTen += 2;
    if (ptHasSkill('expected_value_3')) secsPerTen += 3;
    return Math.floor(totalCells / 10) * secsPerTen;
}

// Calculates and sets timerSecs from the base time plus all passive bonuses.
// keystone_dead_reckoning (264) grants +10 minutes (600s), also blocked by gamblers_ruin.
export function _initTimer() {
    if (window._egSuppressEncounterStop) {
        // Chain puzzle - keep low-time banner state but sync the tracker to
        // the preserved timer so the next drain is detected correctly.
        if (typeof _lowTimeLastSecs !== 'undefined') globalThis._lowTimeLastSecs = globalThis.timerSecs;
        return;
    }

    const cfg = DIFF_CFG[curDiff];
    const fullBaseTimer = globalThis.cur.timer || cfg.timerStart;
    const base = _calcBaseTime();

    // Remember exactly how many seconds Time Trial shaved off the base timer,
    // so scoring.js can add it back when computing the time bonus.
    window._timetrialTimeCut = curMods.timetrial ? (fullBaseTimer - base) : 0;

    globalThis.timerSecs = base;

    const extSessionBonus = _applyExtendedSessionBonus();
    const expValueBonus = _applyExpectedValueBonus();
    addTimeSecs(extSessionBonus);
    addTimeSecs(expValueBonus);

    if (ptHasSkill('keystone_dead_reckoning') && !ptHasSkill('keystone_gamblers_ruin')) {
        addTimeSecs(600);
    }
    // Fresh level - reset low-time center banners (keeps _lowTimeLastSecs
    // as null so the first updTimer can immediately surface the relevant
    // 300/120/30 banner if the level already starts below a threshold).
    if (typeof _resetLowTimeWarningState === 'function') _resetLowTimeWarningState();
}


//------------------------------------------------------------------------
//-------------------HUD INITIALISATION---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Updates the bonus sidebar hint text from the current level's data.
export function _updateBonusSidebar() {
    const el = document.getElementById('bonus-sidebar-hint');
    el.textContent = (lvText(globalThis.cur, 'bonusHint') || '');
}

// Renders the active modifier and difficulty tags below the timer display.
export function _updateModTags() {
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
// Hardcore: always shows "x / 0" so the player sees that no mistake is allowed.
export function _setMistakeCounterText(suffix = '') {
    const mc = document.getElementById('mistake-counter');
    if (!mc) return;

    const isHardcore = typeof curMods !== 'undefined' && !!curMods.hardcore;
    let maxMistakes = null;
    if (isHardcore) {
        // Hardcore overrides everything - 0 allowed, both in and out of endgame.
        // _egGetMaxAllowedMistakes already returns 0 for active maps; for
        // campaign (no egMaxMistakes) we synthesize 0 here so the HUD still
        // reads "Mistakes: 0 / 0".
        if (typeof _egIsActive === 'function' && _egIsActive() && typeof _egGetMaxAllowedMistakes === 'function') {
            maxMistakes = _egGetMaxAllowedMistakes(); // 0
        } else {
            maxMistakes = 0;
        }
    } else if (typeof _egIsActive === 'function' && typeof _egGetMaxAllowedMistakes === 'function' && _egIsActive()) {
        maxMistakes = _egGetMaxAllowedMistakes();
    }

    mc.textContent = (maxMistakes != null)
        ? `${t('cg_mistakes_lbl')}: ${globalThis.mistakeCount} / ${maxMistakes}${suffix}`
        : `${t('cg_mistakes_lbl')}: ${globalThis.mistakeCount}${suffix}`;

    // Hardcore visual cue - red tint when no mistake is allowed
    mc.classList.toggle('hc-zero', !!isHardcore && maxMistakes === 0);

    // Endgame: maybe show the 3/2/1/0 mistakes-remaining center overlay
    if (typeof _egMaybeShowMistakesWarning === 'function') _egMaybeShowMistakesWarning();
}


// Updates all HUD elements: level id, hint text, score display, penalty info,
// mistake counter, bonus sidebar, and modifier tags.
export function _updateHUD() {
    document.getElementById('top-id').textContent = `${t('lvl_prefix')} ${globalThis.cur.world}-${globalThis.cur.li}`;
    document.getElementById('top-hint').textContent = lvText(globalThis.cur, 'hint');
    document.getElementById('sc-disp').textContent = globalThis.STATE.totalScore;
    document.getElementById('pen-info').textContent = '';

    _setMistakeCounterText();

    _updateBonusSidebar();
    _updateModTags();

    // Corner HUD (right): level number + name, mirrors top-id/top-hint above.
    // During an endgame map-device run (_egActiveMapItem) we show the active
    // MAP's name instead of the seed story level's hint - mousing over it
    // opens a tooltip with the map's rolled modifiers.
    const nameEl = document.getElementById('hud-level-name');
    if (nameEl) {
        const egMap = (typeof _egActiveMapItem !== 'undefined') ? _egActiveMapItem : null;
        if (egMap) {
            // Endgame map run: show ONLY the map's name, colored by the
            // rarity the map had when it was launched from the device.
            nameEl.textContent = egMap.name;
            nameEl.style.color = (typeof rarityColors === 'function')
                ? rarityColors(egMap.rarity).color : '';
        } else {
            nameEl.textContent = `${lvText(globalThis.cur, 'hint')}`;
            const { isAscension, isConvergence, isNexusPoint } = _getLevelSpecialStatus(globalThis.cur);
            nameEl.style.color = isNexusPoint ? '#7fd4ff' : isAscension ? '#c080ff' : isConvergence ? '#6dbf40' : '';
        }
    }
}


//------------------------------------------------------------------------
//-------------------SCREEN AND SYSTEM STARTUP--------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Hides any win/lose overlays and closes the quiz modal left over from a previous level.
export function _closeLeftoverOverlays() {
    hideResultOverlays();
    closeQuiz();
}

// Starts the timer, renders the puzzle grid, and builds the inventory panel.
// Also clears the bounceback flag if we have moved on to a different level.
export function _startSystems() {
    updTimer();
    startTimer();
    buildGrid();
    buildInventoryPanel();

    // sync the touchpad mode button to current settings each level start
    if (typeof updateTouchpadModeButtonVisibility === 'function') {
        updateTouchpadModeButtonVisibility();
        globalThis.touchpadMarkModeActive = false;       // always reset to default (Fill) on level start
        if (typeof _refreshTouchpadModeButtonLabel === 'function') _refreshTouchpadModeButtonLabel();
    }

    if (window._lastFailedGi !== undefined && globalThis.cur && globalThis.cur.gIdx !== window._lastFailedGi) {
        window._lastFailedGi = null;
    }
}

// Resets class cooldown, applies passive class effects, and rebuilds the class HUD panel.
export function _initClassSystems() {
    // Encounter chain (endgame): cooldowns for base + ascendency abilities
    // (active1-4) reset between individual puzzles so each puzzle starts
    // with abilities ready. Mana is the balancing factor and is intentionally
    // NOT reset - see _cleanupPreviousLevel / _resetPlayerMana which keep
    // playerCurrentMana / playerMaxMana across chain transitions.
    globalThis.resetActiveCooldown();
    applyClassPassiveOnLevelStart();
    buildClassHUD();
}

// Pushes the level-select screen onto navigation history and switches to the game screen.
export function _navigateToGameScreen() {
    globalThis.screenHistory.push('screen-levels');
    switchScreen('screen-game');
}

// If a Scout's Primer item was activated during the previous level,
// consumes the pending flag and opens the primer question modal now.
// During an endgame map chain this is evaluated on EVERY puzzle start
// (via _doStartLevel called from _egTransitionToChainPuzzle), so a
// mid-map Primer use correctly fires on the next chain puzzle.
export function _checkPrimerPending() {
    if (!globalThis.STATE.primerPending) return;
    globalThis.STATE.primerPending = false;
    save();
    // Defer primer modal until after class/PassiveTracker HUD is built so
    // the board dimensions are stable for flare animations (already the
    // case for campaign, and now guaranteed for chain puzzles as well).
    showPrimerModal();
}


//------------------------------------------------------------------------
//-------------------WORLD BACKGROUND------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Backgrounds for the interactive tutorial puzzles (world 15). The tutorial
// ships its own artwork: puzzle 1 (tqPuzzle 0) gets the Puzzle-1 backdrop,
// puzzles 2 and 3 (tqPuzzle 1/2) share the Puzzle-2/3 backdrop.
export const TUTORIAL_QUEST_BACKGROUNDS = {
    0: 'images/Tutorial/Puzzle_1_Background.webp',
    1: 'images/Tutorial/Puzzle_2_3_Background.webp',
    2: 'images/Tutorial/Puzzle_2_3_Background.webp',
};

// Applies the background image for the given world number to the game screen.
// Tutorial quest levels override the world background with their dedicated art.
export function _applyWorldBackground(worldNum) {
    const screen = document.getElementById('screen-game');
    let bg = null;
    if (typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest
        && TUTORIAL_QUEST_BACKGROUNDS[globalThis.cur.tqPuzzle]) {
        bg = TUTORIAL_QUEST_BACKGROUNDS[globalThis.cur.tqPuzzle];
    }
    if (!bg) bg = WORLD_BACKGROUNDS[worldNum];
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

// Core level startup - runs every subsystem in the correct order.
// Called directly for ungated levels, or as a callback after the gate check passes.
export function _doStartLevel(gi) {
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

    // 4. Passive node effects - oracle flag must be set before passives run
    if (ptHasSkill('keystone_the_oracle') && globalThis.cur.grid.length * globalThis.cur.grid[0].length >= 200) {
        window._oracleActive = true;
    }
    _applyPassiveStartEffects();
    _applySylaForestAffinity();
    // Unique QoL perk (endgame-unique-items.js): equipped zero-automark
    // uniques mark all-empty rows/columns incorrect at level start. Runs
    // after passives so manual passive marks are never overwritten, and on
    // every chain puzzle via _doStartLevel.
    if (typeof _egApplyUniqueZeroLineAutomark === 'function') {
        try { _egApplyUniqueZeroLineAutomark(); } catch (e) {}
    }
    // Flag that puzzle-start passives (auto-reveal / auto-mark) have fired for this Gi.
    // _egTransitionToChainPuzzle checks this flag after _doStartLevel to guarantee
    // every chained puzzle in a map re-triggers passives even if a future refactor
    // gates _applyPassiveStartEffects behind _egSuppressEncounterStop.
    window._egPassiveAppliedForGi = globalThis.cur ? globalThis.cur.gIdx : gi;
    window._egClassPassiveAppliedForGi = globalThis.cur ? globalThis.cur.gIdx : gi;

    // 5. Deferred overlay effects (needs grid DOM to exist)
    // adjacency_matrix (302): populate neighbour-count overlays after passives are applied
    if (ptHasSkill('adjacency_matrix')) setTimeout(_adjacencyMatrixRefreshAll, 100);
    _applyCompletionGlimpse();

    // 6. Class systems and screen transition
    _checkPrimerPending();
    _initClassSystems();
    _navigateToGameScreen();

    _applyWorldBackground(globalThis.cur.world);

    // Show the player's character sprite in the top-left. Both level kinds
    // share the same presentation now (Health / Mana / Shield / charge bar
    // stack - see _avatarBarsHTML in player_sprite.js); monster levels let
    // the encounter tick build the full avatar so the sprite size is stable.
    if (!globalThis.cur.isMonsterLevel) {
        _renderPlayerAvatarSimple();
        _showPlayerAvatarSimple();
        _showPlayerAvatar();
    } else {
        _showPlayerAvatar();   // don't rely solely on the tick loop's first tick
    }

    // Character banter - fire the level-start line once the avatar exists.
    // Tutorial-quest levels are Professor lessons, not banter moments.
    if (typeof triggerBanter === 'function'
        && !(typeof cur !== 'undefined' && globalThis.cur && globalThis.cur.isTutorialQuest)) {
        setTimeout(() => triggerBanter('level_start'), 600);
    }

    // Remind the player about unspent Convergence Points (delayed so it
    // appears after the toast queue reset and screen transition). {key} is
    // the player's CURRENT Probability Tree binding (K by default).
    if ((globalThis.STATE.passiveTreePoints || 0) > 0 && typeof showToast === 'function') {
        const treeKey = (typeof keybindDisplayLabel === 'function' && typeof keybindKeyFor === 'function')
            ? keybindDisplayLabel(keybindKeyFor('passive-tree')) : 'K';
        setTimeout(() => {
            showToast(`🌿 ${t('toast_unspent_convergence').replace('{n}', globalThis.STATE.passiveTreePoints).replace('{key}', treeKey)}`);
        }, 900);
    }

    // 7. Additional passive systems that run after screen transition
    PassiveTracker.init();
    _applySparsePrior();
    _applyFrequentistsBurden();
    _applySignalToNoise();
    _applyDegreesOfFreedom();
    _applyTheOracle();

    // Step 8 - Monster encounter.
    //   • Campaign levels (every story level) get a light monster pack:
    //     _egPrepareCampaignEncounter stamps the level (isMonsterLevel,
    //     monster list, HP/damage budget) so the shared combat loop can run
    //     WITHOUT the endgame chain/objectives machinery.
    //   • Endgame map levels were already stamped by _egLaunchMapFromDevice.
    if (globalThis.cur && !globalThis.dead && typeof _egPrepareCampaignEncounter === 'function'
        && !window._egSuppressEncounterStart) {
        _egPrepareCampaignEncounter();
    }
    if (globalThis.cur && globalThis.cur.isMonsterLevel
        && typeof _egStartEncounter === 'function'
        && !window._egSuppressEncounterStart) {
        _egStartEncounter();
        // Map objectives only belong to real endgame runs.
        if (typeof _egIsCampaignRun !== 'function' || !_egIsCampaignRun()) {
            _egUpdateObjectivesHUD();
        }
        _renderPlayerHealth();
    }

    // Initial map-device puzzle could already be fully solved by
    // start-of-level passive reveals (e.g. central_tendency,
    // probabilistic_start, Syla's affinity … stacking to cover the whole
    // board). checkWin() was intentionally suppressed above while
    // _egIsActive was still false - now that the encounter is live, hand
    // the solved puzzle to the encounter chain (question modal → countdown
    // → next puzzle) instead of leaving a dead solved grid.
    if (window._egIsMapDeviceRun && globalThis.cur && globalThis.cur.isMonsterLevel
        && typeof _egIsActive === 'function' && _egIsActive()
        && typeof isPuzzleSolved === 'function' && isPuzzleSolved()
        && typeof _egOnPuzzleComplete === 'function'
        && (typeof _egPuzzleCompleteFired === 'undefined' || !_egPuzzleCompleteFired)) {
        if (!globalThis.dead) {
            globalThis.dead = true;
            if (typeof stopTimer === 'function') stopTimer();
        }
        _egOnPuzzleComplete();
    }

    // 9. Background music
    // Tutorial quest levels keep the random tutorial track started on entry;
    // boss-arena chain puzzles keep the boss theme started by
    // _egSpawnNextArenaBoss - both skip the normal campaign track here.
    if (globalThis.cur && (globalThis.cur.isTutorialQuest || globalThis.cur.isBossArena)) {
        // music already set by the entry point - do not override
    } else {
        Audio_Manager.playBGM(Audio_Manager.trackForLevel(globalThis.cur.world, globalThis.cur.li));
    }
}

// Public entry point for starting a level.
// If the level is math-gated and the gate has not been passed, opens the gate
// check flow and defers the actual start to its success callback.
function startLevel(gi) {
    // Leveling Rework: campaign ascension levels are entered as mini-map
    // trial chains (boss finale) instead of plain puzzles. The hook is
    // self-guarding (stamped/chain/suppressed launches are never hijacked).
    if (typeof _egMaybeLaunchAscensionTrial === 'function') {
        try { if (_egMaybeLaunchAscensionTrial(gi)) return; } catch (e) {}
    }
    if (isGatedLevel(gi) && !isMathGatePassed(gi)) {
        tryStartGatedLevel(gi, () => _doStartLevel(gi));
        return;
    }
    _doStartLevel(gi);
}