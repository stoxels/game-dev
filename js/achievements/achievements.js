//------------------------------------------------------------------------
//----------------------------CONSTANTS & STATE----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Persistence key kept separate from the main save so achievement progress
// survives new playthroughs and save-file resets.
const ACH_SAVE_KEY = 'stoxels_ach';

// ACH_STATE — live achievement state; all other functions read and write
//   directly through this reference. Assigned at the bottom of the
//   PERSISTENCE section below (needs initAchState() to be defined first),
//   but declared here alongside the rest of the module state.
let ACH_STATE;



//------------------------------------------------------------------------
//----------------------------PERSISTENCE---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// loadAchState — reads and parses the raw achievement JSON from localStorage.
//   Returns null on any failure (missing key, malformed JSON, etc.).
function loadAchState() {
    try {
        const raw = localStorage.getItem(ACH_SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch { return null; }
}

// saveAchState — serialises the current ACH_STATE object back into localStorage.
function saveAchState() {
    localStorage.setItem(ACH_SAVE_KEY, JSON.stringify(ACH_STATE));
}

// migrateAchState — ensures a loaded state object always has the expected shape.
//   Adds any missing top-level keys so the rest of the code can assume they exist.
function migrateAchState(s) {
    if (!s.stats) s.stats = {};
    if (!s.unlocked) s.unlocked = [];
    return s;
}

// initAchState — loads persisted progress (migrating if needed) or returns a
//   fresh empty state when no save exists yet.
function initAchState() {
    const saved = loadAchState();
    return saved ? migrateAchState(saved) : { stats: {}, unlocked: [] };
}

// Initialise live state once on startup.
ACH_STATE = initAchState();



//------------------------------------------------------------------------
//----------------------------STAT TRACKING-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// trackAchStat — increments a stat counter by amount (default 1), then
//   persists and runs the unlock check.
//   This is the primary entry point other modules should call.
function trackAchStat(stat, amount = 1) {
    if (!ACH_STATE.stats[stat]) ACH_STATE.stats[stat] = 0;
    ACH_STATE.stats[stat] += amount;
    saveAchState();
    checkAchievements();
}

// setAchStat — force-sets a stat to an exact value instead of incrementing.
//   Used for boolean flags (e.g. world-complete) and derived counts.
//   The write is monotonic (never lowers an existing value): several callers
//   recompute stats from the currently active save slot / tree allocation,
//   but achievement progress is global and must survive slot switches.
function setAchStat(stat, value) {
    const prev = ACH_STATE.stats[stat] || 0;
    ACH_STATE.stats[stat] = Math.max(prev, value);
    if (ACH_STATE.stats[stat] !== prev) {
        saveAchState();
        checkAchievements();
    }
}



//------------------------------------------------------------------------
//---------------------------UNLOCK CHECK---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// _tryUnlockTier — checks a single tier of a single def and, if the threshold
//   is newly met, records the unlock, queues a toast, and fires quest hooks.
//   Returns true if the tier was freshly unlocked.
function _tryUnlockTier(def, tier, tierIndex, currentValue) {
    const unlockKey = `${def.id}__${tierIndex}`;
    const alreadyUnlocked = ACH_STATE.unlocked.includes(unlockKey);
    const thresholdMet = currentValue >= tier.threshold;

    if (alreadyUnlocked || !thresholdMet) return false;

    ACH_STATE.unlocked.push(unlockKey);
    _achToastQueue.push({ def, tier });

    if (typeof updateQuestStats === 'function') updateQuestStats('achievementUnlocked', {});

    return true;
}

// checkSingleAchievementDef — iterates all tiers for one def and attempts to
//   unlock each one. Returns true if at least one new tier was unlocked.
function checkSingleAchievementDef(def) {
    const currentValue = ACH_STATE.stats[def.stat] || 0;
    let anyNewTier = false;

    def.tiers.forEach((tier, tierIndex) => {
        if (_tryUnlockTier(def, tier, tierIndex, currentValue)) {
            anyNewTier = true;
        }
    });

    return anyNewTier;
}

// checkAchievements — scans every definition and unlocks anything newly met.
//   Saves state and schedules the toast drain only when something changed.
//   The drain is delayed slightly so toasts don't fire mid-action.
function checkAchievements() {
    const anyNew = ACHIEVEMENT_DEFS.reduce((found, def) => {
        return checkSingleAchievementDef(def) || found;
    }, false);

    if (anyNew) {
        saveAchState();
        setTimeout(_drainAchToastQueue, 600);
    }
}



//------------------------------------------------------------------------
//--------------LEVEL-COMPLETE TRACKING — STAT GROUP HELPERS--------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Each helper below tracks one logical group of stats.
// They are all called in sequence by onLevelCompleteAch().

// trackBaseCompletionStats — core completion counters that apply to every level.
// NOTE: cellsFilled is tracked per manual fill in handleCorrectFill()
// (mouse-button-handlers.js) so that item/skill-revealed cells are excluded
// here. ctx.cellsFilled is still used by trackGridStats() for the dense-grid check.
function trackBaseCompletionStats(ctx) {
    trackAchStat('levelsCompleted');

    // tilesMarked = correct crosses still on the board at the moment of victory
    if (ctx.tilesMarked !== undefined) trackAchStat('tilesMarked', ctx.tilesMarked);
}

// trackAccuracyStats — tracks perfect runs, no-item runs, and comeback wins.
function trackAccuracyStats(ctx) {
    if (ctx.mistakes === 0) trackAchStat('perfectLevels');
    if (ctx.itemsUsed === 0) trackAchStat('noItemLevels');
    if (ctx.mistakes === 0 && ctx.itemsUsed === 0) trackAchStat('pureLevels');
    if (ctx.mistakes >= 5) trackAchStat('comebackWins');
    if (ctx.isBouncebackWin) trackAchStat('bouncebackWins');
    if (ctx.hadPenaltyClutch) trackAchStat('penaltyClutchwins');
}

// trackDifficultyStats — increments the counter for whichever difficulty was played.
function trackDifficultyStats(ctx) {
    if (ctx.diff === 'easy') trackAchStat('easyLevels');
    if (ctx.diff === 'normal') trackAchStat('normalLevels');
    if (ctx.diff === 'hard') trackAchStat('hardLevels');
}

// trackModStats — increments counters for each active game modifier.
function trackModStats(ctx) {
    if (!ctx.mods) return;
    if (ctx.mods.hardcore) trackAchStat('hardcoreLevels');
    if (ctx.mods.timetrial) trackAchStat('timeTrialLevels');
    if (ctx.mods.ironman) trackAchStat('ironmanLevels');
    if (ctx.mods.classless) trackAchStat('classlessLevels');
    if (ctx.mods.treeless) trackAchStat('treelessLevels');
}

// trackClassStats — tracks base-class and ascendency-class level counts,
//   plus any class-specific special achievements.
function trackClassStats(ctx) {
    // Base classes
    if (ctx.playerClass === 'mathmagician') trackAchStat('levelsAsMathmagician');
    if (ctx.playerClass === 'statistician') trackAchStat('levelsAsStatistician');
    if (ctx.playerClass === 'probabilist') trackAchStat('levelsAsProbabilist');

    // Ascendency classes
    if (ctx.playerAscendency === 'outlier') trackAchStat('levelsAsOutlier');
    if (ctx.playerAscendency === 'actuary') trackAchStat('levelsAsActuary');
    if (ctx.playerAscendency === 'recursionist') trackAchStat('levelsAsRecursionist');
    if (ctx.playerAscendency === 'markovian') trackAchStat('levelsAsMarkovian');
    if (ctx.playerAscendency === 'bayesian') trackAchStat('levelsAsBayesian');
    if (ctx.playerAscendency === 'random_walker') trackAchStat('levelsAsRandom_walker');

    // Mathmagician special: absorb 5+ mistakes in a single level
    if (ctx.playerClass === 'mathmagician' && ctx.absorbedThisLevel >= 5) {
        trackAchStat('mathmagician3AbsorbOneLevel');
    }
}

// trackTimeStats — tracks speed-run clears and time-trial clutch wins.
function trackTimeStats(ctx) {
    if (ctx.elapsed !== undefined && ctx.elapsed <= 30) trackAchStat('fastClears');
    if (ctx.timerSecs !== undefined && ctx.timerSecs > 1800) trackAchStat('bigTimeLeftWins');
    if (ctx.timerSecs !== undefined && ctx.timerSecs <= 10) trackAchStat('clutchWins');
}

// trackScoreStats — tracks total score earned, high-score levels, and personal bests.
function trackScoreStats(ctx) {
    // Use explicit undefined check so a score of 0 still counts
    if (ctx.scoreEarned !== undefined) trackAchStat('totalScoreEarned', ctx.scoreEarned);

    if (ctx.pts !== undefined && ctx.pts >= 500) trackAchStat('highScoreLevels');
    if (ctx.mult !== undefined && ctx.mult >= 2.0) trackAchStat('highMultiplierWins');

    const isNewPersonalBest =
        ctx.pts !== undefined &&
        ctx.prevBest !== undefined &&
        ctx.prevBest > 0 &&
        ctx.pts > ctx.prevBest;
    if (isNewPersonalBest) trackAchStat('personalBestsBroken');
}

// _getPerfectClearSizeBucket — classifies a grid by total cell count into one of
//   four size buckets used for the perfect-clear achievements.
//   Returns the stat key to track, or null if the level was not a perfect clear.
function _getPerfectClearSizeBucket(totalCells, isPerfect) {
    if (!isPerfect) return null;
    if (totalCells < 100) return 'smallPerfectClears';
    if (totalCells >= 100 && totalCells <= 199) return 'mediumPerfectClears';
    if (totalCells >= 200 && totalCells <= 399) return 'largePerfectClears';
    return 'massivePerfectClears'; // 400+
}

// trackGridStats — tracks perfect-clear size buckets and dense-grid clears.
function trackGridStats(ctx) {
    const totalCells = ctx.rows * ctx.cols;
    const isPerfect = ctx.mistakes === 0 && ctx.itemsUsed === 0;

    const sizeBucket = _getPerfectClearSizeBucket(totalCells, isPerfect);
    if (sizeBucket) trackAchStat(sizeBucket);

    const isDenseGrid =
        ctx.totalCells !== undefined &&
        ctx.cellsFilled !== undefined &&
        ctx.cellsFilled > ctx.totalCells / 2;
    if (isDenseGrid) trackAchStat('denseGridClears');
}

// countUniqueWorldsPlayed — returns how many distinct worlds the player has
//   completed at least one level in, based on STATE.done.
function countUniqueWorldsPlayed() {
    const worldsSeen = new Set();
    if (typeof ALL !== 'undefined') {
        const doneLevels = (typeof STATE !== 'undefined') ? STATE.done : [];
        doneLevels.forEach(gi => {
            if (ALL[gi]) worldsSeen.add(ALL[gi].world);
        });
    }
    return worldsSeen.size;
}



//------------------------------------------------------------------------
//-------------------LEVEL-COMPLETE ENTRY POINT---------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// onLevelCompleteAch — called after a level finishes to record all
//   relevant achievement stats in one shot.
//
// Expected ctx shape:
//   { mistakes, itemsUsed, diff, mods, playerClass, playerAscendency,
//     absorbedThisLevel, world, gi, cellsFilled, totalCells, rows, cols,
//     elapsed, timerSecs, pts, prevBest, mult, scoreEarned,
//     tilesMarked, isFirstClear, isBouncebackWin, hadPenaltyClutch }
function onLevelCompleteAch(ctx) {
    trackBaseCompletionStats(ctx);
    trackAccuracyStats(ctx);
    trackDifficultyStats(ctx);
    trackModStats(ctx);
    trackClassStats(ctx);
    trackTimeStats(ctx);
    trackScoreStats(ctx);
    trackGridStats(ctx);
    setAchStat('worldsPlayed', countUniqueWorldsPlayed());
}



//------------------------------------------------------------------------
//--------------WORLD-COMPLETE TRACKING — QUERY HELPERS------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// getLevelIndicesForWorld — returns the array of global level indices (gi)
//   belonging to the given world index.
function getLevelIndicesForWorld(worldIndex) {
    const start = WORLD_START_GI[worldIndex];
    return Array.from({ length: WORLDS[worldIndex].data.length }, (_, i) => start + i);
}

// areAllLevelsCompleted — returns true if every gi in levelIndices appears
//   in STATE.done.
function areAllLevelsCompleted(levelIndices) {
    return typeof STATE !== 'undefined' &&
        levelIndices.every(gi => STATE.done.includes(gi));
}

// areAllLevelsFlawless — returns true if the sum of recorded mistakes across
//   every level in levelIndices is zero. Returns false if mistake data is absent.
function areAllLevelsFlawless(levelIndices) {
    if (typeof STATE.levelMistakes === 'undefined') return false;
    const totalMistakes = levelIndices.reduce(
        (sum, gi) => sum + (STATE.levelMistakes[gi] ?? 999), 0
    );
    return totalMistakes === 0;
}

// areAllBonusesClaimed — returns true if every gi in levelIndices appears
//   in STATE.bonusDone.
function areAllBonusesClaimed(levelIndices) {
    return levelIndices.every(gi => STATE.bonusDone.includes(gi));
}

// countFullyCompletedWorlds — returns how many non-empty worlds have had
//   every level completed.
function countFullyCompletedWorlds() {
    return WORLDS.filter((w, wi) => {
        if (!w.data.length) return false;
        return areAllLevelsCompleted(getLevelIndicesForWorld(wi));
    }).length;
}

// countFlawlessWorlds — returns how many non-empty worlds have been fully
//   completed without a single mistake across any level.
function countFlawlessWorlds() {
    return WORLDS.filter((w, wi) => {
        if (!w.data.length) return false;
        const indices = getLevelIndicesForWorld(wi);
        return areAllLevelsCompleted(indices) && areAllLevelsFlawless(indices);
    }).length;
}

// countWorldsWithAllBonusesClaimed — returns how many fully-completed worlds
//   also have every bonus objective claimed.
function countWorldsWithAllBonusesClaimed() {
    return WORLDS.filter((w, wi) => {
        if (!w.data.length) return false;
        const indices = getLevelIndicesForWorld(wi);
        return areAllLevelsCompleted(indices) && areAllBonusesClaimed(indices);
    }).length;
}



//------------------------------------------------------------------------
//------------------WORLD-COMPLETE ENTRY POINT----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// checkWorldCompleteAch — call this after updating STATE.done to check and
//   record all world-level completion milestones.
//   Sets a per-world flag for each completed world, then updates the
//   cross-world aggregate counts (flawless, all-bonus).
function checkWorldCompleteAch() {
    if (typeof WORLDS === 'undefined' || typeof WORLD_START_GI === 'undefined') return;

    WORLDS.forEach((w, wi) => {
        if (!w.data.length) return;
        const levelIndices = getLevelIndicesForWorld(wi);
        if (areAllLevelsCompleted(levelIndices)) {
            setAchStat(`world${wi + 1}Complete`, 1);
        }
    });

    // Aggregate counts span all worlds — compute once after the per-world loop.
    setAchStat('flawlessWorlds', countFlawlessWorlds());
    setAchStat('worldAllBonusClaimed', countWorldsWithAllBonusesClaimed());
}



//------------------------------------------------------------------------
//------------------------RESET ACHIEVEMENTS------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// showResetAchievementsModal — opens the confirmation modal before wiping data.
//   The actual reset only fires if the player confirms inside the modal.
function showResetAchievementsModal() {
    showAchResetModal();
}

// _doResetAchievements — permanently wipes all achievement progress from
//   localStorage and memory, then refreshes the UI to show the cleared state.
//   Called by the confirm button inside the reset modal.
function _doResetAchievements() {
    localStorage.removeItem(ACH_SAVE_KEY);
    ACH_STATE = { stats: {}, unlocked: [] };
    saveAchState();
    buildAchievementsScreen();
    if (typeof showToast === 'function') showToast(t('qa_achievements_cleared'));
}