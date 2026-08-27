//------------------------------------------------------------------------
//-------------------CONSTANTS & STATE-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Passive-tree nodes whose level-completion count is tracked individually.
// Each active node increments levelsWithPTNode_<nodeId> on every level won.
const _PT_TRACKED_NODES = [
    'lucky_drops',
    'tutor_enable',
    'keystone_apex_collector',
    'keystone_curse_embrace',
    'keystone_iron_doctrine',
    'keystone_countdown_crisis',
];

// Nodes that qualify a level as a "replay" level for the Markov Chain category.
// levelsWithReplayNode is incremented if any of these is active.
const _PT_REPLAY_NODES = ['lucky_drops'];

// Item defIds that count as "tutor" items (the mistake-eraser family).
// Tracked for the Regression to the Mean category.
const _TUTOR_ITEM_IDS = new Set([
    'mistakeEraser',
    'mistakeEraser4',
    'mistakeEraser6',
    'mistakeEraserAll',
]);

// Grid size bucket thresholds (cell count -> bucket name). Used by
// _gridSizeBucket's docs for reference; see that function for the actual
// comparison logic.
//   small   - < 100 cells
//   medium  - 100-199 cells
//   large   - 200-399 cells
//   massive - 400+ cells
const _GRID_SIZE_THRESHOLDS = {
    small: 0,
    medium: 100,
    large: 200,
    massive: 400,
};

// Ordered list of bucket names from smallest to largest. Used for comparisons.
const _GRID_SIZE_ORDER = ['small', 'medium', 'large', 'massive'];

// Shorthand reference to STATE.questStats. Set at the start of
// updateQuestStats() and cleared when it returns. Every _inc() call relies
// on this being set — never valid to read outside that call.
let _qs = null;


//------------------------------------------------------------------------
//-------------------LOW-LEVEL HELPERS--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Ensures STATE.questStats exists before a mid-level stat handler writes to
// it. Used by every questStat_* function that can be called outside
// updateQuestStats().
function _ensureQuestStats() {
    if (!STATE.questStats) STATE.questStats = {};
}

// Increments a key on STATE.questStats by `by` (default 1), initialising it
// to 0 first if needed. Safe to call mid-level, outside updateQuestStats.
function _incDirect(key, by = 1) {
    _ensureQuestStats();
    STATE.questStats[key] = (STATE.questStats[key] || 0) + by;
}

// Increments a questStats counter key. Thin wrapper over _incDirect — only
// valid while _qs is set, i.e. inside an updateQuestStats() call.
function _inc(key, by = 1) {
    _incDirect(key, by);
}


//------------------------------------------------------------------------
//-------------------GRID SIZE HELPERS--------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------

// Returns the grid-size bucket name for a given total cell count.
function _gridSizeBucket(cells) {
    if (cells >= 400) return 'massive';
    if (cells >= 200) return 'large';
    if (cells >= 100) return 'medium';
    return 'small';
}

// Returns true if `bucket` is at least as large as `minBucket`, using the
// canonical size ordering in _GRID_SIZE_ORDER.
function _gridSizeAtLeast(bucket, minBucket) {
    return _GRID_SIZE_ORDER.indexOf(bucket) >= _GRID_SIZE_ORDER.indexOf(minBucket);
}

// Reads the current level grid (via the global `cur`) and returns its cell
// count and pre-computed bucket name. Returns { cells: 0, bucket: 'small' }
// when no grid is loaded.
function _getCurrentGridInfo() {
    const rows = cur ? cur.grid.length : 0;
    const cols = cur ? cur.grid[0]?.length ?? 0 : 0;
    const cells = rows * cols;
    return { cells, bucket: _gridSizeBucket(cells) };
}


//------------------------------------------------------------------------
//-------------------PASSIVE TREE HELPERS-----------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Wrappers around the external passive-tree API (ptHasSkill, _ptAllocated).
// Centralised here so the rest of the module never calls ptHasSkill directly.

// Returns true if the named passive-tree node is currently allocated.
// Always false when the passive tree is not loaded.
function _ptNodeActive(nodeId) {
    return typeof ptHasSkill === 'function' && ptHasSkill(nodeId);
}

// Returns true if the passive tree API is available.
function _ptAvailable() {
    return typeof ptHasSkill === 'function';
}

// Returns how many passive-tree points the player has actually spent. The
// origin/start node is always free, so we subtract 1 from the allocated set.
// Returns 0 if the passive tree isn't initialised yet.
function _ptCurrentSpentCount() {
    const allocated = (typeof _ptAllocated === 'function') ? _ptAllocated() : new Set();
    return Math.max(0, allocated.size - 1);
}


//------------------------------------------------------------------------
//-------------------COMBO CONDITION CHECKER---------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Evaluates a declarative list of conditions against a levelComplete payload
// and increments a named stat counter if ALL conditions pass.
//
// Usage (call from _questStats_trackComboQuests):
//   _checkComboConditions(payload, 'myStatKey', [
//       { type: 'ptNode',      node: 'lucky_drops' },
//       { type: 'maxMistakes', value: 0 },
//       { type: 'gridSize',    size: 'large' },
//   ]);
//
// Condition types:
//   { type: 'ptNode',        node: string }   - node must be allocated
//   { type: 'ptNodes',       nodes: string[] } - ALL listed nodes allocated
//   { type: 'ptAnyNode',     nodes: string[] } - AT LEAST ONE node allocated
//   { type: 'maxMistakes',   value: number }   - mistakeCount <= value
//   { type: 'minMistakes',   value: number }   - mistakeCount >= value
//   { type: 'exactMistakes', value: number }   - mistakeCount === value
//   { type: 'noMistakes' }                     - shorthand for maxMistakes 0
//   { type: 'noItems' }                        - no items used this level
//   { type: 'gridSize',      size: string }    - grid matches exact bucket
//   { type: 'minGridSize',   size: string }    - grid is at least this bucket
//   { type: 'diff',          diff: string }    - 'easy' | 'normal' | 'hard'
//   { type: 'mod',           mod:  string }    - modifier key is truthy

// Evaluates a single condition descriptor against the payload and grid state.
function _evalComboCondition(cond, payload, bucket, mods) {
    switch (cond.type) {

        case 'ptNode':
            return _ptAvailable() && _ptNodeActive(cond.node);

        case 'ptNodes':
            return _ptAvailable() && cond.nodes.every(n => _ptNodeActive(n));

        case 'ptAnyNode':
            return _ptAvailable() && cond.nodes.some(n => _ptNodeActive(n));

        case 'maxMistakes':
            return payload.mistakeCount <= cond.value;

        case 'minMistakes':
            return (payload.mistakeCount || 0) >= cond.value;

        case 'exactMistakes':
            return payload.mistakeCount === cond.value;

        case 'noMistakes':
            return payload.mistakeCount === 0;

        case 'noItems':
            return payload.itemsUsed === 0;

        case 'gridSize':
            // 'large+' is a convenience alias meaning large or massive
            if (cond.size === 'large+') return bucket === 'large' || bucket === 'massive';
            return bucket === cond.size;

        case 'minGridSize':
            return _gridSizeAtLeast(bucket, cond.size);

        case 'diff':
            return payload.diff === cond.diff;

        case 'mod':
            return !!mods[cond.mod];

        default:
            console.warn(`[quests] Unknown combo condition type: "${cond.type}"`);
            return true; // unknown conditions are non-blocking; the quest author should fix this
    }
}

// Evaluates every condition in the array against the payload. Returns true
// only when ALL conditions pass.
function _allComboConditionsMet(payload, conditions) {
    const { bucket } = _getCurrentGridInfo();
    const mods = payload.mods || {};

    for (const cond of conditions) {
        if (!_evalComboCondition(cond, payload, bucket, mods)) return false;
    }
    return true;
}

// Increments STATE.questStats[statKey] by 1 if all conditions pass. Main
// entry point for registering a combo quest check.
function _checkComboConditions(payload, statKey, conditions) {
    if (_allComboConditionsMet(payload, conditions)) _inc(statKey);
}


//------------------------------------------------------------------------
//-------------------STATE MIGRATION------------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Called once when a save file is loaded to ensure the required sub-objects
// exist. Safe to call on both fresh saves and existing saves.

// Ensures all required quest sub-objects exist on the save state. Must be
// called by the save-load system before any quest code runs.
function migrateQuestState(s) {
    if (!s.questStats) s.questStats = {};
    if (!s.questsClaimed) s.questsClaimed = [];
    if (!s.questsNotified) s.questsNotified = [];
}


//------------------------------------------------------------------------
//-------------------PER-LEVEL COUNTER MANAGEMENT-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// All _ql_ (quest-level) keys are ephemeral: reset at level start, then
// committed or discarded at level end. resetQuestLevelCounters() must be
// called from _resetLevelState() in start-level.js at the start of every
// new level.

// Resets every per-level (_ql_) quest counter back to its initial value.
// Called from start-level.js at the beginning of each level.
function resetQuestLevelCounters() {
    _ensureQuestStats();
    const qs = STATE.questStats;

    // Item / ability usage counts
    qs._ql_mistakesRemovedThisLevel = 0;
    qs._ql_cursesBlockedThisLevel = 0;
    qs._ql_timerItemsUsedThisLevel = 0;
    qs._ql_classAbilitiesThisLevel = 0;
    qs._ql_revealItemsThisLevel = 0;
    qs._ql_abilityRevealsThisLevel = 0;
    qs._ql_abilityMarksThisLevel = 0;
    qs._ql_classAbilityRevThisLevel = 0; // tiles revealed via class ability (oracle check)

    // Timing / seal
    qs._ql_shadowSealUsedAt = null; // timestamp (ms) or null

    // Tutor / question tracking
    qs._ql_tutorQuestCorrectThisLevel = 0;
    qs._ql_tutorAllFiveThisLevel = 0;
    qs._ql_mcWrongRemovedThisLevel = 0;
    qs._ql_primerHintsThisLevel = 0;
    qs._ql_primerRowsThisLevel = 0;
    qs._ql_primerColsThisLevel = 0;

    // Node-specific per-level counters
    qs._ql_sampleEffRevThisLevel = 0;
    qs._ql_gamblersTimeAddedThisLevel = 0;
    qs._ql_fieldScanRevThisLevel = 0;
    qs._ql_confIntIgnoredThisLevel = 0;
    qs._ql_erasedRowsThisLevel = 0;

    // Boolean flags (reset to false)
    qs._ql_hasUsedManualReveal = false;
    qs._ql_hasUsedClassReveal = false;
    qs._ql_hasManuallyFilledCell = false;
}

// Resets the per-level Witch Immunity counter at the start of each level.
// Kept separate because it's called from a different site than
// resetQuestLevelCounters in some flows.
function resetWitchImmunityLevelCounter() {
    _ensureQuestStats();
    STATE.questStats._cursedUnderImmunityThisLevel = 0;
}


//------------------------------------------------------------------------
//-------------------MID-LEVEL STAT EVENT HANDLERS----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Called from various game systems during a level (not at level-complete).
// Each function increments one or more per-level or global counters. These
// bypass _qs and write directly to STATE.questStats because they can be
// called at any time, not just inside updateQuestStats().

// Called from _useMistakeEraser when mistakes are actually removed.
function questStat_mistakesRemoved(count) {
    _incDirect('_ql_mistakesRemovedThisLevel', count);
}

// Called when a curse downside is blocked (shield, witch immunity, ward, etc).
function questStat_curseBlocked() {
    _incDirect('_ql_cursesBlockedThisLevel');
}

// Called from _useAddTime when a timer item is consumed (regardless of +/-).
function questStat_timerItemUsed() {
    _incDirect('_ql_timerItemsUsedThisLevel');
}

// Called when a reveal item (not cursedReveal) is used.
function questStat_revealItemUsed() {
    _incDirect('_ql_revealItemsThisLevel');
    STATE.questStats._ql_hasUsedManualReveal = true;
}

// Called from a class ability when it reveals cells.
function questStat_classRevealUsed(count) {
    _incDirect('_ql_abilityRevealsThisLevel', count || 1);
    STATE.questStats._ql_hasUsedClassReveal = true;
}

// Called from a class ability when it marks wrong cells.
function questStat_classMarkUsed(count) {
    _incDirect('_ql_abilityMarksThisLevel', count || 1);
}

// Called when Shadow Seal is used. Records the current timestamp so the
// 10-second early-use window can be checked at level-complete time.
function questStat_shadowSealUsed() {
    _ensureQuestStats();
    STATE.questStats._ql_shadowSealUsedAt = Date.now();
}

// Called when a cursed row/col erasure happens (unsolveRows / unsolveCols).
// Increments both the per-level counter and the persistent global total.
function questStat_rowsErased(count) {
    _incDirect('_ql_erasedRowsThisLevel', count);
    _incDirect('totalRowsErased', count);
}

// Called when a tutor answers a question correctly (gate, quiz, or primer).
// Also checks whether a chain of 5 correct answers has just completed,
// which increments the primerTutorAllFive milestone counter.
function questStat_tutorAnsweredCorrect() {
    _ensureQuestStats();
    const qs = STATE.questStats;

    qs.tutorQuestCorrect = (qs.tutorQuestCorrect || 0) + 1;
    qs._ql_tutorQuestCorrectThisLevel = (qs._ql_tutorQuestCorrectThisLevel || 0) + 1;

    // Every 5 consecutive correct tutor answers counts as one "all five" milestone
    if (qs._ql_tutorQuestCorrectThisLevel >= 5) {
        qs.primerTutorAllFive = (qs.primerTutorAllFive || 0) + 1;
        qs._ql_tutorQuestCorrectThisLevel = 0; // reset chain for next group
    }
}

// Called when a MC question is displayed with a wrong answer already
// eliminated. Increments both the global total and the per-level counter.
function questStat_mcWrongAnswerEliminated() {
    _incDirect('mcWrongAnswersEliminated');
    _incDirect('_ql_mcWrongRemovedThisLevel');
}

// Called when a primer hint appears (wrong attempt with wisdom_through_failure active).
function questStat_primerHintShown() {
    _incDirect('primerHintsTotal');
}

// Called at the end of a primer with the total rows and columns revealed.
function questStat_primerRowsColsRevealed(rows, cols) {
    _incDirect('primerTotalRowsRevealed', rows);
    _incDirect('primerTotalColsRevealed', cols);
}

// Called from the Sample Efficiency node when a cell is auto-revealed by a
// streak. Increments both the per-level counter and the global total.
function questStat_sampleEfficiencyReveal() {
    _incDirect('_ql_sampleEffRevThisLevel');
    _incDirect('sampleEfficiencyRevealsTotal');
}

// Called when Gambler's Ruin adds time from a correct cell fill.
function questStat_gamblersRuinTimeAdded(secs) {
    _incDirect('gamblersRuinTotalTimeAdded', secs);
    _incDirect('_ql_gamblersTimeAddedThisLevel', secs);
}

// Called when the Field Scan node reveals one or more correct cells.
function questStat_fieldScanCellRevealed(count) {
    _incDirect('fieldScanCorrectReveals', count || 1);
    _incDirect('_ql_fieldScanRevThisLevel', count || 1);
}

// Called when the Confidence Interval node absorbs (ignores) a mistake.
// Increments both the per-level counter and the persistent global total.
function questStat_confidenceIntervalIgnored() {
    _incDirect('confidenceIntervalIgnored');
    _incDirect('_ql_confIntIgnoredThisLevel');
}

// Called each time a class ability is used during the current level.
// Increments only the per-level counter (global tracked by classAbilityUsed event).
function _questStats_onClassAbilityThisLevel() {
    _incDirect('_ql_classAbilitiesThisLevel');
}


//------------------------------------------------------------------------
//-------------------LEVEL-COMPLETE: SUB-HANDLERS-----------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// These private helpers are called exclusively from _questStats_onLevelComplete.
// Each handles one specific concern so the master handler stays readable.
//
// Expected levelComplete payload shape:
//   { gi, world, diff, mods, mistakeCount, itemsUsed,
//     isConvergence, worldJustCompleted, luckyDropTriggered,
//     isLargeAdjMatrix, elapsed, timerSecs, timerSecsAtWin,
//     worldIndex, pts }

// Tracks basic per-level outcome flags: no-mistake run, no-item run, hard difficulty.
function _questStats_trackBasicFlags(payload) {
    if (payload.mistakeCount === 0) _inc('levelsNomiss');
    if (payload.itemsUsed === 0) _inc('levelsNoitem');
    if (payload.diff === 'hard') _inc('levelsHard');
}

// Tracks which optional modifiers were active when the level was completed:
// Hardcore, Time Trial, Ironman, Classless, Treeless.
function _questStats_trackModifierFlags(mods) {
    if (mods.hardcore) _inc('levelsHardcore');
    if (mods.timetrial) _inc('levelsTimetrial');
    if (mods.ironman) _inc('levelsIronman');
    if (mods.classless) _inc('levelsClassless');
    if (mods.treeless) _inc('levelsTreeless');
}

// Tracks the "Full Gauntlet" stat: Hard difficulty with all five modifiers
// active simultaneously. Required for the Monte Carlo Method quest category.
function _questStats_trackFullGauntlet(payload) {
    const mods = payload.mods || {};
    const allModsActive = mods.hardcore && mods.timetrial && mods.ironman
        && mods.classless && mods.treeless;

    if (payload.diff === 'hard' && allModsActive) {
        _inc('levelsTripleModifier');
    }
}

// Increments the per-level-index replay counter. Used by the Markov Chain
// quest to detect levels being replayed with Lucky Drops active.
function _questStats_trackPerLevelReplay(gi) {
    if (gi !== undefined) _inc(`levelReplays_${gi}`);
}

// Tracks which passive-tree nodes were active when this level was completed.
// Increments a per-node counter for each tracked node, plus the generic
// "replay node" counter used by the Markov Chain category. No-op when the
// passive tree isn't loaded.
function _questStats_trackActivePTNodes() {
    if (!_ptAvailable()) return;

    _PT_TRACKED_NODES.forEach(node => {
        if (_ptNodeActive(node)) _inc(`levelsWithPTNode_${node}`);
    });

    // levelsWithReplayNode is used by the Markov Chain category
    if (_PT_REPLAY_NODES.some(n => _ptNodeActive(n))) {
        _inc('levelsWithReplayNode');
    }
}

// Tracks special level type completions: Convergence levels, world-clear
// events (deduplicated by worldIndex), Lucky Drop triggers, Large Adjacency
// Matrix levels.
function _questStats_trackSpecialLevelTypes(payload) {
    if (payload.isConvergence) _inc('convergenceLevels');
    if (payload.isLargeAdjMatrix) _inc('levelsLargeAdjMatrix');
    if (payload.luckyDropTriggered) _inc('luckyDropsClaimed');

    if (payload.worldJustCompleted) {
        _inc('worldsCompleted');

        // Guard against replays re-triggering the world-complete milestone
        if (!_qs._worldsCountedList) _qs._worldsCountedList = [];
        const alreadyCounted = _qs._worldsCountedList.includes(payload.worldIndex);
        if (payload.worldIndex !== undefined && !alreadyCounted) {
            _qs._worldsCountedList.push(payload.worldIndex);
        }
    }
}

// Commits the per-level Witch Immunity counter to the persistent total. Only
// transferred on a successfully completed level, never on loss or quit.
// Resets the per-level counter to zero afterwards.
function _questStats_commitWitchImmunity() {
    const witchCount = _qs._cursedUnderImmunityThisLevel || 0;
    if (witchCount > 0) {
        _inc('cursedUnderImmunityWon', witchCount);
        _qs._cursedUnderImmunityThisLevel = 0;
    }
}

// Evaluates all per-level manual combo quest conditions and increments
// counters for those that pass, then dispatches the declarative combo
// conditions via _checkComboConditions. Per-level (_ql_) counters are read
// here and either committed to the permanent stats or discarded if
// thresholds weren't met.
function _questStats_trackComboQuests(payload) {
    const qs = _qs;
    const { cells } = _getCurrentGridInfo();
    const isMassive = cells >= 400;
    const mods = payload.mods || {};

    // -- Manual threshold checks (can't easily be expressed as declarative conditions) --

    // Quest 1: Remove 50 mistakes in a single level (Mistake Eraser family)
    if ((qs._ql_mistakesRemovedThisLevel || 0) >= 50) {
        _inc('levelsRemovedFiftyMistakes');
    }

    // Quest 2: Block 15 curses in a single level (shield / witch immunity / ward)
    if ((qs._ql_cursesBlockedThisLevel || 0) >= 15) {
        _inc('levelsBlockedFifteenCurses');
    }

    // Quest 3: Countdown Crisis keystone — use 30 timer items AND finish with ≤ 30s left
    if (_ptNodeActive('keystone_countdown_crisis') &&
        (qs._ql_timerItemsUsedThisLevel || 0) >= 30 &&
        payload.timerSecsAtWin !== undefined &&
        payload.timerSecsAtWin <= 30) {
        _inc('countdownCrisisFinishes');
    }

    // Quest 4: Use 30 class abilities in a single level
    if ((qs._ql_classAbilitiesThisLevel || 0) >= 30) {
        _inc('levelsThirtyClassAbilities');
    }

    // Quest 5: Finish a massive grid using ONLY reveal items — no manual fills, no ability reveals
    if (isMassive &&
        (qs._ql_revealItemsThisLevel || 0) > 0 &&
        !qs._ql_hasManuallyFilledCell &&
        !qs._ql_hasUsedClassReveal) {
        _inc('massiveGridPureItemReveal');
    }

    // Quest 6: Use Shadow Seal within the first 10 seconds on a massive grid
    if (isMassive && qs._ql_shadowSealUsedAt !== null) {
        const secsIntoLevel = (qs._ql_shadowSealUsedAt - (levelStartTime || qs._ql_shadowSealUsedAt)) / 1000;
        if (secsIntoLevel <= 10) {
            _inc('massiveGridShadowSealEarly');
        }
    }

    // Ability Harvest — commit the per-level ability reveal/mark counters to
    // their persistent global totals. Without this the abilityRevealsTotal /
    // abilityMarksTotal milestones could never be completed.
    if ((qs._ql_abilityRevealsThisLevel || 0) > 0) {
        _inc('abilityRevealsTotal', qs._ql_abilityRevealsThisLevel);
    }
    if ((qs._ql_abilityMarksThisLevel || 0) > 0) {
        _inc('abilityMarksTotal', qs._ql_abilityMarksThisLevel);
    }

    // Quest 7: Erase 10+ filled rows/cols via cursed items
    // Global counter tracked in questStat_rowsErased; milestones read totalRowsErased.

    // Quest 20: Emergency scan triggered on a massive grid
    if (isMassive && window._emergencyScanFired) {
        _inc('massiveGridsEmergencyScan');
    }

    // -- Declarative combo conditions --

    // Quest 13: Overfitting keystone — large+ grid with ≥ 25 mistakes
    _checkComboConditions(payload, 'levelsOverfitHighMistakes', [
        { type: 'ptNode', node: 'keystone_overfitting' },
        { type: 'minGridSize', size: 'large' },
        { type: 'minMistakes', value: 25 },
    ]);

    // Quest 15: Completion Glimpse — complete a level while the completion text is visible
    _checkComboConditions(payload, 'levelsWithGlimpseVisible', [
        { type: 'ptNode', node: 'completion_glimpse_1' },
    ]);

    // Quest 16: Signal to Noise keystone — massive grid
    _checkComboConditions(payload, 'massiveGridsSignalToNoise', [
        { type: 'ptNode', node: 'keystone_signal_to_noise' },
        { type: 'gridSize', size: 'massive' },
    ]);

    // Quest 17: The Oracle keystone — massive grid
    _checkComboConditions(payload, 'massiveGridsOracle', [
        { type: 'ptNode', node: 'keystone_the_oracle' },
        { type: 'gridSize', size: 'massive' },
    ]);

    // Quest 18: Degrees of Freedom keystone — large+ grid
    _checkComboConditions(payload, 'largeGridsDegreesOfFreedom', [
        { type: 'ptNode', node: 'keystone_degrees_of_freedom' },
        { type: 'minGridSize', size: 'large' },
    ]);

    // Quest 19: Random Walk keystone — large+ grid
    _checkComboConditions(payload, 'largeGridsRandomWalk', [
        { type: 'ptNode', node: 'keystone_random_walk' },
        { type: 'minGridSize', size: 'large' },
    ]);

    // Quest 22: Entropy Drain keystone — massive grid
    _checkComboConditions(payload, 'massiveGridsEntropyDrain', [
        { type: 'ptNode', node: 'keystone_entropy_drain' },
        { type: 'gridSize', size: 'massive' },
    ]);

    // Quest 23: Dead Reckoning keystone — any level
    _checkComboConditions(payload, 'levelsDeadReckoning', [
        { type: 'ptNode', node: 'keystone_dead_reckoning' },
    ]);

    // Quest 24: Frequentist's Burden keystone — massive grid
    _checkComboConditions(payload, 'massiveGridsFrequentistsBurden', [
        { type: 'ptNode', node: 'keystone_frequentists_burden' },
        { type: 'gridSize', size: 'massive' },
    ]);

    // Quest 27: Sparse Prior keystone — massive grid
    _checkComboConditions(payload, 'massiveGridsSparsePrior', [
        { type: 'ptNode', node: 'keystone_sparse_prior' },
        { type: 'gridSize', size: 'massive' },
    ]);

    // Quest 29: Adjacency Matrix node — any level
    _checkComboConditions(payload, 'levelsAdjacencyMatrix', [
        { type: 'ptNode', node: 'adjacency_matrix' },
    ]);

    // Flawless large grid: 200+ cells with 0 mistakes
    _checkComboConditions(payload, 'precisionOnLargeGrids', [
        { type: 'minGridSize', size: 'large' },
        { type: 'noMistakes' },
    ]);
}

// Master handler for the 'levelComplete' event. Delegates each tracking
// concern to a dedicated sub-handler above.
function _questStats_onLevelComplete(payload) {
    _inc('levelsCompleted');

    _questStats_trackBasicFlags(payload);
    _questStats_trackModifierFlags(payload.mods || {});
    _questStats_trackFullGauntlet(payload);
    _questStats_trackPerLevelReplay(payload.gi);
    _questStats_trackActivePTNodes();
    _questStats_trackSpecialLevelTypes(payload);
    _questStats_commitWitchImmunity();
    _questStats_trackComboQuests(payload);
}


//------------------------------------------------------------------------
//-------------------OTHER EVENT HANDLERS-------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// Handlers for events that are not level-complete (questions, items,
// class/ascendency choices, etc).

// Handles a correct-answer event. Increments the global counter and the
// source-specific counter (payload.source: 'quiz' | 'gate' | 'primer').
function _questStats_onQuestionCorrect(payload) {
    _inc('questionsCorrect');
    if (payload.source === 'quiz') _inc('quizCorrect');
    if (payload.source === 'gate') _inc('gatesPassed');
    if (payload.source === 'primer') _inc('primerCorrect');
}

// Handles an item-used event. Increments the total items counter plus
// type-specific sub-counters (payload: { defId, rarity }).
function _questStats_onItemUsed(payload) {
    _inc('itemsUsedTotal');

    if (payload.rarity === 'cursed') _inc('cursedItemsUsed');

    const id = payload.defId;
    if (!id) return;

    // All reveal* items except the cursed variant
    if (id.startsWith('reveal') && id !== 'cursedReveal') _inc('revealItemsUsed');

    // Mistake-eraser family (tutor items)
    if (_TUTOR_ITEM_IDS.has(id)) _inc('tutorItemsUsed');

    // Scout's Primer consumable
    if (id === 'scoutPrimer') _inc('primerItemsUsed');
}

// Handles the 'classChosen' event. Only sets the flag once — subsequent
// class changes do not re-trigger it.
function _questStats_onClassChosen() {
    if (!_qs.classChosen) _qs.classChosen = 1;
}

// Handles the 'ascendencyChosen' event. Only sets the flag once — subsequent
// ascendency changes do not re-trigger it.
function _questStats_onAscendencyChosen() {
    if (!_qs.ascendencyChosen) _qs.ascendencyChosen = 1;
}


//------------------------------------------------------------------------
//-------------------MILESTONE COMPLETION CHECK-------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------


function _questStats_checkNewlyCompleted() {
    for (const msId in _MILESTONE_MAP) {
        const { milestone } = _MILESTONE_MAP[msId];

        if (!_milestone_isClaimed(milestone) && _milestone_isComplete(milestone)) {
            claimQuest(msId);
        }
    }
}


//------------------------------------------------------------------------
//-------------------PUBLIC ENTRY POINT---------------------------------------
//------------------------------------------------------------------------
//------------------------------------------------------------------------
// updateQuestStats() is the ONLY function external modules should call. It
// sets up _qs, dispatches to the appropriate handler, checks for newly
// completed milestones, then saves and refreshes the badge.

// Records a game event and updates the relevant quest statistics. Single
// public API for this module — all other code should call this rather than
// modifying STATE.questStats directly.
function updateQuestStats(event, payload = {}) {
    _ensureQuestStats();
    _qs = STATE.questStats; // set module-level shorthand for _inc()

    switch (event) {
        case 'levelComplete': _questStats_onLevelComplete(payload); break;
        case 'questionCorrect': _questStats_onQuestionCorrect(payload); break;
        case 'itemUsed': _questStats_onItemUsed(payload); break;
        case 'classChosen': _questStats_onClassChosen(); break;
        case 'ascendencyChosen': _questStats_onAscendencyChosen(); break;
        case 'classAbilityUsedThisLevel': _questStats_onClassAbilityThisLevel(); break;

        case 'primerFullSolve': _inc('primerFullSolves'); break;
        case 'classAbilityUsed': _inc('classAbilitiesUsed'); break;
        case 'momentumTriggered': _inc('momentumTriggers'); break;
        case 'tilesRevealed': _inc('tilesRevealedByAbility', payload.count || 1); break;
        case 'luckyDrop': _inc('luckyDropsClaimed'); break;
        case 'classUpgradeApplied': _inc('classUpgradesApplied'); break;
        case 'ascendencyUpgradeApplied': _inc('ascendencyUpgradesApplied'); break;
        case 'passivePointSpent': _inc('passivePointsSpent'); break;
        case 'achievementUnlocked': _inc('achievementsUnlocked'); break;
        case 'cursedUnderImmunityUsed': _inc('_cursedUnderImmunityThisLevel'); break;
        case 'atlasTierCompleted':
        case 'atlasRetroCheck':
            // Atlas tier quests read STATE.egAtlasCompleted live via _atlasTierCheck();
            // no stat increment needed — just trigger the completion check below.
            break;
    }

    _questStats_checkNewlyCompleted();

    save();
    _refreshQuestBadge();

    _qs = null; // clear shorthand so stale references fail loudly
}